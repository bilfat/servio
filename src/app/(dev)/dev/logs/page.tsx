"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bug, Funnel, GitBranch, MagnifyingGlass } from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime } from "@/components/dev/devFormatters";
import type { ParsedLogEntry } from "@/lib/devMonitor/logParser";

interface ServiceOption {
  id: string;
  shortName: string;
  port: number;
}

function DevLogsContent() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get("serviceId") || "ALL";
  const initialReqId = searchParams.get("requestId") || "";

  const { refreshTick } = useDevAutoRefresh();

  const [serviceId, setServiceId] = useState(initialService);
  const [level, setLevel] = useState("ERRORS_ONLY");
  const [requestId, setRequestId] = useState(initialReqId);
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<ParsedLogEntry[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [summary, setSummary] = useState({ totalParsed: 0, errorCount: 0, warningCount: 0 });
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState<InspectorDrawerItem | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (serviceId !== "ALL") sp.set("serviceId", serviceId);
      if (level) sp.set("level", level);
      if (requestId.trim()) sp.set("requestId", requestId.trim());
      if (q.trim()) sp.set("q", q.trim());
      sp.set("limit", "150");

      const res = await fetch(`/api/dev/logs?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setEntries(json.entries || []);
      setServices(json.services || []);
      if (json.summary) setSummary(json.summary);
    } finally {
      setLoading(false);
    }
  }, [serviceId, level, requestId, q]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, refreshTick]);

  const openLogDrawer = (log: ParsedLogEntry) => {
    const isErr = ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(log.level);
    setDrawerItem({
      title: `[${log.serviceName} :${log.port}] ${log.level} — ${log.message}`,
      subtitle: `${log.source} · ${formatWibTime(log.timestamp)}`,
      badgeText: log.level,
      badgeTone: isErr ? "rose" : log.level === "WARNING" ? "amber" : "sky",
      requestId: log.requestId,
      correlationId: log.correlationId,
      metaPairs: [
        { label: "Service", value: `${log.serviceName} (:${log.port})` },
        { label: "Sumber File", value: log.source },
        { label: "Endpoint Route", value: log.route },
        { label: "File & Baris", value: log.fileLine },
        { label: "Actor ID", value: log.actorId },
        { label: "Actor Role", value: log.actorRole },
      ],
      stackTrace: log.stackTrace,
      jsonPayload: log.context,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
            Log Error Backend (Multi-Service Parser)
          </h1>
          <p className="text-xs text-neutral-slate mt-1">
            Membaca langsung{" "}
            <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
              laravel.log
            </span>{" "}
            &amp;{" "}
            <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
              stderr
            </span>{" "}
            dari disk 8 microservice — tetap tampil lengkap walau port layanan sedang down.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
            Errors: {summary.errorCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            Warnings: {summary.warningCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white text-neutral-dark border border-neutral-border">
            Total Parsed: {summary.totalParsed}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Filter Microservice
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
          >
            <option value="ALL">Semua 8 Microservice</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName} (:{s.port})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Level Severity
          </label>
          <div className="relative">
            <Funnel
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-slate"
            />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
            >
              <option value="ERRORS_ONLY">Error &amp; Critical Saja</option>
              <option value="ALL">Semua Level (Termasuk Warning &amp; Info)</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING (4xx / Validation)</option>
              <option value="INFO">INFO</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            X-Request-ID / Correlation
          </label>
          <input
            type="text"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="req-..."
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Cari Pesan / Stack Trace / File
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
              placeholder="SQLSTATE, Undefined, Controller..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Pesan Error &amp; Lokasi Kode</th>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4 text-right">Inspeksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate font-mono">
                    Membaca tail log Laravel &amp; stderr 8 service...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate">
                    Tidak ada entri log yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                entries.map((log) => {
                  const isErr = ["EMERGENCY", "ALERT", "CRITICAL", "ERROR"].includes(log.level);
                  const levelCls = isErr
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : log.level === "WARNING"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-sky-light text-primary border-sky";

                  return (
                    <tr
                      key={log.id}
                      onClick={() => openLogDrawer(log)}
                      className="hover:bg-sky-light/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-slate whitespace-nowrap align-top">
                        {formatWibTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <span className="font-bold text-neutral-dark">{log.serviceName}</span>
                        <span className="ml-1 font-mono text-[11px] text-neutral-slate">
                          :{log.port}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${levelCls}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top max-w-[340px] xl:max-w-[420px]">
                        <div className="text-neutral-dark font-semibold line-clamp-2 break-words">
                          {log.message}
                        </div>
                        <div className="text-[11px] font-mono text-neutral-slate mt-1 flex flex-wrap gap-2">
                          {log.route && (
                            <span className="text-primary font-medium break-all">{log.route}</span>
                          )}
                          {log.fileLine && (
                            <span className="break-all line-clamp-1">{log.fileLine}</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {log.requestId ? (
                          <Link
                            href={`/dev/tracer?q=${encodeURIComponent(log.requestId)}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-light hover:bg-sky text-primary border border-sky font-mono text-[10px] font-semibold"
                          >
                            <GitBranch size={11} />
                            <span>{log.requestId.slice(0, 18)}</span>
                          </Link>
                        ) : (
                          <span className="text-neutral-muted font-mono text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLogDrawer(log);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold cursor-pointer"
                        >
                          <Bug size={12} className="text-rose-600" />
                          <span>Stack Trace</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <JsonInspectorDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}

export default function DevLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs font-mono text-neutral-slate">
          Memuat Log Parser...
        </div>
      }
    >
      <DevLogsContent />
    </Suspense>
  );
}
