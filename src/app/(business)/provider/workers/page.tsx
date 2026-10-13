"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  UserPlus,
  Phone,
  Star,
  CheckCircle,
  CalendarCheck,
  Car,
  Briefcase,
  MagnifyingGlass,
  UsersThree,
  Wrench,
  Certificate,
  Funnel,
  Check,
  X,
  EnvelopeSimple,
  User,
  SlidersHorizontal,
  Info,
  Tag,
  Copy,
  CalendarBlank,
  IdentificationCard,
  Eye,
  ShieldCheck,
  SpinnerGap,
  Clock,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { WorkerTechnician, ProviderMasterService } from "@/types/domain";
import { providerApi, providerServiceApi, ApiWorker, ApiProviderMasterService } from "@/lib/servioApi";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

// Avatar preset options for technician identity
const AVATAR_PRESETS = [
  { id: "avatar-1", label: "Teknisi 1", color: "bg-sky-500 text-white" },
  { id: "avatar-2", label: "Teknisi 2", color: "bg-emerald-500 text-white" },
  { id: "avatar-3", label: "Teknisi 3", color: "bg-amber-500 text-white" },
  { id: "avatar-4", label: "Teknisi 4", color: "bg-indigo-500 text-white" },
  { id: "avatar-5", label: "Teknisi 5", color: "bg-rose-500 text-white" },
];

interface WorkerCompetencySelectorProps {
  providerMasterServices: ProviderMasterService[];
  selectedServiceIds: string[];
  onChangeSelectedServiceIds: (ids: string[]) => void;
  errorMessage?: string | null;
}

/**
 * Reusable Component for Selecting & Managing Worker Service Capabilities
 * Shared between "Tambah Teknisi" and "Kelola Kompetensi" modals.
 */
function WorkerCompetencySelector({
  providerMasterServices,
  selectedServiceIds,
  onChangeSelectedServiceIds,
  errorMessage,
}: WorkerCompetencySelectorProps) {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Unique categories derived strictly from current provider's active master services
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    providerMasterServices.forEach((s) => {
      if (s.categoryId) {
        map.set(s.categoryId, s.categoryName || s.categoryId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [providerMasterServices]);

  // Subcategories cascading from selected Category
  const availableSubcategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; categoryId: string }>();
    providerMasterServices.forEach((s) => {
      if (s.subcategoryId) {
        if (filterCategory === "ALL" || s.categoryId === filterCategory) {
          map.set(s.subcategoryId, {
            id: s.subcategoryId,
            name: s.subcategoryName || s.subcategoryId,
            categoryId: s.categoryId,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [providerMasterServices, filterCategory]);

  // Handle Category filter change with cascading subcategory reset
  const handleCategoryChange = (catId: string) => {
    setFilterCategory(catId);
    if (catId !== "ALL") {
      const isSubcatValid = providerMasterServices.some(
        (s) => s.categoryId === catId && s.subcategoryId === filterSubcategory
      );
      if (!isSubcatValid) {
        setFilterSubcategory("ALL");
      }
    }
  };

  // Filtered master services based on category, subcategory, and search query
  const filteredServices = useMemo(() => {
    return providerMasterServices.filter((s) => {
      if (filterCategory !== "ALL" && s.categoryId !== filterCategory) return false;
      if (filterSubcategory !== "ALL" && s.subcategoryId !== filterSubcategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = (s.description || "").toLowerCase().includes(q);
        const matchesSubcat = (s.subcategoryName || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesSubcat) return false;
      }
      return true;
    });
  }, [providerMasterServices, filterCategory, filterSubcategory, searchQuery]);

  // Group services by Category -> Subcategory
  const groupedServices = useMemo(() => {
    const groups: {
      categoryId: string;
      categoryName: string;
      subcategories: {
        subcategoryId: string;
        subcategoryName: string;
        services: ProviderMasterService[];
      }[];
    }[] = [];

    filteredServices.forEach((s) => {
      let catGroup = groups.find((g) => g.categoryId === s.categoryId);
      if (!catGroup) {
        catGroup = {
          categoryId: s.categoryId,
          categoryName: s.categoryName || s.categoryId,
          subcategories: [],
        };
        groups.push(catGroup);
      }
      let subGroup = catGroup.subcategories.find((sg) => sg.subcategoryId === s.subcategoryId);
      if (!subGroup) {
        subGroup = {
          subcategoryId: s.subcategoryId,
          subcategoryName: s.subcategoryName || s.subcategoryId,
          services: [],
        };
        catGroup.subcategories.push(subGroup);
      }
      subGroup.services.push(s);
    });

    return groups;
  }, [filteredServices]);

  // Real-time Selection Summary (auto-calculated from selectedServiceIds)
  const selectionSummary = useMemo(() => {
    const selectedServices = providerMasterServices.filter((s) =>
      selectedServiceIds.includes(s.id)
    );
    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, string>();

    selectedServices.forEach((s) => {
      if (s.categoryId) categoryMap.set(s.categoryId, s.categoryName || s.categoryId);
      if (s.subcategoryId) subcategoryMap.set(s.subcategoryId, s.subcategoryName || s.subcategoryId);
    });

    return {
      selectedServices,
      categories: Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name })),
      subcategories: Array.from(subcategoryMap.entries()).map(([id, name]) => ({ id, name })),
    };
  }, [providerMasterServices, selectedServiceIds]);

  const toggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      onChangeSelectedServiceIds(selectedServiceIds.filter((id) => id !== serviceId));
    } else {
      onChangeSelectedServiceIds([...selectedServiceIds, serviceId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const newIds = new Set(selectedServiceIds);
    filteredServices.forEach((s) => newIds.add(s.id));
    onChangeSelectedServiceIds(Array.from(newIds));
  };

  const handleClearAll = () => {
    onChangeSelectedServiceIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Filtering Ribbon (Cascading) */}
      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
          <span className="flex items-center gap-1.5 text-slate-800 font-bold">
            <Funnel size={14} className="text-[#0F4C81]" />
            Filter Katalog Kompetensi
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="text-[#0F4C81] hover:underline"
            >
              Pilih Semua Ditampilkan
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-rose-600 hover:underline"
            >
              Reset Pilihan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Category Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Kategori:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Kategori ({availableCategories.length})</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Dropdown (Cascading) */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Subkategori:
            </label>
            <select
              value={filterSubcategory}
              onChange={(e) => setFilterSubcategory(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Subkategori ({availableSubcategories.length})</option>
              {availableSubcategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Master Service */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Cari Layanan:
            </label>
            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari master service..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Selection Summary */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              KOMPETENSI TERPILIH
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F4C81] text-white">
              {selectionSummary.categories.length} Kategori • {selectionSummary.subcategories.length} Subkategori • {selectionSummary.selectedServices.length} Layanan
            </span>
          </div>
        </div>

        {selectedServiceIds.length === 0 ? (
          <div className="p-3 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Belum ada layanan yang dipilih. Pilih minimal 1 Provider Master Service dari daftar di bawah.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Kategori Terpilih:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectionSummary.categories.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg bg-sky-100 text-[#0F4C81] font-bold border border-sky-200"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Subkategori Terpilih:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectionSummary.subcategories.map((sc) => (
                  <span
                    key={sc.id}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                  >
                    {sc.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 block mb-1">
                {selectionSummary.selectedServices.length} Layanan Dikuasai:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectionSummary.selectedServices.map((svc) => (
                  <span
                    key={svc.id}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1.5"
                  >
                    <span>{svc.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      title="Hapus layanan"
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <X size={16} weight="bold" className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Grouped Master Service Selection List */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
        {groupedServices.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Tidak ada Master Service yang sesuai dengan filter atau kata kunci pencarian.
          </div>
        ) : (
          groupedServices.map((catGroup) => (
            <div
              key={catGroup.categoryId}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
            >
              {/* Category Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Tag size={16} weight="bold" className="text-[#0F4C81]" />
                <h4 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                  {catGroup.categoryName}
                </h4>
              </div>

              {/* Subcategories */}
              <div className="space-y-3 pl-2">
                {catGroup.subcategories.map((subGroup) => (
                  <div key={subGroup.subcategoryId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-xs font-bold text-indigo-900">
                        {subGroup.subcategoryName}
                      </span>
                    </div>

                    {/* Master Service Checkbox Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3">
                      {subGroup.services.map((service) => {
                        const isSelected = selectedServiceIds.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? "bg-emerald-50/70 border-emerald-300 shadow-2xs"
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div onClick
                              className="mt-0.5 w-4 h-4 rounded text-[#0F4C81] accent-[#0F4C81] cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-slate-900 truncate">
                                {service.name}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {service.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                                <span className="font-semibold text-slate-700">
                                  Rp {service.priceMin.toLocaleString("id-ID")} - {service.priceMax.toLocaleString("id-ID")}
                                </span>
                                {service.surveyFee > 0 && (
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Survei: Rp {service.surveyFee.toLocaleString("id-ID")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProviderWorkersPage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const currentProviderId = user.id || "usr-prov-001";
  const providerName = user.organizationName || user.name || "PT Servio Mandiri Teknik";

  const { workers, updateWorkerStatus, addWorker, setWorkerCapabilities } = useProviderOperations();
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("search", "");
  const [filterStatus, setFilterStatus] = useUrlQueryState<"ALL" | "ONLINE" | "OFFLINE">("status", "ALL");

  // API Master Services loaded from Laravel REST API + MongoDB Local
  const [apiMasterServices, setApiMasterServices] = useState<ApiProviderMasterService[]>([]);
  const [isLoadingMasterServices, setIsLoadingMasterServices] = useState<boolean>(true);

  const fetchMasterServices = async () => {
    try {
      setIsLoadingMasterServices(true);
      const res = await providerServiceApi.list({ status: "ACTIVE" });
      if (res && res.data) {
        setApiMasterServices(res.data);
      }
    } catch (err: any) {
      console.warn("Notice: Provider master services for workers could not be loaded (using local preview):", err?.message || err);
    } finally {
      setIsLoadingMasterServices(false);
    }
  };

  useEffect(() => {
    fetchMasterServices();
  }, []);

  // Provider's active Master Services for technician competency capability mapping
  const providerMasterServices: ProviderMasterService[] = useMemo(() => {
    if (!isLoadingMasterServices) {
      return apiMasterServices.map((s: any) => ({
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
        serviceMethods: s.serviceMethods || ["HOME_SERVICE"],
        status: s.status,
        warrantyConfig: s.warrantyConfig,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    }
    return [];
  }, [isLoadingMasterServices, apiMasterServices]);

  // API Workers loaded from Laravel REST API + MongoDB Local
  const [apiWorkers, setApiWorkers] = useState<ApiWorker[]>([]);
  const [isLoadingApiWorkers, setIsLoadingApiWorkers] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchApiWorkers = async () => {
    setIsLoadingApiWorkers(true);
    setApiError(null);
    try {
      const res = await providerApi.getWorkers();
      if (res.data) {
        setApiWorkers(res.data);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setApiError(error.message || "Gagal memuat data teknisi dari server.");
    } finally {
      setIsLoadingApiWorkers(false);
    }
  };

  useEffect(() => {
    fetchApiWorkers();
  }, []);

  // Modal State for New Worker ("Tambah Teknisi")
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);

  // New Worker Form State (Section 6 Minimal Specification)
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerEmployeeId, setWorkerEmployeeId] = useState("");
  const [workerPosition, setWorkerPosition] = useState("Teknisi Lapangan");
  const [workerCertificate, setWorkerCertificate] = useState("");
  const [workerSpecialization, setWorkerSpecialization] = useState("");
  const [workerServiceDomain, setWorkerServiceDomain] = useState("HVAC & Pendingin");
  const [workerExperienceYears, setWorkerExperienceYears] = useState("3");
  const [workerWorkingDays, setWorkerWorkingDays] = useState<string[]>([
    "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
  ]);
  const [workerWorkingHours, setWorkerWorkingHours] = useState("08:00 - 17:00 WIB");
  const [workerAvatar, setWorkerAvatar] = useState(AVATAR_PRESETS[0].id);
  const [workerInitialStatus, setWorkerInitialStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [workerVehicle, setWorkerVehicle] = useState("Motor Operasional (Honda Vario)");
  const [workerVehicleNumber, setWorkerVehicleNumber] = useState("");
  const [selectedMasterServiceIds, setSelectedMasterServiceIds] = useState<string[]>([]);

  // Validation errors
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);

  // Modal State for Invitation Generated (Section 7)
  const [invitationModalData, setInvitationModalData] = useState<{
    workerName: string;
    workerEmail: string;
    invitationUrl: string;
    invitationPath: string;
    token?: string;
    copied?: boolean;
  } | null>(null);

  // Modal State for Worker Detail (Section 5)
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState<ApiWorker | null>(null);

  // Modal State for Edit / "Kelola Kompetensi"
  const [managingWorker, setManagingWorker] = useState<WorkerTechnician | null>(null);
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<string[]>([]);
  const [editCapabilityError, setEditCapabilityError] = useState<string | null>(null);

  // Leave / Cuti schedule state
  const [leaveModalWorker, setLeaveModalWorker] = useState<WorkerTechnician | null>(null);
  const [leaveDate, setLeaveDate] = useState("2026-09-25");
  const [leaveReason, setLeaveReason] = useState("Cuti Tahunan / Istirahat Bergilir");

  const resetAddWorkerForm = () => {
    setWorkerName("");
    setWorkerPhone("");
    setWorkerEmail("");
    setWorkerEmployeeId("");
    setWorkerPosition("Teknisi Lapangan");
    setWorkerCertificate("");
    setWorkerSpecialization("");
    setWorkerServiceDomain("HVAC & Pendingin");
    setWorkerExperienceYears("3");
    setWorkerWorkingDays(["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]);
    setWorkerWorkingHours("08:00 - 17:00 WIB");
    setWorkerAvatar(AVATAR_PRESETS[0].id);
    setWorkerInitialStatus("ONLINE");
    setWorkerVehicle("Motor Operasional (Honda Vario)");
    setWorkerVehicleNumber("");
    setSelectedMasterServiceIds([]);
    setStep1Error(null);
    setCapabilityError(null);
    setAddStep(1);
  };

  const handleOpenAddModal = () => {
    resetAddWorkerForm();
    setShowAddModal(true);
  };

  const handleNextStep = () => {
    if (!workerName.trim() || workerName.trim().length < 3) {
      setStep1Error("Nama lengkap teknisi wajib diisi (minimal 3 karakter).");
      return;
    }
    if (!workerEmail.trim() || !workerEmail.includes("@")) {
      setStep1Error("Email teknisi wajib diisi dengan format valid untuk pengiriman undangan.");
      return;
    }
    if (!workerPhone.trim() || workerPhone.trim().length < 10) {
      setStep1Error("Nomor WhatsApp/Telepon teknisi wajib diisi (minimal 10 digit).");
      return;
    }
    if (!workerVehicleNumber.trim() || workerVehicleNumber.trim().length < 4) {
      setStep1Error("Nomor pelat kendaraan operasional wajib diisi.");
      return;
    }

    setStep1Error(null);
    setAddStep(2);
  };

  const handleCreateWorker = async () => {
    if (!workerEmail.trim()) {
      setCapabilityError("Email teknisi wajib diisi untuk pendaftaran akun.");
      return;
    }
    if (selectedMasterServiceIds.length === 0) {
      setCapabilityError("Minimal pilih 1 layanan sebagai kompetensi teknisi.");
      return;
    }

    setIsSubmittingWorker(true);
    setCapabilityError(null);

    try {
      const res = await providerApi.createWorker({
        fullName: workerName.trim(),
        email: workerEmail.trim(),
        phone: workerPhone.trim(),
        employeeId: workerEmployeeId.trim() || undefined,
        position: workerPosition.trim() || "Teknisi Lapangan",
        skills: [workerCertificate.trim() || "Teknisi Lapangan"],
        specialization: workerSpecialization.trim() ? [workerSpecialization.trim()] : ["Umum"],
        serviceDomain: workerServiceDomain.trim() || "Service & Maintenance",
        experienceYears: Number(workerExperienceYears) || 1,
        workingDays: workerWorkingDays,
        workingHours: workerWorkingHours,
        vehicleNumber: `${workerVehicleNumber.trim()} (${workerVehicle})`,
        masterServiceIds: selectedMasterServiceIds,
      });

      // Synchronize in domain repository bridge as well
      addWorker(
        {
          providerId: currentProviderId,
          providerName: providerName,
          name: workerName.trim(),
          phone: workerPhone.trim(),
          email: workerEmail.trim(),
          rating: 5.0,
          completedJobs: 0,
          skills: [workerCertificate || "Teknisi Lapangan"],
          isOnline: workerInitialStatus === "ONLINE",
          currentLocation: {
            lat: -6.2,
            lng: 106.8,
            address: "Workshop Pusat",
          },
          vehicleNumber: `${workerVehicleNumber.trim()} (${workerVehicle})`,
        },
        selectedMasterServiceIds
      );

      const payload = res as unknown as {
        invitationUrl?: string;
        invitationPath?: string;
        debugInvitationToken?: string;
        data?: { invitationUrl?: string; invitationPath?: string; debugInvitationToken?: string };
      };

      const invUrl = payload.invitationUrl || payload.data?.invitationUrl || `/auth/invitation?token=${payload.debugInvitationToken || payload.data?.debugInvitationToken || ""}`;
      const invPath = payload.invitationPath || payload.data?.invitationPath || invUrl;

      setInvitationModalData({
        workerName: workerName.trim(),
        workerEmail: workerEmail.trim(),
        invitationUrl: invUrl,
        invitationPath: invPath,
        token: payload.debugInvitationToken || payload.data?.debugInvitationToken,
        copied: false,
      });

      setToastMessage(`Teknisi ${workerName} berhasil didaftarkan! Tautan undangan telah dibuat.`);
      setShowAddModal(false);
      resetAddWorkerForm();
      await fetchApiWorkers();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setCapabilityError(error.message || "Gagal mendaftarkan teknisi ke server.");
    } finally {
      setIsSubmittingWorker(false);
    }
  };

  // Open "Kelola Kompetensi" for a worker
  const handleOpenManageCompetency = (worker: WorkerTechnician) => {
    setManagingWorker(worker);
    const apiWorker = apiWorkers.find((aw) => aw.id === worker.id);
    let initialIds: string[] = [];

    if (apiWorker && apiWorker.capabilities && apiWorker.capabilities.length > 0) {
      initialIds = apiWorker.capabilities.map((c: any) =>
        typeof c === "string" ? c : (c.masterServiceId || c.id)
      ).filter(Boolean);
    } else {
      const existingCaps = repo.getWorkerCapabilities(worker.id);
      initialIds = (existingCaps.length > 0 ? existingCaps : worker.capabilities || []).map(
        (c: any) => typeof c === "string" ? c : (c.masterServiceId || c.id)
      ).filter(Boolean);
    }

    setEditSelectedServiceIds(initialIds);
    setEditCapabilityError(null);
  };

  const handleSaveManageCompetency = async () => {
    if (!managingWorker) return;
    if (editSelectedServiceIds.length === 0) {
      setEditCapabilityError("Minimal pilih 1 layanan sebagai kompetensi teknisi.");
      return;
    }

    try {
      await providerApi.updateWorker(managingWorker.id, {
        masterServiceIds: editSelectedServiceIds,
      });

      // Keep local repo state in sync as fallback
      setWorkerCapabilities(managingWorker.id, currentProviderId, editSelectedServiceIds);

      await fetchApiWorkers();

      setToastMessage(
        `Kompetensi layanan untuk ${managingWorker.name} berhasil diperbarui (${editSelectedServiceIds.length} layanan).`
      );
      setManagingWorker(null);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setEditCapabilityError(error.message || "Gagal memperbarui kompetensi teknisi ke server.");
    }
  };

  const handleSaveLeave = () => {
    if (!leaveModalWorker) return;
    updateWorkerStatus(leaveModalWorker.id, false);
    setToastMessage(`Jadwal libur teknisi ${leaveModalWorker.name} pada ${leaveDate} berhasil disimpan.`);
    setLeaveModalWorker(null);
  };

  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("ALL");
  const [filterService, setFilterService] = useState<string>("ALL");

  // Cascading Category, Subcategory, and Layanan options for Worker List toolbar (Section 14)
  const workerListCategories = useMemo(() => {
    const map = new Map<string, string>();
    providerMasterServices.forEach((s) => {
      if (s.categoryId) map.set(s.categoryId, s.categoryName || s.categoryId);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [providerMasterServices]);

  const workerListSubcategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; categoryId: string }>();
    providerMasterServices.forEach((s) => {
      if (s.subcategoryId) {
        if (filterCategory === "ALL" || s.categoryId === filterCategory) {
          map.set(s.subcategoryId, {
            id: s.subcategoryId,
            name: s.subcategoryName || s.subcategoryId,
            categoryId: s.categoryId,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [providerMasterServices, filterCategory]);

  const workerListServices = useMemo(() => {
    return providerMasterServices.filter((s) => {
      if (filterCategory !== "ALL" && s.categoryId !== filterCategory) return false;
      if (filterSubcategory !== "ALL" && s.subcategoryId !== filterSubcategory) return false;
      return true;
    });
  }, [providerMasterServices, filterCategory, filterSubcategory]);

  const handleCategoryFilterChange = (catId: string) => {
    setFilterCategory(catId);
    setFilterSubcategory("ALL");
    setFilterService("ALL");
  };

  const handleSubcategoryFilterChange = (subId: string) => {
    setFilterSubcategory(subId);
    setFilterService("ALL");
  };

  // Harmonized workers list prioritizing real data from MongoDB API
  const workersList: WorkerTechnician[] = useMemo(() => {
    if (!isLoadingApiWorkers) {
      return apiWorkers.map((aw) => ({
        id: aw.id,
        providerId: aw.providerId || currentProviderId,
        providerName: aw.providerName || providerName,
        name: aw.fullName || aw.name,
        phone: aw.phone,
        email: aw.email,
        rating: aw.rating || 5.0,
        completedJobs: aw.completedJobs || 0,
        skills: aw.skills && aw.skills.length > 0 ? aw.skills : [aw.position || "Teknisi Lapangan"],
        isOnline: aw.isOnline ?? (aw.status === "ACTIVE"),
        currentLocation: {
          lat: -6.2,
          lng: 106.8,
          address: "Workshop Pusat",
        },
        vehicleNumber: aw.vehicleNumber || "Motor Operasional",
        capabilities: (aw.capabilities || []).map((capItem: any, idx: number) => {
          const capId = typeof capItem === "string" ? capItem : (capItem.masterServiceId || capItem.id || `cap-${idx}`);
          return {
            id: `cap-${aw.id}-${capId}-${idx}`,
            workerId: aw.id,
            providerId: aw.providerId || currentProviderId,
            masterServiceId: capId,
            assignedAt: "2026-09-25",
            status: "ACTIVE" as const,
          };
        }),
      }));
    }
    return [];
  }, [isLoadingApiWorkers, apiWorkers, currentProviderId, providerName]);

  const filteredWorkers = workersList.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (worker.vehicleNumber && worker.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === "ONLINE" && !worker.isOnline) return false;
    if (filterStatus === "OFFLINE" && worker.isOnline) return false;

    // Capability filters (Section 14: Category, Subcategory, Master Service)
    const caps = repo.getWorkerCapabilities(worker.id);
    const activeCaps = caps.length > 0 ? caps : worker.capabilities || [];

    if (filterCategory !== "ALL") {
      const hasCat = activeCaps.some((c) => c.categoryId === filterCategory);
      if (!hasCat) return false;
    }

    if (filterSubcategory !== "ALL") {
      const hasSubcat = activeCaps.some((c) => c.subcategoryId === filterSubcategory);
      if (!hasSubcat) return false;
    }

    if (filterService !== "ALL") {
      const hasSvc = activeCaps.some((c) => c.masterServiceId === filterService);
      if (!hasSvc) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 font-body text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Manajemen Tim Teknisi Lapangan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky text-primary border border-sky-light flex items-center gap-1.5">
              {isLoadingApiWorkers && <SpinnerGap size={12} className="animate-spin" />}
              <span>{workersList.length} Personel</span>
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Kelola penugasan teknisi, jadwal kerja/cuti, dan kualifikasi keahlian bersertifikat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApiWorkers}
            disabled={isLoadingApiWorkers}
            className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Muat ulang data dari MongoDB"
          >
            <ArrowsClockwise size={15} className={isLoadingApiWorkers ? "animate-spin" : ""} />
            <span>Sinkron Data</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 self-start sm:self-auto bg-[#0F4C81] hover:bg-sky-900 text-white"
          >
            <UserPlus size={16} weight="bold" />
            <span>+ Tambah Teknisi</span>
          </Button>
        </div>
      </div>

      {/* Competency Workforce Linkage Banner */}
      <div className="bg-sky-50/70 rounded-2xl border border-sky-200/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-white text-[#0F4C81] border border-sky-200 shadow-2xs">
            <Certificate size={20} weight="duotone" />
          </span>
          <div>
            <p className="font-bold text-slate-900">Kapasitas &amp; Penguasaan Layanan Teknisi</p>
            <p className="text-[11px] text-slate-600">
              Personel teknisi dapat langsung dipetakan kapabilitasnya ke {providerMasterServices.length} Provider Master Service aktif saat pendaftaran teknisi baru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/provider/services"
            className="text-xs font-bold text-[#0F4C81] hover:underline"
          >
            Lihat Katalog Layanan &rarr;
          </Link>
        </div>
      </div>

      {/* Filter & Search Ribbon (Section 14: Search, Status, Category, Subcategory, Layanan) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-servio-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama teknisi, nomor pelat kendaraan, atau sertifikasi keahlian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(["ALL", "ONLINE", "OFFLINE"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                  filterStatus === status
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                }`}
              >
                {status === "ALL" ? "Semua" : status === "ONLINE" ? "Siap / On Duty" : "Cuti / Off"}
              </button>
            ))}
          </div>
        </div>

        {/* Section 14: Cascading Capability Filters (Category, Subcategory, Layanan) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Filter Kategori:
            </label>
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryFilterChange(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Kategori ({workerListCategories.length})</option>
              {workerListCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              Filter Subkategori:
            </label>
            <select
              value={filterSubcategory}
              onChange={(e) => handleSubcategoryFilterChange(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Subkategori ({workerListSubcategories.length})</option>
              {workerListSubcategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 block">
                Filter Layanan:
              </label>
              {(filterCategory !== "ALL" || filterSubcategory !== "ALL" || filterService !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("ALL");
                    setFilterSubcategory("ALL");
                    setFilterService("ALL");
                  }}
                  className="text-[10px] text-rose-600 font-bold hover:underline"
                >
                  Reset Filter Layanan
                </button>
              )}
            </div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Layanan ({workerListServices.length})</option>
              {workerListServices.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Workers Grid or Empty State */}
      {filteredWorkers.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="Tidak Ada Teknisi Ditemukan"
          description={
            searchQuery || filterStatus !== "ALL"
              ? "Tidak ada data teknisi yang sesuai dengan kriteria filter saat ini."
              : "Belum ada personel teknisi yang terdaftar di bengkel Anda."
          }
          action={{
            label: "Reset Filter",
            onClick: () => {
              setSearchQuery("");
              setFilterStatus("ALL");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((worker) => {
            const caps = repo.getWorkerCapabilities(worker.id);
            const activeCaps = caps.length > 0 ? caps : worker.capabilities || [];
            const uniqueCats = Array.from(new Set(activeCaps.map((c) => c.categoryName || c.categoryId).filter(Boolean)));
            const uniqueSubcats = Array.from(new Set(activeCaps.map((c) => c.subcategoryName || c.subcategoryId).filter(Boolean)));

            return (
              <div
                key={worker.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-servio-xs hover:shadow-servio transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top row: Name, rating, status badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center font-bold text-base font-display shrink-0">
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm font-display text-neutral-dark">{worker.name}</h3>
                        <p className="text-xs text-neutral-slate flex items-center gap-1 mt-0.5">
                          <Phone size={13} />
                          <span>{worker.phone}</span>
                        </p>
                        {worker.email && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <EnvelopeSimple size={12} />
                            <span>{worker.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => updateWorkerStatus(worker.id, !worker.isOnline)}
                      title="Klik untuk toggle status kehadiran"
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        worker.isOnline
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {worker.isOnline ? "● SIAP" : "○ CUTI/OFF"}
                    </button>
                  </div>

                  {/* Performance & Vehicle info */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-neutral-slate">
                      <Star size={15} weight="fill" className="text-amber-500" />
                      <span className="font-bold text-neutral-dark">{worker.rating}</span>
                      <span className="text-[10px]">({worker.completedJobs} job)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-slate truncate" title={worker.vehicleNumber}>
                      <Car size={15} className="text-primary shrink-0" />
                      <span className="text-[11px] truncate font-medium">{worker.vehicleNumber || "Motor Bengkel"}</span>
                    </div>
                  </div>

                  {/* Skills / Certification Tags */}
                  {worker.skills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {worker.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dedicated Worker Competency Display (Category -> Subcategory -> Master Service) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                        <Certificate size={13} className="text-[#0F4C81]" />
                        <span>Kompetensi Layanan:</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-[#0F4C81]">
                        {uniqueCats.length} Kat • {uniqueSubcats.length} Subkat • {activeCaps.length} Layanan
                      </span>
                    </div>

                    {activeCaps.length === 0 ? (
                      <p className="text-[11px] text-amber-600 italic">
                        Belum ada kompetensi layanan yang ditetapkan.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {activeCaps.map((cap) => (
                            <span
                              key={cap.id}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200/70 flex items-center gap-1"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>{cap.masterServiceName || cap.masterServiceId}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions: Detail, Kelola Kompetensi, Cuti & Tugaskan */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const match = apiWorkers.find((aw) => aw.id === worker.id);
                        if (match) {
                          setSelectedWorkerDetail(match);
                        } else {
                          setSelectedWorkerDetail({
                            id: worker.id,
                            fullName: worker.name,
                            name: worker.name,
                            email: worker.email || "-",
                            phone: worker.phone,
                            role: "WORKER_TECHNICIAN",
                            status: worker.isOnline ? "ACTIVE" : "OFFLINE",
                            employeeId: "WRK-" + worker.id.slice(-3).toUpperCase(),
                            position: "Teknisi Lapangan",
                            skills: worker.skills,
                            specialization: ["Teknisi Lapangan"],
                            serviceDomain: "HVAC & Pendingin",
                            experienceYears: 3,
                            availability: {
                              workingDays: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
                              workingHours: "08:00 - 17:00 WIB",
                            },
                            isOnline: worker.isOnline,
                            rating: worker.rating,
                            completedJobs: worker.completedJobs,
                            vehicleNumber: worker.vehicleNumber,
                            capabilities: (worker.capabilities || []).map((c) => c.masterServiceId),
                            lastLoginAt: null,
                            createdAt: "2026-09-25",
                          });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs py-1.5"
                    >
                      <Eye size={14} />
                      <span>Detail Akun</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenManageCompetency(worker)}
                      className="w-full flex items-center justify-center gap-1.5 border-[#0F4C81]/30 text-[#0F4C81] hover:bg-sky-50 text-xs py-1.5"
                    >
                      <SlidersHorizontal size={14} />
                      <span>Kompetensi</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLeaveModalWorker(worker)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
                    >
                      <CalendarCheck size={14} />
                      <span>Atur Libur</span>
                    </Button>

                    <Link
                      href="/provider/bookings"
                      className="flex-1 py-1.5 px-3 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Briefcase size={14} />
                      <span>Tugaskan</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Canonical Modal: "Tambah Teknisi" (Multi-Step Creation + Multi-Service Capability) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Teknisi"
      >
        <div className="space-y-4">
          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setAddStep(1)}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-xl transition-colors ${
                addStep === 1
                  ? "bg-[#0F4C81] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Data Identitas Teknisi</span>
            </button>

            <span className="text-slate-300 font-bold">&rarr;</span>

            <button
              type="button"
              onClick={() => {
                if (workerName && workerPhone && workerVehicleNumber) {
                  setAddStep(2);
                } else {
                  handleNextStep();
                }
              }}
              className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-xl transition-colors ${
                addStep === 2
                  ? "bg-[#0F4C81] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Kompetensi Layanan</span>
            </button>
          </div>

          {/* STEP 1: DATA IDENTITAS WORKER */}
          {addStep === 1 && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-slate-700 flex items-start gap-2">
                <Info size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
                <p>
                  Isi data profil dan operasional teknisi. Setelah ini, Anda akan langsung menetapkan kompetensi Provider Master Service yang dikuasai teknisi.
                </p>
              </div>

              {step1Error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-center gap-2">
                  <X size={15} weight="bold" />
                  <span>{step1Error}</span>
                </div>
              )}

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Nama Lengkap Teknisi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Nomor WhatsApp / Telepon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="0812-3456-7890"
                    value={workerPhone}
                    onChange={(e) => setWorkerPhone(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  />
                </div>
              </div>

              {/* Email & Employee ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Email Teknisi (Untuk Undangan) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="teknisi@servio.id"
                    value={workerEmail}
                    onChange={(e) => setWorkerEmail(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Employee ID / Worker ID (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatis jika kosong (misal: WRK-002)"
                    value={workerEmployeeId}
                    onChange={(e) => setWorkerEmployeeId(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  />
                </div>
              </div>

              {/* Technical Profile Section */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                  Profil Teknis &amp; Keahlian (Section 6)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Posisi / Jabatan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Teknisi Lapangan HVAC"
                      value={workerPosition}
                      onChange={(e) => setWorkerPosition(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Domain Layanan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: HVAC & Pendingin"
                      value={workerServiceDomain}
                      onChange={(e) => setWorkerServiceDomain(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Spesialisasi Keahlian
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: AC Split Inverter, VRV, Chiller"
                      value={workerSpecialization}
                      onChange={(e) => setWorkerSpecialization(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Pengalaman Kerja (Tahun)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="3"
                      value={workerExperienceYears}
                      onChange={(e) => setWorkerExperienceYears(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule & Availability Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                  Jadwal &amp; Ketersediaan Operasional
                </h4>

                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Hari Kerja Aktif:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => {
                      const isChecked = workerWorkingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setWorkerWorkingDays(workerWorkingDays.filter((d) => d !== day));
                            } else {
                              setWorkerWorkingDays([...workerWorkingDays, day]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            isChecked
                              ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Jam Kerja Operasional
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 08:00 - 17:00 WIB"
                      value={workerWorkingHours}
                      onChange={(e) => setWorkerWorkingHours(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-dark block mb-1">
                      Status Awal Kehadiran <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setWorkerInitialStatus("ONLINE")}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-colors ${
                          workerInitialStatus === "ONLINE"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        ● Siap / On Duty
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkerInitialStatus("OFFLINE")}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold border transition-colors ${
                          workerInitialStatus === "OFFLINE"
                            ? "bg-slate-200 text-slate-800 border-slate-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        ○ Cuti / Off
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Invitation Note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
                <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
                <p>
                  <strong>Aktivasi Mandiri (Section 7):</strong> Password tidak diinput oleh Provider. Sistem SERVIO secara otomatis mengenerate tautan undangan aktivasi akun agar teknisi dapat membuat kata sandi mandiri secara aman.
                </p>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="font-bold text-neutral-dark block mb-1">
                  Foto / Avatar Profil
                </label>
                <div className="flex items-center gap-3">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setWorkerAvatar(preset.id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-transform ${
                        preset.color
                      } ${
                        workerAvatar === preset.id
                          ? "ring-3 ring-[#0F4C81] ring-offset-2 scale-105"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {workerName ? workerName.charAt(0) : preset.label.charAt(preset.label.length - 1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle & Plate Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Jenis Kendaraan Operasional
                  </label>
                  <select
                    value={workerVehicle}
                    onChange={(e) => setWorkerVehicle(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                  >
                    <option value="Motor Operasional (Honda Vario)">Motor Operasional (Honda Vario)</option>
                    <option value="Motor Operasional (Yamaha NMAX)">Motor Operasional (Yamaha NMAX)</option>
                    <option value="Mobil Servis Van (Daihatsu Gran Max)">Mobil Servis Van (Daihatsu Gran Max)</option>
                    <option value="Mobil Pickup Operasional (Suzuki Carry)">Mobil Pickup Operasional (Suzuki Carry)</option>
                    <option value="Kendaraan Pribadi Teknisi">Kendaraan Pribadi Teknisi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-neutral-dark block mb-1">
                    Nomor Pelat Kendaraan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: B 1234 ABC"
                    value={workerVehicleNumber}
                    onChange={(e) => setWorkerVehicleNumber(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                  />
                </div>
              </div>

              {/* Certification */}
              <div>
                <label className="font-bold text-neutral-dark block mb-1">
                  Sertifikasi Teknis (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BNSP Teknisi AC Level 2 / K3 Listrik"
                  value={workerCertificate}
                  onChange={(e) => setWorkerCertificate(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleNextStep}
                  className="bg-[#0F4C81] hover:bg-sky-900 text-white"
                >
                  Lanjut: Pilih Kompetensi Layanan &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: KOMPETENSI LAYANAN (PROVIDER MASTER SERVICE MAPPING) */}
          {addStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-slate-700 flex items-start gap-2">
                <Info size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">
                    Pilih Provider Master Service yang Dikuasai Teknisi
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Kategori &amp; Subkategori otomatis terdeteksi dari Master Service yang dipilih. Worker tidak memilih kategori secara manual.
                  </p>
                </div>
              </div>

              <WorkerCompetencySelector
                providerMasterServices={providerMasterServices}
                selectedServiceIds={selectedMasterServiceIds}
                onChangeSelectedServiceIds={(ids) => {
                  setSelectedMasterServiceIds(ids);
                  if (ids.length > 0) setCapabilityError(null);
                }}
                errorMessage={capabilityError}
              />

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddStep(1)}
                >
                  &larr; Kembali ke Data Teknisi
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingWorker}
                  onClick={handleCreateWorker}
                  className="bg-[#0F4C81] hover:bg-sky-900 text-white flex items-center gap-1.5"
                >
                  {isSubmittingWorker ? (
                    <>
                      <SpinnerGap size={14} className="animate-spin" />
                      <span>Mendaftarkan Teknisi...</span>
                    </>
                  ) : (
                    <span>Simpan Teknisi &amp; Buat Undangan</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Canonical Modal: "Kelola Kompetensi: [Nama Worker]" */}
      <Modal
        isOpen={Boolean(managingWorker)}
        onClose={() => setManagingWorker(null)}
        title={managingWorker ? `Kelola Kompetensi: ${managingWorker.name}` : "Kelola Kompetensi"}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-slate-700 flex items-start gap-2">
            <Info size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">
                Ubah Kompetensi Layanan Teknisi ({managingWorker?.name})
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Centang atau hapus Master Service yang dikuasai teknisi. Kategori dan subkategori akan otomatis diperbarui.
              </p>
            </div>
          </div>

          <WorkerCompetencySelector
            providerMasterServices={providerMasterServices}
            selectedServiceIds={editSelectedServiceIds}
            onChangeSelectedServiceIds={(ids) => {
              setEditSelectedServiceIds(ids);
              if (ids.length > 0) setEditCapabilityError(null);
            }}
            errorMessage={editCapabilityError}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManagingWorker(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveManageCompetency}
              className="bg-[#0F4C81] hover:bg-sky-900 text-white"
            >
              Simpan Perubahan Kompetensi
            </Button>
          </div>
        </div>
      </Modal>

      {/* Accessible Modal: Atur Jadwal Libur / Cuti */}
      <Modal
        isOpen={Boolean(leaveModalWorker)}
        onClose={() => setLeaveModalWorker(null)}
        title="Atur Jadwal Cuti / Libur"
      >
        <div className="space-y-4 text-xs">
          <p className="text-neutral-slate">
            Teknisi: <strong className="text-neutral-dark">{leaveModalWorker?.name}</strong>
          </p>

          <div>
            <label className="font-bold text-neutral-dark block mb-1">Tanggal Mulai Cuti:</label>
            <input
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-dark block mb-1">Keterangan / Alasan:</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveModalWorker(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveLeave}
            >
              Simpan Jadwal Cuti
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Tautan Undangan Teknisi (Section 7) */}
      <Modal
        isOpen={Boolean(invitationModalData)}
        onClose={() => setInvitationModalData(null)}
        title="Undangan Aktivasi Akun Teknisi"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle size={24} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-emerald-900">
                Akun Teknisi Berhasil Didaftarkan!
              </h4>
              <p className="text-emerald-700 mt-1">
                Akun atas nama <strong>{invitationModalData?.workerName}</strong> (
                {invitationModalData?.workerEmail}) telah dibuat dengan status{" "}
                <span className="font-bold uppercase">PENDING_ACTIVATION</span>.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">
              Tautan Undangan &amp; Pembuatan Kata Sandi Mandiri:
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 break-all select-all flex items-center justify-between gap-2">
              <span className="line-clamp-2">{invitationModalData?.invitationUrl}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (invitationModalData?.invitationUrl) {
                    navigator.clipboard.writeText(invitationModalData.invitationUrl);
                    setInvitationModalData((prev) => (prev ? { ...prev, copied: true } : null));
                    setTimeout(() => {
                      setInvitationModalData((prev) => (prev ? { ...prev, copied: false } : null));
                    }, 2000);
                  }
                }}
                className="shrink-0 flex items-center gap-1 bg-white hover:bg-slate-100"
              >
                {invitationModalData?.copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
            <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
            <div>
              <strong>Keamanan Akun:</strong> Provider tidak mengetahui kata sandi teknisi. Teknisi harus membuka tautan ini untuk menetapkan kata sandi mandiri sebelum dapat login ke SERVIO.
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {invitationModalData?.invitationPath && (
              <a
                href={invitationModalData.invitationPath}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
              >
                Buka Halaman Aktivasi &rarr;
              </a>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInvitationModalData(null)}
              className="bg-[#0F4C81] text-white hover:bg-sky-900 ml-auto"
            >
              Selesai
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detail Personel Teknisi (Section 5) */}
      <Modal
        isOpen={Boolean(selectedWorkerDetail)}
        onClose={() => setSelectedWorkerDetail(null)}
        title="Detail Personel Teknisi"
      >
        {selectedWorkerDetail && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-sky-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                {(selectedWorkerDetail.fullName || selectedWorkerDetail.name || "TK").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    {selectedWorkerDetail.fullName || selectedWorkerDetail.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedWorkerDetail.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedWorkerDetail.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Employee ID: {selectedWorkerDetail.employeeId || selectedWorkerDetail.workerCode || "-"}
                </p>
              </div>
            </div>

            {/* Profile & Contact */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Profil Identitas &amp; Kontak (Section 5)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Nama Lengkap:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.fullName || selectedWorkerDetail.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Nomor Telepon:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.phone || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Email:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.email || "-"}</span>
                </div>
              </div>
            </div>

            {/* Technical Profile */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Profil Teknis &amp; Keahlian
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Posisi / Jabatan:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.position || "Teknisi Lapangan"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Domain Layanan:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.serviceDomain || "Service & Maintenance"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pengalaman Kerja:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.experienceYears ? `${selectedWorkerDetail.experienceYears} Tahun` : "-"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kendaraan Operasional:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.vehicleNumber || "Motor Operasional"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block mb-1">Keahlian &amp; Sertifikasi:</span>
                  <div className="flex flex-wrap gap-1">
                    {(selectedWorkerDetail.skills || []).map((sk, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule & Availability */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Jadwal &amp; Ketersediaan Operasional
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Hari Kerja:</span>
                  <span className="font-bold text-slate-900">
                    {selectedWorkerDetail.availability?.workingDays?.join(", ") || "Senin - Sabtu"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jam Operasional:</span>
                  <span className="font-bold text-slate-900">
                    {selectedWorkerDetail.availability?.workingHours || "08:00 - 17:00 WIB"}
                  </span>
                </div>
              </div>
            </div>

            {/* Account & Security Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2">
              <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Informasi Akun (Section 5)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Status Akun:</span>
                  <span className="font-bold text-slate-900">{selectedWorkerDetail.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Terakhir Masuk:</span>
                  <span className="font-bold text-slate-900">
                    {selectedWorkerDetail.lastLoginAt ? new Date(selectedWorkerDetail.lastLoginAt).toLocaleString("id-ID") : "Belum pernah masuk"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Tanggal Pendaftaran:</span>
                  <span className="font-bold text-slate-900">
                    {selectedWorkerDetail.createdAt ? new Date(selectedWorkerDetail.createdAt).toLocaleDateString("id-ID") : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Performa &amp; Rating:</span>
                  <span className="font-bold text-slate-900">
                    ★ {selectedWorkerDetail.rating || 5.0} ({selectedWorkerDetail.completedJobs || 0} job)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedWorkerDetail(null)}
                className="bg-[#0F4C81] text-white hover:bg-sky-900"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
