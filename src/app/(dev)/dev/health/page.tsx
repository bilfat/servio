"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  Warning,
  XCircle,
  ArrowsClockwise,
  Database,
  Link as LinkIcon,
  Bug,
} from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { formatWibTime } from "@/components/dev/devFormatters";

export default function DevHealthPage() {
  const {
    healthServices,
    topSummary,
    hasLoadedHealth,
    isRefreshingSummary,
    triggerRefresh,
  } = useDevAutoRefresh();

  const services = healthServices;
  const checkedAt = topSummary.checkedAt;
  const loading = !hasLoadedHealth;
  const pinging = isRefreshingSummary && hasLoadedHealth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
            Kesehatan Microservice &amp; Database MySQL
          </h1>
          <p className="text-xs text-neutral-slate mt-1">
            Ping HTTP langsung ke port{" "}
            <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
              8001–8008
            </span>
            , pengecekan pool MySQL{" "}
            <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
              servio_*_db
            </span>
            , dan deteksi dampak ketergantungan antar-layanan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {checkedAt && (
            <span className="text-[11px] font-mono text-neutral-slate">
              Cek terakhir: {formatWibTime(checkedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={pinging}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs shadow-servio-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            <ArrowsClockwise size={15} className={pinging ? "animate-spin" : ""} />
            <span>{pinging ? "Melakukan Ping..." : "Test Ping Semua Service"}</span>
          </button>
        </div>
      </div>

      {/* Infrastructure Gateway Self Card */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-servio-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0" />
          <div>
            <div className="text-xs font-bold font-display text-neutral-dark">
              Next.js BFF Aggregator &amp; Proxy Gateway (:3000)
            </div>
            <div className="text-[11px] text-neutral-slate mt-0.5">
              Pembaca log disk, MySQL Inspector, dan Auth Developer berjalan independen dari seluruh service PHP.
            </div>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold self-start sm:self-auto">
          ACTIVE · ISOLATED
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                <th className="py-3 px-4">Service &amp; Port</th>
                <th className="py-3 px-4">Status HTTP</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Database MySQL</th>
                <th className="py-3 px-4">Outbox / Failed Jobs</th>
                <th className="py-3 px-4">Ketergantungan Hulu</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {loading && services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-slate font-mono">
                    Menjalankan health ping paralel ke 8 service...
                  </td>
                </tr>
              ) : (
                services.map((svc) => {
                  const statusBadge =
                    svc.status === "UP"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : svc.status === "DEGRADED"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";

                  const latencyWidth = Math.min(
                    100,
                    Math.max(4, Math.round((svc.latencyMs / 3000) * 100))
                  );
                  const latencyColor =
                    svc.status === "DOWN"
                      ? "bg-rose-500"
                      : svc.latencyMs > 2500
                        ? "bg-amber-500"
                        : "bg-emerald-500";

                  const degradedReasons: string[] = [];
                  if (svc.status === "DEGRADED") {
                    if (!svc.dbConnected) degradedReasons.push("DB Error");
                    if (svc.outboxStuck > 0) degradedReasons.push(`${svc.outboxStuck} outbox stuck`);
                    if (svc.outboxFailed > 0)
                      degradedReasons.push(`${svc.outboxFailed} outbox failed`);
                    if (svc.failedJobsCount > 0)
                      degradedReasons.push(`${svc.failedJobsCount} failed job`);
                  }

                  return (
                    <tr key={svc.id} className="hover:bg-sky-light/40 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-neutral-dark">{svc.name}</div>
                        <div className="text-[11px] font-mono text-primary mt-0.5">
                          {svc.healthUrl}
                        </div>
                        <div className="text-[11px] text-neutral-slate mt-1">{svc.description}</div>
                      </td>

                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full border ${statusBadge}`}
                        >
                          {svc.status === "UP" && <CheckCircle size={13} weight="fill" />}
                          {svc.status === "DEGRADED" && <Warning size={13} weight="fill" />}
                          {svc.status === "DOWN" && <XCircle size={13} weight="fill" />}
                          <span>{svc.status}</span>
                        </span>
                        {svc.httpError && (
                          <div className="text-[10px] font-mono text-rose-600 mt-1 max-w-[180px] break-words">
                            {svc.httpError}
                          </div>
                        )}
                        {degradedReasons.length > 0 && (
                          <div className="text-[10px] font-mono text-amber-700 mt-1 max-w-[190px] break-words">
                            {degradedReasons.join(" · ")}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono font-semibold text-neutral-dark">
                          {svc.latencyMs} ms
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-neutral-soft mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${latencyColor}`}
                            style={{ width: `${latencyWidth}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 font-mono font-semibold">
                          <Database
                            size={14}
                            className={svc.dbConnected ? "text-emerald-600" : "text-rose-600"}
                          />
                          <span className={svc.dbConnected ? "text-emerald-700" : "text-rose-700"}>
                            {svc.dbConnected ? "CONNECTED" : "ERROR"}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-neutral-slate mt-0.5">
                          {svc.dbName} ({svc.dbLatencyMs}ms)
                        </div>
                        {svc.dbError && (
                          <div className="text-[10px] font-mono text-rose-600 mt-1 max-w-[200px]">
                            {svc.dbError}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top font-mono text-[11px]">
                        <div className="text-neutral-dark">Pending: {svc.outboxPending}</div>
                        <div
                          className={
                            svc.outboxStuck > 0
                              ? "text-amber-700 font-bold"
                              : "text-neutral-slate"
                          }
                        >
                          Stuck &gt;60s: {svc.outboxStuck}
                        </div>
                        <div
                          className={
                            svc.outboxFailed + svc.failedJobsCount > 0
                              ? "text-rose-600 font-bold"
                              : "text-neutral-slate"
                          }
                        >
                          Failed: {svc.outboxFailed} ob / {svc.failedJobsCount} job
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {svc.dependsOn.length === 0 ? (
                          <span className="text-[11px] text-neutral-slate font-mono">
                            Root Service
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {svc.dependsOn.map((dep) => {
                              const issue = svc.dependencyIssues.find((i) => i.serviceId === dep);
                              return (
                                <span
                                  key={dep}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                                    issue?.status === "DOWN"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : issue?.status === "DEGRADED"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-neutral-subtle text-neutral-dark border-neutral-border"
                                  }`}
                                >
                                  <LinkIcon size={10} />
                                  <span>{dep}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/dev/logs?serviceId=${encodeURIComponent(svc.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold"
                          >
                            <Bug size={13} className="text-rose-600" />
                            <span>Log ({svc.recentLogErrors})</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
