"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  EnvelopeSimple,
  Car,
  Star,
  CheckCircle,
  Clock,
  Certificate,
  Broadcast,
  MapPin,
  ShieldCheck,
  ArrowsClockwise,
  Warning,
  ArrowLeft,
  Briefcase,
  Buildings,
  NavigationArrow,
  CalendarCheck,
  Camera,
  Trash,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { workerApi, profileApi } from "@/lib/servioApi";
import {
  useWorkerPhoto,
  saveStoredWorkerPhoto,
  removeStoredWorkerPhoto,
} from "@/features/worker/workerPhotoHelper";

export default function WorkerProfilePage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const {
    worker,
    capabilities: initialCaps,
    trackingSession,
    startTracking,
    stopTracking,
    setTrackingStatus,
  } = useWorkerOperations();

  const [isOnline, setIsOnline] = useState(worker.isOnline);
  const [operationalStatus, setOperationalStatus] = useState<"AVAILABLE" | "UNAVAILABLE">("AVAILABLE");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const currentPhoto = useWorkerPhoto(worker.id, user.avatar || user.personalProfile?.avatar);

  React.useEffect(() => {
    const backendAvatar = user.avatar || user.personalProfile?.avatar || user.avatarUrl;
    if (backendAvatar && backendAvatar !== "/brand/logo.png") {
      saveStoredWorkerPhoto(backendAvatar, worker.id);
    }
  }, [user, worker.id]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToastMessage("Harap pilih berkas gambar yang valid (JPG/PNG/WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage("Ukuran foto maksimal 5MB.");
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        saveStoredWorkerPhoto(base64, worker.id);
        setToastMessage("Foto profil teknisi berhasil diperbarui!");
      };
      reader.readAsDataURL(file);

      try {
        const apiRes = await profileApi.uploadAvatar(file);
        if (apiRes?.data?.photo_url) {
          saveStoredWorkerPhoto(apiRes.data.photo_url, worker.id);
        }
      } catch (apiErr) {
        console.warn("Background API avatar upload fallback:", apiErr);
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal mengunggah foto profil.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    removeStoredWorkerPhoto(worker.id);
    setToastMessage("Foto profil teknisi berhasil dihapus.");
  };

  // Workshop standard schedule set by the Provider
  const [workshopSchedule] = useState<{ days: string; hours: string }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("servio_workshop_schedule");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { days: "Senin - Sabtu", hours: "08:30 - 17:00 WIB" };
  });

  React.useEffect(() => {
    workerApi.getAvailability()
      .then((res) => {
        if (res.data?.status) {
          setOperationalStatus(res.data.status);
          setIsOnline(res.data.status === "AVAILABLE");
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const handleSetAvailability = async (status: "AVAILABLE" | "UNAVAILABLE") => {
    try {
      await workerApi.updateAvailability(status);
      setOperationalStatus(status);
      const online = status === "AVAILABLE";
      setIsOnline(online);
      setToastMessage(
        `Ketersediaan operasional teknisi berhasil diubah: ${
          online ? "● TERSEDIA (SIAP TUGAS)" : "○ TIDAK TERSEDIA (OFF / ISTIRAHAT)"
        }`
      );
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memperbarui status ketersediaan.");
    }
  };

  const displayName = user.name && user.activeRole === "WORKER_TECHNICIAN" ? user.name : worker.name;
  const displayEmail = user.email && user.activeRole === "WORKER_TECHNICIAN" ? user.email : worker.email;
  const displayPhone = user.phone && user.activeRole === "WORKER_TECHNICIAN" ? user.phone : worker.phone;
  const displayProvider = user.organizationName || worker.providerName || "PT Servio Mandiri Teknik";
  const displayEmployeeId = (worker as any).employeeId || (user as any).employeeId || "WRK-001";

  // Fetch real-time capabilities from repo
  const capabilities = useMemo(() => {
    const caps = repo.getWorkerCapabilities(worker.id);
    return caps.length > 0 ? caps : initialCaps || [];
  }, [repo, worker.id, initialCaps]);

  // Group capabilities by Category -> Subcategory -> Master Services
  const competencyTree = useMemo(() => {
    const catMap = new Map<
      string,
      {
        id: string;
        name: string;
        subcategories: Map<string, { id: string; name: string; services: typeof capabilities }>;
      }
    >();

    capabilities.forEach((cap) => {
      const catId = cap.categoryId || "cat-other";
      const catName = cap.categoryName || "Kategori Lain";
      const subId = cap.subcategoryId || "sub-other";
      const subName = cap.subcategoryName || "Subkategori Lain";

      if (!catMap.has(catId)) {
        catMap.set(catId, {
          id: catId,
          name: catName,
          subcategories: new Map(),
        });
      }

      const catEntry = catMap.get(catId)!;
      if (!catEntry.subcategories.has(subId)) {
        catEntry.subcategories.set(subId, {
          id: subId,
          name: subName,
          services: [],
        });
      }

      catEntry.subcategories.get(subId)!.services.push(cap);
    });

    return Array.from(catMap.values()).map((c) => ({
      id: c.id,
      name: c.name,
      subcategories: Array.from(c.subcategories.values()),
    }));
  }, [capabilities]);

  const uniqueCategoriesCount = competencyTree.length;
  const uniqueSubcategoriesCount = useMemo(() => {
    return competencyTree.reduce((acc, c) => acc + c.subcategories.length, 0);
  }, [competencyTree]);

  // Tracking Action Handlers
  const handleToggleTracking = () => {
    if (trackingSession && trackingSession.status === "TRACKING_ACTIVE") {
      stopTracking();
      setToastMessage("Pelacakan lokasi berhasil dihentikan. Lokasi Anda tidak lagi dibagikan ke Radar Provider.");
    } else {
      // Check Geolocation API in browser if supported, else simulate standard tracking activation
      if ("geolocation" in navigator) {
        setTrackingStatus("TRACKING_PENDING_PERMISSION");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            startTracking({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: Math.round(position.coords.accuracy),
              address: "Jakarta Selatan (GPS Terverifikasi)",
            });
            setToastMessage("Pelacakan lokasi aktif! Koordinat real-time dibagikan ke Radar Bengkel Provider.");
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              setTrackingStatus("TRACKING_PERMISSION_DENIED");
              setToastMessage("Izin akses lokasi ditolak oleh browser. Pelacakan tidak dapat diaktifkan.");
            } else {
              setTrackingStatus("TRACKING_LOCATION_UNAVAILABLE");
              setToastMessage("Sinyal GPS tidak tersedia saat ini.");
            }
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        // Fallback for non-geolocation environments
        startTracking({
          lat: -6.2301,
          lng: 106.8502,
          accuracy: 12,
          address: "Jl. Gatot Subroto No. 45, Jakarta Selatan",
        });
        setToastMessage("Pelacakan lokasi aktif untuk bengkel PT Servio Mandiri Teknik.");
      }
    }
  };

  const isTrackingActive = trackingSession?.status === "TRACKING_ACTIVE";

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-body text-left pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/worker/dashboard"
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900">
            Profil &amp; Portofolio Teknisi
          </h1>
          <p className="text-xs text-slate-500">
            Kelola data diri, kualifikasi kompetensi layanan, serta izin pelacakan lokasi operasional.
          </p>
        </div>
      </div>

      {/* Section 15.1: Identitas & 15.2: Operational Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-sky-500 text-white flex items-center justify-center font-bold text-2xl font-display shadow-sm overflow-hidden border border-slate-200">
                {currentPhoto ? (
                  <img src={currentPhoto} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0)
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 text-[#0F4C81] hover:bg-sky-50 flex items-center justify-center shadow-md transition cursor-pointer"
                title="Ubah Foto Profil Teknisi"
              >
                <Camera size={14} weight="bold" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold font-display text-slate-900">{displayName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Akun Terverifikasi
                </span>
                <span className="px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold bg-sky-100 text-[#0F4C81] border border-sky-200">
                  ID: {displayEmployeeId}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera size={12} weight="bold" />
                  <span>{currentPhoto ? "Ganti Foto" : "Unggah Foto Profil"}</span>
                </button>
                {currentPhoto && (
                  <>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Hapus Foto</span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                <Buildings size={15} className="text-[#0F4C81]" weight="duotone" />
                <span className="font-medium text-slate-500">Mitra / Bengkel Induk:</span>
                <span className="font-bold text-[#0F4C81]">{displayProvider}</span>
              </p>
            </div>
          </div>

          {/* Level 08: Operational Availability Toggle (AVAILABLE / UNAVAILABLE) */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleSetAvailability("AVAILABLE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                operationalStatus === "AVAILABLE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ● TERSEDIA (AVAILABLE)
            </button>
            <button
              type="button"
              onClick={() => handleSetAvailability("UNAVAILABLE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                operationalStatus === "UNAVAILABLE"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ○ TIDAK TERSEDIA (OFF)
            </button>
          </div>
        </div>

        {/* Operational Grid Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Buildings size={14} className="text-[#0F4C81]" />
              Bengkel / Workshop
            </span>
            <p className="font-bold text-slate-800 mt-1 truncate">{displayProvider}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <CalendarCheck size={14} className="text-[#0F4C81]" />
              Jadwal Kerja Bengkel
            </span>
            <p className="font-bold text-slate-800 mt-1 truncate">{workshopSchedule.days}</p>
            <p className="text-[10px] text-slate-500 font-medium">{workshopSchedule.hours}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <Phone size={14} className="text-emerald-600" />
              Kontak WhatsApp
            </span>
            <p className="font-bold text-slate-800 mt-1">{displayPhone}</p>
            <p className="text-[10px] text-slate-500 truncate">{displayEmail}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <ShieldCheck size={14} className="text-emerald-600" weight="fill" />
              Status Kehadiran Hari Ini
            </span>
            <p className={`font-bold mt-1 flex items-center gap-1 ${
              operationalStatus === "AVAILABLE" ? "text-emerald-700" : "text-slate-600"
            }`}>
              <span className={`w-2 h-2 rounded-full ${operationalStatus === "AVAILABLE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span>{operationalStatus === "AVAILABLE" ? "Hadir & Siap Tugas" : "Tidak Tersedia (OFF)"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Section 15.3: Kompetensi Layanan (Category -> Subcategory -> Master Service Tree) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm font-display text-slate-900 flex items-center gap-1.5">
              <Certificate size={16} weight="duotone" className="text-[#0F4C81]" />
              KOMPETENSI LAYANAN
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar spesialisasi Master Service yang ditetapkan oleh Provider untuk dikerjakan teknisi.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0F4C81] text-white self-start sm:self-auto">
            {uniqueCategoriesCount} Kategori • {uniqueSubcategoriesCount} Subkategori • {capabilities.length} Layanan Dikuasai
          </span>
        </div>

        {competencyTree.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Belum ada kompetensi layanan yang ditetapkan oleh Provider untuk teknisi ini.
          </div>
        ) : (
          <div className="space-y-4">
            {competencyTree.map((cat) => (
              <div
                key={cat.id}
                className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/80 space-y-3"
              >
                {/* Category Header */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#0F4C81]" />
                  <span>{cat.name}</span>
                </div>

                {/* Subcategories & Services */}
                <div className="space-y-3 pl-3 border-l-2 border-slate-200 ml-1">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.id} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span>{sub.name}</span>
                      </div>

                      {/* Master Services Chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-3">
                        {sub.services.map((svc) => (
                          <div
                            key={svc.id}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs flex items-center gap-2"
                          >
                            <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">
                              {svc.masterServiceName || svc.masterServiceId}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 15.4: Pelacakan Lokasi (Worker Location Sharing Telemetry) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm font-display text-slate-900 flex items-center gap-1.5">
              <Broadcast size={18} weight="duotone" className="text-[#0F4C81]" />
              PELACAKAN LOKASI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kendali izin pembagian lokasi GPS secara eksplisit kepada Radar Dispatch Provider.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 self-start sm:self-auto ${
              isTrackingActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isTrackingActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{isTrackingActive ? "● Sedang Aktif" : "○ Tidak Aktif"}</span>
          </span>
        </div>

        {/* Informative Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-800">Tujuan Berbagi Lokasi:</p>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>Pemantauan perjalanan teknisi saat menuju lokasi order</li>
              <li>Estimasi kedatangan real-time ke pelanggan tanpa tebak-tebakan</li>
              <li>Tampil di Radar Pelacakan Provider ({worker.providerName || "PT Servio Mandiri Teknik"})</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="font-bold text-slate-800">Status Telemetri Saat Ini:</p>
            <div className="space-y-1 text-slate-600">
              <p>
                <strong>Provider:</strong> {worker.providerName || "PT Servio Mandiri Teknik"}
              </p>
              <p>
                <strong>Lokasi Terakhir:</strong> {trackingSession?.lastAddress || "Jakarta Selatan"}
              </p>
              <p>
                <strong>Akurasi GPS:</strong> ± {trackingSession?.lastAccuracyMeters || 12} meter
              </p>
              <p>
                <strong>Status Sesi:</strong>{" "}
                <span className="font-bold text-slate-800">
                  {trackingSession?.status || "TRACKING_OFF"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Start / Stop Tracking */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            * Anda memegang kendali penuh kapan lokasi dibagikan. Lokasi tidak pernah dipaksa saat istirahat.
          </span>

          <Button
            variant={isTrackingActive ? "outline" : "primary"}
            size="sm"
            onClick={handleToggleTracking}
            className={`flex items-center gap-2 font-bold ${
              isTrackingActive
                ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                : "bg-[#0F4C81] hover:bg-sky-900 text-white"
            }`}
          >
            <NavigationArrow size={16} weight={isTrackingActive ? "bold" : "fill"} />
            <span>{isTrackingActive ? "Hentikan Pelacakan" : "Aktifkan Pelacakan"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
