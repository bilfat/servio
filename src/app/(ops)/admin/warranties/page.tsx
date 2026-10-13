"use client";

import React, { useState } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  ShieldCheck,
  MagnifyingGlass,
  CheckCircle,
  Eye,
  WarningCircle,
  FileText,
  Clock,
  Scales,
  ArrowRight,
  ShieldWarning,
  Hourglass,
  ChatCircleText,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WarrantyClaimV1 } from "@/types/domain";

type AdminWarrantyTab = "ALL_OPEN" | "AGING" | "SLA_RISK" | "ESCALATED";

export default function AdminWarrantiesPage() {
  const repo = useDomainRepository();
  const { user } = useAdminOperations();

  const monitoring = repo.getAdminWarrantyMonitoring();
  const [activeTab, setActiveTab] = useState<AdminWarrantyTab>("ALL_OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaimV1 | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [escalationNotes, setEscalationNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const now = Date.now();

  const getFilteredClaims = () => {
    let list: WarrantyClaimV1[] = [];
    if (activeTab === "ALL_OPEN") {
      list = monitoring.activeClaims;
    } else if (activeTab === "AGING") {
      list = monitoring.agingClaims;
    } else if (activeTab === "SLA_RISK") {
      list = monitoring.slaRiskClaims;
    } else {
      list = monitoring.escalatedClaims;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => {
      const war = repo.getWarrantyV1(c.warrantyId);
      return (
        c.claimNumber.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q) ||
        (war?.customerName || "").toLowerCase().includes(q) ||
        (war?.providerName || "").toLowerCase().includes(q) ||
        (war?.serviceTitle || "").toLowerCase().includes(q)
      );
    });
  };

  const displayedClaims = getFilteredClaims();

  const handleEscalateClaim = (claim: WarrantyClaimV1) => {
    const war = repo.getWarrantyV1(claim.warrantyId);
    repo.logAuditEvent({
      actorId: user.id || "admin-01",
      actorName: user.name || "Admin Operations",
      actorRole: "ADMIN_OPERATIONS",
      action: "WARRANTY_CLAIM_ESCALATED",
      resource: "WarrantyClaimV1",
      resourceId: claim.id,
      result: "SUCCESS",
      metadata: { claimNumber: claim.claimNumber, notes: escalationNotes || "Admin escalated SLA warning to Provider." },
    });

    if (war) {
      repo.sendNotification({
        recipientRole: "SERVICE_PROVIDER",
        recipientId: war.providerId,
        title: "Peringatan SLA Garansi dari Admin",
        message: `Admin memberikan eskalasi prioritas untuk klaim #${claim.claimNumber}. Mohon segera ditindaklanjuti.`,
        link: "/provider/warranty",
      });
    }

    setToastMessage(`Klaim #${claim.claimNumber} berhasil dieskalasi ke Provider.`);
    setIsDetailModalOpen(false);
    setEscalationNotes("");
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 text-left font-body pb-20">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle size={20} weight="bold" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Operasional &amp; Kepatuhan
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
            Monitoring Klaim Garansi Platform (SLA &amp; Eskalasi)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pusat pengawasan SLA, penanganan klaim aging, dan mediasi sengketa pelanggan. Wewenang keputusan penjaminan tetap berada pada Mitra Provider.
          </p>
        </div>
      </div>

      {/* Monitoring Summary KPI Cards (Section 64 & GAP 06) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("ALL_OPEN")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === "ALL_OPEN"
              ? "bg-sky-50 border-[#0F4C81] ring-2 ring-[#0F4C81]/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Total Klaim Terbuka</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0F4C81] flex items-center justify-center">
              <Hourglass size={18} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-black font-display text-slate-900 mt-2">
            {monitoring.openClaimsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sedang dalam penanganan mitra</p>
        </div>

        <div
          onClick={() => setActiveTab("AGING")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === "AGING"
              ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Klaim Aging (&ge;72 Jam)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <WarningCircle size={18} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-black font-display text-rose-900 mt-2">
            {monitoring.agingClaimsCount}
          </p>
          <p className="text-[11px] text-rose-600 font-medium mt-1">Melebihi batas toleransi SLA</p>
        </div>

        <div
          onClick={() => setActiveTab("SLA_RISK")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === "SLA_RISK"
              ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Risiko SLA (48-72 Jam)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock size={18} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-black font-display text-amber-900 mt-2">
            {monitoring.slaRiskCount}
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Memerlukan atensi segera</p>
        </div>

        <div
          onClick={() => setActiveTab("ESCALATED")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === "ESCALATED"
              ? "bg-purple-50 border-purple-600 ring-2 ring-purple-600/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Sengketa Garansi</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Scales size={18} weight="bold" />
            </div>
          </div>
          <p className="text-2xl font-black font-display text-purple-900 mt-2">
            {monitoring.escalatedCount}
          </p>
          <p className="text-[11px] text-purple-600 font-medium mt-1">Mediasi pelanggan &amp; mitra</p>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor klaim, pelanggan, layanan..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {(
              [
                { id: "ALL_OPEN", label: "Semua Terbuka", count: monitoring.openClaimsCount },
                { id: "AGING", label: "Aging (&ge;72 Jam)", count: monitoring.agingClaimsCount },
                { id: "SLA_RISK", label: "Risiko SLA", count: monitoring.slaRiskCount },
                { id: "ESCALATED", label: "Sengketa", count: monitoring.escalatedCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Claims List Table / Cards */}
      {displayedClaims.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <CheckCircle size={36} className="mx-auto text-emerald-500 mb-2" weight="duotone" />
          <p className="font-bold text-slate-700 text-sm">Tidak ada klaim garansi pada kategori ini.</p>
          <p className="text-[11px] text-slate-400 mt-1">Seluruh klaim terpantau memenuhi standar SLA operasional.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {displayedClaims.map((claim) => {
            const war = repo.getWarrantyV1(claim.warrantyId);
            const ageHours = Math.round((now - new Date(claim.submittedAt).getTime()) / (1000 * 3600));
            const isAging = ageHours >= 72;
            const isRisk = ageHours >= 48 && ageHours < 72;

            return (
              <div
                key={claim.id}
                className={`p-4 rounded-2xl bg-white border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                  claim.status === "DISPUTED"
                    ? "border-purple-300 bg-purple-50/20"
                    : isAging
                    ? "border-rose-300 bg-rose-50/20"
                    : isRisk
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-xs text-slate-900">{claim.claimNumber}</span>
                    <span className="text-[11px] font-bold text-slate-500">
                      ID Garansi: {claim.warrantyId}
                    </span>
                    {claim.status === "DISPUTED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                        <Scales size={12} weight="fill" />
                        Sengketa Pelanggan
                      </span>
                    ) : isAging ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <WarningCircle size={12} weight="fill" />
                        SLA Terlambat ({ageHours} Jam)
                      </span>
                    ) : isRisk ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <Clock size={12} weight="fill" />
                        Risiko SLA ({ageHours} Jam)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {ageHours} Jam Lalu
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-slate-900 text-xs">{claim.reason}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{claim.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
                    <span>
                      Pelanggan: <strong className="text-slate-800">{war?.customerName || "Pelanggan"}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Mitra: <strong className="text-slate-800">{war?.providerName || "Mitra Servio"}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Layanan: <strong className="text-slate-800">{war?.serviceTitle || "Servis"}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Status Saat Ini: <strong className="text-primary font-bold">{claim.status}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedClaim(claim);
                      setIsDetailModalOpen(true);
                    }}
                    className="text-xs font-bold flex items-center gap-1"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Investigasi</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEscalateClaim(claim)}
                    className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
                  >
                    <ShieldWarning size={14} weight="bold" />
                    <span>Eskalasi ke Mitra</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Investigation Modal */}
      {isDetailModalOpen && selectedClaim && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Investigasi Klaim Garansi: ${selectedClaim.claimNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-body text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Detail Status Klaim</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] text-[10px]">
                  {selectedClaim.status}
                </span>
              </div>
              <p className="text-slate-700">
                <strong>Keluhan:</strong> {selectedClaim.reason}
              </p>
              <p className="text-slate-600">
                <strong>Deskripsi:</strong> {selectedClaim.description}
              </p>
              <p className="text-slate-500 text-[11px]">
                Waktu Pengajuan: {new Date(selectedClaim.submittedAt).toLocaleString("id-ID")}
              </p>
              {selectedClaim.rejectionReason && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 mt-2">
                  <p className="font-bold text-[11px]">Catatan Penolakan Provider:</p>
                  <p className="text-[11px] mt-0.5">{selectedClaim.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Evidence photos */}
            {selectedClaim.evidence && selectedClaim.evidence.length > 0 && (
              <div>
                <p className="font-bold text-slate-800 mb-2">Foto / Bukti Kerusakan</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedClaim.evidence.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Bukti ${idx + 1}`}
                      className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Escalation Notes */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">Catatan Mediasi / Instruksi Eskalasi</label>
              <textarea
                rows={3}
                value={escalationNotes}
                onChange={(e) => setEscalationNotes(e.target.value)}
                placeholder="Tuliskan catatan arahan admin untuk investigasi atau eskalasi SLA..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
              <WarningCircle size={18} className="shrink-0" weight="fill" />
              <span>
                Admin tidak berhak mengubah coverage secara sepihak. Seluruh tindakan dicatat di audit log platform.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleEscalateClaim(selectedClaim)}
                className="flex items-center gap-1"
              >
                <ShieldWarning size={14} weight="bold" />
                <span>Kirim Eskalasi Prioritas</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
