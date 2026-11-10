import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB per image / extracted keyframe
export const MAX_MEDIA_ATTACHMENTS_PER_TURN = 8;

export function getAiMediaRootDir(): string {
  return path.resolve(process.cwd(), "storage", "ai-media");
}

export function sanitizeSessionIdForPath(sessionId: string): string {
  const cleaned = String(sessionId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleaned || cleaned.length > 64) {
    throw new Error("INVALID_SESSION_ID_PATH");
  }
  return cleaned;
}

export function isAllowedImageMime(mimeType: string): boolean {
  const normalized = String(mimeType || "").toLowerCase().split(";")[0].trim();
  return Boolean(ALLOWED_MIME_TYPES[normalized]);
}

export interface SavedAiMediaFile {
  id: string;
  mimeType: string;
  bytes: number;
  sha256: string;
  storagePath: string; // relative path under storage/ai-media, e.g. "<sessionId>/<id>.jpg"
}

export async function saveAiMediaBuffer(params: {
  sessionId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<SavedAiMediaFile> {
  const normalizedMime = String(params.mimeType || "").toLowerCase().split(";")[0].trim();
  const ext = ALLOWED_MIME_TYPES[normalizedMime];
  if (!ext) {
    throw new Error(`Tipe media tidak didukung (${normalizedMime}). Gunakan JPG, PNG, atau WEBP.`);
  }
  if (!params.buffer || params.buffer.length === 0) {
    throw new Error("File gambar kosong.");
  }
  if (params.buffer.length > MAX_MEDIA_BYTES) {
    throw new Error("Ukuran gambar/keyframe melebihi batas 5 MB.");
  }

  const safeSession = sanitizeSessionIdForPath(params.sessionId);
  const id = crypto.randomUUID();
  const fileName = `${id}${ext}`;
  const relPath = path.posix.join(safeSession, fileName);

  const rootDir = getAiMediaRootDir();
  const targetDir = path.resolve(rootDir, safeSession);
  if (!targetDir.startsWith(rootDir + path.sep) && targetDir !== rootDir) {
    throw new Error("PATH_TRAVERSAL_BLOCKED");
  }

  await fs.mkdir(targetDir, { recursive: true });
  const absFile = path.resolve(targetDir, fileName);
  if (!absFile.startsWith(rootDir + path.sep)) {
    throw new Error("PATH_TRAVERSAL_BLOCKED");
  }

  const sha256 = crypto.createHash("sha256").update(params.buffer).digest("hex");
  await fs.writeFile(absFile, params.buffer);

  return {
    id,
    mimeType: normalizedMime === "image/jpg" ? "image/jpeg" : normalizedMime,
    bytes: params.buffer.length,
    sha256,
    storagePath: relPath,
  };
}

export async function readAiMediaBuffer(storagePath: string): Promise<Buffer | null> {
  const rootDir = getAiMediaRootDir();
  const normalizedRel = String(storagePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedRel) return null;

  const absPath = path.resolve(rootDir, normalizedRel);
  if (!absPath.startsWith(rootDir + path.sep)) {
    return null;
  }

  try {
    return await fs.readFile(absPath);
  } catch {
    return null;
  }
}

