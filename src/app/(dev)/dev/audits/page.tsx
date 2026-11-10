"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListChecks, MagnifyingGlass, GitBranch, Warning } from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime } from "@/components/dev/devFormatters";
import type { UnifiedAuditRecord } from "@/lib/devMonitor/dbDiagnostics";

const DOMAIN_TABS = [
  { id: "ALL", label: "Semua Modul (8 Service)" },
  { id: "IDENTITY", label: "Akun, RBAC & KYC" },
  { id: "CATALOG", label: "Kategori, Produk & Jasa" },
  { id: "ORDER", label: "Order Barang & Order Jasa" },
  { id: "FINANCE", label: "Finansial, Escrow & S-Pay" },
  { id: "AFTER_SALES", label: "Garansi, Retur & Ulasan" },
];

export default function DevAuditsPage() {
  const { refreshTick } = useDevAutoRefresh();

  const [domain, setDomain] = useState("ALL");
  const [serviceId, setServiceId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<UnifiedAuditRecord[]>([]);
  const [services, setServices] = useState<
    Array<{ id: string; shortName: string; domain: string; auditTable: string }>
  >([]);
  const [serviceErrors, setServiceErrors] = useState<
    Array<{ serviceId: string; error: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [drawerItem, setDrawerItem] = useState<InspectorDrawerItem | null>(null);

  const loadAudits = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (domain !== "ALL") sp.set("domain", domain);
      if (serviceId !== "ALL") sp.set("serviceId", serviceId);
      if (search.trim()) sp.set("q", search.trim());
      sp.set("limit", "160");

      const res = await fetch(`/api/dev/audits?${sp.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setRecords(json.records || []);
      setServices(json.services || []);
      setServiceErrors(json.serviceErrors || []);
    } finally {
      setLoading(false);
    }
  }, [domain, serviceId, search]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits, refreshTick]);

  const openAuditDrawer = (r: UnifiedAuditRecord) => {
    setDrawerItem({
      title: `[${r.serviceName}] ${r.action}`,
      subtitle: `${r.entityType || "ENTITY"}: ${r.entityId || "-"} · ${formatWibTime(r.occurredAt)}`,
      badgeText: r.result,
      badgeTone: /FAIL|REJECT|DENY|ERROR/i.test(`${r.action} ${r.result}`) ? "rose" : "emerald",
      requestId: r.requestId,
      correlationId: r.correlationId,
      traceQuery: r.entityId || r.requestId || r.correlationId || r.actorUserId,
      metaPairs: [
        { label: "Service", value: r.serviceName },
        { label: "Domain", value: r.domain },
        { label: "Actor User ID", value: r.actorUserId },
        { label: "Actor Role", value: r.actorRole },
        { label: "Entity", value: `${r.entityType || "-"} (${r.entityId || "-"})` },
        { label: "Alasan / Reason Code", value: r.reason },
      ],
      jsonPayload: r.metadata,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
          Audit Trail Lintas Fitur SERVIO
        </h1>
        <p className="text-xs text-neutral-slate mt-1">
          Agregasi read-only langsung dari seluruh tabel audit di 8 database MySQL untuk melacak perubahan data di fitur Customer, Mitra, Teknisi, Finance, Admin, dan CEO.
        </p>
      </div>

      {/* Domain Tabs */}
      <div className="flex flex-wrap gap-2">
        {DOMAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setDomain(tab.id);
              setServiceId("ALL");
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
              domain === tab.id
                ? "bg-primary text-white border-primary shadow-servio-sm"
                : "bg-white text-neutral-slate hover:text-neutral-dark hover:bg-neutral-soft border-neutral-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DB query warnings if a DB is offline */}
      {serviceErrors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <Warning size={15} weight="fill" className="text-amber-600" />
            <span>Sebagian database gagal dibaca:</span>
          </div>
          {serviceErrors.map((se) => (
            <div key={se.serviceId} className="font-mono text-[11px]">
              &bull; {se.serviceId}: {se.error}
            </div>
          ))}
        </div>
      )}

      {/* Search & Service Filter */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Filter Tabel Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
          >
            <option value="ALL">Semua Service dalam Domain Ini</option>
            {services
              .filter((s) => domain === "ALL" || s.domain === domain)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} ({s.auditTable})
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-8">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
            Cari Entity ID / Actor ID / Action / Request ID
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-slate"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ORDER_CREATED, LOGIN_FAILED, UUID user/order, correlation ID..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Aksi &amp; Hasil</th>
                <th className="py-3 px-4">Entity Target</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate font-mono">
                    Mengambil catatan audit dari 8 database...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-slate">
                    Tidak ada catatan audit ditemukan untuk filter ini.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isBad =
                    /FAIL|REJECT|DENY|ERROR/i.test(r.result) ||
                    (/FAIL|REJECT|DENY|ERROR/i.test(r.action) && !/SUCCESS|OK/i.test(r.result));
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openAuditDrawer(r)}
                      className="hover:bg-sky-light/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-slate whitespace-nowrap align-top">
                        {formatWibTime(r.occurredAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <span className="font-bold text-neutral-dark">{r.serviceName}</span>
                        <div className="text-[10px] font-mono text-neutral-slate">{r.domain}</div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono font-bold text-neutral-dark">{r.action}</div>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border ${
                            isBad
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {r.result}
                        </span>
                        {r.reason && (
                          <div className="text-[11px] text-neutral-slate mt-1">{r.reason}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] align-top">
                        <div className="text-neutral-dark font-medium">{r.entityType || "-"}</div>
                        <div className="text-neutral-slate break-all max-w-[200px]">
                          {r.entityId || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] align-top">
                        <div className="text-neutral-dark font-medium">{r.actorRole || "-"}</div>
                        <div className="text-neutral-slate break-all max-w-[180px]">
                          {r.actorUserId || "-"}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {(r.entityId || r.requestId) && (
                            <Link
                              href={`/dev/tracer?q=${encodeURIComponent(
                                r.entityId || r.requestId || ""
                              )}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-light hover:bg-sky text-primary border border-sky text-[10px] font-semibold"
                            >
                              <GitBranch size={11} />
                              <span>Trace</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => openAuditDrawer(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold cursor-pointer"
                          >
                            <ListChecks size={12} className="text-primary" />
                            <span>Metadata</span>
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
      </div>

      <JsonInspectorDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}
