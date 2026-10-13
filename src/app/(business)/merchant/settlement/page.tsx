"use client";

import React, { useState, Suspense } from "react";
import {
  Bank,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  Eye,
  CreditCard,
  ShieldCheck,
  DownloadSimple,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import { MerchantSettlement, MerchantSettlementStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";

function MerchantSettlementContent() {
  const { settlements } = useMerchantOperations();

  const [selectedSettlement, setSelectedSettlement] = useState<MerchantSettlement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Totals
  const totalSettled = settlements
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.netAmount, 0);

  const pendingSettlement = settlements
    .filter((s) => s.status === "PROCESSING" || s.status === "PENDING")
    .reduce((sum, s) => sum + s.netAmount, 0);

  const getSettlementBadge = (status: MerchantSettlementStatus) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success" size="sm">Tercairkan (Selesai)</Badge>;
      case "PROCESSING":
        return <Badge variant="warning" size="sm">Sedang Diproses Bank</Badge>;
      case "PENDING":
        return <Badge variant="neutral" size="sm">Siklus Berjalan</Badge>;
      case "ON_HOLD":
        return <Badge variant="danger" size="sm">Ditahan (Audit)</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const handleRequestEarlyPayout = () => {
    setToastMessage("Pengajuan pencairan dana lebih awal (Instant Payout) berhasil diajukan ke Finance!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Bank size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Pencairan Saldo & Settlement Toko
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Laporan siklus penyelesaian dana penjualan, pemotongan komisi platform, dan mutasi transfer bank
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleRequestEarlyPayout}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <CurrencyCircleDollar size={18} weight="bold" />
              <span>Tarik Saldo Instan</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Financial Balance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <span className="text-xs text-emerald-100 font-medium block">
              Total Dana Sukses Dicairkan
            </span>
            <div className="text-2xl font-bold font-mono mt-1">
              Rp {totalSettled.toLocaleString("id-ID")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-200 mt-2">
              <CheckCircle size={14} weight="fill" />
              <span>Ditransfer otomatis setiap hari Selasa</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <span className="text-xs text-slate-500 font-medium block">
              Saldo Berjalan & Menunggu Transfer
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              Rp {pendingSettlement.toLocaleString("id-ID")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-2">
              <Clock size={14} weight="bold" />
              <span>Siklus penutupan buku berikutnya: 28 Sep 2026</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Rekening Penampungan Terdaftar</span>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard size={20} className="text-primary" />
                <span className="font-mono font-bold text-slate-900 text-base">
                  BCA •••• 8821
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                a.n. Toko Suku Cadang Sejuk Abadi
              </div>
            </div>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-2">
              <ShieldCheck size={14} weight="fill" />
              <span>Rekening bank telah diverifikasi KYC</span>
            </div>
          </div>
        </div>

        {/* Settlement Cycle History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Riwayat Siklus Settlement Mingguan
            </h2>
            <span className="text-xs text-slate-400">Komisi platform 5% dari penjualan kotor</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Siklus / Periode</th>
                  <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-right">Penjualan Kotor</th>
                  <th className="py-3 px-4 text-right">Fee Servio (5%)</th>
                  <th className="py-3 px-4 text-right">Transfer Bersih (Net)</th>
                  <th className="py-3 px-4 text-center">Status Pencairan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {settlements.map((set) => (
                  <tr
                    key={set.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {set.cycleNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {set.periodStart} – {set.periodEnd}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {set.transactionCount} Pesanan
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                      Rp {set.grossSales.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-rose-600 whitespace-nowrap">
                      - Rp {set.platformDeduction.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      Rp {set.netAmount.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getSettlementBadge(set.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSettlement(set)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Eye size={14} />
                        <span>Rincian</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Settlement Detail Modal */}
      {selectedSettlement && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSettlement(null)}
          title={`Rincian Settlement: ${selectedSettlement.cycleNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedSettlement.cycleNumber}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Periode: {selectedSettlement.periodStart} – {selectedSettlement.periodEnd}
                </div>
              </div>
              <div>{getSettlementBadge(selectedSettlement.status)}</div>
            </div>

            {/* Rekening Tujuan */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Rekening Pencairan Bank:
              </span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {selectedSettlement.bankName} {selectedSettlement.bankAccountMasked}
              </div>
              <div className="text-slate-600">{selectedSettlement.bankHolder}</div>
              {selectedSettlement.payoutDate && (
                <div className="text-emerald-700 text-[10px] font-medium mt-1">
                  Ditransfer pada: {selectedSettlement.payoutDate}
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Total Penjualan Kotor (Gross):</span>
                <span>Rp {selectedSettlement.grossSales.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Potongan Biaya Layanan Servio (5%):</span>
                <span>- Rp {selectedSettlement.platformDeduction.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 text-sm">
                <span>Transfer Bersih (Net Payout):</span>
                <span className="text-emerald-700">
                  Rp {selectedSettlement.netAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Individual Transactions in this cycle */}
            {selectedSettlement.transactions.length > 0 && (
              <div>
                <span className="font-semibold text-slate-800 block mb-2">
                  Daftar Transaksi Pesanan dalam Siklus:
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden font-mono text-[11px]">
                  {selectedSettlement.transactions.map((t) => (
                    <div key={t.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800">{t.orderNumber}</span>
                        <span className="text-slate-400 ml-2">{t.date}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          Rp {t.netPayout.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Kotor: Rp {t.grossAmount.toLocaleString("id-ID")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setToastMessage("Laporan settlement CSV berhasil diunduh!");
                }}
                className="flex items-center gap-1.5"
              >
                <DownloadSimple size={14} />
                <span>Unduh CSV</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedSettlement(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function MerchantSettlementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Laporan Settlement...</div>}>
      <MerchantSettlementContent />
    </Suspense>
  );
}
