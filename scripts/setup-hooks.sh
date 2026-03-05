#!/usr/bin/env bash
# setup-hooks.sh — install Paperclip repo-local hooks for Claude Code and Codex.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK_SOURCE_DIR="$SCRIPT_DIR/hooks"

PM="pnpm"
PROJECT_DIR="$REPO_ROOT"
PLATFORM="both"
DRY_RUN=false
BACKUP=false
REPLACE=false

pick_runtime() {
  if command -v node >/dev/null 2>&1; then
    echo "node"
  else
    echo "node"
  fi
}

to_node_path() {
  local path_value="$1"
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$path_value"
  else
    printf '%s' "$path_value"
  fi
}

resolve_template() {
  local platform="$1"
  case "$platform" in
    claude) echo "$HOOK_SOURCE_DIR/settings.template.json" ;;
    codex) echo "$HOOK_SOURCE_DIR/settings.template.codex.json" ;;
    *)
      echo "Unsupported platform: $platform" >&2
      exit 1
      ;;
  esac
}

resolve_platform_dir() {
  local platform="$1"
  case "$platform" in
    claude) echo "$PROJECT_DIR/.claude" ;;
    codex) echo "$PROJECT_DIR/.codex" ;;
    *)
      echo "Unsupported platform: $platform" >&2
      exit 1
      ;;
  esac
}

resolve_platforms() {
  case "$PLATFORM" in
    claude|codex) echo "$PLATFORM" ;;
    both) echo "claude codex" ;;
    *)
      echo "Unsupported platform: $PLATFORM" >&2
      exit 1
      ;;
  esac
}

generate_hooks_json() {
  local template="$1"
  local runtime
  local template_for_node
  runtime="$(pick_runtime)"
  template_for_node="$(to_node_path "$template")"

  "$runtime" -e "
    const fs = require('fs');
    const templatePath = process.argv[1];
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    const hooks = template.hooks;

    function clean(value) {
      if (Array.isArray(value)) return value.map(clean);
      if (value && typeof value === 'object') {
        const result = {};
        for (const [key, inner] of Object.entries(value)) {
          if (key.startsWith('$')) continue;
          result[key] = clean(inner);
        }
        return result;
      }
      return value;
    }

    const json = JSON.stringify(clean(hooks), null, 2).replace(/\\{\\{PM\\}\\}/g, '$PM');
    console.log(json);
  " "$template_for_node"
}

install_hook_scripts() {
  local hooks_dir="$1"
  local copied_count=0

  mkdir -p "$hooks_dir"

  for src in "$HOOK_SOURCE_DIR"/*.sh; do
    [[ -f "$src" ]] || continue
    local file_name
    file_name="$(basename "$src")"
    local content
    content="$(cat "$src")"
    content="${content//\{\{PM\}\}/$PM}"
    printf '%s\n' "$content" > "$hooks_dir/$file_name"
    chmod +x "$hooks_dir/$file_name" 2>/dev/null || true
    copied_count=$((copied_count + 1))
  done

  echo "$copied_count"
}

merge_settings() {
  local settings_file="$1"
  local hooks_json="$2"
  local runtime
  local settings_file_for_node

  runtime="$(pick_runtime)"
  settings_file_for_node="$(to_node_path "$settings_file")"

  if [[ -f "$settings_file" ]]; then
    if [[ "$BACKUP" == true ]]; then
      cp "$settings_file" "$settings_file.bak"
    fi

    if [[ "$REPLACE" == true ]]; then
      "$runtime" -e "
        const fs = require('fs');
        const settingsPath = process.argv[2];
        const existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        existing.hooks = JSON.parse(process.argv[1]);
        fs.writeFileSync(settingsPath, JSON.stringify(existing, null, 2) + '\n');
      " "$hooks_json" "$settings_file_for_node"
      return
    fi

    "$runtime" -e "
      const fs = require('fs');
      const incoming = JSON.parse(process.argv[1]);
      const settingsPath = process.argv[2];
      const existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      const stable = (value) => {
        if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
        if (value && typeof value === 'object') {
          return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
        }
        return JSON.stringify(value);
      };

      const merge = (current, next) => {
        if (Array.isArray(current) && Array.isArray(next)) {
          const seen = new Set(current.map((item) => stable(item)));
          const merged = [...current];
          for (const item of next) {
            const key = stable(item);
            if (!seen.has(key)) {
              merged.push(item);
              seen.add(key);
            }
          }
          return merged;
        }

        if (
          current &&
          next &&
          typeof current === 'object' &&
          typeof next === 'object' &&
          !Array.isArray(current) &&
          !Array.isArray(next)
        ) {
          const result = { ...current };
          for (const [key, value] of Object.entries(next)) {
            result[key] = key in result ? merge(result[key], value) : value;
          }
          return result;
        }

        return next;
      };

      const existingHooks =
        existing && typeof existing.hooks === 'object' && existing.hooks !== null
          ? existing.hooks
          : {};
      existing.hooks = merge(existingHooks, incoming);
      fs.writeFileSync(settingsPath, JSON.stringify(existing, null, 2) + '\n');
    " "$hooks_json" "$settings_file_for_node"
    return
  fi

  printf '{\n  "hooks": %s\n}\n' "$hooks_json" > "$settings_file"
}

install_for_platform() {
  local platform="$1"
  local config_dir hooks_dir settings_file template hooks_json copied_count

  template="$(resolve_template "$platform")"
  config_dir="$(resolve_platform_dir "$platform")"
  hooks_dir="$config_dir/hooks"
  settings_file="$config_dir/settings.json"
  hooks_json="$(generate_hooks_json "$template")"

  if [[ "$DRY_RUN" == true ]]; then
    echo "Platform: $platform"
    echo "$hooks_json"
    return
  fi

  mkdir -p "$config_dir"
  merge_settings "$settings_file" "$hooks_json"
  copied_count="$(install_hook_scripts "$hooks_dir")"

  echo "Installed hooks for $platform"
  echo "  settings: $settings_file"
  echo "  scripts:  $hooks_dir ($copied_count files)"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pm) PM="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --platform) PLATFORM="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --backup) BACKUP=true; shift ;;
    --replace) REPLACE=true; shift ;;
    -h|--help)
      echo "Usage: setup-hooks.sh [--pm <package-manager>] [--project-dir <path>] [--platform <claude|codex|both>] [--dry-run] [--backup] [--replace]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$HOOK_SOURCE_DIR" ]]; then
  echo "Hook source directory not found: $HOOK_SOURCE_DIR" >&2
  exit 1
fi

read -r -a platforms <<< "$(resolve_platforms)"
for platform in "${platforms[@]}"; do
  install_for_platform "$platform"
done
