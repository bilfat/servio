"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Wrench,
  Package,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  XCircle,
  Camera,
  House,
  SealCheck,
  CaretRight,
  Clock,
  ArrowCounterClockwise,
  Lightning,
  Lock,
  NavigationArrow,
} from "@phosphor-icons/react";

const SPARE_PART_ITEMS = [
  {
    id: "freon",
    src: "/products/freon-r32.svg",
    name: "Freon R32 Eco",
    price: "Rp 185.000",
    tag: "Original Eco Gas",
    merchant: "Mitra Daikin / Panasonic Resmi",
    search: "Freon",
  },
  {
    id: "pcb",
    src: "/products/pcb-ac.svg",
    name: "Modul PCB Digital",
    price: "Rp 265.000",
    tag: "Garansi Toko 6 Bulan",
    merchant: "Electronic Parts Hub",
    search: "PCB",
  },
  {
    id: "kompresor",
    src: "/products/kompresor-kulkas.svg",
    name: "Kompresor Inverter",
    price: "Rp 480.000",
    tag: "Grade A Teruji",
    merchant: "Cooling Tech Official",
    search: "Kompresor",
  },
  {
    id: "filter",
    src: "/products/filter-ac.svg",
    name: "Filter AC Anti-Bakteri",
    price: "Rp 45.000",
    tag: "PM2.5 Filtration",
    merchant: "Air Care Store",
    search: "Filter",
  },
];

type FeatureTab = "SPAY" | "QUOTE" | "PARTS" | "WARRANTY";

/**
 * Panggung Interaktif Fitur & Keunggulan Servio.
 * - Tipografi proporsional, rapi, dan nyaman dibaca (tidak terlalu besar).
 * - Tidak Sumpek: Menghilangkan paragraf berjejal dan tumpukan border kaku.
 * - Bergerak & Interaktif: Tab controller dengan transisi halus, live slider, dan kalkulasi dinamis.
 * - Desain Resmi S-Pay: Mengusung warna dual-tone gradient (#E11D48 -> #0F4C81), logo resmi /brand/logo-Spay.png,
 *   dan simulator 3-tahap proteksi rekening bersama.
 */
export function CustomerFeaturesBento() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("SPAY");

  // State untuk Tab 1: S-Pay Escrow
  const [escrowStage, setEscrowStage] = useState<1 | 2 | 3>(1);

  // State untuk Tab 2: Quote Approval
  const [quoteDecision, setQuoteDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");

  // State untuk Tab 3: Spare Parts
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);

  // State untuk Tab 4: SOP & Warranty
  const [sopView, setSopView] = useState<"BEFORE" | "AFTER">("AFTER");

  // Auto-cycle tab preview jika pengguna tidak berinteraksi aktif
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  useEffect(() => {
    if (!isAutoPlay) return;
    const tabs: FeatureTab[] = ["SPAY", "QUOTE", "PARTS", "WARRANTY"];
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const nextIndex = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const activePart = SPARE_PART_ITEMS[selectedPartIndex];

  return (
    <section className="space-y-3.5 sm:space-y-4">
      {/* =================================================================
          1. HEADER SECTION (MINIMALIS, PROPORSI NYAMAN & RAPI)
         ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-heading inline-flex items-center gap-1.5">
            <SealCheck size={13} weight="fill" className="text-secondary" />
            Ekosistem Perlindungan Pelanggan
          </span>
          <h2 className="text-base sm:text-lg lg:text-xl font-display font-bold text-neutral-dark mt-0.5">
            Kendali Penuh &amp; Transaksi Aman di Servio
          </h2>
          <p className="text-xs text-neutral-slate mt-0.5 max-w-2xl leading-relaxed">
            Pilih fitur di bawah untuk melihat simulasi interaktif bagaimana Servio melindungi setiap rupiah dan pengerjaan servis Anda.
          </p>
        </div>

        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-xs hover:shadow-servio-sm transition-all shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Buat Akun Gratis</span>
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>

      {/* =================================================================
          2. INTERACTIVE TAB CONTROLLER (NAVIGASI DENGAN FONT PROPORSIONAL)
         ================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-2xs">
        {/* TAB 1: S-Pay & Escrow */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("SPAY");
            setIsAutoPlay(false);
          }}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "SPAY"
              ? "bg-gradient-to-r from-[#E11D48] via-[#F43F5E] to-[#0F4C81] text-white shadow-sm font-bold scale-101"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
            <Image
              src="/brand/logo-Spay.png"
              alt="Logo S-Pay"
              width={14}
              height={14}
              className="object-contain"
            />
          </span>
          <span>S-Pay &amp; Escrow</span>
        </button>

        {/* TAB 2: Pesan Teknisi & Biaya */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("QUOTE");
            setIsAutoPlay(false);
          }}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "QUOTE"
              ? "bg-primary text-white shadow-sm font-bold scale-101"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
          }`}
        >
          <Wrench size={14} weight="duotone" />
          <span>Kendali Biaya &amp; Teknisi</span>
        </button>

        {/* TAB 3: Suku Cadang Asli */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("PARTS");
            setIsAutoPlay(false);
          }}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "PARTS"
              ? "bg-amber-600 text-white shadow-sm font-bold scale-101"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
          }`}
        >
          <Package size={14} weight="duotone" />
          <span>Suku Cadang Asli</span>
        </button>

        {/* TAB 4: Bukti SOP & Garansi */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("WARRANTY");
            setIsAutoPlay(false);
          }}
          className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === "WARRANTY"
              ? "bg-indigo-600 text-white shadow-sm font-bold scale-101"
              : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
          }`}
        >
          <SealCheck size={14} weight="fill" />
          <span>Bukti SOP &amp; Garansi</span>
        </button>
      </div>

      {/* =================================================================
          3. PANGGUNG INTERAKTIF UTAMA (STAGE DENGAN FONT RAPI, NYAMAN DIBACA)
         ================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all duration-300">
        {/* ===============================================================
            PANEL 1: S-PAY & REKENING BERSAMA (ESCROW SHOWCASE HERO)
           =============================================================== */}
        {activeTab === "SPAY" && (
          <div
            className="p-5 sm:p-6 lg:p-7 relative overflow-hidden text-white"
            style={{
              background: "linear-gradient(130deg, #E11D48 0%, #F43F5E 30%, #1D4ED8 70%, #0F4C81 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {/* Ornamen Pita Gelombang Resmi S-Pay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#FB7185]/35 blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#0F4C81]/50 blur-3xl" />

              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                viewBox="0 0 600 300"
              >
                <path
                  d="M 200,0 Q 380,140 600,40 L 600,0 Z"
                  fill="#FB7185"
                  fillOpacity="0.4"
                />
                <path
                  d="M 0,110 Q 220,260 450,130 T 600,190 L 600,300 L 0,300 Z"
                  fill="#0B3860"
                  fillOpacity="0.8"
                />
                <path
                  d="M -30,160 Q 240,290 470,145 T 630,205"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Sisi Kiri: Nilai Utama dengan Font Proporsional */}
              <div className="lg:col-span-6 space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 text-white text-[10px] font-bold shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                    <Image
                      src="/brand/logo-Spay.png"
                      alt="Logo S-Pay"
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  </span>
                  <span>Saldo S-Pay • Proteksi Rekening Bersama</span>
                </div>

                <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-white leading-snug drop-shadow-xs">
                  Uang Anda Ditahan Aman di Rekening Bersama.
                </h3>

                <p className="text-xs text-white/90 leading-relaxed max-w-xl">
                  Teknisi tidak akan menerima dana sepeserpun sebelum Anda memeriksa hasil kerja dan mengklik konfirmasi selesai.
                </p>

                {/* 3 Keunggulan Ringkas dalam Kapsul Transparan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center gap-2 font-semibold">
                    <ShieldCheck size={16} weight="fill" className="text-amber-300 shrink-0" />
                    <span>100% Bebas Penipuan</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center gap-2 font-semibold">
                    <ArrowCounterClockwise size={16} weight="bold" className="text-emerald-300 shrink-0" />
                    <span>Garansi Refund Otomatis</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center gap-2 font-semibold">
                    <Lightning size={16} weight="fill" className="text-sky-300 shrink-0" />
                    <span>Tarik Instan via QRIS / Bank</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <Link
                    href="/how-it-works"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-primary hover:bg-slate-100 font-bold text-xs shadow-sm transition-all hover:scale-101 cursor-pointer"
                  >
                    <span>Pelajari Alur Rekening Bersama</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Sisi Kanan: Simulator Kartu Fisik S-Pay Bergerak & Interaktif */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full max-w-md rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 p-4 sm:p-5 shadow-servio-md space-y-3">
                  {/* Top Bar Kartu S-Pay */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 font-display font-bold text-sm text-white">
                      <span>Saldo</span>
                      <span className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center p-0.5 shrink-0">
                        <Image
                          src="/brand/logo-Spay.png"
                          alt="Logo S-Pay"
                          width={18}
                          height={18}
                          className="object-contain"
                        />
                      </span>
                      <span>- Pay</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/25 border border-white/30 text-white">
                      Escrow Terproteksi
                    </span>
                  </div>

                  {/* Saldo Terkunci di Escrow (Ukuran Proporsional) */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-white/80 font-medium">
                      Simulasi Saldo Transaksi Terkunci:
                    </span>
                    <div className="text-xl sm:text-2xl font-display font-bold tracking-tight text-white font-mono">
                      Rp 220.000
                    </div>
                  </div>

                  {/* 3-Step Interactive Escrow Stepper */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/25 border border-white/20 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setEscrowStage(1)}
                        className={`py-1 rounded-lg transition-all cursor-pointer truncate ${
                          escrowStage === 1
                            ? "bg-white text-rose-700 shadow-xs"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        1. Titip Dana
                      </button>
                      <button
                        type="button"
                        onClick={() => setEscrowStage(2)}
                        className={`py-1 rounded-lg transition-all cursor-pointer truncate ${
                          escrowStage === 2
                            ? "bg-white text-primary shadow-xs"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        2. SOP Kerja
                      </button>
                      <button
                        type="button"
                        onClick={() => setEscrowStage(3)}
                        className={`py-1 rounded-lg transition-all cursor-pointer truncate ${
                          escrowStage === 3
                            ? "bg-white text-emerald-700 shadow-xs"
                            : "text-white/80 hover:text-white"
                        }`}
                      >
                        3. Rilis/Refund
                      </button>
                    </div>

                    {/* Dinamika Penjelasan Ringkas (Visual Card) */}
                    <div className="rounded-xl bg-white/20 border border-white/25 p-3 space-y-1 text-xs">
                      {escrowStage === 1 && (
                        <div className="flex items-start gap-2">
                          <Lock size={16} weight="fill" className="text-amber-300 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white text-[11px]">Dana Ditahan 100% di Escrow</p>
                            <p className="text-[10px] text-white/90 leading-tight">
                              Uang Anda tersimpan aman di rekening bersama via QRIS / VA. Teknisi belum menerima uang sepeserpun.
                            </p>
                          </div>
                        </div>
                      )}

                      {escrowStage === 2 && (
                        <div className="flex items-start gap-2">
                          <Wrench size={16} weight="fill" className="text-sky-300 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white text-[11px]">Teknisi Bekerja Sesuai SOP</p>
                            <p className="text-[10px] text-white/90 leading-tight">
                              Pengerjaan unit diawasi checklist SOP dan wajib mengunggah foto sebelum dan sesudah kerja.
                            </p>
                          </div>
                        </div>
                      )}

                      {escrowStage === 3 && (
                        <div className="flex items-start gap-2">
                          <CheckCircle size={16} weight="fill" className="text-emerald-300 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white text-[11px]">Puas: Rilis Dana • Komplain: Refund</p>
                            <p className="text-[10px] text-white/90 leading-tight">
                              Jika Anda puas, 1-klik untuk cairkan ke teknisi. Jika ada komplain, saldo refund otomatis ke dompet S-Pay.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            PANEL 2: KENDALI ESTIMASI BIAYA & TEKNISI
           =============================================================== */}
        {activeTab === "QUOTE" && (
          <div className="p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-white via-sky-50/30 to-slate-50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Kiri: Value Proposition */}
              <div className="lg:col-span-6 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-primary border border-sky-200 text-[10px] font-bold">
                  <Wrench size={13} weight="bold" />
                  TRANSPARAN TANPA BIAYA SILUMAN
                </span>

                <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-neutral-dark leading-snug">
                  Setujui Biaya Sebelum Teknisi Mulai Bekerja.
                </h3>

                <p className="text-xs text-neutral-slate leading-relaxed max-w-xl">
                  Teknisi melakukan survei awal ke lokasi dan mengirim rincian biaya resmi. Anda memiliki kendali penuh untuk menerima atau menolak tanpa paksaan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                    <span>Survei Dipotong Otomatis</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <House size={16} weight="fill" className="text-primary shrink-0" />
                    <span>Home Service / Bengkel</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <NavigationArrow size={16} weight="bold" className="text-secondary shrink-0" />
                    <span>Lacak Teknisi GPS</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <Link
                    href="/services"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-xs transition-all hover:scale-101 cursor-pointer"
                  >
                    <span>Cari Jasa Teknisi</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Kanan: Simulasi Rincian & Persetujuan Interaktif */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-servio-md space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                        Status Order
                      </span>
                      <p className="font-bold text-neutral-dark text-xs">Hasil Diagnosa &amp; Estimasi</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px]">
                      Menunggu Persetujuan
                    </span>
                  </div>

                  {/* Breakdown Biaya Rapi & Proporsional */}
                  <div className="space-y-1.5 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Biaya Survei Awal:</span>
                      <span className="font-semibold text-slate-800">Rp 50.000</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Isi Freon R32 + Kapasitor:</span>
                      <span className="font-bold text-primary">Rp 220.000</span>
                    </div>
                    <div className="pt-1 border-t border-slate-200/70 flex justify-between text-emerald-700 font-semibold text-[10px]">
                      <span>Potongan Survei (Servis Lanjut):</span>
                      <span>- Rp 50.000</span>
                    </div>
                    <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-neutral-dark text-xs">
                      <span>Total Tagihan Bersih:</span>
                      <span className="text-primary font-mono text-sm">Rp 220.000</span>
                    </div>
                  </div>

                  {/* Tombol Interaktif Setujui vs Tolak */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuoteDecision("APPROVED")}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        quoteDecision === "APPROVED"
                          ? "bg-emerald-600 text-white shadow-xs scale-101"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <CheckCircle size={15} weight="fill" />
                      <span>Setujui Biaya</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuoteDecision("REJECTED")}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        quoteDecision === "REJECTED"
                          ? "bg-rose-600 text-white shadow-xs scale-101"
                          : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                      }`}
                    >
                      <XCircle size={15} weight="fill" />
                      <span>Tolak Estimasi</span>
                    </button>
                  </div>

                  {/* Feedback Live */}
                  <div className="p-2.5 rounded-xl text-[11px] transition-all">
                    {quoteDecision === "APPROVED" ? (
                      <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                        <span>Estimasi disetujui! Dana dikunci aman di Escrow S-Pay, teknisi langsung mulai pengerjaan.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <XCircle size={15} weight="fill" className="text-rose-600 shrink-0" />
                        <span>Estimasi ditolak. Order dibatalkan sopan tanpa ada tagihan jasa perbaikan.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            PANEL 3: MARKETPLACE SUKU CADANG ASLI
           =============================================================== */}
        {activeTab === "PARTS" && (
          <div className="p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-white via-amber-50/30 to-slate-50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Kiri: Value Proposition */}
              <div className="lg:col-span-6 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  <Package size={13} weight="bold" />
                  100% SUKU CADANG RESMI MERCHANT
                </span>

                <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-neutral-dark leading-snug">
                  Suku Cadang Asli Terhubung Langsung ke Servis.
                </h3>

                <p className="text-xs text-neutral-slate leading-relaxed max-w-xl">
                  Beli komponen resmi dari toko merchant terverifikasi. Komponen dapat langsung dipasangkan oleh teknisi saat jadwal servis.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <SealCheck size={16} weight="fill" className="text-amber-600 shrink-0" />
                    <span>Garansi Toko s.d. 6 Bln</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                    <span>Original Teruji Pabrik</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <ShieldCheck size={16} weight="fill" className="text-primary shrink-0" />
                    <span>Lacak Resi Terpadu</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-101 cursor-pointer"
                  >
                    <span>Jelajahi Toko Sparepart</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Kanan: Pilihan Komponen Interaktif */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-servio-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-dark">Pilih Komponen:</span>
                    <span className="text-[10px] text-amber-700 font-semibold">Klik untuk melihat detail</span>
                  </div>

                  {/* 4 Komponen Tab */}
                  <div className="grid grid-cols-4 gap-2">
                    {SPARE_PART_ITEMS.map((part, idx) => {
                      const isSelected = selectedPartIndex === idx;
                      return (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => setSelectedPartIndex(idx)}
                          className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 scale-102 shadow-2xs"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <Image
                            src={part.src}
                            alt={part.name}
                            width={30}
                            height={30}
                            unoptimized
                            className="w-7 h-7 object-contain"
                          />
                          <span className={`text-[8.5px] font-bold truncate w-full ${isSelected ? "text-amber-900" : "text-slate-600"}`}>
                            {part.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Spotlight Preview Komponen Terpilih */}
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-neutral-dark text-xs">{activePart.name}</p>
                      <span className="text-xs font-bold text-amber-700 font-mono">
                        {activePart.price}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate max-w-[190px]">{activePart.merchant}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-amber-800 font-bold text-[9px] border border-amber-200">
                        {activePart.tag}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/products?search=${encodeURIComponent(activePart.search)}`}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Beli Komponen Ini di Toko Resmi</span>
                    <CaretRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            PANEL 4: BUKTI SOP & GARANSI DIGITAL 30-90 HARI
           =============================================================== */}
        {activeTab === "WARRANTY" && (
          <div className="p-5 sm:p-6 lg:p-7 bg-gradient-to-br from-white via-indigo-50/30 to-slate-50">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              {/* Kiri: Value Proposition */}
              <div className="lg:col-span-6 space-y-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                  <SealCheck size={13} weight="fill" />
                  STANDAR MUTU &amp; PURNAJUAL RESMI
                </span>

                <h3 className="text-base sm:text-lg lg:text-xl font-display font-bold text-neutral-dark leading-snug">
                  Bukti Nyata SOP &amp; Garansi Bebas Biaya Panggilan.
                </h3>

                <p className="text-xs text-neutral-slate leading-relaxed max-w-xl">
                  Teknisi wajib mengunggah foto sebelum dan sesudah kerja. Jika kerusakan terulang dalam masa garansi 30–90 hari, teknisi dijadwalkan ulang tanpa biaya kunjungan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <Camera size={16} weight="fill" className="text-sky-600 shrink-0" />
                    <span>Wajib Foto Before-After</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <SealCheck size={16} weight="fill" className="text-indigo-600 shrink-0" />
                    <span>Garansi 30–90 Hari</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-1.5 font-semibold text-slate-800">
                    <Clock size={16} weight="bold" className="text-emerald-600 shrink-0" />
                    <span>SLA Teknisi &lt; 24 Jam</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <Link
                    href="/faq"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-101 cursor-pointer"
                  >
                    <span>Ketentuan Garansi &amp; SOP</span>
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {/* Kanan: Visual Bukti SOP & Sertifikat Digital */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-servio-md space-y-3">
                  {/* Toggle Sebelum vs Sesudah */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-neutral-dark">
                      <span>Dokumentasi Standar Kerja SOP:</span>
                    </div>

                    <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setSopView("BEFORE")}
                        className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                          sopView === "BEFORE"
                            ? "bg-white text-rose-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        1. Sebelum Servis
                      </button>
                      <button
                        type="button"
                        onClick={() => setSopView("AFTER")}
                        className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                          sopView === "AFTER"
                            ? "bg-white text-emerald-700 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        2. Sesudah Servis
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5 text-[10px]">
                      {sopView === "BEFORE" ? (
                        <>
                          <div className="flex items-center justify-between font-bold text-rose-700 pb-0.5">
                            <span>Kondisi Awal Alat</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px]">
                              Kotor &amp; Arus Drop
                            </span>
                          </div>
                          <p className="text-slate-600">
                            • Saluran drainase tersumbat lumut &amp; berlendir
                          </p>
                          <p className="text-slate-600">
                            • Tekanan freon drop (55 PSI), tidak menghasilkan dingin
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between font-bold text-emerald-700 pb-0.5">
                            <span>Kondisi Tuntas Servis</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px]">
                              Lolos QC 7 Poin SOP
                            </span>
                          </div>
                          <p className="text-slate-600">
                            • Chemical cleaning evaporator tuntas menyeluruh
                          </p>
                          <p className="text-slate-600">
                            • Tekanan optimal (140 PSI), hembusan dingin 16°C
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sertifikat Garansi Digital Card */}
                  <div className="rounded-xl bg-[#0F4C81] text-white p-3 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] uppercase tracking-wider text-sky-200 font-bold">
                        Sertifikat Garansi Servio
                      </span>
                      <ShieldCheck size={18} weight="duotone" className="text-emerald-300" />
                    </div>
                    <p className="text-xs font-bold">Garansi Pekerjaan • 30–90 Hari</p>
                    <p className="text-[10px] text-sky-100/90 leading-tight">
                      Terjadi kendala lagi? Klaim 1-klik di aplikasi—teknisi dikirim ulang tanpa biaya tambahan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
