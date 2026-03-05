#!/usr/bin/env bash

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

changed_files="$(git diff --name-only -- server ui cli packages scripts docs CLAUDE.md AGENTS.md tasks 2>/dev/null || true)"
if [[ -z "$changed_files" ]]; then
  exit 0
fi

if printf '%s\n' "$changed_files" | grep -Eq '^(server|ui|cli|packages)/'; then
  if ! printf '%s\n' "$changed_files" | grep -Eq '^(docs/|tasks/|CLAUDE\.md|AGENTS\.md)'; then
    echo "[workflow] Code changed without any workflow-doc or task-tracker updates."
    echo "[workflow] If behavior, commands, or process changed, update docs/ and tasks/ in the same task."
  fi
fi

exit 0
