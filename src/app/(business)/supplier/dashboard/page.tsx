"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  ClipboardText,
  CurrencyCircleDollar,
  Users,
  Warehouse,
  CheckCircle,
  ArrowRight,
  TrendUp,
  Buildings,
  Cube,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import { SupplierOrderStatus, B2BPurchaseOrder, B2BPurchaseOrderStatus, CANONICAL_B2B_PO_STATUS_MAP } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";

function SupplierDashboardContent() {
  const {
    products,
    orders,
    updateOrderStatus,
    fulfillments,
    shipments,
    b2bPurchaseOrders,
    updateB2BPurchaseOrderStatus,
  } = useSupplierOperations();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [poSourceTab, setPoSourceTab] = useState<"B2B_MERCHANT" | "REGULAR">("B2B_MERCHANT");

  const [selectedB2BShipmentPO, setSelectedB2BShipmentPO] = useState<B2BPurchaseOrder | null>(null);
  const [carrierInput, setCarrierInput] = useState("Kargo Logistik Prima");
  const [awbInput, setAwbInput] = useState("");
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);

  // Computed metrics
  const activeOrders = orders.filter((o) => o.status !== "DELIVERED");
  const inTransitShipments = shipments.filter((s) => s.status === "IN_TRANSIT");

  const handleConfirmPO = (poId: string, poNumber: string) => {
    updateOrderStatus(poId, "CONFIRMED");
    setToastMessage(`Purchase Order ${poNumber} berhasil dikonfirmasi dan masuk jadwal penyiapan gudang!`);
  };

  const handleAcceptB2BPO = (poId: string, poNumber: string) => {
    const res = updateB2BPurchaseOrderStatus(poId, "ACCEPTED");
    if (!res.success) {
      setToastMessage(`Gagal menyetujui PO: ${res.error}`);
      return;
    }
    setToastMessage(`Purchase Order B2B ${poNumber} disetujui! Status diteruskan ke persiapan gudang.`);
  };

  const handleRejectB2BPO = (poId: string, poNumber: string) => {
    const res = updateB2BPurchaseOrderStatus(poId, "REJECTED", {
      rejectionReason: "Kapasitas produksi / stok B2B saat ini tidak mencukupi.",
    });
    if (!res.success) {
      setToastMessage(`Gagal menolak PO: ${res.error}`);
      return;
    }
    setToastMessage(`Purchase Order B2B ${poNumber} telah ditolak.`);
  };

  const handleStartProcessB2BPO = (poId: string, poNumber: string) => {
    const res = updateB2BPurchaseOrderStatus(poId, "PROCESSING");
    if (!res.success) {
      setToastMessage(`Gagal memproses PO: ${res.error}`);
      return;
    }
    setToastMessage(`Purchase Order B2B ${poNumber} dipindahkan ke status penyiapan fisik gudang.`);
  };

  const handleOpenShipModal = (po: B2BPurchaseOrder) => {
    setSelectedB2BShipmentPO(po);
    setCarrierInput(po.shipmentCarrier || "Kargo Logistik Prima");
    setAwbInput(po.shipmentAwb || `KGO-JKT-${Date.now().toString().slice(-6)}`);
    setIsShipModalOpen(true);
  };

  const handleConfirmShipB2BPO = () => {
    if (!selectedB2BShipmentPO) return;
    const res = updateB2BPurchaseOrderStatus(selectedB2BShipmentPO.id, "SHIPPED", {
      shipmentCarrier: carrierInput,
      shipmentAwb: awbInput,
    });
    if (!res.success) {
      setToastMessage(`Gagal memberangkatkan kargo: ${res.error}`);
      return;
    }
    setIsShipModalOpen(false);
    setToastMessage(
      `Kargo pesanan ${selectedB2BShipmentPO.poNumber} berhasil diberangkatkan via ${carrierInput} (Resi: ${awbInput})!`
    );
  };

  const getOrderStatusBadge = (status: SupplierOrderStatus) => {
    switch (status) {
      case "PO_RECEIVED":
        return <Badge variant="danger" size="sm">PO Baru Masuk</Badge>;
      case "CONFIRMED":
        return <Badge variant="warning" size="sm">Terkonfirmasi</Badge>;
      case "PREPARING":
        return <Badge variant="primary" size="sm">Palletizing</Badge>;
      case "PACKED":
        return <Badge variant="primary" size="sm">Siap Kargo</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="neutral" size="sm">Dalam Kargo</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="sm">Tiba di Buyer</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getB2BStatusBadge = (status: B2BPurchaseOrderStatus) => {
    const meta = CANONICAL_B2B_PO_STATUS_MAP[status];
    if (!meta) {
      return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
    return (
      <Badge variant={meta.badgeVariant} size="sm">
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-primary">
                  <Buildings size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  PT Indotama Distribusi HVAC
                </h1>
                <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                  Principal Supplier B2B
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pusat Pasokan Grosir Komponen HVAC, Pipa Tembaga & Gas Refrigerant Nasional
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/business/supplier/products">
                <Button variant="primary" size="md" className="flex items-center gap-1.5">
                  <Package size={16} weight="bold" />
                  <span>Katalog Grosir B2B</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Omzet Grosir Bulan Ini</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CurrencyCircleDollar size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-heading">
                Rp 184.200.000
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
                <TrendUp size={14} weight="bold" />
                <span>+22.4% vs bulan lalu</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Purchase Order (PO) Aktif</span>
              <span className="p-2 rounded-xl bg-blue-50 text-primary">
                <ClipboardText size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {activeOrders.length}{" "}
                <span className="text-sm font-normal text-slate-500">PO</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-primary text-xs font-semibold">
                {orders.filter((o) => o.status === "PO_RECEIVED").length} Baru
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Total nilai aktif: Rp 104.229.000</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Mitra B2B Terdaftar</span>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Users size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-heading">42 Mitra</div>
              <div className="text-xs text-slate-500 mt-1">
                32 Toko Merchant • 10 Bengkel Jaringan
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Armada Kargo Berjalan</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Truck size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {inTransitShipments.length}{" "}
                <span className="text-sm font-normal text-slate-500">Manifest</span>
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                98.6% On-Time Delivery Rate
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Operations Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/business/supplier/products"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-50 text-primary">
                <Package size={18} weight="bold" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">Katalog Grosir</div>
                <div className="text-[11px] text-slate-500">{products.length} Produk Pasokan</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/business/supplier/inventory"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Warehouse size={18} weight="bold" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">Gudang Besar</div>
                <div className="text-[11px] text-slate-500">Stok Palet & Peti</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/business/supplier/fulfillment"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Cube size={18} weight="bold" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">Fulfillment Kargo</div>
                <div className="text-[11px] text-slate-500">{fulfillments.length} Antrean QC</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/business/supplier/shipping"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Truck size={18} weight="bold" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-800">Manifest Ekspedisi</div>
                <div className="text-[11px] text-slate-500">{shipments.length} Pengiriman</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-slate-400 group-hover:text-primary transition-colors" />
          </Link>
        </div>

        {/* Active Purchase Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-primary">
                <ClipboardText size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Antrean Purchase Order (PO) Grosir Masuk
                </h2>
                <p className="text-xs text-slate-500">
                  Pesanan pasokan volume besar dari toko suku cadang mitra dan bengkel servis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/business/supplier/orders">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5">
                  <ClipboardText size={14} weight="bold" />
                  <span>Buka Workspace Pesanan B2B</span>
                  <ArrowRight size={12} weight="bold" />
                </Button>
              </Link>

              {/* Source Tab Toggle */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                onClick={() => setPoSourceTab("B2B_MERCHANT")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  poSourceTab === "B2B_MERCHANT"
                    ? "bg-white text-primary shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                PO Toko Merchant ({b2bPurchaseOrders.length})
              </button>
                <button
                  onClick={() => setPoSourceTab("REGULAR")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    poSourceTab === "REGULAR"
                      ? "bg-white text-primary shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  PO Reguler Lainnya ({orders.length})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {poSourceTab === "B2B_MERCHANT" ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. PO & Tanggal</th>
                    <th className="py-3 px-4">Toko Merchant Pembeli</th>
                    <th className="py-3 px-4">Barang Suku Cadang</th>
                    <th className="py-3 px-4 text-right">Nilai Tagihan (+PPN)</th>
                    <th className="py-3 px-4">Gudang Tujuan</th>
                    <th className="py-3 px-4 text-center">Status PO</th>
                    <th className="py-3 px-4 text-right">Aksi Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2bPurchaseOrders.map((po) => {
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
                            {po.merchantName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Term: {po.paymentTerms}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {item && (
                            <div>
                              <div className="font-medium text-slate-800 line-clamp-1">{item.title}</div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {item.quantity} {item.unit} &bull; Kode: {item.sku}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          Rp {po.totalAmount.toLocaleString("id-ID")}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">{po.warehouseName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{po.destinationAddress}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getB2BStatusBadge(po.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {po.status === "SUBMITTED" && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAcceptB2BPO(po.id, po.poNumber)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                Terima PO
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectB2BPO(po.id, po.poNumber)}
                                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Tolak
                              </Button>
                            </>
                          )}

                          {po.status === "ACCEPTED" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleStartProcessB2BPO(po.id, po.poNumber)}
                              className="text-xs"
                            >
                              Proses Gudang
                            </Button>
                          )}

                          {po.status === "PROCESSING" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenShipModal(po)}
                              className="text-xs inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Truck size={14} weight="bold" />
                              <span>Kirim Kargo</span>
                            </Button>
                          )}

                          {po.status === "SHIPPED" && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              AWB: {po.shipmentAwb || "-"}
                            </div>
                          )}

                          {["COMPLETED", "PARTIALLY_RECEIVED"].includes(po.status) && (
                            <div className="text-[11px] text-emerald-600 font-medium">
                              Sudah Diterima Merchant
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. PO / Tanggal</th>
                    <th className="py-3 px-4">Pembeli B2B / Kategori</th>
                    <th className="py-3 px-4">Pesanan Barang</th>
                    <th className="py-3 px-4 text-right">Nilai Tagihan (+PPN)</th>
                    <th className="py-3 px-4 text-center">Term Pembayaran</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {po.poNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{po.issuedDate}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {po.buyerName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px]">
                            {po.buyerType}
                          </span>
                          <span>• Contact: {po.buyerContact}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          {po.items.map((it, idx) => (
                            <div key={idx} className="text-slate-700 truncate">
                              <span className="font-semibold">{it.quantity}x</span> {it.title}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        Rp {po.totalAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                          {po.paymentTerms}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getOrderStatusBadge(po.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {po.status === "PO_RECEIVED" ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmPO(po.id, po.poNumber)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <CheckCircle size={14} weight="bold" />
                            <span>Konfirmasi PO</span>
                          </Button>
                        ) : (
                          <Link href="/business/supplier/fulfillment">
                            <Button variant="outline" size="sm" className="text-xs">
                              Cek Logistik
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Selling Wholesale Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Produk Pasokan Grosir Paling Laris
              </h2>
              <p className="text-xs text-slate-500">
                Stok palet dan tiering diskon minimum order quantity (MOQ)
              </p>
            </div>
            <Link href="/business/supplier/products">
              <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Kelola Semua Produk <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.slice(0, 3).map((prod) => (
              <div
                key={prod.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      Kode: {prod.sku}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Stok: {prod.stock} {prod.unit}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs line-clamp-2">{prod.title}</h3>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs">
                  <div className="text-[11px] text-slate-500">
                    MOQ: <strong className="text-slate-800">{prod.moq} {prod.unit}</strong>
                  </div>
                  <div className="font-mono font-bold text-primary mt-0.5">
                    Mulai Rp {prod.tiers[0]?.pricePerUnit.toLocaleString("id-ID")} / {prod.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Dispatch Kargo B2B */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title="Keberangkatan Pengiriman Kargo B2B"
        maxWidth="md"
      >
        {selectedB2BShipmentPO && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="font-bold text-blue-950 font-mono">{selectedB2BShipmentPO.poNumber}</div>
              <div className="text-slate-800">Tujuan: {selectedB2BShipmentPO.warehouseName}</div>
              <div className="text-[11px] text-slate-500">{selectedB2BShipmentPO.destinationAddress}</div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Ekspedisi / Armada Kargo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Contoh: Kargo Logistik Prima, Truk CDD Mandiri..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor Resi / Manifest Kargo (AWB) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={awbInput}
                onChange={(e) => setAwbInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                placeholder="Contoh: KGO-JKT-882910"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsShipModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmShipB2BPO}
                disabled={!carrierInput.trim() || !awbInput.trim()}
                className="flex items-center gap-1.5"
              >
                <PaperPlaneTilt size={14} weight="bold" />
                <span>Konfirmasi Berangkat</span>
              </Button>
            </div>
          </div>
        )}
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

export default function SupplierDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Dashboard Suplai...</div>}>
      <SupplierDashboardContent />
    </Suspense>
  );
}
