# CLAUDE.md

Claude working in this repository should follow the current repo contract and the workflow docs added during conversion.

## Read Order

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`
6. `docs/architecture.md`
7. `docs/plans.md`
8. `docs/implement.md`
9. `docs/secrets.md`
10. `tasks/todo.md`

## Working Rules

- Treat `doc/SPEC-implementation.md` as the concrete V1 contract.
- Keep all business entities company-scoped.
- Keep DB, shared contracts, server routes/services, and UI clients in sync when behavior changes.
- Prefer direct fixes or rewrites over compatibility shims.
- Do not auto-commit or auto-push.
- Confirm with the user before any push.
- Keep workflow docs and task trackers current when implementation changes behavior or process.

## Commands

- Install: `bun install`
- Dev: `bun run dev`
- Server only: `bun run dev:server`
- Cloudflare control plane: `bun run dev:control-plane`
- Typecheck: `bun run typecheck`
- Tests: `bun run test:run`
- Build: `bun run build`

## Documentation Split

- `doc/` = internal product/spec/deployment contract
- `docs/` public pages = user-facing documentation
- `docs/*.md` workflow files in the root of `docs/` = internal execution workflow
- `tasks/` = live tracker and lessons

## Hooks

- Repo-managed hook sources live under `scripts/hooks/`.
- Installed hook payloads live under `.claude/hooks/` and `.codex/hooks/`.
- Install/update them with `scripts/setup-hooks.sh`.
