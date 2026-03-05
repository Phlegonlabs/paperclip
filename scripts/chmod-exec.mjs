import { chmod } from "node:fs/promises";
import path from "node:path";

const [, , targetArg] = process.argv;

if (!targetArg) {
  console.error("Usage: node scripts/chmod-exec.mjs <file>");
  process.exit(1);
}

if (process.platform !== "win32") {
  await chmod(path.resolve(targetArg), 0o755);
}
