"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  WarningOctagon,
  ShieldWarning,
  Clock,
  CheckCircle,
  Article,
  WarningCircle,
  ChatCircleText,
} from "@phosphor-icons/react";
import { domainRepository, useDomainRepository } from "@/lib/repository/domainRepository";
import { disputeResponseSchema, DisputeResponseFormValues } from "@/lib/validation/schemas";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";

export default function ProviderDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.caseId as string) || "";
  const repo = useDomainRepository();

  const dispute = repo.getDispute(caseId);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DisputeResponseFormValues>({
    resolver: zodResolver(disputeResponseSchema),
    defaultValues: {
      proposedSolution: "FREE_REWORK",
      providerStatement:
        "Kami telah mengonfirmasi dengan teknisi lapangan terkait. Kami bersedia melakukan peninjauan dan pembersihan ulang menyeluruh tanpa biaya tambahan.",
      revisitDate: "2026-09-22",
    },
  });

  const selectedResolution = watch("proposedSolution");

  if (!dispute) {
    return (
      <div className="py-12">
        <EmptyState
          icon={WarningOctagon}
          title="Kasus Sengketa Tidak Ditemukan"
          description={`Kasus sengketa dengan ID "${caseId}" tidak terdaftar dalam catatan sistem.`}
          action={{
            label: "Kembali ke Daftar Sengketa",
            href: "/provider/disputes",
          }}
        />
      </div>
    );
  }

  const onSubmit = (values: DisputeResponseFormValues) => {
    repo.respondDispute(dispute.id, values);
    setAlertSuccess(
      values.proposedSolution === "FREE_REWORK"
        ? "Tawaran perbaikan ulang gratis berhasil dikirimkan ke pelanggan dan mediator CS Servio. Menunggu konfirmasi kehadiran pelanggan."
        : values.proposedSolution === "PARTIAL_REFUND"
        ? "Persetujuan refund sebagian dana berhasil diajukan ke tim mediasi CS."
        : "Sanggahan resmi beserta dokumen kepatuhan SOP berhasil diserahkan ke mediator CS."
    );
  };

  return (
    <div className="space-y-6 font-body text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/provider/disputes"
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-neutral-dark transition-colors shadow-servio-xs"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-display text-neutral-dark">
                Panel Respon Sanggahan & Mediasi Sengketa
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-red-100 text-red-700 font-bold border border-red-200">
                #{dispute.id}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky text-primary font-semibold">
                Order #{dispute.orderId}
              </span>
            </div>
            <p className="text-xs text-neutral-slate mt-0.5">
              Pelapor: <strong className="text-neutral-dark">{dispute.customerName}</strong> • Mediator: <strong className="text-neutral-dark">{dispute.mediatorName}</strong>
            </p>
          </div>
        </div>

        {/* Timer countdown badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
          <Clock size={16} weight="bold" />
          <span>Sisa Waktu Respon: 18 Jam 25 Menit</span>
        </div>
      </div>

      {/* Success Banner */}
      {alertSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-servio-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
            <span className="font-medium">{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-xs font-bold text-emerald-700 hover:underline">
            Tutup
          </button>
        </div>
      )}

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer Complaint & Evidence Photos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Complaint Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-red-600">
              <WarningOctagon size={22} weight="fill" />
              <h2 className="text-base font-bold font-display text-neutral-dark">
                Rincian Keluhan Konsumen
              </h2>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Keluhan:</span>
              <p className="text-sm font-bold text-neutral-dark">{dispute.reason}</p>
              <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-neutral-dark leading-relaxed italic">
                &ldquo;{dispute.detailedComplaint}&rdquo;
              </p>
            </div>

            {/* Photos of Complaint Evidence */}
            {dispute.evidencePhotos && dispute.evidencePhotos.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-neutral-dark block">
                  Foto Bukti yang Diunggah Pelanggan:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dispute.evidencePhotos.map((photo, i) => (
                    <div key={i} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <Image src={photo} alt="Bukti keluhan" fill unoptimized className="object-cover" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
                        Kondisi Bocor Saat Komplain
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Respon & Pembelaan Mitra */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold font-display text-neutral-dark">
                Tindakan & Solusi dari Pihak Bengkel
              </h3>
              <span className="text-xs text-neutral-slate">Pilih salah satu solusi di bawah</span>
            </div>

            {/* Resolution Mode Radios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: "FREE_REWORK",
                    label: "Perbaikan Ulang Gratis",
                    desc: "Kirim teknisi senior untuk perbaikan bebas biaya",
                  },
                  {
                    id: "PARTIAL_REFUND",
                    label: "Refund Sebagian Dana",
                    desc: "Kompensasi dana dari escrow ke dompet klien",
                  },
                  {
                    id: "REJECT_EXPLAIN",
                    label: "Sanggahan Dokumen SOP",
                    desc: "Bukti teknis membuktikan kerja sudah benar",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setValue("proposedSolution", opt.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedResolution === opt.id
                      ? "bg-sky/30 border-primary text-primary shadow-sm"
                      : "bg-slate-50 border-slate-200 text-neutral-dark hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold text-xs block">{opt.label}</span>
                  <span className="text-[10px] text-neutral-slate block mt-1 leading-snug">{opt.desc}</span>
                </button>
              ))}
            </div>
            {errors.proposedSolution && (
              <p className="text-[11px] text-rose-600 font-semibold">{errors.proposedSolution.message}</p>
            )}

            {/* Additional Fields if FREE_REWORK */}
            {selectedResolution === "FREE_REWORK" && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-emerald-950 block mb-1">Jadwal Tanggal Kunjungan Revisi:</label>
                  <input
                    type="date"
                    disabled={isSubmitting}
                    {...register("revisitDate")}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-950 block mb-1">Jam Kedatangan:</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    defaultValue="09:00 WIB"
                    className="w-full p-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Defense Statement Text */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-dark block">
                Pernyataan Resmi / Catatan Pembelaan untuk CS & Pelanggan: *
              </label>
              <textarea
                rows={4}
                disabled={isSubmitting}
                {...register("providerStatement")}
                className="w-full p-3.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50"
              />
              {errors.providerStatement && (
                <p className="text-[11px] text-rose-600 font-semibold">{errors.providerStatement.message}</p>
              )}
            </div>

            {/* Attachment SOP Checklist */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Article size={18} className="text-primary shrink-0" />
                <span className="font-semibold text-neutral-dark">
                  Lampiran Checklist SOP Pengerjaan & Suhu Awal ({dispute.orderId})
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Terlampir Otomatis
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <CheckCircle size={16} weight="bold" />
                <span>{isSubmitting ? "Mengirim..." : "Kirim Tanggapan ke CS Servio"}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Right Col: Escrow Status & Mediation Helper */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-servio-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldWarning size={22} weight="fill" />
              <h3 className="font-bold text-sm font-display text-neutral-dark">
                Status Escrow Pesanan
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-slate">Nilai Transaksi:</span>
                <span className="font-bold text-neutral-dark">Rp 220.000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-slate">Status Escrow:</span>
                <span className="font-bold text-amber-800">DIBEKUKAN SEMENTARA</span>
              </div>
            </div>

            <p className="text-neutral-slate leading-relaxed">
              Jika perbaikan ulang berhasil diselesaikan dan pelanggan mengonfirmasi puas, seluruh dana akan segera dilepaskan ke saldo Anda tanpa potongan penalti.
            </p>

            <div className="pt-3 border-t border-slate-100">
              <Link
                href={`/provider/chat/${dispute.orderId}`}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-neutral-dark font-semibold text-xs flex items-center justify-center gap-2 transition-colors block text-center"
              >
                <ChatCircleText size={16} />
                <span>Buka Percakapan Klien</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
