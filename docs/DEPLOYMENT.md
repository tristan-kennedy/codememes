# Codememes deployment

## Target and authorization

The October 6 request authorizes direct commits/pushes to `main` and publication of Codememes on Cloudflare. The target is the existing **Tristan Kennedy** account (`4bacc773067c830100ed4460f64332b1`), Worker `codememes`, at <https://codememes.tristan-kennedy.workers.dev>.

Deploy one Worker with Static Assets, the `ROOMS` SQLite-backed `Room` Durable Object and initial `v1` migration. Keep compatibility date `2026-10-04`, three rate bindings and native hibernating WebSockets. No custom domain, paid upgrade, extra service or deployment automation is included. Cloudflare's [React/Vite guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/) describes this build/deploy path; [SQLite Durable Objects support Workers Free](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Read-only account discovery found only `personal-website`; its bindings have no rate-limit namespaces. Codememes owns namespace IDs `10001` (create), `10002` (join/upgrade), and `10003` (commands). Keep them unique within this account: [shared namespace IDs share counters across Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). Limits are approximate and local to each Cloudflare location: 10 creates/minute/IP, 30 joins/upgrades/minute/IP and 60 commands/minute/room-seat. Shared networks share entry limits.

## Release procedure

Use Node.js 24 and the locked Vite+/Wrangler toolchain. Authenticate through Wrangler's own OAuth flow; never copy tokens into source, shell arguments or evidence.

```powershell
vp install --frozen-lockfile
vp check
vp test --config vitest.config.ts
vp build
vp run test:lifecycle
vp exec wrangler types --check
vp exec wrangler deploy --dry-run
vp exec wrangler login
vp exec wrangler deploy
vp node scripts/verify-deployment.mjs https://codememes.tristan-kennedy.workers.dev
```

Run the pinned documentation check from [TESTING.md](TESTING.md), obtain independent read-only review and confirm CI passes for the exact release SHA before publication. Build before each deployment. The Cloudflare Vite plugin generates `dist/codememes/wrangler.json` and redirects Wrangler to that artifact, including `dist/client` assets; deploying just `dist/client` would omit the game backend. Generated output and local `.wrangler` state stay untracked. Local development data and production rooms are separate.

The release smoke script targets only this approved HTTPS origin or local emulation. It creates one disposable room with five seats and uses ordinary authenticated HTTP/WebSocket requests. It checks headers, SPA/API routing, secure cookies, personalized keys, full round/rematch, competing reveals, watcher admission, spy/host reconnect, duplicate tabs and stored views. It keeps cookies/private keys in memory. Run it deliberately; repeated runs consume the real entry/command limits.

## Operations and recovery

Rooms expire after one empty hour or twenty-four hours without meaningful activity. Refresh/reconnect does not extend these deadlines. Recovery depends on the room-scoped Secure/HttpOnly/SameSite=Strict cookie; losing it creates a new seat. Cookies expire after twenty-four hours. There are no accounts or saved game history.

Use Cloudflare's existing Worker metrics/logs and Durable Object diagnostics to inspect CPU, requests/duration, storage reads/writes, errors and reconnects during a bounded pilot. Observability is enabled; application code does not log cookies, private keys or request bodies. Do not add ongoing monitoring or product analytics. Account-wide quotas are shared with other projects; a short functional smoke check is not a capacity measurement.

For a compatible later release, inspect versions using `vp exec wrangler versions list` and restore a known good version with `vp exec wrangler rollback VERSION_ID`. Preserve the `Room` namespace, existing migration tags and cookie/protocol contracts. A rollback does not reverse migrations or restore deleted data. Current media/artwork paths are replaced in place and old word-only rounds are unsupported; future releases can affect existing rooms or cached clients. If the first publication has no accepted earlier version, disable public entry while preserving storage for diagnosis instead of deleting the namespace.

## Execution evidence

The user's open application changes were independently reviewed with no actionable findings and pushed as `1f26f2eda942c53488f1345c6cf651419ed6f2d5`. [CI run 37418549901](https://github.com/tristan-kennedy/codememes/actions/runs/37418549901) passed. Author checks passed: formatting/lint/types, 59 focused tests, build, native SQLite cleanup retry/hibernation, generated bindings and local multiplayer/runtime checks.

The renamed deployment build and Wrangler dry run pass and include 117 static assets plus the Room/rate bindings. Independent read-only review of deployment configuration, headers, smoke safety and documentation passed at `611f3aad9c4347e7c12d81973c694e53b8cff6ca`; [CI run 37418937721](https://github.com/tristan-kennedy/codememes/actions/runs/37418937721) also passed. The corrected one-room local smoke passed, including explicit duplicate-tab revocation (`replaced` error and close code 4001). Publication is pending Wrangler authentication; on October 6 the user deferred sign-in until a later session. The connected subscription API returned authentication error 10000; that does not verify the account's Workers plan or remaining quotas. No subscription or billing change has been made.

Production smoke, browser/mobile evidence, actual one-hour alarm expiry, deployed cleanup retry, deployment interruption and bounded pilot resource measurements remain unverified. Local native fault checks demonstrate retry/wake behavior under emulation; they do not certify production alarm delivery, a real quota outage or twenty-four-hour wall-clock expiry. [Issue #5](https://github.com/tristan-kennedy/codememes/issues/5) remains open until its remaining acceptance is recorded.

## Resume after sign-in

In PowerShell on this same computer, run:

```powershell
Set-Location C:\Users\tdoug\Development\Projects\codememes
vp exec wrangler login
vp exec wrangler whoami
```

Complete the browser sign-in and approve Wrangler for **Tristan Kennedy**. `whoami` should list account ID `4bacc773067c830100ed4460f64332b1`. If the browser cannot reach the local OAuth callback, use `vp exec wrangler login --device` and enter its displayed code on Cloudflare's verification page.

In the Cloudflare dashboard, select that account and note the current Workers plan (Free or Paid) without changing it. Reply in this task that Wrangler is authenticated and give the plan name. No token/password needs to be pasted into chat. Existing deployment authorization remains in effect.

The next session should confirm authentication/plan and current quota diagnostics, verify the checkout and current-head CI, rebuild/dry-run, deploy the single Codememes Worker and initial Room migration, record its version/URL, run the bounded HTTPS smoke and browser checks, and review activation evidence. Leave any unobserved long-duration alarms/retry or capacity acceptance explicitly open; do not infer it from publication.
