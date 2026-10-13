"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { AuditLogEntry } from "@/types/domain";
import {
  ShieldCheck,
  MagnifyingGlass,
  SlidersHorizontal,
  LockKey,
  FileCode,
  DownloadSimple,
  CheckCircle,
  User,
  Fingerprint,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const RESULT_VARIANTS: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  SUCCESS: "success",
  DENIED: "danger",
  FAILED: "danger",
  WARNING: "warning",
};

export default function AdminAuditLogsPage() {
  const {
    auditLogs,
    auditActionFilter,
    setAuditActionFilter,
    auditSearchQuery,
    setAuditSearchQuery,
  } = useAdminOperations();

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `servio_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setToastMessage("Audit trail logs berhasil diekspor ke format JSON terenkripsi.");
    setTimeout(() => setToastMessage(null), 4000);
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
            <span className="p-3 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
              <ShieldCheck size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Buku Besar Jejak Audit &amp; Keamanan (Audit Trail Logs)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan mutasi administratif nir-ubah (Append-Only &amp; Immutable): evaluasi KYC, intervensi pesanan, penyesuaian stok opname, dan mediasi sengketa.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <LockKey size={14} />
              <span>Immutable Ledger (Read-Only)</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              <DownloadSimple size={16} />
              <span>Ekspor JSON</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Security Statement Notice */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
        <Fingerprint size={22} className="text-slate-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-slate-900">Jaminan Integritas Data &amp; Kepatuhan Regulasi:</strong> Seluruh baris log audit ini bersifat permanen dan tidak dapat diedit, diubah, maupun dihapus oleh administrator pada tingkatan wewenang apa pun. Log disimpan dengan metadata aktor, waktu presisi ISO-8601, dan parameter mutasi lengkap untuk keperluan audit eksternal.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID log, nama aktor, kode aksi, sumber daya, atau alasan audit..."
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Jenis Aksi Audit</option>
              <option value="KYC">Verifikasi KYC</option>
              <option value="PRODUCT">Moderasi Produk</option>
              <option value="DISPUTE">Eskalasi &amp; Mediasi Sengketa</option>
              <option value="INVENTORY">Penyesuaian Stok Opname</option>
              <option value="OVERRIDE">Intervensi &amp; Pengalihan Darurat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Timestamp &amp; ID</th>
                <th className="px-4 py-3">Aktor Administrator</th>
                <th className="px-4 py-3">Kode Aksi</th>
                <th className="px-4 py-3">Sumber Daya / Objek</th>
                <th className="px-4 py-3">Justifikasi / Alasan</th>
                <th className="px-4 py-3">Hasil</th>
                <th className="px-5 py-3 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan baris log audit yang cocok.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const badgeVariant = RESULT_VARIANTS[log.result] || "neutral";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[11px] font-bold text-slate-800">{log.timestamp}</span>
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">ID: {log.id}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <User size={13} className="text-slate-400" />
                          <span>{log.actorName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{log.actorRole} ({log.actorId})</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700">{log.resource}</span>
                        <p className="font-mono text-[10px] text-slate-400">{log.resourceId}</p>
                      </td>

                      <td className="px-4 py-3.5 max-w-[220px]">
                        <p className="text-[11px] text-slate-700 truncate">{log.reason || "Tindakan operasional standar"}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={badgeVariant} size="sm">
                          {log.result}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="ml-auto flex items-center gap-1 font-mono text-[11px]"
                        >
                          <FileCode size={12} />
                          <span>JSON Diff</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <FileCode size={20} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Inspeksi Payload Log Audit: {selectedLog.id}
                </h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Waktu Pencatatan:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Aktor &amp; Wewenang:</span>
                  <span className="font-bold text-slate-800">{selectedLog.actorName} ({selectedLog.actorRole})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Sumber Daya:</span>
                  <span className="font-bold text-slate-800">{selectedLog.resource} / {selectedLog.resourceId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status Hasil:</span>
                  <Badge variant={RESULT_VARIANTS[selectedLog.result] || "neutral"} size="sm">{selectedLog.result}</Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1">Rincian Metadata Mutasi (Raw JSON Payload):</span>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedLog.id,
                      timestamp: selectedLog.timestamp,
                      actor: {
                        id: selectedLog.actorId,
                        name: selectedLog.actorName,
                        role: selectedLog.actorRole,
                      },
                      action: selectedLog.action,
                      target: {
                        resource: selectedLog.resource,
                        resourceId: selectedLog.resourceId,
                      },
                      reason: selectedLog.reason,
                      result: selectedLog.result,
                      metadata: selectedLog.metadata || {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
