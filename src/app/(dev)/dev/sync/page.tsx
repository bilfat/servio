"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, Warning, MagnifyingGlass, GitBranch } from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime } from "@/components/dev/devFormatters";
import type {
  UnifiedFailedJobRecord,
  UnifiedInboxRecord,
  UnifiedOutboxRecord,
} from "@/lib/devMonitor/dbDiagnostics";

export default function DevSyncPage() {
  const { refreshTick } = useDevAutoRefresh();

  const [tab, setTab] = useState<"OUTBOX" | "INBOX" | "FAILED_JOBS">("OUTBOX");
  const [serviceId, setServiceId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [outbox, setOutbox] = useState<UnifiedOutboxRecord[]>([]);
  const [inbox, setInbox] = useState<UnifiedInboxRecord[]>([]);
  const [failedJobs, setFailedJobs] = useState<UnifiedFailedJobRecord[]>([]);
  const [stats, setStats] = useState({
    totalOutbox: 0,
    publishedCount: 0,
    pendingCount: 0,
    stuckCount: 0,
    failedOutboxCount: 0,
    failedInboxCount: 0,
    failedJobsCount: 0,
  });
  const [services, setServices] = useState<Array<{ id: string; shortName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState<InspectorDrawerItem | null>(null);

  const loadSync = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (serviceId !== "ALL") sp.set("serviceId", serviceId);
      if (statusFilter !== "ALL") sp.set("status", statusFilter);
      if (q.trim()) sp.set("q", q.trim());

      const res = await fetch(`/api/dev/sync?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setOutbox(json.outbox || []);
      setInbox(json.inbox || []);
      setFailedJobs(json.failedJobs || []);
      if (json.stats) setStats(json.stats);
      if (json.services) setServices(json.services);
    } finally {
      setLoading(false);
    }
  }, [serviceId, statusFilter, q]);

  useEffect(() => {
    loadSync();
  }, [loadSync, refreshTick]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
          Pengawas Sinkronisasi Outbox, Inbox &amp; Queue Jobs
        </h1>
        <p className="text-xs text-neutral-slate mt-1">
          Mendeteksi event antar-microservice yang gagal terkirim (
          <span className="font-mono font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
            FAILED
          </span>
          ), macet di antrean (
          <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            PENDING &gt; 60d
          </span>
          ), dan antrean job Laravel yang crash (
          <span className="font-mono font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
            failed_jobs
          </span>
          ).
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-neutral-border rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[11px] font-semibold text-neutral-slate">Published Outbox</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {stats.publishedCount}
          </div>
        </div>
        <div className="bg-white border border-neutral-border rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[11px] font-semibold text-neutral-slate">Pending Outbox</div>
          <div className="text-xl font-bold font-mono text-primary mt-1">{stats.pendingCount}</div>
        </div>
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[11px] font-semibold text-amber-800">Stuck &gt; 60 Detik</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">{stats.stuckCount}</div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[11px] font-semibold text-rose-800">Failed Outbox / Inbox</div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            {stats.failedOutboxCount} / {stats.failedInboxCount}
          </div>
        </div>
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[11px] font-semibold text-rose-800">Failed Queue Jobs</div>
          <div className="text-xl font-bold font-mono text-rose-700 mt-1">
            {stats.failedJobsCount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("OUTBOX")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
            tab === "OUTBOX"
              ? "bg-primary text-white border-primary shadow-servio-sm"
              : "bg-white text-neutral-slate hover:text-neutral-dark border-neutral-border"
          }`}
        >
          Outbox Events ({outbox.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("INBOX")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
            tab === "INBOX"
              ? "bg-primary text-white border-primary shadow-servio-sm"
              : "bg-white text-neutral-slate hover:text-neutral-dark border-neutral-border"
          }`}
        >
          Inbox Consumptions ({inbox.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("FAILED_JOBS")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
            tab === "FAILED_JOBS"
              ? "bg-rose-600 text-white border-rose-600 shadow-servio-sm"
              : "bg-white text-neutral-slate hover:text-neutral-dark border-neutral-border"
          }`}
        >
          Failed Queue Jobs ({failedJobs.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
          >
            <option value="ALL">Semua 8 Service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Status Outbox
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={tab !== "OUTBOX"}
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white disabled:opacity-50"
          >
            <option value="ALL">Semua Status</option>
            <option value="FAILED">FAILED Saja</option>
            <option value="PENDING">PENDING Saja</option>
            <option value="PUBLISHED">PUBLISHED</option>
          </select>
        </div>

        <div className="md:col-span-5">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Cari Event Type / Aggregate ID / Error
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-slate"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="PaymentSucceeded, order_id, correlation_id..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tab Tables */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
        {tab === "OUTBOX" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                  <th className="py-3 px-4">Dibuat</th>
                  <th className="py-3 px-4">Service / Tabel</th>
                  <th className="py-3 px-4">Event &amp; Aggregate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts / Error</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border text-xs">
                {loading && outbox.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-slate font-mono">
                      Mengambil status outbox lintas 8 DB...
                    </td>
                  </tr>
                ) : outbox.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-slate">
                      Tidak ada event outbox untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  outbox.map((ob) => {
                    const cls =
                      ob.status === "FAILED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : ob.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    return (
                      <tr
                        key={ob.id}
                        onClick={() =>
                          setDrawerItem({
                            title: `Outbox [${ob.status}]: ${ob.eventType}`,
                            subtitle: `${ob.serviceName} (${ob.tableName})`,
                            badgeText: ob.status,
                            badgeTone:
                              ob.status === "FAILED"
                                ? "rose"
                                : ob.status === "PENDING"
                                  ? "amber"
                                  : "emerald",
                            correlationId: ob.correlationId,
                            traceQuery: ob.aggregateId || ob.correlationId,
                            metaPairs: [
                              { label: "Service", value: ob.serviceName },
                              {
                                label: "Aggregate",
                                value: `${ob.aggregateType || "-"}#${ob.aggregateId || "-"}`,
                              },
                              { label: "Raw Status", value: ob.rawStatus },
                              { label: "Attempts", value: ob.attempts },
                              { label: "Created At", value: formatWibTime(ob.createdAt) },
                              { label: "Published At", value: formatWibTime(ob.publishedAt) },
                              { label: "Last Error", value: ob.lastError },
                            ],
                            jsonPayload: ob.payload,
                          })
                        }
                        className="hover:bg-sky-light/40 cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-slate whitespace-nowrap">
                          {formatWibTime(ob.createdAt)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-neutral-dark">{ob.serviceName}</div>
                          <div className="text-[10px] font-mono text-neutral-slate">
                            {ob.tableName}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-neutral-dark">
                            {ob.eventType}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-slate">
                            {ob.aggregateType || "-"}: {ob.aggregateId || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${cls}`}
                          >
                            {ob.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-mono text-[11px] text-neutral-dark">
                            Attempts: {ob.attempts}
                          </div>
                          {ob.lastError && (
                            <div className="text-[11px] text-rose-600 truncate">
                              {ob.lastError}
                            </div>
                          )}
                        </td>
                        <td
                          className="py-3 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {ob.aggregateId && (
                              <Link
                                href={`/dev/tracer?q=${encodeURIComponent(ob.aggregateId)}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-light hover:bg-sky text-primary border border-sky text-[10px] font-semibold"
                              >
                                <GitBranch size={11} />
                                <span>Trace</span>
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerItem({
                                  title: `Outbox: ${ob.eventType}`,
                                  badgeText: ob.status,
                                  badgeTone: ob.status === "FAILED" ? "rose" : "sky",
                                  jsonPayload: ob.payload,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold cursor-pointer"
                            >
                              <Database size={12} className="text-primary" />
                              <span>JSON</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "INBOX" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Sumber &amp; Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border text-xs">
                {inbox.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-neutral-slate">
                      Belum ada rekaman inbox consumption.
                    </td>
                  </tr>
                ) : (
                  inbox.map((ib) => {
                    const isErr = /FAIL|ERROR|DEAD/i.test(ib.status) || Boolean(ib.errorMessage);
                    return (
                      <tr key={ib.id} className="hover:bg-sky-light/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-slate whitespace-nowrap">
                          {formatWibTime(ib.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-bold text-neutral-dark">{ib.serviceName}</td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="font-semibold text-neutral-dark">
                            {ib.eventType || ib.sourceEventId || "-"}
                          </div>
                          <div className="text-neutral-slate">
                            From: {ib.sourceService || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                              isErr
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {ib.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-rose-600">
                          {ib.errorMessage || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "FAILED_JOBS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                  <th className="py-3 px-4">Waktu Gagal</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Queue</th>
                  <th className="py-3 px-4">Ringkasan Exception</th>
                  <th className="py-3 px-4 text-right">Inspeksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border text-xs">
                {failedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-emerald-700 font-mono font-semibold">
                      Nol failed_jobs di seluruh 8 database microservice!
                    </td>
                  </tr>
                ) : (
                  failedJobs.map((fj) => (
                    <tr
                      key={fj.id}
                      onClick={() =>
                        setDrawerItem({
                          title: `Failed Job [${fj.serviceName}] Queue: ${fj.queue}`,
                          subtitle: `UUID: ${fj.uuid} · ${formatWibTime(fj.failedAt)}`,
                          badgeText: "FAILED_JOB",
                          badgeTone: "rose",
                          stackTrace: fj.exception,
                          jsonPayload: fj.payload,
                        })
                      }
                      className="hover:bg-sky-light/40 cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-slate whitespace-nowrap">
                        {formatWibTime(fj.failedAt)}
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-dark">{fj.serviceName}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-amber-700">
                        {fj.queue}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-rose-700 max-w-lg truncate">
                        {fj.exception.split("\n")[0]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                          <Warning size={12} weight="fill" />
                          <span>Exception</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <JsonInspectorDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}
