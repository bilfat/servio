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
  Wrench,
  Buildings,
  Hourglass,
  CalendarCheck,
  CreditCard,
  Scales,
} from "@phosphor-icons/react";
import { formatRupiah, formatDateTimeIndo } from "@/features/order-barang/helpers";
import { Toast } from "@/components/feedback/Toast";
import {
  financeServiceApi,
  MerchantSPayAccount,
  HeldFundEntity,
  SPayMovementEntity,
  BankDestinationEntity,
  WithdrawalQuoteResponse,
  WithdrawalRequestEntity,
} from "@/lib/financeServiceApi";

export interface ProviderOrgOption {
  id: string;
  name: string;
  legalName?: string;
  role: string;
}

export const PROVIDER_AUTHORIZED_ORGS: ProviderOrgOption[] = [
  {
    id: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    name: "PT Servio Mandiri Teknik",
    legalName: "PT Servio Mandiri Teknik",
    role: "OWNER",
  },
  {
    id: "087c97b7-2c46-4b97-ba35-1177dd72ba3a",
    name: "Bengkel Sejuk Sentosa AC",
    legalName: "Bisnis APP-2026-432674",
    role: "OWNER",
  },
];

export function ProviderSPayView() {
  const [currentOrgId, setCurrentOrgId] = useState<string>("0740d857-b665-4191-aaf5-d7dd3611dc1d");
  const activeOrg = useMemo(() => {
    return PROVIDER_AUTHORIZED_ORGS.find((o) => o.id === currentOrgId) || PROVIDER_AUTHORIZED_ORGS[0];
  }, [currentOrgId]);

  const [account, setAccount] = useState<MerchantSPayAccount | null>(null);
  const [heldFunds, setHeldFunds] = useState<HeldFundEntity[]>([]);
  const [movements, setMovements] = useState<SPayMovementEntity[]>([]);
  const [bankDestinations, setBankDestinations] = useState<BankDestinationEntity[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestEntity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<"HELD_FUNDS" | "MOVEMENTS" | "BANKS" | "WITHDRAWALS">("HELD_FUNDS");

  // Add Bank Modal state
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState("BCA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState(activeOrg.name);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  // Withdraw Modal state
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("20000");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [quote, setQuote] = useState<WithdrawalQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [bankDetailsConfirmed, setBankDetailsConfirmed] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  // Load authoritative data from Finance Service
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [accRes, heldRes, movRes, bankRes, withRes] = await Promise.allSettled([
        financeServiceApi.merchant.getSpay(currentOrgId),
        financeServiceApi.merchant.getHeldFunds(currentOrgId),
        financeServiceApi.merchant.getSpayMovements(currentOrgId),
        financeServiceApi.banking.getBankDestinations("MERCHANT_ORGANIZATION", currentOrgId),
        financeServiceApi.banking.getWithdrawals({ per_page: 20 }),
      ]);

      if (accRes.status === "fulfilled" && accRes.value.data) {
        setAccount(accRes.value.data as MerchantSPayAccount);
      }
      if (heldRes.status === "fulfilled" && heldRes.value.data) {
        const d = heldRes.value.data as any;
        setHeldFunds(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
      if (movRes.status === "fulfilled" && movRes.value.data) {
        const d = movRes.value.data as any;
        setMovements(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
      if (bankRes.status === "fulfilled" && bankRes.value.data) {
        const banks = Array.isArray(bankRes.value.data) ? bankRes.value.data : [];
        setBankDestinations(banks);
        if (banks.length > 0) {
          const verified = banks.find((b) => b.verification_status === "VERIFIED");
          setSelectedBankId(verified?.id || banks[0].id);
        } else {
          setSelectedBankId("");
        }
      }
      if (withRes.status === "fulfilled" && withRes.value.data) {
        const d = withRes.value.data as any;
        const list = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
        // Filter withdrawals belonging to this organization or account
        const filtered = list.filter((w: any) => {
          return (
            w.spay_account?.owner_external_id === currentOrgId ||
            w.bank_destination?.owner_external_id === currentOrgId ||
            w.bank_snapshot_masked?.account_holder_name_masked?.includes(activeOrg.name.slice(0, 4))
          );
        });
        setWithdrawals(filtered.length > 0 ? filtered : list);
      }
    } catch (e) {
      console.warn("Could not load Provider Finance S-Pay data:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentOrgId, activeOrg.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync holder name when switching organization
  useEffect(() => {
    setAccountHolderName(activeOrg.name);
  }, [activeOrg]);

  // Request Quote when withdraw modal is open and amount changes
  useEffect(() => {
    if (!isWithdrawModalOpen || !selectedBankId) return;
    const num = parseInt(withdrawAmount, 10);
    if (isNaN(num) || num < 20000) {
      setQuote(null);
      setQuoteError("Nominal penarikan minimal Rp 20.000");
      return;
    }

    const available = account?.available_idr || 0;
    if (num > available) {
      setQuote(null);
      setQuoteError("Nominal melebihi saldo tersedia yang dapat dicairkan");
      return;
    }

    let active = true;
    setIsLoadingQuote(true);
    setQuoteError(null);

    financeServiceApi.banking
      .quoteWithdrawal({
        amount_idr: num,
        bank_destination_id: selectedBankId,
        owner_type: "MERCHANT_ORGANIZATION",
        owner_id: currentOrgId,
      })
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setQuote(res.data);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError(res.message || "Gagal mendapatkan rincian biaya penarikan");
        }
      })
      .catch((err) => {
        if (!active) return;
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : "Gagal menghubungi server finance");
      })
      .finally(() => {
        if (active) setIsLoadingQuote(false);
      });

    return () => {
      active = false;
    };
  }, [isWithdrawModalOpen, withdrawAmount, selectedBankId, account?.available_idr, currentOrgId]);

  // Handle Add Bank Destination
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !accountHolderName) return;

    try {
      setIsSubmittingBank(true);
      const res = await financeServiceApi.banking.addBankDestination({
        bank_name: bankName,
        account_number: accountNumber,
        account_holder_name: accountHolderName,
        owner_type: "MERCHANT_ORGANIZATION",
        owner_id: currentOrgId,
      });

      if (res.data) {
        setToastMessage("Rekening bank organisasi mitra berhasil ditambahkan. Menunggu verifikasi tim Finance.");
        setToastType("success");
        setIsAddBankModalOpen(false);
        setAccountNumber("");
        loadData();
      } else {
        setToastMessage(res.message || "Gagal menambahkan rekening bank");
        setToastType("warning");
      }
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
      setToastType("warning");
    } finally {
      setIsSubmittingBank(false);
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
        bank_details_confirmed: bankDetailsConfirmed,
      });

      if (res && res.data) {
        setToastMessage("Permintaan pencairan dana berhasil diajukan ke antrean Finance Ops!");
        setToastType("success");
        setIsWithdrawModalOpen(false);
        setWithdrawAmount("20000");
        setQuote(null);
        await loadData(true);
      } else {
        setToastMessage(res?.message || "Gagal mengajukan penarikan dana");
        setToastType("warning");
      }
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses penarikan");
      setToastType("warning");
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const availableBalance = account?.available_idr || 0;
  const heldBalance = account?.pending_held_idr || 0;
  const lockedBalance = account?.withdrawal_locked_idr || 0;
  const canWithdraw = availableBalance >= 20000;

  return (
    <div className="w-full space-y-5 pb-20 font-body">
      {/* 1. Header with Breadcrumb & Org Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Link
              href="/provider/dashboard"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={13} weight="bold" />
              <span>Dashboard Provider</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
              <Wrench size={12} weight="bold" />
              <span>Mitra Layanan Jasa</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 leading-tight flex items-center gap-2">
            <span>Dompet S-Pay Provider Jasa</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              Finance 06 Real
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sumber kebenaran finansial resmi dari Finance Service 06 untuk hak pendapatan jasa perbaikan, kliring 120 jam, dan pencairan dana ke rekening.
          </p>
        </div>

        {/* Action & Multi-Org Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {/* Org Switcher */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
            <Buildings size={14} className="text-slate-500" />
            <select
              value={currentOrgId}
              onChange={(e) => {
                setCurrentOrgId(e.target.value);
                setIsLoading(true);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {PROVIDER_AUTHORIZED_ORGS.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwise size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canWithdraw) {
                setToastType("warning");
                setToastMessage(`Saldo siap ditarik (${formatRupiah(availableBalance)}) belum mencapai batas minimum pencairan Rp 20.000.`);
                return;
              }
              setIsWithdrawModalOpen(true);
            }}
            className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
              canWithdraw
                ? "bg-[#0F4C81] hover:bg-sky-900"
                : "bg-slate-400 hover:bg-slate-500"
            }`}
            title={canWithdraw ? "Cairkan saldo ke rekening bank terdaftar" : "Minimal saldo siap ditarik Rp 20.000"}
          >
            <Bank size={15} weight="bold" />
            <span>Cairkan Saldo</span>
          </button>
        </div>
      </div>

      {/* 2. Official Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2.5 shadow-2xs">
        <ShieldCheck size={18} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900">
            Kebijakan Hak Saldo Jasa &amp; Proteksi Kliring Dana 120 Jam
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Hak pendapatan jasa perbaikan (biaya diagnosis &amp; biaya pengerjaan) diamankan dalam status <strong>Dana Tertahan</strong> selama <strong>120 jam sejak order jasa selesai (COMPLETED)</strong>. Setelah masa penahanan berakhir tanpa sanggahan pelanggan, dana otomatis dipindahkan ke <strong>Saldo Tersedia</strong> melalui scheduler Finance dan siap dicairkan ke rekening bank resmi (minimal Rp 20.000).
          </p>
        </div>
      </div>

      {/* 3. Authoritative Financial Summary Cards (5 Kliring Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Saldo Tersedia (Withdrawable) */}
        <div className="bg-gradient-to-br from-[#0F4C81] to-[#0A3358] text-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-100 flex items-center gap-1">
                <CheckCircle size={13} weight="fill" />
                <span>Dapat Dicairkan</span>
              </span>
              <button
                type="button"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="p-1 rounded-md hover:bg-sky-700/50 text-sky-200 transition"
              >
                {isBalanceVisible ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight">
              {isLoading ? (
                <span className="text-sm font-sans text-sky-200">Memuat...</span>
              ) : isBalanceVisible ? (
                formatRupiah(availableBalance)
              ) : (
                "••••••••"
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-sky-400/30 text-[10px] text-sky-100 flex items-center justify-between">
            <span>Siap ditarik ke bank</span>
            <span className="font-bold">Min. Rp 20.000</span>
          </div>
        </div>

        {/* Card 2: Dana Tertahan (Pending Settlement 120 Jam) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Hourglass size={13} weight="bold" />
                <span>Pending Settlement</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                120 Jam
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-sm font-sans text-slate-400">Memuat...</span>
              ) : isBalanceVisible ? (
                formatRupiah(heldBalance)
              ) : (
                "••••••••"
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Dari pesanan jasa</span>
            <span className="text-amber-700 font-semibold">{heldFunds.length} Order</span>
          </div>
        </div>

        {/* Card 3: Reserved Balance (Terkunci untuk Penarikan / Jaminan) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Clock size={13} weight="bold" />
                <span>Reserved Balance</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                Terkunci Payout
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
              {isLoading ? (
                <span className="text-sm font-sans text-slate-400">Memuat...</span>
              ) : isBalanceVisible ? (
                formatRupiah(lockedBalance)
              ) : (
                "••••••••"
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Proses transfer Finance</span>
            <span className="font-semibold text-slate-700">{withdrawals.length} Penarikan</span>
          </div>
        </div>

        {/* Card 4: Financial Hold (Penahanan Sanggahan / Fraud) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <Lock size={13} weight="bold" />
                <span>Financial Hold</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                Aman
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
              {isBalanceVisible ? formatRupiah(0) : "••••••••"}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Penahanan investigasi</span>
            <span className="text-emerald-700 font-semibold">Tidak Ada</span>
          </div>
        </div>

        {/* Card 5: Obligation (Kewajiban Platform / SLA) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Scales size={13} weight="bold" />
                <span>Obligation</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                Lunas
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
              {isBalanceVisible ? formatRupiah(0) : "••••••••"}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Denda SLA / Tunggakan</span>
            <span className="text-slate-700 font-semibold">Rp 0</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("HELD_FUNDS")}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "HELD_FUNDS"
                ? "border-[#0F4C81] text-[#0F4C81] bg-sky-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Hourglass size={14} weight="bold" />
            <span>Dana Tertahan (120 Jam)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              {heldFunds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MOVEMENTS")}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "MOVEMENTS"
                ? "border-[#0F4C81] text-[#0F4C81] bg-sky-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Receipt size={14} weight="bold" />
            <span>Riwayat Mutasi Saldo</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              {movements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BANKS")}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "BANKS"
                ? "border-[#0F4C81] text-[#0F4C81] bg-sky-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Bank size={14} weight="bold" />
            <span>Rekening Bank Organisasi</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              {bankDestinations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "WITHDRAWALS"
                ? "border-[#0F4C81] text-[#0F4C81] bg-sky-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <CreditCard size={14} weight="bold" />
            <span>Riwayat Pencairan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              {withdrawals.length}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5">
          {/* TAB 1: DANA DITAHAN (HELD FUNDS) */}
          {activeTab === "HELD_FUNDS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Daftar Penahanan Hak Jasa (120 Jam Kliring)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dana hasil order jasa diagnosis &amp; pengerjaan diamankan selama 120 jam sebelum saldo dilepaskan ke saldo siap tarik.
                  </p>
                </div>
              </div>

              {heldFunds.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Hourglass size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">
                    Tidak ada dana jasa yang sedang ditahan
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Saat order jasa diselesaikan oleh teknisi dan diverifikasi pelanggan, hak pendapatan akan tercatat di sini selama 120 jam.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">ID Alokasi / Referensi Order</th>
                        <th className="py-2.5 px-3">Tipe Tagihan</th>
                        <th className="py-2.5 px-3">Waktu Selesai</th>
                        <th className="py-2.5 px-3">Estimasi Pelepasan (120 Jam)</th>
                        <th className="py-2.5 px-3 text-right">Nilai Tagihan</th>
                        <th className="py-2.5 px-3 text-right">Potongan Komisi</th>
                        <th className="py-2.5 px-3 text-right">Hak Bersih Mitra</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {heldFunds.map((hf) => {
                        const isHeld = hf.status === "HELD";
                        const isReleased = hf.status === "RELEASED_TO_SPAY";
                        const orderId = hf.merchant_order_id || hf.allocation?.merchant_order_id || hf.id || "";
                        const purpose = ((hf.allocation as any)?.fee_snapshot as any)?.purpose || (orderId.includes("diagnosis") ? "DIAGNOSIS" : "PENGERJAAN");
                        const completedAt = hf.order_completed_at || (hf as any).completed_at || hf.created_at;
                        const grossSubtotal = (hf as any).gross_held_idr ?? (hf.allocation as any)?.product_subtotal_idr ?? hf.merchant_entitlement_idr ?? 0;
                        const commissionFee = (hf.allocation as any)?.merchant_commission_idr ?? 0;

                        return (
                          <tr key={hf.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              #{orderId.length > 20 ? orderId.slice(0, 18) + "..." : orderId}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {purpose}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {completedAt ? formatDateTimeIndo(completedAt) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {hf.eligible_release_at ? formatDateTimeIndo(hf.eligible_release_at) : "Menunggu Pengerjaan"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(grossSubtotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                              {commissionFee > 0 ? `-${formatRupiah(commissionFee)}` : "Rp 0"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(hf.merchant_entitlement_idr || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isReleased
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : isHeld
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                              >
                                {isReleased ? "DILEPASKAN" : isHeld ? "DITAHAN (120H)" : hf.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RIWAYAT MUTASI (MOVEMENTS) */}
          {activeTab === "MOVEMENTS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Riwayat Mutasi Finansial S-Pay Mitra Provider
                </h3>
              </div>

              {movements.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <Receipt size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada mutasi keuangan</p>
                  <p className="text-[11px] text-slate-400">
                    Aktivitas penyelesaian dana jasa dan penarikan akan dicatat di sini secara transparan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => {
                    const isCredit = (mov as any).direction === "CREDIT" || mov.direction === "IN";
                    const isLock = (mov as any).direction === "LOCK";
                    const movType = (mov as any).movement_type;
                    return (
                      <div
                        key={mov.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : isLock
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft size={18} weight="bold" />
                            ) : isLock ? (
                              <Lock size={18} weight="bold" />
                            ) : (
                              <ArrowUpRight size={18} weight="bold" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {movType === "MERCHANT_RELEASE"
                                ? "Pelepasan Dana Pesanan Jasa (120 Jam Selesai)"
                                : movType === "WITHDRAWAL_LOCK"
                                ? "Kunci Saldo untuk Pengajuan Pencairan Bank"
                                : movType === "WITHDRAWAL_SETTLEMENT" || movType === "WITHDRAWAL_SETTLED"
                                ? "Pencairan Berhasil ke Rekening Bank"
                                : mov.description || movType}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Ref: #{(mov as any).source_id?.slice(0, 16) || mov.reference_id || mov.id.slice(0, 12)}</span>
                              <span>•</span>
                              <span>{formatDateTimeIndo(mov.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-mono font-bold text-sm ${
                              isCredit ? "text-emerald-700" : isLock ? "text-amber-700" : "text-rose-700"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatRupiah(mov.amount_idr)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Saldo: {formatRupiah((mov as any).available_after_idr ?? (mov as any).balance_after_idr ?? 0)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REKENING BANK ORGANISASI */}
          {activeTab === "BANKS" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rekening Bank Resmi Organisasi Mitra
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hanya rekening terverifikasi atas nama entitas resmi yang dapat digunakan untuk pencairan dana.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={14} weight="bold" />
                  <span>Tambah Rekening Organisasi</span>
                </button>
              </div>

              {bankDestinations.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Bank size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada rekening bank terdaftar</p>
                  <p className="text-[11px] text-slate-400">
                    Tambahkan rekening bank resmi organisasi Anda untuk mencairkan saldo pendapatan jasa.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {bankDestinations.map((bank) => {
                    const isVerified = bank.verification_status === "VERIFIED";
                    const accMasked = (bank as any).account_number_masked || (bank as any).masked_account_number || bank.account_number || (bank.account_last4 ? "•••• " + bank.account_last4 : "-");
                    return (
                      <div
                        key={bank.id}
                        className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                          isVerified ? "bg-white border-slate-200" : "bg-amber-50/40 border-amber-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-[#0F4C81] flex items-center justify-center shrink-0">
                            <Bank size={20} weight="bold" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900">{bank.bank_name || bank.bank_code}</span>
                              {bank.is_default && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-[#0F4C81]">
                                  Utama
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-slate-700 mt-0.5">
                              {accMasked}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              an. {bank.account_holder_name_masked || bank.account_holder_name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isVerified ? "TERVERIFIKASI" : "MENUNGGU VERIFIKASI"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RIWAYAT PENCAIRAN (WITHDRAWALS) */}
          {activeTab === "WITHDRAWALS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Log Status Pengajuan Pencairan Dana ke Bank
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seluruh penarikan diproses secara aman oleh modul Finance Ops dan sistem kliring perbankan BI-FAST.
                  </p>
                </div>
              </div>

              {withdrawals.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <CreditCard size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada riwayat penarikan dana</p>
                  <p className="text-[11px] text-slate-400">
                    Gunakan tombol &quot;Cairkan Saldo&quot; saat saldo siap ditarik mencapai batas minimum Rp 20.000.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">ID Penarikan</th>
                        <th className="py-2.5 px-3">Waktu Pengajuan</th>
                        <th className="py-2.5 px-3">Rekening Bank Tujuan</th>
                        <th className="py-2.5 px-3 text-right">Nominal Pengajuan</th>
                        <th className="py-2.5 px-3 text-right">Biaya Admin</th>
                        <th className="py-2.5 px-3 text-right">Ditransfer Bersih</th>
                        <th className="py-2.5 px-3 text-center">Status Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {withdrawals.map((w) => {
                        const isSuccess = w.status === "SUCCEEDED";
                        const isPending = (w.status as any) === "PENDING" || (w.status as any) === "REQUESTED";
                        const isProcessing = w.status === "PROCESSING";
                        const bankMasked = (w as any).bank_snapshot_masked?.account_last4
                          ? `•••• ${(w as any).bank_snapshot_masked?.account_last4}`
                          : ((w.bank_destination as any)?.account_number_masked || (w.bank_destination as any)?.masked_account_number || w.bank_destination?.account_number || "-");

                        return (
                          <tr key={w.id || w.withdrawal_id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              #{(w.id || w.withdrawal_id).slice(0, 14)}...
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {(w as any).initiated_at || w.created_at ? formatDateTimeIndo((w as any).initiated_at || w.created_at) : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <span className="font-bold">{(w as any).bank_snapshot_masked?.bank_code || w.bank_destination?.bank_name || "BCA"}</span>
                              <span className="text-slate-400 mx-1">•</span>
                              <span className="font-mono text-[11px]">{bankMasked}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                              {formatRupiah(w.requested_amount_idr)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {formatRupiah(w.transfer_fee_idr || 2500)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(w.net_to_bank_idr)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isSuccess
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : isPending
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : isProcessing
                                    ? "bg-sky-100 text-sky-800 border border-sky-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}
                              >
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL: TARIK DANA SEKARANG (WITHDRAWAL QUOTE & ATOMIC SUBMIT) */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center">
                  <Bank size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pencairan Dana Provider</h3>
                  <p className="text-[11px] text-slate-500">{activeOrg.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-body">
              {/* Saldo info */}
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500">Saldo Siap Ditarik</span>
                  <div className="text-base font-extrabold text-[#0F4C81] font-mono">
                    {formatRupiah(availableBalance)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(availableBalance))}
                  className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-[#0F4C81] font-bold text-[11px] transition"
                >
                  Tarik Semua
                </button>
              </div>

              {/* Rekening Tujuan Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Rekening Bank Terverifikasi
                </label>
                {bankDestinations.length === 0 ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                    Belum ada rekening bank yang terdaftar untuk organisasi ini. Tambahkan rekening terlebih dahulu.
                  </div>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 cursor-pointer"
                  >
                    {bankDestinations.map((b) => {
                      const accMasked = (b as any).account_number_masked || (b as any).masked_account_number || b.account_number || (b.account_last4 ? "•••• " + b.account_last4 : "-");
                      return (
                        <option key={b.id} value={b.id}>
                          {b.bank_name || b.bank_code} • {accMasked} ({b.account_holder_name_masked || b.account_holder_name})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Nominal Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nominal Penarikan (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="20000"
                    step="5000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                    placeholder="20000"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  {[50000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 transition"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quote Breakdown */}
              {isLoadingQuote ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 flex items-center justify-center gap-2">
                  <CircleNotch size={14} className="animate-spin text-[#0F4C81]" />
                  <span>Menghitung kuotasi transfer Finance...</span>
                </div>
              ) : quoteError ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                  <WarningCircle size={14} className="shrink-0" />
                  <span>{quoteError}</span>
                </div>
              ) : quote ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Nominal Ditarik:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah((quote as any).amount_idr ?? (quote as any).requested_amount_idr)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Biaya Layanan BI-FAST:</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(quote.transfer_fee_idr)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-slate-900 font-bold">
                    <span>Diterima di Rekening:</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm">
                      {formatRupiah((quote as any).net_to_bank_idr ?? (quote as any).net_disbursement_idr)}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bankDetailsConfirmed}
                  onChange={(e) => setBankDetailsConfirmed(e.target.checked)}
                  className="rounded border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81] mt-0.5"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  Saya mengonfirmasi bahwa data rekening bank yang dipilih sudah benar dan milik organisasi resmi yang berwenang.
                </span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitWithdrawal}
                disabled={!quote || !bankDetailsConfirmed || isSubmittingWithdrawal || isLoadingQuote}
                className="px-5 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmittingWithdrawal && <CircleNotch size={14} className="animate-spin" />}
                <span>{isSubmittingWithdrawal ? "Memproses..." : "Konfirmasi Tarik Dana"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: TAMBAH REKENING BANK ORGANISASI */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Bank size={18} weight="bold" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tambah Rekening Bank</h3>
                  <p className="text-[11px] text-slate-500">{activeOrg.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="p-5 space-y-4 text-xs font-body">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nama Bank
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                >
                  <option value="BCA">Bank BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank BRI (Bank Rakyat Indonesia)</option>
                  <option value="BNI">Bank BNI (Bank Negara Indonesia)</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="CIMB">Bank CIMB Niaga</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 827708123456"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Nama Pemilik Rekening (Sesuai Buku Tabungan / Akta Organisasi)
                </label>
                <input
                  type="text"
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Nama pemilik rekening resmi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Rekening baru akan otomatis diverifikasi oleh tim Finance Payment Ops sebelum dapat digunakan untuk transaksi penarikan.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank || !accountNumber || !accountHolderName}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBank && <CircleNotch size={14} className="animate-spin" />}
                  <span>{isSubmittingBank ? "Menyimpan..." : "Simpan Rekening"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Toast Feedback */}
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

