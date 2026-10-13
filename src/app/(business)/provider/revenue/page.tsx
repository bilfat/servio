"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CurrencyCircleDollar,
  TrendUp,
  Bank,
  Receipt,
  CalendarBlank,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Sparkle,
  Handshake,
  CheckCircle,
  Clock,
  WarningCircle,
  Eye,
  Storefront,
  CaretRight,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/feedback/Toast";
import { getAffiliateStatusBadgeInfo } from "@/lib/policy/affiliatePolicy";
import { AffiliateAttribution, RewardCatalogItem } from "@/types/domain";

export default function ProviderRevenuePage() {
  const repo = useDomainRepository();
  const { affiliateSummary } = useProviderOperations();

  const [periodFilter, setPeriodFilter] = useState<"WEEKLY" | "MONTHLY" | "ALL">("MONTHLY");
  const [selectedReward, setSelectedReward] = useState<AffiliateAttribution | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<RewardCatalogItem | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const availablePoints = repo.getAvailablePointBalance("PROVIDER", "prov-01");
  const redeemedPointsTotal = repo.getRedeemedPointsTotal("PROVIDER", "prov-01");
  const myRedemptions = repo.getRedemptionsByOwner("PROVIDER", "prov-01");
  const rewardCatalog = repo.getRewardCatalog("PROVIDER");

  const handleRedeemConfirm = () => {
    if (!selectedCatalogItem) return;
    setIsRedeeming(true);
    const idempotencyKey = `rdm-prov-${selectedCatalogItem.rewardId}-${Date.now().toString().slice(-4)}`;
    setTimeout(() => {
      const res = repo.redeemReward("PROVIDER", "prov-01", selectedCatalogItem.rewardId, idempotencyKey);
      setIsRedeeming(false);
      setRedeemModalOpen(false);
      setSelectedCatalogItem(null);
      setToastMessage(res.message);
    }, 400);
  };

  const transactions = repo.transactions.filter((t) => t.status === "SETTLED");
  const totalGross = transactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalPlatformFee = transactions.reduce((acc, t) => acc + t.platformFeeAmount, 0);
  const totalNet = transactions.reduce((acc, t) => acc + t.vendorNetAmount, 0);

  return (
    <div className="space-y-6 pb-20 font-body">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Laporan Finansial Provider
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
              Pendapatan &amp; Bagi Hasil
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan pendapatan bruto servis, potongan komisi platform, dan total pendapatan bersih siap cair.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/provider/payouts"
              className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Bank size={16} weight="bold" />
              <span>Kelola Payout</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pendapatan Kotor
            </span>
            <span className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
              <CurrencyCircleDollar size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            Rp {totalGross.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-slate-500">Akumulasi seluruh order jasa selesai</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Biaya Platform (10%)
            </span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Receipt size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-rose-700">
            Rp {totalPlatformFee.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-slate-500">Komisi platform &amp; garansi proteksi</p>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 shadow-xs space-y-1 bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Pendapatan Bersih (Net)
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendUp size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-emerald-700">
            Rp {totalNet.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-emerald-700/80">Hak mitra siap dicairkan ke rekening</p>
        </div>
      </div>

      {/* E10: PROVIDER AFFILIATE REWARD VISIBILITY (Section 14 & 15) */}
      <div className="bg-white rounded-3xl border border-purple-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-purple-100 text-purple-700 shadow-2xs">
              <Sparkle size={24} weight="fill" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-slate-900">
                  Performa Reward Afiliasi Toko Partner
                </h2>
                <Badge variant="secondary" size="sm">
                  Kemitraan Toko
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Reward poin bengkel dari rekomendasi suku cadang resmi melalui jaringan teknisi lapangan Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setRedeemModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-xs"
            >
              <Sparkle size={15} weight="fill" />
              <span>Tukarkan Poin</span>
            </Button>
            <Link
              href="/provider/partnerships"
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 transition"
            >
              <span>Kelola Toko Rekanan</span>
              <CaretRight size={14} weight="bold" />
            </Link>
          </div>
        </div>

        {/* Section 31 & 36: Canonical Reward Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-purple-100/70 border border-purple-300 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
              Saldo Tersedia
            </span>
            <p className="text-xl font-black font-display text-purple-950 mt-0.5 font-mono">
              {availablePoints.toLocaleString("id-ID")} pts
            </p>
            <span className="text-[10px] text-purple-700 block mt-0.5 font-semibold">Siap Ditukarkan</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Tertunda (Pending)
            </span>
            <p className="text-xl font-black font-display text-amber-900 mt-0.5 font-mono">
              +{affiliateSummary.pendingPoints || 320} pts
            </p>
            <span className="text-[10px] text-amber-600 block mt-0.5">Pesanan Berjalan</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total Diperoleh
            </span>
            <p className="text-xl font-black font-display text-emerald-900 mt-0.5 font-mono">
              +{affiliateSummary.confirmedPoints || 930} pts
            </p>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Akumulasi Terbit</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
              Telah Ditukarkan
            </span>
            <p className="text-xl font-black font-display text-indigo-900 mt-0.5 font-mono">
              {redeemedPointsTotal} pts
            </p>
            <span className="text-[10px] text-indigo-600 block mt-0.5">Voucher Digunakan</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Pesanan Teratribusi
            </span>
            <p className="text-xl font-black font-display text-slate-900 mt-0.5 font-mono">
              {affiliateSummary.totalOrders || 18}
            </p>
            <span className="text-[10px] text-slate-500 block mt-0.5">Total Rekomendasi</span>
          </div>
        </div>

        {/* Active Redemptions & Vouchers if any (Section 40) */}
        {myRedemptions.length > 0 && (
          <div className="p-4 bg-gradient-to-r from-purple-50 via-purple-50/50 to-white rounded-2xl border border-purple-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkle size={15} weight="fill" className="text-purple-600" />
                <span>Voucher Reward Aktif Hasil Penukaran ({myRedemptions.length})</span>
              </span>
              <span className="text-[10px] text-purple-700">Tunjukkan kode saat memesan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {myRedemptions.map((redemption) => (
                <div
                  key={redemption.redemptionId}
                  className="p-3 rounded-xl bg-white border border-purple-200 shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{redemption.rewardName}</span>
                    <span className="font-mono text-[11px] font-black text-purple-700 block mt-0.5 tracking-wider">
                      {redemption.voucherCode}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Berlaku s/d {redemption.expiresAt || "60 hari ke depan"}
                    </span>
                  </div>
                  <Badge variant="success" size="sm">AKTIF</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informational Policy & Non-Cash Notice */}
        <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100 flex items-start gap-2.5 text-[11px] text-slate-600">
          <Info size={16} className="text-purple-600 shrink-0 mt-0.5" />
          <div>
            <strong>Otoritatif Kebijakan Platform (Non-Financial Shortcut):</strong> Poin afiliasi kemitraan merupakan program loyalitas dan voucher resmi (Non-Cash Payout). Seluruh mutasi dicatat dalam Point Ledger Servio yang diaudit oleh Finance.
          </div>
        </div>

        {/* Recent Attributed Orders List (Click to open Detail) */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Daftar Transaksi Rekomendasi Suku Cadang Teratribusi:</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {affiliateSummary.attributions.length} Rekomendasi Terdaftar
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {affiliateSummary.attributions.map((attr) => {
              const badge = getAffiliateStatusBadgeInfo(attr.eligibilityStatus);
              return (
                <button
                  key={attr.id}
                  type="button"
                  onClick={() => setSelectedReward(attr)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:border-purple-300 hover:bg-purple-50/20 transition cursor-pointer group"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-purple-900">
                        #{attr.productOrderId}
                      </span>
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium truncate">
                      {attr.productTitle || "Suku Cadang AC"} • <span className="text-slate-500">{attr.merchantName || "Sejuk Sentra Part AC"}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Teknisi: <strong className="text-slate-600">{attr.workerName || "Andi"}</strong> • Service Order: <span className="font-mono text-slate-600 font-semibold">#{attr.serviceOrderId}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-purple-700 text-sm block">
                      +{attr.pointsProvider || 50} pts
                    </span>
                    <span className="text-[10px] text-purple-600 font-bold group-hover:underline block mt-0.5">
                      Rincian &rarr;
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900">
              Rincian Transaksi Pendapatan Servis
            </h2>
            <p className="text-xs text-slate-500">
              Daftar pemasukan dari order servis yang telah diselesaikan teknisi lapangan
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["WEEKLY", "MONTHLY", "ALL"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setPeriodFilter(period)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  periodFilter === period
                    ? "bg-[#0F4C81] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {period === "WEEKLY" ? "Minggu Ini" : period === "MONTHLY" ? "Bulan Ini" : "Semua"}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <div key={t.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 truncate">{t.customerName}</span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                    {t.orderId}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <span>Metode: {t.paymentMethod}</span>
                  <span>•</span>
                  <span>{t.paidAt}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold font-display text-emerald-700 text-sm">
                  + Rp {t.vendorNetAmount.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400">
                  Bruto: Rp {t.grossAmount.toLocaleString("id-ID")} (-Rp {t.platformFeeAmount.toLocaleString("id-ID")})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* E10: PROVIDER REWARD DETAIL MODAL (Section 16) */}
      {selectedReward && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReward(null)}
          title="Rincian Reward Afiliasi Bengkel (Provider)"
        >
          <div className="space-y-4 text-xs font-body text-left">
            {/* Header info */}
            <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-950 text-sm">
                  AFFILIATE REWARD DETAIL
                </span>
                {(() => {
                  const b = getAffiliateStatusBadgeInfo(selectedReward.eligibilityStatus);
                  return (
                    <Badge variant={b.variant} size="sm">
                      {b.label}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-[11px] text-purple-800">
                Atribusi poin resmi dihasilkan dari rekomendasi suku cadang toko rekanan melalui teknisi bengkel Anda.
              </p>
            </div>

            {/* Canonical Attribution Details (Section 16) */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-slate-700">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Product:</span>
                  <span className="font-bold text-slate-900 block truncate">{selectedReward.productTitle || "Capacitor Dual Run 35uF"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Merchant:</span>
                  <span className="font-semibold text-slate-800 block truncate">{selectedReward.merchantName || "Sejuk Sentra Part AC"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Recommended By:</span>
                  <span className="font-semibold text-slate-800 block">{selectedReward.workerName || "Andi"} — Worker</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Service Order:</span>
                  <span className="font-mono font-bold text-primary block">#{selectedReward.serviceOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Product Order:</span>
                  <span className="font-mono font-bold text-slate-900 block">#{selectedReward.productOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Attribution:</span>
                  <span className="font-mono text-slate-600 block text-[10px]">{selectedReward.source}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer Confirmation:</span>
                  <span className="font-semibold text-emerald-700 block">{selectedReward.customerConfirmationStatus || "Confirmed"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Eligibility:</span>
                  <span className="font-semibold text-purple-900 block">{selectedReward.eligibilityStatus}</span>
                </div>
              </div>

              {/* Point Allocation */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Provider Reward:</span>
                  <span className="text-base font-black font-mono text-purple-700">
                    +{selectedReward.pointsProvider || 50} pts
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status Reward:</span>
                  <span className="font-bold text-slate-800">
                    {selectedReward.eligibilityStatus}
                  </span>
                </div>
              </div>

              {selectedReward.reversalReason && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  <strong>Catatan Pembatalan Reward:</strong> {selectedReward.reversalReason}
                </div>
              )}
            </div>

            {/* RBAC Notice */}
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-start gap-2 text-[10px] text-slate-600">
              <Info size={14} className="shrink-0 text-slate-500 mt-0.5" />
              <span>
                <strong>Otoritas Terbatas (RBAC):</strong> Provider tidak dapat memanipulasi buku besar reward atau mengubah nominal poin secara manual. Seluruh kalkulasi ditentukan oleh sistem berdasarkan status siklus pemenuhan barang toko rekanan.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReward(null)}
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Section 33, 35, 36: Reward Catalog & Point Redemption Modal */}
      {redeemModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isRedeeming) {
              setRedeemModalOpen(false);
              setSelectedCatalogItem(null);
            }
          }}
          title="Katalog Penukaran Poin Afiliasi"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Balance Banner */}
            <div className="p-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-purple-200 block uppercase font-bold tracking-wider">
                  Saldo Poin Tersedia
                </span>
                <span className="text-xl font-black font-mono">
                  {availablePoints.toLocaleString("id-ID")} Points
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-xs text-white">
                Buku Besar Servio
              </span>
            </div>

            <p className="text-slate-500 text-[11px]">
              Pilih voucher benefit yang ingin Anda tukarkan dari saldo poin aktif kemitraan toko Anda:
            </p>

            {/* Catalog Items */}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {rewardCatalog.map((item) => {
                const canAfford = availablePoints >= item.requiredPoints;
                const isSelected = selectedCatalogItem?.rewardId === item.rewardId;

                return (
                  <div
                    key={item.rewardId}
                    onClick={() => canAfford && setSelectedCatalogItem(item)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      !canAfford
                        ? "opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed"
                        : isSelected
                        ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-400/30"
                        : "bg-white hover:bg-purple-50/30 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        <Badge
                          variant={item.rewardType === "SERVICE_VOUCHER" ? "primary" : item.rewardType === "PRODUCT_VOUCHER" ? "secondary" : "neutral"}
                          size="sm"
                        >
                          Rp {item.rewardValue.toLocaleString("id-ID")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">{item.description}</p>
                      <p className="text-[10px] text-purple-700 font-semibold">{item.usagePolicy}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-sm text-purple-950">
                        {item.requiredPoints} pts
                      </div>
                      <span className={`text-[10px] font-semibold block mt-0.5 ${canAfford ? "text-emerald-700" : "text-rose-600"}`}>
                        {canAfford ? "Tersedia" : "Poin Kurang"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedCatalogItem && (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Saldo Sebelum:</span>
                  <span>{availablePoints} pts</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Poin Dipotong:</span>
                  <span>-{selectedCatalogItem.requiredPoints} pts</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-black border-t border-purple-200 pt-1">
                  <span>Sisa Saldo:</span>
                  <span>{availablePoints - selectedCatalogItem.requiredPoints} pts</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                disabled={isRedeeming}
                onClick={() => {
                  setRedeemModalOpen(false);
                  setSelectedCatalogItem(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedCatalogItem || isRedeeming}
                onClick={handleRedeemConfirm}
                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5"
              >
                <Sparkle size={15} weight="fill" />
                <span>{isRedeeming ? "Memproses..." : "Konfirmasi Penukaran"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
