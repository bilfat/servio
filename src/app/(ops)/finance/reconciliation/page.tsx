"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Scales,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  ArrowsClockwise,
  Check,
  X,
  Clock,
  DownloadSimple,
  Bank,
  FileText,
  ArrowsLeftRight,
  TrendUp,
  Receipt,
  User,
  Eye,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { BackendReconciliation, BackendFinanceAuditLog } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function FinancialReconciliationPage() {
  const [reconData, setReconData] = useState<BackendReconciliation | null>(null);
  const [auditLogs, setAuditLogs] = useState<BackendFinanceAuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("ALL");

  // Selected audit log for detail inspection
  const [selectedLog, setSelectedLog] = useState<BackendFinanceAuditLog | null>(null);

  const fetchReconciliationAndAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reconRes, auditRes] = await Promise.all([
        financeApi.ops.reconciliation(),
        financeApi.ops.auditLogs({
          event: eventFilter !== "ALL" ? eventFilter : undefined,
          page: currentPage,
          per_page: 20,
        }),
      ]);

      if (reconRes && reconRes.data) {
        setReconData(reconRes.data);
      }
      if (auditRes && auditRes.data) {
        setAuditLogs(auditRes.data.data || []);
        setTotalLogs(auditRes.data.total || 0);
        setCurrentPage(auditRes.data.current_page || 1);
        setLastPage(auditRes.data.last_page || 1);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat data rekonsiliasi:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat status rekonsiliasi dan audit log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationAndAudit();
  }, [eventFilter, currentPage]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const q = searchQuery.toLowerCase();
    return auditLogs.filter(
      (log) =>
        log.id.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actor_user_id.toLowerCase().includes(q) ||
        (log.subject_type && log.subject_type.toLowerCase().includes(q)) ||
        (log.subject_id && log.subject_id.toLowerCase().includes(q))
    );
  }, [auditLogs, searchQuery]);

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
            Double-Entry Ledger & Financial Audit
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Rekonsiliasi Buku Besar & Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit integritas buku besar ganda (double-entry balancing), monitoring selisih mutasi debit-kredit, dan rekaman audit log transaksi finansial yang tidak dapat diubah (immutable).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReconciliationAndAudit}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan Telemetri
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
          <WarningCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1">
            <h4 className="font-bold">Kendala Koneksi Finance</h4>
            <p className="text-xs text-rose-800 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchReconciliationAndAudit}
            className="text-xs font-bold px-3 py-1 bg-white border border-rose-300 rounded-xl hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 1. Double-Entry Balance Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Keseimbangan */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status Integritas
            </span>
            <span
              className={`p-1.5 rounded-lg text-xs font-bold ${
                reconData?.is_double_entry_balanced
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {reconData?.is_double_entry_balanced ? "BALANCED" : "IMBALANCE"}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-base font-black text-slate-900 block">
              {reconData?.audit_status || "CLEAN_AND_BALANCED"}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Total Debit = Total Kredit
            </span>
          </div>
        </div>

        {/* Total Debit */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Debit Buku Besar
          </span>
          <div className="mt-3">
            <span className="text-xl font-black font-display text-slate-900 block">
              Rp {(reconData?.total_debit_idr ?? 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Sisi Penerimaan Kas / Piutang
            </span>
          </div>
        </div>

        {/* Total Kredit */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Kredit Buku Besar
          </span>
          <div className="mt-3">
            <span className="text-xl font-black font-display text-slate-900 block">
              Rp {(reconData?.total_credit_idr ?? 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Sisi Kewajiban / Pendapatan
            </span>
          </div>
        </div>

        {/* Selisih (Discrepancy) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Selisih Rekonsiliasi
          </span>
          <div className="mt-3">
            <span
              className={`text-xl font-black font-display block ${
                (reconData?.discrepancy_idr ?? 0) === 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Rp {(reconData?.discrepancy_idr ?? 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Toleransi selisih = 0 Rupiah bulat
            </span>
          </div>
        </div>
      </div>

      {/* 2. Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Log Aktivitas Keuangan (Audit Events)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jejak audit permanen setiap mutasi kebijakan, pembayaran, pelepasan dana, refund, dan penarikan saldo.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 self-start sm:self-auto">
            {totalLogs} Aktivitas Tercatat
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aksi (action), subjek, aktor, atau correlation ID..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="FEE_POLICY_DRAFT_CREATED">FEE_POLICY_DRAFT_CREATED</option>
              <option value="FEE_POLICY_PUBLISHED">FEE_POLICY_PUBLISHED</option>
              <option value="PAYMENT_SIMULATED">PAYMENT_SIMULATED</option>
              <option value="PAYOUT_SIMULATED">PAYOUT_SIMULATED</option>
              <option value="REFUND_CREDITED">REFUND_CREDITED</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat log audit finansial...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Log Audit"
              description="Belum ada aktivitas mutasi yang tercatat dalam audit log Finance Service."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu & Service</th>
                  <th className="py-3 px-4">Aksi / Event</th>
                  <th className="py-3 px-4">Subjek Terdampak</th>
                  <th className="py-3 px-4">Aktor / User</th>
                  <th className="py-3 px-4">Hasil</th>
                  <th className="py-3 px-4 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-body">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-slate-900">
                        {new Date(log.created_at).toLocaleString("id-ID")}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.actor_service}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-[11px]">{log.subject_type}</div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {log.subject_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {log.actor_user_id}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          log.result === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Detail
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
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
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
          MODAL: Detail Audit Event
         ========================================================================= */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Rincian Audit Event Finansial"
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Log ID:</span>
                <strong className="font-mono text-slate-900">{selectedLog.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aksi (Action):</span>
                <strong className="font-mono text-[#0F4C81]">{selectedLog.action}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aktor (Actor ID):</span>
                <strong className="font-mono text-slate-900">{selectedLog.actor_user_id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subjek:</span>
                <span className="font-mono text-slate-900">
                  {selectedLog.subject_type} ({selectedLog.subject_id})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Pencatatan:</span>
                <span className="font-mono">{new Date(selectedLog.created_at).toLocaleString("id-ID")}</span>
              </div>
            </div>

            {selectedLog.after_state && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Payload State (After State):
                </span>
                <pre className="p-3 rounded-2xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedLog.after_state, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
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
