import type { SecretProviderModule } from "./types.js";
import {
  asEncryptedMaterial,
  decryptValue,
  encryptValue,
  loadMasterKeyFromEnv,
  sha256Hex,
} from "./crypto.js";

const CLOUDFLARE_SCHEME = "cloudflare_encrypted_v1";
const DEFAULT_KEY_ENV_VAR_NAME = "PAPERCLIP_SECRETS_MASTER_KEY";

function loadCloudflareMasterKey(): Buffer {
  const envVarName =
    process.env.PAPERCLIP_CLOUDFLARE_SECRETS_KEY_ENV_NAME?.trim() ||
    DEFAULT_KEY_ENV_VAR_NAME;
  return loadMasterKeyFromEnv(envVarName);
}

export const cloudflareEncryptedProvider: SecretProviderModule = {
  id: "cloudflare_encrypted",
  descriptor: {
    id: "cloudflare_encrypted",
    label: "Cloudflare encrypted",
    requiresExternalRef: false,
  },
  async createVersion(input) {
    const masterKey = loadCloudflareMasterKey();
    return {
      material: encryptValue(masterKey, input.value, CLOUDFLARE_SCHEME),
      valueSha256: sha256Hex(input.value),
      externalRef: null,
    };
  },
  async resolveVersion(input) {
    const masterKey = loadCloudflareMasterKey();
    return decryptValue(masterKey, asEncryptedMaterial(input.material, CLOUDFLARE_SCHEME));
  },
};
