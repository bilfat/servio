"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Copy, CheckCircle, GitBranch, Code } from "@phosphor-icons/react";

export interface InspectorDrawerItem {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeTone?: "emerald" | "amber" | "rose" | "sky" | "slate";
  requestId?: string | null;
  correlationId?: string | null;
  traceQuery?: string | null;
  metaPairs?: Array<{ label: string; value: string | number | null | undefined }>;
  stackTrace?: string | null;
  jsonPayload?: unknown;
}

export function JsonInspectorDrawer({
  item,
  onClose,
}: {
  item: InspectorDrawerItem | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const badgeToneClass = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-light text-primary border-sky",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  }[item.badgeTone || "slate"];

  const traceTarget = item.traceQuery || item.requestId || item.correlationId;

  const buildReportText = () => {
    const lines = [
      `=== SERVIO DEV DEBUG REPORT ===`,
      `Title: ${item.title}`,
      item.subtitle ? `Subtitle: ${item.subtitle}` : null,
      item.requestId ? `X-Request-ID: ${item.requestId}` : null,
      item.correlationId ? `Correlation-ID: ${item.correlationId}` : null,
      ...(item.metaPairs || []).map((m) => `${m.label}: ${m.value ?? "-"}`),
      item.stackTrace ? `\n--- STACK TRACE / RAW LOG ---\n${item.stackTrace}` : null,
      item.jsonPayload !== undefined && item.jsonPayload !== null
        ? `\n--- JSON PAYLOAD ---\n${JSON.stringify(item.jsonPayload, null, 2)}`
        : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-dark/45 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />
      <aside className="relative z-10 w-full max-w-2xl bg-white border-l border-neutral-border h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-border flex items-start justify-between gap-4 bg-neutral-subtle">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {item.badgeText && (
                <span className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded border ${badgeToneClass}`}>
                  {item.badgeText}
                </span>
              )}
              {item.requestId && (
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-sky-light text-primary border border-sky">
                  {item.requestId}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold font-display text-neutral-dark break-words">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-xs text-neutral-slate mt-1 break-words">{item.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-slate hover:text-neutral-dark hover:bg-neutral-soft transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 border-b border-neutral-border bg-white flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-subtle hover:bg-neutral-soft text-neutral-dark border border-neutral-border transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Tersalin!" : "Salin Debug Report"}</span>
            </button>
            {traceTarget && (
              <Link
                href={`/dev/tracer?q=${encodeURIComponent(traceTarget)}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-dark text-white transition-colors"
              >
                <GitBranch size={14} />
                <span>Lacak di End-to-End Tracer</span>
              </Link>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {item.metaPairs && item.metaPairs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {item.metaPairs.map((pair, idx) => (
                <div
                  key={`${pair.label}-${idx}`}
                  className="bg-neutral-subtle border border-neutral-border rounded-xl px-3.5 py-2.5"
                >
                  <div className="text-[10px] uppercase tracking-wider text-neutral-slate font-semibold">
                    {pair.label}
                  </div>
                  <div className="text-xs font-mono text-neutral-dark mt-1 break-all">
                    {pair.value !== null && pair.value !== undefined && String(pair.value) !== ""
                      ? String(pair.value)
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {item.stackTrace && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-dark mb-2">
                <Code size={14} className="text-rose-600" />
                <span>Stack Trace / Raw Log Output</span>
              </div>
              <pre className="p-4 rounded-xl bg-neutral-dark border border-slate-800 text-[11px] font-mono text-rose-200 whitespace-pre-wrap break-all overflow-x-auto leading-relaxed max-h-96">
                {item.stackTrace}
              </pre>
            </div>
          )}

          {item.jsonPayload !== undefined && item.jsonPayload !== null && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-dark mb-2">
                <Code size={14} className="text-primary" />
                <span>Structured JSON Metadata / Payload</span>
              </div>
              <pre className="p-4 rounded-xl bg-neutral-subtle border border-neutral-border text-[11px] font-mono text-neutral-dark whitespace-pre-wrap break-all overflow-x-auto leading-relaxed">
                {typeof item.jsonPayload === "string"
                  ? item.jsonPayload
                  : JSON.stringify(item.jsonPayload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
