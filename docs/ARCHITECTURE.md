# Architecture

Status: entry, lobby, and complete-round rules implemented and verified in local Workers emulation October 4, 2026. No Cloudflare service or deployment has been created. Automatic reconnect, host transfer, expiry, rematch, and abandonment remain selected future architecture. [PROTOCOL.md](PROTOCOL.md) records actual current contracts, input/rate limits, the atomic boundary, and extension responsibilities.

## Selected stack

Use a React + TypeScript single-page app built with Vite, one Cloudflare Worker deployment, and one SQLite-backed Durable Object per room. Use native WebSockets with the Durable Objects Hibernation API. Keep plain CSS and the existing Vite+ tooling preference.

```text
React + TypeScript + Vite (browser)
             |
       HTTPS / secure WebSocket
             |
Cloudflare Worker (API routing + Static Assets)
             |
       ROOMS namespace binding
             |
Room Durable Object (one authoritative instance per room)
             |-- SQLite-backed room storage
             |-- Hibernating WebSocket connections to players
             |-- Expiry alarm
```

WebSockets terminate in the room object; they are the transport between players and that object, not another backend service. Different rooms are independent. Players in the same room share one authority even when their requests enter Cloudflare through different locations.

Cloudflare explicitly supports React/Vite apps with an API Worker and Static Assets. Use `@cloudflare/vite-plugin` for local development in the Workers runtime and Wrangler for configuration, generated binding types, and deployment. Node.js is a local tooling dependency, not the production application server. [Cloudflare React + Vite guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/).

## Component responsibilities

| Component           | Responsibility                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React browser app   | Entry, lobby, board, rules, connection feedback, and local card selection. Render the server's permitted view; send explicit player commands.                                         |
| Worker              | Route room creation/join requests and WebSocket upgrades, check request origin and shape, and forward to the correct room object. Keep no authoritative room state in Worker globals. |
| Room Durable Object | Own seats, roles, host, board key, clue, turn, reveals, revision, and outcome. Authenticate each seat, validate commands, persist accepted changes, and publish permitted snapshots.  |
| Object storage      | Retain the current room across hibernation, eviction, and runtime restarts. This is the object's built-in SQLite-backed storage, not a separate database service.                     |
| Object alarm        | Enforce the room's inactivity/empty-room expiry and delete its stored state.                                                                                                          |

Serve the SPA and API from the same origin. Let Static Assets serve the built browser files; configure SPA fallback for `/room/...` links and `assets.run_worker_first` for `/api/*`, including upgrades at `/api/rooms/:code/socket`. Unknown API routes return API errors rather than the SPA HTML. [Cloudflare SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

## Room identity and access

Use one cryptographically random room code as the canonical room address, included in both the invite link and manual join flow. Choose a twelve-character unambiguous base32 code; normalize case and optional grouping separators before lookup. Codes grant access to an existing room, so room creation and failed joins need bounded request rates. This is access for a group of friends, not an account identity.

Route the normalized code through `env.ROOMS.getByName(code)`. Only the explicit create operation initializes a room; ordinary lookup must not turn a missing or expired room into a fresh game. Creation checks for an existing record and retries a new random code on collision. There is no global room directory or code-to-room database. [Durable Object namespace API](https://developers.cloudflare.com/durable-objects/api/namespace/).

On join, issue a high-entropy seat token in a Secure, HttpOnly, SameSite cookie scoped to that room's API path. Store its hash with the room's seat record. The WebSocket handshake authenticates this cookie, and every command uses the authenticated seat; a supplied player ID or role is never authority. Validate Origin on join, mutation, and upgrade requests. Do not place seat tokens in URLs, logs, or public snapshots.

The browser reconnects with the same room cookie and receives a current snapshot. A replacement connection takes over that seat so duplicate tabs cannot submit as independent copies of a player. Clearing browser cookies loses seat recovery. Joining a different device creates a new seat.

## State, commands, and privacy

Keep one versioned room record containing the roster and token hashes, host, current round, complete key, current clue/turn, reveals, monotonically increasing revision, and activity/expiry timestamps. Store only the current room; rematches replace the round, and expiry removes it. Begin with the storage `get`/`put` API on a SQLite-backed class. A custom SQL schema, ORM, event log, and external database are unnecessary for this small record. SQLite-backed objects support this key-value API and strongly consistent transactional storage. [Durable Object storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

For each command, validate its JSON shape, bounded size, authenticated seat, role, phase, round ID, and expected revision. Apply the game rules to the latest record, persist the next record atomically, then acknowledge and broadcast. Keep external network I/O outside this transition. If two players reveal at the same revision, the first accepted transition wins; the stale command receives current state. Do not replay unacknowledged game commands after reconnection.

Send small complete snapshots rather than a patch protocol. Build each snapshot from an explicit allowlist:

- Operatives and watchers receive words, revealed identities, roster, clue, counts, turn, and permitted controls.
- Spymasters additionally receive the complete key during play.
- Everyone receives the complete key once the round has ended.

Never serialize the internal room record and hide fields in React. Token hashes and unrevealed identities stay server-side. The host has administrative controls but gains no spymaster information unless occupying that role. Browser-shared types describe only commands and permitted views; server state and board generation live in Worker-only files.

## WebSockets and lifecycle

Use `WebSocketPair`, `ctx.acceptWebSocket`, and `webSocketMessage`/close/error handlers in the room object. Store only the seat/connection identity in a serialized socket attachment; resolve its current permissions from the room record. On wake, reload durable state and recover connected sockets through the Hibernation API. Ordinary class fields do not survive hibernation. Idle sockets can remain connected while the object sleeps. [Cloudflare WebSocket guidance](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).

Send state only on joins, accepted actions, and relevant connection changes. Local hover/selection and typing do not generate broadcasts. Avoid a server polling loop or periodic timers that keep rooms awake. If connection heartbeats are needed, use the Hibernation API's automatic response facility; heartbeats do not extend gameplay activity expiry.

Derive connected seats from current sockets, not a persisted connected flag. When a seat's last socket disconnects, update host/empty-room decisions under the product rules. Reconnection preserves team and role; a disconnected spymaster is not silently replaced. Runtime restarts or deployments may interrupt connections, so the client reconnects with backoff and restores from a fresh permitted snapshot.

Schedule the next relevant deadline using the object's single alarm: one hour after all players/watchers disconnect, or twenty-four hours after meaningful room activity. Check deadlines on requests as well, so a delayed alarm never allows expired-room actions. Close remaining sockets and delete stored state on expiry. Cleanup must tolerate retries because alarms have at-least-once execution. [Cloudflare alarms API](https://developers.cloudflare.com/durable-objects/api/alarms/).

Runtime sleep or restart does not itself end a game. Rooms remain deliberately temporary through explicit expiry. Persist accepted changes before announcing success; a storage or quota error must never produce a successful reveal in the UI.

## Proposed repository layout

The application implements the browser app, shared protocol, connection helper, Worker routing, room transport, server state/game rules/word generation, configuration, and generated bindings. Alarms and automatic recovery remain future boundaries:

```text
src/                       React application and plain CSS
  features/                Entry, lobby, and game UI
  lib/room-connection.ts    Socket lifecycle and permitted snapshots
  shared/protocol.ts       Browser-safe command/view types
worker/
  index.ts                 HTTP routing and ROOMS binding
  room.ts                  Durable Object, storage, sockets, alarms
  state.ts                 Parsing, lobby transitions, atomic boundary and views
  game.ts                  Authoritative rules, board generation and key projection
  words.ts                 Original locally curated English source words
vite.config.ts             React and Cloudflare Vite plugins
wrangler.jsonc             Assets, ROOMS binding, runtime settings
```

Keep one package and one deployment. The `Room` binding, initial `new_sqlite_classes` migration, tested compatibility date, and generated binding types are configured. Vite+ 1.0.0 and Cloudflare Vite plugin 1.62.5 build and run together in local workerd emulation. The package manager reports peer-version warnings because the aliased Vite+ core identifies as 1.0.0; local verification covers the configured pair. Keep local and deployed room data separate.

No SSR framework, Node server, Socket.IO, Agents SDK, D1, Workers KV, Redis, queues, or microservices are needed for this baseline. The native platform APIs cover room coordination and connections. CI checks the application and documentation; deployment automation remains future work.

## Workers plan decision

**Start on Workers Free. A paid upgrade is not required to use this architecture.** Free supports SQLite-backed Durable Objects. It has hard quotas; exceeding a quota causes operations to fail instead of automatically purchasing overage. Research checked October 4, 2026. [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

| Meter                      | Workers Free allowance      |
| -------------------------- | --------------------------- |
| Dynamic Worker requests    | 100,000/day                 |
| Worker CPU per invocation  | 10 ms                       |
| Durable Object requests    | 100,000/day                 |
| Durable Object duration    | 13,000 GB-s/day             |
| Object SQLite rows read    | 5 million/day               |
| Object SQLite rows written | 100,000/day                 |
| Object SQLite storage      | 5 GB total; 1 GB per object |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), and [object storage limits](https://developers.cloudflare.com/durable-objects/platform/limits/). These are account allowances, not a fresh allocation per room. The Worker's CPU limit is distinct from Durable Object CPU limits.

Static Assets requests that bypass Worker execution are free and unlimited. WebSocket upgrades count as Worker requests; subsequent socket messages do not count as Worker requests. Durable Objects meter their own traffic and duration separately. [Workers billing](https://developers.cloudflare.com/workers/platform/pricing/).

For object request billing, incoming WebSocket messages use a 20:1 ratio; outgoing messages are uncharged. Hibernation avoids idle duration use, which is particularly suitable for a turn-based game. Do not interpret a connected room as permanently free compute. [Object billing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Expected small-group usage is a reasonable fit for Free, but this is an architectural inference, not measured capacity. Other applications on the account consume the same allowances. During the first pilot, inspect Worker CPU, object requests/duration, storage rows, reconnects, and quota errors.

Upgrade when measured usage approaches those limits, or when hard free-tier cutoffs are unsuitable for the intended availability. Workers Paid starts at **$5 USD per account per month**, includes larger allowances, and charges excess usage; it is not a fixed unlimited $5 bill. [Workers Paid pricing](https://developers.cloudflare.com/workers/platform/pricing/). A website-zone Pro/Business plan is not the prerequisite named in the Durable Objects eligibility rules.

The account's current subscription and usage have not been inspected, and no billing change is authorized or performed by this research.

## Validation when implementation exists

Follow [TESTING.md](TESTING.md). Current checks cover lobby synchronization, role-specific keys, all game rules and terminal paths, stale/competing/unauthorized commands, replacement sockets, persistence, and injected storage failures at the Room handler. Automatic recovery, expiry cleanup, and deployed Cloudflare runtime behavior need validation in their own outcomes. Tests remain optional tools; local emulation does not certify deployed runtime behavior.
