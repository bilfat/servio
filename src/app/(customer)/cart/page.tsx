"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Trash,
  Storefront,
  ArrowRight,
  ArrowLeft,
  Wrench,
  CheckSquare,
  Square,
  Package,
  CaretRight,
} from "@phosphor-icons/react";
import { useCart } from "@/features/cart/useCart";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

export default function CartPage() {
  const router = useRouter();
  const {
    cartGroups,
    updateQuantity,
    removeItem,
    selectedItemIds,
    toggleSelectItem,
    toggleSelectMerchant,
    toggleSelectAll,
    isMerchantSelected,
    isAllSelected,
    selectedCount,
    selectedGrandTotal,
    selectedMerchantCount,
    totalItemCount,
    isEmpty,
    isLoading,
  } = useCart();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  };

  const handleCheckout = () => {
    if (selectedCount === 0 || selectedItemIds.length === 0) {
      setToastMessage("Pilih minimal satu barang untuk melanjutkan ke checkout.");
      return;
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("servio_selected_cart_items_v1", JSON.stringify(selectedItemIds));
      } catch {}
    }
    const itemsParam = encodeURIComponent(selectedItemIds.join(","));
    router.push(`/checkout/products?from=cart&items=${itemsParam}`);
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-sky-700 transition group mb-3 cursor-pointer"
            title="Kembali ke halaman sebelumnya"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
                Keranjang Belanja
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Pesanan dikelompokkan per toko rekanan resmi dengan pengiriman mandiri dari masing-masing toko.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs">
              <ShoppingCart size={16} className="text-sky-600" />
              <span>{totalItemCount} Total Produk</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        {isEmpty ? (
          <EmptyState
            title="Keranjang Masih Kosong"
            description="Belum ada suku cadang atau peralatan yang ditambahkan ke keranjang Anda."
            action={
              <Link
                href="/products"
                className="px-5 py-2.5 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 transition inline-flex items-center gap-2 shadow-xs"
              >
                <ArrowLeft size={16} />
                <span>Jelajahi Katalog Produk</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Merchant Groups */}
            <div className="lg:col-span-8 space-y-6">
              {/* Select All Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800 hover:text-sky-700 transition cursor-pointer"
                >
                  {isAllSelected ? (
                    <CheckSquare size={20} weight="fill" className="text-sky-600" />
                  ) : (
                    <Square size={20} className="text-slate-400" />
                  )}
                  <span>Pilih Semua Barang ({totalItemCount})</span>
                </button>
                <span className="text-xs text-slate-500">
                  Terpilih: <strong className="text-slate-900">{selectedCount}</strong> barang dari{" "}
                  <strong className="text-slate-900">{selectedMerchantCount}</strong> toko
                </span>
              </div>

              {cartGroups.map((group) => {
                const groupSelected = isMerchantSelected(group.merchantId);
                return (
                  <div
                    key={group.merchantId}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    {/* Merchant Header with Checkbox & Storefront Link */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelectMerchant(group.merchantId)}
                          className="text-slate-400 hover:text-sky-600 transition cursor-pointer shrink-0"
                          aria-label={`Pilih semua produk dari ${group.merchantName}`}
                        >
                          {groupSelected ? (
                            <CheckSquare size={19} weight="fill" className="text-sky-600" />
                          ) : (
                            <Square size={19} className="text-slate-400" />
                          )}
                        </button>

                        <Link
                          href={`/merchants/${group.merchantId}/storefront`}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 hover:text-sky-700 transition group truncate"
                          title="Buka Halaman Toko"
                        >
                          <Storefront size={18} weight="duotone" className="text-sky-600 group-hover:scale-110 transition-transform shrink-0" />
                          <span className="truncate group-hover:underline underline-offset-2">{group.merchantName}</span>
                          <CaretRight size={13} className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition shrink-0" />
                        </Link>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                        {group.items.length} Produk
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.items.map((item) => {
                        const itemId = item.cartItemId || item.productId;
                        const isItemSelected = selectedItemIds.includes(itemId);

                        return (
                          <div
                            key={itemId}
                            className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleSelectItem(itemId)}
                                className="mt-1 cursor-pointer text-slate-400 hover:text-sky-600 transition shrink-0"
                                aria-label="Pilih item"
                              >
                                {isItemSelected ? (
                                  <CheckSquare size={19} weight="fill" className="text-sky-600" />
                                ) : (
                                  <Square size={19} className="text-slate-400" />
                                )}
                              </button>

                              {/* Product Thumbnail with Link to Product Details */}
                              <Link
                                href={`/products/${item.productId}`}
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 group relative shadow-xs"
                                title="Lihat detail produk"
                              >
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl}
                                    alt={item.productTitle}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <Package size={26} weight="duotone" className="text-slate-400 group-hover:text-sky-600 transition-colors" />
                                )}
                              </Link>

                              {/* Product Title & Info with Link */}
                              <div className="space-y-1 flex-1 min-w-0">
                                <Link
                                  href={`/products/${item.productId}`}
                                  className="text-xs sm:text-sm font-bold text-slate-900 hover:text-sky-700 transition line-clamp-2 block"
                                  title="Lihat detail produk"
                                >
                                  {item.productTitle}
                                </Link>

                                {item.variantName && (
                                  <span className="inline-block text-[10px] sm:text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                    Varian: {item.variantName}
                                  </span>
                                )}

                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-sky-700">
                                    {formatRupiah(item.unitPriceSnapshot ?? item.unitPrice)}
                                  </span>
                                  {item.stock !== undefined && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      (Stok: {item.stock})
                                    </span>
                                  )}
                                </div>

                                {item.linkedServiceOrderId && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Wrench size={12} weight="bold" />
                                    Suku Cadang Servis Aktif (#{item.linkedServiceOrderId})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                      item.variantId,
                                      item.cartItemId
                                    )
                                  }
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
                                  aria-label="Kurangi kuantitas"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-slate-900 w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                      item.variantId,
                                      item.cartItemId
                                    )
                                  }
                                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
                                  aria-label="Tambah kuantitas"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeItem(item.productId, item.variantId, item.cartItemId)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer rounded-lg hover:bg-rose-50"
                                title="Hapus item dari keranjang"
                                aria-label="Hapus item dari keranjang"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-slate-500 font-medium">Subtotal Toko:</span>
                      <span className="font-bold text-slate-900">
                        {formatRupiah(group.subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary & Checkout */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6 sticky top-24">
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Ringkasan Checkout ({selectedCount} Barang)
                </h3>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Barang Terpilih</span>
                    <span className="font-semibold text-slate-800">
                      {selectedCount} item ({selectedMerchantCount} Toko)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal Barang</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(selectedGrandTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Ongkir &amp; Biaya Aplikasi</span>
                    <span className="text-slate-500 font-medium">Dihitung saat checkout</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Estimasi Subtotal:</span>
                  <span className="text-xl font-bold font-display text-sky-700">
                    {formatRupiah(selectedGrandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={selectedCount === 0 || isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-white disabled:text-slate-300 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold transition shadow-md shadow-sky-600/20 border border-transparent flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Checkout ({selectedMerchantCount} Toko)</span>
                  <ArrowRight size={16} weight="bold" />
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Item yang tidak dicentang akan tetap tersimpan aman di keranjang Anda.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="warning"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
