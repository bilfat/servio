"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  ClipboardText,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Truck,
  ArrowRight,
  Package,
  Warehouse,
  CurrencyCircleDollar,
  Buildings,
  Tag,
  Clock,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  B2BPurchaseOrder,
  B2BPurchaseOrderStatus,
  CANONICAL_B2B_PO_STATUS_MAP,
} from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function SupplierOrdersContent() {
  const { b2bPurchaseOrders, updateB2BPurchaseOrderStatus } = useSupplierOperations();

  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");

  const [selectedPOForDetail, setSelectedPOForDetail] = useState<B2BPurchaseOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedPOForReject, setSelectedPOForReject] = useState<B2BPurchaseOrder | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("Kapasitas produksi / stok B2B saat ini tidak mencukupi.");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [selectedPOForShip, setSelectedPOForShip] = useState<B2BPurchaseOrder | null>(null);
  const [carrierInput, setCarrierInput] = useState("Kargo Logistik Prima");
  const [awbInput, setAwbInput] = useState("");
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return b2bPurchaseOrders.filter((po) => {
      const matchesStatus = statusFilter === "ALL" || po.status === statusFilter;
      const matchesSearch =
        !searchQuery ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.items.some(
          (it) =>
            it.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesStatus && matchesSearch;
    });
  }, [b2bPurchaseOrders, statusFilter, searchQuery]);

  // Counts by status
  const countSubmitted = b2bPurchaseOrders.filter((p) => p.status === "SUBMITTED").length;
  const countAccepted = b2bPurchaseOrders.filter((p) => p.status === "ACCEPTED").length;
  const countProcessing = b2bPurchaseOrders.filter((p) => p.status === "PROCESSING").length;
  const countShipped = b2bPurchaseOrders.filter((p) => p.status === "SHIPPED").length;

  const handleOpenDetail = (po: B2BPurchaseOrder) => {
    setSelectedPOForDetail(po);
    setIsDetailModalOpen(true);
  };

  const handleAcceptPO = (po: B2BPurchaseOrder) => {
    const res = updateB2BPurchaseOrderStatus(po.id, "ACCEPTED");
    if (!res.success) {
      setToastMessage(`Gagal menyetujui PO: ${res.error}`);
      return;
    }
    setToastMessage(`Purchase Order B2B ${po.poNumber} berhasil disetujui! Stok dijadwalkan untuk penyiapan gudang.`);
    if (selectedPOForDetail?.id === po.id) {
      setSelectedPOForDetail({ ...po, status: "ACCEPTED" });
    }
  };

  const handleOpenRejectModal = (po: B2BPurchaseOrder) => {
    setSelectedPOForReject(po);
    setRejectReasonInput("Kapasitas produksi / alokasi kuantitas B2B saat ini tidak mencukupi.");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedPOForReject) return;
    if (!rejectReasonInput.trim()) {
      setToastMessage("Alasan penolakan PO wajib diisi.");
      return;
    }

    const res = updateB2BPurchaseOrderStatus(selectedPOForReject.id, "REJECTED", {
      rejectionReason: rejectReasonInput,
    });
    if (!res.success) {
      setToastMessage(`Gagal menolak PO: ${res.error}`);
      return;
    }
    setIsRejectModalOpen(false);
    setToastMessage(`Purchase Order B2B ${selectedPOForReject.poNumber} telah ditolak resmi.`);
    if (selectedPOForDetail?.id === selectedPOForReject.id) {
      setSelectedPOForDetail({ ...selectedPOForReject, status: "REJECTED", rejectionReason: rejectReasonInput });
    }
  };

  const handleStartProcessPO = (po: B2BPurchaseOrder) => {
    const res = updateB2BPurchaseOrderStatus(po.id, "PROCESSING");
    if (!res.success) {
      setToastMessage(`Gagal memproses PO: ${res.error}`);
      return;
    }
    setToastMessage(`Purchase Order B2B ${po.poNumber} dipindahkan ke status penyiapan fisik gudang & QC palletizing.`);
    if (selectedPOForDetail?.id === po.id) {
      setSelectedPOForDetail({ ...po, status: "PROCESSING" });
    }
  };

  const handleOpenShipModal = (po: B2BPurchaseOrder) => {
    setSelectedPOForShip(po);
    setCarrierInput(po.shipmentCarrier || "Kargo Logistik Prima");
    setAwbInput(po.shipmentAwb || `KGO-JKT-${Date.now().toString().slice(-6)}`);
    setIsShipModalOpen(true);
  };

  const handleConfirmShip = () => {
    if (!selectedPOForShip) return;
    if (!carrierInput || !awbInput) {
      setToastMessage("Nama ekspedisi kargo dan nomor resi AWB wajib diisi.");
      return;
    }

    const res = updateB2BPurchaseOrderStatus(selectedPOForShip.id, "SHIPPED", {
      shipmentCarrier: carrierInput,
      shipmentAwb: awbInput,
    });
    if (!res.success) {
      setToastMessage(`Gagal memberangkatkan kargo: ${res.error}`);
      return;
    }
    setIsShipModalOpen(false);
    setToastMessage(
      `Kargo pesanan ${selectedPOForShip.poNumber} berhasil diberangkatkan via ${carrierInput} (Resi: ${awbInput})!`
    );
    if (selectedPOForDetail?.id === selectedPOForShip.id) {
      setSelectedPOForDetail({
        ...selectedPOForShip,
        status: "SHIPPED",
        shipmentCarrier: carrierInput,
        shipmentAwb: awbInput,
      });
    }
  };

  const renderStatusBadge = (status: B2BPurchaseOrderStatus) => {
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
                  <ClipboardText size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Workspace Pesanan Masuk B2B (Purchase Orders)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola komitmen pasokan grosir suku cadang dari toko merchant mitra: persetujuan PO, jadwal penyiapan gudang, dan keberangkatan kargo ekspedisi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/business/supplier/inventory">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  <Warehouse size={16} />
                  <span>Cek Inventori Gudang</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Quick Filter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setStatusFilter("SUBMITTED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "SUBMITTED"
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-semibold text-amber-700 block">Menunggu Konfirmasi</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">{countSubmitted}</div>
            <span className="text-[10px] text-slate-400">PO baru dari merchant</span>
          </button>

          <button
            onClick={() => setStatusFilter("ACCEPTED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "ACCEPTED"
                ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20"
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-semibold text-primary block">Telah Disetujui</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">{countAccepted}</div>
            <span className="text-[10px] text-slate-400">Siap antre gudang</span>
          </button>

          <button
            onClick={() => setStatusFilter("PROCESSING")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "PROCESSING"
                ? "bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/20"
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-semibold text-purple-700 block">Disiapkan di Gudang</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">{countProcessing}</div>
            <span className="text-[10px] text-slate-400">Picking & Palletizing</span>
          </button>

          <button
            onClick={() => setStatusFilter("SHIPPED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "SHIPPED"
                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20"
                : "bg-white border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <span className="text-xs font-semibold text-emerald-700 block">Dalam Pengiriman</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">{countShipped}</div>
            <span className="text-[10px] text-slate-400">Kargo ekspedisi transit</span>
          </button>
        </div>

        {/* Search and Status Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari No. PO, Toko Merchant Pembeli, atau Kode Pasokan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {[
              ["ALL", "Semua Status"],
              ["SUBMITTED", "Menunggu Respon"],
              ["ACCEPTED", "Disetujui"],
              ["PROCESSING", "Disiapkan"],
              ["SHIPPED", "Dalam Kargo"],
              ["COMPLETED", "Selesai"],
              ["REJECTED", "Ditolak"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === val
                    ? "bg-primary text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* PO List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Daftar Pesanan Grosir B2B ({filteredOrders.length} PO)
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Role Authority: Principal Supplier
            </span>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Tidak ada Purchase Order sesuai filter"
              description="Coba ubah kata kunci pencarian atau ganti pilihan tab status di atas."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">No. PO & Tanggal</th>
                    <th className="py-3.5 px-4">Toko Merchant Pembeli</th>
                    <th className="py-3.5 px-4">Barang Suku Cadang</th>
                    <th className="py-3.5 px-4 text-right">Nilai Tagihan (+PPN)</th>
                    <th className="py-3.5 px-4">Gudang Tujuan</th>
                    <th className="py-3.5 px-4 text-center">Status PO</th>
                    <th className="py-3.5 px-4 text-right">Aksi Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((po) => {
                    const primaryItem = po.items[0];
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetail(po)}
                            className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors text-left hover:underline"
                          >
                            {po.poNumber}
                          </button>
                          <div className="text-[10px] text-slate-400 mt-0.5">{po.issuedDate}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{po.merchantName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Term: {po.paymentTerms}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {primaryItem && (
                            <div>
                              <div className="font-medium text-slate-800 line-clamp-1">
                                {primaryItem.title}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {primaryItem.quantity} {primaryItem.unit} &bull; Kode: {primaryItem.sku}
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
                          {renderStatusBadge(po.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                          {po.status === "SUBMITTED" && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleAcceptPO(po)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Terima PO
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenRejectModal(po)}
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
                              onClick={() => handleStartProcessPO(po)}
                              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              Mulai Penyiapan
                            </Button>
                          )}

                          {po.status === "PROCESSING" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenShipModal(po)}
                              className="text-xs flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white"
                            >
                              <Truck size={14} />
                              <span>Kirim Kargo</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(po)}
                            className="text-xs"
                          >
                            Detail
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
      </div>

      {/* PO Detail Modal */}
      {selectedPOForDetail && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Detail Purchase Order — ${selectedPOForDetail.poNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Status Purchase Order
                </span>
                <div className="mt-1 flex items-center gap-2">
                  {renderStatusBadge(selectedPOForDetail.status)}
                  <span className="text-[11px] text-slate-500">
                    Diterbitkan: {selectedPOForDetail.issuedDate}
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Finansial (+PPN 11%)
                </span>
                <span className="font-mono font-bold text-base text-slate-900">
                  Rp {selectedPOForDetail.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Merchant & Warehouse Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Buildings size={14} className="text-primary" />
                  <span>Toko Merchant Pembeli</span>
                </span>
                <div className="font-semibold text-slate-800">{selectedPOForDetail.merchantName}</div>
                <div className="text-slate-500">Ketentuan Bayar: {selectedPOForDetail.paymentTerms}</div>
                {selectedPOForDetail.merchantNotes && (
                  <div className="p-2 bg-amber-50 text-amber-900 rounded text-[11px] mt-2 italic">
                    &ldquo;{selectedPOForDetail.merchantNotes}&rdquo;
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  <span>Gudang Tujuan Penerimaan</span>
                </span>
                <div className="font-semibold text-slate-800">{selectedPOForDetail.warehouseName}</div>
                <div className="text-slate-500">{selectedPOForDetail.destinationAddress}</div>
                <div className="text-slate-500 mt-1">
                  Target Tiba: {selectedPOForDetail.requestedDeliveryDate}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Komponen Suku Cadang</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right">Total Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPOForDetail.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{it.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">Kode: {it.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {it.quantity} {it.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        Rp {it.unitPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        Rp {it.totalPrice.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Shipment details if shipped */}
            {selectedPOForDetail.shipmentCarrier && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Truck size={16} />
                  <span>Informasi Kargo Ekspedisi</span>
                </div>
                <div className="text-[11px]">
                  Ekspedisi: <span className="font-semibold">{selectedPOForDetail.shipmentCarrier}</span> &bull; Resi AWB:{" "}
                  <span className="font-mono font-bold">{selectedPOForDetail.shipmentAwb}</span>
                </div>
              </div>
            )}

            {/* Rejection reason if rejected */}
            {selectedPOForDetail.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                <div className="font-bold">Alasan Penolakan:</div>
                <div className="text-[11px] italic">&ldquo;{selectedPOForDetail.rejectionReason}&rdquo;</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Tolak Purchase Order B2B"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Berikan alasan penolakan resmi untuk toko merchant pemesan. Alasan ini akan tercatat secara permanen pada log audit PO.
          </p>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Alasan Penolakan *</label>
            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              placeholder="Contoh: Kapasitas gudang penuh / Pasokan komponen sedang habis dari principal pabrik..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Konfirmasi Tolak PO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ship Modal */}
      <Modal
        isOpen={isShipModalOpen}
        onClose={() => setIsShipModalOpen(false)}
        title="Pemberangkatan Kargo Ekspedisi (Shipment Dispatch)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Kargo yang telah lolos QC penataan palet siap diserahterimakan ke ekspedisi kargo truk. Masukkan nama armada kargo dan nomor resi AWB.
          </p>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Nama Ekspedisi Kargo *</label>
            <input
              type="text"
              value={carrierInput}
              onChange={(e) => setCarrierInput(e.target.value)}
              placeholder="Contoh: Kargo Logistik Prima / JNE Trucking"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Nomor Resi / Surat Jalan AWB *</label>
            <input
              type="text"
              value={awbInput}
              onChange={(e) => setAwbInput(e.target.value)}
              placeholder="Contoh: KGO-JKT-887711"
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
            <strong>Catatan Otoritas:</strong> Pengiriman kargo mengubah status PO menjadi Dalam Pengiriman. Mutasi penambahan stok merchant hanya akan terjadi setelah merchant menyelesaikan Berita Acara Penerimaan (Receiving).
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShipModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmShip}
            >
              Konfirmasi Berangkat Kargo
            </Button>
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function SupplierOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Pesanan B2B...</div>}>
      <SupplierOrdersContent />
    </Suspense>
  );
}
