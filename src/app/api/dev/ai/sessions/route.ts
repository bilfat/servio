import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import {
  getSessionDetail,
  listMonitoringSessions,
} from "@/lib/aiDiagnosis/db";
import { sanitizeSessionIdForPath } from "@/lib/aiDiagnosis/mediaStorage";
import { getMaskedRuntimeConfig } from "@/lib/aiDiagnosis/runtimeConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const sessionIdParam = searchParams.get("sessionId");

    if (sessionIdParam) {
      const cleanId = sanitizeSessionIdForPath(sessionIdParam);
      const detail = await getSessionDetail(cleanId);
      if (!detail) {
        return NextResponse.json(
          { ok: false, error: "NOT_FOUND", message: "Sesi diagnosa tidak ditemukan." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        ok: true,
        detail,
      });
    }

    const result = await listMonitoringSessions({
      feedback: searchParams.get("feedback"),
      hasMedia: searchParams.get("hasMedia"),
      provider: searchParams.get("provider"),
      q: searchParams.get("q"),
      limit: Number(searchParams.get("limit") || 80),
    });

    return NextResponse.json({
      ok: true,
      config: getMaskedRuntimeConfig(),
      kpis: result.kpis,
      sessions: result.sessions,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_MONITOR_QUERY_ERROR",
        message: err instanceof Error ? err.message : "Gagal memuat data monitoring AI.",
      },
      { status: 500 }
    );
  }
}

