# Codememes

A private meme association game for friends, built on Codenames-style rules. Enter your name to create a room from the main page or join through an invite link, then play Red or Blue on phones or desktops without accounts. Sharing uses invite links; there is no separate Join path or manual code entry.

Codememes mixes 72 classic and recent meme references, each with a sourced local image or GIF, on a physical card-game board. GIFs animate directly on the board; tap or click selects a card before a deliberate Reveal. Spymaster cards use padded identity-colored backgrounds and dark uppercase name strips without identity icons; unguessed operative cards match neutral faces. Guessed cards show distinct meme-character covers on the supplied Codenames backdrops: eight per team plus a ninth double agent in both colors, seven neutrals and one assassin. Each dealt cover stays fixed, with no repeated design within its identity. The pale background uses sourced Trollface, Forever Alone, Okay Guy, Me Gusta and Yao Ming SVGs with a soft full-height blue-left/red-right gradient and the board�s shared three-shade red/blue palette. [PRODUCT.md](docs/PRODUCT.md), [DESIGN.md](docs/DESIGN.md), and the [deck contract](docs/MEME-DECK.md) record the behavior. Named player pieces can be dragged from anywhere on their tags, with centered six-dot grips, server-owned acceptance and occupied-spymaster rejection. The host can Randomize connected players into balanced teams and roles beside Start; there is no placement menu. The latest direct edits have no new validation evidence, at the user's request.

## Current state

Entry, the synchronized team lobby, and a complete playable round are implemented with React/TypeScript, plain CSS, Vite+, and a Cloudflare Worker with Static Assets and one SQLite-backed Room Durable Object per room. Room cookies authenticate persistent seats; native hibernating WebSockets synchronize accepted actions. The host starts a ready roster, both spymasters receive private keys, operatives select locally then explicitly reveal, and late arrivals watch the public board. The server deals 25 distinct meme families and separately randomizes the key. Recognition data and clue exclusions are pinned in room storage. Artwork and deck media use one current set of unversioned paths and are replaced in place. Old word-only rounds are unsupported; deployments may break older rooms or cached clients.

Bounded automatic reconnect restores a fresh permitted snapshot without replaying commands. Host controls follow connected seated players; disconnected spymasters keep their seats with a visible waiting signal. Play again returns the same group to the lobby, where watchers can join teams before a fresh round. The host can abandon interrupted play while the active spymaster is absent. Rooms expire after one empty hour or twenty-four hours without meaningful activity, with retry-safe storage cleanup. Deployment remains future work. No Cloudflare service has been created. [Protocol contracts](docs/PROTOCOL.md) define the implemented room/game/lifecycle boundary and extension responsibilities.

## Repository and Project

- [Public GitHub repository](https://github.com/tristan-kennedy/codememes)
- [Public Codememes Project](https://github.com/users/tristan-kennedy/projects/8)
- Views: Kanban Board, Ready Queue, Features.
- Status: Backlog → Ready → In Progress → In Review → Done.
- Priority: High, Medium, Low.
- Work types: Feature, Bug, Task; no Epic/Story hierarchy.

The Project uses outcome-sized Features, Bugs, and Tasks with explicit dependencies. It is linked to this repository. Add issues to the Project explicitly; issue auto-add is not configured. New items start in Backlog. Merges and issue closure remain deliberate contributor actions.

## Documentation

| File                                 | Purpose                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [Product](docs/PRODUCT.md)           | Codememes audience, rules, scope, content, and implementation boundaries.         |
| [Design](docs/DESIGN.md)             | Target tabletop design, sparse copy, illustrated covers, and lobby interaction.   |
| [Meme deck](docs/MEME-DECK.md)       | Planned mixed-media catalog, recognition, provenance, and round stability.        |
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

Read the skill before invoking other commands. DESIGN and its [.impeccable/design.json](.impeccable/design.json) sidecar record the implemented tabletop and accessible lobby arrangement. [Shipping art provenance](docs/assets/shipping-art.json) records the existing token prompts and sourced background SVG credits. Obsolete reference sheets, media, previews and generation code were removed; no deployed rooms require compatibility assets. Fonts and OFL licenses are self-hosted. A design hook is not configured.

The repository and main directory are named `codememes`. The existing local Worker configuration and lifecycle bundle still use the internal identifier `codenames`; changing a repository name does not migrate a runtime service or room data. No service has been deployed.

## Validation

For manual solo play, run `vp dev` and click **Solo test** below the create-room form. Four simulated connected seats open in a ready lobby. **Play as** switches seats and their permitted views; **Follow turn** switches to the active spymaster or operative after accepted actions, then to the host at game end. **Reset round** deals a fresh board using the current roster. The existing lobby, board, command validation, game transitions and personalized projections are reused in memory. Refreshing or leaving clears this session; it does not create a server room or exercise cookies, persistence, sockets or reconnect behavior. The entry and dynamically loaded harness are guarded by Vite's development flag; [Vite documents its production replacement](https://vite.dev/guide/env-and-mode.html#built-in-constants). No production test endpoint or protocol change is added. These direct edits were not verified at the user's request.

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
