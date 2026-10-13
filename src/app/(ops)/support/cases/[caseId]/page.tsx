"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Scales,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  ChatCircleText,
  Clock,
  User,
  Storefront,
  Camera,
  Coins,
  CurrencyCircleDollar,
  FileText,
  Check,
  X,
  Gavel,
  ArrowRight,
  Info,
} from "@phosphor-icons/react";
import { useSupportOperations, DisputeDecision } from "@/features/support/useSupportOperations";
import { domainRepository } from "@/lib/repository/domainRepository";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import {
  supportMediationVerdictSchema,
  SupportMediationVerdictFormValues,
} from "@/lib/validation/schemas";

export default function SupportCaseDetail360Page() {
  const params = useParams();
  const router = useRouter();
  const rawCaseId = params?.caseId as string;

  const { submitMediationDecision } = useSupportOperations();
  const currentCase = domainRepository.getSupportCase(rawCaseId);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // RHF + Zod for Mediation Verdict Form (ROOT-04)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SupportMediationVerdictFormValues>({
    resolver: zodResolver(supportMediationVerdictSchema),
    defaultValues: {
      decisionType: "FREE_REWORK",
      notes:
        "Berdasarkan bukti foto dan SOP pembersihan drainase yang tidak tuntas, mitra bengkel diwajibkan mengirim teknisi senior untuk servis ulang pembilasan talang pembuangan tanpa membebankan biaya apa pun kepada pelanggan.",
      refundAmount: currentCase ? Math.round(currentCase.escrowAmount * 0.5) : 150000,
      confirmEscrowResolution: false,
    },
  });

  const selectedDecisionType = watch("decisionType");
  const partialRefundAmount = watch("refundAmount") || 0;

  if (!currentCase) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <EmptyState
          icon={Scales}
          title="Kasus Sengketa Tidak Ditemukan"
          description={`Kasus dengan ID "${rawCaseId || "—"}" tidak terdaftar dalam antrean mediasi Customer Support.`}
          action={
            <Link
              href="/ops/support/queue"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all"
            >
              Kembali ke Antrean Mediasi
            </Link>
          }
        />
      </div>
    );
  }

  const handleApplyVerdict = (data: SupportMediationVerdictFormValues) => {
    submitMediationDecision(
      currentCase.id,
      data.decisionType as DisputeDecision,
      data.notes,
      data.decisionType === "PARTIAL_REFUND" ? data.refundAmount : undefined
    );

    setToastMessage(
      "Putusan mediasi resmi telah diterbitkan! Jika putusan berupa pengembalian dana, tiket refund otomatis masuk ke antrean Finance Ops."
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ops/support/queue"
            className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition shrink-0"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                #{currentCase.id}
              </span>
              <span className="text-xs font-mono text-slate-400">Order #{currentCase.orderId}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentCase.status === "RESOLVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {currentCase.status === "RESOLVED" ? "Selesai (Putusan Diterbitkan)" : "Proses Mediasi"}
              </span>
            </div>
            <h1 className="text-xl font-bold font-display text-slate-900 mt-1">
              Mediasi 360°: {currentCase.serviceTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/ops/support/chat/${currentCase.id}`}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
          >
            <ChatCircleText size={16} />
            <span>Buka Ruang Sidang Chat</span>
          </Link>
        </div>
      </div>

      {/* Escrow Banner */}
      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Coins size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-xs text-amber-800 font-medium">
              Dana Escrow Terkunci Aman di Sistem:
            </p>
            <p className="text-lg font-bold font-display text-amber-950">
              Rp {currentCase.escrowAmount.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
          <Clock size={16} className="text-amber-700" />
          <span>SLA Sisa: <strong>{currentCase.slaRemaining}</strong></span>
        </div>
      </div>

      {/* Two-Column Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Column */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-sm">
              <User size={18} weight="duotone" className="text-primary" />
              <span>Pernyataan Pelanggan</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {currentCase.customerName}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 italic">
            &quot;{currentCase.customerStatement}&quot;
          </p>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Bukti Foto Kerusakan / Kendala:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {currentCase.evidenceBeforePhotos.map((url, i) => (
                <div
                  key={i}
                  className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <Image src={url} alt={`Bukti Customer ${i}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Column */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold font-display text-sm">
              <Storefront size={18} weight="duotone" className="text-secondary" />
              <span>Sanggahan & Argumen Mitra</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {currentCase.providerName}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 italic">
            &quot;{currentCase.providerStatement || "Mitra belum memberikan keterangan tertulis resmi."}&quot;
          </p>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Bukti Kerja SOP Teknisi:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(currentCase.evidenceAfterPhotos.length > 0
                ? currentCase.evidenceAfterPhotos
                : currentCase.evidenceBeforePhotos
              ).map((url, i) => (
                <div
                  key={i}
                  className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <Image src={url} alt={`Bukti Provider ${i}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Official Verdict Form (RHF + ZOD) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <Gavel size={22} weight="duotone" className="text-[#0F4C81]" />
          <div>
            <h2 className="text-base font-bold font-display text-slate-900">
              Formulir Putusan Mediasi Resmi Otoritas Servio
            </h2>
            <p className="text-xs text-slate-500">
              Putusan ini bersifat mengikat dan akan otomatis menerbitkan perubahan status escrow serta instruksi refund ke Finance Ops.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleApplyVerdict)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Pilih Opsi Keputusan Mediasi:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {(
                [
                  {
                    id: "FREE_REWORK",
                    label: "1. Servis Ulang Gratis (Free Rework)",
                    desc: "Mitra wajib mengirimkan teknisi untuk revisi pengerjaan tanpa biaya.",
                  },
                  {
                    id: "PRICE_ADJUSTMENT",
                    label: "2. Penyesuaian Harga / Ganti Rugi",
                    desc: "Diskon sebagian dari nilai tagihan untuk kompensasi kerusakan minor.",
                  },
                  {
                    id: "FULL_REFUND",
                    label: "3. Pengembalian Dana Penuh (100% Refund)",
                    desc: "Escrow dikembalikan penuh ke pelanggan via antrean Finance Ops.",
                  },
                  {
                    id: "PARTIAL_REFUND",
                    label: "4. Pengembalian Dana Sebagian",
                    desc: "Membagi dana escrow antara kompensasi pelanggan dan biaya mitra.",
                  },
                  {
                    id: "REJECT_CLAIM_RELEASE_ESCROW",
                    label: "5. Tolak Komplain & Lepas Escrow",
                    desc: "Keluhan tidak terbukti kelalaian mitra. Dana escrow dilepas ke mitra.",
                  },
                ] as const
              ).map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setValue("decisionType", opt.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                    selectedDecisionType === opt.id
                      ? "bg-sky-50 border-[#0F4C81] ring-1 ring-[#0F4C81]"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedDecisionType === opt.id
                        ? "border-[#0F4C81] bg-[#0F4C81]"
                        : "border-slate-400 bg-white"
                    }`}
                  >
                    {selectedDecisionType === opt.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{opt.label}</p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {errors.decisionType && (
              <p className="text-[11px] text-rose-500">{errors.decisionType.message}</p>
            )}
          </div>

          {/* If partial refund, input amount */}
          {selectedDecisionType === "PARTIAL_REFUND" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <label className="font-bold text-amber-900 block">
                Nominal Dana yang Dikembalikan ke Pelanggan (Rp):
              </label>
              <input
                type="number"
                {...register("refundAmount")}
                max={currentCase.escrowAmount}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-slate-900 text-sm"
              />
              <p className="text-[11px] text-amber-800">
                Sisa sebesar Rp{" "}
                {Math.max(0, currentCase.escrowAmount - partialRefundAmount).toLocaleString("id-ID")}{" "}
                akan dilepaskan ke saldo mitra bengkel.
              </p>
              {errors.refundAmount && (
                <p className="text-[11px] text-rose-500">{errors.refundAmount.message}</p>
              )}
            </div>
          )}

          {/* Legal notes / Pertimbangan */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Catatan Pertimbangan Hukum & Rekomendasi Mediator:
            </label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
            {errors.notes && (
              <p className="text-[11px] text-rose-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              {...register("confirmEscrowResolution")}
              className="w-4 h-4 rounded text-primary accent-primary"
            />
            <span className="text-[11px] text-slate-700 font-medium">
              Saya menyatakan putusan ini diambil secara objektif sesuai bukti digital dan SLA Servio.
            </span>
          </label>
          {errors.confirmEscrowResolution && (
            <p className="text-[11px] text-rose-500">{errors.confirmEscrowResolution.message}</p>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full flex items-center justify-center gap-2 text-xs shadow-md"
            >
              <Gavel size={18} weight="bold" />
              <span>Terbitkan Putusan Mediasi Resmi</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
