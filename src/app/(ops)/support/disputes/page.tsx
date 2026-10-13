"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scales,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  ChatCircleText,
  UserPlus,
  ArrowSquareOut,
  Fire,
  CheckCircle,
  CurrencyCircleDollar,
  Funnel,
  Clock,
  User,
  Storefront,
  Gavel,
} from "@phosphor-icons/react";
import { useSupportOperations } from "@/features/support/useSupportOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { Toast } from "@/components/feedback/Toast";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function SupportDisputesPage() {
  const { cases, inMediationCases, urgentCases, assignToMe, escalateCase } = useSupportOperations();
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("search", "");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Focus disputes on active mediation & urgent complaints
  const disputeCases = cases.filter(
    (c) => c.status === "IN_MEDIATION" || c.status === "OPEN" || c.priority === "URGENT"
  );

  const filteredDisputes = disputeCases.filter((c) => {
    const matches =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matches;
  });

  const handleAssignToMe = (caseId: string) => {
    assignToMe(caseId);
    setToastMessage(`Sengketa #${caseId} berhasil diambil alih untuk proses mediasi.`);
  };

  const handleEscalate = (caseId: string) => {
    escalateCase(caseId, "FINANCE");
    setToastMessage(`Sengketa #${caseId} telah dieskalasi ke tim Finance Ops untuk penahanan escrow.`);
  };

  return (
    <div className="space-y-6 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Dispute Resolution Chamber
            </span>
            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-200">
              <ShieldCheck size={14} weight="fill" />
              Mediasi Tripartite
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Mediasi Sengketa Pelanggan & Mitra
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Tangani klaim garansi bermasalah, selisih hasil pengerjaan servis, dan terbitkan putusan resmi untuk pelepasan atau pengembalian dana escrow.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/support/chat"
            className="px-4 py-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition flex items-center gap-1.5 border border-teal-200"
          >
            <ChatCircleText size={16} weight="bold" />
            <span>Chat Mediasi 3 Pihak</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="relative flex-1 w-full">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari nomor kasus, nama pelanggan, atau nama mitra bengkel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
          />
        </div>
      </div>

      {/* Disputes Cards List or Empty State */}
      {filteredDisputes.length === 0 ? (
        <EmptyState
          icon={Scales}
          title="Tidak Ada Kasus Sengketa"
          description={
            searchQuery
              ? "Tidak ada kasus sengketa yang cocok dengan kata kunci pencarian."
              : "Semua sengketa pelanggan dan mitra telah terselesaikan atau belum ada kasus baru."
          }
          action={{
            label: "Reset Pencarian",
            onClick: () => setSearchQuery(""),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDisputes.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 transition"
            >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono font-bold text-xs text-[#0F4C81] bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200">
                  #{c.id}
                </span>
                <span className="text-xs text-slate-400 font-mono">Order: {c.orderId}</span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    c.priority === "URGENT"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {c.priority} PRIORITY
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {c.status === "IN_MEDIATION" ? "SEDANG DIMEDIASI" : "MENUNGGU MEDIASI"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock size={14} />
                  SLA: {c.slaRemaining}
                </span>
              </div>
            </div>

            {/* Parties & Service Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Layanan Disengketakan:</span>
                <p className="font-bold text-slate-900 text-sm">{c.serviceTitle}</p>
                <p className="text-slate-500 text-[11px] capitalize">{c.category.replace(/_/g, " ").toLowerCase()}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Pihak Berperkara:</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <User size={13} className="text-sky-600" />
                    <span className="font-bold text-slate-800">{c.customerName}</span>
                    <span className="text-[10px] text-slate-400">(Pelanggan)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Storefront size={13} className="text-indigo-600" />
                    <span className="font-bold text-slate-800">{c.providerName}</span>
                    <span className="text-[10px] text-slate-400">(Mitra)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 md:border-l md:border-slate-100 md:pl-4">
                <span className="text-slate-400 font-semibold block">Dana Escrow Tertahan:</span>
                <div className="text-xl font-bold font-mono text-emerald-600">
                  Rp {c.escrowAmount.toLocaleString("id-ID")}
                </div>
                <p className="text-[11px] text-slate-500">
                  Garansi aktif: <strong>{c.warrantyActiveDays} hari</strong>
                </p>
              </div>
            </div>

            {/* Statements & Claims Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <span className="font-bold text-slate-700 block">Pernyataan Komplain Pelanggan:</span>
              <p className="text-slate-600 leading-relaxed italic text-[11px]">
                &ldquo;{c.customerStatement}&rdquo;
              </p>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                Mediator:{" "}
                <strong className="text-slate-800">
                  {c.assignedTo || "Belum ditugaskan"}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                {!c.assignedTo && (
                  <button
                    type="button"
                    onClick={() => handleAssignToMe(c.id)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                  >
                    <UserPlus size={15} />
                    <span>Ambil Alih Kasus</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleEscalate(c.id)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <WarningCircle size={15} />
                  <span>Eskalasi ke Finance</span>
                </button>

                <Link
                  href={`/support/chat/${c.id}`}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <ChatCircleText size={15} />
                  <span>Chat 3 Arah</span>
                </Link>

                <Link
                  href={`/support/cases/${c.id}`}
                  className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Gavel size={15} weight="bold" />
                  <span>Investigasi & Putusan 360°</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
