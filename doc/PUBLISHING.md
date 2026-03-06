# Publishing to npm

This document covers how to build and publish the `paperclipai` CLI package to npm.

## Prerequisites

- Node.js 20+
- Bun 1.3+
- An npm account with publish access to the `paperclipai` package
- Logged in to npm: `npm login`

## One-Command Publish

The fastest way to publish — bumps version, builds, publishes, restores, commits, and tags in one shot:

```bash
./scripts/release.sh patch           # 0.2.7 → 0.2.8
./scripts/release.sh minor           # 0.2.7 → 0.3.0
./scripts/release.sh major           # 0.2.7 → 1.0.0
./scripts/release.sh patch --dry-run # everything except npm publish
```

The script runs all 6 steps below in order. It requires a clean working tree and an active `npm login` session (unless `--dry-run`). After it finishes, push:

```bash
git push && git push origin v<version>
```

## Manual Step-by-Step

If you prefer to run each step individually:

### Quick Reference

```bash
# Release
./scripts/release.sh patch

# Build
bun run build:npm

# Preview what will be published
cd cli && npm pack --dry-run

# Publish
cd cli && npm publish --access public

# Restore dev package.json
mv cli/package.dev.json cli/package.json
```

## Step-by-Step

### 1. Version and changelog

```bash
bun run changeset
bun run version-packages
```

Or use the one-shot release script:

```bash
./scripts/release.sh <patch|minor|major> [--dry-run]
```

### 2. Build

```bash
./scripts/build-npm.sh
```

The build script runs six steps:

1. **Forbidden token check** — scans tracked files for tokens listed in `.git/hooks/forbidden-tokens.txt`. If the file is missing (e.g. on a contributor's machine), the check passes silently. The script never prints which tokens it's searching for.
2. **TypeScript type-check** — runs `bun run typecheck` across all workspace packages.
3. **esbuild bundle** — bundles the CLI entry point (`cli/src/index.ts`) and all workspace package code (`@paperclipai/*`) into a single file at `cli/dist/index.js`. External npm dependencies (express, postgres, etc.) are kept as regular imports.
4. **Generate publishable package.json** — replaces `cli/package.json` with a version that has real npm dependency ranges instead of `workspace:*` references (see [package.dev.json](#packagedevjson) below).
5. **Summary** — prints the bundle size and next steps.

To skip the forbidden token check (e.g. in CI without the token list):

```bash
./scripts/build-npm.sh --skip-checks
```

### 3. Preview (optional)

See what npm will publish:

```bash
cd cli && npm pack --dry-run
```

### 4. Publish

```bash
cd cli && npm publish --access public
```

### 5. Restore dev package.json

After publishing, restore the workspace-aware `package.json`:

```bash
mv cli/package.dev.json cli/package.json
```

### 6. Commit and tag

```bash
git add cli/package.json cli/src/index.ts
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
```

## package.dev.json

During development, `cli/package.json` contains `workspace:*` references like:

```json
{
  "dependencies": {
    "@paperclipai/server": "workspace:*",
    "@paperclipai/db": "workspace:*"
  }
}
```

These tell Bun to resolve those packages from the local monorepo. This is great for development but **npm doesn't understand `workspace:*`** — publishing with these references would cause install failures for users.

The build script solves this with a two-file swap:

1. **Before building:** `cli/package.json` has `workspace:*` refs (the dev version).
2. **During build (`build-npm.sh` step 4):**
   - The dev `package.json` is copied to `package.dev.json` as a backup.
   - `generate-npm-package-json.mjs` reads every workspace package's `package.json`, collects all their external npm dependencies, and writes a new `cli/package.json` with those real dependency ranges — no `workspace:*` refs.
3. **After publishing:** you restore the dev version with `mv package.dev.json package.json`.

The generated publishable `package.json` looks like:

```json
{
  "name": "paperclipai",
  "version": "0.1.0",
  "bin": { "paperclipai": "./dist/index.js" },
  "dependencies": {
    "express": "^5.1.0",
    "postgres": "^3.4.5",
    "commander": "^13.1.0"
  }
}
```

`package.dev.json` is listed in `.gitignore` — it only exists temporarily on disk during the build/publish cycle.

## How the bundle works

The CLI is a monorepo package that imports code from `@paperclipai/server`, `@paperclipai/db`, `@paperclipai/shared`, and several adapter packages. These workspace packages don't exist on npm.

**esbuild** bundles all workspace TypeScript code into a single `dist/index.js` file (~250kb). External npm packages (express, postgres, zod, etc.) are left as normal `import` statements — they get installed by npm when a user runs `npx paperclipai onboard`.

The esbuild configuration lives at `cli/esbuild.config.mjs`. It automatically reads every workspace package's `package.json` to determine which dependencies are external (real npm packages) vs. internal (workspace code to bundle).

## Forbidden token enforcement

The build process includes the same forbidden-token check used by the git pre-commit hook. This catches any accidentally committed tokens before they reach npm.

- Token list: `.git/hooks/forbidden-tokens.txt` (one token per line, `#` comments supported)
- The file lives inside `.git/` and is never committed
- If the file is missing, the check passes — contributors without the list can still build
- The script never prints which tokens are being searched for
- Matches are printed so you know which files to fix, but not which token triggered it

Run the check standalone:

```bash
bun run check:tokens
```

## npm scripts reference

| Script | Command | Description |
|---|---|---|
| `release` | `./scripts/release.sh <patch\|minor\|major> [--dry-run]` | One-command version + build + publish + commit + tag |
| `build:npm` | `bun run build:npm` | Full build (check + typecheck + bundle + package.json) |
| `changeset` | `bun run changeset` | Create or edit a release changeset |
| `version-packages` | `bun run version-packages` | Apply changesets to package versions |
| `check:tokens` | `bun run check:tokens` | Run forbidden token check only |
