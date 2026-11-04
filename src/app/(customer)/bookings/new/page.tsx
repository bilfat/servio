"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useServices } from "@/features/discovery/useServices";
import { useBookingWizard } from "@/features/booking/useBookingWizard";
import { DynamicFieldRenderer, FieldSchema } from "@/components/form/DynamicFieldRenderer";
import { UploadDropzone, UploadedFile } from "@/components/form/UploadDropzone";
import { profileApi, locationApi, ApiAddress } from "@/lib/servioApi";
import {
  ArrowLeft,
  ArrowRight,
  House,
  ShieldCheck,
  Wrench,
  Info,
  WarningCircle,
  MapPin,
  CalendarCheck,
  Lightning,
  Clock,
  User,
  Phone,
  CheckCircle,
  FileText,
  X,
} from "@phosphor-icons/react";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";

function BookingWizardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 w-32 bg-slate-200 rounded-full" />
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-2 bg-slate-200 rounded-full" />
          ))}
        </div>
      </div>
      <div className="h-96 bg-slate-100 rounded-3xl border border-slate-200" />
    </div>
  );
}

function BookingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get("serviceId");
  const { services } = useServices();
  const { createBooking } = useOrderJasa();
  const initialService = services.find((s) => s.id === serviceIdParam) || services[0];

  const {
    state,
    setService,
    setSchedule,
    setAddress,
    setCustomFields,
    nextStep,
    prevStep,
    isSubmitting,
  } = useBookingWizard(initialService);

  useEffect(() => {
    if (services.length > 0) {
      const match = services.find((s) => s.id === serviceIdParam) || services[0];
      if (match && (!state.service || state.service.id !== match.id)) {
        setService(match);
      }
    }
  }, [services, serviceIdParam, state.service, setService]);

  const [stepError, setStepError] = useState<string | null>(null);

  // 1. Files uploaded state (Langkah 1)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // 2. Saved Addresses from Identity DB (Langkah 2)
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [coverageResult, setCoverageResult] = useState<{
    status: string;
    distanceKm: number | null;
    covered: boolean;
  } | null>(null);
  const [isEvaluatingLocation, setIsEvaluatingLocation] = useState(false);

  // Load saved addresses directly from Identity Service
  useEffect(() => {
    profileApi.getAddresses().then((res) => {
      if (res.data && res.data.length > 0) {
        setSavedAddresses(res.data);
        const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          const fullStreet = [
            defaultAddr.addressLine,
            defaultAddr.village ? `Kel. ${defaultAddr.village}` : null,
            defaultAddr.district ? `Kec. ${defaultAddr.district}` : null,
          ].filter(Boolean).join(", ");

          setAddress({
            street: fullStreet || defaultAddr.addressLine,
            city: defaultAddr.city,
            notes: "",
          });

          // Evaluate location coverage
          if (defaultAddr.latitude != null && defaultAddr.longitude != null) {
            setIsEvaluatingLocation(true);
            locationApi.evaluate({
              source: "SAVED_ADDRESS",
              addressId: defaultAddr.id,
              latitude: Number(defaultAddr.latitude),
              longitude: Number(defaultAddr.longitude),
              displayAddress: defaultAddr.addressLine,
              providerMasterServiceId: state.service?.id,
            }).then((evalRes) => {
              if (evalRes.data) {
                setCoverageResult({
                  status: evalRes.data.coverage.status,
                  distanceKm: evalRes.data.distanceKm,
                  covered: evalRes.data.coverage.covered,
                });
              }
            }).catch(() => {}).finally(() => setIsEvaluatingLocation(false));
          }
        }
      }
    }).catch(() => {});
  }, []);

  // 3. Schedule state (Langkah 3: Sekarang vs Nanti, Strictly Format 24 Jam)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [scheduleMode, setScheduleMode] = useState<"SEKARANG" | "NANTI">("SEKARANG");
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [customHour, setCustomHour] = useState<string>("10");
  const [customMinute, setCustomMinute] = useState<string>("00");
  const customTime = `${customHour}:${customMinute}`;

  // Sync schedule whenever scheduleMode, customDate, customHour, or customMinute changes
  useEffect(() => {
    if (scheduleMode === "SEKARANG") {
      setSchedule(todayStr, "Segera Hari Ini (Est. 30-60 Menit)");
    } else {
      setSchedule(customDate || todayStr, `${customHour}:${customMinute} WIB`);
    }
  }, [scheduleMode, customDate, customHour, customMinute, todayStr, setSchedule]);

  // Handler batal order untuk kembali ke halaman sebelumnya
  const handleCancelBooking = () => {
    if (typeof window !== "undefined" && window.confirm("Apakah Anda yakin ingin membatalkan pemesanan ini dan kembali?")) {
      if (window.history.length > 1) {
        router.back();
      } else if (state.service?.id) {
        router.push(`/services/${state.service.id}`);
      } else {
        router.push("/services");
      }
    }
  };

  const handleSelectPopularTime = (timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts[0]) setCustomHour(parts[0].padStart(2, "0"));
    if (parts[1]) setCustomMinute(parts[1].padStart(2, "0"));
  };

  const dynamicFields: FieldSchema[] = [
    {
      id: "brand",
      label: "Merk & Model Unit",
      type: "text",
      placeholder: "Contoh: Daikin FTKQ25SVM4 / Panasonic Inverter 1 PK",
      required: true,
    },
    {
      id: "issueDetails",
      label: "Deskripsi Detail Masalah / Gejala",
      type: "textarea",
      placeholder: "Jelaskan apa yang terjadi pada unit Anda (misal: AC tidak dingin, hanya keluar angin, bocor air pada indoor unit)...",
      required: true,
    },
  ];

  const steps = [
    { number: 1, label: "Detail Unit & Kendala" },
    { number: 2, label: "Lokasi & Mode" },
    { number: 3, label: "Pilih Jadwal" },
    { number: 4, label: "Ringkasan & Kebijakan" },
  ];

  const handleNextStep = () => {
    setStepError(null);
    if (state.step === 1) {
      const brand = state.customFieldValues?.brand;
      const issue = state.customFieldValues?.issueDetails;
      if (!brand || String(brand).trim().length < 2) {
        setStepError("Merk & Model Unit wajib diisi.");
        return;
      }
      if (!issue || String(issue).trim().length < 5) {
        setStepError("Deskripsi detail masalah/gejala wajib diisi minimal 5 karakter.");
        return;
      }
    } else if (state.step === 2) {
      if (!selectedAddressId && (!state.address.street || state.address.street.length < 5)) {
        setStepError("Silakan pilih alamat tersimpan atau masukkan alamat lengkap pengerjaan.");
        return;
      }
    } else if (state.step === 3) {
      if (scheduleMode === "NANTI") {
        if (!customDate) {
          setStepError("Silakan tentukan tanggal kunjungan teknisi.");
          return;
        }
        if (!customTime) {
          setStepError("Silakan pilih jam kedatangan yang Anda inginkan.");
          return;
        }
      }
    }
    nextStep();
  };

  const selectedAddr = useMemo(() => {
    return savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
  }, [savedAddresses, selectedAddressId]);

  const handleSubmit = async () => {
    try {
      setStepError(null);
      const recipientName = selectedAddr?.recipientName || "Pelanggan Servio";
      const recipientPhone = selectedAddr?.phone || "-";
      const districtName = selectedAddr?.district || "Area Layanan";
      const cityName = selectedAddr?.city || state.address.city || "Jakarta";
      const fullAddr = [
        selectedAddr?.addressLine || state.address.street,
        selectedAddr?.village ? `Kel. ${selectedAddr.village}` : null,
        selectedAddr?.district ? `Kec. ${selectedAddr.district}` : null,
        selectedAddr?.city || null,
        selectedAddr?.province || null,
        selectedAddr?.postalCode || null,
      ].filter(Boolean).join(", ");

      const issueText = String(state.customFieldValues?.issueDetails || "").trim();
      const brandModel = String(state.customFieldValues?.brand || "").trim();
      const complaintText = issueText || (state.service?.title ? `Permintaan servis: ${state.service.title}` : "Permohonan servis unit pelanggan");
      const symptomsList = brandModel ? [brandModel] : ["Pemeriksaan unit"];
      const complaintPhotos = uploadedFiles.map((f) => f.url);

      const targetDate = scheduleMode === "SEKARANG" ? todayStr : (customDate || todayStr);
      const targetTimeSlot = scheduleMode === "SEKARANG"
        ? `${new Date().getHours().toString().padStart(2, "0")}:${new Date().getMinutes().toString().padStart(2, "0")} WIB`
        : `${customTime} WIB`;

      const newOrder = await createBooking({
        serviceId: state.service?.id || "6129bf1a-ee2b-4c63-92c0-d32f9df2bfcd",
        providerId: state.service?.providerId || "0740d857-b665-4191-aaf5-d7dd3611dc1d",
        complaintDescription: complaintText,
        symptoms: symptomsList,
        complaintPhotos,
        address: {
          recipientName,
          phone: recipientPhone,
          fullAddress: fullAddr,
          district: districtName,
          city: cityName,
          notes: state.address.notes || "",
        },
        scheduledDate: targetDate,
        scheduledTimeSlot: targetTimeSlot,
        addressId: selectedAddressId || undefined,
      } as any);

      router.push(`/orders/${newOrder.id}`);
    } catch (err: any) {
      console.error("Gagal submit booking:", err);
      setStepError(err?.message || "Gagal mengirim permohonan booking ke database. Silakan coba lagi.");
    }
  };

  // Generate date chips for next 7 days
  const dateOptions = useMemo(() => {
    const list = [];
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayLabel = i === 0 ? "HARI INI" : dayNames[d.getDay()];
      const dateNum = d.getDate();
      const monthLabel = monthNames[d.getMonth()];
      list.push({ iso, dayLabel, dateNum, monthLabel });
    }
    return list;
  }, []);

  const popularTimes = ["08:00", "08:30", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "19:00", "20:00"];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Wizard Header & Stepper */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Langkah {state.step} dari 4
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark mt-1">
              Pemesanan Servis Terstandar
            </h1>
            <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
              Layanan: <strong className="text-neutral-dark">{state.service?.title}</strong> • Dilindungi Jaminan Uang Aman Servio
            </p>
          </div>

          {/* Tombol Batal Order di Paling Atas Kanan */}
          <button
            type="button"
            onClick={handleCancelBooking}
            className="self-start sm:self-auto px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="Batalkan proses pemesanan dan kembali ke halaman sebelumnya"
          >
            <X size={15} weight="bold" />
            <span>Batal Order</span>
          </button>
        </div>

        {/* 4-Step Stepper Bar */}
        <div className="grid grid-cols-4 gap-2">
          {steps.map((s) => {
            const isDone = state.step > s.number;
            const isCurrent = state.step === s.number;
            return (
              <div key={s.number} className="space-y-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isDone
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-primary"
                      : "bg-slate-200"
                  }`}
                />
                <div className="hidden sm:block">
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent
                        ? "text-primary"
                        : isDone
                        ? "text-emerald-700"
                        : "text-neutral-muted"
                    }`}
                  >
                    {s.number}. {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stepError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Dynamic Form Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6"
        >
          {/* STEP 1: PROBLEM DETAILS & FILE UPLOAD */}
          {state.step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Detail Gejala Kerusakan
                </h2>
                <p className="text-xs text-neutral-slate">
                  Tentukan merk & keluhan unit agar teknisi membawa peralatan diagnostik dan suku cadang yang tepat.
                </p>
              </div>

              {/* Dynamic Field Renderer */}
              <div className="space-y-4 pt-2">
                <DynamicFieldRenderer
                  fields={dynamicFields}
                  values={state.customFieldValues as Record<string, unknown>}
                  onChange={(fieldId, val) => {
                    setCustomFields({
                      ...state.customFieldValues,
                      [fieldId]: String(val),
                    });
                  }}
                />
              </div>

              {/* Real Photo / Video Upload Dropzone */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-neutral-dark block">
                  Unggah Bukti Foto / Video Kerusakan (Opsional)
                </label>
                <UploadDropzone
                  maxFiles={5}
                  maxFileSizeMb={10}
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                />
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & SERVICE MODE (HOME SERVICE LOCKED + IDENTITY DB ADDRESSES) */}
          {state.step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Mode Layanan & Lokasi Pengerjaan
                </h2>
                <p className="text-xs text-neutral-slate">
                  Layanan ini dikerjakan secara Home Service. Teknisi bersertifikasi akan datang langsung ke alamat Anda.
                </p>
              </div>

              {/* Locked Mode: Home Service Only */}
              <div className="p-4 rounded-2xl border-2 border-primary bg-sky/15 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-primary text-white shadow-servio-xs shrink-0">
                    <House size={24} weight="bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-dark font-display">
                        Home Service (Kunjungan Teknisi ke Hunian)
                      </span>
                      <span className="text-[10px] bg-primary text-white font-bold px-2 py-0.5 rounded-full">
                        Standar Aktif
                      </span>
                    </div>
                    <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                      Teknisi bersertifikasi resmi Servio datang langsung ke tempat tinggal Anda dengan perlengkapan standar inspeksi dan servis.
                    </p>
                  </div>
                </div>
              </div>

              {/* Saved Address Selector From Identity Module Database */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-dark block">
                    Pilih Dari Alamat Tersimpan (Modul Identitas Pelanggan)
                  </label>
                  <span className="text-[11px] text-neutral-slate font-medium">
                    {savedAddresses.length} Alamat Terdaftar
                  </span>
                </div>

                {savedAddresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            const fullStreet = [
                              addr.addressLine,
                              addr.village ? `Kel. ${addr.village}` : null,
                              addr.district ? `Kec. ${addr.district}` : null,
                            ].filter(Boolean).join(", ");

                            setAddress({
                              street: fullStreet || addr.addressLine,
                              city: addr.city,
                              notes: state.address.notes || "",
                            });

                            if (addr.latitude != null && addr.longitude != null) {
                              setIsEvaluatingLocation(true);
                              locationApi.evaluate({
                                source: "SAVED_ADDRESS",
                                addressId: addr.id,
                                latitude: Number(addr.latitude),
                                longitude: Number(addr.longitude),
                                displayAddress: addr.addressLine,
                                providerMasterServiceId: state.service?.id,
                              }).then((evalRes) => {
                                if (evalRes.data) {
                                  setCoverageResult({
                                    status: evalRes.data.coverage.status,
                                    distanceKm: evalRes.data.distanceKm,
                                    covered: evalRes.data.coverage.covered,
                                  });
                                }
                              }).catch(() => {}).finally(() => setIsEvaluatingLocation(false));
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all relative ${
                            isSelected
                              ? "border-primary bg-sky/20 shadow-servio-xs ring-2 ring-primary/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-neutral-dark font-display flex items-center gap-1.5">
                              <MapPin size={15} className={isSelected ? "text-primary" : "text-neutral-slate"} weight="fill" />
                              {addr.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {addr.isDefault && (
                                <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                                  Utama
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle size={16} weight="fill" className="text-primary" />
                              )}
                            </div>
                          </div>

                          {/* Recipient & Contact Info */}
                          <div className="space-y-1 text-[11px] text-neutral-slate border-b border-slate-100 pb-2 mb-2">
                            <div className="flex items-center gap-1.5 text-neutral-dark font-medium">
                              <User size={13} className="text-neutral-muted" />
                              <span>{addr.recipientName || "Penerima Tidak Tercantum"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone size={13} className="text-neutral-muted" />
                              <span>{addr.phone || "-"}</span>
                            </div>
                          </div>

                          {/* Full Address Details from DB */}
                          <div className="space-y-0.5 text-[11px] text-neutral-dark">
                            <p className="font-semibold line-clamp-1">{addr.addressLine}</p>
                            <p className="text-neutral-slate">
                              {addr.village ? `Kel. ${addr.village}` : ""}{addr.district ? `, Kec. ${addr.district}` : ""}
                            </p>
                            <p className="text-neutral-slate">
                              {addr.city}, {addr.province} {addr.postalCode ? `(${addr.postalCode})` : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    Belum ada alamat tersimpan di akun Anda. Silakan masukkan alamat kunjungan di bawah.
                  </div>
                )}
              </div>

              {/* Coverage Evaluation Status Banner */}
              {coverageResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 ${
                    coverageResult.covered
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <MapPin size={20} className={coverageResult.covered ? "text-emerald-600" : "text-amber-600"} weight="fill" />
                  <div>
                    <span className="font-bold block">
                      {coverageResult.covered
                        ? "Lokasi Anda Tercakup dalam Radius Layanan Mitra"
                        : "Lokasi di Luar Cakupan Normal Mitra"}
                    </span>
                    <span className="text-[11px] opacity-90">
                      {coverageResult.distanceKm !== null
                        ? `Estimasi jarak teknisi: ${coverageResult.distanceKm.toFixed(1)} km dari workshop mitra.`
                        : "Cakupan operasional terverifikasi di wilayah kota ini."}
                    </span>
                  </div>
                </div>
              )}

              {/* Selected Address Confirmation & Notes */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-neutral-dark block mb-1.5">
                    Alamat Lengkap Kunjungan Terpilih <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state.address.street}
                    onChange={(e) =>
                      setAddress({ ...state.address, street: e.target.value })
                    }
                    placeholder="Contoh: Jl. Metro Pondok Indah Blok TB No. 12, RT 02 / RW 14"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-dark block mb-1.5">
                      Kota / Wilayah Operasional
                    </label>
                    <input
                      type="text"
                      disabled
                      value={state.address.city || selectedAddr?.city || "KOTA JAKARTA PUSAT"}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-neutral-slate font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-dark block mb-1.5">
                      Catatan Akses Lokasi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={state.address.notes || ""}
                      onChange={(e) =>
                        setAddress({ ...state.address, notes: e.target.value })
                      }
                      placeholder="Contoh: Titip di satpam cluster, rumah pagar hijau"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCHEDULE (SEKARANG VS NANTI + FREE CUSTOM TIME) */}
          {state.step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Pilih Jadwal Kedatangan Teknisi
                </h2>
                <p className="text-xs text-neutral-slate">
                  Pilih apakah Anda membutuhkan kunjungan segera sekarang atau tentukan jam berapa pun sesuai keinginan Anda.
                </p>
              </div>

              {/* Option 1: Sekarang vs Nanti Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mode Sekarang */}
                <button
                  type="button"
                  onClick={() => setScheduleMode("SEKARANG")}
                  className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    scheduleMode === "SEKARANG"
                      ? "border-primary bg-sky/20 shadow-servio-xs ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-servio-xs">
                        <Lightning size={22} weight="fill" />
                      </div>
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                        Paling Cepat
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-neutral-dark block font-display">
                        Sekarang (Kunjungan Segera)
                      </span>
                      <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                        Teknisi terdekat akan ditugaskan dan segera meluncur ke lokasi Anda hari ini.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 text-[11px] font-semibold text-primary flex items-center gap-1.5">
                    <Clock size={15} weight="bold" />
                    <span>Hari ini, waktu estimasi segera (±30-60 menit)</span>
                  </div>
                </button>

                {/* Mode Nanti */}
                <button
                  type="button"
                  onClick={() => setScheduleMode("NANTI")}
                  className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    scheduleMode === "NANTI"
                      ? "border-primary bg-sky/20 shadow-servio-xs ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-servio-xs">
                        <CalendarCheck size={22} weight="fill" />
                      </div>
                      <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">
                        Bebas Pilih Waktu
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-neutral-dark block font-display">
                        Nanti (Jadwalkan Waktu Sendiri)
                      </span>
                      <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                        Tentukan tanggal dan masukkan jam berapa pun yang Anda inginkan dengan leluasa.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 border-t border-slate-100 text-[11px] font-semibold text-primary flex items-center gap-1.5">
                    <Clock size={15} weight="bold" />
                    <span>Pilih tanggal & masukkan jam bebas</span>
                  </div>
                </button>
              </div>

              {/* Sub-form when "NANTI" is selected */}
              {scheduleMode === "NANTI" && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-5 animate-in fade-in duration-200">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-dark">
                        Pilih Tanggal Kedatangan
                      </label>
                      <span className="text-[11px] text-neutral-slate">Tersedia 7 hari ke depan</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {dateOptions.map((opt) => {
                        const isSelected = customDate === opt.iso;
                        return (
                          <button
                            key={opt.iso}
                            type="button"
                            onClick={() => setCustomDate(opt.iso)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              isSelected
                                ? "bg-primary text-white border-primary shadow-servio-xs"
                                : "bg-white text-neutral-dark border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-[10px] block font-medium opacity-80 uppercase">
                              {opt.dayLabel}
                            </span>
                            <span className="text-base font-bold font-display block my-0.5">
                              {opt.dateNum}
                            </span>
                            <span className="text-[10px] block opacity-75">
                              {opt.monthLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Or manual date input */}
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-[11px] text-neutral-slate">Atau pilih tanggal lain:</span>
                      <input
                        type="date"
                        min={todayStr}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-neutral-dark bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Custom 24-Hour Time Picker + Quick Chips (No AM/PM) */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-dark flex items-center gap-1.5">
                        <Clock size={16} className="text-primary" weight="bold" />
                        Jam Kedatangan Yang Diinginkan (Format 24 Jam)
                      </label>
                      <span className="text-[11px] text-neutral-slate">Bebas tentukan jam (00:00 - 23:59)</span>
                    </div>

                    {/* 24-Hour Custom Inputs (00-23 dan 00-59) */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                        {/* Dropdown Jam 00 - 23 */}
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-neutral-muted">Jam</span>
                          <select
                            value={customHour}
                            onChange={(e) => setCustomHour(e.target.value)}
                            className="bg-transparent font-mono font-bold text-base text-neutral-dark focus:outline-none cursor-pointer pr-1"
                            aria-label="Pilih Jam Format 24"
                          >
                            {Array.from({ length: 24 }).map((_, i) => {
                              const val = String(i).padStart(2, "0");
                              return (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <span className="font-mono font-bold text-lg text-neutral-dark px-2 pt-2">:</span>

                        {/* Dropdown Menit 00 - 59 */}
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-neutral-muted">Menit</span>
                          <select
                            value={customMinute}
                            onChange={(e) => setCustomMinute(e.target.value)}
                            className="bg-transparent font-mono font-bold text-base text-neutral-dark focus:outline-none cursor-pointer pr-1"
                            aria-label="Pilih Menit"
                          >
                            {Array.from({ length: 60 }).map((_, i) => {
                              const val = String(i).padStart(2, "0");
                              return (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <span className="ml-2 pl-2 border-l border-slate-200 text-xs font-bold text-primary pt-2">
                          WIB
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-slate">
                        <span className="px-2.5 py-1 rounded-lg bg-sky/20 border border-sky-200 text-primary font-mono font-bold text-xs">
                          {customHour}:{customMinute} WIB
                        </span>
                        <span className="text-[11px]">(Format 24 Jam Universal)</span>
                      </div>
                    </div>

                    {/* Popular Time Chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-neutral-muted block">Pilihan jam cepat:</span>
                      <div className="flex flex-wrap gap-2">
                        {popularTimes.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleSelectPopularTime(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                              customTime === t
                                ? "bg-primary text-white shadow-servio-xs"
                                : "bg-white border border-slate-200 text-neutral-dark hover:bg-slate-100"
                            }`}
                          >
                            {t} WIB
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Selection Callout */}
              <div className="p-4 rounded-2xl bg-sky/20 border border-sky-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Clock size={18} weight="fill" className="text-primary" />
                  <span className="text-neutral-dark font-medium">
                    Jadwal Terpilih:{" "}
                    <strong className="text-primary font-bold">
                      {scheduleMode === "SEKARANG"
                        ? `Kunjungan Segera Hari Ini (${todayStr})`
                        : `${customDate} Pukul ${customTime} WIB`}
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-bold bg-white px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle size={13} weight="fill" /> Waktu Siap
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE SUMMARY (ALL DATA FROM STEPS 1-3 & POLICIES) */}
          {state.step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Ringkasan Pemesanan & Jaminan Garansi
                </h2>
                <p className="text-xs text-neutral-slate">
                  Periksa kembali seluruh informasi permohonan servis Anda sebelum dikirim ke sistem antrean mitra.
                </p>
              </div>

              {/* Card 1: Service & Provider Info */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Wrench size={22} weight="bold" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-dark block font-display">
                        {state.service?.title}
                      </span>
                      <span className="text-[11px] text-neutral-slate">
                        Mitra: {state.service?.providerName || "PT Servio Mandiri Teknik"}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary px-3 py-1 rounded-full bg-sky border border-sky-200">
                    {state.service?.pricingModel === "SURVEY_ESTIMATE"
                      ? "Biaya Survei Rp 50.000"
                      : `Rp ${state.service?.basePrice?.toLocaleString("id-ID") || "150.000"}`}
                  </span>
                </div>

                {/* Card 2: Step 1 Information (Unit & Complaint Details) */}
                <div className="space-y-2.5 pt-1">
                  <h3 className="text-xs font-bold text-neutral-dark font-display flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" weight="bold" />
                    1. Detail Unit & Kendala Kerusakan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-neutral-muted block text-[11px]">Merk & Model Unit:</span>
                      <span className="font-bold text-neutral-dark">
                        {String(state.customFieldValues?.brand || "-")}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-muted block text-[11px]">Deskripsi Keluhan:</span>
                      <span className="font-medium text-neutral-dark line-clamp-2">
                        {String(state.customFieldValues?.issueDetails || "-")}
                      </span>
                    </div>

                    {/* Uploaded Photos Preview in Summary */}
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                      <span className="text-neutral-muted block text-[11px] mb-1.5">
                        Bukti Foto/Video Terlampir ({uploadedFiles.length}):
                      </span>
                      {uploadedFiles.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {uploadedFiles.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px]"
                            >
                              {file.type === "image" && file.url ? (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-10 h-10 object-cover rounded-md border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-sky text-primary flex items-center justify-center font-bold">
                                  MP4
                                </div>
                              )}
                              <div className="pr-1">
                                <p className="font-semibold text-neutral-dark truncate max-w-[140px]">{file.name}</p>
                                <span className="text-[10px] text-neutral-slate">{file.size}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-neutral-slate italic">
                          Tidak ada foto dilampirkan (teknisi akan inspeksi langsung di tempat)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 3: Step 2 Information (Location & Contact Details) */}
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold text-neutral-dark font-display flex items-center gap-1.5">
                    <MapPin size={15} className="text-primary" weight="bold" />
                    2. Lokasi Pengerjaan (Home Service)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-neutral-muted block text-[11px]">Mode Pengerjaan:</span>
                      <span className="font-bold text-neutral-dark">
                        Home Service (Kunjungan Teknisi ke Hunian)
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-muted block text-[11px]">Nama Penerima & Kontak:</span>
                      <span className="font-bold text-neutral-dark">
                        {selectedAddr?.recipientName || "Pelanggan"} ({selectedAddr?.phone || "-"})
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-neutral-muted block text-[11px]">Alamat Lengkap:</span>
                      <p className="font-medium text-neutral-dark">
                        {state.address.street}
                      </p>
                      <p className="text-[11px] text-neutral-slate mt-0.5">
                        {selectedAddr?.village ? `Kel. ${selectedAddr.village}, ` : ""}
                        {selectedAddr?.district ? `Kec. ${selectedAddr.district}, ` : ""}
                        {selectedAddr?.city || state.address.city}, {selectedAddr?.province || ""} {selectedAddr?.postalCode || ""}
                      </p>
                      {state.address.notes && (
                        <p className="text-[11px] text-primary font-medium mt-1">
                          Catatan Akses: {state.address.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 4: Step 3 Information (Schedule Details) */}
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold text-neutral-dark font-display flex items-center gap-1.5">
                    <Clock size={15} className="text-primary" weight="bold" />
                    3. Jadwal Kedatangan Teknisi
                  </h3>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-neutral-muted block text-[11px]">Jadwal Pengerjaan:</span>
                      <span className="font-bold text-neutral-dark">
                        {scheduleMode === "SEKARANG"
                          ? `Kunjungan Segera Hari Ini (${todayStr})`
                          : `Tanggal ${customDate} • Pukul ${customTime} WIB`}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-primary bg-sky/30 px-2.5 py-1 rounded-lg">
                      {scheduleMode === "SEKARANG" ? "Segera (±30-60 mnt)" : "Waktu Khusus Pelanggan"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Survey Fee & Escrow Policy Callout */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold font-display">
                  <Info size={18} weight="fill" className="text-amber-600" />
                  <span>Kebijakan Survei & Uang Aman Servio Protection (Garansi 30 Hari)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-dark">
                  Biaya survei diagnostik awal (Rp 50.000) ditampung aman oleh sistem penampung resmi. Jika perbaikan memerlukan penggantian suku cadang atau pengerjaan teknis lanjutan di lokasi, rincian biaya akan diterbitkan dalam bentuk <strong>Quotation Resmi</strong> yang wajib Anda setujui sebelum pengerjaan dimulai. Seluruh hasil servis dilindungi garansi 30 hari.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Bottom Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {state.step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-neutral-dark font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-display"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <div />
            )}

            {state.step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-primary text-white font-display font-bold text-xs hover:bg-primary-dark transition-all flex items-center gap-2 shadow-servio-xs active:scale-95"
              >
                <span>Lanjutkan</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-display font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-servio-md active:scale-95 disabled:opacity-50"
              >
                <ShieldCheck size={18} weight="fill" />
                <span>{isSubmitting ? "Menyimpan ke Database..." : "Kirim Permohonan Booking"}</span>
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <Suspense fallback={<BookingWizardSkeleton />}>
      <BookingWizardContent />
    </Suspense>
  );
}
