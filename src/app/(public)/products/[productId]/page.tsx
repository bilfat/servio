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
import { orderBarangApi } from "@/lib/orderBarangApi";
import { ApiProduct, ApiProductVariant, ApiProductCompatibility, getProductMediaUrl } from "@/types/domain";
import { useCart } from "@/features/cart/useCart";
import { triggerFlyToCart } from "@/components/feedback/FlyToCart";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { useActiveLocation } from "@/context/LocationContext";
import { afterSalesApi, ReviewEntry, CatalogRatingSummaryItem, BusinessReputation } from "@/lib/afterSalesApi";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = (params?.productId as string) || "";

  const { addItem, totalItemCount } = useCart();
  const { location: activeLocation, checkDeliveryAvailability, openLocationModal, getStoreDistance } = useActiveLocation();
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

  // Live After-Sales Verified Reviews (PUB03) & Separate Merchant Reputation (PUB05)
  const [productReviews, setProductReviews] = useState<ReviewEntry[]>([]);
  const [reviewSummary, setReviewSummary] = useState<CatalogRatingSummaryItem | null>(null);
  const [merchantReputation, setMerchantReputation] = useState<BusinessReputation | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setReviewsLoading(true);
    afterSalesApi.public
      .getProductReviews(productId)
      .then((res) => {
        if (res.data) setProductReviews(res.data);
        if (res.meta?.summary) setReviewSummary(res.meta.summary);
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [productId]);

  useEffect(() => {
    const orgId = product?.merchantOrganizationId || product?.merchant?.id;
    if (!orgId) return;
    afterSalesApi.public
      .getBusinessReputation("MERCHANT", orgId)
      .then((res) => {
        if (res.data) setMerchantReputation(res.data);
      })
      .catch(() => {});
  }, [product?.merchantOrganizationId, product?.merchant?.id]);

  // Shopee-style Mobile Variant Bottom Sheet Drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"CART" | "BUY" | "SELECT">("CART");

  // Delivery availability evaluation based on active location and backend delivery settings
  const [backendDelivery, setBackendDelivery] = useState<{
    is_deliverable: boolean;
    distance_km: number;
    maximum_distance_km: number;
    is_enabled: boolean;
    origin_city?: string;
    reason?: string | null;
  } | null>(null);

  const merchantCity = backendDelivery?.origin_city || product?.merchant?.city || product?.merchantCity || "Jakarta Pusat";

  useEffect(() => {
    const orgId = product?.merchantOrganizationId || product?.merchant?.id;
    if (!orgId) return;

    orderBarangApi.public
      .checkDelivery({
        merchant_org_id: orgId,
        dest_lat: activeLocation.latitude,
        dest_lng: activeLocation.longitude,
        dest_city: activeLocation.city,
      })
      .then((res) => {
        if (res.data) {
          setBackendDelivery(res.data);
        }
      })
      .catch(() => { });
  }, [
    product?.merchantOrganizationId,
    product?.merchant?.id,
    activeLocation.latitude,
    activeLocation.longitude,
    activeLocation.city,
  ]);

  const isDeliverable = backendDelivery ? backendDelivery.is_deliverable : true;
  const distanceKm = backendDelivery ? backendDelivery.distance_km : null;
  const maxRadiusKm = backendDelivery ? backendDelivery.maximum_distance_km : 25;
  const deliveryReason = backendDelivery?.reason;

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

      // Solusi 1: Fetch Product Detail and Catalog Recommendations concurrently in parallel!
      const [detailSettled, listSettled] = await Promise.allSettled([
        productsApi.get(productId),
        productsApi.list({ limit: 12 }),
      ]);

      let prod: ApiProduct | null = null;
      if (detailSettled.status === "fulfilled" && detailSettled.value?.data) {
        prod = detailSettled.value.data;
        setProduct(prod);
        if (prod.variants && prod.variants.length > 0) {
          setSelectedVariant(prod.variants[0]);
          // Load compatibilities asynchronously for first variant
          productCompatibilitiesApi
            .list(prod.productId, prod.variants[0].variantId)
            .then((compRes) => setCompatibilities(compRes.data || []))
            .catch(() => setCompatibilities([]));
        } else {
          setSelectedVariant(null);
        }
      } else {
        setProduct(null);
      }

      if (listSettled.status === "fulfilled" && listSettled.value?.data) {
        const allOthers = (listSettled.value.data || []).filter(
          (p) => p.productId !== (prod?.productId || productId)
        );
        setRelatedProducts(allOthers);
      } else {
        const fallback = (prod?.relatedProducts || []).filter(
          (p) => p.productId !== (prod?.productId || productId)
        );
        setRelatedProducts(fallback);
      }

      setLoading(false);
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
      setToastMessage(deliveryReason || `Pengiriman tidak tersedia: Jarak ke lokasi Anda (${distanceKm || ""} km) melebihi batas radius toko (${maxRadiusKm} km).`);
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

    // 1. INSTANTLY trigger 3D Fly-to-Cart animation and toast feedback (0ms delay!)
    const imgElem = document.getElementById("product-main-image");
    const btnElem = document.getElementById("btn-add-to-cart");
    let sourceElem = imgElem;
    if (imgElem) {
      const rect = imgElem.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        sourceElem = btnElem;
      }
    } else {
      sourceElem = btnElem;
    }

    const activeImageUrl =
      allSlides[currentSlideIndex]?.url ||
      allSlides[0]?.url ||
      getProductMediaUrl(product.media) ||
      "/brand/logo.png";

    triggerFlyToCart({
      sourceElement: sourceElem,
      imageUrl: activeImageUrl,
    });

    setToastMessage(`${quantity}x "${product.name} (${effectiveVariant.name})" berhasil masuk ke keranjang!`);
    setTimeout(() => setToastMessage(null), 3500);

    // 2. Concurrently execute backend cart addition in background
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
          thumbnailUrl: allSlides.find((s) => s.variantId === effectiveVariant.variantId)?.url || allSlides[0]?.url,
        } as any,
        quantity,
        undefined,
        effectiveVariant.variantId
      );
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
      setToastMessage(deliveryReason || `Pengiriman tidak tersedia: Jarak ke lokasi Anda (${distanceKm || ""} km) melebihi batas radius toko (${maxRadiusKm} km).`);
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
          thumbnailUrl: allSlides.find((s) => s.variantId === effectiveVariant.variantId)?.url || allSlides[0]?.url,
        } as any,
        quantity,
        undefined,
        effectiveVariant.variantId
      );
      const targetItemId = effectiveVariant.variantId
        ? `${product.productId}_${effectiveVariant.variantId}`
        : product.productId;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("servio_selected_cart_items_v1", JSON.stringify([targetItemId, product.productId]));
        } catch {}
      }

      router.push(`/checkout/products?from=detail&productId=${product.productId}&items=${encodeURIComponent(targetItemId)}`);
    } catch (err: unknown) {
      const error = err as { status?: number; message?: string };
      if (error?.status === 401 || error?.message?.includes("Unauthenticated")) {
        const targetItemId = effectiveVariant?.variantId
          ? `${product.productId}_${effectiveVariant.variantId}`
          : product.productId;
        router.push(`/auth/login?returnUrl=${encodeURIComponent(`/checkout/products?from=detail&productId=${product.productId}&items=${encodeURIComponent(targetItemId)}`)}`);
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
                          id={idx === currentSlideIndex ? "product-main-image" : undefined}
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

                  {currentSlide && currentSlide.scope === "VARIANT" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F4C81] text-white text-[10px] font-bold shadow-md animate-in fade-in duration-200">
                      <Sparkle size={12} weight="fill" className="text-amber-300 animate-pulse" />
                      <span>Foto Varian: {currentSlide.variantName}</span>
                    </div>
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
                          className={`h-2.5 transition-all duration-300 rounded-full cursor-pointer ${isActive
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
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden bg-white shrink-0 transition-all cursor-pointer relative group ${isSelected
                          ? "border-[#0F4C81] scale-105 shadow-sm ring-2 ring-[#0F4C81]/25"
                          : "border-slate-200/90 opacity-70 hover:opacity-100 hover:border-slate-300"
                          }`}
                        title={slide.variantName ? `Varian: ${slide.variantName}` : `Foto Umum ${idx + 1}`}
                      >
                        <img src={slide.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                        {slide.scope === "VARIANT" && (
                          <span className="absolute bottom-0 inset-x-0 bg-[#0F4C81]/90 text-[8px] font-bold text-white text-center py-0.5 truncate px-0.5">
                            Varian
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 group-hover:text-[#0F4C81] truncate block transition">
                          {merchantStoreName}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                          <Star size={11} weight="fill" className="text-amber-400" />
                          {merchantReputation && merchantReputation.total_reviews > 0
                            ? `${Number(merchantReputation.average_rating).toFixed(1)} (${merchantReputation.total_reviews} Penilaian Toko)`
                            : "Belum Ada Penilaian Toko"}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href={`/merchants/${product.merchantOrganizationId}/storefront`}
                    className="text-[11px] font-bold text-[#0F4C81] hover:underline shrink-0"
                  >
                    Kunjungi Toko &rarr;
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-rose-500 shrink-0" weight="fill" />
                    <span>Lokasi Toko: <strong className="text-slate-800">{merchantCity}</strong></span>
                    {product.merchant?.district && (
                      <span className="text-slate-400">({product.merchant.district})</span>
                    )}
                  </div>
                  {distanceKm != null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      📍 {distanceKm} km
                    </span>
                  )}
                </div>
              </div>

              {/* Delivery Scope Notice: Calculated by Backend & Merchant Delivery Settings */}
              {isDeliverable ? (
                /* DELIVERABLE CARD */
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-slate-900 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-600 shrink-0" weight="fill" />
                    <span className="text-xs sm:text-sm font-semibold text-emerald-950 font-heading">
                      Pengiriman tersedia (jarak toko ke lokasi Anda: <strong className="font-bold text-emerald-900">{distanceKm != null ? `${distanceKm} km` : "..."}</strong>)
                    </span>
                  </div>
                </div>
              ) : (
                /* OUT-OF-RANGE / NOT DELIVERABLE CARD */
                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-slate-900 shadow-xs animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <WarningCircle size={18} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-rose-950 font-heading">
                        Pengiriman Tidak Tersedia
                      </p>
                      <p className="text-xs text-rose-900/90 leading-relaxed">
                        {deliveryReason || `Jarak toko ke lokasi Anda (${distanceKm != null ? `${distanceKm} km` : "..."}) di luar batas radius pengiriman toko (${maxRadiusKm} km).`}
                      </p>
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
                  {product.variants?.map((v) => {
                    const isSelected = selectedVariant?.variantId === v.variantId;
                    return (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${isSelected
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
                  id="btn-add-to-cart"
                  type="button"
                  disabled={isOutOfStock || !isDeliverable}
                  onClick={handleAddToCart}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${!isDeliverable
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
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center shadow-xs cursor-pointer ${!isDeliverable
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

          {/* Section: Garansi Toko (Modul 07 Phase Integration) */}
          <div className="pt-4 border-t border-slate-100">
            {(() => {
              let pol = (product as any).warrantyPolicy || (product as any).warranty_policy;
              if (typeof pol === "string" && pol.trim().startsWith("{")) {
                try {
                  pol = JSON.parse(pol);
                } catch {}
              }
              const days = pol?.durationDays || pol?.duration_days || (pol?.durationMonths ? pol.durationMonths * 30 : null);
              const hasWar = Boolean(pol && days && days > 0);
              const warName = pol?.name || "Garansi Toko Resmi";

              if (hasWar) {
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-emerald-700" weight="fill" />
                        <h3 className="text-sm font-bold text-slate-900 font-heading">
                          Tersedia Garansi Toko
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                        GARANSI RESMI AKTIF ({days} HARI)
                      </span>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl space-y-2.5 text-xs shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-900 uppercase block">Nama Pilihan Garansi</span>
                          <span className="font-extrabold text-emerald-950 text-sm">{warName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-900 uppercase block">Durasi Masa Berlaku</span>
                          <span className="font-bold text-emerald-800 text-xs px-2.5 py-0.5 rounded-md bg-white border border-emerald-200">
                            {days} Hari Kalender
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-emerald-950 leading-relaxed">
                          <strong className="text-emerald-900 font-bold">Cakupan Garansi:</strong>{" "}
                          {pol.coverage || "Perbaikan atau penanganan purna jual jika suku cadang mengalami cacat manufaktur atau malafungsi operasional."}
                        </p>
                        <p className="text-emerald-900/90 leading-relaxed">
                          <strong className="text-emerald-900 font-bold">Pengecualian Garansi:</strong>{" "}
                          {(pol.exclusions && String(pol.exclusions).trim() !== "" && pol.exclusions !== "null") ? pol.exclusions : "Tidak ada pengecualian khusus."}
                        </p>
                        <p className="text-emerald-800/80 leading-relaxed text-[11px] pt-1 border-t border-emerald-200/50">
                          <strong className="text-emerald-900 font-semibold">Syarat &amp; Ketentuan Klaim:</strong>{" "}
                          {pol.terms || "Klaim dapat diajukan pelanggan melalui pusat purnajual selama masa garansi aktif dengan melampirkan bukti kendala produk."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-slate-400" weight="bold" />
                    <h3 className="text-sm font-bold text-slate-800 font-heading">
                      Garansi Toko
                    </h3>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                    <p className="font-bold text-slate-800">
                      Tidak ada garansi tambahan dari toko untuk produk ini.
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Produk ini tidak menyediakan jaminan garansi purnajual jangka panjang dari toko mitra. Meskipun demikian, hak Anda sebagai konsumen tetap dilindungi sepenuhnya oleh <strong>kebijakan retur dan jaminan penerimaan barang SERVIO</strong> jika pesanan yang tiba dalam kondisi rusak fisik, cacat manufaktur awal, atau tidak sesuai pesanan saat serah terima.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Customer Reviews & Ratings Card (PUB03) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Star size={18} weight="fill" className="text-amber-400" />
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Ulasan &amp; Penilaian Kualitas Produk
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {reviewSummary?.total_reviews ?? productReviews.length} Ulasan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan nama pelanggan publik, tanggal order, tanggal penilaian, rating kualitas produk, dan tanggapan resmi toko.
              </p>
            </div>
            {(reviewSummary?.total_reviews ?? productReviews.length) > 0 && (
              <div className="flex items-center gap-3 bg-amber-50/70 px-3.5 py-2 rounded-2xl border border-amber-200">
                <div className="text-center">
                  <span className="text-xl font-extrabold text-slate-900">
                    {(
                      reviewSummary?.average_rating ??
                      productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length
                    ).toFixed(1)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold"> / 5.0</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      weight="fill"
                      className={
                        s <=
                        Math.round(
                          reviewSummary?.average_rating ??
                            productReviews.reduce((acc, r) => acc + r.rating, 0) /
                              productReviews.length
                        )
                          ? "text-amber-400"
                          : "text-slate-300"
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Distribution 5..1 Stars (PUB03) */}
          {(reviewSummary?.total_reviews ?? productReviews.length) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              {[5, 4, 3, 2, 1].map((star) => {
                const total = reviewSummary?.total_reviews ?? productReviews.length;
                const count =
                  reviewSummary?.distribution?.[String(star)] ??
                  productReviews.filter((r) => Math.round(r.rating) === star).length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200/70">
                    <span className="font-bold text-slate-700 flex items-center gap-0.5 shrink-0">
                      {star} <Star size={12} weight="fill" className="text-amber-400" />
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {reviewsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Memuat ulasan pembeli...
            </div>
          ) : productReviews.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Belum ada ulasan untuk produk ini</p>
              <p className="text-[11px] text-slate-400">Jadilah pembeli pertama yang memberikan penilaian setelah pesanan Anda selesai!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productReviews.map((rev) => {
                const publicName =
                  rev.customer_display_name ||
                  (rev.submission?.customer_id
                    ? `Pelanggan #${rev.submission.customer_id.substring(0, 6)}`
                    : "Pembeli Terverifikasi");
                const reviewDateStr = new Date(
                  rev.submitted_at || rev.created_at
                ).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const orderDateStr = rev.ordered_at
                  ? new Date(rev.ordered_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : null;
                const commentText = rev.review_text ?? rev.comment;
                const replyText = rev.reply?.reply_text ?? rev.reply?.text;

                return (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs shrink-0">
                          {publicName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">
                            {publicName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {orderDateStr && (
                              <span>
                                Tanggal Order: <strong className="text-slate-700">{orderDateStr}</strong>
                              </span>
                            )}
                            {orderDateStr && <span className="text-slate-300">•</span>}
                            <span>
                              Tanggal Ulasan: <strong className="text-slate-700">{reviewDateStr}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            weight="fill"
                            className={i < (rev.rating || 5) ? "text-amber-400" : "text-slate-200"}
                          />
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1">{rev.rating || 5}.0</span>
                      </div>
                    </div>

                    {commentText ? (
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {commentText}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Pembeli memberikan rating bintang tanpa komentar tertulis.
                      </p>
                    )}

                    {/* Merchant Reply if exists */}
                    {replyText && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">
                            Balasan Resmi Toko:
                          </span>
                          {rev.reply?.created_at && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(rev.reply.updated_at || rev.reply.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {replyText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${activeCatalogTab === "ALL"
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
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${activeCatalogTab === "SAME_STORE"
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
                      className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${activeCatalogTab === "OTHER_MERCHANTS"
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
                  {product.variants?.map((v) => {
                    const isSelected = selectedVariant?.variantId === v.variantId;
                    return (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition border text-left cursor-pointer ${isSelected
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
                    <span>{deliveryReason || `Tidak dapat dikirim (di luar radius toko ${maxRadiusKm} km)`}</span>
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
