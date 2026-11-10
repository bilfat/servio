import { NextRequest, NextResponse } from "next/server";
import { requireDevApiSession } from "@/lib/devMonitor/serverAuth";
import { queryDb } from "@/lib/devMonitor/db";
import {
  fetchSyncAndQueueDiagnostics,
  fetchUnifiedAudits,
  resolveRelatedEntityIds,
  UnifiedAuditRecord,
} from "@/lib/devMonitor/dbDiagnostics";
import { queryAllServiceLogs } from "@/lib/devMonitor/logParser";
import { queryClientErrors } from "@/lib/devMonitor/clientTelemetryStore";

export const dynamic = "force-dynamic";

export interface UnifiedTraceStep {
  id: string;
  timestamp: string;
  layer: "FRONTEND" | "BACKEND_LOG" | "DB_AUDIT" | "OUTBOX_SYNC" | "INBOX_SYNC" | "FAILED_JOB";
  serviceId: string;
  serviceName: string;
  severity: "INFO" | "WARNING" | "ERROR";
  title: string;
  subtitle: string;
  requestId: string | null;
  correlationId: string | null;
  raw: unknown;
}

function matchesAnyTerm(haystackParts: Array<string | null | undefined>, lowerTerms: string[]): boolean {
  for (const part of haystackParts) {
    if (!part) continue;
    const low = part.toLowerCase();
    for (const t of lowerTerms) {
      if (low.includes(t)) return true;
    }
  }
  return false;
}

export async function GET(request: NextRequest) {
  const auth = await requireDevApiSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({
      query: "",
      searchTerms: [],
      resolved: null,
      timeline: [],
      counts: {
        frontend: 0,
        backendLogs: 0,
        dbAudits: 0,
        outboxSync: 0,
        failedJobs: 0,
        total: 0,
      },
    });
  }

  // Also check if q matches an identity user ID or email
  const [resolvedEntities, identityUserRes] = await Promise.all([
    resolveRelatedEntityIds(q),
    queryDb<Record<string, unknown>>(
      "servio_identity_db",
      `SELECT u.id, COALESCE(up.display_name, up.legal_name, u.email) AS name, u.email, u.status, u.created_at FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = ? OR u.email = ? LIMIT 1`,
      [q, q]
    ),
  ]);

  const termSet = new Set<string>(resolvedEntities.searchTerms);
  let resolvedUser: Record<string, unknown> | null = null;
  if (identityUserRes.ok && identityUserRes.rows.length > 0) {
    resolvedUser = identityUserRes.rows[0];
    if (resolvedUser.id) termSet.add(String(resolvedUser.id));
    if (resolvedUser.email) termSet.add(String(resolvedUser.email));
  }

  const searchTerms = Array.from(termSet).filter(Boolean);
  const lowerTerms = searchTerms.map((t) => t.toLowerCase());

  // Query DB audits for primary resolved terms in parallel (cap 4 queries)
  const auditQueries = searchTerms.slice(0, 4).map((term) =>
    fetchUnifiedAudits({ search: term, limitPerService: 35, limitTotal: 150 })
  );

  const [clientData, logsData, syncData, ...auditResults] = await Promise.all([
    Promise.resolve(queryClientErrors({ limit: 400 })),
    Promise.resolve(queryAllServiceLogs({ limit: 300 })),
    fetchSyncAndQueueDiagnostics({}),
    ...auditQueries,
  ]);

  const timeline: UnifiedTraceStep[] = [];

  // 1. Frontend Client Telemetry matches
  let frontendCount = 0;
  for (const ce of clientData.events) {
    if (
      matchesAnyTerm(
        [ce.requestId, ce.userId, ce.endpoint, ce.pageRoute, ce.message, ce.errorCode, ce.stack],
        lowerTerms
      )
    ) {
      frontendCount++;
      timeline.push({
        id: `tr-ce-${ce.id}`,
        timestamp: ce.timestamp,
        layer: "FRONTEND",
        serviceId: "nextjs-client",
        serviceName: `Browser (${ce.userRole})`,
        severity: ce.httpStatus && ce.httpStatus >= 500 ? "ERROR" : ce.kind === "API_ERROR" ? "WARNING" : "ERROR",
        title: `${ce.kind}${ce.httpStatus ? ` HTTP ${ce.httpStatus}` : ""}: ${ce.method || "UI"} ${ce.endpoint || ce.pageRoute}`,
        subtitle: ce.message,
        requestId: ce.requestId || null,
        correlationId: null,
        raw: ce,
      });
    }
  }

  // 2. Backend Log matches
  let backendLogsCount = 0;
  for (const log of logsData.entries) {
    if (
      matchesAnyTerm(
        [log.requestId, log.correlationId, log.actorId, log.route, log.message, log.stackTrace],
        lowerTerms
      )
    ) {
      backendLogsCount++;
      timeline.push({
        id: `tr-log-${log.id}`,
        timestamp: log.timestamp,
        layer: "BACKEND_LOG",
        serviceId: log.serviceId,
        serviceName: `${log.serviceName} :${log.port}`,
        severity: ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(log.level)
          ? "ERROR"
          : log.level === "WARNING"
            ? "WARNING"
            : "INFO",
        title: `[${log.level}] ${log.route || log.fileLine || log.source}`,
        subtitle: log.message,
        requestId: log.requestId,
        correlationId: log.correlationId,
        raw: log,
      });
    }
  }

  // 3. DB Audit matches (deduplicated across search terms)
  const auditMap = new Map<string, UnifiedAuditRecord>();
  for (const res of auditResults) {
    for (const r of res.records) {
      auditMap.set(r.id, r);
    }
  }
  const dbAuditsCount = auditMap.size;
  for (const aud of auditMap.values()) {
    const isFail = /FAIL|REJECT|DENY|ERROR|CANCEL/i.test(`${aud.action} ${aud.result}`);
    timeline.push({
      id: `tr-aud-${aud.id}`,
      timestamp: aud.occurredAt,
      layer: "DB_AUDIT",
      serviceId: aud.serviceId,
      serviceName: aud.serviceName,
      severity: isFail ? "WARNING" : "INFO",
      title: `${aud.action} (${aud.entityType || "ENTITY"}: ${aud.entityId || "-"})`,
      subtitle: `Result: ${aud.result}${aud.actorUserId ? ` · Actor: ${aud.actorUserId}` : ""}${aud.reason ? ` · Reason: ${aud.reason}` : ""}`,
      requestId: aud.requestId,
      correlationId: aud.correlationId,
      raw: aud,
    });
  }

  // 4. Outbox & Inbox & Failed Jobs matches
  let outboxSyncCount = 0;
  for (const ob of syncData.outbox) {
    const payloadStr = ob.payload ? JSON.stringify(ob.payload) : null;
    if (
      matchesAnyTerm(
        [ob.aggregateId, ob.correlationId, ob.eventType, ob.lastError, payloadStr],
        lowerTerms
      )
    ) {
      outboxSyncCount++;
      timeline.push({
        id: `tr-ob-${ob.id}`,
        timestamp: ob.createdAt,
        layer: "OUTBOX_SYNC",
        serviceId: ob.serviceId,
        serviceName: `${ob.serviceName} Outbox`,
        severity: ob.status === "FAILED" ? "ERROR" : ob.status === "PENDING" ? "WARNING" : "INFO",
        title: `Outbox [${ob.status}] ${ob.eventType}`,
        subtitle: `Aggregate: ${ob.aggregateType || "-"}#${ob.aggregateId || "-"} · Attempts: ${ob.attempts}${ob.lastError ? ` · Error: ${ob.lastError}` : ""}`,
        requestId: null,
        correlationId: ob.correlationId,
        raw: ob,
      });
    }
  }

  for (const ib of syncData.inbox) {
    if (matchesAnyTerm([ib.sourceEventId, ib.eventType, ib.errorMessage], lowerTerms)) {
      outboxSyncCount++;
      timeline.push({
        id: `tr-ib-${ib.id}`,
        timestamp: ib.createdAt,
        layer: "INBOX_SYNC",
        serviceId: ib.serviceId,
        serviceName: `${ib.serviceName} Inbox`,
        severity: ib.errorMessage || /FAIL|ERROR/i.test(ib.status) ? "ERROR" : "INFO",
        title: `Inbox [${ib.status}] ${ib.eventType || ib.sourceEventId || "Event"}`,
        subtitle: `Dari: ${ib.sourceService || "-"} · Event ID: ${ib.sourceEventId || "-"}${ib.errorMessage ? ` · Err: ${ib.errorMessage}` : ""}`,
        requestId: null,
        correlationId: null,
        raw: ib,
      });
    }
  }

  let failedJobsCount = 0;
  for (const fj of syncData.failedJobs) {
    const payloadStr = fj.payload ? JSON.stringify(fj.payload) : null;
    if (matchesAnyTerm([fj.uuid, fj.exception, fj.queue, payloadStr], lowerTerms)) {
      failedJobsCount++;
      timeline.push({
        id: `tr-fj-${fj.id}`,
        timestamp: fj.failedAt,
        layer: "FAILED_JOB",
        serviceId: fj.serviceId,
        serviceName: `${fj.serviceName} Queue`,
        severity: "ERROR",
        title: `Failed Queue Job [${fj.queue}]`,
        subtitle: fj.exception.split("\n")[0]?.slice(0, 220) || "Job failed",
        requestId: null,
        correlationId: null,
        raw: fj,
      });
    }
  }

  // Sort chronologically ascending so developer can follow execution order
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return NextResponse.json({
    query: q,
    searchTerms,
    resolved: {
      orderJasa: resolvedEntities.resolvedOrderJasa,
      orderBarang: resolvedEntities.resolvedOrderBarang,
      case: resolvedEntities.resolvedCase,
      user: resolvedUser,
    },
    timeline,
    counts: {
      frontend: frontendCount,
      backendLogs: backendLogsCount,
      dbAudits: dbAuditsCount,
      outboxSync: outboxSyncCount,
      failedJobs: failedJobsCount,
      total: timeline.length,
    },
  });
}

