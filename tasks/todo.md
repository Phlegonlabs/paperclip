# Paperclip Task Tracker

Use this file as the live task tracker for workflow and repo follow-up work.

## Conventions

- Every task must include `Task ID`.
- Every task must include `Commit Status`.
- Valid commit statuses: `pending`, `done`.
- Keep tasks small enough to finish in one atomic commit.

## Tasks

### Workflow bootstrap

- Task ID: PC-000
- Title: Bootstrap workflow docs, task tracking, contributor instructions, and repo-local hooks
- Commit Status: done
- Notes: Established the initial structured workflow baseline for the existing repo.

### Verification follow-up

- Task ID: PC-001
- Title: Re-run repo verification in a provisioned environment with dependencies installed
- Commit Status: done
- Notes: Verified on 2026-03-05 with `corepack pnpm -r typecheck`, `corepack pnpm test:run`, and `corepack pnpm -r build` after provisioning dependencies and removing Windows-specific script failures.

### Docs drift audit

- Task ID: PC-002
- Title: Reconcile public/internal docs drift against current runtime details
- Commit Status: pending
- Notes: Focus first on architecture wording, task-model docs, and secrets/config posture.

### Hook hardening

- Task ID: PC-003
- Title: Validate installed Claude/Codex hook settings against actual client event schemas in day-to-day use
- Commit Status: pending
- Notes: Installer follows the existing project-skill contract, but real-world client behavior still needs repo-specific validation.

### Secrets coverage

- Task ID: PC-004
- Title: Expand secrets baseline if new adapters or deployment modes add required provider credentials
- Commit Status: pending
- Notes: Keep `docs/secrets.md` scoped to current reality, not speculative integrations.

### Windows launcher hardening

- Task ID: PC-005
- Title: Remove shell-based `.cmd` fallback from adapter process execution
- Commit Status: pending
- Notes: Current Windows `.cmd` support is functional and covered by tests, but it still emits Node `DEP0190` warnings because the shared launcher falls back to shell execution for batch-style commands.
