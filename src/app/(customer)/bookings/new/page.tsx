"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useServices } from "@/features/discovery/useServices";
import { useBookingWizard } from "@/features/booking/useBookingWizard";
import { DynamicFieldRenderer, FieldSchema, FieldType } from "@/components/form/DynamicFieldRenderer";
import { SchedulePicker } from "@/components/form/SchedulePicker";
import { UploadDropzone } from "@/components/form/UploadDropzone";
import { profileApi, locationApi, serviceSlotApi, ApiAddress } from "@/lib/servioApi";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  House,
  ShieldCheck,
  Storefront,
  Wrench,
  Info,
  WarningCircle,
  MapPin,
  NavigationArrow,
} from "@phosphor-icons/react";

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
  const initialService = services.find((s) => s.id === serviceIdParam) || services[0];

  const {
    state,
    setService,
    setSchedule,
    setAddress,
    setCustomFields,
    nextStep,
    prevStep,
    submitBooking,
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

  // Level 08: Saved Addresses, Location Evaluation & Server Slots
  const [savedAddresses, setSavedAddresses] = useState<ApiAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [coverageResult, setCoverageResult] = useState<{
    status: string;
    distanceKm: number | null;
    covered: boolean;
  } | null>(null);
  const [isEvaluatingLocation, setIsEvaluatingLocation] = useState(false);
  const [serverSlots, setServerSlots] = useState<any[]>([]);

  // Load saved addresses
  useEffect(() => {
    profileApi.getAddresses().then((res) => {
      if (res.data && res.data.length > 0) {
        setSavedAddresses(res.data);
        const defaultAddr = res.data.find((a) => a.isDefault) || res.data[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddress({
            street: defaultAddr.addressLine,
            city: defaultAddr.city,
            notes: "",
          });
          // Evaluate location
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

  // Fetch slots from API for Step 3
  useEffect(() => {
    if (state.step === 3 && state.service?.id) {
      const queryDate = state.scheduledDate || new Date().toISOString().split("T")[0];
      serviceSlotApi.getSlots({
        providerMasterServiceId: state.service.id,
        date: queryDate,
      }).then((res) => {
        if (res.data) {
          setServerSlots(res.data);
        }
      }).catch(() => {
        setServerSlots([]);
      });
    }
  }, [state.step, state.scheduledDate, state.service?.id]);

  const dynamicFields: FieldSchema[] = [
    {
      id: "brand",
      label: "Merk & Model Unit",
      type: "text",
      placeholder: "Contoh: Daikin FTKQ25SVM4",
      required: true,
    },
    {
      id: "issueDetails",
      label: "Deskripsi Detail Masalah / Gejala",
      type: "textarea",
      placeholder: "Jelaskan apa yang terjadi pada unit Anda...",
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
    if (state.step === 2) {
      if (!state.address.street || state.address.street.length < 5) {
        setStepError("Alamat lengkap pengerjaan wajib diisi minimal 5 karakter");
        return;
      }
    } else if (state.step === 3) {
      if (!state.scheduledDate) {
        setStepError("Silakan tentukan tanggal kunjungan teknisi");
        return;
      }
      if (!state.scheduledTimeSlot) {
        setStepError("Silakan pilih slot waktu pengerjaan");
        return;
      }
    }
    nextStep();
  };

  const handleSubmit = async () => {
    try {
      const booking = await submitBooking();
      router.push(`/bookings/${booking.id}`);
    } catch {
      setStepError("Gagal mengirim permohonan booking. Silakan coba lagi.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Wizard Header & Stepper */}
      <div className="space-y-6">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Langkah {state.step} dari 4
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark mt-1">
            Pemesanan Servis Terstandar
          </h1>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
            Layanan: <strong className="text-neutral-dark">{state.service?.title}</strong> • Dilindungi Servio Escrow Protection
          </p>
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
          {/* STEP 1: PROBLEM DETAILS */}
          {state.step === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Detail Gejala Kerusakan
                </h2>
                <p className="text-xs text-neutral-slate">
                  Tentukan gejala atau keluhan kerusakan agar teknisi membawa peralatan dan suku cadang yang tepat.
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

              {/* Photo Upload Dropzone */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-neutral-dark">
                  Unggah Foto Kendala / Kondisi Unit (Opsional)
                </label>
                <UploadDropzone
                  maxFiles={3}
                  accept="image/jpeg,image/png,image/webp"
                />
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & SERVICE MODE */}
          {state.step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Mode Layanan & Lokasi Pengerjaan
                </h2>
                <p className="text-xs text-neutral-slate">
                  Tentukan apakah teknisi datang ke rumah Anda atau Anda yang membawa unit ke workshop mitra.
                </p>
              </div>

              {/* Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border-2 border-primary bg-sky/20 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-primary text-white">
                    <House size={20} weight="bold" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-dark block">
                      Home Service (Kunjungan Teknisi)
                    </span>
                    <span className="text-[11px] text-neutral-slate leading-relaxed">
                      Teknisi bersertifikasi datang ke hunian dengan perlengkapan standar Servio.
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 opacity-60 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-200 text-neutral-slate">
                    <Storefront size={20} weight="bold" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-dark block">
                      Workshop Drop-off
                    </span>
                    <span className="text-[11px] text-neutral-slate leading-relaxed">
                      Bawa perangkat langsung ke bengkel resmi mitra terdekat.
                    </span>
                  </div>
                </div>
              </div>

              {/* Saved Address Selector */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-dark block">
                    Pilih Dari Alamat Tersimpan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id);
                            setAddress({
                              street: addr.addressLine,
                              city: addr.city,
                              notes: "",
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
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "border-[#0F4C81] bg-sky-50/50 shadow-xs"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-[#0F4C81] text-white px-2 py-0.5 rounded-full font-bold">
                                Utama
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{addr.addressLine}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{addr.city}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                        ? `Estimasi jarak teknisi: ${coverageResult.distanceKm.toFixed(1)} km dari workshop.`
                        : "Cakupan operasional berdasarkan wilayah terdaftar."}
                    </span>
                  </div>
                </div>
              )}

              {/* Address Form */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-neutral-dark block mb-1.5">
                    Alamat Lengkap Kunjungan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state.address.street}
                    onChange={(e) =>
                      setAddress({ ...state.address, street: e.target.value })
                    }
                    placeholder="Contoh: Jl. Metro Pondok Indah Blok TB No. 12, RT 02 / RW 14"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                      value={state.address.city || "Jakarta Selatan (Coverage Area Resmi)"}
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

          {/* STEP 3: SCHEDULE PICKER */}
          {state.step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Pilih Jadwal Kedatangan Teknisi
                </h2>
                <p className="text-xs text-neutral-slate">
                  Jadwalkan slot waktu pengerjaan. Slot waktu dihitung secara otomatis oleh sistem server mitra.
                </p>
              </div>

              <SchedulePicker
                selectedDate={state.scheduledDate || undefined}
                selectedSlotId={state.scheduledTimeSlot || undefined}
                slots={
                  serverSlots.length > 0
                    ? serverSlots.map((s, idx) => ({
                        id: s.startAt || `slot-${idx}`,
                        label: s.startAt && s.endAt ? `${s.startAt} - ${s.endAt}` : "Slot Reguler",
                        timeRange: s.startAt && s.endAt ? `${s.startAt} - ${s.endAt} WIB` : "Waktu Fleksibel",
                        available: Boolean(s.available),
                        remainingSlots: s.available ? 2 : 0,
                      }))
                    : undefined
                }
                onSelectSchedule={(date: string, slotId: string) => {
                  setSchedule(date, slotId);
                }}
              />
            </div>
          )}

          {/* STEP 4: SUMMARY & POLICIES */}
          {state.step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base sm:text-lg font-bold text-neutral-dark font-display">
                  Ringkasan Pemesanan & Jaminan Garansi
                </h2>
                <p className="text-xs text-neutral-slate">
                  Periksa kembali seluruh detail permohonan servis Anda sebelum dikirim ke sistem antrean mitra.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Wrench size={22} weight="bold" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-dark block">
                        {state.service?.title}
                      </span>
                      <span className="text-[11px] text-neutral-slate">
                        Mitra: {state.service?.providerName}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary px-3 py-1 rounded-full bg-sky border border-sky-200">
                    {state.service?.pricingModel === "SURVEY_ESTIMATE"
                      ? "Biaya Survei Rp 50.000"
                      : `Rp ${state.service?.basePrice.toLocaleString("id-ID")}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-muted block text-[11px]">Jadwal Kunjungan:</span>
                    <span className="font-bold text-neutral-dark">
                      {state.scheduledDate || "2026-09-22"} • Slot {state.scheduledTimeSlot || "09:00 - 11:00 WIB"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-muted block text-[11px]">Alamat Pengerjaan:</span>
                    <span className="font-medium text-neutral-dark truncate block">
                      {state.address.street || "Kelapa Gading, Jakarta"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Survey Fee & Escrow Policy Callout */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-bold">
                  <Info size={18} weight="fill" className="text-amber-600" />
                  <span>Kebijakan Survei & Escrow Servio Protection</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-dark">
                  Jika perbaikan memerlukan pemeriksaan fisik lebih lanjut di lokasi (seperti kebocoran freon dalam instalasi), estimasi biaya suku cadang akan diterbitkan dalam bentuk <strong>Quotation Resmi</strong> yang wajib Anda setujui sebelum pengerjaan dimulai. Dana ditampung aman di Escrow hingga pekerjaan selesai.
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
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-neutral-dark font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5"
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
                <span>{isSubmitting ? "Mengirim Pesanan..." : "Kirim Permohonan Booking"}</span>
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
