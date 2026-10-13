"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { productCategoriesApi, productsApi } from "@/lib/servioApi";
import type { ApiProductCategory, ApiProduct, ProductCategoryStatus, ProductLifecycleStatus } from "@/types/domain";

export default function AdminProductsModerationPage() {
  const [activeTab, setActiveTab] = useState<"moderation" | "categories">("moderation");

  // Products Moderation State
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productStatusFilter, setProductStatusFilter] = useState<string>("ALL");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [moderationDecision, setModerationDecision] = useState<"ACTIVE" | "INACTIVE" | "ARCHIVED">("ACTIVE");

  // Categories State
  const [categories, setCategories] = useState<ApiProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiProductCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catSortOrder, setCatSortOrder] = useState(1);

  // Common UI feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const res = await productsApi.list({ scope: "admin", search: productSearchQuery, status: productStatusFilter });
      setProducts(res.data || []);
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Failed to load products:", e);
    } finally {
      setLoadingProducts(false);
    }
  }, [productSearchQuery, productStatusFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await productCategoriesApi.list();
      setCategories(res.data || []);
    } catch (err: unknown) {
      const e = err as Error;
      console.error("Failed to load categories:", e);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Handle Product Moderation (Activate/Deactivate/Archive)
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      if (moderationDecision === "ACTIVE") {
        await productsApi.activate(selectedProduct.productId);
      } else if (moderationDecision === "INACTIVE") {
        await productsApi.deactivate(selectedProduct.productId);
      } else {
        await productsApi.archive(selectedProduct.productId);
      }

      setToastMessage(`Status listing "${selectedProduct.name}" berhasil diubah menjadi ${moderationDecision}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal memperbarui status produk");
    }
  };

  // Handle Category Save (Create / Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setFormError("Nama kategori wajib diisi.");
      return;
    }

    try {
      if (editingCategory) {
        await productCategoriesApi.update(editingCategory.categoryId, {
          name: catName.trim(),
          description: catDescription.trim(),
          sortOrder: Number(catSortOrder),
        });
        setToastMessage(`Kategori "${catName}" berhasil diperbarui!`);
      } else {
        await productCategoriesApi.create({
          name: catName.trim(),
          description: catDescription.trim(),
          sortOrder: Number(catSortOrder),
        });
        setToastMessage(`Kategori baru "${catName}" berhasil dibuat!`);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatName("");
      setCatDescription("");
      setCatSortOrder(1);
      fetchCategories();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal menyimpan kategori.");
    }
  };

  const handleToggleCategoryStatus = async (cat: ApiProductCategory) => {
    try {
      if (cat.status === "ACTIVE") {
        await productCategoriesApi.deactivate(cat.categoryId);
        setToastMessage(`Kategori "${cat.name}" dinonaktifkan.`);
      } else {
        await productCategoriesApi.activate(cat.categoryId);
        setToastMessage(`Kategori "${cat.name}" diaktifkan.`);
      }
      fetchCategories();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal mengubah status kategori.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <Package size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Katalog Produk & Kategori Platform
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan kelayakan listing suku cadang merchant dan tata kelola master kategori produk resmi platform.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("moderation")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "moderation"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Moderasi Listing ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "categories"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Kategori Produk ({categories.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "moderation" && (
        <div className="space-y-4">
          {/* Info notice: Inventory integrity */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="font-semibold text-blue-950">Prinsip Moderasi Produk:</strong> Mengubah status publikasi listing menjadi tidak aktif/arsip menghentikan penayangan di katalog publik tanpa menghapus riwayat transaksi lama.
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama produk, merek, atau kategori..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <SlidersHorizontal size={16} className="text-slate-400 hidden sm:block" />
              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
              >
                <option value="ALL">Semua Status Listing</option>
                <option value="ACTIVE">Aktif (Tayang)</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Nonaktif</option>
                <option value="ARCHIVED">Diarsipkan</option>
              </select>
            </div>
          </div>

          {/* Products List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loadingProducts ? (
              <div className="p-12 text-center text-xs text-slate-400">Memuat data produk dari MongoDB...</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">Tidak ada produk ditemukan.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Nama Produk &amp; Merek</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Provider Jasa / Toko Mitra</th>
                    <th className="p-3.5">Varian &amp; Rentang Harga</th>
                    <th className="p-3.5">Total Stok</th>
                    <th className="p-3.5">Garansi Diberikan</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const providerName = p.merchantName || p.providerName || p.merchant?.name || "Toko Mitra Servio";

                    return (
                      <tr key={p.productId} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Merek: {p.brandName || "Universal / Generic"} &bull; ID: {p.productId}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {p.categoryName || p.categoryId}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <Storefront size={15} weight="duotone" className="text-[#0F4C81] shrink-0" />
                            <span className="truncate max-w-[150px]">{providerName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.merchantOrganizationId ? `Org ID: ${p.merchantOrganizationId.slice(-6).toUpperCase()}` : "Mitra Terverifikasi"}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#0F4C81]">
                            {p.priceRangeFormatted ||
                              p.priceDisplay ||
                              (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice
                                ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                                : p.minPrice
                                ? `Rp${p.minPrice.toLocaleString("id-ID")}`
                                : "Rp0")}
                          </div>
                          <div className="text-[11px] text-slate-400">{p.variantCount || (p.variants ? p.variants.length : 0)} Varian Tersedia</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">
                          {p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0} Unit
                        </td>
                        <td className="p-3.5">
                          {p.warrantyPolicy && p.warrantyPolicy.durationMonths ? (
                            <>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <ShieldCheck size={16} weight="fill" className="text-emerald-600 shrink-0" />
                                <span>{p.warrantyDays || p.warrantyPolicy.durationDays || (p.warrantyPolicy.durationMonths === 12 ? 365 : p.warrantyPolicy.durationMonths === 24 ? 730 : p.warrantyPolicy.durationMonths * 30)} Hari</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                ({p.warrantyPolicy.durationMonths} Bulan) &bull; {p.warrantyPolicy?.type === "STORE_ONLY"
                                  ? "Garansi Toko"
                                  : p.warrantyPolicy?.type === "OFFICIAL_BRAND"
                                  ? "Distributor Resmi"
                                  : "Toko & Pabrik Resmi"}
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">Non-Garansi</span>
                          )}
                        </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            p.status === "ACTIVE"
                              ? "success"
                              : p.status === "DRAFT"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(p);
                            setModerationDecision(p.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                            setFormError(null);
                          }}
                        >
                          Kelola Status
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Kategori produk mengatur klasifikasi global master suku cadang dan perlengkapan teknisi.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingCategory(null);
                setCatName("");
                setCatDescription("");
                setCatSortOrder(categories.length + 1);
                setFormError(null);
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus size={16} weight="bold" />
              <span>Tambah Kategori Produk</span>
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {loadingCategories ? (
              <div className="p-12 text-center text-xs text-slate-400">Memuat kategori...</div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">Belum ada kategori terdaftar.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Urutan</th>
                    <th className="p-3.5">Nama Kategori &amp; Slug</th>
                    <th className="p-3.5">Deskripsi</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categories.map((cat) => (
                    <tr key={cat.categoryId} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-5 font-mono text-slate-400">{cat.sortOrder}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{cat.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {cat.categoryId} &bull; /{cat.slug}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{cat.description || "-"}</td>
                      <td className="p-3.5">
                        <Badge variant={cat.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                          {cat.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 pr-5 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatName(cat.name);
                            setCatDescription(cat.description || "");
                            setCatSortOrder(cat.sortOrder);
                            setFormError(null);
                            setIsCategoryModalOpen(true);
                          }}
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          variant={cat.status === "ACTIVE" ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleCategoryStatus(cat)}
                        >
                          {cat.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Moderation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kelola Status Listing Produk</h2>
              <p className="text-xs text-slate-500 mt-1">{selectedProduct.name}</p>

              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Provider Jasa / Mitra</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Storefront size={14} className="text-[#0F4C81]" weight="duotone" />
                    <span className="truncate">{selectedProduct.merchantName || selectedProduct.providerName || selectedProduct.merchant?.name || "Toko Mitra Servio"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Garansi yang Diberikan</span>
                  {selectedProduct.warrantyPolicy && selectedProduct.warrantyPolicy.durationMonths ? (
                    <div className="font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck size={14} className="text-emerald-600" weight="fill" />
                      <span>
                        {selectedProduct.warrantyDays || selectedProduct.warrantyPolicy.durationDays || (selectedProduct.warrantyPolicy.durationMonths === 12 ? 365 : selectedProduct.warrantyPolicy.durationMonths === 24 ? 730 : selectedProduct.warrantyPolicy.durationMonths * 30)} Hari ({selectedProduct.warrantyPolicy.durationMonths} Bulan)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">Non-Garansi</span>
                  )}
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
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setModerationDecision("ACTIVE")}
                  className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${
                    moderationDecision === "ACTIVE"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle size={18} weight="bold" />
                  <span>Aktif (Tayang)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModerationDecision("INACTIVE")}
                  className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${
                    moderationDecision === "INACTIVE"
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Clock size={18} weight="bold" />
                  <span>Nonaktifkan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModerationDecision("ARCHIVED")}
                  className={`p-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 ${
                    moderationDecision === "ARCHIVED"
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Archive size={18} weight="bold" />
                  <span>Arsipkan</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedProduct(null)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Simpan Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingCategory ? "Edit Kategori Produk" : "Tambah Kategori Produk Baru"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Klasifikasi resmi suku cadang dan komponen platform SERVIO</p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: AC & Pendingin"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan cakupan suku cadang..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Urutan Tampil (Sort Order)</label>
                <input
                  type="number"
                  min={1}
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsCategoryModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Simpan Kategori
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
