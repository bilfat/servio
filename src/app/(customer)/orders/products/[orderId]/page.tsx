"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Copy,
  Receipt,
  Storefront,
  ArrowsClockwise,
  Camera,
  WarningCircle,
  ShieldCheck,
  Sparkle,
  XCircle,
  Clock,
  NavigationArrow,
} from "@phosphor-icons/react";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Toast } from "@/components/feedback/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { productOrdersApi } from "@/lib/servioApi";

export default function ProductOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "prod-order-881";

  const [orderStatus, setOrderStatus] = useState<
    "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "PACKED" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED" | "REFUNDED"
  >("PAID");

  const [realOrder, setRealOrder] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // Cancellation Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Salah memilih varian produk");
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Confirm Received Modal state
  const [isConfirmReceivedModalOpen, setIsConfirmReceivedModalOpen] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await productOrdersApi.get(orderId);
      if (res.data) {
        setRealOrder(res.data);
        const st = (res.data.status || res.data.order?.status || "PAID").toUpperCase();
        if (
          ["PENDING_PAYMENT", "PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(
            st
          )
        ) {
          setOrderStatus(st as any);
        } else if (st === "NEW" || st === "CONFIRMED") {
          setOrderStatus("PROCESSING");
        } else if (st === "IN_TRANSIT" || st === "ON_DELIVERY") {
          setOrderStatus("SHIPPED");
        } else {
          setOrderStatus("PAID");
        }
      }
    } catch (err) {
      console.warn("Could not load server order details:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const orderData = {
    id: realOrder?.orderId || realOrder?.order?.orderId || orderId,
    orderNumber: realOrder?.orderNumber || realOrder?.order?.orderNumber || `PO-${orderId.slice(-6)}`,
    trackingNumber:
      realOrder?.shipment?.trackingNumber ||
      realOrder?.trackingNumber ||
      (orderStatus === "SHIPPED" || orderStatus === "DELIVERED" || orderStatus === "COMPLETED"
        ? "JNE-REG-0988127391"
        : "-"),
    courierName:
      realOrder?.shippingMethod?.courierName ||
      realOrder?.shippingMethodSnapshot?.courierName ||
      realOrder?.order?.shippingMethodSnapshot?.courierName ||
      "JNE Express (Reguler)",
    createdAt: realOrder?.createdAt
      ? new Date(realOrder.createdAt).toLocaleString("id-ID")
      : "30 September 2026, 14:30 WIB",
    paidAt: realOrder?.paidAt
      ? new Date(realOrder.paidAt).toLocaleString("id-ID")
      : "30 September 2026, 14:35 WIB",
    merchantName: realOrder?.merchantName || "Toko Sparepart Glodok",
    recipientName:
      realOrder?.shippingAddress?.recipientName ||
      realOrder?.shippingAddressSnapshot?.recipientName ||
      "Ahmad Pratama",
    recipientPhone:
      realOrder?.shippingAddress?.phone ||
      realOrder?.shippingAddressSnapshot?.phone ||
      "0812-9988-1122",
    recipientStreet:
      realOrder?.shippingAddress?.street ||
      realOrder?.shippingAddressSnapshot?.street ||
      "Gedung BEI Tower 2 Lt. 14, Jakarta Selatan",
    items:
      realOrder?.items?.map((it: any) => ({
        id: it.orderItemId || it.variantId,
        title: it.productTitle || it.productNameSnapshot || "Sparepart Pendingin",
        variantName: it.variantName || it.variantNameSnapshot,
        quantity: it.quantity,
        price: it.unitPrice || it.unitPriceSnapshot || 45000,
      })) || [
        {
          id: "prod-cap-daikin",
          title: "Kapasitor Kompresor AC Split Universal",
          variantName: "25 uF (0.5 PK - 0.75 PK)",
          quantity: 2,
          price: 45000,
        },
      ],
    pricing: {
      subtotal: realOrder?.subtotal || realOrder?.order?.subtotal || 90000,
      shipping: realOrder?.shippingAmount || realOrder?.order?.shippingAmount || 15000,
      fee: realOrder?.feeAmount || 2500,
      total: realOrder?.totalAmount || realOrder?.order?.totalAmount || 107500,
    },
    pod: realOrder?.pod || realOrder?.proofOfDelivery || realOrder?.shipment?.pod || null,
    cancellation: realOrder?.cancellation || null,
    cancellationReason: realOrder?.cancellationReason || realOrder?.cancellation?.reason || null,
    refund: realOrder?.refund || null,
  };

  const steps = [
    {
      title: "Pesanan Dibuat",
      date: orderData.createdAt,
      completed: true,
    },
    {
      title: "Pembayaran Lunas (PAID)",
      date: orderStatus === "PENDING_PAYMENT" ? "Menunggu" : orderData.paidAt,
      completed: orderStatus !== "PENDING_PAYMENT",
    },
    {
      title: "Diproses & Dikemas",
      date:
        ["PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(orderStatus)
          ? "Selesai Dikemas"
          : orderStatus === "PROCESSING"
          ? "Sedang Diproses"
          : "Menunggu",
      completed: ["PACKED", "SHIPPED", "DELIVERED", "COMPLETED"].includes(orderStatus),
    },
    {
      title: "Dalam Pengiriman",
      date: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(orderStatus) ? "Dalam Transit Kurir" : "-",
      completed: ["SHIPPED", "DELIVERED", "COMPLETED"].includes(orderStatus),
    },
    {
      title: "Tiba / Selesai",
      date: orderStatus === "COMPLETED" ? "Pesanan Selesai" : orderStatus === "DELIVERED" ? "Tiba di Tujuan" : "-",
      completed: ["DELIVERED", "COMPLETED"].includes(orderStatus),
    },
  ];

  const handleCopyResi = () => {
    if (orderData.trackingNumber === "-") return;
    navigator.clipboard?.writeText(orderData.trackingNumber);
    setToastType("success");
    setToastMessage("Nomor resi pengiriman berhasil disalin!");
  };

  const handleCancelOrder = async () => {
    setIsLoadingAction(true);
    setCancelError(null);
    try {
      await productOrdersApi.cancel(orderId, cancelReason);
      setIsCancelModalOpen(false);
      setToastType("success");
      setToastMessage("Pesanan berhasil dibatalkan. Pengembalian dana akan diproses oleh Tim Keuangan.");
      await fetchOrder();
    } catch (err: any) {
      console.error("Cancellation error:", err);
      setCancelError(err.message || "Gagal membatalkan pesanan. Periksa kebijakan operasional.");
      setToastType("error");
      setToastMessage(err.message || "Pembatalan ditolak oleh sistem.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleConfirmReceived = async () => {
    setIsLoadingAction(true);
    try {
      await productOrdersApi.confirmReceived(orderId);
      setIsConfirmReceivedModalOpen(false);
      setToastType("success");
      setToastMessage("Pesanan telah dikonfirmasi selesai! Garansi resmi produk kini aktif.");
      await fetchOrder();
    } catch (err: any) {
      console.error("Confirm received error:", err);
      setToastType("error");
      setToastMessage(err.message || "Gagal mengonfirmasi penerimaan barang.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              id="back-to-orders-btn"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Pesanan Suku Cadang Resmi
                </span>
                <span className="text-xs font-mono text-slate-400">#{orderData.orderNumber}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Rincian Pesanan & Status Pemenuhan
              </h1>
            </div>
          </div>
          <div>
            {orderStatus === "PAID" && (
              <span id="order-status-badge-paid" className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                Lunas (PAID)
              </span>
            )}
            {orderStatus === "PROCESSING" && (
              <span id="order-status-badge-processing" className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                <Package size={14} weight="fill" className="text-blue-600" />
                Diproses Penjual
              </span>
            )}
            {orderStatus === "PACKED" && (
              <span id="order-status-badge-packed" className="text-xs font-bold px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1.5">
                <Package size={14} weight="fill" className="text-sky-600" />
                Telah Dikemas (PACKED)
              </span>
            )}
            {orderStatus === "SHIPPED" && (
              <span id="order-status-badge-shipped" className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                <Truck size={14} weight="fill" className="text-indigo-600" />
                Dalam Pengiriman (SHIPPED)
              </span>
            )}
            {orderStatus === "DELIVERED" && (
              <span id="order-status-badge-delivered" className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                Tiba di Tujuan (DELIVERED)
              </span>
            )}
            {orderStatus === "COMPLETED" && (
              <span id="order-status-badge-completed" className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                <ShieldCheck size={14} weight="fill" className="text-purple-600" />
                Selesai (COMPLETED)
              </span>
            )}
            {orderStatus === "CANCELLED" && (
              <span id="order-status-badge-cancelled" className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                <XCircle size={14} weight="fill" className="text-rose-600" />
                Dibatalkan (CANCELLED)
              </span>
            )}
            {orderStatus === "REFUNDED" && (
              <span id="order-status-badge-refunded" className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                Dana Dikembalikan (REFUNDED)
              </span>
            )}
            {orderStatus === "PENDING_PAYMENT" && (
              <span id="order-status-badge-pending" className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Menunggu Pembayaran
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Dynamic Context Notification Banner */}
        {orderStatus === "PENDING_PAYMENT" && (
          <div
            id="order-pending-payment-banner"
            className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <Clock size={24} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-amber-900">Menunggu Pembayaran</p>
                <p className="text-slate-600 leading-relaxed">
                  Pesanan telah dibuat. Silakan selesaikan pembayaran sebelum batas waktu berakhir atau Anda dapat membatalkan pesanan ini.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="cancel-order-button"
                onClick={() => setIsCancelModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition shadow-xs"
              >
                Batalkan Pesanan
              </button>
              <Link
                href={`/checkout/payment?orderId=${orderData.id}&amount=${orderData.pricing.total}`}
                id="pay-now-button"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                Bayar Sekarang
              </Link>
            </div>
          </div>
        )}

        {orderStatus === "CANCELLED" && (
          <div
            id="order-cancelled-banner"
            className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <XCircle size={24} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-rose-900">Pesanan Resmi Dibatalkan (CANCELLED)</p>
                <p className="text-slate-600 leading-relaxed">
                  Pesanan #{orderData.orderNumber} telah dibatalkan. Alasan pembatalan: <strong>{orderData.cancellationReason || "Pembatalan oleh pelanggan sebelum proses pemenuhan."}</strong>
                </p>
                <div className="p-3 bg-white/80 rounded-xl border border-rose-100 text-slate-700 mt-2">
                  <p className="font-bold text-rose-800">Status Konsekuensi Finansial & Pengembalian Dana:</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Permintaan pengembalian dana (refund) telah dicatat di sistem Finance. Tim Finance akan memverifikasi dan mengeksekusi pengembalian dana ke metode pembayaran asal sesuai kebijakan platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(orderData?.refund || orderStatus === "REFUNDED") && (
          <div
            id="order-refund-status-card"
            className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <Receipt size={24} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-emerald-900">
                    Pengembalian Dana Resmi (Refund Finance)
                  </p>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    (orderData?.refund?.status || "COMPLETED") === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {orderData?.refund?.status || "COMPLETED"}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Pengembalian dana resmi telah diverifikasi dan dieksekusi oleh Tim Finance Payment Ops sesuai kebijakan platform.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-white/90 rounded-2xl border border-emerald-100 text-slate-700 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Nominal Refund:</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {formatRupiah(orderData?.refund?.amount || orderData.pricing.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Tujuan Transfer:</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {orderData?.refund?.refundDestination || "Metode Pembayaran Asal"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">ID Transaksi Refund:</span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {orderData?.refund?.refundNumber || orderData?.refund?.refundId || `REF-${orderData.orderNumber}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {orderStatus === "PAID" && (
          <div
            id="order-next-action-banner"
            className="p-5 rounded-3xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <Clock size={24} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-[#0F4C81]">Pesanan Sedang Menunggu Proses Penjual</p>
                <p className="text-slate-600 leading-relaxed">
                  Pembayaran berhasil diverifikasi. Pesanan Anda telah masuk ke antrean penjual (<strong>{orderData.merchantName}</strong>) untuk pengambilan barang (picking) dan pengemasan.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="cancel-order-button"
              onClick={() => setIsCancelModalOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold transition shadow-xs"
            >
              Batalkan Pesanan
            </button>
          </div>
        )}

        {orderStatus === "PROCESSING" && (
          <div className="p-5 rounded-3xl bg-blue-50 border border-blue-200 text-blue-950 flex items-start gap-3 shadow-xs">
            <Package size={24} weight="fill" className="text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-blue-900">Penjual Sedang Memproses Pesanan Anda</p>
              <p className="text-slate-600 leading-relaxed">
                Barang suku cadang sedang diambil dari gudang operasional dan disiapkan untuk proses quality control (QC).
              </p>
            </div>
          </div>
        )}

        {orderStatus === "PACKED" && (
          <div className="p-5 rounded-3xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start gap-3 shadow-xs">
            <Package size={24} weight="fill" className="text-sky-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-sky-900">Barang Telah Lulus QC & Dikemas</p>
              <p className="text-slate-600 leading-relaxed">
                Paket Anda telah melewati pemeriksaan mutu dan siap diserahkan kepada kurir ekspedisi.
              </p>
            </div>
          </div>
        )}

        {orderStatus === "SHIPPED" && (
          <div className="p-5 rounded-3xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <Truck size={24} weight="fill" className="text-indigo-700 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-indigo-900">Paket Dalam Perjalanan Ekspedisi</p>
                <p className="text-slate-600 leading-relaxed">
                  Kurir <strong>{orderData.courierName}</strong> sedang mengantarkan paket Anda ke alamat tujuan.
                </p>
              </div>
            </div>
            <Link
              id="track-shipment-button"
              href={`/tracking/shipment/${orderData.trackingNumber}`}
              className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <NavigationArrow size={14} weight="bold" />
              Lacak Pengiriman
            </Link>
          </div>
        )}

        {orderStatus === "DELIVERED" && (
          <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <CheckCircle size={24} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm text-emerald-900">Pesanan Telah Tiba di Tujuan (DELIVERED)</p>
                <p className="text-slate-600 leading-relaxed">
                  Paket telah diterima. Silakan periksa kelengkapan suku cadang dan konfirmasi penerimaan untuk mengaktifkan garansi resmi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/tracking/shipment/${orderData.trackingNumber}`}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
              >
                Lacak Resi
              </Link>
              <button
                type="button"
                id="confirm-received-button"
                onClick={() => setIsConfirmReceivedModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle size={15} weight="bold" />
                Konfirmasi Terima Barang
              </button>
            </div>
          </div>
        )}

        {orderStatus === "COMPLETED" && (
          <div className="p-5 rounded-3xl bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-3 shadow-xs">
            <ShieldCheck size={24} weight="fill" className="text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-purple-900">Pesanan Selesai — Garansi Resmi Suku Cadang Aktif</p>
              <p className="text-slate-600 leading-relaxed">
                Penerimaan barang telah dikonfirmasi. Hak klaim garansi resmi dan perlindungan suku cadang kini aktif terhubung dengan akun Anda.
              </p>
            </div>
          </div>
        )}

        {(orderStatus === "DELIVERED" || orderStatus === "COMPLETED") && (
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                <ArrowsClockwise size={22} weight="bold" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">Pusat Bantuan & Resolusi Pesanan</p>
                <p className="text-slate-500">
                  Ada kendala fisik, barang tidak sesuai, atau ingin mengajukan retur & klaim garansi resmi?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                id="apply-return-button"
                href={`/returns/new?orderId=${orderData.id}&orderItemId=${orderData.items[0]?.id || "item-01"}`}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-[#0F4C81] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <ArrowsClockwise size={15} weight="bold" />
                Ajukan Retur Barang
              </Link>
              <Link
                id="apply-warranty-button"
                href="/warranties"
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200"
              >
                <ShieldCheck size={15} weight="bold" />
                Klaim Garansi
              </Link>
            </div>
          </div>
        )}

        {orderStatus === "CANCELLED" && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-xs">
            <XCircle size={24} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-rose-900">Pesanan Telah Dibatalkan</p>
              <p className="text-slate-600 leading-relaxed">
                Pesanan ini telah dibatalkan. Berkas pengembalian dana telah diteruskan ke Tim Keuangan untuk verifikasi dan pelaksanaan refund saldo/rekening.
              </p>
            </div>
          </div>
        )}

        {/* Progression Stepper */}
        {orderStatus !== "CANCELLED" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Truck size={20} weight="duotone" className="text-[#0F4C81]" />
              Tahapan Status Pesanan
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        step.completed
                          ? "bg-[#0F4C81] text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {step.completed ? "✓" : idx + 1}
                    </div>
                    {idx < steps.length - 1 && <div className="h-0.5 flex-1 bg-slate-200" />}
                  </div>
                  <p className="text-xs font-bold text-slate-900 pt-1">{step.title}</p>
                  <p className="text-[11px] text-slate-400">{step.date}</p>
                </div>
              ))}
            </div>

            {/* Courier & Resi Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-slate-400">Jasa Ekspedisi Terpilih</p>
                <p className="font-bold text-slate-900">{orderData.courierName}</p>
              </div>
              <div>
                <p className="text-slate-400">Nomor Resi Pengiriman</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-800">
                    {orderData.trackingNumber}
                  </span>
                  {orderData.trackingNumber !== "-" && (
                    <button
                      type="button"
                      onClick={handleCopyResi}
                      className="p-1 rounded-md hover:bg-slate-200 text-slate-600 transition"
                      title="Salin Resi"
                    >
                      <Copy size={14} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Proof of Delivery (POD) Section if Delivered or Completed */}
        {(orderStatus === "DELIVERED" || orderStatus === "COMPLETED" || orderData.pod) && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                Bukti Pengiriman Berhasil (Proof of Delivery)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Terkonfirmasi Sistem
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-slate-400 block text-[10px]">Nama Penerima:</span>
                <span className="font-bold text-slate-900">
                  {orderData.pod?.receiverName || orderData.recipientName}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-slate-400 block text-[10px]">Waktu Diterima:</span>
                <span className="font-bold text-slate-900">
                  {orderData.pod?.deliveredAt
                    ? new Date(orderData.pod.deliveredAt).toLocaleString("id-ID")
                    : "30 September 2026, 16:45 WIB"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-slate-400 block text-[10px]">Catatan / Referensi:</span>
                <span className="font-bold text-slate-900">
                  {orderData.pod?.evidenceReference || orderData.pod?.notes || "Diterima oleh Yang Bersangkutan"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Ordered Items & Seller Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Storefront size={18} weight="duotone" className="text-[#0F4C81]" />
              <span>{orderData.merchantName}</span>
            </div>
            <span className="text-xs text-slate-400">ID: {orderData.id}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {orderData.items.map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900">{item.title}</p>
                  {item.variantName && (
                    <p className="text-[11px] text-slate-500 font-semibold">{item.variantName}</p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    {formatRupiah(item.price)} × {item.quantity} Unit
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#0F4C81]">{formatRupiah(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address & Billing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 pb-2 border-b border-slate-100">
              Alamat Pengiriman
            </h3>
            <p className="font-bold text-slate-900">
              {orderData.recipientName}{" "}
              <span className="font-normal text-slate-500">({orderData.recipientPhone})</span>
            </p>
            <p className="text-slate-600 leading-relaxed">{orderData.recipientStreet}</p>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Receipt size={16} weight="duotone" className="text-[#0F4C81]" />
              Ringkasan Pembayaran
            </h3>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Produk</span>
              <span className="font-semibold text-slate-800">{formatRupiah(orderData.pricing.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ongkos Kirim</span>
              <span className="font-semibold text-slate-800">{formatRupiah(orderData.pricing.shipping)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Layanan Platform</span>
              <span className="font-semibold text-slate-800">{formatRupiah(orderData.pricing.fee)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm">
              <span className="text-slate-900">Total Pembayaran</span>
              <span className="text-[#0F4C81] font-display">{formatRupiah(orderData.pricing.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCancelModalOpen(false)}
          title="Batalkan Pesanan Ini?"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Pesanan ini dalam status <strong>{orderStatus}</strong>. Pembatalan hanya dapat disetujui apabila pesanan belum diproses/dikemas oleh penjual sesuai kebijakan platform.
            </p>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-800">Alasan Pembatalan:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="Salah memilih varian produk">Salah memilih varian produk</option>
                <option value="Ingin mengubah alamat pengiriman">Ingin mengubah alamat pengiriman</option>
                <option value="Menemukan penawaran lain">Menemukan penawaran lain</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <WarningCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold">Konsekuensi Pengembalian Dana:</p>
              <p>
                Jika pesanan telah dibayar, proses refund akan dikirimkan ke Tim Finance untuk validasi dan pengembalian dana ke saldo/metode pembayaran asal.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isLoadingAction}
              >
                Kembali
              </Button>
              <Button
                variant="primary"
                size="sm"
                id="submit-cancel-order-button"
                onClick={handleCancelOrder}
                isLoading={isLoadingAction}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Konfirmasi Batalkan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Received Modal */}
      {isConfirmReceivedModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConfirmReceivedModalOpen(false)}
          title="Konfirmasi Penerimaan Barang"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Apakah Anda telah menerima seluruh suku cadang dalam kondisi baik dan lengkap sesuai pesanan #{orderData.orderNumber}?
            </p>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck size={14} weight="fill" className="text-purple-600" />
                Aktivasi Garansi Resmi:
              </p>
              <p>
                Dengan mengonfirmasi penerimaan barang, pesanan akan diselesaikan (COMPLETED) dan garansi perlindungan suku cadang akan langsung diaktifkan di platform SERVIO.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmReceivedModalOpen(false)}
                disabled={isLoadingAction}
              >
                Belum, Cek Dulu
              </Button>
              <Button
                variant="primary"
                size="sm"
                id="confirm-received-modal-btn"
                onClick={handleConfirmReceived}
                isLoading={isLoadingAction}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Ya, Sudah Diterima
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
