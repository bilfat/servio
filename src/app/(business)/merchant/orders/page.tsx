"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  ClipboardText,
  MagnifyingGlass,
  CheckCircle,
  Package,
  Clock,
  User,
  MapPin,
  Eye,
  Sparkle,
  Truck,
  ArrowsClockwise,
  ArrowSquareOut,
  Funnel,
  Buildings,
  Wrench,
  ShieldCheck,
  WarningCircle,
  Info,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { MerchantOrder, MerchantOrderStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { getAffiliateStatusBadgeInfo } from "@/lib/policy/affiliatePolicy";
import { productOrdersApi, fulfillmentApi } from "@/lib/servioApi";

type OrderSourceTab = "ALL" | "DIRECT" | "AFFILIATE";
type OrderStatusTab = "ALL" | "NEW" | "IN_PROGRESS" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CLOSED";

function MerchantOrdersContent() {
  const { orders: localOrders, updateOrderStatus, fulfillments, shipments, returns } = useMerchantOperations();

  // E1: Top Level Source Filter
  const [sourceTab, setSourceTab] = useUrlQueryState<OrderSourceTab>("source", "ALL");
  const [statusTab, setStatusTab] = useUrlQueryState<OrderStatusTab>("status", "ALL");
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("q", "");

  // Optional multi-dimensional filters
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedWorker, setSelectedWorker] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Server Orders Integration (Live from REST API + MongoDB)
  const [serverOrders, setServerOrders] = useState<any[]>([]);

  const loadServerOrders = async () => {
    try {
      const res = await productOrdersApi.list();
      if (res && res.data && Array.isArray(res.data)) {
        setServerOrders(res.data);
      }
    } catch (err) {
      console.warn("Could not load backend merchant orders:", err);
    }
  };

  React.useEffect(() => {
    loadServerOrders();
  }, []);

  // QC Inspection Modal state
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [qcTargetOrder, setQcTargetOrder] = useState<MerchantOrder | null>(null);
  const [qcNotes, setQcNotes] = useState("");
  const [qcChecklist, setQcChecklist] = useState({
    itemsMatch: true,
    qualityGood: true,
    packageSealed: true,
  });

  // Map server product orders to MerchantOrder format (Strictly Deduplicated by Order ID)
  const mappedServerOrders: MerchantOrder[] = useMemo(() => {
    const seen = new Set<string>();
    const list: MerchantOrder[] = [];

    for (const so of serverOrders) {
      const id = so.orderId || so._id;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const st = (so.status || "NEW").toUpperCase();
      let merchantStatus: MerchantOrderStatus = "NEW";
      if (st === "PAID" || st === "NEW") merchantStatus = "NEW";
      else if (st === "PROCESSING" || st === "PICKING") merchantStatus = "PICKING";
      else if (st === "PACKED") merchantStatus = "PACKED";
      else if (st === "READY_TO_HANDOVER" || st === "CONFIRMED" || st === "QC_PASSED") merchantStatus = "CONFIRMED";
      else if (st === "SHIPPED" || st === "IN_TRANSIT" || st === "ON_DELIVERY") merchantStatus = "SHIPPED";
      else if (st === "DELIVERED") merchantStatus = "DELIVERED";
      else if (st === "COMPLETED") merchantStatus = "COMPLETED";
      else if (st === "CANCELLED") merchantStatus = "CANCELLED";

      list.push({
        id,
        orderNumber: so.orderNumber || `PO-${(so.orderId || "").slice(-6)}`,
        customerId: so.customerId || "CUST-001",
        customerName: so.shippingAddressSnapshot?.recipientName || so.shippingAddress?.recipientName || "Pelanggan SERVIO",
        customerPhone: so.shippingAddressSnapshot?.phone || so.shippingAddress?.phone || "-",
        shippingAddress: so.shippingAddressSnapshot?.street || so.shippingAddress?.street || "-",
        items: (so.items || []).map((it: any) => ({
          productId: it.productId || "PROD-001",
          sku: it.variantId || it.variantNameSnapshot || "VAR-STD",
          title: it.productNameSnapshot || it.productTitle || "Suku Cadang",
          quantity: it.quantity || 1,
          unitPrice: it.unitPriceSnapshot || it.unitPrice || 0,
          totalPrice: it.subtotalSnapshot || ((it.unitPriceSnapshot || it.unitPrice || 0) * (it.quantity || 1)),
        })),
        subtotal: so.subtotal || 0,
        shippingFee: so.shippingAmount || 0,
        platformFee: so.feeAmount || 0,
        totalAmount: so.totalAmount || 0,
        status: merchantStatus,
        paymentMethod: "Virtual Account",
        paymentStatus: "PAID",
        createdAt: so.createdAt ? new Date(so.createdAt).toLocaleString("id-ID") : "Baru saja",
        updatedAt: so.updatedAt ? new Date(so.updatedAt).toLocaleString("id-ID") : "Baru saja",
        orderSource: "DIRECT",
        fulfillmentId: so.fulfillmentId,
        shipmentId: so.shipmentId,
      });
    }

    return list;
  }, [serverOrders]);

  // Combined orders list (Strict deduplication against localOrders)
  const orders = useMemo(() => {
    const seen = new Set<string>();
    const result: MerchantOrder[] = [];

    for (const m of mappedServerOrders) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push(m);
      }
    }

    for (const l of localOrders) {
      if (!seen.has(l.id) && !seen.has(l.orderNumber)) {
        seen.add(l.id);
        seen.add(l.orderNumber);
        result.push(l);
      }
    }

    return result;
  }, [mappedServerOrders, localOrders]);

  // Extract distinct providers and workers for optional filters
  const providersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const p = o.serviceContext?.providerName || o.affiliateAttribution?.providerName;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [orders]);

  const workersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const w = o.serviceContext?.workerName || o.affiliateAttribution?.workerName;
      if (w) set.add(w);
    });
    return Array.from(set);
  }, [orders]);

  // Counts for Source Filter
  const sourceCounts = useMemo(() => {
    const total = orders.length;
    const direct = orders.filter((o) => o.orderSource !== "SERVICE_RECOMMENDATION" && !o.affiliateAttribution).length;
    const affiliate = orders.filter((o) => o.orderSource === "SERVICE_RECOMMENDATION" || !!o.affiliateAttribution).length;
    return { total, direct, affiliate };
  }, [orders]);

  // Status lifecycle tab definitions
  const statusTabs: { id: OrderStatusTab; label: string; count?: number }[] = [
    { id: "ALL", label: "Semua Status" },
    {
      id: "NEW",
      label: "Pesanan Baru",
      count: orders.filter((o) => o.status === "NEW").length,
    },
    {
      id: "IN_PROGRESS",
      label: "Diproses / Picking",
      count: orders.filter((o) => ["CONFIRMED", "PICKING", "PACKED"].includes(o.status)).length,
    },
    {
      id: "SHIPPED",
      label: "Dalam Pengiriman",
      count: orders.filter((o) => o.status === "SHIPPED").length,
    },
    {
      id: "DELIVERED",
      label: "Tiba di Tujuan",
      count: orders.filter((o) => o.status === "DELIVERED").length,
    },
    {
      id: "COMPLETED",
      label: "Selesai",
      count: orders.filter((o) => o.status === "COMPLETED").length,
    },
    {
      id: "CLOSED",
      label: "Dibatalkan / Retur",
      count: orders.filter((o) => ["CANCELLED", "RETURNED"].includes(o.status)).length,
    },
  ];

  // Operational transition handlers
  const handleStartProcessing = async (order: MerchantOrder) => {
    try {
      await fulfillmentApi.start(order.id);
      handleStatusTransition(order.id, order.orderNumber, "PICKING", "Sedang Picking");
      loadServerOrders();
    } catch (err: any) {
      console.warn("Fulfillment start error:", err);
      handleStatusTransition(order.id, order.orderNumber, "PICKING", "Sedang Picking");
    }
  };

  const handlePackOrder = async (order: MerchantOrder) => {
    try {
      const fId = order.fulfillmentId || order.id;
      await fulfillmentApi.pack(fId);
      handleStatusTransition(order.id, order.orderNumber, "PACKED", "Selesai Dikemas (PACKED)");
      loadServerOrders();
    } catch (err: any) {
      console.warn("Fulfillment pack error:", err);
      handleStatusTransition(order.id, order.orderNumber, "PACKED", "Selesai Dikemas (PACKED)");
    }
  };

  const handleOpenQc = (order: MerchantOrder) => {
    setQcTargetOrder(order);
    setQcNotes("");
    setQcChecklist({ itemsMatch: true, qualityGood: true, packageSealed: true });
    setIsQcModalOpen(true);
  };

  const handleQcSubmit = async (passed: boolean) => {
    if (!qcTargetOrder) return;
    try {
      const fId = qcTargetOrder.fulfillmentId || qcTargetOrder.id;
      await fulfillmentApi.qc(fId, { passed, notes: qcNotes });
      if (passed) {
        handleStatusTransition(qcTargetOrder.id, qcTargetOrder.orderNumber, "CONFIRMED", "Lulus QC & Siap Serah Kurir");
      } else {
        setToastMessage(`Pemeriksaan QC ${qcTargetOrder.orderNumber} ditandai GAGAL. Pengiriman ditahan.`);
      }
      setIsQcModalOpen(false);
      loadServerOrders();
    } catch (err: any) {
      console.warn("Fulfillment QC error:", err);
      setIsQcModalOpen(false);
    }
  };

  const handleHandover = async (order: MerchantOrder) => {
    try {
      const fId = order.fulfillmentId || order.id;
      await fulfillmentApi.handover(fId);
      handleStatusTransition(order.id, order.orderNumber, "SHIPPED", "Diserahkan ke Kurir (SHIPPED)");
      loadServerOrders();
    } catch (err: any) {
      console.warn("Fulfillment handover error:", err);
      handleStatusTransition(order.id, order.orderNumber, "SHIPPED", "Diserahkan ke Kurir (SHIPPED)");
    }
  };

  // Multi-dimensional filtering logic (E1 & E13)
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Source filter
      const isAffiliate = order.orderSource === "SERVICE_RECOMMENDATION" || !!order.affiliateAttribution;
      if (sourceTab === "DIRECT" && isAffiliate) return false;
      if (sourceTab === "AFFILIATE" && !isAffiliate) return false;

      // 2. Status tab filter
      if (statusTab === "NEW" && order.status !== "NEW") return false;
      if (statusTab === "IN_PROGRESS" && !["CONFIRMED", "PICKING", "PACKED"].includes(order.status)) return false;
      if (statusTab === "SHIPPED" && order.status !== "SHIPPED") return false;
      if (statusTab === "DELIVERED" && order.status !== "DELIVERED") return false;
      if (statusTab === "COMPLETED" && order.status !== "COMPLETED") return false;
      if (statusTab === "CLOSED" && !["CANCELLED", "RETURNED"].includes(order.status)) return false;

      // 3. Provider filter
      if (selectedProvider !== "ALL") {
        const orderProvider = order.serviceContext?.providerName || order.affiliateAttribution?.providerName;
        if (orderProvider !== selectedProvider) return false;
      }

      // 4. Worker filter
      if (selectedWorker !== "ALL") {
        const orderWorker = order.serviceContext?.workerName || order.affiliateAttribution?.workerName;
        if (orderWorker !== selectedWorker) return false;
      }

      // 5. Search query (order ID, customer, product, service order, provider, worker)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchOrderId = order.orderNumber.toLowerCase().includes(query);
        const matchCustomer = order.customerName.toLowerCase().includes(query);
        const matchProduct = order.items.some((i) => i.title.toLowerCase().includes(query) || i.sku.toLowerCase().includes(query));
        const matchServiceOrder = order.serviceOrderId?.toLowerCase().includes(query) || order.serviceContext?.serviceOrderId.toLowerCase().includes(query);
        const matchProvider = (order.serviceContext?.providerName || order.affiliateAttribution?.providerName || "").toLowerCase().includes(query);
        const matchWorker = (order.serviceContext?.workerName || order.affiliateAttribution?.workerName || "").toLowerCase().includes(query);

        if (!matchOrderId && !matchCustomer && !matchProduct && !matchServiceOrder && !matchProvider && !matchWorker) {
          return false;
        }
      }

      return true;
    });
  }, [orders, sourceTab, statusTab, selectedProvider, selectedWorker, searchQuery]);

  const handleStatusTransition = (
    orderId: string,
    orderNumber: string,
    newStatus: MerchantOrderStatus,
    labelMsg: string
  ) => {
    updateOrderStatus(orderId, newStatus);
    setToastMessage(`Status pesanan ${orderNumber} berhasil diubah ke: ${labelMsg}`);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const getStatusBadge = (status: MerchantOrderStatus) => {
    switch (status) {
      case "NEW":
        return <Badge variant="danger" size="sm">Pesanan Baru</Badge>;
      case "CONFIRMED":
        return <Badge variant="warning" size="sm">Terkonfirmasi</Badge>;
      case "PICKING":
        return <Badge variant="primary" size="sm">Picking Barang</Badge>;
      case "PACKED":
        return <Badge variant="primary" size="sm">Siap Kirim (Packed)</Badge>;
      case "SHIPPED":
        return <Badge variant="neutral" size="sm">Sedang Dikirim</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="sm">Tiba di Tujuan</Badge>;
      case "COMPLETED":
        return <Badge variant="success" size="sm">Selesai</Badge>;
      case "CANCELLED":
        return <Badge variant="neutral" size="sm">Dibatalkan</Badge>;
      case "RETURNED":
        return <Badge variant="danger" size="sm">Diretur</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-body">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ClipboardText size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Manajemen Pesanan Toko
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Single Order Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola seluruh siklus pesanan suku cadang, baik pembelian langsung maupun atribusi afiliasi rekanan bengkel.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pesanan</span>
                <span className="text-base font-bold font-mono text-slate-900">{sourceCounts.total}</span>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-2 text-right">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Afiliasi Rekanan</span>
                <span className="text-base font-bold font-mono text-purple-900">{sourceCounts.affiliate}</span>
              </div>
            </div>
          </div>

          {/* E1: CANONICAL SOURCE FILTER TABS */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                PESANAN:
              </span>
              <button
                type="button"
                onClick={() => setSourceTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceTab === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Semua</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${sourceTab === "ALL" ? "bg-slate-100 text-slate-700" : "bg-white text-slate-500"}`}>
                  {sourceCounts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSourceTab("DIRECT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceTab === "DIRECT"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Langsung</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${sourceTab === "DIRECT" ? "bg-slate-100 text-slate-700" : "bg-white text-slate-500"}`}>
                  {sourceCounts.direct}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSourceTab("AFFILIATE")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sourceTab === "AFFILIATE"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-purple-700 hover:text-purple-900"
                }`}
              >
                <Sparkle size={13} weight="fill" />
                <span>Affiliate</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${sourceTab === "AFFILIATE" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"}`}>
                  {sourceCounts.affiliate}
                </span>
              </button>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                showFilters || selectedProvider !== "ALL" || selectedWorker !== "ALL"
                  ? "bg-primary/5 text-primary border-primary/30"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Funnel size={14} weight="bold" />
              <span>Filter Spesifik</span>
              {(selectedProvider !== "ALL" || selectedWorker !== "ALL") && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>

          {/* Secondary Status Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {statusTabs.map((tab) => {
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expandable Multi-dimensional Filters */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Filter Bengkel (Provider):
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Semua Bengkel Mitra</option>
                  {providersList.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Filter Teknisi (Worker):
                </label>
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Semua Teknisi Lapangan</option>
                  {workersList.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedProvider("ALL");
                    setSelectedWorker("ALL");
                    setSearchQuery("");
                  }}
                >
                  Reset Seluruh Filter
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari order ID, pelanggan, suku cadang, service order (#SRV-...), bengkel, atau teknisi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Reset
            </Button>
          )}
        </div>

        {/* Order Table / List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Tidak ada pesanan pada filter ini"
              description="Coba ubah filter kategori pesanan, status pesanan, atau kata kunci pencarian Anda."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Pesanan / Tanggal</th>
                    <th className="py-3 px-4">Atribusi Sumber</th>
                    <th className="py-3 px-4">Pelanggan & Alamat</th>
                    <th className="py-3 px-4">Barang Suku Cadang</th>
                    <th className="py-3 px-4 text-right">Total Transaksi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Alur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.map((order, idx) => {
                    const isAffiliate =
                      order.orderSource === "SERVICE_RECOMMENDATION" || !!order.affiliateAttribution;
                    const workerName =
                      order.serviceContext?.workerName || order.affiliateAttribution?.workerName;
                    const providerName =
                      order.serviceContext?.providerName || order.affiliateAttribution?.providerName;
                    const serviceOrderId =
                      order.serviceOrderId || order.serviceContext?.serviceOrderId;

                    return (
                      <tr
                        key={`${order.id}-${idx}`}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Order Number & Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>{order.orderNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock size={12} />
                            {order.createdAt}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            {order.paymentMethod}
                          </div>
                        </td>

                        {/* E2: AFFILIATE BADGE & METADATA */}
                        <td className="py-3.5 px-4">
                          {isAffiliate ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                                <Sparkle size={12} weight="fill" className="text-purple-600" />
                                AFFILIATE
                              </span>
                              <div className="text-[10px] text-slate-500 leading-tight space-y-0.5">
                                <div>
                                  Rekomendasi: <strong className="text-slate-800">{workerName || "Teknisi"}</strong>
                                </div>
                                <div className="text-slate-400 truncate max-w-[180px]">
                                  {providerName || "Bengkel Mitra"}
                                </div>
                                {serviceOrderId && (
                                  <div className="font-mono text-purple-700 font-semibold">
                                    #{serviceOrderId}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              LANGSUNG
                            </span>
                          )}
                        </td>

                        {/* Customer & Address */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" />
                            {order.customerName}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                            {order.shippingAddress}
                          </div>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-slate-700">
                                <span className="line-clamp-1 font-medium">{item.title}</span>
                                <span className="font-mono font-bold ml-2 shrink-0 text-slate-900">
                                  {item.quantity}x
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            Rp {order.totalAmount.toLocaleString("id-ID")}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Ongkir: Rp {order.shippingFee.toLocaleString("id-ID")}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(order.status)}
                        </td>

                        {/* Operational Actions (E5, E6, E7) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              title="Lihat Detail Pesanan & Konteks Servis"
                              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/40 transition-colors"
                            >
                              <Eye size={16} />
                            </button>

                            {order.status === "NEW" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartProcessing(order)}
                                className="flex items-center gap-1"
                              >
                                <CheckCircle size={14} weight="bold" />
                                <span>Proses Pesanan</span>
                              </Button>
                            )}

                            {order.status === "PICKING" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePackOrder(order)}
                                className="flex items-center gap-1 text-primary border-primary/20"
                              >
                                <Package size={14} weight="bold" />
                                <span>Kemas (Pack)</span>
                              </Button>
                            )}

                            {order.status === "PACKED" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenQc(order)}
                                className="flex items-center gap-1 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
                              >
                                <ShieldCheck size={14} weight="bold" />
                                <span>Pemeriksaan QC</span>
                              </Button>
                            )}

                            {order.status === "CONFIRMED" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleHandover(order)}
                                className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700"
                              >
                                <Truck size={14} weight="bold" />
                                <span>Serahkan Kurir</span>
                              </Button>
                            )}

                            {order.status === "SHIPPED" && (
                              <span className="text-[11px] text-slate-500 font-medium italic">
                                Dalam Pengiriman
                              </span>
                            )}

                            {order.status === "DELIVERED" && (
                              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle size={13} weight="fill" />
                                Tiba di Tujuan
                              </span>
                            )}
                          </div>
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

      {/* E3, E4, E6, E7, E8: ORDER DETAIL MODAL */}
      {selectedOrder && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title={`Detail Pesanan ${selectedOrder.orderNumber}`}
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedOrder.orderNumber}
                  </span>
                  {selectedOrder.orderSource === "SERVICE_RECOMMENDATION" || !!selectedOrder.affiliateAttribution ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                      <Sparkle size={11} weight="fill" className="text-purple-600" />
                      AFFILIATE
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      LANGSUNG
                    </span>
                  )}
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Waktu Pemesanan:</span>
                  <span className="font-medium text-slate-800">{selectedOrder.createdAt}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Metode Pembayaran:</span>
                  <span className="font-medium text-slate-800">{selectedOrder.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* E4: SERVICE CONTEXT BLOCK */}
            {(selectedOrder.serviceOrderId || selectedOrder.serviceContext) && (
              <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                  <Wrench size={16} weight="duotone" className="text-sky-700" />
                  <span>Konteks Service Order Terkait (Operasional)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nomor Order Jasa:</span>
                    <span className="font-mono font-bold text-sky-800">
                      #{selectedOrder.serviceOrderId || selectedOrder.serviceContext?.serviceOrderId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nama Layanan Servis:</span>
                    <span className="font-medium truncate block">
                      {selectedOrder.serviceContext?.serviceTitle || "Perbaikan Unit AC"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bengkel Rekanan:</span>
                    <span className="font-medium">{selectedOrder.serviceContext?.providerName || "PT Servio Mandiri Teknik"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Teknisi Lapangan:</span>
                    <span className="font-medium">{selectedOrder.serviceContext?.workerName || "Andi"}</span>
                  </div>
                </div>
                {selectedOrder.sparepartRequirementId && (
                  <div className="text-[10px] text-sky-700 bg-sky-100/50 px-2 py-1 rounded-lg">
                    Kebutuhan Suku Cadang: <code className="font-mono font-bold">{selectedOrder.sparepartRequirementId}</code>
                  </div>
                )}
              </div>
            )}

            {/* E3: AFFILIATE ATTRIBUTION BLOCK */}
            {selectedOrder.affiliateAttribution && (
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-purple-950 font-bold">
                    <Sparkle size={16} weight="fill" className="text-purple-600" />
                    <span>AFFILIATE ATTRIBUTION</span>
                  </div>
                  {(() => {
                    const badge = getAffiliateStatusBadgeInfo(selectedOrder.affiliateAttribution.eligibilityStatus);
                    return (
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white/70 p-2.5 rounded-xl border border-purple-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sumber Atribusi:</span>
                    <span className="font-semibold text-slate-800 font-mono text-[10px]">
                      {selectedOrder.affiliateAttribution.source}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Kelayakan:</span>
                    <span className="font-semibold text-purple-900">
                      {selectedOrder.affiliateAttribution.eligibilityStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bengkel Penerima Reward:</span>
                    <span className="font-medium">{selectedOrder.affiliateAttribution.providerName || "PT Servio Mandiri Teknik"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Teknisi Perujuk:</span>
                    <span className="font-medium">{selectedOrder.affiliateAttribution.workerName || "Andi"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Toko Mitra Penjual:</span>
                    <span className="font-medium">{selectedOrder.affiliateAttribution.merchantName || "Sejuk Sentra Part AC"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Suku Cadang Teratribusi:</span>
                    <span className="font-medium truncate block">{selectedOrder.affiliateAttribution.productTitle || selectedOrder.items[0]?.title}</span>
                  </div>
                </div>

                {/* Reward Projection Info (Policy-governed, Informational only) */}
                <div className="bg-purple-100/50 p-2.5 rounded-xl border border-purple-200/60 text-[11px] text-purple-950 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Proyeksi Reward Kebijakan:</span>
                    <span className="text-purple-700">
                      +{selectedOrder.affiliateAttribution.pointsProvider || 50} pts Bengkel • +{selectedOrder.affiliateAttribution.pointsWorker || 30} pts Teknisi
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700">
                    Otoritatif Sistem: Dihitung terpusat berdasarkan kebijakan kemitraan. Merchant tidak memiliki wewenang mengubah saldo/poin teknisi atau bengkel.
                  </p>
                  {selectedOrder.affiliateAttribution.reversalReason && (
                    <div className="text-rose-700 bg-rose-50 p-1.5 rounded text-[10px] font-semibold border border-rose-200">
                      Alasan Pembatalan Reward: {selectedOrder.affiliateAttribution.reversalReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customer & Address */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User size={14} />
                <span>{selectedOrder.customerName} ({selectedOrder.customerPhone})</span>
              </div>
              <div className="text-slate-600 flex items-start gap-1.5">
                <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400" />
                <span>{selectedOrder.shippingAddress}</span>
              </div>
              {selectedOrder.notes && (
                <div className="text-amber-800 bg-amber-50 p-2 rounded-xl text-[11px] mt-2 border border-amber-200">
                  Catatan: &ldquo;{selectedOrder.notes}&rdquo;
                </div>
              )}
            </div>

            {/* Order Items */}
            <div>
              <span className="font-semibold text-slate-800 block mb-2">Item Suku Cadang:</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.title}</div>
                      <div className="text-slate-400 font-mono text-[10px]">Varian: {item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-800">
                        {item.quantity} x Rp {item.unitPrice.toLocaleString("id-ID")}
                      </div>
                      <div className="font-mono text-primary font-bold">
                        Rp {item.totalPrice.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 20 & 21: AFFILIATE ORDER / SETTLEMENT STATEMENT */}
            {(selectedOrder.orderSource === "SERVICE_RECOMMENDATION" || !!selectedOrder.affiliateAttribution) && (
              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between font-bold text-purple-950 font-sans border-b border-purple-200 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkle size={15} weight="fill" className="text-purple-600" />
                    <span>AFFILIATE ORDER / SETTLEMENT STATEMENT</span>
                  </span>
                  <Badge variant="secondary" size="sm">SNAPSHOT {selectedOrder.affiliateFeePolicyVersion || "AFF-001"}</Badge>
                </div>
                
                <div className="space-y-1 pt-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal Barang (Eligible):</span>
                    <span className="font-semibold text-slate-900">Rp {selectedOrder.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-purple-900">
                    <span>Affiliate Fee ({((selectedOrder.affiliateFeeRateSnapshot || 0.05) * 100).toFixed(0)}%):</span>
                    <span className="font-bold text-rose-600">- Rp {(selectedOrder.affiliateFeeAmount || Math.round(selectedOrder.subtotal * 0.05)).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Potongan Lainnya:</span>
                    <span>Rp 0</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 border-t border-purple-200 pt-1.5 text-sm">
                    <span>Net Merchant Settlement:</span>
                    <span className="text-emerald-700">
                      Rp {(selectedOrder.netMerchantSettlement !== undefined ? selectedOrder.netMerchantSettlement : selectedOrder.subtotal - (selectedOrder.affiliateFeeAmount || Math.round(selectedOrder.subtotal * 0.05))).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="font-sans text-[10px] text-purple-700 bg-purple-100/60 p-2 rounded-xl mt-1 leading-relaxed">
                  <strong>Aturan Finansial:</strong> Affiliate Fee dipotong 1x pada settlement toko sebagai sumber pool reward. Pelanggan TIDAK dikenakan biaya tambahan afiliasi (No Customer Surcharge).
                </div>
              </div>
            )}

            {/* Customer Payable Breakdown */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1 font-mono">
              <div className="text-[11px] font-bold text-slate-700 font-sans border-b border-slate-200 pb-1 mb-1">
                Rincian Tagihan Pelanggan (Customer Payable)
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Barang:</span>
                <span>Rp {selectedOrder.subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ongkos Kirim Kurir:</span>
                <span>Rp {selectedOrder.shippingFee.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
                <span>Total Pembayaran Pelanggan:</span>
                <span className="text-primary">Rp {(selectedOrder.subtotal + selectedOrder.shippingFee).toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* E6, E7, E8: INTEGRATION SHORTCUTS TO FULFILLMENT, SHIPPING & RETURNS */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link
                href="/merchant/fulfillment"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-primary/40 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-700 transition"
              >
                <div className="flex items-center gap-1.5">
                  <Package size={16} className="text-primary" />
                  <span>Fulfillment Toko</span>
                </div>
                <ArrowSquareOut size={13} />
              </Link>

              <Link
                href="/merchant/shipping"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-primary/40 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-700 transition"
              >
                <div className="flex items-center gap-1.5">
                  <Truck size={16} className="text-sky-600" />
                  <span>Pengiriman Kurir</span>
                </div>
                <ArrowSquareOut size={13} />
              </Link>

              <Link
                href="/merchant/returns"
                className="p-2.5 rounded-xl border border-slate-200 hover:border-primary/40 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-[11px] font-semibold text-slate-700 transition"
              >
                <div className="flex items-center gap-1.5">
                  <ClockCounterClockwise size={16} className="text-rose-600" />
                  <span>Klaim Retur</span>
                </div>
                <ArrowSquareOut size={13} />
              </Link>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(null)}
              >
                Tutup
              </Button>
              {selectedOrder.status === "NEW" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleStartProcessing(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  Mulai Proses Pesanan
                </Button>
              )}
              {selectedOrder.status === "PICKING" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handlePackOrder(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  Kemas Pesanan (Pack)
                </Button>
              )}
              {selectedOrder.status === "PACKED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = selectedOrder;
                    setSelectedOrder(null);
                    handleOpenQc(target);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Pemeriksaan QC
                </Button>
              )}
              {selectedOrder.status === "CONFIRMED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleHandover(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="bg-sky-600 hover:bg-sky-700"
                >
                  Serahkan ke Kurir
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* QC INSPECTION MODAL */}
      {isQcModalOpen && qcTargetOrder && (
        <Modal
          isOpen={true}
          onClose={() => setIsQcModalOpen(false)}
          title={`Pemeriksaan QC Mutu — ${qcTargetOrder.orderNumber}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Verifikasi checklist kelayakan suku cadang sebelum paket diserahkan ke kurir ekspedisi:
            </p>

            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={qcChecklist.itemsMatch}
                  onChange={(e) => setQcChecklist({ ...qcChecklist, itemsMatch: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Kesesuaian suku cadang & varian tepat 100%</span>
              </label>
              <label className="flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={qcChecklist.qualityGood}
                  onChange={(e) => setQcChecklist({ ...qcChecklist, qualityGood: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Kondisi fisik barang baru, mulus, dan bebas cacat</span>
              </label>
              <label className="flex items-center gap-2 text-slate-800 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={qcChecklist.packageSealed}
                  onChange={(e) => setQcChecklist({ ...qcChecklist, packageSealed: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Kemasan tersegel rapi dengan pelindung standar pengiriman</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Catatan QC (Opsional):</label>
              <textarea
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                placeholder="Catatan hasil inspeksi..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-primary"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQcSubmit(false)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Gagal QC (Tahan Pengiriman)
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleQcSubmit(true)}
                disabled={!qcChecklist.itemsMatch || !qcChecklist.qualityGood || !qcChecklist.packageSealed}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Lulus QC & Siap Serah Kurir
              </Button>
            </div>
          </div>
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

export default function MerchantOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Pesanan Toko...</div>}>
      <MerchantOrdersContent />
    </Suspense>
  );
}
