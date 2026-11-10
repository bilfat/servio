import { NextRequest, NextResponse } from "next/server";
import { getMediaRecordById } from "@/lib/aiDiagnosis/db";
import { readAiMediaBuffer } from "@/lib/aiDiagnosis/mediaStorage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await context.params;
    const cleanId = String(mediaId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }

    const rec = await getMediaRecordById(cleanId);
    if (!rec) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }

    const buf = await readAiMediaBuffer(rec.storagePath);
    if (!buf) {
      return NextResponse.json({ error: "MEDIA_FILE_MISSING" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": rec.mimeType || "image/jpeg",
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "MEDIA_READ_ERROR" }, { status: 500 });
  }
}

