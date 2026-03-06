import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  materializeRepoTrackedAgentTemplate,
  supportsRepoTrackedAgentTemplates,
} from "../agent-templates.js";

const ORIGINAL_PAPERCLIP_HOME = process.env.PAPERCLIP_HOME;
const ORIGINAL_PAPERCLIP_INSTANCE_ID = process.env.PAPERCLIP_INSTANCE_ID;

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

afterEach(async () => {
  if (ORIGINAL_PAPERCLIP_HOME === undefined) {
    delete process.env.PAPERCLIP_HOME;
  } else {
    process.env.PAPERCLIP_HOME = ORIGINAL_PAPERCLIP_HOME;
  }
  if (ORIGINAL_PAPERCLIP_INSTANCE_ID === undefined) {
    delete process.env.PAPERCLIP_INSTANCE_ID;
  } else {
    process.env.PAPERCLIP_INSTANCE_ID = ORIGINAL_PAPERCLIP_INSTANCE_ID;
  }
});

describe("repo-tracked agent templates", () => {
  it("copies the role template into the agent workspace and sets instructionsFilePath", async () => {
    const paperclipHome = await makeTempDir("paperclip-home-");
    const templateRoot = await makeTempDir("paperclip-templates-");
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "templates";

    const sourceDir = path.join(templateRoot, "engineer");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, "AGENTS.md"), "# Engineer\n");
    await fs.writeFile(path.join(sourceDir, "HEARTBEAT.md"), "# Engineer heartbeat\n");
    await fs.writeFile(path.join(sourceDir, "SOUL.md"), "# Engineer soul\n");
    await fs.writeFile(path.join(sourceDir, "TOOLS.md"), "# Engineer tools\n");

    const adapterConfig = await materializeRepoTrackedAgentTemplate({
      agentId: "agent-123",
      role: "engineer",
      adapterType: "codex_local",
      adapterConfig: { cwd: "C:/repo" },
      templateRootDir: templateRoot,
    });

    const instructionsFilePath = String(adapterConfig.instructionsFilePath);
    expect(instructionsFilePath).toContain(
      path.join("workspaces", "agent-123", "agents", "engineer", "AGENTS.md"),
    );
    await expect(fs.readFile(instructionsFilePath, "utf8")).resolves.toContain(
      "# Engineer",
    );
    await expect(
      fs.readFile(path.join(path.dirname(instructionsFilePath), "TOOLS.md"), "utf8"),
    ).resolves.toContain("# Engineer tools");

    await fs.rm(paperclipHome, { recursive: true, force: true });
    await fs.rm(templateRoot, { recursive: true, force: true });
  });

  it("preserves an explicit instructionsFilePath without copying templates", async () => {
    const paperclipHome = await makeTempDir("paperclip-home-");
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "templates";

    const adapterConfig = await materializeRepoTrackedAgentTemplate({
      agentId: "agent-123",
      role: "engineer",
      adapterType: "claude_local",
      adapterConfig: { instructionsFilePath: "C:/custom/AGENTS.md" },
    });

    expect(adapterConfig.instructionsFilePath).toBe("C:/custom/AGENTS.md");
    await expect(
      fs.stat(path.join(paperclipHome, "instances", "templates", "workspaces", "agent-123")),
    ).rejects.toThrow();

    await fs.rm(paperclipHome, { recursive: true, force: true });
  });

  it("fails when a local adapter role template bundle is incomplete", async () => {
    const paperclipHome = await makeTempDir("paperclip-home-");
    const templateRoot = await makeTempDir("paperclip-templates-");
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "templates";

    const sourceDir = path.join(templateRoot, "qa");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, "AGENTS.md"), "# QA\n");

    await expect(
      materializeRepoTrackedAgentTemplate({
        agentId: "agent-qa",
        role: "qa",
        adapterType: "cursor",
        adapterConfig: {},
        templateRootDir: templateRoot,
      }),
    ).rejects.toThrow(/Missing: HEARTBEAT\.md, SOUL\.md, TOOLS\.md/);

    await fs.rm(paperclipHome, { recursive: true, force: true });
    await fs.rm(templateRoot, { recursive: true, force: true });
  });

  it("only auto-materializes templates for local adapters with instructions files", () => {
    expect(supportsRepoTrackedAgentTemplates("codex_local")).toBe(true);
    expect(supportsRepoTrackedAgentTemplates("process")).toBe(false);
  });
});
