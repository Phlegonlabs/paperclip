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
- Notes: Re-verified on 2026-03-05 with `bun run typecheck`, `bun run test:run`, and `bun run build` after the Bun workspace migration and dependency provisioning.

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

### Bun workspace migration

- Task ID: PC-006
- Title: Replace the repo package-manager contract with Bun
- Commit Status: done
- Notes: Root workspaces, scripts, Docker build path, hook defaults, and canonical workflow docs now target Bun as the only package-manager contract.

### Cloudflare same-origin control-plane skeleton

- Task ID: PC-007
- Title: Land a Bun-managed Cloudflare Worker workspace for same-origin control-plane delivery
- Commit Status: done
- Notes: `apps/control-plane/` now contains a Worker entrypoint, static asset fallback, `/api/health`, and a Durable Object realtime skeleton for `/api/companies/:companyId/events/ws`.

### Cloudflare runtime cutover

- Task ID: PC-008
- Title: Move auth, realtime authorization, and `/api` application logic from `server/` into the Worker control plane
- Commit Status: pending
- Notes: The Worker now owns a hardened realtime slice with D1-backed access snapshots and signed DO fanout, but Express still owns the real `/api` runtime contract.

### Cloudflare data-plane migration

- Task ID: PC-009
- Title: Replace Postgres/local disk control-plane dependencies with D1, R2, and edge-native scheduler bindings
- Commit Status: pending
- Notes: Current code has a minimal D1 auth/access slice for realtime plus provider/config contracts for `r2` and `cloudflare_encrypted`; general persistence, queues, cron, and runtime data-plane cutover are still pending.

### External executor handoff

- Task ID: PC-010
- Title: Move local adapter execution from in-process server spawn to an external executor callback contract
- Commit Status: pending
- Notes: Agent adapter types stay visible in product/UI, but Cloudflare control-plane deployment still needs the actual execution-plane callback API and lifecycle wiring.

### Cloudflare realtime hardening

- Task ID: PC-011
- Title: Harden the same-origin Worker realtime route with auth, signed DO handoff, and internal live-event sync
- Commit Status: done
- Notes: `apps/control-plane/` now rejects unauthenticated websocket requests, validates board cookies and agent tokens against a minimal D1 snapshot, accepts only signed internal DO publish traffic, and preserves the canonical `LiveEvent` wire contract to the UI.

### Cloudflare auth-source cutover

- Task ID: PC-012
- Title: Replace the minimal realtime D1 snapshot bridge with a full Worker-owned auth and persistence source of truth
- Commit Status: pending
- Notes: Current board access and agent key validation in the Worker depend on server-pushed internal sync routes and a minimal D1 mirror; Better Auth lifecycle and most application persistence are still owned by the server/Postgres runtime.

### Windows migration path fix

- Task ID: PC-013
- Title: Fix Windows-safe migration path resolution for embedded Postgres startup and db migration commands
- Commit Status: done
- Notes: `packages/db` now resolves migration folders, journal files, and SQL files through filesystem-safe paths instead of raw `file://` URL `.pathname` values, so `bun run dev` and related migration entrypoints no longer build `C:\\C:\\...` paths on Windows.

### Agent template baseline

- Task ID: PC-014
- Title: Ship repo-tracked lightweight agent templates and create-time workspace copies for local adapters
- Commit Status: done
- Notes: The repo now owns `agents/<role>/` template bundles, local adapter creation materializes isolated copies into each agent workspace, and onboarding/project-owned links no longer point at the old external `paperclipai/companies` persona repo.
