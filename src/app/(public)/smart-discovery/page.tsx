"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useActiveRole } from "@/context/RoleContext";
import { getRoleDashboard } from "@/lib/roleNavigation";
import {
  Sparkle,
  PaperPlaneTilt,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  PlusCircle,
  Image as ImageIcon,
  VideoCamera,
  X,
  ThumbsUp,
  ThumbsDown,
  Warning,
  Question,
  Wrench,
  Package,
  CheckCircle,
  Lightbulb,
  FilmStrip,
  LockKey,
  SignIn,
  UserPlus,
  CircleNotch,
} from "@phosphor-icons/react";
import {
  extractVideoKeyframes,
  prepareImageAttachment,
  type PreparedMediaDraft,
} from "@/lib/aiDiagnosis/videoFrameExtractor";
import type {
  AiFeedbackValue,
  AiMessageView,
  AiStructuredResponse,
} from "@/lib/aiDiagnosis/types";

const SESSION_STORAGE_KEY = "servio_ai_diagnosis_session_v1";

interface CapabilityInfo {
  providerMode: "GEMINI" | "CUSTOM_AGENT";
  model: string;
  geminiReady: boolean;
  customAgentReady: boolean;
}

const WELCOME_MESSAGE: AiMessageView = {
  id: "welcome-msg",
  sessionId: "",
  sender: "ASSISTANT",
  contentText:
    "Halo! Saya Asisten Diagnosa AI SERVIO. Ceritakan keluhan atau unggah foto/video kerusakan unit Anda. Saya akan menjelaskan kemungkinan penyebab, solusi aman awal, menawarkan jasa teknisi resmi, serta membantu mencarikan sparepart yang benar-benar cocok dari katalog SERVIO.",
  structuredResponse: null,
  toolCalls: [],
  media: [],
  aiProvider: null,
  modelName: null,
  requestId: null,
  latencyMs: null,
  userFeedback: null,
  createdAt: new Date().toISOString(),
};

export default function SmartDiscoveryPage() {
  const router = useRouter();
  const { activeRole, isAuthenticated, isPublicGuest, isLoadingAuth, user } = useActiveRole();
  const isCustomerLoggedIn = Boolean(
    !isLoadingAuth && isAuthenticated && !isPublicGuest && activeRole === "CUSTOMER"
  );

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessageView[]>([WELCOME_MESSAGE]);
  const [inputMessage, setInputMessage] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<PreparedMediaDraft[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtractingMedia, setIsExtractingMedia] = useState(false);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [capability, setCapability] = useState<CapabilityInfo | null>(null);

  const quickSymptoms = [
    "AC rumah tidak dingin dan meneteskan air dari unit indoor",
    "Kira-kira untuk AC ini sparepart yang cocok apa ya?",
    "MCB listrik sering anjlok saat kabel dipakai alat berat",
    "Ban motor bocor dan terasa oleng",
  ];

  // Scroll smoothly on new messages
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isAnalyzing]);

  // Load AI capability + persisted session from servio_ai_db on mount (khusus Pelanggan terautentikasi)
  useEffect(() => {
    if (!isCustomerLoggedIn) return;
    let active = true;

    const init = async () => {
      try {
        const capRes = await fetch("/api/ai/diagnose", { cache: "no-store" });
        if (capRes.ok && active) {
          const capJson = await capRes.json();
          if (capJson.capability) setCapability(capJson.capability);
        }
      } catch {
        // non-fatal
      }

      if (typeof window === "undefined") return;
      const savedId = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!savedId) return;

      try {
        const res = await fetch(`/api/ai/sessions/${encodeURIComponent(savedId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (json.capability) setCapability(json.capability);
        if (Array.isArray(json.messages) && json.messages.length > 0) {
          setSessionId(savedId);
          setMessages([WELCOME_MESSAGE, ...json.messages]);
        }
      } catch {
        // non-fatal
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [isCustomerLoggedIn]);

  const handleResetSession = () => {
    for (const d of draftAttachments) {
      URL.revokeObjectURL(d.previewUrl);
    }
    setDraftAttachments([]);
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setErrorBanner(null);
    setFallbackNotice(null);
    setMediaNotice(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorBanner(null);
    setIsExtractingMedia(true);
    setMediaNotice("Menyiapkan foto kerusakan...");
    try {
      const nextDrafts: PreparedMediaDraft[] = [];
      for (const file of Array.from(files)) {
        if (draftAttachments.length + nextDrafts.length >= 8) break;
        const prepared = await prepareImageAttachment(file);
        nextDrafts.push(prepared);
      }
      setDraftAttachments((prev) => [...prev, ...nextDrafts].slice(0, 8));
      setMediaNotice(`${nextDrafts.length} foto siap dikirim ke AI.`);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Gagal memproses foto.");
    } finally {
      setIsExtractingMedia(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleVideoFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const videoFile = files[0];
    setErrorBanner(null);
    setIsExtractingMedia(true);
    setMediaNotice(`Mengekstrak keyframe otomatis dari video "${videoFile.name}"...`);

    try {
      const { frames, durationSec } = await extractVideoKeyframes(videoFile, {
        maxFrames: 4,
      });
      setDraftAttachments((prev) => [...prev, ...frames].slice(0, 8));
      const durText = durationSec > 0 ? ` (${durationSec.toFixed(1)} detik)` : "";
      setMediaNotice(
        `${frames.length} keyframe video${durText} berhasil diekstrak otomatis & siap dianalisis.`
      );
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Gagal mengekstrak keyframe dari video."
      );
      setMediaNotice(null);
    } finally {
      setIsExtractingMedia(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeDraftAttachment = (id: string) => {
    setDraftAttachments((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const handleSend = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? inputMessage).trim();
      if ((!text && draftAttachments.length === 0) || isAnalyzing || isExtractingMedia) {
        return;
      }

      setErrorBanner(null);
      setMediaNotice(null);
      const outgoingAttachments = [...draftAttachments];
      const displayText =
        text || "Tolong analisis kerusakan pada foto/video yang saya lampirkan.";

      const optimisticUserMsg: AiMessageView = {
        id: `tmp-u-${Date.now()}`,
        sessionId: sessionId || "new",
        sender: "USER",
        contentText: displayText,
        structuredResponse: null,
        toolCalls: [],
        media: outgoingAttachments.map((d) => ({
          id: d.id,
          mediaType: d.mediaType,
          frameTimestampSec: d.frameTimestampSec,
          mimeType: d.file.type || "image/jpeg",
          bytes: d.file.size,
          url: d.previewUrl,
        })),
        aiProvider: null,
        modelName: null,
        requestId: null,
        latencyMs: null,
        userFeedback: null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      if (!textOverride) setInputMessage("");
      setDraftAttachments([]);
      setIsAnalyzing(true);

      try {
        const formData = new FormData();
        if (sessionId) formData.append("sessionId", sessionId);
        formData.append("message", displayText);

        if (typeof window !== "undefined") {
          try {
            const rawUser = window.localStorage.getItem("servio_user");
            if (rawUser) {
              const parsedUser = JSON.parse(rawUser) as { id?: string };
              if (parsedUser?.id) formData.append("customerUserId", parsedUser.id);
            }
          } catch {
            // ignore
          }
        }

        const meta = outgoingAttachments.map((att) => ({
          mediaType: att.mediaType,
          frameTimestampSec: att.frameTimestampSec,
        }));
        formData.append("attachmentsMeta", JSON.stringify(meta));
        for (const att of outgoingAttachments) {
          formData.append("files", att.file, att.file.name);
        }

        const res = await fetch("/api/ai/diagnose", {
          method: "POST",
          body: formData,
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal memproses diagnosa AI.");
        }

        if (json.sessionId) {
          setSessionId(json.sessionId);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(SESSION_STORAGE_KEY, json.sessionId);
          }
        }
        if (json.capability) setCapability(json.capability);
        setFallbackNotice(json.fallbackNotice || null);

        // Replace optimistic user message with persisted one & append assistant reply
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimisticUserMsg.id);
          return [...withoutOptimistic, json.userMessage, json.assistantMessage];
        });

        for (const att of outgoingAttachments) {
          URL.revokeObjectURL(att.previewUrl);
        }
      } catch (err: unknown) {
        setErrorBanner(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan menghubungi server AI Diagnosa."
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [inputMessage, draftAttachments, isAnalyzing, isExtractingMedia, sessionId]
  );

  const handleFeedback = async (
    messageId: string,
    feedback: AiFeedbackValue
  ) => {
    if (!sessionId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, userFeedback: feedback } : m))
    );
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messageId, feedback }),
      });
    } catch {
      // non-fatal
    }
  };

  const handleConversionClick = async (params: {
    targetUrl: string;
    selectedServiceId?: string;
    selectedProductId?: string;
  }) => {
    if (sessionId) {
      fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          selectedServiceId: params.selectedServiceId,
          selectedProductId: params.selectedProductId,
        }),
        keepalive: true,
      }).catch(() => {});
    }
    router.push(params.targetUrl);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-[60vh] bg-white flex flex-col items-center justify-center gap-3 py-16">
        <CircleNotch size={30} weight="bold" className="animate-spin text-primary" />
        <p className="text-xs sm:text-sm font-medium text-neutral-slate">
          Memeriksa sesi akun Pelanggan...
        </p>
      </div>
    );
  }

  if (isPublicGuest || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50/60 py-8 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-neutral-dark text-xs font-semibold shadow-2xs mb-4 transition-colors"
          >
            <ArrowLeft size={15} weight="bold" className="text-primary" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-9 shadow-servio-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-sky/70 border border-sky-200 text-primary flex items-center justify-center">
              <LockKey size={32} weight="duotone" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-secondary text-[11px] font-bold uppercase tracking-wider">
              <Sparkle size={13} weight="fill" />
              <span>Fitur Khusus Pelanggan Login</span>
            </span>

            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark leading-tight">
              Masuk Sebagai Pelanggan untuk Diagnosa AI Penuh
            </h1>

            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed max-w-lg">
              Layanan konsultasi lengkap <strong>Smart Discovery AI Servio</strong> (termasuk unggah foto &amp; video kerusakan, analisis mendalam, serta penyimpanan riwayat diagnosa) hanya dapat diakses oleh Pelanggan yang sudah login.
            </p>
          </div>

          {/* 3 Ringkasan Keuntungan Akun Pelanggan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <ImageIcon size={16} weight="duotone" />
                <span>Foto &amp; Video</span>
              </div>
              <p className="text-[11px] text-neutral-slate leading-snug">
                Unggah foto atau video kerusakan unit untuk ekstrak frame otomatis.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Wrench size={16} weight="duotone" />
                <span>Teknisi Tepat</span>
              </div>
              <p className="text-[11px] text-neutral-slate leading-snug">
                Rekomendasi layanan resmi &amp; suku cadang kompatibel langsung dari katalog.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
                <ShieldCheck size={16} weight="duotone" />
                <span>Riwayat Tersimpan</span>
              </div>
              <p className="text-[11px] text-neutral-slate leading-snug">
                Hasil konsultasi tetap tersimpan di akun Anda untuk pemesanan kapan saja.
              </p>
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/login?returnUrl=/smart-discovery"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-servio-xs transition-colors"
            >
              <SignIn size={17} weight="bold" />
              <span>Masuk Akun Pelanggan</span>
            </Link>
            <Link
              href="/auth/register?type=customer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
            >
              <UserPlus size={17} weight="bold" />
              <span>Daftar Pelanggan Gratis</span>
            </Link>
          </div>

          {/* Link balik ke simulasi Beranda */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <Link
              href="/#uji-diagnosa-ai"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <span>Atau coba simulasi cepat Diagnosa AI di Beranda</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (activeRole !== "CUSTOMER") {
    return (
      <div className="min-h-screen bg-slate-50/60 py-10 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-neutral-dark text-xs font-semibold shadow-2xs mb-4 transition-colors"
          >
            <ArrowLeft size={15} weight="bold" className="text-primary" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="rounded-3xl bg-white border border-slate-200/90 p-7 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center mx-auto">
            <ShieldCheck size={24} weight="duotone" />
          </div>
          <h1 className="text-xl font-display font-extrabold text-neutral-dark">
            Diagnosa AI Diperuntukkan bagi Akun Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
            Saat ini Anda sedang masuk dengan peran <strong>{activeRole.replace(/_/g, " ")}</strong>. Konsultasi Smart Discovery AI disediakan khusus untuk akun Pelanggan yang memesan jasa atau suku cadang.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Link
              href={getRoleDashboard(activeRole)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-colors"
            >
              <span>Kembali ke Dashboard Anda</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-neutral-dark transition-colors"
            >
              <span>Lihat Beranda</span>
            </Link>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/60 overflow-hidden">
      {/* 1. Header Bar: Tombol Back, Identitas AI Engine, & Tombol Konsultasi Baru */}
      <header className="h-14 sm:h-16 px-3.5 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        {/* Sisi Kiri: Tombol Back ke Beranda & Judul Diagnosa */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <Link
            href="/"
            title="Kembali ke Beranda SERVIO"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-100/90 text-neutral-dark text-xs font-semibold shadow-2xs transition-all cursor-pointer group"
          >
            <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform text-primary" />
            <span className="hidden sm:inline">Kembali</span>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-white shadow-2xs shrink-0">
              <Sparkle size={18} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold font-display text-neutral-dark leading-tight">
                  Smart Discovery AI
                </h1>
                <span
                  className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    capability?.geminiReady || capability?.customAgentReady
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      capability?.geminiReady || capability?.customAgentReady
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <span>
                    {capability?.providerMode === "CUSTOM_AGENT" && capability.customAgentReady
                      ? "Custom AI Agent"
                      : capability?.geminiReady
                        ? `Gemini (${capability.model})`
                        : "Mode Katalog Cerdas"}
                  </span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-slate leading-tight hidden sm:block">
                Konsultasi gejala, estimasi perbaikan teknisi &amp; sparepart resmi SERVIO
              </p>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Konsultasi Baru (Icon PlusCircle) & Akun Pelanggan */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleResetSession}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-light hover:bg-sky text-primary border border-sky/80 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle size={16} weight="bold" />
            <span className="hidden sm:inline">Konsultasi Baru</span>
            <span className="sm:hidden">Baru</span>
          </button>

          {user?.name && (
            <div className="hidden lg:flex items-center gap-2 pl-2.5 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-[11px] font-bold font-mono">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-dark leading-tight line-clamp-1 max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-neutral-slate leading-tight">Pelanggan</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. Messages Stream Viewport */}
      <div
        ref={chatScrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5 custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Status notices */}
          {fallbackNotice && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2 shadow-2xs">
              <Warning size={16} weight="fill" className="shrink-0 text-amber-600" />
              <span>{fallbackNotice}</span>
            </div>
          )}

          {errorBanner && (
            <div className="px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Warning size={16} weight="fill" className="shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="p-1 rounded hover:bg-rose-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Messages Loop */}
          {messages.map((msg) => {
            const sr: AiStructuredResponse | null = msg.structuredResponse;
            const isUser = msg.sender === "USER";

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`${
                    isUser
                      ? "max-w-lg bg-primary text-white rounded-2xl rounded-br-none shadow-servio-xs p-4"
                      : "max-w-2xl w-full bg-white text-neutral-dark rounded-2xl rounded-bl-none border border-slate-200/90 shadow-servio-xs p-4 sm:p-5"
                  } text-xs sm:text-sm leading-relaxed space-y-3.5`}
                >
                  {/* User Attached Photos / Keyframes */}
                  {msg.media && msg.media.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.media.map((m) => (
                        <div
                          key={m.id}
                          className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/25 bg-black/20 shrink-0"
                        >
                          <img
                            src={m.url}
                            alt={m.mediaType === "VIDEO_KEYFRAME" ? "Keyframe Video" : "Foto Kerusakan"}
                            className="w-full h-full object-cover"
                          />
                          {m.mediaType === "VIDEO_KEYFRAME" && (
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                              {m.frameTimestampSec != null ? `${m.frameTimestampSec.toFixed(1)}s` : "Frame"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Meta Header */}
                  {!isUser && sr && (
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200/80">
                      {sr.isGeneralChat ? (
                        <span className="text-[10px] font-semibold text-primary bg-sky-light px-2.5 py-0.5 rounded-full border border-sky/70">
                          Konsultasi &amp; Diskusi
                        </span>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-light text-primary border border-sky">
                            {sr.deviceCategory}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              sr.urgency === "HIGH"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : sr.urgency === "ROUTINE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            Urgensi: {sr.urgency}
                          </span>
                        </>
                      )}
                      {msg.modelName && (
                        <span className="text-[10px] font-mono text-neutral-slate ml-auto">
                          {msg.modelName}
                          {msg.latencyMs ? ` · ${(msg.latencyMs / 1000).toFixed(1)}s` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Text */}
                  <p className={isUser ? "text-white whitespace-pre-wrap" : "text-neutral-dark font-medium whitespace-pre-wrap"}>
                    {sr?.summary || msg.contentText}
                  </p>

                  {/* 1. Causes */}
                  {!isUser && sr && sr.causes.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                        <Warning size={15} weight="duotone" className="text-amber-600" />
                        <span>Kemungkinan Penyebab</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-neutral-slate list-disc pl-4">
                        {sr.causes.map((cause, idx) => (
                          <li key={idx} className="text-neutral-dark/90">
                            {cause}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 2. Solutions & K3 Safety */}
                  {!isUser && sr && (sr.solutions.length > 0 || sr.safetyWarning) && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                      {sr.solutions.length > 0 && (
                        <>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                            <Lightbulb size={15} weight="duotone" className="text-emerald-600" />
                            <span>Solusi &amp; Langkah Awal Aman</span>
                          </div>
                          <ol className="space-y-1.5 text-xs text-neutral-dark/90 list-decimal pl-4">
                            {sr.solutions.map((sol, idx) => (
                              <li key={idx}>{sol}</li>
                            ))}
                          </ol>
                        </>
                      )}

                      {sr.safetyWarning && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                          <Warning size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Peringatan K3:</strong> {sr.safetyWarning}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Clarifying Question & Quick Reply Chips */}
                  {!isUser && sr && sr.needsClarification && sr.clarifyingQuestion && (
                    <div className="p-3.5 rounded-xl bg-sky-light/85 border border-primary/25 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Question size={16} weight="fill" />
                        <span>Pertanyaan Konfirmasi Spesifikasi</span>
                      </div>
                      <p className="text-xs text-neutral-dark leading-relaxed">
                        {sr.clarifyingQuestion}
                      </p>
                      {sr.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {sr.quickReplies.map((qr, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              disabled={isAnalyzing}
                              onClick={() => handleSend(qr)}
                              className="px-3 py-1.5 rounded-full bg-white hover:bg-primary hover:text-white border border-primary/30 text-primary text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3b. Quick Reply Chips untuk Percakapan / Diskusi Awal */}
                  {!isUser && sr && !sr.needsClarification && sr.quickReplies && sr.quickReplies.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                        <Sparkle size={15} weight="duotone" className="text-primary" />
                        <span>Contoh Topik Konsultasi &amp; Kendala Cepat</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {sr.quickReplies.map((qr, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            disabled={isAnalyzing}
                            onClick={() => handleSend(qr)}
                            className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-primary hover:text-white border border-slate-200 text-neutral-dark hover:border-primary text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Grounded Service Recommendations from SERVIO DB */}
                  {!isUser && sr && sr.recommendedServices.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                        <Wrench size={15} weight="duotone" className="text-primary" />
                        <span>Rekomendasi Layanan Teknisi (Katalog SERVIO)</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {sr.recommendedServices.map((svc) => (
                          <div
                            key={svc.id}
                            className="p-3.5 rounded-xl bg-white border border-sky-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                  {svc.categoryName} · {svc.providerName}
                                </div>
                                <h4 className="font-bold text-xs sm:text-sm font-display text-neutral-dark mt-0.5">
                                  {svc.title}
                                </h4>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                                {svc.warrantyLabel}
                              </span>
                            </div>

                            {svc.description && (
                              <p className="text-[11px] text-neutral-slate line-clamp-2">
                                {svc.description}
                              </p>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-[10px] text-neutral-slate">Estimasi Tarif</div>
                                <div className="text-xs font-bold font-mono text-neutral-dark">
                                  {svc.estimatedCostLabel}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleConversionClick({
                                    targetUrl: svc.bookingUrl,
                                    selectedServiceId: svc.id,
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-all inline-flex items-center gap-1 shadow-servio-xs cursor-pointer"
                              >
                                <span>Pesan Sekarang</span>
                                <ArrowRight size={14} weight="bold" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Grounded Product / Sparepart Recommendations from SERVIO DB */}
                  {!isUser && sr && sr.recommendedProducts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-dark">
                        <Package size={15} weight="duotone" className="text-primary" />
                        <span>Rekomendasi Sparepart &amp; Produk Resmi SERVIO</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {sr.recommendedProducts.map((prod) => (
                          <div
                            key={prod.id}
                            className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-slate">
                                  {prod.brandName} · {prod.merchantName}
                                </div>
                                <h4 className="font-bold text-xs sm:text-sm font-display text-neutral-dark mt-0.5">
                                  {prod.name}
                                </h4>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                                  prod.totalStock > 0
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                {prod.totalStock > 0 ? `Stok ${prod.totalStock}` : "Habis"}
                              </span>
                            </div>

                            {prod.variantSummary && (
                              <div className="text-[11px] text-neutral-slate">
                                Varian: <span className="font-medium text-neutral-dark">{prod.variantSummary}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-[10px] text-neutral-slate">Harga Resmi</div>
                                <div className="text-xs font-bold font-mono text-primary">
                                  {prod.priceLabel}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleConversionClick({
                                    targetUrl: prod.productUrl,
                                    selectedProductId: prod.id,
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-light text-primary border border-primary/30 font-bold text-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Lihat Produk</span>
                                <ArrowRight size={14} weight="bold" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. Feedback Controls on Assistant Replies - Hanya tampil jika ada analisis atau rekomendasi teknis */}
                  {!isUser && sr && !sr.isGeneralChat && (sr.causes.length > 0 || sr.solutions.length > 0 || sr.recommendedServices.length > 0 || sr.recommendedProducts.length > 0) && (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px] text-neutral-slate">
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={14} weight="fill" className="text-emerald-600" />
                        <span>Rekomendasi divalidasi katalog database</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, "UP")}
                          aria-label="Diagnosa membantu"
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                            msg.userFeedback === "UP"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-white hover:bg-neutral-soft text-neutral-slate border-neutral-border"
                          }`}
                        >
                          <ThumbsUp size={13} weight={msg.userFeedback === "UP" ? "fill" : "regular"} />
                          <span>Membantu</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, "DOWN")}
                          aria-label="Diagnosa kurang tepat"
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                            msg.userFeedback === "DOWN"
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-white hover:bg-neutral-soft text-neutral-slate border-neutral-border"
                          }`}
                        >
                          <ThumbsDown size={13} weight={msg.userFeedback === "DOWN" ? "fill" : "regular"} />
                          <span>Kurang Tepat</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-neutral-slate flex items-center gap-2 shadow-2xs">
                <Sparkle size={16} className="text-primary animate-spin" />
                <span>
                  {draftAttachments.length > 0
                    ? "AI sedang menganalisis foto/video dan mencocokkan katalog SERVIO..."
                    : "Asisten AI SERVIO sedang memproses respons..."}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* 3. Bottom Composer Bar */}
      <footer className="shrink-0 bg-white border-t border-slate-200/90 p-3 sm:p-4 z-20">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Suggestions Chips without browser scrollbars */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="text-[11px] font-bold text-neutral-slate shrink-0">Contoh Cepat:</span>
            {quickSymptoms.map((sym, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isAnalyzing}
                onClick={() => handleSend(sym)}
                className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-neutral-slate hover:text-primary hover:border-primary text-[11px] font-medium transition-colors shrink-0 truncate max-w-xs cursor-pointer disabled:opacity-50"
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Media Extraction Status / Attachment Preview Strip */}
          {(mediaNotice || draftAttachments.length > 0) && (
            <div className="px-3.5 py-2 bg-sky-light/50 border border-sky-200/70 rounded-xl space-y-2">
              {mediaNotice && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  {isExtractingMedia ? (
                    <Sparkle size={14} className="animate-spin shrink-0" />
                  ) : (
                    <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                  )}
                  <span>{mediaNotice}</span>
                </div>
              )}

              {draftAttachments.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {draftAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-primary/30 bg-white shrink-0 group"
                    >
                      <img
                        src={att.previewUrl}
                        alt={att.sourceName}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] font-mono text-white text-center py-0.5 px-0.5 truncate">
                        {att.mediaType === "VIDEO_KEYFRAME"
                          ? `${att.frameTimestampSec?.toFixed(1) ?? "0"}s`
                          : "Foto"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDraftAttachment(att.id)}
                        aria-label="Hapus lampiran"
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer"
                      >
                        <X size={10} weight="bold" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Multimodal Composer Bar */}
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => handleVideoFile(e.target.files)}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isAnalyzing || isExtractingMedia || draftAttachments.length >= 8}
                title="Unggah Foto Kerusakan (JPG/PNG/WEBP)"
                aria-label="Unggah Foto Kerusakan"
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-sky-light text-neutral-dark hover:text-primary border border-slate-200 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              >
                <ImageIcon size={17} weight="duotone" className="text-primary" />
                <span className="hidden sm:inline">Foto</span>
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isAnalyzing || isExtractingMedia || draftAttachments.length >= 8}
                title="Unggah Video Singkat (Otomatis Ekstrak Frame)"
                aria-label="Unggah Video Kerusakan"
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-sky-light text-neutral-dark hover:text-primary border border-slate-200 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
              >
                {draftAttachments.some((a) => a.mediaType === "VIDEO_KEYFRAME") ? (
                  <FilmStrip size={17} weight="duotone" className="text-primary" />
                ) : (
                  <VideoCamera size={17} weight="duotone" className="text-primary" />
                )}
                <span className="hidden sm:inline">Video</span>
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ceritakan kendala unit Anda atau tanya sparepart yang cocok..."
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
              />

              <button
                type="submit"
                disabled={
                  (!inputMessage.trim() && draftAttachments.length === 0) ||
                  isAnalyzing ||
                  isExtractingMedia
                }
                aria-label="Kirim pesan diagnosa"
                className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-servio-xs active:scale-95 shrink-0 cursor-pointer"
              >
                <PaperPlaneTilt size={18} weight="bold" />
                <span className="hidden sm:inline text-xs font-bold">Kirim</span>
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}
