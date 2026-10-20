"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  SlidersHorizontal,
  WarningCircle,
  Storefront,
  Buildings,
  Info,
  FolderSimple,
  Plus,
  Trash,
  PencilSimple,
  Archive,
  ShieldCheck,
  ArrowClockwise,
  Tag,
  CaretRight,
  CaretLeft,
  SquaresFour,
  ListDashes,
  Check,
  X,
  Images,
  Sparkle,
  ShareNetwork,
  ArrowsDownUp,
  Funnel,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { productsApi, productGovernanceApi } from "@/lib/servioApi";
import type { ApiProduct, ProductLifecycleStatus } from "@/types/domain";

function getMediaUrl(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m;
  return m.url || "";
}

function isPrimaryMedia(m: any): boolean {
  if (!m || typeof m === "string") return false;
  return Boolean(m.isPrimary);
}

export default function AdminProductsModerationPage() {
  const [activeTab, setActiveTab] = useState<"moderation" | "audit">("moderation");

  // Products Moderation State
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productStatusFilter, setProductStatusFilter] = useState<string>("ALL");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");
  const [merchantFilter, setMerchantFilter] = useState<string>("ALL");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Detailed Product Modal / Slide-over Drawer
  const [inspectingProduct, setInspectingProduct] = useState<ApiProduct | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedDetailImage, setSelectedDetailImage] = useState<string | null>(null);
  const [generalSlideIndex, setGeneralSlideIndex] = useState(0);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);

  // In-memory detail cache to make opening and re-inspecting products instantaneous
  const productDetailCache = React.useRef<Map<string, ApiProduct>>(new Map());

  // Moderation Decision State
  const [selectedProductForStatus, setSelectedProductForStatus] = useState<ApiProduct | null>(null);
  const [moderationDecision, setModerationDecision] = useState<"ACTIVE" | "INACTIVE" | "ARCHIVED">("ACTIVE");
  const [moderationReason, setModerationReason] = useState<string>("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Governance Audit Log State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  // Common UI feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await productsApi.list({
        scope: "admin",
        search: productSearchQuery.trim() || undefined,
        status: productStatusFilter !== "ALL" ? productStatusFilter : undefined,
      });
      setProducts(res.data || []);
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Failed to load products:", e);
    } finally {
      setLoadingProducts(false);
    }
  }, [productSearchQuery, productStatusFilter]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await productGovernanceApi.listAudit();
      setAuditLogs(res.data || []);
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Failed to load product audit logs:", e);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchAuditLogs();
  }, [fetchProducts, fetchAuditLogs]);

  // Load complete single product detail for inspection with instant cache fallback
  const handleOpenDetail = async (prod: ApiProduct) => {
    setGeneralSlideIndex(0);

    // If full detail is already cached, load it instantly without waiting
    const cached = productDetailCache.current.get(prod.productId);
    if (cached) {
      setInspectingProduct(cached);
      setLoadingDetail(false);
      return;
    }

    setInspectingProduct(prod);
    setLoadingDetail(true);

    try {
      const detailRes = await productsApi.get(prod.productId, { scope: "admin" });
      if (detailRes && detailRes.data) {
        productDetailCache.current.set(prod.productId, detailRes.data);
        setInspectingProduct(detailRes.data);
      }
    } catch (err) {
      console.warn("Could not load deep product detail, using list snapshot:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Prefetch product details on hover to make clicking feel instantaneous
  const handlePrefetchDetail = (productId: string) => {
    if (!productId || productDetailCache.current.has(productId)) return;
    productsApi.get(productId, { scope: "admin" }).then((res) => {
      if (res?.data) {
        productDetailCache.current.set(productId, res.data);
      }
    }).catch(() => {});
  };

  // Extract ONLY General Media for the top hero slider
  const generalMediaList = useMemo(() => {
    if (!inspectingProduct) return [];
    const list: string[] = [];
    const seen = new Set<string>();

    if (Array.isArray(inspectingProduct.general_media) && inspectingProduct.general_media.length > 0) {
      inspectingProduct.general_media.forEach((m) => {
        const u = getMediaUrl(m);
        if (u && !seen.has(u)) {
          seen.add(u);
          list.push(u);
        }
      });
    }

    if (Array.isArray(inspectingProduct.media) && inspectingProduct.media.length > 0) {
      inspectingProduct.media.forEach((m: any) => {
        const isGeneral =
          typeof m === "string" ||
          m.scope === "GENERAL" ||
          (!m.variantId && !m.variant_id && m.scope !== "VARIANT");
        if (isGeneral) {
          const u = getMediaUrl(m);
          if (u && !seen.has(u)) {
            seen.add(u);
            list.push(u);
          }
        }
      });
    }

    if (list.length === 0 && (inspectingProduct as any).primary_image_url) {
      list.push((inspectingProduct as any).primary_image_url);
    }

    return list;
  }, [inspectingProduct]);

  // Extract photos specifically attached to a given variant
  const getVariantPhotos = useCallback((v: any): string[] => {
    const urls: string[] = [];
    const seen = new Set<string>();

    if (Array.isArray(v.media) && v.media.length > 0) {
      v.media.forEach((m: any) => {
        const u = getMediaUrl(m);
        if (u && !seen.has(u)) {
          seen.add(u);
          urls.push(u);
        }
      });
    }

    if (inspectingProduct && Array.isArray(inspectingProduct.media)) {
      inspectingProduct.media.forEach((m: any) => {
        if (typeof m !== "string") {
          const mVarId = m.variantId || m.variant_id;
          const targetId = v.variantId || v.id || v._id;
          if (mVarId && targetId && mVarId === targetId) {
            const u = getMediaUrl(m);
            if (u && !seen.has(u)) {
              seen.add(u);
              urls.push(u);
            }
          }
        }
      });
    }

    return urls;
  }, [inspectingProduct]);

  // Handle Product Moderation (Activate/Deactivate/Archive)
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStatus) return;

    try {
      setSubmittingDecision(true);
      if (moderationDecision === "ACTIVE") {
        await productsApi.activate(selectedProductForStatus.productId);
      } else if (moderationDecision === "INACTIVE") {
        await productsApi.deactivate(selectedProductForStatus.productId);
      } else {
        await productsApi.archive(selectedProductForStatus.productId);
      }

      setToastMessage(`Status listing "${selectedProductForStatus.name}" berhasil diubah menjadi ${moderationDecision}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedProductForStatus(null);
      setModerationReason("");
      fetchProducts();
      fetchAuditLogs();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal memperbarui status produk");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Distinct merchant list from loaded products for filter dropdown
  const distinctMerchants = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const id = p.merchantOrganizationId || p.merchant?.id || "";
      const name = p.merchantName || p.merchant?.name || "Toko Mitra SERVIO";
      if (id && !map.has(id)) {
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Distinct category tabs with product counts
  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const key = p.categoryName || p.categoryId || "Lainnya";
      counts[key] = (counts[key] || 0) + 1;
    });

    const tabs: Array<{ key: string; label: string; count: number }> = [
      { key: "ALL", label: "Semua Kategori", count: products.length },
    ];

    Object.keys(counts).forEach((catKey) => {
      tabs.push({
        key: catKey,
        label: catKey,
        count: counts[catKey],
      });
    });

    return tabs;
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategoryTab !== "ALL") {
        const pCat = p.categoryName || p.categoryId;
        if (pCat !== selectedCategoryTab) return false;
      }
      // Merchant filter
      if (merchantFilter !== "ALL") {
        const pMerc = p.merchantOrganizationId || p.merchant?.id;
        if (pMerc !== merchantFilter) return false;
      }
      return true;
    });
  }, [products, selectedCategoryTab, merchantFilter]);

  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === "ACTIVE").length;
    const draft = products.filter((p) => p.status === "DRAFT").length;
    const inactive = products.filter((p) => p.status === "INACTIVE" || p.status === "ARCHIVED").length;
    const totalStock = products.reduce((acc, p) => acc + (p.totalStock || 0), 0);
    const merchantCount = distinctMerchants.length || (total > 0 ? 1 : 0);

    return { total, active, draft, inactive, totalStock, merchantCount };
  }, [products, distinctMerchants]);

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={20} weight="fill" />
          </div>
          <div>
            <div className="text-xs font-bold">Pemberitahuan Sistem</div>
            <div className="text-[11px] text-slate-300 font-medium">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* Modern Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-sky-50/60 rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#1E6FA8] text-white flex items-center justify-center shadow-md shadow-[#0F4C81]/15 shrink-0">
              <Package size={30} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100/70 text-[#0F4C81] border border-blue-200">
                  Operasional Platform &amp; Verifikasi
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Katalog Live Terkoneksi</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-heading">
                Pusat Tata Kelola &amp; Moderasi Katalog Produk
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Supervisi komprehensif listing suku cadang resmi merchant. Seluruh formulir tersimpan secara forensik, transparan, dan terklasifikasi rapi per kategori master platform.
              </p>
            </div>
          </div>

          {/* Tab Navigation Navigation Controls */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab("moderation")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "moderation"
                  ? "bg-white text-[#0F4C81] shadow-sm font-extrabold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <Package size={16} weight={activeTab === "moderation" ? "fill" : "regular"} />
              <span>Moderasi Listing</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "moderation" ? "bg-blue-100 text-[#0F4C81]" : "bg-slate-200 text-slate-600"
                }`}>
                {products.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "audit"
                  ? "bg-white text-[#0F4C81] shadow-sm font-extrabold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <ShieldCheck size={16} weight={activeTab === "audit" ? "fill" : "regular"} className="text-indigo-600" />
              <span>Audit Forensik</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === "audit" ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"
                }`}>
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "moderation" && (
        <div className="space-y-6">
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Listing */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Listing</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0F4C81] flex items-center justify-center font-bold">
                  <Package size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-heading">{kpiMetrics.total}</span>
                <span className="text-xs text-slate-500 font-medium">Produk Terdaftar</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">{kpiMetrics.totalStock} Unit</span> total stok tersimpan
              </div>
            </div>

            {/* Aktif Tayang */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs hover:border-emerald-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Aktif Tayang Publik</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle size={18} weight="fill" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-800 font-heading">{kpiMetrics.active}</span>
                <span className="text-xs text-emerald-600 font-medium">Siap Beli</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-600/90 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Tampil di katalog publik &amp; guest
              </div>
            </div>

            {/* Menunggu Review / Draft */}
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-xs hover:border-amber-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Draft / Butuh Review</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Clock size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-800 font-heading">{kpiMetrics.draft}</span>
                <span className="text-xs text-amber-600 font-medium">Dalam Pengecekan</span>
              </div>
              <div className="mt-2 text-[11px] text-amber-700 font-medium">
                Belum tayang publik (internal merchant)
              </div>
            </div>

            {/* Mitra Toko Terdaftar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mitra Toko Terdaftar</span>
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                  <Storefront size={18} weight="duotone" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-heading">{kpiMetrics.merchantCount}</span>
                <span className="text-xs text-slate-500 font-medium">Merchant Aktif</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Penyedia suku cadang terverifikasi
              </div>
            </div>
          </div>

          {/* Category Tabs: Per Kategori Navigation */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-[#0F4C81]" weight="duotone" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Klasifikasi Kategori Listing
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Pilih tab kategori untuk memfilter katalog suku cadang secara instan
              </span>
            </div>

            {/* Horizontal Scrollable Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categoryTabs.map((tab) => {
                const isSelected = selectedCategoryTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedCategoryTab(tab.key)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${isSelected
                        ? "bg-[#0F4C81] text-white shadow-md shadow-[#0F4C81]/20 scale-102"
                        : "bg-slate-50 text-slate-600 border border-slate-200/70 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col lg:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama produk, merek, SKU varian, atau nama toko mitra..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81]/40 focus:bg-white text-slate-800 placeholder-slate-400 transition"
              />
              {productSearchQuery && (
                <button
                  onClick={() => setProductSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Switcher */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                <select
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  className="text-xs bg-transparent border-none text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Status ({products.length})</option>
                  <option value="ACTIVE">Aktif Tayang ({kpiMetrics.active})</option>
                  <option value="DRAFT">Draft ({kpiMetrics.draft})</option>
                  <option value="INACTIVE">Nonaktif ({products.filter((p) => p.status === "INACTIVE").length})</option>
                  <option value="ARCHIVED">Arsip ({products.filter((p) => p.status === "ARCHIVED").length})</option>
                </select>
              </div>

              {/* Merchant Filter */}
              {distinctMerchants.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Toko:</span>
                  <select
                    value={merchantFilter}
                    onChange={(e) => setMerchantFilter(e.target.value)}
                    className="text-xs bg-transparent border-none text-slate-800 font-semibold focus:outline-hidden cursor-pointer max-w-[160px] truncate"
                  >
                    <option value="ALL">Semua Toko Mitra</option>
                    {distinctMerchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View Switcher: Table vs Cards */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition ${viewMode === "table" ? "bg-white text-[#0F4C81] shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Tampilan Tabel Detail"
                >
                  <ListDashes size={16} weight="bold" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition ${viewMode === "grid" ? "bg-white text-[#0F4C81] shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  title="Tampilan Kartu Visual"
                >
                  <SquaresFour size={16} weight="bold" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  fetchProducts();
                  fetchAuditLogs();
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
                title="Muat Ulang Data"
              >
                <ArrowClockwise size={16} className={loadingProducts ? "animate-spin text-[#0F4C81]" : ""} />
              </button>
            </div>
          </div>

          {/* Products Content: Table View */}
          {viewMode === "table" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              {loadingProducts ? (
                <div className="p-16 text-center space-y-3">
                  <ArrowClockwise size={32} className="animate-spin mx-auto text-[#0F4C81]" />
                  <p className="text-xs font-semibold text-slate-700">Sinkronisasi data katalog suku cadang dari database...</p>
                  <p className="text-[11px] text-slate-400">Menghubungkan Product Service, Identity, dan Category Service...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Tidak ada produk yang cocok dengan filter</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Coba atur ulang filter status, pilih kategori "Semua Kategori", atau hapus kata kunci pencarian.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategoryTab("ALL");
                      setProductStatusFilter("ALL");
                      setMerchantFilter("ALL");
                      setProductSearchQuery("");
                    }}
                  >
                    Reset Seluruh Filter
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4 pl-6">Foto &amp; Informasi Produk</th>
                        <th className="p-4">Kategori &amp; Subkategori</th>
                        <th className="p-4">Mitra Toko (Provider)</th>
                        <th className="p-4">Rentang Harga &amp; Varian</th>
                        <th className="p-4 text-center">Total Stok</th>
                        <th className="p-4">Garansi Resmi</th>
                        <th className="p-4">Status Listing</th>
                        <th className="p-4 pr-6 text-right">Aksi Tata Kelola</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const providerName = p.merchantName || p.providerName || p.merchant?.name || "Toko Mitra SERVIO";
                        const primaryImg = p.media?.[0] ? getMediaUrl(p.media[0]) : ((p as any).primary_image_url || "");
                        const generalCount = Array.isArray(p.media)
                          ? p.media.filter((m: any) => typeof m !== "string" && (m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT"))).length
                          : primaryImg ? 1 : 0;
                        const variantCount = Array.isArray(p.media)
                          ? p.media.filter((m: any) => typeof m !== "string" && (m.scope === "VARIANT" || m.variantId || m.variant_id)).length
                          : (p.variants ? p.variants.reduce((acc, v) => acc + (v.media?.length || 0), 0) : 0);

                        return (
                          <tr key={p.productId} className="hover:bg-blue-50/30 transition-colors group">
                            {/* Product Info & Thumbnail */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3.5">
                                {/* Thumbnail */}
                                <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 shadow-2xs group-hover:border-[#0F4C81]/30 transition">
                                  {primaryImg ? (
                                    <img
                                      src={primaryImg}
                                      alt={p.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                                      <Package size={22} weight="duotone" />
                                    </div>
                                  )}
                                  {(generalCount + variantCount) > 0 && (
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-slate-900/85 text-white text-[9px] font-bold flex items-center gap-0.5 backdrop-blur-xs">
                                      <Images size={10} />
                                      {generalCount + variantCount}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 max-w-[260px] space-y-1">
                                  <div className="font-bold text-slate-900 group-hover:text-[#0F4C81] transition truncate">
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                      {p.brandName || "Universal / OEM"}
                                    </span>
                                    {generalCount > 0 ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {generalCount} Umum
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Butuh Foto
                                      </span>
                                    )}
                                    {variantCount > 0 && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                        {variantCount} Varian
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]" title={p.productId}>
                                      ID: {p.productId.slice(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category & Subcategory */}
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#0F4C81] font-bold text-[11px] border border-blue-100">
                                  <FolderSimple size={12} weight="fill" />
                                  <span>{p.categoryName || "Kategori Produk"}</span>
                                </div>
                                {p.subcategoryName && (
                                  <div className="text-[10px] text-slate-500 font-medium pl-1 flex items-center gap-1">
                                    <CaretRight size={10} className="text-slate-400" />
                                    <span>{p.subcategoryName}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Merchant Store */}
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-sky-100/70 text-[#0F4C81] flex items-center justify-center shrink-0">
                                  <Storefront size={16} weight="duotone" />
                                </div>
                                <div className="min-w-0 max-w-[170px]">
                                  <div className="font-bold text-slate-900 text-xs truncate" title={providerName}>
                                    {providerName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {p.merchantOrganizationId ? `Org: ${p.merchantOrganizationId.slice(-6).toUpperCase()}` : "Mitra Resmi"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Price & Variants */}
                            <td className="p-4">
                              <div className="font-bold text-[#0F4C81] text-xs">
                                {p.priceRangeFormatted ||
                                  p.priceDisplay ||
                                  (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice
                                    ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                                    : p.minPrice
                                      ? `Rp${p.minPrice.toLocaleString("id-ID")}`
                                      : "Rp0")}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {p.variantCount || (p.variants ? p.variants.length : 1)} Varian
                                </span>
                                {p.variants && p.variants.length > 0 && p.variants[0].name && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[110px]" title={p.variants[0].name}>
                                    ({p.variants[0].name})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Total Stock */}
                            <td className="p-4 text-center">
                              {(() => {
                                const stock = p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0;
                                return (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold ${stock > 10
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                        : stock > 0
                                          ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                                          : "bg-rose-50 text-rose-700 border border-rose-200/80"
                                      }`}
                                  >
                                    {stock} Unit
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Warranty */}
                            <td className="p-4">
                              {p.warrantyPolicy && p.warrantyPolicy.durationMonths ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                    <ShieldCheck size={14} weight="fill" className="shrink-0" />
                                    <span>{p.warrantyPolicy.durationMonths} Bulan ({p.warrantyPolicy.durationMonths * 30} Hari)</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {p.warrantyPolicy?.type === "STORE_ONLY"
                                      ? "Garansi Toko"
                                      : p.warrantyPolicy?.type === "OFFICIAL_BRAND"
                                        ? "Distributor Resmi"
                                        : "Garansi SERVIO Care"}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Non-Garansi</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${p.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : p.status === "DRAFT"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : p.status === "INACTIVE"
                                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${p.status === "ACTIVE"
                                      ? "bg-emerald-500 animate-pulse"
                                      : p.status === "DRAFT"
                                        ? "bg-amber-500"
                                        : "bg-slate-400"
                                    }`}
                                />
                                {p.status === "ACTIVE"
                                  ? "AKTIF TAYANG"
                                  : p.status === "DRAFT"
                                    ? "DRAFT (REVIEW)"
                                    : p.status === "INACTIVE"
                                      ? "NONAKTIF"
                                      : "DIARSIPKAN"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenDetail(p)}
                                  onMouseEnter={() => handlePrefetchDetail(p.productId)}
                                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#0F4C81] hover:bg-sky-100 font-bold text-xs transition flex items-center gap-1.5 border border-sky-100"
                                  title="Lihat seluruh data tersimpan formulir"
                                >
                                  <Eye size={14} weight="bold" />
                                  <span>Detail</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProductForStatus(p);
                                    setModerationDecision(p.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                                    setFormError(null);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:text-[#0F4C81] hover:bg-slate-50 font-bold text-xs transition flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                                  title="Kelola status publikasi"
                                >
                                  <SlidersHorizontal size={14} weight="bold" />
                                  <span>Status</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Products Content: Grid Card View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((p) => {
                const providerName = p.merchantName || p.providerName || p.merchant?.name || "Toko Mitra SERVIO";
                const primaryImg = p.media?.[0] ? getMediaUrl(p.media[0]) : ((p as any).primary_image_url || "");

                return (
                  <div
                    key={p.productId}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Preview & Badges */}
                      <div className="relative w-full h-44 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200/80">
                        {primaryImg ? (
                          <img
                            src={primaryImg}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                            <Package size={40} weight="duotone" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-xs ${p.status === "ACTIVE"
                                ? "bg-emerald-600 text-white"
                                : p.status === "DRAFT"
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-700 text-white"
                              }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-xs text-[#0F4C81] text-[10px] font-bold shadow-xs">
                            {p.categoryName || "Kategori"}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-700">{p.brandName || "Universal / Generic"}</span>
                          <span className="font-mono text-[10px]">Stok: {p.totalStock ?? 0} Unit</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-[#0F4C81] transition">
                          {p.name}
                        </h3>

                        {/* Merchant Store info */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                          <Storefront size={14} className="text-[#0F4C81] shrink-0" weight="duotone" />
                          <span className="font-semibold truncate">{providerName}</span>
                        </div>

                        {/* Price */}
                        <div className="pt-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Harga Katalog</div>
                          <div className="text-base font-black text-[#0F4C81]">
                            {p.priceRangeFormatted || p.priceDisplay || "Rp0"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenDetail(p)}
                        onMouseEnter={() => handlePrefetchDetail(p.productId)}
                        className="flex-1 py-2 rounded-xl bg-sky-50 text-[#0F4C81] hover:bg-sky-100 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Eye size={14} weight="bold" />
                        <span>Lihat Formulir Lengkap</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProductForStatus(p);
                          setModerationDecision(p.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                          setFormError(null);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#0F4C81] hover:bg-slate-50 transition"
                        title="Kelola Status"
                      >
                        <SlidersHorizontal size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {/* Tab 3: Audit Tata Kelola Forensik */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 text-xs flex items-start gap-3 shadow-xs">
            <ShieldCheck size={22} className="text-indigo-600 shrink-0 mt-0.5" weight="fill" />
            <div className="space-y-1">
              <strong className="font-bold text-indigo-950 text-sm block">
                Audit Trail Forensik Tata Kelola Produk Platform
              </strong>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Log rekaman forensik seluruh mutasi produk, pembentukan varian, aktivasi media, dan perubahan status oleh Merchant, Admin Operations, dan Sistem. Berkas audit bersifat <em>immutable</em> dan mematuhi regulasi ketertelusuran platform.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingAudit ? (
              <div className="p-12 text-center text-xs text-slate-500">Memuat berkas audit produk...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <ShieldCheck size={40} className="mx-auto text-slate-300" weight="duotone" />
                <p className="text-xs font-bold text-slate-700">Belum ada catatan audit mutasi produk</p>
                <p className="text-[11px] text-slate-400">Setiap perubahan status dan moderasi akan otomatis tercatat di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">Waktu Mutasi</th>
                      <th className="p-4">Aksi / Event</th>
                      <th className="p-4">Entitas Target</th>
                      <th className="p-4">Pelaku (Aktor)</th>
                      <th className="p-4">Product ID</th>
                      <th className="p-4 pr-6">State Snapshot Forensik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 pl-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.occurred_at || log.created_at
                            ? new Date(log.occurred_at || log.created_at).toLocaleString("id-ID")
                            : "-"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${log.action?.includes("STATUS") || log.action?.includes("ACTIVAT")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : log.action?.includes("DELETE") || log.action?.includes("ARCHIV")
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : log.action?.includes("CREATE")
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-800">{log.entity_type}</span>
                          <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                            {log.entity_id}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-700 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
                            {log.actor_role || "SYSTEM"}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                            {log.actor_id || "-"}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600 truncate max-w-[120px]">
                          {log.product_id}
                        </td>
                        <td className="p-4 pr-6 text-[11px] text-slate-500 max-w-xs">
                          {log.after_safe || log.after_state || log.details ? (
                            <code className="text-[10px] bg-slate-100 text-slate-700 p-2 rounded-xl block font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                              {typeof (log.after_safe || log.after_state || log.details) === "string"
                                ? log.after_safe || log.after_state || log.details
                                : JSON.stringify(log.after_safe || log.after_state || log.details)}
                            </code>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL PRODUCT DETAIL INSPECTION MODAL (All Stored Form Data Visible) */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50 rounded-t-3xl">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0F4C81]">
                    Detail &amp; Data Formulir Produk
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${inspectingProduct.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : inspectingProduct.status === "DRAFT"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                  >
                    STATUS: {inspectingProduct.status}
                  </span>
                  {loadingDetail && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#0F4C81] bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full animate-pulse">
                      <ArrowClockwise size={11} className="animate-spin" />
                      <span>Memuat Detail...</span>
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">
                    v{inspectingProduct.lockVersion || 1}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1 font-heading">
                  {inspectingProduct.name}
                </h2>
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Merek: <strong className="text-slate-700">{inspectingProduct.brandName || "Generic / Universal"}</strong></span>
                  <span>&bull;</span>
                  <span>ID: <code className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{inspectingProduct.productId}</code></span>
                </div>
              </div>

              <button
                onClick={() => setInspectingProduct(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition shrink-0"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Foto Umum Produk (Hero Slider - Hanya Foto Umum, Foto Varian ada di tabel samping varian) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Images size={16} className="text-[#0F4C81]" weight="duotone" />
                    <span>Foto Utama / Umum ({generalMediaList.length} Foto)</span>
                  </h3>
                  {generalMediaList.length > 1 && (
                    <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-600">
                        {generalSlideIndex + 1} / {generalMediaList.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setGeneralSlideIndex((prev) => (prev - 1 + generalMediaList.length) % generalMediaList.length)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-2xs"
                          title="Foto Sebelumnya"
                        >
                          <CaretLeft size={13} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGeneralSlideIndex((prev) => (prev + 1) % generalMediaList.length)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-2xs"
                          title="Foto Selanjutnya"
                        >
                          <CaretRight size={13} weight="bold" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {generalMediaList.length === 0 ? (
                  <div className="h-44 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <Images size={28} className="opacity-40" />
                    <span className="text-xs font-medium">Belum ada foto umum produk</span>
                  </div>
                ) : (
                  <div className="relative rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/90 overflow-hidden flex flex-col items-center justify-center p-3 group">
                    {/* Main Image Slider Viewport */}
                    <div
                      className="w-full h-64 sm:h-72 flex items-center justify-center relative cursor-pointer"
                      onClick={() => setPreviewLightboxUrl(generalMediaList[generalSlideIndex] || generalMediaList[0])}
                    >
                      <img
                        src={generalMediaList[generalSlideIndex] || generalMediaList[0]}
                        alt={inspectingProduct.name}
                        className="max-h-full max-w-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.01]"
                      />

                      {/* Floating Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-[#0F4C81] shadow-xs backdrop-blur-xs border border-white/60 flex items-center gap-1">
                          <Sparkle size={12} weight="fill" className="text-amber-500" />
                          <span>Foto Umum</span>
                        </span>
                        {generalSlideIndex === 0 && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#0F4C81] text-white shadow-xs">
                            Cover Utama
                          </span>
                        )}
                      </div>

                      {/* Zoom Hint */}
                      <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/60 text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-xs flex items-center gap-1">
                        <Eye size={12} />
                        <span>Klik untuk perbesar</span>
                      </div>

                      {/* Overlay Chevrons if > 1 */}
                      {generalMediaList.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGeneralSlideIndex((prev) => (prev - 1 + generalMediaList.length) % generalMediaList.length);
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                            title="Sebelumnya"
                          >
                            <CaretLeft size={16} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGeneralSlideIndex((prev) => (prev + 1) % generalMediaList.length);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                            title="Selanjutnya"
                          >
                            <CaretRight size={16} weight="bold" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Bottom Slide Strip / Dots */}
                    {generalMediaList.length > 1 && (
                      <div className="w-full pt-3 pb-1 border-t border-slate-200/80 flex items-center justify-center gap-2 overflow-x-auto">
                        {generalMediaList.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setGeneralSlideIndex(idx)}
                            className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                              generalSlideIndex === idx
                                ? "border-[#0F4C81] ring-2 ring-sky-200 scale-105 shadow-2xs"
                                : "border-slate-200 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Informational Grid (Category, Merchant, Warranty, Price, Stock) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                {/* Category */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Kategori Master
                  </span>
                  <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <FolderSimple size={15} className="text-[#0F4C81]" weight="duotone" />
                    <span>{inspectingProduct.categoryName || inspectingProduct.categoryId || "Umum"}</span>
                  </div>
                  {inspectingProduct.subcategoryName && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Sub: {inspectingProduct.subcategoryName}
                    </div>
                  )}
                </div>

                {/* Merchant Store */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Mitra Toko (Merchant)
                  </span>
                  <div className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <Storefront size={15} className="text-[#0F4C81]" weight="duotone" />
                    <span className="truncate">{inspectingProduct.merchantName || inspectingProduct.merchant?.name || "Mitra Toko"}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {inspectingProduct.merchantOrganizationId ? `Org ID: ${inspectingProduct.merchantOrganizationId}` : "Terverifikasi"}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Rentang Harga
                  </span>
                  <div className="font-black text-[#0F4C81] text-sm mt-1">
                    {inspectingProduct.priceRangeFormatted || inspectingProduct.priceDisplay || "Rp0"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {inspectingProduct.variantCount || inspectingProduct.variants?.length || 1} Varian Terdaftar
                  </div>
                </div>

                {/* Stock & Warranty */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    Stok &amp; Garansi
                  </span>
                  <div className="font-bold text-slate-900 mt-1">
                    {inspectingProduct.totalStock ?? 0} Unit Tersedia
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={14} weight="fill" />
                    <span>
                      {inspectingProduct.warrantyPolicy?.durationMonths
                        ? `${inspectingProduct.warrantyPolicy.durationMonths} Bulan Garansi`
                        : "Non-Garansi"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={16} className="text-[#0F4C81]" weight="duotone" />
                  <span>Deskripsi &amp; Spesifikasi Lengkap dari Merchant</span>
                </h3>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {inspectingProduct.description || "Tidak ada deskripsi rinci yang dimasukkan oleh merchant."}
                </div>
              </div>

              {/* Variants Breakdown Table dengan Foto Khusus Varian di Samping Varian */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag size={16} className="text-[#0F4C81]" weight="duotone" />
                    <span>Daftar Seluruh Varian &amp; Atribut ({inspectingProduct.variants?.length || 0} Varian)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Foto khusus varian diletakkan langsung di samping varian
                  </span>
                </div>

                {loadingDetail && (!inspectingProduct.variants || inspectingProduct.variants.length === 0) ? (
                  <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <ArrowClockwise size={22} className="animate-spin text-[#0F4C81]" />
                    <span className="text-xs font-semibold">Memuat rincian varian &amp; foto varian...</span>
                  </div>
                ) : inspectingProduct.variants && inspectingProduct.variants.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="p-3 pl-4 w-36">Foto Varian</th>
                          <th className="p-3">Nama Varian</th>
                          <th className="p-3">Atribut Spesifikasi</th>
                          <th className="p-3">Harga Satuan (IDR)</th>
                          <th className="p-3 text-center">Stok Fisik</th>
                          <th className="p-3 pr-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectingProduct.variants.map((v, i) => {
                          const vPhotos = getVariantPhotos(v);
                          return (
                            <tr key={v.variantId || v._id || i} className="hover:bg-slate-50/70 transition">
                              {/* Foto Varian Column */}
                              <td className="p-3 pl-4 align-middle">
                                {vPhotos.length > 0 ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {vPhotos.map((pUrl, pIdx) => (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => setPreviewLightboxUrl(pUrl)}
                                        className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#0F4C81] hover:ring-2 hover:ring-sky-200 transition group cursor-pointer shrink-0"
                                        title="Klik untuk melihat foto varian ukuran penuh"
                                      >
                                        <img src={pUrl} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                          <Eye size={14} weight="bold" />
                                        </div>
                                      </button>
                                    ))}
                                    {vPhotos.length > 1 && (
                                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                                        {vPhotos.length} foto
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-400">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center shrink-0">
                                      <Images size={16} className="opacity-40" />
                                    </div>
                                    <span className="text-[10px] italic leading-tight text-slate-400">Ikut foto umum</span>
                                  </div>
                                )}
                              </td>

                              {/* Variant Name */}
                              <td className="p-3 align-middle font-bold text-slate-900">
                                <div className="font-bold text-slate-900">{v.name || `Varian #${i + 1}`}</div>
                                {v.sku && (
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {v.sku}</div>
                                )}
                              </td>

                              {/* Attributes */}
                              <td className="p-3 align-middle">
                                {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(v.attributes).map(([k, val]) => (
                                      <span
                                        key={k}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                                      >
                                        <strong className="text-slate-900 capitalize">{k}:</strong> {String(val)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Standar</span>
                                )}
                              </td>

                              {/* Price */}
                              <td className="p-3 align-middle font-bold text-[#0F4C81]">
                                Rp{(v.price || 0).toLocaleString("id-ID")}
                              </td>

                              {/* Stock */}
                              <td className="p-3 align-middle text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${(v.stock || 0) > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}
                                >
                                  {v.stock || 0} Unit
                                </span>
                              </td>

                              {/* Status */}
                              <td className="p-3 pr-4 align-middle text-right">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === "ACTIVE"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600"
                                    }`}
                                >
                                  {v.status || "ACTIVE"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                    Tidak ada data rincian varian tersimpan.
                  </div>
                )}
              </div>

              {/* Warranty Policy Deep Details */}
              {inspectingProduct.warrantyPolicy && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-600" weight="fill" />
                    <span>Kebijakan Garansi &amp; Jaminan Konsumen</span>
                  </h3>
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Jenis Garansi</span>
                        <div className="font-bold text-slate-800 mt-0.5">
                          {inspectingProduct.warrantyPolicy?.type === "STORE_ONLY"
                            ? "Garansi Toko Resmi Mitra"
                            : inspectingProduct.warrantyPolicy?.type === "OFFICIAL_BRAND"
                              ? "Garansi Distributor Resmi / Pabrikan"
                              : "Garansi SERVIO Platform"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Masa Berlaku</span>
                        <div className="font-bold text-slate-800 mt-0.5">
                          {inspectingProduct.warrantyPolicy.durationMonths || 0} Bulan ({((inspectingProduct.warrantyPolicy.durationMonths || 0) * 30)} Hari Kalender)
                        </div>
                      </div>
                    </div>
                    {inspectingProduct.warrantyPolicy.coverage && (
                      <div className="pt-2 border-t border-emerald-200/60 text-slate-700 text-[11px]">
                        <strong>Cakupan Jaminan:</strong> {inspectingProduct.warrantyPolicy.coverage}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
              <div className="text-[11px] text-slate-400">
                Dibuat: {inspectingProduct.createdAt ? new Date(inspectingProduct.createdAt).toLocaleDateString("id-ID") : "-"}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingProduct(null)}
                >
                  Tutup Tampilan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const prod = inspectingProduct;
                    setInspectingProduct(null);
                    setSelectedProductForStatus(prod);
                    setModerationDecision(prod.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                    setFormError(null);
                  }}
                  className="bg-[#0F4C81] hover:bg-[#0c3c66] text-white flex items-center gap-1.5"
                >
                  <SlidersHorizontal size={14} weight="bold" />
                  <span>Ubah Status Publikasi</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Status Change Modal */}
      {selectedProductForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0F4C81]">
                  Tata Kelola Publikasi
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {selectedProductForStatus.productId.slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1 font-heading">
                Kelola Status Listing Katalog
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{selectedProductForStatus.name}</p>

              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Provider / Toko</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                    <Storefront size={14} className="text-[#0F4C81]" weight="duotone" />
                    <span className="truncate">{selectedProductForStatus.merchantName || selectedProductForStatus.merchant?.name || "Toko Mitra"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Stok Fisik</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedProductForStatus.totalStock ?? 0} Unit Tersedia
                  </div>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Status Baru:</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setModerationDecision("ACTIVE")}
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${moderationDecision === "ACTIVE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <CheckCircle size={20} weight="bold" />
                    <span>Aktif (Tayang)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModerationDecision("INACTIVE")}
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${moderationDecision === "INACTIVE"
                        ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <Clock size={20} weight="bold" />
                    <span>Nonaktifkan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModerationDecision("ARCHIVED")}
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${moderationDecision === "ARCHIVED"
                        ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    <Archive size={20} weight="bold" />
                    <span>Arsipkan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Operasional (Opsional):</label>
                <input
                  type="text"
                  placeholder="Misal: Sesuai hasil verifikasi suku cadang resmi..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedProductForStatus(null)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submittingDecision}
                  className="bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold"
                >
                  {submittingDecision ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal for High-Resolution Media Preview */}
      {previewLightboxUrl && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-2 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewLightboxUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X size={18} weight="bold" />
            </button>
            <img
              src={previewLightboxUrl}
              alt="Pratinjau Foto"
              className="max-h-[82vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}

