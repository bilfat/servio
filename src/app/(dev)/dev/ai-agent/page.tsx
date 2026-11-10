"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkle,
  ChartBar,
  Key,
  DownloadSimple,
  MagnifyingGlass,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  GitBranch,
  CheckCircle,
  Warning,
  XCircle,
  Eye,
  EyeSlash,
  Trash,
  ArrowSquareOut,
  X,
  Database,
  Clock,
  ShieldCheck,
  Cpu,
} from "@phosphor-icons/react";
import { useDevAutoRefresh } from "@/components/dev/DevAutoRefreshContext";
import { formatWibTime, formatRelativeTime } from "@/components/dev/devFormatters";
import type {
  AiMonitoringKpis,
  AiProviderMode,
  AiRuntimeConfigSummary,
  AiSessionDetail,
  AiSessionSummary,
  GeminiModelOption,
} from "@/lib/aiDiagnosis/types";

type ActiveTab = "monitor" | "config";

export default function DevAiAgentPage() {
  const { refreshTick } = useDevAutoRefresh();

  const [activeTab, setActiveTab] = useState<ActiveTab>("monitor");
  const [config, setConfig] = useState<AiRuntimeConfigSummary | null>(null);
  const [kpis, setKpis] = useState<AiMonitoringKpis>({
    totalSessions: 0,
    totalTurns: 0,
    feedbackUpCount: 0,
    feedbackDownCount: 0,
    conversionCount: 0,
    mediaSessionCount: 0,
    avgLatencyMs: null,
  });
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [feedbackFilter, setFeedbackFilter] = useState("ALL");
  const [mediaFilter, setMediaFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

  // Detail Slide-over Drawer
  const [selectedDetail, setSelectedDetail] = useState<AiSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Config Tab Form States
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);
  const [modelInput, setModelInput] = useState<GeminiModelOption>("gemini-3.8-flash");
  const [providerModeInput, setProviderModeInput] = useState<AiProviderMode>("GEMINI");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [configAlert, setConfigAlert] = useState<{
    tone: "emerald" | "rose" | "amber";
    message: string;
  } | null>(null);

  const loadMonitorData = useCallback(async () => {
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (feedbackFilter !== "ALL") sp.set("feedback", feedbackFilter);
      if (mediaFilter !== "ALL") sp.set("hasMedia", mediaFilter);
      if (providerFilter !== "ALL") sp.set("provider", providerFilter);

      const res = await fetch(`/api/dev/ai/sessions?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.kpis) setKpis(json.kpis);
      if (Array.isArray(json.sessions)) setSessions(json.sessions);
      if (json.config) {
        setConfig(json.config);
        setModelInput(json.config.model || "gemini-3.8-flash");
        setProviderModeInput(json.config.providerMode || "GEMINI");
        setCustomUrlInput(json.config.customAgentUrl || "");
      }
    } finally {
      setLoadingMonitor(false);
    }
  }, [q, feedbackFilter, mediaFilter, providerFilter]);

  useEffect(() => {
    loadMonitorData();
  }, [loadMonitorData, refreshTick]);

  const openSessionInspector = async (sessionId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/dev/ai/sessions?sessionId=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.detail) setSelectedDetail(json.detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveConfig = async (withTest: boolean) => {
    setSavingConfig(true);
    setConfigAlert(null);
    try {
      const res = await fetch("/api/dev/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: withTest ? "SAVE_AND_TEST" : "SAVE",
          apiKey: apiKeyInput.trim() || undefined,
          model: modelInput,
          providerMode: providerModeInput,
          customAgentUrl: customUrlInput.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal menyimpan konfigurasi ke RAM server.");
      }

      setConfig(json.config);
      if (apiKeyInput.trim()) {
        setApiKeyInput("");
        setShowKeyText(false);
      }

      if (withTest && json.testResult) {
        setConfigAlert({
          tone: json.testResult.ok ? "emerald" : "rose",
          message: json.testResult.message,
        });
      } else {
        setConfigAlert({
          tone: "emerald",
          message: "Konfigurasi berhasil disimpan di RAM Server Next.js (aman & tidak masuk database).",
        });
      }
    } catch (err: unknown) {
      setConfigAlert({
        tone: "rose",
        message: err instanceof Error ? err.message : "Gagal memperbarui konfigurasi.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestOnly = async () => {
    setTestingKey(true);
    setConfigAlert(null);
    try {
      const res = await fetch("/api/dev/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST",
          apiKey: apiKeyInput.trim() || undefined,
          model: modelInput,
        }),
      });
      const json = await res.json();
      if (json.config) setConfig(json.config);
      if (json.testResult) {
        setConfigAlert({
          tone: json.testResult.ok ? "emerald" : "rose",
          message: json.testResult.message,
        });
      }
    } catch (err: unknown) {
      setConfigAlert({
        tone: "rose",
        message: err instanceof Error ? err.message : "Gagal mengetes koneksi Gemini.",
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleClearRamKey = async () => {
    setSavingConfig(true);
    setConfigAlert(null);
    try {
      const res = await fetch("/api/dev/ai/config", { method: "DELETE" });
      const json = await res.json();
      if (json.config) setConfig(json.config);
      setApiKeyInput("");
      setConfigAlert({
        tone: "amber",
        message:
          "Gemini API Key dihapus dari RAM Server. Sistem akan memakai fallback .env.local jika tersedia.",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const statusTone = config?.keyConfigured
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display text-neutral-dark tracking-tight">
            AI Diagnosa &amp; Gemini Control Room
          </h1>
          <p className="text-xs text-neutral-slate mt-1">
            Pantau seluruh hasil diagnosa pelanggan (chat, foto, video frame), kumpulkan dataset ke{" "}
            <span className="font-mono font-semibold text-primary bg-sky-light px-1.5 py-0.5 rounded">
              servio_ai_db
            </span>
            , dan atur API Key Gemini secara aman di RAM Server.
          </p>
        </div>

        <Link
          href="/smart-discovery"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-soft text-primary border border-neutral-border text-xs font-semibold shadow-2xs self-start"
        >
          <span>Buka Diagnosa AI Pelanggan</span>
          <ArrowSquareOut size={14} weight="bold" />
        </Link>
      </div>

      {/* Global AI Status Banner */}
      <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold border ${statusTone}`}
          >
            {config?.keyConfigured ? (
              <CheckCircle size={14} weight="fill" />
            ) : (
              <Warning size={14} weight="fill" />
            )}
            <span>
              {config?.keySource === "RAM"
                ? "GEMINI KEY AKTIF (RAM SERVER)"
                : config?.keySource === "ENV"
                  ? "GEMINI KEY AKTIF (.ENV FALLBACK)"
                  : "GEMINI KEY BELUM DISET (FALLBACK KATALOG)"}
            </span>
          </span>

          <span className="px-2.5 py-1 rounded-lg bg-sky-light text-primary border border-sky font-mono font-semibold">
            Mode: {config?.providerMode || "GEMINI"} ({config?.model || "gemini-3.8-flash"})
          </span>

          {config?.maskedKey && (
            <span className="px-2.5 py-1 rounded-lg bg-neutral-soft text-neutral-dark border border-neutral-border font-mono">
              Preview: {config.maskedKey}
            </span>
          )}
        </div>

        {/* 2-Tab Switcher */}
        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-soft border border-neutral-border self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("monitor")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "monitor"
                ? "bg-white text-primary shadow-2xs"
                : "text-neutral-slate hover:text-neutral-dark"
            }`}
          >
            <ChartBar size={15} weight={activeTab === "monitor" ? "fill" : "regular"} />
            <span>Monitor Hasil &amp; Dataset</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "config"
                ? "bg-white text-primary shadow-2xs"
                : "text-neutral-slate hover:text-neutral-dark"
            }`}
          >
            <Key size={15} weight={activeTab === "config" ? "fill" : "regular"} />
            <span>Konfigurasi API Gemini</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MONITOR & TRAINING DATASET */}
      {activeTab === "monitor" && (
        <div className="space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-slate">Total Sesi Diagnosa</span>
                <span className="w-8 h-8 rounded-lg bg-sky-light text-primary flex items-center justify-center">
                  <Sparkle size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-neutral-dark">
                  {kpis.totalSessions}
                </span>
                <span className="text-xs text-neutral-slate">
                  ({kpis.totalTurns} pesan user)
                </span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-slate">
                Tersimpan permanen di <span className="font-mono">servio_ai_db</span>
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-slate">Rating Kualitas AI</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ThumbsUp size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-3 font-mono">
                <span className="text-2xl font-bold text-emerald-700">
                  +{kpis.feedbackUpCount}
                </span>
                <span className="text-sm font-bold text-rose-600">
                  -{kpis.feedbackDownCount}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-slate">
                Label 👍/👎 untuk kurasi training SFT
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-slate">Konversi Rekomendasi DB</span>
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Database size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-neutral-dark">
                  {kpis.conversionCount}
                </span>
                <span className="text-xs text-neutral-slate">sesi klik jasa/produk</span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-slate">
                Pelanggan menekan Pesan Jasa / Lihat Produk
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-slate">Sesi Bermedia &amp; Latensi</span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-neutral-dark">
                  {kpis.mediaSessionCount}
                </span>
                <span className="text-xs font-mono text-neutral-slate">
                  {kpis.avgLatencyMs != null ? `avg ${kpis.avgLatencyMs}ms` : "avg -"}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-neutral-slate">
                Melampirkan foto / keyframe video
              </div>
            </div>
          </div>

          {/* Filter + Export Toolbar */}
          <div className="bg-white border border-neutral-border rounded-2xl p-4 shadow-servio-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
                Cari Keluhan / Kategori / Session / Request-ID
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
                  placeholder="AC tidak dingin, Freon, diag-..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
                Rating Pelanggan
              </label>
              <select
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
              >
                <option value="ALL">Semua Rating</option>
                <option value="UP">👍 Membantu (UP)</option>
                <option value="DOWN">👎 Kurang Tepat (DOWN)</option>
                <option value="NONE">Belum Ada Rating</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
                Lampiran Visual
              </label>
              <select
                value={mediaFilter}
                onChange={(e) => setMediaFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
              >
                <option value="ALL">Semua Sesi</option>
                <option value="YES">Dengan Foto/Video</option>
                <option value="NO">Teks Saja</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-slate mb-1">
                Otak AI
              </label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
              >
                <option value="ALL">Semua Engine</option>
                <option value="GEMINI">GEMINI</option>
                <option value="RULE_FALLBACK">RULE_FALLBACK</option>
                <option value="CUSTOM_AGENT">CUSTOM_AGENT</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <a
                href={`/api/dev/ai/export?feedback=${encodeURIComponent(feedbackFilter)}`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-servio-sm transition-colors"
              >
                <DownloadSimple size={15} weight="bold" />
                <span>Export .JSONL</span>
              </a>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-servio-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-border bg-neutral-subtle text-[10px] font-semibold uppercase tracking-wider text-neutral-slate">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Ringkasan Keluhan &amp; Kategori</th>
                    <th className="py-3 px-4">Media</th>
                    <th className="py-3 px-4">Engine &amp; Latensi</th>
                    <th className="py-3 px-4">Feedback &amp; Konversi</th>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4 text-right">Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border text-xs">
                  {loadingMonitor && sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-neutral-slate font-mono">
                        Memuat log sesi Diagnosa AI dari servio_ai_db...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-neutral-slate">
                        Belum ada sesi Diagnosa AI tercatat. Uji coba fitur di{" "}
                        <Link href="/smart-discovery" className="text-primary font-semibold underline">
                          /smart-discovery
                        </Link>
                        .
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => openSessionInspector(s.id)}
                        className="hover:bg-sky-light/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 whitespace-nowrap align-top">
                          <div className="font-mono text-[11px] text-neutral-dark font-semibold">
                            {formatRelativeTime(s.updatedAt)}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-slate">
                            {formatWibTime(s.updatedAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4 align-top max-w-[320px]">
                          <div className="font-semibold text-neutral-dark line-clamp-2 break-words">
                            {s.problemSummary || "(Tanpa teks keluhan)"}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-light text-primary border border-sky">
                              {s.deviceCategory || "Umum"}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-slate">
                              {s.turnCount} turn
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap align-top">
                          {s.mediaCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] font-bold">
                              <ImageIcon size={12} weight="fill" />
                              <span>{s.mediaCount} file</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-muted">Teks</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap align-top font-mono">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              s.aiProvider === "GEMINI"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : s.aiProvider === "CUSTOM_AGENT"
                                  ? "bg-sky-light text-primary border-sky"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {s.aiProvider}
                          </span>
                          <div className="text-[10px] text-neutral-slate mt-1">
                            {s.modelName} {s.avgLatencyMs ? `· ${s.avgLatencyMs}ms` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap align-top">
                          <div className="flex flex-col gap-1">
                            {s.userFeedback === "UP" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <ThumbsUp size={12} weight="fill" /> Membantu
                              </span>
                            ) : s.userFeedback === "DOWN" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                <ThumbsDown size={12} weight="fill" /> Kurang Tepat
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-muted">Belum dirating</span>
                            )}

                            {(s.selectedServiceId || s.selectedProductId) && (
                              <span className="text-[10px] font-mono text-primary font-semibold">
                                ✓ Klik {s.selectedServiceId ? "Jasa" : "Produk"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td
                          className="py-3 px-4 whitespace-nowrap align-top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.requestId ? (
                            <Link
                              href={`/dev/tracer?q=${encodeURIComponent(s.requestId)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-light hover:bg-sky text-primary border border-sky font-mono text-[10px] font-semibold"
                            >
                              <GitBranch size={11} />
                              <span>{s.requestId.slice(0, 16)}</span>
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
                              openSessionInspector(s.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-[11px] font-semibold cursor-pointer"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KONFIGURASI GEMINI API & ROUTING OTAK */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Form */}
          <div className="lg:col-span-7 bg-white border border-neutral-border rounded-2xl p-5 sm:p-6 shadow-servio-sm space-y-5">
            <div className="p-3.5 rounded-xl bg-sky-light/80 border border-sky text-xs text-primary flex items-start gap-2.5">
              <ShieldCheck size={18} weight="fill" className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Keamanan API Key Terisolasi (Server RAM Only)
                </div>
                <p className="text-neutral-dark/85 leading-relaxed">
                  API Key Gemini yang dimasukkan di sini disimpan <strong>hanya di RAM Server Next.js (`globalThis`)</strong>{" "}
                  dengan fallback opsional <code className="font-mono">GEMINI_API_KEY</code> di{" "}
                  <code className="font-mono">.env.local</code>. Key <strong>tidak pernah disimpan ke MySQL</strong>,{" "}
                  <strong>tidak dikirim ke backend Laravel</strong>, dan <strong>tidak pernah dikirim ulang utuh ke browser</strong>.
                </p>
              </div>
            </div>

            {configAlert && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                  configAlert.tone === "emerald"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : configAlert.tone === "amber"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {configAlert.tone === "emerald" ? (
                  <CheckCircle size={17} weight="fill" className="shrink-0 mt-0.5" />
                ) : configAlert.tone === "amber" ? (
                  <Warning size={17} weight="fill" className="shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={17} weight="fill" className="shrink-0 mt-0.5" />
                )}
                <span>{configAlert.message}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Routing Mode */}
              <div>
                <label className="block text-xs font-bold text-neutral-dark mb-1.5">
                  Mode Otak AI Aktif
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setProviderModeInput("GEMINI")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      providerModeInput === "GEMINI"
                        ? "border-primary bg-sky-light/60 ring-1 ring-primary"
                        : "border-neutral-border bg-neutral-subtle hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                      <Sparkle size={15} weight="fill" className="text-primary" />
                      <span>Google Gemini (Transisi)</span>
                    </div>
                    <p className="text-[11px] text-neutral-slate mt-1">
                      Multimodal teks, foto &amp; video keyframe + tool calling katalog SERVIO.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProviderModeInput("CUSTOM_AGENT")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      providerModeInput === "CUSTOM_AGENT"
                        ? "border-primary bg-sky-light/60 ring-1 ring-primary"
                        : "border-neutral-border bg-neutral-subtle hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                      <Cpu size={15} weight="fill" className="text-primary" />
                      <span>Custom AI Agent (Masa Depan)</span>
                    </div>
                    <p className="text-[11px] text-neutral-slate mt-1">
                      Alihkan trafik ke endpoint otak AI mandiri tanpa mengubah UI pelanggan.
                    </p>
                  </button>
                </div>
              </div>

              {/* Gemini Model */}
              <div>
                <label className="block text-xs font-bold text-neutral-dark mb-1">
                  Model Gemini
                </label>
                <select
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value as GeminiModelOption)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                >
                  <option value="gemini-3.8-flash">
                    gemini-3.8-flash (Direkomendasikan Google — Cepat, Agentic &amp; Multimodal)
                  </option>
                  <option value="gemini-flash-latest">
                    gemini-flash-latest (Auto-update ke rilis Flash stabil terbaru)
                  </option>
                  <option value="gemini-3.7-flash">
                    gemini-3.7-flash (Versi stabil sebelumnya)
                  </option>
                  <option value="gemini-2.5-flash">
                    gemini-2.5-flash (Legacy — Hanya untuk key API lama)
                  </option>
                  <option value="gemini-2.5-pro">
                    gemini-2.5-pro (Analisis teknis kompleks lebih mendalam)
                  </option>
                </select>
              </div>

              {/* Gemini API Key Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-dark">
                    Gemini API Key (Disimpan di RAM Server)
                  </label>
                  {config?.maskedKey && (
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                      Terpasang: {config.maskedKey}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKeyText ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    autoComplete="off"
                    placeholder={
                      config?.keyConfigured
                        ? "Kosongkan bila tetap memakai key aktif saat ini, atau tempel key baru..."
                        : "Tempel Google Gemini API Key Anda di sini (AIza...)"
                    }
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyText((v) => !v)}
                    aria-label={showKeyText ? "Sembunyikan API key" : "Tampilkan API key"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-slate hover:text-neutral-dark cursor-pointer"
                  >
                    {showKeyText ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Custom Agent URL (Optional) */}
              <div>
                <label className="block text-xs font-bold text-neutral-dark mb-1">
                  Endpoint Custom AI Agent (Opsional — untuk transisi nanti)
                </label>
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:8009/api/v1/diagnose"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-xs font-mono text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingConfig || testingKey}
                  onClick={() => handleSaveConfig(true)}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-servio-sm disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {savingConfig ? "Menyimpan..." : "Simpan ke RAM & Test Koneksi"}
                </button>

                <button
                  type="button"
                  disabled={savingConfig || testingKey}
                  onClick={() => handleSaveConfig(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Simpan Tanpa Test
                </button>

                <button
                  type="button"
                  disabled={savingConfig || testingKey}
                  onClick={handleTestOnly}
                  className="px-3.5 py-2.5 rounded-xl bg-sky-light hover:bg-sky text-primary border border-sky text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {testingKey ? "Menguji..." : "Test Koneksi Aktif"}
                </button>

                {config?.keySource === "RAM" && (
                  <button
                    type="button"
                    disabled={savingConfig}
                    onClick={handleClearRamKey}
                    className="ml-auto inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                  >
                    <Trash size={14} />
                    <span>Hapus Key dari RAM</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Info / Runtime Diagnostics */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-neutral-border rounded-2xl p-5 shadow-servio-sm space-y-3">
              <h2 className="text-sm font-bold font-display text-neutral-dark">
                Status Runtime Server Saat Ini
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-neutral-border">
                  <span className="text-neutral-slate">Sumber API Key</span>
                  <span className="font-mono font-bold text-neutral-dark">
                    {config?.keySource || "NONE"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-border">
                  <span className="text-neutral-slate">Key Tersamar</span>
                  <span className="font-mono text-neutral-dark">
                    {config?.maskedKey || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-border">
                  <span className="text-neutral-slate">Model Aktif</span>
                  <span className="font-mono text-primary font-semibold">
                    {config?.model || "gemini-3.8-flash"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-border">
                  <span className="text-neutral-slate">Diperbarui Oleh</span>
                  <span className="font-mono text-neutral-dark">
                    {config?.updatedBy || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-neutral-slate">Hasil Uji Terakhir</span>
                  <span
                    className={`font-mono font-semibold ${
                      config?.lastTestStatus?.ok
                        ? "text-emerald-700"
                        : config?.lastTestStatus
                          ? "text-rose-600"
                          : "text-neutral-muted"
                    }`}
                  >
                    {config?.lastTestStatus
                      ? `${config.lastTestStatus.ok ? "OK" : "FAIL"} (${config.lastTestStatus.latencyMs}ms)`
                      : "Belum diuji"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-neutral-border rounded-2xl p-5 shadow-servio-sm space-y-2.5">
              <h3 className="text-sm font-bold font-display text-neutral-dark">
                Arsitektur Pengumpul Dataset Training
              </h3>
              <ul className="space-y-1.5 text-xs text-neutral-slate list-disc pl-4 leading-relaxed">
                <li>
                  Setiap chat pelanggan, foto, dan <strong>4 keyframe video otomatis</strong> disimpan oleh Next.js ke{" "}
                  <code className="font-mono text-neutral-dark">storage/ai-media/</code> dan dicatat di MySQL{" "}
                  <code className="font-mono text-neutral-dark">servio_ai_db</code>.
                </li>
                <li>
                  Query tool ke katalog jasa (<code className="font-mono">:8004</code>) dan produk (<code className="font-mono">:8003</code>) ikut tercatat di{" "}
                  <code className="font-mono text-neutral-dark">tool_calls_json</code> sebagai contoh function-calling AI Agent.
                </li>
                <li>
                  Gunakan tombol <strong>Export .JSONL</strong> di Tab Monitor untuk melatih/fine-tuning model AI Agent kustom Anda.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SESSION DETAIL INSPECTOR DRAWER */}
      {(selectedDetail || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-dark/45 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => !loadingDetail && setSelectedDetail(null)}
          />
          <aside className="relative z-10 w-full max-w-2xl bg-white border-l border-neutral-border h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-neutral-border flex items-start justify-between gap-4 bg-neutral-subtle">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-light text-primary border border-sky">
                    {selectedDetail?.session.deviceCategory || "Diagnosa"}
                  </span>
                  {selectedDetail?.session.userFeedback && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        selectedDetail.session.userFeedback === "UP"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      Rating: {selectedDetail.session.userFeedback}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold font-display text-neutral-dark break-words">
                  Sesi {selectedDetail?.session.id || "..."}
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5 line-clamp-2">
                  {selectedDetail?.session.problemSummary}
                </p>
                {selectedDetail?.session.requestId && (
                  <div className="mt-2">
                    <Link
                      href={`/dev/tracer?q=${encodeURIComponent(selectedDetail.session.requestId)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-dark text-white text-[11px] font-semibold"
                    >
                      <GitBranch size={13} />
                      <span>Trace {selectedDetail.session.requestId}</span>
                    </Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Tutup detail"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-lg text-neutral-slate hover:text-neutral-dark hover:bg-neutral-soft cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-10 text-center text-xs font-mono text-neutral-slate">
                Memuat transkrip &amp; media diagnosa...
              </div>
            ) : selectedDetail ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Metadata Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-subtle border border-neutral-border">
                    <div className="text-[10px] text-neutral-slate uppercase font-semibold">Engine</div>
                    <div className="font-mono font-bold text-neutral-dark mt-0.5">
                      {selectedDetail.session.aiProvider}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-subtle border border-neutral-border">
                    <div className="text-[10px] text-neutral-slate uppercase font-semibold">Model</div>
                    <div className="font-mono text-primary mt-0.5 truncate">
                      {selectedDetail.session.modelName}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-subtle border border-neutral-border">
                    <div className="text-[10px] text-neutral-slate uppercase font-semibold">Avg Latensi</div>
                    <div className="font-mono font-bold text-neutral-dark mt-0.5">
                      {selectedDetail.session.avgLatencyMs ?? "-"} ms
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-subtle border border-neutral-border">
                    <div className="text-[10px] text-neutral-slate uppercase font-semibold">Konversi Klik</div>
                    <div className="font-mono text-neutral-dark mt-0.5 truncate">
                      {selectedDetail.session.selectedServiceId
                        ? "Order Jasa"
                        : selectedDetail.session.selectedProductId
                          ? "Lihat Produk"
                          : "Belum ada"}
                    </div>
                  </div>
                </div>

                {/* Multi-turn Transcript */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-slate">
                    Riwayat Percakapan Multi-Turn &amp; Tool Calls DB
                  </h4>

                  {selectedDetail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-2xl p-4 border space-y-3 ${
                        m.sender === "USER"
                          ? "bg-sky-light/50 border-sky"
                          : "bg-white border-neutral-border shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded ${
                            m.sender === "USER"
                              ? "bg-primary text-white"
                              : "bg-neutral-dark text-white"
                          }`}
                        >
                          {m.sender}
                        </span>
                        <span className="font-mono text-neutral-slate">
                          {formatWibTime(m.createdAt)}
                          {m.latencyMs ? ` · ${m.latencyMs}ms` : ""}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-dark whitespace-pre-wrap leading-relaxed">
                        {m.contentText}
                      </p>

                      {/* Media Attachments */}
                      {m.media.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {m.media.map((md) => (
                            <a
                              key={md.id}
                              href={md.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-border bg-neutral-soft"
                            >
                              <img
                                src={md.url}
                                alt={md.mediaType}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono text-white text-center py-0.5">
                                {md.mediaType === "VIDEO_KEYFRAME"
                                  ? `Frame ${md.frameTimestampSec ?? 0}s`
                                  : "Foto"}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Structured Summary Preview */}
                      {m.structuredResponse && (
                        <div className="text-[11px] space-y-2 pt-2 border-t border-neutral-border">
                          {m.structuredResponse.clarifyingQuestion && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                              <strong>Tanya Balik:</strong> {m.structuredResponse.clarifyingQuestion}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-neutral-soft font-mono">
                              Jasa Direkomendasikan:{" "}
                              {m.structuredResponse.recommendedServices.length}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-neutral-soft font-mono">
                              Produk Direkomendasikan:{" "}
                              {m.structuredResponse.recommendedProducts.length}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Tool Calls DB JSON */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate mb-1">
                            DB Catalog Tool Calls ({m.toolCalls.length})
                          </div>
                          <pre className="p-3 rounded-xl bg-neutral-dark text-sky text-[10px] font-mono whitespace-pre-wrap break-all overflow-x-auto">
                            {JSON.stringify(m.toolCalls, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
