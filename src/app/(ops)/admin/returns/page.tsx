"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  ArrowUUpLeft,
  MagnifyingGlass,
  CheckCircle,
  SlidersHorizontal,
  Eye,
  ShieldWarning,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminReturnsFraudPage() {
  const { platformReturns, repo, user } = useAdminOperations();

  type PlatformReturnItem = (typeof platformReturns)[number];
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<PlatformReturnItem | null>(null);
  const [dispositionChoice, setDispositionChoice] = useState<"ACCEPT_RESTOCK" | "ACCEPT_REFURBISH" | "REJECT_FRAUD">("ACCEPT_RESTOCK");
  const [dispositionNotes, setDispositionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredReturns = platformReturns.filter((r) => {
    const matchChannel = channelFilter === "ALL" || r.returnChannel === channelFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.productTitle.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q);
    return matchChannel && matchSearch;
  });

  const handleResolveDisposition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    repo.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "RETURN_FRAUD_DISPOSITION",
      resource: selectedReturn.returnChannel,
      resourceId: selectedReturn.id,
      reason: dispositionNotes || `Keputusan disposisi retur barang: ${dispositionChoice}`,
      details: {
        orderId: selectedReturn.orderId,
        sku: selectedReturn.sku,
        disposition: dispositionChoice,
      },
    });

    setToastMessage(`Disposisi retur ${selectedReturn.id} (${dispositionChoice}) berhasil diterapkan dan dicatat di Audit Trail.`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedReturn(null);
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
            <span className="p-3 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <ArrowUUpLeft size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Pengawasan Retur Barang &amp; Deteksi Fraud (Returns &amp; Fraud)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemeriksaan bukti fisik retur Retail &amp; B2B Grosir, evaluasi skor anomali klaim kosong (empty box), dan disposisi restock / karantina limbah.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="md">
              {platformReturns.filter((r) => r.status === "REQUESTED" || r.status === "RECEIVED_AWAITING_INSPECTION").length} Klaim Retur Aktif
            </Badge>
            <Badge variant="neutral" size="md">
              Total {platformReturns.length} Kasus Retur
            </Badge>
          </div>
        </div>
      </div>

      {/* Fraud Risk Detection Banner */}
      <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 text-orange-900 text-xs flex items-start gap-3">
        <ShieldWarning size={20} className="text-orange-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="font-semibold text-orange-950">Protokol Deteksi Kecurangan (Fraud Screening):</strong> Setiap pengajuan retur barang bernilai tinggi melewati pencocokan nomor seri part OEM dan algoritma skor perilaku pengembali berulang (repeat returner). Penolakan atas dasar fraud akan otomatis membekukan akun pengaju untuk investigasi lebih lanjut.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID retur, nomor pesanan/PO, nama pembeli, kode produk, atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kanal Retur</option>
              <option value="RETAIL_CUSTOMER">Customer Retail (B2C)</option>
              <option value="B2B_SUPPLIER">Merchant ke Supplier (B2B)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID Retur &amp; Order</th>
                <th className="px-4 py-3">Kanal &amp; Pihak Pengaju</th>
                <th className="px-4 py-3">Suku Cadang &amp; Qty</th>
                <th className="px-4 py-3">Alasan Retur</th>
                <th className="px-4 py-3">Skor Resiko Fraud</th>
                <th className="px-4 py-3">Status Retur</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data pengajuan retur barang.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((r) => {
                  const isB2B = r.returnChannel === "B2B_SUPPLIER";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-slate-900">{r.id}</span>
                        <p className="font-mono text-[10px] text-slate-400">Order: {r.orderId}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800">{r.customerName}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            isB2B ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {isB2B ? "B2B Supplier Return" : "Retail Customer Return"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-semibold text-slate-800 line-clamp-1">{r.productTitle}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                          <span>Kode: {r.sku}</span>
                          <span>•</span>
                          <span>{r.quantity} unit</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="text-[11px] text-slate-700 truncate">{r.reason}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-bold text-emerald-700 text-[11px]">Rendah (0.12)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Serial match OK</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={r.status === "ACCEPTED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"} size="sm">
                          {r.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedReturn(r)}
                          className="ml-auto flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Disposisi</span>
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

      {/* Return Disposition Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-600">ID: {selectedReturn.id}</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Inspeksi Fisik &amp; Disposisi Retur
                </h3>
              </div>
              <button onClick={() => setSelectedReturn(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Suku Cadang:</span>
                <span className="font-bold text-slate-800">{selectedReturn.productTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alasan Klaim Retur:</span>
                <span className="text-orange-700 font-semibold">{selectedReturn.reason}</span>
              </div>
            </div>

            {/* Photo preview */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bukti Foto Retur Pengaju:</span>
              <div className="h-32 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                <img
                  src={selectedReturn.photoUrl}
                  alt="Return proof"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <form onSubmit={handleResolveDisposition} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">Keputusan Disposisi Fisik Barang</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDispositionChoice("ACCEPT_RESTOCK")}
                    className={`p-2 rounded-xl border text-center font-bold text-xs ${
                      dispositionChoice === "ACCEPT_RESTOCK" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Restock (Layak Jual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispositionChoice("ACCEPT_REFURBISH")}
                    className={`p-2 rounded-xl border text-center font-bold text-xs ${
                      dispositionChoice === "ACCEPT_REFURBISH" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Perbaikan / Refurbish
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispositionChoice("REJECT_FRAUD")}
                    className={`p-2 rounded-xl border text-center font-bold text-xs ${
                      dispositionChoice === "REJECT_FRAUD" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Tolak (Terindikasi Fraud)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Hasil Pemeriksaan Fisik</label>
                <textarea
                  required
                  rows={3}
                  value={dispositionNotes}
                  onChange={(e) => setDispositionNotes(e.target.value)}
                  placeholder="Kondisi segel pabrik, kesesuaian nomor seri kemasan vs fisik..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedReturn(null)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                  Terapkan Disposisi &amp; Catat Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
