"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Percent,
  Receipt,
  ArrowsClockwise,
  CheckCircle,
  Eye,
  MagnifyingGlass,
  Sparkle,
  WarningCircle,
  Storefront,
  Plus,
  PaperPlaneTilt,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import {
  FeePolicyGroupModel,
  FeePolicyVersionModel,
  FeePolicyTargetModel,
} from "@/types/finance";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// 5 Canonical Tabs per Finance V3 Final Locked Plan
type PolicyTab = "active" | "draft" | "scheduled" | "history" | "inactive";

interface FlatVersionItem {
  group: FeePolicyGroupModel;
  version: FeePolicyVersionModel;
}

export default function CeoPlatformPoliciesPage() {
  const [activeTab, setActiveTab] = useState<PolicyTab>("active");

  const [policyGroups, setPolicyGroups] = useState<FeePolicyGroupModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [inspectingItem, setInspectingItem] = useState<FlatVersionItem | null>(null);

  // Selected item for Publish / Revision
  const [selectedForPublish, setSelectedForPublish] = useState<FlatVersionItem | null>(null);
  const [selectedForRevision, setSelectedForRevision] = useState<FlatVersionItem | null>(null);

  // Form states for Create Policy (+ Tambah Aturan Biaya)
  const [newPolicyName, setNewPolicyName] = useState("Kebijakan Biaya & Komisi Barang 2026");
  const [slugRandomNumber, setSlugRandomNumber] = useState<number>(() => Math.floor(1000 + Math.random() * 9000));

  // Helper function to generate slug from name: srv-[nama-aturan]-[random-nomor]
  const generateSlugFromName = (name: string, randNum: number = slugRandomNumber): string => {
    const clean = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 70);
    return clean ? `srv-${clean}-${randNum}` : `srv-${randNum}`;
  };

  const [newPolicySlug, setNewPolicySlug] = useState(() => {
    const initialRand = Math.floor(1000 + Math.random() * 9000);
    const clean = "Kebijakan Biaya & Komisi Barang 2026"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 70);
    return `srv-${clean}-${initialRand}`;
  });

  const [newPolicyDescription, setNewPolicyDescription] = useState(
    "Kebijakan tarif biaya aplikasi checkout customer dan komisi penjualan merchant produk SERVIO."
  );
  const [newChangeReason, setNewChangeReason] = useState("Penetapan tarif awal operasional order barang");

  // Regenerate random number and refresh slug
  const regenerateSlugRandomNumber = () => {
    const newRand = Math.floor(1000 + Math.random() * 9000);
    setSlugRandomNumber(newRand);
    setNewPolicySlug(generateSlugFromName(newPolicyName, newRand));
  };

  // Open create modal with fresh random number
  const openCreateModal = () => {
    const newRand = Math.floor(1000 + Math.random() * 9000);
    setSlugRandomNumber(newRand);
    setNewPolicySlug(generateSlugFromName(newPolicyName, newRand));
    setShowCreateModal(true);
  };

  // Target Mode: BOTH | CUSTOMER_ONLY | MERCHANT_ONLY
  const [targetScopeMode, setTargetScopeMode] = useState<"BOTH" | "CUSTOMER_ONLY" | "MERCHANT_ONLY">("BOTH");

  // Target 1: Customer Product App Fee (Once per checkout)
  const [customerFeeType, setCustomerFeeType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [customerFeeAmount, setCustomerFeeAmount] = useState<number>(3000);
  const [customerFeePercent, setCustomerFeePercent] = useState<number>(1.0);

  // Target 2: Merchant Product Commission (Per merchant order)
  const [merchantFeeType, setMerchantFeeType] = useState<"FIXED" | "PERCENTAGE">("PERCENTAGE");
  const [merchantFeePercent, setMerchantFeePercent] = useState<number>(5.0);
  const [merchantFeeAmount, setMerchantFeeAmount] = useState<number>(5000);

  // Publish Form States
  const [publishMode, setPublishMode] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [publishEffectiveDate, setPublishEffectiveDate] = useState<string>("");

  // Revision Form States
  const [revisionReason, setRevisionReason] = useState("");
  const [revTargetScopeMode, setRevTargetScopeMode] = useState<"BOTH" | "CUSTOMER_ONLY" | "MERCHANT_ONLY">("BOTH");
  const [revCustomerFeeType, setRevCustomerFeeType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [revCustomerAmount, setRevCustomerAmount] = useState<number>(3000);
  const [revCustomerPercent, setRevCustomerPercent] = useState<number>(1.0);
  const [revMerchantFeeType, setRevMerchantFeeType] = useState<"FIXED" | "PERCENTAGE">("PERCENTAGE");
  const [revMerchantPercent, setRevMerchantPercent] = useState<number>(5.0);
  const [revMerchantAmount, setRevMerchantAmount] = useState<number>(5000);

  // Status Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAllPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.policies.list({ per_page: 50 });
      if (res && res.data && Array.isArray(res.data.items)) {
        setPolicyGroups(res.data.items);
      } else if (res && Array.isArray((res as any).items)) {
        setPolicyGroups((res as any).items);
      } else {
        setPolicyGroups([]);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat daftar kebijakan:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat kebijakan dari Finance Service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPolicies();
  }, []);

  // Flatten versions with their parent group for tabular rendering
  const allFlattenedVersions: FlatVersionItem[] = useMemo(() => {
    const list: FlatVersionItem[] = [];
    policyGroups.forEach((group) => {
      if (Array.isArray(group.versions)) {
        group.versions.forEach((ver) => {
          list.push({ group, version: ver });
        });
      }
    });
    return list;
  }, [policyGroups]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { active: 0, draft: 0, scheduled: 0, history: 0, inactive: 0 };
    allFlattenedVersions.forEach((item) => {
      const s = item.version.status;
      if (s === "ACTIVE") counts.active++;
      else if (s === "DRAFT") counts.draft++;
      else if (s === "SCHEDULED") counts.scheduled++;
      else if (s === "HISTORICAL" || s === "SUPERSEDED") counts.history++;
      else if (s === "INACTIVE") counts.inactive++;
    });
    return counts;
  }, [allFlattenedVersions]);

  // Filter flattened versions based on tab and search
  const filteredVersions = useMemo(() => {
    return allFlattenedVersions.filter((item) => {
      const status = item.version.status;
      let matchesTab = false;

      if (activeTab === "active") {
        matchesTab = status === "ACTIVE";
      } else if (activeTab === "draft") {
        matchesTab = status === "DRAFT";
      } else if (activeTab === "scheduled") {
        matchesTab = status === "SCHEDULED";
      } else if (activeTab === "history") {
        matchesTab = status === "HISTORICAL" || status === "SUPERSEDED";
      } else if (activeTab === "inactive") {
        matchesTab = status === "INACTIVE";
      }

      if (!matchesTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.group.display_name.toLowerCase().includes(q) ||
          item.group.slug.toLowerCase().includes(q) ||
          `v${item.version.version_no}`.toLowerCase().includes(q) ||
          (item.version.change_reason && item.version.change_reason.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allFlattenedVersions, activeTab, searchQuery]);

  // Handle Create Policy Submit
  const handleCreatePolicy = async (shouldPublishImmediately: boolean = false) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!newPolicyName.trim()) {
        throw new Error("Nama aturan biaya wajib diisi.");
      }
      if (!newPolicySlug.trim()) {
        throw new Error("Slug aturan biaya wajib diisi.");
      }

      const targetsPayload: any[] = [];

      if (targetScopeMode === "BOTH" || targetScopeMode === "CUSTOMER_ONLY") {
        targetsPayload.push({
          policy_code: "CUSTOMER_PRODUCT_APP_FEE",
          scope: "PRODUCT",
          payer_type: "CUSTOMER",
          fee_type: customerFeeType,
          fixed_amount_idr: customerFeeType === "FIXED" ? customerFeeAmount : null,
          percentage_rate: customerFeeType === "PERCENTAGE" ? customerFeePercent : null,
          charge_scope: "CHECKOUT",
          calculation_base: "CHECKOUT_ELIGIBLE_SUBTOTAL",
        });
      }

      if (targetScopeMode === "BOTH" || targetScopeMode === "MERCHANT_ONLY") {
        targetsPayload.push({
          policy_code: "MERCHANT_PRODUCT_COMMISSION",
          scope: "PRODUCT",
          payer_type: "MERCHANT",
          fee_type: merchantFeeType,
          fixed_amount_idr: merchantFeeType === "FIXED" ? merchantFeeAmount : null,
          percentage_rate: merchantFeeType === "PERCENTAGE" ? merchantFeePercent : null,
          charge_scope: "MERCHANT_ORDER",
          calculation_base: "MERCHANT_PRODUCT_SUBTOTAL",
        });
      }

      if (targetsPayload.length === 0) {
        throw new Error("Pilih minimal satu target penerapan biaya (Pelanggan atau Merchant).");
      }

      const res = await financeApi.policies.create({
        name: newPolicyName.trim(),
        slug: newPolicySlug.trim(),
        description: newPolicyDescription.trim() || undefined,
        change_reason: newChangeReason.trim() || undefined,
        targets: targetsPayload,
      });

      const groupId = res.data?.group_id;

      if (shouldPublishImmediately && groupId) {
        await financeApi.policies.publish(groupId, {
          version_id: res.data?.version_id,
          effective_from: null,
        });
        setToastMessage({
          type: "success",
          text: `Aturan '${newPolicyName}' berhasil dibuat dan langsung AKTIF.`,
        });
        setActiveTab("active");
      } else {
        setToastMessage({
          type: "success",
          text: `Draft aturan '${newPolicyName}' (v${res.data?.version_no || 1}) berhasil disimpan.`,
        });
        setActiveTab("draft");
      }

      setShowCreateModal(false);
      await loadAllPolicies();
    } catch (err: unknown) {
      console.error("Gagal membuat aturan biaya:", err);
      setError(err instanceof Error ? err.message : "Gagal membuat kebijakan baru.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Publish Submit
  const handlePublishSubmit = async () => {
    if (!selectedForPublish) return;
    try {
      setIsSubmitting(true);
      setError(null);

      const effectiveFrom =
        publishMode === "SCHEDULED" && publishEffectiveDate ? publishEffectiveDate : null;

      await financeApi.policies.publish(selectedForPublish.group.id, {
        version_id: selectedForPublish.version.id,
        effective_from: effectiveFrom,
      });

      setToastMessage({
        type: "success",
        text:
          publishMode === "SCHEDULED"
            ? `Versi v${selectedForPublish.version.version_no} dijadwalkan berlaku pada ${publishEffectiveDate}.`
            : `Versi v${selectedForPublish.version.version_no} telah dipublikasikan dan resmi AKTIF!`,
      });

      setShowPublishModal(false);
      setSelectedForPublish(null);
      await loadAllPolicies();
      setActiveTab(publishMode === "SCHEDULED" ? "scheduled" : "active");
    } catch (err: unknown) {
      console.error("Gagal mempublikasikan aturan:", err);
      setError(err instanceof Error ? err.message : "Gagal mempublikasikan aturan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Revision Submit
  const handleCreateRevisionSubmit = async () => {
    if (!selectedForRevision) return;
    try {
      setIsSubmitting(true);
      setError(null);

      if (!revisionReason.trim()) {
        throw new Error("Alasan revisi wajib diisi sebelum menyimpan.");
      }

      const targetsPayload: any[] = [];

      if (revTargetScopeMode === "BOTH" || revTargetScopeMode === "CUSTOMER_ONLY") {
        targetsPayload.push({
          policy_code: "CUSTOMER_PRODUCT_APP_FEE",
          scope: "PRODUCT",
          payer_type: "CUSTOMER",
          fee_type: revCustomerFeeType,
          fixed_amount_idr: revCustomerFeeType === "FIXED" ? revCustomerAmount : null,
          percentage_rate: revCustomerFeeType === "PERCENTAGE" ? revCustomerPercent : null,
          charge_scope: "CHECKOUT",
          calculation_base: "CHECKOUT_ELIGIBLE_SUBTOTAL",
        });
      }

      if (revTargetScopeMode === "BOTH" || revTargetScopeMode === "MERCHANT_ONLY") {
        targetsPayload.push({
          policy_code: "MERCHANT_PRODUCT_COMMISSION",
          scope: "PRODUCT",
          payer_type: "MERCHANT",
          fee_type: revMerchantFeeType,
          fixed_amount_idr: revMerchantFeeType === "FIXED" ? revMerchantAmount : null,
          percentage_rate: revMerchantFeeType === "PERCENTAGE" ? revMerchantPercent : null,
          charge_scope: "MERCHANT_ORDER",
          calculation_base: "MERCHANT_PRODUCT_SUBTOTAL",
        });
      }

      if (targetsPayload.length === 0) {
        throw new Error("Pilih minimal satu target penerapan biaya (Pelanggan atau Merchant).");
      }

      const res = await financeApi.policies.createRevision(selectedForRevision.group.id, {
        change_reason: revisionReason.trim(),
        targets: targetsPayload,
      });

      setToastMessage({
        type: "success",
        text: `Revisi draft v${res.data?.version_no || 2} berhasil dibuat untuk grup '${selectedForRevision.group.display_name}'.`,
      });

      setShowRevisionModal(false);
      setSelectedForRevision(null);
      await loadAllPolicies();
      setActiveTab("draft");
    } catch (err: unknown) {
      console.error("Gagal membuat revisi kebijakan:", err);
      setError(err instanceof Error ? err.message : "Gagal membuat revisi kebijakan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Revision Modal with auto-detection of existing targets
  const openRevisionModal = (item: FlatVersionItem) => {
    setSelectedForRevision(item);
    setRevisionReason(`Revisi tarif dari v${item.version.version_no}`);

    const targets = item.version.targets || [];
    const custTarget = targets.find((t) => t.policy_code === "CUSTOMER_PRODUCT_APP_FEE");
    const merchTarget = targets.find((t) => t.policy_code === "MERCHANT_PRODUCT_COMMISSION");

    if (custTarget && merchTarget) {
      setRevTargetScopeMode("BOTH");
    } else if (custTarget && !merchTarget) {
      setRevTargetScopeMode("CUSTOMER_ONLY");
    } else if (!custTarget && merchTarget) {
      setRevTargetScopeMode("MERCHANT_ONLY");
    } else {
      setRevTargetScopeMode("BOTH");
    }

    if (custTarget) {
      setRevCustomerFeeType(custTarget.fee_type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED");
      if (custTarget.fee_type === "PERCENTAGE") {
        setRevCustomerPercent(Number(custTarget.percentage_rate) || 1.0);
      } else {
        setRevCustomerAmount(Number(custTarget.fixed_amount_idr) || 3000);
      }
    } else {
      setRevCustomerFeeType("FIXED");
      setRevCustomerAmount(3000);
      setRevCustomerPercent(1.0);
    }

    if (merchTarget) {
      setRevMerchantFeeType(merchTarget.fee_type === "FIXED" ? "FIXED" : "PERCENTAGE");
      if (merchTarget.fee_type === "FIXED") {
        setRevMerchantAmount(Number(merchTarget.fixed_amount_idr) || 5000);
      } else {
        setRevMerchantPercent(Number(merchTarget.percentage_rate) || 5.0);
      }
    } else {
      setRevMerchantFeeType("PERCENTAGE");
      setRevMerchantPercent(5.0);
      setRevMerchantAmount(5000);
    }

    setShowRevisionModal(true);
  };

  return (
    <div className="space-y-6 pb-20 font-body text-left">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 text-xs font-semibold shadow-md border ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" weight="fill" />
            ) : (
              <WarningCircle className="w-4 h-4 text-rose-600 shrink-0" weight="fill" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Kebijakan Platform: Biaya & Komisi"
        description="Tata kelola aturan biaya aplikasi, komisi toko merchant, dan siklus hidup versi tarif resmi platform SERVIO (Order Barang 05A)."
        breadcrumbs={[
          { label: "Executive", href: "/ceo" },
          { label: "Tata Kelola", href: "/ceo/governance" },
          { label: "Kebijakan Biaya" },
        ]}
      />

      {/* Governance & Policy Life-Cycle Metrics Cards (Option B) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Enforced Policies */}
        <div
          onClick={() => setActiveTab("active")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "active" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Kebijakan Aktif (Enforced)
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.active}
                </span>
                <span className="text-xs font-bold text-slate-500">Aturan</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Mengikat
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ShieldCheck size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Diterapkan langsung pada kalkulasi checkout</span>
            <span className="font-bold text-emerald-700">Lihat Tab Aktif →</span>
          </div>
        </div>

        {/* Card 2: Draft Policies */}
        <div
          onClick={() => setActiveTab("draft")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "draft" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Draft Perumusan
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.draft}
                </span>
                <span className="text-xs font-bold text-slate-500">Versi Draft</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Perumusan
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <PencilSimpleLine size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rancangan baru yang belum dipublikasikan</span>
            <span className="font-bold text-amber-700">Lihat Tab Draft →</span>
          </div>
        </div>

        {/* Card 3: Scheduled & Historical Policies */}
        <div
          onClick={() => setActiveTab(tabCounts.scheduled > 0 ? "scheduled" : "history")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "scheduled" || activeTab === "history"
              ? "border-sky-500 ring-2 ring-sky-500/20"
              : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Terjadwal & Riwayat
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.scheduled + tabCounts.history}
                </span>
                <span className="text-xs font-bold text-slate-500">Versi</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Arsip & Jadwal
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <Sparkle size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{tabCounts.scheduled} Terjadwal • {tabCounts.history} Riwayat Versi</span>
            <span className="font-bold text-sky-700">Buka Tab →</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs">
          <WarningCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1">
            <h4 className="font-bold">Kendala API</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllPolicies}
            className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100 rounded-xl"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Control Bar: 5 Tabs, Refresh, and Action */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 5 Canonical Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: "active", label: "Aktif", count: tabCounts.active, color: "emerald" },
              { id: "draft", label: "Draft", count: tabCounts.draft, color: "amber" },
              { id: "scheduled", label: "Terjadwal", count: tabCounts.scheduled, color: "sky" },
              { id: "history", label: "Riwayat", count: tabCounts.history, color: "slate" },
              { id: "inactive", label: "Nonaktif", count: tabCounts.inactive, color: "slate" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as PolicyTab)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "bg-[#0F4C81] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllPolicies}
              disabled={loading}
              className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <ArrowsClockwise className={`w-4 h-4 mr-1.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="rounded-2xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" weight="bold" />
              <span>Tambah Aturan Biaya</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kebijakan berdasarkan nama aturan, slug, versi, atau alasan..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] transition-all"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat data kebijakan dari Finance Service...</p>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mb-4 border border-sky-100">
              <ShieldCheck className="w-7 h-7" weight="duotone" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Tidak Ada Kebijakan di Tab {activeTab.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 mb-6 leading-relaxed">
              {activeTab === "draft"
                ? "Belum ada draft versi yang sedang dipersiapkan. Klik tombol di bawah untuk membuat aturan biaya baru."
                : activeTab === "active"
                ? "Belum ada kebijakan yang berstatus aktif di database Finance Service. Anda dapat membuat dan langsung menerbitkannya."
                : `Tidak ditemukan aturan kebijakan dengan status ${activeTab}.`}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="rounded-2xl bg-[#0F4C81] hover:bg-[#0d3f6b] text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4 mr-1.5" weight="bold" />
              + Tambah Aturan Biaya
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Nama Aturan & Versi</th>
                  <th className="py-3.5 px-4">Biaya Aplikasi Customer</th>
                  <th className="py-3.5 px-4">Komisi Toko Merchant</th>
                  <th className="py-3.5 px-4">Status & Efektif</th>
                  <th className="py-3.5 px-4">Alasan Pembaruan</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredVersions.map(({ group, version }) => {
                  const targets = version.targets || [];
                  const customerTarget = targets.find(
                    (t) => t.policy_code === "CUSTOMER_PRODUCT_APP_FEE"
                  );
                  const merchantTarget = targets.find(
                    (t) => t.policy_code === "MERCHANT_PRODUCT_COMMISSION"
                  );

                  return (
                    <tr
                      key={`${group.id}-v${version.id}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{group.display_name}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            v{version.version_no}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {group.slug}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {customerTarget ? (
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>
                                {customerTarget.fee_type === "FIXED"
                                  ? `Rp ${(customerTarget.fixed_amount_idr || 0).toLocaleString("id-ID")}`
                                  : `${customerTarget.percentage_rate || 0}%`}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-100">
                                {customerTarget.fee_type === "FIXED" ? "Rp" : "%"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Sekali / Checkout
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            — Bebas Biaya
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {merchantTarget ? (
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>
                                {merchantTarget.fee_type === "PERCENTAGE"
                                  ? `${merchantTarget.percentage_rate || 0}%`
                                  : `Rp ${(merchantTarget.fixed_amount_idr || 0).toLocaleString("id-ID")}`}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {merchantTarget.fee_type === "PERCENTAGE" ? "%" : "Rp"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Per Pesanan Toko
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            — Bebas Komisi
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              version.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : version.status === "DRAFT"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : version.status === "SCHEDULED"
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {version.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {version.effective_from
                            ? new Date(version.effective_from).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Langsung saat terbit"}
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-xs">
                          {version.change_reason || "-"}
                        </p>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectingItem({ group, version })}
                            className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>

                          {version.status === "DRAFT" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedForPublish({ group, version });
                                setShowPublishModal(true);
                              }}
                              className="text-xs bg-[#0F4C81] hover:bg-[#0d3f6b] text-white rounded-xl shadow-xs"
                            >
                              <PaperPlaneTilt className="w-3.5 h-3.5 mr-1" weight="bold" />
                              Publikasikan
                            </Button>
                          )}

                          {version.status === "ACTIVE" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRevisionModal({ group, version })}
                              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
                            >
                              <PencilSimpleLine className="w-3.5 h-3.5 mr-1" />
                              Buat Revisi
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: + Tambah Aturan Biaya (Planning Compliant Form)
         ========================================================================= */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isSubmitting && setShowCreateModal(false)}
        title="+ Tambah Aturan Biaya Platform"
        size="lg"
      >
        <div className="space-y-6 text-left font-body">
          <p className="text-xs text-slate-500 leading-relaxed">
            Form ini menetapkan aturan kebijakan komisi dan biaya aplikasi multi-target untuk transaksi <strong>Order Barang 05A</strong>. Anda dapat memilih apakah biaya dikenakan kepada Pembeli saja, Toko Merchant saja, atau Keduanya sekaligus.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nama Aturan Biaya <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newPolicyName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPolicyName(val);
                  setNewPolicySlug(generateSlugFromName(val, slugRandomNumber));
                }}
                placeholder="Contoh: Kebijakan Biaya Barang 2026"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Slug Unik <span className="text-slate-400 font-normal">(Otomatis Sistem)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    (srv-[nama]-[nomor])
                  </span>
                  <button
                    type="button"
                    onClick={regenerateSlugRandomNumber}
                    title="Acak ulang nomor identifikasi unik"
                    className="p-1 rounded-md text-slate-400 hover:text-[#0F4C81] hover:bg-slate-100 transition-colors"
                  >
                    <ArrowsClockwise className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={newPolicySlug}
                readOnly
                disabled
                tabIndex={-1}
                placeholder="srv-nama-aturan-1234"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono bg-slate-100/90 text-slate-600 cursor-not-allowed select-none focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Alasan Pembuatan / Catatan Versi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newChangeReason}
              onChange={(e) => setNewChangeReason(e.target.value)}
              placeholder="Contoh: Penyesuaian tarif awal operasional semester 1"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
            />
          </div>

          {/* Target Penerapan Biaya (3 Pilihan Pill/Card) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Target Penerapan Biaya <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetScopeMode("CUSTOMER_ONLY")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  targetScopeMode === "CUSTOMER_ONLY"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Receipt
                    className={`w-4 h-4 ${targetScopeMode === "CUSTOMER_ONLY" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      targetScopeMode === "CUSTOMER_ONLY" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {targetScopeMode === "CUSTOMER_ONLY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Pelanggan Saja</p>
                  <p className="text-[10px] text-slate-500">Biaya aplikasi per checkout</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetScopeMode("MERCHANT_ONLY")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  targetScopeMode === "MERCHANT_ONLY"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Storefront
                    className={`w-4 h-4 ${targetScopeMode === "MERCHANT_ONLY" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      targetScopeMode === "MERCHANT_ONLY" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {targetScopeMode === "MERCHANT_ONLY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Merchant Saja</p>
                  <p className="text-[10px] text-slate-500">Komisi toko pesanan barang</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetScopeMode("BOTH")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  targetScopeMode === "BOTH"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkle
                    className={`w-4 h-4 ${targetScopeMode === "BOTH" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      targetScopeMode === "BOTH" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {targetScopeMode === "BOTH" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Keduanya Sekaligus</p>
                  <p className="text-[10px] text-slate-500">Pelanggan & komisi toko</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section Target 1: Customer Product App Fee */}
          {(targetScopeMode === "BOTH" || targetScopeMode === "CUSTOMER_ONLY") && (
            <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#0F4C81]" weight="duotone" />
                  <h4 className="text-xs font-black text-slate-900">
                    Target 1: Biaya Aplikasi Customer (Barang 05A)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                  Sekali per Checkout
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Dikenakan kepada Customer satu kali per CheckoutGroup, walaupun keranjang belanja memuat multi-merchant / multi-item.
              </p>

              <div className="space-y-3 pt-1">
                {/* Format Switch: Rp vs % */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Format Penerapan Tarif
                  </label>
                  <div className="inline-flex p-1 bg-slate-200/70 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomerFeeType("FIXED")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        customerFeeType === "FIXED"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Nominal Tetap (Rp)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFeeType("PERCENTAGE")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        customerFeeType === "PERCENTAGE"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Persentase (%)
                    </button>
                  </div>
                </div>

                {/* Input Fields */}
                {customerFeeType === "FIXED" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nominal Rupiah (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        step={500}
                        value={customerFeeAmount}
                        onChange={(e) => setCustomerFeeAmount(Number(e.target.value))}
                        placeholder="Contoh: 3000"
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Persentase dari Subtotal (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.1}
                        value={customerFeePercent}
                        onChange={(e) => setCustomerFeePercent(Number(e.target.value))}
                        placeholder="Contoh: 1.5"
                        className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Target 2: Merchant Product Commission */}
          {(targetScopeMode === "BOTH" || targetScopeMode === "MERCHANT_ONLY") && (
            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Storefront className="w-5 h-5 text-emerald-700" weight="duotone" />
                  <h4 className="text-xs font-black text-slate-900">
                    Target 2: Komisi Penjualan Merchant (Barang 05A)
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Per Merchant Order
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Dipotong langsung dari hak dana penjualan merchant saat order diselesaikan (COMPLETED) dan melewati masa tahan 5 hari (120 jam).
              </p>

              <div className="space-y-3 pt-1">
                {/* Format Switch: % vs Rp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Format Penerapan Komisi
                  </label>
                  <div className="inline-flex p-1 bg-slate-200/70 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setMerchantFeeType("PERCENTAGE")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        merchantFeeType === "PERCENTAGE"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Persentase (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMerchantFeeType("FIXED")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                        merchantFeeType === "FIXED"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Nominal Tetap (Rp)
                    </button>
                  </div>
                </div>

                {/* Input Fields */}
                {merchantFeeType === "PERCENTAGE" ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Persentase Komisi (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.5}
                        value={merchantFeePercent}
                        onChange={(e) => setMerchantFeePercent(Number(e.target.value))}
                        placeholder="Contoh: 5.0"
                        className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nominal Tetap (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        step={1000}
                        value={merchantFeeAmount}
                        onChange={(e) => setMerchantFeeAmount(Number(e.target.value))}
                        placeholder="Contoh: 5000"
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleCreatePolicy(false)}
              className="rounded-xl text-xs border-slate-300 font-bold"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan sebagai Draft"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleCreatePolicy(true)}
              className="rounded-xl text-xs bg-[#0F4C81] hover:bg-[#0d3f6b] text-white font-bold"
            >
              {isSubmitting ? "Memproses..." : "Simpan & Terbitkan Sekarang"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: Publikasikan Draft Kebijakan
         ========================================================================= */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => !isSubmitting && setShowPublishModal(false)}
        title="Publikasikan Versi Kebijakan"
        size="md"
      >
        <div className="space-y-4 text-left font-body">
          <p className="text-xs text-slate-600">
            Anda akan mempublikasikan draft <strong>v{selectedForPublish?.version.version_no}</strong> dari aturan <strong>{selectedForPublish?.group.display_name}</strong>. Versi aktif yang lama akan otomatis diarsipkan (SUPERSEDED/HISTORICAL).
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Waktu Mulai Berlaku
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="publishMode"
                  checked={publishMode === "IMMEDIATE"}
                  onChange={() => setPublishMode("IMMEDIATE")}
                  className="text-[#0F4C81]"
                />
                Langsung Aktif Sekarang
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="publishMode"
                  checked={publishMode === "SCHEDULED"}
                  onChange={() => setPublishMode("SCHEDULED")}
                  className="text-[#0F4C81]"
                />
                Jadwalkan pada Tanggal
              </label>
            </div>

            {publishMode === "SCHEDULED" && (
              <div className="pt-2">
                <input
                  type="datetime-local"
                  value={publishEffectiveDate}
                  onChange={(e) => setPublishEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowPublishModal(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handlePublishSubmit}
              className="rounded-xl text-xs bg-[#0F4C81] hover:bg-[#0d3f6b] text-white font-bold"
            >
              {isSubmitting ? "Menerbitkan..." : "Konfirmasi Terbitkan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: Buat Revisi Kebijakan Aktif (Dinamis Target & Format)
         ========================================================================= */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => !isSubmitting && setShowRevisionModal(false)}
        title="Buat Revisi Aturan Kebijakan"
        size="lg"
      >
        <div className="space-y-5 text-left font-body">
          <p className="text-xs text-slate-600">
            Revisi ini akan membuat versi <strong>DRAFT</strong> baru dari grup <strong>{selectedForRevision?.group.display_name}</strong>. Anda dapat mengubah sasaran target (Pelanggan/Merchant) serta mengganti format perhitungan (Rupiah atau Persentase).
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Alasan Perubahan Revisi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Contoh: Evaluasi margin komisi merchant semester baru"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            />
          </div>

          {/* Target Scope Selector di Revisi */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Target Penerapan Revisi <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRevTargetScopeMode("CUSTOMER_ONLY")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  revTargetScopeMode === "CUSTOMER_ONLY"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Receipt
                    className={`w-4 h-4 ${revTargetScopeMode === "CUSTOMER_ONLY" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      revTargetScopeMode === "CUSTOMER_ONLY" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {revTargetScopeMode === "CUSTOMER_ONLY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Pelanggan Saja</p>
                  <p className="text-[10px] text-slate-500">Biaya aplikasi per checkout</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRevTargetScopeMode("MERCHANT_ONLY")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  revTargetScopeMode === "MERCHANT_ONLY"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Storefront
                    className={`w-4 h-4 ${revTargetScopeMode === "MERCHANT_ONLY" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      revTargetScopeMode === "MERCHANT_ONLY" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {revTargetScopeMode === "MERCHANT_ONLY" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Merchant Saja</p>
                  <p className="text-[10px] text-slate-500">Komisi toko pesanan barang</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRevTargetScopeMode("BOTH")}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  revTargetScopeMode === "BOTH"
                    ? "border-[#0F4C81] bg-sky-50/70 ring-2 ring-[#0F4C81]/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkle
                    className={`w-4 h-4 ${revTargetScopeMode === "BOTH" ? "text-[#0F4C81]" : "text-slate-500"}`}
                    weight="duotone"
                  />
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      revTargetScopeMode === "BOTH" ? "border-[#0F4C81] bg-[#0F4C81]" : "border-slate-300"
                    }`}
                  >
                    {revTargetScopeMode === "BOTH" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Keduanya Sekaligus</p>
                  <p className="text-[10px] text-slate-500">Pelanggan & komisi toko</p>
                </div>
              </button>
            </div>
          </div>

          {/* Revisi Target 1: Customer Fee */}
          {(revTargetScopeMode === "BOTH" || revTargetScopeMode === "CUSTOMER_ONLY") && (
            <div className="p-4 rounded-2xl border border-sky-100 bg-sky-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#0F4C81]" weight="duotone" />
                  <h4 className="text-xs font-black text-slate-900">
                    Revisi Biaya Aplikasi Customer
                  </h4>
                </div>
                <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => setRevCustomerFeeType("FIXED")}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                      revCustomerFeeType === "FIXED"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Nominal Tetap (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevCustomerFeeType("PERCENTAGE")}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                      revCustomerFeeType === "PERCENTAGE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Persentase (%)
                  </button>
                </div>
              </div>

              {revCustomerFeeType === "FIXED" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nominal Rupiah (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      step={500}
                      value={revCustomerAmount}
                      onChange={(e) => setRevCustomerAmount(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Persentase (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.1}
                      value={revCustomerPercent}
                      onChange={(e) => setRevCustomerPercent(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Revisi Target 2: Merchant Commission */}
          {(revTargetScopeMode === "BOTH" || revTargetScopeMode === "MERCHANT_ONLY") && (
            <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Storefront className="w-5 h-5 text-emerald-700" weight="duotone" />
                  <h4 className="text-xs font-black text-slate-900">
                    Revisi Komisi Toko Merchant
                  </h4>
                </div>
                <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg gap-1">
                  <button
                    type="button"
                    onClick={() => setRevMerchantFeeType("PERCENTAGE")}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                      revMerchantFeeType === "PERCENTAGE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Persentase (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevMerchantFeeType("FIXED")}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded transition-all ${
                      revMerchantFeeType === "FIXED"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Nominal Tetap (Rp)
                  </button>
                </div>
              </div>

              {revMerchantFeeType === "PERCENTAGE" ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Persentase Komisi (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={0.5}
                      value={revMerchantPercent}
                      onChange={(e) => setRevMerchantPercent(Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nominal Rupiah (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      step={1000}
                      value={revMerchantAmount}
                      onChange={(e) => setRevMerchantAmount(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowRevisionModal(false)}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleCreateRevisionSubmit}
              className="rounded-xl text-xs bg-[#0F4C81] hover:bg-[#0d3f6b] text-white font-bold"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Revisi Draft"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: Detail Rincian Versi Kebijakan
         ========================================================================= */}
      <Modal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title="Rincian Spesifikasi Versi Kebijakan"
        size="lg"
      >
        {inspectingItem && (
          <div className="space-y-5 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500 text-[11px]">
                  ID Versi: {inspectingItem.version.id} • Grup ID: {inspectingItem.group.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inspectingItem.version.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {inspectingItem.version.status}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {inspectingItem.group.display_name} (Versi v{inspectingItem.version.version_no})
              </h3>
              <p className="text-slate-600 text-xs">
                {inspectingItem.group.description || "Tidak ada deskripsi grup."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Target Tarif Terkonfigurasi</h4>
              <div className="space-y-2.5">
                {(inspectingItem.version.targets || []).map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{t.policy_code}</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold">
                          {t.payer_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Charge Scope: {t.charge_scope} • Basis: {t.calculation_base}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {t.fee_type === "FIXED"
                          ? `Rp ${(t.fixed_amount_idr || 0).toLocaleString("id-ID")}`
                          : `${t.percentage_rate}%`}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {t.fee_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>
                <strong>Catatan Perubahan:</strong> {inspectingItem.version.change_reason || "-"}
              </div>
              <div>
                <strong>Waktu Dibuat:</strong>{" "}
                {inspectingItem.version.created_at
                  ? new Date(inspectingItem.version.created_at).toLocaleString("id-ID")
                  : "-"}
              </div>
              <div>
                <strong>Mulai Efektif:</strong>{" "}
                {inspectingItem.version.effective_from
                  ? new Date(inspectingItem.version.effective_from).toLocaleString("id-ID")
                  : "Langsung saat terbit"}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
