"use client";

import React, { useState } from "react";
import {
  Storefront,
  MagnifyingGlass,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  Handshake,
  ShieldCheck,
  Info,
  ArrowRight,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { useProviderPartnerships } from "@/features/provider/useProviderPartnerships";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { MerchantPartnerDiscoveryItem } from "@/mocks/partnerships";
import { Toast } from "@/components/feedback/Toast";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { getAffiliateStatusBadgeInfo } from "@/lib/policy/affiliatePolicy";

export default function ProviderPartnershipsPage() {
  const { affiliateSummary } = useProviderOperations();
  const [showAffiliateDetails, setShowAffiliateDetails] = useState(false);
  const {
    merchants,
    rawMerchantsCount,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    maxDistance,
    setMaxDistance,
    setMinRating,
    requestPartnership,
    cancelPartnershipRequest,
    endPartnership,
    workerVisiblePartners,
  } = useProviderPartnerships();

  const [selectedMerchant, setSelectedMerchant] = useState<MerchantPartnerDiscoveryItem | null>(null);
  const [requestScope, setRequestScope] = useState("HVAC_SPAREPARTS");
  const [requestNote, setRequestNote] = useState("");
  const [showConfirmRequestModal, setShowConfirmRequestModal] = useState(false);
  const [showEndPartnershipModal, setShowEndPartnershipModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenRequestModal = (m: MerchantPartnerDiscoveryItem) => {
    setSelectedMerchant(m);
    setShowConfirmRequestModal(true);
  };

  const handleConfirmRequest = () => {
    if (!selectedMerchant) return;
    requestPartnership(selectedMerchant.id, requestScope);
    setShowConfirmRequestModal(false);
    setToastMessage(`Permintaan kemitraan resmi telah dikirimkan ke ${selectedMerchant.name}.`);
    // Update active modal state if open
    setSelectedMerchant({
      ...selectedMerchant,
      partnership: {
        id: `part-${Date.now().toString().slice(-4)}`,
        providerId: "prov-01",
        merchantId: selectedMerchant.id,
        merchantName: selectedMerchant.name,
        status: "PENDING",
        requestedAt: "Baru saja",
        scope: requestScope,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleCancelRequest = (m: MerchantPartnerDiscoveryItem) => {
    cancelPartnershipRequest(m.id);
    setToastMessage(`Pengajuan kemitraan ke ${m.name} telah dibatalkan.`);
    if (selectedMerchant?.id === m.id) {
      setSelectedMerchant({ ...selectedMerchant, partnership: undefined });
    }
  };

  const handleEndPartnership = () => {
    if (!selectedMerchant) return;
    endPartnership(selectedMerchant.id);
    setShowEndPartnershipModal(false);
    setToastMessage(`Kemitraan dengan ${selectedMerchant.name} telah diakhiri.`);
    setSelectedMerchant({
      ...selectedMerchant,
      partnership: selectedMerchant.partnership
        ? { ...selectedMerchant.partnership, status: "INACTIVE" }
        : undefined,
    });
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 flex items-center gap-1.5">
                <Storefront size={14} weight="fill" className="text-[#0F4C81]" />
                Kemitraan Toko &amp; Merchant
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {workerVisiblePartners.length} Toko Mitra Aktif
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              Kerja Sama Toko Suku Cadang
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Jalin kemitraan resmi dengan toko suku cadang rekanan di sekitar area operasional Anda. Teknisi Anda dapat merekomendasikan stok toko mitra langsung ke pelanggan dengan atribusi komisi poin resmi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck size={24} weight="duotone" className="text-[#0F4C81] shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Non-Inventory Model</p>
                <p className="text-[11px] text-slate-500">Stok &amp; Pengiriman Dikelola Toko Mitra</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase E: Ringkasan Performa Poin Afiliasi Kemitraan */}
      <div className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/70 rounded-3xl border border-purple-200/90 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-xs">
              <Sparkle size={22} weight="fill" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-slate-900">
                  Performa Poin Afiliasi Kemitraan Toko
                </h2>
                <Badge variant="secondary" size="sm">
                  Kemitraan Resmi
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi komisi poin bengkel dari pengadaan suku cadang mitra yang direkomendasikan teknisi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAffiliateDetails(!showAffiliateDetails)}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-purple-200 transition shrink-0"
          >
            <span>{showAffiliateDetails ? "Sembunyikan Riwayat" : "Lihat Riwayat Pesanan"}</span>
            <ArrowRight size={13} weight="bold" className={showAffiliateDetails ? "-rotate-90 transition-transform" : "transition-transform"} />
          </button>
        </div>

        {/* 5 Metric Cards (Section 15) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Total Eligible
            </span>
            <p className="text-xl font-black font-display text-purple-950 mt-0.5">
              +{affiliateSummary.totalEligiblePoints || 1250} pts
            </p>
            <span className="text-[10px] text-purple-600 mt-0.5 block">Akumulasi Reward</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Pending
            </span>
            <p className="text-xl font-black font-display text-amber-900 mt-0.5">
              +{affiliateSummary.pendingPoints || 320} pts
            </p>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Pesanan Berjalan</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Confirmed
            </span>
            <p className="text-xl font-black font-display text-emerald-900 mt-0.5">
              +{affiliateSummary.confirmedPoints || 930} pts
            </p>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Poin Tervalidasi</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-rose-100 shadow-2xs text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Reversed
            </span>
            <p className="text-xl font-black font-display text-rose-900 mt-0.5">
              -{affiliateSummary.reversedPoints || 150} pts
            </p>
            <span className="text-[10px] text-rose-600 mt-0.5 block">Retur / Batal</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Attributed Orders
            </span>
            <p className="text-xl font-black font-display text-slate-900 mt-0.5">
              {affiliateSummary.totalOrders || 18}
            </p>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Pesanan Terbit</span>
          </div>
        </div>

        {/* Expandable Order Attribution List */}
        {showAffiliateDetails && (
          <div className="pt-3 border-t border-purple-100 space-y-2">
            <p className="text-xs font-bold text-slate-800">Daftar Transaksi Rekomendasi Suku Cadang:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {affiliateSummary.attributions.map((attr) => {
                const badgeInfo = getAffiliateStatusBadgeInfo(attr.eligibilityStatus);
                return (
                  <div
                    key={attr.id}
                    className="p-3 rounded-2xl bg-white border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">#{attr.productOrderId}</span>
                        <Badge variant={badgeInfo.variant} size="sm">
                          {badgeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Order Servis: <span className="font-mono font-semibold text-slate-700">{attr.serviceOrderId}</span> • Waktu: {attr.createdAt}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold font-mono text-purple-700 text-sm block">
                        +{attr.pointsProvider || 0} Pts (Bengkel)
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Teknisi: +{attr.pointsWorker || 0} Pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MagnifyingGlass size={16} weight="bold" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama toko, spesialisasi, atau suku cadang..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81] bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Status Kemitraan</option>
              <option value="ACTIVE">Kemitraan Aktif ({workerVisiblePartners.length})</option>
              <option value="PENDING">Menunggu Konfirmasi</option>
              <option value="INACTIVE">Belum Bermitra / Tersedia</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="AC & HVAC">AC &amp; HVAC Parts</option>
              <option value="Electrical">Electrical Parts</option>
              <option value="Pompa">Plumbing &amp; Pompa Air</option>
              <option value="Kompresor">Kompresor &amp; Motor</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div className="md:col-span-2 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
            <MapPin size={16} className="text-rose-500 shrink-0" />
            <div className="w-full">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                <span>Radius Maks</span>
                <span className="font-bold text-slate-900">{maxDistance} km</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-[#0F4C81] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Menampilkan <strong className="text-slate-900">{merchants.length}</strong> dari {rawMerchantsCount} merchant terdaftar di sekitar radius kerja Anda.
          </div>
          {(searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL" || maxDistance < 10) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setCategoryFilter("ALL");
                setMaxDistance(10);
                setMinRating(0);
              }}
              className="text-xs font-bold text-[#0F4C81] hover:underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Partner Cards Grid (Section 56C.15) */}
      {merchants.length === 0 ? (
        <EmptyState
          icon={Storefront}
          title="Tidak Ada Merchant Ditemukan"
          description="Coba ubah kata kunci pencarian atau perluas radius jarak pencarian merchant."
          action={{
            label: "Reset Pencarian",
            onClick: () => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setMaxDistance(15);
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {merchants.map((merchant) => {
            const isPartnerActive = merchant.partnership?.status === "ACTIVE";
            const isPartnerPending = merchant.partnership?.status === "PENDING";

            return (
              <div
                key={merchant.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  {/* Card Header & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold text-base shrink-0 border border-sky-100 group-hover:scale-105 transition-transform">
                        <Storefront size={22} weight="duotone" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-900 group-hover:text-[#0F4C81] transition-colors line-clamp-1">
                          {merchant.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={13} className="text-rose-500 shrink-0" />
                          <span>{merchant.city} • <strong className="text-slate-800">{merchant.distanceKm} km</strong></span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Product Count */}
                  <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star size={14} weight="fill" />
                      <span>{merchant.rating}</span>
                      <span className="text-slate-400 font-normal">({merchant.reviewCount})</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="text-slate-600">
                      <strong className="text-slate-900">{merchant.totalProductsCount}</strong> Produk Suku Cadang
                    </div>
                  </div>

                  {/* Specialization & Categories */}
                  <div className="space-y-1.5 text-xs">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Spesialisasi:
                    </p>
                    <p className="font-medium text-slate-800 text-xs line-clamp-1">
                      {merchant.specialization}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {merchant.productCategories.slice(0, 3).map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded-md"
                        >
                          {cat}
                        </span>
                      ))}
                      {merchant.productCategories.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded-md">
                          +{merchant.productCategories.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Status & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    {isPartnerActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle size={13} weight="fill" />
                        <span>Mitra Aktif</span>
                      </span>
                    ) : isPartnerPending ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={13} weight="bold" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        <span>Belum Bermitra</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMerchant(merchant)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Detail
                    </button>

                    {!isPartnerActive && !isPartnerPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenRequestModal(merchant)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0d3f6c] transition flex items-center gap-1 shadow-xs"
                      >
                        <Handshake size={14} weight="bold" />
                        <span>Ajukan</span>
                      </button>
                    )}

                    {isPartnerPending && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(merchant)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                        title="Batalkan Permintaan"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MODAL: DETAIL MERCHANT & PARTNERSHIP (Section 56C.16)                  */}
      {/* ========================================================================= */}
      {selectedMerchant && !showConfirmRequestModal && !showEndPartnershipModal && (
        <Modal
          isOpen={Boolean(selectedMerchant)}
          onClose={() => setSelectedMerchant(null)}
          title={`Profil Toko: ${selectedMerchant.name}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs text-slate-600">
            {/* Store Banner Info */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-white text-[#0F4C81] flex items-center justify-center font-bold text-xl shrink-0 shadow-xs border border-sky-200">
                <Storefront size={24} weight="duotone" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {selectedMerchant.name}
                  </h3>
                  {selectedMerchant.isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck size={12} weight="fill" />
                      Terverifikasi
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedMerchant.address}</p>
                <div className="flex items-center gap-3 mt-2 text-slate-700">
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star size={14} weight="fill" />
                    {selectedMerchant.rating} ({selectedMerchant.reviewCount} ulasan konsumen)
                  </span>
                  <span>•</span>
                  <span>Jarak dari workshop: <strong className="text-slate-900">{selectedMerchant.distanceKm} km</strong></span>
                </div>
              </div>
            </div>

            {/* Serviceability & Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam Layanan</span>
                <p className="font-semibold text-slate-900">{selectedMerchant.operatingHours}</p>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metode Pengadaan</span>
                <p className="font-semibold text-slate-900">{selectedMerchant.serviceability}</p>
              </div>
            </div>

            {/* Categories & Catalog Coverage */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Kategori Suku Cadang yang Disediakan ({selectedMerchant.totalProductsCount} Produk):</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMerchant.productCategories.map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Partnership Status Detail */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Status Kemitraan:</span>
                {selectedMerchant.partnership?.status === "ACTIVE" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle size={14} weight="fill" />
                    Kemitraan Aktif
                  </span>
                ) : selectedMerchant.partnership?.status === "PENDING" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5">
                    <Clock size={14} weight="bold" />
                    Menunggu Konfirmasi Merchant
                  </span>
                ) : selectedMerchant.partnership?.status === "REJECTED" ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
                    <WarningCircle size={14} weight="fill" />
                    Pengajuan Ditolak Toko
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                    Belum Terikat Kemitraan
                  </span>
                )}
              </div>

              {selectedMerchant.partnership?.status === "ACTIVE" && (
                <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                  <p>Tanggal Mulai Kerja Sama: <strong>{selectedMerchant.partnership.approvedAt || selectedMerchant.partnership.requestedAt}</strong></p>
                  <p>Cakupan Scope: <strong>{selectedMerchant.partnership.scope}</strong></p>
                  <p className="text-emerald-700 font-medium">Teknisi aktif Anda dapat merekomendasikan produk toko ini untuk pesanan servis di lapangan.</p>
                </div>
              )}

              {selectedMerchant.partnership?.status === "PENDING" && (
                <div className="text-[11px] text-amber-800 pt-1">
                  Permintaan diajukan pada: <strong>{selectedMerchant.partnership.requestedAt}</strong>. Merchant memiliki waktu 48 jam untuk menyetujui pengajuan kemitraan.
                </div>
              )}

              {selectedMerchant.partnership?.status === "REJECTED" && (
                <div className="text-[11px] text-rose-800 space-y-1 pt-2 border-t border-slate-200">
                  <p>Tanggal Keputusan: <strong>{selectedMerchant.partnership.rejectedAt || selectedMerchant.partnership.updatedAt}</strong></p>
                  <p>Alasan Penolakan: <strong>{selectedMerchant.partnership.rejectionReason || "Tidak memenuhi kriteria toko saat ini"}</strong></p>
                  <p className="text-slate-500">Anda dapat mengajukan kembali kerja sama setelah menyesuaikan cakupan atau kebutuhan suku cadang.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Tutup
              </button>

              {(!selectedMerchant.partnership || selectedMerchant.partnership.status === "INACTIVE" || selectedMerchant.partnership.status === "REJECTED") && (
                <button
                  type="button"
                  onClick={() => setShowConfirmRequestModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0d3f6c] font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Handshake size={16} weight="bold" />
                  <span>{selectedMerchant.partnership?.status === "REJECTED" ? "Ajukan Ulang Kemitraan" : "Ajukan Kemitraan Resmi"}</span>
                </button>
              )}

              {selectedMerchant.partnership?.status === "PENDING" && (
                <button
                  type="button"
                  onClick={() => handleCancelRequest(selectedMerchant)}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                >
                  Batalkan Pengajuan
                </button>
              )}

              {selectedMerchant.partnership?.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => setShowEndPartnershipModal(true)}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                >
                  Akhiri Kemitraan
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL: FORM PENGAJUAN KERJA SAMA (Section 11.2 & 56C.16)                */}
      {/* ========================================================================= */}
      {showConfirmRequestModal && selectedMerchant && (
        <Modal
          isOpen={showConfirmRequestModal}
          onClose={() => setShowConfirmRequestModal(false)}
          title="Konfirmasi Pengajuan Kerja Sama Toko"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl bg-sky-50 text-slate-800 space-y-1">
              <p className="font-bold text-slate-900">Mengajukan kemitraan ke:</p>
              <p className="text-sm font-bold text-[#0F4C81]">{selectedMerchant.name}</p>
              <p className="text-[11px] text-slate-500">{selectedMerchant.address}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Pilih Cakupan Kategori Suku Cadang:
              </label>
              <select
                value={requestScope}
                onChange={(e) => setRequestScope(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="HVAC_SPAREPARTS">AC &amp; Komponen Pendingin (HVAC)</option>
                <option value="ELECTRICAL_PLUMBING">Kelistrikan &amp; Saluran Air (Plumbing)</option>
                <option value="ALL_CATEGORIES">Seluruh Katalog Suku Cadang Resmi Toko</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Catatan Pengajuan untuk Merchant (Opsional):
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Contoh: Kami melayani perbaikan AC area Jakarta Selatan dengan 5 teknisi aktif..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <Info size={18} className="shrink-0 text-amber-700 mt-0.5" />
              <span>
                Dengan mengajukan kemitraan, teknisi Anda akan diizinkan merujuk produk toko ini pada pesanan servis Servio. Setiap pesanan barang yang terselesaikan menghasilkan atribusi komisi poin bagi bengkel &amp; teknisi.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmRequestModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRequest}
                className="px-4 py-2 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0d3f6c] font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle size={15} weight="bold" />
                <span>Kirimkan Pengajuan Resmi</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: KONFIRMASI AKHIRI KEMITRAAN                                     */}
      {/* ========================================================================= */}
      {showEndPartnershipModal && selectedMerchant && (
        <Modal
          isOpen={showEndPartnershipModal}
          onClose={() => setShowEndPartnershipModal(false)}
          title="Konfirmasi Akhiri Kemitraan"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Apakah Anda yakin ingin mengakhiri kerja sama resmi dengan <strong className="text-slate-900">{selectedMerchant.name}</strong>?
            </p>
            <p className="text-[11px] text-slate-500">
              Setelah diakhiri, teknisi Anda tidak akan lagi melihat katalog suku cadang toko ini di daftar rujukan mitra kerja sama.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEndPartnershipModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEndPartnership}
                className="px-3.5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs shadow-xs"
              >
                Ya, Akhiri Kemitraan
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
