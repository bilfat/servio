"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOrderBarang } from "@/features/order-barang/hooks/useOrderBarang";
import { MockCheckoutGroup, MockMerchantOrder } from "@/types/order-barang";
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
} from "@phosphor-icons/react";

export default function ProductPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const paymentParam = (params?.paymentId as string) || "";

  const {
    checkoutGroups,
    orders,
    simulatePaymentSuccess,
    simulatePaymentFailed,
    simulatePaymentExpired,
    cancelUnpaidCheckoutGroup,
    currentTime,
  } = useOrderBarang();

  // Find corresponding CheckoutGroup (by group ID, group number, or matching merchant order ID)
  const group: MockCheckoutGroup | undefined = useMemo(() => {
    // 1. Direct group match
    const byId = checkoutGroups.find(
      (g) => g.id === paymentParam || g.checkoutGroupNumber === paymentParam
    );
    if (byId) return byId;

    // 2. Order match
    const order = orders.find(
      (o) => o.id === paymentParam || o.orderNumber === paymentParam
    );
    if (order && order.checkoutGroupId) {
      return checkoutGroups.find((g) => g.id === order.checkoutGroupId);
    }

    // 3. Fallback to latest pending group
    return checkoutGroups.find((g) => g.paymentStatus === "PENDING") || checkoutGroups[0];
  }, [checkoutGroups, orders, paymentParam]);

  // Merchant orders linked to this checkout group
  const groupOrders: MockMerchantOrder[] = useMemo(() => {
    if (!group) return [];
    return orders.filter((o) => o.checkoutGroupId === group.id);
  }, [orders, group]);

  // Payment method selection & active bank
  const [selectedMethod, setSelectedMethod] = useState<"QRIS" | "VIRTUAL_ACCOUNT">("QRIS");
  const [selectedBank, setSelectedBank] = useState<"BCA" | "BNI" | "BRI" | "MANDIRI">("BCA");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync state from group if present
  useEffect(() => {
    if (group) {
      if (group.paymentMethod) {
        setSelectedMethod(group.paymentMethod);
      }
      if (group.selectedBank) {
        setSelectedBank(group.selectedBank);
      }
    }
  }, [group]);

  // Calculate live countdown to expiresAt (LOCKED 6 hours)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(6 * 3600);

  useEffect(() => {
    if (!group) return;

    const updateRemaining = () => {
      const expiry = new Date(group.expiresAt).getTime();
      const now = currentTime ? new Date(currentTime).getTime() : Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [group, currentTime]);

  const formattedCountdown = useMemo(() => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  const isExpired = group?.paymentStatus === "EXPIRED" || remainingSeconds <= 0;
  const isPaid = group?.paymentStatus === "PAID";
  const isFailed = group?.paymentStatus === "FAILED";
  const isCancelled = group?.paymentStatus === "REFUNDED" || groupOrders.every((o) => o.status === "CANCELLED");

  // Mock VA numbers based on bank
  const vaNumber = useMemo(() => {
    if (group?.vaNumber) return group.vaNumber;
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
  }, [group?.vaNumber, selectedBank]);

  const handleCopyVa = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(vaNumber.replace(/\s+/g, ""));
    }
    setIsCopied(true);
    setToastMessage("Nomor Virtual Account berhasil disalin!");
    setTimeout(() => {
      setIsCopied(false);
      setToastMessage(null);
    }, 2500);
  };

  const handleConfirmCancelUnpaid = () => {
    if (!group) return;
    cancelUnpaidCheckoutGroup(group.id, "Dibatalkan pembeli dari halaman pembayaran");
    setIsCancelModalOpen(false);
    setToastMessage("Checkout gabungan berhasil dibatalkan.");
    setTimeout(() => {
      router.push("/orders?tab=product");
    }, 1200);
  };

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-xs">
          <WarningCircle size={48} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Tagihan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 mb-6">
            Data tagihan pembayaran pesanan barang tidak ditemukan atau telah kedaluwarsa.
          </p>
          <Link
            href="/orders?tab=product"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Daftar Pesanan</span>
          </Link>
        </div>
      </div>
    );
  }

  // 1. SUCCESS VIEW (When Payment is PAID)
  if (isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-200 p-8 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} weight="bold" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
              Pembayaran Terverifikasi
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 font-display">
              Pembayaran Berhasil!
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Satu pembayaran gabungan berhasil memproses pesanan untuk{" "}
              <strong className="text-slate-800">{groupOrders.length} toko</strong> sekaligus.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>No. Tagihan Checkout:</span>
                <span className="font-mono font-bold text-slate-900">{group.checkoutGroupNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>Total Dibayar:</span>
                <span className="font-bold text-primary text-sm">{formatRupiah(group.grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Waktu Pembayaran:</span>
                <span className="font-medium text-slate-700">{group.paidAt || "Baru saja"}</span>
              </div>
            </div>

            {/* Merchant Orders List */}
            <div className="mt-6 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Pesanan Toko Terpisah (Order Splitting):
              </h3>
              <div className="space-y-3">
                {groupOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between hover:border-primary/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Storefront size={20} weight="bold" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block font-display">
                          {ord.merchantName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block">
                          {ord.orderNumber}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        {formatRupiah(ord.totalAmount)}
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
                href="/orders?tab=product"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Package size={16} weight="bold" />
                <span>Lihat Pesanan Saya</span>
              </Link>
              <Link
                href="/services"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Belanja Lagi</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. EXPIRED / CANCELLED VIEW
  if (isExpired || isFailed || isCancelled) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <XCircle size={36} weight="bold" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block mb-2">
            {isExpired ? "Batas Waktu Berakhir" : isCancelled ? "Checkout Dibatalkan" : "Pembayaran Gagal"}
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 font-display">
            {isExpired
              ? "Waktu Pembayaran Habis"
              : isCancelled
              ? "Tagihan Pembayaran Dibatalkan"
              : "Transaksi Gagal Diproses"}
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {isExpired
              ? "Batas waktu 6 jam telah berakhir. Reservasi stok telah dikembalikan ke katalog toko dan pesanan otomatis dibatalkan."
              : isCancelled
              ? "Seluruh pesanan toko dalam tagihan checkout ini telah dibatalkan sebelum pembayaran dilakukan."
              : "Transaksi tidak dapat diselesaikan. Silakan coba kembali atau gunakan metode pembayaran lain."}
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between text-slate-500">
              <span>No. Checkout:</span>
              <span className="font-mono font-bold text-slate-900">{group.checkoutGroupNumber}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Grand Total:</span>
              <span className="font-bold text-slate-800">{formatRupiah(group.grandTotal)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/cart"
              className="w-full py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Buka Keranjang & Checkout Ulang</span>
            </Link>
            <Link
              href="/orders?tab=product"
              className="w-full py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Lihat Tab Batal di Pesanan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. MAIN PENDING PAYMENT VIEW
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 font-body">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders?tab=product"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Kembali ke Pesanan Saya</span>
          </Link>

          <span className="text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            No. Tagihan: <strong className="font-mono text-slate-800">{group.checkoutGroupNumber}</strong>
          </span>
        </div>

        {/* 6-Hour Expiry Countdown Header Card */}
        <div className="bg-gradient-to-r from-[#0F4C81] to-[#1E3A8A] text-white rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200">
                  Menunggu Pembayaran (6 Jam)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-display">
                Selesaikan Pembayaran Anda
              </h1>
              <p className="text-xs text-sky-100 mt-1">
                Satu pembayaran untuk pesanan dari <strong>{groupOrders.length} toko</strong> sekaligus.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 text-center shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-amber-300 mb-1">
                <Clock size={16} weight="bold" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Sisa Waktu</span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-wider text-white">
                {formattedCountdown}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Payment Details vs Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Method Selector & Instructions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Method Tabs */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Pilih Metode Pembayaran
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("QRIS")}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    selectedMethod === "QRIS"
                      ? "border-primary bg-sky-50/60 text-primary shadow-xs ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedMethod === "QRIS" ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <QrCode size={22} weight="bold" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block font-display">QRIS Instant</span>
                    <span className="text-[11px] text-slate-400 block">Semua E-Wallet & M-Banking</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("VIRTUAL_ACCOUNT")}
                  className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                    selectedMethod === "VIRTUAL_ACCOUNT"
                      ? "border-primary bg-sky-50/60 text-primary shadow-xs ring-2 ring-primary/20"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedMethod === "VIRTUAL_ACCOUNT"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Bank size={22} weight="bold" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold block font-display">Virtual Account</span>
                    <span className="text-[11px] text-slate-400 block">BCA, BNI, BRI, Mandiri</span>
                  </div>
                </button>
              </div>

              {/* QRIS Container */}
              {selectedMethod === "QRIS" && (
                <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-4">
                  <div className="inline-block p-4 bg-white rounded-3xl border-2 border-dashed border-slate-300 shadow-sm relative">
                    {/* Visual QR Dummy */}
                    <div className="w-56 h-56 mx-auto bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-between text-white relative overflow-hidden">
                      {/* Corner QR markers */}
                      <div className="w-full flex justify-between">
                        <div className="w-12 h-12 border-4 border-white rounded-lg flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded-xs" />
                        </div>
                        <div className="w-12 h-12 border-4 border-white rounded-lg flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded-xs" />
                        </div>
                      </div>

                      {/* Center Watermark */}
                      <div className="bg-amber-400 text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase shadow-md rotate-[-6deg] z-10 border border-slate-900">
                        DEMO / NON-PAYABLE
                      </div>

                      <div className="w-full flex justify-between items-end">
                        <div className="w-12 h-12 border-4 border-white rounded-lg flex items-center justify-center">
                          <div className="w-5 h-5 bg-white rounded-xs" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">QRIS 05A</span>
                      </div>
                    </div>
                  </div>

                  <div className="max-w-xs mx-auto space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Scan kode QR di atas dengan aplikasi pembayaran Anda
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Mendukung BCA Mobile, Livin by Mandiri, BRImo, BNI Mobile, GoPay, OVO, Dana, ShopeePay.
                    </p>
                  </div>
                </div>
              )}

              {/* Virtual Account Container */}
              {selectedMethod === "VIRTUAL_ACCOUNT" && (
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                  {/* Bank Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-2">
                      Pilih Bank Penyedia Virtual Account:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(["BCA", "BNI", "BRI", "MANDIRI"] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setSelectedBank(b)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition text-center cursor-pointer ${
                            selectedBank === b
                              ? "border-primary bg-sky-50 text-primary shadow-xs ring-1 ring-primary"
                              : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* VA Number Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Nomor Virtual Account ({selectedBank}):</span>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Akun Dummy Demo
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tracking-wider">
                        {vaNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyVa}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-primary font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Copy size={14} weight="bold" />
                        <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Transfer Instructions */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
                    <span className="font-bold text-slate-800 block">Petunjuk Pembayaran ATM / M-Banking:</span>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-500 leading-relaxed text-[11px]">
                      <li>Buka aplikasi m-Banking {selectedBank} Anda.</li>
                      <li>Pilih menu <strong>Transfer</strong> &gt; <strong>Virtual Account</strong>.</li>
                      <li>Masukkan kode nomor VA di atas.</li>
                      <li>Periksa nama pemesan &amp; total nominal <strong>{formatRupiah(group.grandTotal)}</strong>.</li>
                      <li>Konfirmasi pembayaran hingga status berhasil.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Simulation Controls Panel (Clear and Non-Intrusive) */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                    Panel Simulasi Transaksi (Demo Testing)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Frontend Mock</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gunakan tombol simulasi di bawah untuk menguji perubahan status seketika ke seluruh role tanpa menunggu gateway nyata:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => simulatePaymentSuccess(group.id)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle size={15} weight="bold" />
                  <span>Simulasi Berhasil</span>
                </button>
                <button
                  type="button"
                  onClick={() => simulatePaymentFailed(group.id)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <XCircle size={15} weight="bold" />
                  <span>Simulasi Gagal</span>
                </button>
                <button
                  type="button"
                  onClick={() => simulatePaymentExpired(group.id)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Clock size={15} weight="bold" />
                  <span>Simulasi Expired (6 Jam)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Breakdown & Cancel Group (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Payment Summary Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
                Ringkasan Pembayaran Gabungan
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Harga Produk:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(group.totalItemsPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Ongkos Kirim Lokal ({groupOrders.length} Toko):</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(group.totalShipping)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan Pelanggan:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(group.totalServiceFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pajak Transaksi:</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(group.totalTax)}</span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-extrabold text-slate-900 font-display">Grand Total:</span>
                  <span className="font-extrabold text-primary text-xl font-display">
                    {formatRupiah(group.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Breakdown per Merchant Order */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  Alokasi Toko ({groupOrders.length} Merchant):
                </span>
                <div className="space-y-2">
                  {groupOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{ord.merchantName}</span>
                        <span className="text-[10px] text-slate-400">
                          {ord.items.length} Barang &bull; Ongkir {formatRupiah(ord.shippingFee)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(ord.totalAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cancel Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={15} weight="bold" />
                  <span>Batalkan Tagihan Checkout Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Cancellation Modal (Prompt 10.6 requirement) */}
      {isCancelModalOpen && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={
            <div className="flex items-center gap-2.5 text-rose-600">
              <WarningCircle size={22} weight="bold" />
              <span className="text-base font-bold text-slate-900">Batalkan Seluruh Checkout?</span>
            </div>
          }
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelUnpaid}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Ya, Batalkan Semua
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-body text-slate-600">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed font-semibold">
              Pesanan ini termasuk dalam satu pembayaran gabungan. Membatalkan pembayaran akan membatalkan seluruh pesanan toko yang ada dalam checkout ini.
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-2">
                Daftar toko yang akan dibatalkan:
              </span>
              <ul className="space-y-1.5">
                {groupOrders.map((ord) => (
                  <li key={ord.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-medium text-slate-800">{ord.merchantName}</span>
                    <span className="font-bold text-slate-700">{formatRupiah(ord.totalAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
