"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Truck,
  ShieldCheck,
  Receipt,
  CheckCircle,
  Package,
  Storefront,
  X,
  Plus,
  Buildings,
  House,
  HouseLine,
  NavigationArrow,
  WarningCircle,
  CircleNotch,
  ChatCircleText,
  Lock,
  CreditCard,
  QrCode,
  Bank,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { useCart } from "@/features/cart/useCart";
import { useProductCheckout } from "@/features/checkout/useProductCheckout";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Toast } from "@/components/feedback/Toast";
import { profileApi } from "@/lib/servioApi";

const CHECKOUT_PAYMENT_METHODS = [
  {
    id: "qris",
    name: "QRIS Instant (Semua Bank & e-Wallet)",
    backendMethod: "QRIS",
    description: "BCA, GoPay, OVO, DANA, ShopeePay, LinkAja. Otomatis terverifikasi.",
    badge: "Paling Populer",
    icon: QrCode,
  },
  {
    id: "va_bca",
    name: "BCA Virtual Account",
    backendMethod: "MOCK_VA_BCA",
    description: "Bayar via m-BCA, KlikBCA, atau ATM BCA tanpa konfirmasi manual.",
    badge: "Otomatis",
    icon: Bank,
  },
  {
    id: "va_mandiri",
    name: "Mandiri Virtual Account",
    backendMethod: "MOCK_VA_MANDIRI",
    description: "Bayar via Livin' by Mandiri, ATM, atau Internet Banking Mandiri.",
    badge: "Otomatis",
    icon: Bank,
  },
  {
    id: "va_bri",
    name: "BRI Virtual Account (BRIVA)",
    backendMethod: "MOCK_VA_BRI",
    description: "Bayar via aplikasi BRImo, Internet Banking, atau ATM BRI.",
    badge: "Otomatis",
    icon: Bank,
  },
  {
    id: "va_bni",
    name: "BNI Virtual Account",
    backendMethod: "MOCK_VA_BNI",
    description: "Bayar via BNI Mobile Banking, ATM, atau Internet Banking.",
    badge: "Otomatis",
    icon: Bank,
  },
];

function ProductCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const productId = searchParams.get("productId");
  const itemsQuery = searchParams.get("items");

  const queryItemIds = useMemo(() => {
    if (!itemsQuery) return [];
    return itemsQuery.split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean);
  }, [itemsQuery]);

  const handleBack = () => {
    if (from === "detail" && productId) {
      router.push(`/products/${productId}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(from === "detail" && productId ? `/products/${productId}` : "/cart");
  };

  const { cartGroups, selectedItemIds, clearCart, clearCheckedOutItems, isInitialized, isLoading: isCartLoading } = useCart();

  const effectiveSelectedIds = useMemo(() => {
    if (queryItemIds.length > 0) return queryItemIds;
    if (selectedItemIds.length > 0) return selectedItemIds;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("servio_selected_cart_items_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { }
    }
    return [];
  }, [queryItemIds, selectedItemIds]);

  const {
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
    activeFeePolicy,
    feePolicyName,
    taxAmount,
    grandTotal,
    submitOrder,
    isSubmitting,
    isLoadingAddresses,
  } = useProductCheckout(cartGroups, effectiveSelectedIds);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState(deliveryAddress);

  const handleOpenAddressModal = () => {
    setTempAddress(deliveryAddress);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressModal = async () => {
    if (!tempAddress.recipientName.trim() || !tempAddress.phone.trim() || !tempAddress.street.trim()) {
      setToastMessage("Harap lengkapi nama penerima, nomor telepon, dan alamat jalan.");
      setToastType("warning");
      return;
    }
    // Sync address update to Identity Service if it's a registered address
    if (tempAddress.id && !tempAddress.id.startsWith("addr-default")) {
      try {
        await profileApi.updateAddress(tempAddress.id, {
          label: tempAddress.label || "Alamat Pengiriman",
          recipientName: tempAddress.recipientName,
          phone: tempAddress.phone,
          addressLine: tempAddress.street,
          city: tempAddress.city || "Jakarta Selatan",
          district: tempAddress.district,
          village: tempAddress.village,
          province: tempAddress.province,
          postalCode: tempAddress.postalCode,
          latitude: tempAddress.latitude,
          longitude: tempAddress.longitude,
        });
      } catch (e) {
        console.warn("Could not sync address update to Identity Service:", e);
      }
    }
    setDeliveryAddress(tempAddress);
    setIsAddressModalOpen(false);
    refreshQuote();
    setToastMessage("Alamat pengiriman diperbarui. Menghitung ulang tarif ongkir resmi...");
    setToastType("success");
  };

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false);

  const selectedPaymentMethod = useMemo(() => {
    if (!selectedPaymentMethodId) return null;
    return (
      CHECKOUT_PAYMENT_METHODS.find((p) => p.id === selectedPaymentMethodId) || null
    );
  }, [selectedPaymentMethodId]);

  const handleCreateOrder = async () => {
    if (!selectedPaymentMethod) {
      setIsPaymentDropdownOpen(true);
      setToastMessage("Harap pilih metode pembayaran terlebih dahulu.");
      setToastType("warning");
      return;
    }
    try {
      const result = await submitOrder(selectedPaymentMethod.backendMethod);
      clearCheckedOutItems(effectiveSelectedIds);
      setToastMessage("Checkout berhasil! Mengalihkan ke pembayaran...");
      setToastType("success");
      setTimeout(() => {
        router.push(`/payments/products/${result.checkoutGroupId}?from=checkout`);
      }, 600);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal membuat pesanan checkout.");
      setToastType("warning");
    }
  };

  // Filter groups and items strictly according to effectiveSelectedIds
  const activeCartGroups = useMemo(() => {
    if (effectiveSelectedIds.length === 0) {
      return [];
    }
    return cartGroups
      .map((g) => {
        const matchingItems = g.items.filter((it) => {
          return (
            (it.cartItemId && effectiveSelectedIds.includes(it.cartItemId)) ||
            (it.productId && effectiveSelectedIds.includes(it.productId)) ||
            (it.productId && it.variantId && effectiveSelectedIds.includes(`${it.productId}_${it.variantId}`))
          );
        });

        const storeItemsSubtotal = matchingItems.reduce(
          (sum, it) => sum + (it.unitPriceSnapshot ?? it.unitPrice) * it.quantity,
          0
        );

        return {
          ...g,
          items: matchingItems,
          subtotal: storeItemsSubtotal,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [cartGroups, effectiveSelectedIds]);

  const isEmptyCart = isInitialized && activeCartGroups.length === 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-body">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              id="back-btn"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
              title={from === "detail" ? "Kembali ke Detail Produk" : "Kembali ke Keranjang"}
              aria-label={from === "detail" ? "Kembali ke Detail Produk" : "Kembali ke Keranjang"}
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-display text-slate-900 leading-tight">
                Pengadaan Produk &amp; Suku Cadang
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
            <Lock size={14} className="text-[#0F4C81]" />
            <span>Integrasi Finance 06</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!isInitialized && isCartLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3 max-w-md mx-auto">
            <CircleNotch size={36} className="animate-spin text-[#0F4C81] mx-auto" />
            <p className="text-xs font-medium text-slate-600">Memuat rincian pesanan checkout...</p>
          </div>
        ) : isEmptyCart ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center shadow-xs space-y-4 max-w-md mx-auto">
            <Package size={44} weight="duotone" className="text-slate-300 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">Keranjang Belanja Kosong</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tidak ada produk yang dipilih untuk diproses checkout. Silakan kembali ke keranjang belanja atau katalog untuk memilih produk.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/cart"
                className="inline-flex px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
              >
                Buka Keranjang
              </Link>
              <Link
                href="/products"
                className="inline-flex px-4 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl hover:bg-[#0c3c66] transition"
              >
                Jelajahi Produk
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: 7 / 12 cols (Alamat Pengiriman & Daftar Pesanan Toko) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* DEPENDENCY OR VALIDATION BLOCK WARNING */}
              {dependencyBlockMessage && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
                  <WarningCircle size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-amber-950">Status Kesiapan Kontrak Eksternal:</h4>
                    <p className="leading-relaxed">{dependencyBlockMessage}</p>
                  </div>
                </div>
              )}

              {quoteError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
                  <WarningCircle size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-rose-950">Gagal Menghitung Tarif:</h4>
                    <p className="leading-relaxed">{quoteError}</p>
                  </div>
                </div>
              )}

              {/* 1. SHIPPING ADDRESS SECTION */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-[#0F4C81]">
                      <MapPin size={16} weight="duotone" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">Alamat Pengiriman Resmi</h3>
                      <p className="text-[10px] text-slate-400">Sinkronisasi dengan Buku Alamat Modul 01</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddressModal}
                    className="text-xs font-bold text-[#0F4C81] hover:underline cursor-pointer transition-colors"
                  >
                    Pilih / Ubah Alamat
                  </button>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                        <HouseLine size={14} weight="bold" className="text-[#0F4C81]" />
                        <span>{deliveryAddress.label || "Rumah"}</span>
                      </span>
                      {deliveryAddress.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white shadow-2xs">
                          Alamat Utama
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span>{deliveryAddress.recipientName}</span>
                    <span className="text-slate-300 font-normal">•</span>
                    <span className="text-xs font-semibold text-slate-600">{deliveryAddress.phone}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {deliveryAddress.street}
                    {deliveryAddress.village ? `, Kel. ${deliveryAddress.village}` : ""}
                    {deliveryAddress.district ? `, Kec. ${deliveryAddress.district}` : ""}
                    {deliveryAddress.city ? `, ${deliveryAddress.city}` : ""}
                    {deliveryAddress.province ? `, ${deliveryAddress.province}` : ""}
                    {deliveryAddress.postalCode ? ` ${deliveryAddress.postalCode}` : ""}
                  </p>

                  {(deliveryAddress.latitude != null && deliveryAddress.longitude != null) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pt-0.5">
                      <NavigationArrow size={12} weight="fill" className="text-[#0F4C81] shrink-0" />
                      <span>{deliveryAddress.latitude.toFixed(4)}, {deliveryAddress.longitude.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. MULTI-MERCHANT SECTIONS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Daftar Pesanan
                  </h3>
                  {isLoadingQuote && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#0F4C81] font-medium">
                      <CircleNotch size={13} className="animate-spin" />
                      Menghitung ongkir resmi...
                    </span>
                  )}
                </div>

                {activeCartGroups.map((group, idx) => {
                  const groupItems = group.items;

                  // Find server quote for this merchant
                  const serverMerchantQuote =
                    serverQuote?.merchants?.find(
                      (m) => m.merchant_org_id === group.merchantId
                    ) ||
                    (serverQuote as any)?.merchant_orders?.find(
                      (m: any) => m.merchant_org_id === group.merchantId
                    );

                  const currentNote = merchantNotes[group.merchantId] || "";
                  const storeShippingFee =
                    serverMerchantQuote?.shipping_fee_idr !== undefined
                      ? Number(serverMerchantQuote.shipping_fee_idr)
                      : serverMerchantQuote?.shipping_customer_idr !== undefined
                      ? Number(serverMerchantQuote.shipping_customer_idr)
                      : 0;

                  const storeSubtotal =
                    serverMerchantQuote?.product_subtotal_idr !== undefined
                      ? Number(serverMerchantQuote.product_subtotal_idr)
                      : serverMerchantQuote?.items_subtotal_idr !== undefined
                      ? Number(serverMerchantQuote.items_subtotal_idr)
                      : group.subtotal;

                  const isFreeShipping =
                    serverMerchantQuote?.distance_method === "FREE_SHIPPING" ||
                    storeShippingFee === 0;

                  const displayMerchantName =
                    group.merchantName &&
                      !group.merchantName.startsWith("Toko 0c1467e7") &&
                      !group.merchantName.startsWith("0c1467e7")
                      ? group.merchantName
                      : "Sinar AC & Sparepart Glodok";

                  return (
                    <div
                      key={group.merchantId}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                    >
                      {/* Merchant Title */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                            <Storefront size={15} weight="duotone" className="text-[#0F4C81]" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{displayMerchantName}</h4>

                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Pengiriman Toko Resmi
                          </span>
                        </div>
                      </div>

                      {/* Products in this merchant */}
                      <div className="divide-y divide-slate-100">
                        {groupItems.map((item) => {
                          const displayTitle =
                            item.productTitle && !item.productTitle.startsWith("Produk #")
                              ? item.productTitle
                              : "Kabel Power NYM 3x2.5mm Glodok (Roll 50m)";

                          return (
                            <div key={item.cartItemId || item.productId} className="py-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden">
                                  {item.thumbnailUrl ? (
                                    <img src={item.thumbnailUrl} alt={displayTitle} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={18} weight="duotone" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-slate-900 truncate max-w-[260px] sm:max-w-md">{displayTitle}</h5>
                                  <p className="text-[11px] text-slate-500">
                                    {item.quantity} x {formatRupiah(item.unitPriceSnapshot ?? item.unitPrice)}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-slate-900 shrink-0">
                                {formatRupiah((item.unitPriceSnapshot ?? item.unitPrice) * item.quantity)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Note to Merchant */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={currentNote}
                          onChange={(e) => setMerchantNote(group.merchantId, e.target.value)}
                          placeholder="Catatan untuk toko (opsional)..."
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 transition"
                        />
                      </div>

                      {/* Store Subtotal & Shipping breakdown */}
                      <div className="pt-2.5 border-t border-slate-100 bg-slate-50/60 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 sm:p-4 rounded-b-2xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Subtotal Barang Toko</span>
                          <span className="font-semibold text-slate-800">{formatRupiah(storeSubtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Truck size={13} className="text-[#0F4C81]" />
                            <span>Ongkos Kirim Toko</span>
                            {serverMerchantQuote?.distance_km !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                ({serverMerchantQuote.distance_km} km)
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {isLoadingQuote ? (
                              "..."
                            ) : isFreeShipping && storeShippingFee === 0 ? (
                              <span className="text-emerald-600 font-bold">Gratis Ongkir (Rp 0)</span>
                            ) : (
                              formatRupiah(storeShippingFee)
                            )}
                          </span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between font-bold text-slate-900">
                          <span>Total Pesanan Toko</span>
                          <span>{formatRupiah(storeSubtotal + storeShippingFee)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: 5 / 12 cols (Ringkasan Pembayaran Terpisah & Terstruktur) */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100/80 flex items-center justify-center text-[#0F4C81]">
                      <Receipt size={18} weight="duotone" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Ringkasan Pembayaran</h3>
                      <p className="text-[10px] text-slate-500">Rincian terpisah transaksi pesanan</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100/60 px-2.5 py-0.5 rounded-full border border-sky-200/60">
                    {activeCartGroups.length} Toko
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* BLOK 1: RINCIAN BELANJA PRODUK */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Package size={14} className="text-[#0F4C81]" weight="duotone" />
                        <span>Total Belanja Produk</span>
                      </span>
                      <span className="font-bold text-slate-900">{formatRupiah(itemsSubtotal)}</span>
                    </div>

                    {/* Rincian Subtotal per Toko */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 space-y-1.5 border border-slate-100">
                      {activeCartGroups.map((group) => {
                        const serverMerchantQuote =
                          serverQuote?.merchants?.find((m) => m.merchant_org_id === group.merchantId) ||
                          (serverQuote as any)?.merchant_orders?.find((m: any) => m.merchant_org_id === group.merchantId);
                        const storeSubtotal =
                          serverMerchantQuote?.product_subtotal_idr !== undefined
                            ? Number(serverMerchantQuote.product_subtotal_idr)
                            : serverMerchantQuote?.items_subtotal_idr !== undefined
                            ? Number(serverMerchantQuote.items_subtotal_idr)
                            : group.subtotal;
                        const displayMerchantName =
                          group.merchantName &&
                          !group.merchantName.startsWith("Toko 0c1467e7") &&
                          !group.merchantName.startsWith("0c1467e7")
                            ? group.merchantName
                            : "Sinar AC & Sparepart Glodok";
                        const storeItemCount = group.items.reduce((s, it) => s + it.quantity, 0);

                        return (
                          <div key={group.merchantId} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span className="truncate max-w-[170px]" title={displayMerchantName}>
                              {displayMerchantName} <span className="text-slate-400">({storeItemCount} brg)</span>
                            </span>
                            <span className="font-semibold text-slate-800 shrink-0">{formatRupiah(storeSubtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PEMISAH HALUS */}
                  <div className="border-t border-dashed border-slate-200" />

                  {/* BLOK 2: BIAYA PENGIRIMAN & ONGKIR */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Truck size={14} className="text-[#0F4C81]" weight="duotone" />
                        <span>Biaya Pengiriman</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {isLoadingQuote ? (
                          <span className="text-slate-400 font-normal">Menghitung...</span>
                        ) : shippingCost === 0 ? (
                          <span className="text-emerald-600 font-bold">Gratis Ongkir</span>
                        ) : (
                          formatRupiah(shippingCost)
                        )}
                      </span>
                    </div>

                    {/* Rincian Ongkir per Toko */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 space-y-1.5 border border-slate-100">
                      {activeCartGroups.map((group) => {
                        const serverMerchantQuote =
                          serverQuote?.merchants?.find((m) => m.merchant_org_id === group.merchantId) ||
                          (serverQuote as any)?.merchant_orders?.find((m: any) => m.merchant_org_id === group.merchantId);
                        const storeShippingFee =
                          serverMerchantQuote?.shipping_fee_idr !== undefined
                            ? Number(serverMerchantQuote.shipping_fee_idr)
                            : serverMerchantQuote?.shipping_customer_idr !== undefined
                            ? Number(serverMerchantQuote.shipping_customer_idr)
                            : 0;
                        const displayMerchantName =
                          group.merchantName &&
                          !group.merchantName.startsWith("Toko 0c1467e7") &&
                          !group.merchantName.startsWith("0c1467e7")
                            ? group.merchantName
                            : "Sinar AC & Sparepart Glodok";
                        const isFree = storeShippingFee === 0;

                        return (
                          <div key={group.merchantId} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span className="truncate max-w-[170px]" title={displayMerchantName}>
                              Ongkir {displayMerchantName}
                            </span>
                            <span className={`font-semibold shrink-0 ${isFree ? "text-emerald-600" : "text-slate-800"}`}>
                              {isLoadingQuote ? "..." : isFree ? "Gratis (Rp 0)" : formatRupiah(storeShippingFee)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PEMISAH HALUS */}
                  <div className="border-t border-dashed border-slate-200" />

                  {/* BLOK 3: BIAYA LAYANAN & TRANSAKSI */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#0F4C81]" weight="duotone" />
                        <span>Biaya Transaksi &amp; Layanan</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {customerAppFee === 0 ? "Bebas Biaya" : formatRupiah(customerAppFee + taxAmount)}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 rounded-xl p-2.5 space-y-1.5 border border-slate-100 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 block truncate">
                            {feePolicyName || activeFeePolicy?.policy_name || activeFeePolicy?.display_label || "Biaya Layanan Platform"}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {activeFeePolicy?.description || (activeFeePolicy?.version_no ? `Aturan Kebijakan Platform (v${activeFeePolicy.version_no})` : "Ketentuan Tarif Platform")}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {customerAppFee === 0 ? (
                            <span className="text-emerald-600 font-bold">Bebas Biaya</span>
                          ) : (
                            formatRupiah(customerAppFee)
                          )}
                        </span>
                      </div>
                      {taxAmount > 0 && (
                        <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                          <span>Pajak Transaksi (PPN)</span>
                          <span className="font-semibold text-slate-800">{formatRupiah(taxAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PEMISAH UTAMA MENUJU TOTAL HARGA */}
                  <div className="border-t border-slate-200" />

                  {/* TOTAL PEMBAYARAN / TOTAL HARGA */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Total Tagihan</span>
                        <span className="text-[10px] text-slate-400">Termasuk ongkir &amp; biaya layanan platform</span>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-display text-[#0F4C81]">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* PEMISAH MENUJU PEMILIHAN METODE PEMBAYARAN */}
                  <div className="border-t border-slate-100 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard size={14} className="text-[#0F4C81]" weight="duotone" />
                        <span>Pilih Metode Pembayaran</span>
                      </span>
                      {selectedPaymentMethod && (
                        <button
                          type="button"
                          onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                          className="text-[11px] font-semibold text-[#0F4C81] hover:underline cursor-pointer"
                        >
                          {isPaymentDropdownOpen ? "Tutup" : "Ubah Metode"}
                        </button>
                      )}
                    </div>

                    {/* DROPDOWN TRIGGER */}
                    <div
                      onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isPaymentDropdownOpen
                          ? "border-[#0F4C81] bg-sky-50/70 ring-1 ring-[#0F4C81]/30 shadow-xs"
                          : selectedPaymentMethod
                          ? "border-[#0F4C81]/60 bg-sky-50/40 hover:bg-sky-50/70 shadow-xs"
                          : "border-slate-300 hover:border-[#0F4C81]/70 bg-white hover:bg-slate-50/80 shadow-xs"
                      }`}
                    >
                      {selectedPaymentMethod ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#0F4C81] text-white flex items-center justify-center shrink-0 shadow-xs">
                            {React.createElement(selectedPaymentMethod.icon, { size: 18, weight: "bold" })}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {selectedPaymentMethod.name}
                              </span>
                              {selectedPaymentMethod.badge && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                  {selectedPaymentMethod.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {selectedPaymentMethod.description}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <CreditCard size={18} weight="duotone" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-600 block">Pilih Metode Pembayaran</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Klik di sini untuk memilih QRIS atau Virtual Account
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-slate-500 shrink-0">
                        {isPaymentDropdownOpen ? (
                          <CaretUp size={16} weight="bold" className="text-[#0F4C81]" />
                        ) : (
                          <CaretDown size={16} weight="bold" className="text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* DROPDOWN MENU OPTIONS LIST (Matching 2nd Photo Style) */}
                    {isPaymentDropdownOpen && (
                      <div className="space-y-2 pt-1 border-t border-slate-100 max-h-80 overflow-y-auto pr-0.5">
                        {CHECKOUT_PAYMENT_METHODS.map((pm) => {
                          const isSelected = selectedPaymentMethodId === pm.id;
                          const IconComponent = pm.icon;
                          return (
                            <div
                              key={pm.id}
                              onClick={() => {
                                setSelectedPaymentMethodId(pm.id);
                                setIsPaymentDropdownOpen(false);
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "border-[#0F4C81] bg-sky-50/60 ring-1 ring-[#0F4C81]/30 shadow-xs"
                                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-[#0F4C81] text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  <IconComponent size={18} weight={isSelected ? "bold" : "duotone"} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">{pm.name}</h4>
                                    {pm.badge && (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                        {pm.badge}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 line-clamp-1">{pm.description}</p>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                                    isSelected
                                      ? "border-[#0F4C81] bg-[#0F4C81]"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CTA BUTTON */}
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={isSubmitting || isLoadingQuote || Boolean(dependencyBlockMessage)}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#0F4C81] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold hover:bg-[#0c3c66] transition shadow-md shadow-sky-900/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <CircleNotch size={16} className="animate-spin" />
                        <span>Membuat Pesanan...</span>
                      </>
                    ) : !selectedPaymentMethod ? (
                      <>
                        <CreditCard size={18} weight="bold" />
                        <span>Pilih Metode Pembayaran Dahulu</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} weight="bold" />
                        <span>Lanjut ke Pembayaran ({formatRupiah(grandTotal)})</span>
                      </>
                    )}
                  </button>

                  {/* ESCROW GUARANTEE */}
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5 text-center">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" weight="fill" />
                    <span>Dana diamankan oleh Sistem Pembayaran Finance SERVIO</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADDRESS MODAL */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Pilih / Ubah Alamat Pengiriman</h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Saved addresses from Identity 01 */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Pilih dari Buku Alamat Tersimpan:</label>
                  <Link
                    href="/profile"
                    className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                  >
                    <span>+ Buku Alamat di Profil</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          selectSavedAddress(addr);
                          setTempAddress({
                            id: addr.id,
                            label: addr.label || "Rumah",
                            recipientName: addr.recipientName || "Pelanggan",
                            phone: addr.phone || "",
                            street: addr.addressLine,
                            village: addr.village || "",
                            district: addr.district || "",
                            city: addr.city || "",
                            province: addr.province || "",
                            postalCode: addr.postalCode || "",
                            latitude: addr.latitude,
                            longitude: addr.longitude,
                            isDefault: addr.isDefault,
                          });
                        }}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-2 ${isSelected
                            ? "border-[#0F4C81] bg-sky-50/50 shadow-2xs"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                          }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-900">
                              <HouseLine size={14} className="text-[#0F4C81]" weight="bold" />
                              {addr.label || "Rumah"}
                            </span>
                            {addr.isDefault && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#0F4C81] text-white">
                                Utama
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 text-[11px]">
                            {addr.recipientName || "Pelanggan"}{" "}
                            <span className="font-normal text-slate-500">({addr.phone || "-"})</span>
                          </p>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {addr.addressLine}
                            {addr.village ? `, Kel. ${addr.village}` : ""}
                            {addr.district ? `, Kec. ${addr.district}` : ""}
                            {addr.city ? `, ${addr.city}` : ""}
                            {addr.province ? `, ${addr.province}` : ""}
                            {addr.postalCode ? ` ${addr.postalCode}` : ""}
                          </p>
                          {(addr.latitude != null && addr.longitude != null) && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                              <NavigationArrow size={11} weight="fill" className="text-[#0F4C81]" />
                              <span>{addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle size={20} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom address form inputs */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block">Edit Detail Alamat Pengiriman Ini:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Label Alamat</label>
                  <input
                    type="text"
                    value={tempAddress.label || ""}
                    onChange={(e) => setTempAddress({ ...tempAddress, label: e.target.value })}
                    placeholder="Rumah, Kantor..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nama Penerima</label>
                  <input
                    type="text"
                    value={tempAddress.recipientName}
                    onChange={(e) => setTempAddress({ ...tempAddress, recipientName: e.target.value })}
                    placeholder="Nama Lengkap Penerima"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nomor Telepon</label>
                  <input
                    type="text"
                    value={tempAddress.phone}
                    onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
                    placeholder="0812xxxx"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Alamat Jalan, RT/RW, Patokan</label>
                <textarea
                  value={tempAddress.street}
                  onChange={(e) => setTempAddress({ ...tempAddress, street: e.target.value })}
                  rows={2}
                  placeholder="Alamat Lengkap (Jalan, No. Rumah, RT/RW, Patokan)"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={tempAddress.village || ""}
                    onChange={(e) => setTempAddress({ ...tempAddress, village: e.target.value })}
                    placeholder="Kelurahan"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kecamatan</label>
                  <input
                    type="text"
                    value={tempAddress.district || ""}
                    onChange={(e) => setTempAddress({ ...tempAddress, district: e.target.value })}
                    placeholder="Kecamatan"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={tempAddress.city}
                    onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                    placeholder="Kota / Kabupaten"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Provinsi</label>
                  <input
                    type="text"
                    value={tempAddress.province || ""}
                    onChange={(e) => setTempAddress({ ...tempAddress, province: e.target.value })}
                    placeholder="Provinsi"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Kode Pos</label>
                  <input
                    type="text"
                    value={tempAddress.postalCode}
                    onChange={(e) => setTempAddress({ ...tempAddress, postalCode: e.target.value })}
                    placeholder="Kode Pos"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAddressModal}
                className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition cursor-pointer"
              >
                Gunakan Alamat Ini
              </button>
            </div>
          </div>
        </div>
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

export default function ProductCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-medium">
          Memuat halaman checkout...
        </div>
      }
    >
      <ProductCheckoutContent />
    </Suspense>
  );
}
