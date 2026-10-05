# Codenames

A Codenames-style word game for private rooms with friends. Create a room, share an invite, and choose Red or Blue on phones or desktops without accounts.

## Current state

Entry, the synchronized team lobby, and a complete playable round are implemented with React/TypeScript, plain CSS, Vite+, and a Cloudflare Worker with Static Assets and one SQLite-backed Room Durable Object per room. Room cookies authenticate persistent seats; native hibernating WebSockets synchronize accepted actions. The host starts a ready roster, both spymasters receive private keys, operatives select locally then explicitly reveal, and late arrivals watch the public board. A server-owned original English word list supplies each randomized board.

Bounded automatic reconnect restores a fresh permitted snapshot without replaying commands. Host controls follow connected seated players; disconnected spymasters keep their seats with a visible waiting signal. Rooms expire after one empty hour or twenty-four hours without meaningful activity, with retry-safe storage cleanup. Rematches, abandonment, and deployment remain future work. No Cloudflare service has been created. [Protocol contracts](docs/PROTOCOL.md) define the implemented room/game/lifecycle boundary and extension responsibilities.

## Repository and Project

- [Public GitHub repository](https://github.com/tristan-kennedy/codenames)
- [Public Codenames Project](https://github.com/users/tristan-kennedy/projects/8)
- Views: Kanban Board, Ready Queue, Features.
- Status: Backlog → Ready → In Progress → In Review → Done.
- Priority: High, Medium, Low.
- Work types: Feature, Bug, Task; no Epic/Story hierarchy.

The Project uses outcome-sized Features, Bugs, and Tasks with explicit dependencies. It is linked to this repository. Add issues to the Project explicitly; issue auto-add is not configured. New items start in Backlog. Merges and issue closure remain deliberate contributor actions.

## Documentation

| File                                 | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [Product](docs/PRODUCT.md)           | Audience, game rules, scope, constraints, and the future stack.                   |
| [Design](docs/DESIGN.md)             | Implemented entry, lobby, board, and rules tokens in the game-table direction.    |
| [Architecture](docs/ARCHITECTURE.md) | Selected React/Workers/Durable Objects stack, room lifecycle, and plan research.  |
| [Contributing](docs/CONTRIBUTING.md) | Adapted Golf Club Curator work-item, delivery, review, and authorization policy.  |
| [Validation](docs/TESTING.md)        | Static checks, focused fault tests, local Workers checks, and browser evidence.   |
| [Protocol](docs/PROTOCOL.md)         | Browser-safe envelopes, seat authority, storage, rates, and extension boundaries. |
| [Agent instructions](AGENTS.md)      | Durable working constraints and documentation pointers.                           |

## Impeccable

[Impeccable](https://github.com/pbakaus/impeccable) is installed locally in [.agents/skills/impeccable](.agents/skills/impeccable/SKILL.md); its source and content hash are recorded in [skills-lock.json](skills-lock.json). It is available to Codex in subsequent turns. The initial documents use its product context and pre-implementation design-seed format, with decisions delegated by the user.

Installed from the project root with:

```powershell
npx --yes skills add pbakaus/impeccable --skill impeccable --agent codex --yes --copy
```

Inspect the installation with `npx --yes skills list`. On Windows, load project context with:

```powershell
& .\.agents\skills\impeccable\scripts\impeccable.cmd context
```

Read the skill before invoking other commands. The implemented tokens are recorded in DESIGN and its [.impeccable/design.json](.impeccable/design.json) sidecar. A design hook is not configured.

## Validation

Install [Vite+](https://viteplus.dev/guide/) and use Node.js 24. From the project root:

```powershell
vp install --frozen-lockfile
vp dev
vp check
vp test --config vitest.config.ts
vp build
vp exec wrangler types --check
```

`vp dev` serves the app at <http://127.0.0.1:5173> with local Workers emulation. No credentials or Cloudflare service creation are needed. Use `localhost:5173` in a second browser session for an independent local cookie origin. `vp run test:runtime` checks the running local API and sockets; `vp run test:game` checks complete rounds with authenticated multi-client sockets. Both create disposable local rooms and retain tokens only in memory. After building, `vp run test:lifecycle` uses isolated local workerd/SQLite to check automatic cleanup retry and hibernating-socket reconstruction. Rates are local to a Cloudflare location, not strict global limits. See TESTING for evidence boundaries and configuration details.

The existing documentation check remains:

```powershell
npx --yes prettier@3.9.9 --check README.md AGENTS.md "docs/**/*.md" ".github/**/*.md" ".github/**/*.yml" skills-lock.json .prettierrc.json
git diff --check -- . ":(exclude).agents/**" ":(exclude)worker-configuration.d.ts"
```

Use the same Prettier invocation with `--write` to format edited documentation. [CI](.github/workflows/ci.yml) checks documentation plus application formatting, lint/types, focused handler tests, build, and generated bindings. It performs no deployment. See [TESTING.md](docs/TESTING.md) for link and rendering checks.

The selected backend is a Cloudflare Worker with one SQLite-backed Durable Object per room and hibernating WebSockets. [ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the responsibilities and why Workers Free can support the initial app without a paid upgrade.
