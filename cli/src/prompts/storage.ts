import * as p from "@clack/prompts";
import type { StorageConfig } from "../config/schema.js";
import { resolveDefaultStorageDir, resolvePaperclipInstanceId } from "../config/home.js";

function defaultStorageBaseDir(): string {
  return resolveDefaultStorageDir(resolvePaperclipInstanceId());
}

export function defaultStorageConfig(): StorageConfig {
  return {
    provider: "local_disk",
    localDisk: {
      baseDir: defaultStorageBaseDir(),
    },
    s3: {
      bucket: "paperclip",
      region: "us-east-1",
      endpoint: undefined,
      prefix: "",
      forcePathStyle: false,
    },
    r2: {
      bucket: "paperclip",
      accountId: undefined,
      endpoint: undefined,
      accessKeyId: undefined,
      secretAccessKey: undefined,
      prefix: "",
    },
  };
}

export async function promptStorage(current?: StorageConfig): Promise<StorageConfig> {
  const base = current ?? defaultStorageConfig();

  const provider = await p.select({
    message: "Storage provider",
    options: [
      {
        value: "local_disk" as const,
        label: "Local disk (recommended)",
        hint: "best for single-user local deployments",
      },
      {
        value: "s3" as const,
        label: "S3 compatible",
        hint: "for cloud/object storage backends",
      },
      {
        value: "r2" as const,
        label: "Cloudflare R2",
        hint: "for Cloudflare object storage",
      },
    ],
    initialValue: base.provider,
  });

  if (p.isCancel(provider)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (provider === "local_disk") {
    const baseDir = await p.text({
      message: "Local storage base directory",
      defaultValue: base.localDisk.baseDir || defaultStorageBaseDir(),
      placeholder: defaultStorageBaseDir(),
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Storage base directory is required";
      },
    });

    if (p.isCancel(baseDir)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    return {
      provider: "local_disk",
      localDisk: {
        baseDir: baseDir.trim(),
      },
      s3: base.s3,
      r2: base.r2,
    };
  }

  if (provider === "r2") {
    const bucket = await p.text({
      message: "R2 bucket",
      defaultValue: base.r2.bucket || "paperclip",
      placeholder: "paperclip",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Bucket is required";
      },
    });

    if (p.isCancel(bucket)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const accountId = await p.text({
      message: "R2 account ID (optional if endpoint is set elsewhere)",
      defaultValue: base.r2.accountId ?? "",
      placeholder: "cloudflare-account-id",
    });

    if (p.isCancel(accountId)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const endpoint = await p.text({
      message: "R2 endpoint (optional)",
      defaultValue: base.r2.endpoint ?? "",
      placeholder: "https://<account-id>.r2.cloudflarestorage.com",
    });

    if (p.isCancel(endpoint)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const accessKeyId = await p.text({
      message: "R2 access key ID (optional)",
      defaultValue: base.r2.accessKeyId ?? "",
      placeholder: "access-key-id",
    });

    if (p.isCancel(accessKeyId)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const secretAccessKey = await p.password({
      message: "R2 secret access key (optional)",
      mask: "•",
    });

    if (p.isCancel(secretAccessKey)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const prefix = await p.text({
      message: "Object key prefix (optional)",
      defaultValue: base.r2.prefix ?? "",
      placeholder: "paperclip/",
    });

    if (p.isCancel(prefix)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    return {
      provider: "r2",
      localDisk: base.localDisk,
      s3: base.s3,
      r2: {
        bucket: bucket.trim(),
        accountId: accountId.trim() || undefined,
        endpoint: endpoint.trim() || undefined,
        accessKeyId: accessKeyId.trim() || undefined,
        secretAccessKey: secretAccessKey.trim() || undefined,
        prefix: prefix.trim(),
      },
    };
  }

  const bucket = await p.text({
    message: "S3 bucket",
    defaultValue: base.s3.bucket || "paperclip",
    placeholder: "paperclip",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Bucket is required";
    },
  });

  if (p.isCancel(bucket)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const region = await p.text({
    message: "S3 region",
    defaultValue: base.s3.region || "us-east-1",
    placeholder: "us-east-1",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Region is required";
    },
  });

  if (p.isCancel(region)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const endpoint = await p.text({
    message: "S3 endpoint (optional for compatible backends)",
    defaultValue: base.s3.endpoint ?? "",
    placeholder: "https://s3.amazonaws.com",
  });

  if (p.isCancel(endpoint)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const prefix = await p.text({
    message: "Object key prefix (optional)",
    defaultValue: base.s3.prefix ?? "",
    placeholder: "paperclip/",
  });

  if (p.isCancel(prefix)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const forcePathStyle = await p.confirm({
    message: "Use S3 path-style URLs?",
    initialValue: base.s3.forcePathStyle ?? false,
  });

  if (p.isCancel(forcePathStyle)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return {
    provider: "s3",
    localDisk: base.localDisk,
    s3: {
      bucket: bucket.trim(),
      region: region.trim(),
      endpoint: endpoint.trim() || undefined,
      prefix: prefix.trim(),
      forcePathStyle,
    },
    r2: base.r2,
  };
}

