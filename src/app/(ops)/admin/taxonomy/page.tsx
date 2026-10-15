"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
  Folder,
  TreeStructure,
  Wrench,
  ChartLineUp,
  Plus,
  PencilSimple,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  PaperPlaneTilt,
  LockKey,
  Info,
  Clock,
  Eye,
  ArrowsLeftRight,
  Trash,
} from "@phosphor-icons/react";
import { ServiceCategory, ServiceSubcategory, SubcategoryRequest, ProviderMasterService } from "@/types/domain";
import { taxonomyApi, publicCatalogApi, ApiTaxonomyAnalytics } from "@/lib/servioApi";

type AdminMainTab = "category" | "subcategory" | "master-service" | "analysis";
type SubcategorySubSection = "list" | "requests" | "accepted" | "rejected";

export default function AdminTaxonomyPage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  // Exactly 4 main tabs (Locked Decision Section 14 & 45)
  const [activeTab, setActiveTab] = useState<AdminMainTab>("category");
  // Inside Subkategori: sub-section toggle (Daftar vs Pengajuan Subkategori)
  const [subSection, setSubSection] = useState<SubcategorySubSection>("list");

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subcategory Create / Edit / Map Modals
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [newSubCatId, setNewSubCatId] = useState("cat-repair");
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");

  const [editingSub, setEditingSub] = useState<ServiceSubcategory | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubDesc, setEditSubDesc] = useState("");

  const [mappingSub, setMappingSub] = useState<ServiceSubcategory | null>(null);
  const [targetCatId, setTargetCatId] = useState("cat-repair");

  // Request Review Modal
  const [selectedReq, setSelectedReq] = useState<SubcategoryRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"FORWARD" | "REJECT" | "PUBLISH" | "NOTIFY_PROVIDER">("FORWARD");
  const [notifyDecision, setNotifyDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminNotes, setAdminNotes] = useState("");

  // Live Canonical Backend Data
  const [apiCategories, setApiCategories] = useState<ServiceCategory[] | null>(null);
  const [apiSubcategories, setApiSubcategories] = useState<ServiceSubcategory[] | null>(null);
  const [apiRequests, setApiRequests] = useState<SubcategoryRequest[] | null>(null);
  const [apiProviderServices, setApiProviderServices] = useState<ProviderMasterService[] | null>(null);
  const [serverAnalytics, setServerAnalytics] = useState<ApiTaxonomyAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const actor = useMemo(
    () => ({
      id: user.id || "usr-admin-ops-01",
      name: user.name || "Fajar Wicaksono (Admin Operations)",
    }),
    [user]
  );

  const loadData = useCallback(async () => {
    try {
      const [catsRes, subsRes, reqsRes, pmsRes, analyticsRes] = await Promise.allSettled([
        taxonomyApi.getCategories(),
        taxonomyApi.getSubcategories(),
        taxonomyApi.getRequests(),
        publicCatalogApi.getCatalog(),
        taxonomyApi.getAnalytics("all"),
      ]);

      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value?.data)) {
        const cats = catsRes.value.data;
        if (cats.length > 0) {
          setApiCategories(
            cats.map((c) => ({
              id: c.id || c._id,
              name: c.name,
              code: c.code,
              description: c.description || "",
              status: (c.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
              iconName: c.iconName || "Folder",
              sortOrder: c.sortOrder || 1,
              subcategoriesCount: 0,
              activeServicesCount: 0,
              createdAt: c.createdAt || "",
              updatedAt: c.updatedAt || "",
            }))
          );
        }
      }

      if (subsRes.status === "fulfilled" && Array.isArray(subsRes.value?.data)) {
        setApiSubcategories(
          subsRes.value.data.map((s) => ({
            id: s.id || s._id,
            categoryId: s.categoryId,
            name: s.name,
            code: s.code,
            description: s.description || "",
            status: (s.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
            activeServicesCount: 0,
            createdAt: s.createdAt || "",
            updatedAt: s.updatedAt || "",
          }))
        );
      }

      if (reqsRes.status === "fulfilled" && Array.isArray(reqsRes.value?.data)) {
        setApiRequests(
          reqsRes.value.data.map((r: any) => ({
            id: r._id || r.id,
            providerId: r.providerOrganizationId || r.providerId || "prov-001",
            providerName: r.providerName || "Mitra Servio",
            categoryId: r.requestedCategoryId || r.categoryId || "",
            categoryName: r.category?.name || r.categoryName || "",
            requestedSubcategoryName: r.requestedName || r.requestedSubcategoryName || "",
            reason: r.reason || "",
            notes: r.notes || "",
            status: r.status as SubcategoryRequest["status"],
            createdAt: r.createdAt || new Date().toISOString(),
            adminReviewNotes: r.adminReview?.reason || r.adminNotes,
            ceoReviewNotes: r.ceoReview?.reason || r.reviewNotes,
          }))
        );
      }

      if (pmsRes.status === "fulfilled" && Array.isArray(pmsRes.value?.data)) {
        setApiProviderServices(
          pmsRes.value.data.map((p: any) => ({
            id: p._id || p.id,
            providerId: p.providerId,
            providerName: p.providerName || "Mitra Servio",
            categoryId: p.categoryId,
            categoryName: p.categoryName || "",
            subcategoryId: p.subcategoryId,
            subcategoryName: p.subcategoryName || "",
            name: p.name || p.title,
            description: p.description || p.shortDescription || "",
            priceMin: p.priceMin || p.basePrice || 0,
            priceMax: p.priceMax || p.basePrice || 0,
            surveyFee: p.surveyFee || 0,
            serviceMethods: (p.serviceMethods || ["HOME_SERVICE"]) as ("HOME_SERVICE" | "WORKSHOP" | "ON_SITE")[],
            status: (p.status || "ACTIVE") as "ACTIVE" | "INACTIVE",
            warrantyDurationDays: p.warrantyDurationDays || p.warrantyDays || 30,
            createdAt: p.createdAt || "",
            updatedAt: p.updatedAt || "",
          }))
        );
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data) {
        setServerAnalytics(analyticsRes.value.data);
      }
    } catch (err) {
      console.warn("Admin taxonomy API load warning:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categories = apiCategories !== null ? apiCategories : repo.categories;
  const subcategories = apiSubcategories !== null ? apiSubcategories : repo.subcategories;
  const providerServices = apiProviderServices !== null ? apiProviderServices : repo.providerMasterServices;
  const requests = apiRequests !== null ? apiRequests : (isLoading ? [] : repo.taxonomyRequests);

  const analytics = useMemo(() => {
    const base = repo.getTaxonomyAnalytics("all");
    if (serverAnalytics) {
      return {
        ...base,
        totalCategories: serverAnalytics.totalCategories,
        totalSubcategories: serverAnalytics.totalSubcategories,
        totalProviderMasterServices: serverAnalytics.totalProviderMasterServices,
        activeProvidersCount: serverAnalytics.activeProviders,
        totalServiceOrders: serverAnalytics.validServiceOrders,
        pendingRequestsCount: serverAnalytics.pendingRequests,
        categoryOrders: serverAnalytics.categoryBreakdown.map((cb) => ({
          categoryId: cb.categoryId,
          categoryName: cb.categoryName,
          orderCount: cb.orderVolume,
          percentage: serverAnalytics.validServiceOrders > 0 ? Math.round((cb.orderVolume / serverAnalytics.validServiceOrders) * 100) : 0,
          gmvAmount: 0,
        })),
      };
    }
    return base;
  }, [serverAnalytics, repo, categories, subcategories, providerServices]);

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "SUBMITTED" || r.status === "UNDER_ADMIN_REVIEW" || r.status === "FORWARDED_TO_CEO").length,
    [requests]
  );

  const acceptedRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "APPROVED" || r.status === "PUBLISHED").length,
    [requests]
  );

  const rejectedRequestsCount = useMemo(
    () => requests.filter((r) => r.status === "REJECTED_BY_ADMIN" || r.status === "REJECTED_BY_CEO").length,
    [requests]
  );

  const handleDeleteSubcategory = async (sub: ServiceSubcategory) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus subkategori "${sub.name}"? Seluruh Master Service di bawahnya juga akan ikut terhapus.`)) {
      return;
    }

    try {
      try {
        await taxonomyApi.deleteSubcategory(sub.id);
      } catch (apiErr) {
        console.warn("taxonomyApi.deleteSubcategory warning:", apiErr);
      }
      repo.deleteSubcategory(sub.id, actor);
      setToastMessage(`Subkategori "${sub.name}" berhasil dihapus.`);
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus subkategori");
    }
  };

  const handleClearAllSubcategories = async () => {
    if (subcategories.length === 0) return;
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA (${subcategories.length}) subkategori? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      try {
        await taxonomyApi.clearSubcategories();
      } catch (apiErr) {
        console.warn("taxonomyApi.clearSubcategories warning:", apiErr);
      }
      repo.clearAllSubcategories(actor);
      setToastMessage("Seluruh subkategori berhasil dibersihkan.");
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal membersihkan subkategori");
    }
  };

  const handleClearRequestsByTab = async (type: "requests" | "accepted" | "rejected") => {
    let statuses: string[] = [];
    let label = "";

    if (type === "requests") {
      statuses = ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"];
      label = "Inbox Pengajuan Baru";
    } else if (type === "accepted") {
      statuses = ["APPROVED", "PUBLISHED"];
      label = "Riwayat Disetujui CEO & Terbit";
    } else if (type === "rejected") {
      statuses = ["REJECTED_BY_ADMIN", "REJECTED_BY_CEO"];
      label = "Riwayat Ditolak";
    }

    if (!confirm(`Apakah Anda yakin ingin MENGHAPUS SEMUA data pada tab "${label}"?`)) {
      return;
    }

    try {
      try {
        await taxonomyApi.clearRequests(statuses);
      } catch (apiErr) {
        console.warn("taxonomyApi.clearRequests warning:", apiErr);
      }
      repo.clearTaxonomyRequestsByStatus(statuses, actor);
      setToastMessage(`Data pada tab "${label}" berhasil dibersihkan.`);
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal membersihkan riwayat pengajuan");
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    try {
      try {
        await taxonomyApi.createSubcategory({
          categoryId: newSubCatId,
          name: newSubName.trim(),
          description: newSubDesc.trim(),
        });
      } catch (apiErr) {
        console.warn("taxonomyApi.createSubcategory warning:", apiErr);
      }
      repo.createSubcategory(
        { categoryId: newSubCatId, name: newSubName.trim(), description: newSubDesc.trim() },
        actor
      );
      setNewSubName("");
      setNewSubDesc("");
      setIsAddSubOpen(false);
      setToastMessage("Subkategori baru berhasil dibuat dan dimapping.");
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal membuat subkategori");
    }
  };

  const handleUpdateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editSubName.trim()) return;
    try {
      try {
        await taxonomyApi.updateSubcategory(editingSub.id, {
          categoryId: editingSub.categoryId,
          name: editSubName.trim(),
          description: editSubDesc.trim(),
        });
      } catch (apiErr) {
        console.warn("taxonomyApi.updateSubcategory warning:", apiErr);
      }
      repo.updateSubcategory(
        editingSub.id,
        { name: editSubName.trim(), description: editSubDesc.trim() },
        actor
      );
      setEditingSub(null);
      setToastMessage("Subkategori berhasil diperbarui.");
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui subkategori");
    }
  };

  const handleMapSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingSub) return;
    try {
      repo.mapSubcategoryToCategory(mappingSub.id, targetCatId, actor);
      setMappingSub(null);
      setToastMessage("Mapping kategori induk subkategori berhasil diperbarui.");
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mapping subkategori");
    }
  };

  const handleToggleSubcategory = (sub: ServiceSubcategory) => {
    if (sub.status === "ACTIVE") {
      repo.deactivateSubcategory(sub.id, actor);
      setToastMessage(`Subkategori "${sub.name}" dinonaktifkan (arsip historis tetap aman).`);
    } else {
      repo.activateSubcategory(sub.id, actor);
      setToastMessage(`Subkategori "${sub.name}" diaktifkan.`);
    }
    loadData();
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExecuteRequestReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    try {
      if (reviewAction === "FORWARD") {
        try {
          await taxonomyApi.reviewRequest(selectedReq.id, "FORWARD_TO_CEO", adminNotes);
        } catch (apiErr) {
          console.warn("taxonomyApi.reviewRequest forward warning:", apiErr);
        }
        repo.forwardSubcategoryRequest(selectedReq.id, adminNotes, actor);
        setToastMessage("Pengajuan subkategori diteruskan ke CEO untuk Executive Review.");
      } else if (reviewAction === "REJECT") {
        try {
          await taxonomyApi.reviewRequest(selectedReq.id, "REJECT", adminNotes || "Ditolak oleh Admin Operasi.");
        } catch (apiErr) {
          console.warn("taxonomyApi.reviewRequest reject warning:", apiErr);
        }
        repo.rejectSubcategoryRequestByAdmin(selectedReq.id, adminNotes || "Ditolak oleh Admin Operasi.", actor);
        setToastMessage("Pengajuan subkategori ditolak dan alasan dikirim ke mitra pemohon.");
      } else if (reviewAction === "NOTIFY_PROVIDER") {
        // Admin sends confirmation / notification note to provider for CEO reviewed request
        try {
          await taxonomyApi.notifyProviderRequest(selectedReq.id, notifyDecision, adminNotes.trim());
        } catch (apiErr) {
          console.warn("taxonomyApi.notifyProviderRequest warning:", apiErr);
        }

        if (notifyDecision === "APPROVED") {
          selectedReq.status = "APPROVED";
          selectedReq.adminReviewNotes = adminNotes.trim() || "Pengajuan subkategori Anda telah disetujui.";
          setToastMessage("Keterangan persetujuan berhasil dikirim ke mitra!");
        } else {
          selectedReq.status = "REJECTED_BY_ADMIN";
          selectedReq.adminReviewNotes = adminNotes.trim() || "Pengajuan subkategori belum dapat disetujui.";
          setToastMessage("Keterangan penolakan berhasil dikirim ke mitra.");
        }
      } else if (reviewAction === "PUBLISH") {
        try {
          await taxonomyApi.publishRequest(selectedReq.id);
        } catch (apiErr) {
          console.warn("taxonomyApi.publishRequest warning:", apiErr);
        }
        repo.publishSubcategoryRequest(selectedReq.id, actor);
        setToastMessage("Subkategori hasil pengajuan resmi dipublikasikan!");
      }
      setSelectedReq(null);
      setAdminNotes("");
      loadData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memproses pengajuan");
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

      {/* Page Header */}
      <PageHeader
        title="Manajemen Kategori Jasa Operasional"
        description="Kontrol operasional Subkategori, peninjauan pengajuan subkategori mitra, mapping kategori, dan pengawasan katalog jasa."
        breadcrumbs={[
          { label: "Operations", href: "/ops/admin/dashboard" },
          { label: "Kategori Jasa", href: "/ops/admin/taxonomy" },
        ]}
      />

      {/* 4 MAIN TABS (LOCKED SPECIFICATION: EXACTLY 4 TABS) */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("category")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "category"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Folder size={16} weight={activeTab === "category" ? "fill" : "bold"} />
          <span>Kategori ({categories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("subcategory")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "subcategory"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <TreeStructure size={16} weight={activeTab === "subcategory" ? "fill" : "bold"} />
          <span>Subkategori ({subcategories.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("master-service")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "master-service"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={16} weight={activeTab === "master-service" ? "fill" : "bold"} />
          <span>Master Service ({providerServices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analysis")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "analysis"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <ChartLineUp size={16} weight={activeTab === "analysis" ? "fill" : "bold"} />
          <span>Analisis</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KATEGORI (READ-ONLY GOVERNANCE MONITORING)                         */}
      {/* ========================================================================= */}
      {activeTab === "category" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daftar Kategori Layanan Platform</h2>
              <p className="text-xs text-slate-500">
                Pondasi kategori jasa tingkat tertinggi. Kewenangan membuat dan mengubah struktur kategori berada di CEO.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              <LockKey size={14} />
              <span>Tata Kelola CEO</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Nama Kategori</th>
                    <th className="py-3.5 px-4 text-center">Subkategori Aktif</th>
                    <th className="py-3.5 px-4 text-center">Master Service</th>
                    <th className="py-3.5 px-4 text-center">Pesanan Terpenuhi</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {categories.map((cat) => {
                    const subCount = subcategories.filter((s) => s.categoryId === cat.id && s.status === "ACTIVE").length;
                    const pmsCount = providerServices.filter((p) => p.categoryId === cat.id).length;
                    const catAnalytics = analytics.categoryOrders.find((c) => c.categoryId === cat.id);

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200 shrink-0">
                              <Folder size={18} weight="duotone" />
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{cat.name}</p>
                              {cat.description && (
                                <p className="text-[11px] text-slate-500 max-w-sm truncate">{cat.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">{subCount}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">{pmsCount}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">{catAnalytics?.orderCount || 0}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUBKATEGORI (DAFTAR SUBKATEGORI, PENGAJUAN BARU, DI ACC CEO, DITOLAK) */}
      {/* ========================================================================= */}
      {activeTab === "subcategory" && (
        <div className="space-y-4">
          {/* Sub-Section Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSubSection("list")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subSection === "list"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Daftar Subkategori ({subcategories.length})
              </button>
              <button
                type="button"
                onClick={() => setSubSection("requests")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subSection === "requests"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>Pengajuan Baru</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSubSection("accepted")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subSection === "accepted"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>Di ACC CEO</span>
                {acceptedRequestsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${subSection === "accepted" ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"}`}>
                    {acceptedRequestsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSubSection("rejected")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  subSection === "rejected"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>Ditolak</span>
                {rejectedRequestsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${subSection === "rejected" ? "bg-white text-rose-700" : "bg-rose-100 text-rose-800"}`}>
                    {rejectedRequestsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {subSection === "list" && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleClearAllSubcategories}
                    disabled={subcategories.length === 0}
                    className="flex items-center gap-1.5"
                    title="Hapus semua subkategori yang ada"
                  >
                    <Trash size={16} weight="bold" />
                    <span>Hapus Semua Subkategori</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddSubOpen(true)}
                    className="flex items-center gap-1.5"
                  >
                    <Plus size={16} weight="bold" />
                    <span>Tambah Subkategori</span>
                  </Button>
                </>
              )}

              {subSection === "requests" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleClearRequestsByTab("requests")}
                  disabled={pendingRequestsCount === 0}
                  className="flex items-center gap-1.5"
                  title="Hapus semua data pengajuan baru"
                >
                  <Trash size={16} weight="bold" />
                  <span>Hapus Semua Pengajuan</span>
                </Button>
              )}

              {subSection === "accepted" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleClearRequestsByTab("accepted")}
                  disabled={acceptedRequestsCount === 0}
                  className="flex items-center gap-1.5"
                  title="Hapus semua riwayat yang di ACC CEO"
                >
                  <Trash size={16} weight="bold" />
                  <span>Hapus Semua Di ACC</span>
                </Button>
              )}

              {subSection === "rejected" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleClearRequestsByTab("rejected")}
                  disabled={rejectedRequestsCount === 0}
                  className="flex items-center gap-1.5"
                  title="Hapus semua riwayat pengajuan yang ditolak"
                >
                  <Trash size={16} weight="bold" />
                  <span>Hapus Semua Ditolak</span>
                </Button>
              )}
            </div>
          </div>

          {/* SUB-SECTION 1: DAFTAR SUBKATEGORI */}
          {subSection === "list" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama subkategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Subkategori</th>
                      <th className="py-3.5 px-4">Kategori Induk</th>
                      <th className="py-3.5 px-4 text-center">Master Service</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {subcategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                          Belum ada subkategori aktif. Klik "Tambah Subkategori" untuk membuat baru.
                        </td>
                      </tr>
                    ) : (
                      subcategories
                        .filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.categoryName || "").toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((sub) => {
                          const pmsCount = providerServices.filter((p) => p.subcategoryId === sub.id).length;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-900">{sub.name}</p>
                                {sub.description && (
                                  <p className="text-[11px] text-slate-500 max-w-sm truncate">{sub.description}</p>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-slate-800">{sub.categoryName}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-700">{pmsCount}</td>
                              <td className="py-3.5 px-4 text-center">
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
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSub(sub);
                                      setEditSubName(sub.name);
                                      setEditSubDesc(sub.description || "");
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                    title="Edit Subkategori"
                                  >
                                    <PencilSimple size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMappingSub(sub);
                                      setTargetCatId(sub.categoryId);
                                    }}
                                    className="p-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                                    title="Map Ulang Kategori"
                                  >
                                    <ArrowsLeftRight size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubcategory(sub)}
                                    className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                                      sub.status === "ACTIVE"
                                        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                    }`}
                                    title={sub.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                                  >
                                    {sub.status === "ACTIVE" ? <ToggleRight size={16} weight="fill" /> : <ToggleLeft size={16} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubcategory(sub)}
                                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                                    title="Hapus Subkategori"
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

          {/* SUB-SECTION 2: PENGAJUAN BARU (INBOX WAITING / UNDER REVIEW / FORWARDED) */}
          {subSection === "requests" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inbox Pengajuan Subkategori Baru dari Mitra</h3>
                  <p className="text-xs text-slate-500">
                    Tinjau permintaan subkategori baru, tolak, atau teruskan ke CEO untuk otorisasi struktural.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Mitra Pemohon</th>
                      <th className="py-3.5 px-4">Kategori Induk</th>
                      <th className="py-3.5 px-4">Subkategori yang Diajukan</th>
                      <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                      <th className="py-3.5 px-4 text-center">Status Alur</th>
                      <th className="py-3.5 px-4 text-right">Aksi Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {requests.filter((r) => ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"].includes(r.status)).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          Tidak ada pengajuan subkategori baru yang menunggu review.
                        </td>
                      </tr>
                    ) : (
                      requests
                        .filter((r) => ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"].includes(r.status))
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4 font-bold text-[#0F4C81]">
                              {req.providerName || req.providerId}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{req.categoryName}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{req.requestedSubcategoryName}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{req.reason}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">{req.createdAt}</td>
                            <td className="py-3.5 px-4 text-center">
                              {req.status === "SUBMITTED" && (
                                <Badge variant="warning" size="sm">Baru Diajukan</Badge>
                              )}
                              {req.status === "UNDER_ADMIN_REVIEW" && (
                                <Badge variant="neutral" size="sm">Review Admin</Badge>
                              )}
                              {req.status === "FORWARDED_TO_CEO" && (
                                <Badge variant="warning" size="sm">Menunggu CEO</Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {["SUBMITTED", "UNDER_ADMIN_REVIEW"].includes(req.status) && (
                                  <>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setReviewAction("REJECT");
                                      }}
                                    >
                                      Tolak
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setReviewAction("FORWARD");
                                      }}
                                    >
                                      Teruskan ke CEO
                                    </Button>
                                  </>
                                )}
                                {req.status === "FORWARDED_TO_CEO" && (
                                  <span className="text-[11px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                    Sedang Ditinjau CEO
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION 3: DI ACC CEO (APPROVED & PUBLISHED) */}
          {subSection === "accepted" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Disetujui CEO & Terbit</h3>
                  <p className="text-xs text-slate-500">
                    Pengajuan subkategori yang telah mendapatkan persetujuan CEO dan siap dipublikasikan atau sudah aktif dalam katalog.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Mitra Pemohon</th>
                      <th className="py-3.5 px-4">Kategori Induk</th>
                      <th className="py-3.5 px-4">Subkategori yang Diajukan</th>
                      <th className="py-3.5 px-4">Catatan CEO</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {requests.filter((r) => ["APPROVED", "CEO_APPROVED", "PUBLISHED"].includes(r.status)).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          Belum ada riwayat pengajuan yang disetujui CEO.
                        </td>
                      </tr>
                    ) : (
                      requests
                        .filter((r) => ["APPROVED", "CEO_APPROVED", "PUBLISHED"].includes(r.status))
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4 font-bold text-[#0F4C81]">
                              {req.providerName || req.providerId}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{req.categoryName}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{req.requestedSubcategoryName}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{req.reason}</p>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              <p className="text-[11px] italic bg-emerald-50 text-emerald-900 p-1.5 rounded-lg border border-emerald-100">
                                {req.ceoReviewNotes || "Disetujui tanpa catatan khusus."}
                              </p>
                              {req.adminReviewNotes && (
                                <p className="text-[10px] text-slate-500 mt-1">
                                  Keterangan Admin: {req.adminReviewNotes}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {req.status === "CEO_APPROVED" && (
                                <Badge variant="warning" size="sm">Menunggu Input Admin</Badge>
                              )}
                              {req.status === "APPROVED" && (
                                <Badge variant="success" size="sm">Telah Dikirim ke Mitra</Badge>
                              )}
                              {req.status === "PUBLISHED" && (
                                <Badge variant="neutral" size="sm">Aktif di Katalog</Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {req.status === "CEO_APPROVED" && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedReq(req);
                                      setAdminNotes(req.adminReviewNotes || "");
                                      setReviewAction("NOTIFY_PROVIDER");
                                    }}
                                  >
                                    Kirim Keterangan ke Mitra
                                  </Button>
                                )}
                                {req.status === "APPROVED" && (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setAdminNotes(req.adminReviewNotes || "");
                                        setReviewAction("NOTIFY_PROVIDER");
                                      }}
                                    >
                                      Ubah Keterangan
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedReq(req);
                                        setReviewAction("PUBLISH");
                                      }}
                                    >
                                      Publikasi
                                    </Button>
                                  </div>
                                )}
                                {req.status === "PUBLISHED" && (
                                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                    Sudah Terdaftar
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-SECTION 4: DITOLAK (REJECTED BY ADMIN & REJECTED BY CEO) */}
          {subSection === "rejected" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Subkategori yang Ditolak</h3>
                  <p className="text-xs text-slate-500">
                    Daftar permintaan subkategori yang ditolak oleh Admin Operasi maupun CEO beserta alasan penolakan.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Mitra Pemohon</th>
                      <th className="py-3.5 px-4">Kategori Induk</th>
                      <th className="py-3.5 px-4">Subkategori yang Diajukan</th>
                      <th className="py-3.5 px-4">Alasan Penolakan</th>
                      <th className="py-3.5 px-4 text-center">Pihak Penolak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {requests.filter((r) => ["REJECTED_BY_ADMIN", "REJECTED_BY_CEO", "CEO_REJECTED"].includes(r.status)).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                          Tidak ada riwayat pengajuan yang ditolak.
                        </td>
                      </tr>
                    ) : (
                      requests
                        .filter((r) => ["REJECTED_BY_ADMIN", "REJECTED_BY_CEO", "CEO_REJECTED"].includes(r.status))
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-4 font-bold text-[#0F4C81]">
                              {req.providerName || req.providerId}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{req.categoryName}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-900">{req.requestedSubcategoryName}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">{req.reason}</p>
                            </td>
                            <td className="py-3.5 px-4 text-rose-700">
                              <p className="text-[11px] bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                                {req.ceoReviewNotes || req.adminReviewNotes || "Ditolak tanpa rincian alasan."}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {req.status === "REJECTED_BY_ADMIN" ? (
                                <Badge variant="danger" size="sm">Ditolak Admin</Badge>
                              ) : (
                                <Badge variant="danger" size="sm">Ditolak CEO</Badge>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MASTER SERVICE (MONITORING VIEW ONLY - NO COMMERCIAL EDITING)       */}
      {/* ========================================================================= */}
      {activeTab === "master-service" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monitoring Master Service Penawaran Mitra</h2>
              <p className="text-xs text-slate-500">
                Pengawasan penawaran layanan aktif. Admin tidak memiliki wewenang mengubah harga penawaran atau survei fee milik mitra.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
              <ShieldCheck size={16} />
              <span>Privasi Penawaran Terjaga</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Master Service</th>
                    <th className="py-3.5 px-4">Kategori &amp; Subkategori</th>
                    <th className="py-3.5 px-4">Mitra Pemilik</th>
                    <th className="py-3.5 px-4 text-center">Metode Layanan</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {providerServices.map((pms) => (
                    <tr key={pms.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{pms.name}</p>
                        <p className="text-[11px] text-slate-500 max-w-sm truncate">{pms.description}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{pms.subcategoryName}</p>
                        <p className="text-[10px] text-slate-500">{pms.categoryName}</p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0F4C81]">
                        {pms.providerName || pms.providerId}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {pms.serviceMethods.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-medium">
                              {m === "HOME_SERVICE" ? "Home Service" : m === "WORKSHOP" ? "Workshop" : "On-Site"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            pms.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {pms.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ANALISIS OPERASIONAL                                              */}
      {/* ========================================================================= */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Analisis Operasional Kategori Jasa &amp; Kualitas</h2>
            <p className="text-xs text-slate-500">
              Evaluasi utilisasi subkategori, volume pengajuan baru, dan deteksi kategori jasa yang belum memiliki penawaran aktif.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Kategori Order Terbanyak</h3>
              <div className="space-y-2.5 text-xs">
                {analytics.categoryOrders.slice(0, 4).map((cat) => (
                  <div key={cat.categoryId} className="flex justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-bold text-slate-800">{cat.categoryName}</span>
                    <span className="font-bold text-[#0F4C81]">{cat.orderCount} pesanan</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Subkategori Terpopuler</h3>
              <div className="space-y-2.5 text-xs">
                {analytics.topSubcategories.slice(0, 4).map((sub) => (
                  <div key={sub.subcategoryId} className="flex justify-between p-2 rounded-lg bg-slate-50">
                    <span className="font-bold text-slate-800">{sub.subcategoryName}</span>
                    <span className="font-bold text-indigo-700">{sub.orderCount} pesanan</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Status Pengajuan Subkategori</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-amber-50 text-amber-900 font-bold">
                  <span>Menunggu Review / CEO</span>
                  <span>{requests.filter((r) => ["SUBMITTED", "UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO"].includes(r.status)).length}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-50 text-emerald-900 font-bold">
                  <span>Disetujui / Dipublikasikan</span>
                  <span>{requests.filter((r) => ["APPROVED", "PUBLISHED"].includes(r.status)).length}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-rose-50 text-rose-900 font-bold">
                  <span>Ditolak</span>
                  <span>{requests.filter((r) => ["REJECTED_BY_ADMIN", "REJECTED_BY_CEO"].includes(r.status)).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah Subkategori */}
      {isAddSubOpen && (
        <Modal
          isOpen={isAddSubOpen}
          onClose={() => setIsAddSubOpen(false)}
          title="Tambah Subkategori Operasional"
        >
          <form onSubmit={handleCreateSubcategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Kategori Induk</label>
              <select
                value={newSubCatId}
                onChange={(e) => setNewSubCatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Subkategori</label>
              <input
                type="text"
                required
                placeholder="Contoh: AC Cassette & VRV System"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Ruang Lingkup</label>
              <textarea
                rows={3}
                placeholder="Jelaskan spesialisasi pekerjaan dalam subkategori ini..."
                value={newSubDesc}
                onChange={(e) => setNewSubDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddSubOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Simpan Subkategori
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Edit Subkategori */}
      {editingSub && (
        <Modal
          isOpen={!!editingSub}
          onClose={() => setEditingSub(null)}
          title="Edit Subkategori"
        >
          <form onSubmit={handleUpdateSubcategory} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Subkategori</label>
              <input
                type="text"
                required
                value={editSubName}
                onChange={(e) => setEditSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={3}
                value={editSubDesc}
                onChange={(e) => setEditSubDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditingSub(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Mapping Ulang Kategori */}
      {mappingSub && (
        <Modal
          isOpen={!!mappingSub}
          onClose={() => setMappingSub(null)}
          title="Pindahkan Mapping Kategori Induk"
        >
          <form onSubmit={handleMapSubcategory} className="space-y-4 text-xs font-body">
            <p className="text-slate-600">
              Pindahkan subkategori <span className="font-bold text-slate-900">{mappingSub.name}</span> ke kategori induk yang baru:
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Kategori Tujuan</label>
              <select
                value={targetCatId}
                onChange={(e) => setTargetCatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setMappingSub(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Konfirmasi Pindah Mapping
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Review Pengajuan Subkategori */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={
            reviewAction === "FORWARD"
              ? "Teruskan Pengajuan Subkategori ke CEO"
              : reviewAction === "REJECT"
              ? "Tolak Pengajuan Subkategori"
              : reviewAction === "NOTIFY_PROVIDER"
              ? "Kirim Keterangan Status Persetujuan ke Mitra"
              : "Publikasikan Subkategori Baru"
          }
        >
          <form onSubmit={handleExecuteRequestReview} className="space-y-4 text-xs font-body">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900">
                {selectedReq.requestedSubcategoryName} ({selectedReq.categoryName})
              </p>
              <p className="text-[11px] text-slate-500">Diajukan oleh: {selectedReq.providerName || selectedReq.providerId}</p>
              <p className="text-slate-600 pt-1">{selectedReq.reason}</p>
              {selectedReq.ceoReviewNotes && (
                <div className="pt-2 mt-2 border-t border-slate-200 text-emerald-800 text-[11px]">
                  <span className="font-bold">Catatan Keputusan CEO: </span>
                  {selectedReq.ceoReviewNotes}
                </div>
              )}
            </div>

            {reviewAction === "NOTIFY_PROVIDER" && (
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Keputusan yang Diberikan ke Mitra
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNotifyDecision("APPROVED")}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                        notifyDecision === "APPROVED"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>Setujui (Di-ACC)</span>
                      {notifyDecision === "APPROVED" && <span className="text-emerald-600 text-xs">● Terpilih</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifyDecision("REJECTED")}
                      className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                        notifyDecision === "REJECTED"
                          ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>Tolak Pengajuan</span>
                      {notifyDecision === "REJECTED" && <span className="text-rose-600 text-xs">● Terpilih</span>}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {notifyDecision === "APPROVED" ? "Keterangan Persetujuan untuk Mitra" : "Alasan Penolakan untuk Mitra"}
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={
                      notifyDecision === "APPROVED"
                        ? "Contoh: Pengajuan subkategori Anda telah disetujui. Admin sedang mendaftarkan subkategori ke sistem..."
                        : "Contoh: Mohon maaf, pengajuan subkategori belum dapat diproses karena..."
                    }
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Keterangan ini akan langsung tampil di halaman Riwayat Mitra (Catatan CEO bersifat rahasia internal dan tidak akan dilihat mitra).
                  </p>
                </div>
              </div>
            )}

            {reviewAction !== "PUBLISH" && reviewAction !== "NOTIFY_PROVIDER" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {reviewAction === "FORWARD" ? "Catatan Rekomendasi untuk CEO" : "Alasan Penolakan"}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    reviewAction === "FORWARD"
                      ? "Jelaskan mengapa subkategori ini layak disahkan oleh CEO..."
                      : "Jelaskan alasan penolakan pengajuan kepada mitra..."
                  }
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            )}

            {reviewAction === "PUBLISH" && (
              <p className="text-slate-600">
                Pengajuan ini telah disetujui oleh CEO. Klik tombol di bawah untuk membuat subkategori aktif ke platform.
              </p>
            )}

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedReq(null)}>
                Batal
              </Button>
              <Button
                variant={reviewAction === "REJECT" || (reviewAction === "NOTIFY_PROVIDER" && notifyDecision === "REJECTED") ? "danger" : "primary"}
                size="sm"
                type="submit"
              >
                {reviewAction === "FORWARD"
                  ? "Kirim ke CEO"
                  : reviewAction === "REJECT"
                  ? "Konfirmasi Tolak"
                  : reviewAction === "NOTIFY_PROVIDER"
                  ? (notifyDecision === "APPROVED" ? "Kirim Persetujuan ke Mitra" : "Kirim Penolakan ke Mitra")
                  : "Publikasikan Sekarang"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
