"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { StatusBadge, StatusVariant } from "@/components/data-display/StatusBadge";
import { OrderStepper, StepItem } from "@/components/data-display/OrderStepper";
import { PriceBreakdown } from "@/components/data-display/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CustomerDemoScenarioSelector } from "@/components/navigation/CustomerDemoScenarioSelector";
import { OrderStatus } from "@/types/domain";
import {
  CalendarBlank,
  Clock,
  MapPin,
  ChatCircleText,
  ShieldCheck,
  NavigationArrow,
  CreditCard,
  Camera,
  CheckCircle,
  WarningCircle,
  WarningOctagon,
  ArrowLeft,
  ArrowRight,
  Wrench,
  Package,
  UserCheck,
  Star,
  ArrowsClockwise,
  Check,
  X,
  Tag,
  Info,
  Truck,
  Phone,
  Receipt,
  FileText,
  Storefront,
} from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";

export default function CustomerServiceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawParamId = (params?.orderId as string) || "SRV-C06-ADJ-PRESENT";

  const repo = useDomainRepository();
  const {
    order,
    switchScenario,
    customerApprovePriceAdjustment,
    customerRejectPriceAdjustment,
    customerAcceptRecommendation,
    customerChooseAlternativeProduct,
    customerOptSelfPurchase,
    customerPayOrder,
    customerFailPayment,
    customerConfirmCompletion,
    customerReportDispute,
    customerSubmitReview,
    customerRebookOrder,
    activeScenarioMeta,
  } = useServiceOrder(rawParamId);

  // Local interactive modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isMandatoryScopeOverride, setIsMandatoryScopeOverride] = useState<boolean | undefined>(undefined);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("BCA_VA");
  const [simulateFailure, setSimulateFailure] = useState(false);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState("POOR_QUALITY");
  const [disputeDescription, setDisputeDescription] = useState("");

  const [providerRatingInput, setProviderRatingInput] = useState(5);
  const [workerRatingInput, setWorkerRatingInput] = useState(5);
  const [reviewTextInput, setReviewTextInput] = useState("");
  const [reviewSubmittedNotice, setReviewSubmittedNotice] = useState(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // After-Sales Phase 07 Integration
  const { cases, warranties } = useAfterSales();
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  const associatedServiceCase = cases.find(
    (c) =>
      c.sourceOrderId === rawParamId ||
      (order?.id && c.sourceOrderId === order.id) ||
      (order?.orderNumber && c.sourceOrderNumber === order.orderNumber)
  );
  const associatedServiceWarranty = warranties.find(
    (w) =>
      w.orderId === rawParamId ||
      (order?.id && w.orderId === order.id) ||
      (order?.orderNumber && w.orderNumber === order.orderNumber)
  );

  if (!order) {
    return (
      <div className="py-12">
        <EmptyState
          title="Pesanan Tidak Ditemukan"
          description={`Pesanan dengan ID "${rawParamId}" tidak ditemukan.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Kembali ke Daftar Pesanan
            </button>
          }
        />
      </div>
    );
  }

  const getVariant = (status: OrderStatus): StatusVariant => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "PAYMENT_PENDING":
        return "warning";
      case "IN_PROGRESS":
      case "TECHNICIAN_DISPATCHED":
      case "TECHNICIAN_ARRIVED":
      case "AWAITING_PROOF_REVIEW":
        return "info";
      case "WAITING_APPROVAL":
      case "WAITING_SPAREPART":
        return "warning";
      case "DISPUTED":
      case "CANCELLED":
        return "error";
      default:
        return "neutral";
    }
  };

  // Stepper representation
  const stepperSteps: StepItem[] = order.stepper.map((st) => ({
    id: st.id,
    title: st.title,
    description: st.description,
    status: st.isCompleted ? "completed" : st.isCurrent ? "current" : "upcoming",
  }));

  // Pricing calculation
  const totalPaid = (order.paymentRecords || [])
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.amount, 0);

  const payableRemaining = Math.max(0, order.pricing.totalAmount - totalPaid);

  // Linked Product Orders if any
  const linkedProductOrders = (order.relatedProductOrderIds || [])
    .map((pId) => repo.merchantOrders.find((m) => m.id === pId))
    .filter(Boolean);

  // Active Warranty if applicable
  const warrantyRecord = repo.warranties.find(
    (w) => w.serviceOrderId === order.id || w.id === order.warrantyCertificateId
  );

  // Active Dispute if applicable
  const disputeRecord = repo.disputes.find(
    (d) => d.serviceOrderId === order.id || d.id === order.disputeCaseId
  );

  // Handlers for Customer Actions
  const handleApproveAdjustment = () => {
    customerApprovePriceAdjustment("Disetujui oleh pelanggan");
    setActionSuccessMsg("Penyesuaian biaya berhasil disetujui! Status diperbarui.");
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleConfirmRejectAdjustment = () => {
    const isMandatory =
      isMandatoryScopeOverride !== undefined
        ? isMandatoryScopeOverride
        : order.priceAdjustment?.isMandatoryScope ?? true;
    customerRejectPriceAdjustment(rejectReason.trim() || "Ditolak pelanggan", isMandatory);
    setShowRejectModal(false);
    setRejectReason("");
    setActionSuccessMsg(
      isMandatory
        ? "Biaya wajib ditolak. Layanan tertunda demi keselamatan unit (Service Blocked)."
        : "Biaya tambahan ditolak. Layanan dilanjutkan dengan ruang lingkup standar."
    );
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handlePay = () => {
    if (simulateFailure) {
      customerFailPayment("Transaksi gagal disimulasikan oleh pengguna");
      setShowPaymentModal(false);
      setActionSuccessMsg("Pembayaran gagal diproses. Status tetap PAYMENT_PENDING.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
      return;
    }

    const isAdditional = totalPaid > 0;
    const amountToPay = payableRemaining > 0 ? payableRemaining : order.pricing.totalAmount;
    customerPayOrder(amountToPay, selectedPaymentMethod, isAdditional);
    setShowPaymentModal(false);
    setActionSuccessMsg("Pembayaran berhasil dikonfirmasi dan dana masuk ke escrow!");
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleConfirmCompletionAction = () => {
    customerConfirmCompletion();
    setActionSuccessMsg("Pekerjaan berhasil dikonfirmasi selesai! Dana dilepaskan dan garansi aktif.");
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleSubmitDisputeAction = () => {
    customerReportDispute(disputeCategory, disputeDescription.trim() || "Komplain pengerjaan");
    setShowDisputeModal(false);
    setDisputeDescription("");
    setActionSuccessMsg("Laporan masalah dikirim. Dana escrow dibekukan dan CS akan memediasi.");
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleSubmitReviewAction = () => {
    customerSubmitReview(providerRatingInput, workerRatingInput, reviewTextInput);
    setReviewSubmittedNotice(true);
    setActionSuccessMsg("Terima kasih atas ulasan dan penilaian Anda!");
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleRebook = () => {
    const newBooking = customerRebookOrder();
    if (newBooking) {
      setActionSuccessMsg(`Booking baru #${newBooking.id} berhasil dibuat tanpa mengubah pesanan lama!`);
      setTimeout(() => {
        router.push("/orders");
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Dev / Demo Scenario Selector Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-4">
        <CustomerDemoScenarioSelector
          currentOrderId={order.id}
          onSelectScenario={(id) => switchScenario(id)}
        />
      </div>

      {/* Action Success Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-between shadow-servio-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} weight="fill" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-white/80 hover:text-white"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* 1. ORDER HEADER (Section 6) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-servio-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/orders"
              className="text-neutral-slate hover:text-neutral-dark text-xs flex items-center gap-1 font-semibold mr-1"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Daftar Pesanan</span>
            </Link>
            <span className="font-mono text-xs font-bold text-neutral-dark">#{order.id}</span>
            <StatusBadge status={getVariant(order.status)} label={order.statusLabel} />
            {activeScenarioMeta && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-mono font-bold border border-amber-300">
                Fixture: {activeScenarioMeta.id}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-dark">
            {order.serviceTitle}
          </h1>

          <div className="flex items-center gap-4 text-xs text-neutral-slate flex-wrap pt-0.5">
            <span>
              Mitra: <strong className="text-neutral-dark">{order.providerName}</strong>
            </span>
            {order.assignedWorker && (
              <span>
                Teknisi: <strong className="text-neutral-dark">{order.assignedWorker.name}</strong>
              </span>
            )}
            <span>
              Jadwal: <strong>{order.scheduledDate} ({order.scheduledTimeSlot})</strong>
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => router.push("/chat/conv-01")}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-neutral-dark text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-servio-xs"
          >
            <ChatCircleText size={16} weight="bold" />
            <span>Chat Teknisi</span>
          </button>

          <Link
            href="/support"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-neutral-dark text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-servio-xs"
          >
            <Info size={16} weight="bold" />
            <span>Bantuan</span>
          </Link>

          {/* Primary State-Driven Action in Header */}
          {order.status === "WAITING_APPROVAL" && (
            <button
              type="button"
              onClick={handleApproveAdjustment}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-servio-xs"
            >
              <Check size={16} weight="bold" />
              <span>Setujui Biaya</span>
            </button>
          )}

          {order.status === "PAYMENT_PENDING" && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-servio-xs"
            >
              <CreditCard size={16} weight="bold" />
              <span>Bayar Tagihan</span>
            </button>
          )}

          {order.status === "AWAITING_PROOF_REVIEW" && (
            <button
              type="button"
              onClick={handleConfirmCompletionAction}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-servio-xs"
            >
              <CheckCircle size={16} weight="bold" />
              <span>Konfirmasi Selesai</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. NEXT BEST ACTION HIGHLIGHT (Section 45 & 68: "WHAT DO I NEED TO DO NOW?") */}
      <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-dark">
              Status & Tindakan Berikutnya (Next Best Action)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-muted">Update Real-Time</span>
        </div>

        {/* State A: WAITING_APPROVAL */}
        {order.status === "WAITING_APPROVAL" && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0" />
                <span>Persetujuan Pelanggan Diperlukan (Waiting Approval)</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {order.priceAdjustment
                  ? `Teknisi mengajukan penyesuaian biaya total Rp ${order.pricing.totalAmount.toLocaleString("id-ID")}. ${order.priceAdjustment.diagnosisSummary}`
                  : "Rekomendasi suku cadang dari teknisi membutuhkan persetujuan Anda."}
              </p>
              {order.sparepartBlockStatus?.isBlocked && (
                <p className="text-xs font-bold text-rose-700 pt-1">
                  ⚠ {order.sparepartBlockStatus.reason}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-amber-400 bg-white text-amber-900 hover:bg-amber-100 text-xs font-bold transition"
              >
                Tolak
              </button>
              <button
                type="button"
                onClick={handleApproveAdjustment}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-servio-xs transition"
              >
                Setujui Biaya (Rp {order.pricing.totalAmount.toLocaleString("id-ID")})
              </button>
            </div>
          </div>
        )}

        {/* State B: PAYMENT_PENDING */}
        {order.status === "PAYMENT_PENDING" && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                <CreditCard size={18} weight="fill" className="text-amber-600 shrink-0" />
                <span>Pembayaran Diperlukan (Payment Required)</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                {totalPaid > 0
                  ? `Pembayaran awal Rp ${totalPaid.toLocaleString("id-ID")} tersimpan aman. Sisa selisih biaya Rp ${payableRemaining.toLocaleString("id-ID")} siap dilunasi.`
                  : `Tagihan escrow awal sebesar Rp ${order.pricing.totalAmount.toLocaleString("id-ID")} siap disetorkan ke rekening Servio Shield.`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-servio-xs transition flex items-center justify-center gap-1.5"
              >
                <CreditCard size={16} weight="bold" />
                <span>Bayar Sekarang (Rp {(payableRemaining || order.pricing.totalAmount).toLocaleString("id-ID")})</span>
              </button>
            </div>
          </div>
        )}

        {/* State C: WAITING_SPAREPART */}
        {order.status === "WAITING_SPAREPART" && (
          <div className="p-4 rounded-2xl bg-sky/60 border border-sky-300 text-neutral-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-primary">
                <Package size={18} weight="duotone" className="shrink-0" />
                <span>Menunggu Pengadaan Suku Cadang (Waiting Sparepart)</span>
              </div>
              <p className="text-xs text-neutral-slate leading-relaxed">
                {order.sparepartBlockStatus?.reason ||
                  "Suku cadang sedang diproses dan dikirimkan oleh mitra toko rekanan terdekat ke lokasi pengerjaan."}
              </p>
            </div>

            {order.relatedProductOrderIds && order.relatedProductOrderIds.length > 0 && (
              <span className="font-mono text-xs font-bold text-primary px-3 py-1.5 bg-white rounded-xl border border-sky-200">
                Pesanan Produk: #{order.relatedProductOrderIds[0]}
              </span>
            )}
          </div>
        )}

        {/* State D: AWAITING_PROOF_REVIEW */}
        {order.status === "AWAITING_PROOF_REVIEW" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Pekerjaan Selesai — Konfirmasi Pelanggan Diperlukan</span>
              </div>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                Teknisi telah menyelesaikan seluruh perbaikan dan mengunggah foto before/after serta data uji fungsi. Apakah hasil kerja sudah memuaskan?
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowDisputeModal(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
              >
                Laporkan Masalah
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletionAction}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-servio-xs transition"
              >
                Ya, Konfirmasi Selesai
              </button>
            </div>
          </div>
        )}

        {/* State E: COMPLETED */}
        {order.status === "COMPLETED" && (
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <ShieldCheck size={20} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Pesanan Selesai — Masa Garansi Servio Shield Aktif</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Layanan telah tuntas. Dana escrow telah dilepaskan kepada mitra. Perlindungan garansi selama {order.warrantyPeriodDays || 30} hari aktif otomatis.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRebook}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark text-xs font-bold transition flex items-center gap-1.5 shadow-servio-xs"
              >
                <ArrowsClockwise size={14} weight="bold" />
                <span>Pesan Layanan Lagi</span>
              </button>
            </div>
          </div>
        )}

        {/* State F: DISPUTED */}
        {order.status === "DISPUTED" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <WarningOctagon size={18} weight="fill" className="text-rose-600 shrink-0" />
                <span>Sengketa Aktif — Mediasi Customer Support</span>
              </div>
              <p className="text-xs text-rose-900/90 leading-relaxed">
                Dana escrow Rp {order.pricing.totalAmount.toLocaleString("id-ID")} saat ini dibekukan secara aman. Tim Customer Mediation Servio sedang meninjau kendala Anda.
              </p>
            </div>

            <Link
              href={`/support`}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
            >
              Buka Tiket Bantuan
            </Link>
          </div>
        )}

        {/* State G: IN_PROGRESS */}
        {order.status === "IN_PROGRESS" && (
          <div className="p-4 rounded-2xl bg-sky/50 border border-sky-300 text-neutral-dark flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-primary">
                <Wrench size={18} weight="duotone" className="shrink-0" />
                <span>Pekerjaan Lapangan Sedang Berlangsung</span>
              </div>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Teknisi {order.assignedWorker?.name || "lapangan"} sedang melakukan pengerjaan unit di alamat Anda. Pantau progress pada timeline pengerjaan di bawah.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. LIVE ORDER STEPPER (Section 10 & 69) */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-display font-bold text-sm text-neutral-dark">
            Perjalanan Layanan (Service Journey Timeline)
          </h3>
          <span className="text-xs text-neutral-muted">Proyeksi State Kanonikal</span>
        </div>
        <OrderStepper steps={stepperSteps} />
      </div>

      {/* 4. TECHNICIAN CARD & QUICK DETAILS (Section 9 & 10) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Assigned Worker */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 space-y-4 md:col-span-1 bg-white shadow-servio-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
            Teknisi yang Bertugas
          </span>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center font-bold text-base shrink-0 border border-primary/20">
              {order.assignedWorker?.name?.charAt(0) || "T"}
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-neutral-dark">
                {order.assignedWorker?.name || "Budi Santoso"}
              </h4>
              <p className="text-xs text-neutral-slate">Teknisi Servio Terverifikasi</p>
              <div className="flex items-center gap-1 text-xs text-amber-600 font-bold pt-0.5">
                <Star size={13} weight="fill" />
                <span>{order.assignedWorker?.rating || 4.9} • 140+ Layanan Selesai</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-slate">
              <span>Nomor Kontak:</span>
              <span className="font-mono font-medium text-neutral-dark">
                {order.assignedWorker?.phone || "0812-9988-7711"}
              </span>
            </div>
            <div className="flex items-center justify-between text-neutral-slate">
              <span>Kendaraan:</span>
              <span className="font-mono font-medium text-neutral-dark">
                {order.assignedWorker?.vehicleNumber || "B 4892 SZK (Motor)"}
              </span>
            </div>
            {order.assignedWorker?.currentLocation && (
              <div className="flex items-start justify-between text-neutral-slate pt-1 border-t border-slate-100">
                <span className="shrink-0">Posisi:</span>
                <span className="text-right text-[11px] text-primary font-semibold">
                  {order.assignedWorker.currentLocation.address}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 space-y-4 md:col-span-2 bg-white shadow-servio-xs flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
              Jadwal & Lokasi Pengerjaan
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 space-y-1 border border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-neutral-dark">
                  <CalendarBlank size={15} className="text-primary" />
                  <span>Waktu Kunjungan</span>
                </div>
                <p className="text-neutral-slate pt-0.5">{order.scheduledDate}</p>
                <p className="text-neutral-slate font-medium">{order.scheduledTimeSlot}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 space-y-1 border border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-neutral-dark">
                  <MapPin size={15} className="text-rose-500" />
                  <span>Alamat Layanan</span>
                </div>
                <p className="text-neutral-slate pt-0.5 leading-relaxed">{order.address}</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
            <ShieldCheck size={18} weight="fill" className="text-emerald-600 shrink-0" />
            <span>
              Perlindungan Escrow Servio Shield aktif. Garansi {order.warrantyPeriodDays || 30} hari berlaku paska konfirmasi penyelesaian.
            </span>
          </div>
        </div>
      </div>

      {/* 5. DIAGNOSIS RESULT UI (Section 12) */}
      {order.diagnosis && (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-primary" weight="bold" />
              <h3 className="font-display font-bold text-base text-neutral-dark">
                Hasil Diagnosis Lapangan (Field Inspection)
              </h3>
            </div>
            <span className="text-xs text-neutral-muted">
              Diinspeksi: {order.diagnosis.workerName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="font-bold text-neutral-muted uppercase tracking-wider text-[10px]">
                Unit yang Diperiksa
              </span>
              <p className="text-sm font-bold text-neutral-dark">
                {order.diagnosis.assetInspected || "AC Split Ruang Tamu"}
              </p>

              <span className="font-bold text-neutral-muted uppercase tracking-wider text-[10px] block pt-2">
                Temuan Masalah Utama
              </span>
              <p className="text-neutral-slate leading-relaxed">
                {order.diagnosis.findingsSummary}
              </p>

              {order.diagnosis.identifiedIssues && order.diagnosis.identifiedIssues.length > 0 && (
                <ul className="list-disc pl-4 space-y-1 text-neutral-slate pt-1">
                  {order.diagnosis.identifiedIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-neutral-muted uppercase tracking-wider text-[10px]">
                  Rekomendasi Tindakan Teknisi
                </span>
                <p className="text-neutral-dark font-medium leading-relaxed pt-1">
                  {order.diagnosis.recommendedAction}
                </p>

                {order.diagnosis.notes && (
                  <p className="text-[11px] text-neutral-muted italic pt-2">
                    Catatan: &ldquo;{order.diagnosis.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                <span className="text-neutral-slate">Kebutuhan Suku Cadang:</span>
                <span className={`font-bold ${order.diagnosis.requiresSparepart ? "text-amber-600" : "text-emerald-600"}`}>
                  {order.diagnosis.requiresSparepart ? "Ya, Membutuhkan Suku Cadang" : "Tidak Perlu Suku Cadang"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONSOLIDATED PRICE & COST REVIEW / ADJUSTMENT (Section 13, 14, 15, 16, 17, 60, 61) */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-primary" weight="bold" />
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Rincian Biaya & Penyesuaian (Price Breakdown)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <FileText size={14} weight="bold" />
              <span>Lihat Invoice Resmi</span>
            </button>
            {order.priceAdjustment && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                Penyesuaian Biaya Tersedia
              </span>
            )}
          </div>
        </div>

        {/* Initial Estimate vs Final Price Comparison Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <span className="text-[11px] text-neutral-muted block">Estimasi Awal:</span>
            <span className="font-mono font-bold text-sm text-neutral-dark">
              {order.initialEstimateRange
                ? `Rp ${order.initialEstimateRange.min.toLocaleString("id-ID")} – Rp ${order.initialEstimateRange.max.toLocaleString("id-ID")}`
                : `Rp ${(order.pricing.serviceFee || 150000).toLocaleString("id-ID")}`}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-neutral-muted block">Biaya Terkini:</span>
            <span className="font-mono font-bold text-base text-primary">
              Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-neutral-muted block">Status Pembayaran:</span>
            <span className="font-semibold text-neutral-dark">
              Rp {totalPaid.toLocaleString("id-ID")} Terbayar
              {payableRemaining > 0 ? ` (Sisa Rp ${payableRemaining.toLocaleString("id-ID")})` : " (Lunas)"}
            </span>
          </div>
        </div>

        {/* Cost items breakdown */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-neutral-slate">Biaya Jasa Pengerjaan</span>
            <span className="font-mono font-bold text-neutral-dark">
              Rp {(order.pricing.serviceFee || 0).toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-neutral-slate">Suku Cadang & Material</span>
            <span className="font-mono font-bold text-neutral-dark">
              Rp {(order.pricing.materialFee || 0).toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-neutral-slate flex items-center gap-1.5">
              <span>Fee Aplikasi</span>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                SNAPSHOT {repo.getActiveFeePolicy("APPLICATION_FEE")?.version || "APP-v1.0"}
              </span>
            </span>
            <span className="font-mono font-bold text-neutral-dark">
              Rp {(order.pricing.platformFee !== undefined ? order.pricing.platformFee : 5000).toLocaleString("id-ID")}
            </span>
          </div>

          {order.pricing.discountAmount > 0 && (
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 text-emerald-600 font-semibold">
              <span>Potongan Promo / Voucher</span>
              <span className="font-mono">-Rp {order.pricing.discountAmount.toLocaleString("id-ID")}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm py-2 font-bold text-neutral-dark pt-2">
            <span>Total Tagihan</span>
            <span className="font-mono text-base text-primary">
              Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Customer Approval Card if in WAITING_APPROVAL */}
        {order.priceAdjustment && order.priceAdjustment.customerApprovalStatus === "PENDING" && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">
                Persetujuan Tambahan Biaya: +Rp {(order.pricing.totalAmount - (order.initialEstimateRange?.min || 350000)).toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                Menunggu Keputusan Anda
              </span>
            </div>
            <p className="text-xs text-amber-800">
              Alasan: {order.priceAdjustment.diagnosisSummary}
            </p>
            {order.priceAdjustment.impactOnRejection && (
              <p className="text-[11px] text-amber-700 italic">
                Bila ditolak: {order.priceAdjustment.impactOnRejection}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 rounded-xl border border-amber-400 bg-white text-amber-900 hover:bg-amber-100 text-xs font-bold transition"
              >
                Tolak
              </button>
              <button
                type="button"
                onClick={handleApproveAdjustment}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-servio-xs transition"
              >
                Setujui Biaya Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. SPAREPART & MATERIAL MASTER SECTION (Section 18 to 27) */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" weight="bold" />
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Suku Cadang & Material (Sparepart Hub)
            </h3>
          </div>
          <span className="text-xs text-neutral-muted">Transparansi 100% — Tanpa Surcharge</span>
        </div>

        {/* SCENARIO A: Provider-Owned Materials */}
        {order.providerMaterials && order.providerMaterials.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
              Suku Cadang Bengkel Mitra (Provider-Owned)
            </span>
            <div className="space-y-2">
              {order.providerMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-neutral-dark">{mat.partName}</h4>
                    <p className="text-[11px] text-neutral-slate">
                      Sumber: Bengkel Mitra ({order.providerName}) • Qty: {mat.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-neutral-dark">
                      Rp {mat.totalPrice.toLocaleString("id-ID")}
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-bold">
                      {mat.customerApprovalStatus === "APPROVED" ? "Disetujui" : "Siap Digunakan"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCENARIO B: Partner Recommendation or Deal di Tempat */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
            Rekomendasi Toko Rekanan (Partner Merchant)
          </span>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-dark text-sm">
                    Kapasitor AC Daikin 35uF 450VAC Original
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Kompatibel
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky text-primary text-[10px] font-bold">
                    ✓ Toko Mitra Aktif
                  </span>
                </div>
                <p className="text-xs text-neutral-slate">
                  Toko Rekanan: <strong>Toko Sejuk Sentra Part</strong> • Direkomendasikan oleh Teknisi {order.assignedWorker?.name || "Budi Santoso"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-neutral-muted block">Harga Produk:</span>
                <span className="font-mono font-bold text-base text-primary">
                  Rp 180.000
                </span>
                <span className="text-[10px] text-neutral-muted block">+ Ongkir Instan Rp 15.000</span>
              </div>
            </div>

            {/* Affiliate Transparency Notice (Section 26 & 27: Zero Customer Surcharge) */}
            <div className="p-2.5 rounded-xl bg-white/80 border border-amber-200 text-[11px] text-neutral-slate flex items-start gap-2">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Transparansi Servio:</strong> Pelanggan membayar harga produk normal tanpa biaya afiliasi tambahan. Seluruh hak rekomendasi ditanggung secara komersial antara platform dan toko mitra.
              </span>
            </div>

            {/* Decision CTAs if decision not yet made */}
            {order.status === "WAITING_APPROVAL" && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    customerAcceptRecommendation(`REC-${order.id}`);
                    setActionSuccessMsg("Pesanan produk berhasil dibuat di Toko Rekanan!");
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-servio-xs"
                >
                  Beli Produk Ini (Rp 195.000)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    customerChooseAlternativeProduct(`REC-${order.id}`, "prod-alt-cap-35", "merch-02", "Toko Komponen Prima");
                    setActionSuccessMsg("Suku cadang dipesan di toko alternatif pilihan Anda.");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-neutral-dark text-xs font-bold hover:bg-slate-50 transition"
                >
                  Pilih Toko Lain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    customerOptSelfPurchase();
                    setActionSuccessMsg("Status diperbarui: Menunggu suku cadang pengadaan mandiri dari Anda.");
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-neutral-slate text-xs font-bold hover:bg-slate-50 transition"
                >
                  Saya Beli Sendiri
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SCENARIO C: Linked Product Order Tracking (Section 25 & 33) */}
        {linkedProductOrders.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
              Pesanan Produk Terkait (Linked Product Order)
            </span>
            {linkedProductOrders.map((po) => po && (
              <div
                key={po.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-dark">#{po.id}</span>
                    <span className="px-2 py-0.5 rounded bg-sky text-primary text-[10px] font-bold">
                      {["NEW", "CONFIRMED", "PICKING", "PACKED"].includes(po.status)
                        ? "Diproses Merchant"
                        : po.status === "SHIPPED"
                        ? "Dalam Pengiriman Kurir"
                        : po.status === "DELIVERED"
                        ? "Terkirim ke Lokasi"
                        : po.status}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-neutral-dark">
                    Rp {po.totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-neutral-slate">
                  Item: <strong>{po.items.map((i) => i.title || i.productTitle).join(", ")}</strong> • Toko: {po.merchantName || "Merchant Rekanan Servio"}
                </p>
                <div className="flex items-center gap-1.5 text-neutral-muted text-[11px] pt-1">
                  <Truck size={14} className="text-primary" />
                  <span>Pengiriman: {po.courierName || po.shippingMethod || "Kurir Instan"} (Estimasi Tiba: Hari ini, ~30 menit)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. PAYMENT & INVOICE HISTORY (Section 28 to 31) */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-primary" weight="bold" />
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Kuitansi & Riwayat Pembayaran (Payment Records)
            </h3>
          </div>
          <span className="text-xs text-neutral-muted">Audit Trail Tanpa Mutasi Senyap</span>
        </div>

        {/* Existing Payment Records */}
        <div className="space-y-2">
          {(order.paymentRecords && order.paymentRecords.length > 0) ? (
            order.paymentRecords.map((pay) => (
              <div
                key={pay.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-dark">#{pay.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pay.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : pay.status === "FAILED"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {pay.status === "PAID" ? "Lunas" : pay.status === "FAILED" ? "Gagal" : "Menunggu Bayar"}
                    </span>
                    <span className="text-neutral-muted">Metode: {pay.paymentMethod}</span>
                  </div>
                  {pay.receiptNumber && (
                    <p className="text-[11px] text-neutral-slate">
                      Nomor Kuitansi Resmi: <strong className="font-mono">{pay.receiptNumber}</strong>
                      {pay.paidAt ? ` • Waktu: ${pay.paidAt.slice(0, 16).replace("T", " ")}` : ""}
                    </p>
                  )}
                  {pay.notes && (
                    <p className="text-[11px] text-neutral-muted italic">{pay.notes}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-neutral-dark">
                    Rp {pay.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-muted italic">Belum ada riwayat pembayaran tercatat.</p>
          )}
        </div>

        {/* Pay Remaining Action */}
        {payableRemaining > 0 && (
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div>
              <span className="text-xs text-neutral-muted block">Sisa Pembayaran Diperlukan:</span>
              <span className="font-mono font-bold text-base text-primary">
                Rp {payableRemaining.toLocaleString("id-ID")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-servio-xs transition flex items-center gap-1.5"
            >
              <CreditCard size={16} weight="bold" />
              <span>Bayar Tagihan Sisa</span>
            </button>
          </div>
        )}
      </div>

      {/* 9. PROOF OF SERVICE (Section 36) */}
      {order.proofOfService && (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-primary" weight="bold" />
              <h3 className="font-display font-bold text-base text-neutral-dark">
                Bukti Hasil Pengerjaan (Proof of Service)
              </h3>
            </div>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              QC Provider Terverifikasi
            </span>
          </div>

          {/* Photo Media Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {order.proofOfService.media.map((med) => (
              <div
                key={med.id}
                className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50 space-y-2 p-3 text-xs"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={med.imageUrl}
                    alt={med.label}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow ${
                      med.type === "BEFORE" ? "bg-amber-600" : "bg-emerald-600"
                    }`}
                  >
                    {med.type === "BEFORE" ? "SEBELUM" : "SESUDAH"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-neutral-dark">{med.label}</h4>
                  <p className="text-[11px] text-neutral-slate">{med.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Parameter Test Checklist */}
          {order.proofOfService.testedParameters && order.proofOfService.testedParameters.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
                Hasil Pengujian & Pengukuran Operasional
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {order.proofOfService.testedParameters.map((param, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <span className="text-neutral-muted text-[11px] block">{param.parameter}</span>
                    <strong className="text-neutral-dark block">{param.value}</strong>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Standar: {param.standard}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. POST-COMPLETION ACTIONS & RATING (Section 40 to 43) */}
      {order.status === "COMPLETED" && (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500" weight="fill" />
              <h3 className="font-display font-bold text-base text-neutral-dark">
                Purna Jual & Penilaian Layanan
              </h3>
            </div>
            {associatedServiceCase ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                Pengajuan Aktif: #{associatedServiceCase.caseNumber}
              </span>
            ) : associatedServiceWarranty ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                Garansi Aktif s/d {associatedServiceWarranty.endDate}
              </span>
            ) : order.status === "COMPLETED" ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky/40 text-primary font-bold border border-sky">
                Perlindungan Konsumen Aktif
              </span>
            ) : null}
          </div>

          {/* Contextual Phase 07 After-Sales Case / Warranty Block */}
          {associatedServiceCase ? (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px]">
                      KLAIM GARANSI JASA
                    </span>
                    <strong className="text-slate-900 font-display">
                      #{associatedServiceCase.caseNumber} — {associatedServiceCase.itemTitle}
                    </strong>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Status: <strong className="text-purple-700">{associatedServiceCase.mainStatus}</strong> • Masalah: {associatedServiceCase.issueReason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/warranties?tab=submissions&caseId=${associatedServiceCase.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    Lihat Detail Klaim
                    <ArrowRight size={13} weight="bold" />
                  </Link>
                </div>
              </div>

              {associatedServiceCase.warrantyJob && (
                <div className="p-3.5 bg-white rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      GARANSI
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {associatedServiceCase.warrantyJob.jobTitle}
                    </span>
                    <span className="text-emerald-700 font-extrabold text-[11px]">
                      ({associatedServiceCase.warrantyJob.coveredAmountText})
                    </span>
                  </div>

                  <Link
                    href={`/warranties?tab=submissions&caseId=${associatedServiceCase.id}`}
                    className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition shrink-0"
                  >
                    Pantau Pekerjaan Garansi
                  </Link>
                </div>
              )}

              {associatedServiceCase.refundDetail && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-emerald-900 font-medium">
                    Keputusan Refund: Rp{associatedServiceCase.refundDetail.totalRefund.toLocaleString("id-ID")} ({associatedServiceCase.refundDetail.status})
                  </span>
                  <Link
                    href={`/warranties?tab=submissions&caseId=${associatedServiceCase.id}`}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Lihat Status Refund
                  </Link>
                </div>
              )}
            </div>
          ) : associatedServiceWarranty ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                  <strong className="text-emerald-900 block font-display">
                    {associatedServiceWarranty.presetName} ({associatedServiceWarranty.durationDays} Hari)
                  </strong>
                </div>
                <p className="text-emerald-800 text-[11px]">
                  Berlaku sampai {associatedServiceWarranty.endDate} • {associatedServiceWarranty.coverage}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/warranties/${associatedServiceWarranty.id}`}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Detail Garansi
                </Link>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm"
                >
                  Ajukan Klaim
                </button>
              </div>
            </div>
          ) : order.status === "COMPLETED" ? (
            <div className="p-4 rounded-2xl bg-sky/20 border border-sky text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <strong className="text-primary block font-display">
                  Pusat Garansi & Pengajuan Terpadu
                </strong>
                <p className="text-neutral-slate text-[11px]">
                  Pekerjaan telah selesai. Anda dapat memantau atau mengajukan klaim garansi layanan langsung dari pusat purnajual.
                </p>
              </div>
              <Link
                href="/warranties"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shrink-0"
              >
                Lihat Garansi & Pengajuan
              </Link>
            </div>
          ) : null}

          {/* Review Form */}
          {!order.customerReviewSubmitted && !reviewSubmittedNotice ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="font-bold text-xs text-neutral-dark">
                Beri Penilaian untuk Mitra & Teknisi
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-neutral-slate block mb-1">
                    Rating Penyedia ({order.providerName}):
                  </label>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setProviderRatingInput(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star size={20} weight={star <= providerRatingInput ? "fill" : "regular"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-neutral-slate block mb-1">
                    Rating Teknisi ({order.assignedWorker?.name || "Teknisi"}):
                  </label>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setWorkerRatingInput(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star size={20} weight={star <= workerRatingInput ? "fill" : "regular"} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-neutral-slate text-xs block mb-1">Tulis Ulasan Layanan:</label>
                <textarea
                  rows={2}
                  value={reviewTextInput}
                  onChange={(e) => setReviewTextInput(e.target.value)}
                  placeholder="Ceritakan pengalaman servis Anda..."
                  className="w-full p-2.5 text-xs rounded-xl bg-white border border-slate-200 text-neutral-dark focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmitReviewAction}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-servio-xs"
              >
                Kirim Penilaian
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-neutral-slate flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" weight="fill" />
              <span>Anda telah mengirimkan ulasan bintang 5 untuk pesanan ini. Terima kasih!</span>
            </div>
          )}

          {/* Rebooking Action (Section 43) */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <strong className="text-xs font-bold text-neutral-dark block">
                Perlu Perawatan Berkala Kembali?
              </strong>
              <span className="text-[11px] text-neutral-muted">
                Pesan servis serupa tanpa mengisi ulang data alamat dan spesifikasi unit AC.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRebook}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-servio-xs transition flex items-center gap-1.5 shrink-0"
            >
              <ArrowsClockwise size={15} weight="bold" />
              <span>Pesan Servis Lagi (Rebooking)</span>
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 1: REJECT PRICE ADJUSTMENT (Section 17) */}
      {/* --------------------------------------------------------------------- */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-servio-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <WarningOctagon size={20} weight="bold" />
                <h3 className="font-display font-bold text-base text-neutral-dark">
                  Tolak Penyesuaian Biaya
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-neutral-muted hover:text-neutral-dark"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className="text-xs text-neutral-slate leading-relaxed">
              Anda berhak menolak biaya tambahan yang diajukan oleh teknisi. Berikan alasan penolakan Anda untuk dicatat dalam log pesanan:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Biaya melebihi perkiraan / suku cadang dirasa belum perlu diganti..."
              className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />

            {/* Criticality Notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <strong>Konsekuensi Penolakan:</strong>
              <p>
                {order.priceAdjustment?.isMandatoryScope
                  ? "Komponen ini bersifat wajib (mandatory). Bila ditolak, perbaikan kompresor tidak dapat dilanjutkan dan layanan akan ditunda (service blocked)."
                  : "Komponen ini bersifat opsional. Teknisi akan melanjutkan pengerjaan ruang lingkup standar tanpa biaya tambahan."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-neutral-slate hover:bg-slate-50 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectAdjustment}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 2: PAYMENT DIALOG (Section 28 to 31) */}
      {/* --------------------------------------------------------------------- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-servio-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-primary">
                <CreditCard size={20} weight="bold" />
                <h3 className="font-display font-bold text-base text-neutral-dark">
                  Pembayaran Escrow Servio Shield
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-muted hover:text-neutral-dark"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-neutral-slate">Jumlah yang Harus Dibayar:</span>
              <span className="font-mono font-bold text-base text-primary">
                Rp {(payableRemaining > 0 ? payableRemaining : order.pricing.totalAmount).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-dark block">Pilih Metode Pembayaran:</label>
              {[
                { id: "BCA_VA", label: "BCA Virtual Account", desc: "Verifikasi Otomatis 24 Jam" },
                { id: "MANDIRI_VA", label: "Mandiri Virtual Account", desc: "Verifikasi Otomatis" },
                { id: "QRIS", label: "QRIS (GoPay, OVO, Dana, BCA)", desc: "Scan Langsung Cepat" },
                { id: "CREDIT_CARD", label: "Kartu Kredit / Debit Online", desc: "Visa, Mastercard, JCB" },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setSelectedPaymentMethod(m.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                    selectedPaymentMethod === m.id
                      ? "border-primary bg-sky/30 ring-1 ring-primary/40 font-bold"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="text-neutral-dark block">{m.label}</span>
                    <span className="text-[11px] text-neutral-muted font-normal">{m.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="payment_method"
                    checked={selectedPaymentMethod === m.id}
                    onChange={() => setSelectedPaymentMethod(m.id)}
                    className="accent-primary"
                  />
                </label>
              ))}
            </div>

            {/* Test Simulation Checkbox (Scenario SC-C19 Demo) */}
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs flex items-center gap-2 text-neutral-dark">
              <input
                type="checkbox"
                id="sim_fail"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                className="accent-rose-600 rounded"
              />
              <label htmlFor="sim_fail" className="cursor-pointer text-[11px]">
                Simulasikan Pembayaran Gagal (Scenario SC-C19)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-neutral-slate hover:bg-slate-50 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePay}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-servio-xs transition"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 3: DISPUTE REPORTING DIALOG (Section 39) */}
      {/* --------------------------------------------------------------------- */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-servio-lg border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <WarningOctagon size={20} weight="bold" />
                <h3 className="font-display font-bold text-base text-neutral-dark">
                  Laporkan Masalah / Ajukan Sengketa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-neutral-muted hover:text-neutral-dark"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <p className="text-xs text-neutral-slate leading-relaxed">
              Jika hasil kerja teknisi tidak sesuai janji atau unit masih bermasalah, dana escrow akan dibekukan sementara dan tim penengah Servio akan memediasi penyelesaian.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-dark block">Kategori Masalah:</label>
              <select
                value={disputeCategory}
                onChange={(e) => setDisputeCategory(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-neutral-dark focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="SERVICE_NOT_COMPLETED">Pekerjaan Belum Selesai Sepenuhnya</option>
                <option value="POOR_QUALITY">Hasil Kerja Tidak Berfungsi / Masih Rusak</option>
                <option value="WRONG_SPAREPART">Suku Cadang Tidak Sesuai / Salah Tipe</option>
                <option value="DAMAGED_ITEM">Terjadi Kerusakan Unit Saat Pengerjaan</option>
                <option value="OVERCHARGED">Biaya Ditagihkan Tidak Sesuai Kesepakatan</option>
                <option value="OTHER">Masalah Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-dark block">Deskripsi Detail:</label>
              <textarea
                rows={3}
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Jelaskan kendala yang dialami secara rinci..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-neutral-slate hover:bg-slate-50 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitDisputeAction}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
              >
                Kirim Komplain & Bekukan Dana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER INVOICE MODAL (Section 2.1 & 35) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Dokumen Resmi Servio
                </span>
                <h3 className="font-display font-bold text-lg text-neutral-dark mt-1">
                  Invoice Layanan Pelanggan
                </h3>
                <p className="text-xs text-neutral-slate font-mono">
                  No. Tagihan: INV-{order.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Pelanggan:</span>
                <span className="font-bold text-slate-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Layanan:</span>
                <span className="font-semibold text-slate-900">{order.serviceTitle}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Penyedia Jasa:</span>
                <span className="font-semibold text-slate-900">{order.providerName}</span>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-700">Harga Layanan Jasa</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {(order.pricing.serviceFee || 0).toLocaleString("id-ID")}
                </span>
              </div>

              {(order.pricing.materialFee || 0) > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-700">Suku Cadang &amp; Material</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rp {order.pricing.materialFee.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <div>
                  <span className="text-slate-700 font-medium">Fee Aplikasi (Platform)</span>
                  <span className="ml-2 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                    {repo.getActiveFeePolicy("APPLICATION_FEE")?.version || "APP-v1.0"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  Rp {(order.pricing.platformFee !== undefined ? order.pricing.platformFee : 5000).toLocaleString("id-ID")}
                </span>
              </div>

              {order.pricing.discountAmount > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-emerald-600 font-semibold">
                  <span>Potongan Promo / Voucher</span>
                  <span className="font-mono">-Rp {order.pricing.discountAmount.toLocaleString("id-ID")}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-sm font-bold text-neutral-dark border-t border-slate-200">
                <span>Total Customer</span>
                <span className="font-mono text-base text-primary">
                  Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Transparency Note */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-[11px] text-purple-900 leading-relaxed flex items-start gap-2">
              <ShieldCheck size={16} className="text-purple-700 shrink-0 mt-0.5" weight="fill" />
              <span>
                <strong>Jaminan Tagihan Transparan:</strong> Pelanggan hanya dibebankan Harga Layanan dan Fee Aplikasi resmi. Merchant Affiliate Fee ditanggung secara komersial oleh toko mitra dan TIDAK pernah dibebankan ke invoice pelanggan.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MOBILE STICKY BOTTOM BAR (Section 51 & 70) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 z-30 shadow-lg flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-neutral-muted block">Total Tagihan:</span>
          <span className="font-mono font-bold text-sm text-primary">
            Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {order.status === "WAITING_APPROVAL" && (
            <button
              type="button"
              onClick={handleApproveAdjustment}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-sm"
            >
              Setujui Biaya
            </button>
          )}

          {order.status === "PAYMENT_PENDING" && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-sm"
            >
              Bayar Sekarang
            </button>
          )}

          {order.status === "AWAITING_PROOF_REVIEW" && (
            <button
              type="button"
              onClick={handleConfirmCompletionAction}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
            >
              Konfirmasi Selesai
            </button>
          )}

          {order.status === "COMPLETED" && (
            <button
              type="button"
              onClick={handleRebook}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm"
            >
              Pesan Lagi
            </button>
          )}
        </div>
      </div>

      {/* Interactive Phase 07 Warranty Claim Modal for Service */}
      {isClaimModalOpen && associatedServiceWarranty && (
        <WarrantyClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          warranty={associatedServiceWarranty}
          onSuccess={(caseId) => {
            router.push(`/warranties?tab=submissions&caseId=${caseId}`);
          }}
        />
      )}
    </div>
  );
}
