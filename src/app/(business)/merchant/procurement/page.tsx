"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingCart,
  Warehouse,
  Truck,
  CheckCircle,
  Clock,
  Warning,
  MagnifyingGlass,
  ArrowRight,
  ClipboardText,
  Storefront,
  ShieldCheck,
  Buildings,
  Receipt,
  FileText,
  Sparkle,
  XCircle,
  Package,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  createPurchaseOrderSchema,
  merchantReceivingSchema,
  CreatePurchaseOrderFormValues,
  MerchantReceivingFormValues,
} from "@/lib/validation/schemas";
import {
  B2BPurchaseOrder,
  B2BPurchaseOrderStatus,
  SupplierB2BOffer,
  CANONICAL_B2B_PO_STATUS_MAP,
} from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function getStatusBadge(status: B2BPurchaseOrderStatus) {
  const meta = CANONICAL_B2B_PO_STATUS_MAP[status];
  if (!meta) return <Badge variant="neutral" size="sm">{status}</Badge>;
  return <Badge variant={meta.badgeVariant} size="sm">{meta.label}</Badge>;
}

function MerchantProcurementContent() {
  const {
    warehouses,
    stocks,
    b2bSuppliers,
    b2bSupplierOffers,
    b2bPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    confirmPurchaseOrderReceiving,
  } = useMerchantOperations();

  const [activeTab, setActiveTab] = useUrlQueryState<string>("tab", "orders");
  const [selectedSkuParam] = useUrlQueryState<string>("sku", "");
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");

  const [selectedOfferForPO, setSelectedOfferForPO] = useState<SupplierB2BOffer | null>(null);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);

  const [selectedPOForDetail, setSelectedPOForDetail] = useState<B2BPurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedPOForReceiving, setSelectedPOForReceiving] = useState<B2BPurchaseOrder | null>(null);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);

  const [lastConfirmedReceiving, setLastConfirmedReceiving] = useState<{
    poNumber: string;
    warehouseId: string;
    warehouseName: string;
    sku: string;
    acceptedQty: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Identify out-of-stock and low-stock items in merchant inventory for AI Replenishment Advisor
  const replenishmentCandidates = useMemo(() => {
    return stocks
      .filter((s) => s.available <= s.minStockAlert)
      .map((s) => {
        const matchingOffer = b2bSupplierOffers.find(
          (offer) =>
            offer.sku === s.sku ||
            offer.title.toLowerCase().includes(s.title.toLowerCase().split(" ")[0])
        );
        return {
          stockItem: s,
          suggestedOffer: matchingOffer || null,
          recommendedQty: Math.max(matchingOffer ? matchingOffer.moq : 10, (s.minStockAlert * 2) - s.available),
        };
      });
  }, [stocks, b2bSupplierOffers]);

  // Form for Creating Purchase Order
  const poForm = useForm<CreatePurchaseOrderFormValues>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      offerId: "",
      quantity: 1,
      warehouseId: "wh-01",
      deliveryAddress: "Jl. Tebet Raya No. 42, Jakarta Selatan",
      paymentTerms: "NET_14",
      requestedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      merchantNotes: "",
      confirmPO: false,
    },
  });

  const watchQuantity = poForm.watch("quantity") || 0;
  const watchWarehouseId = poForm.watch("warehouseId");

  // Keep deliveryAddress synced when warehouse changes
  React.useEffect(() => {
    const wh = warehouses.find((w) => w.id === watchWarehouseId);
    if (wh) {
      poForm.setValue("deliveryAddress", wh.address);
    }
  }, [watchWarehouseId, warehouses, poForm]);

  const unitPrice = selectedOfferForPO ? selectedOfferForPO.unitPrice : 0;
  const calcSubtotal = watchQuantity * unitPrice;
  const calcTax = Math.round(calcSubtotal * 0.11);
  const calcShipping = 150000;
  const calcTotal = calcSubtotal + calcTax + calcShipping;

  const handleOpenCreatePO = (offer: SupplierB2BOffer, prefillQty?: number) => {
    setSelectedOfferForPO(offer);
    const initialQty = prefillQty && prefillQty >= offer.moq ? prefillQty : offer.moq;
    const defaultWh = warehouses[0] || { id: "wh-01", name: "Gudang Pusat Tebet (Hub Utama)", address: "Jl. Tebet Raya No. 42, Jakarta Selatan" };

    poForm.reset({
      supplierId: offer.supplierId,
      offerId: offer.id,
      quantity: initialQty,
      warehouseId: defaultWh.id,
      deliveryAddress: defaultWh.address,
      paymentTerms: "NET_14",
      requestedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      merchantNotes: `Restock darurat ${offer.title} untuk menjaga safety stock toko.`,
      confirmPO: false,
    });
    setIsCreatePOModalOpen(true);
  };

  const onSubmitCreatePO = (values: CreatePurchaseOrderFormValues) => {
    if (!selectedOfferForPO) return;

    const subtotal = values.quantity * selectedOfferForPO.unitPrice;
    const taxAmount = Math.round(subtotal * 0.11);
    const shippingFee = 150000;
    const totalAmount = subtotal + taxAmount + shippingFee;
    const targetWh = warehouses.find((w) => w.id === values.warehouseId) || {
      id: values.warehouseId,
      name: "Gudang Pusat",
      address: values.deliveryAddress,
    };

    const newPO = createPurchaseOrder({
      supplierId: values.supplierId,
      supplierName: selectedOfferForPO.supplierName,
      warehouseId: values.warehouseId,
      warehouseName: targetWh.name,
      destinationAddress: values.deliveryAddress,
      items: [
        {
          productId: selectedOfferForPO.productId,
          sku: selectedOfferForPO.sku,
          title: selectedOfferForPO.title,
          quantity: values.quantity,
          unit: selectedOfferForPO.unit,
          unitPrice: selectedOfferForPO.unitPrice,
          totalPrice: subtotal,
        },
      ],
      subtotal,
      taxAmount,
      shippingFee,
      totalAmount,
      paymentTerms: values.paymentTerms,
      requestedDeliveryDate: values.requestedDeliveryDate,
      merchantNotes: values.merchantNotes,
    });

    setIsCreatePOModalOpen(false);
    setActiveTab("orders");
    setToastMessage(`Purchase Order ${newPO.poNumber} berhasil diterbitkan dan dikirim ke ${selectedOfferForPO.supplierName}!`);
  };

  // Form for Merchant Receiving & Inspection
  const receivingForm = useForm<MerchantReceivingFormValues>({
    resolver: zodResolver(merchantReceivingSchema),
    defaultValues: {
      poId: "",
      warehouseId: "wh-01",
      shippedQty: 1,
      receivedQty: 0,
      acceptedQty: 0,
      damagedQty: 0,
      missingQty: 0,
      condition: "PRISTINE",
      receivingNotes: "Kemasan bersegel pabrik utuh, lolos uji fisik barcode.",
      operatorName: "Budi Santoso (Supervisor Gudang)",
      confirmStockIn: false,
    },
  });

  const watchReceivedQty = receivingForm.watch("receivedQty") || 0;
  const watchAcceptedQty = receivingForm.watch("acceptedQty") || 0;
  const watchDamagedQty = receivingForm.watch("damagedQty") || 0;
  const watchMissingQty = receivingForm.watch("missingQty") || 0;

  const shippedQtySnapshot = useMemo(() => {
    if (!selectedPOForReceiving) return 0;
    return selectedPOForReceiving.items[0]?.quantity || 0;
  }, [selectedPOForReceiving]);

  const handleOpenReceiving = (po: B2BPurchaseOrder) => {
    setSelectedPOForReceiving(po);
    const primaryItem = po.items[0];
    const qty = primaryItem ? primaryItem.quantity : 100;

    receivingForm.reset({
      poId: po.id,
      warehouseId: po.warehouseId,
      shippedQty: qty,
      receivedQty: qty,
      acceptedQty: qty,
      damagedQty: 0,
      missingQty: 0,
      condition: "PRISTINE",
      receivingNotes: `Penerimaan kargo ekspedisi ${po.shipmentCarrier || "Kargo"} (Resi: ${po.shipmentAwb || "-"}). Segel utuh.`,
      operatorName: "Budi Santoso (Supervisor Gudang)",
      confirmStockIn: false,
    });
    setIsReceivingModalOpen(true);
  };

  const onSubmitReceiving = (values: MerchantReceivingFormValues) => {
    if (!selectedPOForReceiving) return;

    try {
      confirmPurchaseOrderReceiving(selectedPOForReceiving.id, {
        shippedQuantity: values.shippedQty,
        receivedQuantity: values.receivedQty,
        acceptedQuantity: values.acceptedQty,
        damagedQuantity: values.damagedQty,
        missingQuantity: values.missingQty,
        itemCondition: values.condition,
        receivingNotes: values.receivingNotes,
        receivingOperator: values.operatorName,
        warehouseId: values.warehouseId,
      });

      setIsReceivingModalOpen(false);
      setLastConfirmedReceiving({
        poNumber: selectedPOForReceiving.poNumber,
        warehouseId: values.warehouseId,
        warehouseName: selectedPOForReceiving.warehouseName,
        sku: selectedPOForReceiving.items[0]?.sku || "",
        acceptedQty: values.acceptedQty,
      });
      setToastMessage(
        `Verifikasi fisik selesai! +${values.acceptedQty} unit baik resmi masuk ke stok siap jual gudang ${selectedPOForReceiving.warehouseName}${values.damagedQty > 0 ? ` (+${values.damagedQty} unit karantina/rusak)` : ""}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses penerimaan barang";
      setToastMessage(`Error: ${msg}`);
    }
  };

  // Filtered B2B Purchase Orders
  const filteredPOs = useMemo(() => {
    return b2bPurchaseOrders.filter((po) => {
      const matchStatus = statusFilter === "ALL" || po.status === statusFilter;
      const matchSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.items.some((it) => it.title.toLowerCase().includes(searchQuery.toLowerCase()) || it.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchStatus && matchSearch;
    });
  }, [b2bPurchaseOrders, statusFilter, searchQuery]);

  // Filtered Sourcing Offers
  const filteredOffers = useMemo(() => {
    return b2bSupplierOffers.filter((offer) => {
      const matchSearch =
        !searchQuery ||
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSku = !selectedSkuParam || offer.sku.toLowerCase().includes(selectedSkuParam.toLowerCase());

      return matchSearch && matchSku;
    });
  }, [b2bSupplierOffers, searchQuery, selectedSkuParam]);

  // Inbound Shipments for Receiving Workspace
  const inboundShipments = useMemo(() => {
    return b2bPurchaseOrders.filter((po) => po.status === "SHIPPED" || po.status === "PARTIALLY_RECEIVED");
  }, [b2bPurchaseOrders]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Pengadaan Suku Cadang B2B & Restock Gudang
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Siklus pengadaan resmi Merchant &rarr; Supplier B2B: Sourcing, Terbit PO, Penerimaan Kargo & Mutasi Stok Buku Besar
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/merchant/products">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  <Package size={16} />
                  <span>Katalog Produk</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 -mb-5">
            <button
              onClick={() => setActiveTab("orders")}
              className={`pb-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "orders"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClipboardText size={16} weight={activeTab === "orders" ? "bold" : "regular"} />
              <span>Daftar Purchase Order (PO)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 font-mono">
                {b2bPurchaseOrders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sourcing")}
              className={`pb-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "sourcing"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Buildings size={16} weight={activeTab === "sourcing" ? "bold" : "regular"} />
              <span>Katalog & Sourcing Supplier B2B</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono">
                {b2bSupplierOffers.length} Tawaran
              </span>
            </button>

            <button
              onClick={() => setActiveTab("receiving")}
              className={`pb-3.5 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "receiving"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Warehouse size={16} weight={activeTab === "receiving" ? "bold" : "regular"} />
              <span>Penerimaan Barang (Receiving & QC)</span>
              {inboundShipments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono font-bold animate-pulse">
                  {inboundShipments.length} Tiba
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: PURCHASE ORDERS LIST */}
        {/* ========================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari nomor PO, nama supplier, atau komponen suku cadang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs text-slate-500 whitespace-nowrap">Status:</span>
                {(
                  [
                    ["ALL", "Semua"],
                    ["SUBMITTED", CANONICAL_B2B_PO_STATUS_MAP.SUBMITTED.label],
                    ["ACCEPTED", CANONICAL_B2B_PO_STATUS_MAP.ACCEPTED.label],
                    ["PROCESSING", CANONICAL_B2B_PO_STATUS_MAP.PROCESSING.label],
                    ["SHIPPED", CANONICAL_B2B_PO_STATUS_MAP.SHIPPED.label],
                    ["PARTIALLY_RECEIVED", CANONICAL_B2B_PO_STATUS_MAP.PARTIALLY_RECEIVED.label],
                    ["COMPLETED", CANONICAL_B2B_PO_STATUS_MAP.COMPLETED.label],
                    ["REJECTED", CANONICAL_B2B_PO_STATUS_MAP.REJECTED.label],
                    ["CANCELLED", CANONICAL_B2B_PO_STATUS_MAP.CANCELLED.label],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => setStatusFilter(code)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                      statusFilter === code
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* PO List Table */}
            {filteredPOs.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80">
                <EmptyState
                  title="Belum ada Purchase Order B2B"
                  description="Gunakan tab Sourcing Supplier B2B untuk meninjau penawaran grosir dan menerbitkan purchase order baru."
                  action={{
                    label: "Buka Sourcing Supplier",
                    onClick: () => setActiveTab("sourcing"),
                  }}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">No. PO & Tanggal</th>
                        <th className="py-3 px-4">Supplier B2B</th>
                        <th className="py-3 px-4">Komponen & Jumlah</th>
                        <th className="py-3 px-4">Gudang Tujuan</th>
                        <th className="py-3 px-4 text-right">Total Nilai Tagihan</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPOs.map((po) => {
                        const item = po.items[0];
                        return (
                          <tr key={po.id} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {po.poNumber}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{po.issuedDate}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900 line-clamp-1">
                                {po.supplierName}
                              </div>
                              <div className="text-[10px] text-slate-400">{po.supplierContact}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              {item ? (
                                <div>
                                  <div className="font-medium text-slate-800 line-clamp-1">{item.title}</div>
                                  <div className="font-mono text-[10px] text-slate-400">
                                    {item.quantity} {item.unit} &bull; Kode: {item.sku}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-slate-800 font-medium">{po.warehouseName}</div>
                              <div className="text-[10px] text-slate-400">Term: {po.paymentTerms}</div>
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              Rp {po.totalAmount.toLocaleString("id-ID")}
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {getStatusBadge(po.status)}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPOForDetail(po);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                Detail
                              </Button>

                              {po.status === "SHIPPED" && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenReceiving(po)}
                                  className="text-xs inline-flex items-center gap-1"
                                >
                                  <CheckCircle size={14} weight="bold" />
                                  <span>Terima Barang</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SUPPLIER SOURCING & CATALOG */}
        {/* ========================================================================= */}
        {activeTab === "sourcing" && (
          <div className="space-y-6">
            {/* AI Replenishment Advisor Banner */}
            {replenishmentCandidates.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white mt-0.5">
                    <Sparkle size={20} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-amber-950 font-heading">
                        Asisten Sourcing AI: Peringatan Kebutuhan Restock Otomatis
                      </h3>
                      <Badge variant="warning" size="sm">
                        {replenishmentCandidates.length} Varian Perlu Pasokan
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-900/80 mt-1">
                      Sistem mendeteksi komponen berikut berada di bawah batas minimum (safety stock). Anda dapat meninjau rekomendasi tawaran supplier B2B terverifikasi dan menerbitkan Purchase Order secara sadar.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {replenishmentCandidates.map(({ stockItem, suggestedOffer, recommendedQty }) => (
                        <div
                          key={stockItem.productId}
                          className="p-3.5 bg-white rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-900">{stockItem.title}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                                Stok: {stockItem.available} {stockItem.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Lokasi: {stockItem.warehouseName} &bull; Safety Stock: {stockItem.minStockAlert} {stockItem.unit}
                            </div>
                          </div>

                          {suggestedOffer ? (
                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 flex items-center justify-between">
                              <div>
                                <div className="text-[11px] font-bold text-slate-800">{suggestedOffer.supplierName}</div>
                                <div className="text-[10px] text-slate-500">
                                  MOQ {suggestedOffer.moq} {suggestedOffer.unit} &bull; Rp {suggestedOffer.unitPrice.toLocaleString("id-ID")}/{suggestedOffer.unit}
                                </div>
                              </div>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCreatePO(suggestedOffer, recommendedQty)}
                                className="text-xs"
                              >
                                Terbitkan PO ({recommendedQty} {suggestedOffer.unit})
                              </Button>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">
                              Belum ada penawaran spesifik langsung di katalog. Silakan cari supplier sejenis di bawah.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sourcing Search & Category Filter */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari nama komponen B2B, kode pasokan grosir, atau nama supplier principal..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Buildings size={16} />
                <span>Supplier B2B Terverifikasi:</span>
                <span className="font-bold text-slate-800 font-mono">{b2bSuppliers.length} Mitra</span>
              </div>
            </div>

            {/* B2B Offer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                        <span className="font-semibold text-xs text-slate-700">{offer.supplierName}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {offer.leadTimeDays} Hari Kerja
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                        {offer.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                          {offer.sku}
                        </span>
                        <span className="text-[10px] text-slate-400">{offer.category}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">{offer.description}</p>

                    {/* Price & MOQ Block */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-500">Harga Satuan B2B:</span>
                        <div className="text-base font-bold text-primary font-mono">
                          Rp {offer.unitPrice.toLocaleString("id-ID")}
                          <span className="text-xs font-normal text-slate-400">/{offer.unit}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Minimum Order (MOQ):</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {offer.moq} {offer.unit}
                        </span>
                      </div>
                    </div>

                    {/* Tier Pricing Mini Table */}
                    {offer.tiers && offer.tiers.length > 0 && (
                      <div className="text-[11px] space-y-1">
                        <span className="font-medium text-slate-400 block text-[10px]">Tingkatan Grosir (Tier):</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {offer.tiers.map((tier, idx) => (
                            <div key={idx} className="p-1.5 bg-slate-100/60 rounded text-[10px] flex justify-between">
                              <span className="text-slate-600">
                                {tier.minQty}
                                {tier.maxQty ? `-${tier.maxQty}` : "+"} {offer.unit}:
                              </span>
                              <span className="font-bold font-mono text-slate-800">
                                Rp {tier.pricePerUnit.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Kapasitas: {offer.stockAvailable} {offer.unit}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCreatePO(offer)}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <ShoppingCart size={14} weight="bold" />
                      <span>Buat Purchase Order</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RECEIVING & STOCK IN WORKSPACE */}
        {/* ========================================================================= */}
        {activeTab === "receiving" && (
          <div className="space-y-6">
            {/* Last Confirmed Receiving Success Loop Banner */}
            {lastConfirmedReceiving && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                    <CheckCircle size={20} weight="fill" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950">
                      Penerimaan Berhasil! Kargo PO {lastConfirmedReceiving.poNumber} (+{lastConfirmedReceiving.acceptedQty} unit baik) telah resmi masuk ke stok fisik {lastConfirmedReceiving.warehouseName}.
                    </div>
                    <div className="text-[11px] text-emerald-800">
                      Saldo stok gudang dan mutasi buku besar telah diperbarui secara otomatis.
                    </div>
                  </div>
                </div>
                <Link href="/merchant/products">
                  <Button variant="primary" size="sm" className="whitespace-nowrap flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <span>Lihat di Katalog Produk</span>
                    <ArrowRight size={14} weight="bold" />
                  </Button>
                </Link>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 font-heading">
                      Area Verifikasi Fisik & Serah Terima Kargo
                    </h2>
                    <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-800">
                      INBOUND: Pasokan Masuk Supplier B2B
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kargo yang tiba dari supplier B2B harus melalui inspeksi fisik (penghitungan unit baik, rusak, dan hilang) sebelum saldo stok gudang resmi bertambah.
                  </p>
                </div>
                <Badge variant="primary" size="md">
                  {inboundShipments.length} Pengiriman Inbound
                </Badge>
              </div>
            </div>

            {inboundShipments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80">
                <EmptyState
                  title="Tidak ada pengiriman yang menunggu penerimaan"
                  description="Saat supplier telah mengirimkan pesanan kargo (status Dalam Pengiriman), pesanan tersebut akan otomatis muncul di sini untuk proses verifikasi dan Stock In."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {inboundShipments.map((po) => {
                  const item = po.items[0];
                  return (
                    <div
                      key={po.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-primary/40 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 text-sm">{po.poNumber}</span>
                          {getStatusBadge(po.status)}
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Supplier:</span>
                            <span className="font-bold text-slate-800">{po.supplierName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Ekspedisi Kargo:</span>
                            <span className="font-medium text-slate-800">{po.shipmentCarrier || "Kargo Mandiri"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">No. Resi (AWB):</span>
                            <span className="font-mono font-bold text-primary">{po.shipmentAwb || "AWB-INBOUND-01"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Gudang Tujuan:</span>
                            <span className="font-medium text-slate-800">{po.warehouseName}</span>
                          </div>
                        </div>

                        {item && (
                          <div className="border border-slate-100 p-3 rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Daftar Barang Fisik:</span>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">{item.title}</div>
                            <div className="flex items-center justify-between mt-1 text-xs">
                              <span className="font-mono text-slate-500">{item.sku}</span>
                              <span className="font-bold text-primary font-mono">
                                Total Dikirim: {item.quantity} {item.unit}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {po.shippedDate ? `Dikirim: ${po.shippedDate}` : "Siap Diterima"}
                        </span>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={() => handleOpenReceiving(po)}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Warehouse size={16} weight="bold" />
                          <span>Periksa Fisik & Stock In</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE PURCHASE ORDER (B2B) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        title="Penerbitan Purchase Order (PO) Suku Cadang B2B"
        maxWidth="lg"
      >
        <form onSubmit={poForm.handleSubmit(onSubmitCreatePO)} className="space-y-4 text-xs">
          {selectedOfferForPO && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950">{selectedOfferForPO.supplierName}</span>
                <span className="font-mono text-blue-800 text-[11px]">MOQ: {selectedOfferForPO.moq} {selectedOfferForPO.unit}</span>
              </div>
              <div className="text-slate-800 font-medium">{selectedOfferForPO.title}</div>
              <div className="text-[11px] text-slate-500 font-mono">Kode Pasokan: {selectedOfferForPO.sku}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Gudang Tujuan Penerimaan <span className="text-rose-500">*</span>
              </label>
              <select
                {...poForm.register("warehouseId")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Stok hanya akan bertambah pada gudang yang dipilih setelah verifikasi fisik.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Jumlah Pesanan ({selectedOfferForPO?.unit || "Unit"}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                {...poForm.register("quantity", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono font-bold"
              />
              {poForm.formState.errors.quantity && (
                <p className="text-rose-500 text-[10px] mt-1">
                  {poForm.formState.errors.quantity.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Syarat Pembayaran (Payment Terms) <span className="text-rose-500">*</span>
              </label>
              <select
                {...poForm.register("paymentTerms")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="NET_14">NET 14 Hari (Kredit B2B Standar)</option>
                <option value="NET_30">NET 30 Hari (Kredit Korporat)</option>
                <option value="NET_60">NET 60 Hari (Kredit Jangka Panjang)</option>
                <option value="COD">COD (Cash on Delivery)</option>
                <option value="PREPAID">Prepaid Escrow Servio</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Tanggal Tiba (Requested Delivery) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                {...poForm.register("requestedDeliveryDate")}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Khusus untuk Supplier (Opsional)
            </label>
            <textarea
              {...poForm.register("merchantNotes")}
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Instruksi penanganan, pallet kayu, atau jadwal buka muat gudang..."
            />
          </div>

          {/* Pricing Calculation Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <span className="font-bold text-slate-800 text-xs block">Rincian Finansial Tagihan:</span>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Barang ({watchQuantity} unit @ Rp {unitPrice.toLocaleString("id-ID")}):</span>
              <span className="font-mono font-semibold">Rp {calcSubtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>PPN 11%:</span>
              <span className="font-mono font-semibold">Rp {calcTax.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimasi Ongkos Kargo Truk CDD:</span>
              <span className="font-mono font-semibold">Rp {calcShipping.toLocaleString("id-ID")}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Total Nilai Purchase Order:</span>
              <span className="font-mono text-primary">Rp {calcTotal.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...poForm.register("confirmPO")}
                className="mt-0.5 rounded text-primary focus:ring-primary"
              />
              <span className="text-[11px] text-slate-600">
                Saya mengonfirmasi bahwa Purchase Order B2B ini diterbitkan secara sah dan mengikat kepada pihak supplier untuk diproses ke tahap pemenuhan gudang.
              </span>
            </label>
            {poForm.formState.errors.confirmPO && (
              <p className="text-rose-500 text-[10px] mt-1 ml-6">
                {poForm.formState.errors.confirmPO.message}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreatePOModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={poForm.formState.isSubmitting}
            >
              Kirim Purchase Order Resmi
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL PURCHASE ORDER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Detail Dokumen B2B: ${selectedPOForDetail?.poNumber || ""}`}
        maxWidth="lg"
      >
        {selectedPOForDetail && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Status Purchase Order:</span>
                <div className="mt-1">{getStatusBadge(selectedPOForDetail.status)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Tanggal Terbit:</span>
                <span className="font-medium text-slate-800">{selectedPOForDetail.issuedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Pemasok (Supplier):</span>
                <div className="font-bold text-slate-900 mt-1">{selectedPOForDetail.supplierName}</div>
                <div className="text-slate-500 mt-0.5">{selectedPOForDetail.supplierContact}</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Tujuan Pengiriman:</span>
                <div className="font-bold text-slate-900 mt-1">{selectedPOForDetail.warehouseName}</div>
                <div className="text-slate-500 mt-0.5">{selectedPOForDetail.destinationAddress}</div>
              </div>
            </div>

            {/* Items Breakdown */}
            <div>
              <span className="font-semibold text-slate-700 block mb-2">Item Suku Cadang yang Dipesan:</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Komponen</th>
                      <th className="py-2.5 px-3 text-center">Jumlah</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPOForDetail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900">{it.title}</div>
                          <div className="font-mono text-[10px] text-slate-400">{it.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          Rp {it.unitPrice.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          Rp {it.totalPrice.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Barang:</span>
                <span className="font-mono">Rp {selectedPOForDetail.subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN 11%:</span>
                <span className="font-mono">Rp {selectedPOForDetail.taxAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ongkos Kirim Kargo:</span>
                <span className="font-mono">Rp {selectedPOForDetail.shippingFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Tagihan:</span>
                <span className="font-mono text-primary">Rp {selectedPOForDetail.totalAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Receiving Record if exists */}
            {selectedPOForDetail.receivingRecord && (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                  <CheckCircle size={16} weight="fill" />
                  <span>Bukti Berita Acara Penerimaan (Receiving Record):</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-700">
                  <div>Diterima Fisik: <span className="font-mono font-bold">{selectedPOForDetail.receivingRecord.totalReceived}</span> unit</div>
                  <div>Lolos QC (Stock In): <span className="font-mono font-bold text-emerald-700">{selectedPOForDetail.receivingRecord.totalAccepted}</span> unit</div>
                  <div>Rusak/Klaim: <span className="font-mono font-bold text-rose-600">{selectedPOForDetail.receivingRecord.totalDamaged}</span> unit</div>
                  <div>Hilang/Selisih: <span className="font-mono font-bold text-amber-600">{selectedPOForDetail.receivingRecord.totalMissing}</span> unit</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Petugas: {selectedPOForDetail.receivingRecord.receivedBy} &bull; Waktu: {selectedPOForDetail.receivingRecord.receivedAt}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {selectedPOForDetail.status === "SUBMITTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const res = updatePurchaseOrderStatus(selectedPOForDetail.id, "CANCELLED", {
                      actorRole: "MERCHANT",
                    });
                    if (res && !res.success) {
                      setToastMessage(`Gagal membatalkan PO: ${res.error}`);
                      return;
                    }
                    setIsDetailModalOpen(false);
                    setToastMessage(`Purchase Order ${selectedPOForDetail.poNumber} berhasil dibatalkan.`);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Batalkan PO
                </Button>
              )}

              {selectedPOForDetail.status === "SHIPPED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenReceiving(selectedPOForDetail);
                  }}
                  className="flex items-center gap-1"
                >
                  <Warehouse size={14} />
                  <span>Masuk ke Pemeriksaan Fisik</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="ml-auto"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: MERCHANT RECEIVING & STOCK IN (QC INSPECTION) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isReceivingModalOpen}
        onClose={() => setIsReceivingModalOpen(false)}
        title="Verifikasi Fisik, QC & Stock In Gudang"
        maxWidth="lg"
      >
        {selectedPOForReceiving && (
          <form onSubmit={receivingForm.handleSubmit(onSubmitReceiving)} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 font-mono">{selectedPOForReceiving.poNumber}</span>
                <span className="text-[11px] text-amber-800">
                  Ekspedisi: {selectedPOForReceiving.shipmentCarrier || "Kargo Mandiri"} (Resi: {selectedPOForReceiving.shipmentAwb || "-"})
                </span>
              </div>
              <div className="text-slate-800 font-semibold">{selectedPOForReceiving.items[0]?.title}</div>
              <div className="text-[11px] text-slate-500">
                Gudang Tujuan Penerimaan: <span className="font-bold text-slate-800">{selectedPOForReceiving.warehouseName}</span>
              </div>
            </div>

            {/* Hidden Shipped Qty Field */}
            <input type="hidden" {...receivingForm.register("shippedQty", { valueAsNumber: true })} />

            {/* Reconciliation Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kuantitas Dikirim Kargo
                </label>
                <input
                  type="number"
                  disabled
                  value={shippedQtySnapshot}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 font-mono font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kondisi Baik (Lolos QC) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  {...receivingForm.register("acceptedQty", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-400 font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rusak / Cacat Pabrik
                </label>
                <input
                  type="number"
                  {...receivingForm.register("damagedQty", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-rose-50/30 focus:ring-2 focus:ring-rose-400 font-mono font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selisih / Hilang
                </label>
                <input
                  type="number"
                  {...receivingForm.register("missingQty", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-amber-200 bg-amber-50/30 focus:ring-2 focus:ring-amber-400 font-mono font-bold text-amber-700"
                />
              </div>
            </div>

            {/* Invariant Error Feedback */}
            {receivingForm.formState.errors.receivedQty && (
              <p className="text-rose-600 text-[11px] font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                {receivingForm.formState.errors.receivedQty.message}
              </p>
            )}
            {receivingForm.formState.errors.missingQty && (
              <p className="text-rose-600 text-[11px] font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                {receivingForm.formState.errors.missingQty.message}
              </p>
            )}

            {/* Discrepancy warning */}
            {watchAcceptedQty + watchDamagedQty + watchMissingQty !== shippedQtySnapshot && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-center gap-2">
                <Warning size={16} weight="bold" />
                <span>
                  Total rekonsiliasi ({watchAcceptedQty + watchDamagedQty + watchMissingQty}) belum sama dengan jumlah dikirim ({shippedQtySnapshot}).
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kondisi Kemasan Fisik <span className="text-rose-500">*</span>
                </label>
                <select
                  {...receivingForm.register("condition")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="PRISTINE">Sempurna & Segel Pabrik Utuh</option>
                  <option value="PARTIAL_DAMAGE">Kardus Sedikit Penyok (Komponen Aman)</option>
                  <option value="WRONG_PACKAGING">Kemasan Tidak Sesuai Standar</option>
                  <option value="DEFECTIVE">Ada Cacat / Kerusakan Fisik</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Petugas Penerima / QC <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...receivingForm.register("operatorName")}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Berita Acara Penerimaan (Minimal 5 karakter) <span className="text-rose-500">*</span>
              </label>
              <textarea
                {...receivingForm.register("receivingNotes")}
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Misal: Nomor segel kargo cocok, palet diperiksa dan barcode diverifikasi..."
              />
              {receivingForm.formState.errors.receivingNotes && (
                <p className="text-rose-500 text-[10px] mt-1">
                  {receivingForm.formState.errors.receivingNotes.message}
                </p>
              )}
            </div>

            {/* Live simulation of 5-bucket inventory effect */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
              <span className="font-bold text-emerald-950 text-xs block">Simulasi Mutasi Stok 5-Bucket:</span>
              <div className="text-[11px] text-emerald-900 space-y-0.5">
                <div>&bull; Lokasi Gudang: <span className="font-bold">{selectedPOForReceiving.warehouseName}</span></div>
                <div>&bull; Stok Siap Jual (Available): <span className="font-bold font-mono text-emerald-700">+{watchAcceptedQty} unit</span> (bebas komitmen)</div>
                {watchDamagedQty > 0 && (
                  <div>&bull; Karantina / Rusak (Unavailable): <span className="font-bold font-mono text-rose-600">+{watchDamagedQty} unit</span> (tidak bisa dibeli customer)</div>
                )}
                <div className="text-[10px] text-emerald-700/80 mt-1">
                  Mutasi ini otomatis dicatat ke buku besar stok multi-gudang secara permanen.
                </div>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...receivingForm.register("confirmStockIn")}
                  className="mt-0.5 rounded text-primary focus:ring-primary"
                />
                <span className="text-[11px] text-slate-600">
                  Saya menyatakan telah menghitung fisik barang dengan benar dan menyetujui mutasi Stock In ke sistem inventaris.
                </span>
              </label>
              {receivingForm.formState.errors.confirmStockIn && (
                <p className="text-rose-500 text-[10px] mt-1 ml-6">
                  {receivingForm.formState.errors.confirmStockIn.message}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsReceivingModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={receivingForm.formState.isSubmitting}
              >
                Konfirmasi Penerimaan & Stock In
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toast Notification */}
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

export default function MerchantProcurementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-500 text-sm">
            <ArrowsClockwise size={20} className="animate-spin text-primary" />
            <span>Memuat Modul Pengadaan B2B...</span>
          </div>
        </div>
      }
    >
      <MerchantProcurementContent />
    </Suspense>
  );
}
