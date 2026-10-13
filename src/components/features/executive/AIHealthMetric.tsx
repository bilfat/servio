"use client";

import React from "react";
import { Sparkle, CheckCircle, WarningCircle, Clock, ShieldCheck } from "@phosphor-icons/react";
import { AISmartDiscoveryTelemetry } from "@/types/domain";

interface AIHealthMetricProps {
  telemetry: AISmartDiscoveryTelemetry;
}

export function AIHealthMetric({ telemetry }: AIHealthMetricProps) {
  return (
    <div className="space-y-4">
      {/* 4 Telemetry Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-servio-xs">
          <div className="flex items-center justify-between text-xs text-neutral-slate font-bold mb-1 uppercase tracking-wider font-display">
            <span>Sesi Diagnosa AI</span>
            <Sparkle size={16} className="text-secondary" weight="fill" />
          </div>
          <p className="text-2xl font-bold text-neutral-dark font-display">
            {telemetry.totalDiscoverySessions.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-neutral-muted mt-0.5">Sesi interaksi pelanggan</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-servio-xs">
          <div className="flex items-center justify-between text-xs text-neutral-slate font-bold mb-1 uppercase tracking-wider font-display">
            <span>Acceptance Rate</span>
            <CheckCircle size={16} className="text-emerald-600" weight="fill" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-display">
            {telemetry.recommendationAcceptanceRate}%
          </p>
          <p className="text-[11px] text-neutral-muted mt-0.5">Rekomendasi diterima user</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-servio-xs">
          <div className="flex items-center justify-between text-xs text-neutral-slate font-bold mb-1 uppercase tracking-wider font-display">
            <span>Avg Latency</span>
            <Clock size={16} className="text-primary" weight="bold" />
          </div>
          <p className="text-2xl font-bold text-neutral-dark font-display">{telemetry.averageLatencyMs} ms</p>
          <p className="text-[11px] text-neutral-muted mt-0.5">Responsivitas inferensi</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-servio-xs">
          <div className="flex items-center justify-between text-xs text-neutral-slate font-bold mb-1 uppercase tracking-wider font-display">
            <span>Rule Fallback Rate</span>
            <ShieldCheck size={16} className="text-amber-600" weight="fill" />
          </div>
          <p className="text-2xl font-bold text-amber-700 font-display">{telemetry.ruleFallbackRate}%</p>
          <p className="text-[11px] text-neutral-muted mt-0.5">Intervensi aturan deterministik</p>
        </div>
      </div>

      {/* Architecture Transparency Visualizer */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-servio-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold text-neutral-dark font-display">
              Pipeline Arsitektur Smart Discovery & Guardrails
            </h4>
            <p className="text-xs text-neutral-slate mt-0.5">
              Authoritative single-source-of-truth grounding (LLM bukan basis data otoritatif)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistem Beroperasi Normal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {telemetry.architectureLayers.map((layer, idx) => (
            <div
              key={layer.name}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-neutral-muted uppercase tracking-wider">
                  Layer 0{idx + 1}
                </span>
                <span className="text-[10px] font-mono font-semibold text-neutral-slate">
                  {layer.latencyMs}ms
                </span>
              </div>
              <p className="text-xs font-bold text-neutral-dark font-display">{layer.name}</p>
              <p className="text-[11px] text-neutral-slate leading-relaxed">{layer.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
