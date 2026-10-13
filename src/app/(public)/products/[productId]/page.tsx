"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  ShoppingCart,
  CheckCircle,
  WarningCircle,
  Storefront,
  ArrowsLeftRight,
} from "@phosphor-icons/react";
import { productsApi, productCompatibilitiesApi } from "@/lib/servioApi";
import { ApiProduct, ApiProductVariant, ApiProductCompatibility, getProductMediaUrl } from "@/types/domain";
import { useCart } from "@/features/cart/useCart";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Button } from "@/components/ui/Button";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = (params?.productId as string) || "";

  const { addItem, totalItemCount } = useCart();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ApiProductVariant | null>(null);
  const [compatibilities, setCompatibilities] = useState<ApiProductCompatibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await productsApi.get(productId);
      const prod = res.data;
      setProduct(prod || null);

      if (prod?.variants && prod.variants.length > 0) {
        setSelectedVariant(prod.variants[0]);
      }
      setLoading(false);

      if (prod?.variants && prod.variants.length > 0) {
        // load compatibility for default variant in background
        productCompatibilitiesApi
          .list(prod.productId, prod.variants[0].variantId)
          .then((compRes) => setCompatibilities(compRes.data || []))
          .catch(() => setCompatibilities([]));
      }
    } catch (err: unknown) {
      console.error("Failed to load product detail:", err);
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSelectVariant = async (v: ApiProductVariant) => {
    setSelectedVariant(v);
    setQuantity(1);
    if (!product) return;
    try {
      const compRes = await productCompatibilitiesApi.list(product.productId, v.variantId);
      setCompatibilities(compRes.data || []);
    } catch {
      setCompatibilities([]);
    }
  };

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;

    try {
      await addItem(
        {
          id: product.productId,
          title: `${product.name} - ${selectedVariant.name}`,
          category: product.categoryName || product.categoryId,
          price: selectedVariant.price,
          stock: selectedVariant.stock,
          merchantId: product.merchantOrganizationId || "MERCH-DEFAULT",
          merchantName: product.merchantName || product.providerName || "Toko Mitra SERVIO",
          variantId: selectedVariant.variantId,
        } as any,
        quantity,
        undefined,
        selectedVariant.variantId
      );
      setToastMessage(`${quantity}x "${product.name} (${selectedVariant.name})" ditambahkan ke keranjang!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 401 || error?.message?.includes("Unauthenticated")) {
        router.push(`/auth/login?returnUrl=/products/${product.productId}`);
      } else {
        setToastMessage(error?.message || "Gagal menambahkan produk ke keranjang.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVariant) return;
    try {
      await addItem(
        {
          id: product.productId,
          title: `${product.name} - ${selectedVariant.name}`,
          category: product.categoryName || product.categoryId,
          price: selectedVariant.price,
          stock: selectedVariant.stock,
          merchantId: product.merchantOrganizationId || "MERCH-DEFAULT",
          merchantName: product.merchantName || product.providerName || "Toko Mitra SERVIO",
          variantId: selectedVariant.variantId,
        } as any,
        quantity,
        undefined,
        selectedVariant.variantId
      );
      router.push("/checkout/products");
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 401 || error?.message?.includes("Unauthenticated")) {
        router.push(`/auth/login?returnUrl=/checkout/products`);
      } else {
        setToastMessage(error?.message || "Gagal melanjutkan proses pembelian langsung.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">Memuat detail produk...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-sm font-bold text-slate-800">Produk tidak ditemukan</h2>
        <Link href="/products" className="text-xs text-[#0F4C81] underline mt-2">
          Kembali ke katalog
        </Link>
      </div>
    );
  }

  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {product.categoryName || product.categoryId}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  • {product.merchantName || product.providerName || "Toko Mitra SERVIO"}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5 line-clamp-1">
                {product.name}
              </h1>
            </div>
          </div>

          <Link
            href="/cart"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition relative"
          >
            <ShoppingCart size={20} weight="bold" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-[#0F4C81] text-white text-[9px] font-bold">
                {totalItemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Gallery & Specs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Visual */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center justify-center relative overflow-hidden aspect-[16/9] sm:aspect-[2/1] bg-gradient-to-br from-slate-50 to-sky-50/40">
            {getProductMediaUrl(product.media) ? (
              <img
                src={getProductMediaUrl(product.media)}
                alt={product.name}
                className="max-h-56 sm:max-h-64 w-auto object-contain rounded-2xl drop-shadow-sm transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <Package size={96} weight="duotone" className="text-[#0F4C81] opacity-70" />
            )}
            <span className="text-xs font-bold text-slate-500 mt-3 font-mono">
              ID Produk: {product.productId}
            </span>
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
              <CheckCircle size={14} weight="fill" />
              100% Suku Cadang Original Terverifikasi
            </span>
          </div>

          {/* Description & Compatibility */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-2">Deskripsi Produk</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {product.description || "Tidak ada deskripsi rinci untuk produk ini."}
              </p>
            </div>

            {/* Technical Compatibility Section */}
            {compatibilities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowsLeftRight size={18} className="text-[#0F4C81]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Kesesuaian Teknis &amp; Kompatibilitas Suku Cadang
                  </h3>
                </div>
                <div className="space-y-2">
                  {compatibilities.map((c) => (
                    <div key={c.compatibilityId} className="p-3 bg-sky-50/60 border border-sky-200 rounded-2xl text-xs">
                      <div className="font-bold text-[#0F4C81]">
                        Kompatibel dengan: {c.targetVariant?.name || c.variantBId}
                      </div>
                      {c.notes && <p className="text-[11px] text-slate-600 mt-0.5">{c.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warranty Policy Section (Authoritative Catalog Snapshot) */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-emerald-700" weight="bold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Kebijakan Garansi &amp; Jaminan Resmi
                </h3>
              </div>
              {(product as any).warrantyPolicy?.durationMonths ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">
                      Masa Garansi Resmi: {(product as any).warrantyPolicy.durationMonths} Bulan ({(product as any).warrantyPolicy.durationDays || (product as any).warrantyPolicy.durationMonths * 30} Hari)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {(product as any).warrantyPolicy.type === "MANUFACTURER" 
                        ? "Garansi Resmi Pabrikan" 
                        : (product as any).warrantyPolicy.type === "STORE_ONLY" 
                        ? "Garansi Toko Mitra" 
                        : "Garansi Resmi"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    <strong>Cakupan:</strong> {(product as any).warrantyPolicy.coverage || "Sesuai ketentuan standar garansi suku cadang resmi."}
                  </p>
                  <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                    <strong>Pengecualian:</strong> {(product as any).warrantyPolicy.exclusions || "Kerusakan fisik akibat jatuh, kesalahan pemakaian, atau modifikasi non-resmi."}
                  </p>
                  {(product as any).warrantyPolicy.terms && (
                    <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                      <strong>Ketentuan:</strong> {(product as any).warrantyPolicy.terms}
                    </p>
                  )}
                  <div className="pt-1.5 border-t border-emerald-200 text-[10px] text-emerald-800 flex items-center gap-1 font-medium">
                    <span>✓ Perlindungan resmi SERVIO Shield • Layanan klaim digital terverifikasi</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                  <p className="font-bold text-slate-700">Produk Tanpa Garansi Purnajual</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Produk ini tergolong suku cadang habis pakai (consumable) atau produk non-garansi pabrikan. Pembeli tetap dilindungi asuransi pengiriman dan inspeksi awal saat unboxing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Checkout & Variant Selection */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6 sticky top-24">
            {/* Merchant / Store Info Card */}
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs">
              <Storefront size={20} weight="duotone" className="text-[#0F4C81] shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-500 block leading-tight font-medium">Penjual Resmi:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {product.merchantName || product.providerName || "Toko Mitra SERVIO"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">Harga Varian Terpilih</p>
              <p className="text-3xl font-extrabold text-[#0F4C81] font-display mt-0.5">
                {selectedVariant ? formatRupiah(selectedVariant.price) : "Pilih Varian"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">
                  {isOutOfStock ? (
                    <span className="text-rose-600 font-bold">Stok Habis</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">Sisa Stok: {selectedVariant?.stock} Unit</span>
                  )}
                </span>
              </div>
            </div>

            {/* Variant Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Pilihan Varian Produk:</label>
              <div className="flex flex-wrap gap-2">
                {product.variants?.map((v) => {
                  const isSelected = selectedVariant?.variantId === v.variantId;
                  return (
                    <button
                      key={v.variantId}
                      type="button"
                      onClick={() => handleSelectVariant(v)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition border text-left ${
                        isSelected
                          ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div>{v.name}</div>
                      <div className={`text-[10px] ${isSelected ? "text-sky-200" : "text-slate-500"}`}>
                        Rp{v.price.toLocaleString("id-ID")}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Jumlah Pembelian</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-slate-800">{quantity}</span>
                    <button
                      type="button"
                      disabled={Boolean(selectedVariant && quantity >= selectedVariant.stock)}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">Unit</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full bg-[#0F4C81] text-white flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} weight="bold" />
                <span>+ Keranjang Belanja</span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold transition shadow-sm border-0"
              >
                Beli Langsung
              </Button>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && (
        <div id="cart-toast" className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 backdrop-blur-md">
          <CheckCircle size={20} weight="fill" className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
