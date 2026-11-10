import { NextRequest, NextResponse } from "next/server";
import { recordDiagnosisFeedback } from "@/lib/aiDiagnosis/db";
import { sanitizeSessionIdForPath } from "@/lib/aiDiagnosis/mediaStorage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !body.sessionId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYLOAD", message: "sessionId wajib dikirim." },
        { status: 400 }
      );
    }

    const sessionId = sanitizeSessionIdForPath(String(body.sessionId));
    const rawFb = typeof body.feedback === "string" ? body.feedback.toUpperCase() : null;
    const feedback = rawFb === "UP" || rawFb === "DOWN" ? rawFb : null;

    const updated = await recordDiagnosisFeedback({
      sessionId,
      messageId: typeof body.messageId === "string" ? body.messageId : null,
      feedback,
      selectedServiceId:
        typeof body.selectedServiceId === "string" && body.selectedServiceId.trim()
          ? body.selectedServiceId.trim().slice(0, 64)
          : null,
      selectedProductId:
        typeof body.selectedProductId === "string" && body.selectedProductId.trim()
          ? body.selectedProductId.trim().slice(0, 64)
          : null,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "SESSION_NOT_FOUND", message: "Sesi tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "FEEDBACK_ERROR",
        message: err instanceof Error ? err.message : "Gagal menyimpan feedback.",
      },
      { status: 500 }
    );
  }
}

