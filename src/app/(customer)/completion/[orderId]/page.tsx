"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle,
  WarningOctagon,
  ClockCountdown,
  ArrowLeft,
  LockKeyOpen,
  Receipt,
  UserCheck,
  Star,
  FileText,
} from "@phosphor-icons/react";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { ConfirmationDialog } from "@/components/feedback/ConfirmationDialog";
import { Toast } from "@/components/feedback/Toast";

export default function CompletionConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.orderId as string) || "order-awaiting-proof";

  const { order, updateOrderStatus } = useServiceOrder(orderId);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirmCompletion = async () => {
    setIsConfirming(true);
    await new Promise((r) => setTimeout(r, 600));
    updateOrderStatus("COMPLETED");
    setIsConfirming(false);
    setToastMessage("Pekerjaan berhasil diselesaikan! Dana escrow siap diteruskan ke mitra.");
    setTimeout(() => {
      router.push(`/reviews/${orderId}`);
    }, 1000);
  };

  const handleOpenDispute = () => {
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = () => {
    setShowDisputeModal(false);
    updateOrderStatus("DISPUTED");
    router.push(`/complaints/disp-901?orderId=${orderId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/proof/${orderId}`}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Penyelesaian Pesanan
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Konfirmasi Penyelesaian & Pelepasan Dana
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">#{orderId}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Countdown Auto-Completion Alert */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start sm:items-center justify-between gap-4 text-amber-900 shadow-sm"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700 shrink-0">
              <ClockCountdown size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Auto-Completion Countdown:</span>
                <span className="text-xs font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded-md text-amber-900">
                  23 Jam : 41 Menit
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Sesuai kebijakan perlindungan Servio, dana dalam rekening penampung escrow akan otomatis dilepaskan kepada penyedia jasa bila tidak ada sanggahan sebelum batas waktu.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Work Summary */}
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <UserCheck size={22} weight="duotone" className="text-[#0F4C81]" />
              Ringkasan Pengerjaan Layanan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-200/70">
              <div>
                <p className="text-xs text-slate-500">Layanan</p>
                <p className="text-sm font-bold text-slate-900">{order.serviceTitle}</p>
                <p className="text-xs text-slate-500 mt-1">Penyedia: <span className="font-semibold text-slate-700">{order.providerName}</span></p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Teknisi Pelaksana</p>
                <p className="text-sm font-bold text-slate-900">{order.assignedWorker?.name || "Rizky Firmansyah"}</p>
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Verifikasi Bukti Pengerjaan Valid</p>
              </div>
            </div>
          </div>

          {/* Escrow Release Card */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-sky-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center shadow-md">
                  <LockKeyOpen size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Validasi Pelepasan Escrow</h3>
                  <p className="text-xs text-slate-500">Dana aman di rekening penampung resmi Servio</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total Nominal Escrow</p>
                <p className="text-lg font-bold text-[#0F4C81]">
                  Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Garansi resmi selama <strong>{order.warrantyPeriodDays || 30} hari</strong> langsung aktif sejak Anda menekan konfirmasi.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} weight="fill" className="text-emerald-600 shrink-0" />
                <span>Teknisi dan mitra hanya menerima pencairan honor setelah Anda menyatakan puas.</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleOpenDispute}
              className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 active:scale-[0.99] transition border border-rose-200 flex items-center justify-center gap-2"
            >
              <WarningOctagon size={18} weight="bold" />
              Laporkan Kendala / Komplain Mediasi
            </button>

            <div className="w-full sm:w-auto flex items-center gap-3">
              <Link
                href={`/proof/${orderId}`}
                className="w-full sm:w-auto px-4 py-3 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 transition text-center"
              >
                Cek Bukti Lagi
              </Link>
              <button
                onClick={handleConfirmCompletion}
                disabled={isConfirming}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={18} weight="bold" />
                {isConfirming ? "Memproses..." : "Konfirmasi Pekerjaan Selesai"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dispute Modal */}
      <ConfirmationDialog
        isOpen={showDisputeModal}
        title="Ajukan Komplain ke Tim Mediasi Servio"
        message="Jika hasil pengerjaan teknisi merusak unit atau tidak sesuai kesepakatan penawaran, tim CS Servio akan menahan dana escrow dan menginvestigasi bukti."
        confirmLabel="Buka Pusat Komplain"
        cancelLabel="Batal"
        intent="danger"
        onConfirm={handleSubmitDispute}
        onClose={() => setShowDisputeModal(false)}
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
