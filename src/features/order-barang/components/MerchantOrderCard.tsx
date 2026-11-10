"use client";

import React from "react";
import Link from "next/link";
import {
  Package,
  Storefront,
  Truck,
  CreditCard,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  ArrowsClockwise,
  XCircle,
  User,
  MapPin,
  Eye,
  Info,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { MockMerchantOrder } from "@/types/order-barang";
import { formatRupiah, formatDateTimeIndo } from "../helpers";

interface MerchantOrderCardProps {
  order: MockMerchantOrder;
  currentTime: Date;
  onViewDetail: (order: MockMerchantOrder) => void;
  onStartProcessing: (order: MockMerchantOrder) => void;
  onCancelOperational: (order: MockMerchantOrder) => void;
  onPackOrder: (order: MockMerchantOrder) => void;
  onConfigureDelivery: (order: MockMerchantOrder) => void;
  onRespondCancellation: (order: MockMerchantOrder) => void;
  onRecordDelivered: (order: MockMerchantOrder) => void;
  onMarkDeliveryFailed: (order: MockMerchantOrder) => void;
  onRetryDelivery: (order: MockMerchantOrder) => void;
  onViewProof: (order: MockMerchantOrder) => void;
}

export function MerchantOrderCard({
  order,
  currentTime,
  onViewDetail,
  onStartProcessing,
  onCancelOperational,
  onPackOrder,
  onConfigureDelivery,
  onRespondCancellation,
  onRecordDelivered,
  onMarkDeliveryFailed,
  onRetryDelivery,
  onViewProof,
}: MerchantOrderCardProps) {
  const isCancellationPending = order.cancellationRequest?.status === "PENDING";
  const isDeliveryFailed = order.delivery.deliveryStatus === "FAILED";

  const isUnpaid = order.status === "PAYMENT_PENDING" || order.status === "CREATED";
  const createdAtTime = new Date(order.createdAt).getTime();
  const expiresAtTime = createdAtTime + 6 * 3600 * 1000;
  const diffMs = Math.max(0, expiresAtTime - (currentTime?.getTime() || Date.now()));
  const isExpired = diffMs <= 0;
  const isUnpaidAndExpired = isUnpaid && isExpired;
  const effectiveStatus = (order.status === "CANCELLED" || isUnpaidAndExpired) ? "CANCELLED" : order.status;

  const getStatusBadge = () => {
    switch (effectiveStatus) {
      case "PAYMENT_PENDING":
      case "CREATED":
        return {
          label: "Menunggu Pembayaran",
          colorClass: "bg-amber-50 text-amber-800 border-amber-300",
          dotClass: "bg-amber-500",
        };
      case "CONFIRMED":
        return {
          label: "Pesanan Baru Masuk",
          colorClass: "bg-sky-50 text-[#0F4C81] border-sky-300",
          dotClass: "bg-[#0F4C81]",
        };
      case "PROCESSING":
        if (isCancellationPending) {
          return {
            label: "Pengajuan Batal Pending",
            colorClass: "bg-orange-50 text-orange-700 border-orange-300",
            dotClass: "bg-orange-500",
          };
        }
        return {
          label: "Sedang Diproses",
          colorClass: "bg-blue-50 text-blue-700 border-blue-300",
          dotClass: "bg-blue-500",
        };
      case "PACKED":
        return {
          label: "Siap Dikirim (Dikemas)",
          colorClass: "bg-indigo-50 text-indigo-700 border-indigo-300",
          dotClass: "bg-indigo-500",
        };
      case "DELIVERING":
        if (isDeliveryFailed) {
          return {
            label: "Pengiriman Bermasalah",
            colorClass: "bg-rose-50 text-rose-700 border-rose-300",
            dotClass: "bg-rose-500",
          };
        }
        return {
          label: "Sedang Dalam Pengiriman",
          colorClass: "bg-purple-50 text-purple-700 border-purple-300",
          dotClass: "bg-purple-500",
        };
      case "DELIVERED":
        return {
          label: "Tiba di Tujuan",
          colorClass: "bg-teal-50 text-teal-700 border-teal-300",
          dotClass: "bg-teal-500",
        };
      case "COMPLETED":
        return {
          label: "Pesanan Selesai",
          colorClass: "bg-emerald-50 text-emerald-700 border-emerald-300",
          dotClass: "bg-emerald-500",
        };
      case "CANCELLED":
        return {
          label: "Dibatalkan",
          colorClass: "bg-rose-50 text-rose-700 border-rose-300",
          dotClass: "bg-rose-500",
        };
      default:
        return {
          label: order.status,
          colorClass: "bg-slate-50 text-slate-700 border-slate-300",
          dotClass: "bg-slate-400",
        };
    }
  };

  const badge = getStatusBadge();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const countdownFormatted = isExpired
    ? "Waktu Habis"
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      onClick={() => onViewDetail(order)}
      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 transition-all space-y-2.5 cursor-pointer group bg-white shadow-2xs hover:shadow-xs"
    >
      {/* Top Header: Order Number, Customer, Date, Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            #{order.orderNumber}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 font-semibold text-slate-700 text-xs">
            <User size={13} className="text-blue-600" />
            <span>{order.shippingAddressSnapshot.recipientName}</span>
            <span className="text-slate-400 font-normal">({order.shippingAddressSnapshot.phone})</span>
          </span>
          {order.checkoutGroupId && (
            <span className="text-[10px] font-mono text-slate-400">
              Grup #{order.checkoutGroupId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[11px] text-slate-400">
            {formatDateTimeIndo(order.createdAt)}
          </span>
          {isUnpaid && !isExpired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <Clock size={12} weight="bold" className="text-amber-700 animate-pulse" />
              <span>Sisa Waktu: {countdownFormatted}</span>
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.colorClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
            <span>{badge.label}</span>
          </span>
        </div>
      </div>

      {/* Cancellation Request Special Banner (PROCESSING tab) */}
      {order.status === "PROCESSING" && isCancellationPending && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <WarningCircle size={15} weight="fill" className="text-amber-600 shrink-0" />
            <span className="text-[11px] text-amber-900">
              Pelanggan Mengajukan Pembatalan: <strong>&ldquo;{order.cancellationRequest?.reason}&rdquo;</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRespondCancellation(order)}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shrink-0 cursor-pointer"
          >
            Respon Batal
          </button>
        </div>
      )}

      {/* Delivery Failed Alert Banner (DELIVERING tab) */}
      {order.status === "DELIVERING" && isDeliveryFailed && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <WarningCircle size={15} weight="fill" className="text-rose-600 shrink-0" />
            <span className="text-[11px] text-rose-800">
              Pengiriman Bermasalah: {order.delivery.failureReason || "Kurir mengalami kendala"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRetryDelivery(order)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition shrink-0 cursor-pointer"
          >
            Kirim Ulang
          </button>
        </div>
      )}

      {/* Delivered Waiting Confirmation Banner */}
      {order.status === "DELIVERED" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={15} weight="fill" className="text-teal-600 shrink-0" />
            <span className="text-[11px] text-teal-900">
              Barang Telah Tiba di Tujuan (Diterima oleh <strong>{order.delivery.recipientReceivedBy || order.delivery.deliveredToName || order.shippingAddressSnapshot.recipientName}</strong>). Menunggu konfirmasi pembeli.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-200 text-teal-900 shrink-0">
            Auto-Selesai 48 Jam
          </span>
        </div>
      )}

      {/* Cancelled Banner */}
      {order.status === "CANCELLED" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-2"
        >
          <span className="text-[11px]">
            Alasan Pembatalan: <strong>{order.cancellationDetails?.reason || "Dibatalkan"}</strong> (Oleh {order.cancellationDetails?.actor || "Sistem"})
          </span>
          {order.refund && (
            <span className="text-[10px] font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              Refund {order.refund.status}: {formatRupiah(order.pricing.merchantOrderTotal)}
            </span>
          )}
        </div>
      )}

      {/* Main Horizontal Content Row (Alamat, Produk, Biaya & Aksi Dibuat Kesamping!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
        {/* Kolom 1: Alamat Penerima & Jarak (lg:col-span-4) */}
        <div className="lg:col-span-4 flex items-start gap-2">
          <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] text-slate-700 line-clamp-1 leading-snug font-medium">
              {order.shippingAddressSnapshot.street}, {order.shippingAddressSnapshot.city}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                Jarak: ~{order.delivery.distanceKm ?? order.simulatedDistanceKm ?? 2.5} km
              </span>
              <span className="text-[10px] text-slate-500">
                • {order.delivery.provider === "GOSEND" || order.delivery.method === "THIRD_PARTY" ? "GoSend Instant" : "Kurir Toko Internal"}
              </span>
            </div>
          </div>
        </div>

        {/* Kolom 2: Produk / Suku Cadang (lg:col-span-4) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-3 pt-2 lg:pt-0">
          {order.items.slice(0, 1).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                {item.thumbnailUrl && item.thumbnailUrl !== "/brand/logo.png" ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.classList.add("hidden");
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`${item.thumbnailUrl && item.thumbnailUrl !== "/brand/logo.png" ? "hidden" : "flex"} items-center justify-center`}>
                  <Package size={16} className="text-slate-400" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-snug">{item.title}</p>
                <p className="text-[10px] text-slate-500">
                  {item.quantity}× {formatRupiah(item.unitPrice)}
                  {item.variantName && ` • ${item.variantName}`}
                  {order.items.length > 1 && ` (+${order.items.length - 1} suku cadang)`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Kolom 3: Biaya & Tombol Aksi (lg:col-span-4) */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-3 pt-2 lg:pt-0 flex items-center justify-between lg:justify-end gap-3">
          <div className="text-left lg:text-right shrink-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Total Transaksi:</span>
            <span className="font-mono font-extrabold text-xs text-slate-900 block leading-tight">
              {formatRupiah(order.pricing.merchantOrderTotal)}
            </span>
            <span className="text-[10px] text-slate-500">
              Ongkir: {formatRupiah(order.pricing.shippingFee)}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contextual In-App Chat: Merchant -> Pembeli */}
            <Link
              href={`/merchant/chat?partner_id=${encodeURIComponent(
                order.customerId || "692f03fd-2362-485a-9a23-a672bbb4533f"
              )}&partner_type=customer&partner_name=${encodeURIComponent(
                order.customerName || "Ahmad Fauzi"
              )}&ctx_type=order_barang&ctx_id=${encodeURIComponent(
                order.orderNumber || order.id
              )}&ctx_title=${encodeURIComponent(
                order.items[0]?.title || `Pesanan #${order.orderNumber || order.id}`
              )}&ctx_status=${encodeURIComponent(effectiveStatus)}&ctx_price=${encodeURIComponent(
                order.pricing?.merchantOrderTotal ?? order.totalAmount ?? 0
              )}&ctx_thumb=${encodeURIComponent(
                order.items[0]?.thumbnailUrl || ""
              )}&ctx_summary=${encodeURIComponent(
                `Pembeli: ${order.customerName || "Pelanggan"} • ${order.items.length} Barang • Total: ${formatRupiah(order.pricing?.merchantOrderTotal ?? order.totalAmount ?? 0)}`
              )}&ctx_url=${encodeURIComponent(`/merchant/orders?order_id=${order.id}`)}`}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Chat Pembeli (In-App)"
            >
              <ChatCircleDots size={14} weight="bold" className="text-emerald-600" />
              <span>Chat Pembeli</span>
            </Link>

            {/* TAB BELUM BAYAR: PAYMENT_PENDING / CREATED (Not Expired) */}
            {isUnpaid && !isExpired ? (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                  Belum dapat diproses sebelum pembayaran berhasil
                </span>
                <button
                  type="button"
                  onClick={() => onViewDetail(order)}
                  className="px-3 py-1.5 rounded-lg bg-[#0F4C81] hover:bg-sky-800 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Eye size={13} weight="bold" />
                  <span>Lihat Detail</span>
                </button>
              </div>
            ) : (isUnpaidAndExpired || order.status === "CANCELLED") ? (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  Alasan: {order.cancellationReason || "Belum menyelesaikan pembayaran"}
                </span>
                <button
                  type="button"
                  onClick={() => onViewDetail(order)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} weight="bold" />
                  <span>Detail</span>
                </button>
              </div>
            ) : (
              <>
                {/* TAB MASUK: CONFIRMED */}
                {order.status === "CONFIRMED" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onCancelOperational(order)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-[11px] font-bold transition cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartProcessing(order)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Package size={13} weight="bold" />
                      <span>Proses</span>
                    </button>
                  </>
                )}

                {/* TAB DIPROSES: PROCESSING */}
                {order.status === "PROCESSING" && (
                  <>
                    {isCancellationPending ? (
                      <button
                        type="button"
                        onClick={() => onRespondCancellation(order)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <WarningCircle size={13} weight="bold" />
                        <span>Respon Batal</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPackOrder(order)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle size={13} weight="bold" />
                        <span>Tandai Selesai Dikemas</span>
                      </button>
                    )}
                  </>
                )}

                {/* TAB DIPROSES: PACKED */}
                {order.status === "PACKED" && (
                  <button
                    type="button"
                    onClick={() => onConfigureDelivery(order)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Truck size={13} weight="bold" />
                    <span>Atur Kurir</span>
                  </button>
                )}

                {/* TAB DIKIRIM: DELIVERING */}
                {order.status === "DELIVERING" && (
                  <>
                    {isDeliveryFailed ? (
                      <button
                        type="button"
                        onClick={() => onRetryDelivery(order)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Kirim Ulang
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onMarkDeliveryFailed(order)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-bold transition cursor-pointer"
                        >
                          Gagal
                        </button>
                        <button
                          type="button"
                          onClick={() => onRecordDelivered(order)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle size={13} weight="bold" />
                          <span>Diterima</span>
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* TAB TIBA: DELIVERED */}
                {order.status === "DELIVERED" && (
                  <button
                    type="button"
                    onClick={() => onViewProof(order)}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye size={14} weight="bold" />
                    <span>Lihat Bukti</span>
                  </button>
                )}

                {/* TAB SELESAI */}
                {order.status === "COMPLETED" && (
                  <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                    Selesai
                  </span>
                )}

                {/* TAB BELUM BAYAR */}
                {(order.status === "CREATED" || order.status === "PAYMENT_PENDING") && (
                  <span className="text-[11px] text-amber-800 font-medium px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-1.5">
                    <Clock size={13} weight="bold" className="text-amber-600 animate-pulse" />
                    <span>Menunggu Pembayaran</span>
                  </span>
                )}

                {/* Detail Link */}
                <button
                  type="button"
                  onClick={() => onViewDetail(order)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Detail</span>
                  <ArrowRight size={12} weight="bold" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
