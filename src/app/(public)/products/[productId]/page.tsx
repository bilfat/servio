"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Package,
  CheckCircle,
  WarningCircle,
  Storefront,
  ArrowsLeftRight,
  ShoppingCart,
  Tag,
  Star,
  ChatCircleDots,
  X,
  Plus,
  Minus,
  Sparkle,
  Truck,
  CaretRight,
  CaretLeft,
  MapPin,
} from "@phosphor-icons/react";
import { productsApi, productCompatibilitiesApi } from "@/lib/servioApi";
import { ApiProduct, ApiProductVariant, ApiProductCompatibility, getProductMediaUrl } from "@/types/domain";
import { useCart } from "@/features/cart/useCart";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { useActiveLocation } from "@/context/LocationContext";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = (params?.productId as string) || "";

  const { addItem, totalItemCount } = useCart();
  const { location: activeLocation, checkDeliveryAvailability, openLocationModal } = useActiveLocation();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ApiProductVariant | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [compatibilities, setCompatibilities] = useState<ApiProductCompatibility[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<ApiProduct[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<"ALL" | "SAME_STORE" | "OTHER_MERCHANTS">("ALL");
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shopee-style Mobile Variant Bottom Sheet Drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"CART" | "BUY" | "SELECT">("CART");

  // Delivery availability evaluation based on active location and merchant city
  const merchantCity = product?.merchant?.city || product?.merchantCity || "Jakarta Selatan";
  const deliveryCheck = useMemo(() => {
    return checkDeliveryAvailability(merchantCity);
  }, [checkDeliveryAvailability, merchantCity]);
  const isDeliverable = deliveryCheck.isDeliverable;

  // Multi-image Carousel: General media first, then variant-specific media
  const allSlides = useMemo(() => {
    if (!product) return [];
    const slides: Array<{
      id: string;
      url: string;
      scope: "GENERAL" | "VARIANT";
      variantId?: string;
      variantName?: string;
      isPrimary?: boolean;
    }> = [];
    const seenUrls = new Set<string>();

    // 1. General Media first (Default view for guests & before variant is selected)
    const generalList = Array.isArray(product.media)
      ? product.media.filter((m: any) => {
          if (typeof m === "string") return true;
          return m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT");
        })
      : [];

    if (generalList.length > 0) {
      generalList.forEach((m: any, idx: number) => {
        const url = typeof m === "string" ? m : m.url;
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          slides.push({
            id: typeof m !== "string" && m.id ? m.id : `general-${idx}`,
            url,
            scope: "GENERAL",
            isPrimary: Boolean(typeof m !== "string" && m.isPrimary),
          });
        }
      });
    } else if (Array.isArray(product.general_media) && product.general_media.length > 0) {
      product.general_media.forEach((m: any, idx: number) => {
        const url = typeof m === "string" ? m : m.url;
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          slides.push({
            id: m.id || `general-backend-${idx}`,
            url,
            scope: "GENERAL",
            isPrimary: Boolean(m.isPrimary),
          });
        }
      });
    } else if ((product as any).primary_image_url) {
      const url = (product as any).primary_image_url;
      seenUrls.add(url);
      slides.push({
        id: "general-primary",
        url,
        scope: "GENERAL",
        isPrimary: true,
      });
    }

    // 2. Variant-specific media next, grouped variant by variant
    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        if (Array.isArray(v.media) && v.media.length > 0) {
          v.media.forEach((vm: any, vIdx: number) => {
            const url = typeof vm === "string" ? vm : vm.url;
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              slides.push({
                id: typeof vm !== "string" && vm.id ? vm.id : `variant-${v.variantId}-${vIdx}`,
                url,
                scope: "VARIANT",
                variantId: v.variantId,
                variantName: v.name,
                isPrimary: Boolean(typeof vm !== "string" && vm.isPrimary),
              });
            }
          });
        }
      });
    }

    // Also pick up any variant media present in top-level product.media array
    if (Array.isArray(product.media)) {
      product.media.forEach((m: any, mIdx: number) => {
        if (typeof m !== "string" && (m.scope === "VARIANT" || m.variantId || m.variant_id)) {
          const url = m.url;
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const vId = m.variantId || m.variant_id;
            const matchedVariant = product.variants?.find((v) => v.variantId === vId);
            slides.push({
              id: m.id || `variant-top-${mIdx}`,
              url,
              scope: "VARIANT",
              variantId: vId,
              variantName: matchedVariant?.name || "Varian Khusus",
              isPrimary: Boolean(m.isPrimary),
            });
          }
        }
      });
    }

    return slides;
  }, [product]);

  const loadDetail = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await productsApi.get(productId);
      const prod = res.data;
      setProduct(prod || null);
      // Initially keep selectedVariant null so customer/guest sees general photos and price range
      setSelectedVariant(null);
      setLoading(false);

      // Load compatibilities if product has default variant or first variant
      if (prod?.variants && prod.variants.length > 0) {
        productCompatibilitiesApi
          .list(prod.productId, prod.variants[0].variantId)
          .then((compRes) => setCompatibilities(compRes.data || []))
          .catch(() => setCompatibilities([]));
      }

      // Load catalog recommendations: include products from other merchants
      try {
        const listRes = await productsApi.list({ limit: 12 });
        const allOthers = (listRes.data || []).filter((p) => p.productId !== prod?.productId);
        setRelatedProducts(allOthers);
      } catch {
        const fallback = (prod?.relatedProducts || []).filter((p) => p.productId !== prod?.productId);
        setRelatedProducts(fallback);
      }
    } catch (err: unknown) {
      console.error("Failed to load product detail:", err);
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Two-way sync: Navigate carousel and update active variant when slide belongs to that variant
  const goToSlide = useCallback((index: number) => {
    if (allSlides.length === 0) return;
    const validIndex = Math.max(0, Math.min(index, allSlides.length - 1));
    setCurrentSlideIndex(validIndex);

    const targetSlide = allSlides[validIndex];
    if (targetSlide && targetSlide.scope === "VARIANT" && targetSlide.variantId) {
      const matched = product?.variants?.find((v) => v.variantId === targetSlide.variantId);
      if (matched) {
        setSelectedVariant(matched);
        if (product) {
          productCompatibilitiesApi
            .list(product.productId, matched.variantId)
            .then((compRes) => setCompatibilities(compRes.data || []))
            .catch(() => setCompatibilities([]));
        }
      }
    } else {
      // Slid back to general photo -> deselect variant so none are blue
      setSelectedVariant(null);
    }
  }, [allSlides, product]);

  const goToPrevSlide = useCallback(() => {
    if (allSlides.length === 0) return;
    const prevIdx = currentSlideIndex > 0 ? currentSlideIndex - 1 : allSlides.length - 1;
    goToSlide(prevIdx);
  }, [allSlides.length, currentSlideIndex, goToSlide]);

  const goToNextSlide = useCallback(() => {
    if (allSlides.length === 0) return;
    const nextIdx = currentSlideIndex < allSlides.length - 1 ? currentSlideIndex + 1 : 0;
    goToSlide(nextIdx);
  }, [allSlides.length, currentSlideIndex, goToSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      goToNextSlide();
    } else if (diff < -45) {
      goToPrevSlide();
    }
    setTouchStartX(null);
  };

  // User clicks a variant button: Select variant & scroll carousel to variant's image
  const handleSelectVariant = async (v: ApiProductVariant) => {
    setSelectedVariant(v);
    setQuantity(1);

    // If this variant has custom photos, slide carousel directly to that variant's first image
    const variantSlideIndex = allSlides.findIndex(
      (s) => s.scope === "VARIANT" && s.variantId === v.variantId
    );
    if (variantSlideIndex !== -1) {
      setCurrentSlideIndex(variantSlideIndex);
    } else {
      // Fallback: If variant has no custom photos, show first general photo
      const firstGeneralIdx = allSlides.findIndex((s) => s.scope === "GENERAL");
      if (firstGeneralIdx !== -1) {
        setCurrentSlideIndex(firstGeneralIdx);
      }
    }

    if (!product) return;
    try {
      const compRes = await productCompatibilitiesApi.list(product.productId, v.variantId);
      setCompatibilities(compRes.data || []);
    } catch {
      setCompatibilities([]);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!isDeliverable) {
      setToastMessage(`Pengiriman tidak tersedia: Toko ini hanya melayani pengiriman dalam kota (${merchantCity}).`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (!selectedVariant && product.variants && product.variants.length > 0) {
      setToastMessage("Silakan pilih salah satu varian produk terlebih dahulu.");
      setDrawerMode("CART");
      setMobileDrawerOpen(true);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const effectiveVariant = selectedVariant || (product.variants?.[0] ?? null);
    if (!effectiveVariant) return;

    try {
      await addItem(
        {
          id: product.productId,
          title: `${product.name} - ${effectiveVariant.name}`,
          category: product.categoryName || product.categoryId,
          price: effectiveVariant.price,
          stock: effectiveVariant.stock,
          merchantId: product.merchantOrganizationId || "MERCH-DEFAULT",
          merchantName: product.merchantName || product.providerName || "Toko Mitra SERVIO",
          variantId: effectiveVariant.variantId,
        } as any,
        quantity,
        undefined,
        effectiveVariant.variantId
      );
      setToastMessage(`${quantity}x "${product.name} (${effectiveVariant.name})" berhasil masuk ke keranjang!`);
      setTimeout(() => setToastMessage(null), 3500);
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
    if (!product) return;

    if (!isDeliverable) {
      setToastMessage(`Pengiriman tidak tersedia: Toko ini hanya melayani pengiriman dalam kota (${merchantCity}).`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (!selectedVariant && product.variants && product.variants.length > 0) {
      setToastMessage("Silakan pilih salah satu varian produk terlebih dahulu.");
      setDrawerMode("BUY");
      setMobileDrawerOpen(true);
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const effectiveVariant = selectedVariant || (product.variants?.[0] ?? null);
    if (!effectiveVariant) return;

    try {
      await addItem(
        {
          id: product.productId,
          title: `${product.name} - ${effectiveVariant.name}`,
          category: product.categoryName || product.categoryId,
          price: effectiveVariant.price,
          stock: effectiveVariant.stock,
          merchantId: product.merchantOrganizationId || "MERCH-DEFAULT",
          merchantName: product.merchantName || product.providerName || "Toko Mitra SERVIO",
          variantId: effectiveVariant.variantId,
        } as any,
        quantity,
        undefined,
        effectiveVariant.variantId
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
    return (
      <div className="min-h-[70vh] bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-3xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mb-3 animate-pulse shadow-xs">
          <Package size={32} weight="duotone" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Memuat detail katalog suku cadang resmi...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <Package size={32} weight="duotone" />
        </div>
        <h2 className="text-base font-bold text-slate-900 font-heading">Produk Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
          Katalog suku cadang ini mungkin telah dinonaktifkan atau tautan yang Anda tuju sudah kedaluwarsa.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Kembali ke Katalog Produk</span>
        </Link>
      </div>
    );
  }

  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
  const currentSlide = allSlides[currentSlideIndex] || allSlides[0];
  const resolvedBrand = product.brandName || (product as any).brand || "Universal / OEM";
  const merchantStoreName = product.merchantName || product.providerName || "Toko Mitra SERVIO";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 md:pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={20} weight="fill" />
          </div>
          <span className="text-xs font-semibold text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* 1. Clean Non-Sticky Breadcrumb (Standard, No Floating Overlay) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
          <Link href="/" className="hover:text-slate-900 transition">
            Beranda
          </Link>
          <CaretRight size={12} className="text-slate-400" />
          <Link href="/products" className="hover:text-slate-900 transition">
            Katalog Produk
          </Link>
          <CaretRight size={12} className="text-slate-400" />
          <span className="text-slate-600 font-medium">
            {product.categoryName || product.categoryId}
          </span>
          <CaretRight size={12} className="text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-[280px] sm:max-w-md">
            {product.name}
          </span>
        </nav>
      </div>

      {/* 2. Main Product Hero Box (Standard 1280px Container, Clean Two-Column Layout) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN (lg:col-span-5): Interactive Product Carousel & Gallery */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Carousel Container */}
              <div
                className="relative w-full aspect-square rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden select-none group shadow-2xs"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Horizontal sliding track */}
                <div
                  className="flex w-full h-full transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(-${allSlides.length > 0 ? currentSlideIndex * 100 : 0}%)`,
                  }}
                >
                  {allSlides.length > 0 ? (
                    allSlides.map((slide, idx) => (
                      <div
                        key={slide.id || idx}
                        className="w-full h-full shrink-0 relative p-6 flex items-center justify-center bg-white/40"
                      >
                        <img
                          src={slide.url}
                          alt={slide.variantName ? `${product.name} - ${slide.variantName}` : product.name}
                          className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#0F4C81]">
                      <div className="w-20 h-20 rounded-2xl bg-white shadow-2xs border border-slate-200/60 flex items-center justify-center">
                        <Package size={44} weight="duotone" />
                      </div>
                      <span className="text-xs text-slate-400 mt-2 font-medium">Belum ada foto produk</span>
                    </div>
                  )}
                </div>

                {/* Floating Tags (Top-Left): Authenticity & Slide Identity */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                    <CheckCircle size={13} weight="fill" />
                    <span>100% Suku Cadang Asli</span>
                  </div>

                  {currentSlide && (
                    currentSlide.scope === "VARIANT" ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F4C81] text-white text-[10px] font-bold shadow-md animate-in fade-in duration-200">
                        <Sparkle size={12} weight="fill" className="text-amber-300 animate-pulse" />
                        <span>Foto Varian: {currentSlide.variantName}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-semibold backdrop-blur-xs shadow-xs">
                        <Package size={12} weight="duotone" />
                        <span>Foto Umum Produk</span>
                      </div>
                    )
                  )}
                </div>

                {/* Floating Counter (Top-Right) */}
                {allSlides.length > 0 && (
                  <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs">
                      {currentSlideIndex + 1} / {allSlides.length}
                    </span>
                  </div>
                )}

                {/* Left & Right Chevron Arrows */}
                {allSlides.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevSlide();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 z-10 cursor-pointer"
                      title="Foto Sebelumnya"
                      aria-label="Foto Sebelumnya"
                    >
                      <CaretLeft size={16} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextSlide();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 z-10 cursor-pointer"
                      title="Foto Berikutnya"
                      aria-label="Foto Berikutnya"
                    >
                      <CaretRight size={16} weight="bold" />
                    </button>
                  </>
                )}

                {/* Pagination Dots (Inside bottom container) */}
                {allSlides.length > 1 && (
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10 pointer-events-auto">
                    {allSlides.map((slide, idx) => {
                      const isActive = idx === currentSlideIndex;
                      return (
                        <button
                          key={slide.id || idx}
                          type="button"
                          onClick={() => goToSlide(idx)}
                          className={`h-2.5 transition-all duration-300 rounded-full cursor-pointer ${
                            isActive
                              ? "w-7 bg-[#0F4C81] shadow-md ring-2 ring-white/70"
                              : slide.scope === "VARIANT"
                              ? "w-2.5 bg-sky-300 hover:bg-sky-400 ring-1 ring-white/50"
                              : "w-2.5 bg-slate-300 hover:bg-slate-400 ring-1 ring-white/50"
                          }`}
                          title={
                            slide.variantName
                              ? `Foto Varian: ${slide.variantName}`
                              : `Foto Umum ${idx + 1}`
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Thumbnails Strip with Scope Indicators */}
              {allSlides.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-thin">
                  {allSlides.map((slide, idx) => {
                    const isSelected = currentSlideIndex === idx;
                    return (
                      <button
                        key={slide.id || idx}
                        type="button"
                        onClick={() => goToSlide(idx)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden bg-white shrink-0 transition-all cursor-pointer relative group ${
                          isSelected
                            ? "border-[#0F4C81] scale-105 shadow-sm ring-2 ring-[#0F4C81]/25"
                            : "border-slate-200/90 opacity-70 hover:opacity-100 hover:border-slate-300"
                        }`}
                        title={slide.variantName ? `Varian: ${slide.variantName}` : `Foto Umum ${idx + 1}`}
                      >
                        <img src={slide.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        {slide.scope === "VARIANT" ? (
                          <span className="absolute bottom-0 inset-x-0 bg-[#0F4C81]/90 text-[8px] font-bold text-white text-center py-0.5 truncate px-0.5">
                            Varian
                          </span>
                        ) : (
                          <span className="absolute bottom-0 inset-x-0 bg-slate-800/70 text-[8px] font-medium text-white text-center py-0.5 truncate px-0.5">
                            Umum
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Trust & Guarantee Notes */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" weight="fill" />
                  <span>SERVIO Shield Protection</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Truck size={16} className="text-[#0F4C81] shrink-0" weight="fill" />
                  <span>Pengiriman Aman &amp; Cepat</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (lg:col-span-7): Product Title, Price, Variants & Purchase */}
            <div className="lg:col-span-7 space-y-4">
              {/* Category, Brand & ID Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  {product.categoryName || product.categoryId}
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Merek: {resolvedBrand}
                </span>
                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                  ID: {product.productId.slice(0, 16)}...
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading tracking-tight leading-snug">
                {product.name}
              </h1>

              {/* Rating & Social Proof */}
              <div className="flex items-center gap-3 text-xs text-slate-500 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star size={15} weight="fill" />
                  <span className="text-slate-800">4.9</span>
                </div>
                <span>&bull;</span>
                <span>48+ Ulasan Pelanggan</span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-semibold">Terjual 120+ unit</span>
              </div>

              {/* Price & Stock Box */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {selectedVariant ? `Harga Varian: ${selectedVariant.name}` : "Rentang Harga Produk (Semua Varian)"}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#0F4C81] font-heading mt-0.5">
                  {selectedVariant
                    ? formatRupiah(selectedVariant.price)
                    : product.priceRangeFormatted || product.priceDisplay || "Pilih Varian"}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {selectedVariant ? (
                    isOutOfStock ? (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                        Stok Habis
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Sisa Stok: {selectedVariant.stock} Unit Ready
                      </span>
                    )
                  ) : (
                    <span className="text-xs font-medium text-slate-500">
                      Total Stok: {product.totalStock ?? 0} Unit &bull; Pilih salah satu varian untuk melihat ketersediaan spesifik
                    </span>
                  )}
                </div>
              </div>

              {/* Merchant Store Card with City Origin */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl transition shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/merchants/${product.merchantOrganizationId}/storefront`}
                    className="flex items-center gap-2.5 truncate group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C81] text-white flex items-center justify-center shrink-0">
                      <Storefront size={17} weight="duotone" />
                    </div>
                    <div className="truncate text-xs">
                      <span className="text-[10px] text-slate-400 block leading-tight font-medium">Penjual Resmi:</span>
                      <span className="font-bold text-slate-900 group-hover:text-[#0F4C81] truncate block transition">
                        {merchantStoreName}
                      </span>
                    </div>
                  </Link>

                  <Link
                    href={`/merchants/${product.merchantOrganizationId}/storefront`}
                    className="text-[11px] font-bold text-[#0F4C81] hover:underline shrink-0"
                  >
                    Kunjungi Toko &rarr;
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                  <MapPin size={13} className="text-rose-500 shrink-0" weight="fill" />
                  <span>Lokasi Toko: <strong className="text-slate-800">{merchantCity}</strong></span>
                  {product.merchant?.district && (
                    <span className="text-slate-400">({product.merchant.district})</span>
                  )}
                </div>
              </div>

              {/* Delivery Scope Notice (LUAR KOTA TIDAK BISA vs SEKOTA BISA) */}
              {!isDeliverable ? (
                /* OUT-OF-CITY RESTRICTION CARD */
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50/50 to-rose-50 border-2 border-rose-300 text-slate-900 space-y-3 shadow-xs animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <WarningCircle size={22} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-rose-950 font-heading">
                          Pengiriman Tidak Tersedia ke Lokasi Anda
                        </h3>
                        <p className="text-xs text-rose-900/90 leading-relaxed mt-0.5">
                          Toko ini berlokasi di <strong>{deliveryCheck.merchantCity}</strong> dan saat ini <strong>hanya melayani pengiriman dalam kota</strong>.
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Lokasi Anda saat ini terdeteksi di: <strong className="text-slate-900">{deliveryCheck.userCity}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openLocationModal}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-300 transition shrink-0 shadow-2xs cursor-pointer"
                    >
                      Ubah Alamat
                    </button>
                  </div>

                  <div className="text-[11px] text-rose-900/90 bg-white/90 p-2.5 rounded-xl border border-rose-200/80 flex items-center gap-2">
                    <Storefront size={15} className="text-rose-600 shrink-0" />
                    <span>Silakan ubah alamat pengerjaan Anda atau cari suku cadang serupa dari mitra toko terdekat di kota Anda.</span>
                  </div>
                </div>
              ) : (
                /* IN-CITY LOCAL OPTIONS CARD */
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-slate-900 space-y-2 shadow-xs animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600 shrink-0" weight="fill" />
                      <span className="text-xs font-bold text-emerald-950 font-heading">
                        Pengiriman Sekota Tersedia ke {deliveryCheck.userCity}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={openLocationModal}
                      className="text-[11px] text-emerald-800 hover:text-emerald-900 font-bold underline cursor-pointer"
                    >
                      Ganti Lokasi
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-emerald-100 text-emerald-900 font-medium">
                      <Truck size={14} className="text-emerald-600 shrink-0" weight="bold" />
                      <span>Instan (2-3 Jam)</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-emerald-100 text-emerald-900 font-medium">
                      <Package size={14} className="text-emerald-600 shrink-0" weight="bold" />
                      <span>Kurir Sameday</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 bg-white rounded-xl border border-emerald-100 text-emerald-900 font-medium col-span-2 sm:col-span-1">
                      <Storefront size={14} className="text-emerald-600 shrink-0" weight="bold" />
                      <span>Ambil di Toko</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Variant Selector Chips with Foto Umum Option */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 font-heading">
                    Pilihan Varian Produk:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerMode("SELECT");
                      setMobileDrawerOpen(true);
                    }}
                    className="md:hidden text-[11px] text-[#0F4C81] font-bold underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Foto Umum Button (Resets variant selection to general photos) */}
                  <button
                    type="button"
                    onClick={() => {
                      const firstGenIdx = allSlides.findIndex((s) => s.scope === "GENERAL");
                      if (firstGenIdx !== -1) setCurrentSlideIndex(firstGenIdx);
                      setSelectedVariant(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${
                      selectedVariant === null
                        ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-md ring-2 ring-[#0F4C81]/30 font-bold scale-[1.02]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {selectedVariant === null && <CheckCircle size={13} weight="fill" className="text-sky-300" />}
                      <span>Foto Umum</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${selectedVariant === null ? "text-sky-200" : "text-slate-500"}`}>
                      Semua Varian
                    </div>
                  </button>

                  {product.variants?.map((v) => {
                    const isSelected = selectedVariant?.variantId === v.variantId;
                    return (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${
                          isSelected
                            ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-md ring-2 ring-[#0F4C81]/30 font-bold scale-[1.02]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isSelected && <CheckCircle size={13} weight="fill" className="text-sky-300" />}
                          <span>{v.name}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? "text-sky-100 font-medium" : "text-slate-500"}`}>
                          Rp{v.price.toLocaleString("id-ID")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Stepper (Desktop view) */}
              {!isOutOfStock && (
                <div className="hidden md:flex items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-slate-700 font-heading">Jumlah:</span>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Minus size={13} weight="bold" />
                    </button>
                    <span className="w-9 text-center text-xs font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      disabled={Boolean(selectedVariant && quantity >= selectedVariant.stock)}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Plus size={13} weight="bold" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Unit</span>
                </div>
              )}

              {/* Desktop Action Buttons: Compact, Clean Horizontal Row */}
              <div className="hidden md:flex items-center gap-3 pt-3">
                <button
                  type="button"
                  disabled={isOutOfStock || !isDeliverable}
                  onClick={handleAddToCart}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                    !isDeliverable
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                      : isOutOfStock
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                      : "bg-[#0F4C81] hover:bg-[#0B3860] text-white shadow-xs"
                  }`}
                  title={!isDeliverable ? `Toko ini hanya melayani pengiriman di area ${merchantCity}` : undefined}
                >
                  <ShoppingCart size={16} weight="bold" className="shrink-0" />
                  <span>{!isDeliverable ? "Di Luar Jangkauan Toko" : "+ Keranjang Belanja"}</span>
                </button>
                <button
                  type="button"
                  disabled={isOutOfStock || !isDeliverable}
                  onClick={handleBuyNow}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-xs cursor-pointer ${
                    !isDeliverable
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                      : isOutOfStock
                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80"
                      : "bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-xs"
                  }`}
                  title={!isDeliverable ? `Toko ini hanya melayani pengiriman di area ${merchantCity}` : undefined}
                >
                  <span>{!isDeliverable ? "Tidak Bisa Dikirim" : "Beli Langsung"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Specifications, Compatibility & Warranty Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-5">
        {/* Description Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-heading">
            Deskripsi &amp; Spesifikasi Produk
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              Merek Resmi: <strong className="text-slate-800">{resolvedBrand}</strong>
            </span>
            <span className="text-xs font-semibold text-[#0F4C81] bg-sky-50 px-3 py-1 rounded-lg border border-sky-200">
              Kategori: {product.categoryName || product.categoryId}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {product.description || "Tidak ada rincian deskripsi tambahan untuk suku cadang ini."}
          </p>

          {/* Technical Compatibility Section */}
          {compatibilities.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2.5">
                <ArrowsLeftRight size={16} className="text-[#0F4C81]" weight="bold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                  Kesesuaian Teknis &amp; Kompatibilitas Suku Cadang
                </h3>
              </div>
              <div className="space-y-2">
                {compatibilities.map((c) => (
                  <div key={c.compatibilityId} className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs">
                    <div className="font-bold text-[#0F4C81]">
                      Kompatibel dengan: {c.targetVariant?.name || c.variantBId}
                    </div>
                    {c.notes && <p className="text-[11px] text-slate-600 mt-0.5">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty Policy */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2.5">
              <ShieldCheck size={16} className="text-emerald-700" weight="bold" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-heading">
                Kebijakan Garansi &amp; Jaminan Resmi
              </h3>
            </div>
            {(product as any).warrantyPolicy?.durationMonths ? (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 font-heading">
                    Masa Garansi Resmi: {(product as any).warrantyPolicy.durationMonths} Bulan
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {(product as any).warrantyPolicy.type === "MANUFACTURER"
                      ? "Garansi Resmi Pabrikan"
                      : (product as any).warrantyPolicy.type === "STORE_ONLY"
                      ? "Garansi Toko Mitra"
                      : "Garansi Resmi Terdaftar"}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  <strong>Cakupan:</strong> {(product as any).warrantyPolicy.coverage || "Kerusakan manufaktur dan malafungsi kelistrikan."}
                </p>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  <strong>Pengecualian:</strong> {(product as any).warrantyPolicy.exclusions || "Kerusakan fisik akibat jatuh, kesalahan instalasi non-resmi, atau modifikasi liar."}
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-800">Suku Cadang Standar Pabrikan (Non-Garansi Purnajual)</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Produk ini tergolong suku cadang umum atau barang habis pakai. Pembeli tetap dilindungi asuransi pengiriman serta jaminan barang baru &amp; utuh saat unboxing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Related Products & Other Merchant Recommendations */}
        {relatedProducts.length > 0 && (() => {
          const currentMerchantId = product.merchantOrganizationId || product.merchant?.id;
          const sameStoreProducts = relatedProducts.filter((p) => (p.merchantOrganizationId || p.merchant?.id) === currentMerchantId);
          const otherMerchantProducts = relatedProducts.filter((p) => (p.merchantOrganizationId || p.merchant?.id) !== currentMerchantId);

          const displayedProducts =
            activeCatalogTab === "SAME_STORE"
              ? sameStoreProducts
              : activeCatalogTab === "OTHER_MERCHANTS"
              ? otherMerchantProducts
              : relatedProducts;

          return (
            <div className="pt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                    <span>Rekomendasi Suku Cadang Lain</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {relatedProducts.length} Produk
                    </span>
                  </h2>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCatalogTab("ALL")}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      activeCatalogTab === "ALL"
                        ? "bg-white text-[#0F4C81] shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Semua ({relatedProducts.length})
                  </button>
                  {sameStoreProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab("SAME_STORE")}
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        activeCatalogTab === "SAME_STORE"
                          ? "bg-white text-[#0F4C81] shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Toko Ini ({sameStoreProducts.length})
                    </button>
                  )}
                  {otherMerchantProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveCatalogTab("OTHER_MERCHANTS")}
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        activeCatalogTab === "OTHER_MERCHANTS"
                          ? "bg-white text-[#0F4C81] shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Merchant Lain ({otherMerchantProducts.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedProducts.slice(0, 8).map((rel) => {
                  const relImg = getProductMediaUrl(rel.media);
                  const isOtherMerchant = (rel.merchantOrganizationId || rel.merchant?.id) !== currentMerchantId;
                  const storeName = rel.merchantName || rel.merchant?.name || "Mitra Toko SERVIO";
                  return (
                    <Link
                      key={rel.productId}
                      href={`/products/${rel.productId}`}
                      className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
                    >
                      <div className="h-40 w-full bg-slate-50 p-3 flex items-center justify-center border-b border-slate-100 overflow-hidden relative shrink-0">
                        {relImg ? (
                          <img
                            src={relImg}
                            alt={rel.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Package size={36} weight="duotone" className="text-slate-300 group-hover:scale-105 transition-transform" />
                        )}
                        <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-slate-700 border border-slate-200">
                          {rel.categoryName || "Suku Cadang"}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 text-[10px] text-slate-600 truncate">
                              <Storefront size={12} weight="fill" className={isOtherMerchant ? "text-amber-600" : "text-[#0F4C81]"} />
                              <span className="truncate font-medium">{storeName}</span>
                            </div>
                            {isOtherMerchant && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                                Merchant Lain
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 font-semibold truncate">
                            {rel.brandName || "Universal / OEM"}
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 group-hover:text-[#0F4C81] transition font-heading">
                            {rel.name}
                          </h3>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="text-xs font-bold text-[#0F4C81]">
                            {rel.priceRangeFormatted || rel.priceDisplay}
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Stok: {rel.totalStock ?? 1} unit
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ============================================================ */}
      {/* SHOPEE-STYLE MOBILE STICKY BOTTOM BAR (Mobile only: md:hidden) */}
      {/* ============================================================ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.09)] px-3 py-2 flex items-center gap-2">
        {/* Shortcut 1: Store */}
        <Link
          href={`/merchants/${product.merchantOrganizationId}/storefront`}
          className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 hover:text-[#0F4C81] shrink-0"
        >
          <Storefront size={20} weight="regular" />
          <span className="text-[9px] font-semibold mt-0.5">Toko</span>
        </Link>

        {/* Shortcut 2: Cart */}
        <Link
          href="/cart"
          className="flex flex-col items-center justify-center px-2 py-1 text-slate-600 hover:text-[#0F4C81] shrink-0 relative"
        >
          <ShoppingCart size={20} weight="regular" />
          {totalItemCount > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 rounded-full bg-[#F43F5E] text-white text-[9px] font-bold flex items-center justify-center">
              {totalItemCount > 9 ? "9+" : totalItemCount}
            </span>
          )}
          <span className="text-[9px] font-semibold mt-0.5">Keranjang</span>
        </Link>

        {/* Action Buttons: + Keranjang & Beli Sekarang (or Out-of-city Warning) */}
        {!isDeliverable ? (
          <div className="flex-1 flex items-center justify-between gap-2 p-1.5 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-rose-950 truncate pl-1">
              <WarningCircle size={16} className="text-rose-600 shrink-0" weight="fill" />
              <span className="truncate font-bold text-[11px]">Luar Kota ({merchantCity})</span>
            </div>
            <button
              type="button"
              onClick={openLocationModal}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shrink-0 shadow-xs cursor-pointer active:scale-95 transition"
            >
              Ubah Alamat
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                setDrawerMode("CART");
                setMobileDrawerOpen(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ShoppingCart size={15} weight="bold" />
              <span>+ Keranjang</span>
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                setDrawerMode("BUY");
                setMobileDrawerOpen(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold transition flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span>Beli Sekarang</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SHOPEE-STYLE VARIANT BOTTOM SHEET DRAWER (Mobile only) */}
      {/* ============================================================ */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Bottom Sheet Modal (Slides up from bottom) */}
          <div className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Header: Thumbnail, Price & Stock Info */}
            <div className="p-4 border-b border-slate-100 flex items-start gap-3">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {currentSlide?.url || allSlides[0]?.url ? (
                  <img src={currentSlide?.url || allSlides[0]?.url} alt={product.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Package size={32} weight="duotone" className="text-[#0F4C81]" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="text-lg sm:text-xl font-extrabold text-[#0F4C81] font-heading">
                  {selectedVariant ? formatRupiah(selectedVariant.price) : (product.priceRangeFormatted || product.priceDisplay || "Pilih Varian")}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Stok: <b className="text-slate-800">{selectedVariant ? `${selectedVariant.stock} unit` : `Total ${product.totalStock ?? 0} unit`}</b>
                </div>
                <div className="text-xs text-slate-600 mt-0.5 truncate">
                  Varian: <span className="font-semibold text-slate-900">{selectedVariant?.name || "Foto Umum (Belum Memilih Varian)"}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer absolute top-3 right-3"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content: Variants & Quantity */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1">
              {/* Variant Choices */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 font-heading">
                  Pilihan Varian Produk
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstGenIdx = allSlides.findIndex((s) => s.scope === "GENERAL");
                      if (firstGenIdx !== -1) setCurrentSlideIndex(firstGenIdx);
                      setSelectedVariant(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${
                      selectedVariant === null
                        ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {selectedVariant === null && <CheckCircle size={12} weight="fill" className="text-sky-300" />}
                      <span>Foto Umum</span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${selectedVariant === null ? "text-sky-200" : "text-slate-500"}`}>
                      Semua Varian
                    </div>
                  </button>

                  {product.variants?.map((v) => {
                    const isSelected = selectedVariant?.variantId === v.variantId;
                    return (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${
                          isSelected
                            ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs font-bold"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          {isSelected && <CheckCircle size={12} weight="fill" className="text-sky-300" />}
                          <span>{v.name}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? "text-sky-200" : "text-slate-500"}`}>
                          Rp{v.price.toLocaleString("id-ID")}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Stepper */}
              {!isOutOfStock && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-heading">
                      Jumlah Pembelian
                    </h4>
                    <span className="text-[11px] text-slate-400">Tentukan jumlah unit yang dibutuhkan</span>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={14} weight="bold" />
                    </button>
                    <span className="w-10 text-center text-xs font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      disabled={Boolean(selectedVariant && quantity >= selectedVariant.stock)}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus size={14} weight="bold" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Drawer Action Confirmation Button */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {!isDeliverable ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-rose-950 font-bold p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <WarningCircle size={18} className="text-rose-600 shrink-0" weight="fill" />
                    <span>Tidak dapat dikirim ke wilayah {deliveryCheck.userCity}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      openLocationModal();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center shadow-xs cursor-pointer active:scale-98"
                  >
                    <span>Ubah Alamat Pengiriman</span>
                  </button>
                </div>
              ) : drawerMode === "BUY" ? (
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={async () => {
                    setMobileDrawerOpen(false);
                    await handleBuyNow();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold transition flex items-center justify-center shadow-lg shadow-rose-900/20 cursor-pointer disabled:opacity-50"
                >
                  <span>Beli Sekarang</span>
                </button>
              ) : drawerMode === "CART" ? (
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={async () => {
                    setMobileDrawerOpen(false);
                    await handleAddToCart();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingCart size={16} weight="bold" />
                  <span>+ Masukkan Keranjang</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <span>Konfirmasi Pilihan Varian</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
