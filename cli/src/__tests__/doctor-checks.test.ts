import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PaperclipConfig } from "../config/schema.js";
import { secretsCheck } from "../checks/secrets-check.js";
import { storageCheck } from "../checks/storage-check.js";

const ORIGINAL_ENV = { ...process.env };

function createBaseConfig(): PaperclipConfig {
  return {
    $meta: {
      version: 1,
      updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      source: "configure",
    },
    database: {
      mode: "postgres",
      connectionString: "postgres://paperclip:paperclip@localhost:5432/paperclip",
      embeddedPostgresDataDir: "/tmp/paperclip-db",
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: "/tmp/paperclip-backups",
      },
    },
    logging: {
      mode: "file",
      logDir: "/tmp/paperclip-logs",
    },
    server: {
      deploymentMode: "authenticated",
      exposure: "private",
      host: "0.0.0.0",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "explicit",
      publicBaseUrl: "https://paperclip.example.com",
    },
    storage: {
      provider: "local_disk",
      localDisk: { baseDir: "/tmp/paperclip-storage" },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false,
      },
      r2: {
        bucket: "paperclip",
        prefix: "",
      },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: true,
      localEncrypted: { keyFilePath: "/tmp/paperclip-secrets/master.key" },
      cloudflareEncrypted: {
        keyEnvVarName: "PAPERCLIP_SECRETS_MASTER_KEY",
      },
    },
  };
}

describe("doctor checks", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("accepts cloudflare_encrypted when the configured env key is valid", () => {
    const config = createBaseConfig();
    config.secrets.provider = "cloudflare_encrypted";
    config.secrets.cloudflareEncrypted.keyEnvVarName = "PAPERCLIP_CF_MASTER_KEY";
    process.env.PAPERCLIP_CF_MASTER_KEY = "0123456789abcdef0123456789abcdef";

    const result = secretsCheck(config);

    expect(result.status).toBe("pass");
    expect(result.message).toContain("PAPERCLIP_CF_MASTER_KEY");
  });

  it("fails cloudflare_encrypted when the configured env key is missing", () => {
    const config = createBaseConfig();
    config.secrets.provider = "cloudflare_encrypted";
    config.secrets.cloudflareEncrypted.keyEnvVarName = "PAPERCLIP_CF_MASTER_KEY";
    delete process.env.PAPERCLIP_CF_MASTER_KEY;

    const result = secretsCheck(config);

    expect(result.status).toBe("fail");
    expect(result.message).toContain("Missing PAPERCLIP_CF_MASTER_KEY");
  });

  it("fails cloudflare_encrypted when the configured env key is invalid", () => {
    const config = createBaseConfig();
    config.secrets.provider = "cloudflare_encrypted";
    config.secrets.cloudflareEncrypted.keyEnvVarName = "PAPERCLIP_CF_MASTER_KEY";
    process.env.PAPERCLIP_CF_MASTER_KEY = "too-short";

    const result = secretsCheck(config);

    expect(result.status).toBe("fail");
    expect(result.message).toContain("Invalid PAPERCLIP_CF_MASTER_KEY");
  });

  it("fails r2 storage when neither endpoint nor accountId is configured", () => {
    const config = createBaseConfig();
    config.storage.provider = "r2";
    config.storage.r2 = {
      bucket: "paperclip-assets",
      accountId: undefined,
      endpoint: undefined,
      accessKeyId: undefined,
      secretAccessKey: undefined,
      prefix: "",
    };

    const result = storageCheck(config);

    expect(result.status).toBe("fail");
    expect(result.message).toContain("requires either an endpoint or an accountId");
  });

  it("returns an r2-specific warning when accountId can derive the endpoint", () => {
    const config = createBaseConfig();
    config.storage.provider = "r2";
    config.storage.r2 = {
      bucket: "paperclip-assets",
      accountId: "cf-account-123",
      endpoint: undefined,
      accessKeyId: undefined,
      secretAccessKey: undefined,
      prefix: "prod/",
    };

    const result = storageCheck(config);

    expect(result.status).toBe("warn");
    expect(result.message).toContain("R2 storage configured");
    expect(result.message).toContain("https://cf-account-123.r2.cloudflarestorage.com");
  });
});
