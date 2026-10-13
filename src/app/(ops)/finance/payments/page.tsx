"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
} from "@phosphor-icons/react";
import { useFinanceOperations, GatewayTransaction } from "@/features/finance/useFinanceOperations";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import {
  paymentVerificationSchema,
  PaymentVerificationFormValues,
} from "@/lib/validation/schemas";

export default function PaymentGatewayOperationsPage() {
  const { transactions, forceVerifyWebhook } = useFinanceOperations();
  const { getParam, setParam } = useUrlQueryState();

  const searchQuery = getParam("q", "");
  const statusFilter = getParam("status", "ALL");

  const [selectedTrx, setSelectedTrx] = useState<GatewayTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // RHF + Zod for Emergency Payment Verification (ROOT-04)
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentVerificationFormValues>({
    resolver: zodResolver(paymentVerificationSchema),
    defaultValues: {
      gatewayRef: "",
      notes: "Verifikasi manual rekonsiliasi rekening koran bank.",
      confirmSettled: false,
    },
  });

  const handleOpenVerifyModal = (trx: GatewayTransaction) => {
    setSelectedTrx(trx);
    setValue("gatewayRef", trx.gatewayRef || "REF-MANUAL");
    setValue("notes", "Verifikasi mutasi rekening koran bank berhasil dicocokkan.");
    setValue("confirmSettled", false);
  };

  const onVerifySubmit = (data: PaymentVerificationFormValues) => {
    if (!selectedTrx) return;

    forceVerifyWebhook(selectedTrx.id, `Manual Finance Lead (${data.notes})`);
    setToastMessage(
      `Pembayaran ${selectedTrx.id} berhasil diverifikasi manual! Dana escrow resmi terkunci dan order diproses.`
    );
    setSelectedTrx(null);
    reset();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.gatewayRef.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;

      return true;
    });
  }, [transactions, searchQuery, statusFilter]);

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
            Payment Gateway Ingestion Log
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Log Transaksi Pembayaran Gateway
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit rincian komisi platform (10%) vs hak vendor/mitra, status mutasi gateway pihak ketiga, dan eksekusi bypass webhook manual darurat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {transactions.length} Mutasi Gateway
          </span>
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
              placeholder="Cari ID transaksi, order (ORD-...), customer, vendor, atau ref gateway..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "SETTLED", label: "Settled / Berhasil" },
              { id: "PENDING_WEBHOOK", label: "Menunggu Webhook" },
              { id: "FAILED", label: "Gagal / Expired" },
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

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Bank}
          title={searchQuery || statusFilter !== "ALL" ? "Tidak Ada Transaksi yang Cocok" : "Belum Ada Transaksi"}
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ditemukan transaksi pembayaran yang sesuai dengan filter pencarian Anda."
              : "Belum ada transaksi pembayaran gateway yang terekam di sistem."
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
                  <th className="py-3.5 px-4">ID Transaksi / Order</th>
                  <th className="py-3.5 px-4">Pembayar & Vendor</th>
                  <th className="py-3.5 px-4">Metode / Gateway</th>
                  <th className="py-3.5 px-4 text-right">Gross (Pelanggan)</th>
                  <th className="py-3.5 px-4 text-right">Fee Servio (10%)</th>
                  <th className="py-3.5 px-4 text-right">Net Vendor</th>
                  <th className="py-3.5 px-4 text-center">Status Webhook</th>
                  <th className="py-3.5 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => {
                  const isSettled = t.status === "SETTLED";
                  const isPending = t.status === "PENDING_WEBHOOK";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{t.id}</div>
                        <div className="text-[11px] font-mono text-slate-400">{t.orderId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{t.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>→</span>
                          <span>{t.vendorName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{t.paymentMethod.replace(/_/g, " ")}</div>
                        <div className="font-mono text-[10px] text-slate-400">{t.gatewayRef}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        Rp {t.grossAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-semibold">
                        +Rp {t.platformFeeAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F4C81]">
                        Rp {t.vendorNetAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={12} weight="fill" />
                            Settled
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} />
                            Pending Webhook
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Failed
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isPending ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenVerifyModal(t)}
                            className="border-amber-300 text-amber-900 hover:bg-amber-50 text-[11px]"
                          >
                            Verifikasi Manual
                          </Button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {t.manualVerifiedBy ? "Manual Verified" : "Auto Verified"}
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

      {/* ACCESSIBLE VERIFY MODAL (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={!!selectedTrx}
        onClose={() => setSelectedTrx(null)}
        title="Verifikasi Pembayaran Manual Darurat"
        description="Tindakan ini melewati webhook gateway jika server gateway gagal memanggil endpoint Servio."
        maxWidth="md"
      >
        {selectedTrx && (
          <form onSubmit={handleSubmit(onVerifySubmit)} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Transaksi:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTrx.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Terkait:</span>
                <span className="font-bold text-slate-900">{selectedTrx.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan Pembayar:</span>
                <span className="font-bold text-slate-900">{selectedTrx.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Bruto:</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {selectedTrx.grossAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nomor Referensi Bank / Gateway <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("gatewayRef")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800"
              />
              {errors.gatewayRef && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.gatewayRef.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Catatan Verifikasi Manual <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("notes")}
                placeholder="Contoh: Cocok dengan mutasi rekening koran BCA pukul 11:25"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
              {errors.notes && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.notes.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                {...register("confirmSettled")}
                className="w-4 h-4 rounded text-primary accent-primary"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Saya mengonfirmasi mutasi dana telah masuk ke rekening escrow Servio.
              </span>
            </label>
            {errors.confirmSettled && (
              <p className="text-[11px] text-rose-500">{errors.confirmSettled.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="ghost" onClick={() => setSelectedTrx(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Konfirmasi Manual Settlement
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
