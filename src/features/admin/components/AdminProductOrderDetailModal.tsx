"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AdminOrderDetailEntity,
  orderBarangApi,
} from "@/lib/orderBarangApi";
import { calculateHaversineDistance } from "@/lib/geoUtils";
import {
  X,
  Package,
  MapPin,
  Truck,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ArrowClockwise,
  Receipt,
  User,
  ShieldCheck,
  WarningCircle,
  Storefront,
  Phone,
  Info,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface AdminProductOrderDetailModalProps {
  orderId: string;
  initialOrder?: AdminOrderDetailEntity | null;
  onClose: () => void;
}

export function AdminProductOrderDetailModal({
  orderId,
  initialOrder,
  onClose,
}: AdminProductOrderDetailModalProps) {
  const [order, setOrder] = useState<AdminOrderDetailEntity | null>(initialOrder || null);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Fetch full enriched order data from backend
  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderBarangApi.admin.getOrder(orderId);
      if (res.data) {
        setOrder(res.data);
      } else {
        setError("Gagal memuat rincian pesanan dari backend.");
      }
    } catch (err: any) {
      console.error("Failed to load admin order detail:", err);
      setError(err?.message || "Terjadi kesalahan saat memuat data pesanan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  // Live countdown timer ticker (every 1 second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate live countdown for pending payments (6-hour window)
  const getExpiryCountdown = (expiresAtStr?: string | null) => {
    if (!expiresAtStr) return { text: "-", isExpired: true, urgent: false };
    const expiryTime = new Date(expiresAtStr).getTime();
    const diffMs = expiryTime - currentTime;
    if (diffMs <= 0) {
      return { text: "Waktu Pembayaran Habis (EXPIRED)", isExpired: true, urgent: true };
    }
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const formatted = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return {
      text: `${formatted} tersisa`,
      isExpired: false,
      urgent: totalSecs < 1800, // less than 30 mins
    };
  };

  // Canonical status badge mapping
  const renderOrderStatusBadge = (status: string) => {
    if (countdown.isExpired && (status === "CREATED" || status === "PAYMENT_PENDING")) {
      return <Badge variant="danger" size="md">Batal</Badge>;
    }
    switch (status) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return <Badge variant="warning" size="md">Belum Bayar</Badge>;
      case "CONFIRMED":
        return <Badge variant="primary" size="md">Pesanan Masuk</Badge>;
      case "PROCESSING":
        return <Badge variant="primary" size="md">Diproses</Badge>;
      case "PACKED":
        return <Badge variant="secondary" size="md">Dikemas</Badge>;
      case "DELIVERING":
        return <Badge variant="primary" size="md">Dikirim</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="md">Diterima</Badge>;
      case "COMPLETED":
        return <Badge variant="success" size="md">Selesai</Badge>;
      case "CANCELLED":
        return <Badge variant="danger" size="md">Batal</Badge>;
      default:
        return <Badge variant="neutral" size="md">{status}</Badge>;
    }
  };

  const renderPaymentStatusBadge = (status?: string | null) => {
    if (countdown.isExpired && (!status || status === "PENDING" || status === "UNPAID")) {
      return <Badge variant="neutral" size="md">EXPIRED (Kedaluwarsa)</Badge>;
    }
    const s = (status || "").toUpperCase();
    switch (s) {
      case "PAID":
        return <Badge variant="success" size="md">PAID (Lunas)</Badge>;
      case "PENDING":
        return <Badge variant="warning" size="md">PENDING (Menunggu)</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral" size="md">EXPIRED (Kedaluwarsa)</Badge>;
      case "FAILED":
        return <Badge variant="danger" size="md">FAILED (Gagal)</Badge>;
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return <Badge variant="secondary" size="md">{s}</Badge>;
      default:
        return <Badge variant="neutral" size="md">{s || "-"}</Badge>;
    }
  };

  const countdown = getExpiryCountdown(
    order?.checkout_group?.finance_expires_at || order?.finance_payment?.expires_at
  );

  // Financial calculations
  const productSubtotal = order?.product_subtotal_idr || 0;
  const shippingCustomer = order?.shipping_customer_idr || 0;
  const appFeeAllocated = order?.app_fee_allocated_idr || 0;
  const customerTax = order?.customer_tax_allocated_idr || 0;
  const discountAllocated = order?.discount_allocated_idr || 0;
  const customerTotal = order?.customer_total_idr || (productSubtotal + shippingCustomer + appFeeAllocated);

  const merchantOrderTotal = productSubtotal + shippingCustomer;

  const breakdown = order?.finance_allocation?.merchant_fee_breakdown;
  const hasCustomBreakdown = Array.isArray(breakdown) && breakdown.length > 0;

  const totalCommission = order?.finance_allocation?.merchant_commission_idr ?? (
    hasCustomBreakdown
      ? breakdown.reduce((sum, it) => sum + (it.amount_idr || 0), 0)
      : 11000
  );

  const merchantNetEntitlement =
    order?.finance_allocation?.merchant_net_entitlement_idr ??
    Math.max(0, merchantOrderTotal - totalCommission);

  // Formatted real distance calculated between origin (merchant) and destination (customer)
  const distanceKmFormatted = useMemo(() => {
    const rawKm = order?.shipping_snapshot?.distance_km;
    if (typeof rawKm === "number" && rawKm > 0) {
      return `~${Math.round(rawKm * 10) / 10} km`;
    }

    // Geodesic calculation from coordinates if rawKm is 0 or missing
    const origLat =
      order?.origin_snapshot?.latitude ??
      (order?.origin_snapshot as any)?.lat;
    const origLng =
      order?.origin_snapshot?.longitude ??
      (order?.origin_snapshot as any)?.lng;
    const destLat =
      order?.address_snapshot?.latitude ??
      (order?.address_snapshot as any)?.lat ??
      (order?.checkout_group?.address_snapshot as any)?.latitude ??
      (order?.checkout_group?.address_snapshot as any)?.lat;
    const destLng =
      order?.address_snapshot?.longitude ??
      (order?.address_snapshot as any)?.lng ??
      (order?.checkout_group?.address_snapshot as any)?.longitude ??
      (order?.checkout_group?.address_snapshot as any)?.lng;

    if (
      typeof origLat === "number" &&
      typeof origLng === "number" &&
      typeof destLat === "number" &&
      typeof destLng === "number" &&
      (origLat !== 0 || origLng !== 0) &&
      (destLat !== 0 || destLng !== 0)
    ) {
      const calculated = calculateHaversineDistance(origLat, origLng, destLat, destLng);
      if (calculated > 0) {
        return `~${Math.round(calculated * 10) / 10} km`;
      }
    }

    const fallbackKm = order?.delivery?.distance_km || (order?.delivery as any)?.distanceKm;
    if (typeof fallbackKm === "number" && fallbackKm > 0) {
      return `~${Math.round(fallbackKm * 10) / 10} km`;
    }

    if (typeof rawKm === "number" && rawKm > 0) {
      return `~${Math.round(rawKm * 10) / 10} km`;
    }

    return "~1.1 km";
  }, [order]);

  // Synthesized authoritative chronological timeline
  const timelineEvents = useMemo(() => {
    if (!order) return [];

    interface TimelineItem {
      id: string;
      title: string;
      description: string;
      timestamp?: string | null;
      actor?: string;
      isActive?: boolean;
    }

    const events: TimelineItem[] = [];

    // 1. Pesanan Dibuat
    events.push({
      id: "created",
      title: "Pesanan Dibuat (Checkout Pelanggan)",
      description: "Pelanggan berhasil membuat transaksi pesanan suku cadang di platform.",
      timestamp: order.created_at,
      actor: "CUSTOMER",
    });

    // 2. Pembayaran Lunas
    const isPaid =
      order.payment_status_projection === "PAID" ||
      order.finance_payment?.status === "PAID" ||
      (order.status !== "CREATED" && order.status !== "PAYMENT_PENDING");

    if (isPaid) {
      events.push({
        id: "payment_verified",
        title: "Pembayaran Lunas (Verified Finance 06)",
        description: "Pembayaran sah terverifikasi via QRIS/VA dan dana diamankan di platform.",
        timestamp: order.finance_payment?.paid_at || order.confirmed_at || order.created_at,
        actor: "FINANCE_06",
      });
    }

    // 3. Masuk ke Merchant
    const isConfirmedOrLater = ["CONFIRMED", "PROCESSING", "PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
    if (isConfirmedOrLater) {
      events.push({
        id: "confirmed",
        title: "Pesanan Baru Masuk ke Toko",
        description: "Pesanan diteruskan ke merchant untuk disiapkan dan dikemas.",
        timestamp: order.confirmed_at || order.created_at,
        actor: "SYSTEM",
      });
    }

    // 4. Diproses oleh Toko
    const isProcessingOrLater = ["PROCESSING", "PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
    if (isProcessingOrLater) {
      events.push({
        id: "processing",
        title: "Pesanan Sedang Diproses Toko",
        description: "Toko sedang menyiapkan barang dan melakukan pemeriksaan stok fisik.",
        timestamp: order.confirmed_at || order.created_at,
        actor: "MERCHANT",
      });
    }

    // 5. Selesai Dikemas
    const isPackedOrLater = ["PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
    if (isPackedOrLater) {
      events.push({
        id: "packed",
        title: "Selesai Dikemas (Siap Kirim)",
        description: "Paket telah dikemas rapi dan siap diserahkan ke kurir pengantar.",
        timestamp: order.delivery?.picked_up_at || order.updated_at,
        actor: "MERCHANT",
      });
    }

    // 6. Dalam Pengiriman
    const isDeliveringOrLater = ["DELIVERING", "DELIVERED", "COMPLETED"].includes(order.status);
    if (isDeliveringOrLater) {
      events.push({
        id: "delivering",
        title: "Dalam Pengiriman Kurir",
        description: `Kurir sedang mengantarkan paket menuju alamat penerima${order.delivery?.booking_reference ? ` (Resi: ${order.delivery.booking_reference})` : ""}.`,
        timestamp: order.delivery?.picked_up_at || order.updated_at,
        actor: "COURIER",
      });
    }

    // 7. Telah Diterima (DELIVERED)
    const isDeliveredOrLater = ["DELIVERED", "COMPLETED"].includes(order.status);
    if (isDeliveredOrLater) {
      events.push({
        id: "delivered",
        title: "Paket Telah Diserahkan (DELIVERED)",
        description: `Paket telah diterima di alamat tujuan${order.delivery?.recipient_name ? ` oleh ${order.delivery.recipient_name}` : ""}.`,
        timestamp: order.delivered_at || order.delivery?.delivered_at || order.updated_at,
        actor: "COURIER",
      });
    }

    // 8. Selesai (COMPLETED)
    if (order.status === "COMPLETED") {
      events.push({
        id: "completed",
        title: "Pesanan Selesai (COMPLETED)",
        description: "Transaksi selesai sukses. Dana penjualan telah diteruskan ke hak saldo toko.",
        timestamp: order.completed_at || order.updated_at,
        actor: "SYSTEM",
      });
    }

    // 9. Dibatalkan (CANCELLED) or Expired Unpaid
    const isUnpaidAndExpired = countdown.isExpired && (order.status === "CREATED" || order.status === "PAYMENT_PENDING");
    if (order.status === "CANCELLED" || isUnpaidAndExpired) {
      events.push({
        id: "cancelled",
        title: "Pesanan Dibatalkan (CANCELLED)",
        description: `Pesanan dibatalkan. Alasan: ${order.cancel_reason_code || order.cancel_reason || "Belum menyelesaikan pembayaran"}.`,
        timestamp: order.cancelled_at || order.updated_at || new Date().toISOString(),
        actor: "SYSTEM",
      });
    }

    // Merge any distinct audit entries from order.histories that might add special details
    if (order.histories && order.histories.length > 0) {
      order.histories.forEach((h, hIdx) => {
        const isDuplicateAction = events.some(
          (e) => e.title.toLowerCase().includes(h.action?.toLowerCase() || "")
        );
        if (!isDuplicateAction && h.reason_note) {
          events.push({
            id: `hist_${h.id || hIdx}`,
            title: `Audit: ${h.action || h.new_status}`,
            description: h.reason_note,
            timestamp: h.occurred_at || (h as any).created_at,
            actor: h.actor_role || "SYSTEM",
          });
        }
      });
    }

    // Mark the last event as active
    if (events.length > 0) {
      events[events.length - 1].isActive = true;
    }

    return events;
  }, [order]);

  // Step-by-step Sequential Flow Animation for Admin Timeline
  const [animatedTimelineIndex, setAnimatedTimelineIndex] = useState<number>(0);

  useEffect(() => {
    if (!timelineEvents || timelineEvents.length === 0) {
      setAnimatedTimelineIndex(0);
      return;
    }

    const target = timelineEvents.length - 1;
    if (target <= 0) {
      setAnimatedTimelineIndex(0);
      return;
    }

    setAnimatedTimelineIndex(0);
    let current = 0;
    let interval: NodeJS.Timeout | null = null;

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        current += 1;
        setAnimatedTimelineIndex(current);
        if (current >= target) {
          if (interval) clearInterval(interval);
        }
      }, 550);
    }, 400);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [order?.id, timelineEvents?.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-white/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Package size={22} weight="duotone" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-indigo-600 uppercase tracking-wide">
                  Detail Product Order 
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {order?.order_number || orderId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan Operasional Platform — Sumber Data Nyata Database 05A &amp; Finance 06
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrderDetail}
              disabled={loading}
              title="Perbarui Data Pesanan"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowClockwise size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && !order && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <ArrowClockwise size={32} className="animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Mengambil data pesanan dan verifikasi Finance...</p>
            </div>
          )}

          {error && !order && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WarningCircle size={20} className="text-rose-600" />
                <span>{error}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={fetchOrderDetail}>
                Coba Lagi
              </Button>
            </div>
          )}

          {order && (
            <>
              {/* TOP TRANSACTION IDENTITY BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold text-white tracking-tight">
                      {order.order_number}
                    </span>
                    <span className="text-slate-400 text-xs">|</span>
                    <span className="text-xs text-indigo-200 flex items-center gap-1">
                      <Storefront size={14} />
                      {order.merchant_display_snapshot?.name || "Toko Merchant"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300 font-mono">
                    <span>Order ULID: {order.id}</span>
                    <span>CheckoutGroup: {order.checkout_group_id}</span>
                    <span>Merchant Org: {order.merchant_org_id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-right mr-2 hidden sm:block">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Status Transaksi</p>
                    <p className="text-xs text-slate-200">
                      {new Date(order.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {renderOrderStatusBadge(order.status)}
                  {renderPaymentStatusBadge(order.payment_status_projection || order.finance_payment?.status)}
                </div>
              </div>

              {/* 2-COLUMN BALANCED DESKTOP LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ======================================================== */}
                {/* LEFT COLUMN: PRODUK, CUSTOMER, PENGIRIMAN, RINCIAN     */}
                {/* ======================================================== */}
                <div className="space-y-5">
                  
                  {/* 1. DAFTAR PRODUK */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <Package size={16} className="text-indigo-600" />
                        <span>Daftar Produk ({order.items?.length || 0} Item)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Subtotal: Rp {productSubtotal.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                      {order.items?.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.product_image_ref ? (
                              <img
                                src={item.product_image_ref}
                                alt={item.product_snapshot?.name || item.name || "Produk"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">
                              {item.product_snapshot?.name || item.name || "Suku Cadang"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                              {item.variant_snapshot?.name && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                  Varian: {item.variant_snapshot.name}
                                </span>
                              )}
                              {item.variant_snapshot?.sku && (
                                <span>SKU: {item.variant_snapshot.sku}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-xs">
                              <span className="text-slate-600">
                                {item.quantity} × Rp {(item.unit_price_idr || 0).toLocaleString("id-ID")}
                              </span>
                              <span className="font-mono font-bold text-slate-900">
                                Rp {(item.line_subtotal_idr || item.quantity * item.unit_price_idr || 0).toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. CUSTOMER & SNAPSHOT ALAMAT PENGIRIMAN LENGKAP */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <MapPin size={16} className="text-indigo-600" />
                        <span>Customer &amp; Snapshot Alamat Pengiriman</span>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {order.address_snapshot?.is_official_verified ? "Terverifikasi" : "Snapshot Order"}
                      </Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Recipient & Contact */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                          <User size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 text-sm">
                              {order.recipient_snapshot?.recipient_name || order.address_snapshot?.recipient_name || "Pelanggan"}
                            </p>
                            {order.address_snapshot?.label && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                                {order.address_snapshot.label}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px] font-mono mt-0.5 flex items-center gap-1.5">
                            <Phone size={13} className="text-slate-400" />
                            <span>{order.recipient_snapshot?.recipient_phone || order.address_snapshot?.recipient_phone || "-"}</span>
                          </p>
                          <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                            Customer ID: {order.customer_id}
                          </p>
                        </div>
                      </div>

                      {/* Full Address Breakdown */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                            Alamat Lengkap Tujuan:
                          </span>
                          <p className="text-slate-800 leading-relaxed font-semibold text-xs">
                            {order.address_snapshot?.address_line || order.address_snapshot?.street || "-"}
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1.5 border-t border-slate-200/60">
                          {order.address_snapshot?.subdistrict && (
                            <span>Kel. {order.address_snapshot.subdistrict}</span>
                          )}
                          {order.address_snapshot?.district && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>Kec. {order.address_snapshot.district}</span>
                            </>
                          )}
                          {order.address_snapshot?.city && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>{order.address_snapshot.city}</span>
                            </>
                          )}
                          {order.address_snapshot?.postal_code && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono">Kodepos {order.address_snapshot.postal_code}</span>
                            </>
                          )}
                        </div>

                        {(order.recipient_snapshot?.notes || order.address_snapshot?.notes || order.notes) && (
                          <div className="mt-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                            <span className="font-bold">Patokan / Catatan Pengiriman:</span> &ldquo;
                            {order.recipient_snapshot?.notes || order.address_snapshot?.notes || order.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. INFORMASI PENGIRIMAN (FULFILLMENT) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <Truck size={16} className="text-indigo-600" />
                        <span>Informasi Pengiriman</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          Jarak: {distanceKmFormatted}
                        </span>
                        <Badge variant={order.delivery?.status === "DELIVERED" ? "success" : order.delivery?.status === "IN_TRANSIT" ? "primary" : "neutral"} size="sm">
                          {order.delivery?.status || "NOT_STARTED"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                        <p className="text-slate-400 text-[10px] uppercase font-semibold">Metode Kurir</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          Kurir Toko Pribadi (Armada Sendiri)
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {order.shipping_snapshot?.distance_method === "FREE_SHIPPING"
                            ? "Bebas Ongkir Toko (Radius Wilayah)"
                            : `Kalkulasi Jarak: ${order.shipping_snapshot?.distance_method || "Haversine Geodesik"}`}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                        <p className="text-slate-400 text-[10px] uppercase font-semibold">No. Resi / Booking Ref</p>
                        <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">
                          {order.delivery?.booking_reference || (order.delivery?.status === "NOT_STARTED" ? "Belum Dikirim" : "Menunggu No. Resi")}
                        </p>
                        {order.delivery?.tracking_url && (
                          <a
                            href={order.delivery.tracking_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-600 hover:underline mt-0.5 block truncate"
                          >
                            Lacak Kurir ↗
                          </a>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                        <p className="text-slate-400 text-[10px] uppercase font-semibold">Waktu Dispatched</p>
                        <p className="text-slate-800 mt-0.5 font-medium text-[11px]">
                          {order.delivery?.picked_up_at
                            ? new Date(order.delivery.picked_up_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Belum dipickup"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                        <p className="text-slate-400 text-[10px] uppercase font-semibold">Waktu Diterima</p>
                        <p className="text-slate-800 mt-0.5 font-medium text-[11px]">
                          {order.delivered_at || order.delivery?.delivered_at
                            ? new Date(order.delivered_at || order.delivery!.delivered_at!).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Belum terkirim"}
                        </p>
                      </div>
                    </div>

                    {order.delivery?.proof_reference && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-600" />
                          <span>Bukti Penerimaan (POD): <strong>{order.delivery.proof_reference}</strong></span>
                        </div>
                        {order.delivery.recipient_name && (
                          <span className="text-[11px] text-emerald-800">
                            Penerima: {order.delivery.recipient_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. RINCIAN NILAI TRANSAKSI & KOMISI PLATFORM (KETENTUAN PLATFORM) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <Receipt size={16} className="text-indigo-600" />
                        <span>Rincian Pembayaran &amp; Potongan Platform</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Ketentuan Platform
                      </span>
                    </div>

                    {/* A. Tagihan Pelanggan */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        1. Tagihan yang Dibayar Pelanggan
                      </span>
                      <div className="flex justify-between">
                        <span>Subtotal Nilai Barang ({order.items?.length || 0} item):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          Rp {productSubtotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ongkos Kirim Merchant:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          Rp {shippingCustomer.toLocaleString("id-ID")}
                        </span>
                      </div>
                      {appFeeAllocated > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Biaya Layanan Aplikasi Pelanggan:</span>
                          <span className="font-mono">Rp {appFeeAllocated.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      {customerTax > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Pajak Transaksi:</span>
                          <span className="font-mono">Rp {customerTax.toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      {discountAllocated > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Diskon Terdistribusi ({order.discount_bearer || "MERCHANT"}):</span>
                          <span className="font-mono">- Rp {discountAllocated.toLocaleString("id-ID")}</span>
                        </div>
                      )}

                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                        <span>Total Tagihan Pelanggan:</span>
                        <span className="font-mono text-indigo-700">
                          Rp {customerTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* B. Rincian Potongan Platform & Hak Bersih Toko */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        2. Rincian Potongan Platform &amp; Hak Bersih Toko
                      </span>
                      
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Total Tagihan Pesanan Toko (Barang + Ongkir):</span>
                          <span className="font-mono font-semibold text-slate-900">
                            Rp {merchantOrderTotal.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {/* Potongan Platform Breakdown Box */}
                        <div className="space-y-1 py-2 px-3 rounded-xl bg-rose-50/70 border border-rose-100">
                          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                            Rincian Potongan Platform Toko:
                          </span>
                          
                          {hasCustomBreakdown ? (
                            breakdown.map((fee, idx) => (
                              <div key={idx} className="flex justify-between text-rose-600 font-medium text-[11px]">
                                <span>• Potongan {fee.name}:</span>
                                <span className="font-mono font-bold">
                                  - Rp {(fee.amount_idr || 0).toLocaleString("id-ID")}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex justify-between text-rose-600 font-medium text-[11px]">
                                <span>• Potongan Biaya Layanan Barang:</span>
                                <span className="font-mono font-bold">- Rp {(6000).toLocaleString("id-ID")}</span>
                              </div>
                              <div className="flex justify-between text-rose-600 font-medium text-[11px]">
                                <span>• Potongan Biaya Aplikasi Toko:</span>
                                <span className="font-mono font-bold">- Rp {(5000).toLocaleString("id-ID")}</span>
                              </div>
                            </>
                          )}

                          <div className="flex justify-between text-rose-700 font-bold pt-1.5 border-t border-rose-200/60 text-xs">
                            <span>Total Potongan Biaya Platform:</span>
                            <span className="font-mono font-bold">
                              - Rp {totalCommission.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 italic">
                          * Sesuai ketentuan tarif layanan transaksi platform Servio (Biaya Layanan Barang + Biaya Aplikasi).
                        </p>
                      </div>

                      {/* Net Payout Box */}
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                        <div>
                          <span className="font-bold block text-emerald-900">
                            Hak Bersih Masuk Saldo S-Pay Toko:
                          </span>
                          <span className="text-[10px] text-emerald-700">
                            {order.status === "COMPLETED" ? "Sudah dicairkan ke saldo merchant" : "Diteruskan setelah pesanan selesai"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-800">
                            Rp {merchantNetEntitlement.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ======================================================== */}
                {/* RIGHT COLUMN: STATUS PEMBAYARAN, TIMELINE, REFUND, SETTLEMENT */}
                {/* ======================================================== */}
                <div className="space-y-5">

                  {/* 1. PAYMENT & ORDER STATUS */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <CreditCard size={16} className="text-indigo-600" />
                        <span>Status Pembayaran &amp; Expiry Finance 06</span>
                      </div>
                      {renderPaymentStatusBadge(order.payment_status_projection || order.finance_payment?.status)}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-semibold">Metode Pembayaran</span>
                          <span className="font-bold text-slate-800 mt-0.5 block">
                            {order.finance_payment?.method || "QRIS / VA Platform"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                          <span className="text-slate-400 text-[10px] block uppercase font-semibold">Payment Intent ID</span>
                          <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                            {order.checkout_group?.finance_payment_id || order.finance_payment?.payment_id || "-"}
                          </span>
                        </div>
                      </div>

                      {/* PAYMENT PENDING COUNTDOWN (6-Hour Expiry Window) */}
                      {(order.payment_status_projection === "PENDING" || order.status === "CREATED" || order.status === "PAYMENT_PENDING") && (
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          countdown.isExpired
                            ? "bg-slate-100 border-slate-300 text-slate-700"
                            : countdown.urgent
                            ? "bg-rose-50 border-rose-300 text-rose-900"
                            : "bg-amber-50 border-amber-300 text-amber-900"
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <Clock size={20} className={countdown.urgent ? "text-rose-600 animate-pulse" : "text-amber-600"} />
                            <div>
                              <p className="text-[10px] uppercase font-bold tracking-wide">
                                Batas Waktu Pembayaran (6 Jam)
                              </p>
                              <p className="text-sm font-mono font-bold mt-0.5">
                                {countdown.text}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-[10px] font-mono text-slate-500">
                            Expires at:
                            <p className="font-bold text-slate-700">
                              {order.checkout_group?.finance_expires_at
                                ? new Date(order.checkout_group.finance_expires_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                                : "-"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* PAID VERIFICATION */}
                      {(order.payment_status_projection === "PAID" || order.status === "CONFIRMED" || order.finance_payment?.status === "PAID") && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                          <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold">Pembayaran Terverifikasi Sah di Finance 06</p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              Dana telah diamankan dalam Sistem Pembayaran Platform dan pesanan telah diteruskan ke Merchant.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* EXPIRED NOTICE */}
                      {order.payment_status_projection === "EXPIRED" && (
                        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs flex items-center gap-3">
                          <XCircle size={22} weight="fill" className="text-slate-500 shrink-0" />
                          <div>
                            <p className="font-bold">Tagihan Pembayaran Telah Kedaluwarsa</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Pelanggan tidak menyelesaikan pembayaran dalam batas 6 jam operasional.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. TIMELINE PESANAN (CENTRALIZED ANIMATED RAIL & LIVE AUDIT) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider font-heading">
                        <Clock size={16} className="text-indigo-600" />
                        <span>Timeline &amp; Riwayat Aktivitas Pesanan</span>
                      </div>
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                        Live Audit ({timelineEvents.length} Event)
                      </span>
                    </div>

                    {/* Dedicated Timeline Track with Precision Centering & Animated Downward Flow */}
                    <div className="relative space-y-0 pr-1">
                      <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes adminPulseBeam {
                          0% { transform: translateY(-100%); opacity: 0; }
                          25% { opacity: 0.9; }
                          75% { opacity: 0.9; }
                          100% { transform: translateY(280%); opacity: 0; }
                        }
                        @keyframes adminGrowTrack {
                          from { transform: scaleY(0); }
                          to { transform: scaleY(1); }
                        }
                      `}} />

                      {timelineEvents.map((event, idx) => {
                        const isLast = idx === timelineEvents.length - 1;
                        const isCancelledEvent = event.id === "cancelled" || event.title?.toLowerCase().includes("batal");

                        const isStepReached = idx <= animatedTimelineIndex;
                        const isLineFlowed = idx < animatedTimelineIndex;
                        const isStepCurrentlyRunning =
                          idx === animatedTimelineIndex &&
                          animatedTimelineIndex === timelineEvents.length - 1;
                        const isPassingThrough =
                          idx === animatedTimelineIndex &&
                          animatedTimelineIndex < timelineEvents.length - 1;

                        return (
                          <div
                            key={event.id || idx}
                            className="relative flex items-start gap-3 group"
                          >
                            {/* COLUMN 1: Centered Timeline Rail (Width 24px) */}
                            <div className="relative flex flex-col items-center shrink-0 w-6 self-stretch">
                              {/* Connecting Line to next step */}
                              {!isLast && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-0 w-0.5 bg-slate-200 overflow-hidden">
                                  {/* Animated filling gradient track */}
                                  <div
                                    className={`w-full h-full origin-top transition-transform duration-500 ease-out ${
                                      isCancelledEvent || (idx === timelineEvents.length - 2 && (timelineEvents[idx + 1].id === "cancelled" || timelineEvents[idx + 1].title?.toLowerCase().includes("batal")))
                                        ? "bg-gradient-to-b from-indigo-600 via-amber-500 to-rose-600"
                                        : "bg-gradient-to-b from-indigo-600 to-indigo-800"
                                    }`}
                                    style={{
                                      transform: isLineFlowed ? "scaleY(1)" : "scaleY(0)",
                                    }}
                                  />
                                  {/* Traveling luminous pulse beam moving down towards the next milestone */}
                                  {isLineFlowed && (
                                    <div
                                      className="absolute inset-x-0 h-5 bg-indigo-300 blur-[0.5px]"
                                      style={{
                                        animation: 'adminPulseBeam 2s infinite ease-in-out',
                                        animationDelay: `${idx * 300}ms`,
                                      }}
                                    />
                                  )}
                                </div>
                              )}

                              {/* Dot Indicator: Strictly dead-center of the 24px rail */}
                              <div className="relative z-10 flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                                {isCancelledEvent ? (
                                  isStepReached ? (
                                    <div className="relative flex items-center justify-center transition-all duration-500 scale-105">
                                      <span className="absolute w-5 h-5 rounded-full bg-rose-500/30 animate-ping" />
                                      <span className="w-4 h-4 rounded-full bg-rose-600 ring-4 ring-rose-100 shadow-md z-20 flex items-center justify-center text-white">
                                        <X size={10} weight="bold" />
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="w-3 h-3 rounded-full bg-rose-200 ring-4 ring-white shadow-2xs z-20 transition-all duration-500" />
                                  )
                                ) : isStepCurrentlyRunning ? (
                                  <div className="relative flex items-center justify-center transition-all duration-500 scale-105">
                                    <span className="absolute w-5 h-5 rounded-full bg-indigo-500/30 animate-ping" />
                                    <span className="absolute w-4 h-4 rounded-full bg-indigo-400/25 animate-pulse" />
                                    <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shadow-md z-20 flex items-center justify-center">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    </span>
                                  </div>
                                ) : isPassingThrough ? (
                                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shadow-xs z-20 transition-all duration-500" />
                                ) : isStepReached ? (
                                  <span className="w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white shadow-xs z-20 transition-all duration-500" />
                                ) : (
                                  <span className="w-3 h-3 rounded-full bg-slate-200 ring-4 ring-white shadow-2xs z-20 transition-all duration-500" />
                                )}
                              </div>
                            </div>

                            {/* COLUMN 2: Event Details */}
                            <div
                              className={`flex-1 pb-4 pt-0.5 min-w-0 space-y-0.5 transition-all duration-500 ${
                                isStepReached ? "opacity-100 translate-y-0" : "opacity-35 translate-y-1"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <p
                                  className={`text-xs font-bold leading-tight transition-colors duration-300 ${
                                    isCancelledEvent && isStepReached
                                      ? "text-rose-700"
                                      : isStepCurrentlyRunning
                                      ? "text-indigo-700"
                                      : isStepReached
                                      ? "text-slate-900"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {event.title}
                                </p>
                                {isCancelledEvent && isStepReached ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 flex items-center gap-1 animate-fade-in">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                    <span>Dibatalkan</span>
                                  </span>
                                ) : isStepCurrentlyRunning ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 flex items-center gap-1 animate-fade-in">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                    <span>Sedang Berjalan</span>
                                  </span>
                                ) : null}
                              </div>
                              <p
                                className={`text-[11px] leading-snug ${
                                  isCancelledEvent && isStepReached
                                    ? "text-rose-800 bg-rose-50/60 p-2 rounded-xl border border-rose-100"
                                    : "text-slate-600"
                                }`}
                              >
                                {event.description}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                {event.timestamp && (
                                  <span>
                                    {new Date(event.timestamp).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                                {event.actor && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                      Aktor: {event.actor}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. CANCELLATION (IF APPLICABLE) */}
                  {(order.status === "CANCELLED" || (order.cancellationRequests && order.cancellationRequests.length > 0)) && (
                    <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs bg-rose-50/20">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-3 mb-3">
                        <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider font-heading">
                          <XCircle size={16} className="text-rose-600" />
                          <span>Informasi Pembatalan Pesanan</span>
                        </div>
                        <Badge variant="danger" size="sm">
                          {order.cancellationRequests?.[0]?.status || order.cancel_reason_code || "Dibatalkan"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <p className="text-slate-700">
                          <strong>Kode Alasan:</strong> {order.cancel_reason_code || order.cancellationRequests?.[0]?.reason_code || "PEMBATALAN_TRANSAKSI"}
                        </p>
                        {order.cancelled_at && (
                          <p className="text-slate-500 text-[11px]">
                            Waktu Batal: {new Date(order.cancelled_at).toLocaleString("id-ID")}
                          </p>
                        )}
                        {order.cancellationRequests?.[0]?.reason_note && (
                          <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                            <strong>Catatan:</strong> {order.cancellationRequests[0].reason_note}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. REFUND FINANCE 06 (IF CANCELLED POST-PAID) */}
                  {order.finance_refund && (
                    <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-xs bg-purple-50/20">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-3 mb-3">
                        <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider font-heading">
                          <ShieldCheck size={16} className="text-purple-600" />
                          <span>Status Pengembalian Dana (Refund Finance 06)</span>
                        </div>
                        <Badge variant={order.finance_refund.status === "SUCCEEDED" ? "success" : "warning"} size="sm">
                          {order.finance_refund.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Nominal Refund:</span>
                          <span className="font-mono text-purple-700">
                            Rp {(order.finance_refund.refund_amount_idr || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Tujuan Pengembalian: <strong>Saldo Customer S-Pay</strong>
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Refund ID: {order.finance_refund.refund_id || "-"}
                        </p>
                        {order.finance_refund.processed_at && (
                          <p className="text-[10px] text-slate-500">
                            Diproses pada: {new Date(order.finance_refund.processed_at).toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. SETTLEMENT MERCHANT (IF COMPLETED) */}
                  {order.status === "COMPLETED" && (
                    <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs bg-emerald-50/20">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
                        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider font-heading">
                          <ShieldCheck size={16} className="text-emerald-600" />
                          <span>Pelepasan Dana Merchant (Settlement 120 Jam)</span>
                        </div>
                        <Badge variant={order.finance_settlement?.status === "RELEASED" ? "success" : "warning"} size="sm">
                          {order.finance_settlement?.status || "HELD"}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Hak Bersih Merchant:</span>
                          <span className="font-mono text-emerald-700">
                            Rp {(order.finance_settlement?.merchant_entitlement_idr ?? order.finance_allocation?.merchant_net_entitlement_idr ?? 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] space-y-1">
                          <p className="text-slate-700">
                            <strong>Masa Tahan Perlindungan Konsumen:</strong> 120 Jam (5 Hari) sejak pesanan selesai.
                          </p>
                          <p className="text-slate-500 text-[10px]">
                            Jadwal Pelepasan Eligible: {order.finance_settlement?.eligible_release_at
                              ? new Date(order.finance_settlement.eligible_release_at).toLocaleString("id-ID")
                              : "120 Jam setelah Order Completed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
            <span>Admin Operations Supervision</span>
            <span>•</span>
            <span>Read-Only Audit</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
