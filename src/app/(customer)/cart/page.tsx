"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Trash,
  Storefront,
  ArrowRight,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Warning,
} from "@phosphor-icons/react";
import { useCart } from "@/features/cart/useCart";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { EmptyState } from "@/components/feedback/EmptyState";
import { cartApi } from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";

export default function CartPage() {
  const router = useRouter();
  const { cartGroups, updateQuantity, removeItem, grandTotal, totalItemCount, isEmpty, isLoading } = useCart();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsValidating(true);
      const res = await cartApi.validateCart();
      if (res.data && !res.data.isValid) {
        setToastMessage(res.data.issues.join(" ") || "Beberapa barang di keranjang mengalami perubahan.");
        setIsValidating(false);
        return;
      }
      router.push("/checkout/products");
    } catch {
      // In offline/guest mode, proceed to checkout page
      router.push("/checkout/products");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Keranjang Pengadaan
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">
            Keranjang Belanja Suku Cadang & Produk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pesanan dikelompokkan per toko rekanan resmi untuk pengiriman yang lebih hemat & terjamin.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {isEmpty ? (
          <EmptyState
            title="Keranjang Masih Kosong"
            description="Belum ada suku cadang atau peralatan yang ditambahkan ke keranjang Anda."
            action={
              <Link
                href="/products"
                className="px-5 py-2.5 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
              >
                Jelajahi Katalog Produk
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Merchant Groups */}
            <div className="lg:col-span-2 space-y-6">
              {cartGroups.map((group) => (
                <div
                  key={group.merchantId}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-xs font-bold text-slate-800">
                    <Storefront size={18} weight="duotone" className="text-[#0F4C81]" />
                    <span>{group.merchantName}</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div
                        key={item.productId}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900">{item.productTitle}</h4>
                          <p className="text-xs font-bold text-[#0F4C81]">
                            {formatRupiah(item.unitPrice)}
                          </p>
                          {item.linkedServiceOrderId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Wrench size={12} weight="bold" />
                              Suku Cadang Servis Aktif (#{item.linkedServiceOrderId})
                            </span>
                          )}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId, item.cartItemId)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-slate-900 w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId, item.cartItemId)}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId, item.variantId, item.cartItemId)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition"
                            title="Hapus item"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Subtotal Toko:</span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(group.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary & Checkout */}
            <div>
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-24">
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Ringkasan Belanja ({totalItemCount} Barang)
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Harga Barang</span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Biaya Pengiriman</span>
                    <span className="text-slate-400">Dihitung saat checkout</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Total Tagihan:</span>
                  <span className="text-xl font-bold font-display text-[#0F4C81]">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-md shadow-sky-900/15 flex items-center justify-center gap-2"
                >
                  <span>Checkout ({cartGroups.length} Toko)</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
