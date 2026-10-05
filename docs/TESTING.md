# Validation

This repository currently contains planning, contribution policy, GitHub templates, and a vendored design skill. No application exists, so there are no application build, lint, typecheck, or runtime commands to run.

## Current checks

From the repository root:

```powershell
npx --yes prettier@3.9.9 --check README.md AGENTS.md DESIGN.md THIRD_PARTY_NOTICES.md "docs/**/*.md" ".github/**/*.md" ".github/**/*.yml" skills-lock.json .prettierrc.json
git diff --check -- . ":(exclude).agents/**"
```

- Inspect rendered Markdown, including tables, lists, and code fences.
- Confirm relative links resolve to tracked files and headings.
- Confirm README, PRODUCT, DESIGN, agent rules, and contribution policy agree on what exists versus what is planned.
- Parse JSON and YAML configuration and confirm issue forms use existing labels.
- For repository setup, verify private visibility, the linked Project, Status and Priority options, view filters, and the absence of issues or draft items.
- Treat the upstream Impeccable files as vendored content. Do not reformat them to satisfy project checks. The whitespace command excludes that directory because the installed upstream references contain trailing whitespace. Its runtime and temporary outputs are not product implementation. During initial setup or before committing staged work, add `--cached` to the whitespace command.

## CI

[Documentation CI](../.github/workflows/ci.yml) runs the pinned Prettier check on pushes and pull requests to `main`. It has read-only repository permissions, does not persist checkout credentials, and installs no application dependencies. It is a formatting gate, not a link checker or an application validation substitute. CI checks are not enforced by branch protection.

## Inherited application policy

Golf Club Curator's contribution policy intentionally excludes automated tests, test files, test scripts, and test configuration. Preserve that policy here unless it is explicitly changed and reviewed.

When application implementation is requested, add the narrow applicable Vite+ formatting, lint, typecheck, and build commands to this document and CI as part of that outcome. Record manual evidence for the changed behavior and its material boundaries. Reuse unaffected evidence rather than repeating every check.

The first game implementation will need manual validation of role-specific key privacy, clue and turn rules, irreversible reveals, simultaneous/stale actions, reconnection, host departure, room expiry, keyboard/touch operation, and narrow screens. This is validation scope, not a story list or authorization to implement it now.
