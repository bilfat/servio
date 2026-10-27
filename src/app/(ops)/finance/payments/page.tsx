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
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import { orderBarangApi, AdminOrderDetailEntity } from "@/lib/orderBarangApi";
import { BackendPaymentIntent } from "@/types/finance";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

export default function PaymentGatewayOperationsPage() {
  const [payments, setPayments] = useState<BackendPaymentIntent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Detail Modal & Simulation Modal
  const [selectedPayment, setSelectedPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationPayment, setSimulationPayment] = useState<BackendPaymentIntent | null>(null);
  const [simulationOutcome, setSimulationOutcome] = useState<"PAID" | "FAILED">("PAID");
  const [isSimulating, setIsSimulating] = useState(false);

  // Struk & Rincian Barang State
  const [paymentOrders, setPaymentOrders] = useState<AdminOrderDetailEntity[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.ops.payments({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        method: methodFilter !== "ALL" ? methodFilter : undefined,
        page: currentPage,
        per_page: 15,
      });

      if (res && res.data) {
        setPayments(res.data.data || []);
        setTotalCount(res.data.total || 0);
        setCurrentPage(res.data.current_page || 1);
        setLastPage(res.data.last_page || 1);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat pembayaran:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat log pembayaran.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
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

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        (p.finance_checkout_id && p.finance_checkout_id.toLowerCase().includes(q)) ||
        (p.checkout?.checkout_group_id && p.checkout.checkout_group_id.toLowerCase().includes(q)) ||
        (p.provider_reference && p.provider_reference.toLowerCase().includes(q))
    );
  }, [payments, searchQuery]);

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
            Total {totalCount} Transaksi
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-[#0F4C81]" : "text-slate-500"}`} />
            Segarkan
          </Button>
        </div>
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
        ) : filteredPayments.length === 0 ? (
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
                            Simulasi
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
        title="Simulasi Pembayaran Mock Gateway"
        size="md"
      >
        {simulationPayment && (
          <div className="space-y-4 text-left font-body text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
              <strong>Simulasi Khusus Demo:</strong> Hanya dapat dieksekusi oleh Finance Ops yang terotorisasi di lingkungan testing/demo untuk menguji respons outbox dan verifikasi PAID.
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
                Pilih Hasil Simulasi
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
                {isSimulating ? "Memproses..." : "Kirim Simulasi Gateway"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
