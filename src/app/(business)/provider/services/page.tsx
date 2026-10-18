"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { providerServiceApi, providerWarrantyApi, taxonomyApi, ApiProviderMasterService } from "@/lib/servioApi";
import {
  Wrench,
  Plus,
  PencilSimple,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  MagnifyingGlass,
  ArrowRight,
  MapPin,
  Clock,
  Info,
  CurrencyCircleDollar,
  Sparkle,
  Folder,
  House,
  Car,
  TreeStructure,
  GearSix,
  Check,
  ShieldCheck,
  Funnel,
} from "@phosphor-icons/react";
import { ProviderMasterService, ProviderServiceMethod } from "@/types/domain";

const PLATFORM_SERVICE_METHODS: { id: ProviderServiceMethod; label: string }[] = [
  { id: "HOME_SERVICE", label: "Home Service (Kunjungan Rumah)" },
  { id: "WORKSHOP", label: "Workshop (Pengerjaan di Bengkel)" },
  { id: "ON_SITE", label: "On-Site (Proyek / Komersial)" },
  { id: "REMOTE_ONLINE", label: "Remote / Online (Konsultasi)" },
  { id: "PICKUP_RETURN", label: "Pickup & Return (Antar Jemput)" },
  { id: "MOBILE_SERVICE", label: "Mobile Service (Unit Bergerak)" },
];

function getCategoryIcon(catId: string, catName?: string) {
  const target = `${catId} ${catName || ""}`.toLowerCase();
  if (target.includes("repair") || target.includes("teknik") || target.includes("perbaikan")) return Wrench;
  if (target.includes("home") || target.includes("building") || target.includes("bangunan") || target.includes("rumah")) return House;
  if (target.includes("clean") || target.includes("kebersihan")) return Sparkle;
  if (target.includes("maint") || target.includes("perawatan")) return GearSix;
  if (target.includes("env") || target.includes("lingkungan") || target.includes("taman")) return TreeStructure;
  if (target.includes("auto") || target.includes("otomotif") || target.includes("kendaraan")) return Car;
  return Folder;
}

export default function ProviderServiceOfferingsPage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const currentProviderId = user.id || "usr-prov-001";
  const currentProviderName = user.organizationName || user.name || "PT Servio Mandiri Teknik";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canonical API State
  const [apiServices, setApiServices] = useState<ApiProviderMasterService[]>([]);
  const [apiCategories, setApiCategories] = useState<{ id: string; name: string; code?: string; status: string }[]>([]);
  const [apiSubcategories, setApiSubcategories] = useState<{ id: string; categoryId: string; categoryName?: string; name: string; code?: string; status: string }[]>([]);
  const [apiWarrantyDurations, setApiWarrantyDurations] = useState<{ id: string; durationDays: number; status: string }[]>([]);
  const [apiStoreActive, setApiStoreActive] = useState<boolean | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  const fetchCanonicalData = async () => {
    try {
      setIsLoadingServices(true);
      setAuthWarning(null);
      const [svcRes, catRes, subRes, warRes] = await Promise.allSettled([
        providerServiceApi.list(),
        taxonomyApi.getCategories({ master: "JASA", status: "ACTIVE" }),
        taxonomyApi.getSubcategories({ master: "JASA", status: "ACTIVE" }),
        providerWarrantyApi.getSettings(),
      ]);

      if (svcRes.status === "fulfilled" && svcRes.value?.data) {
        setApiServices(svcRes.value.data);
      } else if (svcRes.status === "rejected") {
        const err = svcRes.reason as { status?: number; message?: string };
        if (err?.status === 401) {
          setAuthWarning("Sesi telah kadaluarsa atau Anda belum masuk sebagai akun Mitra Penyedia. Data pratinjau lokal digunakan.");
        }
        console.warn("Notice: Provider services API could not be loaded (using local preview):", err?.message || err);
      }

      if (catRes.status === "fulfilled" && Array.isArray(catRes.value?.data)) {
        setApiCategories(
          catRes.value.data.map((c: any) => ({
            id: c.id || c._id,
            name: c.name,
            code: c.code,
            status: c.status,
          }))
        );
      }

      if (subRes.status === "fulfilled" && Array.isArray(subRes.value?.data)) {
        setApiSubcategories(
          subRes.value.data.map((s: any) => ({
            id: s.id || s._id,
            categoryId: s.category_id || s.categoryId,
            categoryName: s.category_name || s.categoryName,
            name: s.name,
            code: s.code,
            status: s.status,
          }))
        );
      }

      if (warRes.status === "fulfilled" && warRes.value?.data) {
        setApiStoreActive(warRes.value.data.settings.status === "ACTIVE");
        if (Array.isArray(warRes.value.data.activeDurations)) {
          setApiWarrantyDurations(
            warRes.value.data.activeDurations.map((d: any) => ({
              id: d.id || d._id || `dur-${d.durationDays}`,
              durationDays: d.durationDays,
              status: d.status,
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Notice: Canonical data loading error:", e);
    } finally {
      setIsLoadingServices(false);
      setHasLoadedTaxonomy(true);
    }
  };

  useEffect(() => {
    fetchCanonicalData();
  }, []);

  // Add Service Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedSubId, setSelectedSubId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [priceMin, setPriceMin] = useState<number>(75000);
  const [priceMax, setPriceMax] = useState<number>(150000);
  const [surveyFee, setSurveyFee] = useState<number>(50000);
  const [selectedMethods, setSelectedMethods] = useState<ProviderServiceMethod[]>(["HOME_SERVICE"]);

  // Edit Service Modal State
  const [editingService, setEditingService] = useState<ProviderMasterService | null>(null);
  const [editPriceMin, setEditPriceMin] = useState<number>(0);
  const [editPriceMax, setEditPriceMax] = useState<number>(0);
  const [editSurveyFee, setEditSurveyFee] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");
  const [editMethods, setEditMethods] = useState<ProviderServiceMethod[]>([]);

  // Warranty configuration state (Part A Section 4 & Part B Section 45, Level 07 Item 85)
  const providerWarrantySettings = repo.getProviderWarrantySettings(currentProviderId);
  const isStoreActive = apiStoreActive !== null ? apiStoreActive : (providerWarrantySettings?.status === "ACTIVE");
  
  const activeDurations = useMemo(() => {
    if (apiWarrantyDurations.length > 0) {
      return apiWarrantyDurations.filter((d) => d.status === "ACTIVE");
    }
    return repo.getProviderWarrantyDurations(currentProviderId);
  }, [apiWarrantyDurations, repo, currentProviderId]);

  const [warrantyDurationDays, setWarrantyDurationDays] = useState<number>(30);
  const [editWarrantyDurationDays, setEditWarrantyDurationDays] = useState<number>(0);
  const [isWarrantySupported, setIsWarrantySupported] = useState<boolean>(true);
  const [editWarrantySupported, setEditWarrantySupported] = useState<boolean>(true);

  const actor = useMemo(
    () => ({
      id: currentProviderId,
      name: currentProviderName,
    }),
    [currentProviderId, currentProviderName]
  );

  // Canonical category and subcategory state
  const [hasLoadedTaxonomy, setHasLoadedTaxonomy] = useState(false);

  // Active categories & subcategories (strictly canonical from API once loaded)
  const activeCategories = useMemo(() => {
    if (hasLoadedTaxonomy) {
      return apiCategories.filter((c) => c.status === "ACTIVE");
    }
    return [];
  }, [hasLoadedTaxonomy, apiCategories]);

  // Cascading subcategories based on selected category (strictly canonical from API once loaded)
  const availableSubcategories = useMemo(() => {
    if (!selectedCatId || !hasLoadedTaxonomy) return [];
    return apiSubcategories.filter(
      (s) => (s.categoryId === selectedCatId || String(s.categoryId) === String(selectedCatId)) && s.status === "ACTIVE"
    );
  }, [hasLoadedTaxonomy, apiSubcategories, selectedCatId]);

  // Provider's own services (strictly canonical from API)
  const myServices: ProviderMasterService[] = useMemo(() => {
    if (!isLoadingServices) {
      return apiServices.map((s: any) => ({
        id: s.id || s._id,
        providerId: s.providerId,
        providerName: s.providerName,
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        subcategoryId: s.subcategoryId,
        subcategoryName: s.subcategoryName,
        name: s.name,
        description: s.description || "",
        priceMin: s.priceMin,
        priceMax: s.priceMax,
        surveyFee: s.surveyFee || 0,
        serviceMethods: (s.serviceMethods || []) as ProviderServiceMethod[],
        status: s.status,
        availability: s.availability || "AVAILABLE",
        warrantyConfig: s.warrantyConfig,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    }
    return [];
  }, [isLoadingServices, apiServices]);

  // Canonical projection: categories containing active services belonging to this Provider (COUNT DISTINCT subcategories, COUNT active services)
  const providerActiveCategories = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        serviceCount: number;
        subcategoriesUsed: Set<string>;
      }
    >();

    myServices.forEach((service) => {
      // ONLY consider ACTIVE services for category cards (Prompt Section 4, 5, 8)
      if (service.status !== "ACTIVE") return;

      const cat = apiCategories.find((c) => c.id === service.categoryId) || repo.categories.find((c) => c.id === service.categoryId);
      const catName = cat?.name || service.categoryName || "Kategori Lain";
      const catId = service.categoryId;

      if (!map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: catName,
          serviceCount: 0,
          subcategoriesUsed: new Set<string>(),
        });
      }
      const entry = map.get(catId)!;
      entry.serviceCount += 1;
      entry.subcategoriesUsed.add(service.subcategoryId);
    });

    // Only return categories that have active services (Section 8: tidak boleh menampilkan kategori kosong)
    return Array.from(map.values()).filter((c) => c.serviceCount > 0);
  }, [myServices, apiCategories, repo.categories]);

  // Status counters
  const totalAllServicesCount = useMemo(() => myServices.length, [myServices]);
  const totalActiveServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "ACTIVE").length;
  }, [myServices]);
  const totalDraftServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "DRAFT").length;
  }, [myServices]);
  const totalInactiveServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "INACTIVE").length;
  }, [myServices]);

  // Total distinct subcategories used by active services
  const totalSubcategoriesUsed = useMemo(() => {
    const allSubs = new Set<string>();
    providerActiveCategories.forEach((c) => {
      c.subcategoriesUsed.forEach((subId) => allSubs.add(subId));
    });
    return allSubs.size;
  }, [providerActiveCategories]);

  const filteredServices = useMemo(() => {
    return myServices.filter((s) => {
      const matchesCategory =
        selectedCategoryFilter === "ALL" || s.categoryId === selectedCategoryFilter;
      const matchesStatus =
        selectedStatusFilter === "ALL" || s.status === selectedStatusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.categoryName || "").toLowerCase().includes(q) ||
        (s.subcategoryName || "").toLowerCase().includes(q);

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [myServices, selectedCategoryFilter, selectedStatusFilter, searchQuery]);

  const handleOpenAddModal = () => {
    const defaultCat = activeCategories[0]?.id || "";
    setSelectedCatId(defaultCat);
    const subcats = defaultCat
      ? apiSubcategories.filter((s) => (s.categoryId === defaultCat || String(s.categoryId) === String(defaultCat)) && s.status === "ACTIVE")
      : [];
    setSelectedSubId(subcats[0]?.id || "");
    setServiceName("");
    setServiceDesc("");
    setPriceMin(75000);
    setPriceMax(150000);
    setSurveyFee(50000);
    setSelectedMethods(["HOME_SERVICE"]);
    setWarrantyDurationDays(activeDurations[0]?.durationDays || 30);
    setIsWarrantySupported(isStoreActive);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (service: ProviderMasterService) => {
    setEditingService(service);
    setEditPriceMin(service.priceMin);
    setEditPriceMax(service.priceMax);
    setEditSurveyFee(service.surveyFee);
    setEditDesc(service.description || "");
    setEditMethods(service.serviceMethods || []);
    const cfg = (service as any).warrantyConfig || repo.getServiceWarrantyConfig(service.id);
    if (cfg?.warrantyEnabled !== undefined) {
      setEditWarrantySupported(Boolean(cfg.warrantyEnabled));
    } else {
      setEditWarrantySupported(isStoreActive);
    }
    if (cfg?.warrantyEnabled && cfg?.durationDays > 0) {
      setEditWarrantyDurationDays(cfg.durationDays);
    } else {
      setEditWarrantyDurationDays(activeDurations[0]?.durationDays || 30);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    const subcats = apiSubcategories.filter(
      (s) => (s.categoryId === catId || String(s.categoryId) === String(catId)) && s.status === "ACTIVE"
    );
    setSelectedSubId(subcats[0]?.id || "");
  };

  // Synchronize category and subcategory selection when modal is opened or categories load
  useEffect(() => {
    if (!isAddModalOpen) return;
    if (!selectedCatId && activeCategories.length > 0) {
      setSelectedCatId(activeCategories[0].id);
    }
  }, [isAddModalOpen, selectedCatId, activeCategories]);

  useEffect(() => {
    if (!isAddModalOpen) return;
    if (availableSubcategories.length > 0) {
      const exists = availableSubcategories.some((s) => s.id === selectedSubId);
      if (!exists) {
        setSelectedSubId(availableSubcategories[0].id);
      }
    } else {
      setSelectedSubId("");
    }
  }, [isAddModalOpen, availableSubcategories, selectedSubId]);

  const handleToggleMethod = (method: ProviderServiceMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleSaveNewService = async (e: React.FormEvent, status: "ACTIVE" | "DRAFT") => {
    e.preventDefault();
    if (!selectedCatId || !selectedSubId || !serviceName.trim()) {
      alert("Harap lengkapi kategori, subkategori, dan nama master service.");
      return;
    }

    try {
      const catObj = apiCategories.find((c) => c.id === selectedCatId) || repo.categories.find((c) => c.id === selectedCatId);
      const subObj = apiSubcategories.find((s) => s.id === selectedSubId) || repo.subcategories.find((s) => s.id === selectedSubId);

      await providerServiceApi.create({
        categoryId: selectedCatId,
        categoryName: catObj?.name,
        subcategoryId: selectedSubId,
        subcategoryName: subObj?.name,
        name: serviceName.trim(),
        description: serviceDesc.trim(),
        priceMin: Number(priceMin),
        priceMax: Number(priceMax),
        surveyFee: Number(surveyFee),
        serviceMethods: selectedMethods,
        status,
        warrantyConfig: isStoreActive && isWarrantySupported ? {
          warrantyEnabled: true,
          durationDays: warrantyDurationDays || 30,
        } : {
          warrantyEnabled: false,
          durationDays: 0,
        },
      });

      // Also sync to domain repo for any dependent client state
      try {
        const catObj = apiCategories.find((c) => c.id === selectedCatId) || repo.categories.find((c) => c.id === selectedCatId);
        const subObj = apiSubcategories.find((s) => s.id === selectedSubId) || repo.subcategories.find((s) => s.id === selectedSubId);
        repo.createProviderMasterService(
          {
            providerId: currentProviderId,
            providerName: currentProviderName,
            categoryId: selectedCatId,
            categoryName: catObj?.name,
            subcategoryId: selectedSubId,
            subcategoryName: subObj?.name,
            name: serviceName.trim(),
            description: serviceDesc.trim(),
            priceMin: Number(priceMin),
            priceMax: Number(priceMax),
            surveyFee: Number(surveyFee),
            serviceMethods: selectedMethods,
            status,
          },
          actor
        );
      } catch (repoErr) {
        console.warn("Notice: Local repo cache sync:", repoErr);
      }

      await fetchCanonicalData();
      setIsAddModalOpen(false);
      setToastMessage(`Layanan "${serviceName}" berhasil disimpan & diaktifkan.`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menambahkan layanan");
    }
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      await providerServiceApi.update(editingService.id, {
        description: editDesc.trim(),
        priceMin: Number(editPriceMin),
        priceMax: Number(editPriceMax),
        surveyFee: Number(editSurveyFee),
        serviceMethods: editMethods,
        warrantyConfig: isStoreActive && editWarrantySupported ? {
          warrantyEnabled: true,
          durationDays: 30,
        } : {
          warrantyEnabled: false,
          durationDays: 0,
        },
      });

      try {
        repo.updateProviderMasterService(
          editingService.id,
          {
            description: editDesc.trim(),
            priceMin: Number(editPriceMin),
            priceMax: Number(editPriceMax),
            surveyFee: Number(editSurveyFee),
            serviceMethods: editMethods,
          },
          actor
        );
      } catch (repoErr) {
        console.warn("Local repo sync notice:", repoErr);
      }

      await fetchCanonicalData();
      setEditingService(null);
      setToastMessage("Konfigurasi penawaran layanan berhasil diperbarui.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui layanan");
    }
  };

  const handleToggleStatus = async (service: ProviderMasterService) => {
    try {
      const nextStatus = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await providerServiceApi.update(service.id, { status: nextStatus });
      try {
        repo.toggleProviderMasterServiceStatus(service.id, actor);
      } catch (repoErr) {
        console.warn("Local repo sync notice:", repoErr);
      }
      await fetchCanonicalData();
      setToastMessage(
        `Status layanan "${service.name}" diubah menjadi ${nextStatus === "INACTIVE" ? "Nonaktif" : "Aktif"}.`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengubah status layanan");
    }
  };

  const handleToggleAvailability = async (service: ProviderMasterService) => {
    try {
      const nextAvailability = service.availability === "UNAVAILABLE" ? "AVAILABLE" : "UNAVAILABLE";
      await providerServiceApi.update(service.id, { availability: nextAvailability });
      await fetchCanonicalData();
      setToastMessage(
        `Ketersediaan layanan "${service.name}" diubah menjadi ${nextAvailability === "AVAILABLE" ? "Tersedia (Available)" : "Tidak Tersedia (Unavailable)"}.`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengubah ketersediaan layanan");
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
        title="Katalog Layanan &amp; Penawaran Mitra"
        description="Kelola master service yang ditawarkan bengkel Anda. Atur range harga penawaran, biaya survei, dan metode pelaksanaan servis."
        breadcrumbs={[
          { label: "Mitra Bengkel", href: "/provider/dashboard" },
          { label: "Katalog Layanan", href: "/provider/services" },
        ]}
      />

      {/* Auth Warning Banner */}
      {authWarning && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info size={18} weight="fill" className="text-amber-600 shrink-0" />
            <span>{authWarning}</span>
          </div>
          <Link
            href="/auth/login"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors text-center shrink-0"
          >
            Masuk Sekarang
          </Link>
        </div>
      )}

      {/* Profile Linkage Read-Only Summary Banner (Locked Decision Section 30 & 31) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200 shrink-0">
            <MapPin size={20} weight="duotone" />
          </span>
          <div>
            <p className="font-bold text-slate-900">Area Operasional &amp; Radius Servis Bengkel</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Cakupan wilayah: <span className="font-semibold text-slate-800">Jakarta Selatan, Tebet, Kuningan</span> &bull; Radius: <span className="font-semibold text-slate-800">25 km</span> &bull; Jam Operasional: <span className="font-semibold text-slate-800">Senin - Sabtu (08.00 - 18.00 WIB)</span>
            </p>
          </div>
        </div>
        <Link
          href="/provider/profile"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[#0F4C81] font-bold hover:bg-slate-50 self-start sm:self-auto transition text-xs shrink-0"
        >
          <span>Edit di Profil</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: KATEGORI LAYANAN AKTIF (LOCKED DECISION POINT 1)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200">
                <Folder size={18} weight="duotone" />
              </span>
              <h2 className="text-sm font-bold text-slate-900">Kategori Layanan Aktif</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                {providerActiveCategories.length} Kategori
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] text-[11px] font-bold border border-sky-200">
                {totalSubcategoriesUsed} Subkategori
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                {totalActiveServicesCount} Layanan Dikuasai
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              Pengelompokan master service yang aktif Anda tawarkan berdasarkan kategori platform. Klik kartu untuk menyaring katalog.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter("ALL");
                setSelectedStatusFilter("ALL");
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedCategoryFilter === "ALL" && selectedStatusFilter === "ALL"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Semua Layanan</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedCategoryFilter === "ALL" && selectedStatusFilter === "ALL"
                    ? "bg-white text-[#0F4C81]"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {totalAllServicesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedStatusFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Aktif</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedStatusFilter === "ACTIVE"
                    ? "bg-white text-emerald-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {totalActiveServicesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter("DRAFT")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedStatusFilter === "DRAFT"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Draft</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedStatusFilter === "DRAFT"
                    ? "bg-white text-amber-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {totalDraftServicesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedStatusFilter === "INACTIVE"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Nonaktif</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  selectedStatusFilter === "INACTIVE"
                    ? "bg-white text-slate-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {totalInactiveServicesCount}
              </span>
            </button>
          </div>
        </div>

        {/* Category Cards Grid */}
        {providerActiveCategories.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Belum ada layanan aktif pada kategori ini. Klik &quot;Tambah Layanan&quot; untuk mulai menawarkan jasa.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {providerActiveCategories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat.id;
              const IconComponent = getCategoryIcon(cat.id, cat.name);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryFilter(isSelected ? "ALL" : cat.id)
                  }
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                    isSelected
                      ? "bg-sky-50/70 border-[#0F4C81] ring-2 ring-[#0F4C81]/25 shadow-xs"
                      : "bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <span
                        className={`p-2.5 rounded-xl transition ${
                          isSelected
                            ? "bg-[#0F4C81] text-white shadow-2xs"
                            : "bg-slate-100/80 text-[#0F4C81] border border-slate-200/70"
                        }`}
                      >
                        <IconComponent size={22} weight={isSelected ? "fill" : "duotone"} />
                      </span>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0F4C81] text-white">
                          Filter Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          {cat.serviceCount} Layanan Aktif
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm font-display leading-tight">
                        {cat.name}
                      </h3>
                      <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                        <p className="font-medium text-slate-500">
                          {cat.subcategoriesUsed.size} Subkategori
                        </p>
                        <p className="font-bold text-emerald-700">
                          {cat.serviceCount} Layanan Aktif
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0F4C81] group-hover:translate-x-0.5 transition-transform w-full">
                    <span>Lihat Layanan</span>
                    <ArrowRight size={13} weight="bold" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action and Search Bar with Status & Category Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 relative">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari master service atau subkategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Funnel size={15} />
            <span>Kategori:</span>
          </div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">Semua Kategori</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">Semua Status ({totalAllServicesCount})</option>
            <option value="ACTIVE">Aktif (Tayang) ({totalActiveServicesCount})</option>
            <option value="DRAFT">Draft ({totalDraftServicesCount})</option>
            <option value="INACTIVE">Nonaktif ({totalInactiveServicesCount})</option>
          </select>

          <Link
            href="/provider/taxonomy-request"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs transition"
          >
            Ajukan Subkategori
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5"
          >
            <Plus size={16} weight="bold" />
            <span>Tambah Layanan</span>
          </Button>
        </div>
      </div>

      {/* Service Offerings List */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto">
            <Wrench size={24} weight="duotone" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum ada layanan penawaran</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedCategoryFilter !== "ALL"
              ? "Belum ada layanan aktif pada kategori ini. Silakan tambahkan layanan baru atau pilih Semua Kategori."
              : "Mulai tawarkan keahlian teknis bengkel Anda kepada konsumen dengan menambahkan master service pertama."}
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenAddModal} className="mt-2">
            Tambah Layanan Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {service.categoryName} &bull; {service.subcategoryName}
                      </span>
                      {(() => {
                        const cfg = (service as any).warrantyConfig || repo.getServiceWarrantyConfig(service.id);
                        if (cfg?.warrantyEnabled) {
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-xs">
                              <ShieldCheck size={12} weight="fill" />
                              ✓ Garansi Tersedia
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded text-slate-400 bg-slate-50 border border-slate-200">
                            Tidak Ada Garansi
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="text-sm font-bold font-display text-slate-900 mt-1.5">{service.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                        service.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      Status: {service.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${
                        service.availability === "UNAVAILABLE"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-teal-50 text-teal-700 border-teal-200"
                      }`}
                    >
                      {service.availability === "UNAVAILABLE" ? "Tidak Tersedia" : "Tersedia (Ready)"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{service.description}</p>

                {/* Konfigurasi Penawaran Mitra */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Konfigurasi Penawaran Mitra
                  </p>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-600">Range Estimasi:</span>
                    <span className="text-slate-900">
                      Rp {service.priceMin.toLocaleString("id-ID")} – Rp {service.priceMax.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Biaya Survei:</span>
                    <span className="font-semibold text-slate-800">
                      Rp {service.surveyFee.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Service Methods Badges */}
                <div className="flex flex-wrap gap-1">
                  {service.serviceMethods.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-100 text-[10px] font-semibold"
                    >
                      {m === "HOME_SERVICE"
                        ? "Home Service"
                        : m === "WORKSHOP"
                        ? "Workshop"
                        : m === "ON_SITE"
                        ? "On-Site"
                        : m === "REMOTE_ONLINE"
                        ? "Online"
                        : m === "PICKUP_RETURN"
                        ? "Antar Jemput"
                        : "Mobile Service"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(service)}
                    className={`font-bold flex items-center gap-1 ${
                      service.status === "ACTIVE" ? "text-amber-700 hover:text-amber-900" : "text-emerald-700 hover:text-emerald-900"
                    }`}
                    title="Ubah status katalog layanan"
                  >
                    {service.status === "ACTIVE" ? <ToggleRight size={18} weight="fill" /> : <ToggleLeft size={18} />}
                    <span>{service.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(service)}
                    className={`font-bold flex items-center gap-1 ${
                      service.availability === "UNAVAILABLE" ? "text-teal-700 hover:text-teal-900" : "text-rose-700 hover:text-rose-900"
                    }`}
                    title="Ubah ketersediaan operasional layanan"
                  >
                    <span>{service.availability === "UNAVAILABLE" ? "Buka Order" : "Tutup Sementara"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingService(service);
                    setEditDesc(service.description);
                    setEditPriceMin(service.priceMin);
                    setEditPriceMax(service.priceMax);
                    setEditSurveyFee(service.surveyFee);
                    setEditMethods(service.serviceMethods);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                >
                  <PencilSimple size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH LAYANAN (STRICT CASCADING FLOW, LOCKED POINT 2)              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tambah Layanan"
          maxWidth="lg"
        >
          <form className="space-y-4 text-xs font-body">
            {/* 1. Category Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                  Langkah 1
                </span>
                <label className="font-bold text-slate-800">Pilih Kategori Layanan</label>
              </div>
              <select
                value={selectedCatId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
              >
                {activeCategories.length === 0 ? (
                  <option value="" disabled>Memuat kategori...</option>
                ) : (
                  activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Subcategory Selection with CTA link to Request page */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap justify-between items-center gap-1.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                    Langkah 2
                  </span>
                  <label className="font-bold text-slate-800 whitespace-nowrap">Pilih Subkategori</label>
                </div>
                <Link
                  href="/provider/taxonomy-request"
                  target="_blank"
                  className="text-[11px] font-bold text-[#0F4C81] hover:underline"
                >
                  Subkategori belum tersedia? Ajukan Subkategori
                </Link>
              </div>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                disabled={availableSubcategories.length === 0}
              >
                {availableSubcategories.length === 0 ? (
                  <option value="" disabled>Belum ada subkategori untuk kategori ini</option>
                ) : (
                  availableSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 3. Master Service Name (Filled by Provider!) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                  Langkah 3
                </span>
                <label className="font-bold text-slate-800">Nama Master Service</label>
              </div>
              <input
                type="text"
                required
                placeholder="Contoh: AC Cleaning atau Cuci AC Inverter Tekanan Tinggi"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white"
              />
            </div>

            {/* 4. Description */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                  Langkah 4
                </span>
                <label className="font-bold text-slate-800">Deskripsi Layanan</label>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Jelaskan ruang lingkup pengerjaan, prosedur teknis, dan keunggulan servis..."
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white"
              />
            </div>

            {/* 5. Konfigurasi Penawaran Mitra (Price Range + Survey Fee with Rp Adornment) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                    Langkah 5
                  </span>
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Konfigurasi Penawaran Mitra
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Minimum</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={priceMin}
                      onChange={(e) => setPriceMin(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Estimasi: Rp {Number(priceMin || 0).toLocaleString("id-ID")}
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Maksimum</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={priceMin}
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Estimasi: Rp {Number(priceMax || 0).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biaya Survei / Diagnosa di Tempat</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={surveyFee}
                    onChange={(e) => setSurveyFee(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Tarif survei dasar: Rp {Number(surveyFee || 0).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {/* 6. Metode Layanan */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                  Langkah 6
                </span>
                <label className="font-bold text-slate-800">Metode Layanan yang Didukung</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLATFORM_SERVICE_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedMethods.includes(method.id)
                        ? "bg-sky-50 border-[#0F4C81] text-[#0F4C81] font-bold"
                        : "bg-white border-slate-200 text-slate-600 font-medium"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(method.id)}
                      onChange={() => handleToggleMethod(method.id)}
                      className="rounded text-[#0F4C81]"
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Garansi Layanan (Part A Section 4 & Part B Section 45) */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase">
                    Garansi
                  </span>
                  <label className="font-bold text-slate-800">Proteksi Garansi Layanan</label>
                </div>
                {isStoreActive ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300">
                    Toko Garansi Aktif
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Toko Garansi Belum Aktif
                  </span>
                )}
              </div>

              {isStoreActive ? (
                <div className="space-y-2 mt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsWarrantySupported(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isWarrantySupported
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldCheck size={16} weight={isWarrantySupported ? "fill" : "regular"} />
                      <span>Sediakan Garansi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWarrantySupported(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        !isWarrantySupported
                          ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tidak Ada Garansi</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isWarrantySupported
                      ? "✓ Layanan ini akan memiliki badge garansi. Durasi spesifik (hari) akan diterbitkan saat pekerjaan pesanan telah selesai dikerjakan."
                      : "Layanan ini tidak menyediakan garansi purna jual."}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Garansi Toko belum diaktifkan. Anda dapat mengaktifkannya di menu Garansi Toko.</span>
                  <Link href="/provider/warranty" className="font-bold text-[#0F4C81] hover:underline shrink-0 ml-2">
                    Kelola Garansi
                  </Link>
                </div>
              )}
            </div>

            {/* 7. Read-Only Profile Context (STRICT LOCKED DECISION POINT 2 & SECTION 21, 31) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[10px] font-black uppercase">
                  Langkah 7
                </span>
                <label className="font-bold text-slate-800">Area Layanan &amp; Coverage Radius (Profil)</label>
              </div>
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-white text-[#0F4C81] border border-sky-200 shadow-2xs">
                      <MapPin size={16} weight="duotone" />
                    </span>
                    <span className="font-bold text-slate-900">Jangkauan Operasional Bengkel</span>
                  </div>
                  <Link
                    href="/provider/profile"
                    target="_blank"
                    className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                  >
                    <span>Edit di Profil</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
                <p className="text-slate-600 text-[11px] pl-6">
                  Wilayah: <span className="font-semibold text-slate-800">Jakarta Selatan, Tebet, Kuningan</span> &bull; Radius: <span className="font-semibold text-slate-800">25 km</span>
                </p>
                <p className="text-[10px] text-slate-400 pl-6">
                  Data jangkauan operasional terhubung otomatis dari profil utama bengkel. Tidak perlu diisi berulang.
                </p>
              </div>
            </div>

            {/* 8. Form Actions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                  Langkah 8
                </span>
                <span className="text-[11px] text-slate-400">Pastikan konfigurasi telah sesuai sebelum publikasi</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={(e) => handleSaveNewService(e, "DRAFT")}
                >
                  Simpan Draf
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={(e) => handleSaveNewService(e, "ACTIVE")}
                >
                  Simpan &amp; Aktifkan
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT LAYANAN                                                       */}
      {/* ========================================================================= */}
      {editingService && (
        <Modal
          isOpen={!!editingService}
          onClose={() => setEditingService(null)}
          title={`Edit Konfigurasi Penawaran: ${editingService.name}`}
        >
          <form onSubmit={handleSaveEditService} className="space-y-4 text-xs font-body">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Layanan</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Minimum</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={editPriceMin}
                    onChange={(e) => setEditPriceMin(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Harga Maksimum</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={editPriceMin}
                    value={editPriceMax}
                    onChange={(e) => setEditPriceMax(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Biaya Survei</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                  Rp
                </span>
                <input
                  type="number"
                  min={0}
                  value={editSurveyFee}
                  onChange={(e) => setEditSurveyFee(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            {/* Garansi Layanan for Edit Modal */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700">Proteksi Garansi Layanan</label>
                {isStoreActive && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Toko Garansi Aktif
                  </span>
                )}
              </div>
              {isStoreActive ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditWarrantySupported(true)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        editWarrantySupported
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldCheck size={16} weight={editWarrantySupported ? "fill" : "regular"} />
                      <span>Sediakan Garansi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWarrantySupported(false)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        !editWarrantySupported
                          ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tidak Ada Garansi</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {editWarrantySupported
                      ? "✓ Layanan ini bergaransi. Durasi spesifik akan Anda tentukan saat pesanan customer selesai dikerjakan."
                      : "Layanan ini tidak menyediakan garansi purna jual."}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-amber-700">
                  Toko Garansi nonaktif. Aktifkan di menu Garansi untuk menyediakan garansi.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setEditingService(null)}>
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
