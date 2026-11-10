import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { MICROSERVICE_REGISTRY } from "@/lib/devMonitor/registry";
import { fetchUnifiedAudits } from "@/lib/devMonitor/dbDiagnostics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const serviceId = searchParams.get("serviceId");
  const q = searchParams.get("q");
  const limitParam = Number(searchParams.get("limit") || 150);

  const data = await fetchUnifiedAudits({
    domain,
    serviceId,
    search: q,
    limitTotal: Number.isFinite(limitParam) ? Math.min(limitParam, 300) : 150,
  });

  return NextResponse.json({
    ...data,
    services: MICROSERVICE_REGISTRY.map((s) => ({
      id: s.id,
      shortName: s.shortName,
      domain: s.domain,
      auditTable: s.auditTable,
    })),
  });
}

