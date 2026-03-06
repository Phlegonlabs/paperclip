import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unprocessable } from "./errors.js";
import { resolveDefaultAgentWorkspaceDir } from "./home-paths.js";

const REPO_AGENT_TEMPLATE_ROOT = fileURLToPath(
  new URL("../../agents/", import.meta.url),
);
const LOCAL_TEMPLATE_ADAPTER_TYPES = new Set([
  "claude_local",
  "codex_local",
  "opencode_local",
  "cursor",
]);
const REQUIRED_TEMPLATE_FILE_NAMES = [
  "AGENTS.md",
  "HEARTBEAT.md",
  "SOUL.md",
  "TOOLS.md",
] as const;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function supportsRepoTrackedAgentTemplates(adapterType: string): boolean {
  return LOCAL_TEMPLATE_ADAPTER_TYPES.has(adapterType);
}

export type MaterializeAgentTemplateInput = {
  agentId: string;
  role: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
  templateRootDir?: string;
};

export async function materializeRepoTrackedAgentTemplate(
  input: MaterializeAgentTemplateInput,
): Promise<Record<string, unknown>> {
  const existingPath = asNonEmptyString(input.adapterConfig.instructionsFilePath);
  if (existingPath) return { ...input.adapterConfig };
  if (!supportsRepoTrackedAgentTemplates(input.adapterType)) {
    return { ...input.adapterConfig };
  }

  const roleSlug = input.role.trim();
  const templateRoot = path.resolve(input.templateRootDir ?? REPO_AGENT_TEMPLATE_ROOT);
  const sourceDir = path.resolve(templateRoot, roleSlug);
  const destinationDir = path.resolve(
    resolveDefaultAgentWorkspaceDir(input.agentId),
    "agents",
    roleSlug,
  );

  const missingFiles: string[] = [];
  for (const fileName of REQUIRED_TEMPLATE_FILE_NAMES) {
    try {
      const stats = await fs.stat(path.resolve(sourceDir, fileName));
      if (!stats.isFile()) missingFiles.push(fileName);
    } catch {
      missingFiles.push(fileName);
    }
  }

  if (missingFiles.length > 0) {
    throw unprocessable(
      `Repo-tracked agent template for role '${input.role}' is incomplete. Missing: ${missingFiles.join(", ")}`,
    );
  }

  await fs.mkdir(destinationDir, { recursive: true });
  for (const fileName of REQUIRED_TEMPLATE_FILE_NAMES) {
    await fs.copyFile(
      path.resolve(sourceDir, fileName),
      path.resolve(destinationDir, fileName),
    );
  }

  return {
    ...input.adapterConfig,
    instructionsFilePath: path.resolve(destinationDir, "AGENTS.md"),
  };
}
