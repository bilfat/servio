"use client";

import React from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  CalendarBlank,
  MapPin,
  User,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  CheckCircle,
  XCircle,
  WarningCircle,
  Buildings,
  Phone,
  Eye,
  Camera,
  Cube,
  Tag,
  CurrencyCircleDollar,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";
import { getSubStatusBadgeInfo } from "../../constants";
import { getStoredWorkerPhoto, useWorkerPhoto } from "@/features/worker/workerPhotoHelper";

function WorkerBadgeAvatar({
  workerId,
  name,
  fallbackPhoto,
}: {
  workerId?: string;
  name: string;
  fallbackPhoto?: string;
}) {
  const photo = useWorkerPhoto(workerId, fallbackPhoto);
  return (
    <div className="w-6 h-6 rounded-lg overflow-hidden border border-slate-200 shrink-0">
      <img
        src={photo || "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg"}
        alt={name}
        className="w-full h-full object-cover"
      />
    </div>
  );
}

interface ServiceOrderCardProps {
  order: ServiceOrder;
  role: "CUSTOMER" | "WORKER" | "PROVIDER" | "ADMIN";
  onPrimaryAction?: (order: ServiceOrder) => void;
  onSecondaryAction?: (order: ServiceOrder) => void;
  onViewDetail?: (order: ServiceOrder) => void;
  onAcceptOrder?: (order: ServiceOrder) => void;
  onRejectOrder?: (order: ServiceOrder) => void;
}

export function ServiceOrderCard({
  order,
  role,
  onPrimaryAction,
  onSecondaryAction,
  onViewDetail,
  onAcceptOrder,
  onRejectOrder,
}: ServiceOrderCardProps) {
  const isRejectedByProvider =
    order.providerDecisionStatus === "REJECTED" ||
    order.subStatus === "CANCELLED_PROVIDER_REJECTED";

  const badgeInfo = isRejectedByProvider
    ? {
        label: "Ditolak Mitra Toko",
        variant: "danger" as const,
        description: "Pesanan ditolak oleh mitra toko. Dana survei 100% dikembalikan otomatis ke akun S-Pay pelanggan.",
      }
    : getSubStatusBadgeInfo(order.subStatus);

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  const getDetailHref = () => {
    switch (role) {
      case "CUSTOMER":
        return `/orders/${order.id}`;
      case "WORKER":
        return `/worker/jobs/${order.id}`;
      case "PROVIDER":
        return `/provider/orders/${order.id}`;
      case "ADMIN":
        return `/admin/orders?tab=SERVICE&selectedId=${order.id}`;
    }
  };

  const badgeColorClass = {
    primary: "bg-sky-50 text-[#0F4C81] border-sky-200",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  }[badgeInfo.variant];

  const subStr = order.subStatus as string;
  const isTerminalOrder = order.status === "COMPLETED" || order.status === "CANCELLED";
  const isPastOtwStage = [
    "WORKER_ARRIVED",
    "DIAGNOSING",
    "WAITING_CUSTOMER_CONSENT",
    "IN_PERSON_CONSENT_RECORDED",
    "PRICE_APPROVED",
    "EXECUTING",
    "EXECUTION_IN_PROGRESS",
    "WORK_FINISHED",
    "EXECUTION_PENDING",
    "PAYMENT_OVERDUE",
    "WAITING_WORKER_CLOSE_VISIT",
    "VISIT_CLOSED",
    "AWAITING_CUSTOMER_CONFIRMATION",
    "COMPLETED_NORMAL",
    "AUTO_COMPLETED_72H",
  ].includes(subStr);
  const isPastArrivedStage = [
    "DIAGNOSING",
    "WAITING_CUSTOMER_CONSENT",
    "IN_PERSON_CONSENT_RECORDED",
    "PRICE_APPROVED",
    "EXECUTING",
    "EXECUTION_IN_PROGRESS",
    "WORK_FINISHED",
    "EXECUTION_PENDING",
    "PAYMENT_OVERDUE",
    "WAITING_WORKER_CLOSE_VISIT",
    "VISIT_CLOSED",
    "AWAITING_CUSTOMER_CONFIRMATION",
    "COMPLETED_NORMAL",
    "AUTO_COMPLETED_72H",
  ].includes(subStr);

  // Specific role context labels & badges
  const isDiagnosisPending =
    order.paymentSummary.diagnosisPayment &&
    order.paymentSummary.diagnosisPayment.amount > 0 &&
    order.paymentSummary.diagnosisPayment.status === "PENDING";

  const isExecutionPending =
    order.paymentSummary.executionPayment &&
    order.paymentSummary.executionPayment.status === "PENDING";

  const isExecutionOverdue =
    order.paymentSummary.executionPayment &&
    (order.paymentSummary.executionPayment.status === "OVERDUE" ||
      order.subStatus === "PAYMENT_OVERDUE");

  // Dynamic schedule day status in Asia/Jakarta timezone
  const getScheduleDayStatus = (scheduleDateStr?: string): "TODAY" | "FUTURE" | "OVERDUE" => {
    if (!scheduleDateStr) return "FUTURE";
    try {
      const nowJakarta = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const schedDate = scheduleDateStr.substring(0, 10);
      if (schedDate === nowJakarta) return "TODAY";
      if (schedDate < nowJakarta) return "OVERDUE";
      return "FUTURE";
    } catch {
      return "FUTURE";
    }
  };

  const scheduleDayStatus = getScheduleDayStatus(order.schedule.date);
  const isWorkerScheduledToday =
    role === "WORKER" &&
    order.subStatus === "WORKER_ACCEPTED" &&
    scheduleDayStatus === "TODAY";

  const isWorkerScheduledOverdue =
    role === "WORKER" &&
    order.subStatus === "WORKER_ACCEPTED" &&
    scheduleDayStatus === "OVERDUE";

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-servio-xs hover:shadow-servio-sm transition-all p-5 sm:p-6 flex flex-col justify-between space-y-4 group ${
        isWorkerScheduledToday ? "border-l-4 border-l-blue-600 bg-sky-50/15" : ""
      }`}
    >
      {/* 1. Header Bar: Order ID, Service Mode, SubStatus Badge & Hari Ini Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
            #{order.orderNumber}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
            {order.serviceSnapshot.subcategoryName || order.serviceSnapshot.categoryName}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {order.serviceSnapshot.serviceMode === "HOME_SERVICE" ? "Kunjungan ke Rumah" : "Bengkel / Workshop"}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isWorkerScheduledToday && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>Hari Ini</span>
            </span>
          )}
          {isWorkerScheduledOverdue && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-3xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              <span>Jadwal Terlewat</span>
            </span>
          )}
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-3xs flex items-center gap-1.5 ${badgeColorClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{badgeInfo.label}</span>
          </span>
        </div>
      </div>

      {/* 2. Body Grid: Photo, Info, & Party Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Thumbnail Photo & Service Title */}
        <div className="md:col-span-6 flex items-start gap-3.5">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80 relative">
            <img
              src={order.serviceSnapshot.thumbnailUrl}
              alt={order.serviceSnapshot.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
              {(() => {
                const rawTitle = order.serviceSnapshot?.title || "";
                return (!rawTitle || rawTitle.toLowerCase().includes("service offering") || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle))
                  ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                  : rawTitle;
              })()}
            </h3>

            {/* Provider and Customer context based on role */}
            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Buildings size={13} className="text-primary shrink-0" weight="bold" />
                <span className="truncate">{order.providerName}</span>
              </span>

              {role !== "CUSTOMER" && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{order.customerName}</span>
                  </span>
                </>
              )}
            </div>

            {/* Complaint summary snippet */}
            <p className="text-[11px] text-slate-500 line-clamp-1 italic">
              &quot;{order.complaint.description}&quot;
            </p>

            {/* Complaint photos preview */}
            {order.complaint.photos && order.complaint.photos.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {order.complaint.photos.slice(0, 3).map((photoUrl, idx) => (
                  <a
                    key={idx}
                    href={photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Foto Kerusakan Pelanggan"
                    className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:opacity-85 transition-opacity block shadow-2xs"
                  >
                    <img
                      src={photoUrl}
                      alt="Foto Kerusakan"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
                {order.complaint.photos.length > 3 && (
                  <span className="text-[10px] font-semibold text-slate-400 pl-0.5">
                    +{order.complaint.photos.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule & Location */}
        <div className="md:col-span-3 space-y-1 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <CalendarBlank size={14} className="text-primary shrink-0" weight="bold" />
            <span>{isWorkerScheduledToday ? `Hari Ini (${order.schedule.date})` : order.schedule.date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span>{order.schedule.timeSlot}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{order.addressSnapshot.city}</span>
          </div>
        </div>

        {/* Financial / Assigned Worker Snapshot */}
        <div className="md:col-span-3 space-y-1 text-xs border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
          {order.status === "CANCELLED" || order.providerDecisionStatus === "REJECTED" ? (
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-[11px] space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                {order.providerDecisionStatus === "REJECTED" ? "Ditolak Mitra Toko" : "Pesanan Dibatalkan"}
              </span>
              <p className="text-slate-800 font-medium line-clamp-2 italic leading-snug">
                &quot;{order.cancellation?.reasonDetail || order.providerRejectionReason || "Pesanan ditolak/dibatalkan"}&quot;
              </p>
              <div className="pt-1 border-t border-rose-200/60 flex items-center gap-1 font-bold text-emerald-700 text-[10px]">
                <ShieldCheck size={13} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Refund 100% S-Pay (Rp {(order.serviceSnapshot.diagnosisFee || 50000).toLocaleString("id-ID")})</span>
              </div>
            </div>
          ) : role === "PROVIDER" && order.status === "COMPLETED" ? (
            <div className="space-y-1 p-2.5 rounded-2xl bg-sky-50/80 border border-sky-100 text-[11px]">
              <div className="flex justify-between items-center text-slate-600">
                <span>Pengerjaan:</span>
                <span className="font-mono font-medium">{formatRupiah(order.paymentSummary.providerFunds?.executionGross || (order.paymentSummary.executionPayment?.executionSubtotal ?? 200000))}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Survei:</span>
                <span className="font-mono font-medium">{formatRupiah(order.paymentSummary.providerFunds?.diagnosisGross || order.serviceSnapshot.diagnosisFee || 50000)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span>Potongan:</span>
                <span className="font-mono font-medium">-{formatRupiah(order.paymentSummary.providerFunds?.platformFee || 10000)}</span>
              </div>
              <div className="pt-1 border-t border-sky-200/60 flex justify-between items-center font-bold">
                <span className="text-[#0F4C81]">Hak Bersih:</span>
                <span className="font-mono text-xs text-primary">{formatRupiah(order.paymentSummary.providerFunds?.netAmount || 240000)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5 text-[10px]">
                <span className="text-slate-400">Status Saldo:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded ${order.paymentSummary.providerFunds?.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {order.paymentSummary.providerFunds?.status === "AVAILABLE" ? "Tersedia" : "Ditahan (120 Jam)"}
                </span>
              </div>
            </div>
          ) : order.assignment && order.assignment.status === "ACCEPTED" ? (
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Teknisi Bertugas</span>
              <div className="flex items-center gap-2">
                <WorkerBadgeAvatar
                  workerId={order.assignment.workerId}
                  name={order.assignment.workerName}
                  fallbackPhoto={order.assignment.workerPhoto}
                />
                <span className="font-bold text-slate-800 flex items-center gap-1 truncate">
                  <CheckCircle size={12} weight="fill" className="text-emerald-500 shrink-0" />
                  <span className="truncate">{order.assignment.workerName}</span>
                </span>
              </div>
            </div>
          ) : isDiagnosisPending ? (
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Tagihan Diagnosis</span>
              <span className="text-sm font-bold font-display text-amber-900">
                {formatRupiah(order.paymentSummary.diagnosisPayment?.amount)}
              </span>
            </div>
          ) : isExecutionPending || isExecutionOverdue ? (
            <div>
              <span className={`text-[10px] font-bold uppercase block ${isExecutionOverdue ? "text-rose-700" : "text-amber-800"}`}>
                {isExecutionOverdue ? "Pelunasan Terlambat" : "Tagihan Pengerjaan"}
              </span>
              <span className={`text-sm font-bold font-display ${isExecutionOverdue ? "text-rose-900" : "text-primary"}`}>
                {formatRupiah(order.paymentSummary.executionPayment?.amount)}
              </span>
            </div>
          ) : order.diagnosis ? (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Rincian Biaya</span>
              <span className="text-sm font-bold font-display text-primary">
                {formatRupiah(order.diagnosis.costBreakdown.grandTotal)}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Biaya Diagnosis</span>
              <span className="text-xs font-bold text-slate-700">
                {order.serviceSnapshot.diagnosisFee === 0 ? "Gratis (Rp 0)" : formatRupiah(order.serviceSnapshot.diagnosisFee)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer Bar: Contextual CTA & Detail Button */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500 leading-snug">
          {badgeInfo.description}
        </p>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* Dual-Path Chat Action: Provider vs Worker */}
          {role === "CUSTOMER" && (() => {
            const snapshot = order.serviceSnapshot as any;
            const price = snapshot?.finalPrice ?? snapshot?.diagnosisFee ?? snapshot?.price ?? 150000;
            const thumb = snapshot?.imageUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80";

            return order.assignment && order.assignment.status === "ACCEPTED" ? (
              <>
                <Link
                  href={`/chat?partner_id=${encodeURIComponent(order.assignment.workerId || "acfdfc27-9ba5-472f-bec1-3c372f47fff6")}&partner_type=worker&partner_name=${encodeURIComponent(order.assignment.workerName || "Ahmad Teknisi")}&provider_name=${encodeURIComponent(order.providerName || "sukses gembira")}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Teknisi: ${order.assignment.workerName || "Ahmad Teknisi"} • Jadwal: ${order.schedule?.date || "9 Nov 2026"} (${order.schedule?.timeSlot || "10:00 WIB"})`)}&ctx_url=${encodeURIComponent(`/orders/${order.id}`)}`}
                  className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1.5 shadow-2xs"
                  title="Chat Teknisi Langsung"
                >
                  <ChatCircleDots size={15} weight="bold" className="text-amber-700" />
                  <span>Chat Teknisi</span>
                </Link>
                <Link
                  href={`/chat?partner_id=${encodeURIComponent(order.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d")}&partner_type=provider&partner_name=${encodeURIComponent(order.providerName || "sukses gembira")}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Penyedia: ${order.providerName || "sukses gembira"} • Biaya: Rp ${Number(price).toLocaleString("id-ID")}`)}&ctx_url=${encodeURIComponent(`/orders/${order.id}`)}`}
                  className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5 shadow-2xs"
                  title="Chat Provider Jasa"
                >
                  <ChatCircleDots size={15} weight="bold" className="text-purple-700" />
                  <span>Chat Provider</span>
                </Link>
              </>
            ) : (
              <Link
                href={`/chat?partner_id=${encodeURIComponent(order.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d")}&partner_type=provider&partner_name=${encodeURIComponent(order.providerName || "sukses gembira")}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Penyedia: ${order.providerName || "sukses gembira"} • Biaya: Rp ${Number(price).toLocaleString("id-ID")}`)}&ctx_url=${encodeURIComponent(`/orders/${order.id}`)}`}
                className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5 shadow-2xs"
                title="Chat Provider Jasa"
              >
                <ChatCircleDots size={15} weight="bold" className="text-purple-700" />
                <span>Chat Provider</span>
              </Link>
            );
          })()}

          {/* Provider Jasa Chat Actions: Chat Pelanggan & Chat Teknisi */}
          {role === "PROVIDER" && (() => {
            const snapshot = order.serviceSnapshot as any;
            const price = snapshot?.finalPrice ?? snapshot?.diagnosisFee ?? snapshot?.price ?? 150000;
            const thumb = snapshot?.imageUrl || order.serviceSnapshot?.thumbnailUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80";
            const customerId = order.customerId || "692f03fd-2362-485a-9a23-a672bbb4533f";
            const customerName = order.customerName || order.addressSnapshot?.recipientName || "Ahmad Fauzi";
            const isWorkerAssigned = order.assignment && (order.assignment.status === "ACCEPTED" || Boolean(order.assignment.workerId));

            return (
              <>
                <Link
                  href={`/provider/chat?partner_id=${encodeURIComponent(customerId)}&partner_type=customer&partner_name=${encodeURIComponent(customerName)}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Pelanggan: ${customerName} • Biaya: Rp ${Number(price).toLocaleString("id-ID")}`)}&ctx_url=${encodeURIComponent(`/provider/orders/${order.id}`)}`}
                  className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-bold hover:bg-sky-100 transition flex items-center gap-1.5 shadow-2xs"
                  title="Chat Pelanggan"
                >
                  <ChatCircleDots size={15} weight="bold" className="text-[#0F4C81]" />
                  <span>Chat Pelanggan</span>
                </Link>
                {isWorkerAssigned && (
                  <Link
                    href={`/provider/chat?partner_id=${encodeURIComponent(order.assignment!.workerId || "acfdfc27-9ba5-472f-bec1-3c372f47fff6")}&partner_type=worker&partner_name=${encodeURIComponent(order.assignment!.workerName || "Ahmad Teknisi")}&provider_name=${encodeURIComponent(order.providerName || "sukses gembira")}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Teknisi: ${order.assignment!.workerName || "Ahmad Teknisi"} • Jadwal: ${order.schedule?.date || "9 Nov 2026"} (${order.schedule?.timeSlot || "10:00 WIB"})`)}&ctx_url=${encodeURIComponent(`/provider/orders/${order.id}`)}`}
                    className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1.5 shadow-2xs"
                    title="Chat Teknisi Langsung"
                  >
                    <ChatCircleDots size={15} weight="bold" className="text-amber-700" />
                    <span>Chat Teknisi</span>
                  </Link>
                )}
              </>
            );
          })()}

          {/* Worker / Teknisi Chat Actions: Chat Pelanggan & Chat Provider */}
          {role === "WORKER" && (() => {
            const snapshot = order.serviceSnapshot as any;
            const price = snapshot?.finalPrice ?? snapshot?.diagnosisFee ?? snapshot?.price ?? 150000;
            const thumb = snapshot?.imageUrl || order.serviceSnapshot?.thumbnailUrl || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80";
            const customerId = order.customerId || "692f03fd-2362-485a-9a23-a672bbb4533f";
            const customerName = order.customerName || order.addressSnapshot?.recipientName || "Ahmad Fauzi";
            const providerId = order.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d";
            const providerName = order.providerName || "sukses gembira";

            return (
              <>
                <Link
                  href={`/worker/chat?partner_id=${encodeURIComponent(customerId)}&partner_type=customer&partner_name=${encodeURIComponent(customerName)}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Pelanggan: ${customerName} • Jadwal: ${order.schedule?.date || "9 Nov 2026"} (${order.schedule?.timeSlot || "10:00 WIB"})`)}&ctx_url=${encodeURIComponent(`/worker/jobs/${order.id}`)}`}
                  className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-bold hover:bg-sky-100 transition flex items-center gap-1.5 shadow-2xs"
                  title="Chat Pelanggan"
                >
                  <ChatCircleDots size={15} weight="bold" className="text-[#0F4C81]" />
                  <span>Chat Pelanggan</span>
                </Link>
                <Link
                  href={`/worker/chat?partner_id=${encodeURIComponent(providerId)}&partner_type=provider&partner_name=${encodeURIComponent(providerName)}&ctx_type=order_jasa&ctx_id=${encodeURIComponent(order.id)}&ctx_title=${encodeURIComponent(order.serviceSnapshot?.title || "Pesanan Jasa")}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(price)}&ctx_thumb=${encodeURIComponent(thumb)}&ctx_summary=${encodeURIComponent(`Provider: ${providerName} • Order #${order.id}`)}&ctx_url=${encodeURIComponent(`/worker/jobs/${order.id}`)}`}
                  className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5 shadow-2xs"
                  title="Chat Provider Jasa"
                >
                  <ChatCircleDots size={15} weight="bold" className="text-purple-700" />
                  <span>Chat Provider</span>
                </Link>
              </>
            );
          })()}
          {/* Secondary Action if available (except Worker which has dedicated Tolak button) */}
          {onSecondaryAction && role !== "WORKER" && (
            <button
              type="button"
              onClick={() => onSecondaryAction(order)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Laporkan Masalah
            </button>
          )}

          {/* Primary Action Button according to Role & Status */}
          {role === "CUSTOMER" && isDiagnosisPending && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={15} weight="bold" />
              <span>Bayar Diagnosis</span>
            </button>
          )}

          {role === "CUSTOMER" && isExecutionPending && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={15} weight="bold" />
              <span>Bayar Pengerjaan</span>
            </button>
          )}

          {role === "CUSTOMER" && order.subStatus === "WAITING_CUSTOMER_CONSENT" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Tanggapi Rincian Biaya</span>
            </button>
          )}

          {role === "CUSTOMER" &&
            !isTerminalOrder &&
            (order.subStatus === "VISIT_CLOSED" ||
              (order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" && order.visit?.status === "CLOSED") ||
              (order.paymentSummary?.executionPayment?.status === "PAID" && order.visit?.status === "CLOSED")) && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Pekerjaan Telah Selesai</span>
            </button>
          )}

          {role === "WORKER" && (order.assignment?.status === "ASSIGNED" || order.subStatus === "ASSIGNED_PENDING" || (order.assignment?.status as any) === "PENDING") && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (onSecondaryAction ? onSecondaryAction(order) : undefined)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle size={15} weight="bold" />
                <span>Tolak</span>
              </button>
              <button
                type="button"
                onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle size={15} weight="bold" />
                <span>Terima Tugas</span>
              </button>
            </div>
          )}

          {role === "WORKER" && order.subStatus === "WORKER_ACCEPTED" && (
            (() => {
              const todayJakarta = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date());
              const isTodayOrPast = !order.schedule?.date || order.schedule.date <= todayJakarta;
              if (!isTodayOrPast) return null;
              return (
                <button
                  type="button"
                  onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight size={15} weight="bold" />
                  <span>Mulai Perjalanan</span>
                </button>
              );
            })()
          )}

          {role === "WORKER" &&
            !isTerminalOrder &&
            (order.subStatus === "WORKER_OTW" ||
              ((order.visit?.status === "OTW" || order.visit?.status === "ON_THE_WAY") && !isPastOtwStage)) && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <MapPin size={15} weight="bold" />
              <span>Tiba di Lokasi</span>
            </button>
          )}

          {role === "WORKER" &&
            !isTerminalOrder &&
            (order.subStatus === "WORKER_ARRIVED" ||
              (order.visit?.status === "ARRIVED" && !order.diagnosis && !isPastArrivedStage)) && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={15} weight="bold" />
              <span>Mulai Pemeriksaan</span>
            </button>
          )}

          {role === "WORKER" && order.subStatus === "WAITING_CUSTOMER_CONSENT" && (
            <Link
              href={`/worker/jobs/${order.id}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Persetujuan di Lokasi</span>
            </Link>
          )}

          {role === "WORKER" && order.subStatus === "PRICE_APPROVED" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Wrench size={15} weight="bold" />
              <span>Lanjutkan Pengerjaan</span>
            </button>
          )}

          {role === "WORKER" && order.subStatus === "EXECUTING" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Selesai Pengerjaan</span>
            </button>
          )}

          {role === "WORKER" &&
            !isTerminalOrder &&
            order.subStatus !== "VISIT_CLOSED" &&
            order.subStatus !== "AWAITING_CUSTOMER_CONFIRMATION" &&
            order.visit?.status !== "CLOSED" &&
            (order.subStatus === "WAITING_WORKER_CLOSE_VISIT" ||
              order.paymentSummary?.executionPayment?.status === "PAID") && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Akhiri Kunjungan</span>
            </button>
          )}

          {role === "PROVIDER" && order.subStatus === "UNASSIGNED" && order.providerDecisionStatus !== "ACCEPTED" && (
            <>
              <button
                type="button"
                onClick={() => (onRejectOrder ? onRejectOrder(order) : undefined)}
                className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle size={15} weight="bold" />
                <span>Tolak Order</span>
              </button>
              <button
                type="button"
                onClick={() => (onAcceptOrder ? onAcceptOrder(order) : undefined)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle size={15} weight="bold" />
                <span>Terima Order</span>
              </button>
            </>
          )}

          {role === "PROVIDER" && ((order.subStatus === "UNASSIGNED" && order.providerDecisionStatus === "ACCEPTED") || order.subStatus === "ASSIGNED_PENDING") && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <User size={15} weight="bold" />
              <span>{order.subStatus === "ASSIGNED_PENDING" ? "Ganti Teknisi" : "Pilih & Tugaskan Teknisi"}</span>
            </button>
          )}

          {role === "PROVIDER" && order.status === "COMPLETED" && (
            <Link
              href="/provider/spay"
              className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0F4C81] border border-sky-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <CurrencyCircleDollar size={15} weight="bold" />
              <span>S-Pay</span>
            </Link>
          )}

          {/* View Detail Link / Button */}
          {onViewDetail ? (
            <button
              type="button"
              onClick={() => onViewDetail(order)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={15} />
              <span>Lihat Detail</span>
            </button>
          ) : (
            <Link
              href={getDetailHref()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Eye size={15} />
              <span>Lihat Detail</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
