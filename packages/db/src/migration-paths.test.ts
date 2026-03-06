import { isAbsolute, join, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getMigrationFilePath,
  getMigrationJournalPath,
  getMigrationsFolderPath,
} from "./migration-paths.js";

describe("migration path resolution", () => {
  it("produces Windows filesystem paths without duplicating the drive prefix", () => {
    const migrationsFolder = getMigrationsFolderPath({ windows: true });

    expect(win32.isAbsolute(migrationsFolder)).toBe(true);
    expect(migrationsFolder).not.toMatch(/^[A-Za-z]:\\[A-Za-z]:\\/);
    expect(migrationsFolder.endsWith(win32.join("packages", "db", "src", "migrations"))).toBe(true);
    expect(getMigrationJournalPath({ windows: true })).toBe(
      win32.join(migrationsFolder, "meta", "_journal.json"),
    );
    expect(getMigrationFilePath("0000_mature_masked_marvel.sql", { windows: true })).toBe(
      win32.join(migrationsFolder, "0000_mature_masked_marvel.sql"),
    );
  });

  it("returns absolute native paths for filesystem callers", () => {
    const migrationsFolder = getMigrationsFolderPath();

    expect(isAbsolute(migrationsFolder)).toBe(true);
    expect(getMigrationJournalPath()).toBe(join(migrationsFolder, "meta", "_journal.json"));
    expect(getMigrationFilePath("0000_mature_masked_marvel.sql")).toBe(
      join(migrationsFolder, "0000_mature_masked_marvel.sql"),
    );
  });
});
