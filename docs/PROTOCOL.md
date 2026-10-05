# Room protocol and extension contracts

Implemented foundation for issue #1. [src/shared/protocol.ts](../src/shared/protocol.ts) contains only browser-safe commands and views. [worker/state.ts](../worker/state.ts) owns internal records and transitions; browser code must never import it or another internal room/game module.

## Identity and routes

One cryptographically random 12-character code uses the 32-symbol alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (60 random bits). Each character is selected from cryptographic random bytes using five bits. The invite is `/room/CODE`; manual entry and invite parsing uppercase and remove whitespace/hyphens. Only `POST /api/rooms` initializes storage, checking for an existing record and retrying up to five code collisions. Ordinary lookup of missing/deleted records returns `not_found`, never a new room.

- `POST /api/rooms`: body `{ "name": "Alex" }`; create and seat the host.
- `POST /api/rooms/:code/join`: the same body; create a distinct seat or reclaim the cookie's existing seat. Worker normalizes the code and forwards validated name/hash through RPC.
- `GET /api/rooms/CODE/view`: authenticated current snapshot.
- `GET /api/rooms/CODE/socket`: authenticated native WebSocket upgrade.

Names normalize NFKC/whitespace and contain 1–40 UTF-16 code units, without control/format characters. Duplicate names get visible case-insensitive suffixes `(2)`, `(3)`, and so on. Names are plain React text. Request bodies are streamed with a 512-byte ceiling and exactly one `name` field. Commands are text JSON capped at 2,048 UTF-8 bytes. Room storage is bounded to 256 KiB on join; there is no twelve-player hard cap.

Canonical API paths are used for view/socket so the cookie's scope matches. Unknown `/api/*` paths return JSON API errors. Worker Assets serves same-origin SPA deep links. Mutating requests/upgrades require an exact same-origin `Origin`; view reads authenticate the cookie and reject a mismatched Origin when supplied. No CORS policy grants another origin access. Room routes reject query parameters.

A 256-bit random token exists only in the `seat` cookie: `Secure; HttpOnly; SameSite=Strict; Path=/api/rooms/CODE; Max-Age=86400`. Only SHA-256 of the token is stored in the seat record. Seat IDs are opaque UUIDs, stable for the lifetime of a room; they are public identity, never authentication. A supplied seat ID, host flag, or role cannot grant authority. Tokens never appear in URLs, browser-readable application state, storage, projections, or application logs. Clearing the cookie loses seat recovery. The one-day cookie lifetime is distinct from future server expiry.

## Versioned envelopes

Protocol version is `1`. Every server envelope includes `version`. A full successful view is `{ version: 1, type: "snapshot", view, requestId? }`. Errors are `{ version: 1, type: "error", code, message, requestId?, view? }`. HTTP uses appropriate 400/401/403/404/409/413/426/429/503 statuses. Error codes are `invalid`, `forbidden`, `stale`, `not_found`, `unauthorized`, `replaced`, `rate_limited`, and `unavailable`.

An authenticated current connection receives the latest allowlisted view on rejected commands when storage is readable. Unauthorized or superseded connections receive no view. The requester gets its `requestId` on successful acknowledgement/error; other clients get a snapshot without that acknowledgement. A request ID is correlation, not replay authorization. Repeating an accepted assignment at its old revision is stale.

The current command is exactly:

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

`team` is `red`, `blue`, or `null`; `role` is `operative` or `spymaster`. Request/seat IDs are bounded to 64 ASCII word/hyphen characters. Exact field allowlisting rejects extra flags. Commands require a safe nonnegative integer revision and the room's current round ID. The lobby's round ID is `null`. Future rounds use a fresh opaque ID for each round; it changes on rematch and prevents prior-round actions from applying to another round. Revision increases monotonically for durable changes within the room, including socket takeover; it never resets for a round. Presence-only close broadcasts can retain the same revision.

Phase vocabulary is `lobby | playing | ended`; only `lobby` is implemented. The current server state narrows to lobby/null until game work extends it. Future commands need their own explicit parsing, phase/round/role/turn checks and projections. Keep those checks inside the authoritative transition; do not add a client-side role toggle.

## Views and permissions

`RoomView` allowlists room code, phase/revision/round ID, self seat ID, public player identity/name/team/role/host/presence, readiness reasons, and permitted controls. `assignSelf` follows lobby phase; `assignOthers` additionally requires the authenticated host; `startRound` is currently false for everyone. Server validation independently enforces these permissions. Readiness requires exactly one spymaster and at least one operative on each team; extra spymasters are visibly invalid rather than silently replaced.

Projection builds fields explicitly, never spreads/serializes an internal record. Internal schema, timestamps, token hashes, and active connection IDs are absent. Future game projections must keep hidden identities server-only; host controls do not grant the key. Extend browser-safe types with permitted board/clue/control fields, while game state stays under `worker/`. Public and private key projections need focused tests before release.

## Atomic transitions and transport

`commitTransition(storage, transition, publish)` reads the latest durable room record inside a storage transaction. The transition authenticates the socket's current connection ID, resolves permissions from durable state, and validates phase/round/revision before returning a new record. The transaction writes it atomically. Only after the transaction resolves may `publish` project and acknowledge/broadcast. External network I/O does not run inside the transition. Failed writes or commits preserve previous state and emit an error without success or broadcast. No in-memory room cache exists.

Creation, join, and socket takeover also persist before their response/publication. Native `WebSocketPair`, `acceptWebSocket`, and message/close/error handlers use the Hibernation API. Attachments contain only `{ seatId, connectionId }`; permissions always come from durable storage. Takeover persists the new active connection ID, accepts the replacement, informs/closes the prior socket, and rejects any superseded command even with a current revision. Presence derives from active sockets matching persisted connection IDs. Reconstruction reads stored state; process-local class fields do not own authority.

The browser applies server snapshots without optimistic roster mutation. It disables changes until a usable socket and while awaiting acknowledgement. A disconnect or takeover shows a literal recovery action. `Reconnect` is an explicit new connection that fetches a fresh snapshot through its handshake; it replays no commands. Automatic reconnect/backoff, host transfer, alarms/expiry, and round/lifecycle transitions remain separate outcomes.

## Bounded rates and local configuration

Cloudflare rate-limit bindings enforce 10 create requests/minute/IP, 30 join/upgrade attempts/minute/IP (including missing-room and unauthorized attempts), and 60 socket messages/minute/room-seat (including malformed commands). Origin rejection happens first. Rate failures do not mutate room state. These are per-location limits, not a global strict quota, and entry limits are shared on the same network. [Cloudflare's binding documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) explains locality.

`wrangler.jsonc` configures `ROOMS`, `ASSETS`, three rate bindings, the initial SQLite `Room` migration, SPA fallback, and API-first routing. The namespace identifiers `10001`–`10003` are local configuration choices; verify account uniqueness before deployment because counters are shared by identifier across Workers. Generated types are committed and checked for freshness. `vp dev` verifies local emulation with no services/credentials. Actual deployment and Cloudflare runtime validation remain the publishing outcome.
