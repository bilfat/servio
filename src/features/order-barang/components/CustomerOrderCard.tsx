"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Storefront,
  Truck,
  CreditCard,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  Receipt,
  ArrowsClockwise,
  XCircle,
  ShieldCheck,
  ChatDots,
  Info,
  Phone,
  ArrowSquareOut,
  Eye,
  X,
} from "@phosphor-icons/react";
import { MockMerchantOrder } from "@/types/order-barang";
import { formatRupiah, formatDateTimeIndo } from "../helpers";

interface CustomerOrderCardProps {
  order: MockMerchantOrder;
  currentTime: Date;
  onPayNow: (order: MockMerchantOrder) => void;
  onCancelUnpaidCheckout: (order: MockMerchantOrder) => void;
  onCancelConfirmedOrder: (order: MockMerchantOrder) => void;
  onRequestCancellation: (order: MockMerchantOrder) => void;
  onConfirmDelivered: (order: MockMerchantOrder) => void;
  onViewReceipt: (order: MockMerchantOrder) => void;
  onViewTracking: (order: MockMerchantOrder) => void;
  onReportIssue: (order: MockMerchantOrder) => void;
}

export function CustomerOrderCard({
  order,
  currentTime,
  onPayNow,
  onCancelUnpaidCheckout,
  onCancelConfirmedOrder,
  onRequestCancellation,
  onConfirmDelivered,
  onViewReceipt,
  onViewTracking,
  onReportIssue,
}: CustomerOrderCardProps) {
  const router = useRouter();
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);

  useEffect(() => {
    try {
      router.prefetch(`/orders/products/${order.id}`);
    } catch {}
  }, [order.id, router]);

  // Primary product snapshot
  const firstItem = order.items[0];
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const isUnpaid = order.status === "CREATED" || order.status === "PAYMENT_PENDING";
  const createdAtTime = new Date(order.createdAt).getTime();
  const expiresAtTime = createdAtTime + 6 * 3600 * 1000;
  const nowMs = currentTime?.getTime() || Date.now();
  const diffMs = Math.max(0, expiresAtTime - nowMs);
  const remainingSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  const isExpired = diffMs <= 0;
  const isUnpaidAndExpired = isUnpaid && isExpired;
  const effectiveStatus = (order.status === "CANCELLED" || isUnpaidAndExpired) ? "CANCELLED" : order.status;
  const formattedCountdown = isExpired
    ? "00:00:00 (Kedaluwarsa)"
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Status mapping badge info
  const getBadgeDetails = () => {
    switch (effectiveStatus) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return {
          label: "Menunggu Pembayaran",
          sublabel: "Batas 6 Jam",
          colorClass: "bg-amber-50 text-amber-700 border-amber-300",
          dotClass: "bg-amber-500",
        };
      case "CONFIRMED":
        return {
          label: "Pembayaran Berhasil",
          sublabel: "Menunggu Diproses Toko",
          colorClass: "bg-sky-50 text-[#0F4C81] border-sky-300",
          dotClass: "bg-[#0F4C81]",
        };
      case "PROCESSING":
        if (order.cancellationRequest?.status === "PENDING") {
          return {
            label: "Menunggu Keputusan Merchant",
            sublabel: "Pengajuan Pembatalan",
            colorClass: "bg-orange-50 text-orange-700 border-orange-300",
            dotClass: "bg-orange-500",
          };
        }
        return {
          label: "Sedang Disiapkan",
          sublabel: "Diproses Penjual",
          colorClass: "bg-blue-50 text-blue-700 border-blue-300",
          dotClass: "bg-blue-500",
        };
      case "PACKED":
        return {
          label: "Siap Dikirim",
          sublabel: "Telah Dikemas",
          colorClass: "bg-indigo-50 text-indigo-700 border-indigo-300",
          dotClass: "bg-indigo-500",
        };
      case "DELIVERING":
        const isGosendBadge = order.delivery.provider === "GOSEND" || order.delivery.courierMethod === "GOSEND";
        return {
          label: "Sedang Dikirim",
          sublabel: isGosendBadge ? "Metode: GoSend" : "Metode: Kurir Toko",
          colorClass: "bg-purple-50 text-purple-700 border-purple-300",
          dotClass: "bg-purple-500",
        };
      case "DELIVERED":
        return {
          label: "Tiba di Tujuan",
          sublabel: "Menunggu Konfirmasi Anda",
          colorClass: "bg-teal-50 text-teal-800 border-teal-300",
          dotClass: "bg-teal-500",
        };
      case "COMPLETED":
        return {
          label: "Pesanan Selesai",
          sublabel: order.completionSource === "AUTO_COMPLETION" ? "Selesai Otomatis" : "Dikonfirmasi Pelanggan",
          colorClass: "bg-emerald-50 text-emerald-700 border-emerald-300",
          dotClass: "bg-emerald-500",
        };
      case "CANCELLED":
        const isExpiredCancel =
          order.paymentStatus === "EXPIRED" ||
          order.cancellationReason?.toLowerCase().includes("pembayaran") ||
          order.cancellationDetails?.reason?.toLowerCase().includes("pembayaran") ||
          isExpired;
        return {
          label: "Dibatalkan",
          sublabel: isExpiredCancel
            ? "Belum menyelesaikan pembayaran"
            : order.cancellationDetails?.actor === "MERCHANT"
              ? "Oleh Penjual"
              : order.cancellationDetails?.actor === "SYSTEM" || order.cancelledBy === "SYSTEM"
                ? "Oleh Sistem"
                : "Oleh Pelanggan",
          colorClass: "bg-rose-50 text-rose-700 border-rose-300",
          dotClass: "bg-rose-500",
        };
      default:
        return {
          label: order.status,
          sublabel: "",
          colorClass: "bg-slate-50 text-slate-700 border-slate-300",
          dotClass: "bg-slate-400",
        };
    }
  };

  const badge = getBadgeDetails();

  return (
    <div
      onClick={() => router.push(`/orders/products/${order.id}`)}
      onMouseEnter={() => {
        try {
          router.prefetch(`/orders/products/${order.id}`);
        } catch {}
      }}
      className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 cursor-pointer group bg-white shadow-servio-xs hover:shadow-servio-md"
    >
      {/* Top Header: Merchant, Order ID, Date & Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-dark">
            <Storefront size={16} weight="duotone" className="text-primary shrink-0" />
            <span>{order.merchantName}</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-xs font-bold text-neutral-slate">
            #{order.orderNumber}
          </span>
          {order.checkoutGroupId && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">
              Grup #{order.checkoutGroupId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-neutral-muted">
            {formatDateTimeIndo(order.createdAt)}
          </span>
          {isUnpaid && !isExpired && (
            <div className="bg-amber-50 border border-amber-300/90 rounded-xl px-2.5 py-1 flex items-center gap-1.5 shrink-0 shadow-2xs">
              <Clock size={14} weight="duotone" className="text-amber-600 animate-pulse" />
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                  Sisa Waktu:
                </span>
                <span className="text-xs font-extrabold font-mono text-amber-900">
                  {formattedCountdown}
                </span>
              </div>
            </div>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.colorClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
            <span>{badge.label}</span>
          </span>
        </div>
      </div>

      {/* Cancellation Request Notice Banner (if PENDING or REJECTED) */}
      {order.status === "PROCESSING" && order.cancellationRequest && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${order.cancellationRequest.status === "PENDING"
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <WarningCircle size={15} weight="fill" className={order.cancellationRequest.status === "PENDING" ? "text-amber-600" : "text-rose-600"} />
              {order.cancellationRequest.status === "PENDING"
                ? "Pengajuan Pembatalan Sedang Ditinjau Merchant"
                : "Pengajuan Pembatalan Ditolak"}
            </span>
            {order.cancellationRequest.status === "PENDING" && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200/70 text-amber-900">
                SLA: 12 Jam Operasional Toko
              </span>
            )}
          </div>
          <p className="text-[11px] opacity-90">
            {order.cancellationRequest.status === "PENDING"
              ? `Alasan: "${order.cancellationRequest.reason}". Jika penjual tidak merespons dalam 12 jam operasional, sistem akan otomatis menolak permohonan pembatalan.`
              : `Alasan penolakan: "${order.cancellationRequest.rejectionReason || "Pesanan sudah dipersiapkan dan tidak dapat dibatalkan"}". Pengemasan dilanjutkan.`}
          </p>
        </div>
      )}

      {/* Delivered Confirmation Alert Banner (4 Items Saved & Displayed) */}
      {order.status === "DELIVERED" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-4 rounded-2xl bg-teal-50 border border-teal-200/90 text-teal-900 text-xs space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-teal-950">
              <CheckCircle size={18} weight="fill" className="text-teal-600" />
              Paket Telah Tiba di Alamat Pengiriman (Bukti Serah Terima)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200/80 text-teal-900 font-mono">
              Auto-Selesai: 48 Jam
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/90 border border-teal-200/80 text-[11px] space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">1. Nama Penerima:</span>
              <span className="font-bold text-slate-900">
                {order.delivery.recipientReceivedBy || order.delivery.deliveredToName || order.shippingAddressSnapshot.recipientName}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
              <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {order.delivery.proofType || "Foto Serah Terima Paket"}
              </span>
            </div>

            {order.delivery.deliveredNotes && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">3. Catatan:</span>
                <span className="text-slate-700 italic">
                  &ldquo;{order.delivery.deliveredNotes}&rdquo;
                </span>
              </div>
            )}

            {order.delivery.deliveredAt && (
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                <span>Waktu Diterima:</span>
                <span>{formatDateTimeIndo(order.delivery.deliveredAt)}</span>
              </div>
            )}

            {/* 4. Foto Bukti Paket Sampai */}
            {order.delivery.proofPhotoUrl && (
              <div className="pt-2 border-t border-teal-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => setIsPhotoLightboxOpen(true)}
                    className="relative w-14 h-14 rounded-xl overflow-hidden border border-teal-200 cursor-pointer group shrink-0 bg-slate-100"
                    title="Klik untuk memperbesar foto bukti serah terima"
                  >
                    <img
                      src={order.delivery.proofPhotoUrl}
                      alt="Foto Bukti Paket"
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Eye size={16} weight="bold" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">4. Foto Bukti Paket:</span>
                    <button
                      type="button"
                      onClick={() => setIsPhotoLightboxOpen(true)}
                      className="text-teal-700 hover:text-teal-900 font-bold text-xs underline flex items-center gap-1 cursor-pointer mt-0.5"
                    >
                      <Eye size={13} weight="bold" />
                      <span>Lihat Foto Bukti Paket Sampai</span>
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-teal-700/80 italic hidden sm:inline">
                  (Klik foto untuk perbesar)
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-teal-800 leading-snug">
            Harap periksa kelengkapan suku cadang. Klik tombol <strong>Pesanan Diterima</strong> untuk menyelesaikan transaksi, atau <strong>Laporkan Masalah</strong> jika pesanan tidak sesuai.
          </p>
        </div>
      )}

      {/* Lightbox Modal: Popup Perbesar Gambar Bukti Serah Terima */}
      {isPhotoLightboxOpen && order.delivery.proofPhotoUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsPhotoLightboxOpen(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200/90 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} weight="bold" className="text-teal-600" />
                <span className="font-bold text-slate-900 text-xs">
                  Foto Bukti Serah Terima Paket #{order.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoLightboxOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-[70vh]">
              <img
                src={order.delivery.proofPhotoUrl}
                alt="Bukti Paket Sampai"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">1. Nama Penerima:</span>
                <span className="font-bold text-slate-800">
                  {order.delivery.recipientReceivedBy || order.delivery.deliveredToName || order.shippingAddressSnapshot.recipientName}
                </span>
              </div>
              {order.delivery.proofType && (
                <div className="flex justify-between">
                  <span className="text-slate-500">2. Jenis Bukti:</span>
                  <span className="text-teal-800 font-semibold">{order.delivery.proofType}</span>
                </div>
              )}
              {order.delivery.deliveredNotes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">3. Catatan:</span>
                  <span className="text-slate-700 italic">&ldquo;{order.delivery.deliveredNotes}&rdquo;</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsPhotoLightboxOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Banner: Full Refund vs Unpaid Notice */}
      {order.status === "CANCELLED" && (() => {
        const isPaidOrder =
          order.payment?.status === "PAID" ||
          order.payment?.status === "REFUNDED" ||
          order.payment?.status === "PARTIALLY_REFUNDED" ||
          order.paymentStatus === "PAID" ||
          order.paymentStatus === "REFUNDED";

        const hasActiveRefund =
          isPaidOrder &&
          order.refund &&
          order.refund.status !== "NOT_REQUIRED";

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`p-3.5 rounded-2xl border text-xs space-y-1 ${hasActiveRefund
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Info size={15} weight="bold" />
                Alasan Pembatalan: {order.cancellationDetails?.reason || "Dibatalkan"}
              </span>
              {order.cancellationDetails?.actor && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70">
                  Oleh {order.cancellationDetails.actor === "MERCHANT" ? "Penjual" : order.cancellationDetails.actor === "SYSTEM" ? "Sistem" : "Pelanggan"}
                </span>
              )}
            </div>
            {hasActiveRefund ? (
              <div className="text-[11px] pt-1 border-t border-emerald-200/60 flex items-center justify-between flex-wrap gap-1">
                <span>
                  Status Refund: <strong>{order.refund?.status === "SUCCEEDED" ? "Berhasil Dikembalikan (100%)" : "Sedang Diproses"}</strong>
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  Total Refund: {formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                Tidak Ada Refund — Belum Melakukan Pembayaran.
              </p>
            )}
          </div>
        );
      })()}

      {/* Body: Items Preview & Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/70 overflow-hidden flex items-center justify-center shrink-0 relative">
            {firstItem?.thumbnailUrl && firstItem.thumbnailUrl !== "/brand/logo.png" ? (
              <img
                src={firstItem.thumbnailUrl}
                alt={firstItem.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.classList.add("hidden");
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`${firstItem?.thumbnailUrl && firstItem.thumbnailUrl !== "/brand/logo.png" ? "hidden" : "flex"} items-center justify-center`}>
              <Package size={28} weight="duotone" className="text-primary/70" />
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <h3 className="font-display font-bold text-sm sm:text-base text-neutral-dark group-hover:text-primary transition-colors line-clamp-1">
              {firstItem?.title || "Suku Cadang / Barang"}
            </h3>
            {firstItem?.variantName && (
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                Varian: {firstItem.variantName}
              </span>
            )}
            {order.items.length > 1 && (
              <p className="text-xs text-neutral-slate font-medium">
                +{order.items.length - 1} produk lainnya
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-neutral-slate flex-wrap pt-0.5">
              <span>
                Total: <strong>{totalItemCount} barang</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <Truck size={14} className="text-slate-500" />
                <span>Pengiriman Lokal ({(order.delivery.provider === "GOSEND" || order.delivery.courierMethod === "GOSEND") ? "GoSend" : "Kurir Toko"})</span>
              </span>
              {(order.delivery.trackingNumber || order.delivery.trackingReference) && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                    Resi: {order.delivery.trackingNumber || order.delivery.trackingReference}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Dynamic Action Buttons */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          <div>
            <span className="text-[10px] text-neutral-muted block sm:text-right">
              Total Pesanan Toko:
            </span>
            <span className="font-mono font-bold text-base text-neutral-dark">
              {formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}
            </span>
          </div>

          <div
            className="flex items-center gap-2 mt-2 flex-wrap justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contextual In-App Chat Button */}
            <Link
              href={`/chat?partner_id=${encodeURIComponent(order.merchantId || "0c1467e7-af68-4b26-ae84-daa41d51aed0")}&partner_type=merchant&partner_name=${encodeURIComponent(order.merchantName || "BUDIAJASA")}&ctx_type=order_barang&ctx_id=${encodeURIComponent(order.orderNumber || order.id)}&ctx_title=${encodeURIComponent(firstItem?.title || `Pesanan #${order.orderNumber}`)}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}&ctx_thumb=${encodeURIComponent(firstItem?.thumbnailUrl || "")}&ctx_summary=${encodeURIComponent(`Total Tagihan: ${formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)} • ${order.items?.length || 1} Barang • Pengiriman Kurir Toko`)}&ctx_url=${encodeURIComponent(`/orders/products/${order.orderNumber || order.id}`)}`}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Chat Toko mengenai pesanan ini"
            >
              <ChatDots size={14} weight="bold" className="text-emerald-600" />
              <span>Chat Toko</span>
            </Link>
            {/* UNPAID Actions (Only when NOT expired) */}
            {(order.status === "CREATED" || order.status === "PAYMENT_PENDING") && !isExpired && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelUnpaidCheckout(order);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                >
                  Batalkan Checkout
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPayNow(order);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-servio-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard size={14} weight="bold" />
                  <span>Bayar Sekarang</span>
                </button>
              </>
            )}

            {/* CANCELLED or EXPIRED Actions */}
            {(order.status === "CANCELLED" || isUnpaidAndExpired) && (
              <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Alasan: {order.cancellationReason || order.cancellationDetails?.reason || "Belum menyelesaikan pembayaran"}
              </span>
            )}

            {/* CONFIRMED Actions */}
            {order.status === "CONFIRMED" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelConfirmedOrder(order);
                }}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
              >
                Batalkan Pesanan
              </button>
            )}

            {/* PROCESSING Actions */}
            {order.status === "PROCESSING" && (
              <>
                {order.cancellationRequest?.status !== "PENDING" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestCancellation(order);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                  >
                    Ajukan Pembatalan
                  </button>
                )}
              </>
            )}

            {/* PACKED Actions */}
            {order.status === "PACKED" && (
              <span className="text-[11px] text-slate-500 italic">
                Menunggu penjemputan kurir
              </span>
            )}

            {/* DELIVERING Actions (GoSend vs Kurir Toko) */}
            {order.status === "DELIVERING" && (() => {
              const isGosend = order.delivery.provider === "GOSEND" || order.delivery.courierMethod === "GOSEND";
              const hasValidTrackingUrl = !!(order.delivery.trackingUrl && order.delivery.trackingUrl.trim().startsWith("http"));

              return (
                <>
                  {isGosend ? (
                    // 1. GOSEND (GOJEK)
                    <>
                      {hasValidTrackingUrl ? (
                        <a
                          href={order.delivery.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <ArrowSquareOut size={14} weight="bold" />
                          <span>Lacak Pengiriman</span>
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 flex items-center gap-1">
                          <Info size={13} className="text-slate-400" />
                          <span>Link pelacakan belum tersedia</span>
                        </span>
                      )}
                    </>
                  ) : (
                    // 2. KURIR TOKO (Pengiriman Sendiri, Tanpa GPS)
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-700 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 font-medium">
                        <Truck size={14} className="text-blue-600" />
                        <span>Pesanan sedang diantar oleh kurir toko.</span>
                      </span>

                      {order.delivery.courierPhone && (
                        <a
                          href={`https://wa.me/${order.delivery.courierPhone.replace(/\D/g, "")}?text=Halo%20kurir,%20saya%20pelanggan%20pesanan%20${order.orderNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Hubungi nomor kurir pengantar"
                        >
                          <Phone size={13} weight="bold" />
                          <span>No HP: {order.delivery.courierPhone}</span>
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTracking(order);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                  >
                    Riwayat
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportIssue(order);
                    }}
                    className="px-2 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Kendala?
                  </button>
                </>
              );
            })()}

            {/* DELIVERED Actions */}
            {order.status === "DELIVERED" && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirmDelivered(order);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={15} weight="bold" />
                  <span>Konfirmasi Barang Telah Diterima</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReportIssue(order);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Laporkan Kendala
                </button>
              </>
            )}

            {/* COMPLETED Actions */}
            {order.status === "COMPLETED" && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewReceipt(order);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Receipt size={14} weight="bold" />
                  <span>Lihat Struk</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/products");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-primary border border-sky-200 hover:bg-sky-100 text-xs font-bold transition cursor-pointer"
                >
                  Beli Lagi
                </button>
              </>
            )}

            {/* Detail Navigation button */}
            <Link
              href={`/orders/products/${order.id}`}
              prefetch={true}
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>Detail</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
