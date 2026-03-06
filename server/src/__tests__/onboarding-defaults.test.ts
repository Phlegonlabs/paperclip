import { describe, expect, it } from "vitest";
import {
  PAPERCLIP_GITHUB_REPO_URL,
  paperclipGitHubTreeUrl,
} from "@paperclipai/shared";
import {
  DEFAULT_ONBOARDING_TASK_DESCRIPTION,
  DEFAULT_ONBOARDING_TASK_TITLE,
} from "../../../ui/src/components/onboarding-defaults";

describe("onboarding defaults", () => {
  it("points the CEO onboarding copy at the repo-tracked fork templates", () => {
    expect(DEFAULT_ONBOARDING_TASK_TITLE).toBe(
      "Review your CEO template and hire a Founding Engineer",
    );
    expect(DEFAULT_ONBOARDING_TASK_DESCRIPTION).not.toContain(
      "paperclipai/companies",
    );
    expect(DEFAULT_ONBOARDING_TASK_DESCRIPTION).toContain(
      PAPERCLIP_GITHUB_REPO_URL,
    );
    expect(DEFAULT_ONBOARDING_TASK_DESCRIPTION).toContain(
      paperclipGitHubTreeUrl("agents/ceo"),
    );
    expect(DEFAULT_ONBOARDING_TASK_DESCRIPTION).toContain(
      "agents/ceo/AGENTS.md",
    );
  });
});
