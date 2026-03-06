import type { Config } from "../config.js";
import type { StorageProvider } from "./types.js";
import { createLocalDiskStorageProvider } from "./local-disk-provider.js";
import { createS3StorageProvider } from "./s3-provider.js";

export function createStorageProviderFromConfig(config: Config): StorageProvider {
  if (config.storageProvider === "local_disk") {
    return createLocalDiskStorageProvider(config.storageLocalDiskBaseDir);
  }

  if (config.storageProvider === "r2") {
    const endpoint =
      config.storageR2Endpoint ||
      (config.storageR2AccountId
        ? `https://${config.storageR2AccountId}.r2.cloudflarestorage.com`
        : undefined);
    if (!endpoint) {
      throw new Error("R2 storage requires PAPERCLIP_STORAGE_R2_ENDPOINT or PAPERCLIP_STORAGE_R2_ACCOUNT_ID");
    }

    return createS3StorageProvider({
      providerId: "r2",
      bucket: config.storageR2Bucket,
      region: "auto",
      endpoint,
      prefix: config.storageR2Prefix,
      accessKeyId: config.storageR2AccessKeyId,
      secretAccessKey: config.storageR2SecretAccessKey,
    });
  }

  return createS3StorageProvider({
    bucket: config.storageS3Bucket,
    region: config.storageS3Region,
    endpoint: config.storageS3Endpoint,
    prefix: config.storageS3Prefix,
    forcePathStyle: config.storageS3ForcePathStyle,
  });
}
