import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { SecretProviderModule } from "./types.js";
import {
  asEncryptedMaterial,
  decodeMasterKey,
  decryptValue,
  encryptValue,
  loadMasterKeyFromEnv,
  sha256Hex,
} from "./crypto.js";
import { badRequest } from "../errors.js";

const LOCAL_ENCRYPTED_SCHEME = "local_encrypted_v1";

function resolveMasterKeyFilePath() {
  const fromEnv = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE;
  if (fromEnv && fromEnv.trim().length > 0) return path.resolve(fromEnv.trim());
  return path.resolve(process.cwd(), "data/secrets/master.key");
}

function loadOrCreateMasterKey(): Buffer {
  if (process.env.PAPERCLIP_SECRETS_MASTER_KEY?.trim()) {
    try {
      return loadMasterKeyFromEnv("PAPERCLIP_SECRETS_MASTER_KEY");
    } catch (error) {
      if (error instanceof Error) {
        throw badRequest(error.message);
      }
      throw error;
    }
  }

  const keyPath = resolveMasterKeyFilePath();
  if (existsSync(keyPath)) {
    const raw = readFileSync(keyPath, "utf8");
    const decoded = decodeMasterKey(raw);
    if (!decoded) {
      throw badRequest(`Invalid secrets master key at ${keyPath}`);
    }
    return decoded;
  }

  const dir = path.dirname(keyPath);
  mkdirSync(dir, { recursive: true });
  const generated = randomBytes(32);
  writeFileSync(keyPath, generated.toString("base64"), { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(keyPath, 0o600);
  } catch {
    // best effort
  }
  return generated;
}

export const localEncryptedProvider: SecretProviderModule = {
  id: "local_encrypted",
  descriptor: {
    id: "local_encrypted",
    label: "Local encrypted (default)",
    requiresExternalRef: false,
  },
  async createVersion(input) {
    const masterKey = loadOrCreateMasterKey();
    return {
      material: encryptValue(masterKey, input.value, LOCAL_ENCRYPTED_SCHEME),
      valueSha256: sha256Hex(input.value),
      externalRef: null,
    };
  },
  async resolveVersion(input) {
    const masterKey = loadOrCreateMasterKey();
    return decryptValue(masterKey, asEncryptedMaterial(input.material, LOCAL_ENCRYPTED_SCHEME));
  },
};
