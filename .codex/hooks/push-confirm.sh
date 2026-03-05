#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
. "$SCRIPT_DIR/hook-input.sh"

COMMAND="$(hook_get_tool_command)"

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

if printf '%s' "$COMMAND" | grep -Eiq '(^|[[:space:]])git[[:space:]]+push([[:space:]]|$)'; then
  echo "[workflow] git push requires explicit user confirmation in this repository."
  exit 2
fi

exit 0
