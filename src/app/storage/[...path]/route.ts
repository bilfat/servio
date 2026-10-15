import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const filePathParts = resolvedParams.path || [];
  const relativePath = filePathParts.join("/");

  // 1. Direct local disk check from Laravel storage/app/public
  const localDiskPath = path.join(
    process.cwd(),
    "backend",
    "services",
    "identity-service",
    "storage",
    "app",
    "public",
    ...filePathParts
  );

  if (fs.existsSync(localDiskPath) && fs.statSync(localDiskPath).isFile()) {
    const ext = path.extname(localDiskPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const buffer = fs.readFileSync(localDiskPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // 2. Fallback: Proxy to Laravel dev server on port 8001
  try {
    const backendUrl = `http://127.0.0.1:8001/storage/${relativePath}`;
    const res = await fetch(backendUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ message: "File not found" }, { status: 404 });
}
