"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { StatusBadge, StatusVariant } from "@/components/data-display/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
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
  Star,
  ChatCircleText,
} from "@phosphor-icons/react";
import { afterSalesApi, ReviewSubmission } from "@/lib/afterSalesApi";
import {
  OrderReviewModal,
  OrderReviewModalTarget,
} from "@/components/features/afterSales/OrderReviewModal";

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
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrderCard } from "@/features/order-jasa/components/common/ServiceOrderCard";
import { ConfirmServiceCompletionModal } from "@/features/order-jasa/components/common/ConfirmServiceCompletionModal";
import { CustomerTabType, ServiceOrder } from "@/features/order-jasa/types";

type OrderDomain = "PRODUCT" | "SERVICE";
type ProductFilterTab = "BELUM_BAYAR" | "DIPROSES" | "DIKIRIM" | "TIBA" | "SELESAI" | "BATAL" | "PENILAIAN";
type ServiceCustomerTab = CustomerTabType | "PENILAIAN";
type ReviewFilterMode = "ALL" | "UNREVIEWED" | "REVIEWED";
type ServiceFilterTab = "ALL" | "ACTION_REQUIRED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export default function OrderListPage() {
  const router = useRouter();
  const { isAuthenticated, isPublicGuest, activeRole, isLoadingAuth } = useActiveRole();
  const repo = useDomainRepository();
  const { orders } = useServiceOrder();
  const {
    orders: serviceOrders05B,
    customerOrdersByTab: customerServiceOrdersByTab,
    customerTabCounts: customerServiceTabCounts,
    confirmCustomerCompleted,
    syncBackendOrders: syncOrderJasa,
    isLoading: isOrderJasaLoading,
    hasLoadedBackend: hasLoadedServiceBackend,
  } = useOrderJasa();
  const {
    customerOrders,
    customerOrdersByTab,
    checkoutGroups,
    cancelUnpaidCheckoutGroup,
    cancelConfirmedMerchantOrder,
    requestCancellation,
    customerConfirmDelivered,
    currentTime,
    isLoadingBackend,
    hasLoadedBackend,
    syncBackendOrders,
  } = useOrderBarang();

  const [orderDomain, setOrderDomain] = useState<OrderDomain>("PRODUCT");
  const [productFilterTab, setProductFilterTab] = useState<ProductFilterTab>("BELUM_BAYAR");
  const [customerServiceTab, setCustomerServiceTab] = useState<ServiceCustomerTab>("BELUM_BAYAR");
  const [serviceFilterTab, setServiceFilterTab] = useState<ServiceFilterTab>("ALL");
  const [reviewFilterMode, setReviewFilterMode] = useState<ReviewFilterMode>("ALL");
  const [myReviewsByKey, setMyReviewsByKey] = useState<Record<string, ReviewSubmission>>({});
  const [activeReviewModalTarget, setActiveReviewModalTarget] = useState<OrderReviewModalTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const isDomainEmpty =
      orderDomain === "SERVICE"
        ? serviceOrders05B.length === 0 && !hasLoadedServiceBackend
        : customerOrders.length === 0 && !hasLoadedBackend;

    if (isDomainEmpty) {
      setInitialLoading(true);
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setInitialLoading(false);
    }
  }, [customerOrders.length, hasLoadedBackend, serviceOrders05B.length, hasLoadedServiceBackend, orderDomain]);

  const handleProductTabChange = (tabId: ProductFilterTab) => {
    if (tabId === productFilterTab) return;
    setProductFilterTab(tabId);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      if (orderDomain === "SERVICE") {
        // Fast focused refresh: only wait for Service Orders API
        await syncOrderJasa();
        // Silent background sync for product orders without blocking UI/spinner
        syncBackendOrders(true).catch(() => {});
      } else {
        // Fast focused refresh: wait for Product Orders API
        await syncBackendOrders();
        // Silent background sync for service orders
        syncOrderJasa(true).catch(() => {});
      }
      setToastMessage("Data pesanan berhasil dimuat ulang.");
      setToastType("success");
    } catch {
      setToastMessage("Gagal memuat ulang data pesanan.");
      setToastType("error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modals state
  const [selectedOrderForCancelUnpaid, setSelectedOrderForCancelUnpaid] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForCancelConfirmed, setSelectedOrderForCancelConfirmed] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForRequestCancel, setSelectedOrderForRequestCancel] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForConfirmDelivered, setSelectedOrderForConfirmDelivered] = useState<MockMerchantOrder | null>(null);
  const [selectedServiceOrderForCompletion, setSelectedServiceOrderForCompletion] = useState<ServiceOrder | null>(null);
  const [isCompletingServiceOrder, setIsCompletingServiceOrder] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<MockMerchantOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">("success");

  const [hasLoadedMyReviews, setHasLoadedMyReviews] = useState(false);
  const inFlightReviewsRef = React.useRef<Promise<void> | null>(null);

  const loadMyReviews = React.useCallback(async () => {
    if (isLoadingAuth || !isAuthenticated || isPublicGuest || activeRole !== "CUSTOMER") {
      return;
    }
    if (inFlightReviewsRef.current) {
      return inFlightReviewsRef.current;
    }
    const promise = (async () => {
      try {
        const res = await afterSalesApi.customer.getMyReviewsList();
        if (res.success && Array.isArray(res.data)) {
          const map: Record<string, ReviewSubmission> = {};
          for (const sub of res.data) {
            if (sub.source_order_id) {
              map[sub.source_order_id] = sub;
            }
            if (sub.source_merchant_order_id) {
              map[sub.source_merchant_order_id] = sub;
            }
          }
          setMyReviewsByKey(map);
          setHasLoadedMyReviews(true);
        }
      } catch {
        // ignore unauthenticated or offline errors
      } finally {
        inFlightReviewsRef.current = null;
      }
    })();
    inFlightReviewsRef.current = promise;
    return promise;
  }, [isLoadingAuth, isAuthenticated, isPublicGuest, activeRole]);

  const hasCompletedAnyOrder =
    customerOrdersByTab.SELESAI.length > 0 ||
    customerServiceOrdersByTab.SELESAI.length > 0 ||
    productFilterTab === "PENILAIAN" ||
    customerServiceTab === "PENILAIAN";

  useEffect(() => {
    if (!hasCompletedAnyOrder || hasLoadedMyReviews) return;
    loadMyReviews();
  }, [hasCompletedAnyOrder, hasLoadedMyReviews, loadMyReviews]);

  // Check URL query param for domain and status tab on initial mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const domainParam = params.get("domain") || "";
      const rawTab = params.get("tab") || "";
      const rawStatus = params.get("status") || "";

      if (domainParam === "service" || domainParam === "services" || rawTab === "service" || rawTab === "services") {
        setOrderDomain("SERVICE");
      } else {
        setOrderDomain("PRODUCT");
      }

      const activeTab = (rawStatus || rawTab).toUpperCase();
      if (activeTab === "BELUM_BAYAR" || activeTab === "UNPAID" || activeTab === "PENDING") {
        setProductFilterTab("BELUM_BAYAR");
      } else if (activeTab === "DIPROSES" || activeTab === "PROCESSING") {
        setProductFilterTab("DIPROSES");
      } else if (activeTab === "DIKIRIM" || activeTab === "SHIPPING" || activeTab === "DELIVERING") {
        setProductFilterTab("DIKIRIM");
      } else if (activeTab === "TIBA" || activeTab === "DELIVERED" || activeTab === "ARRIVED") {
        setProductFilterTab("TIBA");
      } else if (activeTab === "SELESAI" || activeTab === "COMPLETED") {
        setProductFilterTab("SELESAI");
      } else if (activeTab === "BATAL" || activeTab === "CANCELLED") {
        setProductFilterTab("BATAL");
      } else if (activeTab === "PENILAIAN" || activeTab === "REVIEWS") {
        setProductFilterTab("PENILAIAN");
        setCustomerServiceTab("PENILAIAN");
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
        detail: `Tagihan pembayaran Rp ${order.pricing?.totalAmount?.toLocaleString("id-ID")} siap dibayarkan.`,
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
    if (["DELIVERED", "ARRIVED", "TIBA"].includes(s)) {
      return {
        label: "Tiba di Tujuan",
        colorClass: "bg-teal-50 text-teal-700 border-teal-200",
        dotClass: "bg-teal-500",
      };
    }
    if (["COMPLETED"].includes(s)) {
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

  // Filtered Product Orders by active tab + search
  const filteredProductOrders: MockMerchantOrder[] = useMemo(() => {
    const baseKey = productFilterTab === "PENILAIAN" ? "SELESAI" : productFilterTab;
    const list = customerOrdersByTab[baseKey] || [];
    const byReviewStatus =
      productFilterTab === "PENILAIAN"
        ? list.filter((ord) => {
            const isReviewed = Boolean(myReviewsByKey[ord.id] || myReviewsByKey[ord.orderNumber]);
            if (reviewFilterMode === "UNREVIEWED") return !isReviewed;
            if (reviewFilterMode === "REVIEWED") return isReviewed;
            return true;
          })
        : list;

    if (!searchQuery.trim()) return byReviewStatus;
    const q = searchQuery.toLowerCase();
    return byReviewStatus.filter(
      (p) =>
        p.orderNumber.toLowerCase().includes(q) ||
        p.merchantName.toLowerCase().includes(q) ||
        (p.delivery?.trackingNumber || "").toLowerCase().includes(q) ||
        p.items.some((it) => it.title.toLowerCase().includes(q))
    );
  }, [customerOrdersByTab, productFilterTab, searchQuery, myReviewsByKey, reviewFilterMode]);

  const unreviewedProductCount = useMemo(() => {
    const completed = customerOrdersByTab.SELESAI || [];
    return completed.filter((o) => !myReviewsByKey[o.id] && !myReviewsByKey[o.orderNumber]).length;
  }, [customerOrdersByTab.SELESAI, myReviewsByKey]);

  const unreviewedServiceCount = useMemo(() => {
    const completed = customerServiceOrdersByTab.SELESAI || [];
    return completed.filter((o) => !myReviewsByKey[o.id] && !myReviewsByKey[o.orderNumber]).length;
  }, [customerServiceOrdersByTab.SELESAI, myReviewsByKey]);

  const productFilterTabs: { id: ProductFilterTab; label: string; count: number; alert?: boolean }[] = [
    { id: "BELUM_BAYAR", label: "Belum Bayar", count: customerOrdersByTab.BELUM_BAYAR.length },
    { id: "DIPROSES", label: "Diproses", count: customerOrdersByTab.DIPROSES.length },
    { id: "DIKIRIM", label: "Dikirim", count: customerOrdersByTab.DIKIRIM.length },
    { id: "TIBA", label: "Tiba di Tujuan", count: customerOrdersByTab.TIBA.length, alert: customerOrdersByTab.TIBA.length > 0 },
    { id: "SELESAI", label: "Selesai", count: customerOrdersByTab.SELESAI.length },
    { id: "BATAL", label: "Batal", count: customerOrdersByTab.BATAL.length },
    { id: "PENILAIAN", label: "Penilaian", count: customerOrdersByTab.SELESAI.length, alert: unreviewedProductCount > 0 },
  ];

  const serviceFilterTabs: { id: ServiceCustomerTab; label: string; count: number; alert?: boolean }[] = [
    { id: "BELUM_BAYAR", label: "Belum Bayar", count: customerServiceTabCounts.BELUM_BAYAR, alert: customerServiceTabCounts.BELUM_BAYAR > 0 },
    { id: "MENUNGGU_JADWAL", label: "Menunggu Jadwal", count: customerServiceTabCounts.MENUNGGU_JADWAL },
    { id: "BERLANGSUNG", label: "Berlangsung", count: customerServiceTabCounts.BERLANGSUNG },
    { id: "SELESAI", label: "Selesai", count: customerServiceTabCounts.SELESAI },
    { id: "BATAL", label: "Batal", count: customerServiceTabCounts.BATAL },
    { id: "PENILAIAN", label: "Penilaian", count: customerServiceTabCounts.SELESAI, alert: unreviewedServiceCount > 0 },
  ];

  const filtered05BServiceOrders = useMemo(() => {
    const baseKey: CustomerTabType = customerServiceTab === "PENILAIAN" ? "SELESAI" : customerServiceTab;
    const list = customerServiceOrdersByTab[baseKey] || [];
    const byReviewStatus =
      customerServiceTab === "PENILAIAN"
        ? list.filter((ord) => {
            const isReviewed = Boolean(myReviewsByKey[ord.id] || myReviewsByKey[ord.orderNumber]);
            if (reviewFilterMode === "UNREVIEWED") return !isReviewed;
            if (reviewFilterMode === "REVIEWED") return isReviewed;
            return true;
          })
        : list;

    if (!searchQuery.trim()) return byReviewStatus;
    const q = searchQuery.toLowerCase();
    return byReviewStatus.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.serviceSnapshot.title.toLowerCase().includes(q) ||
        o.providerName.toLowerCase().includes(q)
    );
  }, [customerServiceOrdersByTab, customerServiceTab, searchQuery, myReviewsByKey, reviewFilterMode]);

  return (
    <div className="space-y-6 pb-20">

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

        <div className="flex items-center gap-2">
          {(() => {
            const isRefreshingActive = isRefreshing || (orderDomain === "SERVICE" ? false : isLoadingBackend);
            return (
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshingActive}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer disabled:opacity-60"
                title="Muat ulang data pesanan dari server"
              >
                <ArrowsClockwise size={15} className={`text-primary ${isRefreshingActive ? "animate-spin" : ""}`} />
                <span>{isRefreshingActive ? "Memuat Data..." : "Muat Data"}</span>
              </button>
            );
          })()}
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
            syncBackendOrders(true).catch(() => {});
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
            setCustomerServiceTab("BELUM_BAYAR");
            syncOrderJasa(true).catch(() => {});
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
            {serviceOrders05B.length}
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
                  onClick={() => handleProductTabChange(tab.id)}
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
              const isActive = customerServiceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomerServiceTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                    isActive
                      ? tab.alert
                        ? "bg-amber-500 text-white shadow-servio-xs"
                        : "bg-[#0F4C81] text-white shadow-servio-xs"
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
        {/* SUB-FILTER FOR PENILAIAN TAB */}
        {((orderDomain === "PRODUCT" && productFilterTab === "PENILAIAN") ||
          (orderDomain === "SERVICE" && customerServiceTab === "PENILAIAN")) && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Star size={16} weight="fill" className="text-amber-400 shrink-0" />
              <span>
                Daftar pesanan <strong>Selesai (COMPLETED)</strong> yang dapat dinilai atau telah dinilai.
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
              {[
                { id: "ALL" as ReviewFilterMode, label: "Semua" },
                { id: "UNREVIEWED" as ReviewFilterMode, label: "Belum Dinilai" },
                { id: "REVIEWED" as ReviewFilterMode, label: "Sudah Dinilai" },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setReviewFilterMode(rf.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    reviewFilterMode === rf.id
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONTENT LIST: PRODUCT ORDERS */}
      {orderDomain === "PRODUCT" && (
        <>
          {(initialLoading || (isLoadingBackend && !hasLoadedBackend) || isRefreshing) ? (
            <div className="space-y-4 animate-fade-in">
              {/* Loading Banner */}
              <div className="flex items-center justify-between gap-2 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <ArrowsClockwise size={15} className="animate-spin text-primary" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Memuat Data Pesanan Pelanggan</span>
                    <span className="text-[11px] text-slate-500">Menyinkronkan riwayat belanja dan status kurir terkini...</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-100 text-primary shadow-3xs shrink-0">
                  Memuat Data...
                </span>
              </div>

              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white animate-pulse space-y-4 shadow-servio-xs"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-200" />
                      <div className="w-32 h-4 rounded-md bg-slate-200" />
                      <div className="w-20 h-4 rounded-md bg-slate-100" />
                    </div>
                    <div className="w-28 h-6 rounded-full bg-slate-200" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="w-3/5 h-4 rounded-md bg-slate-200" />
                      <div className="w-1/4 h-3 rounded-md bg-slate-100" />
                      <div className="w-2/5 h-3 rounded-md bg-slate-100" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-1">
                      <div className="w-20 h-2.5 rounded bg-slate-100" />
                      <div className="w-28 h-4 rounded-md bg-slate-200" />
                    </div>
                    <div className="w-24 h-8 rounded-xl bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProductOrders.length === 0 ? (
            <EmptyState
              title={productFilterTab === "PENILAIAN" ? "Tidak Ada Pesanan pada Filter Penilaian" : "Tidak Ada Pesanan Barang"}
              description={
                searchQuery
                  ? "Tidak ditemukan pesanan barang yang sesuai dengan kata kunci pencarian Anda."
                  : productFilterTab === "PENILAIAN"
                  ? "Belum ada pesanan barang selesai yang sesuai dengan filter penilaian ini."
                  : productFilterTab === "BELUM_BAYAR"
                  ? "Tidak ada pesanan barang yang menunggu pembayaran."
                  : productFilterTab === "DIPROSES"
                  ? "Tidak ada pesanan barang yang sedang dipersiapkan atau dikemas oleh penjual."
                  : productFilterTab === "DIKIRIM"
                  ? "Tidak ada pesanan barang yang sedang dalam pengiriman kurir."
                  : productFilterTab === "TIBA"
                  ? "Belum ada pesanan barang yang tiba di tujuan dan menunggu konfirmasi Anda."
                  : productFilterTab === "SELESAI"
                  ? "Belum ada pesanan barang yang telah selesai."
                  : productFilterTab === "BATAL"
                  ? "Tidak ada pesanan barang yang dibatalkan."
                  : "Anda belum memiliki riwayat pesanan barang atau suku cadang."
              }
              action={
                <div className="flex items-center gap-2.5 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleRefreshData}
                    disabled={isLoadingBackend || isRefreshing}
                    className="px-4 py-2 rounded-xl bg-blue-50 text-primary border border-blue-200 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <ArrowsClockwise size={14} className={(isLoadingBackend || isRefreshing) ? "animate-spin" : ""} />
                    <span>{(isLoadingBackend || isRefreshing) ? "Memuat Data..." : "Periksa & Muat Ulang Data"}</span>
                  </button>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark text-xs font-bold transition cursor-pointer"
                    >
                      Reset Pencarian
                    </button>
                  )}
                  <Link
                    href="/products"
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-2xs"
                  >
                    Belanja di Katalog Produk
                  </Link>
                </div>
              }
            />
          ) : productFilterTab === "PENILAIAN" ? (
            /* C03: Product Orders Penilaian Tab View */
            <div className="space-y-4">
              {filteredProductOrders.map((order) => {
                const existingReview = myReviewsByKey[order.id] || myReviewsByKey[order.orderNumber] || null;
                const hasReply = existingReview?.entries?.some((e) => Boolean(e.reply));

                return (
                  <div
                    key={order.id}
                    className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4 hover:border-blue-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Storefront size={16} weight="duotone" className="text-primary" />
                        <span className="text-xs font-bold text-slate-900">{order.merchantName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono font-bold text-slate-500">#{order.orderNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          • Order: {order.createdAt ? new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasReply && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <ChatCircleText size={12} weight="fill" />
                            Ada Balasan Toko
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                            existingReview
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Star size={13} weight="fill" className={existingReview ? "text-emerald-600" : "text-amber-500"} />
                          {existingReview ? "Sudah Dinilai" : "Belum Dinilai"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {order.items.map((it) => {
                        const productThumb = (it as any).imageUrl || it.thumbnailUrl;
                        const productImgKey = `prd-rev-${order.id}-${it.id}`;
                        const showProductThumb = Boolean(productThumb && !failedImageKeys[productImgKey]);

                        return (
                          <div key={it.id} className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {showProductThumb ? (
                                <img
                                  src={productThumb}
                                  alt={it.title}
                                  onError={() =>
                                    setFailedImageKeys((prev) => ({ ...prev, [productImgKey]: true }))
                                  }
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package size={22} weight="duotone" className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{it.title}</h4>
                              <p className="text-[11px] text-slate-500">
                                {it.quantity}x • Rp {(it.unitPrice || 0).toLocaleString("id-ID")}
                                {it.variantName ? ` • ${it.variantName}` : ""}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Total Belanja:{" "}
                        <strong className="text-slate-900 text-sm">
                          Rp {(((order.pricing as any)?.totalAmount ?? order.pricing?.merchantOrderTotal ?? (order as any).totalAmount) || 0).toLocaleString("id-ID")}
                        </strong>
                        {existingReview?.submitted_at && (
                          <span className="ml-2 text-[11px] text-emerald-700">
                            • Dinilai pada {new Date(existingReview.submitted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link
                          href={`/orders/products/${order.id}`}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Lihat Detail Pesanan
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReviewModalTarget({
                              sourceKind: "GOODS",
                              orderId: order.id,
                              subOrderId: order.id,
                              orderNumber: order.orderNumber,
                              orderedAt: order.createdAt,
                              completedAt: order.completedAt || order.updatedAt,
                              businessOrgId: order.merchantId || "merch-jaya-motor",
                              businessName: order.merchantName || "Toko Official",
                              items: order.items.map((it) => ({
                                orderItemId: it.id,
                                targetId: it.productId || it.id,
                                title: it.title,
                                imageUrl: (it as any).imageUrl || it.thumbnailUrl,
                                quantity: it.quantity,
                                variantLabel: it.variantName,
                                price: it.unitPrice,
                              })),
                              existingSubmission: existingReview,
                              skipExistingReviewCheck: hasLoadedMyReviews,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            existingReview
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          <Star size={14} weight="fill" />
                          <span>{existingReview ? "Lihat Penilaian" : "Beri Rating & Ulasan"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProductOrders.map((order) => (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  currentTime={currentTime}
                  onPayNow={(ord) => router.push(`/payments/products/${ord.checkoutGroupId || ord.id}?from=card&orderId=${ord.id}`)}
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
        <div className="space-y-4">
          {/* 05B Service Orders */}
          <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex items-center justify-between text-xs text-sky-950">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#0F4C81] text-white font-bold text-[10px] flex items-center justify-center">
                05B
              </span>
              <span>
                Menampilkan <strong>{filtered05BServiceOrders.length}</strong> pesanan jasa dalam tab <strong>{serviceFilterTabs.find((t) => t.id === customerServiceTab)?.label}</strong>.
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-sky-200 text-[#0F4C81]">
              LIVE
            </span>
          </div>

          {filtered05BServiceOrders.length === 0 ? (
            <EmptyState
              title={`Tidak Ada Pesanan Jasa (${serviceFilterTabs.find((t) => t.id === customerServiceTab)?.label})`}
              description={
                searchQuery
                  ? `Tidak ada pesanan jasa yang cocok dengan kata kunci "${searchQuery}".`
                  : `Belum ada pesanan jasa pada status ${serviceFilterTabs.find((t) => t.id === customerServiceTab)?.label.toLowerCase()}.`
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
                    href="/services"
                    className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition"
                  >
                    Pesan Jasa Baru
                  </Link>
                </div>
              }
            />
          ) : customerServiceTab === "PENILAIAN" ? (
            /* C04: Service Orders Penilaian Tab View */
            <div className="space-y-4">
              {filtered05BServiceOrders.map((order) => {
                const existingReview = myReviewsByKey[order.id] || myReviewsByKey[order.orderNumber] || null;
                const hasReply = existingReview?.entries?.some((e) => Boolean(e.reply));

                return (
                  <div
                    key={order.id}
                    className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4 hover:border-blue-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Wrench size={16} weight="duotone" className="text-[#0F4C81]" />
                        <span className="text-xs font-bold text-slate-900">{order.providerName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono font-bold text-slate-500">#{order.orderNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          • Order: {order.createdAt ? new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasReply && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <ChatCircleText size={12} weight="fill" />
                            Ada Balasan Penyedia
                          </span>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                            existingReview
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Star size={13} weight="fill" className={existingReview ? "text-emerald-600" : "text-amber-500"} />
                          {existingReview ? "Sudah Dinilai" : "Belum Dinilai"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 overflow-hidden flex items-center justify-center shrink-0 text-[#0F4C81]">
                        {order.serviceSnapshot?.thumbnailUrl && !failedImageKeys[`srv-rev-${order.id}`] ? (
                          <img
                            src={order.serviceSnapshot.thumbnailUrl}
                            alt={order.serviceSnapshot.title}
                            onError={() =>
                              setFailedImageKeys((prev) => ({ ...prev, [`srv-rev-${order.id}`]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Wrench size={24} weight="duotone" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {order.serviceSnapshot.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Kategori: {order.serviceSnapshot.categoryName} • Jadwal: {order.schedule.date} ({order.schedule.timeSlot})
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Total Biaya Layanan:{" "}
                        <strong className="text-slate-900 text-sm">
                          Rp {(((order as any).pricing?.finalTotal ?? order.paymentSummary?.executionPayment?.amount ?? (order.serviceSnapshot as any).minPrice) || 0).toLocaleString("id-ID")}
                        </strong>
                        {existingReview?.submitted_at && (
                          <span className="ml-2 text-[11px] text-emerald-700">
                            • Dinilai pada {new Date(existingReview.submitted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Lihat Detail Pesanan
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReviewModalTarget({
                              sourceKind: "SERVICE",
                              orderId: order.id,
                              orderNumber: order.orderNumber,
                              orderedAt: order.createdAt,
                              completedAt: (order as any).completedAt || order.updatedAt,
                              businessOrgId: order.providerId || "prov-surya-teknik",
                              businessName: order.providerName || "Penyedia Jasa",
                              items: [
                                {
                                  orderItemId: order.id,
                                  targetId: (order as any).serviceId || order.serviceSnapshot.id || order.id,
                                  title: order.serviceSnapshot.title,
                                  imageUrl: order.serviceSnapshot.thumbnailUrl,
                                  quantity: 1,
                                  variantLabel: order.serviceSnapshot.categoryName,
                                  price: (order as any).pricing?.finalTotal ?? order.paymentSummary?.executionPayment?.amount ?? (order.serviceSnapshot as any).minPrice,
                                },
                              ],
                              existingSubmission: existingReview,
                              skipExistingReviewCheck: hasLoadedMyReviews,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            existingReview
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-[#0F4C81] text-white hover:bg-[#0c3c66]"
                          }`}
                        >
                          <Star size={14} weight="fill" />
                          <span>{existingReview ? "Lihat Penilaian" : "Beri Rating & Ulasan"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered05BServiceOrders.map((order) => (
                <ServiceOrderCard
                  key={order.id}
                  order={order}
                  role="CUSTOMER"
                  onPrimaryAction={(o) => {
                    const isTerminal =
                      o.status === "COMPLETED" ||
                      o.status === "CANCELLED" ||
                      o.subStatus === "COMPLETED_NORMAL" ||
                      o.subStatus === "AUTO_COMPLETED_72H" ||
                      o.subStatus.startsWith("CANCELLED_");
                    const isReadyForCompletion =
                      !isTerminal &&
                      (o.subStatus === "VISIT_CLOSED" ||
                        (o.subStatus === "AWAITING_CUSTOMER_CONFIRMATION" && o.visit?.status === "CLOSED") ||
                        (o.paymentSummary?.executionPayment?.status === "PAID" && o.visit?.status === "CLOSED"));

                    if (isReadyForCompletion) {
                      setSelectedServiceOrderForCompletion(o);
                      return;
                    }
                    router.push(`/orders/${o.id}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PHASE 07 REVIEW MODAL (C05 / C06 / C07) */}
      <OrderReviewModal
        isOpen={!!activeReviewModalTarget}
        onClose={() => setActiveReviewModalTarget(null)}
        target={activeReviewModalTarget}
        onSubmitted={(submission) => {
          setMyReviewsByKey((prev) => {
            const next = { ...prev };
            if (submission.source_order_id) next[submission.source_order_id] = submission;
            if (submission.source_merchant_order_id) next[submission.source_merchant_order_id] = submission;
            if (activeReviewModalTarget?.orderNumber) next[activeReviewModalTarget.orderNumber] = submission;
            return next;
          });
          setToastMessage("Penilaian dan ulasan Anda berhasil disimpan!");
          setToastType("success");
        }}
      />

      {/* PHASE 05A MODALS */}
      <CancelUnpaidCheckoutModal
        order={selectedOrderForCancelUnpaid}
        checkoutGroup={
          selectedOrderForCancelUnpaid?.checkoutGroupId
            ? checkoutGroups.find((g: any) => g.id === selectedOrderForCancelUnpaid.checkoutGroupId) || null
            : null
        }
        isOpen={!!selectedOrderForCancelUnpaid}
        onClose={() => setSelectedOrderForCancelUnpaid(null)}
        onConfirm={(groupId) => {
          cancelUnpaidCheckoutGroup(groupId, "Dibatalkan oleh Pelanggan");
          setSelectedOrderForCancelUnpaid(null);
          setProductFilterTab("BATAL");
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
          setProductFilterTab("BATAL");
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
          setProductFilterTab("SELESAI");
          setToastMessage("Pesanan telah berhasil dikonfirmasi selesai! Terima kasih. Dana telah diteruskan ke toko.");
          setToastType("success");
        }}
      />

      <ConfirmServiceCompletionModal
        order={selectedServiceOrderForCompletion}
        isOpen={!!selectedServiceOrderForCompletion}
        isSubmitting={isCompletingServiceOrder}
        onClose={() => {
          if (!isCompletingServiceOrder) {
            setSelectedServiceOrderForCompletion(null);
          }
        }}
        onConfirm={async (orderId) => {
          setIsCompletingServiceOrder(true);
          const targetOrder = selectedServiceOrderForCompletion;
          try {
            await confirmCustomerCompleted(orderId);
            setSelectedServiceOrderForCompletion(null);
            setCustomerServiceTab("SELESAI");
            const wDays = targetOrder?.serviceSnapshot?.warrantyDurationDays ?? 0;
            setToastMessage(
              wDays > 0
                ? `Pesanan selesai! Pekerjaan terkonfirmasi berfungsi baik & garansi resmi ${wDays} hari kini aktif.`
                : "Pesanan selesai! Pekerjaan terkonfirmasi tuntas & bekerja dengan baik."
            );
            setToastType("success");
            syncOrderJasa(true).catch(() => {});
          } catch (err: any) {
            setToastMessage(err?.message || "Gagal mengonfirmasi penyelesaian pesanan jasa.");
            setToastType("error");
          } finally {
            setIsCompletingServiceOrder(false);
          }
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
