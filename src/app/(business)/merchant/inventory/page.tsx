"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Warehouse,
  ArrowsDownUp,
  Warning,
  MagnifyingGlass,
  ClockCounterClockwise,
  ShoppingCart,
  ArrowRight,
  Plus,
  Buildings,
  MapPin,
  User,
  Phone,
  Clock,
  Package,
  PencilSimple,
  Power,
  ArrowDown,
  ArrowUp,
  Tag,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  merchantInventoryAdjustmentSchema,
  MerchantInventoryAdjustmentFormValues,
  merchantWarehouseSchema,
  MerchantWarehouseFormValues,
} from "@/lib/validation/schemas";
import { MerchantStockItem, MerchantWarehouse } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

export function MerchantInventoryContent() {
  const {
    warehouses,
    addWarehouse,
    updateWarehouse,
    toggleWarehouseStatus,
    stocks,
    stockMovements,
    adjustStock,
    products,
  } = useMerchantOperations();

  const [activeTab, setActiveTab] = useUrlQueryState<string>("tab", "matrix");
  const [selectedWarehouseId, setSelectedWarehouseId] = useUrlQueryState<string>("wh", "ALL");
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<MerchantWarehouse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for stock adjustment
  const {
    register: registerAdjust,
    handleSubmit: handleSubmitAdjust,
    setValue: setValueAdjust,
    reset: resetAdjust,
    formState: { errors: errorsAdjust, isSubmitting: isSubmittingAdjust },
  } = useForm<MerchantInventoryAdjustmentFormValues>({
    resolver: zodResolver(merchantInventoryAdjustmentSchema),
    defaultValues: {
      productId: "",
      warehouseId: "wh-01",
      adjustmentType: "RESTOCK",
      quantity: 10,
      reason: "Penerimaan Pasokan Baru dari Supplier",
    },
  });

  // Form for warehouse management
  const {
    register: registerWh,
    handleSubmit: handleSubmitWh,
    setValue: setValueWh,
    reset: resetWh,
    formState: { errors: errorsWh, isSubmitting: isSubmittingWh },
  } = useForm<MerchantWarehouseFormValues>({
    resolver: zodResolver(merchantWarehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "Jakarta Selatan",
      picName: "",
      picPhone: "",
      operatingHours: "Senin - Sabtu, 08:00 - 17:00 WIB",
      isMain: false,
      notes: "",
    },
  });

  const openAdjustModalWithItem = (item?: MerchantStockItem) => {
    if (item) {
      setValueAdjust("productId", item.productId);
      setValueAdjust("warehouseId", item.warehouseId);
      setValueAdjust("adjustmentType", "RESTOCK");
      setValueAdjust("quantity", 10);
      setValueAdjust("reason", `Restock unit ${item.title}`);
    } else {
      resetAdjust();
    }
    setIsAdjustModalOpen(true);
  };

  const onSubmitAdjustment = (values: MerchantInventoryAdjustmentFormValues) => {
    adjustStock(
      values.productId,
      values.warehouseId,
      values.quantity,
      values.adjustmentType,
      values.reason
    );
    setIsAdjustModalOpen(false);
    resetAdjust();
    setToastMessage("Penyesuaian stok multi-gudang berhasil dicatat ke buku besar!");
  };

  const openCreateWarehouseModal = () => {
    setEditingWarehouse(null);
    resetWh({
      name: "",
      code: `JKT-GUD-${String(warehouses.length + 1).padStart(2, "0")}`,
      address: "",
      city: "Jakarta Selatan",
      picName: "",
      picPhone: "",
      operatingHours: "Senin - Sabtu, 08:00 - 17:00 WIB",
      isMain: false,
      notes: "",
    });
    setIsWarehouseModalOpen(true);
  };

  const openEditWarehouseModal = (wh: MerchantWarehouse) => {
    setEditingWarehouse(wh);
    setValueWh("name", wh.name);
    setValueWh("code", wh.code);
    setValueWh("address", wh.address);
    setValueWh("city", wh.city);
    setValueWh("picName", wh.picName || "");
    setValueWh("picPhone", wh.picPhone || "");
    setValueWh("operatingHours", wh.operatingHours || "Senin - Sabtu, 08:00 - 17:00 WIB");
    setValueWh("isMain", wh.isMain);
    setValueWh("notes", wh.notes || "");
    setIsWarehouseModalOpen(true);
  };

  const onSubmitWarehouse = (values: MerchantWarehouseFormValues) => {
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, {
        name: values.name,
        code: values.code,
        address: values.address,
        city: values.city,
        picName: values.picName,
        picPhone: values.picPhone,
        operatingHours: values.operatingHours,
        isMain: values.isMain,
        notes: values.notes,
      });
      setToastMessage(`Data fasilitas gudang ${values.name} berhasil diperbarui!`);
    } else {
      addWarehouse({
        name: values.name,
        code: values.code,
        address: values.address,
        city: values.city,
        picName: values.picName,
        picPhone: values.picPhone,
        operatingHours: values.operatingHours,
        isMain: values.isMain,
        notes: values.notes,
      });
      setToastMessage(`Gudang baru ${values.name} (${values.code}) berhasil ditambahkan!`);
    }
    setIsWarehouseModalOpen(false);
    resetWh();
  };

  const handleToggleWarehouseStatus = (id: string, name: string) => {
    toggleWarehouseStatus(id);
    setToastMessage(`Status operasional gudang ${name} berhasil diubah.`);
  };

  // Filtered stock list
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const matchWarehouse =
        selectedWarehouseId === "ALL" || item.warehouseId === selectedWarehouseId;

      const matchSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLowStock = !filterLowStockOnly || item.available <= item.minStockAlert;

      return matchWarehouse && matchSearch && matchLowStock;
    });
  }, [stocks, selectedWarehouseId, searchQuery, filterLowStockOnly]);

  // Aggregate totals
  const totalOnHand = filteredStocks.reduce((sum, s) => sum + s.onHand, 0);
  const totalReserved = filteredStocks.reduce((sum, s) => sum + s.reserved, 0);
  const totalAllocated = filteredStocks.reduce((sum, s) => sum + s.allocated, 0);
  const totalUnavailable = filteredStocks.reduce((sum, s) => sum + s.unavailable, 0);
  const totalAvailable = filteredStocks.reduce((sum, s) => sum + s.available, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Warehouse size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Stok Gudang & Manajemen Fasilitas Multi-Lokasi
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kepatuhan 12C: Pemisahan tegas fisik di tangan (on-hand), reservasi, alokasi packing, rusak, dan siap jual (available)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/business/merchant/procurement">
                <Button variant="outline" size="md" className="flex items-center gap-2 text-xs">
                  <ShoppingCart size={16} weight="bold" />
                  <span>Pengadaan B2B (Inbound)</span>
                </Button>
              </Link>
              <Button
                variant="primary"
                size="md"
                onClick={() => openAdjustModalWithItem()}
                className="flex items-center gap-2 text-xs"
              >
                <ArrowsDownUp size={16} weight="bold" />
                <span>Sesuaikan / Transfer Stok</span>
              </Button>
            </div>
          </div>

          {/* Operational Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "matrix" || !activeTab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Package size={16} />
              <span>Matriks Stok (5-Bucket)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {stocks.length} Varian
              </span>
            </button>

            <button
              onClick={() => setActiveTab("warehouses")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "warehouses"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Buildings size={16} />
              <span>Master Fasilitas Gudang</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {warehouses.length} Lokasi
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "ledger"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClockCounterClockwise size={16} />
              <span>Buku Besar Mutasi Stok (Ledger)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {stockMovements.length} Log
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: MATRIKS STOK 5-BUCKET */}
        {/* ========================================================================= */}
        {(activeTab === "matrix" || !activeTab) && (
          <>
            {/* Warehouse Filter Cards & Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-medium text-slate-500 block">Fisik di Gudang (On-Hand)</span>
                <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{totalOnHand}</div>
                <span className="text-[10px] text-slate-400">Total unit tersimpan</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-medium text-amber-600 block">Reservasi Checkout</span>
                <div className="text-2xl font-bold text-amber-600 font-mono mt-1">{totalReserved}</div>
                <span className="text-[10px] text-slate-400">Keranjang / Belum bayar</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-medium text-blue-600 block">Alokasi Packing</span>
                <div className="text-2xl font-bold text-blue-600 font-mono mt-1">{totalAllocated}</div>
                <span className="text-[10px] text-slate-400">Sedang dipersiapkan</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-medium text-rose-600 block">Karantina / Rusak</span>
                <div className="text-2xl font-bold text-rose-600 font-mono mt-1">{totalUnavailable}</div>
                <span className="text-[10px] text-slate-400">Tidak layak jual</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-300 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
                <span className="text-[11px] font-bold text-emerald-700 block">Siap Dijual (Available)</span>
                <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">{totalAvailable}</div>
                <span className="text-[10px] text-emerald-600 font-medium">Bebas komitmen</span>
              </div>
            </div>

            {/* Low Stock Replenishment Alert Banner */}
            {stocks.some((s) => s.available <= s.minStockAlert) && (
              <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white">
                    <Warning size={20} weight="fill" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950">
                      Peringatan Stok Rendah: Beberapa suku cadang berada di bawah batas safety stock toko.
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Lakukan restock terarah melalui katalog supplier B2B terverifikasi agar pasokan tetap aman.
                    </div>
                  </div>
                </div>
                <Link href="/business/merchant/procurement?tab=sourcing">
                  <Button variant="primary" size="sm" className="whitespace-nowrap flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    <span>Sourcing & Restock B2B</span>
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari kode atau nama komponen suku cadang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Warehouse size={16} />
                  <span>Lokasi:</span>
                </div>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value="ALL">Semua Gudang ({warehouses.length} Fasilitas)</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.city})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    filterLowStockOnly
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Warning size={14} weight="bold" />
                  <span>Hanya Stok Menipis</span>
                </button>
              </div>
            </div>

            {/* Stock Matrix Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Matriks Ketersediaan Stok Fisik (Inventory Matrix)
                </h2>
                <div className="text-[11px] text-slate-400 font-mono">
                  Rumus: Available = On-Hand - Reserved - Allocated - Unavailable
                </div>
              </div>

              {filteredStocks.length === 0 ? (
                <EmptyState
                  title="Tidak ada data stok sesuai filter"
                  description="Coba ubah pilihan gudang atau kata kunci pencarian."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Komponen / Varian</th>
                        <th className="py-3 px-4">Lokasi Gudang</th>
                        <th className="py-3 px-3 text-center">Fisik (On-Hand)</th>
                        <th className="py-3 px-3 text-center">Reservasi</th>
                        <th className="py-3 px-3 text-center">Alokasi</th>
                        <th className="py-3 px-3 text-center">Rusak</th>
                        <th className="py-3 px-4 text-center">Siap Jual</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredStocks.map((item, idx) => {
                        const isCritical = item.available <= item.minStockAlert;
                        return (
                          <tr
                            key={`${item.productId}-${item.warehouseId}-${idx}`}
                            className="hover:bg-slate-50/60 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                                {item.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.sku}
                                </span>
                                <span className="text-[10px] text-slate-400">{item.category}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                              <div>{item.warehouseName}</div>
                              <div className="text-[10px] text-slate-400">Update: {item.lastRestocked}</div>
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                              {item.onHand} {item.unit}
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono text-amber-600 whitespace-nowrap">
                              {item.reserved}
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono text-blue-600 whitespace-nowrap">
                              {item.allocated}
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono text-rose-600 whitespace-nowrap">
                              {item.unavailable}
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`font-mono font-bold px-3 py-1 rounded-full text-xs inline-flex items-center gap-1 ${
                                  item.available === 0
                                    ? "bg-rose-100 text-rose-700"
                                    : isCritical
                                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isCritical && <Warning size={12} weight="bold" />}
                                {item.available} {item.unit}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                              {isCritical && (
                                <Link href={`/business/merchant/procurement?tab=sourcing&sku=${encodeURIComponent(item.sku)}&wh=${item.warehouseId}`}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                  >
                                    Restock B2B
                                  </Button>
                                </Link>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAdjustModalWithItem(item)}
                                className="text-xs"
                              >
                                Sesuaikan
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MASTER FASILITAS GUDANG (ROOT-03 MERCHANT CONCERN 1) */}
        {/* ========================================================================= */}
        {activeTab === "warehouses" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  Daftar Fasilitas & Lokasi Gudang Penyimpanan Fisik
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kelola identitas resmi fasilitas gudang, PIC penanggung jawab, dan jam operasional untuk penerimaan inbound B2B.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={openCreateWarehouseModal}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap"
              >
                <Plus size={16} weight="bold" />
                <span>Tambah Gudang Baru</span>
              </Button>
            </div>

            {/* Warehouse Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warehouses.map((w) => {
                const isActive = w.operatingStatus !== "INACTIVE";
                return (
                  <div
                    key={w.id}
                    className={`bg-white rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
                      w.isMain
                        ? "border-primary/40 bg-gradient-to-br from-blue-50/20 to-white ring-1 ring-primary/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-blue-50 rounded-lg">
                              {w.code}
                            </span>
                            {w.isMain && (
                              <Badge variant="primary" size="sm">
                                Hub Utama
                              </Badge>
                            )}
                            <Badge
                              variant={isActive ? "success" : "neutral"}
                              size="sm"
                            >
                              {isActive ? "Aktif Beroperasi" : "Non-Aktif"}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-slate-900 mt-2 text-sm">{w.name}</h3>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {w.address}, {w.city}
                          </span>
                        </div>
                        {w.picName && (
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400 shrink-0" />
                            <span>PIC: {w.picName}</span>
                          </div>
                        )}
                        {w.picPhone && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-slate-400 shrink-0" />
                            <span className="font-mono">{w.picPhone}</span>
                          </div>
                        )}
                        {w.operatingHours && (
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400 shrink-0" />
                            <span>{w.operatingHours}</span>
                          </div>
                        )}
                        {w.notes && (
                          <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 italic mt-2">
                            &ldquo;{w.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWarehouseId(w.id);
                          setActiveTab("matrix");
                        }}
                        className="text-xs"
                      >
                        Lihat Stok ({w.totalSkus} Varian)
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditWarehouseModal(w)}
                          className="p-2"
                          title="Edit Gudang"
                        >
                          <PencilSimple size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWarehouseStatus(w.id, w.name)}
                          className={`p-2 ${
                            isActive
                              ? "text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={isActive ? "Non-aktifkan Gudang" : "Aktifkan Gudang"}
                        >
                          <Power size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BUKU BESAR MUTASI STOK (ROOT-01 & ROOT-05 TRACEABILITY) */}
        {/* ========================================================================= */}
        {activeTab === "ledger" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                  <ClockCounterClockwise size={18} className="text-primary" />
                  <span>Buku Besar Mutasi Stok & Jejak Penelusuran Fisik (Audit Trail)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seluruh perubahan saldo stok tercatat secara append-only dengan nomor Purchase Order, Berita Acara Penerimaan (Receiving), dan operator terkait.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Total Mutasi: {stockMovements.length} Record
              </span>
            </div>

            {stockMovements.length === 0 ? (
              <EmptyState
                title="Belum ada riwayat mutasi stok"
                description="Semua mutasi stok fisik akan tercatat secara permanen di buku besar ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Tipe & Waktu</th>
                      <th className="py-3 px-4">Komponen & Varian</th>
                      <th className="py-3 px-4">Gudang</th>
                      <th className="py-3 px-4 text-center">Fisik Inbound/Outbound</th>
                      <th className="py-3 px-4 text-center">Perubahan Available</th>
                      <th className="py-3 px-4">Penelusuran B2B / Alasan</th>
                      <th className="py-3 px-4">Petugas Gudang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockMovements.map((mov) => {
                      const isInbound = mov.type === "INBOUND";
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`p-1 rounded-md text-white ${
                                  isInbound ? "bg-emerald-600" : "bg-blue-600"
                                }`}
                              >
                                {isInbound ? (
                                  <ArrowDown size={12} weight="bold" />
                                ) : (
                                  <ArrowUp size={12} weight="bold" />
                                )}
                              </span>
                              <Badge
                                variant={
                                  isInbound
                                    ? "success"
                                    : mov.type === "OUTBOUND"
                                    ? "primary"
                                    : "warning"
                                }
                                size="sm"
                              >
                                {mov.type}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-mono">
                              {mov.timestamp}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{mov.productTitle}</div>
                            <div className="font-mono text-[10px] text-slate-400">{mov.sku}</div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{mov.warehouseName}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {mov.warehouseId}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs ${
                                isInbound
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {isInbound ? "+" : "-"}
                              {mov.quantity} unit
                            </span>
                            {mov.acceptedQuantity !== undefined && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                ({mov.acceptedQuantity} Baik, {mov.damagedQuantity} Rusak)
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                            <span className="text-slate-500">{mov.previousAvailable}</span>
                            <span className="text-slate-400 mx-1">&rarr;</span>
                            <span className="font-bold text-emerald-700">
                              {mov.newAvailable}
                            </span>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            {mov.purchaseOrderId && (
                              <div className="mb-1">
                                <Link
                                  href={`/business/merchant/procurement?tab=orders&po=${encodeURIComponent(
                                    mov.purchaseOrderId
                                  )}`}
                                  className="inline-flex items-center gap-1 font-mono font-bold text-xs text-primary hover:underline bg-blue-50 px-2 py-0.5 rounded"
                                >
                                  <Tag size={12} />
                                  <span>{mov.purchaseOrderId}</span>
                                </Link>
                              </div>
                            )}
                            <div className="text-slate-700 line-clamp-2">{mov.reason}</div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            <div className="font-medium">{mov.performedBy}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Penyesuaian & Transfer Stok Multi-Gudang"
      >
        <form onSubmit={handleSubmitAdjust(onSubmitAdjustment)} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">Pilih Produk / Varian *</label>
            <select
              {...registerAdjust("productId")}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.title}
                </option>
              ))}
            </select>
            {errorsAdjust.productId && (
              <p className="text-rose-600 text-[11px] mt-1">{errorsAdjust.productId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Lokasi Gudang *</label>
              <select
                {...registerAdjust("warehouseId")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Tipe Mutasi *</label>
              <select
                {...registerAdjust("adjustmentType")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
              >
                <option value="RESTOCK">Penerimaan Pasokan (Restock)</option>
                <option value="DAMAGE">Karantina / Rusak (Damage)</option>
                <option value="AUDIT_CORRECTION">Koreksi Opname Fisik</option>
                <option value="TRANSFER">Transfer Antar Gudang</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Kuantitas Unit yang Disesuaikan *
            </label>
            <input
              type="number"
              min={1}
              {...registerAdjust("quantity", { valueAsNumber: true })}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
            />
            {errorsAdjust.quantity && (
              <p className="text-rose-600 text-[11px] mt-1">{errorsAdjust.quantity.message}</p>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Alasan Penyesuaian / Catatan Audit *
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Penerimaan surat jalan distributor no SJ-881 atau hasil stock opname berkala"
              {...registerAdjust("reason")}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errorsAdjust.reason && (
              <p className="text-rose-600 text-[11px] mt-1">{errorsAdjust.reason.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdjustModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingAdjust}
            >
              {isSubmittingAdjust ? "Memproses..." : "Terapkan Mutasi"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Warehouse Modal */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title={editingWarehouse ? "Edit Fasilitas Gudang" : "Tambah Fasilitas Gudang Baru"}
      >
        <form onSubmit={handleSubmitWh(onSubmitWarehouse)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Nama Fasilitas Gudang *</label>
              <input
                type="text"
                placeholder="Contoh: Gudang Hub Tebet"
                {...registerWh("name")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errorsWh.name && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.name.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Kode Gudang *</label>
              <input
                type="text"
                placeholder="Contoh: JKT-TBT-01"
                {...registerWh("code")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
              {errorsWh.code && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Kota Wilayah *</label>
              <input
                type="text"
                placeholder="Contoh: Jakarta Selatan"
                {...registerWh("city")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errorsWh.city && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.city.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Jam Operasional *</label>
              <input
                type="text"
                placeholder="Contoh: Senin - Sabtu, 08:00 - 17:00"
                {...registerWh("operatingHours")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errorsWh.operatingHours && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.operatingHours.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Alamat Lengkap Gudang *</label>
            <textarea
              rows={2}
              placeholder="Contoh: Jl. Tebet Barat Dalam X No. 5, Jakarta Selatan"
              {...registerWh("address")}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {errorsWh.address && (
              <p className="text-rose-600 text-[11px] mt-1">{errorsWh.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Nama PIC Gudang *</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso (Kepala Gudang)"
                {...registerWh("picName")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errorsWh.picName && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.picName.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Nomor Telepon PIC *</label>
              <input
                type="text"
                placeholder="Contoh: 0812-3344-5566"
                {...registerWh("picPhone")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
              {errorsWh.picPhone && (
                <p className="text-rose-600 text-[11px] mt-1">{errorsWh.picPhone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Akses kontainer 20ft via pintu timur"
              {...registerWh("notes")}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isMainWhCheckbox"
              {...registerWh("isMain")}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="isMainWhCheckbox" className="text-xs font-semibold text-slate-800">
              Jadikan sebagai Hub Utama (Primary Warehouse)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWarehouseModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingWh}
            >
              {isSubmittingWh ? "Menyimpan..." : editingWarehouse ? "Simpan Perubahan" : "Tambah Gudang"}
            </Button>
          </div>
        </form>
      </Modal>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function MerchantInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Stok Gudang...</div>}>
      <MerchantInventoryContent />
    </Suspense>
  );
}
