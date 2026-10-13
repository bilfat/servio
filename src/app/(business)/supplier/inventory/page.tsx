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
  Funnel,
  Package,
  ShoppingCart,
  CheckCircle,
  Info,
  Plus,
  Buildings,
  MapPin,
  User,
  Phone,
  Clock,
  PencilSimple,
  Power,
  Check,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  supplierWarehouseSchema,
  SupplierWarehouseFormValues,
} from "@/lib/validation/schemas";
import { SupplierProduct, SupplierWarehouse } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

interface LocationHierarchy {
  warehouseId: string;
  warehouse: string;
  zone: string;
  zoneCode: string;
  rackBin: string;
}

export function SupplierInventoryContent() {
  const {
    products,
    orders,
    b2bPurchaseOrders,
    adjustSupplierStock,
    warehouses,
    zones,
    addWarehouse,
    updateWarehouse,
    toggleWarehouseStatus,
  } = useSupplierOperations();

  const [activeTab, setActiveTab] = useUrlQueryState<string>("tab", "matrix");
  const [selectedWarehouseId, setSelectedWarehouseId] = useUrlQueryState<string>("wh", "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<"ALL" | "HEALTHY" | "REORDER" | "CRITICAL">("ALL");

  // Inbound Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SupplierProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState("Penerimaan Kontainer Pasokan Baru");
  const [selectedTargetRack, setSelectedTargetRack] = useState("Rak A-01 (Bin 1-4)");

  // Warehouse Management Modal
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<SupplierWarehouse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for Supplier Warehouse
  const {
    register: registerWh,
    handleSubmit: handleSubmitWh,
    setValue: setValueWh,
    reset: resetWh,
    formState: { errors: errorsWh, isSubmitting: isSubmittingWh },
  } = useForm<SupplierWarehouseFormValues>({
    resolver: zodResolver(supplierWarehouseSchema),
    defaultValues: {
      code: "",
      name: "",
      address: "",
      city: "Cikarang",
      capacityM2: 1500,
      picName: "",
      picPhone: "",
      operatingHours: "Senin - Jumat 08:00 - 17:00, Sabtu 08:00 - 14:00 WIB",
      isMain: false,
      notes: "",
    },
  });

  const openCreateWarehouseModal = () => {
    setEditingWarehouse(null);
    const nextIndex = warehouses.length + 1;
    resetWh({
      code: `WH-SUP-${String(nextIndex).padStart(2, "0")}`,
      name: "",
      address: "",
      city: "Bekasi",
      capacityM2: 1200,
      picName: "",
      picPhone: "",
      operatingHours: "Senin - Jumat 08:00 - 17:00, Sabtu 08:00 - 14:00 WIB",
      isMain: false,
      notes: "",
    });
    setIsWarehouseModalOpen(true);
  };

  const openEditWarehouseModal = (wh: SupplierWarehouse) => {
    setEditingWarehouse(wh);
    setValueWh("code", wh.code);
    setValueWh("name", wh.name);
    setValueWh("address", wh.address);
    setValueWh("city", wh.city);
    setValueWh("capacityM2", wh.capacityM2 || 1500);
    setValueWh("picName", wh.picName || "");
    setValueWh("picPhone", wh.picPhone || "");
    setValueWh("operatingHours", wh.operatingHours || "Senin - Jumat 08:00 - 17:00 WIB");
    setValueWh("isMain", wh.isMain);
    setValueWh("notes", wh.notes || "");
    setIsWarehouseModalOpen(true);
  };

  const onSubmitWarehouse = (values: SupplierWarehouseFormValues) => {
    if (editingWarehouse) {
      updateWarehouse(editingWarehouse.id, {
        code: values.code,
        name: values.name,
        address: values.address,
        city: values.city,
        capacityM2: values.capacityM2,
        picName: values.picName,
        picPhone: values.picPhone,
        operatingHours: values.operatingHours,
        isMain: values.isMain,
        notes: values.notes,
      });
      setToastMessage(`Fasilitas gudang ${values.name} (${values.code}) berhasil diperbarui!`);
    } else {
      addWarehouse({
        code: values.code,
        name: values.name,
        address: values.address,
        city: values.city,
        capacityM2: values.capacityM2,
        picName: values.picName,
        picPhone: values.picPhone,
        operatingHours: values.operatingHours,
        operatingStatus: "ACTIVE",
        isMain: values.isMain,
        notes: values.notes,
      });
      setToastMessage(`Gudang supplier baru ${values.name} (${values.code}) berhasil ditambahkan!`);
    }
    setIsWarehouseModalOpen(false);
    resetWh();
  };

  const handleToggleWarehouseStatus = (id: string, name: string) => {
    toggleWarehouseStatus(id);
    setToastMessage(`Status operasional gudang ${name} berhasil diubah.`);
  };

  // Deterministic Zone & Rack assignment per product index
  const locationAssignments: LocationHierarchy[] = [
    {
      warehouseId: "wh-sup-01",
      warehouse: "Gudang Logistik Pusat Cikarang (WH-SUP-01)",
      zone: "Zona A (Racking Elektrikal & PCB Komponen)",
      zoneCode: "Zona A",
      rackBin: "Rak A-01 (Bin 1-4)",
    },
    {
      warehouseId: "wh-sup-01",
      warehouse: "Gudang Logistik Pusat Cikarang (WH-SUP-01)",
      zone: "Zona B (Heavy-Duty Cantilever Pipa Tembaga)",
      zoneCode: "Zona B",
      rackBin: "Rak B-02 (Cantilever Palet 3)",
    },
    {
      warehouseId: "wh-sup-01",
      warehouse: "Gudang Logistik Pusat Cikarang (WH-SUP-01)",
      zone: "Zona C (Bunker Bertekanan Gas Freon Refrigerant)",
      zoneCode: "Zona C",
      rackBin: "Bunker C-01 (Silinder Safe-Lock)",
    },
    {
      warehouseId: "wh-sup-01",
      warehouse: "Gudang Logistik Pusat Cikarang (WH-SUP-01)",
      zone: "Zona D (Heavy Machinery Peti Kompresor)",
      zoneCode: "Zona D",
      rackBin: "Rak D-01 (Palet Kayu Lantai 1)",
    },
    {
      warehouseId: "wh-sup-02",
      warehouse: "Gudang Distribusi Penyangga Bekasi (WH-SUP-02)",
      zone: "Zona A (Racking Elektrikal & PCB Komponen)",
      zoneCode: "Zona A",
      rackBin: "Rak A-03 (Bin 9-12)",
    },
  ];

  // Authoritative 5-bucket calculation:
  // available = max(0, onHand - reserved - allocated - unavailable)
  const inventoryItems = useMemo(() => {
    return products.map((prod, idx) => {
      // Reserved: PO in ACCEPTED status (committed to supply, awaiting picking)
      const b2bReserved = b2bPurchaseOrders
        .filter((po) => po.status === "ACCEPTED")
        .reduce((sum, po) => {
          const item = po.items.find((it) => it.sku === prod.sku);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const legacyReserved = orders
        .filter((o) => o.status === "CONFIRMED")
        .reduce((sum, o) => {
          const item = o.items.find((it) => it.sku === prod.sku);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const reserved = b2bReserved + legacyReserved;

      // Allocated: PO in PROCESSING / PREPARING / PACKED status (currently being picked / staged)
      const b2bAllocated = b2bPurchaseOrders
        .filter((po) => po.status === "PROCESSING")
        .reduce((sum, po) => {
          const item = po.items.find((it) => it.sku === prod.sku);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const legacyAllocated = orders
        .filter((o) => ["PREPARING", "PACKED"].includes(o.status))
        .reduce((sum, o) => {
          const item = o.items.find((it) => it.sku === prod.sku);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const allocated = b2bAllocated + legacyAllocated;

      // Unavailable: Quarantine / QC holding (e.g. 5% on sensitive items or 0)
      const unavailable = idx === 2 ? 5 : 0;

      const onHand = prod.stock;
      const available = Math.max(0, onHand - reserved - allocated - unavailable);

      const loc = locationAssignments[idx % locationAssignments.length];
      const reorderPoint = Math.max(15, prod.moq * 2);

      return {
        ...prod,
        warehouseId: loc.warehouseId,
        warehouse: loc.warehouse,
        zone: loc.zone,
        zoneCode: loc.zoneCode,
        rackBin: loc.rackBin,
        onHand,
        reserved,
        allocated,
        unavailable,
        available,
        reorderPoint,
        isBelowReorder: available <= reorderPoint,
      };
    });
  }, [products, orders, b2bPurchaseOrders]);

  // Filtered items based on warehouse, search, zone, and stock status
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesWarehouse =
        selectedWarehouseId === "ALL" || item.warehouseId === selectedWarehouseId;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rackBin.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = selectedZone === "ALL" || item.zoneCode === selectedZone;

      let matchesStatus = true;
      if (stockStatusFilter === "HEALTHY") {
        matchesStatus = item.available > item.reorderPoint;
      } else if (stockStatusFilter === "REORDER") {
        matchesStatus = item.available <= item.reorderPoint && item.available > 0;
      } else if (stockStatusFilter === "CRITICAL") {
        matchesStatus = item.available === 0;
      }

      return matchesWarehouse && matchesSearch && matchesZone && matchesStatus;
    });
  }, [inventoryItems, selectedWarehouseId, searchQuery, selectedZone, stockStatusFilter]);

  // Aggregate 5-bucket totals across filtered supplier inventory
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => ({
        onHand: acc.onHand + item.onHand,
        reserved: acc.reserved + item.reserved,
        allocated: acc.allocated + item.allocated,
        unavailable: acc.unavailable + item.unavailable,
        available: acc.available + item.available,
      }),
      { onHand: 0, reserved: 0, allocated: 0, unavailable: 0, available: 0 }
    );
  }, [filteredItems]);

  const handleOpenAdjust = (prod: SupplierProduct) => {
    const matched = inventoryItems.find((it) => it.id === prod.id);
    setAdjustTarget(prod);
    setAdjustQty(25);
    setAdjustReason("Penerimaan Kontainer Impor Pabrik");
    setSelectedTargetRack(matched ? matched.rackBin : "Rak A-01 (Bin 1-4)");
    setIsAdjustModalOpen(true);
  };

  const handleApplyAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    adjustSupplierStock(adjustTarget.id, adjustQty);
    const targetTitle = adjustTarget.title;
    const targetUnit = adjustTarget.unit;
    const rackUsed = selectedTargetRack;
    setAdjustTarget(null);
    setIsAdjustModalOpen(false);
    setToastMessage(
      `Stok fisik ${targetTitle} berhasil disesuaikan (+${adjustQty} ${targetUnit}) di lokasi ${rackUsed}!`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <Warehouse size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Inventaris B2B &amp; Manajemen Gudang Suplai
                </h1>
                <Badge variant="primary" size="sm" className="hidden sm:inline-flex shrink-0">
                  {warehouses.length} Fasilitas Gudang
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fasilitas penyimpanan logistik grosir dengan hierarki Gudang &rarr; Zona &rarr; Rak/Bin &amp; Formula Otoritatif 5-Bucket
              </p>
            </div>

            {/* Contextual Action Buttons - strictly side-by-side */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={activeTab === "warehouses" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("warehouses")}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
              >
                <Buildings size={16} weight="bold" />
                <span>Kelola Gudang</span>
              </Button>
              <Link href="/business/supplier/orders" className="shrink-0">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-slate-700 whitespace-nowrap">
                  <ShoppingCart size={14} weight="bold" />
                  <span>Antrean PO B2B</span>
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (products[0]) handleOpenAdjust(products[0]);
                }}
                className="flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
              >
                <ArrowsDownUp size={16} weight="bold" />
                <span>Input Inbound Kontainer</span>
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
              <span>Matriks Inventaris &amp; Lokasi (5-Bucket)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {products.length} Komoditas
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
              <span>Master Fasilitas Gudang Suplai</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
                {warehouses.length} Lokasi
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: MATRIKS INVENTARIS 5-BUCKET & LOKASI */}
        {/* ========================================================================= */}
        {(activeTab === "matrix" || !activeTab) && (
          <>
            {/* Conceptual Distinction Banner: Product vs Supplier Offer vs Physical Inventory */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                  Arsitektur Domain Suplai
                </span>
                <span className="text-xs text-slate-300">
                  Pemisahan Otoritatif 3 Konsep Entitas B2B
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 font-bold text-blue-200 mb-1">
                    <Package size={16} weight="bold" />
                    <span>1. Definisi Produk</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Identitas komoditas: Kode produk pabrik, spesifikasi teknis, merek, kompatibilitas suku cadang, dan standarisasi SNI/ISO.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-blue-300">Contoh: Kapasitor AC 450V 35uF</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 font-bold text-amber-200 mb-1">
                    <ShoppingCart size={16} weight="bold" />
                    <span>2. Penawaran Suplai (Offer)</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Komersial B2B: Minimum Order (MOQ), harga satuan grosir, tier diskon volume, lead time kargo, dan term pembayaran (TOP).
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-amber-300">Contoh: MOQ 20 pcs &bull; Rp 38.000/pc</div>
                </div>

                <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                  <div className="flex items-center gap-2 font-bold text-emerald-200 mb-1">
                    <Warehouse size={16} weight="bold" />
                    <span>3. Fisik Inventori Gudang</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Unit fisik aktual di gudang: Zona &amp; Rak/Bin penempatan, kuantitas on-hand, alokasi reserved/allocated, dan free stock.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-emerald-300">Contoh: Zona A, Rak A-01 &bull; 650 pcs Available</div>
                </div>
              </div>
            </div>

            {/* Authoritative 5-Bucket Inventory Overview Cards (Positive Counts) */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ringkasan 5-Bucket Inventaris Gudang B2B
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Formula: Available = max(0, On-Hand &minus; Reserved &minus; Allocated &minus; Unavailable)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. On-Hand */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Fisik (On-Hand)</span>
                    <Warehouse size={16} />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    {totals.onHand.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-500">unit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Total fisik tersimpan di gudang</p>
                </div>

                {/* 2. Reserved (Positive Count) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-amber-600 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Reservasi PO</span>
                    <ShoppingCart size={16} />
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-600">
                    {totals.reserved.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-amber-600">unit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">PO diterima, menunggu picking</p>
                </div>

                {/* 3. Allocated (Positive Count) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-blue-600 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Alokasi Staging</span>
                    <Package size={16} />
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-600">
                    {totals.allocated.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-blue-600">unit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Tahap pick &amp; palletizing aktif</p>
                </div>

                {/* 4. Unavailable (Positive Count) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between text-rose-600 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Karantina QC</span>
                    <Warning size={16} />
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-600">
                    {totals.unavailable.toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-rose-600">unit</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Rusak / dalam inspeksi QC</p>
                </div>

                {/* 5. Available */}
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Bebas Jual (Available)</span>
                    <CheckCircle size={16} weight="bold" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-800">
                    {totals.available.toLocaleString("id-ID")} <span className="text-xs font-normal text-emerald-700">unit</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1">Dapat ditawarkan ke Merchant</p>
                </div>
              </div>
            </div>

            {/* Operational Lifecycle Pipeline Notice */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-900">
                    Invarian Siklus Operasional B2B: Pemisahan Mutasi Fisik vs Hak Kepemilikan
                  </div>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    &bull; <strong>PO Diterima &ne; Stok Terkirim</strong>: PO status ACCEPTED mencadangkan kuota (Reserved), belum mengurangi on-hand.
                    <br />
                    &bull; <strong>Pengiriman Supplier &ne; Stok Toko Merchant Bertambah</strong>: Saat status SHIPPED, on-hand Supplier berkurang. Stok Merchant <strong>HANYA</strong> bertambah setelah proses Inbound QC &amp; Rekonsiliasi di portal Merchant.
                  </p>
                </div>
              </div>

              <Link href="/business/supplier/fulfillment" className="shrink-0">
                <Button variant="outline" size="sm" className="text-xs text-amber-800 border-amber-300 hover:bg-amber-100/50">
                  <span>Ke Fulfillment Kargo &rarr;</span>
                </Button>
              </Link>
            </div>

            {/* Warehouse Storage Zones Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {zones.map((zone) => (
                <div key={zone.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {zone.name}
                    </span>
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                      {zone.zoneCode}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1">
                    {zone.description}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {zone.racks.map((r) => `${r.rackCode} (${r.binRange})`).join(", ")}
                  </div>
                </div>
              ))}
            </div>

            {/* Filter Bar with Warehouse Selector */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari kode pasokan grosir, nama barang komoditas, atau nomor rak/bin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Warehouse Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Buildings size={16} />
                  <span>Gudang:</span>
                </div>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">Semua Gudang Suplai ({warehouses.length})</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.code} - {wh.name} {wh.operatingStatus === "INACTIVE" ? "(Non-Aktif)" : ""}
                    </option>
                  ))}
                </select>

                {/* Zone Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Funnel size={16} />
                  <span>Zona:</span>
                </div>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">Semua Zona</option>
                  <option value="Zona A">Zona A (Elektrikal &amp; PCB)</option>
                  <option value="Zona B">Zona B (Pipa Tembaga)</option>
                  <option value="Zona C">Zona C (Freon Refrigerant)</option>
                  <option value="Zona D">Zona D (Kompresor)</option>
                </select>

                {/* Stock Status Selector */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Status:</span>
                </div>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value as "ALL" | "HEALTHY" | "REORDER" | "CRITICAL")}
                  className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="HEALTHY">Siap Pasok (Aman)</option>
                  <option value="REORDER">Mencapai Reorder Point</option>
                  <option value="CRITICAL">Stok Habis (0 Unit)</option>
                </select>
              </div>
            </div>

            {/* Location-Aware Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 font-heading">
                    Matriks Lokasi &amp; 5-Bucket Inventaris Gudang Suplai
                  </h2>
                  <p className="text-xs text-slate-500">
                    Data real-time terhubung langsung ke antrean PO Grosir &amp; alokasi picking kargo
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  Menampilkan {filteredItems.length} komoditas
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState
                  title="Tidak ada inventori sesuai filter"
                  description="Coba ubah kata kunci atau pilih fasilitas gudang/zona lainnya."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Komoditas &amp; Kode Pasokan</th>
                        <th className="py-3 px-4">Penawaran Grosir (Offer)</th>
                        <th className="py-3 px-4">Lokasi Fisik (Gudang &rarr; Zona &rarr; Rak)</th>
                        <th className="py-3 px-2 text-center">Fisik (On-Hand)</th>
                        <th className="py-3 px-2 text-center">Reserved</th>
                        <th className="py-3 px-2 text-center">Allocated</th>
                        <th className="py-3 px-2 text-center">Unavailable</th>
                        <th className="py-3 px-3 text-center">Bebas Jual (Available)</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item) => {
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/60 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                                {item.title}
                              </div>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                Kode: {item.sku}
                              </span>
                            </td>

                            {/* Supplier Offer Column */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">
                                Rp {(item.tiers?.[0]?.pricePerUnit || 38000).toLocaleString("id-ID")}{" "}
                                <span className="text-[10px] text-slate-400 font-normal">/{item.unit}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                MOQ: <span className="font-mono font-medium">{item.moq} {item.unit}</span>
                              </div>
                            </td>

                            {/* Location Hierarchy Column */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800 line-clamp-1">
                                {item.zone}
                              </div>
                              <div className="font-mono text-[10px] text-primary flex items-center gap-1 mt-0.5">
                                <span className="font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                                  {item.rackBin}
                                </span>
                                <span className="text-slate-400">
                                  &bull; {item.warehouse.split("(")[0]}
                                </span>
                              </div>
                            </td>

                            {/* 1. On-Hand */}
                            <td className="py-3.5 px-2 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                              {item.onHand} {item.unit}
                            </td>

                            {/* 2. Reserved (Positive Quantity) */}
                            <td className="py-3.5 px-2 text-center font-mono text-amber-600 whitespace-nowrap">
                              {item.reserved}
                            </td>

                            {/* 3. Allocated (Positive Quantity) */}
                            <td className="py-3.5 px-2 text-center font-mono text-blue-600 whitespace-nowrap">
                              {item.allocated}
                            </td>

                            {/* 4. Unavailable (Positive Quantity) */}
                            <td className="py-3.5 px-2 text-center font-mono text-rose-600 whitespace-nowrap">
                              {item.unavailable}
                            </td>

                            {/* 5. Available */}
                            <td className="py-3.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`font-mono font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                                  item.available <= 0
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : item.isBelowReorder
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.isBelowReorder && <Warning size={12} weight="bold" />}
                                {item.available} {item.unit}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Reorder: {item.reorderPoint}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAdjust(item)}
                                className="text-xs"
                              >
                                Inbound / Mutasi
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
        {/* TAB 2: MASTER FASILITAS GUDANG SUPLAI */}
        {/* ========================================================================= */}
        {activeTab === "warehouses" && (
          <div className="space-y-6">
            {/* Header & Add Warehouse Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Buildings size={20} className="text-primary" />
                  <span>Daftar Fasilitas Gudang &amp; Hub Distribusi Suplai</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Kelola master data fasilitas fisik supplier, penanggung jawab (PIC), jam operasional, dan kapasitas penyimpanan
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={openCreateWarehouseModal}
                className="flex items-center gap-2 text-xs self-start sm:self-auto"
              >
                <Plus size={16} weight="bold" />
                <span>Tambah Gudang Supplier</span>
              </Button>
            </div>

            {/* Warehouse Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {warehouses.map((wh) => {
                const whZones = zones.filter((z) => z.warehouseId === wh.id);
                return (
                  <div
                    key={wh.id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4 ${
                      wh.operatingStatus === "ACTIVE"
                        ? "border-slate-200/80 hover:border-slate-300"
                        : "border-slate-200 bg-slate-50/40 opacity-75"
                    }`}
                  >
                    {/* Card Top: Code, Name, Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {wh.code}
                          </span>
                          {wh.isMain && (
                            <Badge variant="primary" size="sm">
                              Gudang Utama
                            </Badge>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              wh.operatingStatus === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {wh.operatingStatus === "ACTIVE" ? "Aktif" : "Non-Aktif"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1.5">{wh.name}</h3>
                      </div>

                      {/* Area Capacity */}
                      {wh.capacityM2 && (
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-800 font-mono">
                            {wh.capacityM2.toLocaleString("id-ID")} m²
                          </div>
                          <div className="text-[10px] text-slate-400">Luas Fasilitas</div>
                        </div>
                      )}
                    </div>

                    {/* Address & City */}
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      <span>{wh.address}, {wh.city}</span>
                    </div>

                    {/* PIC & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span>PIC: <strong>{wh.picName || "Staff Logistik"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={15} className="text-slate-400 shrink-0" />
                        <span className="font-mono">{wh.picPhone || "0812-3456-7890"}</span>
                      </div>
                    </div>

                    {/* Operating Hours */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={15} className="text-slate-400 shrink-0" />
                      <span>{wh.operatingHours || "Senin - Sabtu, 08:00 - 17:00 WIB"}</span>
                    </div>

                    {/* Zones Summary */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Hierarki Zona &amp; Racking ({whZones.length || 2} Zona Terhubung):</span>
                        <span className="text-[10px] font-normal text-slate-400">Penyimpanan Terpetakan</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {whZones.length > 0 ? (
                          whZones.map((z) => (
                            <span
                              key={z.id}
                              className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700"
                            >
                              {z.name} ({z.racks.length} Rak)
                            </span>
                          ))
                        ) : (
                          <>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              Zona A (Racking Elektrikal)
                            </span>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                              Zona B (Pipa &amp; Roll)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditWarehouseModal(wh)}
                        className="flex items-center gap-1.5 text-xs text-slate-700"
                      >
                        <PencilSimple size={14} />
                        <span>Edit Gudang</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleWarehouseStatus(wh.id, wh.name)}
                        className={`flex items-center gap-1.5 text-xs ${
                          wh.operatingStatus === "ACTIVE"
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        <Power size={14} />
                        <span>{wh.operatingStatus === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Warehouse Modal (Add / Edit) */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title={editingWarehouse ? `Edit Fasilitas Gudang: ${editingWarehouse.name}` : "Tambah Fasilitas Gudang Supplier Baru"}
      >
        <form onSubmit={handleSubmitWh(onSubmitWarehouse)} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kode Fasilitas Gudang *
              </label>
              <input
                type="text"
                {...registerWh("code")}
                placeholder="Contoh: WH-SUP-03"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs uppercase"
              />
              {errorsWh.code && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.code.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kapasitas Area (m²) *
              </label>
              <input
                type="number"
                min={100}
                {...registerWh("capacityM2", { valueAsNumber: true })}
                placeholder="1500"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
              {errorsWh.capacityM2 && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.capacityM2.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Nama Fasilitas Gudang *
            </label>
            <input
              type="text"
              {...registerWh("name")}
              placeholder="Contoh: Gudang Hub Logistik Cikarang Timur"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
            {errorsWh.name && (
              <p className="text-rose-600 text-[10px] mt-1">{errorsWh.name.message}</p>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Alamat Lengkap Fasilitas *
            </label>
            <textarea
              rows={2}
              {...registerWh("address")}
              placeholder="Jalan, Blok, Kawasan Industri, RT/RW..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
            {errorsWh.address && (
              <p className="text-rose-600 text-[10px] mt-1">{errorsWh.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kota / Wilayah *
              </label>
              <input
                type="text"
                {...registerWh("city")}
                placeholder="Contoh: Cikarang / Bekasi"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
              {errorsWh.city && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.city.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Jam Operasional Logistik *
              </label>
              <input
                type="text"
                {...registerWh("operatingHours")}
                placeholder="Senin - Jumat 08:00 - 17:00 WIB"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
              {errorsWh.operatingHours && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.operatingHours.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Nama Penanggung Jawab (PIC) *
              </label>
              <input
                type="text"
                {...registerWh("picName")}
                placeholder="Contoh: Budi Santoso"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
              />
              {errorsWh.picName && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.picName.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                No. HP / WhatsApp PIC *
              </label>
              <input
                type="text"
                {...registerWh("picPhone")}
                placeholder="0812-xxxx-xxxx"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
              />
              {errorsWh.picPhone && (
                <p className="text-rose-600 text-[10px] mt-1">{errorsWh.picPhone.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Catatan Fasilitas / Spesifikasi Khusus (Opsional)
            </label>
            <input
              type="text"
              {...registerWh("notes")}
              placeholder="Contoh: Racking Heavy Duty, Forklift 3-ton lane, Akses Kontainer 40ft"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isMainSupplierWh"
              {...registerWh("isMain")}
              className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isMainSupplierWh" className="text-slate-700 font-medium">
              Jadikan sebagai Fasilitas Gudang Utama Supplier
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWarehouseModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingWh}>
              {editingWarehouse ? "Simpan Perubahan" : "Tambah Fasilitas Gudang"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Inbound / Adjustment Modal with Location Awareness */}
      {adjustTarget && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Penerimaan Inbound Kontainer: ${adjustTarget.title || adjustTarget.sku}`}
        >
          <form onSubmit={handleApplyAdjust} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-900">{adjustTarget.title}</h3>
              <div className="text-slate-500 font-mono mt-0.5">
                Stok Fisik Saat Ini: {adjustTarget.stock} {adjustTarget.unit} &bull; Fasilitas: Gudang Cikarang
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Lokasi Penempatan Rak / Bin Penyimpanan *
              </label>
              <select
                value={selectedTargetRack}
                onChange={(e) => setSelectedTargetRack(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-white"
              >
                <option value="Rak A-01 (Bin 1-4)">Zona A &rarr; Rak A-01 (Bin 1-4) [Elektrikal]</option>
                <option value="Rak A-02 (Bin 5-8)">Zona A &rarr; Rak A-02 (Bin 5-8) [Elektrikal]</option>
                <option value="Rak B-01 (Cantilever Palet 1)">Zona B &rarr; Rak B-01 (Cantilever 1) [Pipa]</option>
                <option value="Rak B-02 (Cantilever Palet 3)">Zona B &rarr; Rak B-02 (Cantilever 3) [Pipa]</option>
                <option value="Bunker C-01 (Silinder Safe-Lock)">Zona C &rarr; Bunker C-01 [Gas Freon Bertekanan]</option>
                <option value="Rak D-01 (Palet Kayu Lantai 1)">Zona D &rarr; Rak D-01 [Peti Kompresor Berat]</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kuantitas Pasokan Inbound Masuk ({adjustTarget.unit}) *
              </label>
              <input
                type="number"
                min={1}
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Nomor Surat Jalan Kontainer Pabrik / Alasan Mutasi *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                placeholder="Contoh: SJ-PABRIK-2026-X88 / Kontainer 40ft"
              />
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
              <Button type="submit" variant="primary" size="sm">
                Konfirmasi Inbound ke Gudang
              </Button>
            </div>
          </form>
        </Modal>
      )}

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

export default function SupplierInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Inventaris Gudang Besar...</div>}>
      <SupplierInventoryContent />
    </Suspense>
  );
}
