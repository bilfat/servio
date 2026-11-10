import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { MICROSERVICE_REGISTRY } from "@/lib/devMonitor/registry";
import { fetchSyncAndQueueDiagnostics } from "@/lib/devMonitor/dbDiagnostics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const statusFilter = searchParams.get("status");
  const q = searchParams.get("q");

  const data = await fetchSyncAndQueueDiagnostics({
    serviceId,
    statusFilter,
    q,
  });

  return NextResponse.json({
    ...data,
    services: MICROSERVICE_REGISTRY.map((s) => ({
      id: s.id,
      shortName: s.shortName,
      outboxTable: s.outboxTable,
      inboxTable: s.inboxTable,
    })),
  });
}

