"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  WarningCircle,
  ShieldCheck,
  XCircle,
  Clock,
  ClockCounterClockwise,
  CreditCard,
  MapPin,
  Phone,
  ChatDots,
  Info,
  X,
  ArrowSquareOut,
  Eye,
  Star,
} from "@phosphor-icons/react";
import { formatDateTimeIndo } from "@/features/order-barang/helpers";
import { Toast } from "@/components/feedback/Toast";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
import { ProductReturnModal } from "@/components/features/afterSales/ProductReturnModal";
import { WarrantyClaimModal } from "@/components/features/afterSales/WarrantyClaimModal";
import {
  OrderReviewModal,
  OrderReviewModalTarget,
} from "@/components/features/afterSales/OrderReviewModal";
import { CustomerWarrantyEntitlement } from "@/types/afterSales";
import { afterSalesApi, ReviewSubmission } from "@/lib/afterSalesApi";

import { useOrderBarang, mapBackendOrderToMock } from "@/features/order-barang/hooks/useOrderBarang";
import { orderBarangStore } from "@/features/order-barang/orderBarangStore";
import { orderBarangApi } from "@/lib/orderBarangApi";
import {
  CancelUnpaidCheckoutModal,
  CancelConfirmedModal,
  RequestCancellationModal,
  ConfirmDeliveredModal,
  ReceiptModal,
  TrackingModal,
} from "@/features/order-barang/components/CustomerOrderModals";

export default function ProductOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "";

  const {
    customerOrders,
    cancelUnpaidCheckoutGroup,
    cancelConfirmedMerchantOrder,
    requestCancellation,
    customerConfirmDelivered,
    currentTime,
  } = useOrderBarang();

  const storeOrder = useMemo(() => {
    return (
      customerOrders.find((o) => o.id === orderId || o.orderNumber === orderId) ||
      orderBarangStore.getOrderById(orderId) ||
      null
    );
  }, [customerOrders, orderId]);

  const [realBackendOrder, setRealBackendOrder] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Modals state
  const [isCancelUnpaidModalOpen, setIsCancelUnpaidModalOpen] = useState(false);
  const [isCancelConfirmedModalOpen, setIsCancelConfirmedModalOpen] = useState(false);
  const [isRequestCancelModalOpen, setIsRequestCancelModalOpen] = useState(false);
  const [isConfirmReceivedModalOpen, setIsConfirmReceivedModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // After-Sales Phase 07 Integration
  const { cases, warranties } = useAfterSales();
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [previewPodPhoto, setPreviewPodPhoto] = useState<string | null>(null);

  // Fetch real order from Backend 05A
  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const res = await orderBarangApi.customer.getOrder(orderId);
      if (res.data) {
        setRealBackendOrder(res.data);
      }
    } catch (err) {
      console.warn("Could not load backend order from orderBarangApi:", err);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Unified Order Data combining Backend 05A and Store
  const orderData = useMemo(() => {
    const raw = realBackendOrder;
    const store = storeOrder;

    // Timestamps
    const createdAt = raw?.created_at || store?.createdAt || new Date().toISOString();
    const createdAtMs = new Date(createdAt).getTime();
    const rawStatus = (raw?.status || store?.status || "CONFIRMED").toUpperCase();
    const isUnpaidOrder = rawStatus === "CREATED" || rawStatus === "PAYMENT_PENDING";
    const isExpiredOrder =
      isUnpaidOrder &&
      (Date.now() >= createdAtMs + 6 * 3600 * 1000 ||
        store?.paymentStatus === "EXPIRED" ||
        raw?.payment_status_projection === "EXPIRED");

    // Status canonical
    const status = isExpiredOrder ? "CANCELLED" : rawStatus;

    // Items list
    const items = (raw?.items || store?.items || []).map((it: any) => {
      const rawImg =
        it.product_image_ref ||
        it.product_snapshot?.primary_image_url ||
        it.product_snapshot?.image_url ||
        (it as any).image_url ||
        (it.variant_snapshot as any)?.image_url ||
        it.thumbnailUrl ||
        null;
      let cleanImg = rawImg && rawImg !== "/brand/logo.png" ? rawImg : null;
      if (cleanImg && cleanImg.startsWith("/api/v1/product-media/")) {
        cleanImg = `${cleanImg}${cleanImg.includes("?") ? "&" : "?"}v=2`;
      }

      const rawVar =
        it.variant_snapshot?.name ||
        it.variant_name ||
        it.variantName ||
        it.product_snapshot?.variant_name ||
        null;

      return {
        id: it.id || it.orderItemId || it.variant_id,
        title: it.product_snapshot?.name || it.product_name || it.title || it.name || "Suku Cadang",
        variantName: rawVar,
        sku: it.variant_snapshot?.sku || it.sku || null,
        quantity: it.quantity || 1,
        unitPrice: it.unit_price_idr || it.unitPrice || 0,
        subtotal: it.line_subtotal_idr || it.subtotal || ((it.unit_price_idr || it.unitPrice || 0) * (it.quantity || 1)),
        imageUrl: cleanImg,
      };
    });

    // Recipient & Address Snapshot
    const recipient: any = raw?.recipient_snapshot || raw?.recipient || {};
    const addr: any = raw?.address_snapshot || raw?.address || {};
    const storeAddr: any = store?.shippingAddressSnapshot || {};

    const recipientName = recipient.recipient_name || addr.recipient_name || storeAddr.recipientName || "Pelanggan";
    const recipientPhone = recipient.recipient_phone || addr.recipient_phone || storeAddr.phone || "-";
    const addressLabel = addr.label || storeAddr.label || "Alamat Kirim";
    const addressLine = addr.address_line || addr.street || storeAddr.street || storeAddr.fullAddress || "-";
    const subdistrict = addr.subdistrict || storeAddr.subdistrict || null;
    const district = addr.district || storeAddr.district || null;
    const city = addr.city || storeAddr.city || null;
    const postalCode = addr.postal_code || storeAddr.postalCode || null;
    const addressNotes = recipient.notes || addr.notes || raw?.notes || storeAddr.notes || null;

    // Delivery & Tracking
    const del = raw?.delivery || store?.delivery || {};
    const shipSnap = raw?.shipping_snapshot || {};
    const distanceKm = typeof shipSnap.distance_km === "number"
      ? Math.round(shipSnap.distance_km * 10) / 10
      : (del.distanceKm || 1.7);
    const rawMethod = del.courier_method || del.courierMethod || shipSnap.distance_method;
    const isGosend = rawMethod === "GOSEND" || del.provider === "GOSEND";
    const courierMethod = isGosend ? "GOSEND" : "KURIR_TOKO";
    const courierName = isGosend ? "GoSend" : "Kurir Toko";
    const courierStaffName = del.courier_name || del.courierName || null;
    const courierPhone = del.courier_phone || del.courierPhone || null;
    const trackingNumber = del.booking_reference || del.trackingNumber || del.trackingReference || null;
    const trackingUrl = del.tracking_url || del.trackingUrl || null;
    const deliveryNotes = del.notes || del.deliveryNotes || null;

    // Pricing
    const subtotal = raw?.product_subtotal_idr ?? store?.pricing?.itemsSubtotal ?? items.reduce((s: number, i: any) => s + i.subtotal, 0);
    const shipping = raw?.shipping_customer_idr ?? store?.pricing?.shippingFee ?? (shipSnap.shipping_fee_idr || 10000);
    const fee = raw?.app_fee_allocated_idr ?? store?.customerServiceFee ?? store?.pricing?.platformFee ?? 2500;
    const total = raw?.customer_total_idr ?? store?.totalAmount ?? store?.pricing?.merchantOrderTotal ?? (subtotal + shipping + fee);

    // Merchant Info
    const merchantName = raw?.merchant_display_snapshot?.name || store?.merchantName || "Toko Merchant Suku Cadang";

    // Timestamps
    const isConfirmedFromBackend = !!raw?.confirmed_at || raw?.payment_status_projection === "PAID" || store?.paymentStatus === "PAID";
    const confirmedAt = raw?.confirmed_at || (isConfirmedFromBackend ? (store?.paidAt || createdAt) : null);
    const deliveredAt = raw?.delivered_at || del.delivered_at || store?.delivery?.deliveredAt || null;
    const completedAt = raw?.completed_at || null;
    const cancelledAt = raw?.cancelled_at || (isExpiredOrder ? (createdAt || new Date().toISOString()) : null);

    // POD & Proof of Delivery (4 Items Saved & Synced)
    let parsedProofType: string | undefined = del.proofType;
    let parsedDeliveredNotes: string | undefined = del.deliveredNotes;
    let parsedProofPhotoUrl: string | undefined = del.proofPhotoUrl;

    const rawProof = del.proof_reference;
    if (rawProof) {
      if (rawProof.startsWith("{") && rawProof.endsWith("}")) {
        try {
          const json = JSON.parse(rawProof);
          parsedProofType = json.proof_type || json.proofType || parsedProofType;
          parsedDeliveredNotes = json.notes || json.deliveredNotes || parsedDeliveredNotes;
          parsedProofPhotoUrl = json.photo_url || json.proofPhotoUrl || json.image_url || parsedProofPhotoUrl;
        } catch {}
      } else if (rawProof.includes(": ")) {
        const parts = rawProof.split(": ");
        parsedProofType = parts[0];
        parsedDeliveredNotes = parts.slice(1).join(": ");
      } else if (rawProof.startsWith("data:image") || rawProof.startsWith("http") || rawProof.startsWith("/")) {
        parsedProofPhotoUrl = rawProof;
      } else {
        parsedDeliveredNotes = rawProof;
      }
    }

    const pod = (del.proof_reference || del.recipient_name || del.recipientReceivedBy || status === "DELIVERED" || status === "COMPLETED") ? {
      recipient: del.recipient_name || del.recipientReceivedBy || del.deliveredToName || recipientName,
      deliveredAt: deliveredAt,
      proofType: parsedProofType || "Foto Serah Terima Paket",
      notes: parsedDeliveredNotes || del.deliveredNotes || "Paket diterima dalam kondisi baik",
      photoUrl: parsedProofPhotoUrl || del.proofPhotoUrl || null,
      reference: parsedDeliveredNotes || del.proof_reference || "Diserahkan langsung kepada penerima",
    } : null;

    const cancellationReason = isExpiredOrder
      ? "Belum menyelesaikan pembayaran"
      : (raw?.cancel_reason_code || store?.cancellationReason || store?.cancellationDetails?.reason || null);
    const cancellationActor = isExpiredOrder
      ? "Sistem"
      : (store?.cancellationDetails?.actor || (raw?.cancel_reason_code ? "Sistem / Merchant" : "Pelanggan"));
    const cancellationRequest = raw?.cancellationRequests?.[0] || store?.cancellationRequest || null;

    // Refund Finance 06 (Only if customer actually paid prior to cancellation)
    const isPaid = isConfirmedFromBackend;
    const hasRefund = status === "CANCELLED" && isPaid;
    const refundData = hasRefund ? {
      amount: total,
      status: "SUCCEEDED",
      destination: "Saldo Customer S-Pay",
      refundId: `REF-${raw?.order_number || store?.orderNumber || orderId}`,
      processedAt: cancelledAt || new Date().toISOString(),
    } : null;

    // Timeline Construction
    const isCancelled = status === "CANCELLED";
    let timeline: any[] = Array.isArray(raw?.timeline) && raw.timeline.length > 0
      ? [...raw.timeline]
      : Array.isArray(store?.timeline) && store.timeline.length > 0
      ? [...store.timeline]
      : [];

    if (timeline.length === 0) {
      timeline = [
        {
          step: "CREATED",
          title: "Pesanan Dibuat",
          description: "Pesanan berhasil dibuat dalam sistem.",
          timestamp: createdAt,
          isCompleted: true,
        },
      ];

      if (isUnpaidOrder || isExpiredOrder || (isCancelled && !confirmedAt)) {
        timeline.push({
          step: "PAYMENT_PENDING",
          title: "Menunggu Pembayaran",
          description: "Batas waktu pembayaran 6 jam sejak pesanan dibuat.",
          timestamp: createdAt,
          isCompleted: true,
        });
      }

      if (confirmedAt) {
        timeline.push({
          step: "CONFIRMED",
          title: "Pembayaran Lunas",
          description: "Pembayaran telah berhasil diverifikasi oleh sistem.",
          timestamp: confirmedAt,
          isCompleted: true,
        });
      }

      if (["PROCESSING", "PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(status)) {
        timeline.push({
          step: "PROCESSING",
          title: "Sedang Disiapkan Penjual",
          description: "Toko sedang menyiapkan barang dan suku cadang.",
          timestamp: createdAt,
          isCompleted: true,
        });
      }

      if (["PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(status)) {
        timeline.push({
          step: "PACKED",
          title: "Selesai Dikemas",
          description: "Pesanan telah dikemas rapi dan siap diserahkan ke kurir.",
          timestamp: createdAt,
          isCompleted: true,
        });
      }

      if (["DELIVERING", "DELIVERED", "COMPLETED"].includes(status)) {
        timeline.push({
          step: "DELIVERING",
          title: "Dalam Pengiriman",
          description: trackingNumber ? `Kurir mengantar paket (Resi: ${trackingNumber})` : "Kurir sedang mengantarkan paket ke alamat tujuan.",
          timestamp: createdAt,
          isCompleted: true,
        });
      }

      if (["DELIVERED", "COMPLETED"].includes(status) || deliveredAt) {
        timeline.push({
          step: "DELIVERED",
          title: "Tiba di Tujuan",
          description: `Barang telah diterima oleh ${recipientName}.`,
          timestamp: deliveredAt || createdAt,
          isCompleted: true,
        });
      }

      if (status === "COMPLETED" || completedAt) {
        timeline.push({
          step: "COMPLETED",
          title: "Pesanan Selesai",
          description: "Transaksi berhasil diselesaikan dengan baik.",
          timestamp: completedAt || createdAt,
          isCompleted: true,
        });
      }

      if (isCancelled) {
        const actor = cancellationActor || (isExpiredOrder ? "SISTEM" : "Sistem");
        const reason = cancellationReason || (isExpiredOrder ? "Belum menyelesaikan pembayaran" : "Pembatalan transaksi");
        const timestamp = cancelledAt || (isExpiredOrder ? new Date(createdAtMs + 6 * 3600 * 1000).toISOString() : new Date().toISOString());

        timeline.push({
          step: "CANCELLED",
          title: "Pesanan Dibatalkan",
          description: `Dibatalkan oleh ${actor === "MERCHANT" ? "Penjual" : actor === "CUSTOMER" ? "Pelanggan" : "Sistem"}. Alasan: ${reason}`,
          timestamp,
          isCompleted: true,
        });
      }
    } else {
      if (isCancelled && !timeline.some((t) => t.step === "CANCELLED" || t.title?.toLowerCase().includes("batal"))) {
        const actor = cancellationActor || (isExpiredOrder ? "SISTEM" : "Sistem");
        const reason = cancellationReason || (isExpiredOrder ? "Belum menyelesaikan pembayaran" : "Pembatalan transaksi");
        const timestamp = cancelledAt || (isExpiredOrder ? new Date(createdAtMs + 6 * 3600 * 1000).toISOString() : new Date().toISOString());

        timeline.push({
          step: "CANCELLED",
          title: "Pesanan Dibatalkan",
          description: `Dibatalkan oleh ${actor === "MERCHANT" ? "Penjual" : actor === "CUSTOMER" ? "Pelanggan" : "Sistem"}. Alasan: ${reason}`,
          timestamp,
          isCompleted: true,
        });
      }
    }

    return {
      id: raw?.id || store?.id || orderId,
      orderNumber: raw?.order_number || store?.orderNumber || orderId,
      checkoutGroupId: raw?.checkout_group_id || store?.checkoutGroupId || null,
      status,
      merchantName,
      merchantOrganizationId: raw?.merchant_organization_id || raw?.merchant_id || store?.merchantId || "merchant-01",
      items,
      recipientName,
      recipientPhone,
      addressLabel,
      addressLine,
      subdistrict,
      district,
      city,
      postalCode,
      addressNotes,
      distanceKm,
      courierMethod,
      courierName,
      courierStaffName,
      courierPhone,
      trackingNumber,
      trackingUrl,
      deliveryNotes,
      isGosend,
      pricing: { subtotal, shipping, fee, total },
      createdAt,
      confirmedAt,
      deliveredAt,
      completedAt,
      cancelledAt,
      pod,
      cancellationReason,
      cancellationActor,
      cancellationRequest,
      refundData,
      rawStoreOrder: store,
      timeline,
      isExpiredOrder,
    };
  }, [realBackendOrder, storeOrder, orderId]);

  // Live countdown for pending payments (6-Hour Expiry Window)
  const isUnpaid = orderData.status === "CREATED" || orderData.status === "PAYMENT_PENDING";
  const orderCreatedAtMs = new Date(orderData.createdAt).getTime();
  const expiresAtMs = orderCreatedAtMs + 6 * 3600 * 1000;
  const nowMs = currentTime?.getTime() || Date.now();
  const diffMs = Math.max(0, expiresAtMs - nowMs);
  const remainingSecs = Math.floor(diffMs / 1000);
  const countdownHours = Math.floor(remainingSecs / 3600);
  const countdownMinutes = Math.floor((remainingSecs % 3600) / 60);
  const countdownSeconds = remainingSecs % 60;
  const isExpired = diffMs <= 0;
  const countdownFormatted = isExpired
    ? "00:00:00 (Kedaluwarsa)"
    : `${String(countdownHours).padStart(2, "0")}:${String(countdownMinutes).padStart(2, "0")}:${String(countdownSeconds).padStart(2, "0")}`;

  // Copy tracking number
  const handleCopyResi = () => {
    if (!orderData.trackingNumber) return;
    navigator.clipboard?.writeText(orderData.trackingNumber);
    setToastType("success");
    setToastMessage("Nomor resi berhasil disalin!");
  };

  // Copy order number
  const handleCopyOrderNumber = () => {
    if (!orderData.orderNumber) return;
    navigator.clipboard?.writeText(orderData.orderNumber);
    setToastType("success");
    setToastMessage("Nomor pesanan berhasil disalin!");
  };

  // Associated Warranty from After-Sales Phase 07
  const associatedWarranty = useMemo<CustomerWarrantyEntitlement | null>(() => {
    if (!warranties || warranties.length === 0) return null;
    const found = warranties.find(
      (w) => w.orderId === orderId || w.orderId === orderData.id || w.orderNumber === orderData.orderNumber
    );
    return found || null;
  }, [warranties, orderId, orderData.id, orderData.orderNumber]);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [existingOrderReview, setExistingOrderReview] = useState<ReviewSubmission | null>(null);
  const [hasCheckedOrderReview, setHasCheckedOrderReview] = useState(false);

  useEffect(() => {
    if (!orderId || orderData.status !== "COMPLETED") {
      setHasCheckedOrderReview(false);
      return;
    }
    let cancelled = false;
    setHasCheckedOrderReview(false);
    afterSalesApi.customer
      .getMyReview(orderId)
      .then((res) => {
        if (!cancelled && res.success && res.data && res.data.id) {
          setExistingOrderReview(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHasCheckedOrderReview(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, orderData.status]);

  const goodsReviewTarget = useMemo<OrderReviewModalTarget | null>(() => {
    return {
      sourceKind: "GOODS",
      orderId: orderData.id || orderId,
      subOrderId: orderData.id || orderId,
      orderNumber: orderData.orderNumber || orderId,
      orderedAt: orderData.createdAt,
      completedAt: orderData.completedAt || orderData.deliveredAt,
      businessOrgId:
        (realBackendOrder as any)?.merchant_org_id ||
        (storeOrder as any)?.merchantId ||
        "merch-jaya-motor",
      businessName: orderData.merchantName || "Toko Official",
      items: (orderData.items || []).map((it: any) => ({
        orderItemId: it.id,
        targetId: it.productId || it.id,
        title: it.title,
        imageUrl: it.imageUrl,
        quantity: it.quantity,
        variantLabel: it.variant,
        price: it.unitPrice,
      })),
      existingSubmission: existingOrderReview,
      skipExistingReviewCheck: orderData.status !== "COMPLETED" || hasCheckedOrderReview,
    };
  }, [orderData, orderId, realBackendOrder, storeOrder, existingOrderReview, hasCheckedOrderReview]);

  // Active After-Sales Case (Claim or Return) for this Order
  const activeCase = useMemo(() => {
    if (!cases || cases.length === 0) return null;
    return cases.find(
      (c) => c.sourceOrderId === orderId || c.sourceOrderId === orderData.id || c.sourceOrderNumber === orderData.orderNumber
    );
  }, [cases, orderId, orderData.id, orderData.orderNumber]);

  // Status configuration badge
  const getStatusBadgeConfig = () => {
    switch (orderData.status) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return { label: "Menunggu Pembayaran", badgeClass: "bg-amber-50 text-amber-800 border-amber-300", dotClass: "bg-amber-500" };
      case "CONFIRMED":
        return { label: "Pembayaran Lunas", badgeClass: "bg-sky-50 text-[#0F4C81] border-sky-300", dotClass: "bg-[#0F4C81]" };
      case "PROCESSING":
        return { label: "Sedang Diproses", badgeClass: "bg-blue-50 text-blue-800 border-blue-300", dotClass: "bg-blue-500" };
      case "PACKED":
        return { label: "Selesai Dikemas", badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-300", dotClass: "bg-indigo-500" };
      case "DELIVERING":
        return { label: "Dalam Pengiriman", badgeClass: "bg-purple-50 text-purple-800 border-purple-300", dotClass: "bg-purple-500" };
      case "DELIVERED":
        return { label: "Tiba di Tujuan", badgeClass: "bg-teal-50 text-teal-800 border-teal-300", dotClass: "bg-teal-500" };
      case "COMPLETED":
        return { label: "Pesanan Selesai", badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300", dotClass: "bg-emerald-500" };
      case "CANCELLED":
        return { label: "Dibatalkan", badgeClass: "bg-rose-50 text-rose-800 border-rose-300", dotClass: "bg-rose-500" };
      default:
        return { label: orderData.status, badgeClass: "bg-slate-50 text-slate-700 border-slate-300", dotClass: "bg-slate-400" };
    }
  };

  const statusConfig = getStatusBadgeConfig();

  const isOrderCancelled = orderData.status === "CANCELLED";

  // Step-by-step Sequential Flow Animation for Horizontal Timeline based on orderData.timeline
  const [animatedStep, setAnimatedStep] = useState<number>(0);

  useEffect(() => {
    if (!orderData?.timeline?.length) return;
    const target = orderData.timeline.length - 1;
    if (target <= 0) {
      setAnimatedStep(0);
      return;
    }

    setAnimatedStep(0);
    let current = 0;
    const startTimer = setTimeout(() => {
      const stepInterval = setInterval(() => {
        current += 1;
        setAnimatedStep(current);
        if (current >= target) {
          clearInterval(stepInterval);
        }
      }, 500);

      return () => clearInterval(stepInterval);
    }, 350);

    return () => clearTimeout(startTimer);
  }, [orderData?.id, orderData?.timeline?.length]);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
              title="Kembali ke Daftar Pesanan"
            >
              <ArrowLeft size={18} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 pl-2 pr-1.5 py-0.5 rounded-md">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    #{orderData.orderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyOrderNumber}
                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                    title="Salin No. Pesanan"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                {orderData.checkoutGroupId && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Checkout #{orderData.checkoutGroupId}
                  </span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                  <Storefront size={14} className="text-[#0F4C81]" />
                  {orderData.merchantName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rincian Pesanan Produk &amp; Pelacakan Status Pengiriman
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
              <span>{statusConfig.label}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* 2. PALING ATAS: TIMELINE RIWAYAT AKTIVITAS HORIZONTAL MODERN */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-100 flex items-center justify-center shrink-0">
                <ClockCounterClockwise size={18} weight="bold" />
              </span>
              <div>
                <h2 className="text-xs uppercase font-bold text-slate-800 tracking-wider">
                  Riwayat Aktivitas Pesanan ({orderData.timeline.length})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Jejak kronologis perjalanan &amp; pelacakan status pesanan
                </p>
              </div>
            </div>
            <span className="text-[10px] text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full font-bold border border-sky-100 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Audit Tracking</span>
            </span>
          </div>

          {/* Connected Linear Horizontal Timeline Track */}
          <div className="overflow-x-auto pb-4 pt-4">
            <div
              className="relative px-4"
              style={{
                minWidth: `${Math.max(680, orderData.timeline.length * 150)}px`,
              }}
            >
              {/* Continuous Background Rail Line: center at 52px */}
              <div
                className="absolute top-[52px] h-1.5 bg-slate-100 rounded-full z-0 -translate-y-1/2"
                style={{
                  left: `${100 / (2 * Math.max(1, orderData.timeline.length))}%`,
                  right: `${100 / (2 * Math.max(1, orderData.timeline.length))}%`,
                }}
              />

              {/* Active Progress Fill Line: smoothly sweeps from left to right as animatedStep advances */}
              {animatedStep > 0 && orderData.timeline.length > 1 && (
                <div
                  className={`absolute top-[52px] h-1.5 rounded-full z-0 -translate-y-1/2 overflow-hidden shadow-xs ${
                    isOrderCancelled
                      ? "bg-gradient-to-r from-[#0F4C81] via-amber-500 to-rose-600"
                      : "bg-gradient-to-r from-[#0F4C81] via-sky-500 to-[#0F4C81]"
                  }`}
                  style={{
                    left: `${100 / (2 * orderData.timeline.length)}%`,
                    width: `calc((100% - ${100 / orderData.timeline.length}%) * (${animatedStep} / ${orderData.timeline.length - 1}))`,
                    transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
                </div>
              )}

              {/* Timeline Nodes Grid */}
              <div
                className="relative z-10 pt-8"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${orderData.timeline.length}, minmax(0, 1fr))`,
                }}
              >
                {orderData.timeline.map((event: any, idx: number) => {
                  const isCancelledEvent =
                    event.step === "CANCELLED" || event.title?.toLowerCase().includes("batal");

                  const isStepReached = idx <= animatedStep;
                  const isStepDone =
                    idx < animatedStep ||
                    (!isOrderCancelled && idx === orderData.timeline.length - 1 && orderData.status === "COMPLETED");
                  const isStepFinalActive =
                    idx === animatedStep &&
                    animatedStep === orderData.timeline.length - 1 &&
                    orderData.status !== "COMPLETED";
                  const isStepPassingThrough =
                    idx === animatedStep && animatedStep < orderData.timeline.length - 1;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center text-center px-1.5 group"
                    >
                      {/* Circle Node (40px x 40px) centered at 52px */}
                      <div className="relative mb-3 flex items-center justify-center">
                        {isCancelledEvent ? (
                          isStepReached ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute -inset-2.5 rounded-full bg-rose-200/70 animate-pulse pointer-events-none" />
                              <span className="absolute -inset-1 rounded-full bg-rose-400/40 animate-ping pointer-events-none" />
                              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-900/20 ring-4 ring-rose-100 ring-offset-2 ring-offset-white relative z-10 transition-all duration-500 scale-105">
                                <XCircle size={22} weight="bold" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white text-rose-300 font-bold text-sm flex items-center justify-center border-2 border-rose-200 ring-4 ring-white relative z-10 transition-all duration-500">
                              <XCircle size={20} />
                            </div>
                          )
                        ) : isStepDone ? (
                          <div className="w-10 h-10 rounded-full bg-[#0F4C81] text-white flex items-center justify-center shadow-xs ring-4 ring-white relative z-10 transition-all duration-500">
                            <CheckCircle size={22} weight="fill" />
                          </div>
                        ) : isStepFinalActive ? (
                          <div className="relative flex items-center justify-center">
                            <span className="absolute -inset-2.5 rounded-full bg-sky-200/70 animate-pulse pointer-events-none" />
                            <span className="absolute -inset-1 rounded-full bg-sky-400/40 animate-ping pointer-events-none" />
                            <div className="w-10 h-10 rounded-full bg-[#0F4C81] text-white font-extrabold text-sm flex items-center justify-center shadow-lg shadow-sky-900/20 ring-4 ring-sky-100 ring-offset-2 ring-offset-white relative z-10 transition-all duration-500 scale-105">
                              {idx + 1}
                            </div>
                          </div>
                        ) : isStepPassingThrough ? (
                          <div className="w-10 h-10 rounded-full bg-[#0F4C81] text-white font-bold text-sm flex items-center justify-center shadow-md ring-4 ring-sky-100 ring-offset-2 ring-offset-white relative z-10 transition-all duration-500">
                            {idx + 1}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white text-slate-400 font-bold text-sm flex items-center justify-center border-2 border-slate-200 ring-4 ring-white relative z-10 transition-all duration-500">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Judul Aktivitas */}
                      <p
                        className={`text-xs font-bold leading-snug transition-colors duration-300 ${
                          isCancelledEvent && isStepReached
                            ? "text-rose-700"
                            : isStepFinalActive
                            ? "text-[#0F4C81]"
                            : isStepDone
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {event.title}
                      </p>

                      {/* Tanggal & Jam */}
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px] font-mono">
                        {formatDateTimeIndo(event.timestamp)}
                      </p>

                      {/* Deskripsi Singkat */}
                      {event.description && (
                        <p
                          className={`text-[10px] leading-tight mt-1 line-clamp-2 max-w-[130px] ${
                            isCancelledEvent && isStepReached
                              ? "text-rose-600 font-medium"
                              : "text-slate-500"
                          }`}
                          title={event.description}
                        >
                          {event.description}
                        </p>
                      )}

                      {/* Live Indicator Chip */}
                      {isCancelledEvent && isStepReached ? (
                        <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 shadow-2xs animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          Dibatalkan
                        </span>
                      ) : isStepFinalActive ? (
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-extrabold text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 shadow-2xs animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] animate-pulse" />
                          Sedang Berjalan
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cancelled Alert Box Underneath Timeline */}
          {isOrderCancelled && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                  <XCircle size={24} weight="fill" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-rose-900 text-sm">Pesanan Dibatalkan (CANCELLED)</p>
                  <p className="text-slate-600 mt-0.5">
                    Alasan: &ldquo;{orderData.cancellationReason || "Belum menyelesaikan pembayaran"}&rdquo;
                    {orderData.cancellationActor && ` • Dibatalkan oleh ${orderData.cancellationActor === "MERCHANT" ? "Penjual" : orderData.cancellationActor === "CUSTOMER" ? "Pelanggan" : "Sistem"}`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-rose-700 bg-white px-3 py-1 rounded-xl border border-rose-200 shadow-2xs">
                Status: Batal
              </span>
            </div>
          )}
        </div>

        {/* 3. GRID 2 KOLOM MENYAMPING (LEFT: STATIS, RIGHT: DINAMIS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ======================================================== */}
          {/* SECTION KIRI (COL 7): INFORMASI STATIS (TIDAK BERUBAH)    */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-5">

            {/* 1. TOKO PENJUAL & IDENTITAS ORDER */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0 border border-sky-100">
                    <Storefront size={18} weight="bold" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Penjual Resmi
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">
                      {orderData.merchantName}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  Toko Terverifikasi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">No. Pesanan:</span>
                  <span className="font-mono font-bold text-slate-900">#{orderData.orderNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Waktu Pemesanan:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(orderData.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DAFTAR PRODUK ASLI YANG DIPESAN */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[#0F4C81]" />
                  <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    Daftar Produk ({orderData.items.length} Item)
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Subtotal: Rp {orderData.pricing.subtotal.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                {orderData.items.map((item: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {item.imageUrl && item.imageUrl !== "/brand/logo.png" ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.classList.add("hidden");
                              e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div className={`${item.imageUrl && item.imageUrl !== "/brand/logo.png" ? "hidden" : "flex"} items-center justify-center`}>
                          <Package size={22} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                          {item.variantName && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              Varian: {item.variantName}
                            </span>
                          )}
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {item.quantity} × Rp {item.unitPrice.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. SNAPSHOT ALAMAT PENGIRIMAN LENGKAP */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-rose-500" />
                  <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    Alamat Pengiriman
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                  {orderData.addressLabel}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-sm">
                    {orderData.recipientName}
                  </p>
                  <p className="font-mono text-slate-600 text-[11px] flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    <span>{orderData.recipientPhone}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {orderData.addressLine}
                  </p>
                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 border-t border-slate-200/60">
                    {orderData.subdistrict && <span>Kel. {orderData.subdistrict}</span>}
                    {orderData.district && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>Kec. {orderData.district}</span>
                      </>
                    )}
                    {orderData.city && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{orderData.city}</span>
                      </>
                    )}
                    {orderData.postalCode && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono">Kodepos {orderData.postalCode}</span>
                      </>
                    )}
                  </div>

                  {orderData.addressNotes && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                      <span className="font-bold">Patokan / Catatan Alamat:</span> &ldquo;{orderData.addressNotes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. RINCIAN PEMBAYARAN PELANGGAN */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt size={16} className="text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    Rincian Pembayaran
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Metode: QRIS / Virtual Account
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Nilai Barang:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    Rp {orderData.pricing.subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkos Kirim (~{orderData.distanceKm} km):</span>
                  <span className="font-mono font-semibold text-slate-900">
                    Rp {orderData.pricing.shipping.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Layanan Aplikasi:</span>
                  <span className="font-mono">
                    Rp {orderData.pricing.fee.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Total Tagihan Pembayaran:</span>
                  <span className="font-mono text-[#0F4C81]">
                    Rp {orderData.pricing.total.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* SECTION KANAN (COL 5): INFORMASI & AKSI DINAMIS (BERUBAH) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">

            {/* CARD STATUS & AKSI DINAMIS TERKINI */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status &amp; Tindakan Anda
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* ---------------------------------------------------- */}
              {/* STATUS 1: PENDING PAYMENT (Menunggu Pembayaran)       */}
              {/* ---------------------------------------------------- */}
              {isUnpaid && !isExpired && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock size={20} className="text-amber-600 animate-pulse shrink-0" />
                      <div>
                        <p className="font-bold text-amber-900 text-sm">Batas Waktu Pembayaran (6 Jam)</p>
                        <p className="font-mono font-extrabold text-base text-amber-950 mt-0.5">
                          {countdownFormatted}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Pesanan telah dibuat di sistem. Silakan selesaikan pembayaran sebelum batas waktu berakhir agar pesanan tidak otomatis dibatalkan.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCancelUnpaidModalOpen(true)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                    >
                      Batalkan Checkout
                    </button>
                    <Link
                      href={`/payments/products/${orderData.checkoutGroupId || orderData.id}?from=detail&orderId=${orderData.id}`}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CreditCard size={15} weight="bold" />
                      <span>Bayar Sekarang</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 2: CONFIRMED (Pembayaran Lunas)               */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "CONFIRMED" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-[#0F4C81]">
                      <CheckCircle size={18} weight="fill" className="text-[#0F4C81]" />
                      <span>Pembayaran Sah &amp; Terverifikasi</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pembayaran Anda telah diverifikasi oleh Finance 06. Dana diamankan dalam Sistem Pembayaran Platform dan pesanan telah masuk ke antrean toko untuk disiapkan.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCancelConfirmedModalOpen(true)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                    >
                      Batalkan Pesanan
                    </button>
                    <Link
                      href={`/chat?partner_id=${encodeURIComponent(orderData.merchantOrganizationId || "0c1467e7-af68-4b26-ae84-daa41d51aed0")}&partner_type=merchant&partner_name=${encodeURIComponent(orderData.merchantName || "BUDIAJASA")}&ctx_type=order_barang&ctx_id=${encodeURIComponent(orderData.orderNumber || orderData.id)}&ctx_title=${encodeURIComponent(orderData.items?.[0]?.productTitle || `Pesanan ${orderData.orderNumber}`)}&ctx_status=${encodeURIComponent(orderData.status)}&ctx_price=${encodeURIComponent(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0))}&ctx_thumb=${encodeURIComponent(orderData.items?.[0]?.productImageUrl || "")}&ctx_summary=${encodeURIComponent(`Total: Rp ${(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0)).toLocaleString("id-ID")} • ${orderData.items?.length || 1} Barang • Kurir ${orderData.courierMethod || "Toko"}`)}&ctx_url=${encodeURIComponent(`/orders/products/${orderData.orderNumber || orderData.id}`)}`}
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ChatDots size={15} weight="bold" className="text-emerald-600" />
                      <span>Chat Toko (In-App)</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 3: PROCESSING (Sedang Diproses Toko)           */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "PROCESSING" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-blue-900">
                      <Package size={18} weight="fill" className="text-blue-700" />
                      <span>Penjual Sedang Menyiapkan Barang</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Staf toko sedang mengambil suku cadang di gudang dan memeriksa kesesuaian fisik serta mutu barang sebelum dikemas.
                    </p>
                  </div>

                  {/* Cancellation Request in review */}
                  {orderData.cancellationRequest ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <WarningCircle size={16} weight="fill" className="text-amber-600" />
                        <span>Pengajuan Pembatalan Sedang Ditinjau Penjual</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Alasan: &ldquo;{orderData.cancellationRequest.reason || orderData.cancellationRequest.reason_code}&rdquo;. Batas waktu respons toko: 12 jam operasional.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsRequestCancelModalOpen(true)}
                        className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition cursor-pointer"
                      >
                        Ajukan Pembatalan
                      </button>
                      <Link
                        href={`/chat?partner_id=${encodeURIComponent(orderData.merchantOrganizationId || "0c1467e7-af68-4b26-ae84-daa41d51aed0")}&partner_type=merchant&partner_name=${encodeURIComponent(orderData.merchantName || "BUDIAJASA")}&ctx_type=order_barang&ctx_id=${encodeURIComponent(orderData.orderNumber || orderData.id)}&ctx_title=${encodeURIComponent(orderData.items?.[0]?.productTitle || `Pesanan ${orderData.orderNumber}`)}&ctx_status=${encodeURIComponent(orderData.status)}&ctx_price=${encodeURIComponent(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0))}&ctx_thumb=${encodeURIComponent(orderData.items?.[0]?.productImageUrl || "")}&ctx_summary=${encodeURIComponent(`Total: Rp ${(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0)).toLocaleString("id-ID")} • ${orderData.items?.length || 1} Barang • Kurir ${orderData.courierMethod || "Toko"}`)}&ctx_url=${encodeURIComponent(`/orders/products/${orderData.orderNumber || orderData.id}`)}`}
                        className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ChatDots size={15} weight="bold" className="text-emerald-600" />
                        <span>Chat Toko (In-App)</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 4: PACKED (Selesai Dikemas)                   */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "PACKED" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-indigo-900">
                      <Package size={18} weight="fill" className="text-indigo-700" />
                      <span>Barang Telah Selesai Dikemas</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Paket telah disegel rapi dan siap diserahkan kepada kurir pengantar. Pembatalan pesanan sudah ditutup karena barang siap diberangkatkan.
                    </p>
                  </div>

                  <Link
                    href={`/chat?partner_id=${encodeURIComponent(orderData.merchantOrganizationId || "0c1467e7-af68-4b26-ae84-daa41d51aed0")}&partner_type=merchant&partner_name=${encodeURIComponent(orderData.merchantName || "BUDIAJASA")}&ctx_type=order_barang&ctx_id=${encodeURIComponent(orderData.orderNumber || orderData.id)}&ctx_title=${encodeURIComponent(orderData.items?.[0]?.productTitle || `Pesanan ${orderData.orderNumber}`)}&ctx_status=${encodeURIComponent(orderData.status)}&ctx_price=${encodeURIComponent(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0))}&ctx_thumb=${encodeURIComponent(orderData.items?.[0]?.productImageUrl || "")}&ctx_summary=${encodeURIComponent(`Total: Rp ${(((orderData as any).pricing?.total ?? (orderData as any).totalAmount ?? 0)).toLocaleString("id-ID")} • ${orderData.items?.length || 1} Barang • Kurir ${orderData.courierMethod || "Toko"}`)}&ctx_url=${encodeURIComponent(`/orders/products/${orderData.orderNumber || orderData.id}`)}`}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ChatDots size={15} weight="bold" className="text-emerald-600" />
                    <span>Chat Toko (In-App)</span>
                  </Link>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 5: DELIVERING (Dalam Pengiriman Kurir)         */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "DELIVERING" && (() => {
                const isGosend = orderData.isGosend || orderData.courierMethod === "GOSEND";
                const hasValidTrackingUrl = !!(orderData.trackingUrl && orderData.trackingUrl.trim().startsWith("http"));

                return (
                  <div className="space-y-3 text-xs">
                    {isGosend ? (
                      // 1. GOSEND (GOJEK)
                      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-purple-900">
                            <Truck size={18} weight="fill" className="text-purple-700" />
                            <span>Status: Sedang Dikirim</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            Metode: GoSend
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Merchant memesan pengiriman GoSend melalui aplikasi Gojek secara eksternal.
                        </p>

                        <div className="p-2.5 rounded-xl bg-white border border-purple-200 text-[11px] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Metode Pengiriman:</span>
                            <span className="font-bold text-slate-800">GoSend (Gojek)</span>
                          </div>

                          {orderData.trackingNumber && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Nomor Referensi / Booking:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                                <span>{orderData.trackingNumber}</span>
                                <button
                                  type="button"
                                  onClick={handleCopyResi}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                                  title="Salin No. Referensi"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tracking Link Status */}
                        {hasValidTrackingUrl ? (
                          <div className="pt-1">
                            <a
                              href={orderData.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ArrowSquareOut size={15} weight="bold" />
                              <span>Lacak Pengiriman (Buka Link Gojek)</span>
                            </a>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                            <Info size={15} weight="bold" className="text-amber-700 shrink-0" />
                            <span>Link pelacakan belum tersedia</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      // 2. KURIR TOKO (Pengiriman Sendiri, Tanpa GPS)
                      <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 text-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sky-950">
                            <Truck size={18} weight="fill" className="text-blue-600" />
                            <span>Status: Sedang Dikirim</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Metode: Kurir Toko
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-sky-200 text-[11px] space-y-1.5">
                          <p className="font-bold text-slate-900 text-xs">
                            Pesanan sedang diantar oleh kurir toko.
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Pengiriman diantar langsung oleh staf / armada toko sendiri tanpa fitur live tracking GPS. Penjual akan memperbarui status secara manual saat paket tiba.
                          </p>

                          <div className="pt-1 border-t border-slate-100 space-y-1">
                            {orderData.courierStaffName && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Nama Kurir:</span>
                                <span className="font-bold text-slate-800">{orderData.courierStaffName}</span>
                              </div>
                            )}

                            {orderData.courierPhone && (
                              <div className="flex justify-between items-center pt-0.5">
                                <span className="text-slate-500">Nomor HP Kurir:</span>
                                <span className="font-mono font-bold text-slate-900">{orderData.courierPhone}</span>
                              </div>
                            )}

                            {orderData.deliveryNotes && (
                              <div className="pt-1 text-[10px] text-slate-600">
                                <span className="font-semibold text-slate-700">Catatan Pengantaran:</span> &ldquo;{orderData.deliveryNotes}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hubungi Kurir Actions (No GPS button) */}
                        {orderData.courierPhone && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={`tel:${orderData.courierPhone}`}
                              className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Phone size={14} weight="bold" className="text-blue-600" />
                              <span>Telepon Kurir</span>
                            </a>
                            <a
                              href={`https://wa.me/${orderData.courierPhone.replace(/\D/g, "")}?text=Halo%20kurir,%20saya%20pelanggan%20pesanan%20${orderData.orderNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <ChatDots size={14} weight="bold" />
                              <span>WhatsApp Kurir</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsTrackingModalOpen(true)}
                        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ClockCounterClockwise size={14} />
                        <span>Riwayat Pengiriman</span>
                      </button>
                      <a
                        href={`https://wa.me/?text=Halo%20${encodeURIComponent(orderData.merchantName)},%20terkait%20pengiriman%20pesanan%20${orderData.orderNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Hubungi Toko</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* ---------------------------------------------------- */}
              {/* STATUS 6: DELIVERED (Tiba di Tujuan)                  */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "DELIVERED" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-teal-900">
                        <CheckCircle size={18} weight="fill" className="text-teal-600" />
                        <span>Paket Telah Tiba di Tujuan</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200/70 text-teal-900 font-mono">
                        Auto-Selesai 48 Jam
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Paket telah diserahkan. Silakan periksa kelengkapan fisik suku cadang Anda sebelum menyelesaikan pesanan.
                    </p>

                    {/* Bukti Serah Terima Paket (4 Item Lengkap) */}
                    {orderData.pod && (
                      <div className="p-3 rounded-2xl bg-white border border-teal-200 text-[11px] space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span className="font-bold text-teal-950 flex items-center gap-1.5">
                            <ShieldCheck size={15} weight="bold" className="text-teal-600" />
                            Bukti Serah Terima (POD)
                          </span>
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-bold">
                            Tersimpan di Sistem
                          </span>
                        </div>

                        {/* Item 1: Nama Penerima */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">1. Nama Penerima:</span>
                          <span className="font-bold text-slate-900">{orderData.pod.recipient}</span>
                        </div>

                        {/* Item 2: Hubungan / Jenis Bukti */}
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
                          <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {orderData.pod.proofType || "Foto Serah Terima Paket"}
                          </span>
                        </div>

                        {/* Waktu Penyerahan */}
                        {orderData.pod.deliveredAt && (
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                            <span>Waktu Penyerahan:</span>
                            <span>{formatDateTimeIndo(orderData.pod.deliveredAt)}</span>
                          </div>
                        )}

                        {/* Item 3: Catatan Penyerahan */}
                        {orderData.pod.notes && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-slate-500 block mb-0.5">3. Catatan Penyerahan:</span>
                            <p className="text-slate-800 italic bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                              &ldquo;{orderData.pod.notes}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* Item 4: Foto Bukti Paket Sampai */}
                        {orderData.pod.photoUrl ? (
                          <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                            <span className="text-slate-500 font-bold block">4. Foto Bukti Paket Sampai:</span>
                            <div className="flex items-center gap-2.5">
                              <div
                                onClick={() => setPreviewPodPhoto(orderData.pod?.photoUrl || null)}
                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-teal-200 cursor-pointer group shrink-0 bg-slate-100"
                                title="Klik untuk perbesar gambar bukti"
                              >
                                <img
                                  src={orderData.pod.photoUrl}
                                  alt="Bukti Paket Sampai"
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Eye size={16} weight="bold" />
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewPodPhoto(orderData.pod?.photoUrl || null)}
                                  className="text-teal-700 hover:text-teal-900 font-bold text-xs underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={13} weight="bold" />
                                  <span>Perbesar Foto Bukti</span>
                                </button>
                                <p className="text-[10px] text-slate-400">
                                  Klik gambar untuk membuka popup resolusi penuh.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1 text-[10px] text-slate-400 italic">
                            * Foto bukti fisik tidak dilampirkan oleh kurir saat penyerahan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsReturnModalOpen(true)}
                      className="w-full py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition cursor-pointer"
                    >
                      Komplain / Retur
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmReceivedModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={15} weight="bold" />
                      <span>Konfirmasi Barang Telah Diterima</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 7: COMPLETED (Pesanan Selesai)                 */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "COMPLETED" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <ShieldCheck size={20} weight="fill" className="text-emerald-600" />
                      <span>Pesanan Selesai — Garansi Resmi Aktif</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Transaksi telah berhasil diselesaikan. Hak garansi suku cadang resmi kini aktif terhubung dengan akun Anda.
                    </p>
                  </div>

                  {/* Active Case Banner if exists */}
                  {activeCase && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                          Kasus Resolusi Aktif
                        </span>
                        <span className="font-mono font-bold text-indigo-900 text-[11px]">
                          #{activeCase.caseNumber}
                        </span>
                      </div>
                      <p className="text-slate-700 text-[11px]">
                        Status: <strong>{activeCase.mainStatus}</strong> ({activeCase.customerRequestedSolution || "Dalam Penanganan"})
                      </p>
                      <Link
                        href={`/complaints/${activeCase.id}`}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-center block transition shadow-xs"
                      >
                        Buka Detail Pengajuan &amp; Status Kasus &rarr;
                      </Link>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Receipt size={15} />
                      <span>Lihat Struk Digital</span>
                    </button>
                    <Link
                      href="/products"
                      className="w-full py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Package size={15} />
                      <span>Beli Lagi</span>
                    </Link>
                  </div>

                  {/* After-Sales Claim & Review buttons */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsReviewModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Star size={15} weight="fill" className="text-amber-500" />
                      <span>
                        {existingOrderReview
                          ? "Lihat Penilaian Produk & Toko"
                          : "Beri Ulasan Produk & Toko"}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {associatedWarranty ? (
                        <button
                          type="button"
                          onClick={() => setIsClaimModalOpen(true)}
                          className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck size={15} />
                          <span>Ajukan Klaim Garansi</span>
                        </button>
                      ) : (
                        <Link
                          href="/warranties"
                          className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck size={15} />
                          <span>Pusat Garansi</span>
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsReturnModalOpen(true)}
                        className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowsClockwise size={15} />
                        <span>Ajukan Retur Barang</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* STATUS 8: CANCELLED (Dibatalkan)                     */}
              {/* ---------------------------------------------------- */}
              {orderData.status === "CANCELLED" && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-rose-900">
                      <XCircle size={18} weight="fill" className="text-rose-600" />
                      <span>Pesanan Telah Dibatalkan</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      Dibatalkan oleh: <strong>{orderData.cancellationActor}</strong>.
                    </p>
                    <p className="text-[11px] text-slate-600 italic">
                      Alasan: &ldquo;{orderData.cancellationReason || "Belum menyelesaikan pembayaran"}&rdquo;
                    </p>
                  </div>

                  {!orderData.refundData && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between gap-3">
                      <span className="text-[11px]">Batas waktu pembayaran 6 jam telah berakhir. Tidak ada tagihan atau dana yang dipotong.</span>
                      <Link
                        href="/products"
                        className="px-3.5 py-2 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0c3c66] transition shrink-0 shadow-xs"
                      >
                        Beli Ulang
                      </Link>
                    </div>
                  )}

                  {/* OFFICIAL REFUND STATUS CARD (ONLY IF PAID) */}
                  {orderData.refundData ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                          <Receipt size={16} weight="fill" className="text-emerald-600" />
                          <span>Pengembalian Dana Resmi (Refund Finance 06)</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {orderData.refundData.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Pengembalian dana 100% telah diverifikasi dan dikreditkan langsung ke saldo akun S-Pay Anda.
                      </p>
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 text-slate-700 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Nominal Refund:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            Rp {orderData.refundData.amount.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tujuan:</span>
                          <span className="font-bold text-slate-800">{orderData.refundData.destination}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID Refund:</span>
                          <span className="font-mono text-slate-600 text-[10px]">{orderData.refundData.refundId}</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <Link
                          href="/spay"
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                          <CreditCard size={15} />
                          <span>Periksa Saldo S-Pay</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
                      Tidak ada proses pengembalian dana karena pesanan dibatalkan sebelum pembayaran dilakukan.
                    </div>
                  )}

                  <div className="pt-1">
                    <Link
                      href="/products"
                      className="w-full py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Package size={15} />
                      <span>Cari Produk Lain</span>
                    </Link>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* MODAL DIALOGS */}
      {/* 1. Cancel Unpaid Checkout */}
      {isCancelUnpaidModalOpen && (
        <CancelUnpaidCheckoutModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsCancelUnpaidModalOpen(false)}
          onConfirm={async (targetId) => {
            try {
              cancelUnpaidCheckoutGroup(targetId, "Pembatalan oleh Pelanggan");
              setIsCancelUnpaidModalOpen(false);
              setToastType("success");
              setToastMessage("Checkout berhasil dibatalkan.");
              await fetchOrder();
            } catch (e: any) {
              setToastType("error");
              setToastMessage(e?.message || "Gagal membatalkan checkout.");
            }
          }}
        />
      )}

      {/* 2. Cancel Confirmed Direct */}
      {isCancelConfirmedModalOpen && (
        <CancelConfirmedModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsCancelConfirmedModalOpen(false)}
          onConfirm={async (id, reason) => {
            try {
              cancelConfirmedMerchantOrder(id, reason);
              setIsCancelConfirmedModalOpen(false);
              setToastType("success");
              setToastMessage("Pesanan toko berhasil dibatalkan & refund 100% diproses.");
              await fetchOrder();
            } catch (e: any) {
              setToastType("error");
              setToastMessage(e?.message || "Gagal membatalkan pesanan.");
            }
          }}
        />
      )}

      {/* 3. Request Cancellation */}
      {isRequestCancelModalOpen && (
        <RequestCancellationModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsRequestCancelModalOpen(false)}
          onConfirm={async (id, reason, notes) => {
            try {
              requestCancellation(id, reason, notes);
              setIsRequestCancelModalOpen(false);
              setToastType("success");
              setToastMessage("Pengajuan pembatalan telah dikirim ke toko (SLA 12 jam).");
              await fetchOrder();
            } catch (e: any) {
              setToastType("error");
              setToastMessage(e?.message || "Gagal mengajukan pembatalan.");
            }
          }}
        />
      )}

      {/* 4. Confirm Delivered */}
      {isConfirmReceivedModalOpen && (
        <ConfirmDeliveredModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsConfirmReceivedModalOpen(false)}
          onConfirm={async (id) => {
            try {
              customerConfirmDelivered(id);
              setIsConfirmReceivedModalOpen(false);
              setToastType("success");
              setToastMessage("Pesanan berhasil dikonfirmasi selesai! Garansi resmi aktif.");
              await fetchOrder();
            } catch (e: any) {
              setToastType("error");
              setToastMessage(e?.message || "Gagal konfirmasi terima barang.");
            }
          }}
        />
      )}

      {/* 5. Digital Receipt Modal */}
      {isReceiptModalOpen && (
        <ReceiptModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

      {/* 6. Shipment Tracking Modal */}
      {isTrackingModalOpen && (
        <TrackingModal
          order={orderData.rawStoreOrder || null}
          isOpen={true}
          onClose={() => setIsTrackingModalOpen(false)}
        />
      )}

      {/* 7. Product Return Modal (After Sales Phase 07) */}
      {isReturnModalOpen && (
        <ProductReturnModal
          isOpen={true}
          onClose={() => setIsReturnModalOpen(false)}
          orderId={orderData.id}
          orderNumber={orderData.orderNumber}
          merchantId={orderData.rawStoreOrder?.merchantId || "merch-01"}
          merchantName={orderData.merchantName}
          items={orderData.items.map((it: any) => ({
            productId: it.id,
            productTitle: it.title,
            itemImageUrl: it.imageUrl,
            unitPrice: it.unitPrice,
            purchasedQuantity: it.quantity,
            eligibleQuantity: it.quantity,
          }))}
          onSuccess={() => {
            setIsReturnModalOpen(false);
            setToastType("success");
            setToastMessage("Pengajuan retur barang berhasil dikirim ke Pusat Resolusi.");
          }}
        />
      )}

      {/* 8. Warranty Claim Modal (After Sales Phase 07) */}
      {isClaimModalOpen && associatedWarranty && (
        <WarrantyClaimModal
          isOpen={true}
          onClose={() => setIsClaimModalOpen(false)}
          warranty={associatedWarranty}
          onSuccess={() => {
            setIsClaimModalOpen(false);
            setToastType("success");
            setToastMessage("Klaim garansi suku cadang berhasil diajukan.");
          }}
        />
      )}

      {/* Review Modal (Phase 07 C05 / C07) */}
      <OrderReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        target={goodsReviewTarget}
        onSubmitted={(sub) => {
          setExistingOrderReview(sub);
          setToastType("success");
          setToastMessage("Penilaian produk dan toko berhasil disimpan!");
        }}
      />

      {/* Lightbox Popup: Perbesar Gambar Bukti Paket Sampai */}
      {previewPodPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewPodPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200/90 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} weight="bold" className="text-teal-600" />
                <span className="font-bold text-slate-900 text-xs">
                  Foto Bukti Serah Terima Paket #{orderData.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPodPhoto(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewPodPhoto}
                alt="Foto Bukti Paket Sampai"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">1. Nama Penerima:</span>
                <span className="font-bold text-slate-800">
                  {orderData.pod?.recipient || orderData.recipientName}
                </span>
              </div>
              {orderData.pod?.proofType && (
                <div className="flex justify-between">
                  <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
                  <span className="text-teal-800 font-semibold">{orderData.pod.proofType}</span>
                </div>
              )}
              {orderData.pod?.notes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">3. Catatan:</span>
                  <span className="text-slate-700 italic">&ldquo;{orderData.pod.notes}&rdquo;</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewPodPhoto(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
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
