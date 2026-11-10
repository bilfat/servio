"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import {
  ChatCircleDots,
  PaperPlaneTilt,
  Wrench,
  Package,
  ShieldCheck,
  ArrowRight,
  CircleNotch,
  Lightning,
  Lock,
} from "@phosphor-icons/react";
import { ServiceOffering } from "@/types/domain";

interface DiagnosticOutput {
  symptom: string;
  suspectedCause: string;
  recommendedServiceTitle: string;
  recommendedCategory: string;
  estimatedCost: string;
  suggestedPart: string;
  urgencyLabel: string;
  urgencyBadgeClass: string;
  searchKeyword: string;
  matchedLiveServiceId?: string;
  matchedLiveServiceTitle?: string;
}

const PRESET_SYMPTOMS = [
  "AC kamar netes air & tidak dingin",
  "MCB listrik turun saat nyalakan alat",
  "Kulkas 2 pintu atas dingin bawah tidak",
  "Ban mobil kempes atau bocor halus",
];

function analyzeSymptom(
  query: string,
  liveServices: ServiceOffering[]
): DiagnosticOutput {
  const q = query.trim().toLowerCase();

  let cause = "Penurunan performa komponen atau kotoran menumpuk yang perlu dicek teknisi.";
  let serviceTitle = "Inspeksi & Perbaikan Unit Elektronik";
  let category = "Servis & Perbaikan";
  let estimatedCost = "Rp 125rb – 320rb";
  let suggestedPart = "Seal / Modul Standar";
  let urgencyLabel = "Prioritas Sedang";
  let urgencyBadgeClass = "bg-amber-100 text-amber-800 border-amber-200";
  let searchKeyword = "Servis";

  if (q.includes("ac") || q.includes("dingin") || q.includes("freon") || q.includes("netes")) {
    cause = "Drainase tersumbat lumut atau tekanan refrigeran Freon R32 berkurang.";
    serviceTitle = "Cuci AC Split + Cek Freon";
    category = "Pendingin & AC";
    estimatedCost = "Rp 150rb – 350rb";
    suggestedPart = "Freon R32 / Filter AC";
    urgencyLabel = "Perlu Penanganan Cepat";
    urgencyBadgeClass = "bg-sky-100 text-primary border-sky-200";
    searchKeyword = "AC";
  } else if (q.includes("mcb") || q.includes("listrik") || q.includes("korslet") || q.includes("steker")) {
    cause = "Beban daya berlebih atau isolasi kabel panas (short circuit).";
    serviceTitle = "Audit & Penanganan Korsleting";
    category = "Kelistrikan";
    estimatedCost = "Rp 120rb – 280rb";
    suggestedPart = "MCB 16A / Stop Kontak";
    urgencyLabel = "Urgensi Tinggi";
    urgencyBadgeClass = "bg-rose-100 text-rose-700 border-rose-200";
    searchKeyword = "Listrik";
  } else if (q.includes("kulkas") || q.includes("beku") || q.includes("freezer")) {
    cause = "Bunga es menyumbat kipas sirkulasi atau timer defrost rusak.";
    serviceTitle = "Perbaikan Sirkulasi & Defrost Kulkas";
    category = "Pendingin & Elektronik";
    estimatedCost = "Rp 175rb – 400rb";
    suggestedPart = "Defrost Timer / Bimetal";
    urgencyLabel = "Prioritas Tinggi";
    urgencyBadgeClass = "bg-amber-100 text-amber-800 border-amber-200";
    searchKeyword = "Kulkas";
  } else if (q.includes("ban") || q.includes("mobil") || q.includes("motor") || q.includes("rem")) {
    cause = "Kebocoran halus telapak ban atau pentil aus.";
    serviceTitle = "Tambal Ban & Tune Up Darurat di Lokasi";
    category = "Otomotif";
    estimatedCost = "Rp 75rb – 200rb";
    suggestedPart = "Pentil Tubeless / Patch";
    urgencyLabel = "Siap Panggil Sekarang";
    urgencyBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
    searchKeyword = "ban";
  } else if (q.includes("pipa") || q.includes("bocor") || q.includes("air") || q.includes("wastafel")) {
    cause = "Seal pipa getas atau sumbatan kerak pada jalur buang.";
    serviceTitle = "Pelancaran Pipa Mampet & Perbaikan Bocor";
    category = "Home & Building";
    estimatedCost = "Rp 150rb – 380rb";
    suggestedPart = "Seal Karet / Lem PVC";
    urgencyLabel = "Perlu Dicek Segera";
    urgencyBadgeClass = "bg-sky-100 text-primary border-sky-200";
    searchKeyword = "Pipa";
  }

  // Cocokkan dengan penawaran layanan aktif dari database
  const tokens = searchKeyword.toLowerCase().split(" ");
  const matched = liveServices.find((s) =>
    tokens.some(
      (t) =>
        s.title.toLowerCase().includes(t) ||
        (s.categoryName || "").toLowerCase().includes(t) ||
        (s.subcategoryName || "").toLowerCase().includes(t)
    )
  );

  return {
    symptom: query.trim(),
    suspectedCause: cause,
    recommendedServiceTitle: serviceTitle,
    recommendedCategory: category,
    estimatedCost,
    suggestedPart,
    urgencyLabel,
    urgencyBadgeClass,
    searchKeyword,
    matchedLiveServiceId: matched?.id,
    matchedLiveServiceTitle: matched?.title,
  };
}

/**
 * Maskot Vektor AI Bot Servio (Animasi CSS float ringan tanpa emoji)
 */
function ServioBotVector() {
  return (
    <div className="relative w-36 sm:w-44 mx-auto select-none flex items-center justify-center">
      {/* Lingkaran radar dinamis */}
      <div
        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full absolute pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(15,76,129,0.06) 58%, transparent 74%)",
        }}
      />

      <div className="animate-servio-float relative z-10 w-full">
        <svg
          viewBox="0 0 240 250"
          className="w-full h-auto"
          role="img"
          aria-label="Vector Bot Asisten Diagnosa AI Servio"
        >
          <defs>
            <linearGradient id="botBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            <linearGradient id="botSapphireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A64A3" />
              <stop offset="100%" stopColor="#0F4C81" />
            </linearGradient>
            <linearGradient id="botVisorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
          </defs>

          {/* Bayangan pijakan oval lembut */}
          <ellipse cx="120" cy="232" rx="64" ry="10" fill="#0F4C81" fillOpacity="0.14" />

          {/* Gelombang Sinyal Antena */}
          <path
            d="M104 20 Q120 8 136 20"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M96 13 Q120 -1 144 13"
            fill="none"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Antena AI Bot */}
          <rect x="117" y="28" width="6" height="22" rx="3" fill="#0F4C81" />
          <circle cx="120" cy="26" r="7" fill="#38BDF8" stroke="#0F4C81" strokeWidth="2.5" />
          <circle cx="122" cy="24" r="2" fill="#FFFFFF" />

          {/* Telinga Sensor Samping */}
          <rect x="44" y="76" width="14" height="36" rx="7" fill="#0F4C81" />
          <rect x="47" y="84" width="6" height="20" rx="3" fill="#38BDF8" />
          <rect x="182" y="76" width="14" height="36" rx="7" fill="#0F4C81" />
          <rect x="187" y="84" width="6" height="20" rx="3" fill="#38BDF8" />

          {/* Kepala Bot Servio */}
          <rect
            x="56"
            y="48"
            width="128"
            height="92"
            rx="34"
            fill="url(#botBodyGrad)"
            stroke="#CBD5E1"
            strokeWidth="2.5"
          />
          {/* Trim Biru Bagian Atas Helm Kepala */}
          <path
            d="M72 52 C88 44, 152 44, 168 52 C164 62, 76 62, 72 52 Z"
            fill="url(#botSapphireGrad)"
          />

          {/* Visor Wajah Digital */}
          <rect
            x="70"
            y="68"
            width="100"
            height="54"
            rx="20"
            fill="url(#botVisorGrad)"
            stroke="#38BDF8"
            strokeWidth="2.2"
          />

          {/* Mata Bot Bercahaya & Senyum Digital */}
          <ellipse cx="97" cy="91" rx="8.5" ry="10" fill="#38BDF8" />
          <ellipse cx="143" cy="91" rx="8.5" ry="10" fill="#38BDF8" />
          <circle cx="99.5" cy="87.5" r="2.8" fill="#FFFFFF" />
          <circle cx="145.5" cy="87.5" r="2.8" fill="#FFFFFF" />
          <path
            d="M108 106 Q120 114 132 106"
            fill="none"
            stroke="#34D399"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Leher */}
          <rect x="106" y="139" width="28" height="10" rx="4" fill="#64748B" />

          {/* Tangan Kiri */}
          <path
            d="M68 164 C46 168, 36 184, 42 198"
            fill="none"
            stroke="#1A64A3"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <circle cx="42" cy="199" r="9" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="2" />

          {/* Tangan Kanan */}
          <path
            d="M172 164 C194 166, 204 182, 198 196"
            fill="none"
            stroke="#1A64A3"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <circle cx="198" cy="197" r="9" fill="#38BDF8" stroke="#0F4C81" strokeWidth="2" />

          {/* Torso */}
          <path
            d="M68 156 C68 148, 172 148, 172 156 L166 208 C164 218, 76 218, 74 208 Z"
            fill="url(#botBodyGrad)"
            stroke="#CBD5E1"
            strokeWidth="2.5"
          />
          {/* Panel Dada */}
          <rect x="86" y="162" width="68" height="40" rx="12" fill="url(#botSapphireGrad)" />
          {/* Pulse Line */}
          <path
            d="M96 182 L106 182 L111 171 L117 192 L123 176 L128 182 L144 182"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

interface AiDiagnosticSandboxProps {
  services?: ServiceOffering[];
}

/**
 * Widget Interaktif "Uji Coba Diagnosa AI Servio" langsung di Beranda.
 * - Desain lapang, visual-first, dan bebas text-clutter ("tidak sumpek").
 * - Dilengkapi jaminan proteksi Escrow S-Pay.
 * - Bersih dari emoji dan bintang AI-slop (menggunakan Phosphor icons resmi).
 */
export function AiDiagnosticSandbox({ services = [] }: AiDiagnosticSandboxProps) {
  const { activeRole, isAuthenticated, isPublicGuest, isLoadingAuth } = useActiveRole();
  const isCustomerLoggedIn = Boolean(
    !isLoadingAuth && isAuthenticated && !isPublicGuest && activeRole === "CUSTOMER"
  );

  const [symptomInput, setSymptomInput] = useState(PRESET_SYMPTOMS[0]);
  const [submittedQuery, setSubmittedQuery] = useState(PRESET_SYMPTOMS[0]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const result = useMemo(
    () => analyzeSymptom(submittedQuery, services),
    [submittedQuery, services]
  );

  const runTestDiagnostic = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setSymptomInput(clean);
    setIsDiagnosing(true);
    setTimeout(() => {
      setSubmittedQuery(clean);
      setIsDiagnosing(false);
    }, 250);
  };

  return (
    <section
      id="uji-diagnosa-ai"
      className="rounded-3xl bg-white border border-slate-200/90 p-5 sm:p-7 lg:p-8 shadow-xs"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Kiri: Vector Bot Mascot */}
        <div className="lg:col-span-4 flex flex-col items-center text-center space-y-2.5">
          <ServioBotVector />

          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
              <ChatCircleDots size={16} weight="duotone" className="text-primary" />
              <span>Asisten Diagnosa AI Servio</span>
            </div>
            <p className="text-[11px] text-neutral-slate max-w-xs">
              Deteksi perkiraan kerusakan &amp; biaya dalam hitungan detik.
            </p>
          </div>

          {/* S-Pay Trust Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700">
            <ShieldCheck size={13} weight="fill" className="text-emerald-600" />
            <span>Estimasi Terlindungi Escrow S-Pay</span>
          </div>
        </div>

        {/* Kanan: Interactive Sandbox */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-heading block">
                Diagnosa Mandiri Instan
              </span>
              <h2 className="text-base sm:text-lg font-display font-bold text-neutral-dark">
                Bingung Alat Rusak di Mana? Uji di Sini:
              </h2>
            </div>

            <Link
              href="/smart-discovery"
              className="text-xs font-bold text-primary hover:text-primary-dark bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shrink-0 transition-colors self-start sm:self-auto cursor-pointer"
            >
              {!isCustomerLoggedIn && <Lock size={12} weight="fill" className="text-secondary" />}
              <span>
                {isCustomerLoggedIn ? "Buka Chat AI Penuh" : "Chat AI Penuh (Login Pelanggan)"}
              </span>
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runTestDiagnostic(symptomInput);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              placeholder="Ketik keluhan kerusakan (misal: AC tidak dingin dan netes air)..."
              className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={isDiagnosing || !symptomInput.trim()}
              className="shrink-0 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {isDiagnosing ? (
                <>
                  <CircleNotch size={15} className="animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={15} weight="bold" />
                  <span>Uji AI</span>
                </>
              )}
            </button>
          </form>

          {/* Pilihan Gejala Cepat */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-500 mr-0.5">Uji cepat:</span>
            {PRESET_SYMPTOMS.map((preset) => {
              const active = submittedQuery === preset && !isDiagnosing;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => runTestDiagnostic(preset)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white border-primary shadow-2xs scale-102"
                      : "bg-slate-50 hover:bg-sky-50 text-slate-700 border-slate-200 hover:border-sky-300"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          {/* Kartu Hasil Analisa Ringkas & Rapi (Tanpa Paragraf Rapat) */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/90 p-4 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
              <div className="flex items-center gap-2 min-w-0">
                <Lightning size={16} weight="fill" className="text-secondary shrink-0" />
                <p className="text-xs font-bold text-neutral-dark truncate">
                  &ldquo;{result.symptom}&rdquo;
                </p>
              </div>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${result.urgencyBadgeClass}`}
              >
                {result.urgencyLabel}
              </span>
            </div>

            {/* Indikasi Ringkas 1 Baris */}
            <p className="text-[11px] text-slate-700 leading-snug">
              <strong className="text-neutral-dark">Indikasi Utama:</strong> {result.suspectedCause}
            </p>

            {/* 3 Metric Cards Ringkas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Wrench size={12} weight="bold" className="text-primary" />
                  Rekomendasi Layanan
                </span>
                <p className="font-bold text-neutral-dark mt-0.5 line-clamp-1">
                  {result.matchedLiveServiceTitle || result.recommendedServiceTitle}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 shadow-2xs">
                <span className="text-[10px] font-semibold text-slate-500">Estimasi Biaya</span>
                <p className="font-bold text-primary font-mono mt-0.5 text-xs">
                  {result.estimatedCost}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 shadow-2xs">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Package size={12} weight="bold" className="text-amber-600" />
                  Potensi Suku Cadang
                </span>
                <p className="font-bold text-neutral-dark mt-0.5 line-clamp-1">
                  {result.suggestedPart}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                <ShieldCheck size={14} weight="fill" />
                <span>Terlindungi Rekening Bersama Escrow S-Pay</span>
              </span>

              <Link
                href={
                  result.matchedLiveServiceId
                    ? `/services/${result.matchedLiveServiceId}`
                    : `/search?q=${encodeURIComponent(result.searchKeyword)}`
                }
                className="px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{result.matchedLiveServiceId ? "Lihat Jasa Cocok" : "Cari Teknisi Cocok"}</span>
                <ArrowRight size={12} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
