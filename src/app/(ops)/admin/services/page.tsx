"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { ServiceOrder } from "@/types/domain";
import {
  Wrench,
  MagnifyingGlass,
  Clock,
  MapPin,
  User,
  CheckCircle,
  WarningCircle,
  Camera,
  ArrowsLeftRight,
  Eye,
  SlidersHorizontal,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_VARIANTS: Record<string, "primary" | "secondary" | "success" | "warning" | "danger" | "neutral"> = {
  BOOKED: "neutral",
  MATCHED: "primary",
  DISPATCHED: "primary",
  ON_SITE: "warning",
  DIAGNOSIS: "warning",
  QUOTATION_PENDING: "warning",
  CUSTOMER_APPROVED: "primary",
  IN_PROGRESS: "primary",
  WORK_DONE_PROOF_PENDING: "warning",
  CUSTOMER_CONFIRMATION: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function AdminServiceOperationsPage() {
  const { serviceOrders, repo, user } = useAdminOperations();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [newTechnicianName, setNewTechnicianName] = useState<string>("Budi Santoso (Lead AC Technician)");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredOrders = serviceOrders.filter((order) => {
    const matchStatus = statusFilter === "ALL" || statusFilter === "" || order.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.providerName.toLowerCase().includes(q) ||
      order.serviceTitle.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleOpenOverride = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setOverrideReason("");
    setShowOverrideModal(true);
  };

  const handleExecuteOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Log to audit trail
    repo.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "SERVICE_ORDER_OVERRIDE_DISPATCH",
      resource: "SERVICE_ORDER",
      resourceId: selectedOrder.id,
      reason: overrideReason || "Emergency re-dispatch authorized by Admin Operations",
      details: {
        previousWorker: selectedOrder.assignedWorker?.name || "Unassigned",
        newWorker: newTechnicianName,
        status: selectedOrder.status,
      },
    });

    setToastMessage(`Layanan ${selectedOrder.id} berhasil dialihkan ke teknisi darurat: ${newTechnicianName}.`);
    setTimeout(() => setToastMessage(null), 4000);
    setShowOverrideModal(false);
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
            <span className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200/60">
              <Wrench size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Monitoring Operasional Layanan Jasa (Service Ops)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan siklus pesanan real-time: matching provider, kepatuhan SOP foto bukti teknisi, SLA kedatangan, dan intervensi darurat.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {serviceOrders.filter((o) => o.status === "IN_PROGRESS" || o.status === "TECHNICIAN_ARRIVED" || o.status === "TECHNICIAN_DISPATCHED").length} Sedang Pengerjaan
            </Badge>
            <Badge variant="neutral" size="md">
              Total {serviceOrders.length} Pesanan
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID order, nama pelanggan, provider jasa, atau judul layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Siklus Status</option>
              <option value="BOOKED">BOOKED (Baru Masuk)</option>
              <option value="MATCHED">MATCHED (Mitra Ditemukan)</option>
              <option value="DISPATCHED">DISPATCHED (Teknisi Menuju Lokasi)</option>
              <option value="ON_SITE">ON_SITE (Tiba di Lokasi)</option>
              <option value="DIAGNOSIS">DIAGNOSIS (Pengecekan Kendala)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Sedang Pengerjaan)</option>
              <option value="WORK_DONE_PROOF_PENDING">WORK_DONE_PROOF_PENDING (Unggah Bukti)</option>
              <option value="COMPLETED">COMPLETED (Selesai)</option>
              <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID &amp; Layanan</th>
                <th className="px-4 py-3">Pelanggan &amp; Lokasi</th>
                <th className="px-4 py-3">Mitra Provider &amp; Teknisi</th>
                <th className="px-4 py-3">Jadwal &amp; SLA</th>
                <th className="px-4 py-3">Nilai &amp; Escrow</th>
                <th className="px-4 py-3">Status Siklus</th>
                <th className="px-5 py-3 text-right">Aksi Intervensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data pesanan layanan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const badgeVariant = STATUS_VARIANTS[order.status] || "neutral";
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-slate-900">{order.id}</span>
                        <p className="font-semibold text-slate-800 line-clamp-1 mt-0.5">{order.serviceTitle}</p>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Domain: {order.domainId}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          <span>{order.customerName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{order.address}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{order.customerPhone}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800">{order.providerName}</p>
                        <div className="flex items-center gap-1 text-[11px] text-cyan-700 font-medium mt-0.5">
                          <Wrench size={12} />
                          <span>{order.assignedWorker?.name || "Menunggu Penugasan"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Mode: {order.serviceMode}</span>
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck size={11} weight="fill" className="text-emerald-600" />
                            Garansi 30 Hari
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Clock size={12} className="text-slate-400" />
                          <span>{order.scheduledDate}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{order.scheduledTimeSlot}</span>
                        <div className="mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            SLA On-Time
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-slate-900">
                          Rp {order.pricing.totalAmount.toLocaleString("id-ID")}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {order.isEscrowLocked ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Escrow Locked
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Escrow Released</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={badgeVariant} size="sm">
                          {order.statusLabel || order.status}
                        </Badge>
                        <div className="text-[10px] text-slate-400 mt-1">Garansi: {order.warrantyPeriodDays} Hari</div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1"
                          >
                            <Eye size={12} />
                            <span>SOP Detail</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenOverride(order)}
                            className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-800 text-white"
                          >
                            <ArrowsLeftRight size={12} />
                            <span>Alihkan</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SOP Detail Modal / Inspector */}
      {selectedOrder && !showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-600 font-bold">{selectedOrder.id}</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Inspeksi SOP &amp; Bukti Pengerjaan Lapangan
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Stepper overview */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Progres Tahapan Pengerjaan (12-State SOP Tracker)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(selectedOrder.stepper || []).map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border text-[11px] ${
                      step.isCompleted
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : step.isCurrent
                        ? "bg-cyan-50 border-cyan-300 text-cyan-900 font-bold"
                        : "bg-white border-slate-200 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      {step.isCompleted ? (
                        <CheckCircle size={14} className="text-emerald-600" />
                      ) : step.isCurrent ? (
                        <Clock size={14} className="text-cyan-600 animate-spin" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block text-center text-[9px] leading-3">
                          {idx + 1}
                        </span>
                      )}
                      <span className="truncate">{step.title}</span>
                    </div>
                    {step.timestamp && <span className="text-[10px] text-slate-500 block mt-1">{step.timestamp}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Photo SOP Evidences */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera size={16} className="text-cyan-600" />
                Bukti Foto Pengerjaan Sebelum &amp; Sesudah
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                  <div className="p-2 bg-slate-200 text-[11px] font-bold text-slate-700 flex justify-between">
                    <span>Foto Sebelum Pengerjaan (Pra-Diagnosa)</span>
                    <Badge variant="neutral" size="sm">GPS Verified</Badge>
                  </div>
                  <div className="h-40 bg-slate-800/10 flex items-center justify-center text-slate-400 text-xs">
                    <img
                      src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80"
                      alt="Pre-inspection"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[10px] text-slate-500 bg-white">
                    Tekanan Freon Awal: <strong>60 PSI</strong> (Di bawah rekomendasi standar 120 PSI)
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                  <div className="p-2 bg-slate-200 text-[11px] font-bold text-slate-700 flex justify-between">
                    <span>Foto Pasca Pengerjaan &amp; Cuci Unit</span>
                    <Badge variant="success" size="sm">Valid SOP</Badge>
                  </div>
                  <div className="h-40 bg-slate-800/10 flex items-center justify-center text-slate-400 text-xs">
                    <img
                      src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80"
                      alt="Post-inspection"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[10px] text-slate-500 bg-white">
                    Tekanan Freon Akhir: <strong>135 PSI</strong> • Suhu Evaporator: <strong>16°C</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Jasa Layanan Pokok:</span>
                <span className="font-mono">Rp {selectedOrder.pricing.serviceFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Material / Suku Cadang:</span>
                <span className="font-mono">Rp {selectedOrder.pricing.materialFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Platform Servio:</span>
                <span className="font-mono">Rp {selectedOrder.pricing.platformFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Escrow Terkunci:</span>
                <span className="font-mono text-cyan-700 text-sm">
                  Rp {selectedOrder.pricing.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedOrder(null)}>
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenOverride(selectedOrder)}
                className="bg-cyan-700 hover:bg-cyan-800 text-white flex items-center gap-1.5"
              >
                <ArrowsLeftRight size={14} />
                <span>Alihkan Teknisi Darurat</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Override Modal */}
      {showOverrideModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <WarningCircle size={22} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Otorisasi Pengalihan Teknisi Darurat
                </h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
              <p className="font-bold">Protokol Audit Administrator:</p>
              <p className="text-[11px] mt-0.5 text-rose-800 leading-relaxed">
                Tindakan override ini akan membatalkan penugasan teknisi sebelumnya dan menugaskan teknisi baru secara paksa. Seluruh tindakan dicatat di <strong>Audit Trail Logs</strong>.
              </p>
            </div>

            <form onSubmit={handleExecuteOverride} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ID Pesanan Layanan</label>
                <input
                  type="text"
                  disabled
                  value={selectedOrder.id}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teknisi Pengganti</label>
                <select
                  value={newTechnicianName}
                  onChange={(e) => setNewTechnicianName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="Budi Santoso (Lead AC Technician - Rapid Response)">Budi Santoso (Lead AC Technician - Rapid Response)</option>
                  <option value="Ahmad Zulkarnain (Master Technician Kelistrikan)">Ahmad Zulkarnain (Master Technician Kelistrikan)</option>
                  <option value="Rudi Hermawan (Teknisi Senior Refrigerasi)">Rudi Hermawan (Teknisi Senior Refrigerasi)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justifikasi &amp; Alasan Intervensi Operasional</label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contoh: Teknisi awal mengalami kendala kecelakaan di jalan / terlambat melampaui SLA 45 menit..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowOverrideModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Konfirmasi Pengalihan &amp; Catat Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
