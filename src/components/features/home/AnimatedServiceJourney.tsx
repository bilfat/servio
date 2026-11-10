"use client";

import React from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  ClipboardText,
  GearSix,
  ShieldCheck,
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react";

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Pilih Jasa / Konsultasi",
    desc: "Cari teknisi spesialis, beli suku cadang resmi, atau uji diagnosa gejala kerusakan ke Asisten AI Servio.",
    highlight: "Order / Konsultasi Bebas",
    badgeBg: "bg-sky-100 text-primary",
    iconBgClass: "bg-primary text-white",
    Icon: MagnifyingGlass,
  },
  {
    step: "02",
    title: "Survei & Setujui Biaya",
    desc: "Teknisi cek ke lokasi & kirim rincian estimasi biaya transparan. Anda bebas Setujui atau Tolak.",
    highlight: "Persetujuan Mutlak Anda",
    badgeBg: "bg-amber-100 text-amber-800",
    iconBgClass: "bg-amber-500 text-white",
    Icon: ClipboardText,
  },
  {
    step: "03",
    title: "Pengerjaan & Bukti Foto",
    desc: "Pantau pengerjaan sesuai standar SOP. Teknisi wajib unggah dokumentasi foto sebelum dan sesudah kerja.",
    highlight: "Foto Before–After Nyata",
    badgeBg: "bg-rose-100 text-rose-700",
    iconBgClass: "bg-secondary text-white",
    Icon: GearSix,
  },
  {
    step: "04",
    title: "Escrow Cair & Garansi",
    desc: "Dana ditahan aman di rekening bersama sampai Anda konfirmasi tuntas, lalu otomatis terbit Garansi Digital.",
    highlight: "Proteksi Escrow & Garansi",
    badgeBg: "bg-emerald-100 text-emerald-800",
    iconBgClass: "bg-emerald-600 text-white",
    Icon: ShieldCheck,
  },
];

/**
 * Alur kerja 4 langkah ringkas, rapih, dan airy di atas kanvas putih.
 */
export function AnimatedServiceJourney() {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-heading">
            Standar Pengerjaan Aman
          </span>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-display font-extrabold text-neutral-dark mt-0.5">
            Kenapa Servis &amp; Belanja di Servio Terasa Aman?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5 max-w-2xl">
            Sistem Rekening Bersama (Escrow), persetujuan rincian biaya tanpa biaya siluman, dan verifikasi foto hasil pengerjaan nyata.
          </p>
        </div>

        <Link
          href="/how-it-works"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark bg-sky-50 hover:bg-sky-100 px-3.5 py-1.5 rounded-xl border border-sky-200 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>Detail Cara Kerja</span>
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>

      {/* Track 4 Langkah Terhubung Ringan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {JOURNEY_STEPS.map((item, idx) => {
          const StepIcon = item.Icon;
          return (
            <div
              key={item.step}
              className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-primary/40 p-4 transition-all duration-200 flex flex-col justify-between group shadow-2xs hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${item.iconBgClass} flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    <StepIcon size={20} weight="duotone" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-primary transition-colors">
                      Tahap {idx + 1}
                    </span>
                  </div>
                </div>

                <h3 className="font-display font-bold text-sm text-neutral-dark group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-slate leading-relaxed mt-1">
                  {item.desc}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${item.badgeBg}`}
                >
                  <CheckCircle size={11} weight="fill" />
                  <span>{item.highlight}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
