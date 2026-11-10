import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { MICROSERVICE_REGISTRY, ServiceId } from "@/lib/devMonitor/registry";
import { checkDbHealth } from "@/lib/devMonitor/db";
import { fetchSyncAndQueueDiagnostics } from "@/lib/devMonitor/dbDiagnostics";
import { queryAllServiceLogs } from "@/lib/devMonitor/logParser";
import { queryClientErrors } from "@/lib/devMonitor/clientTelemetryStore";

export const dynamic = "force-dynamic";

let inFlightAllHealthPromise: Promise<{
  summary: Record<string, unknown>;
  services: ServiceHealthReport[];
  syncStats: Record<string, number>;
}> | null = null;

export interface ServiceHealthReport {
  id: ServiceId;
  name: string;
  shortName: string;
  domain: string;
  port: number;
  baseUrl: string;
  healthUrl: string;
  description: string;
  dependsOn: ServiceId[];
  httpStatus: number | null;
  status: "UP" | "DEGRADED" | "DOWN";
  latencyMs: number;
  httpError: string | null;
  dbName: string;
  dbConnected: boolean;
  dbLatencyMs: number;
  dbError: string | null;
  recentLogErrors: number;
  recentLogWarnings: number;
  outboxPending: number;
  outboxStuck: number;
  outboxFailed: number;
  failedJobsCount: number;
  dependencyIssues: Array<{ serviceId: ServiceId; status: "DOWN" | "DEGRADED" }>;
}

async function pingHttpHealth(url: string, timeoutMs = 8000): Promise<{
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  error: string | null;
}> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const latencyMs = Date.now() - startedAt;
    if (res.ok) {
      return { ok: true, httpStatus: res.status, latencyMs, error: null };
    }
    return {
      ok: false,
      httpStatus: res.status,
      latencyMs,
      error: `HTTP ${res.status} ${res.statusText || ""}`.trim(),
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startedAt;
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      httpStatus: null,
      latencyMs,
      error: isAbort
        ? `Timeout > ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : "Connection refused",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const targetServiceId = searchParams.get("serviceId");
  const isAll = !targetServiceId || targetServiceId === "ALL";

  if (isAll && inFlightAllHealthPromise) {
    const cached = await inFlightAllHealthPromise;
    return NextResponse.json(cached);
  }

  const computeHealth = async () => {
    const specs = isAll
      ? MICROSERVICE_REGISTRY
      : MICROSERVICE_REGISTRY.filter((s) => s.id === targetServiceId);

    const [httpAndDbResults, syncDiag, logDiag, clientErrDiag] = await Promise.all([
      Promise.all(
        specs.map(async (spec) => {
          const healthUrl = `${spec.baseUrl}${spec.healthPath}`;
          const [httpRes, dbRes] = await Promise.all([
            pingHttpHealth(healthUrl, 8000),
            checkDbHealth(spec.dbName),
          ]);
          return { spec, healthUrl, httpRes, dbRes };
        })
      ),
      fetchSyncAndQueueDiagnostics({ serviceId: targetServiceId || "ALL" }),
      Promise.resolve(queryAllServiceLogs({ serviceId: targetServiceId || "ALL", limit: 200 })),
      Promise.resolve(queryClientErrors({ limit: 100 })),
    ]);

    const nowMs = Date.now();
    const baseStatusMap = new Map<ServiceId, "UP" | "DEGRADED" | "DOWN">();

    const preliminary = httpAndDbResults.map(({ spec, healthUrl, httpRes, dbRes }) => {
      const serviceOutbox = syncDiag.outbox.filter((o) => o.serviceId === spec.id);
      const outboxPending = serviceOutbox.filter((o) => o.status === "PENDING").length;
      const outboxStuck = serviceOutbox.filter(
        (o) => o.status === "PENDING" && nowMs - new Date(o.createdAt).getTime() > 60_000
      ).length;
      const outboxFailed = serviceOutbox.filter((o) => o.status === "FAILED").length;
      const failedJobsCount = syncDiag.failedJobs.filter((j) => j.serviceId === spec.id).length;

      const serviceLogs = logDiag.entries.filter((l) => l.serviceId === spec.id);
      const recentLogErrors = serviceLogs.filter((l) =>
        ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(l.level)
      ).length;
      const recentLogWarnings = serviceLogs.filter((l) => l.level === "WARNING").length;

      let status: "UP" | "DEGRADED" | "DOWN" = "UP";
      if (!httpRes.ok) {
        status = "DOWN";
      } else if (!dbRes.connected || outboxFailed > 0 || outboxStuck > 0 || failedJobsCount > 0) {
        status = "DEGRADED";
      }

      baseStatusMap.set(spec.id, status);

      return {
        id: spec.id,
        name: spec.name,
        shortName: spec.shortName,
        domain: spec.domain,
        port: spec.port,
        baseUrl: spec.baseUrl,
        healthUrl,
        description: spec.description,
        dependsOn: spec.dependsOn,
        httpStatus: httpRes.httpStatus,
        status,
        latencyMs: httpRes.latencyMs,
        httpError: httpRes.error,
        dbName: spec.dbName,
        dbConnected: dbRes.connected,
        dbLatencyMs: dbRes.latencyMs,
        dbError: dbRes.error || null,
        recentLogErrors,
        recentLogWarnings,
        outboxPending,
        outboxStuck,
        outboxFailed,
        failedJobsCount,
      };
    });

    const services: ServiceHealthReport[] = preliminary.map((svc) => {
      const dependencyIssues: Array<{ serviceId: ServiceId; status: "DOWN" | "DEGRADED" }> = [];
      for (const depId of svc.dependsOn) {
        const depStatus = baseStatusMap.get(depId);
        if (depStatus === "DOWN" || depStatus === "DEGRADED") {
          dependencyIssues.push({ serviceId: depId, status: depStatus });
        }
      }
      return {
        ...svc,
        dependencyIssues,
      };
    });

    const summary = {
      checkedAt: new Date().toISOString(),
      totalServices: services.length,
      upCount: services.filter((s) => s.status === "UP").length,
      degradedCount: services.filter((s) => s.status === "DEGRADED").length,
      downCount: services.filter((s) => s.status === "DOWN").length,
      dbConnectedCount: services.filter((s) => s.dbConnected).length,
      totalLogErrors: logDiag.summary.errorCount,
      totalLogWarnings: logDiag.summary.warningCount,
      totalClientErrors: clientErrDiag.totalCount,
      outboxIssuesCount:
        syncDiag.stats.failedOutboxCount +
        syncDiag.stats.stuckCount +
        syncDiag.stats.failedInboxCount +
        syncDiag.stats.failedJobsCount,
    };

    return {
      summary,
      services,
      syncStats: syncDiag.stats,
    };
  };

  if (isAll) {
    const p = computeHealth().finally(() => {
      if (inFlightAllHealthPromise === p) {
        inFlightAllHealthPromise = null;
      }
    });
    inFlightAllHealthPromise = p;
    return NextResponse.json(await p);
  }

  return NextResponse.json(await computeHealth());
}

