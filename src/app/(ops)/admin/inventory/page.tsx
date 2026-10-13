"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  Package,
  MagnifyingGlass,
  CheckCircle,
  SlidersHorizontal,
  Storefront,
  Buildings,
  PlusMinus,
  Warning,
  Info,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminPlatformInventoryPage() {
  const {
    platformInventory,
    inventoryWarehouseFilter,
    setInventoryWarehouseFilter,
    inventorySearchQuery,
    setInventorySearchQuery,
    adjustInventoryOperational,
  } = useAdminOperations();

  type PlatformInventoryItem = (typeof platformInventory)[number];
  const [selectedStockItem, setSelectedStockItem] = useState<PlatformInventoryItem | null>(null);
  const [deltaQty, setDeltaQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [documentRef, setDocumentRef] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);

  const lowStockCount = platformInventory.filter((item) => item.isLowStock).length;

  const handleOpenAdjust = (item: PlatformInventoryItem) => {
    setSelectedStockItem(item);
    setDeltaQty(0);
    setAdjustmentReason("");
    setDocumentRef("");
    setShowAdjustModal(true);
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem) return;

    if (deltaQty === 0) {
      alert("Perubahan kuantitas (delta) tidak boleh nol.");
      return;
    }

    adjustInventoryOperational(
      selectedStockItem.warehouseId,
      selectedStockItem.sku,
      deltaQty,
      `${adjustmentReason.trim()} (Ref: ${documentRef || "BERITA_ACARA_ADMIN"})`
    );

    setToastMessage(`Penyesuaian stok ${selectedStockItem.sku} (${deltaQty > 0 ? `+${deltaQty}` : deltaQty} unit) berhasil diterapkan dan dicatat di Audit Trail.`);
    setTimeout(() => setToastMessage(null), 4500);
    setShowAdjustModal(false);
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
            <span className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/60">
              <Package size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Pengawasan Inventaris Multi-Entitas (5-Bucket Matrix)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring konsolidasi stok Retail Merchant &amp; Grosir Supplier: On-Hand, Reserved, Allocated, Unavailable, dan Intervensi Penyesuaian Berita Acara.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={lowStockCount > 0 ? "danger" : "success"} size="md">
              {lowStockCount} Peringatan Stok Kritis
            </Badge>
            <Badge variant="neutral" size="md">
              Total {platformInventory.length} Varian Terdaftar
            </Badge>
          </div>
        </div>
      </div>

      {/* 5-Bucket Model Formula Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-900 text-xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Info size={16} className="text-teal-700" />
          <span>Formula Standar Industri 5-Bucket:</span>
        </div>
        <div className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-teal-200 text-teal-950 inline-block">
          Available = OnHand − (Reserved + Allocated + Unavailable)
        </div>
        <p className="text-[11px] text-teal-800 mt-1.5 leading-relaxed">
          Kuantitas <strong>Available</strong> adalah stok aktual yang dapat dipesan oleh pelanggan (B2C) atau diajukan dalam PO oleh Merchant (B2B). Kuantitas <strong>Reserved</strong> terikat pada pesanan belum lunas, <strong>Allocated</strong> telah masuk antrean pick-pack gudang, dan <strong>Unavailable</strong> dalam inspeksi kerusakan/karantina retur.
        </p>
      </div>

      {/* Search & Warehouse Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari varian, judul produk, entitas pemilik, atau kategori..."
              value={inventorySearchQuery}
              onChange={(e) => setInventorySearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={inventoryWarehouseFilter}
              onChange={(e) => setInventoryWarehouseFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Fasilitas Gudang</option>
              <option value="wh-jkt-01">Gudang Utama Glodok (Merchant)</option>
              <option value="wh-bdg-02">Gudang Hub Bandung (Merchant)</option>
              <option value="wh-sup-01">Gudang Logistik Pusat Cikarang (Supplier)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Produk &amp; Varian</th>
                <th className="px-4 py-3">Entitas &amp; Gudang</th>
                <th className="px-3 py-3 text-center">On-Hand</th>
                <th className="px-3 py-3 text-center">Reserved</th>
                <th className="px-3 py-3 text-center">Allocated</th>
                <th className="px-3 py-3 text-center">Unavailable</th>
                <th className="px-4 py-3 text-center font-bold text-teal-700">Available</th>
                <th className="px-4 py-3">Status Ketersediaan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platformInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data inventaris yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                platformInventory.map((item, idx) => (
                  <tr key={`${item.warehouseId}-${item.sku}-${idx}`} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 line-clamp-1">{item.title}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                          {item.sku}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.category}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        {item.ownerRole === "SUPPLIER" ? (
                          <Buildings size={14} className="text-indigo-600 shrink-0" />
                        ) : (
                          <Storefront size={14} className="text-emerald-600 shrink-0" />
                        )}
                        <span className="line-clamp-1">{item.ownerName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.warehouseName}</p>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-800">
                      {item.onHand}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-amber-700">
                      {item.reserved}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-blue-700">
                      {item.allocated}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-rose-600">
                      {item.unavailable}
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono font-bold text-teal-800 text-sm bg-teal-50/40">
                      {item.available} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      {item.isLowStock ? (
                        <div className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                          <Warning size={14} />
                          <span>Kritis (&le; {item.minStockAlert})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                          <CheckCircle size={14} />
                          <span>Aman (Optimal)</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenAdjust(item)}
                        className="ml-auto flex items-center gap-1 text-teal-700 hover:bg-teal-50"
                      >
                        <PlusMinus size={12} />
                        <span>Koreksi Fisik</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audited Stock Adjustment Override Modal */}
      {showAdjustModal && selectedStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-teal-700">
                <PlusMinus size={22} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Koreksi Stok Administratif Berita Acara
                </h3>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-bold">Protokol Penyesuaian Fisik (Stock Opname Override):</p>
              <p className="text-[11px] mt-0.5 text-amber-800 leading-relaxed">
                Penyesuaian kuantitas secara manual hanya diizinkan untuk selisih fisik opname, barang rusak di rak, atau hasil investigasi sengketa. Mutasi kuantitas akan tercatat di <strong>Audit Trail Logs</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Produk / Varian:</span>
                <span className="font-bold text-slate-800">{selectedStockItem.title} ({selectedStockItem.sku})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fasilitas Gudang:</span>
                <span className="font-bold text-slate-800">{selectedStockItem.warehouseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Posisi On-Hand Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900">{selectedStockItem.onHand} unit</span>
              </div>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Delta Penyesuaian (+ Tambah / - Kurang)
                </label>
                <input
                  type="number"
                  required
                  value={deltaQty}
                  onChange={(e) => setDeltaQty(parseInt(e.target.value) || 0)}
                  placeholder="Contoh: -3 atau +5"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Hasil On-Hand baru: <strong className="font-mono">{selectedStockItem.onHand + deltaQty} unit</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Berita Acara / Referensi Audit</label>
                <input
                  type="text"
                  required
                  value={documentRef}
                  onChange={(e) => setDocumentRef(e.target.value)}
                  placeholder="Contoh: BA-OPNAME-2026-09-01 atau RETUR-DMG-002"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan Penyesuaian (Wajib)</label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Contoh: Kerusakan fisik kemasan saat penataan rak (scrap disposal approved)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowAdjustModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">
                  Terapkan Koreksi &amp; Log Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
