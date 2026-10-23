"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { orderBarangStore } from "../orderBarangStore";
import {
  MockMerchantOrder,
  MockCheckoutGroup,
  MockShippingSettings,
  MockDeliveryMethod,
  MockDeliveryProvider,
} from "@/types/order-barang";

export interface MockMerchantOption {
  id: string;
  name: string;
  city: string;
  address: string;
}

export const MOCK_MERCHANTS: MockMerchantOption[] = [
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
  {
    id: "merch-prima-parts",
    name: "Prima Spareparts & Tools",
    city: "Jakarta Selatan",
    address: "Ruko Grand Wijaya Center C-12, Kebayoran Baru, Jakarta Selatan",
  },
];

export function useOrderBarang() {
  // Local state triggered by store subscribers
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = orderBarangStore.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const orders = useMemo(() => orderBarangStore.getOrders(), []);
  const checkoutGroups = useMemo(() => orderBarangStore.getCheckoutGroups(), []);
  const activeMerchantId = orderBarangStore.getActiveMerchantId();
  const activeMerchant = useMemo(
    () => MOCK_MERCHANTS.find((m) => m.id === activeMerchantId) || MOCK_MERCHANTS[0],
    [activeMerchantId]
  );
  const currentTime = orderBarangStore.getNow();
  const timeOffsetMinutes = orderBarangStore.getTimeOffsetMinutes();

  // Customer orders (all customer perspective)
  const customerOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  const customerOrdersByTab = useMemo(() => {
    return {
      BELUM_BAYAR: customerOrders.filter(
        (o) => o.status === "CREATED" || o.status === "PAYMENT_PENDING"
      ),
      DIPROSES: customerOrders.filter(
        (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PACKED"
      ),
      DIKIRIM: customerOrders.filter(
        (o) => o.status === "DELIVERING" || o.status === "DELIVERED"
      ),
      SELESAI: customerOrders.filter((o) => o.status === "COMPLETED"),
      BATAL: customerOrders.filter((o) => o.status === "CANCELLED"),
    };
  }, [customerOrders]);

  // Merchant orders scoped strictly to activeMerchantId
  // Section 13: CREATED and PAYMENT_PENDING must NOT be visible to Merchant!
  const merchantOrders = useMemo(() => {
    return orders
      .filter((o) => o.merchantId === activeMerchantId)
      .filter((o) => o.status !== "CREATED" && o.status !== "PAYMENT_PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, activeMerchantId]);

  const merchantOrdersByTab = useMemo(() => {
    return {
      MASUK: merchantOrders.filter((o) => o.status === "CONFIRMED"),
      DIPROSES: merchantOrders.filter(
        (o) => o.status === "PROCESSING" || o.status === "PACKED"
      ),
      DIKIRIM: merchantOrders.filter(
        (o) => o.status === "DELIVERING" || o.status === "DELIVERED"
      ),
      SELESAI: merchantOrders.filter((o) => o.status === "COMPLETED"),
      BATAL: merchantOrders.filter((o) => o.status === "CANCELLED"),
    };
  }, [merchantOrders]);

  // Actions
  const switchMerchantContext = useCallback((merchantId: string) => {
    orderBarangStore.setActiveMerchantId(merchantId);
  }, []);

  const getShippingSettings = useCallback((merchantId: string) => {
    return orderBarangStore.getShippingSettings(merchantId);
  }, []);

  const updateShippingSettings = useCallback(
    (merchantId: string, settings: MockShippingSettings) => {
      orderBarangStore.updateShippingSettings(merchantId, settings);
    },
    []
  );

  const createCheckoutGroup = useCallback(
    (payload: Parameters<typeof orderBarangStore.createCheckoutGroup>[0]) => {
      return orderBarangStore.createCheckoutGroup(payload);
    },
    []
  );

  const simulatePaymentSuccess = useCallback((checkoutGroupId: string) => {
    orderBarangStore.simulatePaymentSuccess(checkoutGroupId);
  }, []);

  const simulatePaymentFailed = useCallback((checkoutGroupId: string) => {
    orderBarangStore.simulatePaymentFailed(checkoutGroupId);
  }, []);

  const simulatePaymentExpired = useCallback((checkoutGroupId: string) => {
    orderBarangStore.simulatePaymentExpired(checkoutGroupId);
  }, []);

  const cancelUnpaidCheckoutGroup = useCallback(
    (checkoutGroupId: string, reason?: string) => {
      orderBarangStore.cancelUnpaidCheckout(
        checkoutGroupId,
        reason || "Dibatalkan pembeli sebelum pembayaran"
      );
    },
    []
  );

  const cancelConfirmedMerchantOrder = useCallback(
    (orderId: string, reason: string) => {
      orderBarangStore.cancelConfirmedOrder(orderId, reason);
    },
    []
  );

  const requestCancellation = useCallback(
    (orderId: string, reason: string, note?: string) => {
      orderBarangStore.requestOrderCancellation(orderId, reason, note);
    },
    []
  );

  const customerConfirmDelivered = useCallback((orderId: string) => {
    orderBarangStore.customerConfirmReceived(orderId);
  }, []);

  const merchantProcessOrder = useCallback((orderId: string) => {
    orderBarangStore.merchantStartProcessing(orderId);
  }, []);

  const merchantPackOrder = useCallback((orderId: string) => {
    return orderBarangStore.merchantMarkPacked(orderId);
  }, []);

  const merchantSetupDelivery = useCallback(
    (
      orderId: string,
      payload: {
        method: MockDeliveryMethod;
        provider: MockDeliveryProvider;
        courierName?: string;
        courierPhone?: string;
        bookingReference?: string;
        trackingUrl?: string;
        deliveryNote?: string;
      }
    ) => {
      orderBarangStore.merchantSetupDelivery(orderId, payload);
    },
    []
  );

  const merchantStartDelivery = useCallback((orderId: string) => {
    orderBarangStore.merchantStartDelivery(orderId);
  }, []);

  const merchantMarkDeliveryFailed = useCallback(
    (orderId: string, reason: string) => {
      orderBarangStore.merchantMarkDeliveryFailed(orderId, reason);
    },
    []
  );

  const merchantRetryDelivery = useCallback((orderId: string) => {
    orderBarangStore.merchantRetryDelivery(orderId);
  }, []);

  const merchantConfirmDelivered = useCallback(
    (
      orderId: string,
      payload: {
        deliveredToName?: string;
        receivedBy?: string;
        notes?: string;
        note?: string;
        proofPhotoUrl?: string;
        evidencePhoto?: string;
        proofType?: string;
      }
    ) => {
      orderBarangStore.merchantConfirmDelivered(orderId, {
        deliveredToName: payload.deliveredToName || payload.receivedBy || "Penerima",
        notes: payload.notes || payload.note,
        proofPhotoUrl: payload.proofPhotoUrl || payload.evidencePhoto,
        proofType: payload.proofType || "PHOTO",
      });
    },
    []
  );

  const respondCancellation = useCallback(
    (orderId: string, decision: "APPROVE" | "REJECT", reason?: string) => {
      if (decision === "APPROVE") {
        orderBarangStore.merchantApproveCancellation(orderId);
      } else {
        orderBarangStore.merchantRejectCancellation(
          orderId,
          reason || "Operasional pengemasan telah selesai dipersiapkan"
        );
      }
    },
    []
  );

  const cancelOperationalMerchantOrder = useCallback(
    (orderId: string, reason: string) => {
      orderBarangStore.merchantCancelOperational(orderId, reason);
    },
    []
  );

  const advanceMockMinutes = useCallback((minutes: number) => {
    orderBarangStore.advanceMockMinutes(minutes);
  }, []);

  const resetDemoData = useCallback(() => {
    orderBarangStore.resetDemoData();
  }, []);

  return {
    orders,
    customerOrders,
    customerOrdersByTab,
    checkoutGroups,
    activeMerchantId,
    activeMerchant,
    merchantOrders,
    merchantOrdersByTab,
    merchants: MOCK_MERCHANTS,
    currentTime,
    timeOffsetMinutes,

    // Methods
    switchMerchantContext,
    getShippingSettings,
    updateShippingSettings,
    createCheckoutGroup,
    simulatePaymentSuccess,
    simulatePaymentFailed,
    simulatePaymentExpired,
    cancelUnpaidCheckoutGroup,
    cancelConfirmedMerchantOrder,
    requestCancellation,
    customerConfirmDelivered,
    merchantProcessOrder,
    merchantPackOrder,
    merchantSetupDelivery,
    merchantStartDelivery,
    merchantMarkDeliveryFailed,
    merchantRetryDelivery,
    merchantConfirmDelivered,
    respondCancellation,
    cancelOperationalMerchantOrder,
    advanceMockMinutes,
    resetDemoData,
  };
}
