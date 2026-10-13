"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuotation } from "@/features/quotations/useQuotation";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { PriceBreakdown, PriceItem } from "@/components/data-display/PriceBreakdown";
import { CountdownState } from "@/components/feedback/CountdownState";
import { EmptyState } from "@/components/feedback/EmptyState";
import {
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Info,
} from "@phosphor-icons/react";

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.quotationId as string;

  const {
    quotation,
    acceptQuotation,
    rejectQuotation,
    negotiateQuotation,
    isActionLoading,
  } = useQuotation(quotationId);

  const [negoNote, setNegoNote] = useState("");
  const [showNegoModal, setShowNegoModal] = useState(false);

  if (!quotation) {
    return (
      <div className="py-12">
        <EmptyState
          title="Penawaran Tidak Ditemukan"
          description={`Penawaran dengan ID "${quotationId}" tidak ditemukan.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/orders")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Kembali ke Pesanan
            </button>
          }
        />
      </div>
    );
  }

  const isPending = quotation.status === "PENDING_CUSTOMER";
  const isAccepted = quotation.status === "ACCEPTED";
  const isRejected = quotation.status === "REJECTED";
  const isNegotiating = quotation.status === "NEGOTIATING";

  const totalAmount = quotation.items.reduce((acc, item) => acc + item.totalPrice, 0);

  const priceItems: PriceItem[] = quotation.items.map((i) => ({
    id: i.id,
    label: `${i.name} (x${i.quantity})`,
    amount: i.totalPrice,
  }));

  const handleAccept = async () => {
    await acceptQuotation();
    router.push(`/payments/${quotation.orderId}?quotationId=${quotation.id}`);
  };

  const handleNegotiate = async () => {
    if (!negoNote.trim()) return;
    await negotiateQuotation(negoNote);
    setShowNegoModal(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-neutral-muted">Quotation ID: {quotation.id}</span>
            <StatusBadge
              status={
                isAccepted
                  ? "success"
                  : isRejected
                  ? "error"
                  : isNegotiating
                  ? "info"
                  : "warning"
              }
              label={
                isAccepted
                  ? "Disetujui Pelanggan"
                  : isRejected
                  ? "Ditolak"
                  : isNegotiating
                  ? "Dalam Negosiasi"
                  : "Menunggu Persetujuan Anda"
              }
            />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-neutral-dark mt-1">
            Penawaran Biaya Survei Lapangan
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Order: <strong className="text-neutral-dark">{quotation.orderId}</strong> • Mitra: {quotation.providerName}
          </p>
        </div>
      </div>

      {/* Countdown Validity Banner */}
      {isPending && (
        <div className="glass-card p-5 rounded-3xl border border-amber-200 bg-amber-50/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock size={16} weight="fill" className="text-amber-600" />
            <span>Masa Berlaku Penawaran Biaya</span>
          </div>
          <p className="text-xs text-neutral-dark leading-relaxed">
            Harga suku cadang dan jasa di bawah ini dijamin selama 24 jam. Jika melewati batas waktu tanpa respon, penawaran otomatis kedaluwarsa.
          </p>
          <CountdownState initialSeconds={7200} label="Batas Waktu Konfirmasi" />
        </div>
      )}

      {/* Main Quotation Card */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-6">
        {/* Survey Summary Note */}
        <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-neutral-dark">
            <FileText size={16} className="text-primary" />
            <span>Catatan Hasil Survei Fisik Teknisi:</span>
          </div>
          <p className="text-neutral-slate leading-relaxed">
            {quotation.surveySummary ||
              "Hasil pengecekan unit outdoor menunjukkan kebocoran halus pada sambungan pipa flare nepel dan kapasitor melemah sehingga hembusan tidak stabil. Diperlukan pengelasan nepel dan pengisian freon R32 murni."}
          </p>
        </div>

        {/* Breakdown of items */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-neutral-dark">
            Rincian Item Jasa & Material Pengganti
          </h3>

          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-neutral-muted font-bold">
                <tr>
                  <th className="p-3">Item / Uraian</th>
                  <th className="p-3 text-center">Tipe</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Harga Satuan</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotation.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-neutral-dark">{it.name}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-neutral-slate">
                        {it.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{it.quantity}</td>
                    <td className="p-3 text-right font-mono">
                      Rp {it.unitPrice.toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-neutral-dark">
                      Rp {it.totalPrice.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Price Summary with Escrow Note */}
        <div className="space-y-3 pt-2">
          <PriceBreakdown items={priceItems} applicationFee={0} escrowProtected />
        </div>

        {/* Actions Controls */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 flex-wrap">
          {isPending && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={rejectQuotation}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                >
                  Tolak Penawaran
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => setShowNegoModal(true)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-neutral-dark hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Minta Revisi / Nego
                </button>
              </div>

              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleAccept}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-display font-bold text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-servio-xs active:scale-95"
              >
                <CheckCircle size={16} weight="fill" />
                <span>Terima Penawaran (Bayar Escrow)</span>
                <ArrowRight size={14} weight="bold" />
              </button>
            </>
          )}

          {isAccepted && (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle size={18} weight="fill" />
                Penawaran telah Anda setujui.
              </span>
              <button
                type="button"
                onClick={() => router.push(`/payments/${quotation.orderId}`)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-servio-xs"
              >
                <span>Lanjut ke Pembayaran Escrow</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {isNegotiating && (
            <div className="w-full p-3.5 rounded-2xl bg-sky/30 border border-sky-200 text-xs text-primary flex items-center gap-2">
              <Info size={18} weight="fill" />
              <span>Permintaan revisi Anda telah dikirim ke mitra. Menunggu penawaran diperbarui.</span>
            </div>
          )}
        </div>
      </div>

      {/* Nego Input Modal */}
      {showNegoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-servio-xl">
            <h3 className="font-display font-bold text-base text-neutral-dark">
              Ajukan Catatan Revisi Penawaran
            </h3>
            <p className="text-xs text-neutral-slate">
              Jelaskan penyesuaian biaya atau penggantian suku cadang yang Anda harapkan kepada mitra.
            </p>
            <textarea
              rows={3}
              value={negoNote}
              onChange={(e) => setNegoNote(e.target.value)}
              placeholder="Contoh: Mohon gunakan freon R32 merk alternatif atau tinjau kembali estimasi biaya pengelasan..."
              className="w-full p-3 text-xs rounded-xl border border-slate-200 text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNegoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-slate hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleNegotiate}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark"
              >
                Kirim Catatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
