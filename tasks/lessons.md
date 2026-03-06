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
- Lesson: Once the repo contract moves to Bun, command examples and workflow docs must stop treating old package-manager fallbacks as canonical.
- Action: Keep Bun as the only documented contract and regenerate lockfiles, hooks, and Docker steps together.

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

- Date: 2026-03-05
- Topic: Package-manager migration
- Lesson: Switching the repo contract from an old workspace manager to Bun is not just a lockfile change; Docker, hook defaults, CLI examples, and workflow docs drift immediately if they are not updated in the same task.
- Action: Treat package-manager changes as a cross-repo contract update and verify every canonical command surface together.

- Date: 2026-03-05
- Topic: Cloudflare migration
- Lesson: A same-origin Cloudflare cutover can start safely as a parallel workspace, but architecture docs must say explicitly that the Worker is a migration target until auth, persistence, and realtime behavior truly move over.
- Action: Keep `docs/architecture.md`, `docs/plans.md`, and `tasks/todo.md` explicit about skeleton-vs-cutover status.

- Date: 2026-03-06
- Topic: Durable Object realtime security
- Lesson: A same-origin Worker realtime skeleton is not safe by default; websocket auth must happen before the Durable Object handoff, and the Durable Object itself still needs signed internal request validation so direct bypass traffic cannot subscribe or broadcast.
- Action: Keep realtime auth tests covering unauthenticated upgrade rejection, signed internal publish, and canonical `LiveEvent` payload delivery.

- Date: 2026-03-06
- Topic: Windows file URLs
- Lesson: `new URL(..., import.meta.url).pathname` is not a safe filesystem path on Windows for migration folders or other `fs`/Drizzle callers; it can turn into `C:\\C:\\...` once normalized downstream.
- Action: Resolve module-relative filesystem paths through `fileURLToPath(...)` and reuse the same helper across every migration entrypoint.

- Date: 2026-03-06
- Topic: Default agent templates
- Lesson: The product docs talked about default agents long before the repo had real shipped template files; leaving personas as external links created immediate drift and made onboarding dependent on an old upstream GitHub repo.
- Action: Keep repo-tracked templates under `agents/<role>/` and materialize editable per-agent copies at create time for local adapters.
