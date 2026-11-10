import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { MICROSERVICE_REGISTRY } from "@/lib/devMonitor/registry";
import { queryAllServiceLogs } from "@/lib/devMonitor/logParser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const level = searchParams.get("level");
  const q = searchParams.get("q");
  const requestId = searchParams.get("requestId");
  const limitParam = Number(searchParams.get("limit") || 150);

  const data = queryAllServiceLogs({
    serviceId,
    level,
    q,
    requestId,
    limit: Number.isFinite(limitParam) ? limitParam : 150,
  });

  return NextResponse.json({
    ...data,
    services: MICROSERVICE_REGISTRY.map((s) => ({
      id: s.id,
      shortName: s.shortName,
      port: s.port,
      dirName: s.dirName,
    })),
  });
}

