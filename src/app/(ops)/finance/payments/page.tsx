"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bank,
  CheckCircle,
  WarningCircle,
  Clock,
  Check,
  X,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  CurrencyCircleDollar,
  ArrowsClockwise,
  Eye,
  SlidersHorizontal,
  PlayCircle,
  QrCode,
  CreditCard,
  Receipt,
  Printer,
  Package,
  MapPin,
  Storefront,
  ShoppingBag,
  Buildings,
  CalendarBlank,
  Wrench,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { orderBarangApi, AdminOrderDetailEntity } from "@/lib/orderBarangApi";
import { BackendPaymentIntent } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrder } from "@/features/order-jasa/types";

export default function PaymentGatewayOperationsPage() {
  const { orders: serviceOrders05B, simulateFinancePayment, refresh: syncOrderJasa } = useOrderJasa();
  const [payments, setPayments] = useState<BackendPaymentIntent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<"ALL" | "BARANG_05A" | "JASA_DIAGNOSIS" | "JASA_PENGERJAAN">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Detail Modal & Simulation Modal
  const [selectedPayment, setSelectedPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationPayment, setSimulationPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationOutcome, setSimulationOutcome] = useState<"PAID" | "FAILED">("PAID");
  const [isSimulating, setIsSimulating] = useState(false);

  // 05B Simulation & Detail
  const [simulation05BRow, setSimulation05BRow] = useState<{
    orderId: string;
    channel: "JASA_DIAGNOSIS" | "JASA_PENGERJAAN";
    invoiceNo: string;
    paymentId?: string;
    amount: number;
    method: string;
    serviceTitle: string;
  } | null>(null);

  const [selected05BOrder, setSelected05BOrder] = useState<{
    order: ServiceOrder;
    type: "DIAGNOSIS" | "EXECUTION";
  } | null>(null);

  // Struk & Rincian Barang State
  const [paymentOrders, setPaymentOrders] = useState<AdminOrderDetailEntity[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchPayments = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const res = await financeApi.ops.payments({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        method: methodFilter !== "ALL" ? methodFilter : undefined,
        page: currentPage,
        per_page: 15,
      });

      if (res) {
        const rawData = (res as any).data ?? res;
        if (Array.isArray(rawData)) {
          setPayments(rawData);
          setTotalCount(rawData.length);
        } else if (rawData && Array.isArray(rawData.data)) {
          setPayments(rawData.data);
          setTotalCount(typeof rawData.total === "number" ? rawData.total : rawData.data.length);
          if (rawData.current_page) setCurrentPage(rawData.current_page);
          if (rawData.last_page) setLastPage(rawData.last_page);
        } else {
          setPayments([]);
          setTotalCount(0);
        }
      }
    } catch (err: unknown) {
      console.error("Gagal memuat pembayaran:", err);
      if (!isBackground) {
        setError(err instanceof Error ? err.message : "Gagal memuat log pembayaran.");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchPayments(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [statusFilter, methodFilter, currentPage]);

  // Helper status pesanan barang
  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "CREATED":
      case "PAYMENT_PENDING":
        return { label: "Menunggu Pembayaran", color: "bg-amber-100 text-amber-800" };
      case "CONFIRMED":
        return { label: "Pesanan Masuk", color: "bg-blue-100 text-blue-800" };
      case "PROCESSING":
        return { label: "Diproses Toko", color: "bg-indigo-100 text-indigo-800" };
      case "PACKED":
        return { label: "Dikemas", color: "bg-purple-100 text-purple-800" };
      case "DELIVERING":
        return { label: "Dalam Pengiriman", color: "bg-cyan-100 text-cyan-800" };
      case "DELIVERED":
        return { label: "Tiba di Tujuan", color: "bg-teal-100 text-teal-800" };
      case "COMPLETED":
        return { label: "Selesai", color: "bg-emerald-100 text-emerald-800" };
      case "CANCELLED":
        return { label: "Dibatalkan", color: "bg-rose-100 text-rose-800" };
      default:
        return { label: status, color: "bg-slate-100 text-slate-800" };
    }
  };

  // Muat rincian pesanan dan barang yang dibeli saat modal rincian pembayaran dibuka
  useEffect(() => {
    if (!selectedPayment) {
      setPaymentOrders([]);
      setLoadingOrders(false);
      return;
    }

    const loadOrdersForPayment = async () => {
      try {
        setLoadingOrders(true);
        const checkoutGroupId =
          selectedPayment.checkout?.checkout_group_id || selectedPayment.finance_checkout_id;

        let foundOrders: AdminOrderDetailEntity[] = [];

        if (checkoutGroupId) {
          const res = await orderBarangApi.admin.getOrders({
            search: checkoutGroupId,
            per_page: 50,
          });
          if (res?.data?.data && res.data.data.length > 0) {
            foundOrders = res.data.data.filter(
              (o) => o.checkout_group_id === checkoutGroupId || o.order_number?.includes(checkoutGroupId)
            );
            if (foundOrders.length === 0) {
              foundOrders = res.data.data;
            }
          }
        }

        if (foundOrders.length === 0) {
          const resByPayId = await orderBarangApi.admin.getOrders({
            search: selectedPayment.id,
            per_page: 20,
          });
          if (resByPayId?.data?.data && resByPayId.data.data.length > 0) {
            foundOrders = resByPayId.data.data;
          }
        }

        setPaymentOrders(foundOrders);
      } catch (err) {
        console.error("Gagal memuat detail pesanan untuk struk:", err);
        setPaymentOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrdersForPayment();
  }, [selectedPayment]);

  // Data penerima dan alamat pengiriman dari pesanan
  const recipientInfo = useMemo(() => {
    if (!paymentOrders || paymentOrders.length === 0) {
      return null;
    }
    const firstOrder = paymentOrders[0];
    const recipient = firstOrder.recipient_snapshot || firstOrder.address_snapshot;
    const address = firstOrder.address_snapshot;
    if (!recipient && !address) return null;

    return {
      name: recipient?.recipient_name || address?.recipient_name || "Pelanggan SERVIO",
      phone: recipient?.recipient_phone || address?.recipient_phone || recipient?.phone || "-",
      label: address?.label || "Alamat Pengiriman",
      fullAddress: [
        address?.address_line,
        address?.subdistrict,
        address?.district,
        address?.city,
        address?.postal_code,
      ]
        .filter(Boolean)
        .join(", "),
    };
  }, [paymentOrders]);

  // Rincian perhitungan nominal struk
  const breakdownData = useMemo(() => {
    if (!selectedPayment) return null;

    const checkoutObj = selectedPayment.checkout as Record<string, any> | undefined;
    const productSubtotalFromCheckout = checkoutObj?.product_subtotal_idr ?? 0;
    const shippingTotalFromCheckout = checkoutObj?.shipping_total_idr ?? 0;
    const appFeeFromCheckout = checkoutObj?.customer_app_fee_idr ?? 2500;
    const taxTotalFromCheckout = checkoutObj?.customer_tax_total_idr ?? 0;

    if (paymentOrders && paymentOrders.length > 0) {
      const ordersProductSubtotal = paymentOrders.reduce(
        (sum, ord) => sum + (ord.product_subtotal_idr || 0),
        0
      );
      const ordersShippingTotal = paymentOrders.reduce(
        (sum, ord) => sum + (ord.shipping_customer_idr || 0),
        0
      );
      const ordersAppFee = paymentOrders.reduce(
        (sum, ord) => sum + (ord.app_fee_allocated_idr || 0),
        0
      );
      const ordersTax = paymentOrders.reduce(
        (sum, ord) => sum + (ord.customer_tax_allocated_idr || 0),
        0
      );

      return {
        productSubtotal: ordersProductSubtotal || productSubtotalFromCheckout,
        shippingTotal: ordersShippingTotal || shippingTotalFromCheckout,
        appFee: ordersAppFee || appFeeFromCheckout,
        taxTotal: ordersTax || taxTotalFromCheckout,
      };
    }

    return {
      productSubtotal: productSubtotalFromCheckout,
      shippingTotal: shippingTotalFromCheckout,
      appFee: appFeeFromCheckout,
      taxTotal: taxTotalFromCheckout,
    };
  }, [selectedPayment, paymentOrders]);

  const handleSimulatePayment = async () => {
    if (simulation05BRow) {
      try {
        setIsSimulating(true);
        setError(null);
        await simulateFinancePayment(
          simulation05BRow.paymentId || simulation05BRow.invoiceNo,
          "PAID",
          simulation05BRow.orderId,
          simulation05BRow.amount
        );
        setToastMessage(`Simulasi Berhasil: Tagihan ${simulation05BRow.invoiceNo} terkonfirmasi PAID.`);
        setSimulation05BRow(null);
        await syncOrderJasa(true);
        await fetchPayments(true);
      } catch (err: any) {
        setError(err?.message || "Gagal melakukan simulasi pembayaran jasa.");
      } finally {
        setIsSimulating(false);
      }
      return;
    }

    if (!simulationPayment) return;
    try {
      setIsSimulating(true);
      setError(null);
      const providerEventId = `sim-evt-${Date.now()}`;
      await financeApi.demo.simulatePayment(simulationPayment.id, {
        outcome: simulationOutcome,
        provider_event_id: providerEventId,
        reported_amount_idr: simulationPayment.amount_idr,
      });

      setToastMessage(
        `Simulasi pembayaran ${simulationPayment.id} berhasil diproses dengan status ${simulationOutcome}!`
      );
      setSimulationPayment(null);
      await fetchPayments();
    } catch (err: unknown) {
      console.error("Gagal memproses simulasi:", err);
      setError(err instanceof Error ? err.message : "Gagal memproses simulasi pembayaran.");
    } finally {
      setIsSimulating(false);
    }
  };

  // 05B Service Payment Rows
  const service05BRows = useMemo(() => {
    const rows: {
      id: string;
      paymentId?: string;
      orderId: string;
      orderNumber: string;
      channel: "JASA_DIAGNOSIS" | "JASA_PENGERJAAN";
      serviceTitle: string;
      customerName: string;
      providerName: string;
      method: string;
      amount: number;
      status: "PENDING" | "PAID" | "EXPIRED" | "OVERDUE" | "CANCELLED";
      expiresAt: string;
      paidAt?: string;
      createdAt: string;
      rawOrder: ServiceOrder;
    }[] = [];

    serviceOrders05B.forEach((order) => {
      const rawTitle = order.serviceSnapshot?.title || "";
      const isBadTitle =
        !rawTitle ||
        rawTitle.toLowerCase().includes("service offering") ||
        /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle);
      const cleanServiceTitle = isBadTitle
        ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
        : rawTitle;

      // 1. Diagnosis Payment
      if (order.paymentSummary.diagnosisPayment && order.paymentSummary.diagnosisPayment.amount > 0) {
        const dp = order.paymentSummary.diagnosisPayment;
        rows.push({
          id: dp.invoiceNo,
          paymentId: dp.paymentId || dp.invoiceNo,
          orderId: order.id,
          orderNumber: order.orderNumber,
          channel: "JASA_DIAGNOSIS",
          serviceTitle: cleanServiceTitle,
          customerName: order.customerName,
          providerName:
            order.providerName && order.providerName !== "PT Servio Mandiri Teknik"
              ? order.providerName
              : "sukses gembira",
          method: dp.method,
          amount: dp.amount,
          status: dp.status,
          expiresAt: dp.expiresAt,
          paidAt: dp.paidAt,
          createdAt: order.createdAt,
          rawOrder: order,
        });
      }

      // 2. Execution Payment
      if (order.paymentSummary.executionPayment) {
        const ep = order.paymentSummary.executionPayment;
        rows.push({
          id: ep.invoiceNo,
          paymentId: ep.paymentId || ep.invoiceNo,
          orderId: order.id,
          orderNumber: order.orderNumber,
          channel: "JASA_PENGERJAAN",
          serviceTitle: cleanServiceTitle,
          customerName: order.customerName,
          providerName:
            order.providerName && order.providerName !== "PT Servio Mandiri Teknik"
              ? order.providerName
              : "sukses gembira",
          method: ep.method,
          amount: ep.amount,
          status: ep.status,
          expiresAt: ep.expiresAt,
          paidAt: ep.paidAt,
          createdAt: order.createdAt,
          rawOrder: order,
        });
      }
    });

    return rows;
  }, [serviceOrders05B]);

  const filtered05BRows = useMemo(() => {
    return service05BRows.filter((row) => {
      if (channelFilter === "BARANG_05A") return false;
      if (channelFilter === "JASA_DIAGNOSIS" && row.channel !== "JASA_DIAGNOSIS") return false;
      if (channelFilter === "JASA_PENGERJAAN" && row.channel !== "JASA_PENGERJAAN") return false;

      if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
      if (methodFilter !== "ALL" && !row.method.includes(methodFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = row.id.toLowerCase().includes(q);
        const matchesOrder = row.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = row.customerName.toLowerCase().includes(q);
        const matchesProvider = row.providerName.toLowerCase().includes(q);
        const matchesService = row.serviceTitle.toLowerCase().includes(q);
        if (!matchesId && !matchesOrder && !matchesCustomer && !matchesProvider && !matchesService) {
          return false;
        }
      }

      return true;
    });
  }, [service05BRows, channelFilter, statusFilter, methodFilter, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (channelFilter === "JASA_DIAGNOSIS" || channelFilter === "JASA_PENGERJAAN") return [];
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.finance_checkout_id && p.finance_checkout_id.toLowerCase().includes(q)) ||
        (p.checkout?.checkout_group_id && p.checkout.checkout_group_id.toLowerCase().includes(q)) ||
        (p.provider_reference && p.provider_reference.toLowerCase().includes(q))
    );
  }, [payments, searchQuery, channelFilter]);

  return (
    <div className="space-y-6 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Log Ingesti Gerbang Pembayaran
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 mt-1">
            Monitoring Pembayaran Checkout
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit status transaksi pembayaran Customer (QRIS / Virtual Account), batas kedaluwarsa 6 jam, verifikasi PAID, dan kontrol simulasi demo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {totalCount + service05BRows.length} Transaksi
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPayments(false)}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* CHANNEL FILTER TABS (SECTION 22) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {[
          { id: "ALL" as const, label: "Semua Transaksi", count: totalCount + service05BRows.length },
          { id: "BARANG_05A" as const, label: "Order Barang 05A", count: totalCount },
          {
            id: "JASA_DIAGNOSIS" as const,
            label: "Order Jasa — Diagnosis (05B)",
            count: service05BRows.filter((r) => r.channel === "JASA_DIAGNOSIS").length,
          },
          {
            id: "JASA_PENGERJAAN" as const,
            label: "Order Jasa — Pengerjaan (05B)",
            count: service05BRows.filter((r) => r.channel === "JASA_PENGERJAAN").length,
          },
        ].map((tab) => {
          const isActive = channelFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelFilter(tab.id)}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-[#0F4C81] text-white shadow-servio-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Payment ID, Checkout Group, atau Provider Ref..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Metode</option>
            <option value="QRIS">QRIS</option>
            <option value="BCA_VA">BCA Virtual Account</option>
            <option value="MANDIRI_VA">Mandiri Virtual Account</option>
            <option value="BRI_VA">BRI Virtual Account</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat log transaksi pembayaran...</p>
          </div>
        ) : (filteredPayments.length === 0 && filtered05BRows.length === 0) ? (
          <div className="p-16 text-center">
            <EmptyState
              title="Tidak Ada Transaksi Pembayaran"
              description="Belum ada transaksi pembayaran yang cocok dengan filter atau kriteria pencarian yang Anda tentukan."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">ID Pembayaran</th>
                  <th className="py-3.5 px-4">Checkout Group</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4">Nominal (IDR)</th>
                  <th className="py-3.5 px-4">Status & Waktu</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {/* 1. 05B Service Order Transaction Rows */}
                {filtered05BRows.map((row) => (
                  <tr key={row.id} className="hover:bg-sky-50/40 transition-colors bg-sky-50/15">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{row.id}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-[#0F4C81]">
                          05B JASA
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Mitra: {row.providerName}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-slate-700">
                      <div className="font-bold text-slate-800">#{row.orderNumber}</div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                        {row.serviceTitle} ({row.customerName})
                      </span>
                      <span className="text-[9px] font-semibold text-sky-700">
                        {row.channel === "JASA_DIAGNOSIS" ? "Biaya Diagnosis" : "Biaya Pengerjaan"}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        {row.method === "QRIS" ? (
                          <QrCode className="w-4 h-4 text-[#0F4C81]" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-emerald-700" />
                        )}
                        <span>{row.method}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      Rp {row.amount.toLocaleString("id-ID")}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          row.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : row.status === "OVERDUE"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {row.paidAt
                          ? `Lunas: ${row.paidAt}`
                          : `Batas: ${new Date(row.expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelected05BOrder({
                              order: row.rawOrder,
                              type: row.channel === "JASA_DIAGNOSIS" ? "DIAGNOSIS" : "EXECUTION",
                            })
                          }
                          className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Rincian
                        </Button>

                        {row.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              setSimulation05BRow({
                                orderId: row.orderId,
                                channel: row.channel,
                                invoiceNo: row.id,
                                paymentId: (row as any).paymentId,
                                amount: row.amount,
                                method: row.method,
                                serviceTitle: row.serviceTitle,
                              })
                            }
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                          >
                            <PlayCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* 2. Existing 05A Product Transaction Rows */}
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">{payment.id}</div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Provider: {payment.provider}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-slate-700">
                      {payment.checkout?.checkout_group_id || payment.finance_checkout_id || "-"}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        {payment.method === "QRIS" ? (
                          <QrCode className="w-4 h-4 text-[#0F4C81]" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-emerald-700" />
                        )}
                        <span>{payment.method}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-black text-slate-900">
                        Rp {payment.amount_idr.toLocaleString("id-ID")}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block mb-1 ${
                          payment.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : payment.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : payment.status === "EXPIRED"
                            ? "bg-slate-100 text-slate-700"
                            : payment.status === "PARTIALLY_REFUNDED" || payment.status === "REFUNDED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {payment.paid_at
                          ? `Dibayar: ${new Date(payment.paid_at).toLocaleString("id-ID")}`
                          : `Dibuat: ${new Date(payment.issued_at).toLocaleString("id-ID")}`}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                          className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Rincian
                        </Button>

                        {/* Demo simulator only for PENDING payments in testing/demo mode */}
                        {payment.status === "PENDING" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSimulationPayment(payment);
                              setSimulationOutcome("PAID");
                            }}
                            className="text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                          >
                            <PlayCircle className="w-3.5 h-3.5 mr-1" weight="bold" />
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {lastPage > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{currentPage}</strong> dari <strong>{lastPage}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs rounded-xl"
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= lastPage || loading}
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                className="text-xs rounded-xl"
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: Struk Rincian Belanja & Pembayaran
         ========================================================================= */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C81]/10 flex items-center justify-center text-[#0F4C81] shrink-0">
              <Receipt className="w-5 h-5" weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-black font-display text-slate-900 leading-tight">
                Struk Rincian Belanja & Pembayaran
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">
                Rincian transaksi pembayaran, proteksi dana escrow, dan struk belanja barang
              </p>
            </div>
          </div>
        }
        size="2xl"
      >
        {selectedPayment && (
          <div id="finance-receipt-area" className="space-y-4 text-left font-body text-xs">
            {/* Kartu Struk Digital Modern */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
              {/* Header Struk: Brand, Payment ID, Status & Metode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-slate-900 text-base tracking-wide">
                      SERVIO
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 tracking-wider">
                      STRUK DIGITAL RESMI
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-600 mt-1">
                    No. Pembayaran: <strong className="text-slate-900 font-bold">{selectedPayment.id}</strong>
                  </div>
                  {selectedPayment.checkout?.checkout_group_id && (
                    <div className="font-mono text-[10px] text-slate-400">
                      Grup Checkout: {selectedPayment.checkout.checkout_group_id}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 border shadow-2xs ${
                      selectedPayment.status === "PAID"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : selectedPayment.status === "PENDING"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : selectedPayment.status === "EXPIRED"
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : selectedPayment.status === "PARTIALLY_REFUNDED" || selectedPayment.status === "REFUNDED"
                        ? "bg-purple-50 text-purple-800 border-purple-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    {selectedPayment.status === "PAID" && <CheckCircle className="w-3.5 h-3.5" weight="fill" />}
                    {selectedPayment.status === "PENDING" && <Clock className="w-3.5 h-3.5" weight="fill" />}
                    {selectedPayment.status}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 font-mono">
                    Metode: <strong className="text-slate-800">{selectedPayment.method}</strong> ({selectedPayment.provider})
                  </span>
                </div>
              </div>

              {/* Timestamp & Batas Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Waktu Diterbitkan:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {new Date(selectedPayment.issued_at).toLocaleString("id-ID")}
                  </span>
                </div>
                {selectedPayment.paid_at ? (
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 font-semibold">Waktu Terverifikasi LUNAS:</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {new Date(selectedPayment.paid_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : selectedPayment.expires_at ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Batas Kedaluwarsa (6 Jam):</span>
                    <span className="font-mono text-slate-700">
                      {new Date(selectedPayment.expires_at).toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Penerima & Alamat Pengiriman */}
              {recipientInfo && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MapPin className="w-4 h-4 text-[#0F4C81]" weight="bold" />
                    <span>Penerima & Alamat Tujuan Pengiriman</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-bold text-slate-900">{recipientInfo.name}</span>
                    {recipientInfo.phone && (
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">({recipientInfo.phone})</span>
                    )}
                    {recipientInfo.label && (
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {recipientInfo.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {recipientInfo.fullAddress}
                  </p>
                </div>
              )}

              {/* Rincian Barang yang Dibeli (Itemized Products Breakdown) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShoppingBag className="w-4 h-4 text-[#0F4C81]" weight="bold" />
                    <span>Rincian Barang yang Dibeli (Struk Belanja)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {loadingOrders
                      ? "Mengambil data produk..."
                      : paymentOrders.length > 0
                      ? `${paymentOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)} Produk Dipesan`
                      : "Data Transaksi"}
                  </span>
                </div>

                {loadingOrders ? (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200/80 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <ArrowsClockwise className="w-6 h-6 animate-spin text-[#0F4C81]" />
                    <span className="text-xs text-slate-500 font-medium">Memuat rincian struk barang...</span>
                  </div>
                ) : paymentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {paymentOrders.map((order) => {
                      const storeName = order.merchant_display_snapshot?.name || "Toko Mitra SERVIO";
                      const storeCity = order.merchant_display_snapshot?.city;
                      const statusInfo = getOrderStatusLabel(order.status);

                      return (
                        <div
                          key={order.id}
                          className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3 shadow-2xs"
                        >
                          {/* Info Toko / Merchant */}
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Storefront className="w-4 h-4 text-emerald-700 shrink-0" weight="bold" />
                              <span className="font-bold text-slate-900 text-xs">{storeName}</span>
                              {storeCity && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {storeCity}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">
                                {order.order_number}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>

                          {/* List Produk pada Toko ini */}
                          <div className="space-y-2.5">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => {
                                const productName =
                                  item.product_snapshot?.name || item.name || "Produk Suku Cadang";
                                const variantName = item.variant_snapshot?.name || (item as any).variant_name;
                                const sku = item.variant_snapshot?.sku || item.sku;
                                const itemImage =
                                  item.product_image_ref || item.product_snapshot?.image_url;
                                const unitPrice =
                                  item.unit_price_idr || (item.variant_snapshot?.price_idr ?? 0);
                                const subtotal =
                                  item.line_subtotal_idr || item.quantity * unitPrice;

                                return (
                                  <div
                                    key={item.id || idx}
                                    className="flex items-center gap-3.5 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                                      {itemImage ? (
                                        <img
                                          src={itemImage}
                                          alt={productName}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <Package className="w-6 h-6 text-slate-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-slate-900 text-xs truncate">
                                        {productName}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                        {variantName && (
                                          <span className="px-1.5 py-0.2 rounded bg-slate-200 font-semibold text-slate-700 text-[10px]">
                                            {variantName}
                                          </span>
                                        )}
                                        {sku && (
                                          <span className="font-mono text-[10px] text-slate-400">
                                            {sku}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 text-[11px] text-slate-600">
                                        <span className="font-bold text-slate-800">
                                          {item.quantity}x
                                        </span>{" "}
                                        @ Rp {unitPrice.toLocaleString("id-ID")}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-black text-slate-900 text-xs">
                                        Rp {subtotal.toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs text-slate-400 py-2 italic">
                                Tidak ada data rincian item barang spesifik.
                              </div>
                            )}
                          </div>

                          {/* Subtotal Toko */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                            <span>Subtotal Toko (Produk & Ongkir):</span>
                            <span className="font-bold text-slate-800">
                              Rp {(order.customer_total_idr || 0).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-slate-500 text-xs text-center space-y-1">
                    <p className="font-semibold text-slate-700">
                      Transaksi Pembayaran Tanpa Keranjang Multi-Toko
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Rincian item barang belum ditautkan pada transaksi pembayaran ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Garis Dashed Khas Struk Belanja */}
              <div className="relative py-1">
                <div className="border-t-2 border-dashed border-slate-300" />
              </div>

              {/* Rincian Kalkulasi Pembayaran (Receipt Breakdown) */}
              <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200/80 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Produk:</span>
                  <strong className="text-slate-900">
                    Rp {(breakdownData?.productSubtotal || 0).toLocaleString("id-ID")}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Ongkos Kirim:</span>
                  <strong className="text-slate-900">
                    Rp {(breakdownData?.shippingTotal || 0).toLocaleString("id-ID")}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan Aplikasi:</span>
                  <strong className="text-slate-900">
                    Rp {(breakdownData?.appFee || 0).toLocaleString("id-ID")}
                  </strong>
                </div>
                {(breakdownData?.taxTotal || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Pajak (PPN):</span>
                    <strong className="text-slate-900">
                      Rp {breakdownData!.taxTotal.toLocaleString("id-ID")}
                    </strong>
                  </div>
                )}

                {/* Garis Total Tagihan */}
                <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">
                      Total Nominal Pembayaran
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Status: {selectedPayment.status} • Metode: {selectedPayment.method}
                    </span>
                  </div>
                  <span className="text-xl font-black text-[#0F4C81]">
                    Rp {selectedPayment.amount_idr.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* Proteksi Rekening Escrow Platform */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-[11px] text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" weight="fill" />
                <div className="space-y-0.5">
                  <strong className="font-bold text-emerald-900 block">
                    Proteksi Rekening Escrow Platform SERVIO
                  </strong>
                  <p className="text-emerald-800/90 leading-relaxed text-[11px]">
                    Seluruh dana pembayaran pesanan ini diamankan di rekening escrow SERVIO. Dana baru akan diteruskan dan dicairkan ke saldo toko mitra secara otomatis setelah barang pesanan dipastikan sampai di tujuan dan pesanan diselesaikan oleh pelanggan.
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Aksi Modal */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Struk</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedPayment(null)}
                className="rounded-xl text-xs font-bold bg-[#0F4C81] hover:bg-[#0d3f6c] text-white px-6"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: Simulator Demo Pembayaran (Finance Ops Non-Production Only)
         ========================================================================= */}
      <Modal
        isOpen={!!simulationPayment}
        onClose={() => !isSimulating && setSimulationPayment(null)}
        title="Verifikasi Status Pembayaran Gateway"
        size="md"
      >
        {simulationPayment && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
              <strong>Verifikasi Operasional Finance:</strong> Dieksekusi oleh Finance Ops yang terotorisasi untuk memverifikasi status settlement pembayaran dan sinkronisasi status PAID.
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-slate-900">{simulationPayment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal:</span>
                <span className="font-bold text-slate-900">
                  Rp {simulationPayment.amount_idr.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Pilih Status Verifikasi
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSimulationOutcome("PAID")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    simulationOutcome === "PAID"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                  <span>Sukses (PAID)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationOutcome("FAILED")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    simulationOutcome === "FAILED"
                      ? "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <WarningCircle size={16} weight="fill" className="text-rose-600" />
                  <span>Gagal (FAILED)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isSimulating}
                onClick={() => setSimulationPayment(null)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSimulating}
                onClick={handleSimulatePayment}
                className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isSimulating ? "Memproses..." : "Konfirmasi Status Pembayaran"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 05B Verification Modal */}
      <Modal
          isOpen={!!simulation05BRow}
          onClose={() => !isSimulating && setSimulation05BRow(null)}
          title="Verifikasi Pembayaran Jasa 05B"
          size="md"
        >
          {simulation05BRow && (
            <div className="space-y-4 text-left font-body text-xs">
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 leading-relaxed">
                <strong>Verifikasi Pembayaran Jasa:</strong> Konfirmasi pembayaran tagihan jasa dan sinkronkan status secara langsung ke Customer, Worker, Provider, dan Admin.
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Tagihan:</span>
                  <span className="font-mono font-bold text-slate-900">{simulation05BRow.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jenis Pembayaran:</span>
                  <span className="font-bold text-[#0F4C81]">
                    {simulation05BRow.channel === "JASA_DIAGNOSIS" ? "Biaya Diagnosis Murni" : "Biaya Pengerjaan Final"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Layanan:</span>
                  <span className="font-semibold text-slate-800">{simulation05BRow.serviceTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nominal:</span>
                  <span className="font-bold text-slate-900">
                    Rp {simulation05BRow.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSimulating}
                  onClick={() => setSimulation05BRow(null)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSimulating}
                  onClick={handleSimulatePayment}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSimulating ? "Memproses..." : "Konfirmasi Pembayaran Berhasil (PAID)"}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* =========================================================================
            MODAL: Struk Rincian Tagihan & Pembayaran Jasa 05B (Resmi & Lengkap)
           ========================================================================= */}
        <Modal
          isOpen={!!selected05BOrder}
          onClose={() => setSelected05BOrder(null)}
          title={
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl bg-[#0F4C81]/10 flex items-center justify-center text-[#0F4C81] shrink-0">
                <Receipt className="w-5 h-5" weight="bold" />
              </div>
              <div>
                <h3 className="text-base font-black font-display text-slate-900 leading-tight">
                  Struk Rincian Tagihan &amp; Pembayaran Jasa
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  Rincian transaksi pembayaran, proteksi dana escrow, dan struk pesanan jasa
                </p>
              </div>
            </div>
          }
          size="2xl"
        >
          {selected05BOrder && (() => {
            const order = selected05BOrder.order;
            const isDiagnosis = selected05BOrder.type === "DIAGNOSIS";
            const payment = isDiagnosis
              ? order.paymentSummary.diagnosisPayment
              : order.paymentSummary.executionPayment;

            const paymentId = payment?.invoiceNo || (isDiagnosis ? `INV-DIAG-${order.orderNumber}` : `INV-EXEC-${order.orderNumber}`);
            const paymentStatus = payment?.status || (isDiagnosis
              ? (order.subStatus === "DIAGNOSIS_PENDING" ? "PENDING" : "PAID")
              : (order.subStatus === "WORK_FINISHED" || order.subStatus === "EXECUTION_PENDING" ? "PENDING" : "PAID"));

            const paymentMethod = payment?.method || (isDiagnosis ? "QRIS" : "BCA_VA");
            const paymentAmount = payment?.amount ?? (isDiagnosis ? 50000 : (order.diagnosis?.costBreakdown?.grandTotal ?? 0));
            const issuedAt = order.createdAt;
            const paidAt = payment?.paidAt;
            const expiresAt = payment?.expiresAt;

            return (
              <div id="finance-service-receipt-area" className="space-y-4 text-left font-body text-xs">
                {/* Kartu Struk Digital Modern */}
                <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
                  {/* Header Struk: Brand, Payment ID, Status & Metode */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-slate-900 text-base tracking-wide">
                          SERVIO
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 tracking-wider">
                          STRUK DIGITAL RESMI
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-600 mt-1">
                        No. Tagihan: <strong className="text-slate-900 font-bold">{paymentId}</strong>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        No. Order Layanan: #{order.orderNumber}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 border shadow-2xs ${
                          paymentStatus === "PAID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : paymentStatus === "PENDING"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : paymentStatus === "OVERDUE"
                            ? "bg-rose-50 text-rose-800 border-rose-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {paymentStatus === "PAID" && <CheckCircle className="w-3.5 h-3.5" weight="fill" />}
                        {paymentStatus === "PENDING" && <Clock className="w-3.5 h-3.5" weight="fill" />}
                        {paymentStatus}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 font-mono">
                        Metode: <strong className="text-slate-800">{paymentMethod}</strong> (SERVIO ESCROW)
                      </span>
                    </div>
                  </div>

                  {/* Timestamp & Batas Waktu */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Waktu Diterbitkan:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {issuedAt ? new Date(issuedAt).toLocaleString("id-ID") : "-"}
                      </span>
                    </div>
                    {paidAt ? (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-semibold">Waktu Terverifikasi LUNAS:</span>
                        <span className="font-mono font-bold text-emerald-800">
                          {new Date(paidAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    ) : expiresAt ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Batas Kedaluwarsa:</span>
                        <span className="font-mono text-slate-700">
                          {new Date(expiresAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Kategori Tagihan:</span>
                        <span className="font-semibold text-primary">
                          {isDiagnosis ? "Biaya Diagnosis Awal" : "Pelunasan Pengerjaan"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pelanggan & Alamat Lokasi Pengerjaan */}
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <MapPin className="w-4 h-4 text-[#0F4C81]" weight="bold" />
                      <span>Pelanggan &amp; Alamat Lokasi Pengerjaan</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-bold text-slate-900">{order.addressSnapshot.recipientName || order.customerName}</span>
                      {order.addressSnapshot.phone && (
                        <span className="text-slate-500 ml-2 font-mono text-[11px]">({order.addressSnapshot.phone})</span>
                      )}
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Lokasi Servis
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {order.addressSnapshot.fullAddress}, {order.addressSnapshot.city}
                    </p>
                    {order.addressSnapshot.notes && (
                      <div className="text-[10px] text-slate-400 italic">
                        Catatan Akses: {order.addressSnapshot.notes}
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarBlank className="w-3.5 h-3.5 text-primary" weight="bold" />
                        <span>Jadwal Kunjungan: <strong className="text-slate-800">{order.schedule.date}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{order.schedule.timeSlot}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rincian Layanan & Pekerjaan yang Dipesan (Struk Jasa) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Wrench className="w-4 h-4 text-[#0F4C81]" weight="bold" />
                        <span>Rincian Layanan &amp; Pekerjaan (Struk Jasa)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        1 Layanan Jasa Terstandar
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3 shadow-2xs">
                      {/* Info Mitra Provider */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Buildings className="w-4 h-4 text-emerald-700 shrink-0" weight="bold" />
                          <span className="font-bold text-slate-900 text-xs">
                            {order.providerName && order.providerName !== "PT Servio Mandiri Teknik"
                              ? order.providerName
                              : "sukses gembira"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {order.addressSnapshot.city}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                            {order.serviceSnapshot.subcategoryName || order.serviceSnapshot.categoryName || "Layanan Jasa"}
                          </span>
                        </div>
                      </div>

                      {/* Card Info Layanan Utama */}
                      <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                          {order.serviceSnapshot.thumbnailUrl ? (
                            <img
                              src={order.serviceSnapshot.thumbnailUrl}
                              alt={order.serviceSnapshot.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Wrench className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate">
                            {order.serviceSnapshot.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 font-semibold text-slate-700">
                              {order.serviceSnapshot.serviceMode === "HOME_SERVICE" ? "Kunjungan ke Rumah" : "Bengkel / Workshop"}
                            </span>
                            {order.serviceSnapshot.warrantyDurationDays && order.serviceSnapshot.warrantyDurationDays > 0 ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                Garansi {order.serviceSnapshot.warrantyDurationDays} Hari
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                                Tanpa Garansi
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                            <div>
                              <strong className="text-slate-800">Keluhan:</strong> {order.complaint.description || "Pemeriksaan & servis unit"}
                            </div>
                            {order.complaint.symptoms && order.complaint.symptoms.length > 0 && (
                              <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 items-center">
                                <span className="font-semibold text-slate-600">Gejala / Tipe:</span>
                                {order.complaint.symptoms.map((s, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rincian Item Pekerjaan & Suku Cadang */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Item Rincian Biaya:
                        </span>

                        {isDiagnosis ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                <Wrench className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">Biaya Survei Diagnostik Standar</span>
                                <span className="text-[10px] text-slate-500">1x Pemeriksaan menyeluruh &amp; diagnosa unit di lokasi</span>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              Rp {paymentAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {order.diagnosis?.costBreakdown?.workItems && order.diagnosis.costBreakdown.workItems.length > 0 ? (
                              order.diagnosis.costBreakdown.workItems.map((wi, i) => (
                                <div key={wi.id || i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{wi.title}</span>
                                    <span className="text-[10px] text-slate-500">Jasa Teknisi Perbaikan</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-900">
                                    Rp {wi.subtotal.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              ))
                            ) : null}

                            {order.diagnosis?.costBreakdown?.spareparts && order.diagnosis.costBreakdown.spareparts.length > 0 ? (
                              order.diagnosis.costBreakdown.spareparts.map((sp, i) => (
                                <div key={sp.id || i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{sp.name}</span>
                                    <span className="text-[10px] text-slate-500">{sp.qty}x @ Rp {(sp.unitPrice || 0).toLocaleString("id-ID")}</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-900">
                                    Rp {sp.subtotal.toLocaleString("id-ID")}
                                  </span>
                                </div>
                              ))
                            ) : null}

                            {(!order.diagnosis?.costBreakdown?.workItems || order.diagnosis.costBreakdown.workItems.length === 0) &&
                             (!order.diagnosis?.costBreakdown?.spareparts || order.diagnosis.costBreakdown.spareparts.length === 0) && (
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">Pelunasan Pengerjaan Teknis</span>
                                  <span className="text-[10px] text-slate-500">Tindakan perbaikan dan pengujian unit</span>
                                </div>
                                <span className="font-mono font-bold text-slate-900">
                                  Rp {paymentAmount.toLocaleString("id-ID")}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Subtotal Mitra */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <span>Subtotal Tagihan Mitra Jasa:</span>
                          <span className="font-bold text-slate-800">
                            Rp {paymentAmount.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Garis Dashed Khas Struk Belanja */}
                  <div className="relative py-1">
                    <div className="border-t-2 border-dashed border-slate-300" />
                  </div>

                  {/* Rincian Kalkulasi Pembayaran (Receipt Breakdown) */}
                  <div className="space-y-2 p-4 rounded-xl bg-white border border-slate-200/80 text-xs">
                    {isDiagnosis ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Survei Diagnostik:</span>
                          <strong className="text-slate-900 font-mono">
                            Rp {paymentAmount.toLocaleString("id-ID")}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Layanan Aplikasi:</span>
                          <strong className="text-emerald-700 font-mono">Rp 0 (Bebas Biaya Platform)</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Pajak (PPN):</span>
                          <strong className="text-slate-900 font-mono">Rp 0</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal Jasa Teknisi:</span>
                          <strong className="text-slate-900 font-mono">
                            Rp {(order.diagnosis?.costBreakdown?.workTotal ?? paymentAmount).toLocaleString("id-ID")}
                          </strong>
                        </div>
                        {(order.diagnosis?.costBreakdown?.sparepartTotal || 0) > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Subtotal Suku Cadang:</span>
                            <strong className="text-slate-900 font-mono">
                              Rp {order.diagnosis!.costBreakdown.sparepartTotal.toLocaleString("id-ID")}
                            </strong>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Biaya Layanan Platform:</span>
                          <strong className="text-slate-900 font-mono">Rp 0</strong>
                        </div>
                      </>
                    )}

                    {/* Garis Total Tagihan */}
                    <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">
                          Total Nominal Tagihan
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Status: {paymentStatus} • Metode: {paymentMethod}
                        </span>
                      </div>
                      <span className="text-xl font-black text-[#0F4C81] font-mono">
                        Rp {paymentAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Proteksi Rekening Escrow Platform */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-[11px] text-emerald-950">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" weight="fill" />
                    <div className="space-y-0.5">
                      <strong className="font-bold text-emerald-900 block">
                        Proteksi Rekening Escrow Platform SERVIO
                      </strong>
                      <p className="text-emerald-800/90 leading-relaxed text-[11px]">
                        {isDiagnosis
                          ? "Dana biaya survei diagnosis diamankan di rekening escrow resmi SERVIO. Mitra hanya berhak atas dana setelah teknisi terverifikasi hadir di lokasi dan menyerahkan hasil diagnosa unit kepada pelanggan."
                          : `Seluruh dana pelunasan perbaikan diamankan di rekening penampung resmi SERVIO. Dana baru akan diteruskan dan dicairkan ke saldo mitra teknisi/bengkel secara otomatis setelah hasil pekerjaan diverifikasi selesai dan dilindungi ${
                              order.serviceSnapshot.warrantyDurationDays && order.serviceSnapshot.warrantyDurationDays > 0
                                ? `garansi ${order.serviceSnapshot.warrantyDurationDays} hari Servio`
                                : "jaminan mutu standar Servio"
                            }.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Modal */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Cetak Struk</span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelected05BOrder(null)}
                    className="rounded-xl text-xs font-bold bg-[#0F4C81] hover:bg-[#0d3f6c] text-white px-6"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
  );
}
