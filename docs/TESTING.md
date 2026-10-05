# Validation

The repository implements entry, the synchronized lobby, and complete rounds, with local Workers emulation. Lifecycle recovery, subsequent rounds, and deployment remain future work. Automated tests are optional tools; there is no suite or coverage target. The focused checks below verify security and persistence boundaries that are difficult to establish through UI inspection alone.

## Current checks

Install Vite+ and use Node.js 24. From the repository root:

```powershell
vp install --frozen-lockfile
vp check
vp test --config vitest.config.ts
vp build
vp exec wrangler types --check
npx --yes prettier@3.9.9 --check README.md AGENTS.md "docs/**/*.md" ".github/**/*.md" ".github/**/*.yml" skills-lock.json .prettierrc.json
git diff --check -- . ":(exclude).agents/**" ":(exclude)worker-configuration.d.ts"
```

`vp check` formats/lints application files and checks TypeScript through Vite+'s type-aware path. The vendored skill, generated declarations, lockfile, and existing documentation check inputs are excluded from application formatting. Keep the pinned Prettier check for documentation/configuration. Do not reformat upstream Impeccable files or Wrangler's generated runtime declarations; the latter contain upstream trailing whitespace and are verified byte-for-byte by `wrangler types --check`. Before committing staged work, add `--cached` to the whitespace command.

The focused `worker/room.test.ts` checks call the actual `Room.webSocketMessage` handler with an injected DurableObject base and serialized transactional storage. Assignment and reveal write/commit failures produce no successful acknowledgement, broadcast, or mutation. Competing operative reveals accept exactly one revision, broadcasts carry personalized keys only after commit, reconstruction continues the accepted round, terminal actions reject, and superseded connections receive no view. This simulates failure faithfully at the handler boundary; it does not reproduce a real Cloudflare quota outage. `worker/game.test.ts` checks original word-list uniqueness, randomized board distributions, roles/phase/round/revision, clues, budget/turn endings, both agent-win cases, assassin loss, immutable reveals, and public/private/final projections.

Inspect rendered Markdown, including tables, lists, and code fences. Confirm relative links resolve to tracked files/headings, JSON/YAML parse, and documentation accurately distinguishes implemented and future behavior.

## Local Workers and browser checks

In one terminal:

```powershell
vp dev
```

In another:

```powershell
vp run test:runtime
vp run test:game
```

The runtime script uses native Workers emulation plus HTTP and WebSocket clients. It creates disposable local rooms and keeps cookie tokens only in memory. It verifies room creation, normalized joining, duplicate names, missing-room lookup, API errors and SPA deep links, secure cookie attributes, authentication/origin checks, public projection privacy, host/self controls, stale/oversized/malformed commands, readiness, socket takeover, persisted fetches, and create/join/command rate rejection. Dev-server proxy rejection of an unauthorized WebSocket upgrade appears as a connection reset; the script verifies denial, and separately verifies HTTP error codes. It accepts only localhost/127.0.0.1 URLs.

Also use two independent browser sessions (or separate local cookie origins `127.0.0.1:5173` and `localhost:5173`) to create/join the same room. Verify synchronized roster/permissions, longer names, invite copying, replacement tabs, deep-link seat reuse, missing-room recovery, keyboard focus and submission, native touch controls, and a 320px viewport without horizontal overflow. Stop and restart `vp dev` with `.wrangler` local storage intact, then reload existing sessions to verify roster, host, roles, and seats survive process reconstruction. Record the actual evidence in the issue/PR; do not infer it from a passing build.

The game runtime script uses real local HTTP/WebSocket paths and six authenticated seats per room. It verifies host-only ready start, locked roster, late watcher, personalized keys, invalid/exact-board clues, guess allowance, minimum/explicit End turn, duplicate/stale/competing reveals, neutral/opposing turn endings, full own-agent victory, opponent-last-agent victory, assassin loss, terminal rejection, and stored final-key reads. It performs only legal game commands; no product fixture hooks expose the internal key. Local synthetic ingress keys avoid consuming manual users' entry limits. Use `vp node scripts/verify-game.mjs --fixture CODE` in a tty only for an existing disposable manual room: it adds two Blue seats and accepts newline-delimited JSON clue, reveal-category, and end_turn actions; tokens remain in process memory.

For UI evidence, use public operative and private spymaster browser seats plus ordinary authenticated clients for the other team. Verify local selection does not appear on the other client, explicit Reveal waits for accepted state, invalid clues preserve state, turn/count/action feedback, final key/winner, stable word order, Rules dialog Escape/focus restoration, keyboard selection/reveal, and private/public five-column layouts at 320px. Reduced motion disables tile/control transitions. The complete-round evidence used two IAB sessions with distinct cookie origins, rather than two browser products.

Run the Impeccable mechanical detector once on the finished UI. Inspect desktop and narrow-screen captures together, fix material findings in one batch, and perform at most one confirming visual round. Actual tokens are recorded in [DESIGN.md](DESIGN.md) and the [.impeccable/design.json](../.impeccable/design.json) sidecar.

Rates are bounded per Cloudflare location, not globally strict. Create allows 10 requests/minute/IP; joins and upgrades share 30/minute/IP; socket messages allow 60/minute/room-seat. Shared networks share entry limits. Production ingress supplies `CF-Connecting-IP`; the runtime check uses a unique synthetic key in local emulation to avoid consuming manual users' entry limits.

## CI

[CI](../.github/workflows/ci.yml) runs on pushes and pull requests to `main` with read-only repository permissions and no persisted checkout credentials. Documentation uses the pinned Prettier check. Application CI installs locked dependencies using Vite+, runs format/lint/type checks, focused handler tests, build, and generated binding freshness. It creates no Cloudflare services and performs no deployment. Branch protection does not enforce these checks; review and current-head passing CI remain required by CONTRIBUTING.

## Future evidence

Lifecycle work needs automatic reconnect, host departure, hibernation wake, expiry cleanup, and spymaster recovery. Subsequent-round work needs rematch/abandonment and old-round rejection. Publishing must verify the actual Cloudflare runtime, security headers, cookie behavior over HTTPS, and account-specific rate namespace identifiers. Local checks do not certify these deferred outcomes.
