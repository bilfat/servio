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
  Image as ImageIcon,
  UploadSimple,
  X,
} from "@phosphor-icons/react";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { productsApi, taxonomyApi, productVariantsApi, productMediaApi } from "@/lib/servioApi";
import type { ApiProduct, ApiProductVariant, ApiBrand } from "@/types/domain";
import { getProductMediaUrl } from "@/types/domain";
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
  const [statusFilter, setStatusFilterState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("status");
      if (p && ["ALL", "ACTIVE", "DRAFT", "INACTIVE"].includes(p)) return p;
    }
    return "ALL";
  });

  const setStatusFilter = useCallback((val: string) => {
    setStatusFilterState(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (!val || val === "ALL") {
        url.searchParams.delete("status");
      } else {
        url.searchParams.set("status", val);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<ApiProduct | null>(null);
  const [variantList, setVariantList] = useState<ApiProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Media Management State
  const [selectedProductForMedia, setSelectedProductForMedia] = useState<ApiProduct | null>(null);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaActiveTab, setMediaActiveTab] = useState<"GENERAL" | "VARIANT">("GENERAL");
  const [selectedVariantIdForMedia, setSelectedVariantIdForMedia] = useState<string>("");
  const [generalMediaFiles, setGeneralMediaFiles] = useState<File[]>([]);
  const [variantMediaFiles, setVariantMediaFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Form State for Adding Product
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formSubcategoryId, setFormSubcategoryId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBrandName, setFormBrandName] = useState("");
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formGeneralFiles, setFormGeneralFiles] = useState<File[]>([]);
  const [formVariants, setFormVariants] = useState<Array<{ name: string; price: number; stock: number; variantFiles?: File[] }>>([
    { name: "Varian Standard", price: 100000, stock: 10, variantFiles: [] },
  ]);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

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
  const [newVarPhotos, setNewVarPhotos] = useState<File[]>([]);
  const [creatingVariantWithPhotos, setCreatingVariantWithPhotos] = useState(false);

  // Existing Variant Editing & Direct Photo Upload State
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVarName, setEditVarName] = useState("");
  const [editVarPrice, setEditVarPrice] = useState(0);
  const [editVarStock, setEditVarStock] = useState(0);
  const [updatingVariant, setUpdatingVariant] = useState(false);
  const [uploadingVariantId, setUploadingVariantId] = useState<string | null>(null);

  // Delete / Archive Modal State
  const [productToDelete, setProductToDelete] = useState<ApiProduct | null>(null);
  const [deleteReasonOption, setDeleteReasonOption] = useState<string>("Diskontinu / Stok Habis Permanen");
  const [customDeleteReason, setCustomDeleteReason] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  // 1. Load taxonomy once on mount
  useEffect(() => {
    let mounted = true;
    async function loadTaxonomy() {
      try {
        const [catRes, subcatRes, brandRes] = await Promise.all([
          taxonomyApi.getCategories({ master: "PRODUK", status: "ACTIVE" }),
          taxonomyApi.getSubcategories({ master: "PRODUK", status: "ACTIVE" }),
          taxonomyApi.getBrands({ status: "ACTIVE" }),
        ]);
        if (!mounted) return;
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

        if (cats.length > 0) {
          setFormCategoryId((prev) => prev || cats[0].id);
          const matchingSubs = subs.filter((s) => s.category_id === cats[0].id);
          if (matchingSubs.length > 0) {
            setFormSubcategoryId((prev) => prev || matchingSubs[0].id);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load taxonomy:", err);
      }
    }
    loadTaxonomy();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load merchant products
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const prodRes = await productsApi.list({
        scope: "merchant",
        search: searchQuery || undefined,
        categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
      });
      setProducts(prodRes.data || []);
    } catch (err: unknown) {
      console.error("Failed to load merchant products:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAddModalOpen]);

  const statusCounts = useMemo(() => {
    return {
      ALL: products.length,
      ACTIVE: products.filter((p) => p.status === "ACTIVE").length,
      DRAFT: products.filter((p) => p.status === "DRAFT").length,
      INACTIVE: products.filter((p) => p.status === "INACTIVE" || p.status === "ARCHIVED").length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!statusFilter || statusFilter === "ALL") return products;
    if (statusFilter === "INACTIVE") {
      return products.filter((p) => p.status === "INACTIVE" || p.status === "ARCHIVED");
    }
    return products.filter((p) => p.status === statusFilter);
  }, [products, statusFilter]);

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
      setIsCreatingProduct(true);
      const res = await productsApi.create({
        categoryId: formCategoryId,
        categoryName: selectedCat?.name || "Sparepart AC & Pendingin",
        subcategoryId: formSubcategoryId || undefined,
        subcategoryName: selectedSubcat?.name || undefined,
        name: formName.trim(),
        brandName: formBrandName.trim() || undefined,
        description: formDescription.trim() || undefined,
        variants: formVariants.filter((v) => v.name.trim() !== "").map((v) => ({
          name: v.name,
          price: v.price,
          stock: v.stock,
        })),
        warrantyPolicy: Number(warrantyDuration) > 0 ? {
          durationMonths: Number(warrantyDuration),
          type: warrantyType,
          coverage: warrantyCoverage.trim(),
          exclusions: warrantyExclusions.trim(),
          terms: "Wajib menyertakan bukti invoice transaksi resmi dan segel unit tidak rusak.",
        } : null,
      });

      const newProductId = res.data?.productId;
      if (newProductId) {
        // 1. Upload general photos if chosen
        if (formGeneralFiles.length > 0) {
          try {
            await productMediaApi.uploadMultiple(newProductId, formGeneralFiles, "GENERAL");
          } catch (mErr) {
            console.warn("Could not upload general photos immediately:", mErr);
          }
        }

        // 2. Upload variant-specific photos if chosen
        const hasVariantPhotos = formVariants.some((v) => v.variantFiles && v.variantFiles.length > 0);
        if (hasVariantPhotos) {
          try {
            const detailRes = await productsApi.get(newProductId, { scope: "merchant" });
            const createdVariants = detailRes.data?.variants || [];
            for (let i = 0; i < formVariants.length; i++) {
              const vFiles = formVariants[i].variantFiles;
              const matchedCreated = createdVariants[i];
              if (vFiles && vFiles.length > 0 && matchedCreated?.variantId) {
                await productMediaApi.uploadMultiple(newProductId, vFiles, "VARIANT", matchedCreated.variantId);
              }
            }
          } catch (vErr) {
            console.warn("Could not upload variant photos immediately:", vErr);
          }
        }

        // Activate product
        try {
          await productsApi.activate(newProductId);
        } catch {
          // If activation fails due to missing requirements, it stays DRAFT
        }
      }

      setIsAddModalOpen(false);
      setFormName("");
      setFormBrandName("");
      setIsCustomBrand(false);
      setFormDescription("");
      setFormGeneralFiles([]);
      setFormVariants([{ name: "Varian Standard", price: 100000, stock: 10, variantFiles: [] }]);
      setFormError(null);
      setToastMessage(`Produk "${formName}" berhasil ditambahkan ke katalog toko Anda!`);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal membuat produk.");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleOpenEditModal = async (p: ApiProduct) => {
    try {
      const res = await productsApi.get(p.productId, { scope: "merchant" });
      const full = res.data || p;
      setEditingProduct(full);
      setEditCategoryId(full.categoryId || "");
      setEditSubcategoryId(full.subcategoryId || "");
      setEditName(full.name || "");
      const currentBrand = (full.brandName || "").trim();
      setEditBrandName(currentBrand);
      const isRegistered = brands.some((b) => b.name.toLowerCase() === currentBrand.toLowerCase());
      setIsEditCustomBrand(!isRegistered && Boolean(currentBrand));
      setEditDescription(full.description || "");
      setEditWarrantyDuration(full.warrantyPolicy?.durationMonths ?? 0);
      setEditWarrantyType(full.warrantyPolicy?.type || "MANUFACTURER_AND_STORE");
      setEditWarrantyCoverage(full.warrantyPolicy?.coverage || "Cacat manufaktur, kegagalan fungsi kelistrikan suku cadang");
      setEditWarrantyExclusions(full.warrantyPolicy?.exclusions || "Kerusakan fisik akibat benturan, kesalahan instalasi non-resmi, atau korsleting");
      setEditFormError(null);
    } catch {
      setEditingProduct(p);
      setEditCategoryId(p.categoryId || "");
      setEditSubcategoryId(p.subcategoryId || "");
      setEditName(p.name || "");
      setEditFormError(null);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editCategoryId) {
      setEditFormError("Nama produk dan kategori wajib diisi.");
      return;
    }

    try {
      await productsApi.update(
        editingProduct.productId,
        {
          categoryId: editCategoryId,
          subcategoryId: editSubcategoryId || undefined,
          name: editName.trim(),
          brandName: editBrandName.trim() || undefined,
          description: editDescription.trim() || undefined,
        },
        editingProduct.lockVersion || 1
      );

      setEditingProduct(null);
      setToastMessage(`Produk "${editName}" berhasil diperbarui!`);
      loadData();
    } catch (err: unknown) {
      const e = err as any;
      setEditFormError(e.message || "Gagal memperbarui produk.");
    }
  };

  const handleToggleStatus = async (p: ApiProduct) => {
    const targetStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setToastMessage(`Mengubah status "${p.name}" ke ${targetStatus}...`);
      await productsApi.changeStatus(p.productId, targetStatus, p.lockVersion || 1);
      setToastMessage(`Status "${p.name}" berhasil diubah menjadi ${targetStatus}!`);
      loadData();
    } catch (err: unknown) {
      const e = err as any;
      let msg = e.message || "Gagal mengubah status produk.";
      if (e.data?.blocking_reasons && Array.isArray(e.data.blocking_reasons) && e.data.blocking_reasons.length > 0) {
        msg += " Alasan: " + e.data.blocking_reasons.join(", ");
      }
      setToastMessage(msg);
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

  const handleStartEditVariant = (v: ApiProductVariant) => {
    setEditingVariantId(v.variantId);
    setEditVarName(v.name);
    setEditVarPrice(v.price);
    setEditVarStock(v.stock);
  };

  const handleCancelEditVariant = () => {
    setEditingVariantId(null);
  };

  const handleSaveEditVariant = async (v: ApiProductVariant) => {
    if (!selectedProductForVariants) return;
    try {
      setUpdatingVariant(true);
      await productVariantsApi.update(
        selectedProductForVariants.productId,
        v.variantId,
        {
          name: editVarName.trim() || v.name,
          price: Number(editVarPrice),
          stock: Number(editVarStock),
        },
        v.lockVersion || 1
      );
      setToastMessage(`Varian "${editVarName || v.name}" berhasil diperbarui!`);
      setEditingVariantId(null);
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal memperbarui data varian.");
    } finally {
      setUpdatingVariant(false);
    }
  };

  const handleUploadPhotosToExistingVariant = async (variantId: string, files: FileList | null) => {
    if (!selectedProductForVariants || !files || files.length === 0) return;
    const fileArray = Array.from(files);
    try {
      setUploadingVariantId(variantId);
      await productMediaApi.uploadMultiple(
        selectedProductForVariants.productId,
        fileArray,
        "VARIANT",
        variantId
      );
      setToastMessage(`${fileArray.length} Foto varian berhasil diunggah!`);
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal mengunggah foto varian.");
    } finally {
      setUploadingVariantId(null);
    }
  };

  const handleDeleteVariantPhoto = async (mediaId: string) => {
    if (!selectedProductForVariants) return;
    if (!confirm("Hapus foto varian ini?")) return;
    try {
      await productMediaApi.delete(selectedProductForVariants.productId, mediaId, selectedProductForVariants.lockVersion || 1);
      setToastMessage("Foto varian berhasil dihapus.");
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menghapus foto varian.");
    }
  };

  const handleAddNewVariantToProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants || !newVarName.trim()) return;

    try {
      setCreatingVariantWithPhotos(true);
      const createdRes = await productVariantsApi.create(selectedProductForVariants.productId, {
        name: newVarName.trim(),
        price: Number(newVarPrice),
        stock: Number(newVarStock),
        status: "ACTIVE",
      });

      const createdVariantId = createdRes.data?.variantId || (createdRes.data as any)?._id;

      if (createdVariantId && newVarPhotos.length > 0) {
        await productMediaApi.uploadMultiple(
          selectedProductForVariants.productId,
          newVarPhotos,
          "VARIANT",
          createdVariantId
        );
      }

      setNewVarName("");
      setNewVarPrice(100000);
      setNewVarStock(10);
      setNewVarPhotos([]);
      setToastMessage("Varian baru beserta foto khusus berhasil ditambahkan!");
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menambahkan varian.");
    } finally {
      setCreatingVariantWithPhotos(false);
    }
  };

  const handleToggleVariantStatus = async (v: ApiProductVariant) => {
    if (!selectedProductForVariants) return;
    const target = v.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await productVariantsApi.changeStatus(
        selectedProductForVariants.productId,
        v.variantId,
        target,
        v.lockVersion || 1
      );
      setToastMessage(`Status varian "${v.name}" diubah ke ${target}.`);
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal mengubah status varian.");
    }
  };

  const handleDeleteVariant = async (v: ApiProductVariant) => {
    if (!selectedProductForVariants) return;
    if (!confirm(`Hapus varian "${v.name}" dari produk ini?`)) return;
    try {
      await productVariantsApi.delete(
        selectedProductForVariants.productId,
        v.variantId,
        v.lockVersion || 1
      );
      setToastMessage(`Varian "${v.name}" berhasil dihapus.`);
      const res = await productVariantsApi.list(selectedProductForVariants.productId);
      setVariantList(res.data || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menghapus varian.");
    }
  };

  const handleOpenMediaModal = async (p: ApiProduct) => {
    setSelectedProductForMedia(p);
    setLoadingMedia(true);
    setMediaError(null);
    setGeneralMediaFiles([]);
    setVariantMediaFiles([]);
    setMediaActiveTab("GENERAL");
    if (p.variants && p.variants.length > 0) {
      setSelectedVariantIdForMedia(p.variants[0].variantId);
    }
    try {
      const res = await productsApi.get(p.productId, { scope: "merchant" });
      const fullProd = res.data || p;
      setSelectedProductForMedia(fullProd);
      setMediaList(fullProd.media || []);
      if (fullProd.variants && fullProd.variants.length > 0) {
        setSelectedVariantIdForMedia(fullProd.variants[0].variantId);
      }
    } catch {
      setMediaList(p.media || []);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleUploadGeneralMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForMedia || generalMediaFiles.length === 0) {
      setMediaError("Pilih minimal satu file gambar umum terlebih dahulu.");
      return;
    }

    try {
      setUploadingMedia(true);
      setMediaError(null);
      await productMediaApi.uploadMultiple(
        selectedProductForMedia.productId,
        generalMediaFiles,
        "GENERAL"
      );
      setToastMessage(`${generalMediaFiles.length} Foto umum berhasil diunggah!`);
      setGeneralMediaFiles([]);
      const res = await productsApi.get(selectedProductForMedia.productId, { scope: "merchant" });
      setSelectedProductForMedia(res.data);
      setMediaList(res.data?.media || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setMediaError(e.message || "Gagal mengunggah foto umum.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUploadVariantMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForMedia || variantMediaFiles.length === 0) {
      setMediaError("Pilih minimal satu file gambar khusus varian.");
      return;
    }
    const targetVarId = selectedVariantIdForMedia || selectedProductForMedia.variants?.[0]?.variantId;
    if (!targetVarId) {
      setMediaError("Pilih varian produk tujuan terlebih dahulu.");
      return;
    }

    try {
      setUploadingMedia(true);
      setMediaError(null);
      await productMediaApi.uploadMultiple(
        selectedProductForMedia.productId,
        variantMediaFiles,
        "VARIANT",
        targetVarId
      );
      setToastMessage(`${variantMediaFiles.length} Foto khusus varian berhasil diunggah!`);
      setVariantMediaFiles([]);
      const res = await productsApi.get(selectedProductForMedia.productId, { scope: "merchant" });
      setSelectedProductForMedia(res.data);
      setMediaList(res.data?.media || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setMediaError(e.message || "Gagal mengunggah foto varian.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMediaItem = async (mediaId: string) => {
    if (!selectedProductForMedia) return;
    if (!confirm("Hapus foto ini dari listing produk?")) return;
    try {
      await productMediaApi.delete(selectedProductForMedia.productId, mediaId, selectedProductForMedia.lockVersion || 1);
      setToastMessage("Foto berhasil dihapus.");
      const res = await productsApi.get(selectedProductForMedia.productId, { scope: "merchant" });
      setSelectedProductForMedia(res.data);
      setMediaList(res.data?.media || []);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setMediaError(e.message || "Gagal menghapus foto.");
    }
  };

  const handlePromptDelete = (product: ApiProduct) => {
    setProductToDelete(product);
    setDeleteReasonOption("Diskontinu / Stok Habis Permanen");
    setCustomDeleteReason("");
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const finalReason = deleteReasonOption === "Lainnya"
      ? (customDeleteReason.trim() || "Ditarik oleh toko mitra")
      : deleteReasonOption;

    try {
      setIsDeleting(true);
      await productsApi.delete(productToDelete.productId, productToDelete.lockVersion || 1, finalReason);
      setToastMessage(`Produk "${productToDelete.name}" berhasil ditarik dari etalase.`);
      setProductToDelete(null);
      loadData();
    } catch (err: unknown) {
      const e = err as Error;
      setToastMessage(e.message || "Gagal menghapus produk.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle size={20} weight="fill" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
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
            className="flex items-center gap-2 bg-[#0F4C81] text-white"
          >
            <Plus size={18} weight="bold" />
            <span>Tambah Produk Baru</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200/90 pb-3 overflow-x-auto">
          {[
            { id: "ALL", label: "Semua Produk", count: statusCounts.ALL, badgeClass: "bg-slate-100 text-slate-700" },
            { id: "ACTIVE", label: "Aktif (Tayang Publik)", count: statusCounts.ACTIVE, badgeClass: "bg-emerald-100 text-emerald-800" },
            { id: "DRAFT", label: "Draf (Belum Tayang)", count: statusCounts.DRAFT, badgeClass: "bg-amber-100 text-amber-800" },
            { id: "INACTIVE", label: "Nonaktif / Arsip", count: statusCounts.INACTIVE, badgeClass: "bg-slate-200 text-slate-800" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive ? "bg-white/20 text-white" : tab.badgeClass
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
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
              className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Memuat katalog produk toko...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              {statusFilter === "ALL"
                ? 'Belum ada produk terdaftar. Klik "Tambah Produk Baru" untuk memulai.'
                : statusFilter === "ACTIVE"
                ? "Tidak ada produk aktif saat ini. Aktifkan produk dari tab Draf setelah mengunggah foto."
                : statusFilter === "DRAFT"
                ? "Tidak ada produk berstatus draf saat ini."
                : "Tidak ada produk nonaktif atau diarsipkan."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4 pl-6">Produk &amp; Merek</th>
                    <th className="py-3.5 px-4">Kategori &amp; Subkategori</th>
                    <th className="py-3.5 px-4">Varian &amp; Rentang Harga</th>
                    <th className="py-3.5 px-4">Total Stok</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const resolvedCategoryName =
                      p.categoryName ||
                      categories.find((c) => c.id === p.categoryId)?.name ||
                      p.categoryId ||
                      "Kategori Produk";
                    const resolvedSubcategoryName =
                      p.subcategoryName ||
                      subcategories.find((s) => s.id === p.subcategoryId)?.name;
                    const thumbUrl = p.primary_image_url || getProductMediaUrl(p.media);
                    const brandDisplay = p.brandName || (p as any).brand;

                    const generalCount = Array.isArray(p.media)
                      ? p.media.filter((m: any) => typeof m !== "string" && (m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT"))).length
                      : p.primary_image_url ? 1 : 0;

                    const variantCount = Array.isArray(p.media)
                      ? p.media.filter((m: any) => typeof m !== "string" && (m.scope === "VARIANT" || m.variantId || m.variant_id)).length
                      : (p.variants ? p.variants.reduce((acc, v) => acc + (v.media?.length || 0), 0) : 0);

                    return (
                      <tr key={p.productId} className="hover:bg-slate-50/60 transition group">
                        <td className="py-3.5 px-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/90 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:border-[#0F4C81]/30 transition">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <Package size={22} className="text-slate-400" />
                              )}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-slate-900 leading-snug line-clamp-1">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {brandDisplay ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-100">
                                    Merek: {brandDisplay}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">
                                    OEM
                                  </span>
                                )}
                                {/* Media Count Badges */}
                                {generalCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ImageIcon size={10} weight="fill" /> {generalCount} Umum
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <WarningCircle size={10} weight="fill" /> Butuh Foto Umum
                                  </span>
                                )}
                                {variantCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    {variantCount} Varian
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-400">
                                  ID: {p.productId.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] inline-block border border-slate-200/80">
                            {resolvedCategoryName}
                          </span>
                          {resolvedSubcategoryName && (
                            <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                              <Tag size={11} className="text-slate-400 shrink-0" />
                              <span>{resolvedSubcategoryName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0F4C81]">
                            {p.priceRangeFormatted ||
                              p.priceDisplay ||
                              (p.minPrice !== undefined && p.maxPrice !== undefined && p.minPrice > 0
                                ? p.minPrice !== p.maxPrice
                                  ? `Rp${p.minPrice.toLocaleString("id-ID")} - Rp${p.maxPrice.toLocaleString("id-ID")}`
                                  : `Rp${p.minPrice.toLocaleString("id-ID")}`
                                : "Belum diatur")}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.variantCount || (p.variants ? p.variants.length : 0)} Varian Dikonfigurasi
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold text-xs ${
                              (p.totalStock ?? 0) > 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {p.totalStock ?? p.variants?.reduce((acc, v) => acc + (v.stock || 0), 0) ?? 0} Unit
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
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
                            {p.status === "ARCHIVED" ? "DIARSIPKAN" : p.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(p)}
                              className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border cursor-pointer ${
                                p.status === "ACTIVE"
                                  ? "border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={
                                p.status === "ACTIVE"
                                  ? "Nonaktifkan tayang"
                                  : p.status === "ARCHIVED"
                                  ? "Aktifkan kembali produk dari arsip"
                                  : "Aktifkan produk"
                              }
                            >
                              <Power size={13} weight="bold" />
                              <span>
                                {p.status === "ACTIVE"
                                  ? "Nonaktifkan"
                                  : p.status === "ARCHIVED"
                                  ? "Pulihkan"
                                  : "Aktifkan"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenMediaModal(p)}
                              className="h-7 px-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-sky-50 hover:border-sky-300 hover:text-[#0F4C81] flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Kelola foto umum dan foto varian"
                            >
                              <ImageIcon size={13} weight="bold" />
                              <span>Foto ({generalCount + variantCount})</span>
                            </button>
                            <button
                              type="button"
                              id={`edit-product-${p.productId}`}
                              onClick={() => handleOpenEditModal(p)}
                              className="h-7 px-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-[#0F4C81] flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Ubah data produk"
                            >
                              <PencilSimple size={13} weight="bold" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenVariantModal(p)}
                              className="h-7 px-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-[#0F4C81] flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Kelola varian produk"
                            >
                              <Stack size={13} weight="bold" />
                              <span>Varian</span>
                            </button>
                            {p.status !== "ARCHIVED" && (
                              <button
                                type="button"
                                onClick={() => handlePromptDelete(p)}
                                className="h-7 px-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                                title="Hapus produk dari etalase"
                              >
                                <Trash size={13} weight="bold" />
                              </button>
                            )}
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
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <form
            onSubmit={handleCreateProduct}
            className="bg-white rounded-3xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden font-body animate-in fade-in zoom-in-95 duration-150"
          >
            {/* 1. Header (Sticky Top) dengan Tanda X Close */}
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-white">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Tambah Listing Produk &amp; Varian
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan suku cadang resmi dan tentukan harga serta stok untuk masing-masing varian
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                title="Tutup dialog (Esc)"
                aria-label="Tutup dialog"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* 2. Scrollable Body */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 min-h-0 text-xs">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <WarningCircle size={16} className="shrink-0" weight="bold" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: INFORMASI PRODUK & FOTO (2 KOLOM KESAMPING) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Kolom Kiri: Kategori, Subkategori, Nama & Merek (7 Kolom) */}
                <div className="lg:col-span-7 space-y-3.5">
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

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Merek Produk <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Opsional
                      </span>
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
                        className="w-full text-xs p-2.5 bg-white border border-sky-300 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none mt-2"
                      />
                    )}
                  </div>
                </div>

                {/* Kolom Kanan: Deskripsi & Foto Umum (5 Kolom) */}
                <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Produk</label>
                    <textarea
                      rows={3}
                      placeholder="Keterangan spesifikasi teknis dan kompatibilitas unit..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none resize-none"
                    ></textarea>
                  </div>

                  {/* Foto Umum Produk Card */}
                  <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon size={15} className="text-[#0F4C81]" weight="bold" />
                        <label className="text-xs font-bold text-slate-800">
                          Foto Umum Produk <span className="text-slate-400 font-normal">(Bisa &gt; 1)</span>
                        </label>
                      </div>
                      {formGeneralFiles.length > 0 && (
                        <span className="text-[10px] font-bold text-[#0F4C81] bg-white px-2 py-0.5 rounded-full border border-sky-200">
                          {formGeneralFiles.length} foto
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Foto default produk yang muncul pertama kali di etalase katalog.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setFormGeneralFiles(Array.from(e.target.files || []))}
                      className="w-full text-[11px] p-1.5 bg-white border border-slate-200 rounded-xl file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#0F4C81] file:text-white hover:file:bg-[#0B3860] cursor-pointer"
                    />
                    {formGeneralFiles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 max-h-16 overflow-y-auto">
                        {formGeneralFiles.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 font-medium">
                            <span className="truncate max-w-[100px]">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => setFormGeneralFiles(formGeneralFiles.filter((_, idx) => idx !== i))}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X size={10} weight="bold" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: DAFTAR VARIAN, HARGA, STOK & FOTO VARIAN (TABEL LEGA) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Stack size={16} className="text-[#0F4C81]" weight="bold" />
                      <span>Daftar Varian, Harga, Stok &amp; Foto Varian *</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Tentukan nama spesifik varian, harga jual resmi, stok unit, dan foto opsional.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddVariantRow}
                    className="text-xs py-1.5 px-3 flex items-center gap-1 font-bold shadow-xs cursor-pointer"
                  >
                    <Plus size={13} weight="bold" />
                    <span>Tambah Varian</span>
                  </Button>
                </div>

                {/* Container Tabel Varian */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-wider sticky top-0 z-10">
                          <th className="py-2.5 px-3.5 min-w-[200px]">
                            Nama Varian <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 w-40 min-w-[140px]">
                            Harga (Rp) <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 w-28 min-w-[90px] text-center">
                            Stok <span className="text-rose-500">*</span>
                          </th>
                          <th className="py-2.5 px-3 w-48 min-w-[160px]">
                            Foto Varian
                          </th>
                          <th className="py-2.5 px-2 w-12 text-center">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formVariants.map((v, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            {/* 1. Nama Varian */}
                            <td className="p-2.5 px-3.5 align-middle">
                              <input
                                type="text"
                                required
                                placeholder="misal: 1 PK / 1,2 kg / Standard"
                                value={v.name}
                                onChange={(e) => {
                                  const updated = [...formVariants];
                                  updated[idx].name = e.target.value;
                                  setFormVariants(updated);
                                }}
                                className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] transition shadow-2xs placeholder:text-slate-400"
                              />
                            </td>

                            {/* 2. Harga (Rp) */}
                            <td className="p-2.5 px-3 align-middle">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                                  Rp
                                </span>
                                <input
                                  type="number"
                                  required
                                  min={0}
                                  placeholder="0"
                                  value={v.price}
                                  onChange={(e) => {
                                    const updated = [...formVariants];
                                    updated[idx].price = Number(e.target.value);
                                    setFormVariants(updated);
                                  }}
                                  className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] transition shadow-2xs font-semibold"
                                />
                              </div>
                            </td>

                            {/* 3. Stok */}
                            <td className="p-2.5 px-3 align-middle text-center">
                              <input
                                type="number"
                                required
                                min={0}
                                placeholder="0"
                                value={v.stock}
                                onChange={(e) => {
                                  const updated = [...formVariants];
                                  updated[idx].stock = Number(e.target.value);
                                  setFormVariants(updated);
                                }}
                                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] transition shadow-2xs font-semibold"
                              />
                            </td>

                            {/* 4. Foto Varian */}
                            <td className="p-2.5 px-3 align-middle">
                              <label className="inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium cursor-pointer transition w-full shadow-2xs">
                                <span className="flex items-center gap-1.5 truncate">
                                  <ImageIcon size={14} className="text-purple-600 shrink-0" />
                                  <span className="truncate">
                                    {v.variantFiles && v.variantFiles.length > 0
                                      ? `${v.variantFiles.length} foto`
                                      : "Pilih Foto"}
                                  </span>
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 shrink-0">
                                  {v.variantFiles && v.variantFiles.length > 0 ? "Ubah" : "Upload"}
                                </span>
                                <input
                                  type="file"
                                  multiple
                                  accept="image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    const updated = [...formVariants];
                                    updated[idx].variantFiles = files;
                                    setFormVariants(updated);
                                  }}
                                />
                              </label>
                            </td>

                            {/* 5. Aksi (Hapus) */}
                            <td className="p-2.5 px-2 align-middle text-center">
                              {formVariants.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariantRow(idx)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Hapus baris varian ini"
                                >
                                  <Trash size={15} />
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs font-bold">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Tabel Ringkasan & Tambah Cepat */}
                  <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Total {formVariants.length} varian terdaftar</span>
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="text-[#0F4C81] hover:text-[#0c3c66] hover:underline font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
                    >
                      <Plus size={13} weight="bold" />
                      <span>Tambah Baris Varian</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: KETENTUAN GARANSI (PRATINJAU UI) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <WarningCircle size={16} className="text-amber-700 shrink-0" weight="bold" />
                    <span className="text-xs font-bold text-amber-950 font-heading">
                      Fitur Tambahan: Kebijakan Garansi &amp; Purnajual (Pratinjau UI)
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300">
                      Belum Tersimpan ke Database
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Formulir garansi di bawah ini saat ini disiapkan sebagai pratinjau tampilan antarmuka (UI). Data garansi belum disimpan secara permanen ke basis data produk.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Durasi Garansi <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <select
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
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
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipe Penjamin Garansi <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <select
                      value={warrantyType}
                      onChange={(e) => setWarrantyType(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                    >
                      <option value="MANUFACTURER_AND_STORE">Toko &amp; Pabrik Manufaktur Resmi</option>
                      <option value="STORE_ONLY">Garansi Toko (Tukar Baru / Perbaikan)</option>
                      <option value="OFFICIAL_BRAND">Brand / Distributor Tunggal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Cakupan Perlindungan Garansi <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={warrantyCoverage}
                      onChange={(e) => setWarrantyCoverage(e.target.value)}
                      placeholder="Misal: Cacat manufaktur, kebocoran freon bawaan"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pengecualian Garansi (Exclusions) <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      value={warrantyExclusions}
                      onChange={(e) => setWarrantyExclusions(e.target.value)}
                      placeholder="Misal: Kesalahan pasang, benturan fisik"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Sticky Modal Footer di Bawah */}
            <div className="px-6 py-4 sm:px-8 sm:py-4 border-t border-slate-100 bg-white/95 backdrop-blur-sm flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline-block">
                Pastikan nama dan harga setiap varian sudah terisi dengan benar.
              </span>
              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isCreatingProduct}
                  className="bg-[#0F4C81] text-white hover:bg-[#0c3c66] font-bold shadow-xs cursor-pointer"
                >
                  {isCreatingProduct ? "Menyimpan & Menerbitkan..." : "Simpan & Terbitkan Produk"}
                </Button>
              </div>
            </div>
          </form>
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

              {/* Warranty Policy Edit Section (UI-only preview) */}
              <div className="pt-4 border-t border-slate-200/80 space-y-3">
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <WarningCircle size={18} className="text-amber-700 shrink-0" weight="bold" />
                    <span className="text-xs font-bold text-amber-950 font-heading">
                      Kebijakan Garansi Produk (Pratinjau UI)
                    </span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300">
                      Belum Tersimpan ke Database
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Pengaturan garansi berikut disiapkan sebagai simulasi antarmuka purnajual dan saat ini belum disimpan secara permanen ke basis data.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Masa Garansi <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    Kelola Varian, Harga, Stok &amp; Foto Khusus
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                    {variantList.length} Varian
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{selectedProductForVariants.name}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedProductForVariants(null);
                  setEditingVariantId(null);
                  setNewVarPhotos([]);
                }}
              >
                Tutup
              </Button>
            </div>

            {/* List Existing Variants */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                <Stack size={14} className="text-[#0F4C81]" />
                <span>Varian Terdaftar ({variantList.length})</span>
              </h3>
              {loadingVariants ? (
                <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                  <Package size={28} className="animate-pulse text-[#0F4C81] mb-2" />
                  <span>Memuat varian suku cadang...</span>
                </div>
              ) : variantList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
                  Belum ada varian terdaftar. Tambahkan varian pertama melalui form di bawah.
                </div>
              ) : (
                <div className="space-y-3">
                  {variantList.map((v) => (
                    <div
                      key={v.variantId}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3 shadow-2xs"
                    >
                      {/* Top Variant Info & Actions */}
                      <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                            <span>{v.name}</span>
                            <Badge variant={v.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                              {v.status}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-[#0F4C81] font-semibold mt-0.5">
                            Rp{v.price.toLocaleString("id-ID")} &bull; Stok: {v.stock} unit
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (editingVariantId === v.variantId) {
                                handleCancelEditVariant();
                              } else {
                                handleStartEditVariant(v);
                              }
                            }}
                            className={`p-1.5 rounded-lg border transition text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                              editingVariantId === v.variantId
                                ? "bg-sky-100 text-[#0F4C81] border-[#0F4C81]"
                                : "bg-white text-slate-600 border-slate-200 hover:text-[#0F4C81] hover:bg-slate-50"
                            }`}
                            title="Edit nama, harga & stok varian"
                          >
                            <PencilSimple size={13} weight="bold" />
                            <span className="text-[10px]">Edit</span>
                          </button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleToggleVariantStatus(v)}
                            className="text-[10px] py-1 px-2.5"
                          >
                            {v.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteVariant(v)}
                            className="text-[10px] py-1 px-2 text-rose-600"
                            title="Hapus varian"
                          >
                            <Trash size={13} />
                          </Button>
                        </div>
                      </div>

                      {/* Inline Edit Form for this variant */}
                      {editingVariantId === v.variantId && (
                        <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2.5 animate-in fade-in duration-200">
                          <div className="text-[11px] font-bold text-[#0F4C81]">Edit Data Varian:</div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Varian</label>
                              <input
                                type="text"
                                value={editVarName}
                                onChange={(e) => setEditVarName(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                                placeholder="Nama Varian"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga (Rp)</label>
                              <input
                                type="number"
                                min={0}
                                value={editVarPrice}
                                onChange={(e) => setEditVarPrice(Number(e.target.value))}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                                placeholder="Harga (Rp)"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Stok Unit</label>
                              <input
                                type="number"
                                min={0}
                                value={editVarStock}
                                onChange={(e) => setEditVarStock(Number(e.target.value))}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                                placeholder="Stok Unit"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEditVariant}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Batal
                            </button>
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={updatingVariant}
                              onClick={() => handleSaveEditVariant(v)}
                              className="text-xs bg-[#0F4C81] text-white px-3 py-1"
                            >
                              {updatingVariant ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Variant-Specific Photos Section */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-[#0F4C81]" />
                            <span>Foto Khusus Varian ({v.media?.length || 0})</span>
                          </span>

                          <label className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C81] hover:text-[#0B3860] bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 cursor-pointer transition">
                            <Plus size={12} weight="bold" />
                            <span>+ Tambah Foto Varian</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingVariantId === v.variantId}
                              onChange={(e) => {
                                handleUploadPhotosToExistingVariant(v.variantId, e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>

                        {uploadingVariantId === v.variantId && (
                          <div className="text-[11px] text-[#0F4C81] font-semibold flex items-center gap-2 p-2 bg-sky-50 rounded-xl">
                            <Package size={14} className="animate-spin" />
                            <span>Mengunggah foto khusus varian...</span>
                          </div>
                        )}

                        {v.media && v.media.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {v.media.map((m: any, mIdx: number) => (
                              <div
                                key={m.id || mIdx}
                                className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden group shadow-2xs bg-slate-50 shrink-0"
                              >
                                <img
                                  src={m.url}
                                  alt={`${v.name} foto ${mIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariantPhoto(m.id)}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs hover:bg-rose-700 cursor-pointer"
                                  title="Hapus foto varian"
                                >
                                  <X size={10} weight="bold" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-slate-50/70 p-2.5 rounded-xl border border-dashed border-slate-200">
                            Belum ada foto khusus varian ini. (Pelanggan akan melihat foto umum bila memilih varian ini)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Add New Variant with Photo Picker */}
            <form onSubmit={handleAddNewVariantToProduct} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-heading">
                <Plus size={14} className="text-[#0F4C81]" />
                <span>Tambah Varian Baru</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nama Varian</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Varian (misal: 4 kg)"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Harga (Rp)"
                    value={newVarPrice}
                    onChange={(e) => setNewVarPrice(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Stok Unit</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Stok Unit"
                    value={newVarStock}
                    onChange={(e) => setNewVarStock(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Photo uploader for new variant */}
              <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                <label className="block text-[11px] font-bold text-slate-700">
                  Foto Khusus Varian Baru (Bisa lebih dari 1 foto):
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 hover:bg-sky-100 text-[#0F4C81] text-xs font-semibold cursor-pointer transition">
                    <UploadSimple size={14} weight="bold" />
                    <span>+ Pilih Foto Varian ({newVarPhotos.length} dipilih)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                          const chosen = Array.from(e.target.files);
                          setNewVarPhotos((prev) => [...prev, ...chosen]);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                {newVarPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {newVarPhotos.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        className="relative w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden group shadow-2xs"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewVarPhotos((prev) => prev.filter((_, i) => i !== fIdx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 cursor-pointer"
                        >
                          <X size={9} weight="bold" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={creatingVariantWithPhotos}
                className="w-full bg-[#0F4C81] text-white py-2 font-bold cursor-pointer"
              >
                {creatingVariantWithPhotos ? "Menyimpan Varian & Mengunggah Foto..." : "Tambahkan Varian ke Produk Ini"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Media Manager Modal: Foto Umum vs Foto Khusus Varian */}
      {selectedProductForMedia && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    Kelola Foto Katalog Produk
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                    Sistem 2-Scope: Umum &amp; Varian
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{selectedProductForMedia.name}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedProductForMedia(null)}
              >
                Tutup
              </Button>
            </div>

            {mediaError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} />
                <span>{mediaError}</span>
              </div>
            )}

            {/* Scope Navigation Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMediaActiveTab("GENERAL")}
                className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  mediaActiveTab === "GENERAL"
                    ? "bg-white text-[#0F4C81] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={16} weight={mediaActiveTab === "GENERAL" ? "fill" : "regular"} />
                <span>Foto Umum Produk</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 text-[#0F4C81]">
                  {mediaList.filter((m: any) => m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT")).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaActiveTab("VARIANT");
                  if (!selectedVariantIdForMedia && selectedProductForMedia.variants && selectedProductForMedia.variants.length > 0) {
                    setSelectedVariantIdForMedia(selectedProductForMedia.variants[0].variantId);
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  mediaActiveTab === "VARIANT"
                    ? "bg-white text-[#0F4C81] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Stack size={16} weight={mediaActiveTab === "VARIANT" ? "fill" : "regular"} />
                <span>Foto Khusus Varian</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700">
                  {mediaList.filter((m: any) => m.scope === "VARIANT" || m.variantId || m.variant_id).length}
                </span>
              </button>
            </div>

            {/* TAB CONTENT: 1. FOTO UMUM */}
            {mediaActiveTab === "GENERAL" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                  <Package size={18} className="text-[#0F4C81] shrink-0 mt-0.5" weight="duotone" />
                  <p className="leading-relaxed">
                    <b>Foto Umum</b> adalah foto default produk. Foto ini muncul pertama kali saat pelanggan atau pengunjung melihat katalog. Bisa diunggah lebih dari 1 foto.
                  </p>
                </div>

                {/* Upload Multi General Photos Form */}
                <form onSubmit={handleUploadGeneralMedia} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Unggah Foto Umum Baru (Bisa Lebih dari 1)</span>
                    {generalMediaFiles.length > 0 && (
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                        {generalMediaFiles.length} file dipilih
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setGeneralMediaFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#0F4C81] file:text-white hover:file:bg-[#0B3860] cursor-pointer"
                  />

                  {generalMediaFiles.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                      {generalMediaFiles.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 truncate max-w-[180px]">
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={uploadingMedia || generalMediaFiles.length === 0}
                    className="w-full bg-[#0F4C81] hover:bg-[#0B3860] text-white flex items-center justify-center gap-2 font-bold"
                  >
                    <UploadSimple size={16} weight="bold" />
                    <span>{uploadingMedia ? "Mengunggah..." : `Unggah ${generalMediaFiles.length > 0 ? generalMediaFiles.length : ""} Foto Umum`}</span>
                  </Button>
                </form>

                {/* Existing General Media List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Daftar Foto Umum Terunggah
                    </h3>
                    <span className="text-xs text-slate-400">
                      Total: {mediaList.filter((m: any) => m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT")).length} Foto
                    </span>
                  </div>

                  {(() => {
                    const generalPhotos = mediaList.filter((m: any) => m.scope === "GENERAL" || (!m.variantId && !m.variant_id && m.scope !== "VARIANT"));
                    if (generalPhotos.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                          Belum ada foto umum. Produk membutuhkan minimal 1 foto umum untuk dapat diaktifkan ke etalase publik.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {generalPhotos.map((m: any, idx: number) => (
                          <div
                            key={m.id || idx}
                            className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square flex flex-col justify-between"
                          >
                            <img src={m.url} alt="Foto Umum" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {m.isPrimary && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold shadow-xs">
                                  UTAMA
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-white text-[9px] font-medium backdrop-blur-xs">
                                UMUM
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMediaItem(m.id)}
                              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white shadow-xs opacity-90 hover:opacity-100 hover:scale-105 transition cursor-pointer"
                              title="Hapus foto ini"
                            >
                              <Trash size={14} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. FOTO KHUSUS VARIAN */}
            {mediaActiveTab === "VARIANT" && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                  <Stack size={18} className="text-purple-700 shrink-0 mt-0.5" weight="duotone" />
                  <p className="leading-relaxed">
                    <b>Foto Khusus Varian</b> akan muncul saat pembeli memilih varian tersebut. Ketika pembeli menggeser slider galeri hingga foto ini, varian ini otomatis tersorot berwarna biru. Bisa lebih dari 1 foto per varian.
                  </p>
                </div>

                {/* Variant Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Varian untuk Dikelola Fotonya:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProductForMedia.variants?.map((v) => {
                      const isSelected = (selectedVariantIdForMedia || selectedProductForMedia.variants?.[0]?.variantId) === v.variantId;
                      const photoCount = mediaList.filter((m: any) => (m.variantId === v.variantId || m.variant_id === v.variantId)).length;
                      return (
                        <button
                          key={v.variantId}
                          type="button"
                          onClick={() => setSelectedVariantIdForMedia(v.variantId)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs font-bold"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{v.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isSelected ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {photoCount} Foto
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Form for Selected Variant */}
                {selectedVariantIdForMedia && (
                  <form onSubmit={handleUploadVariantMedia} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Unggah Foto untuk: &quot;{selectedProductForMedia.variants?.find((v) => v.variantId === selectedVariantIdForMedia)?.name}&quot;
                      </span>
                      {variantMediaFiles.length > 0 && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          {variantMediaFiles.length} file dipilih
                        </span>
                      )}
                    </div>

                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setVariantMediaFiles(Array.from(e.target.files || []))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#0F4C81] file:text-white hover:file:bg-[#0B3860] cursor-pointer"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={uploadingMedia || variantMediaFiles.length === 0}
                      className="w-full bg-[#0F4C81] hover:bg-[#0B3860] text-white flex items-center justify-center gap-2 font-bold"
                    >
                      <UploadSimple size={16} weight="bold" />
                      <span>{uploadingMedia ? "Mengunggah..." : `Unggah Foto ke Varian Ini`}</span>
                    </Button>
                  </form>
                )}

                {/* Existing Variant Photos List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Foto Terunggah untuk Varian Ini
                  </h3>

                  {(() => {
                    const currentVId = selectedVariantIdForMedia || selectedProductForMedia.variants?.[0]?.variantId;
                    const variantPhotos = mediaList.filter((m: any) => (m.variantId === currentVId || m.variant_id === currentVId));
                    if (variantPhotos.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                          Varian ini belum memiliki foto khusus. Sistem akan otomatis menampilkan foto umum produk saat varian ini dipilih.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {variantPhotos.map((m: any, idx: number) => (
                          <div
                            key={m.id || idx}
                            className="group relative rounded-2xl border border-purple-200 overflow-hidden bg-slate-50 aspect-square flex flex-col justify-between"
                          >
                            <img src={m.url} alt="Foto Varian" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-purple-700 text-white text-[9px] font-bold shadow-xs">
                                VARIAN
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMediaItem(m.id)}
                              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white shadow-xs opacity-90 hover:opacity-100 hover:scale-105 transition cursor-pointer"
                              title="Hapus foto ini"
                            >
                              <Trash size={14} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete / Archive Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash size={24} weight="duotone" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Hapus Produk dari Etalase?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Produk <b className="text-slate-800">&quot;{productToDelete.name}&quot;</b> akan ditarik dan tidak akan lagi muncul di pencarian pembeli maupun etalase publik toko Anda.
                </p>
              </div>
            </div>

            {/* Info note */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5 leading-relaxed">
              <ShieldCheck size={18} weight="duotone" className="text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <b>Aman:</b> Riwayat pesanan dan kartu garansi pelanggan yang sudah pernah membeli produk ini tetap tersimpan rapi di sistem.
              </span>
            </div>

            {/* Reason selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Penarikan / Penghapusan *
              </label>
              <select
                value={deleteReasonOption}
                onChange={(e) => setDeleteReasonOption(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none cursor-pointer"
              >
                <option value="Diskontinu / Stok Habis Permanen">Diskontinu / Stok Habis Permanen</option>
                <option value="Ganti Model / Seri Pembaruan">Ganti Model / Seri Pembaruan</option>
                <option value="Kesalahan Input / Duplikat Data">Kesalahan Input / Duplikat Data</option>
                <option value="Lainnya">Lainnya (Tulis alasan sendiri)...</option>
              </select>

              {deleteReasonOption === "Lainnya" && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik alasan penarikan produk..."
                  value={customDeleteReason}
                  onChange={(e) => setCustomDeleteReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:outline-none animate-in fade-in slide-in-from-top-1"
                />
              )}
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex flex-row items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap min-h-[36px]"
              >
                <Trash size={15} weight="bold" className="shrink-0" />
                <span className="whitespace-nowrap">{isDeleting ? "Menghapus..." : "Hapus Produk"}</span>
              </button>
            </div>
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
