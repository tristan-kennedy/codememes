# Codenames

A planned Codenames-style word game for private rooms with friends. Create a room, share an invite, choose Red or Blue, and play on phones or desktops without accounts.

## Current state

This is a repository foundation only. Product decisions, a design seed, the Cloudflare architecture, contribution workflow, issue/PR templates, and documentation CI are established. There is no application, server, dependency manifest, deployment, or playable game. No stories, issues, or draft work items have been created.

## Repository and Project

- [Public GitHub repository](https://github.com/tristan-kennedy/codenames)
- [Public Codenames Project](https://github.com/users/tristan-kennedy/projects/8)
- Views: Kanban Board, Ready Queue, Features.
- Status: Backlog → Ready → In Progress → In Review → Done.
- Priority: High, Medium, Low.
- Work types: Feature, Bug, Task; no Epic/Story hierarchy.

The Project copies Golf Club Curator's fields, views, and ordinary status workflows without its items. It is linked to this repository. Add future issues to the Project explicitly; issue auto-add is not configured. New items start in Backlog. Merges and issue closure remain deliberate contributor actions.

## Documentation

| File                                 | Purpose                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| [Product](docs/PRODUCT.md)           | Audience, game rules, scope, constraints, and the future stack.                  |
| [Design](docs/DESIGN.md)             | Impeccable seed for the visual direction; no implemented tokens yet.             |
| [Architecture](docs/ARCHITECTURE.md) | Selected React/Workers/Durable Objects stack, room lifecycle, and plan research. |
| [Contributing](docs/CONTRIBUTING.md) | Adapted Golf Club Curator work-item, delivery, review, and authorization policy. |
| [Validation](docs/TESTING.md)        | Checks that apply to the current documentation-only repository.                  |
| [Agent instructions](AGENTS.md)      | Durable working constraints and documentation pointers.                          |

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

Read the skill before invoking other commands. No live preview, design hook, visual mockups, or implementation tooling is configured. After the first UI exists, run `$impeccable document` to extract actual design tokens and produce its sidecar.

## Validation

Node.js is needed only for the temporary formatting CLI at this stage:

```powershell
npx --yes prettier@3.9.9 --check README.md AGENTS.md "docs/**/*.md" ".github/**/*.md" ".github/**/*.yml" skills-lock.json .prettierrc.json
git diff --check -- . ":(exclude).agents/**"
```

Use the same Prettier invocation with `--write` to format edited files. [Documentation CI](.github/workflows/ci.yml) checks formatting on `main` pushes and pull requests. It does not claim application build, type, lint, or runtime coverage. See [TESTING.md](docs/TESTING.md) for link and rendering checks.

When implementation is authorized, use the planned Vite+ toolchain and keep the application small. There is no `dev`, `build`, or application install command yet.

The selected backend is a Cloudflare Worker with one SQLite-backed Durable Object per room and hibernating WebSockets. [ARCHITECTURE.md](docs/ARCHITECTURE.md) explains the responsibilities and why Workers Free can support the initial app without a paid upgrade.
