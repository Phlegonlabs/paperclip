import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { testEnvironment } from "./test.js";

const tempRoots: string[] = [];
const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

async function createFakeCodexCommand(mode: "success" | "auth_required") {
  const root = path.join(
    os.tmpdir(),
    `paperclip-codex-local-env-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  const binDir = path.join(root, "bin");
  const cwd = path.join(root, "workspace");
  await fs.mkdir(binDir, { recursive: true });
  await fs.mkdir(cwd, { recursive: true });

  const driverPath = path.join(binDir, "codex-driver.js");
  const driverSource = mode === "success"
    ? [
        "console.log(JSON.stringify({",
        '  type: "item.completed",',
        '  item: { type: "agent_message", text: "hello" },',
        "}));",
      ].join("\n")
    : [
        'console.error("authentication required");',
        "process.exit(1);",
      ].join("\n");
  await fs.writeFile(driverPath, `${driverSource}\n`, "utf8");

  if (process.platform === "win32") {
    const wrapperPath = path.join(binDir, "codex.cmd");
    await fs.writeFile(
      wrapperPath,
      `@echo off\r\n"${process.execPath}" "%~dp0codex-driver.js" %*\r\n`,
      "utf8",
    );
  } else {
    const wrapperPath = path.join(binDir, "codex");
    await fs.writeFile(
      wrapperPath,
      `#!/bin/sh\n"${process.execPath}" "$(dirname "$0")/codex-driver.js" "$@"\n`,
      "utf8",
    );
    await fs.chmod(wrapperPath, 0o755);
  }

  tempRoots.push(root);
  const delimiter = process.platform === "win32" ? ";" : ":";
  const existingPath = process.env.PATH ?? process.env.Path ?? "";
  return {
    cwd,
    pathValue: existingPath ? `${binDir}${delimiter}${existingPath}` : binDir,
  };
}

afterEach(async () => {
  if (originalOpenAiApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  }
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (!root) continue;
    await fs.rm(root, { recursive: true, force: true });
  }
});

describe("codex_local environment diagnostics", () => {
  it("treats successful hello probes as valid local Codex auth when no OPENAI_API_KEY is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const fakeCodex = await createFakeCodexCommand("success");

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        command: "codex",
        cwd: fakeCodex.cwd,
        env: {
          PATH: fakeCodex.pathValue,
        },
      },
    });

    expect(result.status).toBe("pass");
    expect(result.checks.some((check) => check.code === "codex_auth_ready_without_openai_api_key")).toBe(true);
    expect(result.checks.some((check) => check.code === "codex_hello_probe_passed")).toBe(true);
    expect(result.checks.some((check) => check.code === "codex_openai_api_key_missing")).toBe(false);
  });

  it("warns when Codex auth is not ready and no OPENAI_API_KEY is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const fakeCodex = await createFakeCodexCommand("auth_required");

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "codex_local",
      config: {
        command: "codex",
        cwd: fakeCodex.cwd,
        env: {
          PATH: fakeCodex.pathValue,
        },
      },
    });

    expect(result.status).toBe("warn");
    expect(result.checks.some((check) => check.code === "codex_hello_probe_auth_required")).toBe(true);
    expect(result.checks.some((check) => check.code === "codex_openai_api_key_missing")).toBe(false);
  });
});
