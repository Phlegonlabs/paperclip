# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Paperclip is a control plane for AI-agent companies.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `apps/control-plane/`: Bun + Cloudflare Worker control-plane migration target
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `doc/`: operational and product docs

## 4. Dev Setup (Auto DB)

Use embedded PostgreSQL in dev by leaving `DATABASE_URL` unset.

```sh
bun install
bun run dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
bun run dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
bun run db:generate
```

4. Validate compile:

```sh
bun run typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `bun run db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
bun run typecheck
bun run test:run
bun run build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change

## 11. Workflow Docs

The repo now also carries internal workflow/bootstrap docs in `docs/`:

- `docs/architecture.md` — current repo/runtime snapshot
- `docs/plans.md` — milestone and readiness plan
- `docs/implement.md` — execution rules
- `docs/secrets.md` — internal secrets baseline
- `docs/documentation.md` — documentation ownership map
- `docs/design.md` — current UI/system design baseline

Use these as implementation-support artifacts. They do not replace the product contract in `doc/SPEC-implementation.md`.

Live workflow state lives in:

- `tasks/todo.md`
- `tasks/lessons.md`

## 12. Execution Workflow

1. Read the product/spec docs first, then the workflow docs.
2. Keep `tasks/todo.md` aligned with active follow-up work.
3. Execute one task at a time with one atomic commit boundary.
4. Do not auto-commit or auto-push.
5. Confirm before any push.
6. When runtime behavior, commands, secrets, or contributor process changes, update the relevant workflow docs in the same task.

## 13. Hooks

Repo-local hook assets are managed by:

```sh
bash scripts/setup-hooks.sh --pm bun --project-dir . --platform both
```

Canonical hook sources live under `scripts/hooks/`.
Installed copies live under `.claude/hooks/` and `.codex/hooks/`.
