"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CurrencyCircleDollar,
  ArrowLeft,
  ShieldCheck,
  Star,
  Sparkle,
  CalendarCheck,
  TrendUp,
  Receipt,
  DownloadSimple,
  User,
  Phone,
  Storefront,
  CaretRight,
  CheckCircle,
  Coins,
  Handshake,
  Package,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { Toast } from "@/components/feedback/Toast";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Info } from "@phosphor-icons/react";
import { getAffiliateStatusBadgeInfo } from "@/lib/policy/affiliatePolicy";
import { AffiliateAttribution, RewardCatalogItem } from "@/types/domain";
import { useDomainRepository } from "@/lib/repository/domainRepository";

export default function WorkerEarningsPage() {
  const repo = useDomainRepository();
  const { worker, completedJobs, todayEarnings, affiliateSummary } = useWorkerOperations();
  const [period, setPeriod] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");
  const [selectedAttribution, setSelectedAttribution] = useState<AffiliateAttribution | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<RewardCatalogItem | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const availablePoints = repo.getAvailablePointBalance("WORKER", worker.id);
  const redeemedPointsTotal = repo.getRedeemedPointsTotal("WORKER", worker.id);
  const myRedemptions = repo.getRedemptionsByOwner("WORKER", worker.id);
  const rewardCatalog = repo.getRewardCatalog("WORKER");

  const handleRedeemConfirm = () => {
    if (!selectedCatalogItem) return;
    setIsRedeeming(true);
    const idempotencyKey = `rdm-wrk-${selectedCatalogItem.rewardId}-${Date.now().toString().slice(-4)}`;
    setTimeout(() => {
      const res = repo.redeemReward("WORKER", worker.id, selectedCatalogItem.rewardId, idempotencyKey);
      setIsRedeeming(false);
      setRedeemModalOpen(false);
      setSelectedCatalogItem(null);
      setToastMessage(res.message);
    }, 400);
  };

  const earningsData = {
    TODAY: { total: 285000, jobsCount: 3, bonus: 25000 },
    WEEK: { total: 1850000, jobsCount: 18, bonus: 150000 },
    MONTH: { total: 7420000, jobsCount: 76, bonus: 600000 },
  };

  const currentMetrics = earningsData[period];

  const payoutHistory = [
    { id: "po-1", date: "15 September 2026", amount: 1650000, status: "PAID", method: "BCA Transfer" },
    { id: "po-2", date: "08 September 2026", amount: 1920000, status: "PAID", method: "BCA Transfer" },
    { id: "po-3", date: "01 September 2026", amount: 1780000, status: "PAID", method: "BCA Transfer" },
  ];

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/worker/dashboard"
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900">
            Pendapatan & Profil Teknisi
          </h1>
          <p className="text-xs text-slate-500">
            Ringkasan insentif pengerjaan dan performa mutu layanan Anda.
          </p>
        </div>
      </div>

      {/* Technician Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-sky-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            BS
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold font-display text-slate-900">
                {worker.name}
              </h2>
              <ShieldCheck size={18} weight="fill" className="text-sky-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              ID Teknisi: <code className="font-mono text-[11px] font-bold text-slate-800">{worker.id}</code>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                <Star size={13} weight="fill" />
                {worker.rating} CSAT
              </span>
              <span className="text-xs text-slate-500">
                • {worker.completedJobs} Pekerjaan Tuntas
              </span>
            </div>
          </div>
        </div>

        {/* Certified Skills Badges */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Kompetensi & Sertifikasi:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {worker.skills.map((skill, idx) => (
              <span
                key={idx}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Overview Card */}
      <div className="bg-gradient-to-br from-[#0F4C81] to-sky-900 text-white rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            Total Akumulasi Insentif
          </span>

          <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl text-xs font-bold">
            {(["TODAY", "WEEK", "MONTH"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-0.5 rounded-lg transition ${
                  period === p ? "bg-white text-[#0F4C81] shadow-xs" : "text-sky-200 hover:text-white"
                }`}
              >
                {p === "TODAY" ? "Hari Ini" : p === "WEEK" ? "Minggu" : "Bulan"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold font-display tracking-tight">
            Rp {currentMetrics.total.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-sky-200 mt-1">
            Termasuk bonus kepuasan pelanggan Rp {currentMetrics.bonus.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-xs text-sky-100">
          <div>
            <span className="text-[11px] text-sky-300 block">Tugas Selesai:</span>
            <strong className="text-white text-sm">{currentMetrics.jobsCount} Order Servis</strong>
          </div>
          <div>
            <span className="text-[11px] text-sky-300 block">Jadwal Pencairan:</span>
            <strong className="text-white text-sm">Setiap Senin Pagi</strong>
          </div>
        </div>
      </div>

      {/* Phase E: Poin Afiliasi Suku Cadang Mitra (E9) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Sparkle size={20} weight="fill" />
            </span>
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                Poin Afiliasi Suku Cadang Mitra
              </h3>
              <p className="text-[11px] text-slate-500">
                Reward rekomendasi pengadaan sparepart dari toko rekanan bengkel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedCatalogItem(rewardCatalog[0] || null);
                setRedeemModalOpen(true);
              }}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
            >
              <Sparkle size={14} weight="bold" />
              <span>Tukarkan Poin</span>
            </Button>
          </div>
        </div>

        {/* 5 Metric Cards (Section 18 & Phase E Finalization) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-2xl bg-purple-100/80 border border-purple-300 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
              Saldo Tersedia
            </span>
            <p className="text-xl font-black font-display text-purple-950 mt-0.5 font-mono">
              {availablePoints.toLocaleString("id-ID")} pts
            </p>
            <span className="text-[10px] text-purple-700 font-semibold">Siap Ditukar</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Terkonfirmasi
            </span>
            <p className="text-lg font-black font-display text-purple-900 mt-0.5">
              +{affiliateSummary.confirmedPoints || 90}
            </p>
            <span className="text-[10px] text-purple-600">Akumulasi Terbit</span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Tertunda
            </span>
            <p className="text-lg font-black font-display text-amber-900 mt-0.5">
              +{affiliateSummary.pendingPoints || 120}
            </p>
            <span className="text-[10px] text-amber-600">Menunggu Order</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
              Telah Ditukar
            </span>
            <p className="text-lg font-black font-display text-indigo-900 mt-0.5">
              {redeemedPointsTotal} pts
            </p>
            <span className="text-[10px] text-indigo-600">Voucher Terpakai</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Order Afiliasi
            </span>
            <p className="text-lg font-black font-display text-slate-800 mt-0.5">
              {affiliateSummary.totalOrders}
            </p>
            <span className="text-[10px] text-slate-500">Total Transaksi</span>
          </div>
        </div>

        {/* Active Redemptions & Vouchers if any (Section 40) */}
        {myRedemptions.length > 0 && (
          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-purple-50/50 to-white rounded-2xl border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkle size={15} weight="fill" className="text-purple-600" />
                <span>Voucher Hasil Penukaran Poin ({myRedemptions.length})</span>
              </span>
              <span className="text-[10px] text-purple-700">Tunjukkan kode saat memesan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        {/* List of Orders / Attributions */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Riwayat Order Afiliasi (Klik untuk Rincian)</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {affiliateSummary.attributions.length} Rekomendasi Tercatat
            </span>
          </div>

          {affiliateSummary.attributions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Belum Ada Poin Afiliasi</p>
              <p className="text-[11px]">
                Kirimkan rekomendasi suku cadang dari toko rekanan saat diagnosis untuk memperoleh poin reward.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {affiliateSummary.attributions.map((attr) => {
                const badgeInfo = getAffiliateStatusBadgeInfo(attr.eligibilityStatus);
                return (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => setSelectedAttribution(attr)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:border-purple-300 hover:bg-purple-50/20 transition cursor-pointer group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 group-hover:text-purple-900">
                          #{attr.productOrderId}
                        </span>
                        <Badge variant={badgeInfo.variant} size="sm">
                          {badgeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-700 font-medium">
                        {attr.productTitle || "Suku Cadang AC"} • <span className="text-slate-500">{attr.merchantName || "Toko Rekanan"}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Order Servis: <span className="font-mono text-slate-600 font-semibold">{attr.serviceOrderId}</span> • {attr.createdAt}
                      </p>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="font-bold font-mono text-purple-700 text-sm block">
                        +{attr.pointsWorker || 0} Pts
                      </span>
                      {attr.commissionAmountWorker ? (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          (Rp {attr.commissionAmountWorker.toLocaleString("id-ID")})
                        </span>
                      ) : null}
                      <span className="text-[10px] text-purple-600 font-bold group-hover:underline block mt-0.5">
                        Lihat Rincian &rarr;
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* E9: WORKER REWARD DETAIL MODAL (Section 19) */}
      {selectedAttribution && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAttribution(null)}
          title="Rincian Reward Afiliasi Teknisi"
        >
          <div className="space-y-4 text-xs font-body text-left">
            {/* Header info */}
            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-purple-950 text-sm">
                  REWARD DETAIL
                </span>
                {(() => {
                  const b = getAffiliateStatusBadgeInfo(selectedAttribution.eligibilityStatus);
                  return (
                    <Badge variant={b.variant} size="sm">
                      {b.label}
                    </Badge>
                  );
                })()}
              </div>
              <p className="text-[11px] text-purple-800">
                Poin insentif diperoleh karena pelanggan menyetujui rekomendasi pengadaan suku cadang dari toko rekanan resmi.
              </p>
            </div>

            {/* Canonical Attribution Details */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-slate-700">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Suku Cadang:</span>
                  <span className="font-bold text-slate-900 block truncate">{selectedAttribution.productTitle || "Kapasitor 35uF"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Toko Mitra Penjual:</span>
                  <span className="font-semibold text-slate-800 block truncate">{selectedAttribution.merchantName || "Sejuk Sentra Part AC"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Service Order:</span>
                  <span className="font-mono font-bold text-primary block">#{selectedAttribution.serviceOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor Product Order:</span>
                  <span className="font-mono font-bold text-slate-900 block">#{selectedAttribution.productOrderId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Rekomendasi Teknisi:</span>
                  <span className="font-semibold text-emerald-700 block">Terkirim ke Pelanggan</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Konfirmasi Pelanggan:</span>
                  <span className="font-semibold text-emerald-700 block">{selectedAttribution.customerConfirmationStatus || "Confirmed"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sumber Atribusi:</span>
                  <span className="font-mono text-slate-600 block text-[10px]">{selectedAttribution.source}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status Kelayakan:</span>
                  <span className="font-semibold text-purple-900 block">{selectedAttribution.eligibilityStatus}</span>
                </div>
              </div>

              {/* Point Allocation */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Poin Reward Teknisi:</span>
                  <span className="text-base font-black font-mono text-purple-700">
                    +{selectedAttribution.pointsWorker || 30} Pts
                  </span>
                </div>
                {selectedAttribution.commissionAmountWorker ? (
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Komisi Tambahan:</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rp {selectedAttribution.commissionAmountWorker.toLocaleString("id-ID")}
                    </span>
                  </div>
                ) : null}
              </div>

              {selectedAttribution.reversalReason && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                  <strong>Catatan Pembatalan Reward:</strong> {selectedAttribution.reversalReason}
                </div>
              )}
            </div>

            {/* RBAC Notice */}
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-start gap-2 text-[10px] text-slate-600">
              <Info size={14} className="shrink-0 text-slate-500 mt-0.5" />
              <span>
                <strong>Otoritas Terbatas (RBAC):</strong> Poin dihitung otomatis berdasarkan kebijakan platform. Teknisi hanya memiliki hak baca (view-only) dan tidak dapat mengubah nilai saldo atau status atribusi.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAttribution(null)}
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REWARD REDEMPTION MODAL FOR WORKERS (Section 39 & 40) */}
      {redeemModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setRedeemModalOpen(false);
            setSelectedCatalogItem(null);
          }}
          title="Tukarkan Poin Afiliasi Teknisi"
        >
          <div className="space-y-4 text-xs font-body text-left">
            {/* Balance Banner */}
            <div className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl flex items-center justify-between shadow-xs">
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
              Pilih reward resmi yang ingin ditukarkan menggunakan saldo poin loyalitas rekomendasi sparepart Anda:
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
                className="bg-purple-700 hover:bg-purple-800 flex items-center gap-1.5"
              >
                <Sparkle size={15} weight="fill" />
                <span>{isRedeeming ? "Memproses..." : "Konfirmasi Penukaran"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payout History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-display text-slate-900">
            Riwayat Pencairan Mingguan
          </h3>
          <span className="text-xs text-slate-400 font-medium">Bulan September 2026</span>
        </div>

        <div className="space-y-2.5 pt-1">
          {payoutHistory.map((po) => (
            <div
              key={po.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-slate-900">{po.method}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{po.date}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-900 block">
                  Rp {po.amount.toLocaleString("id-ID")}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-0.5">
                  <CheckCircle size={12} weight="fill" />
                  DITRANSFER
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workshop Contact Box */}
      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <Storefront size={22} className="text-[#0F4C81]" weight="duotone" />
          <div>
            <p className="font-bold text-slate-900">{worker.providerName}</p>
            <p className="text-slate-500 text-[11px]">Koordinator Bengkel: Bpk. Bambang Sutrisno</p>
          </div>
        </div>
        <a
          href="tel:081234567890"
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-[#0F4C81] hover:bg-slate-100 transition flex items-center gap-1 shadow-2xs"
        >
          <Phone size={13} weight="fill" />
          <span>Hubungi</span>
        </a>
      </div>
    </div>
  );
}
