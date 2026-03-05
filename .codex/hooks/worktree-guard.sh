#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/hook-input.sh"

FILE_PATH="$(hook_get_file_path "${1:-}")"

for required_file in "docs/architecture.md" "docs/plans.md" "tasks/todo.md" "CLAUDE.md" "AGENTS.md"; do
  if [[ ! -f "$required_file" ]]; then
    echo "[workflow] Missing required workflow file: $required_file"
    exit 2
  fi
done

if [[ -n "$FILE_PATH" ]] && [[ "$FILE_PATH" =~ ^(server|ui|cli|packages)/ ]]; then
  if ! grep -q "Task ID:" tasks/todo.md; then
    echo "[workflow] Refusing code edit without a task tracker baseline in tasks/todo.md"
    exit 2
  fi
fi

exit 0
