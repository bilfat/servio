"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MockMerchantOrder,
  MockCheckoutGroup,
  MockShippingSettings,
  MockDeliveryMethod,
  MockDeliveryProvider,
  MockDeliveryStatus,
} from "@/types/order-barang";
import {
  orderBarangApi,
  MerchantOrderEntity,
  DeliverySettingResponse,
} from "@/lib/orderBarangApi";
import { orderBarangStore } from "../orderBarangStore";

export interface MockMerchantOption {
  id: string;
  name: string;
  city: string;
  address: string;
}

export const MOCK_MERCHANTS: MockMerchantOption[] = [
  {
    id: "0c1467e7-af68-4b26-ae84-daa41d51aed0",
    name: "BUDIAJASA (Sinar AC & Sparepart Glodok)",
    city: "Jakarta Pusat",
    address: "Harco Glodok Blok A No. 15, Jl. Hayam Wuruk, Jakarta Pusat",
  },
  {
    id: "merch-jaya-motor",
    name: "Jaya Motor Sentosa",
    city: "Jakarta Selatan",
    address: "Jl. Fatmawati Raya No. 45, Cilandak, Jakarta Selatan",
  },
  {
    id: "merch-berkah-teknik",
    name: "Toko Berkah Teknik AC",
    city: "Jakarta Barat",
    address: "Komp. Duta Mas Blok B2 No. 11, Grogol, Jakarta Barat",
  },
];

export function mapBackendOrderToMock(o: MerchantOrderEntity): MockMerchantOrder {
  const items = (o.items || []).map((it) => {
    const rawImage =
      it.product_image_ref ||
      (it as any).image_url ||
      it.product_snapshot?.image_url ||
      it.product_snapshot?.primary_image_url ||
      (it.variant_snapshot as any)?.image_url ||
      "";
    let cleanImage = rawImage && rawImage !== "/brand/logo.png" ? rawImage : "";
    if (cleanImage && cleanImage.startsWith("/api/v1/product-media/")) {
      cleanImage = `${cleanImage}${cleanImage.includes("?") ? "&" : "?"}v=2`;
    }

    const rawVariant =
      it.variant_snapshot?.name ||
      it.product_snapshot?.variant_name ||
      (it as any).variant_name ||
      "";

    return {
      id: it.id,
      productId: it.product_id,
      variantId: it.variant_id,
      title: it.product_snapshot?.name || it.name || `Produk #${it.product_id}`,
      variantName: rawVariant || "Varian Standar",
      quantity: it.quantity,
      unitPrice: it.unit_price_idr,
      subtotal: it.line_total_idr ?? (it.unit_price_idr * it.quantity),
      thumbnailUrl: cleanImage,
    };
  });

  const activeCancelReq =
    o.cancellation_requests?.[0] || o.cancellationRequests?.[0] || o.active_cancellation_request;

  const recipient = {
    recipientName: o.recipient_snapshot?.recipient_name || o.address_snapshot?.recipient_name || "Pelanggan",
    phone: o.recipient_snapshot?.phone || o.recipient_snapshot?.recipient_phone || o.address_snapshot?.recipient_phone || "0812-3456-7890",
    fullAddress: o.address_snapshot?.address_line || "Alamat Pengiriman",
    street: o.address_snapshot?.address_line || "Alamat Pengiriman",
    subdistrict: o.address_snapshot?.subdistrict,
    district: o.address_snapshot?.district,
    city: o.address_snapshot?.city || "Jakarta",
    postalCode: o.address_snapshot?.postal_code || "12190",
    label: o.address_snapshot?.label,
    notes: o.recipient_snapshot?.notes || o.address_snapshot?.notes || o.notes,
  };

  const deliveryMethod: MockDeliveryMethod =
    o.delivery?.courier_method === "GOSEND" ? "THIRD_PARTY" : "MERCHANT_DELIVERY";
  const deliveryProvider: MockDeliveryProvider =
    o.delivery?.courier_method === "GOSEND" ? "GOSEND" : "MERCHANT";

  let deliveryStatus: MockDeliveryStatus = "NOT_STARTED";
  if (o.delivery?.delivery_status === "DELIVERED") deliveryStatus = "DELIVERED";
  else if (
    o.delivery?.delivery_status === "IN_TRANSIT" ||
    o.delivery?.delivery_status === "DISPATCHED"
  )
    deliveryStatus = "IN_TRANSIT";
  else if (o.delivery?.delivery_status === "FAILED") deliveryStatus = "FAILED";
  else if (o.status === "PACKED") deliveryStatus = "READY_FOR_DELIVERY";

  const rawBreakdown =
    (o as any).merchant_fee_breakdown ||
    (o as any).finance_allocation?.merchant_fee_breakdown ||
    (o as any).finance_allocation?.fee_snapshot?.merchant_fee_breakdown;

  const merchantFeeBreakdown: Array<{ name: string; amount: number }> =
    Array.isArray(rawBreakdown) && rawBreakdown.length > 0
      ? rawBreakdown.map((f: any) => ({
          name: f.name || f.display_name || "Biaya Layanan Platform",
          amount: Number(f.amount_idr ?? f.amount ?? 0),
        }))
      : [
          { name: "Biaya Layanan Barang", amount: 6000 },
          { name: "Biaya Aplikasi Toko", amount: 5000 },
        ];

  const totalCalculatedCommission = merchantFeeBreakdown.reduce((sum, item) => sum + item.amount, 0);

  const commissionFee =
    typeof (o as any).merchant_commission_allocated_idr === "number"
      ? (o as any).merchant_commission_allocated_idr
      : (typeof (o as any).finance_allocation?.merchant_commission_idr === "number"
          ? (o as any).finance_allocation.merchant_commission_idr
          : totalCalculatedCommission);

  const netPayout =
    typeof (o as any).merchant_receivable_idr === "number"
      ? (o as any).merchant_receivable_idr
      : (typeof (o as any).finance_allocation?.merchant_net_entitlement_idr === "number"
          ? (o as any).finance_allocation.merchant_net_entitlement_idr
          : Math.max(0, (o.product_subtotal_idr + o.shipping_customer_idr) - commissionFee));

  const rawDistance = o.shipping_snapshot?.distance_km ?? (o as any).distance_km;
  const distanceKm = typeof rawDistance === "number" && rawDistance > 0 ? Math.round(rawDistance * 10) / 10 : 2.5;

    const isUnpaidOrder = o.status === "CREATED" || o.status === "PAYMENT_PENDING";
    const createdAtTime = new Date(o.created_at).getTime();
    const isTimeExpired = isUnpaidOrder && (Date.now() >= createdAtTime + 6 * 3600 * 1000);
    const isBackendExpired = o.payment_status_projection === "EXPIRED";
    const isExpired = isTimeExpired || isBackendExpired;

    const effectiveStatus = isExpired ? "CANCELLED" : o.status;
    const effectivePaymentStatus = isExpired ? "EXPIRED" : ((o.payment_status_projection as any) || (isUnpaidOrder ? "PENDING" : "PAID"));
    const effectiveCancelReason = isExpired ? "Belum menyelesaikan pembayaran" : o.cancel_reason;
    const effectiveCancelActor = isExpired ? "SYSTEM" : o.cancel_actor_role;

    let parsedProofType: string | undefined = undefined;
    let parsedDeliveredNotes: string | undefined = undefined;
    let parsedProofPhotoUrl: string | undefined = undefined;

    const rawProof = o.delivery?.proof_reference;
    if (rawProof) {
      if (rawProof.startsWith("{") && rawProof.endsWith("}")) {
        try {
          const json = JSON.parse(rawProof);
          parsedProofType = json.proof_type || json.proofType;
          parsedDeliveredNotes = json.notes || json.deliveredNotes;
          parsedProofPhotoUrl = json.photo_url || json.proofPhotoUrl || json.image_url;
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

    const deliveryInfo: any = {
      method: deliveryMethod,
      provider: deliveryProvider,
      status: deliveryStatus,
      deliveryStatus,
      distanceKm,
      courierMethod: o.delivery?.courier_method || "KURIR_TOKO",
      courierName: o.delivery?.courier_name || undefined,
      courierPhone: o.delivery?.courier_phone || undefined,
      trackingNumber: o.delivery?.booking_reference || undefined,
      trackingReference: o.delivery?.booking_reference || undefined,
      trackingUrl: o.delivery?.tracking_url || undefined,
      pickupAt: (o.delivery?.dispatched_at || o.dispatched_at) || undefined,
      deliveredAt: (o.delivery?.delivered_at || o.delivered_at) || undefined,
      deliveredToName: o.delivery?.recipient_name || undefined,
      recipientReceivedBy: o.delivery?.recipient_name || undefined,
      proofType: parsedProofType || "Foto Serah Terima Paket",
      deliveredNotes: parsedDeliveredNotes || "Paket diterima dalam kondisi baik",
      proofPhotoUrl: parsedProofPhotoUrl || undefined,
      failureReason: o.delivery?.attempts?.[0]?.failed_reason_code,
      retryCount: o.delivery?.attempts?.length || 0,
      attempts: (o.delivery?.attempts || []).map((att) => ({
        attemptNumber: att.attempt_number,
        timestamp: att.created_at,
        status: att.status as any,
        failureReason: att.failed_reason_code,
        notes: att.note,
      })),
    };

    return {
      id: o.id,
      orderNumber: o.order_number,
      checkoutGroupId: o.checkout_group_id,
      checkoutGroupNumber: o.checkout_group_id,
      merchantId: o.merchant_org_id,
      merchantName: o.merchant_display_snapshot?.name || `Toko ${o.merchant_org_id}`,
      merchantCity: o.merchant_display_snapshot?.city || "Jakarta Barat",
      customerId: o.customer_id,
      customerName: o.recipient_snapshot?.recipient_name || "Pelanggan",
      customerPhone: o.recipient_snapshot?.phone || "0812-3456-7890",
      recipientAddress: recipient,
      shippingAddressSnapshot: recipient,
      items,
      itemsSubtotal: o.product_subtotal_idr,
      shippingFee: o.shipping_customer_idr,
      simulatedDistanceKm: distanceKm,
      customerServiceFee: o.app_fee_allocated_idr,
      customerTax: o.customer_tax_allocated_idr,
      totalAmount: o.customer_total_idr,
      pricing: {
        itemsSubtotal: o.product_subtotal_idr,
        shippingFee: o.shipping_customer_idr,
        platformFee: o.app_fee_allocated_idr,
        taxAmount: o.customer_tax_allocated_idr,
        merchantOrderTotal: o.customer_total_idr,
        merchantCommissionFee: commissionFee,
        merchantNetPayout: netPayout,
        merchantFeeBreakdown,
        feeBearer: o.discount_bearer || "MERCHANT",
      },
      status: effectiveStatus,
      paymentStatus: effectivePaymentStatus,
      refundStatus: effectiveStatus === "CANCELLED" ? "PROCESSING" : "NOT_REQUIRED",
      refundAmount: effectiveStatus === "CANCELLED" ? o.customer_total_idr : 0,
      refund: {
        status: effectiveStatus === "CANCELLED" ? "PROCESSING" : "NOT_REQUIRED",
        amount: effectiveStatus === "CANCELLED" ? o.customer_total_idr : 0,
      },
      payment: {
        status: effectivePaymentStatus,
        totalAmount: o.customer_total_idr,
        method: "QRIS",
        paidAt: o.confirmed_at,
      },
      paymentMethod: "QRIS",
      selectedBank: "BCA",
      delivery: deliveryInfo,
    cancellationRequest: activeCancelReq
      ? {
          id: activeCancelReq.id,
          orderId: activeCancelReq.order_id,
          requestedAt: activeCancelReq.created_at || (activeCancelReq as any).requested_at,
          responseDeadlineAt: activeCancelReq.sla_deadline || "",
          reason: activeCancelReq.reason_code,
          note: activeCancelReq.note,
          status: activeCancelReq.status,
          decidedAt: activeCancelReq.decision_at,
          decidedBy: (activeCancelReq.decision_by as any) || "MERCHANT",
          rejectionReason: activeCancelReq.decision_note,
        }
      : undefined,
    cancellationDetails:
      effectiveStatus === "CANCELLED"
        ? {
            reason: effectiveCancelReason || "Belum menyelesaikan pembayaran",
            actor: effectiveCancelActor || "SISTEM",
          }
        : undefined,
    timeline: [
      {
        step: "CREATED",
        title: "Pesanan Dibuat",
        description: "Pesanan berhasil dibuat dalam sistem.",
        timestamp: o.created_at,
        isCompleted: true,
      },
      ...((isUnpaidOrder || isExpired || effectiveStatus === "CANCELLED")
        ? [
            {
              step: "PAYMENT_PENDING",
              title: "Menunggu Pembayaran",
              description: "Batas waktu pembayaran 6 jam sejak pesanan dibuat.",
              timestamp: o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.confirmed_at || ["CONFIRMED", "PROCESSING", "PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(o.status) || o.payment_status_projection === "PAID")
        ? [
            {
              step: "CONFIRMED",
              title: "Pesanan Baru Masuk (Lunas)",
              description: "Pembayaran telah lunas diverifikasi sistem. Pesanan siap diproses oleh toko.",
              timestamp: o.confirmed_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.processed_at || ["PROCESSING", "PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(o.status))
        ? [
            {
              step: "PROCESSING",
              title: "Sedang Disiapkan Toko",
              description: "Toko sedang menyiapkan barang pesanan.",
              timestamp: o.processed_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.packed_at || ["PACKED", "DELIVERING", "DELIVERED", "COMPLETED"].includes(o.status))
        ? [
            {
              step: "PACKED",
              title: "Siap Dikirim",
              description: "Pesanan telah dikemas rapi dan siap diserahkan ke kurir.",
              timestamp: o.packed_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.dispatched_at || o.delivery?.dispatched_at || ["DELIVERING", "DELIVERED", "COMPLETED"].includes(o.status))
        ? [
            {
              step: "DELIVERING",
              title: "Dalam Pengiriman",
              description: "Kurir sedang mengantarkan paket ke alamat tujuan.",
              timestamp: o.dispatched_at || o.delivery?.dispatched_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.delivered_at || o.delivery?.delivered_at || ["DELIVERED", "COMPLETED"].includes(o.status))
        ? [
            {
              step: "DELIVERED",
              title: "Tiba di Tujuan",
              description: `Barang telah diterima oleh ${o.delivery?.recipient_name || "Penerima"}.`,
              timestamp: o.delivered_at || o.delivery?.delivered_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.completed_at || o.status === "COMPLETED")
        ? [
            {
              step: "COMPLETED",
              title: "Pesanan Selesai",
              description: "Pesanan telah selesai. Dana bersih telah masuk ke saldo dompet toko.",
              timestamp: o.completed_at || o.updated_at || o.created_at,
              isCompleted: true,
            },
          ]
        : []),
      ...((o.cancelled_at || o.status === "CANCELLED" || effectiveStatus === "CANCELLED")
        ? [
            {
              step: "CANCELLED",
              title: "Pesanan Dibatalkan",
              description: `Dibatalkan oleh ${effectiveCancelActor === "MERCHANT" ? "Penjual" : effectiveCancelActor === "CUSTOMER" ? "Pelanggan" : "Sistem"}. Alasan: ${effectiveCancelReason || "Belum menyelesaikan pembayaran"}`,
              timestamp: o.cancelled_at || (isExpired ? new Date(new Date(o.created_at).getTime() + 6 * 3600 * 1000).toISOString() : o.updated_at || o.created_at),
              isCompleted: true,
            },
          ]
        : []),
    ],
    createdAt: o.created_at,
    updatedAt: o.updated_at || o.created_at,
    packedAt: o.packed_at,
    dispatchedAt: o.dispatched_at,
    deliveredAt: o.delivered_at,
    completedAt: o.completed_at,
    cancelledAt: o.cancelled_at || (isExpired ? (o.created_at || new Date().toISOString()) : undefined),
    cancellationReason: effectiveCancelReason,
    cancelledBy: (effectiveCancelActor === "CUSTOMER" || effectiveCancelActor === "MERCHANT" || effectiveCancelActor === "SYSTEM"
      ? effectiveCancelActor
      : undefined),
  };
}

const CACHE_KEY_CUST_ORDERS = "servio_cache_customer_orders_real_v5";
const CACHE_KEY_MERCH_ORDERS = "servio_cache_merchant_orders_real_v5";

export function useOrderBarang() {
  const [backendCustomerOrders, setBackendCustomerOrders] = useState<MockMerchantOrder[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Clean legacy cache keys that stored the logo fallback
        try {
          localStorage.removeItem("servio_cache_customer_orders_real");
          localStorage.removeItem("servio_cache_customer_orders_real_v2");
          localStorage.removeItem("servio_cache_customer_orders_real_v3");
        } catch {}
        const cached = localStorage.getItem(CACHE_KEY_CUST_ORDERS);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((o: any) => !String(o?.orderNumber || "").startsWith("ORD-MC-2026-"))
              .map((o: any) => ({
                ...o,
                items: (o.items || []).map((it: any) => ({
                  ...it,
                  thumbnailUrl: it.thumbnailUrl === "/brand/logo.png" ? "" : it.thumbnailUrl,
                })),
              }));
          }
        }
      } catch {}
    }
    return [];
  });

  const [backendMerchantOrders, setBackendMerchantOrders] = useState<MockMerchantOrder[]>(() => {
    if (typeof window !== "undefined") {
      try {
        // Clean legacy cache keys that stored the logo fallback
        try {
          localStorage.removeItem("servio_cache_merchant_orders_real");
          localStorage.removeItem("servio_cache_merchant_orders_real_v2");
          localStorage.removeItem("servio_cache_merchant_orders_real_v3");
        } catch {}
        const cached = localStorage.getItem(CACHE_KEY_MERCH_ORDERS);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((o: any) => !String(o?.orderNumber || "").startsWith("ORD-MC-2026-"))
              .map((o: any) => ({
                ...o,
                items: (o.items || []).map((it: any) => ({
                  ...it,
                  thumbnailUrl: it.thumbnailUrl === "/brand/logo.png" ? "" : it.thumbnailUrl,
                })),
              }));
          }
        }
      } catch {}
    }
    return [];
  });

  const [checkoutGroups, setCheckoutGroups] = useState<MockCheckoutGroup[]>([]);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [hasLoadedBackend, setHasLoadedBackend] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHE_KEY_CUST_ORDERS) || localStorage.getItem(CACHE_KEY_MERCH_ORDERS);
        if (cached) return true;
      } catch {}
    }
    return false;
  });
  const [tick, setTick] = useState(0);

  const [activeMerchantId, setActiveMerchantId] = useState("0c1467e7-af68-4b26-ae84-daa41d51aed0");
  const switchMerchantContext = useCallback((id: string) => {
    setActiveMerchantId(id);
  }, []);

  const activeMerchant = useMemo(
    () => MOCK_MERCHANTS.find((m) => m.id === activeMerchantId) || MOCK_MERCHANTS[0],
    [activeMerchantId]
  );

  const syncBackendOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingBackend(true);
    }
    try {
      await Promise.all([
        (async () => {
          try {
            const custRes = await orderBarangApi.customer.getOrders(undefined, 1, 100);
            const rawList = custRes.data && Array.isArray((custRes.data as any).data)
              ? (custRes.data as any).data
              : Array.isArray(custRes.data)
              ? custRes.data
              : [];
            const mappedCust = rawList.map(mapBackendOrderToMock);
            setBackendCustomerOrders((prev) => {
              const prevMap = new Map(prev.map((p) => [p.id, p]));
              const merged = mappedCust.map((newItem) => {
                const existing = prevMap.get(newItem.id);
                if (!existing) return newItem;

                // If existing has local cancel status and newItem is not yet cancelled
                if (existing.status === "CANCELLED" && newItem.status !== "CANCELLED") {
                  return {
                    ...newItem,
                    status: existing.status,
                    paymentStatus: existing.paymentStatus,
                    cancellationReason: existing.cancellationReason,
                    cancelledAt: existing.cancelledAt,
                    cancelledBy: existing.cancelledBy,
                    cancellationDetails: existing.cancellationDetails,
                    refund: existing.refund,
                    timeline: existing.timeline,
                  };
                }

                // If existing has newer progression, keep existing progression
                const statusRank: Record<string, number> = {
                  CREATED: 0,
                  PAYMENT_PENDING: 1,
                  CONFIRMED: 2,
                  PROCESSING: 3,
                  PACKED: 4,
                  DELIVERING: 5,
                  DELIVERED: 6,
                  COMPLETED: 7,
                };
                if (
                  (statusRank[existing.status] || 0) > (statusRank[newItem.status] || 0) &&
                  existing.status !== "CANCELLED"
                ) {
                  return {
                    ...newItem,
                    status: existing.status,
                    delivery: existing.delivery || newItem.delivery,
                    timeline: existing.timeline || newItem.timeline,
                  };
                }

                return newItem;
              });

              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(CACHE_KEY_CUST_ORDERS, JSON.stringify(merged));
                } catch {}
              }
              return merged;
            });
          } catch (custErr) {
            console.warn("Backend customer orders sync error:", custErr);
          }
        })(),
        (async () => {
          try {
            const merchRes = await orderBarangApi.merchant.getOrders(undefined, 1, 100);
            const rawList = merchRes.data && Array.isArray((merchRes.data as any).data)
              ? (merchRes.data as any).data
              : Array.isArray(merchRes.data)
              ? merchRes.data
              : [];
            const mappedMerch = rawList.map(mapBackendOrderToMock);
            setBackendMerchantOrders((prev) => {
              const prevMap = new Map(prev.map((p) => [p.id, p]));
              const merged = mappedMerch.map((newItem) => {
                const existing = prevMap.get(newItem.id);
                if (!existing) return newItem;

                if (existing.status === "CANCELLED" && newItem.status !== "CANCELLED") {
                  return {
                    ...newItem,
                    status: existing.status,
                    paymentStatus: existing.paymentStatus,
                    cancellationReason: existing.cancellationReason,
                    cancelledAt: existing.cancelledAt,
                    cancelledBy: existing.cancelledBy,
                    cancellationDetails: existing.cancellationDetails,
                    refund: existing.refund,
                    timeline: existing.timeline,
                  };
                }

                const statusRank: Record<string, number> = {
                  CREATED: 0,
                  PAYMENT_PENDING: 1,
                  CONFIRMED: 2,
                  PROCESSING: 3,
                  PACKED: 4,
                  DELIVERING: 5,
                  DELIVERED: 6,
                  COMPLETED: 7,
                };
                if (
                  (statusRank[existing.status] || 0) > (statusRank[newItem.status] || 0) &&
                  existing.status !== "CANCELLED"
                ) {
                  return {
                    ...newItem,
                    status: existing.status,
                    delivery: existing.delivery || newItem.delivery,
                    timeline: existing.timeline || newItem.timeline,
                  };
                }

                return newItem;
              });

              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem(CACHE_KEY_MERCH_ORDERS, JSON.stringify(merged));
                } catch {}
              }
              return merged;
            });
          } catch (merchErr) {
            console.warn("Backend merchant orders sync error:", merchErr);
          }
        })(),
      ]);
    } finally {
      if (!silent) {
        setIsLoadingBackend(false);
      }
      setHasLoadedBackend(true);
    }
  }, []);

  useEffect(() => {
    // If we have cached orders, sync silently without blocking UI
    syncBackendOrders(true);
    setCheckoutGroups(orderBarangStore.getCheckoutGroups());

    const unsubscribe = orderBarangStore.subscribe(() => {
      setTick((prev) => prev + 1);
      setCheckoutGroups(orderBarangStore.getCheckoutGroups());
      syncBackendOrders(true);
    });
    return unsubscribe;
  }, [syncBackendOrders]);

  // 100% Live Backend Orders: NO DUMMY STORE FALLBACK AT ALL
  const currentTime = useMemo(() => new Date(), [tick]);

  // Customer orders (100% database orders)
  const customerOrders = useMemo(() => {
    return backendCustomerOrders;
  }, [backendCustomerOrders]);

  const isOrderExpired = useCallback((order: MockMerchantOrder) => {
    if (order.status === "CANCELLED" && (order.paymentStatus === "EXPIRED" || order.cancellationReason === "Belum menyelesaikan pembayaran")) {
      return true;
    }
    if (order.status === "CREATED" || order.status === "PAYMENT_PENDING" || (order.status as string) === "PENDING") {
      const createdAtTime = new Date(order.createdAt).getTime();
      const nowMs = currentTime ? currentTime.getTime() : Date.now();
      return nowMs >= createdAtTime + 6 * 3600 * 1000;
    }
    return false;
  }, [currentTime]);

  const customerOrdersByTab = useMemo(() => {
    const normalized = customerOrders.map((o) => {
      const isExp = isOrderExpired(o);
      const isCancelled = o.status === "CANCELLED" || isExp;
      let timeline = Array.isArray(o.timeline) && o.timeline.length > 0 ? [...o.timeline] : [
        {
          step: "CREATED",
          title: "Pesanan Dibuat",
          description: "Pesanan berhasil dibuat dalam sistem.",
          timestamp: o.createdAt,
          isCompleted: true,
        },
      ];

      const isUnpaidOrder = o.status === "CREATED" || o.status === "PAYMENT_PENDING" || (o.status as string) === "PENDING" || isExp || (isCancelled && !o.paidAt);
      if (isUnpaidOrder && !timeline.some((t) => t.step === "PAYMENT_PENDING")) {
        timeline.splice(1, 0, {
          step: "PAYMENT_PENDING",
          title: "Menunggu Pembayaran",
          description: "Batas waktu pembayaran 6 jam sejak pesanan dibuat.",
          timestamp: o.createdAt,
          isCompleted: true,
        });
      }

      if (isCancelled && !timeline.some((t) => t.step === "CANCELLED" || t.title.toLowerCase().includes("batal"))) {
        const actor = o.cancelledBy || o.cancellationDetails?.actor || (isExp ? "SISTEM" : "Sistem");
        const reason = o.cancellationReason || o.cancellationDetails?.reason || (isExp ? "Belum menyelesaikan pembayaran" : "Pembatalan transaksi");
        const timestamp = o.cancelledAt || (isExp ? new Date(new Date(o.createdAt).getTime() + 6 * 3600 * 1000).toISOString() : new Date().toISOString());

        timeline.push({
          step: "CANCELLED",
          title: "Pesanan Dibatalkan",
          description: `Dibatalkan oleh ${actor === "MERCHANT" ? "Penjual" : actor === "CUSTOMER" ? "Pelanggan" : "Sistem"}. Alasan: ${reason}`,
          timestamp,
          isCompleted: true,
        });
      }

      if (isExp && o.status !== "CANCELLED") {
        return {
          ...o,
          status: "CANCELLED" as const,
          paymentStatus: "EXPIRED" as const,
          cancelledBy: "SYSTEM" as const,
          cancellationReason: "Belum menyelesaikan pembayaran",
          cancellationDetails: {
            reason: "Belum menyelesaikan pembayaran",
            actor: "SISTEM",
          },
          timeline,
        };
      }
      return {
        ...o,
        timeline,
      };
    });

    return {
      BELUM_BAYAR: normalized.filter(
        (o) => (o.status === "CREATED" || o.status === "PAYMENT_PENDING") && !isOrderExpired(o)
      ),
      DIPROSES: normalized.filter(
        (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PACKED"
      ),
      DIKIRIM: normalized.filter(
        (o) => o.status === "DELIVERING"
      ),
      TIBA: normalized.filter((o) => o.status === "DELIVERED"),
      SELESAI: normalized.filter((o) => o.status === "COMPLETED"),
      BATAL: normalized.filter((o) => o.status === "CANCELLED" || isOrderExpired(o)),
    };
  }, [customerOrders, isOrderExpired]);

  // Merchant orders (including unpaid/pending orders)
  const merchantOrders = useMemo(() => {
    return backendMerchantOrders;
  }, [backendMerchantOrders]);

  const merchantOrdersByTab = useMemo(() => {
    const normalized = merchantOrders.map((o) => {
      const isExp = isOrderExpired(o);
      const isCancelled = o.status === "CANCELLED" || isExp;
      let timeline = Array.isArray(o.timeline) && o.timeline.length > 0 ? [...o.timeline] : [
        {
          step: "CREATED",
          title: "Pesanan Dibuat",
          description: "Pesanan berhasil dibuat dalam sistem.",
          timestamp: o.createdAt,
          isCompleted: true,
        },
      ];

      const isUnpaidOrder = o.status === "CREATED" || o.status === "PAYMENT_PENDING" || (o.status as string) === "PENDING" || isExp || (isCancelled && !o.paidAt);
      if (isUnpaidOrder && !timeline.some((t) => t.step === "PAYMENT_PENDING")) {
        timeline.splice(1, 0, {
          step: "PAYMENT_PENDING",
          title: "Menunggu Pembayaran",
          description: "Batas waktu pembayaran 6 jam sejak pesanan dibuat.",
          timestamp: o.createdAt,
          isCompleted: true,
        });
      }

      if (isCancelled && !timeline.some((t) => t.step === "CANCELLED" || t.title.toLowerCase().includes("batal"))) {
        const actor = o.cancelledBy || o.cancellationDetails?.actor || (isExp ? "SISTEM" : "Sistem");
        const reason = o.cancellationReason || o.cancellationDetails?.reason || (isExp ? "Belum menyelesaikan pembayaran" : "Pembatalan transaksi");
        const timestamp = o.cancelledAt || (isExp ? new Date(new Date(o.createdAt).getTime() + 6 * 3600 * 1000).toISOString() : new Date().toISOString());

        timeline.push({
          step: "CANCELLED",
          title: "Pesanan Dibatalkan",
          description: `Dibatalkan oleh ${actor === "MERCHANT" ? "Penjual" : actor === "CUSTOMER" ? "Pelanggan" : "Sistem"}. Alasan: ${reason}`,
          timestamp,
          isCompleted: true,
        });
      }

      if (isExp && o.status !== "CANCELLED") {
        return {
          ...o,
          status: "CANCELLED" as const,
          paymentStatus: "EXPIRED" as const,
          cancelledBy: "SYSTEM" as const,
          cancellationReason: "Belum menyelesaikan pembayaran",
          cancellationDetails: {
            reason: "Belum menyelesaikan pembayaran",
            actor: "SISTEM",
          },
          timeline,
        };
      }
      return {
        ...o,
        timeline,
      };
    });

    return {
      BELUM_BAYAR: normalized.filter(
        (o) =>
          (o.status === "CREATED" ||
          o.status === "PAYMENT_PENDING" ||
          (o.status as string) === "PENDING") &&
          !isOrderExpired(o)
      ),
      MASUK: normalized.filter((o) => o.status === "CONFIRMED"),
      DIPROSES: normalized.filter(
        (o) => o.status === "PROCESSING" || o.status === "PACKED"
      ),
      DIKIRIM: normalized.filter(
        (o) => o.status === "DELIVERING"
      ),
      TIBA: normalized.filter((o) => o.status === "DELIVERED"),
      SELESAI: normalized.filter((o) => o.status === "COMPLETED"),
      BATAL: normalized.filter((o) => o.status === "CANCELLED" || isOrderExpired(o)),
    };
  }, [merchantOrders, isOrderExpired]);

  // Helper for instant 0ms optimistic order updates across tabs & views
  const updateOrderOptimistic = useCallback(
    (orderId: string, updater: (prev: MockMerchantOrder) => MockMerchantOrder) => {
      const isTarget = (ord: MockMerchantOrder) => {
        if (!orderId) return false;
        const targetClean = String(orderId).trim().replace(/^#/, "");
        const idClean = String(ord.id || "").trim().replace(/^#/, "");
        const numClean = String(ord.orderNumber || "").trim().replace(/^#/, "");
        const ordNumClean = String((ord as any).order_number || "").trim().replace(/^#/, "");
        const checkoutClean = String(ord.checkoutGroupId || "").trim().replace(/^#/, "");
        return (
          idClean === targetClean ||
          numClean === targetClean ||
          ordNumClean === targetClean ||
          checkoutClean === targetClean
        );
      };

      setBackendMerchantOrders((prev) => {
        const next = prev.map((ord) => (isTarget(ord) ? updater(ord) : ord));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_MERCH_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setBackendCustomerOrders((prev) => {
        const next = prev.map((ord) => (isTarget(ord) ? updater(ord) : ord));
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_CUST_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setTick((t) => t + 1);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("servio-orders-updated", { detail: { orderId } })
        );
      }
    },
    []
  );

  // Sync event listener across components and pages
  useEffect(() => {
    const handleCustomUpdate = () => {
      if (typeof window !== "undefined") {
        try {
          const cachedMerch = localStorage.getItem(CACHE_KEY_MERCH_ORDERS);
          if (cachedMerch) {
            const parsed = JSON.parse(cachedMerch);
            if (Array.isArray(parsed)) setBackendMerchantOrders(parsed);
          }
          const cachedCust = localStorage.getItem(CACHE_KEY_CUST_ORDERS);
          if (cachedCust) {
            const parsed = JSON.parse(cachedCust);
            if (Array.isArray(parsed)) setBackendCustomerOrders(parsed);
          }
        } catch {}
      }
      setTick((t) => t + 1);
    };

    window.addEventListener("servio-orders-updated", handleCustomUpdate);
    window.addEventListener("storage", handleCustomUpdate);
    return () => {
      window.removeEventListener("servio-orders-updated", handleCustomUpdate);
      window.removeEventListener("storage", handleCustomUpdate);
    };
  }, []);

  // Real backend mutations with instantaneous optimistic state updates
  const merchantProcessOrder = useCallback(
    async (orderId: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "PROCESSING")) {
          timeline.push({
            step: "PROCESSING",
            title: "Sedang Disiapkan Toko",
            description: "Toko sedang menyiapkan barang pesanan.",
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "PROCESSING" as const,
          processedAt: now,
          updatedAt: now,
          timeline,
        };
      });

      try {
        await orderBarangApi.merchant.processOrder(orderId);
      } catch (err) {
        console.warn("Backend merchant.processOrder error (fallback to local state):", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const merchantPackOrder = useCallback(
    async (orderId: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "PACKED")) {
          timeline.push({
            step: "PACKED",
            title: "Siap Dikirim",
            description: "Pesanan telah dikemas rapi dan siap diserahkan ke kurir.",
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "PACKED" as const,
          packedAt: now,
          updatedAt: now,
          delivery: {
            ...ord.delivery,
            status: "READY_FOR_DELIVERY" as const,
            deliveryStatus: "READY_FOR_DELIVERY" as const,
          },
          timeline,
        };
      });

      try {
        await orderBarangApi.merchant.packOrder(orderId);
      } catch (err) {
        console.warn("Backend merchant.packOrder error (fallback to local state):", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const merchantSetupDelivery = useCallback(
    async (
      orderId: string,
      params: {
        courierMethod?: MockDeliveryMethod;
        provider?: MockDeliveryProvider;
        courierName?: string;
        courierPhone?: string;
        trackingReference?: string;
        trackingUrl?: string;
        deliveryNotes?: string;
      }
    ) => {
      const method = params.provider === "GOSEND" ? "GOSEND" : "KURIR_TOKO";
      const now = new Date().toISOString();

      updateOrderOptimistic(orderId, (ord) => {
        return {
          ...ord,
          delivery: {
            ...ord.delivery,
            method: params.provider === "GOSEND" ? "THIRD_PARTY" : "MERCHANT_DELIVERY",
            provider: params.provider || (method === "GOSEND" ? "GOSEND" : "MERCHANT"),
            courierMethod: method,
            courierName: params.courierName || (method === "GOSEND" ? "GoSend Instant" : "Kurir Toko Internal"),
            courierPhone: params.courierPhone,
            trackingNumber: params.trackingReference,
            trackingReference: params.trackingReference,
            trackingUrl: params.trackingUrl,
            notes: params.deliveryNotes,
          },
        };
      });

      try {
        await orderBarangApi.merchant.updateDelivery(orderId, {
          courier_method: method as any,
          courier_name: params.courierName,
          courier_phone: params.courierPhone,
          booking_reference: params.trackingReference,
          tracking_url: params.trackingUrl,
        });
      } catch (err) {
        console.warn("Backend merchant.updateDelivery error:", err);
      }
    },
    [updateOrderOptimistic]
  );

  const merchantStartDelivery = useCallback(
    async (orderId: string, proofUrl?: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "DELIVERING")) {
          timeline.push({
            step: "DELIVERING",
            title: "Dalam Pengiriman",
            description: ord.delivery?.trackingReference
              ? `Kurir mengantar paket (Ref/Resi: ${ord.delivery.trackingReference})`
              : "Kurir sedang mengantarkan paket ke alamat tujuan.",
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "DELIVERING" as const,
          dispatchedAt: now,
          updatedAt: now,
          delivery: {
            ...ord.delivery,
            status: "IN_TRANSIT" as const,
            deliveryStatus: "IN_TRANSIT" as const,
            pickupAt: now,
            failureReason: undefined,
          },
          timeline,
        };
      });

      try {
        await orderBarangApi.merchant.dispatchOrder(orderId, { proof_of_pickup: proofUrl });
      } catch (err) {
        console.warn("Backend merchant.dispatchOrder error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const merchantConfirmDelivered = useCallback(
    async (
      orderId: string,
      recipientName: string,
      proofTypeOrUrl: string,
      notes?: string,
      photoUrl?: string
    ) => {
      const now = new Date().toISOString();
      const actualProofType = notes !== undefined ? proofTypeOrUrl : "Foto Serah Terima Paket";
      const actualNotes = notes || "Paket diterima dalam kondisi baik";
      const actualPhotoUrl = photoUrl || (proofTypeOrUrl.startsWith("data:image") || proofTypeOrUrl.startsWith("http") ? proofTypeOrUrl : undefined);

      const serializedProof = JSON.stringify({
        proof_type: actualProofType,
        notes: actualNotes,
        photo_url: actualPhotoUrl,
      });

      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "DELIVERED")) {
          timeline.push({
            step: "DELIVERED",
            title: "Tiba di Tujuan",
            description: `Barang telah diterima oleh ${recipientName || ord.shippingAddressSnapshot.recipientName}.`,
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "DELIVERED" as const,
          deliveredAt: now,
          updatedAt: now,
          delivery: {
            ...ord.delivery,
            status: "DELIVERED" as const,
            deliveryStatus: "DELIVERED" as const,
            deliveredAt: now,
            deliveredToName: recipientName,
            recipientReceivedBy: recipientName,
            proofType: actualProofType,
            deliveredNotes: actualNotes,
            proofPhotoUrl: actualPhotoUrl,
            failureReason: undefined,
          },
          timeline,
        };
      });

      try {
        await orderBarangApi.merchant.markDelivered(orderId, {
          recipient_name: recipientName,
          proof_reference: serializedProof,
        });
      } catch (err) {
        console.warn("Backend merchant.markDelivered error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const merchantMarkDeliveryFailed = useCallback(
    async (orderId: string, reason: string, notes?: string) => {
      updateOrderOptimistic(orderId, (ord) => {
        return {
          ...ord,
          delivery: {
            ...ord.delivery,
            status: "FAILED" as const,
            deliveryStatus: "FAILED" as const,
            failureReason: reason,
            notes,
          },
        };
      });

      try {
        await orderBarangApi.merchant.reportDeliveryFailure(orderId, {
          failure_reason_code: reason,
          note: notes,
        });
      } catch (err) {
        console.warn("Backend merchant.reportDeliveryFailure error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const merchantRetryDelivery = useCallback(
    async (orderId: string, courierMethod?: string, notes?: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        return {
          ...ord,
          delivery: {
            ...ord.delivery,
            status: "IN_TRANSIT" as const,
            deliveryStatus: "IN_TRANSIT" as const,
            failureReason: undefined,
            notes,
          },
        };
      });

      try {
        await orderBarangApi.merchant.deliveryRetry(orderId, {
          courier_method: courierMethod,
          note: notes,
        });
      } catch (err) {
        console.warn("Backend merchant.deliveryRetry error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const cancelOperationalMerchantOrder = useCallback(
    async (orderId: string, reason: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "CANCELLED")) {
          timeline.push({
            step: "CANCELLED",
            title: "Pesanan Dibatalkan",
            description: `Dibatalkan oleh Penjual. Alasan: ${reason}`,
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "CANCELLED" as const,
          cancelledAt: now,
          cancelledBy: "MERCHANT" as const,
          cancellationReason: reason,
          cancellationDetails: {
            actor: "MERCHANT",
            reason,
          },
          refund: {
            status: "PROCESSING" as const,
            amount: ord.totalAmount,
          },
          timeline,
        };
      });

      try {
        await orderBarangApi.merchant.cancelOrder(orderId, {
          reason_code: reason,
        });
      } catch (err) {
        console.warn("Backend merchant.cancelOrder error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const respondCancellation = useCallback(
    async (requestId: string, decision: "APPROVED" | "REJECTED", reason?: string) => {
      const now = new Date().toISOString();
      const cleanReq = String(requestId || "").trim().replace(/^#/, "");
      const isTarget = (ord: MockMerchantOrder) => {
        const reqId = String(ord.cancellationRequest?.id || "").trim().replace(/^#/, "");
        const ordId = String(ord.id || "").trim().replace(/^#/, "");
        const ordNum = String(ord.orderNumber || "").trim().replace(/^#/, "");
        return reqId === cleanReq || ordId === cleanReq || ordNum === cleanReq;
      };

      const updater = (ord: MockMerchantOrder) => {
        if (!isTarget(ord)) return ord;
        if (decision === "APPROVED") {
          const timeline = [...(ord.timeline || [])];
          timeline.push({
            step: "CANCELLED",
            title: "Pesanan Dibatalkan",
            description: `Pengajuan pembatalan disetujui oleh Penjual. ${reason || ""}`,
            timestamp: now,
            isCompleted: true,
          });
          return {
            ...ord,
            status: "CANCELLED" as const,
            cancelledAt: now,
            cancelledBy: "CUSTOMER" as const,
            cancellationReason: ord.cancellationRequest?.reason || "Disetujui Penjual",
            cancellationDetails: {
              actor: "CUSTOMER",
              reason: ord.cancellationRequest?.reason || "Disetujui Penjual",
            },
            cancellationRequest: ord.cancellationRequest
              ? { ...ord.cancellationRequest, status: "APPROVED" as const, decidedAt: now }
              : undefined,
            refund: {
              status: "PROCESSING" as const,
              amount: ord.totalAmount,
            },
            timeline,
          };
        } else {
          return {
            ...ord,
            cancellationRequest: ord.cancellationRequest
              ? {
                  ...ord.cancellationRequest,
                  status: "REJECTED" as const,
                  decidedAt: now,
                  rejectionReason: reason,
                }
              : undefined,
          };
        }
      };

      setBackendMerchantOrders((prev) => {
        const next = prev.map(updater);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_MERCH_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setBackendCustomerOrders((prev) => {
        const next = prev.map(updater);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_CUST_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setTick((t) => t + 1);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("servio-orders-updated", { detail: { orderId: requestId } })
        );
      }

      try {
        await orderBarangApi.merchant.decideCancellationRequest(requestId, {
          decision,
          reason_code: reason,
        });
      } catch (err) {
        console.warn("Backend decideCancellationRequest error:", err);
      }
      syncBackendOrders(true);
    },
    [syncBackendOrders]
  );

  const cancelUnpaidCheckoutGroup = useCallback(
    async (checkoutGroupId: string, reason: string) => {
      const now = new Date().toISOString();
      const cleanTarget = String(checkoutGroupId || "").trim().replace(/^#/, "");
      const isTarget = (ord: MockMerchantOrder) => {
        const grp = String(ord.checkoutGroupId || "").trim().replace(/^#/, "");
        const ordId = String(ord.id || "").trim().replace(/^#/, "");
        const ordNum = String(ord.orderNumber || "").trim().replace(/^#/, "");
        return grp === cleanTarget || ordId === cleanTarget || ordNum === cleanTarget;
      };

      const updater = (ord: MockMerchantOrder) => {
        if (isTarget(ord)) {
          const timeline = [...(ord.timeline || [])];
          if (!timeline.some((t) => t.step === "CANCELLED")) {
            timeline.push({
              step: "CANCELLED",
              title: "Pesanan Dibatalkan",
              description: `Dibatalkan oleh Pelanggan. Alasan: ${reason}`,
              timestamp: now,
              isCompleted: true,
            });
          }
          return {
            ...ord,
            status: "CANCELLED" as const,
            cancelledAt: now,
            cancelledBy: "CUSTOMER" as const,
            cancellationReason: reason,
            cancellationDetails: {
              actor: "CUSTOMER",
              reason,
            },
            timeline,
          };
        }
        return ord;
      };

      setBackendCustomerOrders((prev) => {
        const next = prev.map(updater);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_CUST_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setBackendMerchantOrders((prev) => {
        const next = prev.map(updater);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CACHE_KEY_MERCH_ORDERS, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      setTick((t) => t + 1);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("servio-orders-updated", { detail: { orderId: checkoutGroupId } })
        );
      }

      try {
        await orderBarangApi.customer.cancelUnpaidCheckout(checkoutGroupId, reason);
      } catch (err) {
        console.warn("Backend cancelUnpaidCheckout error:", err);
      }
      syncBackendOrders(true);
    },
    [syncBackendOrders]
  );

  const cancelConfirmedMerchantOrder = useCallback(
    async (orderId: string, reason: string, note?: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "CANCELLED")) {
          timeline.push({
            step: "CANCELLED",
            title: "Pesanan Dibatalkan",
            description: `Dibatalkan langsung oleh Pelanggan sebelum diproses. Alasan: ${reason}`,
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "CANCELLED" as const,
          cancelledAt: now,
          cancelledBy: "CUSTOMER" as const,
          cancellationReason: reason,
          cancellationDetails: {
            actor: "CUSTOMER",
            reason,
          },
          refund: {
            status: "PROCESSING" as const,
            amount: ord.totalAmount,
          },
          timeline,
        };
      });

      try {
        await orderBarangApi.customer.cancelConfirmedDirect(orderId, reason, note);
      } catch (err) {
        console.warn("Backend cancelConfirmedDirect error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const requestCancellation = useCallback(
    async (orderId: string, reason: string, note?: string) => {
      const now = new Date().toISOString();
      const deadline = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        return {
          ...ord,
          cancellationRequest: {
            id: `req-${Date.now()}`,
            orderId,
            requestedAt: now,
            responseDeadlineAt: deadline,
            reason,
            note,
            status: "PENDING" as const,
          },
        };
      });

      try {
        await orderBarangApi.customer.requestCancellation(orderId, reason, note);
      } catch (err) {
        console.warn("Backend requestCancellation error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  const customerConfirmDelivered = useCallback(
    async (orderId: string) => {
      const now = new Date().toISOString();
      updateOrderOptimistic(orderId, (ord) => {
        const timeline = [...(ord.timeline || [])];
        if (!timeline.some((t) => t.step === "COMPLETED")) {
          timeline.push({
            step: "COMPLETED",
            title: "Pesanan Selesai",
            description: "Dikonfirmasi selesai oleh Pelanggan.",
            timestamp: now,
            isCompleted: true,
          });
        }
        return {
          ...ord,
          status: "COMPLETED" as const,
          completedAt: now,
          updatedAt: now,
          completionSource: "CUSTOMER_CONFIRMATION" as const,
          timeline,
        };
      });

      try {
        await orderBarangApi.customer.confirmReceived(orderId);
      } catch (err) {
        console.warn("Backend confirmReceived error:", err);
      }
      syncBackendOrders(true);
    },
    [updateOrderOptimistic, syncBackendOrders]
  );

  return {
    orders: customerOrders,
    customerOrders,
    customerOrdersByTab,
    merchantOrders,
    merchantOrdersByTab,
    checkoutGroups,
    activeMerchant,
    activeMerchantId,
    merchants: MOCK_MERCHANTS,
    switchMerchantContext,
    currentTime,
    isLoadingBackend,
    hasLoadedBackend,
    syncBackendOrders,
    refreshOrders: syncBackendOrders,

    // Merchant mutations
    merchantProcessOrder,
    merchantPackOrder,
    merchantSetupDelivery,
    merchantStartDelivery,
    merchantConfirmDelivered,
    merchantMarkDeliveryFailed,
    merchantRetryDelivery,
    cancelOperationalMerchantOrder,
    respondCancellation,

    // Customer mutations
    cancelUnpaidCheckoutGroup,
    cancelConfirmedMerchantOrder,
    requestCancellation,
    customerConfirmDelivered,

    // Shipping settings
    getShippingSettings: (id: string) => orderBarangStore.getShippingSettings(id),
    updateShippingSettings: (id: string, s: MockShippingSettings) =>
      orderBarangStore.updateShippingSettings(id, s),
  };
}
