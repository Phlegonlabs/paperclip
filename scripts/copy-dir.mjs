import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const [, , sourceArg, targetArg] = process.argv;

if (!sourceArg || !targetArg) {
  console.error("Usage: node scripts/copy-dir.mjs <source> <target>");
  process.exit(1);
}

const source = path.resolve(sourceArg);
const target = path.resolve(targetArg);

await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true, force: true });
