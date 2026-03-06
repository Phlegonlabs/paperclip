import fs from "node:fs";
import type { PaperclipConfig } from "../config/schema.js";
import type { CheckResult } from "./index.js";
import { resolveRuntimeLikePath } from "./path-resolver.js";

export function storageCheck(config: PaperclipConfig, configPath?: string): CheckResult {
  if (config.storage.provider === "local_disk") {
    const baseDir = resolveRuntimeLikePath(config.storage.localDisk.baseDir, configPath);
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    try {
      fs.accessSync(baseDir, fs.constants.W_OK);
      return {
        name: "Storage",
        status: "pass",
        message: `Local disk storage is writable: ${baseDir}`,
      };
    } catch {
      return {
        name: "Storage",
        status: "fail",
        message: `Local storage directory is not writable: ${baseDir}`,
        canRepair: false,
        repairHint: "Check file permissions for storage.localDisk.baseDir",
      };
    }
  }

  if (config.storage.provider === "r2") {
    const bucket = config.storage.r2.bucket.trim();
    const accountId = config.storage.r2.accountId?.trim() ?? "";
    const endpoint = config.storage.r2.endpoint?.trim() ?? "";
    if (!bucket) {
      return {
        name: "Storage",
        status: "fail",
        message: "R2 storage requires a non-empty bucket",
        canRepair: false,
        repairHint: "Run `paperclipai configure --section storage` and set storage.r2.bucket",
      };
    }

    if (!endpoint && !accountId) {
      return {
        name: "Storage",
        status: "fail",
        message: "R2 storage requires either an endpoint or an accountId",
        canRepair: false,
        repairHint:
          "Set storage.r2.endpoint directly or set storage.r2.accountId so the runtime can derive the endpoint",
      };
    }

    const resolvedEndpoint = endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
    return {
      name: "Storage",
      status: "warn",
      message: `R2 storage configured (bucket=${bucket}, endpoint=${resolvedEndpoint}). Reachability check is skipped in doctor.`,
      canRepair: false,
      repairHint: "Verify R2 credentials and bucket permissions in the deployment environment",
    };
  }

  const bucket = config.storage.s3.bucket.trim();
  const region = config.storage.s3.region.trim();
  if (!bucket || !region) {
    return {
      name: "Storage",
      status: "fail",
      message: "S3 storage requires non-empty bucket and region",
      canRepair: false,
      repairHint: "Run `paperclipai configure --section storage`",
    };
  }

  return {
    name: "Storage",
    status: "warn",
    message: `S3 storage configured (bucket=${bucket}, region=${region}). Reachability check is skipped in doctor.`,
    canRepair: false,
    repairHint: "Verify credentials and endpoint in deployment environment",
  };
}

