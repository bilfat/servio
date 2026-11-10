"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  Headset,
  Phone,
  EnvelopeSimple,
  MapPin,
  LockKey,
  ArrowUp,
  ArrowRight,
  ChatCircleDots,
  Wrench,
  Package,
  Storefront,
} from "@phosphor-icons/react";

export function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      aria-label="Informasi dan Navigasi Footer SERVIO"
      className="bg-gradient-to-b from-[#0F4C81] via-[#0D4373] to-[#0A3358] text-slate-200 border-t border-sky-800/40 transition-colors pb-24 lg:pb-10 pt-12 mt-auto w-full selection:bg-rose-500 selection:text-white"
    >
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20">
        {/* TOP TRUST & INTEGRITY STRIP */}
        <div className="pb-10 mb-10 border-b border-white/12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sky-300 shrink-0 shadow-xs">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-heading">
                  100% Proteksi Escrow
                </h4>
                <p className="text-xs text-sky-100/75 mt-0.5 leading-relaxed">
                  Dana aman di rekening penampung sampai pekerjaan tuntas dan Anda setujui.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sky-300 shrink-0 shadow-xs">
                <CheckCircle size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-heading">
                  Mitra Teknisi Teruji KYC
                </h4>
                <p className="text-xs text-sky-100/75 mt-0.5 leading-relaxed">
                  Verifikasi identitas resmi, uji sertifikasi teknis, dan kepatuhan SOP ketat.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sky-300 shrink-0 shadow-xs">
                <Clock size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-heading">
                  Garansi Digital 30-90 Hari
                </h4>
                <p className="text-xs text-sky-100/75 mt-0.5 leading-relaxed">
                  Jaminan purna jual transparan dengan klaim digital langsung dari aplikasi.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-sky-300 shrink-0 shadow-xs">
                <Headset size={22} weight="bold" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-heading">
                  Bantuan Siaga 24/7
                </h4>
                <p className="text-xs text-sky-100/75 mt-0.5 leading-relaxed">
                  Customer care responsif via WhatsApp dan hotline untuk konsultasi perbaikan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION & BRAND GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-10 lg:gap-8 pb-12 border-b border-white/12">
          {/* Brand & Corporate Overview (col-span-2 lg:col-span-4) */}
          <div className="col-span-2 lg:col-span-4 flex flex-col justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/90 hover:bg-white text-slate-900 shadow-xs border border-white/40 backdrop-blur-md transition-all group focus:outline-none focus:ring-2 focus:ring-white/40 w-fit"
                title="SERVIO — Beranda Utama"
              >
                <div className="relative h-8 flex items-center shrink-0">
                  <Image
                    src="/brand/logo.png"
                    alt="Logo SERVIO"
                    width={44}
                    height={32}
                    className="h-8 w-auto object-contain shrink-0"
                  />
                </div>
                <span className="font-brand-latin text-[26px] leading-none font-bold text-slate-900 group-hover:text-primary transition-colors select-none tracking-tight pt-0.5">
                  Servio
                </span>
              </Link>

              <p className="text-xs font-semibold uppercase tracking-wider text-rose-300 mt-2 font-heading">
                More Than Service, A Better Everyday
              </p>

              <p className="text-xs text-sky-100/80 mt-3 leading-relaxed max-w-sm">
                Ekosistem perbaikan, pemeliharaan fasilitas, dan suku cadang resmi terlengkap di Indonesia. Menghubungkan teknisi terverifikasi, merchant terpercaya, dan pelanggan dalam satu standar layanan profesional.
              </p>

              {/* Regulatory Notice */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-sky-200/65">
                <LockKey size={14} weight="bold" className="text-sky-300/80 shrink-0" />
                <span>Terdaftar resmi PT Servio Teknologi Indonesia &middot; KBLI 2026</span>
              </div>
            </div>

            {/* Official Contact Points */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-sky-100/90">
                <Phone size={15} weight="bold" className="text-sky-300 shrink-0" />
                <span>Hotline Resmi: <strong className="text-white">1500-789</strong> (Bebas Pulsa)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-sky-100/90">
                <EnvelopeSimple size={15} weight="bold" className="text-sky-300 shrink-0" />
                <a
                  href="mailto:support@servio.id"
                  className="hover:text-white transition-colors underline-offset-2 hover:underline"
                >
                  support@servio.id
                </a>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-sky-100/90">
                <MapPin size={15} weight="bold" className="text-sky-300 shrink-0 mt-0.5" />
                <span>Jakarta Selatan, DKI Jakarta, Indonesia</span>
              </div>
            </div>
          </div>

          {/* Column 1: Layanan Jasa (col-span-1 lg:col-span-2) */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200 font-heading mb-3.5 flex items-center gap-1.5">
              <Wrench size={14} weight="bold" className="text-sky-300" />
              <span>Layanan Jasa</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/services?domain=repair-technical"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Repair & Technical
                </Link>
              </li>
              <li>
                <Link
                  href="/services?domain=home-building"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Home & Building
                </Link>
              </li>
              <li>
                <Link
                  href="/services?domain=cleaning"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Cleaning & Sanitasi
                </Link>
              </li>
              <li>
                <Link
                  href="/services?domain=maintenance"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Maintenance Berkala
                </Link>
              </li>
              <li>
                <Link
                  href="/services?domain=environment"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Lingkungan & Hama
                </Link>
              </li>
              <li>
                <Link
                  href="/services?domain=automotive"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Otomotif & Mobilitas
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/services"
                  className="font-semibold text-sky-300 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Semua 40+ Jasa</span>
                  <ArrowRight size={11} weight="bold" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Produk & Mitra (col-span-1 lg:col-span-2) */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200 font-heading mb-3.5 flex items-center gap-1.5">
              <Package size={14} weight="bold" className="text-sky-300" />
              <span>Produk & Mitra</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/products"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Katalog Suku Cadang
                </Link>
              </li>
              <li>
                <Link
                  href="/merchants"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Merchant Toko Resmi
                </Link>
              </li>
              <li>
                <Link
                  href="/providers"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Daftar Bengkel & Provider
                </Link>
              </li>
              <li>
                <Link
                  href="/registration"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Daftar Jadi Teknisi
                </Link>
              </li>
              <li>
                <Link
                  href="/registration"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Daftar Jadi Merchant
                </Link>
              </li>
              <li>
                <Link
                  href="/registration"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Kerja Sama B2B Supplier
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  href="/registration/status"
                  className="font-semibold text-sky-300 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Cek Status Pengajuan</span>
                  <ArrowRight size={11} weight="bold" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Fitur & Eksplorasi (col-span-1 lg:col-span-2) */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200 font-heading mb-3.5 flex items-center gap-1.5">
              <ChatCircleDots size={14} weight="duotone" className="text-sky-300" />
              <span>Fitur Pintar</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Cara Kerja & Escrow
                </Link>
              </li>
              <li>
                <Link
                  href="/#uji-diagnosa-ai"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Uji Diagnosa AI
                </Link>
              </li>
              <li>
                <Link
                  href="/smart-discovery"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Smart Discovery Asisten
                </Link>
              </li>
              <li>
                <Link
                  href="/warranties"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Cek Garansi Digital
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Standar SOP & Keamanan
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Bantuan & Legalitas (col-span-1 lg:col-span-2) */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-200 font-heading mb-3.5 flex items-center gap-1.5">
              <Storefront size={14} weight="bold" className="text-sky-300" />
              <span>Bantuan & Legal</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/faq"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Pusat Bantuan & FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Hubungi Dukungan 24/7
                </Link>
              </li>
              <li>
                <Link
                  href="/faq#terms"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Syarat & Ketentuan
                </Link>
              </li>
              <li>
                <Link
                  href="/faq#privacy"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Kebijakan Privasi Data
                </Link>
              </li>
              <li>
                <Link
                  href="/faq#refund"
                  className="text-sky-100/80 hover:text-white transition-colors block py-0.5"
                >
                  Kebijakan Pengembalian
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM UTILITY & COPYRIGHT BAR */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sky-200/75">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-center sm:text-left">
            <span>&copy; {new Date().getFullYear()} PT Servio Teknologi Indonesia. Seluruh hak cipta dilindungi.</span>
            <div className="flex items-center gap-3 text-[11px] text-sky-200/60">
              <Link href="/faq#terms" className="hover:text-white transition-colors">
                Syarat &amp; Ketentuan
              </Link>
              <span>&middot;</span>
              <Link href="/faq#privacy" className="hover:text-white transition-colors">
                Kebijakan Privasi
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-medium focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
              title="Kembali ke atas halaman"
            >
              <span>Kembali ke Atas</span>
              <ArrowUp size={13} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
