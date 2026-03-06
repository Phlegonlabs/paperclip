---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `paperclipai run`

One-command bootstrap and start:

```sh
bun run paperclipai -- run
```

Does:

1. Auto-onboards if config is missing
2. Runs `paperclipai doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
bun run paperclipai -- run --instance dev
```

## `paperclipai onboard`

Interactive first-time setup:

```sh
bun run paperclipai -- onboard
```

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
bun run paperclipai -- onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
bun run paperclipai -- onboard --yes
```

## `paperclipai doctor`

Health checks with optional auto-repair:

```sh
bun run paperclipai -- doctor
bun run paperclipai -- doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `paperclipai configure`

Update configuration sections:

```sh
bun run paperclipai -- configure --section server
bun run paperclipai -- configure --section secrets
bun run paperclipai -- configure --section storage
```

## `paperclipai env`

Show resolved environment configuration:

```sh
bun run paperclipai -- env
```

## `paperclipai allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
bun run paperclipai -- allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.paperclip/instances/default/config.json` |
| Database | `~/.paperclip/instances/default/db` |
| Logs | `~/.paperclip/instances/default/logs` |
| Storage | `~/.paperclip/instances/default/data/storage` |
| Secrets key | `~/.paperclip/instances/default/secrets/master.key` |

Override with:

```sh
PAPERCLIP_HOME=/custom/home PAPERCLIP_INSTANCE_ID=dev bun run paperclipai -- run
```

Or pass `--data-dir` directly on any command:

```sh
bun run paperclipai -- run --data-dir ./tmp/paperclip-dev
bun run paperclipai -- doctor --data-dir ./tmp/paperclip-dev
```
