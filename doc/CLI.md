# CLI Reference

Paperclip CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
bun run paperclipai -- --help
```

First-time local bootstrap + run:

```sh
bun run paperclipai -- run
```

Choose local instance:

```sh
bun run paperclipai -- run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `paperclipai onboard` and `paperclipai configure --section server` set deployment mode in config
- runtime can override mode with `PAPERCLIP_DEPLOYMENT_MODE`
- `paperclipai run` and `paperclipai doctor` do not yet expose a direct `--mode` flag

Target behavior (planned) is documented in `doc/DEPLOYMENT-MODES.md` section 5.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
bun run paperclipai -- allowed-hostname dotta-macbook-pro
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.paperclip`:

```sh
bun run paperclipai -- run --data-dir ./tmp/paperclip-dev
bun run paperclipai -- issue list --data-dir ./tmp/paperclip-dev
```

## Context Profiles

Store local defaults in `~/.paperclip/context.json`:

```sh
bun run paperclipai -- context set --api-base http://localhost:3100 --company-id <company-id>
bun run paperclipai -- context show
bun run paperclipai -- context list
bun run paperclipai -- context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
bun run paperclipai -- context set --api-key-env-var-name PAPERCLIP_API_KEY
export PAPERCLIP_API_KEY=...
```

## Company Commands

```sh
bun run paperclipai -- company list
bun run paperclipai -- company get <company-id>
bun run paperclipai -- company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
bun run paperclipai -- company delete PAP --yes --confirm PAP
bun run paperclipai -- company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `PAPERCLIP_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `PAPERCLIP_COMPANY_ID`), not another company.

## Issue Commands

```sh
bun run paperclipai -- issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
bun run paperclipai -- issue get <issue-id-or-identifier>
bun run paperclipai -- issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
bun run paperclipai -- issue update <issue-id> [--status in_progress] [--comment "..."]
bun run paperclipai -- issue comment <issue-id> --body "..." [--reopen]
bun run paperclipai -- issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
bun run paperclipai -- issue release <issue-id>
```

## Agent Commands

```sh
bun run paperclipai -- agent list --company-id <company-id>
bun run paperclipai -- agent get <agent-id>
```

## Approval Commands

```sh
bun run paperclipai -- approval list --company-id <company-id> [--status pending]
bun run paperclipai -- approval get <approval-id>
bun run paperclipai -- approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
bun run paperclipai -- approval approve <approval-id> [--decision-note "..."]
bun run paperclipai -- approval reject <approval-id> [--decision-note "..."]
bun run paperclipai -- approval request-revision <approval-id> [--decision-note "..."]
bun run paperclipai -- approval resubmit <approval-id> [--payload '{"...":"..."}']
bun run paperclipai -- approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
bun run paperclipai -- activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
bun run paperclipai -- dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
bun run paperclipai -- heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.paperclip/instances/default`:

- config: `~/.paperclip/instances/default/config.json`
- embedded db: `~/.paperclip/instances/default/db`
- logs: `~/.paperclip/instances/default/logs`
- storage: `~/.paperclip/instances/default/data/storage`
- secrets key: `~/.paperclip/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev bun run paperclipai -- run
```

## Storage Configuration

Configure storage provider and settings:

```sh
bun run paperclipai -- configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
