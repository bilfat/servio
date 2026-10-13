"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  WarningCircle,
  ArrowLeft,
  ChatTeardropDots,
  Paperclip,
  CheckCircle,
  ArrowsClockwise,
  User,
  ShieldWarning,
  Scales,
  Clock,
  Handshake,
} from "@phosphor-icons/react";
import { useDisputes } from "@/features/disputes/useDisputes";
import { Toast } from "@/components/feedback/Toast";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";

export default function ComplaintDisputePage() {
  const params = useParams();
  const caseId = (params?.caseId as string) || "disp-901";

  const { getDisputeById, updateStatus } = useDisputes();
  const dispute = getDisputeById(caseId) || {
    id: caseId,
    orderId: "order-disputed",
    serviceTitle: "Cuci & Perawatan AC Split 1 PK",
    customerId: "cust-bambang",
    customerName: "Bambang Sudiro",
    providerId: "prov-bintang-teknik",
    providerName: "Bintang Teknik Mandiri",
    reason: "Unit AC Bocor Air Parah Setelah Dicuci",
    detailedComplaint:
      "Setelah teknisi menyelesaikan pencucian AC, air menetes deras membasahi meja kerja. Selang pembuangan tampaknya tersumbat.",
    evidencePhotos: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
    ],
    requestedResolution: "FREE_REWORK" as const,
    status: "IN_MEDIATION" as const,
    createdAt: "2026-09-19T17:45:00.000Z",
    mediatorName: "Rina Kusuma (Customer Support Specialist)",
    mediationNotes:
      "Mitra Bintang Teknik telah menyetujui jadwal kunjungan revisi gratis besok pagi pukul 09:00 untuk membersihkan ulang talang air belakang unit.",
  };

  const [responseMessage, setResponseMessage] = useState("");
  const [timeline, setTimeline] = useState([
    {
      id: "msg-1",
      sender: dispute.customerName,
      role: "PELANGGAN",
      text: dispute.detailedComplaint,
      time: "19 Sep 2026, 17:45",
      photos: dispute.evidencePhotos,
    },
    {
      id: "msg-2",
      sender: dispute.providerName,
      role: "MITRA TEKNISI",
      text: "Mohon maaf atas ketidaknyamanannya. Kami siap mengirim teknisi senior untuk pemeriksaan dan pembersihan ulang tanpa pungutan biaya.",
      time: "20 Sep 2026, 09:12",
    },
    {
      id: "msg-3",
      sender: dispute.mediatorName || "Tim Mediasi Servio",
      role: "MEDIATOR SERVIO",
      text: dispute.mediationNotes || "Mediasi aktif. Silakan verifikasi apakah Anda menyetujui opsi revisi pengerjaan gratis.",
      time: "20 Sep 2026, 11:30",
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseMessage.trim()) return;

    setTimeline((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: dispute.customerName,
        role: "PELANGGAN",
        text: responseMessage,
        time: "Baru saja",
      },
    ]);
    setResponseMessage("");
    setToastMessage("Tanggapan Anda telah dikirim ke mediator.");
  };

  const handleAcceptSolution = () => {
    updateStatus(dispute.id, "RESOLVED_REWORK", "Pelanggan menyetujui solusi revisi pengerjaan gratis.");
    setShowAcceptModal(false);
    setToastMessage("Solusi mediasi diterima! Jadwal perbaikan gratis telah difinalisasi.");
  };

  const handleAppeal = () => {
    setShowAppealModal(false);
    setToastMessage("Banding diajukan ke Manager Resolusi Servio.");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/orders/${dispute.orderId}`}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Pusat Komplain & Mediasi Sengketa
                </span>
                <span className="text-xs font-mono text-slate-400">#{dispute.id}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                {dispute.serviceTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                dispute.status === "RESOLVED_REWORK" || dispute.status === "RESOLVED_REFUND"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {dispute.status === "RESOLVED_REWORK"
                ? "Dispute Selesai (Perbaikan Gratis)"
                : dispute.status === "IN_MEDIATION"
                ? "Dalam Mediasi Tim CS"
                : "Sengketa Terbuka"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main: Arguments Timeline & Messages */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Reason Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center gap-2.5 text-rose-600 mb-3">
              <ShieldWarning size={22} weight="duotone" />
              <h2 className="text-sm font-bold text-slate-900">Kendala yang Dilaporkan</h2>
            </div>
            <p className="text-sm font-semibold text-slate-800">{dispute.reason}</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Opsi Solusi Diminta:{" "}
              <span className="font-bold text-slate-800">
                {dispute.requestedResolution === "FREE_REWORK"
                  ? "Perbaikan Ulang Gratis (Free Rework)"
                  : "Pengembalian Dana Penuh (Full Refund)"}
              </span>
            </p>
          </div>

          {/* Mediation Timeline */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
              <Scales size={20} weight="duotone" className="text-[#0F4C81]" />
              Riwayat Diskusi & Bukti Mediasi
            </h3>

            <div className="space-y-4">
              {timeline.map((msg) => {
                const isCustomer = msg.role === "PELANGGAN";
                const isMediator = msg.role === "MEDIATOR SERVIO";

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border transition ${
                      isMediator
                        ? "bg-sky-50/70 border-sky-200"
                        : isCustomer
                        ? "bg-slate-50 border-slate-200"
                        : "bg-amber-50/60 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-900">
                        {msg.sender}{" "}
                        <span className="font-normal text-[11px] text-slate-400">
                          ({msg.role})
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-400">{msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{msg.text}</p>

                    {msg.photos && msg.photos.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        {msg.photos.map((p, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200"
                          >
                            <Image
                              src={p}
                              alt="Bukti"
                              width={64}
                              height={64}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Response */}
            <form onSubmit={handleSendResponse} className="pt-4 border-t border-slate-100 space-y-3">
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
                placeholder="Tulis tanggapan atau lampirkan informasi terbaru untuk tim mediator..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  <Paperclip size={16} weight="bold" />
                  Tambah Foto Bukti
                </button>
                <button
                  type="submit"
                  disabled={!responseMessage.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0F4C81] hover:bg-[#0c3c66] transition disabled:opacity-50"
                >
                  Kirim Tanggapan
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar: Mediator Verdict & Resolution Decision */}
        <div className="space-y-6">
          {/* Resolution Proposal Box */}
          <div className="bg-gradient-to-br from-white to-sky-50 rounded-3xl border border-sky-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#0F4C81]">
              <Handshake size={24} weight="duotone" />
              <h3 className="text-sm font-bold">Rekomendasi Putusan CS</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Mediator {dispute.mediatorName} telah meninjau bukti foto dan menyetujui solusi dari mitra:
            </p>

            <div className="p-3.5 bg-white rounded-2xl border border-sky-200 text-xs text-slate-800 space-y-1">
              <p className="font-bold text-sky-900">Perbaikan Talang Air Gratis 1x</p>
              <p className="text-slate-500">
                Penyedia jasa akan datang besok pukul 09:00 WIB untuk pembersihan ulang talang drainase tanpa biaya.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setShowAcceptModal(true)}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} weight="bold" />
                Terima Solusi Mediasi
              </button>

              <button
                onClick={() => setShowAppealModal(true)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 active:scale-[0.99] transition text-center"
              >
                Ajukan Banding (Minta Refund Penuh)
              </button>
            </div>
          </div>

          {/* Provider Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Pihak Terkait
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400">Penyedia Jasa</p>
                <p className="font-bold text-slate-800">{dispute.providerName}</p>
              </div>
              <div>
                <p className="text-slate-400">Pelapor</p>
                <p className="font-bold text-slate-800">{dispute.customerName}</p>
              </div>
              <div>
                <p className="text-slate-400">Dana Escrow Tertahan</p>
                <p className="font-bold text-[#0F4C81]">Rp 150.000 (Aman di Servio Protection)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={showAcceptModal}
        title="Terima Solusi Perbaikan Gratis?"
        message="Dengan menyetujui solusi ini, jadwal kunjungan perbaikan gratis akan dijadwalkan ulang dan dispute dinyatakan selesai setelah perbaikan berhasil."
        confirmLabel="Ya, Terima Solusi"
        cancelLabel="Batal"
        intent="info"
        onConfirm={handleAcceptSolution}
        onClose={() => setShowAcceptModal(false)}
      />

      <ConfirmationDialog
        isOpen={showAppealModal}
        title="Ajukan Banding Mediasi"
        message="Banding akan dialihkan ke Supervisor Resolusi Servio dengan waktu peninjauan maksimal 2x24 jam."
        confirmLabel="Lanjutkan Banding"
        cancelLabel="Kembali"
        intent="warning"
        onConfirm={handleAppeal}
        onClose={() => setShowAppealModal(false)}
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
