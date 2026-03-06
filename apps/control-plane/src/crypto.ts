const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function encodeBase64UrlJson(value: Record<string, unknown>): string {
  return toBase64Url(encoder.encode(JSON.stringify(value)));
}

export function decodeBase64UrlJson<T extends Record<string, unknown>>(value: string): T | null {
  try {
    const decoded = new TextDecoder().decode(fromBase64Url(value));
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createHmacSignature(secret: string, parts: string[]): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = encoder.encode(parts.join("\n"));
  const digest = await crypto.subtle.sign("HMAC", key, payload);
  return toBase64Url(new Uint8Array(digest));
}

export async function verifyHmacSignature(
  secret: string,
  parts: string[],
  candidate: string | null | undefined,
): Promise<boolean> {
  if (!candidate) return false;
  const expected = await createHmacSignature(secret, parts);
  const left = encoder.encode(expected);
  const right = encoder.encode(candidate);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}
