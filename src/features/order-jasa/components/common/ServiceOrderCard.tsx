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
  WarningCircle,
  Buildings,
  Phone,
  Eye,
  Camera,
  Cube,
  Tag,
  CurrencyCircleDollar,
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
}

export function ServiceOrderCard({
  order,
  role,
  onPrimaryAction,
  onSecondaryAction,
  onViewDetail,
}: ServiceOrderCardProps) {
  const badgeInfo = getSubStatusBadgeInfo(order.subStatus);

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
          {role === "PROVIDER" && order.status === "COMPLETED" ? (
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

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Secondary Action if available */}
          {onSecondaryAction && (
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

          {role === "CUSTOMER" && order.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Konfirmasi Selesai</span>
            </button>
          )}

          {role === "WORKER" && order.assignment?.status === "ASSIGNED" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle size={15} weight="bold" />
              <span>Terima Tugas</span>
            </button>
          )}

          {role === "WORKER" && order.subStatus === "WORKER_ACCEPTED" && (
            <button
              type="button"
              onClick={() => (onPrimaryAction ? onPrimaryAction(order) : undefined)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight size={15} weight="bold" />
              <span>Mulai Perjalanan</span>
            </button>
          )}

          {role === "PROVIDER" && (order.subStatus === "UNASSIGNED" || order.subStatus === "ASSIGNED_PENDING") && (
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
