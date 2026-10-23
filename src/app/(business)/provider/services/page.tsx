"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { providerServiceApi, providerWarrantyApi, taxonomyApi, serviceDefinitionApi, ApiProviderMasterService, OFFICIAL_CITIES } from "@/lib/servioApi";
import { useAfterSales } from "@/features/afterSales/useAfterSales";
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
  Table,
  SquaresFour,
  Eye,
  Copy,
  CalendarBlank,
  Code,
  X,
  UploadSimple,
  Images,
  Trash,
  Star,
  WarningCircle,
  Power,
  Archive,
  ArrowCounterClockwise,
  XCircle,
} from "@phosphor-icons/react";
import { ProviderMasterService, ProviderServiceMethod } from "@/types/domain";

export interface ExtendedProviderMasterService extends ProviderMasterService {
  serviceDefinitionId?: string;
  canonicalName?: string;
  priceModel?: string;
  currency?: string;
  surveyAvailability?: string;
  surveyRequirement?: string;
  surveyFeeModel?: string;
  durationMin?: number | null;
  durationMax?: number | null;
  durationUnit?: string | null;
  coverageCityCodes?: string[];
  includedItems?: string[];
  excludedItems?: string[];
  customerRequirements?: string[];
  media?: { id: string; url: string; is_primary?: boolean; sort_order?: number }[];
  thumbnailUrl?: string;
  lockVersion?: number;
  rawOffering?: any;
}


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

  // After-Sales Phase 07 Preset Integration
  const { warrantyPresets } = useAfterSales();
  const activeProviderPresets = useMemo(() => {
    return (warrantyPresets || []).filter(
      (p: any) => (p.organizationId === currentProviderId || p.organizationType === "PROVIDER") && p.isActive
    );
  }, [warrantyPresets, currentProviderId]);
  const [selectedServicePresetId, setSelectedServicePresetId] = useState<string>("preset-prov-01");
  const [editSelectedServicePresetId, setEditSelectedServicePresetId] = useState<string>("preset-prov-01");

  // View Mode: Table (Analitik & Rapi) by default, Grid as option
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");
  const [inspectingService, setInspectingService] = useState<ExtendedProviderMasterService | null>(null);
  const [inspectTab, setInspectTab] = useState<"ANALYSIS" | "JSON">("ANALYSIS");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const getCityInfo = (code: string) => {
    return OFFICIAL_CITIES.find((c) => c.code === code) || { code, name: code, province: "Indonesia" };
  };

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

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
        const warData = warRes.value.data as any;
        setApiStoreActive(
          warData.settings?.status === "ACTIVE" ||
          warData.isStoreActive === true ||
          warData.status === "ACTIVE"
        );
        if (Array.isArray(warData.activeDurations)) {
          setApiWarrantyDurations(
            warData.activeDurations.map((d: any) => ({
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
  const [surveyFeeType, setSurveyFeeType] = useState<"FREE" | "PAID">("FREE");
  const [surveyFee, setSurveyFee] = useState<number>(0);
  const [durationMin, setDurationMin] = useState<number>(1);
  const [durationMax, setDurationMax] = useState<number>(2);
  const [durationUnit, setDurationUnit] = useState<"MINUTE" | "HOUR" | "DAY">("HOUR");
  const [selectedCityCodes, setSelectedCityCodes] = useState<string[]>(["JKT-BARAT", "JKT-SEL", "TNG-KOTA"]);

  const handleToggleCityCode = (code: string) => {
    setSelectedCityCodes((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code]
    );
  };

  // Dedicated Confirmation Modal for Archiving Service (replaces native window.confirm)
  const [serviceToArchive, setServiceToArchive] = useState<ExtendedProviderMasterService | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Custom Feedback / Alert Modal (replaces native window.alert)
  interface FeedbackModalState {
    isOpen: boolean;
    type?: "warning" | "error" | "info" | "success";
    title: string;
    message: string;
    onConfirm?: () => void;
  }
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState | null>(null);

  const showFeedback = (
    title: string,
    message: string,
    type: "warning" | "error" | "info" | "success" = "warning",
    onConfirm?: () => void
  ) => {
    setFeedbackModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
    });
  };

  // Edit Service Modal State (Point 4: Edit SEMUA data katalog layanan)
  const [editingService, setEditingService] = useState<ExtendedProviderMasterService | null>(null);
  const [editName, setEditName] = useState("");
  const [editCatId, setEditCatId] = useState("");
  const [editSubId, setEditSubId] = useState("");
  const [editPriceMin, setEditPriceMin] = useState<number>(0);
  const [editPriceMax, setEditPriceMax] = useState<number>(0);
  const [editSurveyFeeType, setEditSurveyFeeType] = useState<"FREE" | "PAID">("FREE");
  const [editSurveyFee, setEditSurveyFee] = useState<number>(0);
  const [editDesc, setEditDesc] = useState("");
  const [editDurationMin, setEditDurationMin] = useState<number>(1);
  const [editDurationMax, setEditDurationMax] = useState<number>(2);
  const [editDurationUnit, setEditDurationUnit] = useState<"MINUTE" | "HOUR" | "DAY">("HOUR");
  const [editCityCodes, setEditCityCodes] = useState<string[]>([]);
  const [editExistingMedia, setEditExistingMedia] = useState<{ id: string; url: string; is_primary?: boolean }[]>([]);
  const [editNewPhotos, setEditNewPhotos] = useState<File[]>([]);
  const [editNewPhotoPreviews, setEditNewPhotoPreviews] = useState<{ file: File; previewUrl: string; isPrimary: boolean }[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isEditDragOver, setIsEditDragOver] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleEditCityCode = (code: string) => {
    setEditCityCodes((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code]
    );
  };

  const handleEditPhotoFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: { file: File; previewUrl: string; isPrimary: boolean }[] = [];

    for (const f of incoming) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        showFeedback("Format Tidak Didukung", `Format file "${f.name}" tidak didukung. Harap gunakan JPG, PNG, atau WEBP.`, "warning");
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        showFeedback("Ukuran Melebihi Batas", `Ukuran foto "${f.name}" melebihi batas 5MB.`, "warning");
        continue;
      }
      validFiles.push(f);
      newPreviews.push({
        file: f,
        previewUrl: URL.createObjectURL(f),
        isPrimary: false,
      });
    }

    if (validFiles.length === 0) return;

    setEditNewPhotos((prev) => [...prev, ...validFiles]);
    setEditNewPhotoPreviews((prev) => {
      const combined = [...prev, ...newPreviews];
      if (editExistingMedia.length === 0 && !combined.some((p) => p.isPrimary) && combined.length > 0) {
        combined[0].isPrimary = true;
      }
      return combined;
    });
  };

  const handleRemoveExistingMedia = async (mediaId: string) => {
    if (!editingService) return;
    try {
      await providerServiceApi.deleteMedia(editingService.id, mediaId);
    } catch {
      // ignore
    }
    setEditExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
  };

  const handleRemoveEditNewPhoto = (index: number) => {
    const removed = editNewPhotoPreviews[index];
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    const nextPreviews = editNewPhotoPreviews.filter((_, i) => i !== index);
    const nextFiles = editNewPhotos.filter((_, i) => i !== index);
    if (removed?.isPrimary && nextPreviews.length > 0) {
      nextPreviews[0].isPrimary = true;
    }
    setEditNewPhotoPreviews(nextPreviews);
    setEditNewPhotos(nextFiles);
  };

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

  // Multi-Photo Upload State for New Service
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<{ file: File; previewUrl: string; isPrimary: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: { file: File; previewUrl: string; isPrimary: boolean }[] = [];

    for (const f of incoming) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        showFeedback("Format Tidak Didukung", `Format file "${f.name}" tidak didukung. Harap gunakan JPG, PNG, atau WEBP.`, "warning");
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        showFeedback("Ukuran Melebihi Batas", `Ukuran foto "${f.name}" melebihi batas 5MB.`, "warning");
        continue;
      }
      validFiles.push(f);
      newPreviews.push({
        file: f,
        previewUrl: URL.createObjectURL(f),
        isPrimary: false,
      });
    }

    if (validFiles.length === 0) return;

    setSelectedPhotos((prev) => [...prev, ...validFiles]);
    setPhotoPreviews((prev) => {
      const combined = [...prev, ...newPreviews];
      if (combined.length > 0 && !combined.some((p) => p.isPrimary)) {
        combined[0].isPrimary = true;
      }
      return combined;
    });
  };

  const handleRemovePhoto = (index: number) => {
    const target = photoPreviews[index];
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const updatedPreviews = photoPreviews.filter((_, i) => i !== index);
    const updatedFiles = selectedPhotos.filter((_, i) => i !== index);
    if (updatedPreviews.length > 0 && !updatedPreviews.some((p) => p.isPrimary)) {
      updatedPreviews[0].isPrimary = true;
    }
    setPhotoPreviews(updatedPreviews);
    setSelectedPhotos(updatedFiles);
  };

  const handleSetPrimaryPhoto = (index: number) => {
    setPhotoPreviews((prev) =>
      prev.map((p, i) => ({
        ...p,
        isPrimary: i === index,
      }))
    );
    setSelectedPhotos((prev) => {
      if (index >= prev.length) return prev;
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  };

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

  const editAvailableSubcategories = useMemo(() => {
    if (!editCatId || !hasLoadedTaxonomy) return [];
    return apiSubcategories.filter(
      (s) => (s.categoryId === editCatId || String(s.categoryId) === String(editCatId)) && s.status === "ACTIVE"
    );
  }, [hasLoadedTaxonomy, apiSubcategories, editCatId]);

  const handleEditCategoryChange = (catId: string) => {
    setEditCatId(catId);
    const subcats = apiSubcategories.filter(
      (s) => (s.categoryId === catId || String(s.categoryId) === String(catId)) && s.status === "ACTIVE"
    );
    setEditSubId(subcats[0]?.id || "");
  };

  // Provider's own services (strictly canonical from API)
  const myServices: ExtendedProviderMasterService[] = useMemo(() => {
    if (!isLoadingServices) {
      return apiServices.map((s: any) => {
        const cat = apiCategories.find((c) => c.id === s.categoryId || c.id === s.service_definition?.category_id);
        const sub = apiSubcategories.find((sc) => sc.id === s.subcategoryId || sc.id === s.service_definition?.subcategory_id);

        return {
          id: s.id || s._id,
          providerId: s.providerId || s.provider_organization_id || currentProviderId,
          providerName: s.providerName || currentProviderName,
          serviceDefinitionId: s.service_definition_id || s.service_definition?.id || "",
          canonicalName: s.service_definition?.name || s.subcategoryName || "Canonical Jasa",
          categoryId: s.categoryId || s.service_definition?.category_id || "",
          categoryName: cat?.name || s.categoryName || s.service_definition?.category_name || "Kategori Layanan",
          subcategoryId: s.subcategoryId || s.service_definition?.subcategory_id || "",
          subcategoryName: sub?.name || s.subcategoryName || s.service_definition?.name || "Jasa Layanan",
          name: s.display_name || s.name || "Layanan Jasa",
          description: s.description || "",
          priceModel: s.pricing?.model || (Number(s.pricing?.min_price_idr ?? 0) === 0 && Number(s.pricing?.max_price_idr ?? 0) === 0 ? "FREE" : "RANGE"),
          priceMin: Number(s.pricing?.min_price_idr ?? s.min_price_idr ?? s.priceMin ?? 0) || 0,
          priceMax: Number(s.pricing?.max_price_idr ?? s.max_price_idr ?? s.priceMax ?? s.pricing?.min_price_idr ?? s.min_price_idr ?? s.priceMin ?? 0) || 0,
          currency: s.pricing?.currency || "IDR",
          surveyAvailability: s.survey?.availability || s.survey_availability || s.surveyAvailability || "AVAILABLE",
          surveyRequirement: s.survey?.requirement || s.survey_requirement || s.surveyRequirement || "OPTIONAL",
          surveyFeeModel: s.survey?.fee_model || s.survey_fee_model || s.surveyFeeModel || ((Number(s.survey?.fee_idr ?? s.survey_fee_idr ?? s.surveyFee ?? 0) || 0) > 0 ? "PAID" : "FREE"),
          surveyFee: (s.survey?.fee_model === "FREE" || s.survey_fee_model === "FREE" || s.surveyFeeModel === "FREE") ? 0 : (Number(s.survey?.fee_idr ?? s.survey_fee_idr ?? s.surveyFee ?? 0) || 0),
          durationMin: s.duration?.min ?? 1,
          durationMax: s.duration?.max ?? 2,
          durationUnit: s.duration?.unit ?? "HOUR",
          coverageCityCodes: Array.isArray(s.coverage_city_codes) ? s.coverage_city_codes : [],
          includedItems: Array.isArray(s.included_items) ? s.included_items : [],
          excludedItems: Array.isArray(s.excluded_items) ? s.excluded_items : [],
          customerRequirements: Array.isArray(s.customer_requirements) ? s.customer_requirements : [],
          serviceMethods: [] as ProviderServiceMethod[],
          status: s.status || "ACTIVE",
          availability: s.availability || "AVAILABLE",
          warrantyConfig: s.warrantyConfig,
          media: Array.isArray(s.media) ? s.media : [],
          thumbnailUrl: s.primary_media?.url || s.thumbnailUrl || (Array.isArray(s.media) && s.media.length > 0 ? s.media[0].url : ""),
          lockVersion: s.lock_version || 1,
          createdAt: s.createdAt || s.created_at,
          updatedAt: s.updatedAt || s.updated_at,
          rawOffering: s,
        };
      });
    }
    return [];
  }, [isLoadingServices, apiServices, apiCategories, apiSubcategories, currentProviderId, currentProviderName]);

  // Status counters
  const totalAllServicesCount = useMemo(() => myServices.length, [myServices]);
  const totalActiveServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "ACTIVE").length;
  }, [myServices]);
  const totalInactiveServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "INACTIVE").length;
  }, [myServices]);
  const totalDraftServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "DRAFT").length;
  }, [myServices]);
  const totalArchivedServicesCount = useMemo(() => {
    return myServices.filter((s) => s.status === "ARCHIVED").length;
  }, [myServices]);

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
    setSurveyFeeType("FREE");
    setSurveyFee(0);
    setDurationMin(1);
    setDurationMax(2);
    setDurationUnit("HOUR");
    setSelectedCityCodes(["JKT-BARAT", "JKT-SEL", "TNG-KOTA"]);
    setWarrantyDurationDays(activeDurations[0]?.durationDays || 30);
    setIsWarrantySupported(isStoreActive);
    photoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (service: ExtendedProviderMasterService) => {
    setEditingService(service);
    setEditName(service.name || (service as any).displayName || "");
    const serviceCatId = (service as any).categoryId || (service as any).service_definition?.category_id || activeCategories[0]?.id || "";
    setEditCatId(serviceCatId);
    setEditSubId((service as any).subcategoryId || (service as any).service_definition?.subcategory_id || "");
    setEditDesc(service.description || "");
    setEditPriceMin(Number(service.priceMin ?? 0));
    setEditPriceMax(Number(service.priceMax ?? 0));

    const rawFee = Number(service.surveyFee ?? (service as any).survey?.fee_idr ?? (service as any).survey_fee_idr ?? 0);
    const rawModel = (service as any).surveyFeeModel || (service as any).survey?.fee_model || (service as any).survey_fee_model;
    const isPaid = rawModel === "PAID" || (rawModel !== "FREE" && rawFee > 0);
    setEditSurveyFeeType(isPaid ? "PAID" : "FREE");
    setEditSurveyFee(isPaid ? (rawFee || 50000) : 0);

    setEditDurationMin((service as any).durationMin || 1);
    setEditDurationMax((service as any).durationMax || 2);
    setEditDurationUnit(((service as any).durationUnit as any) || "HOUR");

    const existingCities = (service as any).coverageCityCodes || (service as any).coverage_city_codes;
    setEditCityCodes(
      Array.isArray(existingCities) && existingCities.length > 0
        ? [...existingCities]
        : ["JKT-BARAT", "JKT-SEL", "TNG-KOTA"]
    );
    setEditExistingMedia(Array.isArray((service as any).media) ? [...(service as any).media] : []);
    setEditNewPhotos([]);
    setEditNewPhotoPreviews([]);

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

  const handleSaveNewService = async (e: React.FormEvent, status: "ACTIVE" | "DRAFT") => {
    e.preventDefault();
    if (!selectedCatId || !selectedSubId || !serviceName.trim()) {
      alert("Harap lengkapi kategori, subkategori, dan nama layanan service.");
      return;
    }

    if (status === "ACTIVE" && selectedPhotos.length === 0) {
      alert("Untuk langsung mengaktifkan layanan (Simpan & Aktifkan), penawaran wajib memiliki minimal 1 foto portofolio utama. Silakan unggah minimal 1 foto portofolio, atau pilih tombol 'Simpan Draf'.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve canonical service definition id matching the selected subcategory
      let defId = "";
      try {
        const defRes = await serviceDefinitionApi.list({ subcategory_id: selectedSubId });
        const list = Array.isArray(defRes.data) ? defRes.data : [];
        if (list.length > 0) {
          defId = list[0].id;
        } else {
          // Fallback: list all definitions and match by subcategory_id or category_id
          const allDefs = await serviceDefinitionApi.list();
          const allList = Array.isArray(allDefs.data) ? allDefs.data : [];
          const matched = allList.find((d: any) => d.subcategory_id === selectedSubId) ||
            allList.find((d: any) => d.category_id === selectedCatId);
          if (matched) {
            defId = matched.id;
          }
        }
      } catch (e) {
        console.warn("Could not query definitions:", e);
      }

      if (!defId) {
        alert("Katalog layanan standar (service definition) untuk subkategori ini belum terdaftar di sistem. Silakan pilih subkategori lain atau hubungi admin.");
        setIsSubmitting(false);
        return;
      }

      // Check if provider already has an offering for this canonical service definition
      const alreadyExists = myServices.some(
        (s) => s.serviceDefinitionId === defId || (s.rawOffering && s.rawOffering.service_definition_id === defId)
      );
      if (alreadyExists) {
        alert("Penyedia jasa Anda sudah memiliki penawaran layanan untuk subkategori ini. Silakan perbarui layanan yang sudah ada atau pilih subkategori lain.");
        setIsSubmitting(false);
        return;
      }

      const isSurveyPaid = surveyFeeType === "PAID" && Number(surveyFee) > 0;

      const created = await providerServiceApi.create({
        service_definition_id: defId,
        display_name: serviceName.trim(),
        description: serviceDesc.trim(),
        pricing: {
          model: Number(priceMin) === 0 && Number(priceMax) === 0 ? "FREE" : "RANGE",
          min_price_idr: Number(priceMin),
          max_price_idr: Number(priceMax),
        },
        survey: {
          availability: "AVAILABLE",
          requirement: "OPTIONAL",
          fee_model: isSurveyPaid ? "PAID" : "FREE",
          fee_idr: isSurveyPaid ? Number(surveyFee) : 0,
        },
        surveyFee: isSurveyPaid ? Number(surveyFee) : 0,
        surveyFeeModel: isSurveyPaid ? "PAID" : "FREE",
        surveyAvailability: "AVAILABLE",
        surveyRequirement: "OPTIONAL",
        duration: {
          min: Number(durationMin) || 1,
          max: Number(durationMax) || 2,
          unit: durationUnit,
        },
        coverage_city_codes: selectedCityCodes,
      });

      const createdOfferingId = (created as any)?.data?.id || (created as any)?.id;

      // Batch upload all selected photos directly to database table service_offering_media
      if (createdOfferingId && selectedPhotos.length > 0) {
        try {
          await providerServiceApi.uploadMultipleMedia(createdOfferingId, selectedPhotos);
        } catch (uploadErr) {
          console.warn("Gagal mengunggah foto ke database:", uploadErr);
        }
      }

      // DEC04-01 Direct Publication: if user chose ACTIVE, immediately activate without approval queue
      if (status === "ACTIVE" && createdOfferingId) {
        try {
          let freshLock = 1;
          try {
            const fresh = await providerServiceApi.get(createdOfferingId);
            if (fresh?.data?.lock_version) freshLock = fresh.data.lock_version;
          } catch {}
          await providerServiceApi.changeStatus(createdOfferingId, "ACTIVE", freshLock);
        } catch (actErr: any) {
          console.warn("Direct activation error:", actErr);
          showFeedback(
            "Aktivasi Langsung Tertunda",
            `Layanan berhasil disimpan sebagai Draf, namun aktivasi langsung belum berhasil: ${actErr?.message || "Pastikan minimal 1 foto utama terunggah."}`,
            "warning"
          );
        }
      }

      await fetchCanonicalData();
      setIsAddModalOpen(false);
      photoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      setToastMessage(
        `Layanan "${serviceName}" berhasil disimpan ke database (Survei: ${isSurveyPaid ? `Rp ${Number(surveyFee).toLocaleString("id-ID")}` : "Gratis Survei"})${selectedPhotos.length > 0 ? ` bersama ${selectedPhotos.length} foto` : ""}${status === "ACTIVE" ? " & langsung aktif (DEC04-01)" : " sebagai draf"}.`
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal menambahkan layanan";
      if ((err as any)?.status === 409 || errMsg.includes("409") || (err as any)?.code === "SERVICE_DUPLICATE_OFFERING") {
        showFeedback(
          "Duplikat Layanan Ditemukan",
          "Penawaran untuk subkategori layanan ini sudah pernah dibuat sebelumnya. Anda tidak dapat membuat duplikat untuk subkategori yang sama.",
          "warning"
        );
      } else {
        showFeedback("Gagal Menambahkan Layanan", errMsg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    if (!editName.trim()) {
      showFeedback("Validasi Nama Layanan", "Nama layanan tidak boleh kosong.", "warning");
      return;
    }
    if (editPriceMin < 0 || editPriceMax < editPriceMin) {
      showFeedback("Validasi Rentang Harga", "Harga maksimum tidak boleh lebih kecil dari harga minimum.", "warning");
      return;
    }

    setIsEditSubmitting(true);
    try {
      // 0. Fetch latest lock_version from backend to avoid any stale version conflict
      let lockVersion = (editingService as any).lockVersion || (editingService as any).lock_version || 1;
      try {
        const fresh = await providerServiceApi.get(editingService.id);
        if (fresh?.data?.lock_version) {
          lockVersion = fresh.data.lock_version;
        }
      } catch (e) {
        console.warn("Could not fetch fresh lock_version:", e);
      }

      const isSurveyPaid = editSurveyFeeType === "PAID" && Number(editSurveyFee) > 0;

      // 1. Update basic info & pricing & duration & survey
      const updateRes = await providerServiceApi.update(
        editingService.id,
        {
          display_name: editName,
          description: editDesc,
          priceMin: editPriceMin,
          priceMax: editPriceMax,
          surveyFee: isSurveyPaid ? Number(editSurveyFee) : 0,
          surveyFeeModel: isSurveyPaid ? "PAID" : "FREE",
          survey: {
            availability: "AVAILABLE",
            requirement: "OPTIONAL",
            fee_model: isSurveyPaid ? "PAID" : "FREE",
            fee_idr: isSurveyPaid ? Number(editSurveyFee) : 0,
          },
          duration: {
            min: editDurationMin,
            max: editDurationMax,
            unit: editDurationUnit,
          },
        },
        lockVersion
      );

      const nextLock = (updateRes as any)?.data?.lock_version || (lockVersion + 1);

      // 2. Update coverage cities only if changed
      const oldCities = (editingService as any).coverageCityCodes || (editingService as any).coverage_city_codes || [];
      const hasCitiesChanged =
        editCityCodes.length !== oldCities.length ||
        !editCityCodes.every((c) => oldCities.includes(c));

      if (hasCitiesChanged && editCityCodes.length > 0) {
        await providerServiceApi.updateCoverageCities(
          editingService.id,
          editCityCodes,
          nextLock
        );
      }

      // 3. Upload new photos if any
      if (editNewPhotos.length > 0) {
        await providerServiceApi.uploadMultipleMedia(editingService.id, editNewPhotos);
      }

      // 4. Update local state immediately
      setApiServices((prev) =>
        prev.map((s: any) => {
          if (s.id === editingService.id || s._id === editingService.id) {
            return {
              ...s,
              name: editName,
              display_name: editName,
              description: editDesc,
              priceMin: editPriceMin,
              priceMax: editPriceMax,
              surveyFee: editSurveyFee,
              durationMin: editDurationMin,
              durationMax: editDurationMax,
              durationUnit: editDurationUnit,
              coverageCityCodes: editCityCodes,
              coverage_city_codes: editCityCodes,
              media: [
                ...editExistingMedia,
                ...editNewPhotoPreviews.map((p, idx) => ({
                  id: "med-new-" + idx,
                  url: p.previewUrl,
                  is_primary: p.isPrimary,
                })),
              ],
            };
          }
          return s;
        })
      );

      // Clean up object URLs
      editNewPhotoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setEditNewPhotos([]);
      setEditNewPhotoPreviews([]);
      setEditingService(null);

      setToastMessage(`Perubahan katalog layanan "${editName}" berhasil disimpan ke database!`);
      setTimeout(() => setToastMessage(null), 3500);

      fetchCanonicalData();
    } catch (err: unknown) {
      showFeedback("Gagal Memperbarui Layanan", err instanceof Error ? err.message : "Gagal memperbarui layanan", "error");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (service: ExtendedProviderMasterService) => {
    try {
      const nextStatus = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      // 0. Fetch latest service data from backend to check fresh media and lock_version
      let lockVersion = service.lockVersion || service.lock_version || 1;
      let freshMedia = service.media || (service as any).rawOffering?.media || [];
      try {
        const fresh = await providerServiceApi.get(service.id);
        if (fresh?.data) {
          lockVersion = fresh.data.lock_version || lockVersion;
          if (Array.isArray(fresh.data.media)) {
            freshMedia = fresh.data.media;
          }
        }
      } catch (e) {
        console.warn("Could not fetch fresh detail for status toggle:", e);
      }

      // Direct Activation guard (DEC04-01): must have at least 1 photo
      const hasMedia = Array.isArray(freshMedia) && freshMedia.length > 0;
      if (nextStatus === "ACTIVE" && !hasMedia) {
        showFeedback(
          "Foto Portofolio Wajib Diunggah",
          "Layanan ini belum memiliki foto utama portofolio. Sesuai ketentuan sistem, penawaran jasa wajib memiliki minimal 1 foto sebelum dapat diaktifkan ke publik. Silakan klik tombol 'Edit' dan unggah foto portofolio terlebih dahulu.",
          "warning"
        );
        return;
      }

      await providerServiceApi.changeStatus(service.id, nextStatus, lockVersion);

      setApiServices((prev) =>
        prev.map((s: any) =>
          (s.id === service.id || s._id === service.id) ? { ...s, status: nextStatus } : s
        )
      );

      setToastMessage(
        `Status layanan "${service.name}" diubah menjadi ${nextStatus === "INACTIVE" ? "Nonaktif" : "Aktif"}.`
      );
      setTimeout(() => setToastMessage(null), 3000);
      fetchCanonicalData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status layanan";
      if ((err as any)?.code === "SERVICE_MEDIA_PRIMARY_REQUIRED" || msg.includes("foto utama")) {
        showFeedback(
          "Foto Portofolio Diperlukan",
          "Layanan ini belum memiliki foto utama. Silakan klik tombol 'Edit' dan unggah foto portofolio terlebih dahulu sebelum mengaktifkannya.",
          "warning"
        );
      } else {
        showFeedback("Gagal Mengubah Status", msg, "error");
      }
    }
  };

  const handleArchiveService = (service: ExtendedProviderMasterService) => {
    setServiceToArchive(service);
  };

  const confirmExecuteArchive = async () => {
    if (!serviceToArchive) return;
    setIsArchiving(true);
    try {
      const lockVersion = serviceToArchive.lockVersion || serviceToArchive.lock_version || 1;
      try {
        await providerServiceApi.destroy(serviceToArchive.id, lockVersion);
      } catch {
        await providerServiceApi.changeStatus(serviceToArchive.id, "ARCHIVED", lockVersion);
      }

      setApiServices((prev) =>
        prev.map((s: any) =>
          (s.id === serviceToArchive.id || s._id === serviceToArchive.id) ? { ...s, status: "ARCHIVED" } : s
        )
      );

      const archivedName = serviceToArchive.name;
      setServiceToArchive(null);
      setToastMessage(`Layanan "${archivedName}" berhasil diarsipkan ke tab Arsip.`);
      setTimeout(() => setToastMessage(null), 3500);
      fetchCanonicalData();
    } catch (err: unknown) {
      showFeedback(
        "Gagal Mengarsipkan Layanan",
        err instanceof Error ? err.message : "Gagal mengarsipkan layanan",
        "error"
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreService = async (service: ExtendedProviderMasterService) => {
    try {
      const lockVersion = service.lockVersion || service.lock_version || 1;
      await providerServiceApi.changeStatus(service.id, "ACTIVE", lockVersion);

      setApiServices((prev) =>
        prev.map((s: any) =>
          (s.id === service.id || s._id === service.id) ? { ...s, status: "ACTIVE" } : s
        )
      );

      setToastMessage(`Layanan "${service.name}" berhasil dipulihkan dari arsip dan diaktifkan kembali.`);
      setTimeout(() => setToastMessage(null), 3500);
      fetchCanonicalData();
    } catch (err: unknown) {
      showFeedback(
        "Gagal Memulihkan Layanan",
        err instanceof Error ? err.message : "Gagal memulihkan layanan dari arsip",
        "error"
      );
    }
  };

  const handleToggleAvailability = async (service: ExtendedProviderMasterService) => {
    try {
      const nextAvailability = service.availability === "UNAVAILABLE" ? "AVAILABLE" : "UNAVAILABLE";
      await providerServiceApi.update(service.id, { availability: nextAvailability });
      await fetchCanonicalData();
      setToastMessage(
        `Ketersediaan layanan "${service.name}" diubah menjadi ${nextAvailability === "AVAILABLE" ? "Tersedia (Available)" : "Tidak Tersedia (Unavailable)"}.`
      );
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: unknown) {
      showFeedback(
        "Gagal Mengubah Ketersediaan",
        err instanceof Error ? err.message : "Gagal mengubah ketersediaan layanan",
        "error"
      );
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


      {/* Status Tabs Navigation (Point 5: Semua, Aktif, Nonaktif, Draf, Arsip) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "Semua Layanan", count: totalAllServicesCount, color: "bg-slate-100 text-slate-700" },
          { id: "ACTIVE", label: "Aktif (Tayang)", count: totalActiveServicesCount, color: "bg-emerald-50 text-emerald-700" },
          { id: "INACTIVE", label: "Nonaktif", count: totalInactiveServicesCount, color: "bg-amber-50 text-amber-800" },
          { id: "DRAFT", label: "Draf", count: totalDraftServicesCount, color: "bg-orange-50 text-orange-700" },
          { id: "ARCHIVED", label: "Arsip (Archive)", count: totalArchivedServicesCount, color: "bg-slate-100 text-slate-700" },
        ].map((tab) => {
          const isSelected = selectedStatusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`tab-status-${tab.id.toLowerCase()}`}
              onClick={() => setSelectedStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${isSelected
                ? "bg-[#0F4C81] text-white border-[#0F4C81] shadow-2xs"
                : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200/90 shadow-2xs"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isSelected ? "bg-white/20 text-white" : tab.color
                  }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Arsip Notice Banner */}
      {selectedStatusFilter === "ARCHIVED" && (
        <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-slate-700 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Archive size={18} weight="duotone" className="text-slate-600 shrink-0" />
            <span>
              <strong>Mode Arsip Katalog Layanan:</strong> Layanan yang diarsipkan disembunyikan dari katalog publik konsumen dan tidak menerima pesanan baru. Histori pengerjaan, garansi, dan invoice transaksi tetap aman tersimpan. Anda dapat mengaktifkannya kembali dengan tombol <strong>Pulihkan</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Action and Search Bar with Status & Category Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 relative">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari master service, subkategori, atau deskripsi..."
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
            <option value="INACTIVE">Nonaktif ({totalInactiveServicesCount})</option>
            <option value="DRAFT">Draft ({totalDraftServicesCount})</option>
            <option value="ARCHIVED">Arsip ({totalArchivedServicesCount})</option>
          </select>

          {/* View Mode Toggle: Table (Default) vs Grid */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "TABLE"
                ? "bg-white text-[#0F4C81] shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
                }`}
              title="Tampilan Tabel Analitik Lengkap"
            >
              <Table size={15} weight="bold" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "GRID"
                ? "bg-white text-[#0F4C81] shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
                }`}
              title="Tampilan Kartu Grid"
            >
              <SquaresFour size={15} weight="bold" />
              <span>Kartu</span>
            </button>
          </div>

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

      {/* Service Offerings Display: Table View (Default) vs Card View */}
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
      ) : viewMode === "TABLE" ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">Katalog Layanan & Penawaran Mitra</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81] font-bold text-[11px]">
                Menampilkan {filteredServices.length} dari {myServices.length} layanan
              </span>
            </div>

          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200/80 select-none text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[240px]">Layanan & Canonical</th>
                  <th className="py-3 px-3 min-w-[160px]">Kategori & Jasa</th>
                  <th className="py-3 px-3 min-w-[160px]">Penetapan Harga</th>
                  <th className="py-3 px-3 min-w-[125px]">Biaya Survei</th>
                  <th className="py-3 px-3 min-w-[95px]">Durasi</th>
                  <th className="py-3 px-3 min-w-[180px]">Cakupan Kota</th>
                  <th className="py-3 px-3 min-w-[115px]">Garansi</th>
                  <th className="py-3 px-3 min-w-[125px]">Status & Versi</th>
                  <th className="py-3 px-3 min-w-[120px] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service, idx) => {
                  const CatIcon = getCategoryIcon(service.categoryId, service.categoryName);
                  const isWarrantyOn = (service as any).warrantyConfig?.warrantyEnabled || repo.getServiceWarrantyConfig(service.id)?.warrantyEnabled;
                  const isReady = service.availability !== "UNAVAILABLE";

                  return (
                    <tr
                      key={service.id}
                      className="hover:bg-sky-50/20 transition-colors group"
                    >
                      {/* 1. Number & ID */}
                      <td className="py-3 px-3 text-center align-top">
                        <span className="font-mono text-slate-400 font-bold text-[11px] block">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(service.id, service.id)}
                          title={`Klik untuk salin UUID: ${service.id}`}
                          className="mt-1 font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition inline-flex items-center gap-0.5"
                        >
                          {copiedField === service.id ? (
                            <Check size={9} className="text-emerald-600" />
                          ) : (
                            <Copy size={9} />
                          )}
                          <span>{service.id.slice(0, 6)}...</span>
                        </button>
                      </td>

                      {/* 2. Layanan & Canonical */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-start gap-2.5">
                          {service.thumbnailUrl ? (
                            <img
                              src={service.thumbnailUrl}
                              alt={service.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <Images size={16} />
                            </div>
                          )}
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-slate-900 text-xs leading-snug group-hover:text-[#0F4C81] transition-colors">
                              {service.name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-[#0F4C81] text-[10px] font-semibold border border-sky-200">
                                <Folder size={10} weight="fill" />
                                <span>{service.canonicalName || "Canonical Jasa"}</span>
                              </span>
                              {service.media && service.media.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                                  <Images size={9} weight="bold" />
                                  <span>{service.media.length} Foto</span>
                                </span>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs" title={service.description}>
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Kategori & Subkategori */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200/80">
                            <CatIcon size={11} weight="duotone" />
                            <span>{service.categoryName || "Kategori"}</span>
                          </span>
                          <p className="text-[11px] font-semibold text-slate-600">
                            {service.subcategoryName || "Subkategori"}
                          </p>
                        </div>
                      </td>

                      {/* 4. Penetapan Harga */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {service.priceModel || "RANGE"}
                            </span>
                          </div>
                          <p className="font-extrabold text-slate-900 text-xs whitespace-nowrap">
                            Rp {Number(service.priceMin || 0).toLocaleString("id-ID")} – Rp {Number(service.priceMax || 0).toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">Estimasi Konsumen</p>
                        </div>
                      </td>

                      {/* 5. Biaya Survei */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          {service.surveyFeeModel === "FREE" || Number(service.surveyFee || 0) === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs whitespace-nowrap">
                              <CheckCircle size={11} weight="fill" className="text-emerald-600 shrink-0" />
                              Gratis Survei
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                                Berbayar
                              </span>
                              <p className="font-extrabold text-slate-800 text-xs whitespace-nowrap">
                                Rp {Number(service.surveyFee || 0).toLocaleString("id-ID")}
                              </p>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-400 font-medium">Sifat: Opsional</p>
                        </div>
                      </td>

                      {/* 6. Durasi */}
                      <td className="py-3 px-3 align-top">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 text-xs">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>
                            {service.durationMin || 1} - {service.durationMax || 2} {service.durationUnit === "DAY" ? "Hari" : service.durationUnit === "MINUTE" ? "Mnt" : "Jam"}
                          </span>
                        </div>
                      </td>

                      {/* 7. Cakupan Kota */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 block">
                            {service.coverageCityCodes?.length || 0} Kota Terdaftar
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(service.coverageCityCodes || []).map((code: string) => {
                              const city = getCityInfo(code);
                              return (
                                <span
                                  key={code}
                                  title={`${city.name} (${city.province})`}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-help"
                                >
                                  {code}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>

                      {/* 8. Garansi */}
                      <td className="py-3 px-3 align-top">
                        {isWarrantyOn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <ShieldCheck size={12} weight="fill" />
                            <span>✓ Garansi Aktif</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-slate-400 bg-slate-50 border border-slate-200 text-[10px] font-medium">
                            Tanpa Garansi
                          </span>
                        )}
                      </td>

                      {/* 9. Status & Versi */}
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${service.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : service.status === "ARCHIVED"
                                  ? "bg-slate-100 text-slate-600 border-slate-300"
                                  : service.status === "DRAFT"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                }`}
                            >
                              {service.status === "ACTIVE"
                                ? "Aktif"
                                : service.status === "ARCHIVED"
                                  ? "Diarsipkan"
                                  : service.status === "DRAFT"
                                    ? "Draft"
                                    : "Nonaktif"}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200" title="Concurrency lock version">
                              v{service.lockVersion || 1}
                            </span>
                          </div>
                          {service.status !== "ARCHIVED" && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border block w-fit ${isReady
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                            >
                              {isReady ? "Ready (Buka)" : "Tutup Order"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 10. Aksi */}
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Lihat Detail Button (Point 2) */}
                          <button
                            type="button"
                            onClick={() => setInspectingService(service)}
                            title="Lihat semua data yang tersimpan pada katalog layanan"
                            className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0F4C81] hover:bg-sky-50 hover:border-sky-200 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} weight="bold" />
                            <span>Lihat</span>
                          </button>

                          {/* 2. Edit Button (Point 4) */}
                          {service.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(service)}
                              title="Edit semua data katalog layanan"
                              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <PencilSimple size={13} weight="bold" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* 3. Status Action: Nonaktifkan / Aktifkan / Pulihkan (Point 1) */}
                          {service.status === "ARCHIVED" ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreService(service)}
                              title="Pulihkan layanan ini dari arsip"
                              className="h-7 px-2.5 rounded-lg border border-sky-200 bg-sky-50 text-[#0F4C81] hover:bg-sky-100 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowCounterClockwise size={13} weight="bold" />
                              <span>Pulihkan</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(service)}
                                title={service.status === "ACTIVE" ? "Nonaktifkan tayangan layanan ini" : "Aktifkan tayangan layanan ini"}
                                className={`h-7 px-2.5 rounded-lg border transition text-xs font-semibold flex items-center gap-1 cursor-pointer ${service.status === "ACTIVE"
                                  ? "border-slate-200 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                              >
                                <Power size={13} weight="bold" />
                                <span>{service.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleArchiveService(service)}
                                title="Arsipkan katalog layanan"
                                className="h-7 px-2 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Archive size={13} weight="bold" />
                                <span className="hidden xl:inline">Arsipkan</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Mode View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {service.thumbnailUrl ? (
                      <img
                        src={service.thumbnailUrl}
                        alt={service.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Images size={18} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {service.categoryName || "Kategori"} &bull; {service.subcategoryName || "Jasa"}
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
                      <p className="text-[11px] text-[#0F4C81] font-semibold mt-0.5 flex items-center gap-1">
                        <Folder size={11} weight="fill" />
                        <span>{service.canonicalName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${service.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : service.status === "ARCHIVED"
                          ? "bg-slate-100 text-slate-600 border-slate-300"
                          : service.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                    >
                      Status: {service.status === "ACTIVE" ? "Aktif" : service.status === "ARCHIVED" ? "Diarsipkan" : service.status === "DRAFT" ? "Draft" : "Nonaktif"}
                    </span>
                    {service.status !== "ARCHIVED" && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border ${service.availability === "UNAVAILABLE"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}
                      >
                        {service.availability === "UNAVAILABLE" ? "Tidak Tersedia" : "Tersedia (Ready)"}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{service.description}</p>

                {/* Konfigurasi Penawaran Mitra */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Konfigurasi Penawaran</span>
                    <span className="text-[#0F4C81]">{service.coverageCityCodes?.length || 0} Kota Terdaftar</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-600">Range Estimasi:</span>
                    <span className="text-slate-900">
                      Rp {Number(service.priceMin || 0).toLocaleString("id-ID")} – Rp {Number(service.priceMax || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Biaya Survei:</span>
                    {service.surveyFeeModel === "FREE" || Number(service.surveyFee || 0) === 0 ? (
                      <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                        <CheckCircle size={11} weight="fill" />
                        Gratis Survei
                      </span>
                    ) : (
                      <span className="font-bold text-slate-800">
                        Rp {Number(service.surveyFee || 0).toLocaleString("id-ID")}{" "}
                        <span className="text-[10px] text-[#0F4C81] font-semibold">(Berbayar)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {service.status === "ARCHIVED" ? (
                    <button
                      type="button"
                      onClick={() => handleRestoreService(service)}
                      className="px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 text-[#0F4C81] hover:bg-sky-100 font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Pulihkan layanan dari arsip"
                    >
                      <ArrowCounterClockwise size={13} weight="bold" />
                      <span>Pulihkan</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(service)}
                        className={`font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${service.status === "ACTIVE"
                          ? "border-slate-200 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        title={service.status === "ACTIVE" ? "Nonaktifkan tayangan" : "Aktifkan tayangan"}
                      >
                        <Power size={13} weight="bold" />
                        <span>{service.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleArchiveService(service)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Arsipkan katalog layanan"
                      >
                        <Archive size={14} weight="bold" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInspectingService(service)}
                    title="Lihat semua data yang tersimpan"
                    className="h-7 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0F4C81] hover:bg-sky-50 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Eye size={13} weight="bold" />
                    <span>Lihat</span>
                  </button>
                  {service.status !== "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(service)}
                      className="h-7 px-2.5 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition cursor-pointer"
                    >
                      <PencilSimple size={13} weight="bold" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INSPEKSI DETAIL PENAWARAN LAYANAN & METADATA DATABASE              */}
      {/* ========================================================================= */}
      {inspectingService && (() => {
        const allMedia = Array.isArray(inspectingService.media) && inspectingService.media.length > 0
          ? inspectingService.media
          : Array.isArray(inspectingService.rawOffering?.media) && inspectingService.rawOffering.media.length > 0
            ? inspectingService.rawOffering.media
            : inspectingService.thumbnailUrl
              ? [{ id: "thumb", url: inspectingService.thumbnailUrl, is_primary: true }]
              : [];

        const cities = Array.isArray(inspectingService.coverageCityCodes) && inspectingService.coverageCityCodes.length > 0
          ? inspectingService.coverageCityCodes
          : Array.isArray(inspectingService.rawOffering?.coverage_city_codes) && inspectingService.rawOffering.coverage_city_codes.length > 0
            ? inspectingService.rawOffering.coverage_city_codes
            : ["JKT-BARAT", "JKT-SEL", "TNG-KOTA"];

        const CategoryIcon = getCategoryIcon(inspectingService.categoryId, inspectingService.categoryName);
        const warrantyConfig = (inspectingService as any).warrantyConfig || repo.getServiceWarrantyConfig(inspectingService.id);
        const hasWarranty = warrantyConfig?.warrantyEnabled !== undefined ? Boolean(warrantyConfig.warrantyEnabled) : isStoreActive;
        const warrantyDays = warrantyConfig?.durationDays || 30;

        return (
          <Modal
            isOpen={!!inspectingService}
            onClose={() => setInspectingService(null)}
            title={`Detail Penawaran Layanan: ${inspectingService.name}`}
            maxWidth="4xl"
            footer={
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${inspectingService.status === "ACTIVE"
                    ? "bg-emerald-500 animate-pulse"
                    : inspectingService.status === "ARCHIVED"
                      ? "bg-purple-500"
                      : inspectingService.status === "INACTIVE"
                        ? "bg-rose-500"
                        : "bg-amber-500"
                    }`} />
                  <span className="font-medium">
                    Status: <strong className="text-slate-700">
                      {inspectingService.status === "ACTIVE"
                        ? "Aktif (Tayang)"
                        : inspectingService.status === "ARCHIVED"
                          ? "Diarsipkan"
                          : inspectingService.status === "INACTIVE"
                            ? "Nonaktif"
                            : "Draf"}
                    </strong> &bull; Lock v{inspectingService.lockVersion || 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setInspectingService(null)}
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const svc = inspectingService;
                      setInspectingService(null);
                      handleOpenEditModal(svc);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <PencilSimple size={14} weight="bold" />
                    <span>Edit Layanan</span>
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-4 text-xs font-body">
              {/* Header Info Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${inspectingService.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : inspectingService.status === "ARCHIVED"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : inspectingService.status === "INACTIVE"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                    {inspectingService.status === "ACTIVE"
                      ? "Aktif (Tayang)"
                      : inspectingService.status === "ARCHIVED"
                        ? "Diarsipkan"
                        : inspectingService.status === "INACTIVE"
                          ? "Nonaktif"
                          : "Draf"}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600 font-bold">
                    Lock Version: v{inspectingService.lockVersion || 1}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ID: <code className="font-mono font-bold text-slate-700">{inspectingService.id}</code>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(inspectingService.id, "modal-id")}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    {copiedField === "modal-id" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copiedField === "modal-id" ? "Disalin!" : "Salin ID"}</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Layout matching Form Tambah Layanan */}
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
                          Kategori & Subkategori
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] font-bold text-[11px] border border-sky-100">
                            <CategoryIcon size={13} weight="bold" />
                            <span>{inspectingService.categoryName || "Kategori Layanan"}</span>
                          </span>
                          <span className="text-slate-400">&rsaquo;</span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {inspectingService.subcategoryName || "Subkategori"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Nama Layanan / Service
                        </span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {inspectingService.name}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Deskripsi Lengkap Layanan
                        </span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                          {inspectingService.description || "Tidak ada deskripsi layanan."}
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
                              className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs"
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
                          3. Konfigurasi Biaya & Durasi
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
                          Rp {Number(inspectingService.priceMin || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Harga Maksimum
                        </span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          Rp {Number(inspectingService.priceMax || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Biaya Survei Lokasi
                        </span>
                        {inspectingService.surveyFeeModel === "FREE" || Number(inspectingService.surveyFee || 0) === 0 ? (
                          <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                            <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                            Gratis Survei (Rp 0)
                          </span>
                        ) : (
                          <p className="font-extrabold text-slate-900 text-xs">
                            Rp {Number(inspectingService.surveyFee).toLocaleString("id-ID")}{" "}
                            <span className="text-[#0F4C81] text-[10px] font-bold">(Berbayar)</span>
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Estimasi Durasi Kerja
                        </span>
                        <p className="font-bold text-slate-800 text-xs">
                          {inspectingService.durationMin || 1} - {inspectingService.durationMax || 2}{" "}
                          {inspectingService.durationUnit === "HOUR"
                            ? "Jam"
                            : inspectingService.durationUnit === "DAY"
                              ? "Hari"
                              : "Menit"}
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

                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
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

                  {/* 5. Garansi Layanan (Dengan Keterangan Belum Disimpan ke Database) */}
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
                        Bagian garansi ini saat ini <strong className="font-extrabold underline decoration-amber-500">belum dimasukkan / belum disimpan ke dalam database</strong> (Modul 04 Service Offering). Nilai garansi di bawah ini berstatus simulasi lokal.
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
          </Modal>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH LAYANAN (STRICT CASCADING FLOW, LOCKED POINT 2)              */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            if (!isSubmitting) {
              photoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
              setSelectedPhotos([]);
              setPhotoPreviews([]);
              setIsAddModalOpen(false);
            }
          }}
          title="Tambah Penawaran Katalog Layanan Baru"
          description="Lengkapi klasifikasi jasa, unggah portofolio foto, atur estimasi tarif & wilayah operasional"
          maxWidth="4xl"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-medium">
                  {selectedPhotos.length > 0
                    ? `${selectedPhotos.length} foto siap disimpan ke database (service_offering_media)`
                    : "Form siap disimpan ke database"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    photoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                    setSelectedPhotos([]);
                    setPhotoPreviews([]);
                    setIsAddModalOpen(false);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSaveNewService(e, "DRAFT")}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Draf"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSaveNewService(e, "ACTIVE")}
                >
                  {isSubmitting ? "Menyimpan..." : "Aktifkan"}
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={(e) => handleSaveNewService(e, "ACTIVE")} className="text-xs font-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ========================================================================= */}
              {/* KOLOM KIRI: DATA UTAMA & UPLOAD FOTO                                      */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                {/* 1. Data Utama Katalog Jasa */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        1. Data Utama Katalog Jasa
                      </h4>
                    </div>

                  </div>

                  {/* Kategori */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[9px] font-black uppercase">
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

                  {/* Subkategori */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap justify-between items-center gap-1.5">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[9px] font-black uppercase">
                          Langkah 2
                        </span>
                        <label className="font-bold text-slate-800">Pilih Subkategori</label>
                      </div>
                      <Link
                        href="/provider/taxonomy-request"
                        target="_blank"
                        className="text-[10px] font-bold text-[#0F4C81] hover:underline"
                      >
                        Ajukan Subkategori Baru
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

                  {/* Nama Layanan Service */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[9px] font-black uppercase">
                        Langkah 3
                      </span>
                      <label className="font-bold text-slate-800">Nama Layanan Service</label>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: AC Cleaning Inverter Tekanan Tinggi"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  {/* Deskripsi Layanan */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-[#0F4C81] border border-sky-200 text-[9px] font-black uppercase">
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>
                </div>

                {/* 2. Unggah Foto & Galeri Layanan (MULTI-UPLOAD & DATABASE SAVED) */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Images size={16} weight="bold" className="text-[#0F4C81]" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        2. Foto Portofolio Layanan
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Wajib untuk Simpan & Aktifkan
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Unggah foto portofolio pengerjaan layanan Anda (bisa lebih dari 1 foto). Foto pertama otomatis dijadikan foto utama penawaran. Foto akan disimpan ke tabel database <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">service_offering_media</code>.
                  </p>

                  {/* Dropzone Box */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handlePhotoFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${isDragOver
                      ? "border-[#0F4C81] bg-sky-50/80 ring-2 ring-[#0F4C81]/20"
                      : "border-slate-300 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-400"
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handlePhotoFiles(e.target.files);
                          e.target.value = "";
                        }
                      }}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#0F4C81]">
                      <UploadSimple size={20} weight="bold" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        Klik untuk memilih atau seret foto ke sini
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Mendukung multiple upload • JPG, PNG, WEBP • Maks. 5 MB per foto
                      </p>
                    </div>
                  </div>

                  {/* Previews Grid */}
                  {photoPreviews.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          {photoPreviews.length} Foto Dipilih:
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} weight="bold" />
                          <span>Tambah Foto Lagi</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                        {photoPreviews.map((p, idx) => (
                          <div
                            key={idx}
                            className={`relative group rounded-xl overflow-hidden border transition-all bg-white shadow-2xs ${p.isPrimary ? "ring-2 ring-emerald-500 border-emerald-500" : "border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <img
                              src={p.previewUrl}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-20 object-cover"
                            />

                            {/* Primary Badge or Set Primary Button */}
                            <div className="absolute top-1 left-1 z-10">
                              {p.isPrimary ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold flex items-center gap-0.5 shadow-xs">
                                  <Star size={9} weight="fill" />
                                  <span>Utama</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrimaryPhoto(idx);
                                  }}
                                  className="px-1.5 py-0.5 rounded-md bg-black/60 hover:bg-emerald-600 text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                                  title="Jadikan Foto Utama"
                                >
                                  Set Utama
                                </button>
                              )}
                            </div>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(idx);
                              }}
                              className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-xs opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Hapus foto ini"
                            >
                              <Trash size={10} weight="bold" />
                            </button>

                            {/* File Info */}
                            <div className="p-1.5 bg-white border-t border-slate-100 text-[9px]">
                              <p className="font-semibold text-slate-700 truncate" title={p.file.name}>
                                {p.file.name}
                              </p>
                              <p className="text-slate-400">
                                {(p.file.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* KOLOM KANAN: HARGA, CAKUPAN KOTA & GARANSI (NOT IN DATABASE NOTE)         */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                {/* 3. Konfigurasi Penawaran Mitra */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        3. Konfigurasi Penawaran & Biaya
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                      Tarif Resmi
                    </span>
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
                          value={priceMin}
                          onChange={(e) => setPriceMin(Number(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Estimasi: Rp {Number(priceMin || 0).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Harga Maksimum</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                          Rp
                        </span>
                        <input
                          type="number"
                          min={priceMin}
                          value={priceMax}
                          onChange={(e) => setPriceMax(Number(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Estimasi: Rp {Number(priceMax || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Biaya Survei / Diagnosa */}
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800">
                        Status Biaya Survei / Kunjungan
                      </label>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${surveyFeeType === "FREE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-[#0F4C81] border-sky-200"
                        }`}>
                        {surveyFeeType === "FREE" ? "✓ Gratis Survei" : "Berbayar"}
                      </span>
                    </div>

                    {/* Toggle Options: Gratis vs Berbayar */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSurveyFeeType("FREE");
                          setSurveyFee(0);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${surveyFeeType === "FREE"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${surveyFeeType === "FREE" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                          {surveyFeeType === "FREE" && <Check size={10} weight="bold" />}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${surveyFeeType === "FREE" ? "text-emerald-900" : "text-slate-800"}`}>
                            Survei Gratis
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            Rp 0 &bull; Bebas biaya kunjungan awal
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSurveyFeeType("PAID");
                          if (surveyFee <= 0) setSurveyFee(50000);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${surveyFeeType === "PAID"
                          ? "border-[#0F4C81] bg-sky-50/60 ring-2 ring-[#0F4C81]/20 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${surveyFeeType === "PAID" ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-300 bg-white"
                          }`}>
                          {surveyFeeType === "PAID" && <Check size={10} weight="bold" />}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${surveyFeeType === "PAID" ? "text-[#0F4C81]" : "text-slate-800"}`}>
                            Survei Berbayar
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            Input nominal tarif survei teknisi
                          </p>
                        </div>
                      </button>
                    </div>

                    {surveyFeeType === "PAID" ? (
                      <div className="pt-1 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">Nominal Biaya Survei (Rp)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                            Rp
                          </span>
                          <input
                            type="number"
                            min={1000}
                            step={5000}
                            required={surveyFeeType === "PAID"}
                            placeholder="Contoh: 50000"
                            value={surveyFee || ""}
                            onChange={(e) => setSurveyFee(Math.max(0, Number(e.target.value)))}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Tarif survei ditetapkan: Rp {Number(surveyFee || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2 text-emerald-800 text-[11px]">
                        <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                        <span>Layanan ini berstatus <strong>Gratis Survei</strong>. Label resmi &quot;Gratis Survei&quot; akan tayang pada katalog.</span>
                      </div>
                    )}

                    {/* Estimasi Durasi Kerja / Waktu Layanan */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block font-bold text-slate-700 mb-1">
                        Estimasi Durasi Kerja / Waktu Layanan
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Min:</span>
                          <input
                            type="number"
                            min={1}
                            value={durationMin}
                            onChange={(e) => setDurationMin(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Maks:</span>
                          <input
                            type="number"
                            min={durationMin}
                            value={durationMax}
                            onChange={(e) => setDurationMax(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-0.5">Satuan:</span>
                          <select
                            value={durationUnit}
                            onChange={(e) => setDurationUnit(e.target.value as any)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs bg-white"
                          >
                            <option value="MINUTE">Menit</option>
                            <option value="HOUR">Jam</option>
                            <option value="DAY">Hari</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Estimasi pengerjaan: {durationMin} - {durationMax} {durationUnit === "MINUTE" ? "Menit" : durationUnit === "HOUR" ? "Jam" : "Hari"}
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
                      {selectedCityCodes.length} Kota Terpilih
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Pilih kota administratif tempat teknisi Anda dapat melayani pesanan. Data ini disimpan langsung ke tabel database <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">service_coverage_cities</code>.
                  </p>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {OFFICIAL_CITIES.map((c) => {
                      const isSelected = selectedCityCodes.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleToggleCityCode(c.code)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${isSelected
                            ? "bg-[#0F4C81] text-white shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span>{c.name}</span>
                          {isSelected && <Check size={11} weight="bold" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Garansi Layanan (DENGAN KETERANGAN JELAS BELUM DISIMPAN KE DATABASE) */}
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

                  {/* Keterangan Status Database sesuai instruksi user */}
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                      <Info size={14} weight="fill" className="text-amber-600 shrink-0" />
                      <span>Keterangan Status Database:</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Bagian garansi ini saat ini <strong className="font-extrabold underline decoration-amber-500">belum dimasukkan / belum disimpan ke dalam database</strong> (Modul 04 Service Offering). Pilihan garansi yang Anda atur di bawah ini berstatus simulasi lokal dan belum masuk ke database utama.
                    </p>
                  </div>

                  {/* Toggle Garansi */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <label className="font-bold text-slate-800 block">Sediakan Garansi Servis</label>
                      <p className="text-[10px] text-slate-400">Jaminan perbaikan ulang purna jual untuk konsumen</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsWarrantySupported(!isWarrantySupported)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${isWarrantySupported
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                    >
                      {isWarrantySupported ? (
                        <>
                          <Check size={13} weight="bold" />
                          <span>Garansi Aktif</span>
                        </>
                      ) : (
                        <span>Tanpa Garansi</span>
                      )}
                    </button>
                  </div>

                  {/* Durasi Garansi jika aktif */}
                  {isWarrantySupported && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <label className="block font-bold text-slate-700">Pilih Durasi Garansi</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[7, 14, 30, 60, 90].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setWarrantyDurationDays(days)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${warrantyDurationDays === days
                              ? "bg-[#0F4C81] text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                          >
                            {days} Hari
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[11px] text-slate-500 font-medium">Durasi kustom:</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={warrantyDurationDays}
                          onChange={(e) => setWarrantyDurationDays(Number(e.target.value))}
                          className="w-20 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                        />
                        <span className="text-xs text-slate-600 font-bold">Hari</span>
                      </div>
                    </div>
                  )}
                </div>
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
          onClose={() => {
            if (!isEditSubmitting) {
              editNewPhotoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
              setEditNewPhotos([]);
              setEditNewPhotoPreviews([]);
              setEditingService(null);
            }
          }}
          title={`Edit Katalog Layanan: ${editingService.name}`}
          maxWidth="4xl"
          footer={
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <span className="font-medium">
                  {editNewPhotos.length > 0
                    ? `Perubahan & ${editNewPhotos.length} foto baru siap disimpan ke database`
                    : "Perubahan siap disimpan langsung ke database"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isEditSubmitting}
                  onClick={() => {
                    editNewPhotoPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
                    setEditNewPhotos([]);
                    setEditNewPhotoPreviews([]);
                    setEditingService(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  form="edit-service-catalog-form"
                  disabled={isEditSubmitting}
                  className="flex items-center gap-1.5"
                >
                  <Check size={14} weight="bold" />
                  <span>{isEditSubmitting ? "Menyimpan ke Database..." : "Simpan Perubahan (Database)"}</span>
                </Button>
              </div>
            </div>
          }
        >
          <form id="edit-service-catalog-form" onSubmit={handleSaveEditService} className="text-xs font-body">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ========================================================================= */}
              {/* KOLOM KIRI: DATA UTAMA & FOTO PORTOFOLIO                                  */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                {/* 1. Data Utama Katalog Jasa */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        1. Data Utama Katalog Jasa
                      </h4>
                    </div>

                  </div>

                  {/* Kategori Master */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Kategori Layanan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editCatId}
                      onChange={(e) => handleEditCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    >
                      {activeCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subkategori */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Subkategori Layanan <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editSubId}
                      onChange={(e) => setEditSubId(e.target.value)}
                      disabled={editAvailableSubcategories.length === 0}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    >
                      {editAvailableSubcategories.length === 0 && (
                        <option value="">(Pilih Kategori Terlebih Dahulu)</option>
                      )}
                      {editAvailableSubcategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nama Layanan */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nama Layanan / Service <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Contoh: Cuci & Maintenance AC Inverter 0.5 - 2 PK"
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Deskripsi Lengkap Layanan <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Jelaskan detail pengerjaan, cakupan servis, dan alat yang digunakan..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    />
                  </div>
                </div>

                {/* 2. Foto Portofolio Layanan (service_offering_media) */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Images size={16} weight="bold" className="text-[#0F4C81]" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        2. Foto Portofolio Layanan
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ service_offering_media
                    </span>
                  </div>

                  {/* Existing media in database */}
                  {editExistingMedia.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Foto Tersimpan di Database ({editExistingMedia.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {editExistingMedia.map((m) => (
                          <div key={m.id} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square group shadow-2xs">
                            <img src={m.url} alt="Foto tersimpan" className="w-full h-full object-cover" />
                            {m.is_primary && (
                              <div className="absolute top-1 left-1 bg-[#0F4C81] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star size={9} weight="fill" className="text-amber-300" />
                                <span>Utama</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingMedia(m.id)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-90 hover:opacity-100 transition shadow-sm"
                              title="Hapus foto dari database"
                            >
                              <Trash size={12} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload new photos */}
                  <div>
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleEditPhotoFiles(e.target.files);
                      }}
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsEditDragOver(true);
                      }}
                      onDragLeave={() => setIsEditDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsEditDragOver(false);
                        if (e.dataTransfer.files) handleEditPhotoFiles(e.dataTransfer.files);
                      }}
                      onClick={() => editFileInputRef.current?.click()}
                      className={`p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${isEditDragOver
                        ? "border-[#0F4C81] bg-sky-50/50"
                        : "border-slate-300 hover:border-[#0F4C81] hover:bg-slate-50/60"
                        }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center">
                        <UploadSimple size={20} weight="bold" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-[11px]">
                          Klik atau seret foto baru ke sini
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Format JPG, PNG, WEBP (Maks. 5MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* New photo previews */}
                  {editNewPhotoPreviews.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        Foto Baru yang Akan Diunggah ({editNewPhotoPreviews.length})
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {editNewPhotoPreviews.map((p, idx) => (
                          <div key={idx} className="relative rounded-xl overflow-hidden border border-blue-300 bg-slate-100 aspect-square group shadow-2xs">
                            <img src={p.previewUrl} alt="Foto baru" className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                              Baru
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditNewPhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-90 hover:opacity-100 transition shadow-sm"
                            >
                              <X size={12} weight="bold" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* KOLOM KANAN: BIAYA & DURASI, CAKUPAN KOTA, PENGATURAN GARANSI            */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                {/* 3. Konfigurasi Penawaran & Biaya */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100" />
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                        3. Konfigurasi Biaya & Durasi
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-200">
                      Tarif Resmi
                    </span>
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
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Estimasi: Rp {Number(editPriceMin || 0).toLocaleString("id-ID")}
                      </p>
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
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Estimasi: Rp {Number(editPriceMax || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Biaya Survei / Diagnosa */}
                  <div className="space-y-2.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800">
                        Status Biaya Survei / Kunjungan
                      </label>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${editSurveyFeeType === "FREE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-[#0F4C81] border-sky-200"
                        }`}>
                        {editSurveyFeeType === "FREE" ? "✓ Gratis Survei" : "Berbayar"}
                      </span>
                    </div>

                    {/* Toggle Options: Gratis vs Berbayar */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditSurveyFeeType("FREE");
                          setEditSurveyFee(0);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${editSurveyFeeType === "FREE"
                          ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${editSurveyFeeType === "FREE" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                          {editSurveyFeeType === "FREE" && <Check size={10} weight="bold" />}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${editSurveyFeeType === "FREE" ? "text-emerald-900" : "text-slate-800"}`}>
                            Survei Gratis
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            Rp 0 &bull; Bebas biaya kunjungan awal
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditSurveyFeeType("PAID");
                          if (editSurveyFee <= 0) setEditSurveyFee(50000);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${editSurveyFeeType === "PAID"
                          ? "border-[#0F4C81] bg-sky-50/60 ring-2 ring-[#0F4C81]/20 shadow-2xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${editSurveyFeeType === "PAID" ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-300 bg-white"
                          }`}>
                          {editSurveyFeeType === "PAID" && <Check size={10} weight="bold" />}
                        </div>
                        <div>
                          <p className={`font-bold text-xs ${editSurveyFeeType === "PAID" ? "text-[#0F4C81]" : "text-slate-800"}`}>
                            Survei Berbayar
                          </p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            Input nominal tarif survei teknisi
                          </p>
                        </div>
                      </button>
                    </div>

                    {editSurveyFeeType === "PAID" ? (
                      <div className="pt-1 space-y-1">
                        <label className="block text-[11px] font-bold text-slate-700">Nominal Biaya Survei (Rp)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs select-none">
                            Rp
                          </span>
                          <input
                            type="number"
                            min={1000}
                            step={5000}
                            required={editSurveyFeeType === "PAID"}
                            placeholder="Contoh: 50000"
                            value={editSurveyFee || ""}
                            onChange={(e) => setEditSurveyFee(Math.max(0, Number(e.target.value)))}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Tarif survei ditetapkan: Rp {Number(editSurveyFee || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2 text-emerald-800 text-[11px]">
                        <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                        <span>Layanan ini berstatus <strong>Gratis Survei</strong>. Label resmi &quot;Gratis Survei&quot; akan tayang pada katalog.</span>
                      </div>
                    )}
                  </div>

                  {/* Durasi Pengerjaan */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Estimasi Durasi Kerja</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Min:</span>
                        <input
                          type="number"
                          min={1}
                          value={editDurationMin}
                          onChange={(e) => setEditDurationMin(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Maks:</span>
                        <input
                          type="number"
                          min={editDurationMin}
                          value={editDurationMax}
                          onChange={(e) => setEditDurationMax(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Satuan:</span>
                        <select
                          value={editDurationUnit}
                          onChange={(e) => setEditDurationUnit(e.target.value as any)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 font-semibold text-xs bg-white"
                        >
                          <option value="MINUTE">Menit</option>
                          <option value="HOUR">Jam</option>
                          <option value="DAY">Hari</option>
                        </select>
                      </div>
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
                      {editCityCodes.length} Kota Terpilih
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    Pilih kota administratif tempat teknisi Anda dapat melayani pesanan (tabel <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">service_coverage_cities</code>).
                  </p>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {OFFICIAL_CITIES.map((c) => {
                      const isSelected = editCityCodes.includes(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleToggleEditCityCode(c.code)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${isSelected
                            ? "bg-[#0F4C81] text-white shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span>{c.name}</span>
                          {isSelected && <Check size={11} weight="bold" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Garansi Layanan (Dengan Keterangan Belum Disimpan ke Database) */}
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

                  {/* Keterangan Status Database sesuai instruksi user */}
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                      <Info size={14} weight="fill" className="text-amber-600 shrink-0" />
                      <span>Keterangan Status Database:</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Bagian garansi ini saat ini <strong className="font-extrabold underline decoration-amber-500">belum dimasukkan / belum disimpan ke dalam database</strong> (Modul 04 Service Offering). Pilihan garansi yang Anda atur di bawah ini berstatus simulasi lokal dan belum masuk ke database utama.
                    </p>
                  </div>

                  {/* Toggle Garansi */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <label className="font-bold text-slate-800 block">Sediakan Garansi Servis</label>
                      <p className="text-[10px] text-slate-400">Jaminan perbaikan ulang purna jual untuk konsumen</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditWarrantySupported(!editWarrantySupported)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${editWarrantySupported
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-200 text-slate-600"
                        }`}
                    >
                      <span>{editWarrantySupported ? "Aktif" : "Nonaktif"}</span>
                    </button>
                  </div>

                  {editWarrantySupported && (
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block font-bold text-slate-700 mb-1">
                        Pilih Durasi Jaminan Garansi
                      </label>
                      <select
                        value={editWarrantyDurationDays}
                        onChange={(e) => setEditWarrantyDurationDays(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 text-xs"
                      >
                        {activeDurations.map((d) => (
                          <option key={d.id} value={d.durationDays}>
                            Garansi {d.durationDays} Hari Kalender
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Arsipkan Layanan (Pengganti window.confirm) */}
      {serviceToArchive && (
        <Modal
          isOpen={!!serviceToArchive}
          onClose={() => {
            if (!isArchiving) setServiceToArchive(null);
          }}
          title={
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Archive size={22} weight="duotone" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-display leading-tight">
                  Arsipkan Katalog Layanan
                </h3>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  Konfirmasi pemindahan status ke tab Arsip
                </p>
              </div>
            </div>
          }
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setServiceToArchive(null)}
                disabled={isArchiving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteArchive}
                disabled={isArchiving}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isArchiving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengarsipkan...</span>
                  </>
                ) : (
                  <>
                    <Archive size={15} weight="bold" />
                    <span>Ya, Arsipkan Layanan</span>
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="p-5 sm:p-6 space-y-4 text-xs font-body text-left">
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-900 space-y-1.5">
              <p className="font-semibold text-slate-700 text-xs">
                Apakah Anda yakin ingin mengarsipkan layanan:
              </p>
              <p className="font-extrabold text-sm text-slate-900 font-display bg-white px-3.5 py-2.5 rounded-xl border border-rose-200 shadow-2xs">
                {serviceToArchive.name}
              </p>
            </div>

            <div className="space-y-2.5 text-slate-600 pt-1">
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <p>Layanan akan dipindahkan ke tab <strong>Arsip (Archive)</strong> dan disembunyikan dari katalog publik konsumen.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <p>Riwayat pengerjaan teknisi dan data pesanan yang telah berjalan sebelumnya tetap aman dan tersimpan.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <p className="text-emerald-700 font-semibold">Anda dapat mengaktifkan atau memulihkan kembali layanan ini sewaktu-waktu dari tab Arsip.</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Feedback / Alert Modal (Pengganti window.alert) */}
      {feedbackModal?.isOpen && (
        <Modal
          isOpen={feedbackModal.isOpen}
          onClose={() => {
            feedbackModal.onConfirm?.();
            setFeedbackModal(null);
          }}
          title={
            <div className="flex items-center gap-2.5 text-left">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  feedbackModal.type === "error"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : feedbackModal.type === "info"
                    ? "bg-sky-50 text-primary border border-sky-200"
                    : feedbackModal.type === "success"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}
              >
                {feedbackModal.type === "error" ? (
                  <WarningCircle size={22} weight="fill" />
                ) : feedbackModal.type === "info" ? (
                  <Info size={22} weight="fill" />
                ) : feedbackModal.type === "success" ? (
                  <CheckCircle size={22} weight="fill" />
                ) : (
                  <WarningCircle size={22} weight="fill" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {feedbackModal.title}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pemberitahuan Sistem
                </span>
              </div>
            </div>
          }
          maxWidth="md"
          footer={
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={() => {
                  feedbackModal.onConfirm?.();
                  setFeedbackModal(null);
                }}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition cursor-pointer ${
                  feedbackModal.type === "error"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : feedbackModal.type === "info"
                    ? "bg-primary hover:bg-primary-dark"
                    : feedbackModal.type === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                Mengerti
              </button>
            </div>
          }
        >
          <div className="p-5 text-xs text-slate-600 leading-relaxed font-body text-left">
            {feedbackModal.message}
          </div>
        </Modal>
      )}
    </div>
  );
}
