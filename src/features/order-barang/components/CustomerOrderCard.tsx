"use client";

import React from "react";
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

  // Primary product snapshot
  const firstItem = order.items[0];
  const totalItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Status mapping badge info
  const getBadgeDetails = () => {
    switch (order.status) {
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
        return {
          label: "Sedang Diantar",
          sublabel: (order.delivery.provider === "GOSEND" || order.delivery.courierMethod === "GOSEND") ? "GoSend (Manual)" : "Kurir Toko",
          colorClass: "bg-purple-50 text-purple-700 border-purple-300",
          dotClass: "bg-purple-500",
        };
      case "DELIVERED":
        return {
          label: "Barang Diterima",
          sublabel: "Menunggu Konfirmasi",
          colorClass: "bg-teal-50 text-teal-700 border-teal-300",
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
        return {
          label: "Dibatalkan",
          sublabel: order.cancellationDetails?.actor === "MERCHANT" ? "Oleh Penjual" : "Oleh Pelanggan",
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

        <div className="flex items-center gap-2.5">
          <span className="text-xs text-neutral-muted">
            {formatDateTimeIndo(order.createdAt)}
          </span>
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

      {/* Delivered Confirmation Alert Banner */}
      {order.status === "DELIVERED" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle size={16} weight="fill" className="text-teal-600" />
              Barang Telah Tiba di Alamat Pengiriman
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200/80 text-teal-900 font-mono">
              Auto-Selesai: 48 Jam
            </span>
          </div>
          <p className="text-[11px] text-teal-800">
            Penerima: <strong>{order.delivery.recipientReceivedBy || order.shippingAddressSnapshot.recipientName}</strong>
            {order.delivery.deliveredAt && ` pada ${formatDateTimeIndo(order.delivery.deliveredAt)}`}.
            Harap konfirmasi penerimaan jika barang sudah dicek dan sesuai.
          </p>
        </div>
      )}

      {/* Cancelled Banner: Full Refund vs Unpaid Notice */}
      {order.status === "CANCELLED" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`p-3.5 rounded-2xl border text-xs space-y-1 ${order.payment.status === "PAID" || order.payment.status === "REFUNDED" || order.payment.status === "PARTIALLY_REFUNDED"
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
          {order.paymentStatus === "PAID" || (order.refund && order.refund.status !== "NOT_REQUIRED") ? (
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
      )}

      {/* Body: Items Preview & Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/70 overflow-hidden flex items-center justify-center shrink-0">
            {firstItem?.thumbnailUrl ? (
              <img
                src={firstItem.thumbnailUrl}
                alt={firstItem.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package size={28} weight="duotone" className="text-primary/70" />
            )}
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
                  <span className="font-mono text-[11px] font-bold text-indigo-700">
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
            {/* UNPAID Actions */}
            {(order.status === "CREATED" || order.status === "PAYMENT_PENDING") && (
              <>
                <button
                  type="button"
                  onClick={() => onCancelUnpaidCheckout(order)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
                >
                  Batalkan Checkout
                </button>
                <button
                  type="button"
                  onClick={() => onPayNow(order)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-servio-xs flex items-center gap-1.5"
                >
                  <CreditCard size={14} weight="bold" />
                  <span>Bayar Sekarang</span>
                </button>
              </>
            )}

            {/* CONFIRMED Actions */}
            {order.status === "CONFIRMED" && (
              <button
                type="button"
                onClick={() => onCancelConfirmedOrder(order)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
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
                    onClick={() => onRequestCancellation(order)}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition"
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

            {/* DELIVERING Actions */}
            {order.status === "DELIVERING" && (
              <>
                <button
                  type="button"
                  onClick={() => onViewTracking(order)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1"
                >
                  <Truck size={14} weight="bold" />
                  <span>Lacak Pengiriman</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReportIssue(order)}
                  className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium"
                >
                  Kendala?
                </button>
              </>
            )}

            {/* DELIVERED Actions */}
            {order.status === "DELIVERED" && (
              <>
                <button
                  type="button"
                  onClick={() => onConfirmDelivered(order)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle size={15} weight="bold" />
                  <span>Pesanan Diterima</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReportIssue(order)}
                  className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium"
                >
                  Laporkan Masalah
                </button>
              </>
            )}

            {/* COMPLETED Actions */}
            {order.status === "COMPLETED" && (
              <>
                <button
                  type="button"
                  onClick={() => onViewReceipt(order)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                >
                  <Receipt size={14} weight="bold" />
                  <span>Lihat Struk</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-primary border border-sky-200 hover:bg-sky-100 text-xs font-bold transition"
                >
                  Beli Lagi
                </button>
              </>
            )}

            {/* Detail Navigation button */}
            <button
              type="button"
              onClick={() => router.push(`/orders/products/${order.id}`)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark text-xs font-bold transition flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
