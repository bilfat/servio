"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Headset,
  Scales,
  ClockCountdown,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  ArrowRight,
  CurrencyCircleDollar,
  ChatCircleText,
  User,
  Users,
  Timer,
  Funnel,
  Sparkle,
  TrendUp,
  Fire,
} from "@phosphor-icons/react";
import { useSupportOperations } from "@/features/support/useSupportOperations";
import { Toast } from "@/components/feedback/Toast";

export default function SupportDashboardPage() {
  const {
    cases,
    openCases,
    inMediationCases,
    urgentCases,
    resolvedCases,
    totalEscrowHeld,
  } = useSupportOperations();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <div className="space-y-8 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Operations & Governance Control
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
              <ShieldCheck size={14} weight="fill" />
              Mediator Terakreditasi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Pusat Mediasi & Bantuan CS
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Pantau kecepatan respon SLA pertama, eskalasi sengketa pelanggan vs mitra, dan pengawasan pelepasan dana penampung escrow.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/support/cases"
            className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Scales size={16} weight="bold" />
            <span>Buka Antrean Kasus ({cases.length})</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Matrix (FRT, Open Cases, Escrow Held, CSAT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">First Response SLA</span>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Timer size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              4.2 Menit
            </span>
            <span className="text-xs font-bold text-emerald-600">Target &lt; 15m</span>
          </div>
          <p className="text-[11px] text-slate-400">98.4% kasus direspon tepat waktu</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sengketa Butuh Putusan</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Scales size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              {openCases.length + inMediationCases.length} Kasus
            </span>
            <span className="text-xs font-bold text-rose-600 flex items-center gap-0.5">
              <Fire size={13} weight="fill" />
              {urgentCases.length} Urgent
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Menunggu mediasi tripartite</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dana Escrow Tertahan</span>
            <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81]">
              <CurrencyCircleDollar size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-display text-slate-900">
              Rp {(totalEscrowHeld / 1000).toLocaleString("id-ID")}k
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Terkunci aman di rekening penampung</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">CSAT Kepuasan Mediasi</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkle size={18} weight="duotone" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              96.8%
            </span>
            <span className="text-xs font-bold text-emerald-600">+1.2% mo/mo</span>
          </div>
          <p className="text-[11px] text-slate-400">Berdasarkan 124 evaluasi bulan ini</p>
        </div>
      </div>

      {/* Urgent SLA Cases That Require Immediate Action */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              <Fire size={20} weight="fill" className="text-rose-600" />
              Sengketa Kritis Menjelang Batas SLA
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kasus dengan prioritas URGENT membutuhkan tanggapan mediator sebelum batas SLA berakhir.
            </p>
          </div>

          <Link
            href="/support/cases"
            className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Antrean</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.slice(0, 2).map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold font-mono text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      #{c.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      SLA: {c.slaRemaining}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold font-display text-slate-900 leading-snug">
                    {c.serviceTitle}
                  </h3>
                </div>

                <span className="text-xs font-bold text-slate-900 font-mono">
                  Rp {c.escrowAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Statement */}
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 line-clamp-2">
                <strong>Pelanggan:</strong> {c.customerStatement}
              </p>

              {/* Parties */}
              <div className="text-xs text-slate-500 space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span>Pelanggan: <strong className="text-slate-800">{c.customerName}</strong></span>
                  <span>Mitra: <strong className="text-slate-800">{c.providerName}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href={`/support/chat/${c.id}`}
                  className="text-xs font-bold text-teal-800 hover:text-teal-900 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 transition"
                >
                  <ChatCircleText size={15} weight="fill" className="text-teal-600" />
                  <span>Obrolan 3 Arah</span>
                </Link>

                <Link
                  href={`/support/cases/${c.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-2xs transition flex items-center gap-1"
                >
                  <span>Detail 360° & Putusan</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Case Resolution Workflow Guide */}
      <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-3">
        <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-2">
          <ShieldCheck size={18} weight="fill" className="text-[#0F4C81]" />
          Pedoman Mediasi Otoritas Servio (SOP CS #12 Dispute Mediation)
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          1. <strong>Karantina Escrow:</strong> Seluruh dana transaksi dibekukan secara otomatis saat komplain dibuka.<br />
          2. <strong>Audit Bukti 360°:</strong> Verifikasi foto Before vs After teknisi dan pembacaan multimeter.<br />
          3. <strong>Tripartite Dialogue:</strong> Beri batas waktu 24 jam bagi mitra untuk mengajukan solusi (Free Rework / Ganti Rugi).<br />
          4. <strong>Eksekusi Putusan:</strong> Putusan pengembalian dana (*Refund*) di-handoff otomatis ke Portal Finance.
        </p>
      </div>
    </div>
  );
}
