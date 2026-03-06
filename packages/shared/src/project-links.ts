export const PAPERCLIP_GITHUB_OWNER = "Phlegonlabs";
export const PAPERCLIP_GITHUB_REPO = "paperclip";
export const PAPERCLIP_GITHUB_DEFAULT_REF = "master";
export const PAPERCLIP_GITHUB_REPO_URL =
  `https://github.com/${PAPERCLIP_GITHUB_OWNER}/${PAPERCLIP_GITHUB_REPO}`;

function normalizeRepoPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

export function paperclipGitHubBlobUrl(
  filePath: string,
  ref = PAPERCLIP_GITHUB_DEFAULT_REF,
): string {
  return `${PAPERCLIP_GITHUB_REPO_URL}/blob/${ref}/${normalizeRepoPath(filePath)}`;
}

export function paperclipGitHubTreeUrl(
  filePath = "",
  ref = PAPERCLIP_GITHUB_DEFAULT_REF,
): string {
  const normalized = normalizeRepoPath(filePath);
  return normalized.length > 0
    ? `${PAPERCLIP_GITHUB_REPO_URL}/tree/${ref}/${normalized}`
    : `${PAPERCLIP_GITHUB_REPO_URL}/tree/${ref}`;
}
