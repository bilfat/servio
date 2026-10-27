"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Bank,
  ArrowLeft,
  ArrowsClockwise,
  ShieldCheck,
  CheckCircle,
  Plus,
  Info,
  WarningCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeSlash,
  Lock,
  Receipt,
  X,
  CircleNotch,
  RadioButton,
  Check,
} from "@phosphor-icons/react";
import { formatRupiah } from "@/features/order-barang/helpers";
import { Toast } from "@/components/feedback/Toast";
import {
  financeServiceApi,
  CustomerSPayAccount,
  CustomerRefundItem,
  SPayMovementEntity,
  BankDestinationEntity,
  WithdrawalQuoteResponse,
  WithdrawalRequestEntity,
} from "@/lib/financeServiceApi";

function normalizeBank(b: any): BankDestinationEntity {
  const code = b.bank_code || b.bank_name || "BCA";
  const last4 = b.account_last4 || (b.account_number ? String(b.account_number).slice(-4) : "••••");
  const maskedAcc = b.masked_account_number || (b.account_last4 ? `•••• •••• ${b.account_last4}` : b.account_number || "•••• •••• ••••");
  const holder = b.account_holder_name || b.account_holder_name_masked || "Pemilik Rekening";
  const isVerified = b.verification_status === "VERIFIED";

  return {
    id: b.id,
    owner_type: b.owner_type || "CUSTOMER",
    owner_external_id: b.owner_external_id || b.owner_id || "",
    bank_name: code,
    bank_code: code,
    account_number: b.account_number || maskedAcc,
    account_last4: last4,
    masked_account_number: maskedAcc,
    account_holder_name: holder,
    account_holder_name_masked: b.account_holder_name_masked || holder,
    verification_status: isVerified ? "VERIFIED" : "PENDING_VERIFICATION",
    verification_method: b.verification_method || "MOCK",
    is_default: !!b.is_default,
    verified_at: b.verified_at,
    created_at: b.created_at || new Date().toISOString(),
  };
}

export function CustomerSPayView() {
  const [account, setAccount] = useState<CustomerSPayAccount | null>(null);
  const [refunds, setRefunds] = useState<CustomerRefundItem[]>([]);
  const [movements, setMovements] = useState<SPayMovementEntity[]>([]);
  const [bankDestinations, setBankDestinations] = useState<BankDestinationEntity[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestEntity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<"REFUNDS" | "MOVEMENTS" | "BANKS" | "WITHDRAWALS">("REFUNDS");

  // Add Bank Modal state
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [wasInWithdrawModal, setWasInWithdrawModal] = useState(false);
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [isVerifyingBankId, setIsVerifyingBankId] = useState<string | null>(null);

  // Withdraw Modal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("20000");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [quote, setQuote] = useState<WithdrawalQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  // Load authoritative data from Finance Service
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [accRes, refRes, movRes, bankRes, withRes] = await Promise.allSettled([
        financeServiceApi.customer.getSpay(),
        financeServiceApi.customer.getRefunds(),
        financeServiceApi.customer.getSpayMovements(),
        financeServiceApi.banking.getBankDestinations("CUSTOMER"),
        financeServiceApi.banking.getWithdrawals(),
      ]);

      if (accRes.status === "fulfilled" && accRes.value.data) {
        setAccount(accRes.value.data as CustomerSPayAccount);
      }
      if (refRes.status === "fulfilled" && refRes.value.data) {
        setRefunds(Array.isArray(refRes.value.data) ? refRes.value.data : []);
      }
      if (movRes.status === "fulfilled" && movRes.value.data) {
        const d = movRes.value.data as any;
        setMovements(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
      if (bankRes.status === "fulfilled" && bankRes.value.data) {
        const rawBanks = Array.isArray(bankRes.value.data) ? bankRes.value.data : [];
        const normalized = rawBanks.map(normalizeBank);
        setBankDestinations(normalized);
        if (normalized.length > 0) {
          setSelectedBankId((prev) => (prev && normalized.some((x) => x.id === prev) ? prev : normalized[0].id));
        }
      }
      if (withRes.status === "fulfilled" && withRes.value.data) {
        const d = withRes.value.data as any;
        setWithdrawals(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.warn("Could not load Finance S-Pay data:", e);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open add bank modal from withdraw flow
  const openAddBankFromWithdraw = () => {
    setWasInWithdrawModal(true);
    setIsWithdrawModalOpen(false);
    setIsAddBankModalOpen(true);
  };

  // Handle Add Bank
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountHolderName.trim()) {
      setToastMessage("Harap lengkapi nomor rekening dan nama pemilik.");
      setToastType("warning");
      return;
    }

    setIsSubmittingBank(true);
    try {
      const res = await financeServiceApi.banking.addBankDestination({
        bank_name: bankName,
        account_number: accountNumber.trim(),
        account_holder_name: accountHolderName.trim(),
        owner_type: "CUSTOMER",
      });

      const newBank = (res?.data || res) as any;
      if (newBank?.id) {
        // Auto-verify in demo mode so customer can immediately withdraw
        try {
          await financeServiceApi.banking.verifyDemo(newBank.id);
        } catch {
          // ignore if verifyDemo fails
        }
        setSelectedBankId(newBank.id);
      }

      setIsAddBankModalOpen(false);
      setAccountNumber("");
      setAccountHolderName("");
      setToastMessage("Rekening bank berhasil didaftarkan dan terverifikasi untuk pencairan.");
      setToastType("success");
      await loadData();

      // If user opened this from withdraw modal, return them to withdraw modal
      if (wasInWithdrawModal) {
        setIsWithdrawModalOpen(true);
        setWasInWithdrawModal(false);
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal mendaftarkan rekening bank.");
      setToastType("warning");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Handle manual demo verify for pending bank
  const handleVerifyBank = async (bankId: string) => {
    setIsVerifyingBankId(bankId);
    try {
      await financeServiceApi.banking.verifyDemo(bankId);
      setToastMessage("Rekening bank berhasil diverifikasi.");
      setToastType("success");
      await loadData();
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal memverifikasi rekening.");
      setToastType("warning");
    } finally {
      setIsVerifyingBankId(null);
    }
  };

  // Handle Get Quote
  const handleGetQuote = async () => {
    const amt = parseInt(withdrawAmount, 10);
    if (isNaN(amt) || amt < 20000) {
      setQuoteError("Nominal penarikan minimal Rp 20.000.");
      return;
    }
    if (!selectedBankId) {
      setQuoteError("Pilih rekening bank tujuan pencairan terlebih dahulu.");
      return;
    }

    const currentBank = bankDestinations.find((b) => b.id === selectedBankId);
    if (currentBank && currentBank.verification_status !== "VERIFIED") {
      setQuoteError("Rekening bank belum diverifikasi. Silakan klik 'Verifikasi Rekening' terlebih dahulu.");
      return;
    }

    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const res = await financeServiceApi.banking.quoteWithdrawal({
        amount_idr: amt,
        bank_destination_id: selectedBankId,
        owner_type: "CUSTOMER",
      });
      if (res.data) {
        setQuote(res.data as WithdrawalQuoteResponse);
      }
    } catch (err: any) {
      setQuoteError(err?.message || "Gagal mengambil kutipan pencairan.");
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Handle Submit Withdrawal to Bank
  const handleSubmitWithdrawal = async () => {
    if (!quote || !selectedBankId || isSubmittingWithdrawal) return;

    try {
      setIsSubmittingWithdrawal(true);
      const res = await financeServiceApi.banking.requestWithdrawal({
        quote_id: quote.quote_id,
        bank_destination_id: selectedBankId,
        step_up_reference: "DEMO_STEP_UP_VERIFIED",
        bank_details_confirmed: true,
      });

      if (res && res.data) {
        setToastMessage("Permintaan pencairan dana berhasil diajukan ke Finance Ops!");
        setToastType("success");
        setIsWithdrawModalOpen(false);
        setWithdrawAmount("20000");
        setQuote(null);
        await loadData(true);
      } else {
        setToastMessage(res?.message || "Gagal mengajukan penarikan dana");
        setToastType("warning");
      }
    } catch (err: any) {
      setToastMessage(err?.message || "Terjadi kesalahan saat memproses penarikan");
      setToastType("warning");
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const availableBalance = account?.available_idr ?? 0;
  const lockedBalance = account?.withdrawal_locked_idr ?? 0;

  // Selected bank object
  const selectedBank = useMemo(() => {
    return bankDestinations.find((b) => b.id === selectedBankId) || bankDestinations[0] || null;
  }, [bankDestinations, selectedBankId]);

  // Pending refunds sum
  const pendingRefundsTotal = useMemo(() => {
    return refunds
      .filter((r) => r.status === "PENDING" || r.status === "PROCESSING")
      .reduce((sum, r) => sum + r.customer_net_refund_idr, 0);
  }, [refunds]);

  return (
    <div className="space-y-8 pb-20 font-body">
      {/* 1. TOP DISCLAIMER: S-PAY IS REFUND ACCOUNTING ONLY */}
      <div className="p-4 rounded-3xl bg-sky-500/10 border border-sky-500/20 text-slate-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Info size={18} weight="fill" className="text-[#0F4C81] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 block">
              S-Pay Customer — Khusus Saldo Pengembalian Dana (Refund)
            </span>
            <span className="text-[11px] text-slate-600 block leading-relaxed">
              S-Pay bukan dompet digital belanja dan tidak mendukung top-up maupun transfer peer-to-peer. Saldo berasal dari pengembalian dana pembatalan pesanan yang sah dan dapat dicairkan ke rekening bank resmi Anda.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <ArrowsClockwise size={13} weight="bold" className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Menyegarkan..." : "Refresh"}</span>
        </button>
      </div>

      {/* 2. HEADER & BREADCRUMB */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:underline transition cursor-pointer"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0F4C81]">
              <Bank size={24} weight="duotone" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900">
                S-Pay Pengembalian Dana
              </h1>
              <p className="text-xs text-slate-400">
                Catatan akuntansi pengembalian dana terintegrasi Finance 06
              </p>
            </div>
          </div>
        </div>

        {/* Live balance card summary + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[220px]">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Saldo Refund Tersedia</span>
              <button
                type="button"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title={isBalanceVisible ? "Sembunyikan" : "Tampilkan"}
              >
                {isBalanceVisible ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="text-2xl font-bold font-display text-[#0F4C81]">
              {isBalanceVisible ? formatRupiah(availableBalance) : "Rp ••••••••"}
            </div>
            {lockedBalance > 0 && (
              <span className="text-[11px] text-amber-700 font-medium block mt-1">
                Sedang dicairkan: {formatRupiah(lockedBalance)}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                setWasInWithdrawModal(false);
                setIsAddBankModalOpen(true);
              }}
              className="px-4 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} weight="bold" className="text-[#0F4C81]" />
              <span>Tambah Rekening</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              disabled={availableBalance < 20000}
              className="px-5 py-3.5 rounded-2xl bg-[#0F4C81] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs hover:bg-[#0c3c66] transition shadow-md shadow-sky-900/15 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bank size={16} weight="bold" />
              <span>Cairkan Refund</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. REFUND HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Saldo Dapat Ditarik
          </span>
          <span className="text-xl font-bold font-display text-slate-900">
            {formatRupiah(availableBalance)}
          </span>
          <p className="text-[11px] text-slate-400">
            {availableBalance >= 20000 ? "Memenuhi syarat minimal pencairan (≥ Rp20.000)" : "Kurang dari minimal penarikan Rp 20.000"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Refund Dalam Proses
          </span>
          <span className="text-xl font-bold font-display text-amber-600">
            {formatRupiah(pendingRefundsTotal)}
          </span>
          <p className="text-[11px] text-slate-400">
            Sedang diverifikasi oleh sistem Finance
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rekening Terdaftar
            </span>
            <span className="text-xl font-bold font-display text-slate-900 block">
              {bankDestinations.length} Rekening
            </span>
            <p className="text-[11px] text-slate-400">
              {bankDestinations.filter((b) => b.verification_status === "VERIFIED").length} Terverifikasi
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setWasInWithdrawModal(false);
              setIsAddBankModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-100 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            title="Tambah rekening bank baru"
          >
            <Plus size={14} weight="bold" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* 4. TABS NAVIGATION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-100 px-6 pt-4 gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("REFUNDS")}
            className={`pb-4 text-xs font-bold transition border-b-2 cursor-pointer shrink-0 ${
              activeTab === "REFUNDS"
                ? "border-[#0F4C81] text-[#0F4C81]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Refund ({refunds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MOVEMENTS")}
            className={`pb-4 text-xs font-bold transition border-b-2 cursor-pointer shrink-0 ${
              activeTab === "MOVEMENTS"
                ? "border-[#0F4C81] text-[#0F4C81]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Mutasi Saldo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BANKS")}
            className={`pb-4 text-xs font-bold transition border-b-2 cursor-pointer shrink-0 ${
              activeTab === "BANKS"
                ? "border-[#0F4C81] text-[#0F4C81]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Rekening Bank ({bankDestinations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={`pb-4 text-xs font-bold transition border-b-2 cursor-pointer shrink-0 ${
              activeTab === "WITHDRAWALS"
                ? "border-[#0F4C81] text-[#0F4C81]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Pencairan ({withdrawals.length})
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: REFUNDS */}
          {activeTab === "REFUNDS" && (
            <div className="space-y-4">
              {refunds.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Receipt size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Pengembalian Dana</p>
                  <p className="text-[11px] text-slate-400">
                    Pengembalian dana dari pembatalan pesanan barang yang sah akan otomatis dicatat di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {refunds.map((ref) => (
                    <div key={ref.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {ref.merchant_order_id ? `Pesanan #${ref.merchant_order_id}` : "Pengembalian Pesanan"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              ref.status === "SUCCEEDED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : ref.status === "FAILED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {ref.status === "SUCCEEDED"
                              ? "Berhasil Masuk S-Pay"
                              : ref.status === "FAILED"
                              ? "Gagal"
                              : "Diproses Finance"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Alasan: {ref.reason_code} • {new Date(ref.created_at).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-700 block">
                          +{formatRupiah(ref.customer_net_refund_idr)}
                        </span>
                        <span className="text-[10px] text-slate-400">Ref: {ref.source_event_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MOVEMENTS */}
          {activeTab === "MOVEMENTS" && (
            <div className="space-y-4">
              {movements.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <ArrowsClockwise size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Mutasi Saldo</p>
                  <p className="text-[11px] text-slate-400">
                    Setiap dana refund yang masuk atau dicairkan akan tercatat secara akuntabel.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {movements.map((mov) => {
                    const isCredit = mov.direction === "IN" || (mov as any).direction === "CREDIT";
                    return (
                      <div key={mov.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isCredit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft size={20} weight="bold" /> : <ArrowUpRight size={20} weight="bold" />}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{mov.description || mov.movement_type}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(mov.created_at).toLocaleString("id-ID")} • Sisa: {formatRupiah((mov as any).balance_after_idr ?? (mov as any).available_after_idr ?? 0)}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            isCredit ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {isCredit ? "+" : "-"}{formatRupiah(mov.amount_idr)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BANK ACCOUNTS */}
          {activeTab === "BANKS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-slate-500">
                  Rekening tujuan untuk penarikan dana saldo refund Anda:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setWasInWithdrawModal(false);
                    setIsAddBankModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200 hover:bg-sky-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Tambah Rekening</span>
                </button>
              </div>

              {bankDestinations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3">
                  <Bank size={44} className="mx-auto text-slate-300" weight="duotone" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Belum Ada Rekening Bank Terdaftar</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Daftarkan rekening bank resmi Anda untuk mencairkan saldo refund yang tersedia secara langsung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWasInWithdrawModal(false);
                      setIsAddBankModalOpen(true);
                    }}
                    className="mt-2 px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Tambah Rekening Bank Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bankDestinations.map((bank) => (
                    <div
                      key={bank.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3 hover:bg-white transition shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#0F4C81] text-[11px] font-bold font-mono">
                            {bank.bank_name}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{bank.bank_name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            bank.verification_status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {bank.verification_status === "VERIFIED" ? "Terverifikasi" : "Menunggu Verifikasi"}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-mono font-bold text-slate-800 tracking-wider block">
                          {bank.masked_account_number || bank.account_number}
                        </span>
                        <span className="text-xs text-slate-500 block uppercase mt-0.5">
                          a.n. {bank.account_holder_name}
                        </span>
                      </div>
                      {bank.verification_status !== "VERIFIED" && (
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-amber-700 flex items-center gap-1">
                            <Clock size={12} />
                            <span>Butuh verifikasi</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleVerifyBank(bank.id)}
                            disabled={isVerifyingBankId === bank.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            {isVerifyingBankId === bank.id ? <CircleNotch size={12} className="animate-spin" /> : <CheckCircle size={12} weight="bold" />}
                            <span>Verifikasi Cepat (Demo)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WITHDRAWALS */}
          {activeTab === "WITHDRAWALS" && (
            <div className="space-y-4">
              {withdrawals.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Bank size={40} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Penarikan Dana</p>
                  <p className="text-[11px] text-slate-400">
                    Permintaan pencairan dana ke rekening bank akan tercatat secara transparan di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <div key={w.withdrawal_id || w.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Pencairan ID #{String(w.withdrawal_id || w.id).slice(0, 12)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              w.status === "SUCCEEDED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : w.status === "FAILED"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Biaya transfer: {formatRupiah(w.transfer_fee_idr)} • Diterima di rekening: {formatRupiah(w.net_to_bank_idr)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 block">
                          {formatRupiah(w.requested_amount_idr)}
                        </span>
                        <span className="text-[10px] text-slate-400">{w.mode || "MOCK"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD BANK MODAL */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0F4C81] flex items-center justify-center">
                  <Bank size={18} weight="duotone" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Tambah Rekening Bank Resmi</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddBankModalOpen(false);
                  if (wasInWithdrawModal) {
                    setIsWithdrawModalOpen(true);
                    setWasInWithdrawModal(false);
                  }
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Bank:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-medium"
                >
                  <option value="BCA">Bank Central Asia (BCA)</option>
                  <option value="MANDIRI">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="BNI">Bank Negara Indonesia (BNI)</option>
                  <option value="CIMB">CIMB Niaga</option>
                  <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="PERMATA">Bank Permata</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Rekening:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 8830129841"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pemilik Rekening:</label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Harus sesuai nama di buku tabungan / KTP"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 uppercase font-medium"
                />
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
                <ShieldCheck size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
                <span>
                  Nomor rekening akan otomatis disamarkan (masked) untuk keamanan data finansial. Dalam lingkungan demo integrasi, rekening akan langsung diverifikasi agar siap digunakan untuk pencairan.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBankModalOpen(false);
                    if (wasInWithdrawModal) {
                      setIsWithdrawModalOpen(true);
                      setWasInWithdrawModal(false);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank}
                  className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingBank ? <CircleNotch size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
                  <span>Simpan Rekening</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL WITH INTEGRATED BANK SELECTION & ADD BANK LINK */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0F4C81] flex items-center justify-center">
                  <Bank size={18} weight="duotone" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Pencairan Saldo Refund</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setQuote(null);
                  setQuoteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Balance info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">Saldo Refund Tersedia:</span>
              <span className="font-bold font-display text-slate-900 text-sm">
                {formatRupiah(availableBalance)}
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nominal Penarikan (Minimal Rp 20.000):
                </label>
                <input
                  type="number"
                  min="20000"
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setQuote(null);
                    setQuoteError(null);
                  }}
                  className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
                />

                {/* Quick nominal chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[20000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setWithdrawAmount(String(Math.min(amt, availableBalance)));
                        setQuote(null);
                        setQuoteError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                  {availableBalance >= 20000 && (
                    <button
                      type="button"
                      onClick={() => {
                        setWithdrawAmount(String(availableBalance));
                        setQuote(null);
                        setQuoteError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0F4C81] text-[11px] font-bold transition cursor-pointer border border-sky-100"
                    >
                      Tarik Semua ({formatRupiah(availableBalance)})
                    </button>
                  )}
                </div>
              </div>

              {/* REKENING BANK TUJUAN PENCAIRAN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Pilih Rekening Bank Tujuan:
                  </label>
                  <button
                    type="button"
                    onClick={openAddBankFromWithdraw}
                    className="text-[11px] font-bold text-[#0F4C81] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} weight="bold" />
                    <span>+ Tambah Rekening Baru</span>
                  </button>
                </div>

                {bankDestinations.length === 0 ? (
                  /* EMPTY STATE WITH DIRECT CTA */
                  <div className="p-4 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white text-[#0F4C81] flex items-center justify-center mx-auto shadow-xs border border-sky-100">
                      <Bank size={20} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Belum Ada Rekening Bank Terdaftar
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5 leading-relaxed">
                        Tambahkan rekening bank resmi Anda untuk menerima dana pencairan refund secara instan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddBankFromWithdraw}
                      className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Tambah Rekening Bank Sekarang</span>
                    </button>
                  </div>
                ) : (
                  /* SELECTABLE BANK CARDS LIST */
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {bankDestinations.map((b) => {
                      const isSelected = selectedBankId === b.id;
                      const isVerified = b.verification_status === "VERIFIED";

                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBankId(b.id);
                            setQuote(null);
                            setQuoteError(null);
                          }}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-[#0F4C81] bg-sky-50/50 shadow-xs"
                              : "border-slate-200 bg-white hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                                isSelected
                                  ? "border-[#0F4C81] bg-[#0F4C81] text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected ? <Check size={12} weight="bold" /> : null}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                                  {b.bank_name}
                                </span>
                                <span className="text-xs font-bold font-mono text-slate-900">
                                  {b.masked_account_number || b.account_number}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block uppercase mt-0.5">
                                a.n. {b.account_holder_name}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isVerified ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle size={11} weight="fill" />
                                <span>Terverifikasi</span>
                              </span>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                  Menunggu Verifikasi
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyBank(b.id);
                                  }}
                                  disabled={isVerifyingBankId === b.id}
                                  className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  {isVerifyingBankId === b.id ? (
                                    <CircleNotch size={10} className="animate-spin" />
                                  ) : (
                                    <CheckCircle size={10} weight="bold" />
                                  )}
                                  <span>Verifikasi (Demo)</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ESTIMATE QUOTE BUTTON */}
              <button
                type="button"
                onClick={handleGetQuote}
                disabled={isLoadingQuote || !selectedBankId || bankDestinations.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoadingQuote ? <CircleNotch size={14} className="animate-spin" /> : <ArrowsClockwise size={14} />}
                <span>Hitung Estimasi Biaya Transfer</span>
              </button>
            </div>

            {quoteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0" />
                <span>{quoteError}</span>
              </div>
            )}

            {/* Official Quote Display */}
            {quote && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <span className="font-bold text-slate-800">Kutipan Biaya Transfer Resmi:</span>
                  <span className="text-[10px] font-mono text-slate-400">ID: {quote.quote_id.slice(0, 12)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Rekening Tujuan:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {selectedBank?.bank_name} • {selectedBank?.masked_account_number} ({selectedBank?.account_holder_name})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Nominal Ditarik:</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(quote.requested_amount_idr || (quote as any).amount_idr || parseInt(withdrawAmount, 10))}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Biaya Transfer Bank (BI-FAST):</span>
                  <span className="font-semibold text-slate-900">{formatRupiah(quote.transfer_fee_idr)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900 text-sm">
                  <span>Estimasi Diterima di Rekening:</span>
                  <span className="text-[#0F4C81] font-display text-base">{formatRupiah(quote.net_disbursement_idr || (quote as any).net_to_bank_idr || 0)}</span>
                </div>
              </div>
            )}

            {/* Authoritative Security Protocol: Verified Step-Up */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-950 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <ShieldCheck size={16} className="text-emerald-700" />
                <span>Protokol Keamanan Otoritatif (Identity Step-Up)</span>
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                Pencairan saldo pengembalian dana divalidasi dengan token otorisasi resmi. Dalam lingkungan demo integrasi penuh ini, kredensial diverifikasi secara otomatis (Step-Up Reference: <code className="bg-emerald-100/70 px-1 py-0.5 rounded text-[10px] font-mono">DEMO_STEP_UP_VERIFIED</code>).
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setQuote(null);
                }}
                disabled={isSubmittingWithdrawal}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSubmitWithdrawal}
                disabled={!quote || isLoadingQuote || isSubmittingWithdrawal}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmittingWithdrawal ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Memproses Penarikan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} weight="bold" />
                    <span>Ajukan Pencairan Dana</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
