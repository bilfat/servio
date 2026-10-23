"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { StatusBadge, StatusVariant } from "@/components/data-display/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CustomerDemoScenarioSelector } from "@/components/navigation/CustomerDemoScenarioSelector";
import { OrderStatus, MerchantOrder } from "@/types/domain";
import {
  Wrench,
  Clock,
  CalendarBlank,
  ArrowRight,
  MagnifyingGlass,
  CreditCard,
  CheckCircle,
  WarningCircle,
  Package,
  NavigationArrow,
  ShieldCheck,
  Storefront,
  Truck,
  CaretRight,
  ArrowsClockwise,
} from "@phosphor-icons/react";

import { useOrderBarang } from "@/features/order-barang/hooks/useOrderBarang";
import { MockMerchantOrder } from "@/types/order-barang";
import { CustomerOrderCard } from "@/features/order-barang/components/CustomerOrderCard";
import {
  CancelUnpaidCheckoutModal,
  CancelConfirmedModal,
  RequestCancellationModal,
  ConfirmDeliveredModal,
  ReceiptModal,
  TrackingModal,
} from "@/features/order-barang/components/CustomerOrderModals";
import { Toast } from "@/components/feedback/Toast";

type OrderDomain = "PRODUCT" | "SERVICE";
type ProductFilterTab = "BELUM_BAYAR" | "DIPROSES" | "DIKIRIM" | "SELESAI" | "BATAL";
type ServiceFilterTab = "ALL" | "ACTION_REQUIRED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function OrderListPage() {
  const router = useRouter();
  const repo = useDomainRepository();
  const { orders } = useServiceOrder();
  const {
    customerOrders,
    customerOrdersByTab,
    checkoutGroups,
    cancelUnpaidCheckoutGroup,
    cancelConfirmedMerchantOrder,
    requestCancellation,
    customerConfirmDelivered,
    currentTime,
  } = useOrderBarang();

  const [orderDomain, setOrderDomain] = useState<OrderDomain>("PRODUCT");
  const [productFilterTab, setProductFilterTab] = useState<ProductFilterTab>("BELUM_BAYAR");
  const [serviceFilterTab, setServiceFilterTab] = useState<ServiceFilterTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedOrderForCancelUnpaid, setSelectedOrderForCancelUnpaid] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForCancelConfirmed, setSelectedOrderForCancelConfirmed] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForRequestCancel, setSelectedOrderForRequestCancel] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForConfirmDelivered, setSelectedOrderForConfirmDelivered] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<MockMerchantOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">("success");

  // Check URL query param for domain (tab) on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || params.get("domain");
      if (tabParam === "service" || tabParam === "services") {
        setOrderDomain("SERVICE");
      } else if (tabParam === "product" || tabParam === "products") {
        setOrderDomain("PRODUCT");
      }
    }
  }, []);

  const getServiceVariant = (status: OrderStatus): StatusVariant => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "PAYMENT_PENDING":
        return "warning";
      case "IN_PROGRESS":
      case "TECHNICIAN_DISPATCHED":
      case "TECHNICIAN_ARRIVED":
      case "AWAITING_PROOF_REVIEW":
        return "info";
      case "WAITING_APPROVAL":
      case "WAITING_SPAREPART":
        return "warning";
      case "DISPUTED":
      case "CANCELLED":
        return "error";
      default:
        return "neutral";
    }
  };

  // Determine if a service order requires immediate customer action
  const getActionRequiredInfo = (order: typeof orders[0]) => {
    if (order.status === "WAITING_APPROVAL") {
      if (order.priceAdjustment?.customerApprovalStatus === "PENDING") {
        return {
          hasAction: true,
          label: "Persetujuan Biaya Diperlukan",
          detail: `Penyesuaian biaya Rp ${(order.priceAdjustment.totalAmount || order.pricing.totalAmount).toLocaleString("id-ID")} menunggu persetujuan Anda.`,
          ctaLabel: "Review & Setujui",
          ctaAction: () => router.push(`/orders/${order.id}`),
          color: "border-amber-400 bg-amber-50 text-amber-900",
        };
      }
      return {
        hasAction: true,
        label: "Persetujuan Suku Cadang",
        detail: "Rekomendasi suku cadang dari teknisi menunggu pilihan Anda.",
        ctaLabel: "Pilih Suku Cadang",
        ctaAction: () => router.push(`/orders/${order.id}`),
        color: "border-amber-400 bg-amber-50 text-amber-900",
      };
    }
    if (order.status === "PAYMENT_PENDING") {
      return {
        hasAction: true,
        label: "Pembayaran Diperlukan",
        detail: `Tagihan escrow Rp ${order.pricing?.totalAmount?.toLocaleString("id-ID")} siap dibayarkan.`,
        ctaLabel: "Bayar Sekarang",
        ctaAction: () => router.push(`/orders/${order.id}`),
        color: "border-amber-400 bg-amber-50 text-amber-900",
      };
    }
    if (order.status === "AWAITING_PROOF_REVIEW" && order.completionStatus === "AWAITING_CUSTOMER_CONFIRMATION") {
      return {
        hasAction: true,
        label: "Konfirmasi Penyelesaian Diperlukan",
        detail: "Teknisi telah menyelesaikan perbaikan. Tinjau bukti foto dan konfirmasi rilis dana.",
        ctaLabel: "Konfirmasi Selesai",
        ctaAction: () => router.push(`/orders/${order.id}`),
        color: "border-emerald-400 bg-emerald-50 text-emerald-900",
      };
    }
    return { hasAction: false, label: "", detail: "", ctaLabel: "", ctaAction: () => {}, color: "" };
  };

  // Product status styling and Indonesian label helper
  const getProductStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (["UNPAID", "PENDING_PAYMENT", "WAITING_PAYMENT", "PAYMENT_PENDING"].includes(s)) {
      return {
        label: "Belum Dibayar",
        colorClass: "bg-amber-50 text-amber-700 border-amber-300",
        dotClass: "bg-amber-500",
      };
    }
    if (["NEW", "PAID", "CONFIRMED", "PROCESSING", "PICKING", "PACKED", "WAITING_PICKUP"].includes(s)) {
      return {
        label: "Sedang Dikemas",
        colorClass: "bg-sky text-primary border-primary/20",
        dotClass: "bg-primary",
      };
    }
    if (["SHIPPED", "ON_DELIVERY", "IN_TRANSIT", "DISPATCHED"].includes(s)) {
      return {
        label: "Sedang Dikirim",
        colorClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        dotClass: "bg-indigo-500",
      };
    }
    if (["DELIVERED", "COMPLETED", "ARRIVED"].includes(s)) {
      return {
        label: "Pesanan Selesai",
        colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    }
    if (["CANCELLED", "REFUNDED", "RETURNED"].includes(s)) {
      return {
        label: "Dibatalkan",
        colorClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      };
    }
    return {
      label: status || "Diproses",
      colorClass: "bg-slate-100 text-neutral-slate border-slate-200",
      dotClass: "bg-slate-400",
    };
  };

  // Filtered Product Orders by active 5-tab + search
  const filteredProductOrders: MockMerchantOrder[] = useMemo(() => {
    const list = customerOrdersByTab[productFilterTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.orderNumber.toLowerCase().includes(q) ||
        p.merchantName.toLowerCase().includes(q) ||
        (p.delivery?.trackingNumber || "").toLowerCase().includes(q) ||
        p.items.some((it) => it.title.toLowerCase().includes(q))
    );
  }, [customerOrdersByTab, productFilterTab, searchQuery]);

  // Compute status counts for Service Orders
  const serviceCounts = {
    ALL: orders.length,
    ACTION_REQUIRED: orders.filter((o) => getActionRequiredInfo(o).hasAction).length,
    ACTIVE: orders.filter((o) =>
      [
        "IN_PROGRESS",
        "TECHNICIAN_DISPATCHED",
        "TECHNICIAN_ARRIVED",
        "DIAGNOSING",
        "WAITING_SPAREPART",
        "WAITING_APPROVAL",
        "PAYMENT_PENDING",
        "PENDING_WORKER",
        "AWAITING_PROOF_REVIEW",
      ].includes(o.status)
    ).length,
    COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED" || o.status === "REFUNDED").length,
  };

  const filteredServiceOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (o.id || "").toLowerCase().includes(q) ||
          (o.serviceTitle || "").toLowerCase().includes(q) ||
          (o.serviceMode || "").toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      if (serviceFilterTab === "ACTION_REQUIRED") {
        return getActionRequiredInfo(o).hasAction;
      }
      if (serviceFilterTab === "ACTIVE") {
        return [
          "IN_PROGRESS",
          "TECHNICIAN_DISPATCHED",
          "TECHNICIAN_ARRIVED",
          "DIAGNOSING",
          "WAITING_SPAREPART",
          "WAITING_APPROVAL",
          "PAYMENT_PENDING",
          "PENDING_WORKER",
          "AWAITING_PROOF_REVIEW",
        ].includes(o.status);
      }
      if (serviceFilterTab === "COMPLETED") {
        return o.status === "COMPLETED";
      }
      if (serviceFilterTab === "CANCELLED") {
        return o.status === "CANCELLED" || o.status === "REFUNDED";
      }
      return true;
    });
  }, [orders, serviceFilterTab, searchQuery]);

  const productFilterTabs: { id: ProductFilterTab; label: string; count: number }[] = [
    { id: "BELUM_BAYAR", label: "Belum Bayar", count: customerOrdersByTab.BELUM_BAYAR.length },
    { id: "DIPROSES", label: "Diproses", count: customerOrdersByTab.DIPROSES.length },
    { id: "DIKIRIM", label: "Dikirim", count: customerOrdersByTab.DIKIRIM.length },
    { id: "SELESAI", label: "Selesai", count: customerOrdersByTab.SELESAI.length },
    { id: "BATAL", label: "Batal", count: customerOrdersByTab.BATAL.length },
  ];

  const serviceFilterTabs: { id: ServiceFilterTab; label: string; count: number; alert?: boolean }[] = [
    { id: "ALL", label: "Semua", count: serviceCounts.ALL },
    { id: "ACTION_REQUIRED", label: "Menunggu Tindakan ⚠", count: serviceCounts.ACTION_REQUIRED, alert: true },
    { id: "ACTIVE", label: "Aktif", count: serviceCounts.ACTIVE },
    { id: "COMPLETED", label: "Selesai", count: serviceCounts.COMPLETED },
    { id: "CANCELLED", label: "Dibatalkan", count: serviceCounts.CANCELLED },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Dev / Demo Scenario Selector Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 mb-4">
        <CustomerDemoScenarioSelector onSelectScenario={(id) => router.push(`/orders/${id}`)} />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark">
            Pesanan Anda
          </h1>
          <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
            Satu pusat pemantauan untuk seluruh pesanan barang, suku cadang, dan jasa perbaikan teknisi SERVIO.
          </p>
        </div>

        {orderDomain === "SERVICE" ? (
          <Link
            href="/services"
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs shrink-0"
          >
            <Wrench size={16} weight="bold" />
            <span>Pesan Servis Baru</span>
          </Link>
        ) : (
          <Link
            href="/products"
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-servio-xs shrink-0"
          >
            <Package size={16} weight="bold" />
            <span>Belanja Produk</span>
          </Link>
        )}
      </div>

      {/* Top Nav: Pesanan vs Garansi (Sync with Warranties page) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <span className="px-4 py-2 border-b-2 border-primary text-primary">
          Pesanan
        </span>
        <Link
          href="/warranties"
          className="px-4 py-2 border-b-2 border-transparent text-neutral-slate hover:text-neutral-dark transition"
        >
          Garansi
        </Link>
      </div>

      {/* Domain Switcher: Pesanan Barang vs Pesanan Jasa (Matching Garansi UI) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => {
            setOrderDomain("PRODUCT");
            setProductFilterTab("BELUM_BAYAR");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            orderDomain === "PRODUCT"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package size={16} weight="bold" />
          <span>Pesanan Barang & Suku Cadang</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              orderDomain === "PRODUCT" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {customerOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOrderDomain("SERVICE");
            setServiceFilterTab("ALL");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            orderDomain === "SERVICE"
              ? "bg-[#0F4C81] text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Wrench size={16} weight="bold" />
          <span>Pesanan Jasa & Layanan Servis</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              orderDomain === "SERVICE" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {orders.length}
          </span>
        </button>
      </div>

      {/* Search & Status Tabs for Selected Domain */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-muted">
            <MagnifyingGlass size={16} weight="bold" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              orderDomain === "PRODUCT"
                ? "Cari no pesanan (#ORD-MC-...), nama barang, toko, atau no resi kurir..."
                : "Cari ID order (#ORD-...), nama jasa servis, penyedia, atau teknisi..."
            }
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-100 border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
          />
        </div>

        {/* STATUS TABS: PRODUCT DOMAIN */}
        {orderDomain === "PRODUCT" && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
            {productFilterTabs.map((tab) => {
              const isActive = productFilterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductFilterTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                    isActive
                      ? "bg-primary text-white shadow-servio-xs"
                      : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-neutral-slate"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STATUS TABS: SERVICE DOMAIN */}
        {orderDomain === "SERVICE" && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
            {serviceFilterTabs.map((tab) => {
              const isActive = serviceFilterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setServiceFilterTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                    isActive
                      ? tab.alert
                        ? "bg-amber-500 text-white shadow-servio-xs"
                        : "bg-primary text-white shadow-servio-xs"
                      : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-neutral-slate"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTENT LIST: PRODUCT ORDERS */}
      {orderDomain === "PRODUCT" && (
        <>
          {filteredProductOrders.length === 0 ? (
            <EmptyState
              title="Tidak Ada Pesanan Barang"
              description={
                searchQuery
                  ? "Tidak ditemukan pesanan barang yang sesuai dengan kata kunci pencarian Anda."
                  : productFilterTab === "BELUM_BAYAR"
                  ? "Tidak ada pesanan barang yang menunggu pembayaran."
                  : productFilterTab === "DIPROSES"
                  ? "Tidak ada pesanan barang yang sedang dipersiapkan atau dikemas oleh penjual."
                  : productFilterTab === "DIKIRIM"
                  ? "Tidak ada pesanan barang yang sedang dalam pengiriman kurir."
                  : productFilterTab === "SELESAI"
                  ? "Belum ada pesanan barang yang telah selesai."
                  : productFilterTab === "BATAL"
                  ? "Tidak ada pesanan barang yang dibatalkan."
                  : "Anda belum memiliki riwayat pesanan barang atau suku cadang."
              }
              action={
                <div className="flex items-center gap-2">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark text-xs font-bold transition"
                    >
                      Reset Pencarian
                    </button>
                  )}
                  <Link
                    href="/products"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition"
                  >
                    Belanja di Katalog Produk
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredProductOrders.map((order) => (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  currentTime={currentTime}
                  onPayNow={(ord) => router.push(`/payments/products/${ord.checkoutGroupId || ord.id}`)}
                  onCancelUnpaidCheckout={(ord) => setSelectedOrderForCancelUnpaid(ord)}
                  onCancelConfirmedOrder={(ord) => setSelectedOrderForCancelConfirmed(ord)}
                  onRequestCancellation={(ord) => setSelectedOrderForRequestCancel(ord)}
                  onConfirmDelivered={(ord) => setSelectedOrderForConfirmDelivered(ord)}
                  onViewReceipt={(ord) => setSelectedOrderForReceipt(ord)}
                  onViewTracking={(ord) => setSelectedOrderForTracking(ord)}
                  onReportIssue={(ord) => {
                    setToastMessage(`Laporan kendala untuk pesanan #${ord.orderNumber} telah dicatat. Tim kami akan segera meninjau.`);
                    setToastType("warning");
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* CONTENT LIST: SERVICE ORDERS */}
      {orderDomain === "SERVICE" && (
        <>
          {filteredServiceOrders.length === 0 ? (
            <EmptyState
              title="Tidak Ada Pesanan Jasa Servis"
              description={
                searchQuery
                  ? "Tidak ditemukan pesanan servis yang sesuai dengan kata kunci pencarian Anda."
                  : serviceFilterTab === "ACTION_REQUIRED"
                  ? "Tidak ada pesanan servis yang memerlukan tindakan saat ini."
                  : serviceFilterTab === "ACTIVE"
                  ? "Tidak ada pesanan servis yang sedang aktif atau dikerjakan teknisi."
                  : serviceFilterTab === "COMPLETED"
                  ? "Belum ada pesanan servis yang telah selesai."
                  : serviceFilterTab === "CANCELLED"
                  ? "Tidak ada pesanan servis yang dibatalkan."
                  : "Anda belum memiliki riwayat pesanan jasa servis."
              }
              action={
                <div className="flex items-center gap-2">
                  {(searchQuery || serviceFilterTab !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setServiceFilterTab("ALL");
                        setSearchQuery("");
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark text-xs font-bold transition"
                    >
                      Reset Filter
                    </button>
                  )}
                  <Link
                    href="/services"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition"
                  >
                    Pesan Servis Baru
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredServiceOrders.map((ord, idx) => {
                const actionInfo = getActionRequiredInfo(ord);
                return (
                  <div
                    key={`${ord.id}-${idx}`}
                    onClick={() => router.push(`/orders/${ord.id}`)}
                    className={`glass-card p-5 sm:p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-4 cursor-pointer group bg-white shadow-servio-xs hover:shadow-servio-md ${
                      actionInfo.hasAction
                        ? "border-amber-300 ring-1 ring-amber-300/40 hover:border-amber-500"
                        : "border-slate-200/80 hover:border-primary/40"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-dark">
                          #{ord.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky text-primary text-[10px] font-bold border border-primary/20">
                          Jasa Servis
                        </span>
                        <StatusBadge
                          status={getServiceVariant(ord.status)}
                          label={ord.statusLabel}
                          size="sm"
                        />
                      </div>
                      <span className="text-xs text-neutral-muted">
                        Jadwal: {ord.scheduledDate} ({ord.scheduledTimeSlot})
                      </span>
                    </div>

                    {/* Action Required Banner if Applicable */}
                    {actionInfo.hasAction && (
                      <div
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${actionInfo.color}`}
                      >
                        <div className="flex items-center gap-2">
                          <WarningCircle
                            size={18}
                            weight="fill"
                            className="shrink-0 text-amber-600"
                          />
                          <div>
                            <strong className="block">{actionInfo.label}</strong>
                            <span className="text-[11px] opacity-90">{actionInfo.detail}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            actionInfo.ctaAction();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 shadow-sm transition"
                        >
                          {actionInfo.ctaLabel}
                        </button>
                      </div>
                    )}

                    {/* Body Content */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-sky text-primary flex items-center justify-center shrink-0">
                          <Wrench size={24} weight="duotone" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3 className="font-display font-bold text-sm sm:text-base text-neutral-dark group-hover:text-primary transition-colors">
                            {ord.serviceTitle}
                          </h3>
                          <p className="text-xs text-neutral-slate">
                            Mitra: <strong>{ord.providerName}</strong>
                            {ord.assignedWorker ? ` • Teknisi: ${ord.assignedWorker.name}` : ""}
                          </p>
                          <p className="text-[11px] text-neutral-muted truncate max-w-md">
                            Lokasi: {ord.address}
                          </p>
                        </div>
                      </div>

                      {/* Price & Primary CTA */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                        <div>
                          <span className="text-[10px] text-neutral-muted block sm:text-right">
                            {ord.priceAdjustment ? "Total Terbaru:" : "Total Tagihan:"}
                          </span>
                          <span className="font-mono font-bold text-base text-primary">
                            Rp {ord.pricing?.totalAmount?.toLocaleString("id-ID") ?? "0"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {ord.status === "WAITING_APPROVAL" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${ord.id}`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors flex items-center gap-1 shadow-servio-xs"
                            >
                              <span>Review & Approve</span>
                            </button>
                          )}
                          {ord.status === "PAYMENT_PENDING" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${ord.id}`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors flex items-center gap-1 shadow-servio-xs"
                            >
                              <CreditCard size={14} weight="bold" />
                              <span>Bayar</span>
                            </button>
                          )}
                          {ord.status === "TECHNICIAN_DISPATCHED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${ord.id}`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1 shadow-servio-xs"
                            >
                              <NavigationArrow size={14} weight="bold" />
                              <span>Lacak Teknisi</span>
                            </button>
                          )}
                          {ord.status === "AWAITING_PROOF_REVIEW" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${ord.id}`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-servio-xs"
                            >
                              <CheckCircle size={14} weight="bold" />
                              <span>Konfirmasi Selesai</span>
                            </button>
                          )}
                          {ord.status === "COMPLETED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/orders/${ord.id}`);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-neutral-dark text-xs font-bold hover:bg-slate-200 transition-colors flex items-center gap-1"
                            >
                              <ShieldCheck size={14} className="text-emerald-600" />
                              <span>Detail & Garansi</span>
                            </button>
                          )}
                          <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1 ml-1">
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* PHASE 05A MODALS */}
      <CancelUnpaidCheckoutModal
        order={selectedOrderForCancelUnpaid}
        checkoutGroup={
          selectedOrderForCancelUnpaid?.checkoutGroupId
            ? checkoutGroups.find((g) => g.id === selectedOrderForCancelUnpaid.checkoutGroupId) || null
            : null
        }
        isOpen={!!selectedOrderForCancelUnpaid}
        onClose={() => setSelectedOrderForCancelUnpaid(null)}
        onConfirm={(groupId) => {
          cancelUnpaidCheckoutGroup(groupId, "Dibatalkan oleh Pelanggan");
          setSelectedOrderForCancelUnpaid(null);
          setToastMessage("Seluruh pesanan dalam tagihan checkout berhasil dibatalkan.");
          setToastType("success");
        }}
      />

      <CancelConfirmedModal
        order={selectedOrderForCancelConfirmed}
        isOpen={!!selectedOrderForCancelConfirmed}
        onClose={() => setSelectedOrderForCancelConfirmed(null)}
        onConfirm={(orderId, reason) => {
          cancelConfirmedMerchantOrder(orderId, reason);
          setSelectedOrderForCancelConfirmed(null);
          setToastMessage("Pesanan toko berhasil dibatalkan. Pengembalian dana 100% diproses.");
          setToastType("success");
        }}
      />

      <RequestCancellationModal
        order={selectedOrderForRequestCancel}
        isOpen={!!selectedOrderForRequestCancel}
        onClose={() => setSelectedOrderForRequestCancel(null)}
        onConfirm={(orderId, reason, notes) => {
          requestCancellation(orderId, reason, notes);
          setSelectedOrderForRequestCancel(null);
          setToastMessage("Pengajuan pembatalan telah dikirim ke penjual (SLA 12 jam operasional).");
          setToastType("success");
        }}
      />

      <ConfirmDeliveredModal
        order={selectedOrderForConfirmDelivered}
        isOpen={!!selectedOrderForConfirmDelivered}
        onClose={() => setSelectedOrderForConfirmDelivered(null)}
        onConfirm={(orderId) => {
          customerConfirmDelivered(orderId);
          setSelectedOrderForConfirmDelivered(null);
          setToastMessage("Terima kasih! Pesanan telah selesai.");
          setToastType("success");
        }}
      />

      <ReceiptModal
        order={selectedOrderForReceipt}
        isOpen={!!selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
      />

      <TrackingModal
        order={selectedOrderForTracking}
        isOpen={!!selectedOrderForTracking}
        onClose={() => setSelectedOrderForTracking(null)}
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType as any}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
