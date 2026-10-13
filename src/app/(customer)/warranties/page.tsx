"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  ClockCountdown,
  ArrowRight,
  CheckCircle,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  ShieldPlus,
  Clock,
  WarningCircle,
  FileText,
  Wrench,
  User,
  Camera,
  Check,
  X,
  Plus,
  Package,
} from "@phosphor-icons/react";
import { useWarranties } from "@/features/warranties/useWarranties";
import { CustomerDemoScenarioSelector } from "@/components/navigation/CustomerDemoScenarioSelector";
import { WarrantyV1, WarrantyClaimV1 } from "@/types/domain";
import { CustomerProductWarrantyView } from "@/components/features/products/CustomerProductWarrantyView";

function CustomerWarrantiesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get("domain")?.toUpperCase();
  const [warrantyDomain, setWarrantyDomain] = useState<"PRODUCT" | "SERVICE">(
    domainParam === "SERVICE" ? "SERVICE" : "PRODUCT"
  );

  useEffect(() => {
    if (domainParam === "SERVICE" || domainParam === "PRODUCT") {
      setWarrantyDomain(domainParam);
    }
  }, [domainParam]);
  const {
    warrantiesV1,
    claimsV1,
    paidWorkProposalsV1,
    assignmentsV1,
    diagnosesV1,
    submitWarrantyClaim,
    customerRespondPaidWorkProposal,
    isWarrantyActive,
  } = useWarranties();

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3 Simplified Customer Tabs (Spec: [Aktif] [Menggunakan Garansi] [Garansi Habis])
  type CustomerTab = "ACTIVE" | "IN_USE" | "EXPIRED";
  const [activeTab, setActiveTab] = useState<CustomerTab>("ACTIVE");

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarrantyForClaim, setSelectedWarrantyForClaim] = useState<WarrantyV1 | null>(null);
  const [claimReason, setClaimReason] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [issueOccurredAt, setIssueOccurredAt] = useState(new Date().toISOString().split("T")[0]);
  const [claimEvidence, setClaimEvidence] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [claimNotes, setClaimNotes] = useState("");

  const customerId = "cust-01"; // Canonical default customer

  const customerWarranties = warrantiesV1.filter(
    (w) => w.customerId === customerId || w.customerId === "usr-cust-001"
  );

  // Helper to find active claim for a warranty
  const getActiveClaimForWarranty = (warId: string): WarrantyClaimV1 | undefined => {
    return claimsV1.find(
      (c) => c.warrantyId === warId && c.status !== "RESOLVED" && c.status !== "REJECTED"
    );
  };

  // Helper to check if warranty is expired
  const checkIsExpired = (w: WarrantyV1): boolean => {
    if (w.status === "EXPIRED") return true;
    if (w.status === "PENDING_ACTIVATION") return false;
    return !isWarrantyActive(w.id);
  };

  // Tab 1: AKTIF — Warranty masih berlaku (atau pending) dan BELUM sedang diproses dalam claim aktif
  const tabAktifWarranties = customerWarranties.filter((w) => {
    const hasActiveClaim = !!getActiveClaimForWarranty(w.id);
    const expired = checkIsExpired(w);
    return !hasActiveClaim && !expired;
  });

  // Tab 2: MENGGUNAKAN GARANSI — Warranty sedang memiliki active claim
  const tabMenggunakanGaransiWarranties = customerWarranties.filter((w) => {
    const hasActiveClaim = !!getActiveClaimForWarranty(w.id);
    return hasActiveClaim;
  });

  // Tab 3: GARANSI HABIS — Warranty yang sudah expired dan tidak memiliki claim aktif berjalan
  const tabGaransiHabisWarranties = customerWarranties.filter((w) => {
    const hasActiveClaim = !!getActiveClaimForWarranty(w.id);
    const expired = checkIsExpired(w);
    return expired && !hasActiveClaim;
  });

  // Pending Paid Work Proposals for this customer
  const pendingProposals = paidWorkProposalsV1.filter(
    (p) =>
      (p.customerId === customerId || p.customerId === "usr-cust-001") &&
      p.status === "PROPOSAL_SENT"
  );

  const handleOpenClaimModal = (war?: WarrantyV1) => {
    const targetWar = war || tabAktifWarranties[0];
    if (!targetWar) {
      alert("Tidak ada garansi aktif yang memenuhi syarat untuk klaim.");
      return;
    }
    if (targetWar.status === "PENDING_ACTIVATION") {
      alert("Garansi ini masih menunggu aktivasi dari Mitra Provider.");
      return;
    }
    setSelectedWarrantyForClaim(targetWar);
    setClaimReason("AC kembali tidak dingin");
    setClaimDescription("");
    setClaimNotes("");
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarrantyForClaim) return;
    if (!claimReason.trim() || !claimDescription.trim()) {
      alert("Harap lengkapi masalah dan ceritakan kendala.");
      return;
    }

    try {
      submitWarrantyClaim(customerId, selectedWarrantyForClaim.id, {
        reason: claimReason.trim(),
        description: claimNotes.trim()
          ? `${claimDescription.trim()} (Catatan: ${claimNotes.trim()})`
          : claimDescription.trim(),
        issueOccurredAt,
        evidence: claimEvidence,
      });

      setIsClaimModalOpen(false);
      setToastMessage(
        `Klaim garansi berhasil dikirimkan! Status garansi berpindah ke tab 'Menggunakan Garansi'.`
      );
      // Automatically switch to Tab 2: Menggunakan Garansi
      setActiveTab("IN_USE");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan klaim garansi.");
    }
  };

  const handleApproveProposal = (proposalId: string) => {
    try {
      const res = customerRespondPaidWorkProposal(customerId, proposalId, true);
      setToastMessage(
        `Pekerjaan berbayar disetujui! Order baru #${res.newOrder?.id || ""} telah diterbitkan.`
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal menyetujui penawaran.");
    }
  };

  const handleRejectProposal = (proposalId: string) => {
    try {
      customerRespondPaidWorkProposal(
        customerId,
        proposalId,
        false,
        "Pelanggan menolak penawaran tambahan."
      );
      setToastMessage("Penawaran pekerjaan berbayar ditolak. Pekerjaan dihentikan dengan aman.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal menolak penawaran.");
    }
  };

  // Filter current displayed list by search query
  const getFilteredList = () => {
    const q = searchQuery.toLowerCase();
    let currentList: WarrantyV1[] = [];

    if (activeTab === "ACTIVE") currentList = tabAktifWarranties;
    else if (activeTab === "IN_USE") currentList = tabMenggunakanGaransiWarranties;
    else currentList = tabGaransiHabisWarranties;

    if (!q) return currentList;

    return currentList.filter(
      (w) =>
        (w.serviceTitle || "").toLowerCase().includes(q) ||
        (w.providerName || "").toLowerCase().includes(q) ||
        w.id.toLowerCase().includes(q) ||
        (w.originalWorkerName || "").toLowerCase().includes(q)
    );
  };

  const displayedWarranties = getFilteredList();

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const getRemainingDays = (w: WarrantyV1): number => {
    if (w.status === "PENDING_ACTIVATION") return w.durationDaysSnapshot;
    if (!w.expiresAt) return 0;
    const diff = new Date(w.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Helper to determine customer-safe simplified status in Tab 2
  const getInUseStatusSummary = (
    claim: WarrantyClaimV1,
    asg?: (typeof assignmentsV1)[0],
    dx?: (typeof diagnosesV1)[0],
    proposal?: (typeof paidWorkProposalsV1)[0]
  ) => {
    if (proposal && proposal.status === "PROPOSAL_SENT") {
      return {
        badge: "MENUNGGU PERSETUJUAN ANDA",
        badgeClass: "bg-amber-500 text-white",
        label: "Pekerjaan di Luar Garansi Ditawarkan",
        stepIndex: 6,
      };
    }
    if (
      claim.status === "REPAIR_APPROVED" ||
      claim.status === "REPAIR_SCHEDULED" ||
      claim.status === "REPAIR_IN_PROGRESS"
    ) {
      return {
        badge: "PERBAIKAN GARANSI",
        badgeClass: "bg-emerald-600 text-white",
        label: "Perbaikan Garansi Berlangsung",
        stepIndex: 6,
      };
    }
    if (dx || claim.status === "WAITING_PROVIDER_DECISION") {
      return {
        badge: "HASIL PEMERIKSAAN",
        badgeClass: "bg-purple-600 text-white",
        label: "Diagnosis Diserahkan ke Provider",
        stepIndex: 5,
      };
    }
    if (asg?.checkInAt) {
      return {
        badge: "PEMERIKSAAN",
        badgeClass: "bg-sky-600 text-white",
        label: "Teknisi Tiba di Lokasi & Memeriksa Unit",
        stepIndex: 4,
      };
    }
    if (asg?.otwAt) {
      return {
        badge: "TEKNISI OTW",
        badgeClass: "bg-sky-500 text-white",
        label: "Teknisi Sedang Menuju Lokasi Anda",
        stepIndex: 4,
      };
    }
    if (asg || claim.status === "INSPECTION_SCHEDULED") {
      return {
        badge: "TEKNISI SUDAH DIJADWALKAN",
        badgeClass: "bg-indigo-600 text-white",
        label: "Jadwal Pemeriksaan Telah Ditetapkan",
        stepIndex: 3,
      };
    }
    return {
      badge: "MENUNGGU PERSETUJUAN PROVIDER",
      badgeClass: "bg-slate-700 text-white",
      label: "Pengajuan Klaim Sedang Ditinjau Provider",
      stepIndex: 1,
    };
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Dev / Demo Scenario Selector Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-4">
        <CustomerDemoScenarioSelector onSelectScenario={(id) => router.push(`/orders/${id}`)} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark">
            Garansi & Perlindungan Resmi
          </h1>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
            Pusat pemantauan masa berlaku garansi suku cadang, produk resmi, dan jaminan perbaikan jasa SERVIO.
          </p>
        </div>

        {warrantyDomain === "SERVICE" && tabAktifWarranties.length > 0 && (
          <button
            type="button"
            onClick={() => handleOpenClaimModal()}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs shrink-0"
          >
            <ShieldPlus size={16} weight="bold" />
            <span>Ajukan Klaim Baru</span>
          </button>
        )}
      </div>

      {/* Top Nav: Pesanan vs Garansi */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <Link
          href="/orders"
          className="px-4 py-2 border-b-2 border-transparent text-neutral-slate hover:text-neutral-dark transition"
        >
          Pesanan
        </Link>
        <span className="px-4 py-2 border-b-2 border-primary text-primary">
          Garansi
        </span>
      </div>

      {/* Domain Switcher: Produk vs Jasa */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setWarrantyDomain("PRODUCT")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            warrantyDomain === "PRODUCT"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package size={16} weight="bold" />
          <span>Garansi Suku Cadang & Produk</span>
        </button>
        <button
          type="button"
          onClick={() => setWarrantyDomain("SERVICE")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            warrantyDomain === "SERVICE"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={16} weight="bold" />
          <span>Garansi Jasa & Layanan Servis</span>
        </button>
      </div>

      {warrantyDomain === "PRODUCT" ? (
        <CustomerProductWarrantyView />
      ) : (
        <>

      {/* Search & 3 SIMPLIFIED CUSTOMER TABS */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-muted">
            <MagnifyingGlass size={16} weight="bold" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari garansi (#WAR-...), nama layanan, atau mitra provider..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100 border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
          />
        </div>

        {/* 3 CUSTOMER TABS: [Aktif] [Menggunakan Garansi] [Garansi Habis] */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
          {[
            {
              key: "ACTIVE" as const,
              label: "Aktif",
              count: tabAktifWarranties.length,
              description: "Garansi berlaku yang siap digunakan",
            },
            {
              key: "IN_USE" as const,
              label: "Menggunakan Garansi",
              count: tabMenggunakanGaransiWarranties.length,
              description: "Sedang dalam proses klaim aktif",
            },
            {
              key: "EXPIRED" as const,
              label: "Garansi Habis",
              count: tabGaransiHabisWarranties.length,
              description: "Masa garansi telah kedaluwarsa",
            },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? "bg-primary text-white shadow-servio-xs"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <SealCheck size={22} weight="fill" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-950">
              Proteksi Pelanggan Resmi SERVIO
            </p>
            <p className="text-[11px] text-emerald-800">
              Semua pengerjaan dilindungi garansi mutu. Jika kendala kembali terulang, teknisi siap datang kembali.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <span className="text-xs font-semibold text-emerald-900">Garansi Siap Pakai:</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            {tabAktifWarranties.filter((w) => w.status === "ACTIVE").length} Layanan
          </span>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle size={20} weight="fill" className="text-emerald-300" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* PROPOSAL BERBAYAR BANNER (Jika sedang di Tab Menggunakan Garansi atau Aktif) */}
      {pendingProposals.length > 0 && activeTab === "IN_USE" && (
        <div className="space-y-4">
          {pendingProposals.map((proposal) => {
            const claim = claimsV1.find((c) => c.id === proposal.warrantyClaimId);
            const war = claim ? warrantiesV1.find((w) => w.id === claim.warrantyId) : null;
            return (
              <div
                key={proposal.id}
                className="p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-400 shadow-md space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                      PEKERJAAN DI LUAR GARANSI — MENUNGGU PERSETUJUAN
                    </span>
                    <h2 className="text-base font-bold text-slate-900 font-display mt-2">
                      {proposal.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Layanan Terkait: <strong className="text-slate-800">{war?.serviceTitle || "Layanan Servis"}</strong> ({war?.providerName})
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-500 block">Total Biaya Tambahan:</span>
                    <p className="text-xl font-black text-emerald-800 font-display">
                      Rp {proposal.totalAmount.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-2xl border border-amber-200/60">
                    <span className="font-bold text-slate-900 block mb-0.5">Alasan di Luar Garansi:</span>
                    <p className="text-slate-700 leading-relaxed">{proposal.reasonOutsideWarranty}</p>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-amber-200/60">
                    <span className="font-bold text-slate-900 block mb-0.5">Ruang Lingkup Pengerjaan:</span>
                    <p className="text-slate-700 leading-relaxed">{proposal.scope}</p>
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-2xl border border-amber-100 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">Rincian Biaya:</span>
                  {proposal.lineItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600">
                      <span>
                        {item.description} ({item.quantity}x)
                      </span>
                      <strong className="text-slate-900">Rp {item.total.toLocaleString("id-ID")}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                    <span>Biaya Layanan Aplikasi</span>
                    <span>Rp {proposal.fees.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApproveProposal(proposal.id)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>Setujui &amp; Lanjutkan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectProposal(proposal.id)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition"
                  >
                    Tolak
                  </button>
                  {war && (
                    <Link
                      href={`/warranties/${war.id}`}
                      className="ml-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition flex items-center gap-1.5"
                    >
                      <span>Lihat Rincian Garansi</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENT LIST BERDASARKAN 3 TAB */}
      <div className="space-y-4">
        {displayedWarranties.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-2">
            <ShieldCheck size={48} className="mx-auto text-slate-300" />
            <h3 className="text-sm font-bold text-slate-700 font-display">
              {activeTab === "ACTIVE" && "Tidak ada garansi aktif yang belum digunakan."}
              {activeTab === "IN_USE" && "Tidak ada garansi yang sedang dalam proses klaim."}
              {activeTab === "EXPIRED" && "Tidak ada garansi yang telah kedaluwarsa."}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === "ACTIVE" &&
                "Garansi baru akan otomatis muncul di sini setelah pesanan servis Anda selesai dikonfirmasi."}
              {activeTab === "IN_USE" &&
                "Saat Anda mengajukan klaim perbaikan garansi, status dan jadwal teknisi akan tampil di tab ini."}
              {activeTab === "EXPIRED" &&
                "Semua arsip masa garansi yang telah lewat akan tersimpan dengan aman di halaman ini."}
            </p>
          </div>
        ) : activeTab === "ACTIVE" ? (
          /* ========================================================================= */
          /* TAB 1: AKTIF — Warranty yang masih berlaku dan belum memiliki claim aktif   */
          /* Card sesuai spesifikasi: Header, Service, Provider, WarID, Masa, Sisa, CTA  */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedWarranties.map((w) => {
              const isPending = w.status === "PENDING_ACTIVATION";
              const remainingDays = getRemainingDays(w);

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-slate-300 hover:shadow-md transition"
                >
                  <div className="space-y-4">
                    {/* Header Card: GARANSI AKTIF ● AKTIF */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        {isPending ? "GARANSI MENUNGGU" : "GARANSI AKTIF"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isPending
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPending ? "bg-amber-600" : "bg-emerald-600"
                          }`}
                        />
                        <span>{isPending ? "MENUNGGU AKTIVASI" : "AKTIF"}</span>
                      </span>
                    </div>

                    {/* Layanan & Provider */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display line-clamp-2">
                        {w.serviceTitle}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-1">
                        {w.providerName}
                      </p>
                    </div>

                    {/* Meta Info Grid */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Warranty ID
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {w.id}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Masa Garansi
                        </span>
                        <span className="font-semibold text-slate-700">
                          {isPending
                            ? `Durasi ${w.durationDaysSnapshot} Hari (Menunggu Aktivasi Mitra)`
                            : `${formatDate(w.startedAt)} – ${formatDate(w.expiresAt)}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-950">
                          Sisa Garansi
                        </span>
                        <span className="text-xs font-extrabold text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                          {isPending ? `${w.durationDaysSnapshot} Hari Snapshot` : `${remainingDays} Hari`}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Layanan
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          {w.serviceTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: [Lihat Detail] and [Ajukan Garansi] */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/warranties/${w.id}`}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition text-center flex items-center justify-center gap-1"
                    >
                      <span>Lihat Detail</span>
                    </Link>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleOpenClaimModal(w)}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition text-center flex items-center justify-center gap-1 shadow-xs ${
                        isPending
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                      title={
                        isPending
                          ? "Garansi masih menunggu aktivasi provider setelah pengerjaan selesai"
                          : "Ajukan klaim perbaikan garansi"
                      }
                    >
                      <ShieldPlus size={15} weight="bold" />
                      <span>Ajukan Garansi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeTab === "IN_USE" ? (
          /* ========================================================================= */
          /* TAB 2: MENGGUNAKAN GARANSI — Warranty dengan claim yang sedang berjalan   */
          /* Card sesuai spesifikasi #12: Service, Provider, WarID, KlaimID, Status,    */
          /* Worker, Jadwal, Progress checklist, [Lihat Penanganan]                    */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedWarranties.map((w) => {
              const activeClaim = getActiveClaimForWarranty(w.id);
              if (!activeClaim) return null;

              const asg = assignmentsV1.find((a) => a.warrantyClaimId === activeClaim.id);
              const dx = diagnosesV1.find((d) => d.warrantyClaimId === activeClaim.id);
              const proposal = paidWorkProposalsV1.find(
                (p) => p.warrantyClaimId === activeClaim.id
              );

              const statusInfo = getInUseStatusSummary(activeClaim, asg, dx, proposal);

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-3xl border-2 border-sky-300 p-6 shadow-sm flex flex-col justify-between space-y-5 hover:shadow-md transition"
                >
                  <div className="space-y-4">
                    {/* Header Card: GARANSI DIGUNAKAN */}
                    <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-950">
                        GARANSI SEDANG DIGUNAKAN
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.badge}
                      </span>
                    </div>

                    {/* Layanan & Provider */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        {w.serviceTitle}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        {w.providerName}
                      </p>
                    </div>

                    {/* ID Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Warranty ID
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {w.id}
                        </span>
                      </div>
                      <div className="p-2.5 bg-sky-50/80 rounded-xl border border-sky-100">
                        <span className="text-[10px] uppercase font-bold text-sky-700 block tracking-wider">
                          Nomor Klaim
                        </span>
                        <span className="font-mono font-bold text-sky-900">
                          #{activeClaim.claimNumber}
                        </span>
                      </div>
                    </div>

                    {/* Worker & Jadwal */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-[#0F4C81]" weight="bold" />
                          <span className="text-slate-500">Teknisi:</span>
                        </div>
                        <strong className="text-slate-900">
                          {asg?.workerName || "Menunggu Penugasan Teknisi"}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={16} className="text-emerald-700" weight="bold" />
                          <span className="text-slate-500">Jadwal:</span>
                        </div>
                        <strong className="text-slate-900">
                          {asg
                            ? `${asg.scheduledDate} • ${asg.scheduledStartTime}`
                            : "Belum Ditetapkan"}
                        </strong>
                      </div>

                      {asg?.otwAt && !asg.checkInAt && (
                        <div className="p-2 bg-sky-100/80 rounded-xl text-[11px] text-sky-900 flex items-center gap-2 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
                          <span>Teknisi sedang dalam perjalanan menuju lokasi Anda</span>
                        </div>
                      )}

                      {asg?.checkInAt && (
                        <div className="p-2 bg-emerald-100/80 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2 font-semibold">
                          <CheckCircle size={15} weight="fill" className="text-emerald-700" />
                          <span>Teknisi telah tiba di lokasi dan sedang memeriksa unit</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Checklist (8 Langkah Human-Readable) */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Progress Penanganan Klaim
                      </span>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {[
                          { label: "Pengajuan", done: true },
                          { label: "Disetujui Provider", done: activeClaim.status !== "SUBMITTED" },
                          { label: "Worker Ditugaskan", done: !!asg },
                          { label: "Jadwal Pemeriksaan", done: !!asg?.scheduledDate },
                          { label: "Pemeriksaan Unit", done: !!asg?.checkInAt || !!dx },
                          { label: "Hasil Diagnosis", done: !!dx },
                          {
                            label: "Perbaikan",
                            done:
                              activeClaim.status === "REPAIR_IN_PROGRESS" ||
                              activeClaim.status === "RESOLVED",
                          },
                          { label: "Selesai", done: activeClaim.status === "RESOLVED" },
                        ].map((step, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                              step.done
                                ? "bg-emerald-50 text-emerald-900 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            <span className="text-xs">
                              {step.done ? "✓" : "○"}
                            </span>
                            <span className="truncate">{step.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA: [Lihat Penanganan] */}
                  <Link
                    href={`/warranties/${w.id}`}
                    className="w-full py-3 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0D3F6B] text-white text-xs font-bold transition text-center flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>Lihat Penanganan Klaim</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 3: GARANSI HABIS — Card sesuai spesifikasi #13: EXPIRED badge,         */
          /* Berlaku, Status: GARANSI BERAKHIR, Riwayat Klaim, [Lihat Riwayat]         */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedWarranties.map((w) => {
              const pastClaims = claimsV1.filter((c) => c.warrantyId === w.id);

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm flex flex-col justify-between space-y-5 opacity-90 hover:opacity-100 transition"
                >
                  <div className="space-y-4">
                    {/* Header Card: GARANSI HABIS EXPIRED */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        GARANSI HABIS
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700">
                        EXPIRED
                      </span>
                    </div>

                    {/* Layanan & Provider */}
                    <div>
                      <h3 className="text-base font-bold text-slate-800 font-display line-clamp-2">
                        {w.serviceTitle}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {w.providerName}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Warranty ID
                        </span>
                        <span className="font-mono font-bold text-slate-600">
                          {w.id}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Berlaku
                        </span>
                        <span className="font-medium text-slate-600">
                          {formatDate(w.startedAt)} – {formatDate(w.expiresAt)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Status:</span>
                          <strong className="text-rose-600">GARANSI BERAKHIR</strong>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Riwayat Klaim:</span>
                          <strong className="text-slate-800">
                            {w.claimCount || pastClaims.length} Pengajuan
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions: ONLY [Lihat Riwayat], NO [Ajukan Klaim] */}
                  <Link
                    href={`/warranties/${w.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Lihat Riwayat</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* ========================================================================= */}
      {/* FORM PENGAJUAN GARANSI MODAL (Spec #3)                                      */}
      {/* Layanan, Masalah, Ceritakan masalah, Kapan mulai, Foto, Catatan, [Kirim]   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isClaimModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Ajukan Garansi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klaim perbaikan resmi SERVIO &bull; Garansi #{selectedWarrantyForClaim?.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                {/* Layanan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Layanan
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold">
                    {selectedWarrantyForClaim?.serviceTitle}
                    <span className="text-[11px] text-slate-500 block font-normal mt-0.5">
                      Mitra: {selectedWarrantyForClaim?.providerName}
                    </span>
                  </div>
                </div>

                {/* Masalah (Dropdown / Preset Selector) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Masalah
                  </label>
                  <select
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0F4C81] text-xs font-semibold text-slate-800"
                    required
                  >
                    <option value="AC kembali tidak dingin">AC kembali tidak dingin</option>
                    <option value="Pipa bocor / air rembes">Pipa bocor / air menetes</option>
                    <option value="Unit indoor/outdoor bergetar keras">Unit indoor/outdoor bergetar keras</option>
                    <option value="MCB listrik kembali trip / padam">MCB listrik kembali trip / padam</option>
                    <option value="Hasil servis tidak bertahan lama">Hasil servis tidak bertahan lama</option>
                    <option value="Kendala teknis lainnya">Kendala teknis lainnya</option>
                  </select>
                </div>

                {/* Ceritakan Masalah */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ceritakan masalah
                  </label>
                  <textarea
                    rows={3}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Jelaskan secara singkat kendala yang dialami pasca servis..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81] text-xs"
                    required
                  />
                </div>

                {/* Kapan Masalah Mulai Terjadi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kapan masalah mulai terjadi?
                  </label>
                  <input
                    type="date"
                    value={issueOccurredAt}
                    onChange={(e) => setIssueOccurredAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                    required
                  />
                </div>

                {/* Upload Foto / Video */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Upload Foto / Video Bukti
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {claimEvidence.map((url, i) => (
                        <div
                          key={i}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group"
                        >
                          <img
                            src={url}
                            alt="Bukti"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setClaimEvidence((prev) => [
                            ...prev,
                            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
                          ])
                        }
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                      >
                        <Camera size={18} />
                        <span className="text-[9px] font-bold">+ Bukti</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Foto unit atau video suara kerusakan memudahkan teknisi mempersiapkan peralatan.
                    </p>
                  </div>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    placeholder="Contoh: Rumah hanya bisa dikunjungi di akhir pekan"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81] text-xs"
                  />
                </div>

                {/* Actions: [Batalkan] [Kirim Pengajuan] */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Batalkan
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>Kirim Pengajuan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomerWarrantiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat pusat garansi...</div>}>
      <CustomerWarrantiesInner />
    </Suspense>
  );
}
