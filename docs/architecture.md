# Paperclip Architecture

This document is the internal workflow snapshot for the current Paperclip repository state. It is intentionally grounded in code and current docs, not in the long-horizon product vision.

## Purpose

- Capture the current runtime and repository shape for contributors working inside this repo.
- Distinguish current implementation from aspirational or public-facing documentation.
- Provide the baseline that `docs/plans.md`, `tasks/todo.md`, `CLAUDE.md`, and `AGENTS.md` operate against.

## Current-State Snapshot

Paperclip is a `pnpm` monorepo with a single control-plane product split across a server, a browser UI, a CLI, shared packages, and runtime adapters.

### Runtime layers

1. `server/`
   Express API server, auth/middleware, orchestration services, storage providers, and adapter execution.
2. `ui/`
   React + Vite board UI served either as a static build or through server-side Vite middleware in dev.
3. `cli/`
   `paperclipai` setup and operator CLI for onboarding, configuration, diagnostics, backup, and client-side control-plane commands.
4. `packages/db/`
   Drizzle schema, migrations, DB clients, backup helpers, and migration entrypoints.
5. `packages/shared/`
   Shared API types, validators, constants, and config schema.
6. `packages/adapters/*` and `packages/adapter-utils/`
   Adapter implementations and shared adapter/server/UI/CLI helpers.
7. `skills/`
   Repo-shipped Paperclip skills and skill references for agent execution contexts.

### Request and execution flow

1. The server builds the Express app, installs actor/auth middleware, and mounts `/api` routes.
2. The UI talks to those routes through typed client modules in `ui/src/api`.
3. Agent heartbeats are invoked by the server through adapter packages.
4. Agents call back into the REST API using short-lived runtime credentials and company-scoped permissions.
5. Costs, activity, approvals, issue transitions, and storage mutations are persisted through the DB and service layers.

## Repository Map

### Product code

- `server/` — API runtime and orchestration
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

Use `pnpm` as the canonical package manager contract for repo documentation and workflow steps.

### Baseline commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Typecheck: `pnpm -r typecheck`
- Tests: `pnpm test:run`
- Build: `pnpm build`
- DB migration generation: `pnpm db:generate`
- DB migration apply: `pnpm db:migrate`

### Environment note

Some local environments may only expose `pnpm` through Corepack. In those environments, use `corepack pnpm ...` as an execution fallback, but keep repo docs and workflow references canonicalized on `pnpm`.

Verification was last run on 2026-03-05 in a Corepack-backed environment and passed with `corepack pnpm -r typecheck`, `corepack pnpm test:run`, and `corepack pnpm -r build`.

## Runtime and Storage Baseline

### Database

- Primary contract: PostgreSQL
- Local default: embedded PostgreSQL when `DATABASE_URL` is unset
- External option: any Postgres-compatible URL through `DATABASE_URL`

### Storage

- Local default: `local_disk`
- Cloud option: S3-compatible object storage

### Secrets

- Default provider: local encrypted secret storage
- Strict mode is supported and should be treated as the preferred posture outside trusted local use

### Auth and tenancy

- Human board access is mode-dependent
- Agent access is bearer-token based
- Business entities are company-scoped and cross-company access must be rejected

## Known Divergences and Documentation Boundaries

These divergences must be treated explicitly during implementation work.

1. `doc/` vs `docs/`
   `doc/` contains internal strategy/spec material; `docs/` contains the public docs site plus this workflow layer. They serve different audiences and should not be collapsed accidentally.
2. Current runtime contract vs aspirational task docs
   `doc/TASKS.md` and `doc/TASKS-mcp.md` describe a broader target task model than the currently shipped control-plane issue/project/goal flow. Use code plus `doc/SPEC-implementation.md` for implementation truth.
3. Public docs architecture wording vs actual runtime details
   Public docs summarize the system, but internal workflow decisions should be validated against current code, package manifests, and route/service structure before changing behavior.
4. Verification environment
   The repo expects `pnpm` and installed dependencies. In environments without `node_modules` or direct `pnpm` on `PATH`, validation results may be incomplete even when repo scripts are correct.

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
