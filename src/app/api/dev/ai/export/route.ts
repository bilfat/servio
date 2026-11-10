import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { exportTrainingDatasetRows } from "@/lib/aiDiagnosis/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const feedback = searchParams.get("feedback");
    const rows = await exportTrainingDatasetRows({
      feedback: feedback && feedback !== "ALL" ? feedback : null,
      limit: 500,
    });

    const jsonl = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length > 0 ? "\n" : "");
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(jsonl, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="servio-ai-diagnosis-dataset-${dateStamp}.jsonl"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXPORT_FAILED",
        message: err instanceof Error ? err.message : "Gagal mengekspor dataset AI.",
      },
      { status: 500 }
    );
  }
}

