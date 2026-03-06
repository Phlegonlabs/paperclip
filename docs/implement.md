# Paperclip Implementation Rules

This file defines how implementation work should be executed after the workflow bootstrap.

## First-Principles Execution

- Start from the actual requirement and current architecture, not from local convenience.
- Prefer removing confusion over layering more process or compatibility code on top of it.
- Treat `doc/SPEC-implementation.md` as the V1 contract when product docs disagree.
- Use current code, route structure, package boundaries, and shared contracts as truth before changing behavior.

## Atomic Task Execution

- Treat `task` and `sub-task` as the same execution unit.
- Complete one task fully before moving to the next.
- A task is complete only when code, tests, config, and affected docs are updated together.
- One task must map to exactly one atomic commit.
- Do not auto-commit. Commits are deliberate completion boundaries, not a background side effect.

## Rewrite-First Policy

- If a module is structurally wrong for the requirement, rewrite the module instead of layering fixes around it.
- Fix every directly impacted caller in the same task.
- Prefer deleting dead paths and replacing them with the intended design over keeping transitional logic alive.

## No-Compatibility Rule

- Do not introduce adapters, shims, aliases, fallback branches, or temporary flags solely to preserve an obsolete internal shape.
- When an internal contract changes, update the repo to the new contract in the same task.
- If a compatibility window is genuinely required, it must be explicitly justified in the task and mirrored in docs.

## Verification Standard

Run the full repo verification set before claiming a behavior change is complete:

- `bun run typecheck`
- `bun run test:run`
- `bun run build`

If any check cannot run, record the reason precisely and treat the task as partially verified.

## Documentation Sync

Update docs in the same task when you change:

- runtime boundaries or major module responsibilities
- commands, environment variables, or setup flow
- public API or auth behavior
- data model and migration flow
- workflow instructions for contributors and agents

### Minimum documentation targets

- architecture/runtime changes: `docs/architecture.md`
- process or milestone changes: `docs/plans.md`
- execution-rule changes: `docs/implement.md`, `CLAUDE.md`, `AGENTS.md`
- secrets/config changes: `docs/secrets.md`
- live backlog or follow-up work: `tasks/todo.md`
- durable takeaways: `tasks/lessons.md`

## Task Tracking Discipline

- Keep `tasks/todo.md` current while work is in flight.
- Mark tasks `done` only when the real implementation boundary has been crossed.
- Record non-obvious repo lessons in `tasks/lessons.md` instead of relying on chat history.

## Hook Discipline

- Hooks are allowed to remind, warn, or block unsafe actions such as unconfirmed `git push`.
- Hooks must not auto-commit, auto-push, or rewrite tracked source files.
- Repo-local hook assets live under `scripts/hooks/`; installed copies live under `.claude/hooks/` and `.codex/hooks/`.
