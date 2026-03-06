# Paperclip Architecture

This document is the internal workflow snapshot for the current Paperclip repository state. It is intentionally grounded in code and current docs, not in the long-horizon product vision.

## Purpose

- Capture the current runtime and repository shape for contributors working inside this repo.
- Distinguish current implementation from aspirational or public-facing documentation.
- Provide the baseline that `docs/plans.md`, `tasks/todo.md`, `CLAUDE.md`, and `AGENTS.md` operate against.

## Current-State Snapshot

Paperclip is a `Bun` workspace monorepo with a single control-plane product split across a server, a browser UI, a CLI, shared packages, runtime adapters, and a Cloudflare Worker migration target.

Canonical repo identity for this fork is `https://github.com/Phlegonlabs/paperclip` on `master`.

### Runtime layers

1. `server/`
   Express API server, auth/middleware, orchestration services, storage providers, and adapter execution.
2. `apps/control-plane/`
   Bun + Cloudflare Worker same-origin control-plane target. It now owns a hardened realtime edge slice: authenticated `/api/companies/:companyId/events/ws`, a minimal D1-backed access snapshot, signed Durable Object handoff, and internal live-event publish/sync routes. It is still not the primary `/api` runtime.
3. `ui/`
   React + Vite board UI served either as a static build or through server-side Vite middleware in dev.
4. `cli/`
   `paperclipai` setup and operator CLI for onboarding, configuration, diagnostics, backup, and client-side control-plane commands.
5. `packages/db/`
   Drizzle schema, migrations, DB clients, backup helpers, and migration entrypoints.
6. `packages/shared/`
   Shared API types, validators, constants, and config schema.
7. `packages/adapters/*` and `packages/adapter-utils/`
   Adapter implementations and shared adapter/server/UI/CLI helpers.
8. `skills/`
   Repo-shipped Paperclip skills and skill references for agent execution contexts.
9. `agents/`
   Repo-tracked lightweight agent template library. Local adapters that support `instructionsFilePath` now materialize these templates into each new agent's private workspace on creation instead of pointing multiple agents at one shared live file.

### Request and execution flow

1. The server builds the Express app, installs actor/auth middleware, and mounts `/api` routes.
2. The UI talks to those routes through typed client modules in `ui/src/api`.
3. Agent heartbeats are invoked by the server through adapter packages.
4. Agents call back into the REST API using short-lived runtime credentials and company-scoped permissions.
5. Costs, activity, approvals, issue transitions, and storage mutations are persisted through the DB and service layers.
6. When Cloudflare control-plane env vars are present, the server also pushes canonical `LiveEvent` payloads and minimal auth snapshots into the Worker so the same-origin edge realtime route can authorize and fan out without changing the browser contract.

## Repository Map

### Product code

- `server/` — API runtime and orchestration
- `apps/control-plane/` — Cloudflare Worker migration target for same-origin control-plane delivery
- `ui/` — board operator frontend
- `cli/` — operator/bootstrap CLI
- `packages/db/` — schema and persistence helpers
- `packages/shared/` — cross-layer contracts
- `packages/adapters/*` — built-in runtime adapters

### Documentation layers

- `doc/`
  Internal product, implementation, deployment, and long-horizon specs. Treat `doc/SPEC-implementation.md` as the concrete V1 contract.
- `docs/`
  Mintlify public docs site and, now, internal workflow docs in the repo root of this directory.
- `README.md`
  Public project entrypoint and contributor orientation.
- `CLAUDE.md` and `AGENTS.md`
  Agent/operator instructions for implementation work in this repo.
- `tasks/`
  Live internal task tracking and lessons learned for the structured workflow.

## Canonical Commands

Use `bun` as the canonical package manager contract for repo documentation and workflow steps.

### Baseline commands

- Install: `bun install`
- Dev: `bun run dev`
- Server-only dev: `bun run dev:server`
- Cloudflare control-plane dev: `bun run dev:control-plane`
- Typecheck: `bun run typecheck`
- Tests: `bun run test:run`
- Build: `bun run build`
- DB migration generation: `bun run db:generate`
- DB migration apply: `bun run db:migrate`

### Environment note

The repo contract is now Bun-first. Do not add new legacy package-manager workflow references or old lockfiles.
Verification last passed on 2026-03-06 with `bun run typecheck`, `bun run test:run`, and `bun run build`.

## Runtime and Storage Baseline

### Database

- Primary contract: PostgreSQL
- Local default: embedded PostgreSQL when `DATABASE_URL` is unset
- External option: any Postgres-compatible URL through `DATABASE_URL`
- Migration target: Cloudflare D1 through `apps/control-plane/` work
- Current edge reality: only a minimal D1 auth/access slice exists for realtime board membership and agent key validation; general application persistence is still PostgreSQL-backed

### Storage

- Local default: `local_disk`
- Cloud option: S3-compatible object storage
- Cloudflare target: `r2` is now a first-class storage provider contract in shared/server config

### Secrets

- Default provider: local encrypted secret storage
- Cloudflare target: `cloudflare_encrypted` is now a first-class secrets provider contract in shared/server config
- Strict mode is supported and should be treated as the preferred posture outside trusted local use

### Auth and tenancy

- Human board access is mode-dependent
- Agent access is bearer-token based
- Business entities are company-scoped and cross-company access must be rejected
- Cloudflare realtime auth now follows the same public route contract as the server route, but it relies on server-pushed snapshots and internal signed handoff rather than full `/api` migration

### Agent templates

- Current source of truth for shipped default personas is the repo-level `agents/<role>/` template library.
- Current shipped roles match the existing product role taxonomy: `ceo`, `cto`, `cmo`, `cfo`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, `general`.
- Current local-adapter behavior is create-time copy: when a new `claude_local`, `codex_local`, `opencode_local`, or `cursor` agent has no explicit instructions file configured, the server copies the matching role bundle into that agent's Paperclip workspace and sets `instructionsFilePath` there.
- Current onboarding behavior is local-first: the CEO bootstrap copy now points to repo-tracked templates in this fork instead of the old upstream `paperclipai/companies` GitHub path.

## Known Divergences and Documentation Boundaries

These divergences must be treated explicitly during implementation work.

1. `doc/` vs `docs/`
   `doc/` contains internal strategy/spec material; `docs/` contains the public docs site plus this workflow layer. They serve different audiences and should not be collapsed accidentally.
2. Current runtime contract vs aspirational task docs
   `doc/TASKS.md` and `doc/TASKS-mcp.md` describe a broader target task model than the currently shipped control-plane issue/project/goal flow. Use code plus `doc/SPEC-implementation.md` for implementation truth.
3. Public docs architecture wording vs actual runtime details
   Public docs summarize the system, but internal workflow decisions should be validated against current code, package manifests, and route/service structure before changing behavior.
4. Runtime migration split
   The current production implementation still lives in `server/`, while `apps/control-plane/` is the Cloudflare same-origin target. Realtime auth/fanout hardening is now present there, but do not describe the Worker app as fully cut over until `/api`, general persistence, scheduler, and executor callbacks are actually migrated.
5. Verification environment
   The repo expects Bun and installed dependencies. Re-run `bun run typecheck`, `bun run test:run`, and `bun run build` after any migration step that changes workspace topology, Worker bindings, or shared provider contracts.

## Workflow Assets Added By This Conversion

The following files now form the internal execution workflow:

- `docs/architecture.md`
- `docs/plans.md`
- `docs/implement.md`
- `docs/secrets.md`
- `docs/documentation.md`
- `docs/design.md`
- `tasks/todo.md`
- `tasks/lessons.md`
- `CLAUDE.md`
- `AGENTS.md`
- `scripts/setup-hooks.sh`

These files are implementation support artifacts. They do not replace the product contract in `doc/SPEC-implementation.md`.
