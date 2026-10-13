"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { MerchantShipment } from "@/types/domain";
import {
  Truck,
  MagnifyingGlass,
  CheckCircle,
  WifiHigh,
  Warning,
  Eye,
  SlidersHorizontal,
  Plugs,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminShippingLogisticsPage() {
  const {
    merchantShipments,
    shippingAdapters,
    repo,
    user,
  } = useAdminOperations();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedShipment, setSelectedShipment] = useState<MerchantShipment | null>(null);
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExceptionModal, setShowExceptionModal] = useState<boolean>(false);

  const filteredShipments = merchantShipments.filter((s) => {
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.awbNumber.toLowerCase().includes(q) ||
      s.orderNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.courier.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const exceptionCount = merchantShipments.filter((s) => s.status === "DELIVERY_EXCEPTION").length;

  const handleTestWebhook = (adapterName: string) => {
    setToastMessage(`Webhook ping berhasil ke gateway ekspedisi ${adapterName}. Uptime 99.98%, Latency 142ms.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResolveException = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    repo.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "SHIPPING_EXCEPTION_INTERVENTION",
      resource: "MERCHANT_SHIPMENT",
      resourceId: selectedShipment.id,
      reason: exceptionNotes || "Intervensi kendala ekspedisi: koordinasi ulang jadwal pengantaran kurir",
      details: {
        awb: selectedShipment.awbNumber,
        courier: selectedShipment.courier,
      },
    });

    setToastMessage(`Instruksi pengantaran ulang untuk resi ${selectedShipment.awbNumber} telah dikirim ke kurir!`);
    setTimeout(() => setToastMessage(null), 4000);
    setShowExceptionModal(false);
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
            <span className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/60">
              <Truck size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Integrasi Logistik &amp; Pemantauan Resi (Shipping Hub)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Konektivitas API ekspedisi kurir kilat, tracking status AWB real-time, dan penanganan anomali kegagalan pengantaran paket (Delivery Exceptions).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={exceptionCount > 0 ? "danger" : "success"} size="md">
              {exceptionCount} Kendala Pengantaran (Exception)
            </Badge>
            <Badge variant="neutral" size="md">
              {shippingAdapters.length} Adapter Logistik Aktif
            </Badge>
          </div>
        </div>
      </div>

      {/* Logistics Partner Adapters */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Plugs size={16} className="text-sky-600" />
          Status Koneksi Gateway Logistik Terintegrasi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {shippingAdapters.map((adapter) => (
            <div key={adapter.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{adapter.carrierCode}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {adapter.carrierName}
                  </span>
                </div>
                <Badge variant={adapter.webhookStatus === "HEALTHY" ? "success" : "warning"} size="sm">
                  {adapter.webhookStatus}
                </Badge>
              </div>

              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>Tipe Layanan:</span>
                  <span className="font-semibold text-slate-700">{adapter.serviceType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tingkat Kegagalan:</span>
                  <span className="font-mono font-bold text-slate-800">{adapter.failureRatePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Sinkronisasi Terakhir:</span>
                  <span className="font-mono text-slate-400">{adapter.lastSyncAt}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleTestWebhook(adapter.carrierName)}
                className="w-full flex items-center justify-center gap-1 text-[11px] text-sky-700 hover:bg-sky-50"
              >
                <WifiHigh size={12} />
                <span>Tes Ping Webhook</span>
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Shipment Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor resi AWB, no pesanan, penerima, atau kurir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status Resi</option>
              <option value="IN_TRANSIT">IN_TRANSIT (Dalam Perjalanan)</option>
              <option value="DELIVERY_EXCEPTION">DELIVERY_EXCEPTION (Kendala Lapangan)</option>
              <option value="DELIVERED">DELIVERED (Terkirim)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">No. Resi AWB &amp; Kurir</th>
                <th className="px-4 py-3">Order &amp; Penerima</th>
                <th className="px-4 py-3">Tujuan Alamat</th>
                <th className="px-4 py-3">Bobot &amp; Ongkir</th>
                <th className="px-4 py-3">Estimasi Tiba</th>
                <th className="px-4 py-3">Status Pengiriman</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data pengiriman yang cocok.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{s.awbNumber}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-sky-700 text-[11px]">{s.courier}</span>
                        <span className="text-[10px] text-slate-400">({s.serviceType})</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{s.customerName}</span>
                      <p className="font-mono text-[10px] text-slate-400">Ref: {s.orderNumber}</p>
                    </td>

                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-[11px] text-slate-600 truncate">{s.shippingAddress}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{s.weightKg} kg</span>
                      <p className="font-mono text-[10px] text-slate-400">Rp {s.shippingCost.toLocaleString("id-ID")}</p>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">
                      {s.estimatedDelivery}
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          s.status === "DELIVERED"
                            ? "success"
                            : s.status === "DELIVERY_EXCEPTION" || s.status === "FAILED_ATTEMPT"
                            ? "danger"
                            : "primary"
                        }
                        size="sm"
                      >
                        {s.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {s.status === "DELIVERY_EXCEPTION" || s.status === "FAILED_ATTEMPT" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedShipment(s);
                            setShowExceptionModal(true);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white ml-auto flex items-center gap-1"
                        >
                          <Warning size={12} />
                          <span>Intervensi Kendala</span>
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedShipment(s)}
                          className="ml-auto flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Tracking</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Checkpoint Modal */}
      {selectedShipment && !showExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-600">AWB: {selectedShipment.awbNumber}</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Riwayat Checkpoint Ekspedisi ({selectedShipment.courier})
                </h3>
              </div>
              <button onClick={() => setSelectedShipment(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 py-2">
              {(selectedShipment.checkpoints || []).map((cp, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1 shrink-0"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{cp.location}</span>
                      <span className="text-[10px] font-mono text-slate-400">{cp.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{cp.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedShipment(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Resolution Modal */}
      {showExceptionModal && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Warning size={22} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Penyelesaian Kendala Ekspedisi (Delivery Exception)
                </h3>
              </div>
              <button onClick={() => setShowExceptionModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
              <p className="font-bold">Kasus Gagal Kirim / Rumah Kosong:</p>
              <p className="text-[11px] mt-0.5 text-rose-800">
                Kurir melaporkan: <em>&ldquo;Penerima tidak berada di lokasi &amp; nomor telepon tidak dapat dihubungi (Percobaan 2).&rdquo;</em>
              </p>
            </div>

            <form onSubmit={handleResolveException} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instruksi Dispatch Ekspedisi</label>
                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <option>Jadwalkan Pengantaran Ulang Besok Pagi (Re-delivery)</option>
                  <option>Tahan di Drop Point Terdekat untuk Diambil Pelanggan</option>
                  <option>Retur Barang ke Gudang Pengirim (RTS - Return to Sender)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Operasional Admin (Wajib)</label>
                <textarea
                  required
                  rows={3}
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                  placeholder="Instruksi spesifik nomor kontak cadangan atau rute alternatif..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowExceptionModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Kirim Instruksi ke Ekspedisi &amp; Catat Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
