// Server-side & Proxy-compatible HMAC session authentication for SERVIO Developer Portal (/dev)
// Completely isolated from identity-service (Port 8001) so diagnostics remain accessible even when 8001 is down.

export const DEV_SESSION_COOKIE = "servio_dev_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface DevSessionPayload {
  email: string;
  name: string;
  role: "SYSTEM_DEVELOPER";
  iat: number;
  exp: number;
}

function getEnvCredentials() {
  const email = (process.env.DEV_MONITOR_EMAIL || "developer@servio.com").trim().toLowerCase();
  const password = process.env.DEV_MONITOR_PASSWORD || "developerservio";
  const secret =
    process.env.DEV_MONITOR_SECRET ||
    "servio-dev-observability-hmac-secret-2026-991a7f3e";
  return { email, password, secret };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function getDevPublicEmail(): string {
  return getEnvCredentials().email;
}

export function validateDevCredentials(email: string, password: string): boolean {
  const expected = getEnvCredentials();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  return normalizedEmail === expected.email && password === expected.password;
}

export async function createDevSessionToken(email: string): Promise<string> {
  const { secret } = getEnvCredentials();
  const now = Math.floor(Date.now() / 1000);
  const payload: DevSessionPayload = {
    email: email.trim().toLowerCase(),
    name: "SERVIO Lead Developer",
    role: "SYSTEM_DEVELOPER",
    iat: now,
    exp: now + DEFAULT_TTL_SECONDS,
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);
  const key = await importHmacKey(secret);
  const sigBuf = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigB64 = toBase64Url(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

export async function verifyDevSessionToken(
  token?: string | null
): Promise<DevSessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const { secret } = getEnvCredentials();
    const key = await importHmacKey(secret);
    const sigBytes = fromBase64Url(sigB64);
    const dataBytes = new TextEncoder().encode(payloadB64);
    const sigArrayBuffer = new Uint8Array(sigBytes).buffer;
    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      sigArrayBuffer,
      dataBytes
    );
    if (!isValid) return null;

    const jsonStr = new TextDecoder().decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(jsonStr) as DevSessionPayload;
    if (!parsed || parsed.role !== "SYSTEM_DEVELOPER") return null;

    const now = Math.floor(Date.now() / 1000);
    if (!parsed.exp || parsed.exp < now) return null;

    return parsed;
  } catch {
    return null;
  }
}

