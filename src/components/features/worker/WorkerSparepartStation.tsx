"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Package,
  Wrench,
  MagnifyingGlass,
  Clock,
  Truck,
  Plus,
  ArrowRight,
  ShieldCheck,
  X,
  Storefront,
  ChatCircleText,
  Info,
  CheckCircle,
  Sparkle,
} from "@phosphor-icons/react";
import { useWorkerOperations, WorkerJob } from "@/features/worker/useWorkerOperations";
import { Badge } from "@/components/ui/Badge";
import {
  calculateAffiliateReward,
  getAffiliateStatusBadgeInfo,
} from "@/lib/policy/affiliatePolicy";
import {
  MerchantProduct,
  ProductRecommendation,
  SparepartSourceType,
  MerchantShipment,
} from "@/types/domain";

const IS_DEV = process.env.NODE_ENV !== "production";

interface WorkerSparepartStationProps {
  job: WorkerJob;
  onToast: (msg: string) => void;
}

type StationTab =
  | "OVERVIEW"
  | "PROVIDER_PREPARED"
  | "PARTNER_SEARCH"
  | "RECOMMENDATION"
  | "SHIPMENT"
  | "USAGE_RECORD"
  | "FALLBACK";

export function WorkerSparepartStation({ job, onToast }: WorkerSparepartStationProps) {
  const {
    getWorkerActivePartnerships,
    merchantProducts,
    merchantOrders,
    merchantShipments,
    addProviderMaterialToJob,
    sendProductRecommendation,
    updateRecommendationDecision,
    createAssistedProductOrder,
    recordMaterialUsageResult,
    recordJobFallbackOutcome,
    getAttributionByProductOrder,
  } = useWorkerOperations();

  // Active workstation tab
  const [activeTab, setActiveTab] = useState<StationTab>("OVERVIEW");

  // D2: Modal state for adding Provider Prepared material to order
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [selectedPreparedItem, setSelectedPreparedItem] = useState<{
    name: string;
    qty: number;
    price: number;
    reason: string;
  }>({
    name: "Kapasitor Dual Running 35+1.5uF 450VAC",
    qty: 1,
    price: 125000,
    reason: "Kapasitor starting outdoor drop drastis ke 14uF, kompresor gagal start dan trip MCB.",
  });

  // D4: Partner Search & Filter states (strictly scoped to active partnerships)
  const activePartnerships = useMemo(() => {
    return getWorkerActivePartnerships();
  }, [getWorkerActivePartnerships]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedProductForRec, setSelectedProductForRec] = useState<MerchantProduct | null>(null);

  // D6: Recommendation Preview state
  const [recTechnicalReason, setRecTechnicalReason] = useState(
    "Kapasitor starting outdoor drop drastis ke 14uF, kompresor gagal start dan trip MCB."
  );
  const [showRecPreviewModal, setShowRecPreviewModal] = useState(false);

  // Finding #1: Customer Approval Screen / Modal state
  const [showCustomerConfirmModal, setShowCustomerConfirmModal] = useState(false);
  const [selectedRecForConfirm, setSelectedRecForConfirm] = useState<ProductRecommendation | null>(null);

  // Finding #4: Authoritative shipment resolution (Projection only, no independent engine)
  const matchingOrder = merchantOrders.find(
    (o) =>
      (job.orderId && o.serviceOrderId === job.orderId) ||
      job.productRecommendations?.some((r) => r.productOrderId && r.productOrderId === o.id)
  );

  const activeShipment: MerchantShipment | undefined = matchingOrder
    ? merchantShipments.find((s) => s.orderId === matchingOrder.id)
    : job.productRecommendations?.map((r) => r.shipmentId).filter(Boolean)
    ? merchantShipments.find((s) => job.productRecommendations?.some((r) => r.shipmentId === s.id))
    : merchantShipments.length > 0
    ? merchantShipments[0]
    : undefined;

  // D10: Material Usage state (Finding #3: Canonical SparepartSourceType)
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageForm, setUsageForm] = useState({
    name: "",
    qty: 1,
    source: "PROVIDER_OWNED" as SparepartSourceType,
    barcodeNew: "",
    serialOld: "",
    notes: "Unit terpasang sempurna, running test stabil pada arus kompresor 3.8A.",
  });

  // D11: Fallback Outcome Modal
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackType, setFallbackType] = useState<
    | "CUSTOMER_PURCHASED_ELSEWHERE"
    | "CUSTOMER_ALREADY_OWNS"
    | "CUSTOMER_DECLINED"
    | "ALTERNATIVE_PRODUCT_USED"
    | "WAITING_CUSTOMER"
    | "PARTNER_PRODUCT_UNAVAILABLE"
  >("CUSTOMER_ALREADY_OWNS");
  const [fallbackNotes, setFallbackNotes] = useState("");
  const [fallbackAltTitle, setFallbackAltTitle] = useState("");

  // Filtered Products for Partner Store Search (D4)
  const filteredProducts = useMemo(() => {
    return merchantProducts.filter((p) => {
      // 1. Keyword search
      const matchesQuery =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.compatibilityTags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Category filter
      const matchesCategory =
        selectedCategory === "ALL" || p.category.toLowerCase().includes(selectedCategory.toLowerCase());

      return matchesQuery && matchesCategory;
    });
  }, [merchantProducts, searchQuery, selectedCategory]);

  // Compatibility helper (D5)
  const getProductCompatibility = (product: MerchantProduct) => {
    const isACService = job.serviceTitle.toLowerCase().includes("ac");
    const hasCapacitorIssue =
      job.issueDescription.toLowerCase().includes("kapasitor") ||
      job.issueDescription.toLowerCase().includes("trip") ||
      job.issueDescription.toLowerCase().includes("outdoor");

    if (product.sku.includes("CAP-DAIKIN") && isACService && hasCapacitorIssue) {
      return {
        level: "COMPATIBLE" as const,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Kompatibel Terverifikasi",
        notes: "Cocok 100% untuk Panasonic Inverter & Daikin Multi-S 0.5 - 1.5 PK.",
      };
    }
    if (product.category.includes("AC") || product.category.includes("Refrigerant")) {
      return {
        level: "NEEDS_VERIFICATION" as const,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Perlu Verifikasi Dimensi / Voltase",
        notes: "Verifikasi ukuran bracket dan terminal daya di lokasi sebelum instalasi.",
      };
    }
    return {
      level: "UNKNOWN" as const,
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      label: "Cek Spesifikasi Unit",
      notes: "Pastikan spesifikasi voltase dan model unit cocok dengan manual.",
    };
  };

  // Availability helper (D4)
  const getAvailabilitySignal = (stock: number) => {
    if (stock > 5) {
      return {
        label: "Tersedia di Toko Mitra",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        signal: "AVAILABLE",
      };
    }
    if (stock > 0) {
      return {
        label: `Stok Terbatas (${stock} Unit)`,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        signal: "LIMITED",
      };
    }
    return {
      label: "Stok Toko Habis",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      signal: "UNAVAILABLE",
    };
  };

  // Handlers
  const handleConfirmAddProviderMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreparedItem.name.trim()) return;

    addProviderMaterialToJob(job.id, {
      partName: selectedPreparedItem.name,
      quantity: Number(selectedPreparedItem.qty) || 1,
      unitPrice: Number(selectedPreparedItem.price) || 0,
      reason: selectedPreparedItem.reason,
    });

    setShowAddProviderModal(false);
    onToast(`Suku cadang "${selectedPreparedItem.name}" berhasil diajukan ke lembar transaksi!`);
    setActiveTab("OVERVIEW");
  };

  const handleOpenRecPreview = (product: MerchantProduct) => {
    setSelectedProductForRec(product);
    setShowRecPreviewModal(true);
  };

  const handleSendRecommendation = () => {
    if (!selectedProductForRec) return;

    const partnerStore = activePartnerships[0] || {
      merchantId: "mch-01",
      merchantName: "Sejuk Sentra Part AC",
    };

    sendProductRecommendation(job.id, {
      productId: selectedProductForRec.id,
      productTitle: selectedProductForRec.title,
      merchantId: partnerStore.merchantId,
      merchantName: partnerStore.merchantName || "Toko Mitra SERVIO",
      price: selectedProductForRec.price,
      reason: recTechnicalReason,
      compatibilityContext: "Kompatibel terverifikasi untuk unit klien di lokasi.",
      shippingEstimate: "Instan Courier (1-2 Jam)",
      thumbnailUrl: selectedProductForRec.thumbnailUrl,
    });

    setShowRecPreviewModal(false);
    onToast("Rekomendasi suku cadang telah terkirim ke aplikasi pelanggan!");
    setActiveTab("RECOMMENDATION");
  };

  const handleSimulateDecision = (recId: string, isApproved: boolean) => {
    if (!IS_DEV) {
      console.warn("Simulation is forbidden in production environment.");
      return;
    }
    updateRecommendationDecision(
      job.id,
      recId,
      isApproved ? "APPROVED" : "DECLINED",
      isApproved ? "ACCEPT_PARTNER" : "DECLINE",
      true // isSimulation
    );
    onToast(
      isApproved
        ? "[DEV SIMULASI] Status diperbarui: Pelanggan menyetujui rekomendasi suku cadang!"
        : "[DEV SIMULASI] Status diperbarui: Pelanggan menolak rekomendasi suku cadang."
    );
  };

  const handleTriggerAssistedOrder = (recId: string) => {
    // Finding #1: Product order is created with explicit customer authority
    const res = createAssistedProductOrder(job.id, recId, true);
    if (res) {
      onToast(`Pesanan produk #${res.productOrderId} berhasil diterbitkan ke toko mitra!`);
      setActiveTab("SHIPMENT");
    }
  };

  const handleSaveUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageForm.name.trim()) return;

    recordMaterialUsageResult(job.id, {
      name: usageForm.name.trim(),
      quantity: Number(usageForm.qty) || 1,
      source: usageForm.source,
      status: "USED",
      barcodeNew: usageForm.barcodeNew,
      serialOld: usageForm.serialOld,
      notes: usageForm.notes,
    });

    setShowUsageModal(false);
    onToast(`Catatan pemasangan "${usageForm.name}" berhasil dicatat!`);
    setActiveTab("USAGE_RECORD");
  };

  const handleSaveFallback = (e: React.FormEvent) => {
    e.preventDefault();

    recordJobFallbackOutcome(job.id, {
      type: fallbackType,
      notes: fallbackNotes,
      alternativeProductTitle: fallbackAltTitle,
    });

    setShowFallbackModal(false);
    onToast("Catatan penyesuaian jalur pengadaan berhasil disimpan!");
    setActiveTab("FALLBACK");
  };

  // Quick stats
  const providerPartsCount = (job.providerMaterials || []).length;
  const recommendationsCount = (job.productRecommendations || []).length;
  const usedPartsCount = (job.usedMaterials || []).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4 text-left font-body">
      {/* 1. Header & Sourcing Station Navigation (D1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Workspace Material (D1-D11)
            </span>
            <span className="text-[10px] text-slate-400">Terkait Order #{job.orderId}</span>
          </div>
          <h2 className="text-base font-bold font-display text-slate-900 mt-1 flex items-center gap-2">
            <Package size={20} className="text-[#0F4C81]" weight="duotone" />
            <span>Pengadaan & Suku Cadang Lapangan</span>
          </h2>
        </div>

        {/* Quick Mode Pill Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              activeTab === "OVERVIEW"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Ringkasan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PROVIDER_PREPARED")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "PROVIDER_PREPARED"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Bengkel</span>
            {providerPartsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                {providerPartsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PARTNER_SEARCH")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "PARTNER_SEARCH"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Toko Mitra</span>
            <Storefront size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("RECOMMENDATION")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === "RECOMMENDATION"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Rekomendasi</span>
            {recommendationsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center">
                {recommendationsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SHIPMENT")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              activeTab === "SHIPMENT"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Kurir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("USAGE_RECORD")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              activeTab === "USAGE_RECORD"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Terpasang ({usedPartsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("FALLBACK")}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
              activeTab === "FALLBACK"
                ? "bg-[#0F4C81] text-white font-bold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Opsi Klien
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & IN-PLACE SOURCING SELECTOR (D1, D3)                     */}
      {/* ========================================================================= */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-4">
          {/* Post-Arrival Diagnosis Guidance */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Wrench size={15} className="text-[#0F4C81]" weight="duotone" />
                <span>Pilih Jalur Pengadaan Suku Cadang Lapangan (D3)</span>
              </span>
              <span className="text-[10px] text-slate-500 italic">Berdasarkan Hasil Diagnosis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Option A: Bengkel */}
              <button
                type="button"
                onClick={() => setActiveTab("PROVIDER_PREPARED")}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Opsi 1: Bengkel
                  </span>
                  <Package size={16} className="text-amber-600" />
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Suku Cadang Bengkel</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Part yang disiapkan & dibawa dari bengkel sejak awal.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F4C81] mt-2 group-hover:underline">
                  <span>Buka Lembar Bengkel</span>
                  <ArrowRight size={10} />
                </span>
              </button>

              {/* Option B: Toko Mitra */}
              <button
                type="button"
                onClick={() => setActiveTab("PARTNER_SEARCH")}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-[#0F4C81] hover:bg-sky-50/40 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">
                    Opsi 2: Mitra Toko
                  </span>
                  <Storefront size={16} className="text-[#0F4C81]" />
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Toko Mitra Rekanan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cari part kompatibel & kirim rekomendasi ke klien.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F4C81] mt-2 group-hover:underline">
                  <span>Cari di Toko Mitra</span>
                  <ArrowRight size={10} />
                </span>
              </button>

              {/* Option C: Milik Klien / Fallback */}
              <button
                type="button"
                onClick={() => setActiveTab("FALLBACK")}
                className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Opsi 3: Klien
                  </span>
                  <ShieldCheck size={16} className="text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900 text-xs mt-1">Milik Klien / Beli Mandiri</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klien punya part sendiri atau beli mandiri di luar.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-2 group-hover:underline">
                  <span>Catat Opsi Klien</span>
                  <ArrowRight size={10} />
                </span>
              </button>
            </div>
          </div>

          {/* Suku Cadang Aktif Ringkasan */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Status Suku Cadang Terkait Order:</span>
              <button
                type="button"
                onClick={() => setShowUsageModal(true)}
                className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
              >
                <Plus size={12} weight="bold" />
                <span>Catat Pemasangan Langsung</span>
              </button>
            </div>

            {/* Provider Material Lines preview */}
            {job.providerMaterials && job.providerMaterials.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Package size={14} className="text-amber-700" />
                    <span>Suku Cadang Bengkel Diajukan:</span>
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded">
                    {job.providerMaterials.length} Item
                  </span>
                </div>
                {job.providerMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-2.5 rounded-xl bg-white border border-amber-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{mat.partName}</p>
                      <p className="text-[11px] text-slate-500">
                        {mat.quantity} unit • Rp {mat.unitPrice.toLocaleString("id-ID")} • Status:{" "}
                        <span className="font-bold text-amber-700">{mat.customerApprovalStatus}</span>
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">
                      Rp {mat.totalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Product Recommendations preview */}
            {job.productRecommendations && job.productRecommendations.length > 0 && (
              <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#0F4C81] flex items-center gap-1.5">
                    <Storefront size={14} className="text-[#0F4C81]" />
                    <span>Rekomendasi Toko Mitra Diajukan:</span>
                  </span>
                  <span className="text-[10px] font-bold bg-sky-200/60 text-[#0F4C81] px-2 py-0.5 rounded">
                    {job.productRecommendations.length} Rekomendasi
                  </span>
                </div>
                {job.productRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-xl bg-white border border-sky-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{rec.productTitle}</p>
                      <p className="text-[11px] text-slate-500">
                        Dari: {rec.merchantName} • Status:{" "}
                        <span className="font-bold text-sky-800">{rec.status}</span>
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">
                      Rp {rec.priceSnapshot.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROVIDER PREPARED MATERIAL (D2)                                    */}
      {/* ========================================================================= */}
      {activeTab === "PROVIDER_PREPARED" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                <Package size={17} className="text-amber-700" weight="fill" />
                <span>Suku Cadang yang Disiapkan Bengkel (D2)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                Dibawa Teknisi
              </span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Material berikut disiapkan oleh admin bengkel untuk dibawa ke lokasi. Jika setelah pemeriksaan fisik
              komponen ini terbukti wajib diganti, masukkan ke dalam lembar order untuk persetujuan pelanggan.
            </p>
          </div>

          {/* Prepared Items Card */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Fisik Tersedia
                  </span>
                  <span className="text-[11px] text-slate-500">Part #: CAP-35UF-450V-DKN</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">
                  Kapasitor Dual Running 35+1.5uF 450VAC
                </h4>
                <p className="text-xs text-slate-600">
                  Estimasi Biaya: <strong>Rp 125.000 / unit</strong> (Harga standar bengkel)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProviderModal(true)}
                className="py-2 px-3 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0"
              >
                <Plus size={14} weight="bold" />
                <span>Tambahkan ke Order</span>
              </button>
            </div>

            {/* Non-Authoritative Invariant Disclaimer */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <ShieldCheck size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Bisnis Locked: </strong>
                Material Provider tidak otomatis menjadi tagihan atau struk pelanggan. Penambahan hanya dapat terjadi
                setelah teknisi mendiagnosis di lokasi dan pelanggan menyetujui biayanya.
              </span>
            </div>
          </div>

          {/* Existing Added Provider Materials Table */}
          {job.providerMaterials && job.providerMaterials.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-slate-800">
                Material Bengkel yang Telah Diajukan ke Order:
              </h4>
              <div className="space-y-1.5">
                {job.providerMaterials.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{item.partName}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.quantity} unit • Rp {item.unitPrice.toLocaleString("id-ID")} • Status Klien:{" "}
                        <span className="font-bold text-amber-700">{item.customerApprovalStatus}</span>
                      </p>
                      {item.notes && <p className="text-[10px] text-slate-400 mt-0.5 italic">&quot;{item.notes}&quot;</p>}
                    </div>
                    <span className="font-black text-slate-900">
                      Rp {item.totalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PARTNER STORE SEARCH (D4, D5)                                      */}
      {/* ========================================================================= */}
      {activeTab === "PARTNER_SEARCH" && (
        <div className="space-y-3">
          {/* Active Partner Scope Banner (C5/D4 constraint) */}
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200/80 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F4C81] text-xs flex items-center gap-1.5">
                <Storefront size={16} weight="duotone" />
                <span>Pencarian Toko Mitra Resmi (D4 - Scoped by Provider)</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-200 text-sky-900 rounded">
                {activePartnerships.length} Toko Aktif
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Teknisi hanya dapat mencari suku cadang dari toko yang terikat perjanjian kemitraan aktif dengan
              bengkel induk Anda.
            </p>
          </div>

          {/* Search Bar & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari suku cadang (e.g. Kapasitor, Freon, Pipa, Fan)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-[#0F4C81]"
              />
              <MagnifyingGlass size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-[11px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="AC">AC & HVAC Parts</option>
                <option value="Refrigerant">Refrigerant / Freon</option>
                <option value="Piping">Pipa & Fitting</option>
                <option value="Electrical">Elektrikal & Modul</option>
              </select>

              <span className="text-slate-400 text-xs">•</span>

              <span className="text-slate-500 whitespace-nowrap">
                {filteredProducts.length} Produk Ditemukan
              </span>
            </div>
          </div>

          {/* Product Results Grid */}
          {filteredProducts.length > 0 ? (
            <div className="space-y-2.5 pt-1">
              {filteredProducts.map((prod) => {
                const compat = getProductCompatibility(prod);
                const avail = getAvailabilitySignal(prod.stock);

                return (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#0F4C81]/60 transition space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {prod.thumbnailUrl ? (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Image
                              src={prod.thumbnailUrl}
                              alt={prod.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package size={24} />
                          </div>
                        )}

                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            SKU: {prod.sku}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 leading-snug">
                            {prod.title}
                          </h4>
                          <p className="text-xs font-black text-[#0F4C81]">
                            Rp {prod.price.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRecPreview(prod)}
                        className="py-2 px-3 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                      >
                        <span>Pilih Part</span>
                        <ArrowRight size={13} weight="bold" />
                      </button>
                    </div>

                    {/* D5: Compatibility Signal & Availability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                      <div className={`p-2 rounded-xl border ${compat.badge}`}>
                        <div className="flex items-center gap-1 font-bold">
                          <ShieldCheck size={14} />
                          <span>{compat.label}</span>
                        </div>
                        <p className="text-[10px] opacity-90 mt-0.5">{compat.notes}</p>
                      </div>

                      <div className={`p-2 rounded-xl border ${avail.badge}`}>
                        <div className="flex items-center gap-1 font-bold">
                          <Clock size={14} />
                          <span>{avail.label}</span>
                        </div>
                        <p className="text-[10px] opacity-90 mt-0.5">
                          Toko Mitra: Sejuk Sentra Part AC (1.2 km)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              Tidak ditemukan produk suku cadang yang sesuai dengan kata kunci &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RECOMMENDATION PREVIEW & CUSTOMER APPROVAL (D6, D7, D8)             */}
      {/* ========================================================================= */}
      {activeTab === "RECOMMENDATION" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200/90 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F4C81] text-xs flex items-center gap-1.5">
                <ChatCircleText size={16} weight="duotone" />
                <span>Rekomendasi Suku Cadang & Status Klien (D6, D7)</span>
              </span>
              <span className="text-[10px] text-slate-500 italic">Persetujuan Mutlak Milik Klien</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Rekomendasi yang dikirim teknisi akan muncul di aplikasi klien untuk disetujui. Teknisi tidak dapat
              memotong dana klien secara otomatis.
            </p>
          </div>

          {/* Active Recommendations List */}
          {job.productRecommendations && job.productRecommendations.length > 0 ? (
            <div className="space-y-3">
              {job.productRecommendations.map((rec) => {
                const isPending = rec.status === "SUBMITTED" || rec.status === "DRAFT";
                const isApproved = rec.status === "APPROVED";
                const isDeclined = rec.status === "DECLINED";

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPending
                                ? "bg-amber-100 text-amber-800"
                                : isApproved
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isPending
                              ? "Menunggu Konfirmasi Klien"
                              : isApproved
                              ? "Disetujui Pelanggan"
                              : "Ditolak Pelanggan"}
                          </span>
                          <span className="text-[11px] text-slate-400">ID: {rec.id}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 mt-1">
                          {rec.productTitle}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Toko Mitra: <strong>{rec.merchantName}</strong> • Harga:{" "}
                          <strong>Rp {rec.priceSnapshot.toLocaleString("id-ID")}</strong>
                        </p>
                      </div>

                      <span className="font-black text-sm text-[#0F4C81]">
                        Rp {rec.priceSnapshot.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {/* Technical Reason */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                        Alasan Teknis Teknisi:
                      </span>
                      <p className="italic leading-relaxed">&quot;{rec.reason}&quot;</p>
                    </div>

                    {/* D7 & D8: State-Aware Action Buttons (Hardened for Customer Authority) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col items-stretch gap-2 text-xs">
                      {isPending && (
                        <div className="w-full space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock size={14} className="text-amber-600" />
                              <span>Menunggu konfirmasi pelanggan di aplikasi atau handoff di lokasi...</span>
                            </span>

                            {/* Finding #2: Simulation buttons ONLY in dev mode, blocked in prod */}
                            {IS_DEV && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSimulateDecision(rec.id, true)}
                                  className="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] transition"
                                  title="Dev only - Tidak tersedia di production"
                                >
                                  [Dev] Sim. Setuju
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSimulateDecision(rec.id, false)}
                                  className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-[10px] transition"
                                  title="Dev only - Tidak tersedia di production"
                                >
                                  [Dev] Sim. Tolak
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Finding #1: Customer Present Handoff button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecForConfirm(rec);
                              setShowCustomerConfirmModal(true);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                          >
                            <ShieldCheck size={16} weight="bold" />
                            <span>Buka Lembar Konfirmasi Klien di Lokasi (Handoff)</span>
                          </button>
                        </div>
                      )}

                      {isApproved && (
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle size={16} weight="bold" className="text-emerald-600" />
                              <span className="font-bold">
                                {rec.productOrderId
                                  ? `Pesanan #${rec.productOrderId} Telah Diterbitkan`
                                  : "Rekomendasi Disetujui Pelanggan"}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                              Otoritas Sah
                            </span>
                          </div>

                          {rec.productOrderId ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("SHIPMENT")}
                              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <Truck size={16} weight="bold" className="text-[#0F4C81]" />
                              <span>Lacak Pengiriman Kurir Mitra (Tab Logistik)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTriggerAssistedOrder(rec.id)}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
                            >
                              <Package size={16} weight="bold" />
                              <span>Terbitkan Pesanan Produk Sesuai Persetujuan Klien</span>
                            </button>
                          )}

                          {/* Phase E: Worker Affiliate Points & Attribution Card */}
                          {rec.productOrderId && (() => {
                            const existingAttr = getAttributionByProductOrder(rec.productOrderId);
                            const rewardCalc = calculateAffiliateReward(rec.priceSnapshot);
                            const status = existingAttr?.eligibilityStatus || "CONFIRMED";
                            const points = existingAttr?.pointsWorker ?? rewardCalc.pointsWorker;
                            const badgeInfo = getAffiliateStatusBadgeInfo(status);

                            return (
                              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                                    <Sparkle size={15} weight="fill" className="text-purple-600" />
                                    <span>Poin Afiliasi Rekomendasi Mitra</span>
                                  </div>
                                  <Badge variant={badgeInfo.variant} size="sm">
                                    {badgeInfo.label}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-purple-100/80 text-purple-900">
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Alokasi Poin Teknisi:</span>
                                    <span className="font-bold font-mono text-purple-700 text-sm">
                                      +{points} Pts
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block text-[10px]">Toko Rekanan:</span>
                                    <span className="font-medium text-slate-800 line-clamp-1">
                                      {rec.merchantName || "Toko Mitra"}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-[10px] text-slate-500 italic">
                                  * {badgeInfo.description}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {isDeclined && (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-xs text-rose-700 font-medium">
                            Klien menolak pengadaan dari toko ini.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("FALLBACK");
                              setShowFallbackModal(true);
                            }}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                          >
                            Pilih Opsi Alternatif (D11)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
              <p>Belum ada rekomendasi suku cadang toko yang dikirimkan ke pelanggan.</p>
              <button
                type="button"
                onClick={() => setActiveTab("PARTNER_SEARCH")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-sky-900 transition"
              >
                <MagnifyingGlass size={14} weight="bold" />
                <span>Cari Suku Cadang di Toko Mitra</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SHIPMENT TIMELINE (D9 - AUTHORITATIVE SHIPPING DOMAIN PROJECTION)  */}
      {/* ========================================================================= */}
      {activeTab === "SHIPMENT" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200/80 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-[#0F4C81] text-xs flex items-center gap-1.5">
              <Truck size={16} weight="duotone" />
              <span>Pelacakan Kurir Suku Cadang (D9 - Authoritative Projection)</span>
            </span>
            <p className="text-[11px] text-slate-600">
              Proyeksi status pengiriman kurir real-time dari domain Shipping & Fulfillment toko mitra.
            </p>
          </div>

          {activeShipment ? (
            /* Authoritative Shipment Timeline Card */
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Kurir: {activeShipment.courier} ({activeShipment.serviceType})
                  </span>
                  <p className="font-bold text-slate-900 text-sm">Resi: {activeShipment.awbNumber}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Order: #{activeShipment.orderNumber}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1 ${
                    activeShipment.status === "DELIVERED"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeShipment.status === "IN_TRANSIT" || activeShipment.status === "OUT_FOR_DELIVERY"
                      ? "bg-sky-100 text-[#0F4C81] animate-pulse"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <Truck size={14} />
                  <span>
                    {activeShipment.status === "DELIVERED"
                      ? "TIBA DI LOKASI"
                      : activeShipment.status === "IN_TRANSIT"
                      ? "SEDANG DIKIRIM"
                      : activeShipment.status === "OUT_FOR_DELIVERY"
                      ? "KURIR MENUJU LOKASI"
                      : activeShipment.status === "PICKED_UP"
                      ? "DIAMBIL KURIR"
                      : "DIPROSES TOKO"}
                  </span>
                </span>
              </div>

              {/* Destination & ETA Info */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">Penerima: {activeShipment.customerName}</span>
                  <span className="text-slate-500 text-[11px]">Estimasi: {activeShipment.estimatedDelivery}</span>
                </div>
                <p className="text-[11px] text-slate-500">{activeShipment.shippingAddress}</p>
              </div>

              {/* Checkpoints Stepper from Authoritative Domain */}
              <div className="space-y-2.5 pt-1 text-xs">
                {activeShipment.checkpoints && activeShipment.checkpoints.length > 0 ? (
                  activeShipment.checkpoints.map((cp, idx) => {
                    const isLatest = idx === activeShipment.checkpoints.length - 1;
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                            isLatest
                              ? "bg-[#0F4C81] text-white animate-pulse"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {isLatest ? "●" : "✓"}
                        </div>
                        <div>
                          <p className={`font-bold ${isLatest ? "text-[#0F4C81]" : "text-slate-900"}`}>
                            {cp.location} — {cp.status}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {cp.note} {cp.timestamp ? `• ${cp.timestamp}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">Belum ada pembaruan checkpoint kurir.</p>
                )}
              </div>

              {/* Action upon arrival (records material usage, does NOT mutate shipment engine) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Jika kurir telah tiba di alamat:</span>
                <button
                  type="button"
                  onClick={() => {
                    onToast("Status: Suku cadang fisik telah diterima teknisi di lokasi!");
                    setUsageForm((prev) => ({
                      ...prev,
                      name: "Kapasitor AC Daikin Dual Run 35+1.5 uF",
                      source: "PARTNER_MERCHANT",
                    }));
                    setShowUsageModal(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  Tandai Diterima & Pasang (D10)
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
              <Truck size={32} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Belum Ada Pengiriman Suku Cadang Aktif</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Pengiriman kurir otomatis terbentuk saat pelanggan mengonfirmasi rekomendasi suku cadang dari toko mitra.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("RECOMMENDATION")}
                className="mt-2 py-1.5 px-3 rounded-xl bg-[#0F4C81] text-white font-bold text-xs inline-block"
              >
                Ke Tab Rekomendasi
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MATERIAL USAGE RECORD (D10)                                        */}
      {/* ========================================================================= */}
      {activeTab === "USAGE_RECORD" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Daftar Suku Cadang & Material yang Telah Terpasang (D10)
            </span>
            <button
              type="button"
              onClick={() => setShowUsageModal(true)}
              className="py-1.5 px-3 rounded-xl bg-[#0F4C81] text-white font-bold text-xs flex items-center gap-1 hover:bg-sky-900 transition"
            >
              <Plus size={13} weight="bold" />
              <span>Tambah Lembar Pasang</span>
            </button>
          </div>

          {job.usedMaterials && job.usedMaterials.length > 0 ? (
            <div className="space-y-2">
              {job.usedMaterials.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 text-xs shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {item.status === "USED" ? "Terpasang & Teruji" : "Retur Bengkel"}
                        </span>
                        {item.source && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Sumber:{" "}
                            {item.source === "PROVIDER_OWNED"
                              ? "Bengkel (Provider)"
                              : item.source === "PARTNER_MERCHANT"
                              ? "Toko Mitra"
                              : "Beli Mandiri (Klien)"}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{item.name}</h4>
                      <p className="text-slate-500 text-[11px]">Jumlah: {item.quantity} unit</p>
                    </div>

                    <span className="text-xs text-slate-400">{item.barcodeNew || "—"}</span>
                  </div>

                  {item.notes && (
                    <p className="p-2 rounded-xl bg-slate-50 text-[11px] text-slate-700 italic border border-slate-100">
                      &quot;{item.notes}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              Belum ada suku cadang yang dicatat sebagai terpasang.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: FALLBACK OUTCOMES (D11)                                            */}
      {/* ========================================================================= */}
      {activeTab === "FALLBACK" && (
        <div className="space-y-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Info size={16} className="text-[#0F4C81]" weight="duotone" />
              <span>Penyesuaian Jalur Pengadaan & Opsi Alternatif (D11)</span>
            </span>
            <p className="text-[11px] text-slate-500">
              Catat situasi lapangan apabila jalur toko mitra rekanan tidak digunakan (misal klien membeli sendiri di
              luar, klien sudah punya part di rumah, atau menolak penggantian).
            </p>
          </div>

          {job.fallbackOutcome ? (
            <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-2 text-xs shadow-2xs">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                Hasil Alternatif Tercatat: {job.fallbackOutcome.type}
              </span>
              <p className="font-bold text-slate-900 text-sm">
                Catatan: &quot;{job.fallbackOutcome.notes || "Opsi alternatif dicatat teknisi"}&quot;
              </p>
              <p className="text-[11px] text-slate-400">
                Waktu pencatatan: {new Date(job.fallbackOutcome.recordedAt).toLocaleString("id-ID")}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 text-xs">
              <p className="text-slate-600">Pilih opsi situasi suku cadang:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    type: "CUSTOMER_ALREADY_OWNS",
                    title: "Klien Sudah Punya Part",
                    desc: "Klien sudah memiliki suku cadang baru di rumah.",
                  },
                  {
                    type: "CUSTOMER_PURCHASED_ELSEWHERE",
                    title: "Klien Beli Mandiri di Luar",
                    desc: "Klien memilih belanja mandiri di toko langganan fisik.",
                  },
                  {
                    type: "CUSTOMER_DECLINED",
                    title: "Klien Menolak Part",
                    desc: "Klien menolak penggantian suku cadang.",
                  },
                  {
                    type: "ALTERNATIVE_PRODUCT_USED",
                    title: "Part Alternatif Digunakan",
                    desc: "Menggunakan part substitusi dengan persetujuan klien.",
                  },
                  {
                    type: "WAITING_CUSTOMER",
                    title: "Servis Ditunda / Tertahan",
                    desc: "Pekerjaan tertunda menunggu ketersediaan part klien.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setFallbackType(opt.type as typeof fallbackType);
                      setShowFallbackModal(true);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#0F4C81] hover:bg-sky-50/40 text-left transition"
                  >
                    <p className="font-bold text-slate-900">{opt.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD PROVIDER MATERIAL MODAL (D2)                                */}
      {/* ========================================================================= */}
      {showAddProviderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAddProviderMaterial}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Suku Cadang Bengkel (D2)
                </span>
                <h3 className="text-sm font-bold font-display text-slate-900 mt-1">
                  Tambahkan ke Tagihan Servis
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProviderModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Suku Cadang:</label>
                <input
                  type="text"
                  value={selectedPreparedItem.name}
                  onChange={(e) =>
                    setSelectedPreparedItem({ ...selectedPreparedItem, name: e.target.value })
                  }
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah:</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedPreparedItem.qty}
                    onChange={(e) =>
                      setSelectedPreparedItem({
                        ...selectedPreparedItem,
                        qty: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp):</label>
                  <input
                    type="number"
                    value={selectedPreparedItem.price}
                    onChange={(e) =>
                      setSelectedPreparedItem({
                        ...selectedPreparedItem,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Alasan Diagnosis Fisik di Lokasi:
                </label>
                <textarea
                  rows={2}
                  value={selectedPreparedItem.reason}
                  onChange={(e) =>
                    setSelectedPreparedItem({
                      ...selectedPreparedItem,
                      reason: e.target.value,
                    })
                  }
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[11px]"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center justify-between">
                <span>Total Tambahan Material:</span>
                <span>
                  Rp{" "}
                  {(
                    selectedPreparedItem.qty * selectedPreparedItem.price
                  ).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddProviderModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition"
              >
                Konfirmasi Ajukan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECOMMENDATION PREVIEW MODAL (D6)                                */}
      {/* ========================================================================= */}
      {showRecPreviewModal && selectedProductForRec && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded">
                  Preview Rekomendasi (D6)
                </span>
                <h3 className="text-sm font-bold font-display text-slate-900 mt-1">
                  Kirim Rekomendasi ke Pelanggan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRecPreviewModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 text-xs leading-snug">
                  {selectedProductForRec.title}
                </p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Harga Resmi Toko:</span>
                  <span className="font-black text-slate-900">
                    Rp {selectedProductForRec.price.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Toko Mitra:</span>
                  <span className="font-bold text-slate-700">Sejuk Sentra Part AC (1.2 km)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Estimasi Kurir:</span>
                  <span className="font-bold text-emerald-700">Instan (1-2 Jam) • Rp 15.000</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Alasan Teknis Penggantian Part:
                </label>
                <textarea
                  rows={3}
                  value={recTechnicalReason}
                  onChange={(e) => setRecTechnicalReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[11px]"
                />
              </div>

              {/* Explicit Customer Decides Invariant */}
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-[11px] leading-relaxed flex items-start gap-1.5">
                <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Penting: </strong>
                  Rekomendasi ini akan dikirim ke aplikasi klien untuk meminta persetujuan. Tidak ada biaya yang
                  langsung dipotong sebelum pelanggan setuju.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRecPreviewModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendRecommendation}
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition"
              >
                Kirim ke Klien
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMER CONFIRMATION SCREEN (FINDING #1: HANDOFF IN PERSON)       */}
      {/* ========================================================================= */}
      {showCustomerConfirmModal && selectedRecForConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-left font-body">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Otoritas Pelanggan (Customer Approval)
                </span>
                <h3 className="font-bold font-display text-slate-900 text-base mt-1">
                  Lembar Konfirmasi Pembelian Klien
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomerConfirmModal(false);
                  setSelectedRecForConfirm(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-slate-700">
              <p className="font-semibold text-[#0F4C81]">
                Serahkan layar ini langsung kepada Pelanggan ({job.customerName}).
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pelanggan wajib memeriksa rincian pengadaan suku cadang sebelum memberikan persetujuan resmi.
              </p>
            </div>

            {/* Service & Product Context */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="border-b border-slate-200/60 pb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Konteks Servis Unit:
                </span>
                <p className="font-bold text-slate-900">{job.serviceTitle}</p>
                <p className="text-[11px] text-slate-500">
                  Order #{job.orderId} • Pelanggan: {job.customerName}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Suku Cadang Rekomendasi:
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedRecForConfirm.productTitle}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Toko Mitra: <strong>{selectedRecForConfirm.merchantName}</strong>
                </p>
                {selectedRecForConfirm.reason && (
                  <p className="mt-1.5 p-2 rounded-xl bg-white border border-slate-200/80 italic text-[11px] text-slate-600">
                    &quot;{selectedRecForConfirm.reason}&quot;
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-slate-200/60 pt-2 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Harga Suku Cadang Asli (1 unit):</span>
                  <span className="font-semibold text-slate-900">
                    Rp {selectedRecForConfirm.priceSnapshot.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Biaya Pengiriman Kurir Instan:</span>
                  <span className="font-semibold text-slate-900">Rp 15.000</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Biaya Layanan Aplikasi:</span>
                  <span className="font-semibold text-slate-900">Rp 5.000</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-900">Total Pembayaran Suku Cadang:</span>
                  <span className="text-[#0F4C81] font-black text-base">
                    Rp {(selectedRecForConfirm.priceSnapshot + 20000).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal / Confirmation Disclaimer */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <span>
                Dengan mengonfirmasi, <strong>Pelanggan menyetujui pemesanan suku cadang asli ini</strong> ke toko mitra untuk langsung dikirimkan dan dipasang oleh teknisi pada unit Anda.
              </span>
            </div>

            {/* Customer Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  updateRecommendationDecision(
                    job.id,
                    selectedRecForConfirm.id,
                    "DECLINED",
                    "DECLINE"
                  );
                  setShowCustomerConfirmModal(false);
                  setSelectedRecForConfirm(null);
                  onToast("Klien memilih untuk menolak rekomendasi suku cadang.");
                }}
                className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition text-center"
              >
                Tolak / Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = createAssistedProductOrder(
                    job.id,
                    selectedRecForConfirm.id,
                    true // explicit customer confirmation!
                  );
                  setShowCustomerConfirmModal(false);
                  setSelectedRecForConfirm(null);
                  if (res) {
                    onToast(
                      `Pesanan #${res.productOrderId} berhasil disetujui klien & diterbitkan ke toko mitra!`
                    );
                    setActiveTab("SHIPMENT");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition text-center shadow-xs"
              >
                Setujui & Buat Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RECORD USAGE MODAL (D10)                                         */}
      {/* ========================================================================= */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUsage}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Pencatatan Material (D10)
                </span>
                <h3 className="text-sm font-bold font-display text-slate-900 mt-1">
                  Catat Suku Cadang Terpasang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Suku Cadang:</label>
                <input
                  type="text"
                  value={usageForm.name}
                  onChange={(e) => setUsageForm({ ...usageForm, name: e.target.value })}
                  required
                  placeholder="e.g. Kapasitor 35uF Daikin"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah:</label>
                  <input
                    type="number"
                    min="1"
                    value={usageForm.qty}
                    onChange={(e) =>
                      setUsageForm({ ...usageForm, qty: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Asal Suku Cadang:</label>
                  <select
                    value={usageForm.source}
                    onChange={(e) =>
                      setUsageForm({
                        ...usageForm,
                        source: e.target.value as SparepartSourceType,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  >
                    <option value="PROVIDER_OWNED">Bengkel Induk (Provider)</option>
                    <option value="PARTNER_MERCHANT">Toko Mitra (Partner Merchant)</option>
                    <option value="CUSTOMER_SELF_PURCHASE">Milik Klien / Beli Mandiri</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Barcode Baru / No. Seri (Opsional):
                </label>
                <input
                  type="text"
                  value={usageForm.barcodeNew}
                  onChange={(e) => setUsageForm({ ...usageForm, barcodeNew: e.target.value })}
                  placeholder="BC-CAP-35UF-..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Pengujian Pemasangan:
                </label>
                <textarea
                  rows={2}
                  value={usageForm.notes}
                  onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowUsageModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                Simpan Lembar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FALLBACK OUTCOME MODAL (D11)                                     */}
      {/* ========================================================================= */}
      {showFallbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFallback}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  Opsi Alternatif (D11)
                </span>
                <h3 className="text-sm font-bold font-display text-slate-900 mt-1">
                  Catat Situasi Suku Cadang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFallbackModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Situasi Suku Cadang:</label>
                <select
                  value={fallbackType}
                  onChange={(e) => setFallbackType(e.target.value as typeof fallbackType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="CUSTOMER_ALREADY_OWNS">Klien Sudah Memiliki Suku Cadang Pribadi</option>
                  <option value="CUSTOMER_PURCHASED_ELSEWHERE">Klien Membeli Sendiri di Luar Platform</option>
                  <option value="CUSTOMER_DECLINED">Klien Menolak Penggantian Suku Cadang</option>
                  <option value="ALTERNATIVE_PRODUCT_USED">Menggunakan Produk Alternatif Lain</option>
                  <option value="WAITING_CUSTOMER">Pekerjaan Tertahan Menunggu Kesiapan Part Klien</option>
                  <option value="PARTNER_PRODUCT_UNAVAILABLE">Stok di Toko Mitra Rekanan Habis</option>
                </select>
              </div>

              {fallbackType === "ALTERNATIVE_PRODUCT_USED" && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Produk Alternatif:
                  </label>
                  <input
                    type="text"
                    value={fallbackAltTitle}
                    onChange={(e) => setFallbackAltTitle(e.target.value)}
                    placeholder="e.g. Kapasitor 35uF Merk Panasonic"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Keterangan Lapangan:
                </label>
                <textarea
                  rows={3}
                  value={fallbackNotes}
                  onChange={(e) => setFallbackNotes(e.target.value)}
                  placeholder="Jelaskan kesepakatan dengan klien atau situasi di lokasi..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFallbackModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition"
              >
                Simpan Catatan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
