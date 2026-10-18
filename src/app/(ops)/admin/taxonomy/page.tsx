"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightning,
  ShieldCheck,
  Drop,
  Flame,
  Fan,
  PaintRoller,
  Scissors,
  Truck,
  Camera,
  Plug,
  DeviceMobile,
  FirstAid,
  Package,
  Storefront,
  Lock,
  Sparkle,
  Folder,
  TreeStructure,
  Plus,
  PencilSimple,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  MagnifyingGlass,
  PaperPlaneTilt,
  Trash,
  ClipboardText,
  Tag,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import {
  taxonomyApi,
  ApiCategoryMaster,
  ApiCategoryNode,
  ApiSubcategoryNode,
  ApiCategorySuggestion,
  ApiCategoryAuditLog,
} from "@/lib/servioApi";
import type { ApiBrand } from "@/types/domain";

// Mapping Icon Phosphor ke Komponen React
export const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightning,
  ShieldCheck,
  Drop,
  Flame,
  Fan,
  PaintRoller,
  Scissors,
  Truck,
  Camera,
  Plug,
  DeviceMobile,
  FirstAid,
  Package,
  Storefront,
  Lock,
  Sparkle,
  Folder,
};

// Daftar Icon Pilihan untuk Modal Tambah Kategori Jasa
export const AVAILABLE_SERVICE_ICONS = [
  { name: "Wrench", label: "Repair & Teknik", icon: Wrench, isDefault: true },
  { name: "HouseLine", label: "Home & Bangunan", icon: HouseLine, isDefault: true },
  { name: "Broom", label: "Cleaning & Kebersihan", icon: Broom, isDefault: true },
  { name: "GearSix", label: "Maintenance & Mesin", icon: GearSix, isDefault: true },
  { name: "TreeEvergreen", label: "Environment & Taman", icon: TreeEvergreen, isDefault: true },
  { name: "Car", label: "Automotive & Kendaraan", icon: Car, isDefault: true },
  { name: "Lightning", label: "Kelistrikan & Daya", icon: Lightning },
  { name: "Drop", label: "Pipa Air & Plumbing", icon: Drop },
  { name: "Flame", label: "Gas & Pemanas", icon: Flame },
  { name: "Fan", label: "AC & Ventilasi", icon: Fan },
  { name: "PaintRoller", label: "Pengecatan & Dinding", icon: PaintRoller },
  { name: "Scissors", label: "Grooming & Potong", icon: Scissors },
  { name: "Plug", label: "Elektronik & Perangkat", icon: Plug },
  { name: "DeviceMobile", label: "Gadget & Handphone", icon: DeviceMobile },
  { name: "Camera", label: "CCTV & Keamanan", icon: Camera },
  { name: "ShieldCheck", label: "Inspeksi & Sertifikasi", icon: ShieldCheck },
  { name: "Truck", label: "Logistik & Pindahan", icon: Truck },
  { name: "Lock", label: "Ahli Kunci & Brankas", icon: Lock },
  { name: "FirstAid", label: "Sanitasi Medis & Fogging", icon: FirstAid },
  { name: "Sparkle", label: "Layanan Spesialis", icon: Sparkle },
  { name: "Folder", label: "Umum & Lainnya", icon: Folder },
];

type MainModuleTab = "JASA" | "PRODUK" | "REQUESTS" | "BRANDS" | "AUDIT";
type SubModuleTab = "CATEGORY" | "SUBCATEGORY";
type RequestFilterStatus = "ALL" | "NEW" | "PROCESSING" | "APPROVED" | "FULFILLED" | "REJECTED";

const REQUEST_FILTER_OPTIONS: { id: RequestFilterStatus; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "PROCESSING", label: "In Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "FULFILLED", label: "Published" },
  { id: "REJECTED", label: "Rejected" },
];

export default function AdminTaxonomyPage() {
  const { user } = useActiveRole();

  // Tab Utama: Layanan Jasa, Produk & Barang, Pengajuan Mitra, Merek Produk, Audit Log
  const [mainTab, setMainTab] = useState<MainModuleTab>("JASA");
  // Sub-tab di dalam Jasa atau Produk: Kategori vs Sub Kategori
  const [subTab, setSubTab] = useState<SubModuleTab>("CATEGORY");

  const [searchQuery, setSearchQuery] = useState("");
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const [brandStatusFilter, setBrandStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [requestStatusFilter, setRequestStatusFilter] = useState<RequestFilterStatus>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Backend Data States
  const [masters, setMasters] = useState<ApiCategoryMaster[]>([]);
  const [categories, setCategories] = useState<ApiCategoryNode[]>([]);
  const [subcategories, setSubcategories] = useState<ApiSubcategoryNode[]>([]);
  const [requests, setRequests] = useState<ApiCategorySuggestion[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiCategoryAuditLog[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // =========================================================================
  // BRANDS MANAGEMENT STATE
  // =========================================================================
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<ApiBrand | null>(null);
  const [deleteBrandTarget, setDeleteBrandTarget] = useState<ApiBrand | null>(null);

  const [brandFormName, setBrandFormName] = useState("");
  const [brandFormLogo, setBrandFormLogo] = useState("");
  const [brandFormDesc, setBrandFormDesc] = useState("");
  const [brandFormStatus, setBrandFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // =========================================================================
  // MODALS STATE
  // =========================================================================

  // Modal: Tambah Kategori Jasa (Nama + Icon Picker)
  const [isAddJasaCategoryOpen, setIsAddJasaCategoryOpen] = useState(false);
  const [newJasaCatName, setNewJasaCatName] = useState("");
  const [newJasaCatIcon, setNewJasaCatIcon] = useState("Wrench");

  // Modal: Tambah Sub Kategori Jasa (Pilih Kategori Induk Jasa + Nama)
  const [isAddJasaSubOpen, setIsAddJasaSubOpen] = useState(false);
  const [newJasaSubCatId, setNewJasaSubCatId] = useState("");
  const [newJasaSubName, setNewJasaSubName] = useState("");

  // Modal: Tambah Kategori Barang (Nama saja)
  const [isAddProdukCategoryOpen, setIsAddProdukCategoryOpen] = useState(false);
  const [newProdukCatName, setNewProdukCatName] = useState("");

  // Modal: Tambah Sub Kategori Barang (Pilih Kategori Induk Barang + Nama)
  const [isAddProdukSubOpen, setIsAddProdukSubOpen] = useState(false);
  const [newProdukSubCatId, setNewProdukSubCatId] = useState("");
  const [newProdukSubName, setNewProdukSubName] = useState("");

  // Edit Kategori Modal
  const [editingCategory, setEditingCategory] = useState<ApiCategoryNode | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("Folder");

  // Edit Subkategori Modal
  const [editingSub, setEditingSub] = useState<ApiSubcategoryNode | null>(null);
  const [editSubName, setEditSubName] = useState("");

  // Ubah Status Modals
  const [statusCategoryModal, setStatusCategoryModal] = useState<{
    cat: ApiCategoryNode;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const [statusSubcategoryModal, setStatusSubcategoryModal] = useState<{
    sub: ApiSubcategoryNode;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);

  // Hard Delete Modals
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<ApiCategoryNode | null>(null);
  const [deleteSubcategoryTarget, setDeleteSubcategoryTarget] = useState<ApiSubcategoryNode | null>(null);

  // Request Review Modal
  const [selectedReq, setSelectedReq] = useState<ApiCategorySuggestion | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVED" | "PROCESSING" | "FULFILLED" | "REJECTED">("APPROVED");
  const [reviewReason, setReviewReason] = useState("");
  const [fulfilledNodeType, setFulfilledNodeType] = useState<"CATEGORY" | "SUBCATEGORY">("SUBCATEGORY");
  const [fulfilledNodeId, setFulfilledNodeId] = useState("");
  const [linkedRequestId, setLinkedRequestId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (err: any) => {
    let msg = "";
    if (typeof err === "string") {
      msg = err;
    } else if (err?.errors && typeof err.errors === "object") {
      const details = Object.entries(err.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
        .join("; ");
      msg = `${err.message || "Validasi gagal"}: ${details}`;
    } else {
      msg = err?.message || "Terjadi kesalahan.";
    }
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Load data dari Category Service
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [mastersRes, catsRes, subsRes, reqsRes, auditRes, brandsRes] = await Promise.allSettled([
        taxonomyApi.getMasters(),
        taxonomyApi.getCategories({ limit: 100 }),
        taxonomyApi.getSubcategories({ limit: 100 }),
        taxonomyApi.getRequests(),
        taxonomyApi.getAuditLogs({ limit: 50 }),
        taxonomyApi.getBrands(),
      ]);

      if (mastersRes.status === "fulfilled" && Array.isArray(mastersRes.value?.data)) {
        setMasters(mastersRes.value.data);
      }

      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value?.data)) {
        setCategories(catsRes.value.data);
      }

      if (subsRes.status === "fulfilled" && Array.isArray(subsRes.value?.data)) {
        setSubcategories(subsRes.value.data);
      }

      if (reqsRes.status === "fulfilled" && Array.isArray(reqsRes.value?.data)) {
        setRequests(reqsRes.value.data);
      }

      if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.data)) {
        setAuditLogs(auditRes.value.data);
      }

      if (brandsRes.status === "fulfilled" && Array.isArray(brandsRes.value?.data)) {
        setBrands(brandsRes.value.data);
      }
    } catch (err: any) {
      console.warn("Failed to load category service data:", err);
      showError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Master Root IDs
  const jasaMasterId = useMemo(
    () => masters.find((m) => m.code === "JASA")?.id || "804cc0e5-9a5a-43c1-9acd-fc5fe7712c35",
    [masters]
  );
  const produkMasterId = useMemo(
    () => masters.find((m) => m.code === "PRODUK")?.id || "6a03b42e-0171-40ad-ac0a-e452b86855dd",
    [masters]
  );

  // Kategori Jasa & Kategori Produk Aktif
  const jasaCategories = useMemo(
    () => categories.filter((c) => c.master_code === "JASA"),
    [categories]
  );
  const produkCategories = useMemo(
    () => categories.filter((c) => c.master_code === "PRODUK"),
    [categories]
  );

  // Subkategori Jasa & Subkategori Produk
  const jasaSubcategories = useMemo(
    () => subcategories.filter((s) => s.master_code === "JASA"),
    [subcategories]
  );
  const produkSubcategories = useMemo(
    () => subcategories.filter((s) => s.master_code === "PRODUK"),
    [subcategories]
  );

  // Inisialisasi dropdown kategori induk saat membuka modal subkategori
  useEffect(() => {
    if (jasaCategories.length > 0 && !newJasaSubCatId) {
      setNewJasaSubCatId(jasaCategories[0].id);
    }
    if (produkCategories.length > 0 && !newProdukSubCatId) {
      setNewProdukSubCatId(produkCategories[0].id);
    }
  }, [jasaCategories, produkCategories, newJasaSubCatId, newProdukSubCatId]);

  // Filtered List berdasarkan search query
  const displayedCategories = useMemo(() => {
    const list = mainTab === "JASA" ? jasaCategories : produkCategories;
    return list.filter((c) => {
      return (
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [mainTab, jasaCategories, produkCategories, searchQuery]);

  const displayedSubcategories = useMemo(() => {
    const list = mainTab === "JASA" ? jasaSubcategories : produkSubcategories;
    return list.filter((s) => {
      return (
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [mainTab, jasaSubcategories, produkSubcategories, searchQuery]);

  // Pengelompokan Sub Kategori per Kategori Induk (UI Hierarkis User-Friendly)
  const groupedSubcategories = useMemo(() => {
    const parentCats = mainTab === "JASA" ? jasaCategories : produkCategories;
    
    const groups: {
      category: ApiCategoryNode;
      subcategories: ApiSubcategoryNode[];
    }[] = [];

    parentCats.forEach((cat) => {
      const matchingSubs = displayedSubcategories.filter((s) => s.category_id === cat.id);
      
      if (searchQuery.trim()) {
        const catMatches =
          cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.code.toLowerCase().includes(searchQuery.toLowerCase());
        if (catMatches || matchingSubs.length > 0) {
          groups.push({ category: cat, subcategories: matchingSubs });
        }
      } else {
        groups.push({ category: cat, subcategories: matchingSubs });
      }
    });

    const knownCatIds = new Set(parentCats.map((c) => c.id));
    const orphans = displayedSubcategories.filter((s) => !knownCatIds.has(s.category_id));
    if (orphans.length > 0) {
      groups.push({
        category: {
          id: "other",
          master_id: "",
          master_code: mainTab === "JASA" ? "JASA" : "PRODUK",
          name: "Kategori Lainnya",
          code: "OTHER",
          description: null,
          icon_name: "Folder",
          status: "ACTIVE",
          effective_active: true,
          sort_order: 99,
          lock_version: 1,
          created_at: "",
          updated_at: "",
        },
        subcategories: orphans,
      });
    }

    return groups;
  }, [mainTab, jasaCategories, produkCategories, displayedSubcategories, searchQuery]);

  // Request status counts
  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "NEW").length,
    [requests]
  );

  // =========================================================================
  // ACTIONS: KATEGORI JASA
  // =========================================================================
  const handleCreateJasaCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJasaCatName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await taxonomyApi.createCategory({
        master_id: jasaMasterId,
        name: newJasaCatName.trim(),
        icon_name: newJasaCatIcon || "Wrench",
      });
      const createdCatId = res.data?.id;
      if (linkedRequestId && createdCatId) {
        try {
          await taxonomyApi.reviewRequest(linkedRequestId, {
            to_status: "FULFILLED",
            fulfilled_node: {
              node_type: "CATEGORY",
              node_id: createdCatId,
            },
          });
        } catch (linkErr) {
          console.warn("Failed to fulfill linked request:", linkErr);
        }
        setLinkedRequestId(null);
      }
      showToast(`Kategori Jasa "${newJasaCatName.trim()}" berhasil dibuat di sistem.`);
      setIsAddJasaCategoryOpen(false);
      setNewJasaCatName("");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal membuat kategori jasa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateJasaSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJasaSubName.trim() || !newJasaSubCatId) return;

    try {
      setIsSubmitting(true);
      const res = await taxonomyApi.createSubcategory({
        category_id: newJasaSubCatId,
        name: newJasaSubName.trim(),
      });
      const createdSubId = res.data?.id;
      if (linkedRequestId && createdSubId) {
        try {
          await taxonomyApi.reviewRequest(linkedRequestId, {
            to_status: "FULFILLED",
            fulfilled_node: {
              node_type: "SUBCATEGORY",
              node_id: createdSubId,
            },
          });
        } catch (linkErr) {
          console.warn("Failed to fulfill linked request:", linkErr);
        }
        setLinkedRequestId(null);
      }
      showToast(`Subkategori Jasa "${newJasaSubName.trim()}" berhasil dibuat di sistem.`);
      setIsAddJasaSubOpen(false);
      setNewJasaSubName("");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal membuat subkategori jasa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // ACTIONS: KATEGORI BARANG / PRODUK
  // =========================================================================
  const handleCreateProdukCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdukCatName.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await taxonomyApi.createCategory({
        master_id: produkMasterId,
        name: newProdukCatName.trim(),
      });
      const createdCatId = res.data?.id;
      if (linkedRequestId && createdCatId) {
        try {
          await taxonomyApi.reviewRequest(linkedRequestId, {
            to_status: "FULFILLED",
            fulfilled_node: {
              node_type: "CATEGORY",
              node_id: createdCatId,
            },
          });
        } catch (linkErr) {
          console.warn("Failed to fulfill linked request:", linkErr);
        }
        setLinkedRequestId(null);
      }
      showToast(`Kategori Barang "${newProdukCatName.trim()}" berhasil dibuat di sistem.`);
      setIsAddProdukCategoryOpen(false);
      setNewProdukCatName("");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal membuat kategori barang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProdukSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdukSubName.trim() || !newProdukSubCatId) return;

    try {
      setIsSubmitting(true);
      const res = await taxonomyApi.createSubcategory({
        category_id: newProdukSubCatId,
        name: newProdukSubName.trim(),
      });
      const createdSubId = res.data?.id;
      if (linkedRequestId && createdSubId) {
        try {
          await taxonomyApi.reviewRequest(linkedRequestId, {
            to_status: "FULFILLED",
            fulfilled_node: {
              node_type: "SUBCATEGORY",
              node_id: createdSubId,
            },
          });
        } catch (linkErr) {
          console.warn("Failed to fulfill linked request:", linkErr);
        }
        setLinkedRequestId(null);
      }
      showToast(`Subkategori Barang "${newProdukSubName.trim()}" berhasil dibuat di sistem.`);
      setIsAddProdukSubOpen(false);
      setNewProdukSubName("");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal membuat subkategori barang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // ACTIONS: EDIT & STATUS
  // =========================================================================
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCatName.trim()) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.updateCategory(
        editingCategory.id,
        {
          name: editCatName.trim(),
          icon_name: editingCategory.master_code === "JASA" ? editCatIcon : undefined,
        },
        editingCategory.lock_version
      );
      showToast(`Kategori "${editCatName.trim()}" berhasil diperbarui.`);
      setEditingCategory(null);
      loadData();
    } catch (err: any) {
      showError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editSubName.trim()) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.updateSubcategory(
        editingSub.id,
        {
          name: editSubName.trim(),
        },
        editingSub.lock_version
      );
      showToast(`Subkategori "${editSubName.trim()}" berhasil diperbarui.`);
      setEditingSub(null);
      loadData();
    } catch (err: any) {
      showError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeCategoryStatus = async () => {
    if (!statusCategoryModal) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.changeCategoryStatus(
        statusCategoryModal.cat.id,
        statusCategoryModal.nextStatus,
        `Diubah ke ${statusCategoryModal.nextStatus} oleh Admin Operasi`,
        statusCategoryModal.cat.lock_version
      );
      showToast(`Status kategori "${statusCategoryModal.cat.name}" berhasil diubah.`);
      setStatusCategoryModal(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal mengubah status kategori.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeSubcategoryStatus = async () => {
    if (!statusSubcategoryModal) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.changeSubcategoryStatus(
        statusSubcategoryModal.sub.id,
        statusSubcategoryModal.nextStatus,
        `Diubah ke ${statusSubcategoryModal.nextStatus} oleh Admin Operasi`,
        statusSubcategoryModal.sub.lock_version
      );
      showToast(`Status subkategori "${statusSubcategoryModal.sub.name}" berhasil diubah.`);
      setStatusSubcategoryModal(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal mengubah status subkategori.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.deleteCategory(deleteCategoryTarget.id, deleteCategoryTarget.lock_version);
      showToast(`Kategori "${deleteCategoryTarget.name}" berhasil dihapus.`);
      setDeleteCategoryTarget(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal menghapus kategori. Pastikan tidak ada subkategori atau pesanan terkait.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deleteSubcategoryTarget) return;

    try {
      setIsSubmitting(true);
      await taxonomyApi.deleteSubcategory(deleteSubcategoryTarget.id, deleteSubcategoryTarget.lock_version);
      showToast(`Subkategori "${deleteSubcategoryTarget.name}" berhasil dihapus.`);
      setDeleteSubcategoryTarget(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal menghapus subkategori. Pastikan tidak ada penawaran katalog terkait.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Review Usulan Mitra
  const handleExecuteRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    if (reviewAction === "REJECTED" && !reviewReason.trim()) {
      showError("Alasan penolakan wajib diisi untuk penolakan pengajuan.");
      return;
    }

    if (reviewAction === "APPROVED" && !reviewReason.trim()) {
      showError("Keterangan jadwal kapan ditambahkan ke sistem wajib diisi.");
      return;
    }

    if (reviewAction === "FULFILLED" && !fulfilledNodeId) {
      showError("Pilih node taksonomi resmi yang ditautkan untuk memenuhi pengajuan.");
      return;
    }

    try {
      setIsSubmitting(true);
      await taxonomyApi.reviewRequest(
        selectedReq.id,
        {
          to_status: reviewAction,
          review_reason: reviewReason.trim() || undefined,
          fulfilled_node:
            reviewAction === "FULFILLED"
              ? {
                  node_type: fulfilledNodeType,
                  node_id: fulfilledNodeId,
                }
              : null,
        },
        selectedReq.lock_version
      );

      showToast(
        reviewAction === "APPROVED"
          ? "Pengajuan berhasil disetujui (ACC) & dijadwalkan! Kategori/subkategori belum dibuat hingga Admin menginputnya ke sistem."
          : reviewAction === "PROCESSING"
          ? "Pengajuan ditandai sedang diproses."
          : reviewAction === "FULFILLED"
          ? "Pengajuan berhasil disetujui & ditandai sudah aktif di sistem."
          : "Pengajuan berhasil ditolak."
      );
      setSelectedReq(null);
      setReviewReason("");
      setFulfilledNodeId("");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal memproses review pengajuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenInputToSystem = (req: ApiCategorySuggestion) => {
    setLinkedRequestId(req.id);
    if (req.request_type === "SUBCATEGORY") {
      if (req.master_code === "JASA") {
        setNewJasaSubCatId(req.proposed_parent_category_id || (jasaCategories[0]?.id || ""));
        setNewJasaSubName(req.suggested_name);
        setIsAddJasaSubOpen(true);
      } else {
        setNewProdukSubCatId(req.proposed_parent_category_id || (produkCategories[0]?.id || ""));
        setNewProdukSubName(req.suggested_name);
        setIsAddProdukSubOpen(true);
      }
    } else {
      if (req.master_code === "JASA") {
        setNewJasaCatName(req.suggested_name);
        setIsAddJasaCategoryOpen(true);
      } else {
        setNewProdukCatName(req.suggested_name);
        setIsAddProdukCategoryOpen(true);
      }
    }
  };

  // =========================================================================
  // BRAND ACTIONS (CRUD & STATUS)
  // =========================================================================
  const handleOpenAddBrand = () => {
    setBrandFormName("");
    setBrandFormLogo("");
    setBrandFormDesc("");
    setBrandFormStatus("ACTIVE");
    setIsAddBrandOpen(true);
  };

  const handleOpenEditBrand = (brand: ApiBrand) => {
    setEditingBrand(brand);
    setBrandFormName(brand.name);
    setBrandFormLogo(brand.logo_url || brand.logoUrl || "");
    setBrandFormDesc(brand.description || "");
    setBrandFormStatus(brand.status);
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandFormName.trim()) {
      showError("Nama merek wajib diisi.");
      return;
    }
    try {
      setIsSubmitting(true);
      await taxonomyApi.createBrand({
        name: brandFormName.trim(),
        logo_url: brandFormLogo.trim() || undefined,
        description: brandFormDesc.trim() || undefined,
        status: brandFormStatus,
      });
      showToast(`Merek "${brandFormName}" berhasil ditambahkan ke direktori resmi!`);
      setIsAddBrandOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal menambahkan merek.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !brandFormName.trim()) {
      showError("Nama merek wajib diisi.");
      return;
    }
    try {
      setIsSubmitting(true);
      await taxonomyApi.updateBrand(editingBrand.id, {
        name: brandFormName.trim(),
        logo_url: brandFormLogo.trim() || undefined,
        description: brandFormDesc.trim() || undefined,
        status: brandFormStatus,
      });
      showToast(`Merek "${brandFormName}" berhasil diperbarui!`);
      setEditingBrand(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal memperbarui merek.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBrandStatus = async (brand: ApiBrand) => {
    const nextStatus = brand.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setIsSubmitting(true);
      await taxonomyApi.updateBrand(brand.id, { status: nextStatus });
      showToast(`Status merek "${brand.name}" berhasil diubah menjadi ${nextStatus === "ACTIVE" ? "Aktif" : "Nonaktif"}.`);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal mengubah status merek.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteBrandTarget) return;
    try {
      setIsSubmitting(true);
      await taxonomyApi.deleteBrand(deleteBrandTarget.id);
      showToast(`Merek "${deleteBrandTarget.name}" berhasil dihapus.`);
      setDeleteBrandTarget(null);
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal menghapus merek.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-body pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <CheckCircle size={20} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-rose-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <XCircle size={20} className="text-rose-300" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Manajemen Kategori dan Sub Kategori"
        description="Kelola kategori dan subkategori layanan jasa serta produk & barang resmi platform SERVIO secara mandiri."
        breadcrumbs={[
          { label: "Operations", href: "/admin/dashboard" },
          { label: "Kategori dan Sub Kategori", href: "/admin/taxonomy" },
        ]}
      />

      {/* 4 TAB UTAMA: JASA, PRODUK, PENGAJUAN, AUDIT */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => {
            setMainTab("JASA");
            setSubTab("CATEGORY");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "JASA"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={16} weight={mainTab === "JASA" ? "fill" : "bold"} />
          <span>Layanan Jasa ({jasaCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("PRODUK");
            setSubTab("CATEGORY");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "PRODUK"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package size={16} weight={mainTab === "PRODUK" ? "fill" : "bold"} />
          <span>Produk &amp; Barang ({produkCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("REQUESTS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "REQUESTS"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <PaperPlaneTilt size={16} weight={mainTab === "REQUESTS" ? "fill" : "bold"} />
          <span>Pengajuan Mitra ({requests.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab("BRANDS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "BRANDS"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Tag size={16} weight={mainTab === "BRANDS" ? "fill" : "bold"} />
          <span>Merek Produk ({brands.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("AUDIT")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            mainTab === "AUDIT"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <ClipboardText size={16} weight={mainTab === "AUDIT" ? "fill" : "bold"} />
          <span>Audit Log</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* KONTEN TAB: JASA ATAU PRODUK                                             */}
      {/* ========================================================================= */}
      {(mainTab === "JASA" || mainTab === "PRODUK") && (
        <div className="space-y-4">
          {/* Sub-Tab Selector & Tombol Tambah */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Sub-Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSubTab("CATEGORY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subTab === "CATEGORY"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kategori {mainTab === "JASA" ? "Jasa" : "Barang"} (
                {mainTab === "JASA" ? jasaCategories.length : produkCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab("SUBCATEGORY")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subTab === "SUBCATEGORY"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sub Kategori {mainTab === "JASA" ? "Jasa" : "Barang"} (
                {mainTab === "JASA" ? jasaSubcategories.length : produkSubcategories.length})
              </button>
            </div>

            {/* Search Input & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              {/* Tombol Tambah Kategori / Sub Kategori */}
              {mainTab === "JASA" && subTab === "CATEGORY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddJasaCategoryOpen(true)}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={16} weight="bold" />
                  <span>Tambah Kategori Jasa</span>
                </Button>
              )}

              {mainTab === "JASA" && subTab === "SUBCATEGORY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddJasaSubOpen(true)}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={16} weight="bold" />
                  <span>Tambah Sub Kategori Jasa</span>
                </Button>
              )}

              {mainTab === "PRODUK" && subTab === "CATEGORY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddProdukCategoryOpen(true)}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={16} weight="bold" />
                  <span>Tambah Kategori Barang</span>
                </Button>
              )}

              {mainTab === "PRODUK" && subTab === "SUBCATEGORY" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddProdukSubOpen(true)}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={16} weight="bold" />
                  <span>Tambah Sub Kategori Barang</span>
                </Button>
              )}
            </div>
          </div>

          {/* TABEL: DAFTAR KATEGORI */}
          {subTab === "CATEGORY" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Nama Kategori</th>
                      {mainTab === "JASA" && <th className="py-3.5 px-4 text-center">Ikon</th>}
                      <th className="py-3.5 px-4">Kode Taksonomi</th>
                      <th className="py-3.5 px-4 text-center">Sub Kategori Terdaftar</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          {isLoading ? "Memuat kategori..." : `Belum ada kategori ${mainTab.toLowerCase()}.`}
                        </td>
                      </tr>
                    ) : (
                      displayedCategories.map((cat) => {
                        const IconComponent = CATEGORY_ICON_MAP[cat.icon_name || ""] || Folder;
                        const childCount = subcategories.filter((s) => s.category_id === cat.id).length;

                        return (
                          <tr key={cat.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200 shrink-0">
                                  <IconComponent size={18} weight="duotone" />
                                </span>
                                <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                              </div>
                            </td>
                            {mainTab === "JASA" && (
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px]">
                                  <IconComponent size={14} />
                                  <span>{cat.icon_name || "Folder"}</span>
                                </span>
                              </td>
                            )}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{cat.code}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">{childCount}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cat.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                {cat.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setEditCatName(cat.name);
                                    setEditCatIcon(cat.icon_name || "Wrench");
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                  title="Edit Kategori"
                                >
                                  <PencilSimple size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStatusCategoryModal({
                                      cat,
                                      nextStatus: cat.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                    })
                                  }
                                  className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                                    cat.status === "ACTIVE"
                                      ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  }`}
                                  title={cat.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                                >
                                  {cat.status === "ACTIVE" ? (
                                    <ToggleRight size={16} weight="fill" />
                                  ) : (
                                    <ToggleLeft size={16} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteCategoryTarget(cat)}
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                                  title="Hapus Kategori"
                                >
                                  <Trash size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PENGELOMPOKAN SUB KATEGORI PER KATEGORI INDUK */}
          {subTab === "SUBCATEGORY" && (
            <div className="space-y-4">
              {groupedSubcategories.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-semibold shadow-xs">
                  {isLoading ? "Memuat subkategori..." : `Tidak ada subkategori ${mainTab.toLowerCase()} yang ditemukan.`}
                </div>
              ) : (
                groupedSubcategories.map(({ category: cat, subcategories: subs }) => {
                  const IconComponent = CATEGORY_ICON_MAP[cat.icon_name || ""] || Folder;
                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                    >
                      {/* Header Kategori Induk */}
                      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="p-2.5 rounded-xl bg-white text-[#0F4C81] border border-slate-200/90 shadow-2xs shrink-0">
                            <IconComponent size={20} weight="duotone" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-sm tracking-tight">{cat.name}</h3>
                              {cat.code && <span className="font-mono text-[11px] text-slate-400 font-semibold">({cat.code})</span>}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cat.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                              >
                                {cat.status === "ACTIVE" ? "Kategori Aktif" : "Nonaktif"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {subs.length} Sub Kategori Terdaftar di bawah kategori ini
                            </p>
                          </div>
                        </div>

                        {/* Tombol Cepat: Tambah Sub Kategori ke Kategori Ini */}
                        {cat.id !== "other" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (mainTab === "JASA") {
                                setNewJasaSubCatId(cat.id);
                                setNewJasaSubName("");
                                setIsAddJasaSubOpen(true);
                              } else {
                                setNewProdukSubCatId(cat.id);
                                setNewProdukSubName("");
                                setIsAddProdukSubOpen(true);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[#0F4C81] hover:bg-sky-50/70 hover:border-sky-300 font-bold text-xs shadow-2xs transition"
                          >
                            <Plus size={14} weight="bold" />
                            <span>Tambah Sub ke {cat.name}</span>
                          </button>
                        )}
                      </div>

                      {/* Tabel Sub Kategori dalam Kategori Induk */}
                      {subs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50/30">
                          Belum ada subkategori pada kategori <span className="font-bold text-slate-600">{cat.name}</span>. Klik tombol di atas untuk menambahkan.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-5">Nama Sub Kategori</th>
                                <th className="py-2.5 px-4">Kode Taksonomi</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-5 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {subs.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                                  <td className="py-3 px-5">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                                      <span className="font-bold text-slate-900 text-sm">{sub.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{sub.code}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                        sub.status === "ACTIVE"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-100 text-slate-500 border-slate-200"
                                      }`}
                                    >
                                      {sub.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSub(sub);
                                          setEditSubName(sub.name);
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                                        title="Edit Sub Kategori"
                                      >
                                        <PencilSimple size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setStatusSubcategoryModal({
                                            sub,
                                            nextStatus: sub.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                                          })
                                        }
                                        className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                                          sub.status === "ACTIVE"
                                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                        }`}
                                        title={sub.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                                      >
                                        {sub.status === "ACTIVE" ? (
                                          <ToggleRight size={16} weight="fill" />
                                        ) : (
                                          <ToggleLeft size={16} />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteSubcategoryTarget(sub)}
                                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-800 transition"
                                        title="Hapus Sub Kategori"
                                      >
                                        <Trash size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PENGAJUAN MITRA                                                      */}
      {/* ========================================================================= */}
      {mainTab === "REQUESTS" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Antrean Pengajuan Kategori &amp; Subkategori Mitra</h2>
              <p className="text-xs text-slate-500">
                Usulan penambahan spesialisasi dari Merchant, Service Provider, dan Supplier.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl">
              {REQUEST_FILTER_OPTIONS.map((opt) => {
                const isActive = requestStatusFilter === opt.id;
                const count =
                  opt.id === "ALL"
                    ? requests.length
                    : requests.filter((r) => r.status === opt.id).length;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRequestStatusFilter(opt.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold tabular-nums ${
                        isActive
                          ? "bg-[#0F4C81] text-white"
                          : "bg-slate-200/80 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Request No.</th>
                    <th className="py-3.5 px-4">Proposed Specification</th>
                    <th className="py-3.5 px-4">Type &amp; Master</th>
                    <th className="py-3.5 px-4">Requester</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Review Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {requests.filter(
                    (r) => requestStatusFilter === "ALL" || r.status === requestStatusFilter
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                        No proposals found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    requests
                      .filter((r) => requestStatusFilter === "ALL" || r.status === requestStatusFilter)
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0F4C81]">{req.request_number}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{req.suggested_name}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{req.reason}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                              {req.request_type} • {req.master_code}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{req.submitted_by_name || req.submitted_by_role}</p>
                            <p className="text-[10px] text-slate-500">{new Date(req.created_at).toLocaleDateString("id-ID")}</p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {req.status === "NEW" && <Badge variant="warning" size="sm">Menunggu Review</Badge>}
                            {req.status === "PROCESSING" && <Badge variant="neutral" size="sm">Sedang Diproses</Badge>}
                            {req.status === "APPROVED" && <Badge variant="success" size="sm">Disetujui (Terjadwal)</Badge>}
                            {req.status === "FULFILLED" && <Badge variant="primary" size="sm">Sudah Aktif di Sistem</Badge>}
                            {req.status === "REJECTED" && <Badge variant="danger" size="sm">Ditolak</Badge>}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {["NEW", "PROCESSING"].includes(req.status) ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedReq(req);
                                  setReviewAction("APPROVED");
                                  setReviewReason("");
                                  setFulfilledNodeType(req.request_type);
                                  setFulfilledNodeId("");
                                }}
                              >
                                Review Usulan
                              </Button>
                            ) : req.status === "APPROVED" ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  onClick={() => handleOpenInputToSystem(req)}
                                >
                                  + Input ke Sistem
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-slate-600 border-slate-300 hover:bg-slate-50 text-[11px]"
                                  onClick={() => {
                                    setSelectedReq(req);
                                    setReviewAction("REJECTED");
                                    setReviewReason("");
                                  }}
                                >
                                  Batal/Tolak
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold italic">
                                {req.status === "FULFILLED" ? "Telah Terbit" : "Ditolak"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: MEREK PRODUK (BRANDS REGISTRY)                                      */}
      {/* ========================================================================= */}
      {mainTab === "BRANDS" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Master Merek &amp; Brand Resmi Platform</h2>
              <p className="text-xs text-slate-500">
                Kelola direktori merek resmi suku cadang &amp; barang. Merek ini dapat dipilih oleh Merchant dan difilter oleh Pelanggan.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddBrand}
              className="flex items-center gap-2 bg-[#0F4C81] text-white shrink-0"
            >
              <Plus size={16} weight="bold" />
              <span>Tambah Merek Baru</span>
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau deskripsi merek..."
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
              <select
                value={brandStatusFilter}
                onChange={(e) => setBrandStatusFilter(e.target.value as any)}
                className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Tabel Merek dengan Scroll Internal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] shadow-xs">
                  <tr>
                    <th className="py-3 px-4 bg-slate-100">Foto / Logo Merek</th>
                    <th className="py-3 px-4 bg-slate-100">Nama Merek &amp; Slug</th>
                    <th className="py-3 px-4 bg-slate-100">Deskripsi / Keterangan</th>
                    <th className="py-3 px-4 bg-slate-100 text-center">Produk Terkait</th>
                    <th className="py-3 px-4 bg-slate-100 text-center">Status</th>
                    <th className="py-3 px-4 bg-slate-100 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {brands
                    .filter((b) => {
                      const matchStatus = brandStatusFilter === "ALL" || b.status === brandStatusFilter;
                      const q = brandSearchQuery.toLowerCase();
                      const matchSearch =
                        !q || b.name.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q));
                      return matchStatus && matchSearch;
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                        Belum ada merek terdaftar atau tidak cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    brands
                      .filter((b) => {
                        const matchStatus = brandStatusFilter === "ALL" || b.status === brandStatusFilter;
                        const q = brandSearchQuery.toLowerCase();
                        const matchSearch =
                          !q || b.name.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q));
                        return matchStatus && matchSearch;
                      })
                      .map((brand) => (
                        <tr key={brand.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                              {brand.logo_url || brand.logoUrl ? (
                                <img
                                  src={brand.logo_url || brand.logoUrl}
                                  alt={brand.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Tag size={20} className="text-slate-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{brand.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">slug: {brand.slug}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <p className="line-clamp-2">{brand.description || "-"}</p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-bold">
                              <Package size={13} weight="bold" />
                              <span>{brand.product_count ?? brand.productCount ?? 0} Produk</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                brand.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              {brand.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBrand(brand)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                                title="Edit Merek"
                              >
                                <PencilSimple size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleBrandStatus(brand)}
                                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                                  brand.status === "ACTIVE"
                                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                }`}
                                title={brand.status === "ACTIVE" ? "Nonaktifkan Merek" : "Aktifkan Merek"}
                              >
                                {brand.status === "ACTIVE" ? (
                                  <ToggleRight size={16} weight="fill" />
                                ) : (
                                  <ToggleLeft size={16} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteBrandTarget(brand)}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-800 transition"
                                title="Hapus Merek"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: AUDIT LOG (TABEL DENGAN SCROLL INTERNAL MANDIRI)                      */}
      {/* ========================================================================= */}
      {mainTab === "AUDIT" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Audit Trail Perubahan Taksonomi Kategori</h2>
              <p className="text-xs text-slate-500">
                Catatan kronologis immutable dari seluruh aksi mutasi kategori dan subkategori.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Total {auditLogs.length} Catatan Log
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] shadow-xs">
                  <tr>
                    <th className="py-3 px-4 bg-slate-100">Waktu</th>
                    <th className="py-3 px-4 bg-slate-100">Aksi</th>
                    <th className="py-3 px-4 bg-slate-100">Entitas</th>
                    <th className="py-3 px-4 bg-slate-100">Aktor / Role</th>
                    <th className="py-3 px-4 bg-slate-100">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                        Belum ada catatan log audit.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {(() => {
                            const rawTime = log.occurred_at || log.created_at;
                            if (!rawTime) return "-";
                            const clean = String(rawTime).replace(/ZZ$/, "Z");
                            const d = new Date(clean);
                            return !isNaN(d.getTime())
                              ? d.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-";
                          })()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{log.entity_type}</td>
                        <td className="py-3.5 px-4 font-bold text-[#0F4C81]">{log.actor_name || log.actor_role}</td>
                        <td className="py-3.5 px-4 text-slate-600">{log.reason || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Tambah Kategori Jasa (Nama + Icon Picker)                        */}
      {/* ========================================================================= */}
      {isAddJasaCategoryOpen && (
        <Modal
          isOpen={isAddJasaCategoryOpen}
          onClose={() => setIsAddJasaCategoryOpen(false)}
          title="Tambah Kategori Jasa Baru"
        >
          <form onSubmit={handleCreateJasaCategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Kategori Jasa</label>
              <input
                type="text"
                required
                placeholder="Contoh: Repair & Technical"
                value={newJasaCatName}
                onChange={(e) => setNewJasaCatName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            {/* Visual Icon Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-bold text-slate-700">Pilih Ikon Kategori</label>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] font-bold border border-sky-200">
                  {React.createElement(CATEGORY_ICON_MAP[newJasaCatIcon] || Folder, { size: 16, weight: "duotone" })}
                  <span>Terpilih: {newJasaCatIcon}</span>
                </div>
              </div>

              {/* 6 Icon Utama Default */}
              <div className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  6 Ikon Utama SERVIO (Rekomendasi)
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {AVAILABLE_SERVICE_ICONS.filter((i) => i.isDefault).map((item) => {
                    const IconComp = item.icon;
                    const isSelected = newJasaCatIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setNewJasaCatIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          isSelected
                            ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                        title={item.label}
                      >
                        <IconComp size={22} weight={isSelected ? "bold" : "duotone"} />
                        <span className="text-[9px] font-bold truncate max-w-full">{item.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pilihan Ikon Lainnya */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Ikon Tambahan Lainnya (Klik untuk Memilih)
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {AVAILABLE_SERVICE_ICONS.filter((i) => !i.isDefault).map((item) => {
                    const IconComp = item.icon;
                    const isSelected = newJasaCatIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setNewJasaCatIcon(item.name)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                        title={item.label}
                      >
                        <IconComp size={18} weight={isSelected ? "bold" : "duotone"} />
                        <span className="text-[8px] truncate max-w-full font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddJasaCategoryOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Kategori Jasa"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Tambah Sub Kategori Jasa (Kategori Induk + Nama)                  */}
      {/* ========================================================================= */}
      {isAddJasaSubOpen && (
        <Modal
          isOpen={isAddJasaSubOpen}
          onClose={() => setIsAddJasaSubOpen(false)}
          title="Tambah Sub Kategori Jasa"
        >
          <form onSubmit={handleCreateJasaSubcategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Kategori Jasa Induk</label>
              <select
                value={newJasaSubCatId}
                onChange={(e) => setNewJasaSubCatId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              >
                {jasaCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Sub Kategori Jasa</label>
              <input
                type="text"
                required
                placeholder="Contoh: AC & Pendingin Udara"
                value={newJasaSubName}
                onChange={(e) => setNewJasaSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddJasaSubOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Sub Kategori"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Tambah Kategori Barang (Nama saja)                               */}
      {/* ========================================================================= */}
      {isAddProdukCategoryOpen && (
        <Modal
          isOpen={isAddProdukCategoryOpen}
          onClose={() => setIsAddProdukCategoryOpen(false)}
          title="Tambah Kategori Barang Baru"
        >
          <form onSubmit={handleCreateProdukCategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Kategori Barang</label>
              <input
                type="text"
                required
                placeholder="Contoh: Sparepart AC & Pendingin"
                value={newProdukCatName}
                onChange={(e) => setNewProdukCatName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddProdukCategoryOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Kategori Barang"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Tambah Sub Kategori Barang (Kategori Induk + Nama)                */}
      {/* ========================================================================= */}
      {isAddProdukSubOpen && (
        <Modal
          isOpen={isAddProdukSubOpen}
          onClose={() => setIsAddProdukSubOpen(false)}
          title="Tambah Sub Kategori Barang"
        >
          <form onSubmit={handleCreateProdukSubcategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Kategori Barang Induk</label>
              <select
                value={newProdukSubCatId}
                onChange={(e) => setNewProdukSubCatId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              >
                {produkCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Sub Kategori Barang</label>
              <input
                type="text"
                required
                placeholder="Contoh: Kompresor & Filter Dryer"
                value={newProdukSubName}
                onChange={(e) => setNewProdukSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddProdukSubOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Sub Kategori"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT KATEGORI                                                       */}
      {/* ========================================================================= */}
      {editingCategory && (
        <Modal
          isOpen={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          title={`Edit Kategori (${editingCategory.master_code})`}
        >
          <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Kategori</label>
              <input
                type="text"
                required
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            {editingCategory.master_code === "JASA" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Ikon Kategori</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {AVAILABLE_SERVICE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = editCatIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setEditCatIcon(item.name)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-xs"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <IconComp size={18} weight={isSelected ? "bold" : "duotone"} />
                        <span className="text-[8px] truncate max-w-full font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditingCategory(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT SUBKATEGORI                                                    */}
      {/* ========================================================================= */}
      {editingSub && (
        <Modal
          isOpen={!!editingSub}
          onClose={() => setEditingSub(null)}
          title="Edit Sub Kategori"
        >
          <form onSubmit={handleUpdateSubcategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Sub Kategori</label>
              <input
                type="text"
                required
                value={editSubName}
                onChange={(e) => setEditSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditingSub(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL STATUS KATEGORI                                                     */}
      {/* ========================================================================= */}
      {statusCategoryModal && (
        <Modal
          isOpen={!!statusCategoryModal}
          onClose={() => setStatusCategoryModal(null)}
          title={statusCategoryModal.nextStatus === "ACTIVE" ? "Aktifkan Kategori" : "Nonaktifkan Kategori"}
        >
          <div className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Ubah status kategori <span className="font-bold text-slate-900">{statusCategoryModal.cat.name}</span> menjadi{" "}
              <span className="font-bold text-[#0F4C81]">
                {statusCategoryModal.nextStatus === "ACTIVE" ? "Aktif" : "Nonaktif"}
              </span>
              ?
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setStatusCategoryModal(null)}>
                Batal
              </Button>
              <Button
                variant={statusCategoryModal.nextStatus === "ACTIVE" ? "primary" : "danger"}
                size="sm"
                onClick={handleChangeCategoryStatus}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL STATUS SUBKATEGORI                                                  */}
      {/* ========================================================================= */}
      {statusSubcategoryModal && (
        <Modal
          isOpen={!!statusSubcategoryModal}
          onClose={() => setStatusSubcategoryModal(null)}
          title={statusSubcategoryModal.nextStatus === "ACTIVE" ? "Aktifkan Sub Kategori" : "Nonaktifkan Sub Kategori"}
        >
          <div className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Ubah status subkategori <span className="font-bold text-slate-900">{statusSubcategoryModal.sub.name}</span> menjadi{" "}
              <span className="font-bold text-[#0F4C81]">
                {statusSubcategoryModal.nextStatus === "ACTIVE" ? "Aktif" : "Nonaktif"}
              </span>
              ?
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setStatusSubcategoryModal(null)}>
                Batal
              </Button>
              <Button
                variant={statusSubcategoryModal.nextStatus === "ACTIVE" ? "primary" : "danger"}
                size="sm"
                onClick={handleChangeSubcategoryStatus}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL DELETE KATEGORI                                                     */}
      {/* ========================================================================= */}
      {deleteCategoryTarget && (
        <Modal
          isOpen={!!deleteCategoryTarget}
          onClose={() => setDeleteCategoryTarget(null)}
          title="Konfirmasi Hapus Kategori"
        >
          <div className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus permanen kategori{" "}
              <span className="font-bold text-slate-900">{deleteCategoryTarget.name}</span>?
            </p>
            <p className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              Kategori hanya dapat dihapus jika belum memiliki subkategori aktif atau transaksi riwayat terkait.
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setDeleteCategoryTarget(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteCategory} disabled={isSubmitting}>
                {isSubmitting ? "Menghapus..." : "Hapus Permanen"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL DELETE SUBKATEGORI                                                  */}
      {/* ========================================================================= */}
      {deleteSubcategoryTarget && (
        <Modal
          isOpen={!!deleteSubcategoryTarget}
          onClose={() => setDeleteSubcategoryTarget(null)}
          title="Konfirmasi Hapus Sub Kategori"
        >
          <div className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus permanen subkategori{" "}
              <span className="font-bold text-slate-900">{deleteSubcategoryTarget.name}</span>?
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setDeleteSubcategoryTarget(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteSubcategory} disabled={isSubmitting}>
                {isSubmitting ? "Menghapus..." : "Hapus Permanen"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL REVIEW PENGAJUAN                                                    */}
      {/* ========================================================================= */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`Review Usulan Mitra: ${selectedReq.request_number}`}
        >
          <form onSubmit={handleExecuteRequestReview} className="space-y-4 text-xs font-body">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#0F4C81] font-bold">
                  {selectedReq.master_code} • USULAN {selectedReq.request_type}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {new Date(selectedReq.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{selectedReq.suggested_name}</p>
              <p className="text-slate-600 text-xs">
                <span className="font-semibold text-slate-700">Alasan Bisnis: </span>
                {selectedReq.reason}
              </p>
              {selectedReq.business_context && (
                <p className="text-slate-500 text-[11px] italic bg-white p-2 rounded-lg border border-slate-200/60">
                  <span className="font-semibold text-slate-700 not-italic">Catatan Tambahan: </span>
                  {selectedReq.business_context}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Pilihan Keputusan Admin</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction("APPROVED");
                    if (!reviewReason) {
                      setReviewReason("Disetujui. Subkategori ini akan kami tambahkan ke sistem pada pembaruan katalog minggu depan.");
                    }
                  }}
                  className={`p-3 rounded-xl border text-left font-bold transition flex flex-col gap-1 ${
                    reviewAction === "APPROVED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    ✓ Setujui (ACC)
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Jadwalkan penambahan &amp; beri keterangan kapan diinput
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction("REJECTED");
                    setReviewReason("");
                  }}
                  className={`p-3 rounded-xl border text-left font-bold transition flex flex-col gap-1 ${
                    reviewAction === "REJECTED"
                      ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    ✕ Tolak Usulan
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Tolak usulan dengan mencantumkan alasan
                  </span>
                </button>
              </div>
            </div>

            {reviewAction === "APPROVED" && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <p className="font-bold text-emerald-900 text-xs">ℹ️ Keterangan Jadwal Penambahan ke Sistem</p>
                <p className="text-[11px] text-emerald-800">
                  Menyetujui usulan ini <strong>tidak otomatis</strong> memasukkannya ke katalog sistem. Kategori/subkategori baru hanya akan masuk ke database saat Anda menginputnya secara manual via tombol <strong>+ Input ke Sistem</strong>.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kapan Akan Ditambahkan ke Sistem? (Wajib untuk Keterangan Mitra)
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Disetujui. Subkategori ini akan kami tambahkan ke sistem pada pembaruan katalog tanggal 25 Oktober 2026."
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white font-medium text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            {reviewAction === "REJECTED" && (
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                <p className="font-bold text-rose-900 text-xs">⚠️ Alasan Penolakan</p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Alasan Penolakan (Wajib dibaca oleh Mitra)
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Layanan ini sudah tercakup dalam subkategori X / di luar standar platform SERVIO."
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-white font-medium text-xs focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedReq(null)}>
                Batal
              </Button>
              <Button
                variant={reviewAction === "REJECTED" ? "danger" : "primary"}
                size="sm"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : reviewAction === "APPROVED" ? "Setujui & Jadwalkan" : "Tolak Usulan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH MEREK BARU (NAMA + FOTO MEREK)                              */}
      {/* ========================================================================= */}
      {isAddBrandOpen && (
        <Modal
          isOpen={isAddBrandOpen}
          onClose={() => setIsAddBrandOpen(false)}
          title="Tambah Merek Produk Baru"
        >
          <form onSubmit={handleCreateBrand} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Merek *</label>
              <input
                type="text"
                required
                placeholder="Misal: Daikin Genuine, Panasonic, Bosch, Motul"
                value={brandFormName}
                onChange={(e) => setBrandFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">URL Foto / Logo Merek (Opsional)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="https://... atau /brands/logo.png"
                  value={brandFormLogo}
                  onChange={(e) => setBrandFormLogo(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                />
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {brandFormLogo ? (
                    <img src={brandFormLogo} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-slate-400" />
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tautkan logo resmi merek untuk ditampilkan pada kartu katalog dan filter pelanggan.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi / Keterangan Merek</label>
              <textarea
                rows={2}
                placeholder="Keterangan singkat spesialisasi produk atau prinsipal manufaktur..."
                value={brandFormDesc}
                onChange={(e) => setBrandFormDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Publikasi *</label>
              <select
                value={brandFormStatus}
                onChange={(e) => setBrandFormStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              >
                <option value="ACTIVE">Aktif (Tersedia untuk Merchant &amp; Pelanggan)</option>
                <option value="INACTIVE">Nonaktif (Disembunyikan sementara)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddBrandOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="bg-[#0F4C81] text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Merek"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MEREK PRODUK                                                  */}
      {/* ========================================================================= */}
      {editingBrand && (
        <Modal
          isOpen={!!editingBrand}
          onClose={() => setEditingBrand(null)}
          title={`Edit Merek: ${editingBrand.name}`}
        >
          <form onSubmit={handleUpdateBrand} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Merek *</label>
              <input
                type="text"
                required
                value={brandFormName}
                onChange={(e) => setBrandFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">URL Foto / Logo Merek</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="https://... atau /brands/logo.png"
                  value={brandFormLogo}
                  onChange={(e) => setBrandFormLogo(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
                />
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {brandFormLogo ? (
                    <img src={brandFormLogo} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi / Keterangan</label>
              <textarea
                rows={2}
                value={brandFormDesc}
                onChange={(e) => setBrandFormDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status Publikasi *</label>
              <select
                value={brandFormStatus}
                onChange={(e) => setBrandFormStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-[#0F4C81]/20 focus:outline-none"
              >
                <option value="ACTIVE">Aktif (Tersedia untuk Merchant &amp; Pelanggan)</option>
                <option value="INACTIVE">Nonaktif (Disembunyikan sementara)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditingBrand(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting} className="bg-[#0F4C81] text-white">
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS MEREK                                             */}
      {/* ========================================================================= */}
      {deleteBrandTarget && (
        <Modal
          isOpen={!!deleteBrandTarget}
          onClose={() => setDeleteBrandTarget(null)}
          title="Konfirmasi Hapus Merek"
        >
          <div className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Apakah Anda yakin ingin menghapus merek resmi{" "}
              <span className="font-bold text-slate-900">{deleteBrandTarget.name}</span> dari platform?
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              Perhatian: Merek yang dihapus tidak akan lagi muncul sebagai opsi pilihan cepat bagi Merchant baru.
            </p>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setDeleteBrandTarget(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteBrand} disabled={isSubmitting}>
                {isSubmitting ? "Menghapus..." : "Hapus Merek"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
