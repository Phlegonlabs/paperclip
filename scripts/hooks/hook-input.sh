#!/usr/bin/env bash

set -euo pipefail

HOOK_INPUT_CACHE="${HOOK_INPUT_CACHE:-}"

hook_read_payload() {
  if [[ -n "${HOOK_INPUT_CACHE:-}" ]]; then
    printf '%s' "$HOOK_INPUT_CACHE"
    return
  fi

  local payload=""

  if [[ -n "${HOOK_PAYLOAD:-}" ]]; then
    payload="$HOOK_PAYLOAD"
  elif [[ -n "${CLAUDE_HOOK_DATA:-}" ]]; then
    payload="$CLAUDE_HOOK_DATA"
  elif [[ -n "${CODEX_HOOK_DATA:-}" ]]; then
    payload="$CODEX_HOOK_DATA"
  elif [[ ! -t 0 ]]; then
    payload="$(cat)"
  fi

  HOOK_INPUT_CACHE="$payload"
  export HOOK_INPUT_CACHE
  printf '%s' "$HOOK_INPUT_CACHE"
}

hook_json_get() {
  local query="$1"
  local fallback="${2:-}"
  local payload

  payload="$(hook_read_payload)"
  if [[ -z "$payload" ]] || ! command -v jq >/dev/null 2>&1; then
    printf '%s' "$fallback"
    return
  fi

  if ! printf '%s' "$payload" | jq -e . >/dev/null 2>&1; then
    printf '%s' "$fallback"
    return
  fi

  local value
  value="$(printf '%s' "$payload" | jq -r "$query // empty" 2>/dev/null || true)"
  if [[ -z "$value" || "$value" == "null" ]]; then
    printf '%s' "$fallback"
    return
  fi

  printf '%s' "$value"
}

hook_get_prompt() {
  hook_json_get '.prompt // .user_message // .message // .text' ''
}

hook_get_tool_command() {
  hook_json_get '.tool_input.command // .tool_input.raw_command // .command' ''
}

hook_get_file_path() {
  local fallback="${1:-}"
  hook_json_get '.tool_input.file_path // .tool_input.path // .file_path // .path' "$fallback"
}
