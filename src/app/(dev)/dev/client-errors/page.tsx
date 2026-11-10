"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, MagnifyingGlass, GitBranch, Bug } from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime } from "@/components/dev/devFormatters";
import type { ClientErrorEvent } from "@/lib/devMonitor/clientTelemetryStore";

export default function DevClientErrorsPage() {
  const { refreshTick } = useDevAutoRefresh();

  const [role, setRole] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [events, setEvents] = useState<ClientErrorEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState<InspectorDrawerItem | null>(null);

  const loadClientErrors = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (role !== "ALL") sp.set("role", role);
      if (kind !== "ALL") sp.set("kind", kind);
      if (status !== "ALL") sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      sp.set("limit", "150");

      const res = await fetch(`/api/dev/telemetry/client-error?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setEvents(json.events || []);
      setTotalCount(json.totalCount || 0);
      setByRole(json.byRole || {});
      setByStatus(json.byStatus || {});
    } finally {
      setLoading(false);
    }
  }, [role, kind, status, q]);

  useEffect(() => {
    loadClientErrors();
  }, [loadClientErrors, refreshTick]);

  const openClientDrawer = (ev: ClientErrorEvent) => {
    setDrawerItem({
      title: `${ev.kind}: ${ev.message}`,
      subtitle: `${ev.pageRoute} · Role ${ev.userRole}`,
      badgeText: ev.httpStatus ? `HTTP ${ev.httpStatus}` : ev.kind,
      badgeTone: ev.httpStatus && ev.httpStatus >= 500 ? "rose" : "amber",
      requestId: ev.requestId,
      metaPairs: [
        { label: "User Role", value: ev.userRole },
        { label: "User ID", value: ev.userId },
        { label: "Halaman UI", value: ev.pageRoute },
        { label: "API Endpoint", value: `${ev.method || "-"} ${ev.endpoint || "-"}` },
        { label: "Error Code", value: ev.errorCode },
        {
          label: "Durasi Request",
          value: ev.durationMs !== null && ev.durationMs !== undefined ? `${ev.durationMs} ms` : "-",
        },
        { label: "Waktu Kejadian", value: formatWibTime(ev.timestamp) },
      ],
      stackTrace: ev.stack,
      jsonPayload: ev,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
            Monitor Error Frontend &amp; API Client
          </h1>
          <p className="text-xs text-neutral-slate mt-1">
            Menangkap otomatis error HTTP 4xx/5xx, network timeout, dan crash runtime React dari portal Customer, Worker, Provider, Merchant, Supplier, Admin, Finance, dan CEO.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-white border border-neutral-border text-xs font-mono font-semibold text-neutral-dark shadow-2xs self-start">
          Total Tersimpan: {totalCount}
        </span>
      </div>

      {/* Role & Status Distribution Pills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-neutral-border rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-2">
            Distribusi Berdasarkan Role
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setRole("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer border transition-colors ${
                role === "ALL"
                  ? "bg-primary text-white border-primary"
                  : "bg-neutral-subtle text-neutral-slate hover:text-neutral-dark border-neutral-border"
              }`}
            >
              ALL
            </button>
            {Object.entries(byRole).map(([rKey, cnt]) => (
              <button
                key={rKey}
                type="button"
                onClick={() => setRole(rKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer border transition-colors ${
                  role === rKey
                    ? "bg-primary text-white border-primary"
                    : "bg-neutral-subtle text-neutral-dark hover:bg-sky-light border-neutral-border"
                }`}
              >
                {rKey}: {cnt}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-neutral-border rounded-xl p-3.5 shadow-servio-sm">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-2">
            Distribusi Kode Status / Jenis
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStatus("ALL");
                setKind("ALL");
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer border transition-colors ${
                status === "ALL" && kind === "ALL"
                  ? "bg-primary text-white border-primary"
                  : "bg-neutral-subtle text-neutral-slate hover:text-neutral-dark border-neutral-border"
              }`}
            >
              ALL
            </button>
            {Object.entries(byStatus).map(([sKey, cnt]) => {
              const isSelected = status === sKey || kind === sKey;
              return (
                <button
                  key={sKey}
                  type="button"
                  onClick={() => (/^\d+$/.test(sKey) ? setStatus(sKey) : setKind(sKey))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold cursor-pointer border transition-colors ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-neutral-subtle text-neutral-dark hover:bg-sky-light border-neutral-border"
                  }`}
                >
                  {sKey}: {cnt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Jenis Error
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
          >
            <option value="ALL">Semua Jenis Error</option>
            <option value="API_ERROR">API_ERROR (HTTP 4xx / 5xx)</option>
            <option value="NETWORK_ERROR">NETWORK_ERROR (Koneksi / Service Mati)</option>
            <option value="REACT_RUNTIME">REACT_RUNTIME (ErrorBoundary / JS)</option>
            <option value="UNHANDLED_REJECTION">UNHANDLED_REJECTION</option>
          </select>
        </div>

        <div className="md:col-span-8">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Cari Halaman, Endpoint, Pesan, atau Request ID
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
              placeholder="/worker/dashboard, /order-jasa/orders, req-..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
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
                <th className="py-3 px-3.5">Waktu</th>
                <th className="py-3 px-3.5">Role &amp; Halaman UI</th>
                <th className="py-3 px-3.5">Status / Jenis</th>
                <th className="py-3 px-3.5">Pesan Error &amp; Endpoint API</th>
                <th className="py-3 px-3.5">Request ID</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {loading && events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate font-mono">
                    Memuat laporan error sisi client...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate">
                    Belum ada error sisi frontend tercatat.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const isCrit =
                    ev.kind === "REACT_RUNTIME" ||
                    ev.kind === "NETWORK_ERROR" ||
                    (ev.httpStatus !== null && ev.httpStatus !== undefined && ev.httpStatus >= 500);
                  return (
                    <tr
                      key={ev.id}
                      onClick={() => openClientDrawer(ev)}
                      className="hover:bg-sky-light/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3.5 font-mono text-[11px] text-neutral-slate whitespace-nowrap align-top">
                        {formatWibTime(ev.timestamp)}
                      </td>
                      <td className="py-3 px-3.5 align-top max-w-[180px]">
                        <span className="font-mono text-[11px] font-bold text-neutral-dark">
                          {ev.userRole}
                        </span>
                        <div className="text-[11px] font-mono text-primary mt-0.5 break-all">
                          {ev.pageRoute}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap align-top">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${
                            isCrit
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {ev.httpStatus ? `HTTP ${ev.httpStatus}` : ev.kind}
                        </span>
                        {ev.durationMs !== null && ev.durationMs !== undefined && (
                          <div className="text-[10px] font-mono text-neutral-slate mt-1">
                            {ev.durationMs}ms
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 align-top max-w-[260px] xl:max-w-[300px]">
                        <div className="font-semibold text-neutral-dark line-clamp-2 break-words">
                          {ev.message}
                        </div>
                        {ev.endpoint && (
                          <div className="text-[11px] font-mono text-neutral-slate mt-1 break-all line-clamp-2">
                            {ev.method || "GET"} {ev.endpoint}
                          </div>
                        )}
                      </td>
                      <td
                        className="py-3 px-3.5 whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ev.requestId ? (
                          <Link
                            href={`/dev/tracer?q=${encodeURIComponent(ev.requestId)}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-light hover:bg-sky text-primary border border-sky font-mono text-[10px] font-semibold"
                          >
                            <GitBranch size={11} />
                            <span>{ev.requestId.slice(0, 14)}</span>
                          </Link>
                        ) : (
                          <span className="text-neutral-muted font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openClientDrawer(ev);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold cursor-pointer"
                        >
                          {ev.stack ? (
                            <Bug size={12} className="text-rose-600" />
                          ) : (
                            <Monitor size={12} className="text-primary" />
                          )}
                          <span>Detail</span>
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
