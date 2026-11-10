import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { appendClientError, queryClientErrors } from "@/lib/devMonitor/clientTelemetryStore";

export const dynamic = "force-dynamic";

function redactSensitiveText(input: unknown): string {
  const str = typeof input === "string" ? input : "";
  return str
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]")
    .replace(/("password"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"')
    .replace(/("token"\s*:\s*)"[^"]*"/gi, '$1"[REDACTED]"');
}

// Public ingestion endpoint — called silently by frontend API wrappers & React ErrorBoundaries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, ignored: true }, { status: 400 });
    }

    const kindRaw = String(body.kind || "API_ERROR").toUpperCase();
    const kind =
      kindRaw === "NETWORK_ERROR" ||
      kindRaw === "REACT_RUNTIME" ||
      kindRaw === "UNHANDLED_REJECTION"
        ? kindRaw
        : "API_ERROR";

    const pageRoute = typeof body.pageRoute === "string" ? body.pageRoute : "/";
    // Avoid infinite telemetry noise from the /dev portal itself unless it's a runtime crash
    if (pageRoute.startsWith("/dev") && kind === "API_ERROR") {
      return NextResponse.json({ ok: true, skipped: true }, { status: 202 });
    }

    const saved = appendClientError({
      kind,
      requestId: typeof body.requestId === "string" ? body.requestId : null,
      pageRoute,
      userRole: typeof body.userRole === "string" ? body.userRole : "GUEST",
      userId: typeof body.userId === "string" ? body.userId : null,
      method: typeof body.method === "string" ? body.method : null,
      endpoint: typeof body.endpoint === "string" ? body.endpoint : null,
      httpStatus: typeof body.httpStatus === "number" ? body.httpStatus : null,
      errorCode: typeof body.errorCode === "string" ? body.errorCode : null,
      message: redactSensitiveText(body.message || "Client error recorded"),
      stack: body.stack ? redactSensitiveText(body.stack) : null,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : null,
    });

    return NextResponse.json({ ok: true, id: saved.id }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}

// Protected query endpoint — only accessible by authenticated developer portal session
export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const data = queryClientErrors({
    role: searchParams.get("role"),
    kind: searchParams.get("kind"),
    status: searchParams.get("status"),
    q: searchParams.get("q"),
    requestId: searchParams.get("requestId"),
    limit: Number(searchParams.get("limit") || 150),
  });

  return NextResponse.json(data);
}

