#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/hook-input.sh"

PROMPT="$(hook_get_prompt)"

if [[ ! -f "docs/plans.md" || ! -f "tasks/todo.md" ]]; then
  echo "[workflow] Missing workflow docs. Restore docs/plans.md and tasks/todo.md before relying on structured task execution."
  exit 0
fi

if [[ -z "$PROMPT" ]]; then
  exit 0
fi

if printf '%s' "$PROMPT" | grep -Eiq '\b(done|ship|complete|finish)\b'; then
  if grep -q "Commit Status: pending" tasks/todo.md; then
    echo "[workflow] There are still pending tracked tasks in tasks/todo.md. Confirm the intended completion boundary before claiming the session is done."
  fi
fi

exit 0
