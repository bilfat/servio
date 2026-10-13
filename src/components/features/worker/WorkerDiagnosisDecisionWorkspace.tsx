"use client";

import React, { useState, useMemo } from "react";
import {
  Wrench,
  CheckCircle,
  WarningCircle,
  CurrencyCircleDollar,
  Package,
  Storefront,
  Plus,
  Trash,
  Camera,
  Gauge,
  ListChecks,
  WarningOctagon,
  Clock,
  Receipt,
  HandCoins,
  HourglassMedium,
  X,
  ShieldStar,
  Sparkle,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { useWorkerOperations, WorkerJob } from "@/features/worker/useWorkerOperations";
import { AdditionalWorkItem } from "@/mocks/workerJobs";

interface WorkerDiagnosisDecisionWorkspaceProps {
  job: WorkerJob;
  onToast: (msg: string) => void;
  onRefreshJob?: () => void;
}

type SparepartChoice =
  | "NONE"
  | "PROVIDER_OWNED"
  | "PARTNER_STORE"
  | "CUSTOMER_SELF_PURCHASE"
  | "CUSTOMER_OWNED";

export function WorkerDiagnosisDecisionWorkspace({
  job,
  onToast,
}: WorkerDiagnosisDecisionWorkspaceProps) {
  const {
    addProviderMaterialToJob,
    sendProductRecommendation,
    createAssistedProductOrder,
    recordMaterialUsageResult,
  } = useWorkerOperations();

  // 1. Customer Presence State (Section 30)
  const [customerPresence, setCustomerPresence] = useState<"PRESENT" | "ABSENT">(
    job.diagnosis?.customerPresence || (job.customerNotes?.toLowerCase().includes("tidak") ? "ABSENT" : "PRESENT")
  );
  const [showPreServiceRef, setShowPreServiceRef] = useState(false);

  // 2. Scope & Additional Work State (Section 6)
  const initialAdditionalWork: AdditionalWorkItem[] = useMemo(() => {
    if (job.diagnosis?.additionalWork && job.diagnosis.additionalWork.length > 0) {
      return job.diagnosis.additionalWork;
    }
    if (job.pricing?.additionalServiceFee && job.pricing.additionalServiceFee > 0) {
      return [
        {
          id: "add-1",
          title: job.pricing.adjustmentReason || "Pekerjaan Tambahan Lapangan",
          price: job.pricing.additionalServiceFee,
          isApproved: job.pricing.customerApprovalStatus === "APPROVED",
        },
      ];
    }
    return [];
  }, [job]);

  const [additionalWorkItems, setAdditionalWorkItems] = useState<AdditionalWorkItem[]>(initialAdditionalWork);
  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [newWorkPrice, setNewWorkPrice] = useState<number>(100000);

  // 3. Base Service Cost State (Section 7)
  const [baseServiceFee, setBaseServiceFee] = useState<number>(
    job.pricing?.baseServiceFee || job.pricing?.originalPrice || job.feeWorker || 150000
  );
  const [workerNotes, setWorkerNotes] = useState<string>(
    job.diagnosis?.workerNotes || job.diagnosis?.findingsSummary || "Pemeriksaan teknis selesai dilakukan di unit."
  );

  // Additional work total sum
  const additionalWorkTotal = useMemo(() => {
    return additionalWorkItems.reduce((acc, item) => acc + item.price, 0);
  }, [additionalWorkItems]);

  const subtotalJasa = baseServiceFee + additionalWorkTotal;

  // 4. Provider Authorization Decision Check (Section 8)
  // Policy rule: If additional work > Rp 100.000 or providerAuthStatus is PENDING/PENDING_AUTH, provider auth is required
  const isProviderAuthRequired = useMemo(() => {
    if (job.pricing?.providerAuthStatus === "PENDING" || job.pricing?.providerAuthStatus === "PENDING_AUTH") {
      return true;
    }
    if (job.branchType === "PRICE_ADJUSTMENT_PROVIDER") {
      return true;
    }
    return additionalWorkTotal > 100000;
  }, [job, additionalWorkTotal]);

  const [providerAuthStatus, setProviderAuthStatus] = useState<string>(
    job.pricing?.providerAuthStatus || (isProviderAuthRequired ? "PENDING_AUTH" : "NOT_REQUIRED")
  );

  // 5. Sparepart Decision State (Section 9)
  const initialSparepartChoice: SparepartChoice = useMemo(() => {
    if (job.branchType === "PROVIDER_OWNED_SPAREPART") return "PROVIDER_OWNED";
    if (
      job.branchType === "PARTNER_MERCHANT_DIRECT" ||
      job.branchType === "PARTNER_MERCHANT_RECOMMENDATION" ||
      job.branchType === "PARTNER_APPROVED_WAITING_SHIPMENT" ||
      job.branchType === "MANDATORY_SPAREPART_BLOCKED" ||
      job.branchType === "ALTERNATIVE_PRODUCT_USED"
    ) {
      return "PARTNER_STORE";
    }
    if (job.branchType === "CUSTOMER_SELF_PURCHASE") return "CUSTOMER_SELF_PURCHASE";
    if (job.branchType === "CUSTOMER_ALREADY_OWNS") return "CUSTOMER_OWNED";
    if (job.sparepart?.source === "PROVIDER_OWNED") return "PROVIDER_OWNED";
    if (job.sparepart?.source === "PARTNER_MERCHANT") return "PARTNER_STORE";
    if (job.sparepart?.source === "CUSTOMER_SELF_PURCHASE") return "CUSTOMER_SELF_PURCHASE";
    return "NONE";
  }, [job]);

  const [sparepartChoice, setSparepartChoice] = useState<SparepartChoice>(initialSparepartChoice);
  const [isMandatory, setIsMandatory] = useState<boolean>(
    job.sparepart?.isMandatory ?? (job.branchType !== "OPTIONAL_SPAREPART_REJECTED")
  );

  // Branch 2: Provider Owned Material Modal & Data
  const [showProviderMaterialModal, setShowProviderMaterialModal] = useState(false);
  const [providerPartName, setProviderPartName] = useState(
    job.sparepart?.partName || "Kapasitor 35uF 450VAC Resmi Bengkel"
  );
  const [providerPartQty, setProviderPartQty] = useState(1);
  const [providerPartPrice, setProviderPartPrice] = useState(
    job.sparepart?.unitPrice || 85000
  );
  const [isProviderMaterialAdded, setIsProviderMaterialAdded] = useState(
    (job.providerMaterials && job.providerMaterials.length > 0) || job.branchType === "PROVIDER_OWNED_SPAREPART"
  );

  // Branch 3: Partner Store Data
  const [partnerStoreName] = useState("Sejuk Sentra Part AC");
  const [partnerProductTitle] = useState(
    job.sparepart?.partName || "Capacitor Dual Run 35uF Toko Mitra"
  );
  const [partnerProductPrice] = useState(job.sparepart?.unitPrice || 145000);
  const [partnerShippingFee] = useState(20000);
  const [partnerDeliveryEta] = useState(job.sparepart?.eta || "20–30 Menit (GoSend Instant)");
  const [recommendationSent, setRecommendationSent] = useState(
    job.branchType === "PARTNER_MERCHANT_RECOMMENDATION" ||
    job.branchType === "PARTNER_APPROVED_WAITING_SHIPMENT"
  );
  const [showOnSiteConfirmModal, setShowOnSiteConfirmModal] = useState(false);

  // Branch 4: Customer Self Purchase
  const [customerPartReceived, setCustomerPartReceived] = useState(false);

  // Branch 5: Customer Owned Part Validation
  const [customerPartValidated, setCustomerPartValidated] = useState(
    job.branchType === "CUSTOMER_ALREADY_OWNS"
  );

  // Handlers
  const handleAddAdditionalWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkTitle.trim()) return;

    const newItem: AdditionalWorkItem = {
      id: `add-${Date.now()}`,
      title: newWorkTitle.trim(),
      price: Number(newWorkPrice) || 0,
      isApproved: false,
    };

    setAdditionalWorkItems((prev) => [...prev, newItem]);
    setNewWorkTitle("");
    setNewWorkPrice(100000);
    setShowAddWorkModal(false);
    onToast(`Pekerjaan tambahan "${newItem.title}" ditambahkan ke draft biaya.`);
  };

  const handleRemoveAdditionalWork = (id: string) => {
    setAdditionalWorkItems((prev) => prev.filter((item) => item.id !== id));
    onToast("Item pekerjaan tambahan dihapus.");
  };

  const handleAddProviderMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    addProviderMaterialToJob(job.id, {
      partName: providerPartName,
      quantity: providerPartQty,
      unitPrice: providerPartPrice,
      reason: "Komponen melemah paska diagnosis fisik di unit.",
    });
    setIsProviderMaterialAdded(true);
    setShowProviderMaterialModal(false);
    onToast(`Material bengkel "${providerPartName}" berhasil diajukan ke tagihan servis.`);
  };

  const handleSendRecommendation = () => {
    sendProductRecommendation(job.id, {
      productId: "prod-rec-cap-35",
      productTitle: partnerProductTitle,
      merchantId: "merch-sejuk-sentra",
      merchantName: partnerStoreName,
      price: partnerProductPrice,
      reason: "Kapasitor starting outdoor melembung dan drop drastis.",
      compatibilityContext: `Kompatibel 100% dengan ${job.diagnosis?.assetModel || "Daikin Inverter"}`,
      shippingEstimate: partnerDeliveryEta,
    });
    setRecommendationSent(true);
    onToast("Rekomendasi suku cadang berhasil dikirim ke aplikasi pelanggan.");
  };

  const handleOnSiteDirectConfirm = () => {
    createAssistedProductOrder(job.id, "rec-direct-001", true);
    setShowOnSiteConfirmModal(false);
    onToast("Pelanggan mengonfirmasi pesanan part mitra di tempat. Pesanan diteruskan ke toko rekanan.");
  };

  const handleRecordUsageCustomerPart = () => {
    recordMaterialUsageResult(job.id, {
      name: job.sparepart?.partName || "Suku Cadang Pelanggan",
      quantity: 1,
      source: "CUSTOMER_SELF_PURCHASE",
      status: "USED",
      notes: "Suku cadang diperiksa fisik dan berfungsi normal setelah dipasang.",
    });
    setCustomerPartValidated(true);
    onToast("Pemakaian suku cadang bawaan pelanggan telah divalidasi & dicatat ke lembar kerja.");
  };

  // Calculations for Receipt
  const serviceContextTotal =
    subtotalJasa + (sparepartChoice === "PROVIDER_OWNED" && isProviderMaterialAdded ? providerPartPrice * providerPartQty : 0);

  const productOrderTotal =
    sparepartChoice === "PARTNER_STORE" ? partnerProductPrice + partnerShippingFee : 0;

  const totalOverallContext = serviceContextTotal + productOrderTotal;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-6 text-slate-800">
      {/* ========================================================================= */}
      {/* 1. TOP OF DIAGNOSIS RESULT (Section 5) */}
      {/* ========================================================================= */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                Decision Workspace
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Order #{job.orderId}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 tracking-tight">
              Hasil Diagnosa Lapangan
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock size={14} className="text-slate-400" />
            <span>Selesai Inspeksi: <strong>{job.diagnosis?.diagnosedAt || "14:35 WIB"}</strong></span>
          </div>
        </div>

        {/* Diagnosis Header Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Layanan</span>
            <span className="font-bold text-slate-900 truncate block">{job.serviceTitle}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pelanggan</span>
            <span className="font-bold text-slate-900 truncate block">{job.customerName}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Terdeteksi</span>
            <span className="font-bold text-slate-900 truncate block">{job.diagnosis?.assetModel || "AC Split Inverter"}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Teknisi</span>
            <span className="font-bold text-[#0F4C81] truncate block">Budi Santoso</span>
          </div>
        </div>

        {/* Subtle Pre-Service Reference (Informational Clue Only) */}
        {(job.aiPreparationContext || job.providerNotes) && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3 text-xs space-y-2">
            <button
              type="button"
              onClick={() => setShowPreServiceRef((prev) => !prev)}
              className="w-full flex items-center justify-between text-left font-semibold text-[#0F4C81]"
            >
              <div className="flex items-center gap-1.5">
                <Sparkle size={14} weight="fill" className="text-sky-600" />
                <span className="text-[11px]">Rujukan Persiapan Awal dari Provider &amp; AI (Informasional)</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span>{showPreServiceRef ? "Sembunyikan" : "Lihat Rujukan"}</span>
                {showPreServiceRef ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </div>
            </button>

            {showPreServiceRef && (
              <div className="pt-2 border-t border-sky-100/80 space-y-2 text-[11px] text-slate-700">
                {job.providerNotes && (
                  <p>
                    <strong className="text-amber-800">Catatan Provider: </strong>
                    &quot;{job.providerNotes}&quot;
                  </p>
                )}
                {job.aiPreparationContext && (
                  <div>
                    <span className="font-semibold block text-slate-800">Saran Pemeriksaan AI:</span>
                    <p className="text-slate-600">{job.aiPreparationContext.summary}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      *Teknisi tetap memiliki wewenang penuh untuk menetapkan temuan aktual di bawah ini.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Technical Findings Box */}
        <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-violet-900 flex items-center gap-1.5">
              <Wrench size={14} weight="bold" className="text-violet-700" />
              Temuan Diagnosis Fisik:
            </span>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-violet-200 text-slate-700">
              {job.diagnosis?.problemFound || "Komponen Melemah"}
            </span>
          </div>

          <p className="text-slate-800 leading-relaxed font-medium text-xs">
            &quot;{job.diagnosis?.technicalFindings || "Pemeriksaan resistansi dan kapasitas komponen menunjukkan penurunan daya fungsi."}&quot;
          </p>

          <div className="pt-2 border-t border-violet-200/60 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <CheckCircle size={14} weight="fill" className="text-emerald-600" />
              Motor Kompresor: Normal
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <CheckCircle size={14} weight="fill" className="text-emerald-600" />
              Tekanan Freon: Stabil
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <WarningCircle size={14} weight="fill" className="text-amber-600" />
              Kapasitor: Penurunan Kapasitansi
            </span>
          </div>

          {/* Evidence Attachments */}
          <div className="pt-2 border-t border-violet-200/60 flex items-center gap-2 overflow-x-auto text-[10px] font-bold">
            <span className="text-slate-500 uppercase tracking-wider text-[9px] shrink-0">Bukti:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-slate-700 shrink-0">
              <Camera size={12} className="text-violet-700" />
              Foto Fisik Komponen
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-slate-700 shrink-0">
              <Gauge size={12} className="text-violet-700" />
              Uji Multitester (Digital)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-slate-700 shrink-0">
              <ListChecks size={12} className="text-violet-700" />
              Checklist K3 Lapangan
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER PRESENCE UI (Section 30) */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Kehadiran Pelanggan di Lokasi
          </span>
          <p className="text-slate-600 text-[11px]">
            Menentukan mode persetujuan (konfirmasi langsung di tempat vs notifikasi remote). Otoritas tetap pada Pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setCustomerPresence("PRESENT")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
              customerPresence === "PRESENT"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Hadir di Lokasi</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomerPresence("ABSENT")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
              customerPresence === "ABSENT"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-300" />
            <span>Tidak Hadir (Remote)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SECTION A — SCOPE PEKERJAAN (Section 6) */}
      {/* ========================================================================= */}
      <div className="space-y-3 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
            <ListChecks size={16} weight="bold" className="text-[#0F4C81]" />
            <span>1. Ruang Lingkup Pekerjaan (Scope of Work)</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Section A
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Lingkup Pesanan Asal
            </span>
            <p className="font-semibold text-slate-800">
              {job.diagnosis?.originalScope || job.serviceTitle}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200">
            <span className="text-[10px] uppercase font-bold text-[#0F4C81] block mb-0.5">
              Rekomendasi Lingkup Paska Diagnosa
            </span>
            <p className="font-semibold text-slate-900">
              {job.diagnosis?.diagnosisScope || `${job.serviceTitle} + Rekondisi Suku Cadang`}
            </p>
          </div>
        </div>

        {/* Additional Work List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Pekerjaan Tambahan Lapangan ({additionalWorkItems.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddWorkModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] hover:bg-sky-100 border border-sky-200 text-xs font-bold transition"
            >
              <Plus size={13} weight="bold" />
              <span>Tambah Pekerjaan</span>
            </button>
          </div>

          {additionalWorkItems.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
              Tidak ada pekerjaan tambahan. Scope pekerjaan sesuai pesanan awal.
            </div>
          ) : (
            <div className="space-y-1.5">
              {additionalWorkItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-900 block truncate">{item.title}</span>
                    <span className="text-[10px] text-amber-700 font-bold block">
                      + Rp {item.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalWork(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Hapus item"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION B — BIAYA JASA (Section 7 & 8) */}
      {/* ========================================================================= */}
      <div className="space-y-3.5 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
            <CurrencyCircleDollar size={16} weight="bold" className="text-emerald-700" />
            <span>2. Kalkulasi Biaya Jasa Aktual</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Section B
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Biaya Jasa Pokok Aktual (Rp):
              </label>
              <input
                type="number"
                value={baseServiceFee}
                onChange={(e) => setBaseServiceFee(Number(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Estimasi Awal: Rp {(job.pricing?.originalPrice || 150000).toLocaleString("id-ID")}
              </span>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Total Pekerjaan Tambahan:
              </label>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 font-bold text-amber-700 text-xs flex items-center justify-between">
                <span>Rp {additionalWorkTotal.toLocaleString("id-ID")}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  {additionalWorkItems.length} item
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
            <span className="text-slate-700">Subtotal Jasa Layanan:</span>
            <span className="text-base font-display text-[#0F4C81]">
              Rp {subtotalJasa.toLocaleString("id-ID")}
            </span>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Catatan Penyesuaian Teknisi:
            </label>
            <input
              type="text"
              value={workerNotes}
              onChange={(e) => setWorkerNotes(e.target.value)}
              placeholder="Jelaskan alasan penyesuaian biaya jasa..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          {/* Provider Authorization Check Banner (Section 8) */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] ${
              isProviderAuthRequired
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
            }`}
          >
            {isProviderAuthRequired ? (
              <WarningCircle size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <span className="font-bold block">
                {isProviderAuthRequired
                  ? "Perubahan biaya memerlukan otorisasi Provider (Pekerjaan Tambahan > Rp 100.000)"
                  : "Persetujuan Provider tidak diperlukan untuk perubahan biaya ini (Dalam batas mandiri)."}
              </span>
              <p className="text-[10px] opacity-80 mt-0.5">
                {isProviderAuthRequired
                  ? "Sesuai kebijakan komersial, pengajuan biaya diajukan ke Provider sebelum diteruskan ke pelanggan."
                  : "Dapat langsung diajukan untuk konfirmasi pelanggan."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECTION C — SPAREPART / MATERIAL DECISION (Sections 9 to 21) */}
      {/* ========================================================================= */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
            <Package size={16} weight="bold" className="text-purple-700" />
            <span>3. Keputusan Suku Cadang & Material</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Section C
          </span>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block mb-2">
            Apakah pekerjaan servis membutuhkan suku cadang/material?
          </span>

          {/* 5 Radio choices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              {
                id: "NONE" as const,
                title: "Tidak Diperlukan",
                desc: "Hanya pembersihan / perbaikan setting",
              },
              {
                id: "PROVIDER_OWNED" as const,
                title: "Provider Punya Sparepart",
                desc: "Material resmi dari bengkel mitra",
              },
              {
                id: "PARTNER_STORE" as const,
                title: "Cari dari Toko Partner",
                desc: "Pengadaan via toko rekanan terdekat",
              },
              {
                id: "CUSTOMER_SELF_PURCHASE" as const,
                title: "Customer Beli Sendiri",
                desc: "Klien membeli mandiri di luar platform",
              },
              {
                id: "CUSTOMER_OWNED" as const,
                title: "Customer Sudah Punya Part",
                desc: "Klien menyimpan suku cadang eksisting",
              },
            ].map((choice) => (
              <label
                key={choice.id}
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-2.5 ${
                  sparepartChoice === choice.id
                    ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-200"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                }`}
              >
                <input
                  type="radio"
                  name="sparepartChoice"
                  checked={sparepartChoice === choice.id}
                  onChange={() => setSparepartChoice(choice.id)}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block leading-tight">
                    {choice.title}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {choice.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Criticality Selector (Section 21: Optional vs Mandatory) */}
        {sparepartChoice !== "NONE" && (
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Tingkat Urgensi Komponen (Criticality):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                  !isMandatory
                    ? "bg-white border-sky-300 text-sky-950 font-bold shadow-xs"
                    : "bg-slate-100/60 border-slate-200 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="criticality"
                  checked={!isMandatory}
                  onChange={() => setIsMandatory(false)}
                  className="text-sky-600"
                />
                <div className="min-w-0 text-[11px]">
                  <span>Opsional</span>
                  <p className="text-[9px] font-normal text-slate-500 leading-tight">
                    Servis tetap dapat berlanjut jika ditolak klien.
                  </p>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                  isMandatory
                    ? "bg-white border-rose-300 text-rose-950 font-bold shadow-xs"
                    : "bg-slate-100/60 border-slate-200 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="criticality"
                  checked={isMandatory}
                  onChange={() => setIsMandatory(true)}
                  className="text-rose-600"
                />
                <div className="min-w-0 text-[11px]">
                  <span>Wajib (Mandatory)</span>
                  <p className="text-[9px] font-normal text-slate-500 leading-tight">
                    Servis tertahan jika part tidak tersedia.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Branch Context Paneling */}
        {sparepartChoice === "NONE" && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
            <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
            <span>
              <strong>Tidak Memerlukan Suku Cadang: </strong>
              Pekerjaan hanya mencakup jasa teknis. Biaya material Rp 0. Siap lanjut ke persetujuan jasa.
            </span>
          </div>
        )}

        {sparepartChoice === "PROVIDER_OWNED" && (
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 flex items-center gap-1.5">
                <Package size={15} weight="fill" className="text-purple-700" />
                Material Resmi Bengkel (Provider-Owned)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Sedia di Tas Kerja
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Part</span>
                <span className="font-bold text-slate-800 truncate block">{providerPartName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jumlah</span>
                <span className="font-bold text-slate-800 block">{providerPartQty} Unit</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Harga Satuan</span>
                <span className="font-bold text-[#0F4C81] block">Rp {providerPartPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-600">
                {isProviderMaterialAdded
                  ? "✓ Telah ditambahkan ke draft rincian servis."
                  : "Klik tombol di samping untuk memasukkan ke rincian tagihan."}
              </span>
              <button
                type="button"
                onClick={() => setShowProviderMaterialModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition shadow-xs"
              >
                {isProviderMaterialAdded ? "Ubah Rincian Part" : "Tambahkan ke Order"}
              </button>
            </div>
          </div>
        )}

        {sparepartChoice === "PARTNER_STORE" && (
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 flex items-center gap-1.5">
                <Storefront size={15} weight="fill" className="text-blue-700" />
                Pengadaan Toko Partner (Terikat Merchant Product)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Mitra Resmi
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-blue-100 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Toko Rekanan</span>
                  <p className="font-bold text-slate-900">{partnerStoreName} (1.8 km • ⭐ 4.9)</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Kompatibel
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Harga Produk:</span>
                  <span className="font-bold text-slate-800">Rp {partnerProductPrice.toLocaleString("id-ID")}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ongkir Kurir Instan:</span>
                  <span className="font-bold text-slate-800">Rp {partnerShippingFee.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Estimasi Tiba: <strong>{partnerDeliveryEta}</strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-blue-900">
                {customerPresence === "PRESENT"
                  ? "Pelanggan di lokasi: Tampilkan rincian part untuk disetujui langsung di tempat."
                  : "Pelanggan tidak di lokasi: Kirim rekomendasi ke aplikasi pelanggan (Remote Approval)."}
              </p>

              {customerPresence === "PRESENT" ? (
                <button
                  type="button"
                  onClick={() => setShowOnSiteConfirmModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition shadow-xs"
                >
                  Tampilkan ke Customer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendRecommendation}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shrink-0 transition shadow-xs"
                >
                  {recommendationSent ? "Kirim Ulang Rekomendasi" : "Kirim Rekomendasi"}
                </button>
              )}
            </div>
          </div>
        )}

        {sparepartChoice === "CUSTOMER_SELF_PURCHASE" && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <HourglassMedium size={16} weight="bold" className="text-amber-700 shrink-0" />
              <span>Menunggu Pembelian Mandiri oleh Pelanggan</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Pelanggan memilih mencari dan membeli sparepart sendiri di luar sistem SERVIO. Status pekerjaan ditandai <strong>WAITING_CUSTOMER_PART</strong>.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                {customerPartReceived ? "✓ Suku cadang fisik telah diterima." : "Menunggu pelanggan menyerahkan fisik part."}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomerPartReceived(true);
                  onToast("Status diperbarui: Suku cadang dari pelanggan telah diterima di lokasi.");
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs"
              >
                Catat Material Diterima
              </button>
            </div>
          </div>
        )}

        {sparepartChoice === "CUSTOMER_OWNED" && (
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-900 block">
              Suku Cadang Milik Pelanggan (Sudah Ada di Rumah)
            </span>
            <p className="text-[11px] text-slate-600">
              Komponen eksisting milik klien. Tidak ada transaksi pengadaan produk atau komisi bengkel atas barang.
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-semibold">
                {customerPartValidated ? "✓ Suku cadang divalidasi cocok & layak pakai." : "Verifikasi kompatibilitas fisik part."}
              </span>
              <button
                type="button"
                onClick={handleRecordUsageCustomerPart}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition shadow-xs"
              >
                Validasi & Catat Pemakaian
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. RINGKASAN BIAYA & PENGADAAN (ONE RECEIPT EXPERIENCE) (Sections 22, 23) */}
      {/* ========================================================================= */}
      <div className="space-y-3.5 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
            <Receipt size={16} weight="bold" className="text-[#0F4C81]" />
            <span>4. Ringkasan Biaya & Pengadaan (One Receipt)</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Combined View
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Panel 1: Layanan Servis */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block border-b border-slate-200 pb-1">
              Tagihan Layanan Servis (Service Order)
            </span>

            <div className="space-y-1 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Jasa Pokok:</span>
                <span className="font-semibold text-slate-800">Rp {baseServiceFee.toLocaleString("id-ID")}</span>
              </div>
              {additionalWorkTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span>Pekerjaan Tambahan:</span>
                  <span className="font-semibold text-amber-700">+ Rp {additionalWorkTotal.toLocaleString("id-ID")}</span>
                </div>
              )}
              {sparepartChoice === "PROVIDER_OWNED" && isProviderMaterialAdded && (
                <div className="flex items-center justify-between">
                  <span>Material Bengkel:</span>
                  <span className="font-semibold text-purple-700">+ Rp {(providerPartPrice * providerPartQty).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
              <span className="text-slate-900">Subtotal Servis:</span>
              <span className="text-sm text-[#0F4C81]">Rp {serviceContextTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Panel 2: Order Produk Toko Mitra */}
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block border-b border-blue-200 pb-1">
              Order Produk Toko Mitra (Product Order)
            </span>

            {sparepartChoice === "PARTNER_STORE" ? (
              <>
                <div className="space-y-1 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Part ({partnerStoreName}):</span>
                    <span className="font-semibold text-slate-800">Rp {partnerProductPrice.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ongkos Kirim Kurir:</span>
                    <span className="font-semibold text-slate-800">Rp {partnerShippingFee.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200 flex items-center justify-between font-bold">
                  <span className="text-slate-900">Subtotal Produk:</span>
                  <span className="text-sm text-blue-800">Rp {productOrderTotal.toLocaleString("id-ID")}</span>
                </div>
              </>
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs italic">
                Tidak ada order barang toko mitra.
              </div>
            )}
          </div>
        </div>

        {/* Combined Overall Context Note */}
        <div className="p-3 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
          <span>Total Keseluruhan Konteks Servis:</span>
          <span className="text-base text-amber-300">
            Rp {totalOverallContext.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. PAYMENT CONDITION (Sections 24, 25) */}
      {/* ========================================================================= */}
      <div className="space-y-3.5 border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900 flex items-center gap-1.5">
            <HandCoins size={16} weight="bold" className="text-amber-600" />
            <span>5. Kondisi Pembayaran & Pelunasan</span>
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Financial State
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Pembayaran Layanan Awal:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle size={14} weight="fill" />
              Rp {(job.pricing?.originalPaidAmount || 150000).toLocaleString("id-ID")} (Lunas)
            </span>
          </div>

          {additionalWorkTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Biaya Tambahan Diperlukan:</span>
              <span className="font-bold text-amber-800">
                Rp {additionalWorkTotal.toLocaleString("id-ID")} (Menunggu Pelunasan)
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-600">Kesiapan Eksekusi Lapangan:</span>
            <span
              className={`font-bold ${
                job.pricing?.isExecutionEligible
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {job.pricing?.isExecutionEligible
                ? "✓ Siap Dikerjakan (Kondisi Biaya Terpenuhi)"
                : "Tertahan: Menunggu Persetujuan / Pembayaran"}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. FINAL DYNAMIC ACTION AREA (Section 26) */}
      {/* ========================================================================= */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Aksi Berikutnya Berdasarkan Status
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Tahap Keputusan Diagnosa
          </span>
        </div>

        {/* Dynamic CTA rendering based on conditions */}
        {job.branchType === "MANDATORY_SPAREPART_BLOCKED" ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <WarningOctagon size={20} weight="fill" className="text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">SERVIS TERTAHAN — Komponen Wajib Belum Tersedia</span>
                <span className="text-[11px] text-rose-800">Pengerjaan teknis diblokir hingga part pengganti tersedia.</span>
              </div>
            </div>
            <a
              href="#spareparts"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition"
            >
              Lihat Pengadaan
            </a>
          </div>
        ) : job.branchType === "PAYMENT_FAILED_AFTER_APPROVAL" ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <WarningCircle size={20} weight="fill" className="text-rose-600 shrink-0" />
              <div>
                <span className="font-bold block">PEMBAYARAN TAMBAHAN GAGAL</span>
                <span className="text-[11px] text-rose-800">Menunggu pelanggan menyelesaikan pelunasan metode pembayaran.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToast("Membuka rincian invoice pembayaran klien.")}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 transition"
            >
              Lihat Status Pembayaran
            </button>
          </div>
        ) : isProviderAuthRequired && providerAuthStatus === "PENDING_AUTH" ? (
          <button
            type="button"
            onClick={() => {
              setProviderAuthStatus("SUBMITTED");
              onToast("Pengajuan otorisasi biaya tambahan telah diteruskan ke Provider Bengkel.");
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <ShieldStar size={18} weight="bold" />
            <span>AJUKAN OTORISASI KE PROVIDER</span>
          </button>
        ) : sparepartChoice === "PROVIDER_OWNED" && !isProviderMaterialAdded ? (
          <button
            type="button"
            onClick={() => setShowProviderMaterialModal(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Package size={18} weight="bold" />
            <span>TAMBAHKAN MATERIAL BENGKEL KE ORDER</span>
          </button>
        ) : sparepartChoice === "PARTNER_STORE" && customerPresence === "PRESENT" ? (
          <button
            type="button"
            onClick={() => setShowOnSiteConfirmModal(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} weight="bold" />
            <span>TAMPILKAN KE CUSTOMER DI TEMPAT</span>
          </button>
        ) : sparepartChoice === "PARTNER_STORE" && customerPresence === "ABSENT" ? (
          <button
            type="button"
            onClick={handleSendRecommendation}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <Storefront size={18} weight="bold" />
            <span>KIRIM REKOMENDASI KE APLIKASI KLIEN</span>
          </button>
        ) : sparepartChoice === "CUSTOMER_SELF_PURCHASE" && !customerPartReceived ? (
          <button
            type="button"
            onClick={() => {
              setCustomerPartReceived(true);
              onToast("Status diperbarui: Suku cadang dari pelanggan telah diterima.");
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <HourglassMedium size={18} weight="bold" />
            <span>CATAT MATERIAL DITERIMA DARI KLIEN</span>
          </button>
        ) : sparepartChoice === "CUSTOMER_OWNED" && !customerPartValidated ? (
          <button
            type="button"
            onClick={handleRecordUsageCustomerPart}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} weight="bold" />
            <span>VALIDASI & CATAT PEMAKAIAN PART</span>
          </button>
        ) : (
          <a
            href="#proof"
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 text-center"
          >
            <CheckCircle size={18} weight="bold" />
            <span>MULAI / LANJUTKAN PENGERJAAN SERVIS</span>
          </a>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Modal Tambah Pekerjaan Tambahan */}
      {showAddWorkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddAdditionalWork}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Tambah Pekerjaan Tambahan
              </h3>
              <button
                type="button"
                onClick={() => setShowAddWorkModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama / Lingkup Pekerjaan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Balancing Fan Motor, Pengelasan Pipa..."
                  value={newWorkTitle}
                  onChange={(e) => setNewWorkTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Estimasi Biaya Jasa (Rp):
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  required
                  value={newWorkPrice}
                  onChange={(e) => setNewWorkPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddWorkModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs"
              >
                Tambahkan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal Konfirmasi Tambah Material Bengkel */}
      {showProviderMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddProviderMaterial}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Material Resmi Bengkel
              </h3>
              <button
                type="button"
                onClick={() => setShowProviderMaterialModal(false)}
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
                  required
                  value={providerPartName}
                  onChange={(e) => setProviderPartName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah:</label>
                  <input
                    type="number"
                    min={1}
                    value={providerPartQty}
                    onChange={(e) => setProviderPartQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp):</label>
                  <input
                    type="number"
                    min={0}
                    value={providerPartPrice}
                    onChange={(e) => setProviderPartPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-[11px] text-purple-900">
                <strong>Catatan Stok: </strong>
                Material dicatat sebagai <code>ProviderMaterialLine</code> dan ditagihkan kepada pelanggan paska persetujuan.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowProviderMaterialModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-xs"
              >
                Tambahkan sebagai Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Modal Tampilkan ke Customer di Tempat (Direct On-Site) */}
      {showOnSiteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Konfirmasi Pelanggan di Tempat
              </h3>
              <button
                type="button"
                onClick={() => setShowOnSiteConfirmModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 text-[11px]">
                Silakan perlihatkan layar ini kepada Bapak/Ibu <strong>{job.customerName}</strong> untuk konfirmasi pengadaan suku cadang mitra:
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block">{partnerProductTitle}</span>
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span>Harga Barang:</span>
                  <span className="font-bold text-slate-800">Rp {partnerProductPrice.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 text-[11px]">
                  <span>Ongkos Kirim Kurir:</span>
                  <span className="font-bold text-slate-800">Rp {partnerShippingFee.toLocaleString("id-ID")}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-xs">
                  <span>Total Pengadaan:</span>
                  <span className="text-[#0F4C81]">Rp {(partnerProductPrice + partnerShippingFee).toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[11px] text-slate-700">
                Setelah pelanggan menyetujui, pesanan toko diteruskan ke toko rekanan <strong>{partnerStoreName}</strong>.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOnSiteConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleOnSiteDirectConfirm}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Pelanggan Menyetujui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
