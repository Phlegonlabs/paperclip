import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { execute } from "@paperclipai/adapter-claude-local/server";

async function writeFakeClaudeCommand(root: string): Promise<string> {
  const script = `#!/usr/bin/env node
const fs = require("node:fs");

const capturePath = process.env.PAPERCLIP_TEST_CAPTURE_PATH;
const payload = {
  argv: process.argv.slice(2),
  prompt: fs.readFileSync(0, "utf8"),
  paperclipEnvKeys: Object.keys(process.env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort(),
};
if (capturePath) {
  fs.writeFileSync(capturePath, JSON.stringify(payload), "utf8");
}
console.log(JSON.stringify({
  type: "system",
  subtype: "init",
  session_id: "claude-session-1",
  model: "claude-opus-4-6",
}));
console.log(JSON.stringify({
  type: "assistant",
  session_id: "claude-session-1",
  message: { content: [{ type: "text", text: "hello" }] },
}));
console.log(JSON.stringify({
  type: "result",
  subtype: "success",
  session_id: "claude-session-1",
  usage: {
    input_tokens: 3,
    cache_read_input_tokens: 1,
    output_tokens: 2,
  },
  result: "ok",
}));
`;
  if (process.platform === "win32") {
    const scriptPath = path.join(root, "agent.js");
    const commandPath = path.join(root, "agent.cmd");
    const wrapper = `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`;
    await fs.writeFile(scriptPath, script, "utf8");
    await fs.writeFile(commandPath, wrapper, "utf8");
    return commandPath;
  }

  const commandPath = path.join(root, "agent");
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
  return commandPath;
}

type CapturePayload = {
  argv: string[];
  prompt: string;
  paperclipEnvKeys: string[];
};

describe("claude execute", () => {
  it("prepends Paperclip API auth guidance to the runtime prompt", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-claude-execute-"));
    const workspace = path.join(root, "workspace");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    const commandPath = await writeFakeClaudeCommand(root);

    let invocationPrompt = "";
    try {
      const result = await execute({
        runId: "run-1",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "CEO",
          adapterType: "claude_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
        onMeta: async (meta) => {
          invocationPrompt = meta.prompt ?? "";
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.argv).toEqual(
        expect.arrayContaining(["--print", "-", "--output-format", "stream-json", "--verbose"]),
      );
      expect(capture.paperclipEnvKeys).toEqual(
        expect.arrayContaining([
          "PAPERCLIP_AGENT_ID",
          "PAPERCLIP_API_KEY",
          "PAPERCLIP_API_URL",
          "PAPERCLIP_COMPANY_ID",
          "PAPERCLIP_RUN_ID",
        ]),
      );
      expect(capture.prompt).toContain("Paperclip runtime note:");
      expect(capture.prompt).toContain("Authorization: Bearer $PAPERCLIP_API_KEY");
      expect(capture.prompt).toContain("curl -sS");
      expect(capture.prompt).toContain("Do not pipe the first API response through python -m json.tool");
      expect(invocationPrompt).toContain("Paperclip runtime note:");
      expect(invocationPrompt).toContain("Authorization: Bearer $PAPERCLIP_API_KEY");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
