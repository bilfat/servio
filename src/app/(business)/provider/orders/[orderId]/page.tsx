"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ClipboardText,
  ArrowLeft,
  User,
  MapPin,
  CalendarBlank,
  Wrench,
  Truck,
  CheckCircle,
  FileText,
  ChatCircleText,
  WarningCircle,
  UserSwitch,
  Clock,
  Package,
  CurrencyCircleDollar,
  CheckSquareOffset,
  ShieldCheck,
  Warning,
  MagnifyingGlass,
  ArrowRight,
  Receipt,
  XCircle,
  Info,
  CalendarCheck,
  Sparkle,
  Handshake,
  Certificate,
} from "@phosphor-icons/react";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { getAffiliateStatusBadgeInfo } from "@/lib/policy/affiliatePolicy";
import { WorkerTechnician } from "@/types/domain";

interface OrderWorkerEligibility {
  worker: WorkerTechnician;
  isEligible: boolean;
  matchedServiceName?: string;
}

export default function ProviderOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "";

  const { orders, authorizePriceAdjustment, verifyProofOfService, getOrderById } = useServiceOrder(orderId);
  const { workers } = useProviderOperations();
  const repo = useDomainRepository();

  const foundOrder = getOrderById ? getOrderById(orderId) : orders.find((o) => o.id === orderId);

  const attribution = foundOrder
    ? repo.getAttributionByServiceOrder(foundOrder.id) ||
      (foundOrder.relatedProductOrderIds?.[0]
        ? repo.getAttributionByProductOrder(foundOrder.relatedProductOrderIds[0])
        : undefined)
    : undefined;

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    foundOrder?.assignedWorker?.id || workers[0]?.id || ""
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [orderProviderNote, setOrderProviderNote] = useState<string>(foundOrder?.providerNotes || "");
  const [includeAiContext, setIncludeAiContext] = useState<boolean>(true);

  // Modals state for C8 & C9
  const [showRejectAuthModal, setShowRejectAuthModal] = useState(false);
  const [rejectAuthReason, setRejectAuthReason] = useState("");
  const [showProofRevisionModal, setShowProofRevisionModal] = useState(false);
  const [proofRevisionNotes, setProofRevisionNotes] = useState("");

  // Check worker capability eligibility for this order
  const orderWorkerEligibilityList: OrderWorkerEligibility[] = useMemo(() => {
    if (!foundOrder) return [];
    const title = (foundOrder.serviceTitle || "").toLowerCase();

    return workers.map((worker) => {
      const caps = repo.getWorkerCapabilities(worker.id);
      const activeCaps = caps.length > 0 ? caps : worker.capabilities || [];

      const matched = activeCaps.find((cap) => {
        const mName = (cap.masterServiceName || "").toLowerCase();
        const subName = (cap.subcategoryName || "").toLowerCase();
        const catName = (cap.categoryName || "").toLowerCase();

        if (mName && (title.includes(mName) || mName.includes(title))) return true;

        if (
          (title.includes("ac") ||
            title.includes("air conditioner") ||
            title.includes("cuci") ||
            title.includes("dingin") ||
            title.includes("inverter")) &&
          (mName.includes("ac") || subName.includes("ac") || subName.includes("cooling"))
        ) {
          if (
            (title.includes("cuci") || title.includes("cleaning") || title.includes("perawatan")) &&
            (mName.includes("clean") || mName.includes("cuci"))
          ) {
            return true;
          }
          if (
            (title.includes("perbaikan") || title.includes("repair") || title.includes("rusak") || title.includes("berdesis") || title.includes("bocor")) &&
            (mName.includes("repair") || mName.includes("perbaikan"))
          ) {
            return true;
          }
          return true;
        }

        if (
          (title.includes("listrik") || title.includes("electrical")) &&
          (mName.includes("electric") || subName.includes("electrical") || mName.includes("listrik"))
        ) {
          return true;
        }

        if (
          (title.includes("mobil") || title.includes("car") || title.includes("otomotif")) &&
          (mName.includes("car") || subName.includes("car") || catName.includes("automotive"))
        ) {
          return true;
        }

        return false;
      });

      return {
        worker,
        isEligible: Boolean(matched),
        matchedServiceName: matched?.masterServiceName,
      };
    });
  }, [foundOrder, workers, repo]);

  if (!foundOrder) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ClipboardText}
          title="Order Tidak Ditemukan"
          description={`Order dengan ID "${orderId}" tidak terdaftar dalam workspace operasional.`}
          action={{
            label: "Kembali ke Order Operasional",
            href: "/provider/orders",
          }}
        />
      </div>
    );
  }

  // Handle worker re-assignment with notes & AI preparation context
  const handleAssignWorker = () => {
    const worker = workers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;
    repo.assignWorker(foundOrder.id, selectedWorkerId, orderProviderNote, includeAiContext);
    setShowAssignModal(false);
    setToastMessage(`Teknisi ${worker.name} berhasil ditugaskan ke order ${foundOrder.id} beserta catatan persiapan.`);
  };

  // C8: Handle Provider Authorization for Price Adjustment
  const handleAuthorizePrice = () => {
    authorizePriceAdjustment(foundOrder.id, true);
    setToastMessage("Penyesuaian biaya telah disetujui oleh Provider dan diteruskan ke Pelanggan untuk approval.");
  };

  const handleRejectPrice = () => {
    if (!rejectAuthReason.trim()) return;
    authorizePriceAdjustment(foundOrder.id, false, rejectAuthReason.trim());
    setShowRejectAuthModal(false);
    setRejectAuthReason("");
    setToastMessage("Pengajuan penyesuaian biaya ditolak. Catatan klarifikasi dikirim ke teknisi.");
  };

  // C9: Handle Proof Verification
  const handleVerifyProof = () => {
    verifyProofOfService(foundOrder.id, true);
    setToastMessage("Bukti servis berhasil diverifikasi oleh Tim QA Provider. Menunggu konfirmasi penyelesaian dari pelanggan.");
  };

  const handleRequestProofRevision = () => {
    if (!proofRevisionNotes.trim()) return;
    verifyProofOfService(foundOrder.id, false, proofRevisionNotes.trim());
    setShowProofRevisionModal(false);
    setProofRevisionNotes("");
    setToastMessage("Permintaan foto/bukti tambahan dikirimkan ke teknisi lapangan.");
  };

  const proof = repo.getProof(foundOrder.id) || foundOrder.proofOfService;
  const priceAdj = foundOrder.priceAdjustment;
  const diagnosis = foundOrder.diagnosis;

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Breadcrumb */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <Link
          href="/provider/orders"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0F4C81] mb-3 transition"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Order Operasional</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-bold text-slate-400">
                {foundOrder.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  foundOrder.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : foundOrder.status === "IN_PROGRESS"
                    ? "bg-purple-100 text-purple-800"
                    : foundOrder.status === "WAITING_APPROVAL" || foundOrder.status === "QUOTATION_REVIEW"
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : foundOrder.status === "WAITING_SPAREPART"
                    ? "bg-purple-100 text-purple-900"
                    : foundOrder.status === "AWAITING_PROOF_REVIEW"
                    ? "bg-sky-100 text-sky-900"
                    : foundOrder.status === "DISPUTED"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {foundOrder.statusLabel || foundOrder.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                Mode: {foundOrder.serviceMode}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
              {foundOrder.serviceTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal Servis: {foundOrder.scheduledDate} • Slot {foundOrder.scheduledTimeSlot}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/provider/chat/${foundOrder.id}`}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-xs transition"
            >
              <ChatCircleText size={16} className="text-[#0F4C81]" />
              <span>Chat Pelanggan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Unified Worker Timeline Projection (docs/todo.md Section 56C.7) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">
              Proyeksi Timeline Terpadu
            </span>
            <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-[#0F4C81]" />
              Status Lapangan (Authoritative Worker Timeline)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            Otoritas Eksekusi: Teknisi Lapangan
          </span>
        </div>

        {/* Stepper Horizontal Display */}
        <div className="relative pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {foundOrder.stepper.map((step, idx) => (
              <div
                key={step.id || idx}
                className={`p-3 rounded-2xl border text-xs flex flex-col justify-between transition ${
                  step.isCurrent
                    ? "bg-sky-50/50 border-[#0F4C81] ring-2 ring-[#0F4C81]/20"
                    : step.isCompleted
                    ? "bg-slate-50 border-slate-200"
                    : "bg-white border-slate-100 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      Step {idx + 1}
                    </span>
                    {step.isCompleted ? (
                      <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                    ) : step.isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    )}
                  </div>
                  <p className="font-bold text-slate-900 text-[11px] leading-tight mb-1">
                    {step.title}
                  </p>
                  <p className="text-slate-500 text-[10px] line-clamp-2">
                    {step.description}
                  </p>
                </div>
                {step.timestamp && (
                  <span className="text-[9px] text-slate-400 mt-2 font-mono block">
                    {step.timestamp}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout: 2 Cols Left + 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer, Technical Diagnosis, Pricing Context, Proof & Completion */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Customer & Location */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <User size={18} className="text-[#0F4C81]" />
              Informasi Klien &amp; Alamat Servis
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-slate-400 font-medium">Nama Pelanggan</span>
                <p className="font-bold text-slate-900 text-sm">{foundOrder.customerName}</p>
                <p className="text-slate-500 font-mono">{foundOrder.customerPhone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-slate-400 font-medium">Alamat Lokasi Servis</span>
                <p className="font-bold text-slate-900 flex items-start gap-1">
                  <MapPin size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>{foundOrder.address}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Field Technical Diagnosis (docs/todo.md Section 56C.7) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <Wrench size={18} className="text-purple-600" />
                Hasil Diagnosis &amp; Temuan Lapangan
              </h2>
              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                Diperiksa oleh Teknisi
              </span>
            </div>

            {diagnosis ? (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-purple-900">
                      Unit yang Diperiksa: {diagnosis.assetInspected || "AC Split"}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(diagnosis.inspectedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {diagnosis.findingsSummary}
                  </p>
                </div>

                {/* Identified issues checklist */}
                {diagnosis.identifiedIssues && diagnosis.identifiedIssues.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block">Daftar Masalah yang Teridentifikasi:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {diagnosis.identifiedIssues.map((issue, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2">
                          <WarningCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-slate-700 font-medium">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended action */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                  <strong className="text-slate-900 block mb-0.5">Rekomendasi Tindakan Teknisi:</strong>
                  <span>{diagnosis.recommendedAction}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400">
                <Info size={20} className="mx-auto mb-1 text-slate-400" />
                <p className="font-semibold text-slate-600">Diagnosis Belum Diinput</p>
                <p className="text-[11px]">Teknisi lapangan sedang dalam perjalanan atau sedang memeriksa unit di lokasi.</p>
              </div>
            )}
          </div>

          {/* Card 3: Contextual Price Adjustment & Conditional Authorization (docs/todo.md Section 56C.8, C8) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Komersial &amp; Biaya
                </span>
                <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <CurrencyCircleDollar size={18} className="text-amber-600" weight="bold" />
                  Penyesuaian Biaya &amp; Otorisasi Provider
                </h2>
              </div>

              {priceAdj && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    priceAdj.providerAuthStatus === "AUTHORIZED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : priceAdj.providerAuthStatus === "REJECTED"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-amber-50 text-amber-900 border-amber-300 animate-pulse"
                  }`}
                >
                  {priceAdj.providerAuthStatus === "AUTHORIZED"
                    ? "Telah Diotorisasi Provider"
                    : priceAdj.providerAuthStatus === "REJECTED"
                    ? "Ditolak oleh Provider"
                    : "Menunggu Otorisasi Provider"}
                </span>
              )}
            </div>

            {priceAdj ? (
              <div className="space-y-4">
                {/* Cost breakdown table */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between font-semibold text-slate-600 pb-2 border-b border-slate-200">
                    <span>Komponen Biaya yang Diajukan Teknisi:</span>
                    <span>Nominal (IDR)</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Biaya Jasa Servis Utama / Final:</span>
                    <span className="font-mono font-bold">
                      Rp {priceAdj.finalServiceFee.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span>Material Fisik / Suku Cadang:</span>
                    <span className="font-mono font-bold">
                      Rp {priceAdj.sparepartFee.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {priceAdj.additionalWorkFee > 0 && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Pekerjaan Tambahan Lapangan:</span>
                      <span className="font-mono font-bold">
                        Rp {priceAdj.additionalWorkFee.toLocaleString("id-ID")}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Total Pengajuan Biaya:</span>
                    <span className="text-[#0F4C81] text-base">
                      Rp {priceAdj.totalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Conditional Provider Authorization Box */}
                {priceAdj.requiresProviderAuth && priceAdj.providerAuthStatus === "PENDING" && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-2 text-amber-900">
                      <WarningCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">Otorisasi Provider Diperlukan</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {priceAdj.providerAuthReason ||
                            "Total penyesuaian biaya melebihi batas kebijakan bengkel (Rp 300.000). Perlu persetujuan Provider sebelum diteruskan ke Pelanggan."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAuthorizePrice}
                        className="bg-emerald-600 hover:bg-emerald-700 border-none flex items-center gap-1"
                      >
                        <CheckCircle size={15} weight="bold" />
                        <span>Setujui &amp; Teruskan ke Pelanggan</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRejectAuthModal(true)}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <XCircle size={15} />
                        <span>Minta Klarifikasi / Tolak</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already Authorized Status */}
                {priceAdj.providerAuthStatus === "AUTHORIZED" && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                      <div>
                        <p className="font-bold">Otorisasi Provider Telah Diberikan</p>
                        <p className="text-[10px] text-emerald-700">
                          {priceAdj.providerAuthorizedAt
                            ? `Disetujui pada ${new Date(priceAdj.providerAuthorizedAt).toLocaleString("id-ID")}`
                            : "Menunggu persetujuan komersial akhir dari Pelanggan."}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Siap Approval Customer
                    </span>
                  </div>
                )}

                {/* Customer Approval Status (Customer owns final commercial authority!) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Status Persetujuan Akhir Pelanggan:
                    </span>
                    <p className="font-bold text-slate-900 text-xs mt-0.5">
                      {priceAdj.customerApprovalStatus === "APPROVED"
                        ? "Disetujui oleh Pelanggan (Pekerjaan Dapat Dilanjutkan)"
                        : priceAdj.customerApprovalStatus === "REJECTED"
                        ? "Ditolak oleh Pelanggan (Tidak Menyetujui Biaya Tambahan)"
                        : "Menunggu Konfirmasi & Pembayaran Tambahan dari Pelanggan"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      priceAdj.customerApprovalStatus === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : priceAdj.customerApprovalStatus === "REJECTED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {priceAdj.customerApprovalStatus === "APPROVED"
                      ? "APPROVED"
                      : priceAdj.customerApprovalStatus === "REJECTED"
                      ? "REJECTED"
                      : "PENDING CUSTOMER"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Biaya Sesuai Ruang Lingkup Standar</p>
                  <p className="text-slate-500 text-[11px]">
                    Belum ada pengajuan penyesuaian biaya atau pekerjaan tambahan dari teknisi di lokasi.
                  </p>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  Rp {(foundOrder.pricing?.totalAmount || 0).toLocaleString("id-ID")}
                </span>
              </div>
            )}
          </div>

          {/* Card 4: Sparepart & Material Context (docs/todo.md Section 56C.7 & Phase C Section 5) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <Package size={18} className="text-[#0F4C81]" />
                Konteks Suku Cadang &amp; Material Layanan
              </h2>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">
                Non-Inventory Context
              </span>
            </div>

            {/* Provider-Owned Material Line Items */}
            {foundOrder.providerMaterials && foundOrder.providerMaterials.length > 0 && (
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">
                  Material Fisik Bawaan Bengkel (Provider-Owned):
                </span>
                <div className="space-y-1.5">
                  {foundOrder.providerMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{mat.partName} (x{mat.quantity})</p>
                        <p className="text-slate-500 text-[11px]">Part No: {mat.partNumber || "Standar"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-900">
                          Rp {mat.totalPrice.toLocaleString("id-ID")}
                        </p>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Tercatat di Order
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase E: Partner Store Sparepart & Affiliate Attribution Context */}
            {(foundOrder.sparepartBlockStatus?.isBlocked || foundOrder.relatedProductOrderIds?.length || attribution) && (
              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 text-purple-950">
                    <span className="p-1.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0 mt-0.5">
                      <Sparkle size={16} weight="fill" />
                    </span>
                    <div>
                      <p className="font-bold text-xs">Atribusi Afiliasi Kemitraan Toko</p>
                      <p className="text-purple-800 text-[11px] mt-0.5">
                        {foundOrder.sparepartBlockStatus?.reason || "Pengadaan suku cadang resmi melalui kemitraan Toko Mitra rekanan."}
                      </p>
                    </div>
                  </div>
                  {attribution && (
                    <Badge variant={getAffiliateStatusBadgeInfo(attribution.eligibilityStatus).variant} size="sm">
                      {getAffiliateStatusBadgeInfo(attribution.eligibilityStatus).label}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-white/90 border border-purple-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Nomor Pesanan Suku Cadang:</span>
                    <span className="font-mono font-bold text-slate-900">
                      #{attribution?.productOrderId || foundOrder.relatedProductOrderIds?.[0] || "PO-PART-MITRA"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Poin Bengkel (Provider):</span>
                    <span className="font-mono font-bold text-purple-700 text-sm">
                      +{attribution?.pointsProvider || 110} Pts
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Poin Teknisi (Worker):</span>
                    <span className="font-mono font-bold text-sky-700 text-sm">
                      +{attribution?.pointsWorker || 110} Pts
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  * Atribusi poin afiliasi Servio terproteksi sistemik (Read-only). Poin akan diselesaikan ke saldo setelah barang sampai & layanan tuntas.
                </p>
              </div>
            )}

            {!foundOrder.providerMaterials?.length && !foundOrder.sparepartBlockStatus?.isBlocked && (
              <p className="text-slate-400 italic">
                Tidak ada kebutuhan penggantian sparepart khusus pada pesanan ini.
              </p>
            )}
          </div>

          {/* Card 5: Proof of Service QA Verification (docs/todo.md Section 56C.7, C9) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
                  Kontrol Kualitas (QA)
                </span>
                <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <CheckSquareOffset size={18} className="text-sky-600" />
                  Verifikasi Bukti Hasil Servis (Proof of Service)
                </h2>
              </div>

              {proof && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    proof.verificationStatus === "VERIFIED_BY_PROVIDER"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : proof.verificationStatus === "REVISION_REQUESTED"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-sky-50 text-sky-800 border-sky-200 animate-pulse"
                  }`}
                >
                  {proof.verificationStatus === "VERIFIED_BY_PROVIDER"
                    ? "QA Terverifikasi"
                    : proof.verificationStatus === "REVISION_REQUESTED"
                    ? "Revisi Bukti Diminta"
                    : "Menunggu Verifikasi Provider"}
                </span>
              )}
            </div>

            {proof ? (
              <div className="space-y-4">
                {/* Photo Media Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {proof.media.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="relative h-32 w-full bg-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.imageUrl}
                          alt={m.label}
                          className="w-full h-full object-cover"
                        />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold ${
                          m.type === "BEFORE" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                        }`}>
                          {m.type}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="font-bold text-slate-900 truncate">{m.label}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tested Parameters */}
                {proof.testedParameters && proof.testedParameters.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block">Parameter Uji Kerja Standar:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {proof.testedParameters.map((p, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-white border border-slate-200 text-[11px]">
                          <span className="text-slate-400 block text-[10px]">{p.parameter}</span>
                          <span className="font-bold text-slate-900">{p.value}</span>
                          <span className="text-slate-400 block text-[9px]">Standar: {p.standard}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons for Provider QA */}
                {proof.verificationStatus === "PENDING_PROVIDER_REVIEW" && (
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sky-950">Konfirmasi Kualitas Hasil Servis</p>
                      <p className="text-[11px] text-sky-800">
                        Pastikan seluruh foto dan parameter telah memenuhi SOP bengkel sebelum diteruskan ke pelanggan.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleVerifyProof}
                        className="bg-[#0F4C81] hover:bg-[#0d3f6b] flex items-center gap-1"
                      >
                        <CheckCircle size={15} weight="bold" />
                        <span>Verifikasi Bukti</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowProofRevisionModal(true)}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <XCircle size={15} />
                        <span>Minta Foto Tambahan</span>
                      </Button>
                    </div>
                  </div>
                )}

                {proof.verificationStatus === "VERIFIED_BY_PROVIDER" && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                    <span>
                      Telah diverifikasi oleh {proof.verifiedByProviderName || "Tim QA"} pada{" "}
                      {proof.verifiedAt ? new Date(proof.verifiedAt).toLocaleTimeString("id-ID") : "hari ini"}.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400">
                <CheckSquareOffset size={20} className="mx-auto mb-1 text-slate-400" />
                <p className="font-semibold text-slate-600">Bukti Belum Diunggah</p>
                <p className="text-[11px]">Teknisi akan mengunggah foto before/after dan checklist uji parameter saat pengerjaan selesai.</p>
              </div>
            )}
          </div>

          {/* Card 6: Completion & Warranty Monitoring (Section 20 & C9) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              Pemantauan Penyelesaian &amp; Garansi Layanan
            </h2>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Status Konfirmasi Penyelesaian Customer:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  foundOrder.customerConfirmedAt
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {foundOrder.customerConfirmedAt ? "Telah Dikonfirmasi Pelanggan" : "Menunggu Konfirmasi Pelanggan"}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Sesuai arsitektur Servio, konfirmasi penyelesaian dan rilis dana escrow dilakukan secara mandiri oleh Pelanggan. Provider memantau status tanpa hak substitusi konfirmasi.
              </p>
              {foundOrder.status === "COMPLETED" && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-emerald-700 font-bold">
                  <span>Garansi Resmi Servio Aktif:</span>
                  <span>{foundOrder.warrantyPeriodDays} Hari Masa Proteksi</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Technician Assignment & Communication */}
        <div className="space-y-6">
          {/* Technician Assignment Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
              <UserSwitch size={18} className="text-[#0F4C81]" />
              Teknisi Penanggung Jawab
            </h2>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-600">
                Pilih / Alihkan Teknisi:
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                disabled={foundOrder.status === "COMPLETED" || foundOrder.status === "CANCELLED"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-[#0F4C81]"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.isOnline ? "Online" : "Offline"})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAssignWorker}
                  disabled={foundOrder.status === "COMPLETED" || foundOrder.status === "CANCELLED"}
                  className="w-full"
                >
                  Tugaskan Langsung
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setOrderProviderNote(foundOrder.providerNotes || "");
                    setShowAssignModal(true);
                  }}
                  disabled={foundOrder.status === "COMPLETED" || foundOrder.status === "CANCELLED"}
                  className="w-full bg-[#0F4C81] hover:bg-sky-900 text-white flex items-center justify-center gap-1"
                >
                  <Sparkle size={14} weight="fill" />
                  <span>Konteks &amp; Catatan</span>
                </Button>
              </div>
            </div>

            {/* Technician Profile Card */}
            {foundOrder.assignedWorker && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Teknisi Bertugas
                </span>
                <p className="font-bold text-slate-900 text-sm">{foundOrder.assignedWorker.name}</p>
                <p className="text-slate-500 font-mono">{foundOrder.assignedWorker.phone}</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  Rating: ★ {foundOrder.assignedWorker.rating || "4.9"} (Teknisi Tersertifikasi)
                </p>
              </div>
            )}
          </div>

          {/* Card: Pre-Service Context & Provider Notes (Phase C Refinement) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                <Sparkle size={18} weight="fill" className="text-sky-600" />
                Konteks Persiapan Pra-Servis
              </h2>
              <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                Informasional
              </span>
            </div>

            {/* Provider Note */}
            {foundOrder.providerNotes ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                  <FileText size={13} weight="bold" />
                  Catatan untuk Teknisi (Provider Note):
                </span>
                <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
                  &quot;{foundOrder.providerNotes}&quot;
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                Belum ada catatan khusus dari Provider untuk teknisi lapangan.
              </div>
            )}

            {/* AI Preparation Context */}
            {foundOrder.aiPreparationContext ? (
              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2 text-[11px]">
                <p className="font-bold text-slate-900">
                  {foundOrder.aiPreparationContext.summary}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">
                      Kemungkinan Masalah (Pre-Inspection):
                    </span>
                    <ul className="space-y-0.5 text-slate-700 mt-0.5">
                      {foundOrder.aiPreparationContext.possibleIssues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-slate-600 block text-[10px] uppercase">
                      Kemungkinan Sparepart (Bawa Bila Ada):
                    </span>
                    <ul className="space-y-0.5 text-slate-700 mt-0.5">
                      {foundOrder.aiPreparationContext.possibleSpareparts.map((part, idx) => (
                        <li key={idx}>• {part}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-start gap-1.5 mt-2">
                  <ShieldCheck size={14} className="text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Disclaimer: </strong>
                    {foundOrder.aiPreparationContext.disclaimer}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
                Analisis AI pre-servis tidak disertakan pada order ini.
              </div>
            )}
          </div>

          {/* Quick Communication & Actions Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 font-display">
              Saluran Komunikasi
            </h3>
            <p className="text-slate-500 text-[11px]">
              Koordinasikan kendala operasional lapangan atau konfirmasi jadwal dengan pihak terkait.
            </p>

            <div className="space-y-2 pt-1">
              <Link
                href={`/provider/chat/${foundOrder.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 text-xs flex items-center justify-center gap-2 transition"
              >
                <ChatCircleText size={16} className="text-[#0F4C81]" />
                <span>Chat dengan Pelanggan</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Clarification / Rejection of Price Adjustment */}
      {showRejectAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Minta Klarifikasi / Tolak Pengajuan Biaya
              </h3>
              <button
                onClick={() => setShowRejectAuthModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tuliskan alasan penolakan atau klarifikasi yang perlu diperbaiki oleh teknisi (contoh: rincian harga freon terlalu tinggi atau butuh foto pipa nevel).
            </p>

            <textarea
              rows={3}
              value={rejectAuthReason}
              onChange={(e) => setRejectAuthReason(e.target.value)}
              placeholder="Tuliskan catatan untuk teknisi lapangan..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectAuthModal(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRejectPrice}
                disabled={!rejectAuthReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Kirim Catatan Penolakan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Proof Revision */}
      {showProofRevisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Minta Revisi Bukti Servis Lapangan
              </h3>
              <button
                onClick={() => setShowProofRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Jelaskan foto atau pengujian parameter tambahan yang wajib diunggah oleh teknisi sebelum pekerjaan dapat ditutup.
            </p>

            <textarea
              rows={3}
              value={proofRevisionNotes}
              onChange={(e) => setProofRevisionNotes(e.target.value)}
              placeholder="Contoh: Foto manifold gauge setelah 15 menit pengisian belum terlihat jelas..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProofRevisionModal(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRequestProofRevision}
                disabled={!proofRevisionNotes.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Minta Bukti Tambahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assign Worker with AI Preparation Context & Provider Note */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Tugaskan Teknisi Lapangan"
        description="Sertakan konteks persiapan dan catatan teknis sebelum teknisi berangkat ke lokasi."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Order & Problem Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{foundOrder.serviceTitle}</span>
              <span className="font-mono text-slate-500 font-semibold">{foundOrder.id}</span>
            </div>
            <p className="text-slate-600">
              <strong>Pelanggan:</strong> {foundOrder.customerName} ({foundOrder.customerPhone})
            </p>
            <p className="text-slate-600">
              <strong>Jadwal:</strong> {foundOrder.scheduledDate}, {foundOrder.scheduledTimeSlot}
            </p>
            <p className="text-slate-600">
              <strong>Alamat:</strong> {foundOrder.address}
            </p>
          </div>

          {/* AI Preparation Context if available */}
          {foundOrder.aiPreparationContext ? (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold font-display text-[#0F4C81] flex items-center gap-1.5">
                  <Sparkle size={15} weight="fill" className="text-sky-600" />
                  AI Preparation Context (Pre-Service)
                </span>
                <span className="text-[10px] font-semibold text-sky-800 bg-white border border-sky-200 px-2 py-0.5 rounded-full">
                  Informasional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100">
                  <p className="font-bold text-slate-700 mb-1">Kemungkinan Masalah:</p>
                  <ul className="space-y-0.5 text-slate-600">
                    {foundOrder.aiPreparationContext.possibleIssues.map((issue, idx) => (
                      <li key={idx}>• {issue}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100">
                  <p className="font-bold text-slate-700 mb-1">Kemungkinan Sparepart (Bawa jika ada):</p>
                  <ul className="space-y-0.5 text-slate-600">
                    {foundOrder.aiPreparationContext.possibleSpareparts.map((part, idx) => (
                      <li key={idx}>• {part}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                <ShieldCheck size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer: </strong>
                  Rekomendasi ini bukan diagnosis final. Teknisi tetap wajib melakukan pemeriksaan fisik di lokasi sebelum menetapkan kebutuhan sparepart.
                </span>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAiContext}
                  onChange={(e) => setIncludeAiContext(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F4C81]"
                />
                <span className="font-semibold text-slate-800 text-xs">
                  Sertakan rekomendasi AI ke teknisi sebagai panduan inspeksi
                </span>
              </label>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500">
              Analisis AI belum tersedia untuk order ini. Anda tetap dapat menugaskan teknisi dan menambahkan catatan persiapan.
            </div>
          )}

          {/* Select Worker with Competency Matching */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">
              Pilih Teknisi Lapangan <span className="text-rose-500">*</span>
            </label>

            {/* Competency Overview */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Certificate size={14} className="text-[#0F4C81]" />
                  Kesesuaian Kompetensi: &quot;{foundOrder.serviceTitle}&quot;
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {orderWorkerEligibilityList.filter((e) => e.isEligible).length} dari {workers.length} Teknisi Memenuhi
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {orderWorkerEligibilityList.map(({ worker, isEligible, matchedServiceName }) => (
                  <span
                    key={worker.id}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                      isEligible
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    <span>{isEligible ? "✓" : "✗"}</span>
                    <span>{worker.name}</span>
                    {isEligible && matchedServiceName && (
                      <span className="text-[9px] text-emerald-700 bg-white/80 px-1 rounded font-bold">
                        {matchedServiceName}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold bg-white text-slate-800 text-xs"
            >
              {orderWorkerEligibilityList.map(({ worker, isEligible, matchedServiceName }) => (
                <option key={worker.id} value={worker.id}>
                  {isEligible ? "✓ [Memenuhi] " : "✗ [Tidak Memenuhi] "}
                  {worker.name} — {worker.isOnline ? "Standby" : "Offline"}
                  {isEligible && matchedServiceName ? ` (Kompetensi: ${matchedServiceName})` : ""}
                  {` (★ ${worker.rating || "4.9"})`}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Persiapan untuk Teknisi (Provider Note)
            </label>
            <textarea
              value={orderProviderNote}
              onChange={(e) => setOrderProviderNote(e.target.value)}
              rows={3}
              placeholder="Contoh: Bawa kapasitor 35uF bila secara fisik tersedia, tetapi tetap lakukan diagnosis fisik terlebih dahulu di lokasi."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0F4C81]/20"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Catatan ini membantu persiapan teknisi sebelum berangkat. Teknisi tetap wajib melakukan diagnosis aktual di lokasi.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignWorker}
              className="bg-[#0F4C81] hover:bg-sky-900 text-white"
            >
              Tugaskan Teknisi
            </Button>
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
