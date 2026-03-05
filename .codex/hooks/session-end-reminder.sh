#!/usr/bin/env bash

set -euo pipefail

if [[ -f "tasks/todo.md" ]] && grep -q "Commit Status: pending" tasks/todo.md; then
  echo "[workflow] Session ended with pending tracked tasks in tasks/todo.md."
fi

if [[ -f "tasks/lessons.md" ]]; then
  echo "[workflow] Record any non-obvious repo lesson in tasks/lessons.md before context is lost."
fi

exit 0
