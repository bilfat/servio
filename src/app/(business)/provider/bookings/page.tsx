"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  CalendarBlank,
  Clock,
  MapPin,
  ClockCountdown,
  User,
  Wrench,
  ChatCircleText,
  UserSwitch,
  WarningCircle,
  Sparkle,
  Info,
  ShieldCheck,
  NotePencil,
  CheckSquare,
  Square,
  Certificate,
} from "@phosphor-icons/react";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { domainRepository, DomainBooking } from "@/lib/repository/domainRepository";
import { bookingActionSchema, BookingActionFormValues } from "@/lib/validation/schemas";

export default function ProviderBookingQueuePage() {
  const { workers, bookings, acceptBooking, rejectBooking } = useProviderOperations();
  const { getParam, setParam } = useUrlQueryState();
  const activeTab = getParam("tab", "ALL");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<DomainBooking | null>(null);
  const [activeModal, setActiveModal] = useState<"ACCEPT" | "REJECT" | "NEGOTIATE" | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.id || "");
  const [providerNote, setProviderNote] = useState<string>("");
  const [includeAiContext, setIncludeAiContext] = useState<boolean>(true);

  // RHF + Zod for Reject / Reschedule (ROOT-04)
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingActionFormValues>({
    resolver: zodResolver(bookingActionSchema),
    defaultValues: {
      action: "REJECT",
      reason: "",
    },
  });

  // Check worker capability eligibility for the currently selected booking
  const workerEligibilityList = useMemo(() => {
    if (!selectedBooking) return [];

    const bookingTitle = (selectedBooking.serviceTitle || "").toLowerCase();

    return workers.map((worker) => {
      const caps = domainRepository.getWorkerCapabilities(worker.id);
      const activeCaps = caps.length > 0 ? caps : worker.capabilities || [];

      // Look for matching capability
      const matched = activeCaps.find((cap) => {
        const mName = (cap.masterServiceName || "").toLowerCase();
        const subName = (cap.subcategoryName || "").toLowerCase();
        const catName = (cap.categoryName || "").toLowerCase();

        if (mName && (bookingTitle.includes(mName) || mName.includes(bookingTitle))) return true;

        if (
          (bookingTitle.includes("ac") ||
            bookingTitle.includes("air conditioner") ||
            bookingTitle.includes("cuci") ||
            bookingTitle.includes("dingin") ||
            bookingTitle.includes("inverter")) &&
          (mName.includes("ac") || subName.includes("ac") || subName.includes("cooling"))
        ) {
          if (
            (bookingTitle.includes("cuci") || bookingTitle.includes("cleaning") || bookingTitle.includes("perawatan")) &&
            (mName.includes("clean") || mName.includes("cuci"))
          ) {
            return true;
          }
          if (
            (bookingTitle.includes("perbaikan") || bookingTitle.includes("repair") || bookingTitle.includes("rusak") || bookingTitle.includes("berdesis") || bookingTitle.includes("bocor")) &&
            (mName.includes("repair") || mName.includes("perbaikan"))
          ) {
            return true;
          }
          return true;
        }

        if (
          (bookingTitle.includes("listrik") || bookingTitle.includes("electrical")) &&
          (mName.includes("electric") || subName.includes("electrical") || mName.includes("listrik"))
        ) {
          return true;
        }

        if (
          (bookingTitle.includes("mobil") || bookingTitle.includes("car") || bookingTitle.includes("otomotif")) &&
          (mName.includes("car") || subName.includes("car") || catName.includes("automotive"))
        ) {
          return true;
        }

        return false;
      });

      return {
        worker,
        isEligible: Boolean(matched),
        matchedServiceName: matched?.masterServiceName,
        capabilitiesCount: activeCaps.length,
      };
    });
  }, [selectedBooking, workers]);

  const handleOpenAcceptModal = (b: DomainBooking) => {
    setSelectedBooking(b);
    // Prefer eligible online worker if available
    const bookingTitle = (b.serviceTitle || "").toLowerCase();
    const eligibleOnline = workers.find((w) => {
      const caps = domainRepository.getWorkerCapabilities(w.id);
      const activeCaps = caps.length > 0 ? caps : w.capabilities || [];
      return (
        w.isOnline &&
        activeCaps.some((c) => {
          const m = (c.masterServiceName || "").toLowerCase();
          return bookingTitle.includes(m) || m.includes("ac");
        })
      );
    });
    setSelectedWorkerId(eligibleOnline?.id || workers[0]?.id || "");
    setProviderNote("");
    setIncludeAiContext(true);
    setActiveModal("ACCEPT");
  };

  const handleOpenRejectModal = (b: DomainBooking) => {
    setSelectedBooking(b);
    setValue("action", "REJECT");
    setValue("reason", "");
    setActiveModal("REJECT");
  };

  const handleOpenNegotiateModal = (b: DomainBooking) => {
    setSelectedBooking(b);
    setValue("action", "RESCHEDULE");
    setValue("reason", "Penyesuaian jadwal operasional teknisi bengkel.");
    setActiveModal("NEGOTIATE");
  };

  const handleConfirmAccept = () => {
    if (!selectedBooking) return;
    const res = acceptBooking(
      selectedBooking.id,
      selectedWorkerId,
      providerNote,
      includeAiContext
    );
    const orderId = res.order.id;
    const assignedWorkerName = res.order.assignedWorker?.name || "Teknisi";
    setActiveModal(null);
    setSelectedBooking(null);
    setProviderNote("");
    setToastMessage(
      `Booking ${selectedBooking.id} berhasil dikonfirmasi! Service Order ${orderId} dibuat dan ditugaskan ke ${assignedWorkerName}.`
    );
  };

  const onBookingActionSubmit = (data: BookingActionFormValues) => {
    if (!selectedBooking) return;

    if (data.action === "REJECT") {
      rejectBooking(selectedBooking.id, data.reason);
      setToastMessage("Booking telah ditolak dengan alasan yang disampaikan ke pelanggan.");
    } else {
      const b = domainRepository.bookings.find((bk) => bk.id === selectedBooking.id);
      if (b) {
        b.status = "NEGOTIATING";
        b.negotiatedDate = data.alternativeDate;
        domainRepository.notify();
      }
      setToastMessage("Jadwal alternatif telah diajukan ke pelanggan via notifikasi aplikasi.");
    }
    setActiveModal(null);
    setSelectedBooking(null);
    reset();
  };

  // Filter bookings based on activeTab
  const filteredBookings = useMemo(() => {
    if (activeTab === "PENDING") {
      return bookings.filter((b) => b.status === "PENDING_CONFIRMATION");
    }
    if (activeTab === "ACCEPTED") {
      return bookings.filter((b) => b.status === "ACCEPTED" || b.status === "CONVERTED_TO_ORDER");
    }
    if (activeTab === "REJECTED") {
      return bookings.filter((b) => b.status === "REJECTED");
    }
    return bookings;
  }, [bookings, activeTab]);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            SLA Konfirmasi Maksimum 2 Jam
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Antrean Permintaan Booking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tinjau detail masalah, foto kendala perangkat, tentukan teknisi yang bertugas, atau negosiasi jadwal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <ClockCountdown size={28} className="text-amber-600 animate-pulse" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Booking Menunggu</p>
              <p className="text-base font-bold font-display text-slate-900">
                {bookings.filter((b) => b.status === "PENDING_CONFIRMATION").length} Permintaan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Sync with URL ROOT-06) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "ALL", label: "Semua Permintaan" },
          { id: "PENDING", label: "Menunggu Konfirmasi" },
          { id: "ACCEPTED", label: "Diterima / Order" },
          { id: "REJECTED", label: "Ditolak" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParam("tab", tab.id === "ALL" ? null : tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.id
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking Cards Grid */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={activeTab !== "ALL" ? "Tidak Ditemukan Booking di Tab Ini" : "Antrean Booking Kosong"}
          description={
            activeTab !== "ALL"
              ? "Tidak ada antrean booking yang sesuai dengan filter status yang Anda pilih."
              : "Saat ini belum ada permintaan booking baru yang masuk dari pelanggan."
          }
          action={
            activeTab !== "ALL" ? (
              <Button size="sm" variant="outline" onClick={() => setParam("tab", null)}>
                Tampilkan Semua Booking
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredBookings.map((booking) => {
            const isPending = booking.status === "PENDING_CONFIRMATION";
            const isAccepted = booking.status === "ACCEPTED" || booking.status === "CONVERTED_TO_ORDER";
            const isRejected = booking.status === "REJECTED";
            const isNegotiating = booking.status === "NEGOTIATING";

            return (
              <motion.div
                key={booking.id}
                layout
                className={`bg-white rounded-3xl border p-6 sm:p-8 shadow-sm transition-all ${
                  isPending
                    ? "border-amber-200 ring-2 ring-amber-500/10"
                    : "border-slate-200/80"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
                  {/* Customer Info & Service */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                        {booking.id}
                      </span>
                      {isPending && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={14} />
                          Kadaluarsa dalam {booking.expiresInMinutes} menit
                        </span>
                      )}
                      {isAccepted && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle size={14} weight="fill" />
                          Diterima ({booking.orderId || "Order Aktif"})
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <XCircle size={14} weight="fill" />
                          Ditolak
                        </span>
                      )}
                      {isNegotiating && (
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Clock size={14} />
                          Menunggu Jawaban Negosiasi
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-lg font-bold font-display text-slate-900">
                        {booking.serviceTitle}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <User size={14} className="text-slate-400" />
                          {booking.customerName} ({booking.customerPhone})
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarBlank size={14} className="text-slate-400" />
                          {booking.requestedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-slate-400" />
                          {booking.requestedTimeSlot}
                        </span>
                        {booking.initialPriceEstimate && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Est. Rp {booking.initialPriceEstimate.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{booking.address}</span>
                    </div>
                  </div>

                  {/* Booking Photo */}
                  <div className="shrink-0 flex items-center gap-4">
                    <div className="relative w-28 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <Image
                        src={booking.unitPhotoUrl}
                        alt="Foto Unit Masalah"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Issue Description */}
                <div className="py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Keluhan & Kendala Pelanggan:
                  </p>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
                    &quot;{booking.issueDescription}&quot;
                  </p>
                </div>

                {/* AI SERVICE ANALYSIS (PRE-SERVICE PREPARATION CONTEXT) */}
                <div className="py-2">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#0F4C81] text-white flex items-center justify-center">
                          <Sparkle size={14} weight="fill" />
                        </div>
                        <span className="text-xs font-bold font-display text-[#0F4C81] uppercase tracking-wide">
                          AI Service Analysis (Pre-Service Preparation)
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                        Informational Only
                      </span>
                    </div>

                    {booking.aiAnalysis ? (
                      <div className="space-y-2.5 text-xs text-slate-700">
                        <p className="font-semibold text-slate-900 leading-snug">
                          {booking.aiAnalysis.summary}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                          {/* Possible Issues */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Kemungkinan Masalah (Pre-Inspection):
                            </p>
                            <ul className="space-y-1">
                              {booking.aiAnalysis.possibleIssues.map((issue, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                  <span className="text-sky-600 font-bold">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Possible Spareparts */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Kemungkinan Sparepart (Bawa Jika Tersedia):
                            </p>
                            <ul className="space-y-1">
                              {booking.aiAnalysis.possibleSpareparts.map((part, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                  <span className="text-amber-600 font-bold">•</span>
                                  <span>{part}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 italic bg-sky-50/80 p-2 rounded-lg border border-sky-100/80">
                          <strong>Penjelasan: </strong>{booking.aiAnalysis.confidenceExplanation}
                        </p>

                        {/* AI Disclaimer */}
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                          <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                          <span>
                            <strong>Disclaimer: </strong>
                            {booking.aiAnalysis.disclaimer}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2">
                        <Info size={16} className="text-slate-400 shrink-0" />
                        <span>Analisis AI belum tersedia untuk booking ini. Booking tetap dapat diproses normal.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {isPending && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Info size={14} className="text-slate-400 shrink-0" />
                      <span>Tinjau analisis AI & sertakan catatan teknisi sebelum konfirmasi.</span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenRejectModal(booking)}
                        className="text-rose-600 hover:bg-rose-50"
                      >
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenNegotiateModal(booking)}
                      >
                        Negosiasi Jadwal
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenAcceptModal(booking)}
                        className="bg-[#0F4C81] hover:bg-sky-900 text-white"
                      >
                        Tinjau & Tugaskan Teknisi
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL ACCEPT & ASSIGN WORKER WITH AI PREPARATION & NOTES (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={activeModal === "ACCEPT" && !!selectedBooking}
        onClose={() => setActiveModal(null)}
        title="Konfirmasi Booking & Tugaskan Teknisi"
        description="Tinjau detail order, sertakan analisis AI pre-servis, dan tambahkan catatan persiapan untuk teknisi lapangan."
        maxWidth="lg"
      >
        {selectedBooking && (
          <div className="space-y-4">
            {/* Booking Summary Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{selectedBooking.serviceTitle}</span>
                <span className="font-mono text-slate-500 font-semibold">{selectedBooking.id}</span>
              </div>
              <p className="text-slate-600">
                <strong>Pelanggan:</strong> {selectedBooking.customerName} ({selectedBooking.customerPhone})
              </p>
              <p className="text-slate-600">
                <strong>Jadwal:</strong> {selectedBooking.requestedDate}, {selectedBooking.requestedTimeSlot}
              </p>
              <p className="text-slate-600">
                <strong>Alamat:</strong> {selectedBooking.address}
              </p>
              {selectedBooking.initialPriceEstimate && (
                <p className="text-slate-600">
                  <strong>Estimasi Biaya Awal:</strong> Rp {selectedBooking.initialPriceEstimate.toLocaleString("id-ID")}
                </p>
              )}
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 mt-1">
                <strong>Keluhan Pelanggan: </strong> &quot;{selectedBooking.issueDescription}&quot;
              </div>
            </div>

            {/* AI Preparation Context Section */}
            {selectedBooking.aiAnalysis ? (
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-display text-[#0F4C81] flex items-center gap-1.5">
                    <Sparkle size={15} weight="fill" className="text-sky-600" />
                    AI Preparation Context (Pre-Service)
                  </span>
                  <span className="text-[10px] font-semibold text-sky-800 bg-white border border-sky-200 px-2 py-0.5 rounded-full">
                    Saran Pre-Servis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100">
                    <p className="font-bold text-slate-700 mb-1">Kemungkinan Masalah:</p>
                    <ul className="space-y-0.5 text-slate-600">
                      {selectedBooking.aiAnalysis.possibleIssues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-xl border border-sky-100">
                    <p className="font-bold text-slate-700 mb-1">Kemungkinan Sparepart (Bawa jika ada):</p>
                    <ul className="space-y-0.5 text-slate-600">
                      {selectedBooking.aiAnalysis.possibleSpareparts.map((part, idx) => (
                        <li key={idx}>• {part}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* AI Disclaimer */}
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                  <ShieldCheck size={15} className="text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Disclaimer: </strong>
                    Rekomendasi ini bukan diagnosis final. Teknisi tetap wajib melakukan pemeriksaan fisik di lokasi sebelum menetapkan kebutuhan sparepart atau penyesuaian biaya.
                  </span>
                </div>

                {/* Option to include AI Context */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeAiContext}
                    onChange={(e) => setIncludeAiContext(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F4C81]"
                  />
                  <span className="font-semibold text-slate-800 text-xs">
                    Sertakan rekomendasi AI ke teknisi sebagai panduan inspeksi
                  </span>
                </label>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                Analisis AI belum tersedia. Anda tetap dapat menugaskan teknisi dan menambahkan instruksi khusus.
              </div>
            )}

            {/* Select Worker with Competency Matching */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Teknisi Lapangan <span className="text-rose-500">*</span>
              </label>

              {/* Competency Matching Guidance Card */}
              {selectedBooking && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Certificate size={14} className="text-[#0F4C81]" />
                      Kesesuaian Kompetensi untuk: &quot;{selectedBooking.serviceTitle}&quot;
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {workerEligibilityList.filter((e) => e.isEligible).length} dari {workers.length} Teknisi Memenuhi
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {workerEligibilityList.map(({ worker, isEligible, matchedServiceName }) => (
                      <span
                        key={worker.id}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1 ${
                          isEligible
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        <span>{isEligible ? "✓" : "✗"}</span>
                        <span>{worker.name}</span>
                        {isEligible && matchedServiceName && (
                          <span className="text-[9px] text-emerald-700 bg-white/80 px-1 rounded font-bold">
                            {matchedServiceName}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800"
              >
                {workerEligibilityList.map(({ worker, isEligible, matchedServiceName }) => (
                  <option key={worker.id} value={worker.id}>
                    {isEligible ? "✓ [Memenuhi] " : "✗ [Tidak Memenuhi] "}
                    {worker.name} — {worker.isOnline ? "Standby / Siap" : "Offline"}
                    {isEligible && matchedServiceName ? ` (Kompetensi: ${matchedServiceName})` : ""}
                    {` | ⭐${worker.rating} (${worker.completedJobs} job)`}
                  </option>
                ))}
              </select>

              {/* Warning if selected worker is ineligible */}
              {(() => {
                const selectedEligibility = workerEligibilityList.find(
                  (e) => e.worker.id === selectedWorkerId
                );
                if (selectedEligibility && !selectedEligibility.isEligible) {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                      <WarningCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Perhatian: </strong>
                        Teknisi yang dipilih belum memiliki sertifikasi/kapabilitas terdaftar untuk layanan ini. Pastikan Anda memberikan supervisi atau alihkan penugasan ke teknisi yang kompeten.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Provider Note for Worker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Persiapan untuk Teknisi (Provider Note)
              </label>
              <textarea
                value={providerNote}
                onChange={(e) => setProviderNote(e.target.value)}
                rows={3}
                placeholder="Contoh: Prioritaskan pemeriksaan kapasitor outdoor. Bawa kapasitor 35uF bila secara fisik tersedia, tetapi tetap lakukan diagnosis fisik terlebih dahulu di lokasi."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0F4C81]/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Catatan ini membantu persiapan teknisi sebelum berangkat. Teknisi tetap wajib melakukan diagnosis aktual di lokasi.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmAccept}
                className="bg-[#0F4C81] hover:bg-sky-900 text-white"
              >
                Konfirmasi Booking & Tugaskan Teknisi
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL REJECT BOOKING (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={activeModal === "REJECT" && !!selectedBooking}
        onClose={() => setActiveModal(null)}
        title="Tolak Permintaan Booking"
        description="Sampaikan alasan penolakan agar pelanggan dapat memilih jadwal atau mitra alternatif."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onBookingActionSubmit)} className="space-y-4">
          <input type="hidden" {...register("action")} value="REJECT" />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan Penolakan <span className="text-rose-500">*</span>
            </label>
            <select
              {...register("reason")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="">-- Pilih Alasan Penolakan --</option>
              <option value="Jadwal teknisi penuh di sesi waktu tersebut">
                Jadwal teknisi penuh di sesi waktu tersebut
              </option>
              <option value="Alamat di luar radius jangkauan operasional saat ini">
                Alamat di luar radius jangkauan operasional saat ini
              </option>
              <option value="Kapasitas suku cadang/peralatan khusus sedang habis">
                Kapasitas suku cadang/peralatan khusus sedang habis
              </option>
              <option value="Kendala teknis workshop / pemeliharaan bengkel">
                Kendala teknis workshop / pemeliharaan bengkel
              </option>
            </select>
            {errors.reason && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="outline"
              isLoading={isSubmitting}
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              Tolak Permintaan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL NEGOTIATE DATE (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={activeModal === "NEGOTIATE" && !!selectedBooking}
        onClose={() => setActiveModal(null)}
        title="Ajukan Negosiasi Jadwal"
        description="Pilih tanggal alternatif terdekat yang siap ditangani oleh teknisi lapangan Anda."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onBookingActionSubmit)} className="space-y-4">
          <input type="hidden" {...register("action")} value="RESCHEDULE" />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Alternatif <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register("alternativeDate")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan untuk Pelanggan
            </label>
            <input
              type="text"
              {...register("reason")}
              placeholder="Contoh: Teknisi siap jam 14:00 setelah selesai pekerjaan di Tebet."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
            />
            {errors.reason && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Kirim Usulan Jadwal
            </Button>
          </div>
        </form>
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
