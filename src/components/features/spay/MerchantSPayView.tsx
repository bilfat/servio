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
  Storefront,
  Hourglass,
  CalendarCheck,
  CreditCard,
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

export function MerchantSPayView() {
  const merchantOrgId = "0c1467e7-af68-4b26-ae84-daa41d51aed0";
  const merchantName = "Bengkel Sentosa Motor";

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
  const [accountHolderName, setAccountHolderName] = useState(merchantName);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

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
      const [accRes, heldRes, movRes, bankRes, withRes] = await Promise.allSettled([
        financeServiceApi.merchant.getSpay(merchantOrgId),
        financeServiceApi.merchant.getHeldFunds(merchantOrgId),
        financeServiceApi.merchant.getSpayMovements(merchantOrgId),
        financeServiceApi.banking.getBankDestinations("MERCHANT_ORGANIZATION", merchantOrgId),
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
        if (banks.length > 0 && !selectedBankId) {
          setSelectedBankId(banks[0].id);
        }
      }
      if (withRes.status === "fulfilled" && withRes.value.data) {
        const d = withRes.value.data as any;
        setWithdrawals(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.warn("Could not load Merchant Finance S-Pay data:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [merchantOrgId, selectedBankId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        owner_id: merchantOrgId,
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
  }, [isWithdrawModalOpen, withdrawAmount, selectedBankId, account?.available_idr, merchantOrgId]);

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
        owner_id: merchantOrgId,
      });

      if (res.data) {
        setToastMessage("Rekening bank organisasi berhasil ditambahkan. Menunggu verifikasi tim Finance.");
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
    <div className="w-full space-y-4 pb-20 font-body">
      {/* 1. Header with Breadcrumb & Org Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/merchant/dashboard"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={13} weight="bold" />
              <span>Dashboard Toko</span>
            </Link>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <Storefront size={12} weight="bold" />
              <span>{merchantName}</span>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 leading-tight flex items-center gap-2">
            <span>Keuangan Toko &amp; S-Pay Mitra Toko</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              Finance V3
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pendapatan penjualan produk, masa penahanan uang 120 jam, rekening bank toko, dan pengajuan pencairan saldo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
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
            className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
              canWithdraw
                ? "bg-emerald-600 hover:bg-emerald-700"
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
            Kebijakan Hak Saldo Toko &amp; Proteksi Uang 120 Jam
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Dana penjualan produk akan ditahan dalam status <strong>Dana Ditahan</strong> selama <strong>120 jam sejak status pesanan Selesai</strong>. Setelah masa penahanan berakhir dan terverifikasi aman dari sanggahan pelanggan, dana otomatis dipindahkan ke <strong>Saldo Tersedia</strong> dan siap untuk dicairkan (minimal Rp 20.000).
          </p>
        </div>
      </div>

      {/* 3. Authoritative Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Saldo Tersedia */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                <CheckCircle size={13} weight="fill" />
                <span>Saldo Tersedia (Siap Tarik)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="p-1 rounded-md hover:bg-emerald-700/50 text-emerald-200 transition"
              >
                {isBalanceVisible ? <EyeSlash size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="text-2xl font-extrabold font-mono tracking-tight">
              {isLoading ? (
                <span className="text-sm font-sans text-emerald-200">Memuat...</span>
              ) : isBalanceVisible ? (
                formatRupiah(availableBalance)
              ) : (
                "••••••••"
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-emerald-500/40 text-[10px] text-emerald-100 flex items-center justify-between">
            <span>Dapat ditarik ke rekening</span>
            <span className="font-bold">Min. Rp 20.000</span>
          </div>
        </div>

        {/* Card 2: Dana Ditahan (Escrow 120 Jam) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Hourglass size={13} weight="bold" />
                <span>Dana Ditahan (120 Jam)</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Ditahan
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
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
            <span>Dari pesanan Selesai</span>
            <span className="text-amber-700 font-semibold">{heldFunds.length} Pesanan</span>
          </div>
        </div>

        {/* Card 3: Sedang Diproses Payout */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Clock size={13} weight="bold" />
                <span>Sedang Dicairkan (Terkunci)</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                Transfer Bank
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
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
            <span>Proses transfer oleh Finance</span>
            <span className="font-semibold text-slate-700">{withdrawals.length} Penarikan</span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("HELD_FUNDS")}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "HELD_FUNDS"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Hourglass size={14} weight="bold" />
            <span>Uang Ditahan (120 Jam)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
              {heldFunds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MOVEMENTS")}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "MOVEMENTS"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
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
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "BANKS"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
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
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "WITHDRAWALS"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50"
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
                    Daftar Penahanan Uang Penjualan (120 Jam)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dana hasil pesanan COMPLETED ditahan selama 120 jam sebelum saldo dapat dicairkan ke rekening bank.
                  </p>
                </div>
              </div>

              {heldFunds.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Hourglass size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">
                    Tidak ada dana penjualan yang sedang ditahan
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Saat pesanan barang diselesaikan oleh pelanggan atau otomatis oleh sistem 72 jam setelah penerimaan valid, dana akan tercatat di sini selama 120 jam.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">ID Pesanan Toko</th>
                        <th className="py-2.5 px-3">Waktu Selesai</th>
                        <th className="py-2.5 px-3">Estimasi Pelepasan (120 Jam)</th>
                        <th className="py-2.5 px-3 text-right">Nilai Barang</th>
                        <th className="py-2.5 px-3 text-right">Potongan Komisi</th>
                        <th className="py-2.5 px-3 text-right">Hak Bersih Toko</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {heldFunds.map((hf) => {
                        const isHeld = hf.status === "HELD";
                        const orderId = hf.merchant_order_id || hf.allocation?.merchant_order_id || hf.id || "";
                        const completedAt = hf.order_completed_at || (hf as any).completed_at || hf.created_at;
                        const grossSubtotal = hf.allocation?.merchant_gross_subtotal_idr ?? (hf.allocation as any)?.product_subtotal_idr ?? (hf as any).gross_held_idr ?? hf.merchant_entitlement_idr ?? 0;
                        const commissionFee = hf.allocation?.merchant_commission_fee_idr ?? (hf.allocation as any)?.merchant_commission_idr ?? 0;

                        return (
                          <tr key={hf.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              #{orderId ? orderId.slice(0, 12) : (hf.id ? hf.id.slice(0, 12) : "-")}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {completedAt ? formatDateTimeIndo(completedAt) : "-"}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-mono">
                              {hf.eligible_release_at ? formatDateTimeIndo(hf.eligible_release_at) : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {formatRupiah(grossSubtotal)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-600">
                              -{formatRupiah(commissionFee)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(hf.merchant_entitlement_idr || 0)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isHeld
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {isHeld ? "DITAHAN (120H)" : "DILEPASKAN"}
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
                  Riwayat Mutasi Finansial S-Pay Toko
                </h3>
              </div>

              {movements.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <Receipt size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada mutasi keuangan</p>
                  <p className="text-[11px] text-slate-400">
                    Aktivitas penyelesaian dana penjualan dan penarikan akan dicatat di sini secara transparan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => {
                    const isCredit = mov.direction === "IN";
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
                                : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft size={16} weight="bold" />
                            ) : (
                              <ArrowUpRight size={16} weight="bold" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{mov.description || mov.movement_type}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Ref: {mov.reference_id || (mov.id ? mov.id.slice(0, 14) : "-")} • {formatDateTimeIndo(mov.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-extrabold ${
                              isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isCredit ? "+" : "-"} {formatRupiah(mov.amount_idr)}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Saldo: {formatRupiah(mov.balance_after_idr)}
                          </p>
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
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Rekening Bank Organisasi Toko
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hanya rekening yang telah diverifikasi oleh Finance Ops yang dapat digunakan untuk pencairan saldo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus size={13} weight="bold" />
                  <span>Tambah Rekening Toko</span>
                </button>
              </div>

              {bankDestinations.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Bank size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada rekening bank toko terdaftar</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Daftarkan rekening bank resmi organisasi toko Anda untuk menerima hasil pencairan penjualan.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bankDestinations.map((bank) => {
                    const isVerified = bank.verification_status === "VERIFIED";
                    return (
                      <div
                        key={bank.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Bank size={15} className="text-slate-500" />
                            <span>{bank.bank_name}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {isVerified ? "Terverifikasi" : "Menunggu Verifikasi"}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-slate-600 text-xs tracking-wider">
                            {bank.masked_account_number || bank.account_number}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                            a.n. {bank.account_holder_name}
                          </p>
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
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Riwayat Pengajuan Pencairan Dana Toko
                </h3>
              </div>

              {withdrawals.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <CreditCard size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Belum ada pengajuan pencairan saldo</p>
                  <p className="text-[11px] text-slate-400">
                    Pengajuan pencairan yang dibuat akan terlacak status transfer banknya di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map((w, idx) => (
                    <div
                      key={w.withdrawal_id || w.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            #{w.withdrawal_id ? w.withdrawal_id.slice(0, 14) : (w.id ? w.id.slice(0, 12) : "WTD")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.status === "SUCCEEDED"
                                ? "bg-emerald-100 text-emerald-800"
                                : w.status === "FAILED" || w.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Diajukan: {formatDateTimeIndo(w.created_at || new Date().toISOString())}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-extrabold text-slate-900">
                          {formatRupiah(w.requested_amount_idr)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Biaya: {formatRupiah(w.transfer_fee_idr)} • Bersih:{" "}
                          <span className="text-emerald-700 font-bold font-mono">
                            {formatRupiah(w.net_to_bank_idr ?? (w.requested_amount_idr - w.transfer_fee_idr))}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. ADD BANK MODAL */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bank size={20} className="text-emerald-600" weight="bold" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Tambah Rekening Bank Organisasi Toko
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Bank:</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                >
                  <option value="BCA">Bank BCA</option>
                  <option value="MANDIRI">Bank Mandiri</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="BNI">Bank BNI</option>
                  <option value="CIMB">Bank CIMB Niaga</option>
                  <option value="PERMATA">Bank Permata</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor Rekening:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pemilik Rekening (Sesuai Buku Tabungan):</label>
                <input
                  type="text"
                  required
                  placeholder="Nama resmi organisasi / pemilik"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold">Verifikasi Finance Ops:</p>
                <p className="leading-snug">
                  Rekening baru akan berstatus <strong>Menunggu Verifikasi</strong> sampai ditinjau oleh tim Finance Ops SERVIO demi keamanan transaksi.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBank}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5"
                >
                  {isSubmittingBank ? (
                    <CircleNotch size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} weight="bold" />
                  )}
                  <span>Simpan Rekening</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. WITHDRAWAL MODAL WITH FAIL-CLOSED SECURITY GUARD */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bank size={20} className="text-emerald-600" weight="bold" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Cairkan Saldo Penjualan Toko ke Rekening Bank
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <span className="text-emerald-800 font-semibold">Saldo Tersedia Saat Ini:</span>
                <span className="font-mono font-extrabold text-emerald-900 text-sm">
                  {formatRupiah(availableBalance)}
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pilih Rekening Tujuan (Terverifikasi):
                </label>
                {bankDestinations.filter((b) => b.verification_status === "VERIFIED").length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    Belum ada rekening organisasi berstatus <strong>TERVERIFIKASI</strong>. Silakan tambahkan rekening dan tunggu verifikasi Finance Ops sebelum melakukan pencairan.
                  </div>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    {bankDestinations
                      .filter((b) => b.verification_status === "VERIFIED")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} • {b.masked_account_number || b.account_number} ({b.account_holder_name})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nominal Pencairan (Minimal Rp 20.000):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={20000}
                    step={1000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Real Quote Breakdown */}
              {isLoadingQuote ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 flex items-center justify-center gap-2">
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Menghitung estimasi biaya transfer bank...</span>
                </div>
              ) : quote ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Nominal Penarikan:</span>
                    <span className="font-bold text-slate-900">{formatRupiah(quote.requested_amount_idr)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Transfer Bank (Quote Resmi):</span>
                    <span className="font-bold text-rose-600">-{formatRupiah(quote.transfer_fee_idr)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-extrabold pt-1.5 border-t border-slate-200">
                    <span>Estimasi Diterima di Rekening:</span>
                    <span>{formatRupiah(quote.net_disbursement_idr)}</span>
                  </div>
                </div>
              ) : quoteError ? (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                  {quoteError}
                </div>
              ) : null}

              {/* Authoritative Security Protocol: Verified Step-Up */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-700 shrink-0" />
                  <span>Protokol Keamanan Otoritatif (Identity Step-Up)</span>
                </div>
                <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                  Pencairan saldo organisasi divalidasi melalui protokol keamanan otoritatif sebelum diteruskan ke rekening bank terdaftar.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={isSubmittingWithdrawal}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSubmitWithdrawal}
                  disabled={!quote || isLoadingQuote || isSubmittingWithdrawal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-sm"
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
