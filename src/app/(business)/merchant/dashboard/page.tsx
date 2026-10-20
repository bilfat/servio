"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Storefront,
  CurrencyCircleDollar,
  ClipboardText,
  Package,
  Star,
  Warning,
  ArrowRight,
  CheckCircle,
  Truck,
  ArrowUpRight,
  Clock,
  Sparkle,
  SlidersHorizontal,
  Handshake,
} from "@phosphor-icons/react";
import { useMerchantOperations, MerchantStoreStatus } from "@/features/merchant/useMerchantOperations";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toast } from "@/components/feedback/Toast";
import { SPayBalanceCard } from "@/components/features/spay/SPayBalanceCard";
import { useSPay } from "@/features/spay/spay.frontend-provider";

export default function MerchantDashboardPage() {
  const { summary: spaySummary, isBalanceVisible, toggleBalanceVisibility } = useSPay();
  const {
    storeStatus,
    updateStoreStatus,
    products,
    orders,
    updateOrderStatus,
    stocks,
    fulfillments,
  } = useMerchantOperations();

  const repo = useDomainRepository();
  const pendingPartnershipRequests = repo.getMerchantPartnershipRequests("merch-01");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Computed metrics
  const newOrders = orders.filter((o) => o.status === "NEW");
  const inProgressOrders = orders.filter((o) =>
    ["CONFIRMED", "PICKING", "PACKED"].includes(o.status)
  );
  const activeProducts = products.filter((p) => p.status === "ACTIVE");
  const lowStockItems = stocks.filter((s) => s.available <= s.minStockAlert);
  const pendingFulfillments = fulfillments.filter((f) =>
    ["PENDING_PICK", "PICKING"].includes(f.status)
  );

  // Status badge config
  const statusConfig: Record<
    MerchantStoreStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    ONLINE_ACCEPTING: {
      label: "Buka — Menerima Pesanan",
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    BUSY_DELAYED: {
      label: "Sibuk — Antrean Packing",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    TEMPORARY_CLOSED: {
      label: "Tutup Sementara",
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const currentCfg = statusConfig[storeStatus];

  // 7-day sales mock data
  const salesHistory = [
    { day: "Sen", amount: 1450000, height: "45%" },
    { day: "Sel", amount: 2100000, height: "65%" },
    { day: "Rab", amount: 1850000, height: "55%" },
    { day: "Kam", amount: 2750000, height: "85%" },
    { day: "Jum", amount: 2400000, height: "75%" },
    { day: "Sab", amount: 3200000, height: "100%" },
    { day: "Min", amount: 1980000, height: "60%" },
  ];

  const handleQuickConfirm = (orderId: string, orderNumber: string) => {
    updateOrderStatus(orderId, "CONFIRMED");
    setToastMessage(`Pesanan ${orderNumber} berhasil dikonfirmasi dan masuk antrean packing!`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Storefront size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Toko Suku Cadang Sejuk Abadi
                </h1>
                <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                  Merchant ID: #MCH-8821
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Portal Toko Suku Cadang Resmi Servio • Wilayah Jabodetabek
              </p>
            </div>

            {/* Store Status Toggle */}
            <div className="flex items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${currentCfg.bg} ${currentCfg.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentCfg.dot} animate-pulse`} />
                <span>{currentCfg.label}</span>
              </div>
              <select
                value={storeStatus}
                onChange={(e) => {
                  const val = e.target.value as MerchantStoreStatus;
                  updateStoreStatus(val);
                  setToastMessage(`Status operasional toko diubah menjadi: ${statusConfig[val].label}`);
                }}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ONLINE_ACCEPTING">Buka (Normal)</option>
                <option value="BUSY_DELAYED">Mode Sibuk</option>
                <option value="TEMPORARY_CLOSED">Tutup Toko</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Contextual Notification: New Partnership Requests (Phase E Addition) */}
        {pendingPartnershipRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-2xl bg-indigo-50/90 border border-indigo-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
                <Handshake size={22} weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-indigo-950 font-display text-sm sm:text-base">
                    Pengajuan Kerja Sama Baru
                  </h3>
                  <Badge variant="primary" size="sm" className="bg-indigo-600 text-white border-0">
                    {pendingPartnershipRequests.length} Baru
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  <strong>{pendingPartnershipRequests[0].providerName || "Penyedia Jasa"}</strong>
                  {pendingPartnershipRequests.length > 1
                    ? ` dan ${pendingPartnershipRequests.length - 1} mitra lainnya mengajukan kerja sama pengadaan suku cadang resmi dengan toko Anda.`
                    : " mengajukan kerja sama pengadaan suku cadang resmi dengan toko Anda."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/business/merchant/partnerships/requests"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-xs w-full sm:w-auto"
              >
                <span>Lihat Pengajuan</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* S-PAY BALANCE CARD (MERCHANT SETTLEMENT) */}
        <div>
          <SPayBalanceCard
            balance={spaySummary.withdrawableBalance}
            ownerType="MERCHANT"
            organizationName="Toko Suku Cadang Sejuk Abadi"
            subtitle="Settlement Penjualan Suku Cadang"
            detailHref="/merchant/spay"
            isBalanceVisible={isBalanceVisible}
            onToggleVisibility={toggleBalanceVisibility}
          />
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pendapatan Hari Ini</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CurrencyCircleDollar size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-heading">Rp 2.480.000</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1 font-medium">
                <ArrowUpRight size={14} weight="bold" />
                <span>+14.2% vs kemarin</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pesanan Perlu Diproses</span>
              <span className="p-2 rounded-xl bg-blue-50 text-primary">
                <ClipboardText size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {newOrders.length + inProgressOrders.length}{" "}
                <span className="text-sm font-normal text-slate-500">Pesanan</span>
              </div>
              {newOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                  {newOrders.length} Baru
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {inProgressOrders.length} sedang dalam picking & packing
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Produk Aktif</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Package size={20} weight="bold" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {activeProducts.length}{" "}
                <span className="text-sm font-normal text-slate-500">Produk</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Dari total {products.length} produk terdaftar
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Rating & SLA Toko</span>
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Star size={20} weight="fill" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900 font-heading">4.9</div>
              <span className="text-xs font-medium text-emerald-600">SLA 99.2% Tepat Waktu</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">128 Ulasan Pelanggan Terverifikasi</div>
          </motion.div>
        </div>

        {/* Low Stock Urgent Banner if any */}
        {lowStockItems.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
                <Warning size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Peringatan Buffer Stok: {lowStockItems.length} produk di bawah batas aman!
                </h3>
                <p className="text-xs text-slate-600">
                  {lowStockItems.map((i) => `${i.title} (${i.available} ${i.unit})`).join(", ")}
                </p>
              </div>
            </div>
            <Link href="/business/merchant/inventory">
              <Button variant="secondary" size="sm" className="whitespace-nowrap flex items-center gap-1.5">
                <span>Kelola Stok Gudang</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        )}

        {/* Sales Chart & Quick Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Revenue Graph */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Tren Penjualan 7 Hari Terakhir
                </h2>
                <p className="text-xs text-slate-500">Rata-rata pendapatan harian Rp 2.247.000</p>
              </div>
              <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                Minggu Berjalan
              </Badge>
            </div>

            {/* Bar Chart Visualization */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {salesHistory.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                    {(item.amount / 1000).toLocaleString("id-ID")}k
                  </span>
                  <motion.div
                    key={`${item.day}-${item.amount}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: item.height, opacity: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: idx * 0.08 }}
                    className="w-full max-w-[36px] bg-gradient-to-t from-primary to-primary/70 rounded-t-lg group-hover:brightness-110 transition-all cursor-pointer shadow-sm relative"
                  />
                  <span className="text-xs font-medium text-slate-600">{item.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
              <span>Total Minggu Ini: <strong className="text-slate-800 font-mono">Rp 15.730.000</strong></span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Sparkle size={14} weight="fill" />
                Target Mingguan Tercapai 104%
              </span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading mb-1">
                Aksi Cepat Operasional
              </h2>
              <p className="text-xs text-slate-500 mb-4">Navigasi langsung ke antrean operasional</p>

              <div className="space-y-2.5">
                <Link
                  href="/business/merchant/orders"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-primary/40 hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <ClipboardText size={18} weight="bold" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Pesanan Masuk</div>
                      <div className="text-[11px] text-slate-500">{newOrders.length} pesanan baru belum diproses</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/business/merchant/fulfillment"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-primary/40 hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Package size={18} weight="bold" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Pick & Pack Workspace</div>
                      <div className="text-[11px] text-slate-500">{pendingFulfillments.length} item antre dikemas</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/business/merchant/shipping"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-primary/40 hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Truck size={18} weight="bold" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Dispatch Kurir</div>
                      <div className="text-[11px] text-slate-500">Penjemputan ekspedisi AWB</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/business/merchant/settlement"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-primary/40 hover:bg-slate-50/80 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <CurrencyCircleDollar size={18} weight="bold" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Saldo & Settlement</div>
                      <div className="text-[11px] text-slate-500">Pencairan berkala ke rekening</div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3">
              <Link href="/business/merchant/products">
                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5">
                  <SlidersHorizontal size={16} />
                  <span>Katalog Produk ({products.length})</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Pesanan Baru Masuk Perlu Diproses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-primary">
                <ClipboardText size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Pesanan Masuk Perlu Diproses
                </h2>
                <p className="text-xs text-slate-500">
                  Konfirmasi pesanan agar sistem dapat memicu proses alokasi dan pick-pack gudang
                </p>
              </div>
            </div>
            <Link href="/business/merchant/orders">
              <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Lihat Semua Pesanan <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.slice(0, 4).map((order) => {
              const isNew = order.status === "NEW";
              return (
                <div
                  key={order.id}
                  className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {order.customerName}
                      </span>
                      <Badge
                        variant={
                          order.status === "NEW"
                            ? "danger"
                            : order.status === "CONFIRMED"
                            ? "warning"
                            : order.status === "PICKING" || order.status === "PACKED"
                            ? "primary"
                            : order.status === "SHIPPED"
                            ? "neutral"
                            : "success"
                        }
                        size="sm"
                      >
                        {order.status === "NEW"
                          ? "Pesanan Baru"
                          : order.status === "CONFIRMED"
                          ? "Terkonfirmasi"
                          : order.status === "PICKING"
                          ? "Sedang Picking"
                          : order.status === "PACKED"
                          ? "Siap Kirim"
                          : order.status === "SHIPPED"
                          ? "Dalam Pengiriman"
                          : "Selesai"}
                      </Badge>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {order.createdAt}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      {order.items.map((it) => `${it.title} (${it.quantity}x)`).join(", ")}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xl">
                      Tujuan: {order.shippingAddress}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Transaksi</div>
                      <div className="text-sm font-bold text-slate-900 font-mono">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </div>
                    </div>

                    {isNew ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleQuickConfirm(order.id, order.orderNumber)}
                        className="flex items-center gap-1.5"
                      >
                        <CheckCircle size={16} weight="bold" />
                        <span>Konfirmasi Pesanan</span>
                      </Button>
                    ) : (
                      <Link href={`/business/merchant/orders?id=${order.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <span>Detail</span>
                          <ArrowRight size={14} />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
