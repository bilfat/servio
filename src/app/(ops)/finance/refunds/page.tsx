"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  MagnifyingGlass,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  XCircle,
  Check,
  X,
  Clock,
  ShieldCheck,
  Scales,
  Package,
  User,
  Bank,
  FileText,
  ArrowsClockwise,
  Eye,
  HandCoins,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { BackendRefundTransaction } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function RefundOperationsQueuePage() {
  const [refunds, setRefunds] = useState<BackendRefundTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspection Modal
  const [selectedRefund, setSelectedRefund] = useState<BackendRefundTransaction | null>(null);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.ops.refunds({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page: currentPage,
        per_page: 15,
      });

      if (res && res.data) {
        setRefunds(res.data.data || []);
        setTotalCount(res.data.total || 0);
        setCurrentPage(res.data.current_page || 1);
        setLastPage(res.data.last_page || 1);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat log refund:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar pengembalian dana.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter, currentPage]);

  const filteredRefunds = useMemo(() => {
    if (!searchQuery.trim()) return refunds;
    const q = searchQuery.toLowerCase();
    return refunds.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.payment_allocation_id.toLowerCase().includes(q) ||
        r.payment_intent_id.toLowerCase().includes(q) ||
        r.customer_spay_account_id.toLowerCase().includes(q) ||
        (r.order_cancellation_event_id && r.order_cancellation_event_id.toLowerCase().includes(q))
    );
  }, [refunds, searchQuery]);

  return (
    <div className="space-y-6 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Customer Refund & S-Pay Credit Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Monitoring Pengembalian Dana (Refund)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit eksekusi pendanaan refund 100% alokasi dana pesanan yang dibatalkan sah oleh 05A, pengkreditan ke saldo S-Pay Customer, dan riwayat status pendanaan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {totalCount} Refund Tercatat
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRefunds}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Notice Banner: Boundary Clarification */}
      <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-sky-950 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldCheck size={20} className="text-[#0F4C81] shrink-0 mt-0.5" weight="fill" />
        <div>
          <strong className="font-bold">Ketentuan Batas Domain Modul 06 (Finance V3):</strong>
          <p className="mt-0.5 text-sky-900">
            Keputusan pembatalan pesanan dan persetujuan klaim retur adalah hak prerogatif Modul 05A Order / After-Sales. Finance bertugas memvalidasi pembayaran awal `PAID`, menghitung 100% alokasi dana pesanan, memproses pendanaan, dan mengkreditkan tepat satu kali ke S-Pay Customer.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID Refund, Alokasi Pembayaran, atau S-Pay Account..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat log transaksi refund...</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Riwayat Refund"
              description="Belum ada transaksi refund atau pembatalan pesanan yang diproses oleh Finance Service."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">ID Refund</th>
                  <th className="py-3.5 px-4">Alokasi & Event Batal</th>
                  <th className="py-3.5 px-4">Nominal Diminta</th>
                  <th className="py-3.5 px-4">Nominal Didanai</th>
                  <th className="py-3.5 px-4">Kredit S-Pay</th>
                  <th className="py-3.5 px-4">Status & Waktu</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{refund.id}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Payment: {refund.payment_intent_id}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-slate-700">
                      <div>Alokasi: {refund.payment_allocation_id}</div>
                      <span className="text-[10px] text-slate-400">
                        Event: {refund.order_cancellation_event_id || "-"}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      Rp {refund.requested_amount_idr.toLocaleString("id-ID")}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-800">
                      Rp {refund.funded_amount_idr.toLocaleString("id-ID")}
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-black text-purple-900">
                        Rp {refund.credited_amount_idr.toLocaleString("id-ID")}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block mb-1 ${
                          refund.status === "SUCCEEDED"
                            ? "bg-emerald-100 text-emerald-800"
                            : refund.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : refund.status === "PROCESSING"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {refund.status}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {refund.credited_at
                          ? new Date(refund.credited_at).toLocaleString("id-ID")
                          : "Menunggu pendanaan"}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRefund(refund)}
                        className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Rincian
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{currentPage}</strong> dari <strong>{lastPage}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs rounded-xl"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage || loading}
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                className="text-xs rounded-xl"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: Rincian Refund
         ========================================================================= */}
      <Modal
        isOpen={!!selectedRefund}
        onClose={() => setSelectedRefund(null)}
        title="Rincian Transaksi Refund"
        size="md"
      >
        {selectedRefund && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Refund ID:</span>
                <strong className="font-mono text-slate-900">{selectedRefund.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Allocation:</span>
                <strong className="font-mono text-slate-900">{selectedRefund.payment_allocation_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Akun S-Pay Customer:</span>
                <strong className="font-mono text-slate-900">{selectedRefund.customer_spay_account_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alasan / Scope:</span>
                <span className="text-slate-800">{selectedRefund.refund_reason_scope || "Pembatalan Order"}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-400">Nominal Dikreditkan:</span>
                <strong className="text-sm font-black text-purple-900">
                  Rp {selectedRefund.credited_amount_idr.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/60 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Status Refund:</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                  {selectedRefund.status}
                </span>
              </div>
              {selectedRefund.funded_at && (
                <div className="flex justify-between">
                  <span>Waktu Didanai:</span>
                  <span className="font-mono">{new Date(selectedRefund.funded_at).toLocaleString("id-ID")}</span>
                </div>
              )}
              {selectedRefund.credited_at && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Waktu Dikreditkan ke S-Pay:</span>
                  <span className="font-mono">{new Date(selectedRefund.credited_at).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRefund(null)}
                className="rounded-xl text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
