# Paperclip Documentation Map

This file explains which documentation layer owns which kind of truth in this repository.

## Documentation Layers

### `doc/`

Internal product and implementation material.

Use this layer for:

- product intent and long-horizon design
- the V1 implementation contract
- internal deployment notes
- deeper model/spec discussions that are not part of the public docs site

Primary files:

- `doc/GOAL.md`
- `doc/PRODUCT.md`
- `doc/SPEC-implementation.md`
- `doc/DEVELOPING.md`
- `doc/DATABASE.md`

### `docs/` public docs site

Public-facing documentation for operators, agent developers, deployment, adapters, CLI, and API reference.

Use this layer for:

- operator guidance
- public deployment instructions
- adapter and API reference
- user-facing architecture summaries

Do not treat a public docs page as the final implementation source when it conflicts with code or `doc/SPEC-implementation.md`.

### `docs/` workflow docs

The root-level workflow docs inside `docs/` are internal execution aids for contributors:

- `docs/architecture.md`
- `docs/plans.md`
- `docs/implement.md`
- `docs/secrets.md`
- `docs/documentation.md`
- `docs/design.md`

Use these for current repo execution, planning, and contributor discipline.

### Root docs and contributor instructions

- `README.md` — public repo entrypoint
- `CLAUDE.md` — execution guidance for Claude-style agents
- `AGENTS.md` — execution guidance for Codex/human/other agents

### Live workflow state

- `tasks/todo.md` — current backlog and active follow-up work
- `tasks/lessons.md` — durable lessons from actual repo work

## Update Rules

### Update `doc/` when

- product contract changes
- V1 scope changes
- deployment or database policy changes materially

### Update public `docs/` pages when

- user-facing setup, API, CLI, adapter, or operator guidance changes
- public terminology or examples drift from current behavior

### Update workflow docs when

- repo structure or runtime boundaries change
- execution rules change
- secrets/config workflow changes
- milestone sequencing changes
- contributor instructions need to be tightened

### Update `tasks/` when

- a follow-up task becomes visible
- a workflow/bootstrap task is completed
- a lesson is learned that future contributors should not rediscover

## Drift Checklist

Before closing a task that changes behavior, check whether the change affects:

1. V1 contract in `doc/SPEC-implementation.md`
2. public operator or deployment guidance in `docs/`
3. internal workflow guidance in `docs/*.md`
4. agent instructions in `CLAUDE.md` or `AGENTS.md`
5. active backlog or lessons in `tasks/`

## Known High-Risk Drift Areas

- `doc/TASKS.md` vs current issue/project implementation
- public architecture summaries vs actual package/runtime boundaries
- secrets guidance spread across `doc/`, public `docs/`, and runtime code
- commands that assume direct `pnpm` availability on every machine
