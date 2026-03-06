import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { StoredSecretVersionMaterial } from "./types.js";
import { badRequest, unprocessable } from "../errors.js";

export interface AesGcmEncryptedMaterial extends StoredSecretVersionMaterial {
  scheme: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

export function decodeMasterKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // ignored
  }

  if (Buffer.byteLength(trimmed, "utf8") === 32) {
    return Buffer.from(trimmed, "utf8");
  }
  return null;
}

export function loadMasterKeyFromEnv(envVarName: string): Buffer {
  const envKeyRaw = process.env[envVarName];
  if (!envKeyRaw || envKeyRaw.trim().length === 0) {
    throw unprocessable(`Missing ${envVarName}; configure a 32-byte master key for this deployment`);
  }

  const decoded = decodeMasterKey(envKeyRaw);
  if (!decoded) {
    throw badRequest(
      `Invalid ${envVarName} (expected 32-byte base64, 64-char hex, or raw 32-char string)`,
    );
  }
  return decoded;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptValue(masterKey: Buffer, value: string, scheme: string): AesGcmEncryptedMaterial {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    scheme,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptValue(masterKey: Buffer, material: AesGcmEncryptedMaterial): string {
  const iv = Buffer.from(material.iv, "base64");
  const tag = Buffer.from(material.tag, "base64");
  const ciphertext = Buffer.from(material.ciphertext, "base64");
  const decipher = createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

export function asEncryptedMaterial(
  value: StoredSecretVersionMaterial,
  scheme: string,
): AesGcmEncryptedMaterial {
  if (
    value &&
    typeof value === "object" &&
    value.scheme === scheme &&
    typeof value.iv === "string" &&
    typeof value.tag === "string" &&
    typeof value.ciphertext === "string"
  ) {
    return value as AesGcmEncryptedMaterial;
  }

  throw badRequest(`Invalid ${scheme} secret material`);
}
