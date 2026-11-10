"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GitBranch,
  MagnifyingGlass,
  Monitor,
  Bug,
  ListChecks,
  Database,
  Warning,
  CheckCircle,
  Clock,
} from "@phosphor-icons/react";
import { JsonInspectorDrawer, InspectorDrawerItem } from "@/components/dev/JsonInspectorDrawer";
import { formatWibTime } from "@/components/dev/devFormatters";
import type { UnifiedTraceStep } from "@/app/api/dev/tracer/route";

interface TracerResponse {
  query: string;
  searchTerms: string[];
  resolved: {
    orderJasa: Record<string, unknown> | null;
    orderBarang: Record<string, unknown> | null;
    case: Record<string, unknown> | null;
    user: Record<string, unknown> | null;
  } | null;
  timeline: UnifiedTraceStep[];
  counts: {
    frontend: number;
    backendLogs: number;
    dbAudits: number;
    outboxSync: number;
    failedJobs: number;
    total: number;
  };
}

function DevTracerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";

  const [inputQ, setInputQ] = useState(initialQ);
  const [data, setData] = useState<TracerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerItem, setDrawerItem] = useState<InspectorDrawerItem | null>(null);

  const runTrace = useCallback(async (queryStr: string) => {
    const clean = queryStr.trim();
    if (!clean) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dev/tracer?q=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as TracerResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInputQ(initialQ);
    if (initialQ.trim()) {
      runTrace(initialQ);
    }
  }, [initialQ, runTrace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputQ.trim();
    if (!clean) return;
    router.push(`/dev/tracer?q=${encodeURIComponent(clean)}`);
  };

  const layerBadge = (layer: UnifiedTraceStep["layer"]) => {
    switch (layer) {
      case "FRONTEND":
        return {
          cls: "bg-sky-light text-primary border-sky",
          icon: <Monitor size={13} />,
        };
      case "BACKEND_LOG":
        return {
          cls: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <Bug size={13} />,
        };
      case "DB_AUDIT":
        return {
          cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <ListChecks size={13} />,
        };
      case "OUTBOX_SYNC":
      case "INBOX_SYNC":
        return {
          cls: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <Database size={13} />,
        };
      case "FAILED_JOB":
        return {
          cls: "bg-rose-100 text-rose-800 border-rose-300",
          icon: <Warning size={13} />,
        };
    }
  };

  const openStepDrawer = (step: UnifiedTraceStep) => {
    setDrawerItem({
      title: step.title,
      subtitle: `${step.serviceName} · ${formatWibTime(step.timestamp)}`,
      badgeText: step.layer,
      badgeTone:
        step.severity === "ERROR"
          ? "rose"
          : step.severity === "WARNING"
            ? "amber"
            : "emerald",
      requestId: step.requestId,
      correlationId: step.correlationId,
      metaPairs: [
        { label: "Layer", value: step.layer },
        { label: "Service", value: step.serviceName },
        { label: "Severity", value: step.severity },
        { label: "Timestamp", value: formatWibTime(step.timestamp) },
      ],
      jsonPayload: step.raw,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
          Pelacak Jejak End-to-End (Distributed Tracer)
        </h1>
        <p className="text-xs text-neutral-slate mt-1">
          Masukkan{" "}
          <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
            Order ID
          </span>
          ,{" "}
          <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
            No. Order
          </span>
          ,{" "}
          <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
            Case ID
          </span>
          ,{" "}
          <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
            User ID / Email
          </span>
          , atau{" "}
          <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
            X-Request-ID (req-...)
          </span>{" "}
          untuk menyusun kronologi lintas 8 service &amp; browser.
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-slate"
          />
          <input
            type="text"
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="Contoh: req-8a7fd..., ORD-..., 01M6X..., customer@servio.id"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-sm font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs inline-flex items-center justify-center gap-2 shadow-servio-sm transition-colors cursor-pointer disabled:opacity-60"
        >
          <GitBranch size={16} weight="bold" />
          <span>{loading ? "Melacak Lintas Service..." : "Lacak Jejak"}</span>
        </button>
      </form>

      {/* Initial Empty Help State */}
      {!data && !loading && (
        <div className="bg-white border border-neutral-border rounded-2xl p-8 text-center space-y-2 shadow-servio-sm">
          <GitBranch size={32} className="mx-auto text-primary/60" />
          <div className="text-sm font-bold font-display text-neutral-dark">
            Siap Melacak Jejak Transaksi &amp; Error SERVIO
          </div>
          <p className="text-xs text-neutral-slate max-w-lg mx-auto">
            Tracer otomatis mengaitkan Order UUID dengan Nomor Order, Case After-Sales, Event Outbox, Log Laravel, Audit Database, dan Laporan Error dari Browser dalam satu garis waktu kronologis.
          </p>
        </div>
      )}

      {/* Trace Results */}
      {data && (
        <div className="space-y-5">
          {/* Resolved Anchor Cards */}
          {(data.resolved?.orderJasa ||
            data.resolved?.orderBarang ||
            data.resolved?.case ||
            data.resolved?.user) && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {data.resolved.orderJasa && (
                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 text-xs space-y-1 shadow-servio-sm">
                  <div className="text-[10px] font-mono font-bold text-emerald-700">
                    RESOLVED: ORDER JASA (8007)
                  </div>
                  <div className="font-mono font-bold text-neutral-dark">
                    {String(data.resolved.orderJasa.order_no || data.resolved.orderJasa.id)}
                  </div>
                  <div className="text-neutral-slate font-mono text-[11px]">
                    Status: {String(data.resolved.orderJasa.status)} · Phase:{" "}
                    {String(data.resolved.orderJasa.phase)}
                  </div>
                </div>
              )}

              {data.resolved.orderBarang && (
                <div className="bg-white border border-sky rounded-xl p-3.5 text-xs space-y-1 shadow-servio-sm">
                  <div className="text-[10px] font-mono font-bold text-primary">
                    RESOLVED: ORDER BARANG (8005)
                  </div>
                  <div className="font-mono font-bold text-neutral-dark">
                    {String(data.resolved.orderBarang.order_no || data.resolved.orderBarang.id)}
                  </div>
                  <div className="text-neutral-slate font-mono text-[11px]">
                    Status: {String(data.resolved.orderBarang.status)}
                  </div>
                </div>
              )}

              {data.resolved.case && (
                <div className="bg-white border border-amber-200 rounded-xl p-3.5 text-xs space-y-1 shadow-servio-sm">
                  <div className="text-[10px] font-mono font-bold text-amber-700">
                    RESOLVED: AFTER-SALES CASE (8008)
                  </div>
                  <div className="font-mono font-bold text-neutral-dark">
                    {String(data.resolved.case.case_number || data.resolved.case.id)}
                  </div>
                  <div className="text-neutral-slate font-mono text-[11px]">
                    State: {String(data.resolved.case.state)}
                  </div>
                </div>
              )}

              {data.resolved.user && (
                <div className="bg-white border border-purple-200 rounded-xl p-3.5 text-xs space-y-1 shadow-servio-sm">
                  <div className="text-[10px] font-mono font-bold text-purple-700">
                    RESOLVED: IDENTITY USER (8001)
                  </div>
                  <div className="font-semibold text-neutral-dark">
                    {String(data.resolved.user.name)} ({String(data.resolved.user.email)})
                  </div>
                  <div className="text-neutral-slate font-mono text-[11px]">
                    ID: {String(data.resolved.user.id)} · {String(data.resolved.user.status)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Layer Counts Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-white text-neutral-dark border border-neutral-border">
              Total Langkah: {data.counts.total}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-light text-primary border border-sky">
              Frontend Error: {data.counts.frontend}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              Backend Log: {data.counts.backendLogs}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              DB Audit: {data.counts.dbAudits}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              Outbox/Inbox: {data.counts.outboxSync}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
              Failed Jobs: {data.counts.failedJobs}
            </span>
          </div>

          {/* Unified Chronological Timeline */}
          <div className="bg-white border border-neutral-border rounded-2xl p-5 shadow-servio-sm">
            {data.timeline.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-slate">
                Tidak ditemukan jejak dengan kata kunci{" "}
                <span className="font-mono font-semibold text-neutral-dark">
                  &ldquo;{data.query}&rdquo;
                </span>{" "}
                pada log frontend, laravel.log, tabel audit, atau outbox.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-neutral-border">
                {data.timeline.map((step) => {
                  const lb = layerBadge(step.layer);
                  const dotColor =
                    step.severity === "ERROR"
                      ? "bg-rose-500 ring-rose-500/20"
                      : step.severity === "WARNING"
                        ? "bg-amber-500 ring-amber-500/20"
                        : "bg-emerald-500 ring-emerald-500/20";

                  return (
                    <div
                      key={step.id}
                      onClick={() => openStepDrawer(step)}
                      className="relative bg-neutral-subtle hover:bg-white border border-neutral-border hover:border-primary/40 hover:shadow-servio-sm rounded-xl p-4 cursor-pointer transition-all"
                    >
                      <span
                        className={`absolute -left-[22px] top-5 w-3 h-3 rounded-full ring-4 ${dotColor}`}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${lb.cls}`}
                          >
                            {lb.icon}
                            <span>{step.layer}</span>
                          </span>
                          <span className="text-xs font-bold text-neutral-dark">
                            {step.serviceName}
                          </span>
                          {step.severity === "INFO" && (
                            <CheckCircle size={13} className="text-emerald-600" weight="fill" />
                          )}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-slate">
                          <Clock size={12} />
                          <span>{formatWibTime(step.timestamp)}</span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-neutral-dark">{step.title}</div>
                      <div className="text-[11px] font-mono text-neutral-slate mt-1 break-words">
                        {step.subtitle}
                      </div>

                      {(step.requestId || step.correlationId) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono font-semibold">
                          {step.requestId && (
                            <span className="px-2 py-0.5 rounded bg-sky-light text-primary border border-sky">
                              req: {step.requestId}
                            </span>
                          )}
                          {step.correlationId && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              corr: {step.correlationId}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <JsonInspectorDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}

export default function DevTracerPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs font-mono text-neutral-slate">
          Memuat Pelacak End-to-End...
        </div>
      }
    >
      <DevTracerContent />
    </Suspense>
  );
}
