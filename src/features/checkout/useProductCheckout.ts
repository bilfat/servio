"use client";

import { useState, useEffect, useCallback } from "react";
import { CartStoreGroup } from "@/types/domain";
import { cartApi, productOrdersApi, profileApi, ApiAddress } from "@/lib/servioApi";

export interface CourierOption {
  id: string;
  name: string;
  service: string;
  cost: number;
  estimatedDays: string;
}

export const AVAILABLE_COURIERS: CourierOption[] = [
  { id: "jne-reg", name: "JNE", service: "Reguler", cost: 15000, estimatedDays: "2-3 Hari" },
  { id: "sicepat-best", name: "SiCepat", service: "BEST (Besok Sampai)", cost: 18000, estimatedDays: "1-2 Hari" },
  { id: "gojek-instant", name: "GoSend", service: "Instant Kurir", cost: 30000, estimatedDays: "3 Jam" },
];

export interface DeliveryAddressForm {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
}

export function useProductCheckout(initialGroups: CartStoreGroup[] = []) {
  const [selectedCourier, setSelectedCourier] = useState<CourierOption>(AVAILABLE_COURIERS[0]);
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressForm>({
    recipientName: "Ahmad Pratama",
    phone: "0812-9988-1122",
    street: "Gedung BEI Tower 2 Lt. 14, Jl. Jend. Sudirman Kav. 52-53",
    city: "Jakarta Selatan",
    postalCode: "12190",
  });
  const [isInsuranceEnabled, setIsInsuranceEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [serverBreakdown, setServerBreakdown] = useState<{
    itemsSubtotal: number;
    shippingFee: number;
    platformFee: number;
    taxAmount: number;
    discountAmount: number;
    grandTotal: number;
  } | null>(null);

  // Load customer authoritative addresses from profileApi
  useEffect(() => {
    let isMounted = true;
    async function fetchUserAddresses() {
      setIsLoadingAddresses(true);
      try {
        const res = await profileApi.getAddresses();
        if (res.data && res.data.length > 0 && isMounted) {
          setSavedAddresses(res.data);
          const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
          setDeliveryAddress({
            recipientName: defaultAddr.recipientName || "Ahmad Pratama",
            phone: defaultAddr.phone || "0812-9988-1122",
            street: defaultAddr.addressLine,
            city: defaultAddr.city || "Jakarta Selatan",
            postalCode: defaultAddr.postalCode || "12190",
          });
        }
      } catch (err) {
        console.warn("Could not load user addresses, using standard address:", err);
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
    setDeliveryAddress({
      recipientName: addr.recipientName || "Pelanggan",
      phone: addr.phone || "0812-9988-1122",
      street: addr.addressLine,
      city: addr.city || "Jakarta Selatan",
      postalCode: addr.postalCode || "12190",
    });
  }, []);

  // Server-side authoritative checkout preview recalculation
  const refreshPreview = useCallback(async () => {
    try {
      const res = await cartApi.checkoutPreview({ courierCode: selectedCourier.id });
      if (res.data?.isValid && res.data?.breakdown) {
        setValidationIssues([]);
        setServerBreakdown({
          itemsSubtotal: res.data.breakdown.itemsSubtotal,
          shippingFee: res.data.breakdown.shippingFee,
          platformFee: res.data.breakdown.platformFee,
          taxAmount: res.data.breakdown.taxAmount,
          discountAmount: res.data.breakdown.discountAmount,
          grandTotal: res.data.breakdown.grandTotal,
        });
      } else if (res.data?.issues) {
        setValidationIssues(res.data.issues);
      }
    } catch {
      // Keep existing estimate
    }
  }, [selectedCourier.id]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const itemsSubtotal = serverBreakdown ? serverBreakdown.itemsSubtotal : initialGroups.reduce((acc, g) => acc + g.subtotal, 0);
  const shippingCost = serverBreakdown ? serverBreakdown.shippingFee : selectedCourier.cost * Math.max(1, initialGroups.length);
  const insuranceCost = isInsuranceEnabled ? Math.round(itemsSubtotal * 0.005) : 0;
  const platformFee = serverBreakdown ? serverBreakdown.platformFee : 2500;
  const taxAmount = serverBreakdown ? serverBreakdown.taxAmount : 0;
  const discountAmount = serverBreakdown ? serverBreakdown.discountAmount : 0;
  const grandTotal = serverBreakdown
    ? serverBreakdown.grandTotal + insuranceCost
    : itemsSubtotal + shippingCost + insuranceCost + platformFee + taxAmount - discountAmount;

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
    return { isValid: true };
  };

  const submitOrder = async () => {
    const val = validateForm();
    if (!val.isValid) {
      throw new Error(val.error);
    }

    setIsSubmitting(true);
    try {
      const res = await productOrdersApi.create({
        courierCode: selectedCourier.id,
        deliveryAddress,
        paymentMethodCode: "VIRTUAL_ACCOUNT",
        channelCode: "BCA_VA",
      });

      if (res.data) {
        const orderId = res.data.orders?.[0]?.orderId || res.data.orderGroup?.orderGroupId;
        const paymentIntentId = res.data.paymentIntent?.paymentIntentId || orderId;
        setIsSubmitting(false);
        return {
          orderId,
          paymentIntentId,
          totalPaid: res.data.paymentIntent?.amount || grandTotal,
          courier: selectedCourier.name,
        };
      }
      throw new Error(res.message || "Gagal membuat pesanan resmi.");
    } catch (err: any) {
      setIsSubmitting(false);
      throw err;
    }
  };

  return {
    deliveryAddress,
    setDeliveryAddress,
    savedAddresses,
    isLoadingAddresses,
    selectSavedAddress,
    selectedCourier,
    setSelectedCourier,
    isInsuranceEnabled,
    setIsInsuranceEnabled,
    itemsSubtotal,
    shippingCost,
    insuranceCost,
    platformFee,
    taxAmount,
    discountAmount,
    grandTotal,
    validationIssues,
    submitOrder,
    isSubmitting,
    courierOptions: AVAILABLE_COURIERS,
  };
}
