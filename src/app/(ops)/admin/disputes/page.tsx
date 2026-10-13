"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { DisputeCase } from "@/types/domain";
import {
  Scales,
  MagnifyingGlass,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  WarningCircle,
  ArrowSquareOut,
  User,
  Storefront,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminDisputesPage() {
  const {
    disputes,
    disputePriorityFilter,
    setDisputePriorityFilter,
    disputeSearchQuery,
    setDisputeSearchQuery,
    escalateDispute,
    resolveDisputeToFinance,
  } = useAdminOperations();

  const [selectedDispute, setSelectedDispute] = useState<DisputeCase | null>(null);
  const [resolutionAction, setResolutionAction] = useState<"FULL_REFUND" | "PARTIAL_REFUND" | "REJECT_DISPUTE">("FULL_REFUND");
  const [refundAmount, setRefundAmount] = useState<number>(350000);
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [showEscalateModal, setShowEscalateModal] = useState<boolean>(false);
  const [escalatePriority, setEscalatePriority] = useState<"NORMAL" | "HIGH" | "URGENT">("URGENT");
  const [escalateNotes, setEscalateNotes] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenDetail = (item: DisputeCase) => {
    setSelectedDispute(item);
    setResolutionAction("FULL_REFUND");
    setRefundAmount(350000);
    setResolutionNotes("");
  };

  const handleResolveToFinance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    const amount = resolutionAction === "REJECT_DISPUTE" ? 0 : refundAmount;
    resolveDisputeToFinance(
      selectedDispute.id,
      amount,
      resolutionNotes || `Penyelesaian sengketa melalui jalur mediasi operasional: ${resolutionAction}`
    );

    setToastMessage(`Sengketa ${selectedDispute.id} berhasil diselesaikan. Tiket refund resmi telah diteruskan ke antrean Keuangan (/ops/finance/refunds)!`);
    setTimeout(() => setToastMessage(null), 5000);
    setSelectedDispute(null);
  };

  const handleExecuteEscalate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    escalateDispute(selectedDispute.id, escalatePriority, escalateNotes || "Eskalasi darurat atas permintaan customer/keterlambatan respons provider");
    setToastMessage(`Prioritas sengketa ${selectedDispute.id} ditingkatkan menjadi ${escalatePriority}!`);
    setTimeout(() => setToastMessage(null), 4000);
    setShowEscalateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60">
              <Scales size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Pusat Eskalasi &amp; Mediasi Sengketa (Dispute Center)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemeriksaan bukti tripartit, penegakan SLA investigasi, arbitrase klaim, dan integrasi refund ke Buku Besar Keuangan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ops/finance/refunds"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <span>Lihat Antrean Refund Keuangan</span>
              <ArrowSquareOut size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Governance & SLA Protocol Notice */}
      <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-rose-900 text-xs flex items-start gap-3">
        <WarningCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-rose-950">Aturan Resolusi &amp; Refund Otoritatif:</strong> Seluruh keputusan pengembalian dana hasil sengketa <strong>wajib diteruskan ke Finance Refund Operations</strong> (/ops/finance/refunds) untuk validasi rekonsiliasi escrow payment gateway. Admin tidak diperkenankan mencairkan saldo tanpa nomor voucher audit keuangan.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID tiket sengketa, pelanggan, penyedia jasa, atau alasan..."
              value={disputeSearchQuery}
              onChange={(e) => setDisputeSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={disputePriorityFilter}
              onChange={(e) => setDisputePriorityFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Tingkat Prioritas</option>
              <option value="URGENT">Mendesak (URGENT - 12 Jam SLA)</option>
              <option value="HIGH">Tinggi (HIGH - 24 Jam SLA)</option>
              <option value="NORMAL">Normal (NORMAL - 48 Jam SLA)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID Tiket &amp; Order</th>
                <th className="px-4 py-3">Pelanggan Penggugat</th>
                <th className="px-4 py-3">Penyedia Tergugat</th>
                <th className="px-4 py-3">Alasan Sengketa</th>
                <th className="px-4 py-3">Tuntutan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data tiket sengketa aktif.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{d.id}</span>
                      <p className="font-mono text-[10px] text-slate-400">Order: {d.orderId}</p>
                      <p className="text-[11px] text-slate-700 font-semibold line-clamp-1">{d.serviceTitle}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <User size={13} className="text-slate-400" />
                        <span>{d.customerName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">ID: {d.customerId}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Storefront size={13} className="text-slate-400" />
                        <span>{d.providerName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">ID: {d.providerId}</span>
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="font-bold text-rose-700 truncate">{d.reason}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{d.detailedComplaint}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {d.requestedResolution}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge variant={d.status.startsWith("RESOLVED") ? "success" : d.status === "IN_MEDIATION" ? "warning" : "danger"} size="sm">
                        {d.status}
                      </Badge>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.createdAt}</div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => handleOpenDetail(d)}>
                          <Eye size={12} className="mr-1" /> Bukti &amp; Arbitrase
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tripartite Evidence & Arbitration Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-600">Tiket: {selectedDispute.id}</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Pemeriksaan Bukti Tripartit &amp; Resolusi Arbitrase
                </h3>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="text-slate-400 hover:text-slate-600 text-sm p-1">
                ✕
              </button>
            </div>

            {/* Tripartite Evidence Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Side */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <User size={14} className="text-rose-600" /> Pelanggan: {selectedDispute.customerName}
                  </span>
                  <Badge variant="danger" size="sm">Klaim Penggugat</Badge>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">&ldquo;{selectedDispute.detailedComplaint}&rdquo;</p>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bukti Foto / Lampiran:</span>
                  <div className="h-28 rounded-lg bg-slate-200 overflow-hidden flex items-center justify-center">
                    <img
                      src={selectedDispute.evidencePhotos?.[0] || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80"}
                      alt="Customer Evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Provider Side */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Storefront size={14} className="text-blue-600" /> Provider: {selectedDispute.providerName}
                  </span>
                  <Badge variant="primary" size="sm">Tanggapan Mitra</Badge>
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  &ldquo;{selectedDispute.providerStatement || "Pekerjaan telah diselesaikan sesuai standar, namun pelanggan meminta penambahan material di luar estimasi awal tanpa persetujuan revisi kuotasi."}&rdquo;
                </p>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Solusi Yang Diajukan Mitra:</span>
                  <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded inline-block text-[11px]">
                    {selectedDispute.proposedSolution || "FREE_REWORK (Pengerjaan Ulang Gratis)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Arbitration Resolution Form */}
            <form onSubmit={handleResolveToFinance} className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Keputusan Mediasi Administrator</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionAction("FULL_REFUND")}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      resolutionAction === "FULL_REFUND"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Refund Penuh
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionAction("PARTIAL_REFUND")}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      resolutionAction === "PARTIAL_REFUND"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Refund Sebagian
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionAction("REJECT_DISPUTE")}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                      resolutionAction === "REJECT_DISPUTE"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Tolak Sengketa
                  </button>
                </div>
              </div>

              {resolutionAction !== "REJECT_DISPUTE" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominal Pengembalian Dana ke Pelanggan (Rp)
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nominal ini akan otomatis dibuatkan voucher pengembalian dana di antrean Keuangan (/ops/finance/refunds).
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Resmi Mediasi &amp; Dasar Arbitrase</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Tuliskan pertimbangan teknis dan regulasi platform..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowEscalateModal(true)}
                  className="text-amber-700 hover:bg-amber-50"
                >
                  Tingkatkan Prioritas SLA
                </Button>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedDispute(null)}>
                    Batal
                  </Button>
                  <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                    Terapkan Resolusi &amp; Kirim ke Finance
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Priority Modal */}
      {showEscalateModal && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Eskalasi Prioritas Penanganan</h3>
              <button onClick={() => setShowEscalateModal(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleExecuteEscalate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Level Prioritas Baru</label>
                <select
                  value={escalatePriority}
                  onChange={(e) => setEscalatePriority(e.target.value as "URGENT" | "HIGH" | "NORMAL")}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="URGENT">URGENT (Target Resolusi &lt; 12 Jam)</option>
                  <option value="HIGH">HIGH (Target Resolusi &lt; 24 Jam)</option>
                  <option value="NORMAL">NORMAL (Target Resolusi &lt; 48 Jam)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Eskalasi</label>
                <textarea
                  rows={2}
                  value={escalateNotes}
                  onChange={(e) => setEscalateNotes(e.target.value)}
                  placeholder="Alasan peningkatan urgensi..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowEscalateModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-amber-600 text-white">
                  Simpan Eskalasi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
