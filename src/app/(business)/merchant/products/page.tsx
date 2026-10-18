"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import {
  Package,
  Plus,
  MagnifyingGlass,
  Funnel,
  PencilSimple,
  Power,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Tag,
  Coins,
  Stack,
  Trash,
} from "@phosphor-icons/react";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { productsApi, taxonomyApi, productVariantsApi } from "@/lib/servioApi";
import type { ApiProduct, ApiProductVariant, ApiBrand } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";

interface CategoryOption {
  id: string;
  name: string;
  code?: string;
}

interface SubcategoryOption {
  id: string;
  category_id: string;
  name: string;
  code?: string;
}

function MerchantProductsContent() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");
  const [categoryFilter, setCategoryFilter] = useUrlQueryState<string>("cat", "ALL");
  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<ApiProduct | null>(null);
  const [variantList, setVariantList] = useState<ApiProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Form State for Adding Product
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBrandName, setFormBrandName] = useState("");
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formVariants, setFormVariants] = useState<Array<{ name: string; price: number; stock: number }>>([
    { name: "Varian Standard", price: 100000, stock: 10 },
  ]);

  // Warranty Policy Configuration State (Step 7)
  const [warrantyDuration, setWarrantyDuration] = useState(12);
  const [warrantyType, setWarrantyType] = useState("MANUFACTURER_AND_STORE");
  const [warrantyCoverage, setWarrantyCoverage] = useState("Cacat manufaktur, kegagalan fungsi kelistrikan suku cadang");
  const [warrantyExclusions, setWarrantyExclusions] = useState("Kerusakan fisik akibat benturan, kesalahan instalasi non-resmi, atau korsleting");

  // Edit Product Modal State (Step 8)
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editSubcategoryId, setEditSubcategoryId] = useState("");
  const [editName, setEditName] = useState("");
  const [editBrandName, setEditBrandName] = useState("");
  const [isEditCustomBrand, setIsEditCustomBrand] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editWarrantyDuration, setEditWarrantyDuration] = useState(12);
  const [editWarrantyType, setEditWarrantyType] = useState("MANUFACTURER_AND_STORE");
  const [editWarrantyCoverage, setEditWarrantyCoverage] = useState("");
  const [editWarrantyExclusions, setEditWarrantyExclusions] = useState("");
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Form State for Adding Variant to existing product
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrice, setNewVarPrice] = useState(100000);
  const [newVarStock, setNewVarStock] = useState(10);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Subkategori yang tersedia sesuai kategori terpilih
  const availableFormSubcategories = useMemo(() => {
    if (!formCategoryId) return [];
    return subcategories.filter((s) => s.category_id === formCategoryId);
  }, [subcategories, formCategoryId]);

  const availableEditSubcategories = useMemo(() => {
    if (!editCategoryId) return [];
    return subcategories.filter((s) => s.category_id === editCategoryId);
  }, [subcategories, editCategoryId]);

  const handleCategoryChange = (catId: string) => {
    setFormCategoryId(catId);
    const subs = subcategories.filter((s) => s.category_id === catId);
    if (subs.length > 0) {
      setFormSubcategoryId(subs[0].id);
    } else {
      setFormSubcategoryId("");
    }
  };

  const handleEditCategoryChange = (catId: string) => {
    setEditCategoryId(catId);
    const subs = subcategories.filter((s) => s.category_id === catId);
    if (subs.length > 0) {
      setEditSubcategoryId(subs[0].id);
    } else {
      setEditSubcategoryId("");
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, subcatRes, brandRes] = await Promise.all([
        productsApi.list({ scope: "merchant", search: searchQuery, categoryId: categoryFilter, status: statusFilter }),
        taxonomyApi.getCategories({ master: "PRODUK", status: "ACTIVE" }),
        taxonomyApi.getSubcategories({ master: "PRODUK", status: "ACTIVE" }),
        taxonomyApi.getBrands({ status: "ACTIVE" }),
      ]);
      setProducts(prodRes.data || []);
      setBrands(brandRes?.data || []);

      const cats: CategoryOption[] = (catRes?.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        code: c.code,
      }));
      const subs: SubcategoryOption[] = (subcatRes?.data || []).map((s: any) => ({
        id: s.id,
        category_id: s.category_id,
        name: s.name,
        code: s.code,
      }));

      setCategories(cats);
      setSubcategories(subs);

      if (!formCategoryId && cats.length > 0) {
        setFormCategoryId(cats[0].id);
        const matchingSubs = subs.filter((s) => s.category_id === cats[0].id);
        if (matchingSubs.length > 0) {
          setFormSubcategoryId(matchingSubs[0].id);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load merchant data:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter, formCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddVariantRow = () => {
    setFormVariants([...formVariants, { name: "", price: 50000, stock: 5 }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (formVariants.length <= 1) return;
    setFormVariants(formVariants.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategoryId) {
      setFormError("Nama produk dan kategori wajib diisi.");
      return;
    }

    const selectedCat = categories.find((c) => c.id === formCategoryId);
    const selectedSubcat = subcategories.find((s) => s.id === formSubcategoryId);

    try {
      const res = await productsApi.create({
        categoryId: formCategoryId,
        categoryName: selectedCat?.name || "Sparepart AC & Pendingin",
        subcategoryId: formSubcategoryId || undefined,
        subcategoryName: selectedSubcat?.name || undefined,
        name: formName.trim(),
        brandName: formBrandName.trim() || undefined,
        description: formDescription.trim() || undefined,
        variants: formVariants.filter((v) => v.name.trim() !== ""),
        warrantyPolicy: Number(warrantyDuration) > 0 ? {
          durationMonths: Number(warrantyDuration),
          type: warrantyType,
          coverage: warrantyCoverage.trim(),
          exclusions: warrantyExclusions.trim(),
          terms: "Wajib menyertakan bukti invoice transaksi resmi dan segel unit tidak rusak.",
        } : null,
      });

      // Activate product
      if (res.data?.productId) {
        await productsApi.activate(res.data.productId);
      }

      setIsAddModalOpen(false);
      setFormName("");
      setFormBrandName("");
      setIsCustomBrand(false);
      setFormDescription("");
      setFormVariants([{ name: "Varian Standard", price: 100000, stock: 10 }]);
      setFormError(null);
      setToastMessage(`Produk "${formName}" berhasil ditambahkan ke katalog toko Anda!`);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal membuat produk.");
    }
  };

  const handleOpenEditModal = (p: ApiProduct) => {
    setEditingProduct(p);
    setEditCategoryId(p.categoryId || "");
    setEditSubcategoryId(p.subcategoryId || "");
    setEditName(p.name || "");
    const currentBrand = (p.brandName || "").trim();
    setEditBrandName(currentBrand);
    const isRegistered = brands.some((b) => b.name.toLowerCase() === currentBrand.toLowerCase());
    setIsEditCustomBrand(!isRegistered && Boolean(currentBrand));
    setEditDescription(p.description || "");
    setEditWarrantyDuration(p.warrantyPolicy?.durationMonths ?? 0);
    setEditWarrantyType(p.warrantyPolicy?.type || "MANUFACTURER_AND_STORE");
    setEditWarrantyCoverage(p.warrantyPolicy?.coverage || "Cacat manufaktur, kegagalan fungsi kelistrikan suku cadang");
    setEditWarrantyExclusions(p.warrantyPolicy?.exclusions || "Kerusakan fisik akibat benturan, kesalahan instalasi non-resmi, atau korsleting");
    setEditFormError(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editCategoryId) {
      setEditFormError("Nama produk dan kategori wajib diisi.");
      return;
    }

    const selectedCat = categories.find((c) => c.id === editCategoryId);
    const selectedSubcat = subcategories.find((s) => s.id === editSubcategoryId);

    try {
      await productsApi.update(editingProduct.productId, {
        categoryId: editCategoryId,
        categoryName: selectedCat?.name || "Sparepart AC & Pendingin",
        subcategoryId: editSubcategoryId || undefined,
        subcategoryName: selectedSubcat?.name || undefined,
        name: editName.trim(),
        brandName: editBrandName.trim() || undefined,
        description: editDescription.trim() || undefined,
        warrantyPolicy: Number(editWarrantyDuration) > 0 ? {
          durationMonths: Number(editWarrantyDuration),
          type: editWarrantyType,
          coverage: editWarrantyCoverage.trim(),
          exclusions: editWarrantyExclusions.trim(),
          terms: "Wajib menyertakan bukti invoice transaksi resmi dan segel unit tidak rusak.",
        } : null,
      });

      setEditingProduct(null);
      setToastMessage(`Produk "${editName}" dan kebijakan garansi berhasil diperbarui!`);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setEditFormError(e.message || "Gagal memperbarui produk.");
    }
  };

  const handleOpenVariantModal = async (product: ApiProduct) => {
    setSelectedProductForVariants(product);
    setLoadingVariants(true);
    try {
      const res = await productVariantsApi.list(product.productId);
      setVariantList(res.data || []);
    } catch (err: unknown) {
      console.error("Failed to load variants:", err);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleAddNewVariantToProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants || !newVarName.trim()) return;

    try {
      await productVariantsApi.create(selectedProductForVariants.productId, {
        name: newVarName.trim(),
        price: Number(newVarPrice),
        stock: Number(newVarStock),
        status: "ACTIVE",
      });
      setNewVarName("");
      setNewVarPrice(100000);
      setNewVarStock(10);
      setToastMessage("Varian baru berhasil ditambahkan!");
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menambahkan varian.");
    }
  };

  const handleDeleteProduct = async (product: ApiProduct) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${product.name}" secara permanen dari database? Seluruh varian terkait juga akan terhapus.`)) {
      return;
    }

    try {
      await productsApi.delete(product.productId);
      setToastMessage(`Produk "${product.name}" berhasil dihapus secara permanen dari database.`);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menghapus produk.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Package size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Katalog Suku Cadang &amp; Komponen Toko
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola listing produk, varian spesifikasi, harga jual langsung, dan kuantitas stok inventaris toko Anda
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              <span>Tambah Produk Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk atau merek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Funnel size={16} />
              <span>Kategori:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif (Tayang)</option>
              <option value="DRAFT">Draft</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Memuat katalog produk toko...</div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              Belum ada produk terdaftar. Klik &quot;Tambah Produk Baru&quot; untuk memulai.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Produk &amp; Merek</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Varian &amp; Rentang Harga</th>
                  <th className="p-4">Total Stok</th>
                  <th className="p-4">Garansi Diberikan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {p.brandName ? `Merek: ${p.brandName}` : "Merek: Universal / Aftermarket"} &bull; ID: {p.productId}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] inline-block">
                        {p.categoryName || p.categoryId}
                      </span>
                      {p.subcategoryName && (
                        <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                          <Tag size={11} className="text-slate-400 shrink-0" />
                          <span>{p.subcategoryName}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-[#0F4C81]">
                        {p.priceRangeFormatted ||
                          p.priceDisplay ||
                          (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice !== p.maxPrice
                            ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                            : p.minPrice
                            ? `Rp${p.minPrice.toLocaleString("id-ID")}`
                            : "Rp0")}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.variantCount || (p.variants ? p.variants.length : 0)} Varian Dikonfigurasi
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0} Unit
                    </td>
                    <td className="p-4">
                      {p.warrantyPolicy && p.warrantyPolicy.durationMonths ? (
                        <>
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <ShieldCheck size={16} weight="fill" className="text-emerald-600 shrink-0" />
                            <span>
                              {p.warrantyDays || p.warrantyPolicy.durationDays || (p.warrantyPolicy.durationMonths === 12 ? 365 : p.warrantyPolicy.durationMonths === 24 ? 730 : p.warrantyPolicy.durationMonths * 30)} Hari
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            ({p.warrantyPolicy.durationMonths} Bulan) &bull; {p.warrantyPolicy.type === "STORE_ONLY"
                              ? "Garansi Toko"
                              : p.warrantyPolicy.type === "OFFICIAL_BRAND"
                              ? "Distributor Resmi"
                              : "Toko & Pabrik Resmi"}
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-400 text-xs">Non-Garansi</div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={p.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 pr-6 text-right flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        id={`edit-product-${p.productId}`}
                        onClick={() => handleOpenEditModal(p)}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <PencilSimple size={14} />
                        <span>Edit &amp; Garansi</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenVariantModal(p)}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <Stack size={14} />
                        <span>Kelola Varian &amp; Stok</span>
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteProduct(p)}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <Trash size={14} />
                        <span>Hapus</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tambah Listing Produk &amp; Varian</h2>
              <p className="text-xs text-slate-500 mt-1">
                Daftarkan suku cadang resmi dan tentukan harga serta stok untuk masing-masing varian
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Produk *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sub Kategori Produk *</label>
                  <select
                    value={formSubcategoryId}
                    onChange={(e) => setFormSubcategoryId(e.target.value)}
                    required
                    disabled={availableFormSubcategories.length === 0}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {availableFormSubcategories.length === 0 ? (
                      <option value="">Tidak ada subkategori</option>
                    ) : (
                      availableFormSubcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Merek Produk <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Opsional
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Pilih merek resmi atau kosongkan jika produk adalah barang tanpa merek / OEM umum.
                    </p>
                  </div>
                  <select
                    value={isCustomBrand ? "CUSTOM" : formBrandName}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsCustomBrand(true);
                        setFormBrandName("");
                      } else {
                        setIsCustomBrand(false);
                        setFormBrandName(e.target.value);
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  >
                    <option value="">-- Tanpa Merek / OEM / Polos --</option>
                    {brands.length > 0 && (
                      <optgroup label="Merek Resmi Terdaftar (Brand Registry)">
                        {brands.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="CUSTOM">+ Tulis Merek Lainnya (Ketik Manual)...</option>
                  </select>

                  {isCustomBrand && (
                    <input
                      type="text"
                      placeholder="Ketik nama merek produk..."
                      value={formBrandName}
                      onChange={(e) => setFormBrandName(e.target.value)}
                      autoFocus
                      className="w-full text-xs p-2.5 bg-white border border-sky-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none animate-in fade-in slide-in-from-top-1"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Freon R32 Refrigerant Eco-Friendly"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan spesifikasi teknis dan kompatibilitas unit..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              {/* Multi-Variant Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Daftar Varian, Harga &amp; Stok *</label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddVariantRow}
                    className="text-[10px] py-1 px-2 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Tambah Varian</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formVariants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <input
                        type="text"
                        required
                        placeholder="Nama Varian (misal: 1,2 kg)"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...formVariants];
                          updated[idx].name = e.target.value;
                          setFormVariants(updated);
                        }}
                        className="flex-1 text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                      <div className="w-28">
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="Harga (Rp)"
                          value={v.price}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx].price = Number(e.target.value);
                            setFormVariants(updated);
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          required
                          min={0}
                          placeholder="Stok"
                          value={v.stock}
                          onChange={(e) => {
                            const updated = [...formVariants];
                            updated[idx].stock = Number(e.target.value);
                            setFormVariants(updated);
                          }}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                      {formVariants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 7: Warranty Policy Configuration (Mandatory Catalog Step) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={16} weight="bold" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Kebijakan Garansi Resmi Produk (Step 7)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Konfigurasikan durasi, perlindungan, dan pengecualian garansi sebelum dipublikasikan ke katalog
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Durasi Garansi *</label>
                    <select
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value={0}>0 Bulan (Tanpa Garansi / Non-Garansi)</option>
                      <option value={1}>1 Bulan Garansi Toko</option>
                      <option value={3}>3 Bulan Garansi Toko &amp; Manufaktur</option>
                      <option value={6}>6 Bulan Garansi Resmi</option>
                      <option value={12}>12 Bulan (1 Tahun) Garansi Pabrik Standar</option>
                      <option value={24}>24 Bulan (2 Tahun) Garansi Extended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipe Penjamin Garansi *</label>
                    <select
                      value={warrantyType}
                      onChange={(e) => setWarrantyType(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="MANUFACTURER_AND_STORE">Toko &amp; Pabrik Manufaktur Resmi</option>
                      <option value="STORE_ONLY">Garansi Toko (Tukar Baru / Perbaikan)</option>
                      <option value="OFFICIAL_BRAND">Brand / Distributor Tunggal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cakupan Perlindungan Garansi</label>
                  <input
                    type="text"
                    value={warrantyCoverage}
                    onChange={(e) => setWarrantyCoverage(e.target.value)}
                    placeholder="Misal: Cacat manufaktur, kebocoran freon bawaan, malfungsi elektrik"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pengecualian Garansi (Exclusions)</label>
                  <input
                    type="text"
                    value={warrantyExclusions}
                    onChange={(e) => setWarrantyExclusions(e.target.value)}
                    placeholder="Misal: Kesalahan pasang, benturan fisik, korsleting tegangan listrik"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-[#0F4C81] text-white">
                  Simpan &amp; Terbitkan Produk
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product & Warranty Modal (Step 8) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Edit Produk &amp; Kebijakan Garansi</h2>
                <p className="text-xs text-slate-500 mt-0.5">Perbarui informasi katalog dan ketentuan garansi produk</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditingProduct(null)}>
                Tutup
              </Button>
            </div>

            {editFormError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Produk *</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => handleEditCategoryChange(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sub Kategori Produk *</label>
                  <select
                    value={editSubcategoryId}
                    onChange={(e) => setEditSubcategoryId(e.target.value)}
                    required
                    disabled={availableEditSubcategories.length === 0}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {availableEditSubcategories.length === 0 ? (
                      <option value="">Tidak ada subkategori</option>
                    ) : (
                      availableEditSubcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Merek Produk <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Opsional
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Pilih merek resmi atau kosongkan jika produk adalah barang tanpa merek / OEM umum.
                    </p>
                  </div>
                  <select
                    value={isEditCustomBrand ? "CUSTOM" : editBrandName}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsEditCustomBrand(true);
                        setEditBrandName("");
                      } else {
                        setIsEditCustomBrand(false);
                        setEditBrandName(e.target.value);
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  >
                    <option value="">-- Tanpa Merek / OEM / Polos --</option>
                    {brands.length > 0 && (
                      <optgroup label="Merek Resmi Terdaftar (Brand Registry)">
                        {brands.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="CUSTOM">+ Tulis Merek Lainnya (Ketik Manual)...</option>
                  </select>

                  {isEditCustomBrand && (
                    <input
                      type="text"
                      placeholder="Ketik nama merek produk..."
                      value={editBrandName}
                      onChange={(e) => setEditBrandName(e.target.value)}
                      autoFocus
                      className="w-full text-xs p-2.5 bg-white border border-sky-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none animate-in fade-in slide-in-from-top-1"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              {/* Warranty Policy Edit Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                    <ShieldCheck size={16} weight="bold" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">Kebijakan Garansi Produk (Step 8)</h3>
                    <p className="text-[10px] text-slate-500">Tentukan masa berlaku dan jaminan resmi garansi purnajual</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Masa Garansi *</label>
                    <select
                      id="edit-warranty-duration"
                      value={editWarrantyDuration}
                      onChange={(e) => setEditWarrantyDuration(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                      <option value={0}>0 Bulan (Tanpa Garansi / Non-Garansi)</option>
                      <option value={1}>1 Bulan Garansi Toko</option>
                      <option value={3}>3 Bulan Garansi Toko &amp; Manufaktur</option>
                      <option value={6}>6 Bulan Garansi Resmi</option>
                      <option value={12}>12 Bulan (1 Tahun) Garansi Pabrik Standar</option>
                      <option value={24}>24 Bulan (2 Tahun) Garansi Extended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipe Penjamin Garansi</label>
                    <select
                      value={editWarrantyType}
                      onChange={(e) => setEditWarrantyType(e.target.value)}
                      disabled={editWarrantyDuration === 0}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium disabled:opacity-50"
                    >
                      <option value="MANUFACTURER_AND_STORE">Toko &amp; Pabrik Manufaktur Resmi</option>
                      <option value="STORE_ONLY">Garansi Toko (Tukar Baru / Perbaikan)</option>
                      <option value="OFFICIAL_BRAND">Brand / Distributor Tunggal</option>
                    </select>
                  </div>
                </div>

                {editWarrantyDuration > 0 && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cakupan Perlindungan Garansi</label>
                      <input
                        type="text"
                        value={editWarrantyCoverage}
                        onChange={(e) => setEditWarrantyCoverage(e.target.value)}
                        placeholder="Misal: Cacat manufaktur, malfungsi kelistrikan komponen resmi"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pengecualian Garansi (Exclusions)</label>
                      <input
                        type="text"
                        value={editWarrantyExclusions}
                        onChange={(e) => setEditWarrantyExclusions(e.target.value)}
                        placeholder="Misal: Kerusakan fisik benturan, korsleting listrik, modifikasi"
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setEditingProduct(null)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" id="save-edit-product-btn" className="bg-[#0F4C81] text-white">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Manager Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Kelola Varian, Harga &amp; Stok</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProductForVariants.name}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedProductForVariants(null)}
              >
                Tutup
              </Button>
            </div>

            {/* List Existing Variants */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Varian Terdaftar</h3>
              {loadingVariants ? (
                <div className="p-6 text-center text-xs text-slate-400">Memuat varian...</div>
              ) : variantList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Belum ada varian terdaftar.</div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {variantList.map((v) => (
                    <div key={v.variantId} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{v.name}</div>
                        <div className="text-[11px] text-[#0F4C81] font-semibold mt-0.5">
                          Rp{v.price.toLocaleString("id-ID")} &bull; Stok: {v.stock} unit
                        </div>
                      </div>
                      <Badge variant={v.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {v.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Add New Variant */}
            <form onSubmit={handleAddNewVariantToProduct} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">Tambah Varian Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nama Varian (misal: 4 kg)"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="Harga (Rp)"
                  value={newVarPrice}
                  onChange={(e) => setNewVarPrice(Number(e.target.value))}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
                />
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="Stok Unit"
                  value={newVarStock}
                  onChange={(e) => setNewVarStock(Number(e.target.value))}
                  className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-full bg-[#0F4C81] text-white">
                Tambahkan Varian ke Produk Ini
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchantProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat katalog merchant...</div>}>
      <MerchantProductsContent />
    </Suspense>
  );
}
