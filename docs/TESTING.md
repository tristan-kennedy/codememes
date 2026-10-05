# Validation

This repository currently contains planning, contribution policy, GitHub templates, and a vendored design skill. No application exists, so there are no application build, lint, typecheck, or runtime commands to run.

## Current checks

From the repository root:

```powershell
npx --yes prettier@3.9.9 --check README.md AGENTS.md "docs/**/*.md" ".github/**/*.md" ".github/**/*.yml" skills-lock.json .prettierrc.json
git diff --check -- . ":(exclude).agents/**"
```

- Inspect rendered Markdown, including tables, lists, and code fences.
- Confirm relative links resolve to tracked files and headings.
- Confirm README, PRODUCT, DESIGN, ARCHITECTURE, agent rules, and contribution policy agree on what exists versus what is planned.
- Parse JSON and YAML configuration and confirm issue forms use existing labels.
- For repository setup, verify public visibility, the linked Project, Status and Priority options, view filters, and the absence of issues or draft items.
- Treat the upstream Impeccable files as vendored content. Do not reformat them to satisfy project checks. The whitespace command excludes that directory because the installed upstream references contain trailing whitespace. Its runtime and temporary outputs are not product implementation. During initial setup or before committing staged work, add `--cached` to the whitespace command.

## CI

[Documentation CI](../.github/workflows/ci.yml) runs the pinned Prettier check on pushes and pull requests to `main`. It has read-only repository permissions, does not persist checkout credentials, and installs no application dependencies. It is a formatting gate, not a link checker or an application validation substitute. CI checks are not enforced by branch protection.

## Application validation

Automated tests are optional tools for authors and agents. Add focused tests when they help verify behavior or prevent a likely regression, especially for game rules, role-specific snapshots, and stale commands. There is no required suite, framework, or coverage target. Skip tests that merely mirror the implementation or add maintenance without useful confidence.

Test files, scripts, and configuration may be committed when useful. Add only the supporting tooling needed for the change, document its commands here, and run the relevant checks. The current documentation-only foundation needs no test tooling.

When application implementation is requested, add the narrow applicable Vite+ formatting, lint, typecheck, and build commands to this document and CI as part of that outcome. Record manual evidence for the changed behavior and its material boundaries. Reuse unaffected evidence rather than repeating every check.

The first game implementation will need validation of role-specific key privacy, clue and turn rules, irreversible reveals, simultaneous/stale actions, reconnection, host departure, room expiry, keyboard/touch operation, and narrow screens. Use focused automated checks or manual evidence as appropriate; manually verify the browser and Workers behavior that automated checks do not cover. This is validation scope, not a story list or authorization to implement it now.
