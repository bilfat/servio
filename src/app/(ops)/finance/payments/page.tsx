"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bank,
  CheckCircle,
  WarningCircle,
  Clock,
  Check,
  X,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  CurrencyCircleDollar,
  ArrowsClockwise,
  Eye,
  SlidersHorizontal,
  PlayCircle,
  QrCode,
  CreditCard,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { BackendPaymentIntent } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function PaymentGatewayOperationsPage() {
  const [payments, setPayments] = useState<BackendPaymentIntent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Detail Modal & Simulation Modal
  const [selectedPayment, setSelectedPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationPayment, setSimulationPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationOutcome, setSimulationOutcome] = useState<"PAID" | "FAILED">("PAID");
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.ops.payments({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        method: methodFilter !== "ALL" ? methodFilter : undefined,
        page: currentPage,
        per_page: 15,
      });

      if (res && res.data) {
        setPayments(res.data.data || []);
        setTotalCount(res.data.total || 0);
        setCurrentPage(res.data.current_page || 1);
        setLastPage(res.data.last_page || 1);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat pembayaran:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat log pembayaran.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter, currentPage]);

  const handleSimulatePayment = async () => {
    if (!simulationPayment) return;
    try {
      setIsSimulating(true);
      setError(null);
      const providerEventId = `sim-evt-${Date.now()}`;
      await financeApi.demo.simulatePayment(simulationPayment.id, {
        outcome: simulationOutcome,
        provider_event_id: providerEventId,
        reported_amount_idr: simulationPayment.amount_idr,
      });

      setToastMessage(
        `Simulasi pembayaran ${simulationPayment.id} berhasil diproses dengan status ${simulationOutcome}!`
      );
      setSimulationPayment(null);
      await fetchPayments();
    } catch (err: unknown) {
      console.error("Gagal memproses simulasi:", err);
      setError(err instanceof Error ? err.message : "Gagal memproses simulasi pembayaran.");
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.finance_checkout_id && p.finance_checkout_id.toLowerCase().includes(q)) ||
        (p.checkout?.checkout_group_id && p.checkout.checkout_group_id.toLowerCase().includes(q)) ||
        (p.provider_reference && p.provider_reference.toLowerCase().includes(q))
    );
  }, [payments, searchQuery]);

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
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Payment Gateway Ingestion Log
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Monitoring Pembayaran Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit status transaksi pembayaran Customer (QRIS / Virtual Account), batas kedaluwarsa 6 jam, verifikasi PAID, dan kontrol simulasi demo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {totalCount} Transaksi
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan
          </Button>
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
            placeholder="Cari Payment ID, Checkout Group, atau Provider Ref..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
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
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Metode</option>
            <option value="QRIS">QRIS</option>
            <option value="BCA_VA">BCA Virtual Account</option>
            <option value="MANDIRI_VA">Mandiri Virtual Account</option>
            <option value="BRI_VA">BRI Virtual Account</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat log transaksi pembayaran...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Transaksi Pembayaran"
              description="Belum ada transaksi pembayaran yang cocok dengan filter atau kriteria pencarian yang Anda tentukan."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">ID Pembayaran</th>
                  <th className="py-3.5 px-4">Checkout Group</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4">Nominal (IDR)</th>
                  <th className="py-3.5 px-4">Status & Waktu</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{payment.id}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Provider: {payment.provider}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-slate-700">
                      {payment.checkout?.checkout_group_id || payment.finance_checkout_id || "-"}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        {payment.method === "QRIS" ? (
                          <QrCode className="w-4 h-4 text-[#0F4C81]" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-emerald-700" />
                        )}
                        <span>{payment.method}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-black text-slate-900">
                        Rp {payment.amount_idr.toLocaleString("id-ID")}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block mb-1 ${
                          payment.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : payment.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : payment.status === "EXPIRED"
                            ? "bg-slate-100 text-slate-700"
                            : payment.status === "PARTIALLY_REFUNDED" || payment.status === "REFUNDED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {payment.paid_at
                          ? `Dibayar: ${new Date(payment.paid_at).toLocaleString("id-ID")}`
                          : `Dibuat: ${new Date(payment.issued_at).toLocaleString("id-ID")}`}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                          className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Rincian
                        </Button>

                        {/* Demo simulator only for PENDING payments in testing/demo mode */}
                        {payment.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSimulationPayment(payment);
                              setSimulationOutcome("PAID");
                            }}
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                          >
                            <PlayCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                            Simulasi
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
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
          MODAL: Rincian Pembayaran
         ========================================================================= */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Rincian Transaksi Pembayaran"
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <strong className="font-mono text-slate-900">{selectedPayment.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Checkout Group:</span>
                <strong className="font-mono text-slate-900">
                  {selectedPayment.checkout?.checkout_group_id || selectedPayment.finance_checkout_id}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Metode & Provider:</span>
                <strong className="text-slate-900">
                  {selectedPayment.method} ({selectedPayment.provider})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Tagihan:</span>
                <strong className="text-sm font-black text-slate-900">
                  Rp {selectedPayment.amount_idr.toLocaleString("id-ID")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Pembayaran:</span>
                <span className="font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                  {selectedPayment.status}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-200/60 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Waktu Diterbitkan:</span>
                <span className="font-mono">{new Date(selectedPayment.issued_at).toLocaleString("id-ID")}</span>
              </div>
              {selectedPayment.expires_at && (
                <div className="flex justify-between">
                  <span>Kedaluwarsa (6 Jam):</span>
                  <span className="font-mono">{new Date(selectedPayment.expires_at).toLocaleString("id-ID")}</span>
                </div>
              )}
              {selectedPayment.paid_at && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Waktu Terverifikasi PAID:</span>
                  <span className="font-mono">{new Date(selectedPayment.paid_at).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayment(null)}
                className="rounded-xl text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: Simulator Demo Pembayaran (Finance Ops Non-Production Only)
         ========================================================================= */}
      <Modal
        isOpen={!!simulationPayment}
        onClose={() => !isSimulating && setSimulationPayment(null)}
        title="Simulasi Pembayaran Mock Gateway"
        size="md"
      >
        {simulationPayment && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
              <strong>Simulasi Khusus Demo:</strong> Hanya dapat dieksekusi oleh Finance Ops yang terotorisasi di lingkungan testing/demo untuk menguji respons outbox dan verifikasi PAID.
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-slate-900">{simulationPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="font-bold text-slate-900">
                  Rp {simulationPayment.amount_idr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Pilih Hasil Simulasi
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulationOutcome("PAID")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    simulationOutcome === "PAID"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Sukses (PAID)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationOutcome("FAILED")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    simulationOutcome === "FAILED"
                      ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <WarningCircle size={16} weight="fill" className="text-rose-600" />
                  <span>Gagal (FAILED)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isSimulating}
                onClick={() => setSimulationPayment(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSimulating}
                onClick={handleSimulatePayment}
                className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isSimulating ? "Memproses..." : "Kirim Simulasi Gateway"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
