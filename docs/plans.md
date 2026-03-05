# Paperclip Workflow Plan

This file tracks the structured execution plan for the current Paperclip repo baseline. It is intentionally split into baseline-capture work, workflow bootstrap work, hook/bootstrap hardening, and a final Production Readiness Gate.

## Planning Rules

- One task equals one execution unit.
- Every task below must end in exactly one atomic commit.
- Do not add compatibility shims or dual-path behavior to satisfy workflow tasks.
- If a task changes behavior, update the relevant workflow docs in the same task.

## Milestone M0 — Baseline Capture

### M0-T1 — Document current runtime and repository boundaries

- Goal: keep a current internal architecture snapshot tied to code reality rather than aspirational product prose.
- Deliverables: `docs/architecture.md`, initial doc taxonomy in `docs/documentation.md`
- Commit Boundary: exactly one atomic commit

### M0-T2 — Document current secrets, runtime config, and operational assumptions

- Goal: give contributors one internal source for required secrets and environment posture.
- Deliverables: `docs/secrets.md`
- Commit Boundary: exactly one atomic commit

### M0-T3 — Document current UI/system design baseline

- Goal: capture the existing control-plane UI style, layout density, route groups, and component hierarchy without redesigning the product.
- Deliverables: `docs/design.md`
- Commit Boundary: exactly one atomic commit

## Milestone M1 — Workflow Bootstrap

### M1-T1 — Establish execution rules for contributors and agents

- Goal: define how work moves from plan to implementation, including verification and doc-sync expectations.
- Deliverables: `docs/implement.md`, `CLAUDE.md`, `AGENTS.md`
- Commit Boundary: exactly one atomic commit

### M1-T2 — Establish live task tracking

- Goal: create a durable task tracker and lessons log for ongoing repo work.
- Deliverables: `tasks/todo.md`, `tasks/lessons.md`
- Commit Boundary: exactly one atomic commit

### M1-T3 — Keep internal and public documentation responsibilities separate

- Goal: prevent accidental drift between `doc/`, public `docs/`, and workflow docs.
- Deliverables: updates to `docs/documentation.md` and any linked contributor instructions
- Commit Boundary: exactly one atomic commit

## Milestone M2 — Hooks Bootstrap

### M2-T1 — Define a repo-local hook contract

- Goal: manage workflow reminders and safeguards through repo-owned hook templates instead of undocumented local machine state.
- Deliverables: hook templates and helper scripts under `scripts/hooks/`
- Commit Boundary: exactly one atomic commit

### M2-T2 — Install hook settings for Claude Code and Codex

- Goal: generate repo-local `.claude/` and `.codex/` hook payloads from a single installer contract.
- Deliverables: `scripts/setup-hooks.sh`, `.claude/settings.json`, `.claude/hooks/*`, `.codex/settings.json`, `.codex/hooks/*`
- Commit Boundary: exactly one atomic commit

### M2-T3 — Validate non-destructive hook behavior

- Goal: ensure hooks reinforce repo workflow without auto-committing, auto-pushing, or mutating tracked code unexpectedly.
- Deliverables: installer dry-run verification plus manual review of installed hook commands
- Commit Boundary: exactly one atomic commit

## Milestone M3 — Stabilization Backlog

### M3-T1 — Reconcile docs-code drift called out in baseline capture

- Goal: close the highest-value inconsistencies between current code, `doc/`, and public `docs/`.
- Deliverables: targeted follow-up tasks tracked in `tasks/todo.md`
- Commit Boundary: exactly one atomic commit

### M3-T2 — Restore reproducible verification on a fully provisioned environment

- Goal: ensure `pnpm -r typecheck`, `pnpm test:run`, and `pnpm build` can be run reliably on a machine with dependencies installed.
- Deliverables: validation evidence and any required environment/setup adjustments
- Commit Boundary: exactly one atomic commit

## Milestone PR — Production Readiness Gate

### PR-T1 — Docs-code alignment audit

- Goal: confirm workflow docs still reflect actual runtime and repo structure.
- Deliverables: refreshed audit of `docs/architecture.md`, `docs/secrets.md`, `docs/documentation.md`, `CLAUDE.md`, and `AGENTS.md`
- Commit Boundary: exactly one atomic commit

### PR-T2 — Verification gate

- Goal: pass the repo’s standard validation suite in a provisioned environment.
- Deliverables: successful `pnpm -r typecheck`, `pnpm test:run`, and `pnpm build`
- Commit Boundary: exactly one atomic commit

### PR-T3 — Hook safety gate

- Goal: verify hook configuration still blocks unconfirmed push attempts, preserves existing settings, and only provides non-destructive workflow guidance.
- Deliverables: installer run output and hook command audit for `.claude/` and `.codex/`
- Commit Boundary: exactly one atomic commit

### PR-T4 — Backlog review

- Goal: ensure any remaining drift, missing coverage, or repo process debt is explicitly captured before claiming the workflow complete.
- Deliverables: updated `tasks/todo.md` and `tasks/lessons.md`
- Commit Boundary: exactly one atomic commit
