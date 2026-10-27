"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { formatRupiah } from "@/features/order-barang/helpers";
import { Toast } from "@/components/feedback/Toast";
import { Modal } from "@/components/ui/Modal";
import {
  QrCode,
  Bank,
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
  Copy,
  Storefront,
  ArrowLeft,
  ShieldCheck,
  Package,
  Receipt,
  ArrowsClockwise,
  CreditCard,
  CaretRight,
  CircleNotch,
  Info,
  House,
} from "@phosphor-icons/react";
import {
  orderBarangApi,
  CheckoutCreatedResponse,
  CheckoutCreatedOrder,
  PaymentProjectionResponse,
  PaymentIntentResponse,
} from "@/lib/orderBarangApi";
import { financeServiceApi, FinancePaymentDetail } from "@/lib/financeServiceApi";

function ProductPaymentContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from"); // "checkout" | "card" | "detail" | null
  const originOrderId = searchParams.get("orderId");
  const paymentParam = (params?.paymentId as string) || "";

  const [checkoutGroup, setCheckoutGroup] = useState<CheckoutCreatedResponse | null>(null);
  const [paymentProjection, setPaymentProjection] = useState<PaymentProjectionResponse | null>(null);
  const [financePayment, setFinancePayment] = useState<FinancePaymentDetail | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Method selection
  const [selectedMethod, setSelectedMethod] = useState<"QRIS" | "VA">("QRIS");
  const [selectedBank, setSelectedBank] = useState<"BCA" | "BRI" | "MANDIRI" | "BNI">("BCA");
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);

  // Modals & toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Load checkout group and payment details
  const fetchPaymentData = useCallback(
    async (isManualRefresh = false) => {
      if (!paymentParam) return;

      if (isManualRefresh) setIsRefreshing(true);
      try {
        // 1. Load checkout group
        const groupRes = await orderBarangApi.customer.getCheckout(paymentParam);
        const group = groupRes.data as CheckoutCreatedResponse;
        if (!group) {
          throw new Error("CheckoutGroup tidak ditemukan.");
        }
        setCheckoutGroup(group);

        // 2. Load payment projection from order-barang
        const projRes = await orderBarangApi.customer.getCheckoutPayment(paymentParam);
        const proj = projRes.data as PaymentProjectionResponse;
        setPaymentProjection(proj);

        // 3. If finance_payment_id is available, load directly from Finance Service
        const finPaymentId = proj?.finance_payment_id || (group as any)?.finance_payment_id;
        if (finPaymentId) {
          try {
            const finRes = await financeServiceApi.customer.getPayment(finPaymentId);
            if (finRes.data) {
              setFinancePayment(finRes.data as FinancePaymentDetail);
            }
          } catch (e) {
            console.warn("Could not load direct Finance payment:", e);
          }
        } else if (group && ((group as any).orchestration_status === "FINANCE_QUOTED" || group.payment_status_projection === "PENDING")) {
          // Auto-initiate payment intent if not yet created
          try {
            const intentRes = await orderBarangApi.customer.createPaymentIntent(paymentParam, "QRIS");
            if (intentRes.data) {
              setPaymentIntent(intentRes.data as PaymentIntentResponse);
              const updatedProj = await orderBarangApi.customer.getCheckoutPayment(paymentParam);
              if (updatedProj.data) setPaymentProjection(updatedProj.data as PaymentProjectionResponse);
              if (intentRes.data.payment_id) {
                const finRes = await financeServiceApi.customer.getPayment(intentRes.data.payment_id);
                if (finRes.data) setFinancePayment(finRes.data as FinancePaymentDetail);
              }
            }
          } catch (e) {
            console.warn("Auto-create payment intent on payment page failed:", e);
          }
        }
      } catch (err: any) {
        setLoadError(err?.message || "Gagal memuat informasi tagihan pembayaran.");
      } finally {
        setIsLoading(false);
        if (isManualRefresh) setIsRefreshing(false);
      }
    },
    [paymentParam]
  );

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  // Request or update payment intent when method changes
  const switchPaymentMethod = async (method: "QRIS" | "VA", bank?: "BCA" | "BRI" | "MANDIRI" | "BNI") => {
    if (!checkoutGroup) return;

    setIsSwitchingMethod(true);
    try {
      const intentMethod = method === "QRIS" ? "QRIS" : `MOCK_VA_${bank || selectedBank}`;
      const res = await orderBarangApi.customer.createPaymentIntent(
        checkoutGroup.id,
        intentMethod as any
      );
      if (res.data) {
        setPaymentIntent(res.data as PaymentIntentResponse);
      }
      setSelectedMethod(method);
      if (bank) setSelectedBank(bank);
      await fetchPaymentData(false);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memperbarui metode pembayaran.");
    } finally {
      setIsSwitchingMethod(false);
    }
  };

  // Controlled polling: Poll every 6 seconds while PENDING
  useEffect(() => {
    const status = financePayment?.payment_status || paymentProjection?.payment_status || checkoutGroup?.payment_status_projection;
    if (status !== "PENDING" && status !== "UNPAID") return;

    const interval = setInterval(() => {
      fetchPaymentData(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [financePayment, paymentProjection, checkoutGroup, fetchPaymentData]);

  // Countdown timer from authoritative expires_at (LOCKED 6 hours)
  const expiresAtString =
    financePayment?.expires_at || paymentProjection?.expires_at || (checkoutGroup as any)?.finance_expires_at;

  const [remainingSeconds, setRemainingSeconds] = useState<number>(6 * 3600);

  useEffect(() => {
    if (!expiresAtString) return;

    const updateRemaining = () => {
      const expiry = new Date(expiresAtString).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [expiresAtString]);

  const formattedCountdown = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Status flags
  const paymentStatus =
    financePayment?.payment_status || paymentProjection?.payment_status || checkoutGroup?.payment_status_projection || "PENDING";
  const isPaid = paymentStatus === "PAID";
  const isExpired = paymentStatus === "EXPIRED" || remainingSeconds <= 0;
  const isFailed = paymentStatus === "FAILED";
  const isCancelled = paymentStatus === "REFUNDED";

  // Virtual account / QR display
  const vaNumber = useMemo(() => {
    if (paymentIntent?.virtual_account_number) return paymentIntent.virtual_account_number;
    if (financePayment?.virtual_account_number) return financePayment.virtual_account_number;
    switch (selectedBank) {
      case "BCA":
        return "3901 0812 9876 5432";
      case "BNI":
        return "8810 0812 9876 5432";
      case "BRI":
        return "1280 0812 9876 5432";
      case "MANDIRI":
        return "8902 0812 9876 5432";
      default:
        return "8801 0812 9876 5432";
    }
  }, [paymentIntent, financePayment, selectedBank]);

  const handleCopyVa = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(vaNumber.replace(/\s+/g, ""));
    }
    setIsCopied(true);
    setToastMessage("Nomor Virtual Account berhasil disalin!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleConfirmCancelUnpaid = async () => {
    if (!checkoutGroup) return;
    setIsCancelling(true);
    try {
      await orderBarangApi.customer.cancelUnpaidCheckout(
        checkoutGroup.id,
        "Dibatalkan pembeli dari halaman pembayaran"
      );
      setIsCancelModalOpen(false);
      setToastMessage("Checkout gabungan berhasil dibatalkan.");
      setTimeout(() => {
        router.push("/orders?tab=cancelled");
      }, 900);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal membatalkan pesanan belum bayar.");
    } finally {
      setIsCancelling(false);
    }
  };

  const grandTotal =
    financePayment?.total_payable_idr || paymentProjection?.amount_idr || checkoutGroup?.customer_total_idr || 0;
  const ordersList: CheckoutCreatedOrder[] = checkoutGroup?.orders || (checkoutGroup as any)?.merchant_orders || [];

  const totalItemsCount = useMemo(() => {
    return ordersList.reduce((acc: number, o: any) => acc + (o.items?.length || 0), 0);
  }, [ordersList]);

  const itemsSubtotal = useMemo(() => {
    return ordersList.reduce((acc: number, o: any) => acc + (Number(o.product_subtotal_idr) || 0), 0);
  }, [ordersList]);

  const shippingSubtotal = useMemo(() => {
    return ordersList.reduce((acc: number, o: any) => acc + (Number(o.shipping_customer_idr) || 0), 0);
  }, [ordersList]);

  const platformFee = useMemo(() => {
    const calculatedFee = Number(grandTotal) - (itemsSubtotal + shippingSubtotal);
    return Math.max(0, calculatedFee);
  }, [grandTotal, itemsSubtotal, shippingSubtotal]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-body">
        <CircleNotch size={40} className="animate-spin text-[#0F4C81] mb-3" />
        <h2 className="text-sm font-bold text-slate-800">Menghubungkan ke Finance Service...</h2>
        <p className="text-xs text-slate-500 mt-1">Memuat data tagihan dan proyeksi pembayaran aman.</p>
      </div>
    );
  }

  if (loadError || !checkoutGroup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-body">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm space-y-4">
          <WarningCircle size={48} className="text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Tagihan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {loadError || "Data tagihan CheckoutGroup tidak ditemukan pada sistem."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              <House size={16} />
              <span>Kembali ke Beranda</span>
            </Link>
            <Link
              href="/orders?domain=PRODUCT&status=BELUM_BAYAR"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-[#0c3c66] transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Daftar Pesanan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: PAYMENT PAID (SUCCESS)
  // =========================================================================
  if (isPaid) {
    return (
      <div className="min-h-screen bg-white py-8 px-4 font-body">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} weight="bold" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
              Pembayaran Terverifikasi Finance 06
            </span>
            <h1 className="text-2xl font-bold font-display text-slate-900">
              Pembayaran Berhasil!
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Satu pembayaran gabungan berhasil diverifikasi untuk{" "}
              <strong className="text-slate-800">{ordersList.length} toko</strong> sekaligus.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>No. CheckoutGroup:</span>
                <span className="font-mono font-bold text-slate-900">{checkoutGroup.checkout_group_number || checkoutGroup.id}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>Total Dibayar:</span>
                <span className="font-bold text-[#0F4C81] text-sm">{formatRupiah(grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Waktu Pembayaran:</span>
                <span className="font-medium text-slate-700">
                  {financePayment?.paid_at || paymentProjection?.paid_at || "Terkonfirmasi"}
                </span>
              </div>
            </div>

            {/* Merchant Orders List */}
            <div className="mt-6 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Pesanan Toko Terpisah (Multi-Merchant):
              </h3>
              <div className="space-y-3">
                {ordersList.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between hover:border-sky-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                        <Storefront size={20} weight="duotone" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block font-display">
                          Toko #{ord.merchant_org_id}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block">
                          {ord.order_number}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        {formatRupiah(ord.customer_total_idr)}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                        Menunggu Diproses Toko
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <House size={16} weight="bold" />
                <span>Kembali ke Beranda</span>
              </Link>
              <Link
                href="/orders?domain=PRODUCT&status=DIPROSES"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Package size={16} weight="bold" />
                <span>Lihat Pesanan Saya</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // =========================================================================
  // VIEW: PENDING PAYMENT (QRIS / VA DEMO SIMULATION) - SIDE-BY-SIDE LAYOUT
  // =========================================================================
  return (
    <div className="min-h-screen bg-white py-3 sm:py-4 px-3 sm:px-6 lg:px-8 font-body">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* CONTEXTUAL TOP NAVIGATION */}
        {from === "card" && (
          <div className="flex items-center justify-between pb-0.5">
            <Link
              href="/orders?domain=PRODUCT&status=BELUM_BAYAR"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs group"
            >
              <ArrowLeft size={15} weight="bold" className="group-hover:-translate-x-0.5 transition-transform text-slate-500" />
              <span>Kembali ke Daftar Pesanan</span>
            </Link>
          </div>
        )}

        {from === "detail" && (
          <div className="flex items-center justify-between pb-0.5">
            <Link
              href={originOrderId ? `/orders/products/${originOrderId}` : `/orders?domain=PRODUCT&status=BELUM_BAYAR`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs group"
            >
              <ArrowLeft size={15} weight="bold" className="group-hover:-translate-x-0.5 transition-transform text-slate-500" />
              <span>Kembali ke Detail Pesanan</span>
            </Link>
          </div>
        )}

        {from !== "card" && from !== "detail" && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-0.5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs group"
            >
              <House size={16} weight="bold" className="text-slate-500 group-hover:text-[#0F4C81] transition-colors" />
              <span>Kembali ke Beranda</span>
            </Link>
            <Link
              href="/orders?domain=PRODUCT&status=BELUM_BAYAR"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0F4C81] font-bold text-xs transition cursor-pointer shadow-2xs group"
            >
              <Package size={16} weight="bold" />
              <span>Lihat Orderan (Tab Belum Bayar)</span>
              <CaretRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* COMPACT DEMO NOTICE BANNER */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={16} weight="fill" className="text-amber-600 shrink-0" />
            <p className="text-[11px] leading-tight truncate">
              <strong className="font-bold text-amber-950">SIMULASI DEMO:</strong> QRIS dan nomor Virtual Account di bawah adalah instrumen pengujian demo, bukan rekening bank aktif.
            </p>
          </div>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full shrink-0 border border-amber-200">
            Demo Testing Mode
          </span>
        </div>

        {/* SIDE-BY-SIDE HORIZONTAL 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT COLUMN: 6 / 12 cols (Header, Struk Rincian Pesanan & Total Tagihan) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {/* Header & Expiry Countdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                    1 Payment Intent Multi-Merchant
                  </span>
                  <h2 className="text-lg font-bold font-display text-slate-900 mt-1">
                    Menunggu Pembayaran
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    CheckoutGroup: <span className="font-mono font-semibold text-slate-600">{checkoutGroup.checkout_group_number || checkoutGroup.id}</span>
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <Clock size={15} weight="duotone" className="text-amber-600 animate-pulse" />
                  <div>
                    <span className="text-[9px] text-amber-800 font-bold block uppercase tracking-wider leading-none">
                      Batas Waktu (6 Jam)
                    </span>
                    <span className="text-xs font-extrabold font-mono text-amber-900 leading-tight">
                      {isExpired ? "00:00:00 (Kedaluwarsa)" : formattedCountdown}
                    </span>
                  </div>
                </div>
              </div>

              {/* STRUK RINCIAN PESANAN (UI STRUK DI ATAS TOTAL) */}
              <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100/80 text-[#0F4C81] flex items-center justify-center shrink-0">
                      <Receipt size={14} weight="duotone" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Struk Rincian Pesanan</h4>
                      <p className="text-[10px] text-slate-400">
                        Rincian barang belanja dari {ordersList.length} toko
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100/60 px-2 py-0.5 rounded-full border border-sky-200/60">
                    {ordersList.length} Toko
                  </span>
                </div>

                {/* Order Items per Toko */}
                <div className="space-y-2.5 max-h-44 sm:max-h-48 overflow-y-auto pr-1">
                  {ordersList.map((ord) => {
                    const parsedMerchant =
                      typeof ord.merchant_display_snapshot === "string"
                        ? (() => {
                            try {
                              return JSON.parse(ord.merchant_display_snapshot);
                            } catch {
                              return {};
                            }
                          })()
                        : ord.merchant_display_snapshot || {};

                    const merchantName =
                      parsedMerchant?.name ||
                      (ord.merchant_org_id && ord.merchant_org_id.includes("0c1467e7")
                        ? "Sinar AC & Sparepart Glodok"
                        : `Toko #${ord.merchant_org_id?.slice(0, 8) || "Resmi"}`);

                    return (
                      <div key={ord.id} className="space-y-1.5 pb-2 border-b border-dashed border-slate-200 last:border-none last:pb-0">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="flex items-center gap-1.5 truncate max-w-[200px]" title={merchantName}>
                            <Storefront size={13} className="text-[#0F4C81]" weight="duotone" />
                            <span>{merchantName}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{ord.order_number}</span>
                        </div>

                        {/* Items in order */}
                        <div className="space-y-1 pl-2">
                          {ord.items && ord.items.length > 0 ? (
                            ord.items.map((it: any) => {
                              const parsedProduct =
                                typeof it.product_snapshot === "string"
                                  ? (() => {
                                      try {
                                        return JSON.parse(it.product_snapshot);
                                      } catch {
                                        return {};
                                      }
                                    })()
                                  : it.product_snapshot || {};
                              const parsedVariant =
                                typeof it.variant_snapshot === "string"
                                  ? (() => {
                                      try {
                                        return JSON.parse(it.variant_snapshot);
                                      } catch {
                                        return {};
                                      }
                                    })()
                                  : it.variant_snapshot || {};

                              const itemTitle =
                                parsedProduct?.name ||
                                parsedProduct?.title ||
                                parsedVariant?.name ||
                                `Produk #${it.product_id?.slice(0, 8) || "Barang"}`;
                              const variantName =
                                parsedVariant?.name && parsedVariant.name !== itemTitle
                                  ? parsedVariant.name
                                  : null;
                              const unitPrice = it.unit_price_idr || 0;
                              const qty = it.quantity || 1;
                              const lineTotal = it.line_total_idr || it.line_subtotal_idr || (unitPrice * qty);

                              return (
                                <div key={it.id || it.product_id} className="flex items-start justify-between text-[11px] text-slate-600 gap-2">
                                  <div className="min-w-0 pr-1">
                                    <span className="font-medium text-slate-800 block truncate max-w-[220px]" title={itemTitle}>
                                      {itemTitle}
                                    </span>
                                    {variantName && (
                                      <span className="text-[10px] text-slate-400 block truncate">{variantName}</span>
                                    )}
                                    <span className="text-[10px] text-slate-400">
                                      {qty} x {formatRupiah(unitPrice)}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-slate-800 shrink-0">{formatRupiah(lineTotal)}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Subtotal Barang Toko</span>
                              <span className="font-semibold text-slate-800">{formatRupiah(ord.product_subtotal_idr)}</span>
                            </div>
                          )}

                          {/* Ongkir Toko */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span>Ongkos Kirim Toko</span>
                            <span className="font-medium text-slate-700">
                              {Number(ord.shipping_customer_idr) === 0 ? "Gratis (Rp 0)" : formatRupiah(ord.shipping_customer_idr)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotals & Platform Fee */}
                <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal Produk ({totalItemsCount} Barang)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(itemsSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Total Ongkos Kirim</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(shippingSubtotal)}</span>
                  </div>
                  {platformFee > 0 && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Biaya Kebijakan Layanan Platform</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(platformFee)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AMOUNT DISPLAY (TEPAT DI BAWAH STRUK) */}
            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Total Tagihan Gabungan:</span>
                <span className="text-2xl font-bold font-display text-[#0F4C81]">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  {ordersList.length} Toko Terpisah
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 6 / 12 cols (Instrumen Pembayaran QR / VA & Action Buttons) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {/* Right Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                    <CreditCard size={15} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Instruksi Pembayaran</h3>
                    <p className="text-[10px] text-slate-400">Pilih mode atau selesaikan pembayaran</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Sistem Pembayaran Finance Modul 06
                </span>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Metode Pembayaran Demo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => switchPaymentMethod("QRIS")}
                    disabled={isSwitchingMethod}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      selectedMethod === "QRIS"
                        ? "border-[#0F4C81] bg-sky-50 text-[#0F4C81] ring-1 ring-[#0F4C81]"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                  >
                    <QrCode size={16} weight="duotone" />
                    <span>QRIS Instant (DEMO)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchPaymentMethod("VA", selectedBank)}
                    disabled={isSwitchingMethod}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      selectedMethod === "VA"
                        ? "border-[#0F4C81] bg-sky-50 text-[#0F4C81] ring-1 ring-[#0F4C81]"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    }`}
                  >
                    <Bank size={16} weight="duotone" />
                    <span>Virtual Account (DEMO)</span>
                  </button>
                </div>
              </div>

              {/* QRIS Container */}
              {selectedMethod === "QRIS" && (
                <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 text-center space-y-2.5">
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center">
                    <QrCode size={105} weight="fill" className="text-slate-800" />
                    <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                      QRIS PEMBAYARAN SERVIO
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">
                      Scan kode QRIS di atas dengan aplikasi e-Wallet atau Mobile Banking
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Nominal pas: <strong className="text-slate-900">{formatRupiah(grandTotal)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* VA Container */}
              {selectedMethod === "VA" && (
                <div className="space-y-2.5">
                  {/* Bank selector tabs */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["BCA", "BRI", "MANDIRI", "BNI"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => switchPaymentMethod("VA", b)}
                        disabled={isSwitchingMethod}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          selectedBank === b
                            ? "border-[#0F4C81] bg-sky-50 text-[#0F4C81] ring-1 ring-[#0F4C81]"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Nomor Virtual Account ({selectedBank}):</span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Akun Mock
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-wider">
                        {vaNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyVa}
                        className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0F4C81] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Copy size={13} weight="bold" />
                        <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons & Note */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchPaymentData(true)}
                  disabled={isRefreshing}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowsClockwise size={15} weight="bold" className={isRefreshing ? "animate-spin" : ""} />
                  <span>{isRefreshing ? "Memeriksa Status..." : "Cek / Refresh Status Pembayaran"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                >
                  Batalkan Pesanan
                </button>
              </div>

              {/* Contextual navigation buttons */}
              {from === "card" && (
                <Link
                  href="/orders?domain=PRODUCT&status=BELUM_BAYAR"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Kembali ke Daftar Pesanan</span>
                </Link>
              )}

              {from === "detail" && (
                <Link
                  href={originOrderId ? `/orders/products/${originOrderId}` : `/orders?domain=PRODUCT&status=BELUM_BAYAR`}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={14} weight="bold" />
                  <span>Kembali ke Detail Pesanan</span>
                </Link>
              )}

              {from !== "card" && from !== "detail" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/"
                    className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                  >
                    <House size={14} weight="bold" />
                    <span>Kembali ke Beranda</span>
                  </Link>
                  <Link
                    href="/orders?domain=PRODUCT&status=BELUM_BAYAR"
                    className="py-2.5 px-3 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[#0F4C81] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
                  >
                    <Package size={14} weight="bold" />
                    <span>Lihat Orderan</span>
                  </Link>
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" weight="fill" />
                <span>Dana diamankan oleh Sistem Pembayaran Finance SERVIO (Polling otomatis terintegrasi)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <WarningCircle size={28} weight="bold" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Batalkan Tagihan Belum Bayar?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Membatalkan tagihan ini akan membatalkan seluruh pesanan toko di dalam CheckoutGroup ini ({ordersList.length} pesanan). Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelUnpaid}
                disabled={isCancelling}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? <CircleNotch size={14} className="animate-spin" /> : null}
                <span>Ya, Batalkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

export default function ProductPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-body">
          <CircleNotch size={40} className="animate-spin text-[#0F4C81] mb-3" />
          <h2 className="text-sm font-bold text-slate-800">Menghubungkan ke Finance Service...</h2>
          <p className="text-xs text-slate-500 mt-1">Memuat data tagihan dan proyeksi pembayaran aman.</p>
        </div>
      }
    >
      <ProductPaymentContent />
    </Suspense>
  );
}
