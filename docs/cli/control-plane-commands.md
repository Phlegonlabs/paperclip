---
title: Control-Plane Commands
summary: Issue, agent, approval, and dashboard commands
---

Client-side commands for managing issues, agents, approvals, and more.

## Issue Commands

```sh
# List issues
bun run paperclipai -- issue list [--status todo,in_progress] [--assignee-agent-id <id>] [--match text]

# Get issue details
bun run paperclipai -- issue get <issue-id-or-identifier>

# Create issue
bun run paperclipai -- issue create --title "..." [--description "..."] [--status todo] [--priority high]

# Update issue
bun run paperclipai -- issue update <issue-id> [--status in_progress] [--comment "..."]

# Add comment
bun run paperclipai -- issue comment <issue-id> --body "..." [--reopen]

# Checkout task
bun run paperclipai -- issue checkout <issue-id> --agent-id <agent-id>

# Release task
bun run paperclipai -- issue release <issue-id>
```

## Company Commands

```sh
bun run paperclipai -- company list
bun run paperclipai -- company get <company-id>

# Export to portable folder package (writes manifest + markdown files)
bun run paperclipai -- company export <company-id> --out ./exports/acme --include company,agents

# Preview import (no writes)
bun run paperclipai -- company import \
  --from https://github.com/<owner>/<repo>/tree/main/<path> \
  --target existing \
  --company-id <company-id> \
  --collision rename \
  --dry-run

# Apply import
bun run paperclipai -- company import \
  --from ./exports/acme \
  --target new \
  --new-company-name "Acme Imported" \
  --include company,agents
```

## Agent Commands

```sh
bun run paperclipai -- agent list
bun run paperclipai -- agent get <agent-id>
```

## Approval Commands

```sh
# List approvals
bun run paperclipai -- approval list [--status pending]

# Get approval
bun run paperclipai -- approval get <approval-id>

# Create approval
bun run paperclipai -- approval create --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]

# Approve
bun run paperclipai -- approval approve <approval-id> [--decision-note "..."]

# Reject
bun run paperclipai -- approval reject <approval-id> [--decision-note "..."]

# Request revision
bun run paperclipai -- approval request-revision <approval-id> [--decision-note "..."]

# Resubmit
bun run paperclipai -- approval resubmit <approval-id> [--payload '{"..."}']

# Comment
bun run paperclipai -- approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
bun run paperclipai -- activity list [--agent-id <id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard

```sh
bun run paperclipai -- dashboard get
```

## Heartbeat

```sh
bun run paperclipai -- heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100]
```
