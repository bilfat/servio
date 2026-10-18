"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Folder,
  TreeStructure,
  ChartLineUp,
  MagnifyingGlass,
  ShieldCheck,
  Info,
  Clock,
  Eye,
  LockKey,
  PaperPlaneTilt,
  ClipboardText,
  CaretDown,
  CaretRight,
  CheckCircle,
  XCircle,
  Sparkle,
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightning,
  Package,
  Tag,
  ArrowsClockwise,
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

type CeoMainTab = "JASA" | "PRODUK" | "REQUESTS" | "BRANDS" | "AUDIT";
type CeoSubTab = "CATEGORY" | "SUBCATEGORY";

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Wrench,
  HouseLine,
  Broom,
  GearSix,
  TreeEvergreen,
  Car,
  Lightning,
  ShieldCheck,
  Sparkle,
  Folder,
  Package,
};

function resolveCategoryIcon(cat: { icon_name?: string | null; name: string }) {
  if (cat.icon_name && CATEGORY_ICON_MAP[cat.icon_name]) {
    return CATEGORY_ICON_MAP[cat.icon_name];
  }
  const n = cat.name.toLowerCase();
  if (n.includes("repair") || n.includes("teknik") || n.includes("perbaikan")) return Wrench;
  if (n.includes("home") || n.includes("building") || n.includes("bangunan") || n.includes("rumah")) return HouseLine;
  if (n.includes("clean") || n.includes("kebersihan")) return Broom;
  if (n.includes("maint") || n.includes("perawatan") || n.includes("mesin")) return GearSix;
  if (n.includes("env") || n.includes("lingkungan") || n.includes("taman")) return TreeEvergreen;
  if (n.includes("auto") || n.includes("otomotif") || n.includes("kendaraan")) return Car;
  return Folder;
}

export default function CeoTaxonomyGovernancePage() {
  const [mainTab, setMainTab] = useState<CeoMainTab>("JASA");
  const [subTab, setSubTab] = useState<CeoSubTab>("CATEGORY");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Live Backend Data States
  const [categories, setCategories] = useState<ApiCategoryNode[]>([]);
  const [subcategories, setSubcategories] = useState<ApiSubcategoryNode[]>([]);
  const [requests, setRequests] = useState<ApiCategorySuggestion[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiCategoryAuditLog[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [brandSearchQuery, setBrandSearchQuery] = useState("");
  const [brandStatusFilter, setBrandStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [catsRes, subsRes, reqsRes, auditRes, brandsRes] = await Promise.allSettled([
        taxonomyApi.getCategories({ limit: 100, include_inactive: true }),
        taxonomyApi.getSubcategories({ limit: 100, include_inactive: true }),
        taxonomyApi.getRequests(),
        taxonomyApi.getAuditLogs({ limit: 50 }),
        taxonomyApi.getBrands(),
      ]);

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
    } catch (err) {
      console.warn("Failed to load CEO taxonomy governance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadData();
    } catch (err) {
      console.warn("Failed to refresh CEO taxonomy data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Kategori Jasa & Kategori Produk
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

  // Key Governance Metrics
  const metrics = useMemo(() => {
    const totalCats = categories.length;
    const activeCats = categories.filter((c) => c.status === "ACTIVE").length;
    const totalSubs = subcategories.length;
    const activeSubs = subcategories.filter((s) => s.status === "ACTIVE").length;
    const pendingReqs = requests.filter((r) => r.status === "NEW" || r.status === "PROCESSING").length;
    const approvedReqs = requests.filter((r) => r.status === "APPROVED").length;
    const fulfilledReqs = requests.filter((r) => r.status === "FULFILLED").length;
    const rejectedReqs = requests.filter((r) => r.status === "REJECTED").length;

    const activeRatio = totalSubs > 0 ? Math.round((activeSubs / totalSubs) * 100) : 100;

    return {
      totalCats,
      activeCats,
      totalSubs,
      activeSubs,
      activeRatio,
      pendingReqs,
      approvedReqs,
      fulfilledReqs,
      rejectedReqs,
    };
  }, [categories, subcategories, requests]);

  // Status statistics for JASA & PRODUK
  const taxonomyStats = useMemo(() => {
    const jCatsTotal = jasaCategories.length;
    const jCatsActive = jasaCategories.filter((c) => c.status === "ACTIVE").length;
    const jCatsInactive = jasaCategories.filter((c) => c.status !== "ACTIVE").length;

    const jSubsTotal = jasaSubcategories.length;
    const jSubsActive = jasaSubcategories.filter((s) => s.status === "ACTIVE").length;
    const jSubsInactive = jasaSubcategories.filter((s) => s.status !== "ACTIVE").length;

    const pCatsTotal = produkCategories.length;
    const pCatsActive = produkCategories.filter((c) => c.status === "ACTIVE").length;
    const pCatsInactive = produkCategories.filter((c) => c.status !== "ACTIVE").length;

    const pSubsTotal = produkSubcategories.length;
    const pSubsActive = produkSubcategories.filter((s) => s.status === "ACTIVE").length;
    const pSubsInactive = produkSubcategories.filter((s) => s.status !== "ACTIVE").length;

    return {
      jasa: {
        category: { total: jCatsTotal, active: jCatsActive, inactive: jCatsInactive },
        subcategory: { total: jSubsTotal, active: jSubsActive, inactive: jSubsInactive },
        totalInactive: jCatsInactive + jSubsInactive,
      },
      produk: {
        category: { total: pCatsTotal, active: pCatsActive, inactive: pCatsInactive },
        subcategory: { total: pSubsTotal, active: pSubsActive, inactive: pSubsInactive },
        totalInactive: pCatsInactive + pSubsInactive,
      },
    };
  }, [jasaCategories, jasaSubcategories, produkCategories, produkSubcategories]);

  const currentTabCounts = useMemo(() => {
    const branch = mainTab === "JASA" ? taxonomyStats.jasa : taxonomyStats.produk;
    return subTab === "CATEGORY" ? branch.category : branch.subcategory;
  }, [mainTab, subTab, taxonomyStats]);

  // Filtered Categories Table
  const displayedCategories = useMemo(() => {
    const list = mainTab === "JASA" ? jasaCategories : produkCategories;
    return list.filter((c) => {
      if (statusFilter === "ACTIVE" && c.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && c.status === "ACTIVE") return false;

      return (
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [mainTab, jasaCategories, produkCategories, searchQuery, statusFilter]);

  // Filtered Subcategories List
  const displayedSubcategories = useMemo(() => {
    const list = mainTab === "JASA" ? jasaSubcategories : produkSubcategories;
    return list.filter((s) => {
      if (statusFilter === "ACTIVE" && s.status !== "ACTIVE") return false;
      if (statusFilter === "INACTIVE" && s.status === "ACTIVE") return false;

      return (
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [mainTab, jasaSubcategories, produkSubcategories, searchQuery, statusFilter]);

  // Pengelompokan Sub Kategori per Kategori Induk untuk Tampilan CEO yang Terstruktur
  const groupedSubcategories = useMemo(() => {
    const parentCats = mainTab === "JASA" ? jasaCategories : produkCategories;
    
    const groups: {
      category: ApiCategoryNode;
      subcategories: ApiSubcategoryNode[];
    }[] = [];

    parentCats.forEach((cat) => {
      const matchingSubs = displayedSubcategories.filter((s) => s.category_id === cat.id);
      
      if (statusFilter === "INACTIVE") {
        if (matchingSubs.length > 0 || cat.status !== "ACTIVE") {
          groups.push({ category: cat, subcategories: matchingSubs });
        }
      } else if (searchQuery.trim()) {
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
  }, [mainTab, jasaCategories, produkCategories, displayedSubcategories, searchQuery, statusFilter]);

  // Filtered Requests Table
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.suggested_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.submitted_by_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [requests, searchQuery]);

  return (
    <div className="space-y-6 font-body pb-20">
      {/* Page Header */}
      <PageHeader
        title="Pengawasan Kategori &amp; Sub Kategori (CEO Governance)"
        description="Portal monitoring struktural taksonomi platform SERVIO, audit kepatuhan desentralisasi, dan penelusuran integritas katalog layanan & produk."
        breadcrumbs={[
          { label: "Executive Office", href: "/ceo/dashboard" },
          { label: "Kategori dan Sub Kategori", href: "/ceo/taxonomy" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs font-bold cursor-pointer"
          >
            <ArrowsClockwise
              size={16}
              className={`${isRefreshing || isLoading ? "animate-spin text-[#0F4C81]" : "text-slate-600"}`}
            />
            <span>{isRefreshing || isLoading ? "Memperbarui..." : "Perbarui Data"}</span>
          </Button>
        }
      />

      {/* Governance Notice Banner (DEC-13) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-[#0F4C81] to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-amber-300 shrink-0">
            <LockKey size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-amber-300">
                Prinsip Tata Kelola Terkunci (DEC-13)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                Oversight Mode
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              CEO memegang hak pengawasan komprehensif &amp; audit log. Operasional CRUD dan peninjauan pengajuan mitra didelegasikan penuh kepada Admin Operasional.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold backdrop-blur-md">
            Hak Akses: Read-All &amp; Audit View
          </span>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Kategori</span>
            <Folder size={20} className="text-[#0F4C81]" weight="duotone" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalCats}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {metrics.activeCats} Kategori Aktif Platform
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Subkategori</span>
            <TreeStructure size={20} className="text-indigo-600" weight="duotone" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalSubs}</p>
          <p className="text-[11px] text-indigo-600 font-semibold">
            {metrics.activeSubs} Subkategori Siap Pakai
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tingkat Utilisasi Aktif</span>
            <ChartLineUp size={20} className="text-emerald-600" weight="duotone" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.activeRatio}%</p>
          <p className="text-[11px] text-slate-500">
            Efektivitas katalog aktif platform
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Antrean Usulan Mitra</span>
            <PaperPlaneTilt size={20} className="text-amber-500" weight="duotone" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.pendingReqs}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {metrics.fulfilledReqs} Usulan Telah Terpenuhi
          </p>
        </div>
      </div>

      {/* 4 MAIN TABS (STRUKTUR RAPI SEPERTI ADMIN) */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setMainTab("JASA");
            setSubTab("CATEGORY");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            mainTab === "JASA"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={16} weight={mainTab === "JASA" ? "fill" : "bold"} />
          <span>Layanan Jasa ({jasaCategories.length})</span>
          {taxonomyStats.jasa.totalInactive > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                mainTab === "JASA"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
              title={`${taxonomyStats.jasa.totalInactive} item jasa nonaktif`}
            >
              {taxonomyStats.jasa.totalInactive} nonaktif
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("PRODUK");
            setSubTab("CATEGORY");
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            mainTab === "PRODUK"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package size={16} weight={mainTab === "PRODUK" ? "fill" : "bold"} />
          <span>Produk &amp; Barang ({produkCategories.length})</span>
          {taxonomyStats.produk.totalInactive > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                mainTab === "PRODUK"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
              title={`${taxonomyStats.produk.totalInactive} item barang nonaktif`}
            >
              {taxonomyStats.produk.totalInactive} nonaktif
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab("REQUESTS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            mainTab === "REQUESTS"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <PaperPlaneTilt size={16} weight={mainTab === "REQUESTS" ? "fill" : "bold"} />
          <span>Pengawasan Usulan Mitra ({requests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("BRANDS")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            mainTab === "AUDIT"
              ? "bg-[#0F4C81] text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
          }`}
        >
          <ClipboardText size={16} weight={mainTab === "AUDIT" ? "fill" : "bold"} />
          <span>Audit Log Eksekutif ({auditLogs.length})</span>
        </button>
      </div>

      {/* KONTEN TAB JASA & PRODUK (DENGAN SUBTAB KATEGORI & SUBKATEGORI) */}
      {(mainTab === "JASA" || mainTab === "PRODUK") && (
        <div className="space-y-4">
          {/* Subtab Switcher, Status Segmented Controls & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
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

              {/* Status Segmented Tabs: Semua | Aktif | Nonaktif */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>Semua</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                    {currentTabCounts.total}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === "ACTIVE"
                      ? "bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-500/20"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Aktif</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    {currentTabCounts.active}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("INACTIVE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === "INACTIVE"
                      ? "bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-500/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusFilter === "INACTIVE" ? "bg-slate-950" : "bg-amber-500"}`}></span>
                  <span>Nonaktif</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === "INACTIVE"
                        ? "bg-slate-950/20 text-slate-950"
                        : currentTabCounts.inactive > 0
                        ? "bg-amber-200 text-amber-900 font-extrabold"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentTabCounts.inactive}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full lg:w-64">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    subTab === "CATEGORY"
                      ? `Cari kategori ${mainTab.toLowerCase()}...`
                      : `Cari subkategori ${mainTab.toLowerCase()}...`
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                />
              </div>

              {/* Tombol Refresh Cepat */}
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isLoading || isRefreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#0F4C81] hover:bg-slate-50 transition cursor-pointer shrink-0 disabled:opacity-50"
                title="Refresh / Perbarui Data Taksonomi"
              >
                <ArrowsClockwise
                  size={16}
                  className={isRefreshing || isLoading ? "animate-spin text-[#0F4C81]" : ""}
                />
              </button>
            </div>
          </div>

          {/* 1. SUBTAB KATEGORI: TABEL RESMI KATEGORI PLATFORM */}
          {subTab === "CATEGORY" && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Daftar Kategori Induk {mainTab === "JASA" ? "Jasa" : "Barang"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kategori resmi level platform yang mengelompokkan ragam layanan dan penawaran mitra.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 text-xs font-bold">
                  {displayedCategories.length} Kategori
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Nama Kategori</th>
                      <th className="py-3.5 px-4">Kode Taksonomi</th>
                      <th className="py-3.5 px-4 text-center">Subkategori Terdaftar</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Tanggal Registrasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 font-semibold space-y-2">
                          <p>
                            {statusFilter === "INACTIVE"
                              ? `Tidak ada kategori ${mainTab.toLowerCase()} yang berstatus nonaktif saat ini.`
                              : statusFilter === "ACTIVE"
                              ? `Tidak ada kategori ${mainTab.toLowerCase()} yang aktif.`
                              : isLoading
                              ? "Memuat kategori..."
                              : `Tidak ada kategori ${mainTab.toLowerCase()} yang ditemukan.`}
                          </p>
                          {statusFilter !== "ALL" && (
                            <button
                              type="button"
                              onClick={() => setStatusFilter("ALL")}
                              className="text-xs text-[#0F4C81] hover:underline font-bold cursor-pointer inline-block mt-1"
                            >
                              Tampilkan Semua Kategori
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayedCategories.map((cat) => {
                        const IconComponent = resolveCategoryIcon(cat);
                        const childCount = subcategories.filter((s) => s.category_id === cat.id).length;
                        const isInactive = cat.status !== "ACTIVE";

                        return (
                          <tr
                            key={cat.id}
                            className={`transition ${
                              isInactive
                                ? "bg-amber-50/20 hover:bg-amber-50/40 text-slate-600"
                                : "hover:bg-slate-50/60"
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <span className={`p-2 rounded-xl border shrink-0 ${
                                  isInactive
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-sky-50 text-[#0F4C81] border-sky-200"
                                }`}>
                                  <IconComponent size={18} weight="duotone" />
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className={`font-bold ${isInactive ? "text-slate-700" : "text-slate-900"}`}>{cat.name}</p>
                                    {isInactive && (
                                      <span className="text-[10px] text-amber-700 font-semibold">
                                        (Disembunyikan dari publik)
                                      </span>
                                    )}
                                  </div>
                                  {cat.description && (
                                    <p className="text-[11px] text-slate-500 max-w-md line-clamp-1">
                                      {cat.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">{cat.code}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                                {childCount} Subkategori
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cat.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border-amber-300 font-extrabold"
                                }`}
                              >
                                {cat.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-500">
                              {cat.created_at ? new Date(cat.created_at).toLocaleDateString("id-ID") : "-"}
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

          {/* 2. SUBTAB SUBKATEGORI: DIKELOMPOKKAN PER KATEGORI INDUK (USER-FRIENDLY & RAPI) */}
          {subTab === "SUBCATEGORY" && (
            <div className="space-y-4">
              {groupedSubcategories.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-slate-400 font-semibold shadow-xs space-y-2">
                  <p>
                    {statusFilter === "INACTIVE"
                      ? `Tidak ada subkategori ${mainTab.toLowerCase()} yang berstatus nonaktif saat ini.`
                      : statusFilter === "ACTIVE"
                      ? `Tidak ada subkategori ${mainTab.toLowerCase()} yang aktif.`
                      : isLoading
                      ? "Memuat subkategori..."
                      : `Tidak ada subkategori ${mainTab.toLowerCase()} yang ditemukan.`}
                  </p>
                  {statusFilter !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ALL")}
                      className="text-xs text-[#0F4C81] hover:underline font-bold cursor-pointer inline-block mt-1"
                    >
                      Tampilkan Semua Subkategori
                    </button>
                  )}
                </div>
              ) : (
                groupedSubcategories.map(({ category: cat, subcategories: subs }) => {
                  const IconComponent = resolveCategoryIcon(cat);
                  const isCatInactive = cat.status !== "ACTIVE";
                  return (
                    <div
                      key={cat.id}
                      className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all hover:border-slate-300 ${
                        isCatInactive ? "border-amber-200/80 bg-amber-50/10" : "border-slate-200/80"
                      }`}
                    >
                      {/* Header Kategori Induk */}
                      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className={`p-2.5 rounded-xl border shadow-2xs shrink-0 ${
                            isCatInactive ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-white text-[#0F4C81] border-slate-200/90"
                          }`}>
                            <IconComponent size={20} weight="duotone" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`font-bold text-sm tracking-tight ${isCatInactive ? "text-slate-700" : "text-slate-900"}`}>{cat.name}</h3>
                              {cat.code && <span className="font-mono text-[11px] text-slate-400 font-semibold">({cat.code})</span>}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cat.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border-amber-300 font-extrabold"
                                }`}
                              >
                                {cat.status === "ACTIVE" ? "Kategori Aktif" : "Kategori Nonaktif"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {subs.length} Sub Kategori Terdaftar di bawah kategori ini
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                          {subs.length} Subkategori
                        </span>
                      </div>

                      {/* Tabel Sub Kategori dalam Kategori Induk */}
                      {subs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs font-medium bg-slate-50/30">
                          Belum ada subkategori pada kategori <span className="font-bold text-slate-600">{cat.name}</span>.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-5">Nama Sub Kategori</th>
                                <th className="py-2.5 px-4">Kode Taksonomi</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-5 text-right">Tanggal Registrasi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {subs.map((sub) => {
                                const isSubInactive = sub.status !== "ACTIVE";
                                return (
                                  <tr
                                    key={sub.id}
                                    className={`transition ${
                                      isSubInactive
                                        ? "bg-amber-50/20 hover:bg-amber-50/40 text-slate-600"
                                        : "hover:bg-slate-50/60"
                                    }`}
                                  >
                                    <td className="py-3 px-5">
                                      <div className="flex items-center gap-2.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubInactive ? "bg-amber-400" : "bg-slate-300"}`}></span>
                                        <div>
                                          <span className={`font-bold text-sm ${isSubInactive ? "text-slate-700" : "text-slate-900"}`}>{sub.name}</span>
                                          {isSubInactive && (
                                            <span className="ml-2 text-[10px] text-amber-700 font-semibold">
                                              (Disembunyikan dari publik)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{sub.code}</td>
                                    <td className="py-3 px-4 text-center">
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                          sub.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-800 border-amber-300 font-extrabold"
                                        }`}
                                      >
                                        {sub.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-5 text-right text-slate-500">
                                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString("id-ID") : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
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

      {/* 3. TAB PENGAWASAN ANTREAN USULAN MITRA */}
      {mainTab === "REQUESTS" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pengawasan Antrean Usulan Mitra Platform</h2>
              <p className="text-xs text-slate-500">
                Laporan status pengajuan kategori / subkategori dari Merchant, Provider, dan Supplier yang ditinjau oleh Admin Operasi.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengajuan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Pengajuan</th>
                  <th className="py-3.5 px-4">Nama Usulan</th>
                  <th className="py-3.5 px-4">Tipe &amp; Master</th>
                  <th className="py-3.5 px-4">Mitra Pemohon</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Catatan Review Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                      {isLoading ? "Memuat pengajuan..." : "Tidak ada pengajuan yang sesuai filter."}
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#0F4C81]">{req.request_number}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{req.suggested_name}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{req.reason}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                            {req.request_type}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              req.master_code === "JASA"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {req.master_code}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{req.submitted_by_name || req.submitted_by_role}</p>
                        <p className="text-[10px] text-slate-500">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString("id-ID") : "-"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {req.status === "NEW" && <Badge variant="warning" size="sm">Menunggu Review</Badge>}
                        {req.status === "PROCESSING" && <Badge variant="neutral" size="sm">Sedang Diproses</Badge>}
                        {req.status === "APPROVED" && <Badge variant="success" size="sm">Disetujui (Terjadwal)</Badge>}
                        {req.status === "FULFILLED" && <Badge variant="primary" size="sm">Sudah Aktif di Sistem</Badge>}
                        {req.status === "REJECTED" && <Badge variant="danger" size="sm">Ditolak</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {req.review_reason ? (
                          <div className="p-2 rounded-lg border border-slate-100 bg-slate-50 text-[11px] space-y-0.5">
                            <span className="font-bold text-slate-700 block">
                              {req.status === "APPROVED"
                                ? "📅 Jadwal Input ke Sistem:"
                                : req.status === "REJECTED"
                                ? "⚠️ Alasan Penolakan:"
                                : "Catatan Review:"}
                            </span>
                            <span className="text-slate-600 italic">{req.review_reason}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Menunggu evaluasi Admin Operasional</span>
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

      {/* 4. TAB MEREK PRODUK (EKSEKUTIF OVERSIGHT) */}
      {mainTab === "BRANDS" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Pengawasan Merek Resmi Platform &amp; Distribusi Produk</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                  <ShieldCheck size={12} weight="bold" />
                  Executive Governance
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring direktori merek resmi suku cadang &amp; barang, verifikasi mutu manufaktur, serta persebaran jumlah produk aktif per merek di marketplace SERVIO.
              </p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, slug, atau spesialisasi merek..."
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
                <option value="ACTIVE">Aktif (Tersedia Publik)</option>
                <option value="INACTIVE">Nonaktif (Diarsipkan)</option>
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
                    <th className="py-3 px-4 bg-slate-100">Nama Merek &amp; Identitas</th>
                    <th className="py-3 px-4 bg-slate-100">Spesialisasi / Deskripsi</th>
                    <th className="py-3 px-4 bg-slate-100 text-center">Produk Terkait</th>
                    <th className="py-3 px-4 bg-slate-100 text-center">Status</th>
                    <th className="py-3 px-4 bg-slate-100 text-center">Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {brands
                    .filter((b) => {
                      const matchStatus = brandStatusFilter === "ALL" || b.status === brandStatusFilter;
                      const q = brandSearchQuery.toLowerCase();
                      const matchSearch =
                        !q ||
                        b.name.toLowerCase().includes(q) ||
                        (b.description && b.description.toLowerCase().includes(q)) ||
                        b.slug.toLowerCase().includes(q);
                      return matchStatus && matchSearch;
                    })
                    .length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                        {isLoading ? "Memuat direktori merek..." : "Belum ada data merek resmi yang sesuai dengan filter pencarian."}
                      </td>
                    </tr>
                  ) : (
                    brands
                      .filter((b) => {
                        const matchStatus = brandStatusFilter === "ALL" || b.status === brandStatusFilter;
                        const q = brandSearchQuery.toLowerCase();
                        const matchSearch =
                          !q ||
                          b.name.toLowerCase().includes(q) ||
                          (b.description && b.description.toLowerCase().includes(q)) ||
                          b.slug.toLowerCase().includes(q);
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
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{brand.name}</span>
                              <span title="Merek Resmi Terverifikasi">
                                <CheckCircle size={14} weight="fill" className="text-sky-600" />
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">slug: {brand.slug}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-sm">
                            <p className="line-clamp-2">{brand.description || "Merek manufaktur resmi dalam pengawasan platform."}</p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] text-xs font-bold">
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
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                              <ShieldCheck size={12} weight="bold" className="text-slate-500" />
                              Diawasi CEO
                            </span>
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

      {/* 5. TAB AUDIT LOG EKSEKUTIF */}
      {mainTab === "AUDIT" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Audit Trail Tata Kelola Eksekutif</h2>
              <p className="text-xs text-slate-500">
                Laporan kronologis resmi mutasi taksonomi yang tercatat di database Category Management (MySQL).
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari log audit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] shadow-xs">
                  <tr>
                    <th className="py-3 px-4 bg-slate-100">Waktu</th>
                    <th className="py-3 px-4 bg-slate-100">Aksi</th>
                    <th className="py-3 px-4 bg-slate-100">Tipe Entitas</th>
                    <th className="py-3 px-4 bg-slate-100">Aktor / Role</th>
                    <th className="py-3 px-4 bg-slate-100">Alasan Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                        {isLoading ? "Memuat audit trail..." : "Belum ada catatan log audit."}
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
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#0F4C81]">{log.actor_name || log.actor_role}</p>
                          <p className="font-mono text-[10px] text-slate-400">{log.actor_user_id}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {log.reason ? <span className="italic">{log.reason}</span> : <span className="text-slate-400">-</span>}
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
    </div>
  );
}
