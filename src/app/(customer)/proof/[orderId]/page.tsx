"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle,
  ArrowLeft,
  ArrowsClockwise,
  WarningCircle,
  Camera,
  Gauge,
  Sparkle,
  ShieldCheck,
  Check,
  X,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { useProof } from "@/features/proof/useProof";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { Toast } from "@/components/feedback/Toast";

export default function ProofReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "order-awaiting-proof";

  const { proof, approveProof, requestRevision, isSubmitting } = useProof(orderId);
  const { order } = useServiceOrder(orderId);

  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<"ALL" | "BEFORE" | "AFTER">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredMedia = proof.media.filter((item) => {
    if (activeMediaTab === "ALL") return true;
    return item.type === activeMediaTab;
  });

  const handleApprove = async () => {
    await approveProof();
    setToastMessage("Bukti pengerjaan berhasil disetujui!");
    setTimeout(() => {
      router.push(`/completion/${orderId}`);
    }, 900);
  };

  const handleConfirmRevision = async () => {
    if (!revisionNotes.trim()) return;
    await requestRevision(revisionNotes);
    setShowRevisionModal(false);
    setToastMessage("Permintaan perbaikan / foto ulang berhasil dikirim ke teknisi.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/${orderId}`}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  Tahap Verifikasi Bukti
                </span>
                <span className="text-xs text-slate-400 font-mono">#{orderId}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Review Bukti Hasil Kerja Teknisi
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/chat/conv-${orderId}`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              <ChatCircleDots size={18} weight="duotone" className="text-[#0F4C81]" />
              Hubungi Teknisi
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner Notification if already approved */}
        {proof.isApprovedByCustomer && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-800">
            <div className="flex items-center gap-3">
              <CheckCircle size={28} weight="fill" className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Bukti Pengerjaan Telah Disetujui</p>
                <p className="text-xs text-emerald-700">
                  Anda telah mengonfirmasi bahwa pengerjaan unit sesuai dengan standar kepuasan.
                </p>
              </div>
            </div>
            <Link
              href={`/completion/${orderId}`}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
            >
              Lanjut ke Konfirmasi Selesai &rarr;
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Gallery & Tested Parameters */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media Gallery Section */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Camera size={20} weight="duotone" className="text-[#0F4C81]" />
                    Dokumentasi Foto Before & After
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Periksa kebersihan, kerapihan, dan penggantian komponen unit secara transparan.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveMediaTab("ALL")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeMediaTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Semua ({proof.media.length})
                  </button>
                  <button
                    onClick={() => setActiveMediaTab("BEFORE")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeMediaTab === "BEFORE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sebelum
                  </button>
                  <button
                    onClick={() => setActiveMediaTab("AFTER")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeMediaTab === "AFTER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sesudah
                  </button>
                </div>
              </div>

              {/* Photo Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {filteredMedia.map((media) => (
                  <motion.div
                    key={media.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200">
                      <Image
                        fill
                        unoptimized
                        src={media.imageUrl}
                        alt={media.label}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span
                        className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase shadow-sm tracking-wide ${
                          media.type === "BEFORE"
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {media.type === "BEFORE" ? "Kondisi Awal" : "Hasil Selesai"}
                      </span>
                      <span className="absolute bottom-3 right-3 text-[10px] font-medium bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                        {media.capturedAt} WIB
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{media.label}</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {media.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tested Parameters & Instrument Checklist */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Gauge size={22} weight="duotone" className="text-[#0F4C81]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Checklist & Pengujian Alat Teknis
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hasil pengukuran parameter operasional sesuai standar SOP Servio
                  </p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {proof.testedParameters.map((param, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check size={16} weight="bold" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{param.parameter}</p>
                        <p className="text-xs text-slate-400">Ambang Batas Standar: {param.standard}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {param.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar: Summary & Actions */}
          <div className="space-y-6">
            {/* Service & Technician Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Informasi Servis
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Layanan</p>
                  <p className="text-sm font-bold text-slate-900">
                    {order.serviceTitle || "Cuci & Perawatan Matras Kasur Anti-Tungau"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mitra Penyedia Jasa</p>
                  <p className="text-sm font-semibold text-slate-800">{order.providerName}</p>
                </div>
                {order.assignedWorker && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F4C81] text-white font-bold flex items-center justify-center">
                      {order.assignedWorker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Teknisi Bertugas</p>
                      <p className="text-sm font-bold text-slate-900">{order.assignedWorker.name}</p>
                      <p className="text-[11px] text-emerald-600 font-medium">✓ Terverifikasi Servio ID</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Waktu Penyerahan Bukti</p>
                  <p className="text-xs font-mono text-slate-700">
                    {new Date(proof.submittedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })} WIB
                  </p>
                </div>
              </div>
            </div>

            {/* Decision Actions Card */}
            <div className="bg-gradient-to-br from-white to-sky-50/50 rounded-3xl border border-sky-100 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-[#0F4C81] mb-3">
                <ShieldCheck size={24} weight="duotone" />
                <h3 className="text-sm font-bold">Persetujuan Hasil Kerja</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Pastikan Anda telah memeriksa foto before/after dan parameter alat. Setelah disetujui, Anda akan diarahkan ke konfirmasi pelepasan escrow.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting || proof.isApprovedByCustomer}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-[#0F4C81] hover:bg-[#0c3c66] active:scale-[0.99] transition shadow-md shadow-sky-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle size={18} weight="bold" />
                  {isSubmitting
                    ? "Memproses..."
                    : proof.isApprovedByCustomer
                    ? "Telah Disetujui"
                    : "Setujui Bukti Pengerjaan"}
                </button>

                <button
                  onClick={() => setShowRevisionModal(true)}
                  disabled={isSubmitting || proof.isApprovedByCustomer}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition border border-rose-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowsClockwise size={18} weight="bold" />
                  Minta Perbaikan / Foto Ulang
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-sky-100/60 flex items-center gap-2 text-[11px] text-slate-500">
                <Sparkle size={16} weight="fill" className="text-amber-500 shrink-0" />
                <span>Garansi servis aktif otomatis setelah pekerjaan selesai dikonfirmasi.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revision Dialog */}
      <ConfirmationDialog
        isOpen={showRevisionModal}
        title="Ajukan Perbaikan / Foto Ulang"
        message="Tuliskan bagian mana dari pekerjaan teknisi yang belum memenuhi ekspektasi atau foto bukti yang perlu diulang."
        confirmLabel="Kirim Permintaan Revisi"
        cancelLabel="Kembali"
        intent="warning"
        onConfirm={handleConfirmRevision}
        onClose={() => setShowRevisionModal(false)}
      />

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
