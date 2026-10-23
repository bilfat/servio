"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CurrencyCircleDollar,
  Bank,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  MagnifyingGlass,
  Check,
  X,
  LockKey,
  ShieldCheck,
  Storefront,
  BuildingOffice,
  FileText,
  ArrowsClockwise,
  Eye,
  PlayCircle,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { BackendWithdrawalRequest } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function VendorPayoutOperationsPage() {
  const [withdrawals, setWithdrawals] = useState<BackendWithdrawalRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail Modal & Simulation Modal
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<BackendWithdrawalRequest | null>(null);
  const [simulationWithdrawal, setSimulationWithdrawal] = useState<BackendWithdrawalRequest | null>(null);
  const [simulationOutcome, setSimulationOutcome] = useState<"SUCCEEDED" | "FAILED">("SUCCEEDED");
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.ops.withdrawals({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page: currentPage,
        per_page: 15,
      });

      if (res && res.data) {
        setWithdrawals(res.data.data || []);
        setTotalCount(res.data.total || 0);
        setCurrentPage(res.data.current_page || 1);
        setLastPage(res.data.last_page || 1);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat daftar pencairan:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat log pencairan dana.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter, currentPage]);

  const handleSimulatePayout = async () => {
    if (!simulationWithdrawal) return;
    try {
      setIsSimulating(true);
      setError(null);
      const providerEventId = `payout-sim-${Date.now()}`;
      await financeApi.demo.simulateWithdrawal(simulationWithdrawal.id, {
        outcome: simulationOutcome,
        provider_event_id: providerEventId,
      });

      setToastMessage(
        `Simulasi payout ${simulationWithdrawal.id} berhasil diselesaikan dengan status ${simulationOutcome}!`
      );
      setSimulationWithdrawal(null);
      await fetchWithdrawals();
    } catch (err: unknown) {
      console.error("Gagal memproses simulasi payout:", err);
      setError(err instanceof Error ? err.message : "Gagal memproses simulasi transfer bank.");
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase();
    return withdrawals.filter(
      (w) =>
        w.id.toLowerCase().includes(q) ||
        (w.requested_by_user_id && w.requested_by_user_id.toLowerCase().includes(q)) ||
        (w.bank_destination?.bank_name && w.bank_destination.bank_name.toLowerCase().includes(q)) ||
        (w.bank_snapshot_masked?.bank_name && w.bank_snapshot_masked.bank_name.toLowerCase().includes(q)) ||
        (w.bank_snapshot_masked?.account_holder_name &&
          w.bank_snapshot_masked.account_holder_name.toLowerCase().includes(q))
    );
  }, [withdrawals, searchQuery]);

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
            S-Pay Payout & Settlement Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Monitoring Pencairan Dana (Payout)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit permintaan penarikan saldo S-Pay Merchant dan Customer (min Rp 20.000), potongan biaya transfer Rp 2.500, dan status eksekusi transfer bank.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {totalCount} Pengajuan
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWithdrawals}
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
            placeholder="Cari ID Pencairan, User ID, Bank, atau Nama Penerima..."
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
            <p className="text-xs font-medium text-slate-500">Memuat log permintaan pencairan...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Permintaan Pencairan"
              description="Belum ada transaksi pencairan dana (payout) yang tercatat di database Finance Service."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">ID & Pemohon</th>
                  <th className="py-3.5 px-4">Rekening Tujuan (Masked)</th>
                  <th className="py-3.5 px-4">Nominal Ditarik</th>
                  <th className="py-3.5 px-4">Biaya Bank</th>
                  <th className="py-3.5 px-4">Net Diterima</th>
                  <th className="py-3.5 px-4">Status & Waktu</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredWithdrawals.map((withdrawal) => {
                  const bankName =
                    withdrawal.bank_destination?.bank_name ||
                    withdrawal.bank_snapshot_masked?.bank_name ||
                    "BANK TRANSFER";
                  const holderName =
                    withdrawal.bank_destination?.account_holder_name ||
                    withdrawal.bank_snapshot_masked?.account_holder_name ||
                    "-";
                  const accMasked =
                    withdrawal.bank_destination?.account_number_masked ||
                    withdrawal.bank_snapshot_masked?.account_number_masked ||
                    "****";

                  return (
                    <tr key={withdrawal.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-slate-900">{withdrawal.id}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          User: {withdrawal.requested_by_user_id}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{bankName}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {holderName} • <span className="font-mono text-[10px] text-slate-500">{accMasked}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-900">
                        Rp {withdrawal.requested_amount_idr.toLocaleString("id-ID")}
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-medium">
                        Rp {(withdrawal.transfer_fee_idr || 2500).toLocaleString("id-ID")}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-black text-emerald-800">
                          Rp {withdrawal.net_to_bank_idr.toLocaleString("id-ID")}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block mb-1 ${
                            withdrawal.status === "SUCCEEDED"
                              ? "bg-emerald-100 text-emerald-800"
                              : withdrawal.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : withdrawal.status === "PROCESSING"
                              ? "bg-sky-100 text-sky-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {withdrawal.status}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(withdrawal.initiated_at).toLocaleString("id-ID")}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                            className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Rincian
                          </Button>

                          {/* Demo simulation for PENDING/PROCESSING */}
                          {(withdrawal.status === "PENDING" || withdrawal.status === "PROCESSING") && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSimulationWithdrawal(withdrawal);
                                setSimulationOutcome("SUCCEEDED");
                              }}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                            >
                              <PlayCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                              Simulasi Payout
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          MODAL: Rincian Pencairan
         ========================================================================= */}
      <Modal
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        title="Rincian Permohonan Pencairan (Payout)"
        size="md"
      >
        {selectedWithdrawal && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Withdrawal ID:</span>
                <strong className="font-mono text-slate-900">{selectedWithdrawal.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pemohon (Aktor):</span>
                <strong className="font-mono text-slate-900">{selectedWithdrawal.requested_by_user_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Penarikan:</span>
                <strong className="text-sm font-black text-slate-900">
                  Rp {selectedWithdrawal.requested_amount_idr.toLocaleString("id-ID")}
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Transfer Bank (Dipotong):</span>
                <span>- Rp {(selectedWithdrawal.transfer_fee_idr || 2500).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-emerald-900">
                <span className="font-bold">Estimasi Net Diterima di Bank:</span>
                <strong className="text-sm font-black text-emerald-800">
                  Rp {selectedWithdrawal.net_to_bank_idr.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/60 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span>Status Payout:</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                  {selectedWithdrawal.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Waktu Inisiasi:</span>
                <span className="font-mono">{new Date(selectedWithdrawal.initiated_at).toLocaleString("id-ID")}</span>
              </div>
              {selectedWithdrawal.completed_at && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Waktu Selesai:</span>
                  <span className="font-mono">{new Date(selectedWithdrawal.completed_at).toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWithdrawal(null)}
                className="rounded-xl text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: Simulator Demo Payout (Finance Ops Non-Production Only)
         ========================================================================= */}
      <Modal
        isOpen={!!simulationWithdrawal}
        onClose={() => !isSimulating && setSimulationWithdrawal(null)}
        title="Simulasi Payout Transfer Bank Mock"
        size="md"
      >
        {simulationWithdrawal && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 leading-relaxed">
              <strong>Simulasi Demo Bank:</strong> Digunakan untuk memverifikasi callback simulasi transfer bank (SUCCEEDED / FAILED). Jika gagal, saldo yang terkunci akan otomatis dikembalikan ke saldo S-Pay tersedia.
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Withdrawal ID:</span>
                <span className="font-mono font-bold text-slate-900">{simulationWithdrawal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Ditarik:</span>
                <span className="font-bold text-slate-900">
                  Rp {simulationWithdrawal.requested_amount_idr.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Transfer ke Rekening:</span>
                <span className="font-black text-emerald-800">
                  Rp {simulationWithdrawal.net_to_bank_idr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Pilih Hasil Simulasi Transfer
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulationOutcome("SUCCEEDED")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    simulationOutcome === "SUCCEEDED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Sukses (SUCCEEDED)</span>
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
                onClick={() => setSimulationWithdrawal(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSimulating}
                onClick={handleSimulatePayout}
                className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSimulating ? "Memproses..." : "Kirim Hasil Payout Bank"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
