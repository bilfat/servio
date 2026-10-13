"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  ServiceOrder,
  MerchantOrder,
  B2BPurchaseOrder,
} from "@/types/domain";
import { DomainBooking } from "@/lib/repository/domainRepository";
import {
  ShoppingCart,
  Wrench,
  Package,
  Buildings,
  CalendarCheck,
  MagnifyingGlass,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminGlobalOrdersPage() {
  const {
    orderTypeTab,
    setOrderTypeTab,
    orderSearchQuery,
    setOrderSearchQuery,
    orderStatusFilter,
    setOrderStatusFilter,
    serviceOrders,
    merchantOrders,
    b2bPurchaseOrders,
    bookings,
    repo,
    user,
  } = useAdminOperations();

  type OrderData = ServiceOrder | MerchantOrder | B2BPurchaseOrder | DomainBooking;

  const [selectedEntity, setSelectedEntity] = useState<{
    type: "SERVICE" | "PRODUCT" | "B2B_PO" | "BOOKING";
    data: OrderData;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showInterventionModal, setShowInterventionModal] = useState<boolean>(false);
  const [interventionAction, setInterventionAction] = useState<"FORCE_COMPLETE" | "CANCEL_PENALTY">("FORCE_COMPLETE");
  const [interventionReason, setInterventionReason] = useState<string>("");

  // Tab counts
  const tabCounts = {
    SERVICE: serviceOrders.length,
    PRODUCT: merchantOrders.length,
    B2B_PO: b2bPurchaseOrders.length,
    BOOKING: bookings.length,
  };

  // Filtered lists per tab
  const filteredServiceOrders = serviceOrders.filter((o) => {
    const matchStatus = orderStatusFilter === "ALL" || o.status === orderStatusFilter;
    const q = orderSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.providerName.toLowerCase().includes(q) ||
      o.serviceTitle.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredProductOrders = merchantOrders.filter((o) => {
    const matchStatus = orderStatusFilter === "ALL" || o.status === orderStatusFilter;
    const q = orderSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.items.some((i) => i.title.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const filteredB2BPOs = b2bPurchaseOrders.filter((po) => {
    const matchStatus = orderStatusFilter === "ALL" || po.status === orderStatusFilter;
    const q = orderSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      po.poNumber.toLowerCase().includes(q) ||
      po.id.toLowerCase().includes(q) ||
      po.merchantName.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filteredBookings = bookings.filter((b) => {
    const matchStatus = orderStatusFilter === "ALL" || b.status === orderStatusFilter;
    const q = orderSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      b.id.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      b.serviceTitle.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleOpenIntervention = (type: "SERVICE" | "PRODUCT" | "B2B_PO" | "BOOKING", data: OrderData) => {
    setSelectedEntity({ type, data });
    setInterventionAction("FORCE_COMPLETE");
    setInterventionReason("");
    setShowInterventionModal(true);
  };

  const handleExecuteIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity) return;

    repo.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: "ADMIN_OPERATIONS",
      action: interventionAction === "FORCE_COMPLETE" ? "ORDER_FORCE_COMPLETE" : "ORDER_CANCEL_WITH_PENALTY",
      resource: selectedEntity.type,
      resourceId: selectedEntity.data.id,
      reason: interventionReason || "Intervensi operasional langsung oleh Administrator Platform",
      details: {
        orderType: selectedEntity.type,
        action: interventionAction,
      },
    });

    setToastMessage(`Intervensi operasional pada ${selectedEntity.data.id} berhasil diterapkan & dicatat ke Audit Logs.`);
    setTimeout(() => setToastMessage(null), 4000);
    setShowInterventionModal(false);
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
            <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <ShoppingCart size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Operasi Pesanan Global Platform (Global Orders)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan komprehensif lintas 4 kanal transaksi: Service Orders, Retail Product Orders, B2B Procurement PO, dan Booking Requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="md">
              Total {serviceOrders.length + merchantOrders.length + b2bPurchaseOrders.length + bookings.length} Transaksi Terdaftar
            </Badge>
          </div>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setOrderTypeTab("SERVICE");
            setOrderStatusFilter("ALL");
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            orderTypeTab === "SERVICE"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wrench size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">Service Orders</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              orderTypeTab === "SERVICE" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {tabCounts.SERVICE}
            </span>
          </div>
          <p className={`text-[11px] mt-1 line-clamp-1 ${orderTypeTab === "SERVICE" ? "text-indigo-100" : "text-slate-500"}`}>
            Reparasi &amp; Perawatan Jasa
          </p>
        </button>

        <button
          onClick={() => {
            setOrderTypeTab("PRODUCT");
            setOrderStatusFilter("ALL");
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            orderTypeTab === "PRODUCT"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Package size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">Product Orders</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              orderTypeTab === "PRODUCT" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {tabCounts.PRODUCT}
            </span>
          </div>
          <p className={`text-[11px] mt-1 line-clamp-1 ${orderTypeTab === "PRODUCT" ? "text-indigo-100" : "text-slate-500"}`}>
            Retail Suku Cadang Pelanggan
          </p>
        </button>

        <button
          onClick={() => {
            setOrderTypeTab("B2B_PO");
            setOrderStatusFilter("ALL");
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            orderTypeTab === "B2B_PO"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Buildings size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">B2B Purchase Orders</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              orderTypeTab === "B2B_PO" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {tabCounts.B2B_PO}
            </span>
          </div>
          <p className={`text-[11px] mt-1 line-clamp-1 ${orderTypeTab === "B2B_PO" ? "text-indigo-100" : "text-slate-500"}`}>
            Pengadaan Merchant ↔ Supplier
          </p>
        </button>

        <button
          onClick={() => {
            setOrderTypeTab("BOOKING");
            setOrderStatusFilter("ALL");
          }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            orderTypeTab === "BOOKING"
              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CalendarCheck size={18} weight="duotone" />
              <span className="text-xs font-bold font-heading">Booking Requests</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              orderTypeTab === "BOOKING" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {tabCounts.BOOKING}
            </span>
          </div>
          <p className={`text-[11px] mt-1 line-clamp-1 ${orderTypeTab === "BOOKING" ? "text-indigo-100" : "text-slate-500"}`}>
            Reservasi Permintaan Baru
          </p>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Cari dalam kanal ${orderTypeTab} (nomor referensi, pelanggan, mitra)...`}
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status Kanal</option>
              {orderTypeTab === "SERVICE" && (
                <>
                  <option value="BOOKED">BOOKED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </>
              )}
              {orderTypeTab === "PRODUCT" && (
                <>
                  <option value="PAID">PAID (Siap Kemas)</option>
                  <option value="PROCESSING">PROCESSING (Dalam Kemas)</option>
                  <option value="SHIPPED">SHIPPED (Dalam Pengiriman)</option>
                  <option value="DELIVERED">DELIVERED (Diterima)</option>
                </>
              )}
              {orderTypeTab === "B2B_PO" && (
                <>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="RECONCILED">RECONCILED</option>
                </>
              )}
              {orderTypeTab === "BOOKING" && (
                <>
                  <option value="PENDING_CONFIRMATION">PENDING_CONFIRMATION</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="CONVERTED_TO_ORDER">CONVERTED_TO_ORDER</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table per Tab */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {orderTypeTab === "SERVICE" && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">ID &amp; Layanan</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Mitra Provider</th>
                  <th className="px-4 py-3">Total Escrow</th>
                  <th className="px-4 py-3">Status Layanan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServiceOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{o.id}</span>
                      <p className="font-semibold text-slate-800 line-clamp-1">{o.serviceTitle}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{o.customerName}</span>
                      <p className="text-[11px] text-slate-400">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{o.providerName}</span>
                      <p className="text-[11px] text-indigo-600">{o.assignedWorker?.name || "Belum ditugaskan"}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      Rp {o.pricing.totalAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={o.status === "COMPLETED" ? "success" : o.status === "IN_PROGRESS" ? "primary" : "neutral"} size="sm">
                        {o.statusLabel || o.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedEntity({ type: "SERVICE", data: o })}>
                          <Eye size={12} className="mr-1" /> Detail
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleOpenIntervention("SERVICE", o)} className="bg-indigo-600 text-white">
                          Intervensi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {orderTypeTab === "PRODUCT" && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">No. Order &amp; Item</th>
                  <th className="px-4 py-3">Pembeli &amp; Alamat</th>
                  <th className="px-4 py-3">Total Transaksi</th>
                  <th className="px-4 py-3">Kurir &amp; Resi</th>
                  <th className="px-4 py-3">Status Pesanan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProductOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                      <p className="text-[11px] text-slate-600 line-clamp-1">{o.items.map((i) => `${i.title} (${i.quantity}x)`).join(", ")}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{o.customerName}</span>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{o.shippingAddress}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      Rp {o.totalAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-700">{o.courierName || "Standar Kurir"}</span>
                      <p className="font-mono text-[10px] text-slate-400">{o.trackingNumber || "Menunggu Resi"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={o.status === "DELIVERED" ? "success" : o.status === "SHIPPED" ? "primary" : "warning"} size="sm">
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedEntity({ type: "PRODUCT", data: o })}>
                          <Eye size={12} className="mr-1" /> Detail
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleOpenIntervention("PRODUCT", o)} className="bg-indigo-600 text-white">
                          Intervensi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {orderTypeTab === "B2B_PO" && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">No. PO B2B</th>
                  <th className="px-4 py-3">Merchant Pembeli</th>
                  <th className="px-4 py-3">Supplier Distributor</th>
                  <th className="px-4 py-3">Gudang Tujuan</th>
                  <th className="px-4 py-3">Nilai Faktur B2B</th>
                  <th className="px-4 py-3">Status Pengadaan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredB2BPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{po.poNumber}</span>
                      <p className="text-[11px] text-slate-400">{po.items.length} Macam Suku Cadang</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{po.merchantName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{po.supplierName}</span>
                      <p className="text-[10px] text-slate-400">Term: {po.paymentTerms}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-700">{po.warehouseName}</span>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                      Rp {po.totalAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={po.status === "RECONCILED" || po.status === "DELIVERED" ? "success" : "primary"} size="sm">
                        {po.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedEntity({ type: "B2B_PO", data: po })}>
                          <Eye size={12} className="mr-1" /> Detail
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleOpenIntervention("B2B_PO", po)} className="bg-indigo-600 text-white">
                          Intervensi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {orderTypeTab === "BOOKING" && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">ID Booking &amp; Layanan</th>
                  <th className="px-4 py-3">Pemesan</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3">Jadwal Diminta</th>
                  <th className="px-4 py-3">Status Reservasi</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900">{b.id}</span>
                      <p className="font-semibold text-slate-800 line-clamp-1">{b.serviceTitle}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{b.customerName}</span>
                      <p className="text-[11px] text-slate-400">{b.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[11px] text-slate-600 line-clamp-1">{b.address}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{b.requestedDate}</span>
                      <p className="text-[11px] text-slate-500">{b.requestedTimeSlot}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={b.status === "CONVERTED_TO_ORDER" ? "success" : b.status === "ACCEPTED" ? "primary" : "warning"} size="sm">
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedEntity({ type: "BOOKING", data: b })}>
                          <Eye size={12} className="mr-1" /> Detail
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleOpenIntervention("BOOKING", b)} className="bg-indigo-600 text-white">
                          Intervensi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEntity && !showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">Kanal: {selectedEntity.type}</span>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Rincian Transaksi {"orderNumber" in selectedEntity.data ? selectedEntity.data.orderNumber : "poNumber" in selectedEntity.data ? selectedEntity.data.poNumber : selectedEntity.data.id}
                </h3>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="text-slate-400 hover:text-slate-600 text-sm p-1">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Status Resmi:</span>
                <Badge variant="primary" size="sm">{selectedEntity.data.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan / Pembeli:</span>
                <span className="font-bold text-slate-800">
                  {"customerName" in selectedEntity.data ? selectedEntity.data.customerName : "merchantName" in selectedEntity.data ? selectedEntity.data.merchantName : "-"}
                </span>
              </div>
              {"totalAmount" in selectedEntity.data && typeof selectedEntity.data.totalAmount === "number" && (
                <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-slate-900">
                  <span>Total Nilai Transaksi:</span>
                  <span className="font-mono text-indigo-700">Rp {selectedEntity.data.totalAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEntity(null)}>
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowInterventionModal(true);
                }}
                className="bg-indigo-600 text-white"
              >
                Tindakan Intervensi Admin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {showInterventionModal && selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <WarningCircle size={22} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Intervensi Operasional Administratif
                </h3>
              </div>
              <button onClick={() => setShowInterventionModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-bold">Protokol Keamanan Transaksi:</p>
              <p className="text-[11px] mt-0.5 text-amber-800">
                Tindakan ini akan memodifikasi alur status secara langsung. Seluruh keputusan dan alasan akan terekam permanen dalam <strong>Audit Trail Logs</strong>.
              </p>
            </div>

            <form onSubmit={handleExecuteIntervention} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Intervensi</label>
                <select
                  value={interventionAction}
                  onChange={(e) => setInterventionAction(e.target.value as "FORCE_COMPLETE" | "CANCEL_PENALTY")}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                >
                  <option value="FORCE_COMPLETE">Paksa Selesai (Force-Complete pasca verifikasi fisik)</option>
                  <option value="CANCEL_PENALTY">Batalkan Pesanan dengan Penalti Pelanggaran</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alasan &amp; Dasar Keputusan Intervensi (Wajib)</label>
                <textarea
                  required
                  rows={3}
                  value={interventionReason}
                  onChange={(e) => setInterventionReason(e.target.value)}
                  placeholder="Tuliskan justifikasi operasional..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setShowInterventionModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                  Terapkan &amp; Catat Audit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
