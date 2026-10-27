"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CartStoreGroup } from "@/types/domain";
import { profileApi, financeApi, ApiAddress } from "@/lib/servioApi";
import {
  orderBarangApi,
  CheckoutQuoteResponse,
  MerchantQuoteBreakdown,
  CheckoutCreatedResponse,
  CustomerFeePolicyInfo,
} from "@/lib/orderBarangApi";

export interface DeliveryAddressForm {
  id?: string;
  label?: string;
  recipientName: string;
  phone: string;
  street: string;
  village?: string;
  district?: string;
  city: string;
  province?: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

export function useProductCheckout(
  cartGroups: CartStoreGroup[] = [],
  selectedItemIds: string[] = []
) {
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>({
    label: "Rumah Utama",
    recipientName: "Ahmad Pratama",
    phone: "0812-9988-1122",
    street: "Gedung BEI Tower 2 Lt. 14, Jl. Jend. Sudirman Kav. 52-53",
    village: "Senayan",
    district: "Kebayoran Baru",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12190",
    latitude: -6.2235,
    longitude: 106.8088,
    isDefault: true,
  });

  const [merchantNotes, setMerchantNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [dependencyBlockMessage, setDependencyBlockMessage] = useState<string | null>(null);

  // Authoritative quote from 05A backend
  const [serverQuote, setServerQuote] = useState<CheckoutQuoteResponse | null>(null);

  // Active customer fee policy from CEO Platform Policies (Modul 06 Finance)
  const [activeFeePolicy, setActiveFeePolicy] = useState<CustomerFeePolicyInfo | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchActiveFeePolicy() {
      try {
        const res = await financeApi.policies.getActiveCustomerFee();
        if (res && res.data && isMounted) {
          setActiveFeePolicy(res.data);
        }
      } catch (err) {
        console.warn("Could not load active customer fee policy directly:", err);
      }
    }
    fetchActiveFeePolicy();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (serverQuote?.customer_fee_policy) {
      setActiveFeePolicy(serverQuote.customer_fee_policy);
    }
  }, [serverQuote]);

  // Map any productId, composite, or cartItemId to backend CartItem IDs
  const resolvedCartItemIds = useMemo(() => {
    if (!selectedItemIds || selectedItemIds.length === 0) return [];
    const list: string[] = [];
    cartGroups.forEach((g) => {
      g.items.forEach((it) => {
        const isSelected =
          (it.cartItemId && selectedItemIds.includes(it.cartItemId)) ||
          (it.productId && selectedItemIds.includes(it.productId)) ||
          (it.productId && it.variantId && selectedItemIds.includes(`${it.productId}_${it.variantId}`));
        if (isSelected && it.cartItemId && !list.includes(it.cartItemId)) {
          list.push(it.cartItemId);
        }
      });
    });
    return list.length > 0 ? list : selectedItemIds;
  }, [cartGroups, selectedItemIds]);

  // Load customer authoritative addresses from Identity Service
  useEffect(() => {
    let isMounted = true;
    async function fetchUserAddresses() {
      setIsLoadingAddresses(true);
      try {
        const res = await profileApi.getAddresses();
        const addrs = (res.data as ApiAddress[]) || [];
        if (addrs.length > 0 && isMounted) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(defaultAddr.id);
          setDeliveryAddress({
            id: defaultAddr.id,
            label: defaultAddr.label || "Rumah",
            recipientName: defaultAddr.recipientName || "Ahmad Pratama",
            phone: defaultAddr.phone || "0812-9988-1122",
            street: defaultAddr.addressLine,
            village: defaultAddr.village || "",
            district: defaultAddr.district || "",
            city: defaultAddr.city || "Jakarta Selatan",
            province: defaultAddr.province || "",
            postalCode: defaultAddr.postalCode || "12190",
            latitude: defaultAddr.latitude,
            longitude: defaultAddr.longitude,
            isDefault: defaultAddr.isDefault,
          });
        } else if (isMounted) {
          // If no address registered in Identity Service
          setSelectedAddressId("addr-default-1");
        }
      } catch (err) {
        console.warn("Could not load user addresses, using fallback:", err);
        if (isMounted) setSelectedAddressId("addr-default-1");
      } finally {
        if (isMounted) setIsLoadingAddresses(false);
      }
    }
    fetchUserAddresses();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectSavedAddress = useCallback((addr: ApiAddress) => {
    setSelectedAddressId(addr.id);
    setDeliveryAddress({
      id: addr.id,
      label: addr.label || "Rumah",
      recipientName: addr.recipientName || "Pelanggan",
      phone: addr.phone || "0812-9988-1122",
      street: addr.addressLine,
      village: addr.village || "",
      district: addr.district || "",
      city: addr.city || "Jakarta Selatan",
      province: addr.province || "",
      postalCode: addr.postalCode || "12190",
      latitude: addr.latitude,
      longitude: addr.longitude,
      isDefault: addr.isDefault,
    });
  }, []);

  // Update note for specific merchant
  const setMerchantNote = useCallback((merchantId: string, note: string) => {
    setMerchantNotes((prev) => ({
      ...prev,
      [merchantId]: note,
    }));
  }, []);

  // Authoritative quote request from order-barang backend
  const refreshQuote = useCallback(async () => {
    if (!selectedAddressId || selectedItemIds.length === 0) return;

    setIsLoadingQuote(true);
    setQuoteError(null);
    setDependencyBlockMessage(null);

    try {
      const payload: {
        address_id: string;
        cart_item_ids?: string[];
        merchant_notes?: Record<string, string>;
      } = {
        address_id: selectedAddressId,
        merchant_notes: merchantNotes,
      };

      if (resolvedCartItemIds && resolvedCartItemIds.length > 0) {
        payload.cart_item_ids = resolvedCartItemIds;
      }

      const res = await orderBarangApi.customer.previewQuote(payload);
      if (res.data) {
        setServerQuote(res.data);
      }
    } catch (err: any) {
      const msg = err?.message || "Gagal menghitung tarif pengiriman dan rincian checkout.";
      if (
        msg.includes("PENDING_PRODUCT_CONTRACT") ||
        err?.code === "PENDING_PRODUCT_CONTRACT" ||
        msg.includes("reservasi stok")
      ) {
        setDependencyBlockMessage(
          "Reservasi stok katalog eksternal belum tersedia (PENDING_PRODUCT_CONTRACT). Pembayaran ditahan demi integritas data pesanan."
        );
      } else {
        setQuoteError(msg);
      }
    } finally {
      setIsLoadingQuote(false);
    }
  }, [selectedAddressId, selectedItemIds, resolvedCartItemIds, merchantNotes]);

  useEffect(() => {
    if (selectedAddressId) {
      refreshQuote();
    }
  }, [selectedAddressId, refreshQuote]);

  // Fallback estimates if backend quote is loading
  const rawSubtotal = useMemo(() => {
    return cartGroups.reduce((acc, g) => {
      const activeItems = g.items.filter((it) => {
        if (!selectedItemIds || selectedItemIds.length === 0) return false;
        return (
          (it.cartItemId && selectedItemIds.includes(it.cartItemId)) ||
          (it.productId && selectedItemIds.includes(it.productId)) ||
          (it.productId && it.variantId && selectedItemIds.includes(`${it.productId}_${it.variantId}`))
        );
      });
      return acc + activeItems.reduce((s, it) => s + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity, 0);
    }, 0);
  }, [cartGroups, selectedItemIds]);

  const itemsSubtotal = serverQuote
    ? (serverQuote.total_products_subtotal_idr ?? (serverQuote as any).product_subtotal_idr ?? rawSubtotal)
    : rawSubtotal;
  const shippingCost = serverQuote
    ? (serverQuote.total_shipping_fee_idr ?? (serverQuote as any).shipping_total_idr ?? 0)
    : 0;

  const effectiveFeePolicy = serverQuote?.customer_fee_policy || activeFeePolicy;

  const customerAppFee = useMemo(() => {
    if (serverQuote?.customer_app_fee_idr !== undefined && serverQuote.customer_app_fee_idr !== null) {
      return serverQuote.customer_app_fee_idr;
    }
    if (effectiveFeePolicy) {
      if (effectiveFeePolicy.fee_type === "FIXED") {
        return effectiveFeePolicy.fixed_amount_idr ?? 0;
      }
      if (effectiveFeePolicy.fee_type === "PERCENTAGE") {
        const rate = effectiveFeePolicy.percentage_rate ?? 0;
        return Math.round((itemsSubtotal * rate) / 100);
      }
    }
    return 2500;
  }, [serverQuote, effectiveFeePolicy, itemsSubtotal]);

  const feePolicyName = effectiveFeePolicy?.policy_name || "Biaya Layanan Aplikasi";
  const taxAmount = serverQuote ? (serverQuote.tax_idr ?? 0) : 0;
  const grandTotal = serverQuote
    ? (serverQuote.customer_grand_total_idr ??
        (serverQuote as any).estimated_grand_total_idr ??
        itemsSubtotal + shippingCost + customerAppFee + taxAmount)
    : itemsSubtotal + shippingCost + customerAppFee + taxAmount;

  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!deliveryAddress.recipientName.trim()) {
      return { isValid: false, error: "Nama penerima tidak boleh kosong." };
    }
    if (!deliveryAddress.phone.trim()) {
      return { isValid: false, error: "Nomor telepon penerima wajib diisi." };
    }
    if (!deliveryAddress.street.trim()) {
      return { isValid: false, error: "Alamat pengiriman wajib diisi." };
    }
    if (dependencyBlockMessage) {
      return { isValid: false, error: dependencyBlockMessage };
    }
    return { isValid: true };
  };

  const submitOrder = async (
    paymentMethod: string = "QRIS"
  ): Promise<{ checkoutGroupId: string; orderCount: number }> => {
    const val = validateForm();
    if (!val.isValid) {
      throw new Error(val.error);
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await orderBarangApi.customer.createCheckout(
        {
          address_id: selectedAddressId || "addr-default-1",
          cart_item_ids: resolvedCartItemIds.length > 0 ? resolvedCartItemIds : undefined,
          merchant_notes: merchantNotes,
        },
        idempotencyKey
      );

      const created = res.data as CheckoutCreatedResponse;
      const checkoutGroupId = (created as any)?.checkout_group_id || created?.id;
      if (!checkoutGroupId) {
        throw new Error("Gagal membuat CheckoutGroup pada server.");
      }

      // Automatically request payment intent for the CheckoutGroup with customer's chosen method
      try {
        await orderBarangApi.customer.createPaymentIntent(checkoutGroupId, paymentMethod as any);
      } catch (e) {
        console.warn("Auto payment intent creation deferred to payment page:", e);
      }

      return {
        checkoutGroupId,
        orderCount: (created as any)?.merchant_orders?.length || created?.orders?.length || 1,
      };
    } catch (err: any) {
      const msg = err?.message || "Gagal memproses pesanan checkout.";
      if (msg.includes("PENDING_PRODUCT_CONTRACT") || err?.code === "PENDING_PRODUCT_CONTRACT") {
        setDependencyBlockMessage(
          "Reservasi stok katalog eksternal belum tersedia (PENDING_PRODUCT_CONTRACT). Checkout ditahan demi keamanan transaksi."
        );
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    deliveryAddress,
    setDeliveryAddress,
    savedAddresses,
    selectedAddressId,
    selectSavedAddress,
    merchantNotes,
    setMerchantNote,
    serverQuote,
    isLoadingQuote,
    quoteError,
    dependencyBlockMessage,
    refreshQuote,
    itemsSubtotal,
    shippingCost,
    customerAppFee,
    activeFeePolicy: effectiveFeePolicy,
    feePolicyName,
    taxAmount,
    grandTotal,
    submitOrder,
    isSubmitting,
    isLoadingAddresses,
  };
}
