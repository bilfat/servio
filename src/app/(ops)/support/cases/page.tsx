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
} from "@phosphor-icons/react";
import { useSupportOperations, DisputePriority } from "@/features/support/useSupportOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { Toast } from "@/components/feedback/Toast";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function SupportCaseQueuePage() {
  const { cases, assignToMe, escalateCase } = useSupportOperations();
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("search", "");
  const [priorityFilter, setPriorityFilter] = useUrlQueryState<string>("priority", "ALL");
  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;

    return true;
  });

  const handleAssignToMe = (caseId: string) => {
    assignToMe(caseId);
    setToastMessage(`Kasus #${caseId} berhasil diambil alih dan ditugaskan ke Anda.`);
  };

  const handleEscalate = (caseId: string) => {
    escalateCase(caseId, "FINANCE");
    setToastMessage(`Kasus #${caseId} telah dieskalasi ke tim Finance untuk tindakan audit escrow.`);
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
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            Antrean Tiket Kasus
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Daftar Kasus Mediasi Sengketa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ambil alih tiket sengketa pelanggan vs mitra, lakukan investigasi 360°, dan terbitkan putusan resmi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            Total {cases.length} Tiket Masuk
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari ID tiket (#disp-901), nama pelanggan, atau nama mitra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          {/* Priority Quick Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
            {[
              { id: "ALL", label: "Semua Prioritas" },
              { id: "URGENT", label: "Urgent" },
              { id: "HIGH", label: "High" },
              { id: "MEDIUM", label: "Medium" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriorityFilter(p.id)}
                className={`px-3 py-2 rounded-xl transition whitespace-nowrap ${
                  priorityFilter === p.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Status:</span>
          {[
            { id: "ALL", label: "Semua Status" },
            { id: "OPEN", label: "Menunggu Mediator" },
            { id: "IN_MEDIATION", label: "Dalam Mediasi" },
            { id: "ESCALATED_FINANCE", label: "Eskalasi Finance" },
            { id: "RESOLVED", label: "Selesai Diputus" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap text-xs ${
                statusFilter === st.id
                  ? "bg-teal-100 text-teal-900 font-bold"
                  : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases List Cards or Empty State */}
      {filteredCases.length === 0 ? (
        <EmptyState
          icon={Scales}
          title="Tidak Ada Tiket Ditemukan"
          description={
            searchQuery || priorityFilter !== "ALL" || statusFilter !== "ALL"
              ? "Tidak ada tiket sengketa yang sesuai dengan kriteria filter saat ini."
              : "Semua tiket kasus dukungan telah terselesaikan atau belum ada tiket baru."
          }
          action={{
            label: "Reset Filter",
            onClick: () => {
              setSearchQuery("");
              setPriorityFilter("ALL");
              setStatusFilter("ALL");
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredCases.map((c) => {
            const isResolved = c.status === "RESOLVED";

            return (
              <div
                key={c.id}
                className={`bg-white rounded-3xl border p-6 shadow-sm space-y-4 transition ${
                  c.priority === "URGENT" && !isResolved
                    ? "border-rose-300 ring-1 ring-rose-200"
                    : "border-slate-200/80"
                }`}
              >
                {/* Top Row: IDs, Priority, SLA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                      #{c.id}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Order #{c.orderId}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.priority === "URGENT"
                          ? "bg-rose-100 text-rose-800"
                          : c.priority === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      PRIORITAS {c.priority}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        c.status === "RESOLVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : c.status === "IN_MEDIATION"
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : c.status === "ESCALATED_FINANCE"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {c.status === "RESOLVED"
                        ? "SELESAI"
                        : c.status === "IN_MEDIATION"
                        ? "DALAM MEDIASI"
                        : c.status === "ESCALATED_FINANCE"
                        ? "ESKALASI FINANCE"
                        : "MENUNGGU MEDIATOR"}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Clock size={14} />
                    <span>SLA Sisa: <strong className={c.priority === "URGENT" && !isResolved ? "text-rose-600" : "text-slate-800"}>{c.slaRemaining}</strong></span>
                  </div>
                </div>

                {/* Service & Problem Description */}
                <div>
                  <h2 className="text-base font-bold font-display text-slate-900 leading-snug">
                    {c.serviceTitle}
                  </h2>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 mt-2">
                    <strong className="text-slate-900 block mb-0.5">Keluhan Pelanggan:</strong>
                    {c.customerStatement}
                  </p>
                </div>

                {/* Parties and Escrow Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pelanggan:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <User size={14} className="text-sky-600" />
                      {c.customerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mitra Bengkel:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <Storefront size={14} className="text-indigo-600" />
                      {c.providerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Escrow Terkunci:</span>
                    <span className="font-bold text-emerald-700 font-mono mt-0.5 block">
                      Rp {c.escrowAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Assigned Mediator info */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>
                    Mediator:{" "}
                    <strong className={c.assignedTo ? "text-slate-800" : "text-amber-600 font-bold"}>
                      {c.assignedTo || "Belum Ditugaskan"}
                    </strong>
                  </span>

                  {c.decision && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      Putusan: {c.decision.type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!c.assignedTo && (
                      <button
                        type="button"
                        onClick={() => handleAssignToMe(c.id)}
                        className="px-3.5 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 text-xs font-bold transition flex items-center gap-1"
                      >
                        <UserPlus size={15} />
                        <span>Ambil Alih Kasus</span>
                      </button>
                    )}

                    {c.status !== "ESCALATED_FINANCE" && !isResolved && (
                      <button
                        type="button"
                        onClick={() => handleEscalate(c.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
                      >
                        Eskalasi ke Finance
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                      href={`/support/chat/${c.id}`}
                      className="px-3.5 py-2 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <ChatCircleText size={16} weight="fill" className="text-teal-600" />
                      <span>Chat 3 Pihak</span>
                    </Link>

                    <Link
                      href={`/support/cases/${c.id}`}
                      className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>Detail 360° & Putusan</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
