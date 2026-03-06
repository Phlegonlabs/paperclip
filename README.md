<p align="center">
  <img src="doc/assets/header.png" alt="Paperclip — runs your business" width="720" />
</p>

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> &middot;
  <a href="#what-ships-today"><strong>What Ships Today</strong></a> &middot;
  <a href="#repo-map"><strong>Repo Map</strong></a> &middot;
  <a href="https://paperclip.ing/docs"><strong>Docs</strong></a> &middot;
  <a href="https://github.com/Phlegonlabs/paperclip"><strong>GitHub</strong></a> &middot;
  <a href="https://discord.gg/m4HZY7xNG3"><strong>Discord</strong></a>
</p>

# Paperclip

Paperclip is a control plane for AI-agent companies.

This repository is a Bun workspace monorepo that gives a board operator one place to:

- create companies
- hire and organize agents
- assign and track work through issues, projects, and goals
- run agent heartbeats
- review approvals and governance events
- manage budgets, costs, secrets, attachments, and audit activity

Paperclip is not the agent runtime itself. It orchestrates agents, stores company state, and exposes the API, UI, CLI, and adapter surface that operators and agents use.

## Current Status

Paperclip already ships a working local control plane with:

- an Express API server in `server/`
- a React + Vite board UI in `ui/`
- a Bun CLI in `cli/`
- a Drizzle/PostgreSQL data layer in `packages/db/`
- shared contracts in `packages/shared/`
- built-in adapters for local coding-agent workflows and OpenClaw
- a Cloudflare Worker workspace in `apps/control-plane/`

The Cloudflare workspace is a migration target, not the full runtime yet.

Today, the main `/api` application still runs in `server/`. The Worker currently owns the same-origin asset/health entrypoint and the hardened realtime WebSocket route.

## What Ships Today

- Multi-company control plane with company-scoped data and company switching
- Board auth plus agent bearer/API-key auth
- Agent lifecycle management: org chart, config revisions, permissions, keys, wakeups, budgets, runtime state
- Issue workflow: identifiers, comments, labels, attachments, approval links, atomic checkout, release, live-run inspection
- Projects and goals tied to company work
- Approval workflows for hiring and CEO strategy, including revision requests and comments
- Cost event ingestion plus company, project, and agent cost summaries
- Secret management with local encrypted storage by default
- Invite and join-request flows for humans and agents, including OpenClaw onboarding endpoints
- Live UI updates over `/api/companies/:companyId/events/ws`
- Company import/export using `paperclip.manifest.json` plus markdown files

## Built-in Adapters

The current shared contract includes these adapter types:

- `process`
- `http`
- `claude_local`
- `codex_local`
- `opencode_local`
- `cursor`
- `openclaw`

The repo also ships role templates under `agents/` for default personas such as `ceo`, `cto`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, and `general`.

## Repo Map

- `server/` - Express REST API, auth, orchestration, storage, secrets, heartbeat execution
- `ui/` - React board UI served statically or through Vite middleware in dev
- `cli/` - `paperclipai` setup, diagnostics, config, backup, and client-side control-plane commands
- `apps/control-plane/` - Cloudflare Worker for same-origin health, assets, and realtime delivery
- `packages/db/` - Drizzle schema, migrations, Postgres client, backup helpers
- `packages/shared/` - shared validators, types, constants, config schema, route contracts
- `packages/adapters/*` - built-in adapter packages
- `packages/adapter-utils/` - shared adapter helpers
- `agents/` - repo-tracked starter agent templates
- `skills/` - Paperclip skills used in agent contexts
- `doc/` - internal product, implementation, deployment, and database docs
- `docs/` - public docs site plus internal workflow docs
- `tasks/` - live task tracker and lessons learned

## Quickstart

Requirements:

- Node.js 20+
- Bun 1.3+

Clone and run from the repo root:

```bash
git clone https://github.com/Phlegonlabs/paperclip.git
cd paperclip
bun install
bun run paperclipai -- run
```

`bun run paperclipai -- run` will:

1. create local config if missing
2. run setup diagnostics and repairs
3. start Paperclip when the instance is healthy

If you want the raw dev loop instead:

```bash
bun run dev
```

Local defaults:

- API: `http://localhost:3100`
- UI: same origin as the API server in dev
- database: embedded PostgreSQL at `~/.paperclip/instances/default/db`
- storage: local files at `~/.paperclip/instances/default/data/storage`
- secrets: local encrypted provider with key file at `~/.paperclip/instances/default/secrets/master.key`

Quick checks:

```bash
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

## Deployment Modes

Paperclip supports two runtime modes:

- `local_trusted`
  - default for local single-user use
  - implicit board access
  - private exposure only
- `authenticated`
  - session auth for board users
  - agent bearer auth for machine access
  - supports `private` and `public` exposure policies

Useful commands:

```bash
bun run dev --tailscale-auth
bun run paperclipai -- allowed-hostname <hostname>
bun run paperclipai -- auth bootstrap-ceo
```

Use authenticated mode if the instance is not bound to loopback only.

## CLI Examples

The CLI is not just for onboarding. It also acts as a control-plane client.

Set a default context once:

```bash
bun run paperclipai -- context set --api-base http://localhost:3100 --company-id <company-id>
```

Then use client commands:

```bash
bun run paperclipai -- company list
bun run paperclipai -- issue list
bun run paperclipai -- issue create --title "Investigate checkout conflict"
bun run paperclipai -- issue update <issue-id> --status in_progress --comment "Started triage"
bun run paperclipai -- heartbeat run --agent-id <agent-id>
```

See `doc/CLI.md` for the full CLI surface.

## Development

Common root commands:

```bash
bun install
bun run dev
bun run dev:server
bun run dev:control-plane
bun run typecheck
bun run test:run
bun run build
bun run db:generate
bun run db:migrate
bun run db:backup
```

Verification for a completed change should pass:

```bash
bun run typecheck
bun run test:run
bun run build
```

## Data, Storage, and Secrets

Local development does not require an external database. If `DATABASE_URL` is unset, Paperclip starts embedded PostgreSQL automatically.

You can switch to external Postgres by setting `DATABASE_URL`.

Current provider contracts:

- storage: `local_disk`, `s3`, `r2`
- secrets: `local_encrypted`, `cloudflare_encrypted`, `aws_secrets_manager`, `gcp_secret_manager`, `vault`

Helpful docs:

- `doc/DEVELOPING.md`
- `doc/DATABASE.md`
- `doc/DEPLOYMENT-MODES.md`
- `doc/DOCKER.md`

## Documentation Map

If you want to understand the product and the concrete implementation contract, read these first:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

Then use the workflow docs for current repo reality:

- `docs/architecture.md`
- `docs/plans.md`
- `docs/implement.md`
- `docs/secrets.md`
- `docs/documentation.md`
- `docs/design.md`

Contributor instructions live in:

- `AGENTS.md`
- `CLAUDE.md`

## API Surface At A Glance

Main route groups under `/api`:

- `health`
- `companies`
- `agents`
- `projects`
- `issues`
- `goals`
- `approvals`
- `costs`
- `activity`
- `dashboard`
- `access`
- `secrets`
- `attachments`
- `invites` and `join-requests`
- `skills`

For the concrete V1 contract, prefer `doc/SPEC-implementation.md` over marketing copy.

## Community

- Docs: https://paperclip.ing/docs
- GitHub: https://github.com/Phlegonlabs/paperclip
- Discord: https://discord.gg/m4HZY7xNG3

<p align="center">
  <img src="doc/assets/footer.jpg" alt="" width="720" />
</p>
