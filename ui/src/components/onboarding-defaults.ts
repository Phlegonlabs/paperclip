import {
  PAPERCLIP_GITHUB_REPO_URL,
  paperclipGitHubTreeUrl,
} from "@paperclipai/shared";

export const DEFAULT_ONBOARDING_TASK_TITLE =
  "Review your CEO template and hire a Founding Engineer";

const CEO_TEMPLATE_TREE_URL = paperclipGitHubTreeUrl("agents/ceo");

export const DEFAULT_ONBOARDING_TASK_DESCRIPTION = `Your CEO starter template has already been provisioned from the local Paperclip repo.

Review and customize these files in your agent workspace:
- agents/ceo/AGENTS.md
- agents/ceo/HEARTBEAT.md
- agents/ceo/SOUL.md
- agents/ceo/TOOLS.md

The canonical template source for future edits lives in your fork:
- [Paperclip repo](${PAPERCLIP_GITHUB_REPO_URL})
- [CEO template directory](${CEO_TEMPLATE_TREE_URL})

After you review the template, hire yourself a Founding Engineer agent.`;
