"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  Wrench,
  Clock,
  SealCheck,
  User,
  CalendarCheck,
  FileText,
  XCircle,
  Plus,
  X,
  Trash,
} from "@phosphor-icons/react";
import { useWarranties } from "@/features/warranties/useWarranties";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { WarrantyV1 } from "@/types/domain";
import { providerWarrantyApi, providerServiceApi, ApiProviderWarrantySettings, ApiProviderWarrantyDuration, ApiProviderMasterService } from "@/lib/servioApi";

export default function ProviderWarrantyStorePage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const {
    providerWarrantySettings,
    providerWarrantyDurations,
    warrantiesV1,
    claimsV1,
    assignmentsV1,
    getWarrantiesByProvider,
    setProviderWarrantyStoreStatus,
    addProviderWarrantyDuration,
    archiveProviderWarrantyDuration,
    grantWarranty,
  } = useWarranties();

  const providerId = user.id || "usr-prov-001";
  const isMatchProvider = (pid: string) =>
    pid === providerId ||
    ((providerId === "prov-01" || providerId === "usr-prov-001") &&
      (pid === "prov-01" || pid === "usr-prov-001" || pid === "org-prov-101"));

  // Canonical API State (Null initially to differentiate loading vs empty, eliminating dummy mock flash)
  const [apiSettings, setApiSettings] = useState<ApiProviderWarrantySettings | null>(null);
  const [apiDurations, setApiDurations] = useState<ApiProviderWarrantyDuration[] | null>(null);
  const [apiServices, setApiServices] = useState<ApiProviderMasterService[] | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(true);

  const fetchBackendWarrantyData = async () => {
    try {
      setIsLoadingApi(true);
      const [warRes, svcRes] = await Promise.allSettled([
        providerWarrantyApi.getSettings(),
        providerServiceApi.list(),
      ]);

      if (warRes.status === "fulfilled" && warRes.value?.data) {
        setApiSettings(warRes.value.data.settings);
        setApiDurations(warRes.value.data.activeDurations || []);
      } else {
        setApiDurations([]);
      }
      if (svcRes.status === "fulfilled" && Array.isArray(svcRes.value?.data)) {
        setApiServices(svcRes.value.data);
      } else {
        setApiServices([]);
      }
    } catch (e) {
      console.warn("Notice: Provider warranty backend data loading error:", e);
      setApiDurations([]);
      setApiServices([]);
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchBackendWarrantyData();
  }, []);

  const settings = apiSettings || {
    id: "pws-def",
    providerId,
    status: "ACTIVE" as const,
  };
  const isStoreActive = settings.status === "ACTIVE";

  // Active warranty durations (strictly from live database API, deduplicated)
  const activeDurations = useMemo(() => {
    if (apiDurations && apiDurations.length > 0) {
      return apiDurations
        .filter((d) => d.status === "ACTIVE")
        .map((d) => ({
          id: d._id || d.id || `dur-${d.durationDays}`,
          providerId: d.providerId,
          durationDays: d.durationDays,
          status: d.status,
        }))
        .filter((d, index, self) => index === self.findIndex((t) => t.durationDays === d.durationDays));
    }
    return [];
  }, [apiDurations]);

  // Services of this provider with warranty configurations (strictly from live database API)
  const providerServices = useMemo(() => {
    if (apiServices && apiServices.length > 0) {
      return apiServices.map((s) => ({
        id: s.id || s._id || "",
        name: s.name,
        categoryName: s.categoryName,
        subcategoryName: s.subcategoryName,
        warrantyConfig: s.warrantyConfig || { warrantyEnabled: true, durationDays: 30 },
      }));
    }
    return [];
  }, [apiServices]);

  // Provider Warranties
  const providerWarranties = getWarrantiesByProvider(providerId);
  const pendingWarranties = providerWarranties.filter((w) => w.status === "PENDING_ACTIVATION");
  const activeWarranties = providerWarranties.filter((w) => w.status === "ACTIVE");
  const expiredWarranties = providerWarranties.filter((w) => w.status === "EXPIRED");

  // Pending claims count for badge
  const pendingClaimsCount = claimsV1.filter((c) => {
    const war = warrantiesV1.find((w) => w.id === c.warrantyId);
    return war && isMatchProvider(war.providerId) && c.status !== "RESOLVED" && c.status !== "REJECTED";
  }).length;

  // Active Tab state: [Siap Diaktifkan] [Garansi Aktif] [Garansi Berakhir]
  type WarrantyTab = "PENDING_ACTIVATION" | "ACTIVE" | "EXPIRED";
  const [activeTab, setActiveTab] = useState<WarrantyTab>("PENDING_ACTIVATION");

  // Selected warranty for detail modal
  const [selectedWarrantyForModal, setSelectedWarrantyForModal] = useState<WarrantyV1 | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Warranty Duration Modal State (Integrated with Tambah Layanan)
  const [isAddDurationModalOpen, setIsAddDurationModalOpen] = useState(false);
  const [newDurationDays, setNewDurationDays] = useState<number>(30);

  // Delete / Archive Duration State & Modal
  const [isManageDeleteModalOpen, setIsManageDeleteModalOpen] = useState(false);
  const [durationToDelete, setDurationToDelete] = useState<{ id: string; days: number } | null>(null);

  // Per-order warranty duration selection when granting
  const [grantDurations, setGrantDurations] = useState<Record<string, number>>({});

  // Actions
  const handleToggleStore = async () => {
    const newStatus = !isStoreActive;
    try {
      if (newStatus) {
        await providerWarrantyApi.activateStore();
      } else {
        await providerWarrantyApi.deactivateStore();
      }
      await fetchBackendWarrantyData();
    } catch (e) {
      // Fallback
      setProviderWarrantyStoreStatus(providerId, newStatus);
    }
    setToastMessage(`Garansi Toko berhasil ${newStatus ? "diaktifkan" : "dinonaktifkan"}.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDurationDays || newDurationDays <= 0) {
      alert("Masukkan durasi hari yang valid (minimal 1 hari).");
      return;
    }
    try {
      await providerWarrantyApi.addDuration(Number(newDurationDays));
      await fetchBackendWarrantyData();
      setIsAddDurationModalOpen(false);
      setToastMessage(
        `Durasi ${newDurationDays} Hari berhasil ditambahkan dan langsung terintegrasi ke pilihan Tambah Layanan!`
      );
      setTimeout(() => setToastMessage(null), 3500);
      setNewDurationDays(30);
    } catch (err: any) {
      try {
        addProviderWarrantyDuration(providerId, Number(newDurationDays));
        setIsAddDurationModalOpen(false);
        setToastMessage(
          `Durasi ${newDurationDays} Hari berhasil ditambahkan dan langsung terintegrasi ke pilihan Tambah Layanan!`
        );
        setTimeout(() => setToastMessage(null), 3500);
        setNewDurationDays(30);
      } catch (fallbackErr: any) {
        alert(err.message || fallbackErr.message || "Gagal menambahkan durasi garansi.");
      }
    }
  };

  const handleConfirmDeleteDuration = async () => {
    if (!durationToDelete) return;
    try {
      await providerWarrantyApi.archiveDuration(durationToDelete.id);
      await fetchBackendWarrantyData();
      setToastMessage(`Opsi garansi ${durationToDelete.days} Hari berhasil dihapus dari daftar pilihan.`);
      setTimeout(() => setToastMessage(null), 3500);
      setDurationToDelete(null);
    } catch (err: any) {
      try {
        // Archive all active matching duration records for this provider
        const toArchive = providerWarrantyDurations.filter(
          (d) => isMatchProvider(d.providerId) && d.durationDays === durationToDelete.days && d.status === "ACTIVE"
        );
        if (toArchive.length > 0) {
          toArchive.forEach((rec) => archiveProviderWarrantyDuration(rec.id));
        } else {
          archiveProviderWarrantyDuration(durationToDelete.id);
        }
        setToastMessage(`Opsi garansi ${durationToDelete.days} Hari berhasil dihapus dari daftar pilihan.`);
        setTimeout(() => setToastMessage(null), 3500);
        setDurationToDelete(null);
      } catch (fallbackErr: any) {
        alert(err.message || fallbackErr.message || "Gagal menghapus opsi durasi garansi.");
      }
    }
  };

  const handleGrantWarranty = (warranty: WarrantyV1) => {
    try {
      const chosenDuration = grantDurations[warranty.id] || warranty.durationDaysSnapshot || activeDurations[0]?.durationDays || 30;
      warranty.durationDaysSnapshot = chosenDuration;
      grantWarranty(providerId, warranty.id);
      setToastMessage(`Garansi #${warranty.id} (Pesanan #${warranty.originalServiceOrderId}) durasi ${chosenDuration} Hari berhasil diterbitkan!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan garansi.");
    }
  };

  // Helper date formatters
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const calculatePeriod = (startDateStr: string | null | undefined, durationDays: number) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    const end = new Date(start.getTime() + durationDays * 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const calculateRemainingDays = (expiresAtStr: string | null | undefined) => {
    if (!expiresAtStr) return 0;
    const now = Date.now();
    const exp = new Date(expiresAtStr).getTime();
    const diff = Math.ceil((exp - now) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  };

  // Helper to determine claim status for an active warranty card
  const getWarrantyClaimStatus = (warrantyId: string) => {
    const claim = claimsV1.find(
      (c) => c.warrantyId === warrantyId && c.status !== "RESOLVED" && c.status !== "REJECTED"
    );
    if (!claim) {
      return { hasClaim: false, text: "Tidak ada pengajuan aktif" };
    }
    const asg = assignmentsV1.find((a) => a.warrantyClaimId === claim.id);
    let stageName = "Pemeriksaan";
    if (claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW") stageName = "Pengajuan Baru";
    else if (claim.status === "INSPECTION_SCHEDULED") stageName = "Terjadwal";
    else if (asg?.otwAt && !asg?.checkInAt) stageName = "Teknisi OTW";
    else if (asg?.checkInAt) stageName = "Pemeriksaan";
    else if (claim.status === "WAITING_PROVIDER_DECISION") stageName = "Menunggu Keputusan";
    else if (claim.status === "REPAIR_IN_PROGRESS" || claim.status === "REPAIR_APPROVED") stageName = "Pengerjaan";

    return {
      hasClaim: true,
      text: `${claim.claimNumber} • ${stageName}`,
    };
  };

  return (
    <div className="space-y-6 font-body pb-20 text-left w-full bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle size={20} className="text-emerald-400 shrink-0" weight="fill" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Garansi Toko"
        description="Kelola status aktivasi garansi toko, ringkasan proteksi layanan, dan seluruh kartu garansi pelanggan."
        breadcrumbs={[
          { label: "Mitra Bengkel", href: "/provider/dashboard" },
          { label: "Garansi", href: "/provider/warranty" },
        ]}
      />

      <div className="space-y-6 w-full">
        {/* ========================================================================= */}
        {/* 1. STATUS GARANSI TOKO                                                   */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                STATUS GARANSI TOKO
              </span>
              <div className="flex items-center gap-2.5 pt-0.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    isStoreActive ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300 ring-4 ring-slate-100"
                  }`}
                />
                <h2 className="text-base font-bold font-display text-slate-900">
                  {isStoreActive ? "● AKTIF" : "○ NONAKTIF"}
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                {isStoreActive
                  ? "Toko Anda menyediakan layanan bergaransi resmi untuk order yang dikerjakan teknisi."
                  : "Garansi toko saat ini dinonaktifkan. Order baru tidak akan mendapatkan jaminan garansi."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleStore}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-xs shrink-0 ${
                isStoreActive
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
              }`}
            >
              {isStoreActive ? "Nonaktifkan Garansi Toko" : "Aktifkan Garansi Toko"}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RINGKASAN GARANSI LAYANAN (Master Service Summary)                     */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold font-display text-slate-900 uppercase tracking-wide">
                STATUS GARANSI KATALOG LAYANAN
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar layanan toko Anda yang menyediakan proteksi garansi purna jual untuk konsumen.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddDurationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-[#0F4C81] transition shrink-0 shadow-2xs"
              >
                <Plus size={14} weight="bold" />
                <span>Tambah Waktu Garansi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManageDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition shrink-0 shadow-2xs"
                title="Hapus opsi durasi garansi yang tidak ingin dipakai lagi"
              >
                <Trash size={14} weight="bold" />
                <span>Hapus Opsi Garansi</span>
              </button>

              <Link
                href="/provider/services"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition shrink-0"
              >
                <span>Kelola di Layanan</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {isLoadingApi && apiServices === null ? (
              <div className="col-span-full py-4 text-center text-slate-400">
                <ServioLoadingScreen
                  message="Memuat Layanan Toko..."
                  subMessage="Mengambil data katalog toko SERVIO"
                  fullScreen={false}
                  size="sm"
                  className="min-h-[140px]"
                />
              </div>
            ) : providerServices.length === 0 ? (
              <div className="col-span-full py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                Belum ada layanan aktif di katalog. Tambahkan layanan pada menu Katalog Layanan.
              </div>
            ) : (
              providerServices.map((service) => {
                const isEnabled = service.warrantyConfig ? service.warrantyConfig.warrantyEnabled : true;

                return (
                  <div
                    key={service.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">{service.name}</p>
                      <span className="text-[10px] text-slate-400 block">{service.categoryName || "Umum"}</span>
                    </div>
                    {isEnabled ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shrink-0 flex items-center gap-1 shadow-2xs">
                        <ShieldCheck size={13} weight="fill" />
                        <span>Bergaransi</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
                        Tidak Ada Garansi
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Opsi Durasi Terintegrasi dengan Penerbitan Garansi */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <SealCheck size={14} className="text-emerald-600" weight="fill" />
                <span>Opsi Durasi Siap Diterbitkan:</span>
              </span>
              {activeDurations.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-xl bg-sky-50 text-[#0F4C81] text-[11px] font-bold border border-sky-200 shadow-2xs group hover:border-rose-300 hover:bg-rose-50/30 transition"
                >
                  <Clock size={12} className="text-sky-600 shrink-0" />
                  <span>{d.durationDays} Hari</span>
                  <button
                    type="button"
                    onClick={() => setDurationToDelete({ id: d.id, days: d.durationDays })}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition ml-0.5"
                    title={`Hapus opsi garansi ${d.durationDays} Hari`}
                    aria-label={`Hapus opsi ${d.durationDays} Hari`}
                  >
                    <Trash size={12} weight="bold" />
                  </button>
                </span>
              ))}

              {activeDurations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsManageDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 hover:bg-rose-100 text-[11px] font-bold text-rose-700 transition"
                  title="Buka panel untuk memilih dan menghapus opsi waktu garansi"
                >
                  <Trash size={12} weight="bold" />
                  <span>Hapus Opsi</span>
                </button>
              )}
              {activeDurations.length === 0 && (
                <span className="text-slate-400 text-xs italic">
                  Belum ada opsi durasi aktif. Klik &quot;+ Tambah Waktu Garansi&quot;.
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle size={13} className="text-emerald-600 shrink-0" weight="fill" />
              <span>Diterbitkan ke konsumen setelah pesanan selesai dikerjakan.</span>
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TIGA TAB GARANSI: [Siap Diterbitkan] [Garansi Aktif] [Garansi Berakhir] */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("PENDING_ACTIVATION")}
              className={`px-5 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-2 ${
                activeTab === "PENDING_ACTIVATION"
                  ? "border-[#0F4C81] text-[#0F4C81] bg-blue-50/50 font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Siap Diterbitkan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {pendingWarranties.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-5 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-2 ${
                activeTab === "ACTIVE"
                  ? "border-[#0F4C81] text-[#0F4C81] bg-blue-50/50 font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Garansi Aktif</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                {activeWarranties.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("EXPIRED")}
              className={`px-5 py-2.5 rounded-t-xl transition border-b-2 flex items-center gap-2 ${
                activeTab === "EXPIRED"
                  ? "border-[#0F4C81] text-[#0F4C81] bg-blue-50/50 font-bold"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Garansi Berakhir</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                {expiredWarranties.length}
              </span>
            </button>
          </div>

          {/* TAB 1: SIAP DITERBITKAN */}
          {activeTab === "PENDING_ACTIVATION" && (
            <div>
              {pendingWarranties.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                  <SealCheck size={32} className="text-emerald-500 mx-auto" weight="duotone" />
                  <p className="text-xs font-bold text-slate-700">Semua garansi pesanan selesai telah diterbitkan</p>
                  <p className="text-[11px] text-slate-400">
                    Tidak ada pesanan yang menunggu penerbitan garansi saat ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingWarranties.map((w) => {
                    const chosenDuration = grantDurations[w.id] || w.durationDaysSnapshot || activeDurations[0]?.durationDays || 30;
                    const period = calculatePeriod(w.createdAt, chosenDuration);
                    return (
                      <div
                        key={w.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500 text-white">
                              SIAP DITERBITKAN
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-600 text-white">
                              GARANSI
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] font-mono text-slate-400">
                              #{w.originalServiceOrderId}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 font-display mt-0.5">
                              {w.serviceTitle}
                            </h3>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer</span>
                              <strong className="text-slate-800">{w.customerName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Worker Order</span>
                              <strong className="text-slate-800">{w.originalWorkerName || w.workerName}</strong>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Selesai</span>
                                <strong className="text-slate-800">{formatDate(w.createdAt)}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Pilih Durasi</span>
                                <select
                                  value={chosenDuration}
                                  onChange={(e) =>
                                    setGrantDurations((prev) => ({
                                      ...prev,
                                      [w.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full mt-0.5 px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs font-bold text-[#0F4C81]"
                                >
                                  {activeDurations.map((d) => (
                                    <option key={d.id} value={d.durationDays}>
                                      {d.durationDays} Hari
                                    </option>
                                  ))}
                                  {!activeDurations.some((d) => d.durationDays === chosenDuration) && (
                                    <option value={chosenDuration}>{chosenDuration} Hari</option>
                                  )}
                                </select>
                              </div>
                            </div>
                            <div className="pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                Periode Garansi
                              </span>
                              <strong className="text-slate-700 text-[11px]">{period}</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleGrantWarranty(w)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle size={16} weight="bold" />
                          <span>Terbitkan Garansi ({chosenDuration} Hari)</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GARANSI AKTIF */}
          {activeTab === "ACTIVE" && (
            <div>
              {activeWarranties.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                  <ShieldCheck size={32} className="text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Belum ada garansi aktif</p>
                  <p className="text-[11px] text-slate-400">
                    Aktifkan kartu garansi pelanggan dari tab Siap Diaktifkan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeWarranties.map((w) => {
                    const remainingDays = calculateRemainingDays(w.expiresAt);
                    const claimStatus = getWarrantyClaimStatus(w.id);

                    return (
                      <div
                        key={w.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-600 text-white">
                              AKTIF
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-600 text-white">
                              GARANSI
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {w.id}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 font-display mt-0.5">
                              {w.serviceTitle}
                            </h3>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer</span>
                              <strong className="text-slate-800">{w.customerName}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Worker Order</span>
                              <strong className="text-slate-800">{w.originalWorkerName || w.workerName}</strong>
                            </div>
                            <div className="pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Masa Garansi</span>
                              <strong className="text-slate-700 text-[11px]">
                                {formatDate(w.startedAt)} – {formatDate(w.expiresAt)}
                              </strong>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                              <span className="text-slate-500 font-medium">Sisa Garansi:</span>
                              <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {remainingDays} Hari
                              </strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Claim:</span>
                              <strong className="text-slate-800">{w.claimCount} Pengajuan</strong>
                            </div>
                            <div className="pt-1 border-t border-slate-200/60">
                              <span className="text-slate-400 text-[10px] uppercase font-bold block">Status Claim</span>
                              <span
                                className={`text-[11px] font-bold block mt-0.5 ${
                                  claimStatus.hasClaim ? "text-amber-800" : "text-slate-500"
                                }`}
                              >
                                {claimStatus.text}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedWarrantyForModal(w)}
                          className="w-full py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                        >
                          Lihat Warranty
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GARANSI BERAKHIR */}
          {activeTab === "EXPIRED" && (
            <div>
              {expiredWarranties.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                  <ShieldCheck size={32} className="text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada kartu garansi yang kedaluwarsa</p>
                  <p className="text-[11px] text-slate-400">
                    Seluruh garansi yang telah habis masa berlakunya akan tercatat di sini sebagai arsip.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expiredWarranties.map((w) => (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 opacity-90 hover:opacity-100 transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-500 text-white">
                            BERAKHIR
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-400 text-white">
                            EXPIRED
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {w.id}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 font-display mt-0.5">
                            {w.serviceTitle}
                          </h3>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer</span>
                            <strong className="text-slate-800">{w.customerName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Worker Order</span>
                            <strong className="text-slate-800">{w.originalWorkerName || w.workerName}</strong>
                          </div>
                          <div className="pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">Masa Garansi</span>
                            <strong className="text-slate-500 text-[11px]">
                              {formatDate(w.startedAt)} – {formatDate(w.expiresAt)}
                            </strong>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Claim:</span>
                            <strong className="text-slate-800">{w.claimCount} Pengajuan</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedWarrantyForModal(w)}
                        className="w-full py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                      >
                        Lihat Riwayat
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL: LIHAT WARRANTY / RIWAYAT */}
      {selectedWarrantyForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-[#0F4C81] text-white">
                  KARTU GARANSI RESMI
                </span>
                <h3 className="text-base font-bold text-slate-900 font-display mt-1">
                  Sertifikat #{selectedWarrantyForModal.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWarrantyForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Layanan:</span>
                <p className="font-bold text-slate-900 text-sm">{selectedWarrantyForModal.serviceTitle}</p>
                <p className="text-slate-500 text-[11px]">
                  Pesanan Awal: #{selectedWarrantyForModal.originalServiceOrderId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Customer:</span>
                  <p className="font-bold text-slate-800">{selectedWarrantyForModal.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Teknisi:</span>
                  <p className="font-bold text-slate-800">
                    {selectedWarrantyForModal.originalWorkerName || selectedWarrantyForModal.workerName}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Mulai Berlaku:</span>
                  <p className="font-bold text-slate-800">{formatDate(selectedWarrantyForModal.startedAt)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Kedaluwarsa:</span>
                  <p className="font-bold text-slate-800">{formatDate(selectedWarrantyForModal.expiresAt)}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Riwayat Klaim Terkait:
                </span>
                {claimsV1.filter((c) => c.warrantyId === selectedWarrantyForModal.id).length === 0 ? (
                  <p className="text-slate-400 italic text-[11px]">Belum ada klaim diajukan.</p>
                ) : (
                  claimsV1
                    .filter((c) => c.warrantyId === selectedWarrantyForModal.id)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-0.5 text-[11px]"
                      >
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800">{c.claimNumber}</span>
                          <span className="text-sky-700">{c.status}</span>
                        </div>
                        <p className="text-slate-600">{c.reason}</p>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedWarrantyForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Waktu Garansi (Terintegrasi dengan Tambah Layanan) */}
      {isAddDurationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-xs font-body">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  INTEGRASI TAMBAH LAYANAN
                </span>
                <h3 className="text-base font-bold font-display text-slate-900 mt-1">
                  Tambah Waktu Garansi Toko
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDurationModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleAddDuration} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jumlah Hari Garansi
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newDurationDays}
                    onChange={(e) => setNewDurationDays(Number(e.target.value))}
                    placeholder="Contoh: 90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    Hari
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500">
                  Pilihan Cepat (Preset):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[14, 30, 45, 60, 90, 180].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setNewDurationDays(days)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                        newDurationDays === days
                          ? "bg-[#0F4C81] text-white border-[#0F4C81]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {days} Hari
                    </button>
                  ))}
                </div>
              </div>

              {/* Integration Callout */}
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-sky-800">
                  <CheckCircle size={14} className="text-sky-700 shrink-0" weight="fill" />
                  <span>Otomatis Terintegrasi ke Tambah Layanan</span>
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Durasi yang Anda tambahkan di sini akan langsung tersedia sebagai opsi pilihan pada menu dropdown <strong>&quot;Garansi Layanan&quot;</strong> saat Anda menambah atau mengedit layanan di halaman <Link href="/provider/services" className="font-bold text-[#0F4C81] hover:underline">Kelola Layanan</Link>.
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDurationModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0F4C81] text-white font-bold hover:bg-sky-800 transition shadow-xs"
                >
                  Simpan Durasi Garansi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Opsi Durasi Garansi */}
      {durationToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs font-body">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash size={24} weight="duotone" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold font-display text-slate-900">
                Hapus Opsi Garansi?
              </h3>
              <p className="text-slate-600">
                Apakah Anda yakin ingin menghapus opsi garansi <strong className="text-slate-900">{durationToDelete.days} Hari</strong>?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                Opsi ini tidak akan lagi muncul pada menu dropdown <strong>Tambah / Edit Layanan</strong>. Layanan atau garansi yang sedang aktif tidak akan terpengaruh.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDurationToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDuration}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-xs"
              >
                Hapus Opsi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola & Hapus Opsi Durasi Garansi */}
      {isManageDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-xs font-body">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-900">
                    Hapus Opsi Durasi Garansi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hapus pilihan waktu garansi agar tidak muncul lagi pada Tambah Layanan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageDeleteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeDurations.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p>Tidak ada opsi durasi garansi yang aktif.</p>
                </div>
              ) : (
                activeDurations.map((d) => {
                  const usedCount = providerServices.filter((s) => {
                    const cfg = s.warrantyConfig || repo.getServiceWarrantyConfig(s.id);
                    return cfg && cfg.warrantyEnabled && cfg.durationDays === d.durationDays;
                  }).length;

                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs">
                          {d.durationDays}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            Garansi {d.durationDays} Hari
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {usedCount > 0 ? `Digunakan di ${usedCount} layanan toko` : "Belum terpakai di layanan aktif"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsManageDeleteModalOpen(false);
                          setDurationToDelete({ id: d.id, days: d.durationDays });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition shadow-2xs"
                      >
                        <Trash size={12} weight="bold" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-[11px] space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle size={13} className="text-amber-700 shrink-0" weight="fill" />
                <span>Aman Terhadap Data Berjalan</span>
              </p>
              <p className="text-amber-800 text-[10px] leading-relaxed">
                Menghapus opsi garansi hanya menghilangkannya dari dropdown form Tambah / Edit Layanan. Layanan dan kartu garansi aktif pelanggan yang sudah dibuat tidak akan berubah atau terhapus.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsManageDeleteModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
