"use client";

import React, { useState } from "react";
import {
  MagnifyingGlass,
  Funnel,
  Eye,
  X,
  Receipt,
  CheckCircle,
  Clock,
  WarningCircle,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  Bank,
  ArrowsLeftRight,
  Info,
} from "@phosphor-icons/react";
import { FinanceOrderTransaction, OrderType, PaymentStatus } from "@/types/finance";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export interface FinanceTransactionTableProps {
  transactions: FinanceOrderTransaction[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function FinanceTransactionTable({
  transactions,
  title = "Riwayat Transaksi Finansial & Fee Breakdown",
  subtitle = "Audit aliran dana kotor (Gross), biaya aplikasi, potongan komisi, serta hak settlement mitra",
  className = "",
}: FinanceTransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"ALL" | OrderType>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [selectedTx, setSelectedTx] = useState<FinanceOrderTransaction | null>(null);

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      tx.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.partnerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = orderTypeFilter === "ALL" || tx.orderType === orderTypeFilter;
    const matchesStatus = paymentStatusFilter === "ALL" || tx.paymentStatus === paymentStatusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden ${className}`}>
      {/* Header and Filter Controls */}
      <div className="p-6 sm:p-7 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 self-start sm:self-auto">
            {filtered.length} dari {transactions.length} transaksi
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari ID Order, Payment ID, Pelanggan, atau Mitra..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Order Type Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setOrderTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                orderTypeFilter === "ALL"
                  ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua Jenis
            </button>
            <button
              type="button"
              onClick={() => setOrderTypeFilter("PRODUCT")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                orderTypeFilter === "PRODUCT"
                  ? "bg-white text-rose-600 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag size={12} />
              <span>Produk</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderTypeFilter("SERVICE")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                orderTypeFilter === "SERVICE"
                  ? "bg-white text-[#0F4C81] shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Wrench size={12} />
              <span>Jasa</span>
            </button>
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 shrink-0"
          >
            <option value="ALL">Semua Status Bayar</option>
            <option value="PAID">PAID (Berhasil)</option>
            <option value="PENDING">PENDING</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Order & Payment ID</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4">Pihak Terlibat</th>
              <th className="py-3 px-4 text-right">Harga Dasar</th>
              <th className="py-3 px-4 text-right">App Fee</th>
              <th className="py-3 px-4 text-right">Komisi Mitra</th>
              <th className="py-3 px-4 text-right">Total Bayar</th>
              <th className="py-3 px-4 text-center">Status Bayar</th>
              <th className="py-3 px-4 text-center">Status Revenue</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <Receipt size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="font-semibold text-sm">Tidak ada transaksi yang cocok</p>
                  <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter status.</p>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Order & Payment ID */}
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900 block group-hover:text-[#0F4C81] transition-colors">
                      {tx.orderId}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                      {tx.paymentId}
                    </span>
                  </td>

                  {/* Jenis Order */}
                  <td className="py-3 px-4">
                    {tx.orderType === "PRODUCT" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <ShoppingBag size={10} weight="bold" />
                        <span>Produk</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                        <Wrench size={10} weight="bold" />
                        <span>Jasa</span>
                      </span>
                    )}
                  </td>

                  {/* Pihak Terlibat */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
                      {tx.customerName}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                      {tx.partnerName}
                    </span>
                  </td>

                  {/* Harga Dasar */}
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    Rp {tx.basePrice.toLocaleString("id-ID")}
                  </td>

                  {/* App Fee */}
                  <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F4C81]">
                    +Rp {tx.customerAppFee.toLocaleString("id-ID")}
                  </td>

                  {/* Komisi Mitra */}
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                    +Rp {tx.partnerCommissionAmount.toLocaleString("id-ID")}
                  </td>

                  {/* Total Bayar */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    Rp {tx.grossAmount.toLocaleString("id-ID")}
                  </td>

                  {/* Status Bayar */}
                  <td className="py-3 px-4 text-center">
                    {tx.paymentStatus === "PAID" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={10} weight="fill" />
                        <span>PAID</span>
                      </span>
                    ) : tx.paymentStatus === "PENDING" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={10} weight="bold" />
                        <span>PENDING</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <WarningCircle size={10} weight="bold" />
                        <span>{tx.paymentStatus}</span>
                      </span>
                    )}
                  </td>

                  {/* Status Revenue */}
                  <td className="py-3 px-4 text-center">
                    {tx.revenueStatus === "RECOGNIZED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#0F4C81] border border-sky-200">
                        Diakui
                      </span>
                    ) : tx.revenueStatus === "PENDING_COMPLETION" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Escrow
                      </span>
                    ) : tx.revenueStatus === "REVERSED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Reversed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                        —
                      </span>
                    )}
                  </td>

                  {/* Aksi */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#0F4C81] hover:bg-slate-100 transition"
                      title="Lihat Detail Transaksi"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Modal / Drawer */}
      {selectedTx && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedTx(null)}
          title="Detail Rincian Transaksi & Aliran Dana"
          size="lg"
        >
          <div className="space-y-6 text-xs text-left">
            {/* Header IDs */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Nomor Referensi Transaksi
                </span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {selectedTx.orderId}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  ID Pembayaran: {selectedTx.paymentId}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedTx.paymentStatus}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                  {selectedTx.orderType === "PRODUCT" ? "Pesanan Suku Cadang" : "Pemesanan Jasa"}
                </span>
              </div>
            </div>

            {/* Pihak Terlibat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-slate-400 font-semibold block text-[11px]">Pelanggan (Customer):</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">{selectedTx.customerName}</span>
                <span className="text-slate-500 text-[11px]">Metode: {selectedTx.paymentMethod}</span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-slate-400 font-semibold block text-[11px]">Mitra Penyedia:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">{selectedTx.partnerName}</span>
                <span className="text-slate-500 text-[11px]">ID Organisasi: {selectedTx.partnerOrgId}</span>
              </div>
            </div>

            {/* Financial Waterfall Breakdown */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Receipt size={14} />
                <span>Kalkulasi Aliran Dana (Financial Waterfall)</span>
              </h4>

              <div className="space-y-2 text-xs divide-y divide-slate-200/70">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600">Harga Dasar (Base Price):</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rp {selectedTx.basePrice.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-600">
                    <span className="font-semibold text-[#0F4C81]">Biaya Aplikasi Customer:</span>
                    <span className="block text-[10px] text-slate-400">
                      Model C Stream {selectedTx.orderType === "PRODUCT" ? "1 (Produk)" : "2 (Jasa)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#0F4C81]">
                    +Rp {selectedTx.customerAppFee.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 font-bold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                  <span>Total Ditagihkan ke Pelanggan (Gross):</span>
                  <span className="font-mono text-sm text-[#0F4C81]">
                    Rp {selectedTx.grossAmount.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-600">
                    <span className="font-semibold text-emerald-700">Potongan Komisi Mitra (SERVIO):</span>
                    <span className="block text-[10px] text-slate-400">
                      Tarif {(selectedTx.partnerCommissionRate * 100).toFixed(0)}% dari harga dasar • Model C Stream {selectedTx.orderType === "PRODUCT" ? "3 (Merchant)" : "4 (Provider)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700">
                    -Rp {selectedTx.partnerCommissionAmount.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 font-bold text-slate-900 bg-purple-50/70 p-2 rounded-lg border border-purple-200">
                  <div className="text-purple-900">
                    <span>Hak Bersih Settlement Mitra:</span>
                    <span className="block text-[10px] font-normal text-purple-700">
                      (Harga dasar dikurangi komisi platform)
                    </span>
                  </div>
                  <span className="font-mono text-sm text-purple-900">
                    Rp {selectedTx.partnerSettlementAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue Recognition Status Note */}
            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex items-start gap-2.5">
              <Info size={18} weight="bold" className="text-[#0F4C81] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Status Pengakuan Pendapatan: </span>
                {selectedTx.revenueStatus === "RECOGNIZED" ? (
                  <span>
                    Pendapatan telah diakui ke dalam Platform Revenue (Total Rp{" "}
                    {(selectedTx.customerAppFee + selectedTx.partnerCommissionAmount).toLocaleString("id-ID")})
                    karena order telah diselesaikan.
                  </span>
                ) : selectedTx.revenueStatus === "PENDING_COMPLETION" ? (
                  <span>
                    Dana masih ditampung di Escrow. Pembayaran status PAID tidak otomatis dihitung sebagai pendapatan sampai order selesai.
                  </span>
                ) : (
                  <span>
                    Pendapatan dibatalkan / reversed karena pembatalan pemesanan atau pengembalian dana (refund).
                  </span>
                )}
              </div>
            </div>

            {/* Notes if any */}
            {selectedTx.notes && (
              <div className="text-slate-500 text-[11px] italic">
                Catatan Transaksi: &quot;{selectedTx.notes}&quot;
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
