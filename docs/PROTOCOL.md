# Room protocol and extension contracts

Implemented room, complete-round, and recovery/lifecycle contracts for issues #1–3. [src/shared/protocol.ts](../src/shared/protocol.ts) contains only browser-safe commands and views. [worker/state.ts](../worker/state.ts) owns internal records, parsing, and the atomic boundary; [worker/game.ts](../worker/game.ts) owns game transitions and key projection; [worker/lifecycle.ts](../worker/lifecycle.ts) owns deadlines, socket-derived host reconciliation, and waiting decisions. Browser code must never import internal room/game/lifecycle/word modules.

## Identity and routes

One cryptographically random 12-character code uses the 32-symbol alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (60 random bits). Each character is selected from cryptographic random bytes using five bits. The invite is `/room/CODE`; manual entry and invite parsing uppercase and remove whitespace/hyphens. Only `POST /api/rooms` initializes storage, checking for an existing record and retrying up to five code collisions. Ordinary lookup of missing/deleted records returns `not_found`, never a new room.

- `POST /api/rooms`: body `{ "name": "Alex" }`; create and seat the host.
- `POST /api/rooms/:code/join`: the same body; create a distinct seat or reclaim the cookie's existing seat. Worker normalizes the code and forwards validated name/hash through RPC.
- `GET /api/rooms/CODE/view`: authenticated current snapshot.
- `GET /api/rooms/CODE/socket`: authenticated native WebSocket upgrade.

Names normalize NFKC/whitespace and contain 1–40 UTF-16 code units, without control/format characters. Duplicate names get visible case-insensitive suffixes `(2)`, `(3)`, and so on. Names are plain React text. Request bodies are streamed with a 512-byte ceiling and exactly one `name` field. Commands are text JSON capped at 2,048 UTF-8 bytes. Room storage is bounded to 256 KiB on join; there is no twelve-player hard cap.

Canonical API paths are used for view/socket so the cookie's scope matches. Unknown `/api/*` paths return JSON API errors. Worker Assets serves same-origin SPA deep links. Mutating requests/upgrades require an exact same-origin `Origin`; view reads authenticate the cookie and reject a mismatched Origin when supplied. No CORS policy grants another origin access. Room routes reject query parameters.

A 256-bit random token exists only in the `seat` cookie: `Secure; HttpOnly; SameSite=Strict; Path=/api/rooms/CODE; Max-Age=86400`. Only SHA-256 of the token is stored in the seat record. Seat IDs are opaque UUIDs, stable for the lifetime of a room; they are public identity, never authentication. A supplied seat ID, host flag, or role cannot grant authority. Tokens never appear in URLs, browser-readable application state, storage, projections, or application logs. Clearing or losing the cookie loses seat recovery; a new join creates a new seat, which is a watcher during play. The one-day cookie lifetime is distinct from server expiry.

## Versioned envelopes

Protocol version is `1`. Every server envelope includes `version`. A full successful view is `{ version: 1, type: "snapshot", view, requestId? }`. Errors are `{ version: 1, type: "error", code, message, requestId?, view? }`. HTTP uses appropriate 400/401/403/404/409/413/426/429/503 statuses. Error codes are `invalid`, `forbidden`, `stale`, `not_found`, `unauthorized`, `replaced`, `rate_limited`, and `unavailable`.

An authenticated current connection receives the latest allowlisted view on rejected commands when storage is readable and the room has not expired. Unauthorized, superseded, or deadline-expired connections receive no view, even if physical deletion fails. The requester gets its `requestId` on successful acknowledgement/error; other clients get a snapshot without that acknowledgement. A request ID is correlation, not replay authorization. Repeating an accepted assignment at its old revision is stale.

Every command has exactly `version`, `type`, `requestId`, `revision`, and `roundId`, plus the fields below. For example, assignment is:

```json
{
  "version": 1,
  "type": "assign",
  "requestId": "opaque-correlation-id",
  "revision": 5,
  "roundId": null,
  "seatId": "target-seat-uuid",
  "team": "red",
  "role": "operative"
}
```

| Type       | Additional fields        | Authoritative permission                                            |
| ---------- | ------------------------ | ------------------------------------------------------------------- |
| `assign`   | `seatId`, `team`, `role` | Lobby: own seat or host arranging others.                           |
| `start`    | None                     | Lobby: authenticated host and ready roster.                         |
| `clue`     | `word`, `number`         | Playing: active team's spymaster, clue stage.                       |
| `reveal`   | `index`                  | Playing: active team's operative, guessing stage.                   |
| `end_turn` | None                     | Playing: active team's operative after at least one accepted guess. |

`team` is `red`, `blue`, or `null`; assignment `role` is `operative` or `spymaster`. Request/seat/round IDs are bounded to 64 ASCII word/hyphen characters. Exact field allowlisting rejects extra flags. Commands require a safe nonnegative integer revision and the room's current round ID. The lobby's round ID is `null`; starting creates a fresh UUID. Future rematches must replace that ID to reject prior-round actions. Revision increases monotonically for durable changes within the room, including joins/socket takeover; it never resets for a round. Presence-only close broadcasts can retain the same revision.

All three phases `lobby | playing | ended` are implemented. A start validates exactly one spymaster and at least one operative per team, locks the roster, and converts unassigned seats to watchers. New seats joining outside the lobby are watchers with no game/roster controls. The original Worker-only word list supplies 25 distinct random words, a randomly chosen starting team with nine agents, eight opposing agents, seven neutral cards, and one assassin. Word positions remain stable throughout the round.

Clues normalize NFKC and trim, contain one token of at most 40 UTF-16 units with at least one Unicode letter, no whitespace/control/format characters, and integer `number` 1–9. Reject an exact case-insensitive unrevealed board word. Broader language disputes remain for the group. A clue changes stage from `clue` to `guessing`. Index is an integer 0–24; accepted reveals are immutable. Own agents continue until `number + 1` guesses are used. Minimum one guess is required for explicit End turn. Neutral/opposing cards or exhaustion pass the turn and clear the clue. Assassin immediately awards the opponent victory. Revealing the last agent awards that card's team victory, including an opposing team's last agent. Victory changes phase to `ended`; further game/start/roster commands reject. Rematch and abandonment are deferred.

Future commands need their own exact parsing, phase/round/role/turn checks and projections inside the authoritative transition; do not add a client-side role toggle or exceptions to these rules.

## Views and permissions

`RoomView` allowlists room code, phase/revision/round ID, self seat ID, public player identity/name/team/role/host/presence, readiness reasons, `waitingFor`, controls, and `round` (null before start). Roles include the server-assigned `watcher`. `assignSelf` follows lobby phase; `assignOthers` additionally requires the authenticated host; `startRound` additionally requires readiness. `giveClue`, `reveal`, and `endTurn` follow the authenticated seat's phase/team/role/stage and minimum-guess rule, and pause while the active team's spymaster is disconnected. `waitingFor` is null or explicitly contains that spy's public seat ID/name/team; the seat and key permission remain unchanged. Server validation independently enforces every permission. Extra spymasters are visibly invalid rather than silently replaced.

`RoundView` explicitly contains cards (`word`, `revealed`, optional `identity`), starting/active team, stage, clue, guesses used/remaining, Red/Blue remaining counts, `privateKey`, last accepted reveal, and outcome. Operatives/watchers receive identity only for revealed cards. Both spymasters receive every identity during play with `privateKey: true`; host status alone grants no key. Every seat receives the full key after ending with `privateKey: false`. Last reveal contains only its already-public word/identity/acting team. Read HTTP responses, success broadcasts, and error recovery snapshots use the same personalized projection.

Projection builds fields explicitly, never spreads/serializes an internal record. Internal schema, timestamps, token hashes, and active connection IDs are absent. Game state and source words stay under `worker/`. Focused projection and actual-handler/live-transport checks cover the public, private, and final-key paths.

## Atomic transitions and transport

`commitTransition(storage, transition, publish)` reads the latest durable room record inside a storage transaction and rejects the exact expiry deadline before transitioning. The transition authenticates the socket's current connection ID, resolves permissions from durable state, and validates phase/round/revision before returning a new record. The transaction writes the record and next alarm atomically. Only after the transaction resolves may `publish` project and acknowledge/broadcast. External network I/O does not run inside the transition. Failed writes, alarm scheduling, or commits preserve previous state and emit an error without success or broadcast. No in-memory room cache exists.

Creation, join, and socket takeover also persist before their response/publication. Native `WebSocketPair`, `acceptWebSocket`, and message/close/error handlers use the Hibernation API. Attachments contain only `{ seatId, connectionId }`; permissions always come from durable storage. Takeover persists the new active connection ID, accepts the replacement, informs/closes the prior socket, and rejects any superseded command even with a current revision. Presence derives only from OPEN sockets matching persisted connection IDs; closing and superseded sockets do not retain authority. Reconstruction reads stored state and native socket attachments; process-local class fields do not own authority.

The browser applies server snapshots without optimistic roster/reveal mutation. Card selection is local React state, sends nothing, and clears on revision/round change or connection loss. Only explicit Reveal sends a command. Actions disable until a usable socket and while awaiting acknowledgement. An interruption settles pending UI and starts at most six automatic retries after 1, 2, 4, 8, 16, and 30 seconds; each request and socket handshake is bounded to ten seconds. Every attempt fetches an authenticated current snapshot then opens a fresh socket. No command queue or replay exists. Successful handshake resets the retry budget. Exhaustion shows explicit Reconnect; takeover stops automatic fighting and offers the same action. Expired/unauthorized responses stop retries and offer creation/entry respectively. Leaving the room cancels timers and late callbacks. Version mismatch asks for refresh.

## Host and temporary-room lifecycle

Reconciliation derives host authority from current sockets in persisted seat insertion order. It preserves an eligible connected host; otherwise it picks the earliest connected non-watcher, or stores `hostId: null`. Watchers keep a room nonempty but never gain administration. The first existing seated player reconnecting when no host exists becomes host; a former host returning later does not reclaim it. Handoff changes revision without extending meaningful activity. A missing active spymaster is named in `waitingFor`; play remains paused until that saved seat returns. Mid-round role replacement and abandonment are not implemented here.

`updatedAt` records creation, a new seat joining (including a watcher), or an accepted assignment/start/clue/reveal/End turn. Authenticated reads, same-cookie recovery, takeover, host handoff, connection closure, local selection, and rejected commands do not refresh it. `emptySince` records the instant the last authoritative socket disconnects and clears when any seated player or watcher connects. Legacy schema-1 records without `emptySince` gain it during reconciliation. The deadline is the earlier of `emptySince + 1h` (when empty) and `updatedAt + 24h`; equality is expired. Idle open sockets cannot evade the inactivity deadline.

Creation schedules the deadline; joins, reads, upgrades, commands, closes, and the single alarm check it. Malformed/unauthorized command error handling also checks expiry before projecting. Expiry commits removal of the room record and a two-second cleanup retry alarm, denies all further access, then calls native `deleteAll()` under a narrow concurrency guard before closing sockets with code 4004. SQLite `deleteAll()` atomically removes all keys/allocation metadata and the alarm for the configured compatibility date. If deallocation fails, its already-persisted alarm remains; automatic delivery retries cleanup without traffic. If record deletion itself cannot commit, an expired private view is still withheld, sockets are terminated, and cleanup is retried. Early alarms reschedule the next deadline; repeated cleanup is harmless. [SQLite deleteAll](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#deleteall), [alarms](https://developers.cloudflare.com/durable-objects/api/alarms/).

Storage/quota failures produce bounded `unavailable` feedback and no accepted mutation. Transport recovery refetches durable accepted state. Rematch and abandonment remain separate outcomes and must preserve these deadlines, atomic changes, socket authority, and personalized projections.

## Bounded rates and local configuration

Cloudflare rate-limit bindings enforce 10 create requests/minute/IP, 30 join/upgrade attempts/minute/IP (including missing-room and unauthorized attempts), and 60 socket messages/minute/room-seat (including malformed commands). Origin rejection happens first. Rate failures do not mutate room state. These are per-location limits, not a global strict quota, and entry limits are shared on the same network. [Cloudflare's binding documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) explains locality.

`wrangler.jsonc` configures `ROOMS`, `ASSETS`, three rate bindings, the initial SQLite `Room` migration, SPA fallback, and API-first routing. The namespace identifiers `10001`–`10003` are local configuration choices; verify account uniqueness before deployment because counters are shared by identifier across Workers. Generated types are committed and checked for freshness. `vp dev` verifies local emulation with no services/credentials. Actual deployment and Cloudflare runtime validation remain the publishing outcome.
