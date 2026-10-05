# Agent instructions

Repository-wide agent rules. [CONTRIBUTING.md](docs/CONTRIBUTING.md) holds the shared work-item and delivery policy, adapted from Golf Club Curator.

## Documentation guide

Read relevant docs and reuse unchanged context:

- [README.md](README.md): repository state, GitHub Project, installed skill, and current commands.
- [docs/PRODUCT.md](docs/PRODUCT.md): audience, rules, scope, constraints, and planned stack.
- [docs/DESIGN.md](docs/DESIGN.md): directional visual seed; distinguish decisions from implemented tokens.
- [docs/MEME-DECK.md](docs/MEME-DECK.md): planned mixed-media recognition, sourcing, stable content, and privacy contract.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): selected Cloudflare runtime, room boundaries, persistence, and sourced plan limits.
- [docs/TESTING.md](docs/TESTING.md): applicable validation, optional automated tests, and current tooling limits.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): work sizing, ownership, review, Project status, and handoffs.
- [.agents/skills/impeccable/SKILL.md](.agents/skills/impeccable/SKILL.md): design workflow when the request needs it.

## Working rules

- Keep changes scoped to the request. Prefer the smallest clear solution; do not invent speculative abstractions.
- The baseline setup established documentation only. Implement app outcomes or populate the backlog only under later explicit user authorization; follow each dispatched item's scope.
- Product and design choices for this baseline were delegated to the author. Preserve them unless later evidence or user direction changes them.
- Codememes is the current product/repository name. PRODUCT and DESIGN specify the planned meme/tabletop replacement; the existing word-game implementation is not evidence that the replacement ships. Preserve the sparse game screen, original illustrated covers, and drag/drop with tap/keyboard equivalents when implementing that direction.
- Use outcome-sized Feature/Bug/Task items. One writer owns each outcome. Delegate only when the user or applicable instructions authorize it and independent work has a useful benefit.
- Require independent read-only review for meaningful code, behavior, security, integration, dependency, CI, and repository-policy changes. [CONTRIBUTING.md](docs/CONTRIBUTING.md) defines low-risk exceptions and reviewer boundaries. Return findings to the author.
- Never send hidden card identities to unauthorized clients. Validate room membership, role, turn, and current round on the server when implementation exists.
- Do not read, modify, or expose secrets, local environment files, or sensitive configuration without authorization. Never commit them.
- Preserve user authorization boundaries for branches, worktrees, pushes, PRs, merges, service changes, and deployment. Do not initiate those steps outside the authorized request.
- Use Vite+ (`vp`) for future application package management and tooling. Current documentation commands in README and TESTING take precedence; `npx skills` installs the requested project skill.
- Automated tests are optional tools for authors and agents. Add focused tests and minimal supporting tooling when they improve confidence in a change; no suite or coverage target is required. Follow [docs/TESTING.md](docs/TESTING.md).

## Completion

- Run the narrowest relevant validation in [docs/TESTING.md](docs/TESTING.md).
- For documentation, verify formatting, Markdown rendering, relative links, and agreement with the actual repository state.
- Report the review outcome, validation performed, skipped checks, blockers, and material gaps plainly.
- Do not claim implementation, testing, or deployment that did not happen.
