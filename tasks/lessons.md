# Paperclip Lessons Learned

Record durable lessons here when they should survive beyond chat history.

## Entry Format

- Date:
- Topic:
- Lesson:
- Action:

## Lessons

- Date: 2026-03-05
- Topic: Documentation boundaries
- Lesson: `doc/` and `docs/` already served different audiences before workflow bootstrap; treating them as one layer would create immediate drift.
- Action: Keep internal workflow docs explicit about which layer owns which truth.

- Date: 2026-03-05
- Topic: Package manager execution
- Lesson: Repo docs should stay canonical on `pnpm`, but some local environments only expose it through Corepack.
- Action: Document `corepack pnpm` as a fallback without rewriting the repo contract around the fallback.

- Date: 2026-03-05
- Topic: Verification assumptions
- Lesson: A clean git worktree does not imply the verification environment is actually provisioned; missing `node_modules` can block tests entirely.
- Action: Always report environment-level verification blockers separately from code-level failures.

- Date: 2026-03-05
- Topic: Windows command execution
- Lesson: Resolving a command on `PATH` is not enough on Windows when the real target is a `.cmd` launcher; adapter execution needs an explicit Windows-aware fallback.
- Action: Keep Windows command-launch behavior covered by targeted adapter tests and track removal of shell-based fallback separately.

- Date: 2026-03-05
- Topic: Build script portability
- Lesson: Repo build steps that rely on Unix utilities such as `cp` or `chmod` fail immediately on Windows even when the TypeScript build itself is healthy.
- Action: Prefer Node-based file operations in package scripts that must run cross-platform.
