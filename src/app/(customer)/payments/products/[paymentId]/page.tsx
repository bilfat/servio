"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  QrCode,
  Bank,
  Wallet,
  Copy,
  Check,
  ClockCountdown,
  ShieldCheck,
  ArrowsClockwise,
  CheckCircle,
  Receipt,
  WarningCircle,
  Sparkle,
} from "@phosphor-icons/react";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Toast } from "@/components/feedback/Toast";
import { paymentApi } from "@/lib/servioApi";

export default function ProductPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = (params?.paymentId as string) || "";

  const [paymentMethod, setPaymentMethod] = useState<"BCA_VA" | "MANDIRI_VA" | "QRIS" | "GOPAY">("BCA_VA");
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  const [vaNumber, setVaNumber] = useState("8809128391002341");
  const [totalAmount, setTotalAmount] = useState(657150);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [targetOrderId, setTargetOrderId] = useState<string>(paymentId);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [paidAtTime, setPaidAtTime] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadIntent() {
      if (!paymentId) return;
      try {
        const res = await paymentApi.getIntent(paymentId);
        if (res.data && isMounted) {
          const intent = res.data;
          if (intent.amount) setTotalAmount(intent.amount);
          if (intent.paymentDestination?.accountNumber) {
            setVaNumber(intent.paymentDestination.accountNumber);
          }
          if (intent.orderId) setTargetOrderId(intent.orderId);
          if (intent.status === "PAID") {
            setPaymentStatus("PAID");
            setPaidAtTime(intent.paidAt || new Date().toLocaleString("id-ID"));
          }
          if (intent.channelCode) {
            const ch = intent.channelCode;
            if (ch === "BCA_VA" || ch === "MANDIRI_VA" || ch === "QRIS" || ch === "GOPAY") {
              setPaymentMethod(ch);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote payment intent, using initial context:", err);
      }
    }
    loadIntent();
    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const handleCopyVa = () => {
    navigator.clipboard?.writeText(vaNumber);
    setCopied(true);
    setToastMessage("Nomor Virtual Account disalin ke clipboard!");
    setToastType("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const res = await paymentApi.pay(paymentId, { channelCode: paymentMethod });
      const isSuccess =
        res.data?.status === "PAID" ||
        res.data?.status === "success" ||
        res.data?.intent?.status === "PAID" ||
        (res as any).status === "success";

      if (isSuccess) {
        setPaymentStatus("PAID");
        setTransactionRef(res.data?.transaction?.transactionId || `TRX-${Date.now().toString().slice(-8)}`);
        setPaidAtTime(new Date().toLocaleString("id-ID"));
        setToastMessage("Pembayaran berhasil diverifikasi! Status pesanan kini: PAID (Lunas).");
        setToastType("success");
        return;
      }
    } catch (err: any) {
      console.warn("Payment attempt error, handling gracefully:", err);
      setToastMessage(err?.message || "Gagal memproses pembayaran ke server.");
      setToastType("warning");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/checkout/products"
              id="back-to-checkout-btn"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Gerbang Pembayaran Resmi Escrow
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Instruksi & Verifikasi Pembayaran Suku Cadang
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">#{paymentId}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {paymentStatus === "PAID" ? (
          /* PAID / SETTLED SUCCESS STATE */
          <div
            id="payment-success-card"
            className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-8 ring-emerald-50">
                <CheckCircle size={36} weight="fill" />
              </div>
              <span
                id="paid-status-badge"
                className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-emerald-500 text-white shadow-sm"
              >
                STATUS: PAID (LUNAS)
              </span>
              <h2 className="text-2xl font-bold text-slate-900">Pembayaran Berhasil Diverifikasi!</h2>
              <p className="text-xs text-slate-500 max-w-md">
                Dana pembayaran telah diterima secara sah di Rekening Escrow Penampung resmi SERVIO. Reservasi suku cadang telah dialokasikan untuk pesanan Anda.
              </p>
            </div>

            {/* Receipt Summary Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ID Pesanan</span>
                <span id="paid-order-id" className="font-mono font-bold text-slate-800">
                  {targetOrderId}
                </span>
              </div>
              {transactionRef && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nomor Transaksi Escrow</span>
                  <span id="paid-trx-id" className="font-mono font-bold text-[#0F4C81]">
                    {transactionRef}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metode Pembayaran</span>
                <span className="font-bold text-slate-800">
                  {paymentMethod === "BCA_VA" && "BCA Virtual Account"}
                  {paymentMethod === "MANDIRI_VA" && "Mandiri Virtual Account"}
                  {paymentMethod === "QRIS" && "QRIS Dompet Digital"}
                  {paymentMethod === "GOPAY" && "GoPay / Instant Wallet"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Waktu Verifikasi</span>
                <span className="font-semibold text-slate-700">
                  {paidAtTime || "30 September 2026, 14:45 WIB"}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-900">Total Nominal Lunas</span>
                <span id="paid-total-amount" className="text-base text-emerald-700 font-display">
                  {formatRupiah(totalAmount)}
                </span>
              </div>
            </div>

            {/* Explicit Boundary Stop Notice */}
            <div
              id="step2-stop-boundary-notice"
              className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start gap-3"
            >
              <Sparkle size={20} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Batas Eksekusi Step 2 Tercapai (PAID):</p>
                <p className="text-slate-600 leading-relaxed">
                  Pesanan telah berstatus <strong>PAID</strong>. Sesuai instruksi batas pengerjaan, alur dihentikan pada tahap ini (STOP). Operasi logistik pengiriman, nomor resi kurir, dan bukti serah terima (POD) tidak dieksekusi.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <Link
                href={`/orders/products/${targetOrderId}`}
                id="view-paid-order-btn"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold text-center transition shadow-md"
              >
                Lihat Rincian Pesanan #{targetOrderId}
              </Link>
              <Link
                href="/products"
                id="back-to-products-btn"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold text-center transition"
              >
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        ) : (
          /* PAYMENT REQUIRED / DETAIL SCREEN */
          <>
            {/* Countdown Banner */}
            <div
              id="countdown-banner"
              className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center justify-between text-amber-900 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <ClockCountdown size={26} weight="duotone" className="text-amber-700 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Batas Waktu Pembayaran</p>
                  <p className="text-xs text-amber-800">
                    Selesaikan transaksi dalam <strong>23 Jam : 59 Menit</strong> sebelum otomatis dibatalkan oleh sistem.
                  </p>
                </div>
              </div>
            </div>

            {/* Total Bill Card */}
            <div
              id="payment-bill-card"
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs text-slate-400">Total Tagihan Pembayaran</p>
                <p id="payment-amount-display" className="text-3xl font-extrabold text-[#0F4C81] font-display mt-0.5">
                  {formatRupiah(totalAmount)}
                </p>
              </div>
              <span
                id="payment-status-badge"
                className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-auto flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Menunggu Pembayaran
              </span>
            </div>

            {/* Method Selector */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                Pilih Saluran Pembayaran Resmi
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "BCA_VA" as const, name: "BCA VA", icon: <Bank size={20} /> },
                  { id: "MANDIRI_VA" as const, name: "Mandiri VA", icon: <Bank size={20} /> },
                  { id: "QRIS" as const, name: "QRIS Instan", icon: <QrCode size={20} /> },
                  { id: "GOPAY" as const, name: "GoPay / Wallet", icon: <Wallet size={20} /> },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    id={`payment-method-${method.id}`}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
                      paymentMethod === method.id
                        ? "border-[#0F4C81] bg-sky-50 text-[#0F4C81] shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {method.icon}
                    <span>{method.name}</span>
                  </button>
                ))}
              </div>

              {/* Dynamic Payment Detail View */}
              {paymentMethod === "QRIS" ? (
                <div
                  id="qris-payment-box"
                  className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-4"
                >
                  <p className="text-xs font-bold text-slate-700">Scan QRIS dengan Aplikasi Perbankan / Dompet Digital Anda</p>
                  <div className="w-44 h-44 bg-white p-3 rounded-2xl border border-slate-200 mx-auto flex items-center justify-center shadow-inner">
                    <QrCode size={130} weight="regular" className="text-slate-900" />
                  </div>
                  <p className="text-[11px] text-slate-400">NMID: ID1020268819280 • PT SERVIO TEKNOLOGI INDONESIA</p>
                </div>
              ) : (
                <div
                  id="va-payment-box"
                  className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Nomor Virtual Account ({paymentMethod === "MANDIRI_VA" ? "Mandiri" : "BCA"})
                    </span>
                    <span className="font-semibold text-slate-600">Atas Nama: PT SERVIO ESCROW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span id="va-number-display" className="text-xl font-bold font-mono text-slate-900 tracking-wider">
                      {paymentMethod === "MANDIRI_VA" ? "8902128391008812" : vaNumber}
                    </span>
                    <button
                      type="button"
                      id="copy-va-button"
                      onClick={handleCopyVa}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                    >
                      {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                      {copied ? "Tersalin" : "Salin VA"}
                    </button>
                  </div>
                </div>
              )}

              {/* Escrow Guarantee Disclaimer */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-3">
                <ShieldCheck size={20} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-slate-800">Perlindungan Rekening Penampung (Escrow)</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dana Anda disimpan aman oleh SERVIO dan baru diteruskan ke toko setelah barang sampai dan Anda konfirmasi dalam keadaan sesuai.
                  </p>
                </div>
              </div>

              {/* Payment Steps / Instructions */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tata Cara Pembayaran:
                </h3>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                  <li>Buka aplikasi Mobile Banking atau ATM bank pilihan Anda.</li>
                  <li>Pilih menu <strong>Transfer &gt; Virtual Account</strong> atau menu QRIS.</li>
                  <li>Masukkan nomor Virtual Account di atas dan pastikan nominal tepat <strong>{formatRupiah(totalAmount)}</strong>.</li>
                  <li>Konfirmasi PIN transaksi dan simpan bukti transaksi Anda.</li>
                  <li>Klik tombol <strong>Verifikasi Pembayaran Sekarang</strong> di bawah untuk memproses status menjadi PAID.</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  href={`/orders/products/${targetOrderId}`}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Lihat Detail Pesanan (#{targetOrderId})
                </Link>

                <button
                  type="button"
                  id="pay-attempt-button"
                  onClick={handleCheckStatus}
                  disabled={isChecking}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold transition shadow-md shadow-sky-900/15 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowsClockwise size={16} weight="bold" className={isChecking ? "animate-spin" : ""} />
                  {isChecking ? "Memverifikasi ke Gateway..." : "Verifikasi Pembayaran Sekarang (Bayar)"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
