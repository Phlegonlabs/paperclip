# Paperclip Secrets Baseline

This document captures the internal secrets and sensitive configuration baseline for the current repo. It complements the public deployment docs and is scoped to what contributors need to know to work safely.

## Rules

- Never commit plaintext secrets, `.env`, generated key files, or runtime credential dumps.
- Prefer secret references over inline sensitive values in agent config.
- Treat `PAPERCLIP_SECRETS_STRICT_MODE=true` as the target posture outside trusted local development.
- If a task changes secret handling or required environment variables, update this file in the same change.

## Required Baseline Secrets and Sensitive Config

### Database

- `DATABASE_URL`
  Required when running against external PostgreSQL.
  Optional for embedded local mode.

### Secrets provider

- `PAPERCLIP_SECRETS_MASTER_KEY`
  Optional direct key override.
- `PAPERCLIP_SECRETS_MASTER_KEY_FILE`
  Optional file-path override for the local encrypted provider.
- `PAPERCLIP_CLOUDFLARE_SECRETS_KEY_ENV_NAME`
  Optional override for the env var name that the `cloudflare_encrypted` provider reads.
- `PAPERCLIP_SECRETS_STRICT_MODE`
  Enables strict enforcement for sensitive env values.

### Runtime mode and exposure

These are sensitive operational settings even when they are not secrets:

- `PAPERCLIP_DEPLOYMENT_MODE`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE`
- `HOST`
- `PAPERCLIP_HOME`
- `PAPERCLIP_INSTANCE_ID`
- `PAPERCLIP_CONTROL_PLANE_URL`
- `PAPERCLIP_CONTROL_PLANE_INTERNAL_TOKEN`

### Adapter/provider keys currently relevant to this repo

- `ANTHROPIC_API_KEY`
  Used by Claude-local style adapters and related environment checks.
- `OPENAI_API_KEY`
  Used by Codex-local, OpenCode/OpenClaw-related flows, and related environment checks.
- `CURSOR_API_KEY`
  Relevant when Cursor-backed runtime paths are enabled.

### Cloud storage and edge deployment

- `PAPERCLIP_STORAGE_PROVIDER`
- `PAPERCLIP_STORAGE_R2_BUCKET`
- `PAPERCLIP_STORAGE_R2_ACCOUNT_ID`
- `PAPERCLIP_STORAGE_R2_ENDPOINT`
- `PAPERCLIP_STORAGE_R2_ACCESS_KEY_ID`
- `PAPERCLIP_STORAGE_R2_SECRET_ACCESS_KEY`
- `PAPERCLIP_STORAGE_R2_PREFIX`
- `BETTER_AUTH_SECRET`
- `PAPERCLIP_AGENT_JWT_SECRET`
- `PAPERCLIP_AGENT_JWT_ISSUER`
- `PAPERCLIP_AGENT_JWT_AUDIENCE`

## Storage and Secret Material

### Default local posture

- Secret metadata and versions are stored in PostgreSQL.
- Secret values are encrypted at rest through the local encrypted provider.
- The default local key file lives under the instance secrets directory.

### Cloud posture

- Database, storage, and secrets configuration must be treated as deployment inputs rather than repo state.
- `cloudflare_encrypted` is now a first-class provider contract for control-plane deployments that keep the master key in Worker environment secrets instead of a local key file.
- `r2` is now a first-class provider contract for Cloudflare object storage.
- The current same-origin Worker realtime slice also requires a shared internal bearer token between `server/` and `apps/control-plane/` so the server can publish canonical live events and sync minimal access snapshots into Worker D1.

## Operational Guidance

### Local development

- Leave `DATABASE_URL` unset to use embedded PostgreSQL.
- Keep local key material out of git.
- Use `bun run paperclipai -- configure --section secrets` or `bun run paperclipai -- onboard` rather than hand-editing secret config where possible.

### Migration of inline secrets

If agent configs still contain inline sensitive env values:

- Dry run: `bun run secrets:migrate-inline-env`
- Apply: `bun run secrets:migrate-inline-env --apply`

### Rotation and incident response

- Revoke or replace any exposed provider key immediately.
- Rotate the local encrypted master key only with a documented migration plan.
- Rotate the Cloudflare env-backed master key only with a documented re-encryption plan for stored secret versions.
- Record any secret-handling lessons or hazards in `tasks/lessons.md`.

## Scope Boundary

This file is intentionally not a full public environment-variable reference. Public deployment reference remains in:

- `docs/deploy/environment-variables.md`
- `docs/deploy/secrets.md`
- `doc/DEVELOPING.md`
- `doc/DATABASE.md`

Use this file for contributor workflow posture and current repo-sensitive defaults.
