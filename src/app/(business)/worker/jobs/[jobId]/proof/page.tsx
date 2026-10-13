"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  FloppyDisk,
  Gauge,
  Info,
  Lightning,
  PencilSimple,
  ShieldCheck,
  Thermometer,
  Trash,
  UploadSimple,
  WarningCircle,
  Wrench,
  X,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { domainRepository } from "@/lib/repository/domainRepository";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import {
  workerProofReadingsSchema,
  WorkerProofReadingsFormValues,
} from "@/lib/validation/schemas";
import { ProofMediaItem } from "@/types/domain";

export default function WorkerProofBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.jobId as string;

  const { updateJobStatus } = useWorkerOperations();
  const job = domainRepository.getWorkerJob(rawJobId);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Photos state
  const [beforePhotos, setBeforePhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&auto=format&fit=crop&q=80",
  ]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?w=600&auto=format&fit=crop&q=80",
  ]);

  // Signature state
  const [isSigned, setIsSigned] = useState(false);

  // RHF + Zod (ROOT-04)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WorkerProofReadingsFormValues>({
    resolver: zodResolver(workerProofReadingsSchema),
    defaultValues: {
      voltage: "224",
      currentAmpere: "3.8",
      freonPsi: "140",
      outputTemp: "16.2",
      technicianNotes:
        "Unit telah dicuci bersih dengan chemical foam. Arus kompresor normal dan tekanan freon R32 stabil di 140 PSI.",
      confirmedAllChecks: false,
    },
  });

  const confirmedAllChecks = watch("confirmedAllChecks");

  if (!job) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <EmptyState
          icon={Wrench}
          title="Tugas Tidak Ditemukan"
          description={`Tugas dengan ID "${rawJobId || "—"}" tidak terdaftar di sistem operasional.`}
          action={
            <Link
              href="/worker/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all"
            >
              Kembali ke Daftar Pekerjaan
            </Link>
          }
        />
      </div>
    );
  }

  const handleAddPhoto = (type: "BEFORE" | "AFTER") => {
    const sample =
      type === "BEFORE"
        ? "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80";

    if (type === "BEFORE") {
      setBeforePhotos((prev) => [...prev, sample]);
    } else {
      setAfterPhotos((prev) => [...prev, sample]);
    }
    setToastMessage(`Foto ${type === "BEFORE" ? "Kondisi Awal (Before)" : "Hasil Kerja (After)"} berhasil ditambahkan!`);
  };

  const onSubmit = (data: WorkerProofReadingsFormValues) => {
    if (!isSigned) {
      setToastMessage("Harap mintakan tanda tangan konfirmasi pelanggan sebelum kirim!");
      return;
    }

    const media: ProofMediaItem[] = [
      ...beforePhotos.map((url, i) => ({
        id: `pm-b-${i}`,
        label: `Foto Before #${i + 1}`,
        type: "BEFORE" as const,
        imageUrl: url,
        capturedAt: "Hari ini",
        description: "Kondisi awal sebelum servis",
      })),
      ...afterPhotos.map((url, i) => ({
        id: `pm-a-${i}`,
        label: `Foto After #${i + 1}`,
        type: "AFTER" as const,
        imageUrl: url,
        capturedAt: "Hari ini",
        description: "Kondisi setelah pembersihan dan perbaikan",
      })),
    ];

    const parameters = [
      { parameter: "Tegangan Listrik (Volt)", value: `${data.voltage} V`, standard: "220V ± 10%" },
      { parameter: "Arus Operasional (Ampere)", value: `${data.currentAmpere} A`, standard: "3.5 - 4.2 A" },
      { parameter: "Tekanan Sirkulasi Freon", value: `${data.freonPsi} PSI`, standard: "135 - 150 PSI" },
      { parameter: "Suhu Hembusan Evaporator", value: `${data.outputTemp} °C`, standard: "< 18°C" },
    ];

    // Cross-role shared state mutation (ROOT-01)
    domainRepository.submitWorkerProof(job.id, {
      media,
      parameters,
    });

    setToastMessage("Bukti kerja dan hasil uji parameter teknis berhasil dikirim ke mitra bengkel!");
    setTimeout(() => {
      router.push(`/worker/jobs/${job.id}`);
    }, 1000);
  };

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/worker/jobs/${job.id}`}
          className="p-2 rounded-xl border border-slate-200 bg-white text-neutral-slate hover:text-neutral-dark hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft size={16} weight="bold" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky text-primary font-mono">
              {job.id}
            </span>
            <span className="text-[10px] font-semibold text-neutral-slate">
              {job.orderId}
            </span>
          </div>
          <h1 className="text-lg font-bold font-display text-neutral-dark leading-tight">
            Unggah Bukti Kerja & Uji Parameter
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Step 1: Photos Before & After */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={18} weight="duotone" className="text-primary" />
              <h2 className="text-xs font-bold text-neutral-dark uppercase tracking-wider font-display">
                1. Dokumentasi Foto Before & After
              </h2>
            </div>
            <span className="text-[10px] text-neutral-slate font-medium">
              Wajib minimal 1 per tahap
            </span>
          </div>

          {/* Before Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-dark">
              <span>Foto Sebelum Dikerjakan (Before):</span>
              <button
                type="button"
                onClick={() => handleAddPhoto("BEFORE")}
                className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <UploadSimple size={12} weight="bold" />
                Tambah Foto
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {beforePhotos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
                >
                  <Image src={url} alt={`Before ${idx}`} fill className="object-cover" />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold">
                    Before #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* After Photos */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-dark">
              <span>Foto Setelah Selesai (After):</span>
              <button
                type="button"
                onClick={() => handleAddPhoto("AFTER")}
                className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <UploadSimple size={12} weight="bold" />
                Tambah Foto
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {afterPhotos.map((url, idx) => (
                <div
                  key={idx}
                  className="relative h-28 rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50/20 group"
                >
                  <Image src={url} alt={`After ${idx}`} fill className="object-cover" />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-700/80 text-white text-[9px] font-bold">
                    After #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Technical Readings (RHF + ZOD) */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <Gauge size={18} weight="duotone" className="text-secondary" />
            <h2 className="text-xs font-bold text-neutral-dark uppercase tracking-wider font-display">
              2. Pencatatan Parameter Hasil Uji
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-slate mb-1">
                Tegangan Listrik (Volt)
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register("voltage")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-slate">
                  V
                </span>
              </div>
              {errors.voltage && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.voltage.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-slate mb-1">
                Arus Kompresor (Ampere)
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register("currentAmpere")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-slate">
                  A
                </span>
              </div>
              {errors.currentAmpere && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.currentAmpere.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-slate mb-1">
                Tekanan Freon (PSI)
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register("freonPsi")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-slate">
                  PSI
                </span>
              </div>
              {errors.freonPsi && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.freonPsi.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-slate mb-1">
                Suhu Hembusan (°C)
              </label>
              <div className="relative">
                <input
                  type="text"
                  {...register("outputTemp")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-slate">
                  °C
                </span>
              </div>
              {errors.outputTemp && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.outputTemp.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-slate mb-1">
              Catatan Teknis Teknisi Lapangan
            </label>
            <textarea
              rows={2}
              {...register("technicianNotes")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errors.technicianNotes && (
              <p className="text-[10px] text-rose-500 mt-0.5">{errors.technicianNotes.message}</p>
            )}
          </div>

          {/* Confirm Checkbox */}
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              {...register("confirmedAllChecks")}
              className="w-4 h-4 rounded text-primary accent-primary"
            />
            <span className="text-[11px] text-neutral-slate font-medium">
              Saya menyatakan telah melakukan pengujian parameter di hadapan pelanggan.
            </span>
          </label>
          {errors.confirmedAllChecks && (
            <p className="text-[10px] text-rose-500">{errors.confirmedAllChecks.message}</p>
          )}
        </div>

        {/* Step 3: Customer Signature Pad */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PencilSimple size={18} weight="duotone" className="text-primary" />
              <h2 className="text-xs font-bold text-neutral-dark uppercase tracking-wider font-display">
                3. Tanda Tangan Serah Terima Pelanggan
              </h2>
            </div>
            <span className="text-[10px] text-neutral-slate">
              {job.customerName}
            </span>
          </div>

          <div className="h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative overflow-hidden">
            {isSigned ? (
              <div className="text-center space-y-1">
                <span className="font-display italic text-2xl font-bold text-slate-700 select-none">
                  {job.customerName}
                </span>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle size={12} weight="fill" />
                  Tanda tangan tersimpan secara digital
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSigned(true)}
                className="flex flex-col items-center gap-1.5 text-neutral-slate hover:text-primary transition"
              >
                <PencilSimple size={24} weight="duotone" />
                <span className="text-xs font-semibold">
                  Klik untuk Membubuhkan Tanda Tangan Pelanggan
                </span>
              </button>
            )}
          </div>

          {isSigned && (
            <button
              type="button"
              onClick={() => setIsSigned(false)}
              className="text-[11px] text-rose-600 font-semibold hover:underline"
            >
              Hapus & Tanda Tangani Ulang
            </button>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={isSubmitting}
            className="w-full flex items-center justify-center gap-2 text-sm shadow-servio-md"
          >
            <CheckCircle size={18} weight="bold" />
            <span>Kirim Bukti Pekerjaan ke Bengkel & Pelanggan</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
