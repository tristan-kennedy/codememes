# Contributing

Use the public [Codememes Project](https://github.com/users/tristan-kennedy/projects/8), linked to this repository.

[AGENTS.md](../AGENTS.md) holds durable agent constraints and contextual documentation pointers. This workflow is adapted from Golf Club Curator. This file holds the shared contribution workflow; issues hold outcome-specific scope and acceptance. Keep reusable tool procedures in relevant skills rather than duplicating this policy in every agent prompt.

## Work types

Use exactly one work-type label per issue:

- **Feature** (`feature`): one complete product capability or coherent improvement to an existing workflow, owned and delivered as one workable outcome. This replaces both Epic and Story; Features have no parent or child work-item hierarchy.
- **Bug** (`bug`): broken behavior, with expected versus actual results, reproduction evidence, and a verifiable fix.
- **Task** (`task`): research, validation, documentation, operations, or bounded maintenance with a concrete deliverable. A Task may finish without a PR.

Create issues using the matching form. All three types use the same Status and Priority fields. Use native blocked-by/blocking dependencies between independently deliverable items. Do not encode hierarchy in titles, add parent containers, or create custom relationship fields.

## Size work around an outcome

A Feature should normally be larger than a single page change or implementation step. Include the UI, server/data work, recovery states, documentation and validation needed for its agreed outcome. For example, a room UX improvement can include joining, team selection, readiness, recovery and validation in one Feature rather than separate items per screen. Keep internal steps as acceptance criteria or a short implementation checklist in that issue.

Combine small related changes when they share an outcome, files, contracts or validation. A bounded deduplication pass can be one Task rather than a new issue, author and review cycle for every helper. Do not combine unrelated work just to make an item larger or expand scope to fill a queue.

Split only when each resulting item has an independently useful, reviewable outcome and a clear ownership boundary, or when a distinct risk or authorization gate needs its own deliverable. A shared schema/component foundation can be delivered first, followed by independent consumers. Items that edit the same files or depend on unsettled contracts are unsuitable for simultaneous authors.

Before Ready, record the goal, included/excluded scope, acceptance criteria, dependencies, likely code ownership/shared contracts, applicable authorization and validation. Resolve major product choices and blockers before dispatching an author. Larger items still need a bounded result; an ongoing initiative such as "improve all UI" is not a Ready Feature.

Use judgment about reviewability and coordination cost rather than fixed file, line, point or agent counts. Keep a short plan or checklist in the issue when complexity warrants it; a small correction needs no separate planning ceremony.

Completed delivery summaries must distinguish implemented scope from deferred work and unverified runtime or activation Tasks. Consolidate unfinished overlapping items into one canonical issue, link the superseded records and close those records as not planned rather than delivered.

## Status and Priority

| Status      | Meaning                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backlog     | Work exists but needs refinement, required input, authorization or a resolved dependency.                                                                          |
| Ready       | Scope, acceptance, ownership, authorization and validation are clear enough to implement without inventing major requirements; blocking dependencies are resolved. |
| In Progress | Implementation or task execution has started.                                                                                                                      |
| In Review   | Required independent review or remediation is underway.                                                                                                            |
| Done        | Acceptance, required validation and applicable review are complete; repository changes are merged, or a non-code deliverable is recorded and accepted.             |

Priority options are **High**, **Medium**, **Low**, in that order. Set Priority before Ready and assign an author before starting. Use In Progress for execution and In Review when independent review is required; low-risk work with a recorded review exception can move directly to Done after acceptance. A draft PR may remain In Progress while implementation continues. Verify completion and Project status after merge or acceptance, and close the issue if necessary. Reopened work returns to Backlog for reassessment.

Canceled or superseded records are closed as **not planned** and archived from the Project. They are not delivered work. Deferred Features remain open in Backlog; changing taxonomy does not implement them or certify missing runtime evidence.

## Coordinator and author ownership

The coordinator chooses whether to implement a work item directly, retain an existing author or create a fresh author agent. Routine planning, refinement, Project updates and small implementation work can stay with the coordinator. Delegation is a tool for useful independent work, not a required stage for every item.

Keep one accountable writer per outcome. Prefer the original author through implementation, failed checks, review fixes and integration fixes; the coordinator can be that author. If an approach persistently fails or its context becomes ineffective, the coordinator may replace the author with an explicit ownership transfer and concise checkpoint. Routine findings go back to the author rather than to a new fixer agent.

The coordinator may delegate focused read-only exploration, research, triage or log/evidence analysis when it avoids noisy context or unlocks useful parallel work. Give each agent a bounded question, relevant sources, a read-only boundary and a concise expected result; avoid duplicate searches and full-transcript handoffs. Read-only agents may run alongside an author, but they still consume usage. Use the smallest useful set and keep cheap local reads with the coordinator.

Default to one writer in flight. Additional writers may run simultaneously only when dependencies are resolved, owned files do not overlap and shared contracts are stable. Count nested agents in the usage decision. Authors and reviewers do not automatically spawn more agents; the coordinator chooses any additional delegation. Use focused UI review for ordinary changes and broader design critiques when their distinct scope warrants the cost.

Use an existing suitable checkout for a single author when it is safe. Isolate concurrent authors in authorized worktrees and preserve existing shared changes. Integrate shared foundations before starting dependent consumers. Batch routine Project/API reads and avoid repeating unchanged snapshots or full transcripts.

## Delivery and review

Understand the agreed outcome and dependencies, inspect the relevant code and use the documentation pointers in [AGENTS.md](../AGENTS.md) as needed. The author chooses the implementation sequence and performs the narrowest applicable [validation](#development-and-validation). Continue through necessary fixes until the authorized outcome is complete or a concrete blocker prevents progress. Normally use one authorized PR per item, with the problem/result, issue link, evidence and material gaps. If multiple PRs are needed, define the sequence in the issue and keep it open until the whole outcome is complete.

**Independent read-only review is required for meaningful code or behavior changes, data/auth/security work, integration/dependency/CI changes, and changes to repository operating or validation policy.** Research and validation Tasks need review when their conclusions affect product, architecture, data, security or activation decisions. A documentation-only change to these policies is therefore still reviewed.

The coordinator may skip independent review for clearly low-risk work such as typos, link corrections, formatting or small non-behavior maintenance. Record the reason and author validation in the existing PR, issue or direct-request completion report. If impact is uncertain, obtain review. An explicit user requirement to review an item overrides this exception; skipping review never waives applicable validation, CI or acceptance.

When review is required, use one independent read-only reviewer by default. Give it the requirements, current diff or deliverable, relevant context and validation references, without the author's transcript. It returns actionable findings and a pass/fail decision; it does not edit deliverables, push fixes or merge. The coordinator may add a specialist only when a distinct risk warrants it and owns the consolidated decision.

**Return findings to the original author**, or to the coordinator when it authored the work. Prefer the same reviewer for rechecks of changed code and affected behavior; replace it when unavailable or ineffective, with a concise handoff of findings and the reviewed revision. Record the review outcome and SHA, or non-code version/date, in the existing PR, issue or direct-request completion report. Avoid new fixer/reviewer contexts for ordinary remediation.

## Integration and completion

Serialize authorized merges and integrate against the intended current base at the actual merge slot. Before merge, verify dependencies, applicable review and passing CI for the current PR head, guarding against that head changing. The owning author resolves integration issues; changes that affect the review require a recheck. Reuse unaffected evidence and repeat checks invalidated by actual changes; current-head CI remains required. Investigate a main-CI failure before releasing dependent work.

Verify the whole item's Done conditions after merge or acceptance. A non-code Task needs its recorded deliverable, applicable review and acceptance; it needs no artificial code PR. Use `Closes #123` only for the whole outcome and `Refs #123` for partial delivery. Report remaining runtime gaps without claiming completion of deferred work.

This workflow grants no new permissions. Preserve the user's authorization boundaries for branches/worktrees, pushes, PRs, merges, migrations, authentication, credentials and deployment. When a complete delivery lifecycle is authorized, hand off conditional merge authorization from the start: after required review, current-head CI and the coordinator's sequencing release. A temporary review hold does not revoke otherwise authorized later steps. Report actual approval denials; retries require new grounds and must not bypass the restriction.

## Use the Project

- **Kanban Board** shows issues grouped by Status.
- **Ready Queue** shows Ready Features, Bugs and Tasks. Respect blocking dependencies and use Priority as the primary ordering signal. The coordinator may choose another Ready item when it better unblocks subsequent work, avoids idle time, or makes materially better use of available context.
- **Features** shows the flat feature backlog and delivery history.

Add future issues to the Project explicitly and use Linked pull requests to reach implementation PRs. The initial repository setup leaves this Project empty; it does not authorize issue or story creation. New work starts in Backlog; only refined, authorized work moves to Ready. Skip blocked items and continue independent Ready work. Stop at the agreed queue boundary, usage limit, or when no work can proceed without input. Do not invent extra work or perform open-ended cleanup to keep agents busy.

## Sessions and handoffs

Reuse useful context; choose a fresh session when a separate outcome or persistently failed approach benefits from it, not at an arbitrary context percentage. Prefer retaining the author and reviewer through normal fix/integration rounds. Use completion notifications or bounded waits instead of polling unchanged work.

Save a checkpoint outside chat **only when an agent needs to stop or hand off**, as a concise comment on the relevant GitHub issue in [Codememes Project](https://github.com/users/tristan-kennedy/projects/8). Include branch/checkout, exact head, PR, checks and their revision, blocker/next action, and task references needed to resume. Do not create progress files or routine checkpoint comments. Routine status stays in Project fields and existing PR evidence.

## Development and validation

Follow the current commands in the [README](../README.md) and [TESTING.md](./TESTING.md). The repository has documentation/configuration and application checks. Use Vite+ for applicable formatting, lint, type, build and manual checks. Automated tests and their supporting files are optional tools for authors and agents when useful; no suite or coverage target is required. Scope validation to changed behavior and its material boundaries. A reviewer independently verifies evidence and reasoning without routinely rerunning every author command. Changes invalidate affected evidence; reuse unaffected evidence with its scope and revision recorded. CI must pass for the current PR head before merge.

Keep changes focused and never commit secrets or local environment files. Report skipped checks, remaining runtime gaps and blockers plainly. Documentation-only changes require Markdown rendering, relative-link and current-scaffold consistency checks; unrelated application builds do not substitute for those checks.
