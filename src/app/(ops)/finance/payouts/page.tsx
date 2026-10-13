"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CurrencyCircleDollar,
  Bank,
  CheckCircle,
  WarningCircle,
  ShieldWarning,
  Clock,
  ArrowRight,
  MagnifyingGlass,
  Check,
  X,
  LockKey,
  ShieldCheck,
  Storefront,
  BuildingOffice,
  FileText,
} from "@phosphor-icons/react";
import { useFinanceOperations, VendorPayout } from "@/features/finance/useFinanceOperations";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { payoutHoldSchema, PayoutHoldFormValues } from "@/lib/validation/schemas";

export default function VendorPayoutOperationsPage() {
  const {
    payouts,
    batchReleasePayouts,
    releaseIndividualPayout,
    holdPayoutFraud,
  } = useFinanceOperations();

  const { getParam, setParam } = useUrlQueryState();
  const searchQuery = getParam("q", "");
  const statusFilter = getParam("status", "ALL");

  const [selectedPayout, setSelectedPayout] = useState<VendorPayout | null>(null);
  const [modalType, setModalType] = useState<"HOLD_FRAUD" | "CONFIRM_BATCH" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // RHF + Zod for Payout Hold Fraud Form (ROOT-04)
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayoutHoldFormValues>({
    resolver: zodResolver(payoutHoldSchema),
    defaultValues: {
      holdReason: "",
      riskScore: "HIGH",
      confirmHold: false,
    },
  });

  const readyBatchPayouts = payouts.filter((p) => p.status === "READY_BATCH");
  const totalBatchAmount = readyBatchPayouts.reduce((sum, p) => sum + p.payoutAmount, 0);

  const handleOpenHoldModal = (p: VendorPayout) => {
    setSelectedPayout(p);
    setValue("holdReason", "Lonjakan klaim sengketa di luar batas toleransi QA operasional.");
    setValue("riskScore", p.riskScore || "HIGH");
    setValue("confirmHold", false);
    setModalType("HOLD_FRAUD");
  };

  const onHoldSubmit = (data: PayoutHoldFormValues) => {
    if (!selectedPayout) return;

    holdPayoutFraud(selectedPayout.id, data.holdReason);
    setToastMessage(
      `Pencairan dana untuk ${selectedPayout.vendorName} resmi DITAHAN untuk penyelidikan audit fraud.`
    );
    setSelectedPayout(null);
    setModalType(null);
    reset();
  };

  const handleBatchRelease = () => {
    setIsProcessing(true);
    setTimeout(() => {
      batchReleasePayouts();
      setIsProcessing(false);
      setModalType(null);
      setToastMessage(
        `Batch pencairan dana sukses dikirim ke sistem kliring BI-FAST untuk ${readyBatchPayouts.length} mitra total Rp ${totalBatchAmount.toLocaleString(
          "id-ID"
        )}.`
      );
    }, 600);
  };

  const handleSingleRelease = (payoutId: string, name: string) => {
    releaseIndividualPayout(payoutId);
    setToastMessage(`Pencairan dana ${name} telah berhasil ditransfer secara individual.`);
  };

  const filteredPayouts = useMemo(() => {
    return payouts.filter((p) => {
      const matchesSearch =
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bankAccountNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.accountHolder.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

      return true;
    });
  }, [payouts, searchQuery, statusFilter]);

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
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            Vendor Settlement & Payout Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Pencairan Dana Mitra & Merchant (Payout)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit saldo neto mitra, lakukan batch transfer otomatis via gateway perbankan, atau tahan pencairan dana bagi vendor berisiko fraud tinggi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant="primary"
            disabled={readyBatchPayouts.length === 0}
            onClick={() => setModalType("CONFIRM_BATCH")}
            className="flex items-center gap-2 shadow-sm text-xs font-bold"
          >
            <Bank size={18} weight="bold" />
            <span>Eksekusi Batch ({readyBatchPayouts.length} Mitra)</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar (Sync with URL ROOT-06) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Cari ID payout, nama mitra/merchant, rekening, bank..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "READY_BATCH", label: "Siap Batch" },
              { id: "RELEASED", label: "Ditransfer" },
              { id: "HELD_FRAUD_CHECK", label: "Tertahan Fraud" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setParam("status", st.id === "ALL" ? null : st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      {filteredPayouts.length === 0 ? (
        <EmptyState
          icon={Bank}
          title={searchQuery || statusFilter !== "ALL" ? "Tidak Ada Payout yang Cocok" : "Antrean Payout Kosong"}
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ditemukan data pencairan dana mitra yang sesuai dengan filter pencarian Anda."
              : "Saat ini seluruh saldo mitra telah bersih ditransfer atau tidak ada pengajuan pencairan."
          }
          action={
            searchQuery || statusFilter !== "ALL" ? (
              <Button size="sm" variant="outline" onClick={() => { setParam("q", null); setParam("status", null); }}>
                Reset Filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">ID / Vendor</th>
                  <th className="py-3.5 px-4">Rekening Tujuan</th>
                  <th className="py-3.5 px-4 text-center">Pesanan</th>
                  <th className="py-3.5 px-4 text-center">Skor Risiko</th>
                  <th className="py-3.5 px-4 text-right">Jumlah Payout</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((p) => {
                  const isReady = p.status === "READY_BATCH";
                  const isReleased = p.status === "RELEASED";
                  const isHeld = p.status === "HELD_FRAUD_CHECK";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{p.id}</div>
                        <div className="font-bold text-slate-800 text-xs mt-0.5">{p.vendorName}</div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {p.vendorType === "SERVICE_PROVIDER" ? "Mitra Jasa" : "Merchant Produk"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{p.bankName}</div>
                        <div className="font-mono text-slate-600 text-xs">{p.bankAccountNo}</div>
                        <div className="text-[10px] text-slate-400">a.n. {p.accountHolder}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-800">
                        {p.totalOrders}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.riskScore === "LOW"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.riskScore === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                          }`}
                        >
                          {p.riskScore} RISK
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0F4C81]">
                        Rp {p.payoutAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <Clock size={12} />
                            Siap Batch
                          </span>
                        ) : isReleased ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} weight="fill" />
                            Ditransfer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ShieldWarning size={12} weight="fill" />
                            Tertahan Fraud
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isReady && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSingleRelease(p.id, p.vendorName)}
                              className="text-[11px]"
                            >
                              Transfer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenHoldModal(p)}
                              className="border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px]"
                            >
                              Tahan
                            </Button>
                          </div>
                        )}
                        {isHeld && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSingleRelease(p.id, p.vendorName)}
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-[11px]"
                          >
                            Lepas & Transfer
                          </Button>
                        )}
                        {isReleased && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {p.releasedAt || "Berhasil"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BATCH CONFIRM MODAL (ROOT-08) */}
      <Modal
        isOpen={modalType === "CONFIRM_BATCH"}
        onClose={() => setModalType(null)}
        title="Konfirmasi Batch Transfer Payout"
        description="Pencairan massal untuk seluruh mitra yang telah siap di antrean."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Mitra Penerima:</span>
              <span className="font-bold text-slate-900">{readyBatchPayouts.length} Vendor</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Nilai Pencairan:</span>
              <span className="font-mono font-bold text-base text-[#0F4C81]">
                Rp {totalBatchAmount.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jalur Kliring:</span>
              <span className="font-mono font-semibold text-teal-700">BI-FAST / Virtual Disbursement</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pastikan saldo rekening kustodian penampung mencukupi sebelum mengonfirmasi instruksi pencairan massal ini.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalType(null)}>
              Batal
            </Button>
            <Button variant="primary" isLoading={isProcessing} onClick={handleBatchRelease}>
              Konfirmasi Batch Transfer
            </Button>
          </div>
        </div>
      </Modal>

      {/* HOLD FRAUD MODAL (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={modalType === "HOLD_FRAUD" && !!selectedPayout}
        onClose={() => { setSelectedPayout(null); setModalType(null); }}
        title="Tahan Pencairan Saldo (Audit Fraud Risk)"
        description={`Mitra: ${selectedPayout?.vendorName || ""}`}
        maxWidth="md"
      >
        {selectedPayout && (
          <form onSubmit={handleSubmit(onHoldSubmit)} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Tertahan:</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  Rp {selectedPayout.payoutAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rekening Tujuan:</span>
                <span className="font-mono text-slate-800">
                  {selectedPayout.bankName} - {selectedPayout.bankAccountNo}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Alasan Penahanan Audit Fraud <span className="text-rose-500">*</span>
              </label>
              <textarea
                {...register("holdReason")}
                rows={3}
                placeholder="Jelaskan indikasi fraud, lonjakan komplain pelanggan, atau pembatalan janggal..."
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              />
              {errors.holdReason && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.holdReason.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                {...register("confirmHold")}
                className="w-4 h-4 rounded text-rose-600 accent-rose-600"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Saya mengonfirmasi penahanan saldo mitra ini untuk investigasi lanjutan.
              </span>
            </label>
            {errors.confirmHold && (
              <p className="text-[11px] text-rose-500">{errors.confirmHold.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setSelectedPayout(null); setModalType(null); }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="outline"
                isLoading={isSubmitting}
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                Kunci Saldo & Tahan Payout
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
