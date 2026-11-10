import { NextRequest, NextResponse } from "next/server";
import { getSessionDetail } from "@/lib/aiDiagnosis/db";
import { sanitizeSessionIdForPath } from "@/lib/aiDiagnosis/mediaStorage";
import { getPublicAiCapability } from "@/lib/aiDiagnosis/runtimeConfig";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId: rawId } = await context.params;
    const sessionId = sanitizeSessionIdForPath(rawId);

    const detail = await getSessionDetail(sessionId);
    if (!detail) {
      return NextResponse.json(
        { ok: false, error: "SESSION_NOT_FOUND", message: "Sesi diagnosa tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      capability: getPublicAiCapability(),
      session: detail.session,
      messages: detail.messages,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_SESSION",
        message: err instanceof Error ? err.message : "Parameter sesi tidak valid.",
      },
      { status: 400 }
    );
  }
}

