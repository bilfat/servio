"use client";

import React, { useState } from "react";
import {
  Bank,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  ArrowRight,
  ShieldCheck,
  Sparkle,
  X,
  CreditCard,
  Info,
} from "@phosphor-icons/react";
import {
  SPayAccountSummary,
  SPaySimulationResult,
  SPayWithdrawResult,
  SPayBankAccount,
} from "@/types/spay";

export interface SPayWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SPayAccountSummary;
  onWithdraw: (params: {
    amount: number;
    destinationAccountId: string;
    notes?: string;
    simulationResult: SPaySimulationResult;
  }) => Promise<SPayWithdrawResult>;
}

export function SPayWithdrawModal({
  isOpen,
  onClose,
  summary,
  onWithdraw,
}: SPayWithdrawModalProps) {
  const { withdrawableBalance, destinationAccounts } = summary;

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    destinationAccounts[0]?.id || ""
  );
  const [rawAmount, setRawAmount] = useState<string>("");
  const [simulationResult, setSimulationResult] = useState<SPaySimulationResult>("SUCCESS");
  const [notes, setNotes] = useState<string>("");

  // Process / Result state
  const [step, setStep] = useState<"FORM" | "PROCESSING" | "RESULT">("FORM");
  const [processStatus, setProcessStatus] = useState<"REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED">("REQUESTED");
  const [lastResult, setLastResult] = useState<SPayWithdrawResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAmount = parseInt(rawAmount.replace(/\D/g, "") || "0", 10);

  const handleQuickAmount = (val: number) => {
    setRawAmount(val.toString());
    setErrorMessage(null);
  };

  const handleAllAmount = () => {
    setRawAmount(withdrawableBalance.toString());
    setErrorMessage(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setRawAmount(val);
    setErrorMessage(null);
  };

  const handleStartSimulation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend Validations
    if (!numericAmount || numericAmount <= 0) {
      setErrorMessage("Nominal penarikan wajib diisi dan harus lebih besar dari Rp 0.");
      return;
    }

    if (numericAmount > withdrawableBalance) {
      setErrorMessage(
        `Nominal penarikan melebihi saldo yang dapat dicairkan (Maksimal Rp ${withdrawableBalance.toLocaleString("id-ID")}).`
      );
      return;
    }

    if (!selectedAccountId) {
      setErrorMessage("Pilih rekening bank tujuan pencairan.");
      return;
    }

    setErrorMessage(null);
    setStep("PROCESSING");
    setProcessStatus("REQUESTED");

    // Realistic UI simulation progression
    setTimeout(() => {
      setProcessStatus("PROCESSING");
    }, 400);

    const result = await onWithdraw({
      amount: numericAmount,
      destinationAccountId: selectedAccountId,
      notes,
      simulationResult,
    });

    setLastResult(result);
    setProcessStatus(result.status);
    setStep("RESULT");
  };

  const handleResetAndClose = () => {
    setStep("FORM");
    setRawAmount("");
    setLastResult(null);
    setErrorMessage(null);
    onClose();
  };

  const selectedBank: SPayBankAccount | undefined =
    destinationAccounts.find((b) => b.id === selectedAccountId) || destinationAccounts[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0F4C81] to-[#0B3860] text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 mb-1">
              <Sparkle size={13} weight="fill" />
              <span>Simulasi Frontend Demo</span>
            </div>
            <h2 className="text-xl font-bold font-display">Tarik Dana S-Pay</h2>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            aria-label="Tutup form"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* STEP 1: FORM PENGISIAN */}
        {step === "FORM" && (
          <form onSubmit={handleStartSimulation} className="p-5 sm:p-6 space-y-5">
            {/* Disclaimer Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
              <Info size={18} weight="bold" className="shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Mode Simulasi Finansial Terbatas</p>
                <p className="text-amber-800 leading-relaxed text-[11px] mt-0.5">
                  Semua proses dilakukan di frontend. <strong>Tidak ada API request nyata ataupun pemindahan uang riil.</strong> S-Pay terisolasi dari rekening bank sebenarnya.
                </p>
              </div>
            </div>

            {/* Saldo Reference */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Saldo Dapat Dicairkan:</span>
              <span className="text-lg font-bold font-display text-emerald-700">
                Rp {withdrawableBalance.toLocaleString("id-ID")}
              </span>
            </div>

            {/* Rekening Tujuan Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pilih Rekening Bank Tujuan
              </label>

              <div className="space-y-2">
                {destinationAccounts.map((acc) => {
                  const isChecked = selectedAccountId === acc.id;
                  return (
                    <label
                      key={acc.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "border-[#0F4C81] bg-sky-50/50 ring-2 ring-[#0F4C81]/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="destinationAccount"
                          value={acc.id}
                          checked={isChecked}
                          onChange={() => setSelectedAccountId(acc.id)}
                          className="w-4 h-4 text-[#0F4C81] focus:ring-[#0F4C81] cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{acc.bankName}</span>
                            {acc.isPrimary && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                                Utama
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500">
                            {acc.accountNumber} • an. {acc.accountHolder}
                          </p>
                        </div>
                      </div>
                      <Bank size={20} className={isChecked ? "text-[#0F4C81]" : "text-slate-400"} />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Input Nominal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nominal Penarikan
                </label>
                <button
                  type="button"
                  onClick={handleAllAmount}
                  className="text-xs font-bold text-[#0F4C81] hover:underline"
                >
                  Tarik Semua
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  Rp
                </div>
                <input
                  type="text"
                  value={numericAmount > 0 ? numericAmount.toLocaleString("id-ID") : ""}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-slate-900 font-display font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/30 focus:border-[#0F4C81]"
                />
              </div>

              {/* Quick Select Chips */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {[50000, 100000, 250000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    disabled={val > withdrawableBalance}
                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    +Rp {(val / 1000).toLocaleString("id-ID")}rb
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Scenario Switcher (For UI Testing) */}
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Skenario Pengujian UI:</span>
                <span className="text-[11px] text-slate-500">Pilih hasil simulasi</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimulationResult("SUCCESS")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    simulationResult === "SUCCESS"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <CheckCircle size={15} weight="bold" />
                  <span>Simulasi Berhasil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSimulationResult("FAIL")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    simulationResult === "FAIL"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <WarningCircle size={15} weight="bold" />
                  <span>Simulasi Gagal</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} weight="fill" className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cost Summary Breakdown */}
            <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Estimasi Biaya Kliring BI-FAST:</span>
                <span className="font-bold text-emerald-600">Gratis (Rp 0)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>Total Dana Diterima:</span>
                <span>Rp {numericAmount.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-1/3 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={numericAmount <= 0 || numericAmount > withdrawableBalance}
                className="w-2/3 py-3 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 active:scale-[0.98] text-white text-xs font-bold transition shadow-md disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <span>Konfirmasi Tarik Dana</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: PROCESSING SIMULATION */}
        {step === "PROCESSING" && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto border border-sky-100 shadow-sm animate-pulse">
              <CircleNotch size={32} className="animate-spin text-[#0F4C81]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold font-display text-slate-900">
                Memproses Simulasi Pencairan...
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Menghubungkan ke simulasi jaringan kliring perbankan dan memverifikasi ketersediaan saldo.
              </p>
            </div>

            {/* Stepper Status Indicators */}
            <div className="max-w-xs mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Status Gateway:</span>
                <span className="font-mono font-bold text-[#0F4C81] bg-sky-100 px-2 py-0.5 rounded-full text-[10px]">
                  {processStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Nominal:</span>
                <span className="font-bold text-slate-900">
                  Rp {numericAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Rekening Tujuan:</span>
                <span className="font-mono text-[11px] text-slate-700">
                  {selectedBank?.bankName} ({selectedBank?.accountNumber})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULT STATE */}
        {step === "RESULT" && lastResult && (
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${
                lastResult.success
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-rose-50 text-rose-600 border border-rose-200"
              }`}
            >
              {lastResult.success ? (
                <CheckCircle size={36} weight="fill" />
              ) : (
                <WarningCircle size={36} weight="fill" />
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-slate-900">
                {lastResult.success
                  ? "Simulasi Pencairan Berhasil!"
                  : "Simulasi Pencairan Gagal"}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                {lastResult.message}
              </p>
            </div>

            {/* Transaction Receipt Details */}
            {lastResult.transaction && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 text-left">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Nomor Referensi:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {lastResult.transaction.referenceNo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nominal:</span>
                  <span className="font-bold text-slate-900">
                    Rp {lastResult.transaction.amount.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Waktu Simulasi:</span>
                  <span className="text-slate-700">{lastResult.transaction.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status Transaksi:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lastResult.success
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {lastResult.status}
                  </span>
                </div>
              </div>
            )}

            {/* Mandatory Explicit Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium">
              Simulasi pencairan selesai. Tidak ada dana nyata yang ditransfer.
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-3.5 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs transition shadow-md"
            >
              Selesai &amp; Kembali ke Halaman S-Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
