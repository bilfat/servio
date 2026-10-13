"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PriceBreakdown, PriceItem } from "@/components/data-display/PriceBreakdown";
import { CountdownState } from "@/components/feedback/CountdownState";
import { ProcessingOverlay } from "@/components/feedback/ProcessingOverlay";
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Bank,
  CheckCircle,
  Copy,
  Clock,
} from "@phosphor-icons/react";
import { serviceOrderApi, governanceApi, ApiServiceOrder } from "@/lib/servioApi";

type PaymentMethodType = "bca_va" | "mandiri_va" | "qris" | "gopay";

interface PaymentMethodOption {
  id: PaymentMethodType;
  label: string;
  icon: React.ComponentType<{ size?: number | string; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" }>;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "bca_va", label: "BCA Virtual Account", icon: Bank },
  { id: "mandiri_va", label: "Mandiri Virtual Account", icon: Bank },
  { id: "qris", label: "QRIS (Semua E-Wallet / Mobile Banking)", icon: QrCode },
  { id: "gopay", label: "GoPay / E-Wallet", icon: CreditCard },
];

export default function PaymentEscrowPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params?.paymentId as string;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("bca_va");
  const [isCopied, setIsCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [order, setOrder] = useState<ApiServiceOrder | null>(null);
  const [appFee, setAppFee] = useState<number>(5000);
  const [collectionAccount, setCollectionAccount] = useState<string>("8830-XXXX-XX42");
  const [dynamicInstructions, setDynamicInstructions] = useState<string>("");
  const [taxPolicy, setTaxPolicy] = useState<{ status: "NOT_USED" | "USED"; rate: number | null; taxType: string }>({
    status: "NOT_USED",
    rate: null,
    taxType: "PPN",
  });

  useEffect(() => {
    async function loadPaymentData() {
      try {
        const [orderRes, feeRes, accountRes, instructRes, methodRes, taxRes] = await Promise.allSettled([
          paymentId ? serviceOrderApi.get(paymentId) : Promise.reject("No paymentId"),
          governanceApi.getEffectivePolicy("APPLICATION_FEE"),
          governanceApi.getEffectivePolicy("COLLECTION_ACCOUNT"),
          governanceApi.getEffectivePolicy("PAYMENT_INSTRUCTION"),
          governanceApi.getEffectivePolicy("PAYMENT_METHOD"),
          governanceApi.getEffectivePolicy("TAX"),
        ]);

        if (orderRes.status === "fulfilled" && orderRes.value?.data) {
          setOrder(orderRes.value.data);
        }

        if (taxRes.status === "fulfilled" && taxRes.value?.data) {
          const tData = taxRes.value.data as {
            status?: string;
            taxStatus?: string;
            rate?: number | null;
            taxType?: string;
          };
          const status = (tData.taxStatus || tData.status) === "USED" ? "USED" : "NOT_USED";
          setTaxPolicy({
            status,
            rate: status === "USED" ? (typeof tData.rate === "number" ? tData.rate : null) : null,
            taxType: tData.taxType || "PPN",
          });
        }

        if (feeRes.status === "fulfilled" && feeRes.value?.data) {
          const cfg = (feeRes.value.data as { configuration?: { feeAmount?: number; amount?: number } }).configuration;
          if (cfg?.feeAmount !== undefined) setAppFee(cfg.feeAmount);
          else if (cfg?.amount !== undefined) setAppFee(cfg.amount);
        }

        if (accountRes.status === "fulfilled" && accountRes.value?.data) {
          const cfg = (accountRes.value.data as { configuration?: { maskedAccountNumber?: string; bankName?: string; institution?: string } }).configuration;
          if (cfg?.maskedAccountNumber) {
            setCollectionAccount(`${cfg.bankName || cfg.institution || "BCA"} ${cfg.maskedAccountNumber}`);
          }
        }

        if (instructRes.status === "fulfilled" && instructRes.value?.data) {
          const cfg = (instructRes.value.data as { configuration?: { instructions?: string[]; generalInstruction?: string; notes?: string } }).configuration;
          if (cfg?.instructions && Array.isArray(cfg.instructions) && cfg.instructions.length > 0) {
            setDynamicInstructions(cfg.instructions.join(" "));
          } else if (cfg?.generalInstruction) {
            setDynamicInstructions(cfg.generalInstruction);
          }
        }
      } catch (err) {
        console.warn("Payment data loading warning:", err);
      }
    }
    loadPaymentData();
  }, [paymentId]);

  const baseServiceAmount = order?.totalAmount || 150000;
  const totalAmount = baseServiceAmount + appFee;
  const vaNumber = collectionAccount || "8830-XXXX-XX42";

  const paymentItems: PriceItem[] = [
    {
      id: "1",
      label: order?.serviceName || "Layanan Jasa Terstandar Servio",
      amount: baseServiceAmount,
    },
    {
      id: "fee",
      label: "Biaya Aplikasi & Perlindungan Escrow",
      amount: appFee,
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(vaNumber.replace(/\s/g, ""));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      router.push(`/orders/${paymentId}?paymentSuccess=true`);
    }, 1200);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <ProcessingOverlay
        isProcessing={isVerifying}
        message="Memverifikasi Pembayaran Escrow..."
        subMessage="Sistem sedang mengamankan dana Anda ke rekening penampung resmi Servio Protection."
      />

      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Pembayaran Tagihan Escrow
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark mt-1">
          Selesaikan Pembayaran Anda
        </h1>
        <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
          Order ID: <strong className="text-neutral-dark">{paymentId}</strong> • Dilindungi Sistem Rekening Bersama Escrow
        </p>
      </div>

      {/* Expiry Countdown */}
      <div className="glass-card p-5 rounded-3xl border border-amber-200 bg-amber-50/60 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <Clock size={16} weight="fill" className="text-amber-600" />
          <span>Selesaikan Pembayaran Sebelum Waktu Berakhir</span>
        </div>
        <CountdownState initialSeconds={1800} label="Batas Pembayaran VA / QRIS" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Payment Method Selection & Instructions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Methods */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4">
            <h3 className="font-display font-bold text-sm text-neutral-dark">
              Pilih Metode Pembayaran
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? "border-primary bg-sky/20 ring-2 ring-primary/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected ? "bg-primary text-white" : "bg-slate-100 text-neutral-slate"
                      }`}
                    >
                      <Icon size={18} weight="duotone" />
                    </div>
                    <span className="font-display font-semibold text-xs text-neutral-dark">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Virtual Account / QR Box */}
          <div className="glass-card p-6 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4">
            <h3 className="font-display font-bold text-sm text-neutral-dark">
              Instruksi Transfer
            </h3>

            {paymentMethod === "qris" ? (
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center shadow-xs">
                  <QrCode size={160} weight="regular" className="text-neutral-dark" />
                </div>
                <p className="text-xs text-neutral-slate">
                  {dynamicInstructions || "Scan QRIS di atas menggunakan BCA Mobile, Livin, GoPay, OVO, atau ShopeePay."}
                </p>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] text-neutral-muted block">Nomor Rekening Virtual Account:</span>
                <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-base text-neutral-dark tracking-wider">
                    {vaNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-sky text-primary text-xs font-bold hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Copy size={14} />
                    <span>{isCopied ? "Tersalin!" : "Salin"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-slate">
                  Pastikan nominal transfer tepat sebesar <strong className="text-primary font-mono">Rp {totalAmount.toLocaleString("id-ID")}</strong> untuk verifikasi instan.
                </p>
                {dynamicInstructions && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    Catatan: {dynamicInstructions}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Price Breakdown & Confirmation */}
        <div className="space-y-5">
          <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white shadow-servio-xs space-y-4">
            <h3 className="font-display font-bold text-sm text-neutral-dark">
              Rincian Pembayaran
            </h3>
            <PriceBreakdown
              items={paymentItems}
              applicationFee={0}
              escrowProtected
              taxStatus={taxPolicy.status}
              taxAmount={
                taxPolicy.status === "USED" && taxPolicy.rate
                  ? Math.round(((order?.totalAmount || 250000) * taxPolicy.rate) / 100)
                  : null
              }
              taxRate={taxPolicy.rate}
              taxLabel={`Pajak (${taxPolicy.taxType || "PPN"})`}
            />

            <button
              type="button"
              onClick={handleVerify}
              className="w-full py-3 rounded-xl bg-primary text-white font-display font-bold text-xs hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-servio-sm active:scale-95"
            >
              <CheckCircle size={16} weight="fill" />
              <span>Cek Status Pembayaran</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={18} weight="fill" className="text-emerald-700" />
              <span>Escrow Protection Aktif</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Dana Anda ditampung secara sah di rekening escrow resmi. Teknisi baru menerima pembayaran setelah pekerjaan tuntas dan Anda memberikan konfirmasi penyelesaian.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
