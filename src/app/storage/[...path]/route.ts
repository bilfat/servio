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

  // 1. Direct local disk check across backend services public storage
  const candidateDirs = [
    path.join(process.cwd(), "backend", "services", "order-jasa-service", "storage", "app", "public"),
    path.join(process.cwd(), "backend", "services", "identity-service", "storage", "app", "public"),
  ];

  for (const dir of candidateDirs) {
    const localDiskPath = path.join(dir, ...filePathParts);
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
  }

  // 2. Fallback: Proxy to appropriate backend service
  const candidateBackends = filePathParts[0] === "customer_media"
    ? [`http://127.0.0.1:8007/storage/${relativePath}`, `http://127.0.0.1:8001/storage/${relativePath}`]
    : [`http://127.0.0.1:8001/storage/${relativePath}`, `http://127.0.0.1:8007/storage/${relativePath}`];

  for (const backendUrl of candidateBackends) {
    try {
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
  }

  return NextResponse.json({ message: "File not found" }, { status: 404 });
}
