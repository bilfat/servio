"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  MagnifyingGlass,
  ShieldCheck,
  Wrench,
  CheckCircle,
  LockKey,
  ArrowRight,
} from "@phosphor-icons/react";

export default function HowItWorksPage() {
  const steps = [
    {
      stepNumber: "01",
      title: "Cari Layanan & Diagnosa Cepat",
      description:
        "Pilih dari 6 domain utama kategori jasa resmi Servio, cari spesialisasi spesifik, atau gunakan Smart Discovery AI untuk menganalisis gejala kerusakan serta rekomendasi estimasi biaya.",
      icon: MagnifyingGlass,
      color: "bg-primary text-white",
      features: [
        "6 Domain resmi terstandar (Repair, Home, Cleaning, Maintenance, Environment, Auto)",
        "Diagnosa AI prediktif untuk estimasi suku cadang",
        "Katalog bengkel & profil teknisi terverifikasi SKCK & sertifikasi",
      ],
    },
    {
      stepNumber: "02",
      title: "Jadwalkan & Amankan dengan Escrow",
      description:
        "Pilih slot waktu pengerjaan dan mode kunjungan (Home Service atau Workshop). Biaya awal ditampung di Servio Escrow Protection — dana tidak pernah dicairkan ke teknisi sebelum pekerjaan Anda setujui.",
      icon: LockKey,
      color: "bg-blue-600 text-white",
      features: [
        "Pilihan jadwal slot kunjungan fleksibel (Pagi, Siang, Sore)",
        "Pembayaran aman via Virtual Account & QRIS otomatis",
        "Biaya survei terpotong otomatis jika penawaran perbaikan disetujui",
      ],
    },
    {
      stepNumber: "03",
      title: "Pengerjaan Teknisi Terstandar",
      description:
        "Pantau pergerakan teknisi via Live GPS Radar. Selama proses perbaikan, teknisi wajib mendokumentasikan foto kondisi awal (Before) dan hasil akhir (After) langsung ke sistem.",
      icon: Wrench,
      color: "bg-amber-600 text-white",
      features: [
        "Live tracking radius GPS teknisi ke alamat hunian",
        "Chat transaksional kontekstual terenkripsi berikat ID Pesanan",
        "Verifikasi foto Before & After dan checklist material pengganti",
      ],
    },
    {
      stepNumber: "04",
      title: "BAST Digital, Garansi & Selesai",
      description:
        "Konfirmasi penyelesaian dengan tanda tangan Berita Acara Serah Terima (BAST). Begitu selesai, sertifikat garansi digital langsung terbit otomatis di akun Anda.",
      icon: ShieldCheck,
      color: "bg-emerald-600 text-white",
      features: [
        "Penandatanganan digital Berita Acara Serah Terima (BAST)",
        "Sertifikat Garansi Resmi hingga 30-90 hari kalender",
        "Rating multi-dimensi (Ketepatan waktu, kebersihan, kerapian, komunikasi)",
      ],
    },
  ];

  return (
    <div className="space-y-12 pb-20">
      <PageHeader
        title="Cara Kerja Platform Servio"
        description="Pelajari bagaimana Servio menjamin mutu pengerjaan teknisi, transparansi tarif, dan keamanan dana pelanggan melalui standar operasional terintegrasi."
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Cara Kerja" },
        ]}
      />

      {/* Hero Explainer Card */}
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-sky/20 to-white shadow-servio-xs space-y-4 text-center max-w-3xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-sky border border-sky-200">
          Standar Operasional 4 Langkah
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-neutral-dark">
          Solusi Praktis untuk Segala Urusan Perawatan & Perbaikan
        </h2>
        <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
          Tidak perlu lagi ragu dengan teknisi abal-abal, biaya siluman, atau hasil kerja tanpa jaminan. Servio menghadirkan ekosistem jasa terkurasi dengan perlindungan garansi digital resmi.
        </p>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs flex flex-col justify-between space-y-6 hover:shadow-servio-md transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${s.color} shadow-servio-xs`}>
                    <Icon size={26} weight="bold" />
                  </div>
                  <span className="text-2xl font-black font-display text-slate-200 group-hover:text-primary/20 transition-colors">
                    {s.stepNumber}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-display text-neutral-dark">
                    {s.title}
                  </h3>
                  <p className="text-xs text-neutral-slate mt-1.5 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {s.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-neutral-dark">
                      <CheckCircle size={16} weight="fill" className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Protection & Escrow Guarantee Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-sky-200 bg-sky/30 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-primary text-white shadow-servio-xs shrink-0">
            <LockKey size={32} weight="fill" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg font-display text-neutral-dark">
              Jaminan 100% Servio Escrow Protection
            </h3>
            <p className="text-xs text-neutral-slate mt-0.5 leading-relaxed">
              Teknisi hanya menerima pembayaran setelah Anda memeriksa bukti kerja Before & After dan menandatangani Berita Acara Serah Terima (BAST).
            </p>
          </div>
        </div>

        <Link
          href="/services"
          className="shrink-0 px-6 py-3 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all flex items-center gap-2 shadow-servio-xs"
        >
          <span>Mulai Pesan Layanan</span>
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
