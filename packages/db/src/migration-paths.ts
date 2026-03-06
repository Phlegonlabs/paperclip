import { fileURLToPath } from "node:url";

type FileUrlPathOptions = {
  windows?: boolean;
};

function resolveDbRelativePath(relativePath: string, options?: FileUrlPathOptions): string {
  return fileURLToPath(new URL(relativePath, import.meta.url), options);
}

export function getMigrationsFolderPath(options?: FileUrlPathOptions): string {
  return resolveDbRelativePath("./migrations", options);
}

export function getMigrationJournalPath(options?: FileUrlPathOptions): string {
  return resolveDbRelativePath("./migrations/meta/_journal.json", options);
}

export function getMigrationFilePath(
  migrationFile: string,
  options?: FileUrlPathOptions,
): string {
  return resolveDbRelativePath(`./migrations/${migrationFile}`, options);
}
