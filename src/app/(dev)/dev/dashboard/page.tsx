"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Warning,
  XCircle,
  Bug,
  Database,
  Monitor,
  Heartbeat,
  ArrowRight,
  GitBranch,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime, formatRelativeTime } from "@/components/dev/devFormatters";
import type { ParsedLogEntry } from "@/lib/devMonitor/logParser";
import type { ClientErrorEvent } from "@/lib/devMonitor/clientTelemetryStore";

interface IncidentRow {
  id: string;
  timestamp: string;
  source: "BACKEND_LOG" | "CLIENT_TELEMETRY" | "OUTBOX_FAILED";
  serviceName: string;
  severity: "ERROR" | "WARNING";
  title: string;
  subtitle: string;
  requestId: string | null;
  drawer: InspectorDrawerItem;
}

export default function DevDashboardPage() {
  const { refreshTick, healthServices, topSummary, hasLoadedHealth } = useDevAutoRefresh();

  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawer, setSelectedDrawer] = useState<InspectorDrawerItem | null>(null);

  const services = healthServices;
  const summary = hasLoadedHealth ? topSummary : null;

  useEffect(() => {
    let active = true;
    const loadCockpit = async () => {
      try {
        const [logsRes, clientRes, syncRes] = await Promise.all([
          fetch("/api/dev/logs?level=ERRORS_ONLY&limit=25", { cache: "no-store" }),
          fetch("/api/dev/telemetry/client-error?limit=20", { cache: "no-store" }),
          fetch("/api/dev/sync?status=FAILED", { cache: "no-store" }),
        ]);

        if (!active) return;

        const merged: IncidentRow[] = [];

        if (logsRes.ok) {
          const lJson = await logsRes.json();
          const entries: ParsedLogEntry[] = lJson.entries || [];
          for (const e of entries) {
            merged.push({
              id: `inc-log-${e.id}`,
              timestamp: e.timestamp,
              source: "BACKEND_LOG",
              serviceName: `${e.serviceName} :${e.port}`,
              severity: "ERROR",
              title: e.message,
              subtitle: e.fileLine || e.route || e.source,
              requestId: e.requestId,
              drawer: {
                title: `[${e.serviceName}] ${e.level}: ${e.message}`,
                subtitle: e.fileLine || e.route || undefined,
                badgeText: e.level,
                badgeTone: "rose",
                requestId: e.requestId,
                correlationId: e.correlationId,
                metaPairs: [
                  { label: "Microservice", value: `${e.serviceName} (:${e.port})` },
                  { label: "Waktu", value: formatWibTime(e.timestamp) },
                  { label: "Route", value: e.route },
                  { label: "Actor / Role", value: `${e.actorId || "-"} (${e.actorRole || "-"})` },
                  { label: "Lokasi File", value: e.fileLine },
                ],
                stackTrace: e.stackTrace,
                jsonPayload: e.context,
              },
            });
          }
        }

        if (clientRes.ok) {
          const cJson = await clientRes.json();
          const events: ClientErrorEvent[] = cJson.events || [];
          for (const ce of events) {
            merged.push({
              id: `inc-ce-${ce.id}`,
              timestamp: ce.timestamp,
              source: "CLIENT_TELEMETRY",
              serviceName: `Frontend (${ce.userRole})`,
              severity: ce.httpStatus && ce.httpStatus >= 500 ? "ERROR" : "WARNING",
              title: ce.message,
              subtitle: `${ce.method || ce.kind} ${ce.endpoint || ce.pageRoute} · Status ${ce.httpStatus || ce.kind}`,
              requestId: ce.requestId || null,
              drawer: {
                title: `Frontend ${ce.kind}: ${ce.message}`,
                subtitle: `Halaman: ${ce.pageRoute} · Endpoint: ${ce.endpoint || "-"}`,
                badgeText: ce.httpStatus ? `HTTP ${ce.httpStatus}` : ce.kind,
                badgeTone: ce.httpStatus && ce.httpStatus >= 500 ? "rose" : "amber",
                requestId: ce.requestId,
                metaPairs: [
                  { label: "Role User", value: ce.userRole },
                  { label: "User ID", value: ce.userId },
                  { label: "Page Route", value: ce.pageRoute },
                  { label: "Endpoint", value: `${ce.method || ""} ${ce.endpoint || ""}` },
                  { label: "HTTP Status", value: ce.httpStatus },
                  { label: "Error Code", value: ce.errorCode },
                  { label: "Durasi", value: ce.durationMs ? `${ce.durationMs}ms` : "-" },
                ],
                stackTrace: ce.stack,
              },
            });
          }
        }

        if (syncRes.ok) {
          const sJson = await syncRes.json();
          for (const ob of (sJson.outbox || []).slice(0, 10)) {
            merged.push({
              id: `inc-ob-${ob.id}`,
              timestamp: ob.createdAt,
              source: "OUTBOX_FAILED",
              serviceName: `${ob.serviceName} Outbox`,
              severity: "ERROR",
              title: `Outbox FAILED: ${ob.eventType}`,
              subtitle: ob.lastError || `Aggregate ${ob.aggregateType || "-"}#${ob.aggregateId || "-"}`,
              requestId: ob.correlationId,
              drawer: {
                title: `Outbox Event Gagal: ${ob.eventType}`,
                subtitle: `Tabel ${ob.tableName} (${ob.serviceName})`,
                badgeText: ob.status,
                badgeTone: "rose",
                correlationId: ob.correlationId,
                traceQuery: ob.aggregateId || ob.correlationId,
                metaPairs: [
                  { label: "Service", value: ob.serviceName },
                  { label: "Aggregate ID", value: ob.aggregateId },
                  { label: "Attempts", value: ob.attempts },
                  { label: "Last Error", value: ob.lastError },
                ],
                jsonPayload: ob.payload,
              },
            });
          }
        }

        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setIncidents(merged.slice(0, 12));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCockpit();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
            Overview &amp; Peringatan Sistem
          </h1>
          <p className="text-xs text-neutral-slate mt-1">
            Ringkasan kondisi real-time 8 microservice Laravel, koneksi MySQL, antrean sinkronisasi, dan telemetry error frontend.
          </p>
        </div>
        <Link
          href="/dev/tracer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-servio-sm transition-colors self-start"
        >
          <MagnifyingGlass size={15} weight="bold" />
          <span>Buka Pelacak End-to-End</span>
        </Link>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          href="/dev/health"
          className="bg-white border border-neutral-border hover:border-primary/40 rounded-2xl p-4 shadow-servio-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-slate">Microservices Online</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Heartbeat size={18} weight="duotone" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-dark">
              {summary ? `${summary.upCount}/${summary.totalServices}` : "..."}
            </span>
            {summary && summary.downCount > 0 && (
              <span className="text-xs font-mono font-semibold text-rose-600">
                ({summary.downCount} DOWN)
              </span>
            )}
            {summary && summary.downCount === 0 && summary.degradedCount > 0 && (
              <span className="text-xs font-mono font-semibold text-amber-600">
                ({summary.degradedCount} DEGRADED)
              </span>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-neutral-slate">
            DB MySQL terhubung: {summary ? `${summary.dbConnectedCount}/8` : "..."}
          </div>
        </Link>

        <Link
          href="/dev/logs"
          className="bg-white border border-neutral-border hover:border-primary/40 rounded-2xl p-4 shadow-servio-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-slate">Log Error Backend</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bug size={18} weight="duotone" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-dark">
              {summary ? summary.totalLogErrors : "..."}
            </span>
            <span className="text-xs text-neutral-slate">entri terbaru</span>
          </div>
          <div className="mt-1.5 text-[11px] text-neutral-slate">
            Dari disk log 8 service (tetap terbaca saat port mati)
          </div>
        </Link>

        <Link
          href="/dev/sync"
          className="bg-white border border-neutral-border hover:border-primary/40 rounded-2xl p-4 shadow-servio-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-slate">
              Antrean Outbox / Jobs Bermasalah
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Database size={18} weight="duotone" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-dark">
              {summary ? summary.outboxIssuesCount : "..."}
            </span>
            <span className="text-xs text-neutral-slate">stuck / gagal</span>
          </div>
          <div className="mt-1.5 text-[11px] text-neutral-slate">
            Outbox failed, pending &gt;60d, &amp; table failed_jobs
          </div>
        </Link>

        <Link
          href="/dev/client-errors"
          className="bg-white border border-neutral-border hover:border-primary/40 rounded-2xl p-4 shadow-servio-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-slate">Monitor Error Frontend</span>
            <span className="w-8 h-8 rounded-lg bg-sky-light text-primary flex items-center justify-center">
              <Monitor size={18} weight="duotone" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-dark">
              {summary ? summary.totalClientErrors : "..."}
            </span>
            <span className="text-xs text-neutral-slate">insiden UI/API</span>
          </div>
          <div className="mt-1.5 text-[11px] text-neutral-slate">
            HTTP 4xx/5xx &amp; runtime crash lintas seluruh role user
          </div>
        </Link>
      </div>

      {/* 8-Microservice Status Grid */}
      <section className="bg-white border border-neutral-border rounded-2xl p-5 shadow-servio-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold font-display text-neutral-dark">
              Status 8 Microservice SERVIO
            </h2>
            <p className="text-xs text-neutral-slate mt-0.5">
              Klik salah satu kartu service untuk membuka log backend spesifik service tersebut.
            </p>
          </div>
          <Link
            href="/dev/health"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
          >
            <span>Detail Kesehatan</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {loading && services.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-neutral-soft border border-neutral-border animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map((svc) => {
              const badge =
                svc.status === "UP"
                  ? {
                      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      icon: <CheckCircle size={13} weight="fill" />,
                    }
                  : svc.status === "DEGRADED"
                    ? {
                        cls: "bg-amber-50 text-amber-700 border-amber-200",
                        icon: <Warning size={13} weight="fill" />,
                      }
                    : {
                        cls: "bg-rose-50 text-rose-700 border-rose-200",
                        icon: <XCircle size={13} weight="fill" />,
                      };

              return (
                <Link
                  key={svc.id}
                  href={`/dev/logs?serviceId=${encodeURIComponent(svc.id)}`}
                  className="bg-neutral-subtle hover:bg-white border border-neutral-border hover:border-primary/40 hover:shadow-servio-sm rounded-xl p-3.5 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-neutral-dark">{svc.shortName}</div>
                      <div className="text-[11px] font-mono text-neutral-slate">
                        127.0.0.1:{svc.port}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${badge.cls}`}
                    >
                      {badge.icon}
                      <span>{svc.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-border text-[10px] font-mono">
                    <div>
                      <div className="text-neutral-slate">HTTP</div>
                      <div
                        className={
                          svc.status === "DOWN"
                            ? "text-rose-600 font-semibold"
                            : "text-neutral-dark font-semibold"
                        }
                      >
                        {svc.status === "DOWN" ? "OFFLINE" : `${svc.latencyMs}ms`}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-slate">MySQL</div>
                      <div
                        className={
                          svc.dbConnected
                            ? "text-emerald-700 font-semibold"
                            : "text-rose-600 font-semibold"
                        }
                      >
                        {svc.dbConnected ? `OK ${svc.dbLatencyMs}ms` : "ERR"}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-slate">Errors</div>
                      <div
                        className={
                          svc.recentLogErrors > 0
                            ? "text-rose-600 font-bold"
                            : "text-neutral-dark font-semibold"
                        }
                      >
                        {svc.recentLogErrors}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Latest Incidents Feed */}
      <section className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
        <div className="px-5 py-4 border-b border-neutral-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold font-display text-neutral-dark">
              12 Insiden Error Terbaru Lintas Layer
            </h2>
            <p className="text-xs text-neutral-slate mt-0.5">
              Gabungan log backend Laravel, error API sisi frontend, dan kegagalan event outbox.
            </p>
          </div>
          <Link
            href="/dev/logs"
            className="text-xs font-semibold text-primary hover:text-primary-dark whitespace-nowrap"
          >
            Semua Log &rarr;
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-slate">
            {loading
              ? "Mengumpulkan telemetry lintas service..."
              : "Tidak ada error tercatat pada ekor log terbaru saat ini."}
          </div>
        ) : (
          <div className="divide-y divide-neutral-border">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="px-5 py-3.5 hover:bg-sky-light/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                        inc.severity === "ERROR"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {inc.source}
                    </span>
                    <span className="text-xs font-mono font-semibold text-neutral-dark">
                      {inc.serviceName}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-slate">
                      {formatRelativeTime(inc.timestamp)} ({formatWibTime(inc.timestamp)})
                    </span>
                    {inc.requestId && (
                      <Link
                        href={`/dev/tracer?q=${encodeURIComponent(inc.requestId)}`}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-light text-primary hover:bg-sky border border-sky"
                      >
                        {inc.requestId}
                      </Link>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-neutral-dark truncate">{inc.title}</div>
                  <div className="text-[11px] font-mono text-neutral-slate truncate">
                    {inc.subtitle}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {inc.requestId && (
                    <Link
                      href={`/dev/tracer?q=${encodeURIComponent(inc.requestId)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-sky-light hover:bg-sky text-primary border border-sky"
                    >
                      <GitBranch size={13} />
                      <span>Trace</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDrawer(inc.drawer)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border cursor-pointer"
                  >
                    Selidiki
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <JsonInspectorDrawer item={selectedDrawer} onClose={() => setSelectedDrawer(null)} />
    </div>
  );
}
