"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wrench,
  MagnifyingGlass,
  CheckCircle,
  Clock,
  Eye,
  SlidersHorizontal,
  WarningCircle,
  Storefront,
  Buildings,
  Info,
  FolderSimple,
  Archive,
  ShieldCheck,
  ArrowClockwise,
  CaretRight,
  SquaresFour,
  ListDashes,
  Check,
  X,
  Images,
  Sparkle,
  MapPin,
  House,
  GearSix,
  TreeStructure,
  Car,
  Star,
  Copy,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import {
  serviceGovernanceApi,
  taxonomyApi,
  providerServiceApi,
  OFFICIAL_CITIES,
  getMockCatalogServices,
} from "@/lib/servioApi";

function getCategoryIcon(catId?: string, catName?: string) {
  const target = `${catId || ""} ${catName || ""}`.toLowerCase();
  if (target.includes("ac") || target.includes("pendingin") || target.includes("hvac")) return Wrench;
  if (target.includes("repair") || target.includes("teknik") || target.includes("perbaikan")) return Wrench;
  if (target.includes("home") || target.includes("building") || target.includes("bangunan") || target.includes("rumah")) return House;
  if (target.includes("clean") || target.includes("kebersihan")) return Sparkle;
  if (target.includes("maint") || target.includes("perawatan")) return GearSix;
  if (target.includes("env") || target.includes("lingkungan") || target.includes("taman")) return TreeStructure;
  if (target.includes("auto") || target.includes("otomotif") || target.includes("kendaraan")) return Car;
  return FolderSimple;
}

export default function AdminServiceOperationsPage() {
  // Exact 2 Tabs: "catalog" (Katalog Jasa) vs "audit" (Audit Forensik)
  const [activeTab, setActiveTab] = useState<"catalog" | "audit">("catalog");

  // Services Catalog State
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Detailed Service Modal / Inspection State
  const [inspectingService, setInspectingService] = useState<any | null>(null);
  const [selectedDetailPhoto, setSelectedDetailPhoto] = useState<string | null>(null);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Moderation Decision State (Persis Moderasi Produk)
  const [selectedServiceForStatus, setSelectedServiceForStatus] = useState<any | null>(null);
  const [moderationDecision, setModerationDecision] = useState<"ACTIVE" | "INACTIVE" | "ARCHIVED">("ACTIVE");
  const [moderationReason, setModerationReason] = useState<string>("");
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // Categories & Subcategories
  const [categories, setCategories] = useState<any[]>([]);

  // Common UI Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const getCityInfo = (code: string) => {
    return OFFICIAL_CITIES.find((c) => c.code === code) || { code, name: code, province: "Indonesia" };
  };

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch Services Data
  const fetchServices = useCallback(async () => {
    try {
      setLoadingServices(true);
      const [svcRes, catRes] = await Promise.allSettled([
        serviceGovernanceApi.listOfferings(),
        taxonomyApi.getCategories({ master: "JASA", status: "ACTIVE" }),
      ]);

      if (svcRes.status === "fulfilled" && svcRes.value?.data) {
        const raw = Array.isArray(svcRes.value.data?.items)
          ? svcRes.value.data.items
          : Array.isArray(svcRes.value.data)
          ? svcRes.value.data
          : [];
        setServices(raw.length > 0 ? raw : getMockCatalogServices());
      } else {
        setServices(getMockCatalogServices());
      }

      if (catRes.status === "fulfilled" && Array.isArray(catRes.value?.data) && catRes.value.data.length > 0) {
        setCategories(catRes.value.data);
      } else {
        setCategories([
          { id: "cat-ac", name: "Perbaikan & Servis AC", code: "AC" },
          { id: "cat-elec", name: "Elektronik & Perawatan", code: "ELEC" },
          { id: "cat-build", name: "Pertukangan & Bangunan", code: "BUILD" },
          { id: "cat-clean", name: "Kebersihan & Sanitasi", code: "CLEAN" },
        ]);
      }
    } catch (err: unknown) {
      console.warn("Could not load services for governance:", err);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await serviceGovernanceApi.audit();
      if (res && res.data) {
        setAuditLogs(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err: unknown) {
      console.warn("Could not load service audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchAuditLogs();
  }, [fetchServices, fetchAuditLogs]);

  // Distinct providers list for filter dropdown
  const distinctProviders = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach((s) => {
      const id = s.providerId || s.provider_organization_id || "usr-prov-001";
      const name = s.providerName || s.provider_name || "PT Servio Mandiri Teknik";
      if (id && !map.has(id)) {
        map.set(id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [services]);

  // Distinct category tabs with service counts
  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    services.forEach((s) => {
      const key = s.categoryName || s.categoryId || "Lainnya";
      counts[key] = (counts[key] || 0) + 1;
    });

    const tabs: Array<{ key: string; label: string; count: number }> = [
      { key: "ALL", label: "Semua Kategori", count: services.length },
    ];

    Object.keys(counts).forEach((catKey) => {
      tabs.push({
        key: catKey,
        label: catKey,
        count: counts[catKey],
      });
    });

    return tabs;
  }, [services]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (s.status !== statusFilter) return false;
      }
      // Category filter
      if (selectedCategoryTab !== "ALL") {
        const cat = s.categoryName || s.categoryId;
        if (cat !== selectedCategoryTab) return false;
      }
      // Provider filter
      if (providerFilter !== "ALL") {
        const prov = s.providerId || s.provider_organization_id;
        if (prov !== providerFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (s.name || s.display_name || s.title || "").toLowerCase().includes(q);
        const descMatch = (s.description || "").toLowerCase().includes(q);
        const provMatch = (s.providerName || s.provider_name || "").toLowerCase().includes(q);
        const catMatch = (s.categoryName || "").toLowerCase().includes(q);
        const subMatch = (s.subcategoryName || "").toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !provMatch && !catMatch && !subMatch) {
          return false;
        }
      }
      return true;
    });
  }, [services, statusFilter, selectedCategoryTab, providerFilter, searchQuery]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchQuery.trim()) return auditLogs;
    const q = auditSearchQuery.toLowerCase();
    return auditLogs.filter(
      (log) =>
        (log.action || "").toLowerCase().includes(q) ||
        (log.service_id || "").toLowerCase().includes(q) ||
        (log.service_name || "").toLowerCase().includes(q) ||
        (log.actor_id || "").toLowerCase().includes(q) ||
        (log.actor_role || "").toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearchQuery]);

  // KPI Metrics Calculation (Point 2: Total, Aktif, Archive, Nonaktif, Mitra Jasa Terdaftar)
  const kpiMetrics = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.status === "ACTIVE").length;
    const draft = services.filter((s) => s.status === "DRAFT").length;
    const inactive = services.filter((s) => s.status === "INACTIVE").length;
    const archived = services.filter((s) => s.status === "ARCHIVED").length;
    const providerCount = distinctProviders.length || (total > 0 ? 1 : 0);

    return { total, active, draft, inactive, archived, providerCount };
  }, [services, distinctProviders]);

  // Handle Moderation Decision (Persis Moderasi Produk: ACTIVE / INACTIVE / ARCHIVED)
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceForStatus) return;

    try {
      setSubmittingDecision(true);
      const srvId = selectedServiceForStatus.id || selectedServiceForStatus._id;
      const lockVersion = selectedServiceForStatus.lockVersion || selectedServiceForStatus.lock_version || 1;

      // Update status via service governance API
      await serviceGovernanceApi.changeStatus(srvId, moderationDecision, moderationReason || undefined);

      // Create new audit record locally
      const newAuditRecord = {
        id: "srv-aud-" + Date.now(),
        action: `SERVICE_STATUS_CHANGED_TO_${moderationDecision}`,
        entity_type: "SERVICE_OFFERING",
        entity_id: srvId,
        actor_id: "usr-admin-ops",
        actor_role: "ADMIN_OPERATIONS",
        service_id: srvId,
        service_name: selectedServiceForStatus.name || selectedServiceForStatus.display_name,
        occurred_at: new Date().toISOString(),
        after_safe: {
          status: moderationDecision,
          lock_version: lockVersion + 1,
          reason: moderationReason || "Pembaruan tata kelola status operasional oleh Admin",
        },
      };

      setAuditLogs((prev) => [newAuditRecord, ...prev]);

      // Update local services state
      setServices((prev) =>
        prev.map((s) => {
          if (s.id === srvId || s._id === srvId) {
            return {
              ...s,
              status: moderationDecision,
              lockVersion: lockVersion + 1,
              lock_version: lockVersion + 1,
            };
          }
          return s;
        })
      );

      const statusLabel =
        moderationDecision === "ACTIVE"
          ? "Aktif (Tayang)"
          : moderationDecision === "INACTIVE"
          ? "Nonaktif"
          : "Diarsipkan";

      setToastMessage(`Status katalog layanan "${selectedServiceForStatus.name || selectedServiceForStatus.display_name}" berhasil diubah menjadi ${statusLabel}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setSelectedServiceForStatus(null);
      setModerationReason("");
    } catch (err: unknown) {
      const e = err as Error;
      setFormError(e.message || "Gagal memperbarui status katalog layanan");
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-body">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={20} weight="fill" />
          </div>
          <div>
            <div className="text-xs font-bold">Pemberitahuan Tata Kelola</div>
            <div className="text-[11px] text-slate-300 font-medium">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* Modern Page Header (Persis Tata Letak Moderasi Produk) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-sky-50/60 rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F4C81] to-[#1E6FA8] text-white flex items-center justify-center shadow-md shadow-[#0F4C81]/15 shrink-0">
              <Wrench size={30} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100/70 text-[#0F4C81] border border-blue-200">
                  Operasional Platform &amp; Tata Kelola Jasa
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Katalog Jasa Live Terkoneksi</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 font-heading">
                Pusat Tata Kelola &amp; Pengawasan Katalog Jasa
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Supervisi komprehensif penawaran layanan service mitra terdaftar. Seluruh data formulir tersimpan secara forensik, transparan, dan terklasifikasi rapi per kategori master platform.
              </p>
            </div>
          </div>

          {/* EXACT 2 TABS: KATALOG JASA vs AUDIT (Sesuai Permintaan User) */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-white text-[#0F4C81] shadow-xs font-extrabold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Wrench size={16} weight={activeTab === "catalog" ? "fill" : "regular"} />
              <span>Katalog Jasa</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "catalog" ? "bg-blue-100 text-[#0F4C81] font-bold" : "bg-slate-200 text-slate-600"
              }`}>
                {services.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "audit"
                  ? "bg-white text-[#0F4C81] shadow-xs font-extrabold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <ShieldCheck size={16} weight={activeTab === "audit" ? "fill" : "regular"} className="text-indigo-600" />
              <span>Audit Forensik</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeTab === "audit" ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-slate-200 text-slate-600"
              }`}>
                {auditLogs.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KATALOG JASA (STATS, FILTERS, TABLE, MODALS)                        */}
      {/* ========================================================================= */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Executive KPI Summary Cards (Point 2: Total, Aktif, Archive, Nonaktif, Mitra Jasa) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Total Listing Jasa */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Layanan</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0F4C81] flex items-center justify-center font-bold">
                  <Wrench size={17} weight="duotone" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-heading">{kpiMetrics.total}</span>
                <span className="text-xs text-slate-500 font-medium">Layanan</span>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Katalog jasa terdaftar
              </div>
            </div>

            {/* Aktif Tayang Publik */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs hover:border-emerald-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Aktif Tayang</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle size={17} weight="fill" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-800 font-heading">{kpiMetrics.active}</span>
                <span className="text-xs text-emerald-600 font-medium">Siap Dipesan</span>
              </div>
              <div className="mt-1.5 text-[10px] text-emerald-600/90 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Tampil di katalog konsumen
              </div>
            </div>

            {/* Nonaktif */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Nonaktif</span>
                <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                  <Clock size={17} weight="duotone" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-800 font-heading">{kpiMetrics.inactive}</span>
                <span className="text-xs text-slate-500 font-medium">Layanan</span>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Ditangguhkan sementara
              </div>
            </div>

            {/* Archive (Diarsipkan) */}
            <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs hover:border-purple-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Arsip (Archive)</span>
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Archive size={17} weight="duotone" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-purple-800 font-heading">{kpiMetrics.archived}</span>
                <span className="text-xs text-purple-600 font-medium">Diarsipkan</span>
              </div>
              <div className="mt-1.5 text-[10px] text-purple-600 font-medium">
                Riwayat layanan non-aktif
              </div>
            </div>

            {/* Mitra Jasa Terdaftar */}
            <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-xs hover:border-sky-300 transition group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81]">Mitra Terdaftar</span>
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold">
                  <Buildings size={17} weight="duotone" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#0F4C81] font-heading">{kpiMetrics.providerCount}</span>
                <span className="text-xs text-sky-700 font-medium">Penyedia</span>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-400">
                Bengkel &amp; teknisi terverifikasi
              </div>
            </div>
          </div>

          {/* Category Tabs & Filter Bar (Persis Moderasi Produk) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            {/* Category Pills Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
              {categoryTabs.map((cat) => {
                const isSelected = selectedCategoryTab === cat.key;
                const CatIcon = getCategoryIcon(cat.key, cat.label);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategoryTab(cat.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                      isSelected
                        ? "bg-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                    }`}
                  >
                    <CatIcon size={14} weight={isSelected ? "bold" : "regular"} />
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 w-full md:w-auto flex-1 max-w-xl">
                {/* Search Input */}
                <div className="relative flex-1">
                  <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari layanan, deskripsi, kategori, nama mitra provider..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif (Tayang)</option>
                  <option value="DRAFT">Draf (Review)</option>
                  <option value="INACTIVE">Nonaktif</option>
                  <option value="ARCHIVED">Diarsipkan</option>
                </select>

                {/* Provider Filter */}
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 max-w-[180px] truncate"
                >
                  <option value="ALL">Semua Mitra Jasa</option>
                  {distinctProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right View Mode & Refresh Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === "table" ? "bg-white text-[#0F4C81] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Tampilan Tabel Detail"
                  >
                    <ListDashes size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      viewMode === "grid" ? "bg-white text-[#0F4C81] shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                    }`}
                    title="Tampilan Kartu Visual"
                  >
                    <SquaresFour size={16} weight="bold" />
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => {
                    fetchServices();
                    fetchAuditLogs();
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                  title="Muat Ulang Data"
                >
                  <ArrowClockwise size={16} className={loadingServices ? "animate-spin text-[#0F4C81]" : ""} />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABEL KATALOG JASA (MEMUNCULKAN SEMUA DATA FORM TAMBAH LAYANAN)           */}
          {/* ========================================================================= */}
          {viewMode === "table" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              {loadingServices ? (
                <div className="p-16 text-center space-y-3">
                  <ArrowClockwise size={32} className="animate-spin mx-auto text-[#0F4C81]" />
                  <p className="text-xs font-semibold text-slate-700">Sinkronisasi data katalog jasa dari database...</p>
                  <p className="text-[11px] text-slate-400">Menghubungkan Service Offering, Provider Identity, &amp; Taxonomy Service...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Wrench size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Tidak ada layanan yang cocok dengan filter</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Coba atur ulang filter status, pilih kategori "Semua Kategori", atau hapus kata kunci pencarian.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedCategoryTab("ALL");
                      setStatusFilter("ALL");
                      setProviderFilter("ALL");
                      setSearchQuery("");
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
                        <th className="p-4 pl-6">Foto &amp; Informasi Layanan</th>
                        <th className="p-4">Kategori &amp; Subkategori</th>
                        <th className="p-4">Mitra Jasa (Provider)</th>
                        <th className="p-4">Rentang Biaya (Tarif Resmi)</th>
                        <th className="p-4">Biaya Survei</th>
                        <th className="p-4">Durasi Pengerjaan</th>
                        <th className="p-4">Cakupan Wilayah Kota</th>
                        <th className="p-4">Garansi Servis</th>
                        <th className="p-4">Status Listing</th>
                        <th className="p-4 pr-6 text-right">Aksi Tata Kelola</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredServices.map((s) => {
                        const srvId = s.id || s._id;
                        const srvName = s.name || s.display_name || s.title || "Layanan Jasa";
                        const providerName = s.providerName || s.provider_name || "PT Servio Mandiri Teknik";
                        const providerId = s.providerId || s.provider_organization_id || "usr-prov-001";
                        const CatIcon = getCategoryIcon(s.categoryId, s.categoryName);

                        const allMedia = Array.isArray(s.media) && s.media.length > 0
                          ? s.media
                          : s.thumbnailUrl
                          ? [{ id: "thumb", url: s.thumbnailUrl, is_primary: true }]
                          : [];
                        const primaryImg = allMedia.find((m: any) => m.is_primary)?.url || allMedia[0]?.url || s.thumbnailUrl || "";

                        const cities = Array.isArray(s.coverageCityCodes) && s.coverageCityCodes.length > 0
                          ? s.coverageCityCodes
                          : Array.isArray(s.coverage_city_codes) && s.coverage_city_codes.length > 0
                          ? s.coverage_city_codes
                          : ["JKT-BARAT", "JKT-SEL", "TNG-KOTA"];

                        const priceMin = Number(s.priceMin ?? s.pricing?.min_price_idr ?? 0);
                        const priceMax = Number(s.priceMax ?? s.pricing?.max_price_idr ?? 0);
                        const surveyFee = Number(s.surveyFee ?? s.survey?.fee_idr ?? 0);
                        const durationMin = s.durationMin ?? s.duration?.min ?? 1;
                        const durationMax = s.durationMax ?? s.duration?.max ?? 2;
                        const durationUnit = s.durationUnit ?? s.duration?.unit ?? "HOUR";

                        const hasWarranty = s.warrantyConfig?.warrantyEnabled !== undefined
                          ? Boolean(s.warrantyConfig.warrantyEnabled)
                          : true;
                        const warrantyDays = s.warrantyConfig?.durationDays || s.warrantyDays || 30;

                        return (
                          <tr key={srvId} className="hover:bg-blue-50/30 transition-colors group">
                            {/* 1. Foto & Informasi Layanan */}
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-3.5">
                                {/* Thumbnail */}
                                <div className="relative w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 shadow-2xs group-hover:border-[#0F4C81]/30 transition">
                                  {primaryImg ? (
                                    <img
                                      src={primaryImg}
                                      alt={srvName}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                                      <Wrench size={22} weight="duotone" />
                                    </div>
                                  )}
                                  {allMedia.length > 0 && (
                                    <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-slate-900/85 text-white text-[9px] font-bold flex items-center gap-0.5 backdrop-blur-xs">
                                      <Images size={10} />
                                      {allMedia.length}
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 max-w-[240px] space-y-1">
                                  <div className="font-bold text-slate-900 group-hover:text-[#0F4C81] transition truncate" title={srvName}>
                                    {srvName}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.2 rounded bg-sky-50 text-[#0F4C81] text-[10px] font-semibold border border-sky-200 truncate max-w-[140px]">
                                      {s.canonicalName || s.subcategoryName || "Jasa Resmi"}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[75px]" title={srvId}>
                                      ID: {srvId.slice(0, 8)}...
                                    </span>
                                  </div>
                                  {s.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1" title={s.description}>
                                      {s.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 2. Kategori & Subkategori */}
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#0F4C81] font-bold text-[11px] border border-blue-100">
                                  <CatIcon size={12} weight="fill" />
                                  <span>{s.categoryName || "Kategori Jasa"}</span>
                                </div>
                                {s.subcategoryName && (
                                  <div className="text-[10px] text-slate-500 font-medium pl-1 flex items-center gap-1">
                                    <CaretRight size={10} className="text-slate-400" />
                                    <span>{s.subcategoryName}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 3. Mitra Jasa (Provider) */}
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-sky-100/70 text-[#0F4C81] flex items-center justify-center shrink-0">
                                  <Buildings size={16} weight="duotone" />
                                </div>
                                <div className="min-w-0 max-w-[160px]">
                                  <div className="font-bold text-slate-900 text-xs truncate" title={providerName}>
                                    {providerName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    Org: {providerId.slice(-6).toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 4. Konfigurasi Biaya (Tarif Resmi) */}
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {s.priceModel || "RANGE"}
                                </span>
                                <div className="font-bold text-[#0F4C81] text-xs whitespace-nowrap">
                                  Rp {priceMin.toLocaleString("id-ID")} – Rp {priceMax.toLocaleString("id-ID")}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">Tarif Resmi Konsumen</p>
                              </div>
                            </td>

                            {/* 5. Biaya Survei */}
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                                  surveyFee > 0
                                    ? "bg-sky-50 text-[#0F4C81] border-sky-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}>
                                  {surveyFee > 0 ? "Berbayar" : "Gratis"}
                                </span>
                                <p className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                  {surveyFee > 0 ? `Rp ${surveyFee.toLocaleString("id-ID")}` : "Gratis Survei"}
                                </p>
                              </div>
                            </td>

                            {/* 6. Durasi Pengerjaan */}
                            <td className="p-4">
                              <div className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                {durationMin} - {durationMax}{" "}
                                {durationUnit === "HOUR" ? "Jam" : durationUnit === "DAY" ? "Hari" : "Menit"}
                              </div>
                              <span className="text-[10px] text-slate-400">Estimasi kerja</span>
                            </td>

                            {/* 7. Cakupan Wilayah Kota */}
                            <td className="p-4">
                              <div className="space-y-1 max-w-[130px]">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                                  <MapPin size={11} weight="bold" />
                                  <span>{cities.length} Kota</span>
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {cities.slice(0, 2).map((code: string) => (
                                    <span key={code} className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                                      {getCityInfo(code).name.replace("Kota ", "")}
                                    </span>
                                  ))}
                                  {cities.length > 2 && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                      +{cities.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 8. Garansi Servis */}
                            <td className="p-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                  <ShieldCheck size={14} weight="fill" className="shrink-0" />
                                  <span>{hasWarranty ? `${warrantyDays} Hari` : "Non-Garansi"}</span>
                                </div>
                                <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  ⚠️ Belum di DB
                                </span>
                              </div>
                            </td>

                            {/* 9. Status Listing */}
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                                  s.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : s.status === "DRAFT"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : s.status === "INACTIVE"
                                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                                    : "bg-purple-50 text-purple-700 border border-purple-200"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    s.status === "ACTIVE"
                                      ? "bg-emerald-500 animate-pulse"
                                      : s.status === "DRAFT"
                                      ? "bg-amber-500"
                                      : s.status === "INACTIVE"
                                      ? "bg-slate-400"
                                      : "bg-purple-500"
                                  }`}
                                />
                                {s.status === "ACTIVE"
                                  ? "AKTIF TAYANG"
                                  : s.status === "DRAFT"
                                  ? "DRAFT (REVIEW)"
                                  : s.status === "INACTIVE"
                                  ? "NONAKTIF"
                                  : "DIARSIPKAN"}
                              </span>
                            </td>

                            {/* 10. Aksi Tata Kelola (Persis Moderasi Produk: Detail & Status) */}
                            <td className="p-4 pr-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setInspectingService(s)}
                                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#0F4C81] hover:bg-sky-100 font-bold text-xs transition flex items-center gap-1.5 border border-sky-100 cursor-pointer shadow-2xs"
                                  title="Lihat seluruh data tersimpan formulir tambah layanan"
                                >
                                  <Eye size={14} weight="bold" />
                                  <span>Detail</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedServiceForStatus(s);
                                    setModerationDecision(s.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                                    setFormError(null);
                                    setModerationReason("");
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:text-[#0F4C81] hover:bg-slate-50 font-bold text-xs transition flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
                                  title="Kelola status publikasi layanan"
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

          {/* ========================================================================= */}
          {/* GRID CARD VIEW (PERSIS MODERASI PRODUK)                                   */}
          {/* ========================================================================= */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((s) => {
                const srvId = s.id || s._id;
                const srvName = s.name || s.display_name || s.title || "Layanan Jasa";
                const providerName = s.providerName || s.provider_name || "PT Servio Mandiri Teknik";
                const CatIcon = getCategoryIcon(s.categoryId, s.categoryName);

                const allMedia = Array.isArray(s.media) && s.media.length > 0
                  ? s.media
                  : s.thumbnailUrl
                  ? [{ id: "thumb", url: s.thumbnailUrl, is_primary: true }]
                  : [];
                const primaryImg = allMedia.find((m: any) => m.is_primary)?.url || allMedia[0]?.url || s.thumbnailUrl || "";

                const priceMin = Number(s.priceMin ?? s.pricing?.min_price_idr ?? 0);
                const priceMax = Number(s.priceMax ?? s.pricing?.max_price_idr ?? 0);
                const surveyFee = Number(s.surveyFee ?? s.survey?.fee_idr ?? 0);

                return (
                  <div
                    key={srvId}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Top strip with provider & status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                          <Buildings size={15} className="text-[#0F4C81] shrink-0" weight="duotone" />
                          <span className="truncate">{providerName}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : s.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : s.status === "INACTIVE"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-500 animate-pulse"
                                : s.status === "DRAFT"
                                ? "bg-amber-500"
                                : s.status === "INACTIVE"
                                ? "bg-slate-400"
                                : "bg-purple-500"
                            }`}
                          />
                          {s.status === "ACTIVE" ? "AKTIF" : s.status === "DRAFT" ? "DRAF" : s.status === "INACTIVE" ? "NONAKTIF" : "ARSIP"}
                        </span>
                      </div>

                      {/* Hero Image */}
                      <div className="relative aspect-video rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shadow-2xs">
                        {primaryImg ? (
                          <img
                            src={primaryImg}
                            alt={srvName}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Wrench size={32} weight="duotone" />
                          </div>
                        )}
                        {allMedia.length > 0 && (
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                            <Images size={12} />
                            <span>{allMedia.length} Foto</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Category */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-[#0F4C81] text-[10px] font-bold border border-blue-100">
                            <CatIcon size={11} weight="fill" />
                            <span>{s.categoryName || "Kategori"}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {s.subcategoryName}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0F4C81] transition line-clamp-1">
                          {srvName}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {s.description || "Tidak ada deskripsi layanan."}
                        </p>
                      </div>

                      {/* Price & Survey */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Tarif Layanan</span>
                          <span className="font-black text-[#0F4C81] text-xs">
                            Rp {priceMin.toLocaleString("id-ID")} – {priceMax.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Biaya Survei</span>
                          <span className="font-bold text-slate-800">
                            {surveyFee > 0 ? `Rp ${surveyFee.toLocaleString("id-ID")}` : "Gratis"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-1.5"
                        onClick={() => setInspectingService(s)}
                      >
                        <Eye size={14} weight="bold" />
                        <span>Detail Lengkap</span>
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex items-center justify-center gap-1.5 bg-[#0F4C81] hover:bg-[#0c3c66]"
                        onClick={() => {
                          setSelectedServiceForStatus(s);
                          setModerationDecision(s.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                          setFormError(null);
                          setModerationReason("");
                        }}
                      >
                        <SlidersHorizontal size={14} weight="bold" />
                        <span>Status</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUDIT FORENSIK TATA KELOLA JASA (PERSIS MODERASI PRODUK)           */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 text-xs flex items-start gap-3 shadow-xs">
            <ShieldCheck size={22} className="text-indigo-600 shrink-0 mt-0.5" weight="fill" />
            <div className="space-y-1">
              <strong className="font-bold text-indigo-950 text-sm block">
                Audit Trail Forensik Tata Kelola Layanan Jasa Platform
              </strong>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                Log rekaman forensik seluruh mutasi penawaran layanan jasa, persetujuan status publikasi, perubahan cakupan kota, dan tindakan arsip oleh Penyedia Jasa, Admin Operations, dan Sistem. Berkas audit bersifat <em>immutable</em> dan mematuhi tata kelola platform.
              </p>
            </div>
          </div>

          {/* Audit Search Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="Cari aksi, nama layanan, actor ID, atau service ID..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowClockwise size={15} className={loadingAudit ? "animate-spin text-[#0F4C81]" : ""} />
              <span>Segarkan Audit</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingAudit ? (
              <div className="p-12 text-center text-xs text-slate-500">Memuat berkas audit layanan jasa...</div>
            ) : filteredAuditLogs.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <ShieldCheck size={40} className="mx-auto text-slate-300" weight="duotone" />
                <p className="text-xs font-bold text-slate-700">Belum ada catatan audit mutasi layanan jasa</p>
                <p className="text-[11px] text-slate-400">Setiap perubahan status dan aksi tata kelola akan otomatis tercatat di sini.</p>
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
                      <th className="p-4">Service ID</th>
                      <th className="p-4 pr-6">State Snapshot Forensik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 pl-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.occurred_at || log.created_at
                            ? new Date(log.occurred_at || log.created_at).toLocaleString("id-ID")
                            : "-"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              log.action?.includes("STATUS") || log.action?.includes("ACTIVAT")
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
                          <span className="font-semibold text-slate-800">{log.entity_type || "SERVICE_OFFERING"}</span>
                          <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                            {log.entity_id || log.service_id}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-700 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
                            {log.actor_role || "ADMIN_OPERATIONS"}
                          </span>
                          <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                            {log.actor_id || "admin-ops"}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-600 truncate max-w-[120px]">
                          {log.service_id}
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

      {/* ========================================================================= */}
      {/* FULL SERVICE DETAIL INSPECTION MODAL (All Form Data in 2 Columns)          */}
      {/* ========================================================================= */}
      {inspectingService && (() => {
        const s = inspectingService;
        const srvId = s.id || s._id;
        const srvName = s.name || s.display_name || s.title || "Layanan Jasa";
        const providerName = s.providerName || s.provider_name || "PT Servio Mandiri Teknik";
        const CatIcon = getCategoryIcon(s.categoryId, s.categoryName);

        const allMedia = Array.isArray(s.media) && s.media.length > 0
          ? s.media
          : s.thumbnailUrl
          ? [{ id: "thumb", url: s.thumbnailUrl, is_primary: true }]
          : [];

        const cities = Array.isArray(s.coverageCityCodes) && s.coverageCityCodes.length > 0
          ? s.coverageCityCodes
          : Array.isArray(s.coverage_city_codes) && s.coverage_city_codes.length > 0
          ? s.coverage_city_codes
          : ["JKT-BARAT", "JKT-SEL", "TNG-KOTA"];

        const priceMin = Number(s.priceMin ?? s.pricing?.min_price_idr ?? 0);
        const priceMax = Number(s.priceMax ?? s.pricing?.max_price_idr ?? 0);
        const surveyFee = Number(s.surveyFee ?? s.survey?.fee_idr ?? 0);
        const durationMin = s.durationMin ?? s.duration?.min ?? 1;
        const durationMax = s.durationMax ?? s.duration?.max ?? 2;
        const durationUnit = s.durationUnit ?? s.duration?.unit ?? "HOUR";

        const hasWarranty = s.warrantyConfig?.warrantyEnabled !== undefined
          ? Boolean(s.warrantyConfig.warrantyEnabled)
          : true;
        const warrantyDays = s.warrantyConfig?.durationDays || s.warrantyDays || 30;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50 rounded-t-3xl">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0F4C81]">
                      Detail Formulir Penawaran Layanan Jasa
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      s.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s.status === "DRAFT"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : s.status === "INACTIVE"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}>
                      {s.status === "ACTIVE" ? "Aktif (Tayang)" : s.status === "DRAFT" ? "Draft" : s.status === "INACTIVE" ? "Nonaktif" : "Diarsipkan"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {srvId}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1 font-heading">{srvName}</h2>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Buildings size={14} className="text-[#0F4C81]" />
                    <span>Mitra Penyedia: <strong>{providerName}</strong></span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingService(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Modal Body: 2 Columns Matching Form Tambah Layanan */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs font-body">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* ========================================================================= */}
                  {/* KOLOM KIRI: DATA UTAMA & FOTO PORTOFOLIO                                  */}
                  {/* ========================================================================= */}
                  <div className="space-y-4">
                    {/* 1. Data Utama Layanan */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            1. Data Utama Layanan
                          </h4>
                        </div>
                        
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Kategori &amp; Subkategori
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] font-bold text-[11px] border border-sky-100">
                              <CatIcon size={13} weight="bold" />
                              <span>{s.categoryName || "Kategori Layanan"}</span>
                            </span>
                            <span className="text-slate-400">&rsaquo;</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {s.subcategoryName || "Subkategori"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Nama Layanan / Service
                          </span>
                          <p className="font-extrabold text-slate-900 text-sm">
                            {srvName}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Deskripsi Lengkap Layanan
                          </span>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                            {s.description || "Tidak ada deskripsi layanan."}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Foto Portofolio Layanan */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Images size={16} weight="bold" className="text-[#0F4C81]" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            2. Foto Portofolio Layanan
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                          {allMedia.length} Foto Tersimpan
                        </span>
                      </div>

                      {allMedia.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {allMedia.map((m: any, idx: number) => {
                            const isPrimary = m.is_primary || idx === 0;
                            return (
                              <div
                                key={m.id || idx}
                                onClick={() => setPreviewLightboxUrl(m.url)}
                                className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs cursor-pointer"
                              >
                                <img
                                  src={m.url}
                                  alt={`Foto layanan ${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                {isPrimary && (
                                  <div className="absolute top-1.5 left-1.5 bg-[#0F4C81] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    <Star size={10} weight="fill" className="text-amber-300" />
                                    <span>Utama</span>
                                  </div>
                                )}
                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono px-1 rounded">
                                  #{idx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <Images size={28} className="mx-auto text-slate-300 mb-1" />
                          <p className="text-slate-500 font-medium text-[11px]">
                            Belum ada foto portofolio yang diunggah untuk layanan ini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* KOLOM KANAN: BIAYA & DURASI, CAKUPAN KOTA, PENGATURAN GARANSI            */}
                  {/* ========================================================================= */}
                  <div className="space-y-4">
                    {/* 3. Konfigurasi Biaya & Durasi */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            3. Konfigurasi Biaya &amp; Durasi
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                          Tarif Resmi
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Harga Minimum
                          </span>
                          <p className="font-extrabold text-slate-900 text-sm">
                            Rp {priceMin.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Harga Maksimum
                          </span>
                          <p className="font-extrabold text-slate-900 text-sm">
                            Rp {priceMax.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Biaya Survei Lokasi
                          </span>
                          <p className="font-bold text-slate-800 text-xs">
                            {surveyFee > 0 ? `Rp ${surveyFee.toLocaleString("id-ID")}` : "Gratis Survei"}
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Estimasi Durasi Kerja
                          </span>
                          <p className="font-bold text-slate-800 text-xs">
                            {durationMin} - {durationMax}{" "}
                            {durationUnit === "HOUR" ? "Jam" : durationUnit === "DAY" ? "Hari" : "Menit"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Cakupan Wilayah Kota Administratif */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            4. Cakupan Wilayah Kota Administratif
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                          {cities.length} Kota Terdaftar
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                        {cities.map((code: string) => {
                          const cityInfo = getCityInfo(code);
                          return (
                            <span
                              key={code}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#0F4C81] text-white shadow-2xs flex items-center gap-1"
                            >
                              <Check size={11} weight="bold" />
                              <span>{cityInfo.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. Garansi Layanan */}
                    <div className="p-4 rounded-2xl bg-white border-2 border-amber-400/40 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-amber-100">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={17} weight="bold" className="text-amber-600" />
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                            5. Pengaturan Garansi Layanan
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                          <WarningCircle size={12} weight="bold" className="text-amber-600" />
                          <span>Belum Disimpan ke Database</span>
                        </span>
                      </div>

                      {/* Keterangan Status Database */}
                      <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                          <Info size={14} weight="fill" className="text-amber-600 shrink-0" />
                          <span>Keterangan Status Database:</span>
                        </div>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Bagian garansi ini saat ini <strong className="font-extrabold underline decoration-amber-500">belum dimasukkan / belum disimpan ke dalam database</strong> (Modul 04 Service Offering). Nilai garansi berstatus simulasi lokal.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                            Status Garansi Servis
                          </span>
                          <p className="font-bold text-slate-800 text-xs">
                            {hasWarranty ? "Didukung Mitra" : "Tidak Tersedia"}
                          </p>
                        </div>
                        <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                            Durasi Jaminan Garansi
                          </span>
                          <p className="font-bold text-slate-800 text-xs">
                            {hasWarranty ? `${warrantyDays} Hari Kalender` : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls (Persis Moderasi Produk) */}
              <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
                <div className="text-[11px] text-slate-400">
                  ID Layanan: <code className="font-mono font-bold text-slate-600">{srvId}</code>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setInspectingService(null)}
                  >
                    Tutup Tampilan
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const cur = inspectingService;
                      setInspectingService(null);
                      setSelectedServiceForStatus(cur);
                      setModerationDecision(cur.status === "ACTIVE" ? "ACTIVE" : "ACTIVE");
                      setFormError(null);
                      setModerationReason("");
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
        );
      })()}

      {/* ========================================================================= */}
      {/* MODERATION STATUS CHANGE MODAL (PERSIS SEPERTI MODERASI PRODUK)            */}
      {/* ========================================================================= */}
      {selectedServiceForStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 font-body">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0F4C81]">
                  Tata Kelola Publikasi Jasa
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {(selectedServiceForStatus.id || selectedServiceForStatus._id || "").slice(0, 8)}...
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-1 font-heading">
                Kelola Status Listing Katalog Layanan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {selectedServiceForStatus.name || selectedServiceForStatus.display_name}
              </p>

              <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mitra Provider</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                    <Buildings size={14} className="text-[#0F4C81]" weight="duotone" />
                    <span className="truncate">{selectedServiceForStatus.providerName || selectedServiceForStatus.provider_name || "PT Servio Mandiri Teknik"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Kategori</span>
                  <div className="font-bold text-slate-800 mt-0.5 truncate">
                    {selectedServiceForStatus.categoryName || "Kategori Layanan"}
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
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer ${
                      moderationDecision === "ACTIVE"
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
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer ${
                      moderationDecision === "INACTIVE"
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
                    className={`p-3.5 rounded-2xl border text-center transition-all text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer ${
                      moderationDecision === "ARCHIVED"
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
                  placeholder="Misal: Sesuai hasil verifikasi sertifikasi teknisi mitra..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedServiceForStatus(null)}
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

      {/* Lightbox Modal for Full Resolution Photo View */}
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
