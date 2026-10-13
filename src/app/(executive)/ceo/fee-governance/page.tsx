"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/feedback/Toast";
import { FeeChangeRequest, FeePolicyType, FeeCalculationType, FeePolicyChange, FeeProposalStatus } from "@/types/domain";
import { governanceApi, ApiPolicyProposal } from "@/lib/servioApi";
import {
  Bank,
  CheckCircle,
  WarningCircle,
  Sparkle,
  Handshake,
  Coins,
  ShieldCheck,
  ArrowRight,
  Clock,
  CalendarBlank,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Info,
  Check,
  X,
  Sliders,
  Receipt,
  Eye,
  MagnifyingGlass,
  Percent,
} from "@phosphor-icons/react";

export default function CeoFeeGovernancePage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  // Internal Tabs: Menunggu Persetujuan, Riwayat Persetujuan, Ditolak, Terjadwal, Semua
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "SCHEDULED" | "ALL">("PENDING");

  // Domain Filter: ALL | FEE | TAX
  const [governanceDomain, setGovernanceDomain] = useState<"ALL" | "FEE" | "TAX">("ALL");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [reviewModalProposal, setReviewModalProposal] = useState<FeeChangeRequest | null>(null);
  const [rejectModalProposal, setRejectModalProposal] = useState<FeeChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmApproveProposal, setConfirmApproveProposal] = useState<FeeChangeRequest | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");

  // Helper to reliably resolve MongoDB ObjectId string
  const resolveMongoId = (p: any): string => {
    if (typeof p?._id === "string" && p._id.length > 0) return p._id;
    if (p?._id && typeof p._id === "object" && "$oid" in p._id && typeof p._id.$oid === "string") return p._id.$oid;
    if (typeof p?.id === "string" && p.id.length > 0) return p.id;
    return "";
  };

  // API Proposals State
  const [apiProposals, setApiProposals] = useState<FeeChangeRequest[]>([]);

  const loadProposals = useCallback(async () => {
    try {
      const res = await governanceApi.getProposals();
      if (res && Array.isArray(res.data)) {
        if (res.data.length === 0) {
          setApiProposals([]);
          return;
        }
        const feeList: FeeChangeRequest[] = [];
        const atomicGroups: Record<string, ApiPolicyProposal[]> = {};
        const individualProps: ApiPolicyProposal[] = [];

        res.data.forEach((p) => {
          const cfg = (p.proposedConfiguration || {}) as Record<string, unknown>;
          const isTax = p.proposalCode?.startsWith("TAX") || cfg.policyType === "TAX" || cfg.taxType !== undefined || p.policyType === "TAX";
          if (isTax) {
            const taxRate = typeof cfg.rate === "number" ? cfg.rate : (p.proposedValue || parseFloat(String(cfg.rate || "11")));
            const tBasis = String(cfg.taxBasis || "SERVICE_PRICE");
            const tType = String(cfg.taxType || "PPN");
            const taxId = resolveMongoId(p) || p.id || p._id || `tax-prop-${Date.now()}`;
            feeList.push({
              id: taxId,
              requestNumber: p.proposalCode || "TAX-2026-0001",
              proposalType: "TAX" as any,
              status: (p.status || "UNDER_REVIEW") as FeeProposalStatus,
              requestedBy: p.submitterName || p.proposedBy || p.submittedBy || "Finance Ops",
              requestedAt: p.submittedAt || p.createdAt || new Date().toISOString(),
              effectiveDate: p.effectiveFrom ? String(p.effectiveFrom).split("T")[0] : new Date().toISOString().split("T")[0],
              reason: p.reason || "",
              notes: p.notes ?? undefined,
              policyChanges: [
                {
                  policyType: "TAX" as any,
                  calculationType: "PERCENTAGE",
                  currentValue: 0,
                  proposedValue: taxRate,
                  unit: "%",
                  taxType: tType,
                  taxBasis: tBasis,
                } as any,
              ],
              createdAt: p.createdAt || new Date().toISOString(),
              updatedAt: p.updatedAt || new Date().toISOString(),
            });
          } else if (p.atomicGroupId) {
            if (!atomicGroups[p.atomicGroupId]) atomicGroups[p.atomicGroupId] = [];
            atomicGroups[p.atomicGroupId].push(p);
          } else {
            individualProps.push(p);
          }
        });

        // 1. Process Individual Proposals (SINGLE: strictly one component)
        individualProps.forEach((p) => {
          const cfg = (p.proposedConfiguration || {}) as Record<string, unknown>;
          const proposalId = resolveMongoId(p) || p.id || p._id || `prop-${Date.now()}`;
          const pType = (p.policyType || cfg.policyType || "APPLICATION_FEE") as FeePolicyType;
          const cType = (cfg.calculationType || "FIXED_AMOUNT") as FeeCalculationType;
          const proposedVal = typeof p.proposedValue === "number" ? p.proposedValue : (typeof cfg.value === "number" ? cfg.value : 5000);
          const currentVal = typeof p.currentValue === "number" ? p.currentValue : 5000;
          const unit = p.unit || (cType === "PERCENTAGE" ? "%" : "Rp");

          feeList.push({
            id: proposalId,
            requestNumber: p.proposalCode || `FP-${proposalId.slice(-6).toUpperCase()}`,
            proposalType: "SINGLE",
            status: (p.status || "UNDER_REVIEW") as FeeProposalStatus,
            requestedBy: p.submitterName || p.proposedBy || p.submittedBy || "Finance Ops",
            requestedAt: p.submittedAt || p.createdAt || new Date().toISOString(),
            effectiveDate: p.effectiveFrom ? String(p.effectiveFrom).split("T")[0] : new Date().toISOString().split("T")[0],
            reason: p.reason || "",
            notes: p.notes ?? undefined,
            policyChanges: [
              {
                policyType: pType,
                calculationType: cType,
                currentValue: currentVal,
                proposedValue: proposedVal,
                unit: unit as "%" | "Rp",
              },
            ],
            createdAt: p.createdAt || new Date().toISOString(),
            updatedAt: p.updatedAt || new Date().toISOString(),
          });
        });

        // 2. Process Atomic Packages (COMBINED_AFFILIATE_PACKAGE)
        Object.entries(atomicGroups).forEach(([atomicId, groupProps]) => {
          const primary = groupProps[0];
          const proposalId = resolveMongoId(primary) || primary.id || primary._id || `pkg-${Date.now()}`;
          const policyChanges: FeePolicyChange[] = groupProps.map((gp) => {
            const cfg = (gp.proposedConfiguration || {}) as Record<string, unknown>;
            const pType = (gp.policyType || cfg.policyType || "AFFILIATE_FEE") as FeePolicyType;
            const cType = (cfg.calculationType || "PERCENTAGE") as FeeCalculationType;
            return {
              policyType: pType,
              calculationType: cType,
              currentValue: typeof gp.currentValue === "number" ? gp.currentValue : 0,
              proposedValue: typeof gp.proposedValue === "number" ? gp.proposedValue : (typeof cfg.value === "number" ? cfg.value : 0),
              unit: "%" as "%" | "Rp",
            };
          });

          feeList.push({
            id: proposalId,
            requestNumber: primary.proposalCode || `FP-${atomicId.slice(-6).toUpperCase()}`,
            proposalType: "COMBINED_AFFILIATE",
            status: (primary.status || "UNDER_REVIEW") as FeeProposalStatus,
            requestedBy: primary.submitterName || primary.proposedBy || primary.submittedBy || "Finance Ops",
            requestedAt: primary.submittedAt || primary.createdAt || new Date().toISOString(),
            effectiveDate: primary.effectiveFrom ? String(primary.effectiveFrom).split("T")[0] : new Date().toISOString().split("T")[0],
            reason: primary.reason || "",
            notes: primary.notes ?? undefined,
            policyChanges,
            createdAt: primary.createdAt || new Date().toISOString(),
            updatedAt: primary.updatedAt || new Date().toISOString(),
          });
        });

        setApiProposals(feeList);
      }
    } catch (err) {
      console.warn("Failed loading proposals from API in ceo fee-governance:", err);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Proposals & Metrics from API (authoritative) or Repository
  const allProposals = useMemo(() => {
    if (apiProposals && apiProposals.length > 0) return apiProposals;
    return repo.getFeeChangeRequests();
  }, [apiProposals, repo]);

  const metrics = repo.getFeeGovernanceMetrics();

  // Tab Counts
  const tabCounts = useMemo(() => {
    const list = allProposals.filter((p) => {
      if (governanceDomain === "FEE" && p.proposalType === ("TAX" as any)) return false;
      if (governanceDomain === "TAX" && p.proposalType !== ("TAX" as any)) return false;
      return true;
    });
    return {
      pending: list.filter((p) => p.status === "UNDER_REVIEW" || p.status === "SUBMITTED").length,
      approved: list.filter((p) => p.status === "APPROVED" || p.status === "SCHEDULED" || p.status === "ACTIVE").length,
      rejected: list.filter((p) => p.status === "REJECTED").length,
      scheduled: list.filter((p) => p.status === "SCHEDULED").length,
      all: list.length,
    };
  }, [allProposals, governanceDomain]);

  // Filtered Proposals
  const filteredProposals = useMemo(() => {
    return allProposals.filter((p) => {
      // Domain filter
      if (governanceDomain === "FEE" && p.proposalType === ("TAX" as any)) return false;
      if (governanceDomain === "TAX" && p.proposalType !== ("TAX" as any)) return false;

      // Tab filter
      if (activeTab === "PENDING" && p.status !== "UNDER_REVIEW" && p.status !== "SUBMITTED") return false;
      if (activeTab === "APPROVED" && p.status !== "APPROVED" && p.status !== "SCHEDULED" && p.status !== "ACTIVE") return false;
      if (activeTab === "REJECTED" && p.status !== "REJECTED") return false;
      if (activeTab === "SCHEDULED" && p.status !== "SCHEDULED") return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNumber = p.requestNumber.toLowerCase().includes(q);
        const matchReason = p.reason.toLowerCase().includes(q);
        const matchRequester = p.requestedBy.toLowerCase().includes(q);
        if (!matchNumber && !matchReason && !matchRequester) return false;
      }

      return true;
    });
  }, [allProposals, activeTab, searchQuery, governanceDomain]);

  // Handle Approve Action
  const handleExecuteApprove = async () => {
    if (!confirmApproveProposal) return;
    const actor = {
      id: user?.id || "usr-ceo-001",
      name: user?.name || "Michael Tanuwijaya (CEO & Founder)",
      role: "CEO_PRODUCT_OWNER",
    };

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(confirmApproveProposal.id);

    if (isMongoId) {
      try {
        await governanceApi.approveProposal(confirmApproveProposal.id, "Disetujui oleh CEO");
        await loadProposals();
        setToastType("success");
        setToastMessage(`Proposal ${confirmApproveProposal.requestNumber} berhasil disetujui CEO dan dijadwalkan.`);
        setConfirmApproveProposal(null);
        setReviewModalProposal(null);
        setActiveTab("SCHEDULED");
        return;
      } catch (err: unknown) {
        console.error("API approve error:", err);
        const errMsg = err instanceof Error ? err.message : "Gagal menyetujui proposal via API.";
        setToastType("error");
        setToastMessage(errMsg);
        await loadProposals();
        setConfirmApproveProposal(null);
        setReviewModalProposal(null);
        return;
      }
    }

    const result = repo.approveFeeProposal(confirmApproveProposal.id, actor);
    await loadProposals();

    if (result.success) {
      setToastType("success");
      setToastMessage(result.message);
      setConfirmApproveProposal(null);
      setReviewModalProposal(null);
      setActiveTab("SCHEDULED");
    } else {
      setToastType("error");
      setToastMessage(result.message);
    }
  };

  // Handle Reject Action
  const handleExecuteReject = async () => {
    if (!rejectModalProposal) return;
    if (!rejectionReason.trim()) {
      setToastType("error");
      setToastMessage("Alasan penolakan proposal wajib diisi oleh CEO.");
      return;
    }

    const actor = {
      id: user?.id || "usr-ceo-001",
      name: user?.name || "Michael Tanuwijaya (CEO & Founder)",
      role: "CEO_PRODUCT_OWNER",
    };

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(rejectModalProposal.id);

    if (isMongoId) {
      try {
        await governanceApi.rejectProposal(rejectModalProposal.id, rejectionReason.trim());
        await loadProposals();
        setToastType("info");
        setToastMessage(`Proposal ${rejectModalProposal.requestNumber} berhasil ditolak.`);
        setRejectModalProposal(null);
        setRejectionReason("");
        setReviewModalProposal(null);
        setActiveTab("REJECTED");
        return;
      } catch (err: unknown) {
        console.error("API reject error:", err);
        const errMsg = err instanceof Error ? err.message : "Gagal menolak proposal via API.";
        setToastType("error");
        setToastMessage(errMsg);
        await loadProposals();
        setRejectModalProposal(null);
        setRejectionReason("");
        setReviewModalProposal(null);
        return;
      }
    }

    const result = repo.rejectFeeProposal(rejectModalProposal.id, rejectionReason.trim(), actor);
    await loadProposals();

    if (result.success) {
      setToastType("info");
      setToastMessage(result.message);
      setRejectModalProposal(null);
      setRejectionReason("");
      setReviewModalProposal(null);
      setActiveTab("REJECTED");
    } else {
      setToastType("error");
      setToastMessage(result.message);
    }
  };

  return (
    <div className="space-y-6 font-body pb-20 text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Tata Kelola & Persetujuan Kebijakan Fee & Tax"
        description="Otoritas persetujuan eksekutif CEO atas usulan perubahan Fee Platform, Alokasi Reward Afiliasi, dan Kebijakan Tax (PPN) yang diajukan oleh Finance Ops."
        breadcrumbs={[
          { label: "Executive", href: "/ceo/dashboard" },
          { label: "Persetujuan & Riwayat", href: "/ceo/fee-governance" },
        ]}
      />

      {/* Domain Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Sliders size={16} className="text-purple-700" />
          <span>Filter Domain Kebijakan:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { key: "ALL", label: "Semua Usulan" },
            { key: "FEE", label: "Kebijakan Fee Platform" },
            { key: "TAX", label: "Kebijakan Tax (PPN)" },
          ].map((dom) => (
            <button
              key={dom.key}
              type="button"
              onClick={() => setGovernanceDomain(dom.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                governanceDomain === dom.key
                  ? "bg-purple-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {dom.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu Persetujuan</span>
            <Clock size={20} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-display text-amber-950">
            {tabCounts.pending}
          </p>
          <span className="text-[11px] text-amber-700 block">Perlu keputusan CEO</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dijadwalkan</span>
            <CalendarBlank size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-display text-blue-950">
            {tabCounts.scheduled}
          </p>
          <span className="text-[11px] text-blue-700 block">Menunggu tanggal efektif</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Disetujui</span>
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-display text-emerald-950">
            {tabCounts.approved}
          </p>
          <span className="text-[11px] text-emerald-700 block">Kebijakan aktif / terjadwal</span>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Ditolak</span>
            <X size={20} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-display text-rose-950">
            {tabCounts.rejected}
          </p>
          <span className="text-[11px] text-rose-700 block">Dengan alasan substantif</span>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "PENDING", label: "Menunggu Persetujuan", count: tabCounts.pending, badgeColor: "bg-amber-500 text-white" },
          { key: "APPROVED", label: "Riwayat Persetujuan", count: tabCounts.approved },
          { key: "SCHEDULED", label: "Terjadwal", count: tabCounts.scheduled },
          { key: "REJECTED", label: "Ditolak", count: tabCounts.rejected },
          { key: "ALL", label: "Semua", count: tabCounts.all },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-purple-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.badgeColor || (activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Nomor Proposal, Alasan, atau Submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Menampilkan <strong>{filteredProposals.length}</strong> usulan
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Proposal ID</th>
                <th className="py-3 px-4">Tipe Usulan</th>
                <th className="py-3 px-4">Perubahan Tarif (Current → Proposed)</th>
                <th className="py-3 px-4 text-center">Tanggal Efektif</th>
                <th className="py-3 px-4 text-center">Diajukan Oleh</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada usulan fee pada tab ini.
                  </td>
                </tr>
              ) : (
                filteredProposals.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{p.requestNumber}</div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-[120px]">
                        {p.requestedAt?.slice(0, 10)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.proposalType === ("TAX" as any)
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : p.proposalType === "COMBINED_AFFILIATE"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.proposalType === ("TAX" as any)
                          ? "Pajak Platform (PPN)"
                          : p.proposalType === "COMBINED_AFFILIATE"
                          ? "Paket Afiliasi Terpadu"
                          : "Usulan Tunggal"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 space-y-1">
                      {p.proposalType === ("TAX" as any) ? (
                        <div>
                          <span className="font-sans text-[11px] text-slate-500 font-medium block">
                            Pajak Pertambahan Nilai (PPN):
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-400">NOT_USED (—)</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-purple-900">
                              USED ({p.policyChanges[0]?.proposedValue}% • {(p.policyChanges[0] as any)?.taxBasis || "SERVICE_PRICE"})
                            </span>
                          </div>
                        </div>
                      ) : (
                        p.policyChanges.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-sans text-[11px] text-slate-500 font-medium">
                              {c.policyType === "APPLICATION_FEE"
                                ? "Fee Aplikasi:"
                                : c.policyType === "AFFILIATE_FEE"
                                ? "Fee Afiliasi:"
                                : c.policyType === "PROVIDER_REWARD"
                                ? "Provider:"
                                : "Teknisi:"}
                            </span>
                            <span className="text-slate-500">
                              {c.currentValue}{c.unit}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-purple-900">
                              {c.proposedValue}{c.unit}
                            </span>
                          </div>
                        ))
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                      {p.effectiveDate}
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-600">
                      <span className="font-medium text-slate-900">{p.requestedBy}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "SCHEDULED" || p.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800"
                            : p.status === "UNDER_REVIEW" || p.status === "SUBMITTED"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {p.status === "UNDER_REVIEW" ? "MENUNGGU CEO" : p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {p.status === "UNDER_REVIEW" || p.status === "SUBMITTED" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setReviewModalProposal(p)}
                          className="text-[11px] py-1 px-3 bg-purple-900 hover:bg-purple-950"
                        >
                          Review & Putuskan
                        </Button>
                      ) : (
                        <button
                          onClick={() => setReviewModalProposal(p)}
                          className="text-purple-700 hover:text-purple-900 text-xs font-bold underline"
                        >
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CEO Review & Decision Modal */}
      {reviewModalProposal && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModalProposal(null)}
          title={`Tinjauan Eksekutif Proposal Fee (${reviewModalProposal.requestNumber})`}
          size="lg"
        >
          <div className="space-y-5 text-left text-xs">
            {/* Header Context */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 font-mono">
              <div>
                <span className="text-slate-500 font-sans block text-[11px]">Nomor Proposal & Submitter</span>
                <span className="font-bold text-slate-900 text-sm">{reviewModalProposal.requestNumber}</span>
                <span className="text-slate-600 font-sans block mt-0.5">Oleh: {reviewModalProposal.requestedBy}</span>
              </div>
              <div className="sm:text-right">
                <span className="text-slate-500 font-sans block text-[11px]">Tanggal Berlaku Efektif</span>
                <span className="font-bold text-purple-950 text-sm">{reviewModalProposal.effectiveDate}</span>
                <span className="text-slate-500 font-sans block mt-0.5">
                  Diajukan: {reviewModalProposal.requestedAt?.slice(0, 10)}
                </span>
              </div>
            </div>

            {/* Atomic / Tax Changes Comparison */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                {reviewModalProposal.proposalType === ("TAX" as any)
                  ? "Detail Usulan Kebijakan Pajak (Level 05 C)"
                  : "Perbandingan Komponen Usulan (Keputusan Bersifat Atomik)"}
              </span>

              {reviewModalProposal.proposalType === ("TAX" as any) ? (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                  <div className="space-y-2 border-r border-slate-200 pr-3">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Tax Saat Ini (Current)
                    </span>
                    <div className="font-semibold text-slate-800">
                      Status: <span className="text-amber-700 font-bold">Tidak Digunakan (NOT_USED)</span>
                    </div>
                    <div className="text-slate-600">Tarif: <span className="font-mono font-bold">—</span></div>
                    <div className="text-slate-600">Basis: <span className="font-mono">—</span></div>
                  </div>

                  <div className="space-y-2 pl-1">
                    <span className="font-bold text-purple-700 uppercase tracking-wider text-[10px] block">
                      Usulan Baru (Proposed)
                    </span>
                    <div className="font-semibold text-slate-900">
                      Status: <span className="text-emerald-700 font-bold">Digunakan (USED)</span>
                    </div>
                    <div className="text-slate-900">
                      Tarif:{" "}
                      <span className="font-mono font-bold text-purple-900">
                        {String((reviewModalProposal.policyChanges[0] as any)?.taxType || "PPN")}{" "}
                        {reviewModalProposal.policyChanges[0]?.proposedValue}%
                      </span>
                    </div>
                    <div className="text-slate-900">
                      Basis:{" "}
                      <span className="font-mono font-bold">
                        {String((reviewModalProposal.policyChanges[0] as any)?.taxBasis || "SERVICE_PRICE")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {reviewModalProposal.policyChanges.map((change, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
                      <span className="text-[11px] font-bold text-purple-900 block truncate">
                        {change.policyType === "APPLICATION_FEE"
                          ? "Fee Aplikasi"
                          : change.policyType === "AFFILIATE_FEE"
                          ? "Fee Afiliasi"
                          : change.policyType === "PROVIDER_REWARD"
                          ? "Reward Provider"
                          : "Reward Worker"}
                      </span>
                      <div className="flex items-center justify-between font-mono pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Saat Ini</span>
                          <span className="font-bold text-slate-700">{change.currentValue}{change.unit}</span>
                        </div>
                        <span className="text-slate-400 font-bold">→</span>
                        <div>
                          <span className="text-[10px] text-purple-700 block font-sans">Usulan Baru</span>
                          <span className="font-bold text-purple-900 text-sm">{change.proposedValue}{change.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 100% Split Check Indicator for Combined */}
              {reviewModalProposal.proposalType === "COMBINED_AFFILIATE" && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Percent size={18} />
                    <span>Distribusi Reward Provider & Teknisi:</span>
                  </div>
                  <span>100% Tervalidasi ✓</span>
                </div>
              )}
            </div>

            {/* Reason & Submitter Notes */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div>
                <span className="text-slate-500 font-bold block text-[11px]">Alasan Perubahan (Reason):</span>
                <p className="text-slate-900 mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200/80 font-medium">
                  {reviewModalProposal.reason || "-"}
                </p>
              </div>
              {reviewModalProposal.notes && (
                <div className="border-t border-slate-200 pt-2">
                  <span className="text-slate-500 font-bold block text-[11px]">Catatan untuk CEO (Notes):</span>
                  <p className="text-slate-800 mt-0.5 bg-white p-2.5 rounded-lg border border-slate-200/80 text-[11px]">
                    {reviewModalProposal.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Governance Confirmation Notice */}
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
              <ShieldCheck size={20} className="text-purple-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Peringatan Tata Kelola Eksekutif (CEO Lock):</span>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  Persetujuan CEO menjadwalkan status kebijakan ke <strong>SCHEDULED</strong>. Sistem scheduler otomatis mengaktifkannya pada tanggal efektif ({reviewModalProposal.effectiveDate}). Tidak ada tombol aktivasi manual.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReviewModalProposal(null)}
                className="text-xs"
              >
                Tutup
              </Button>

              {(reviewModalProposal.status === "UNDER_REVIEW" || reviewModalProposal.status === "SUBMITTED") && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectModalProposal(reviewModalProposal);
                    }}
                    className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1.5"
                  >
                    <ThumbsDown size={14} />
                    <span>Tolak Usulan</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setConfirmApproveProposal(reviewModalProposal);
                    }}
                    className="text-xs bg-purple-900 hover:bg-purple-950 flex items-center gap-1.5"
                  >
                    <ThumbsUp size={14} />
                    <span>Setujui Kebijakan</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Approve Confirmation Modal */}
      {confirmApproveProposal && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmApproveProposal(null)}
          title="Konfirmasi Persetujuan Kebijakan Fee"
          size="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle size={20} className="text-purple-700" />
                <span>Setujui Proposal {confirmApproveProposal.requestNumber}</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-xs">
                Kebijakan akan dijadwalkan (<strong>SCHEDULED</strong>) dan diaktifkan otomatis oleh sistem pada tanggal efektif <strong>{confirmApproveProposal.effectiveDate}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
              <span className="font-bold block text-slate-800">Prinsip Immutability:</span>
              <p>
                Transaksi masa lalu, invoice lampau, dan ledger poin tidak akan berubah. Kebijakan baru hanya berlaku untuk pesanan baru sejak tanggal efektif.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmApproveProposal(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteApprove}
                className="text-xs bg-purple-900 hover:bg-purple-950"
              >
                Konfirmasi Setujui & Jadwalkan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal with Mandatory Reason */}
      {rejectModalProposal && (
        <Modal
          isOpen={true}
          onClose={() => setRejectModalProposal(null)}
          title="Tolak Proposal Kebijakan Fee"
          size="md"
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <span className="font-bold block">Penolakan Usulan: {rejectModalProposal.requestNumber}</span>
              <p className="text-[11px] text-rose-700">
                Alasan penolakan wajib diisi untuk dicatat ke audit log dan menjadi panduan bagi tim Finance dalam membuat draf revisi.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Alasan Penolakan oleh CEO *
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan alasan penolakan (misal: margin toko terlalu tertekan, tarif terlalu agresif, dsb)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalProposal(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteReject}
                className="text-xs bg-rose-700 hover:bg-rose-800"
              >
                Tolak Usulan & Kirim Alasan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
