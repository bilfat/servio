"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Handshake,
  Storefront,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  MapPin,
  Wrench,
  ShieldCheck,
  Info,
  ArrowRight,
  WarningCircle,
  X,
  FileText,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { StorePartnership, StorePartnershipStatus } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";
import { partnershipApi } from "@/lib/servioApi";

type FilterTab = "ALL" | "PENDING" | "ACTIVE" | "REJECTED";

export default function MerchantPartnershipRequestsPage() {
  const repo = useDomainRepository();
  const currentMerchantId = "merch-01"; // Sejuk Sentra Part AC

  // All partnerships for this merchant
  const partnerships = repo.getMerchantPartnerships(currentMerchantId);

  // States
  const [activeTab, setActiveTab] = useState<FilterTab>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<StorePartnership | null>(null);

  // Confirmation dialog states
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("Tidak sesuai kebutuhan bisnis");
  const [customRejectNote, setCustomRejectNote] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Counts for tabs
  const countPending = partnerships.filter((p) => p.status === "PENDING").length;
  const countActive = partnerships.filter((p) => p.status === "ACTIVE").length;
  const countRejected = partnerships.filter((p) => p.status === "REJECTED").length;
  const countAll = partnerships.length;

  // Filtered list
  const filteredList = useMemo(() => {
    return partnerships.filter((p) => {
      // Tab filter
      if (activeTab === "PENDING" && p.status !== "PENDING") return false;
      if (activeTab === "ACTIVE" && p.status !== "ACTIVE") return false;
      if (activeTab === "REJECTED" && p.status !== "REJECTED") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.providerName || "").toLowerCase().includes(q);
        const matchSpec = (p.providerSpecialization || "").toLowerCase().includes(q);
        const matchArea = (p.providerServiceArea || "").toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchName && !matchSpec && !matchArea && !matchId) return false;
      }

      return true;
    });
  }, [partnerships, activeTab, searchQuery]);

  // Handle Accept
  const handleConfirmAccept = async () => {
    if (!selectedRequest) return;
    const updated = repo.acceptStorePartnership(selectedRequest.id, currentMerchantId);
    if (updated) {
      setSelectedRequest(updated);
      setShowAcceptDialog(false);
      setToastMessage(
        `Kemitraan dengan ${updated.providerName || "Penyedia Jasa"} berhasil disetujui! Status kini AKTIF.`
      );
    }
    try {
      await partnershipApi.updatePartnership(selectedRequest.id, { status: "ACCEPTED" });
    } catch {
      // Handled gracefully for local domain repo
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!selectedRequest) return;
    const finalReason =
      rejectReason === "Alasan lainnya" && customRejectNote.trim()
        ? customRejectNote.trim()
        : rejectReason;

    const updated = repo.rejectStorePartnership(
      selectedRequest.id,
      finalReason,
      currentMerchantId
    );
    if (updated) {
      setSelectedRequest(updated);
      setShowRejectDialog(false);
      setToastMessage(
        `Pengajuan kerja sama dari ${updated.providerName || "Penyedia Jasa"} telah ditolak.`
      );
    }
    try {
      await partnershipApi.updatePartnership(selectedRequest.id, {
        status: "REJECTED",
        notes: finalReason,
      });
    } catch {
      // Handled gracefully for local domain repo
    }
  };

  const getStatusBadge = (status: StorePartnershipStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Menunggu Persetujuan",
          variant: "warning" as const,
          icon: <Clock size={12} weight="bold" />,
        };
      case "ACTIVE":
        return {
          label: "Kemitraan Aktif",
          variant: "success" as const,
          icon: <CheckCircle size={12} weight="fill" />,
        };
      case "REJECTED":
        return {
          label: "Ditolak",
          variant: "danger" as const,
          icon: <XCircle size={12} weight="fill" />,
        };
      default:
        return {
          label: status,
          variant: "neutral" as const,
          icon: <Info size={12} />,
        };
    }
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {/* Toast Feedback */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Handshake size={24} weight="bold" />
            </span>
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900">
                Pengajuan Kerja Sama Provider
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Workspace persetujuan kemitraan resmi penyedia jasa teknisi dengan toko suku cadang Anda
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/business/merchant/dashboard"
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition"
          >
            ← Kembali ke Dashboard
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            <Storefront size={16} weight="duotone" className="text-indigo-600" />
            <span>Sejuk Sentra Part AC</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* 4 Canonical Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("PENDING")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "PENDING"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Menunggu Persetujuan</span>
              {countPending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                  {countPending}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "ACTIVE"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Aktif</span>
              <span className="text-[11px] text-slate-400 font-mono">({countActive})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("REJECTED")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "REJECTED"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Ditolak</span>
              <span className="text-[11px] text-slate-400 font-mono">({countRejected})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Semua</span>
              <span className="text-[11px] text-slate-400 font-mono">({countAll})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari provider, area, spesialisasi..."
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List / Cards Section */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Handshake size={28} weight="duotone" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm font-display">
              {activeTab === "PENDING"
                ? "Tidak Ada Pengajuan Menunggu"
                : activeTab === "ACTIVE"
                ? "Belum Ada Partner Aktif"
                : activeTab === "REJECTED"
                ? "Tidak Ada Pengajuan yang Ditolak"
                : "Belum Ada Pengajuan Kerja Sama"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {activeTab === "PENDING"
                ? "Semua permintaan kemitraan resmi dari penyedia jasa telah Anda tanggapi."
                : "Pengajuan kerja sama dari penyedia jasa teknisi Servio akan tampil di daftar ini."}
            </p>
          </div>
          {activeTab !== "ALL" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("ALL");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition"
            >
              Tampilkan Semua Pengajuan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top: Status & Request Date */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      #{item.id}
                    </span>
                    <Badge variant={badge.variant} size="sm">
                      <span className="flex items-center gap-1">
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Diajukan {item.requestedAt}
                  </span>
                </div>

                {/* Middle: Provider Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-base shrink-0 shadow-xs">
                    {item.providerName ? item.providerName.slice(0, 2).toUpperCase() : "PJ"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 font-display text-sm truncate">
                        {item.providerName}
                      </h3>
                      {item.providerRating && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <Star size={12} weight="fill" />
                          <span>{item.providerRating}</span>
                          {item.providerReviewCount && (
                            <span className="text-slate-400 font-normal">
                              ({item.providerReviewCount})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-indigo-700 font-medium">
                        <Wrench size={13} weight="duotone" />
                        <span>{item.providerSpecialization || "Teknisi Pendingin Ruangan"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin size={13} weight="duotone" />
                        <span>{item.providerServiceArea || "Jabodetabek"}</span>
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}

                    {item.status === "REJECTED" && item.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-800 space-y-0.5">
                        <span className="font-bold text-[11px] uppercase tracking-wider block text-rose-700">
                          Alasan Penolakan:
                        </span>
                        <p>{item.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom: Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400">
                    Scope: <strong className="text-slate-700 font-mono">{item.scope}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(item)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Lihat Pengajuan</span>
                      <ArrowRight size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL PENGAJUAN KERJA SAMA (Section 4, 5, 6, 7)                   */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <Modal
          isOpen={Boolean(selectedRequest)}
          onClose={() => {
            setSelectedRequest(null);
            setShowAcceptDialog(false);
            setShowRejectDialog(false);
          }}
          title={`Detail Pengajuan Kemitraan: ${selectedRequest.providerName}`}
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs text-slate-600">
            {/* Confirmation Banner if Dialog Active */}
            {showAcceptDialog && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
                    <CheckCircle size={20} weight="fill" />
                  </span>
                  <div>
                    <h4 className="font-bold text-emerald-950 font-display text-sm">
                      Terima kerja sama dengan {selectedRequest.providerName}?
                    </h4>
                    <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                      Dengan menyetujui kerja sama ini:
                    </p>
                    <ul className="list-disc list-inside mt-1.5 space-y-1 text-emerald-900 text-[11px]">
                      <li>
                        <strong>{selectedRequest.providerName}</strong> resmi menjadi partner aktif toko Anda.
                      </li>
                      <li>
                        Teknisi resmi provider dapat menemukan dan merekomendasikan produk Anda di lapangan.
                      </li>
                      <li>
                        Toko Anda dapat menerima order suku cadang dari konteks servis provider.
                      </li>
                      <li>
                        Atribusi affiliate & komisi tetap mengikuti regulasi policy resmi Servio.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => setShowAcceptDialog(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAccept}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-xs"
                  >
                    Ya, Terima Kerja Sama
                  </button>
                </div>
              </div>
            )}

            {showRejectDialog && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                    <WarningCircle size={20} weight="fill" />
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-rose-950 font-display text-sm">
                      Tolak pengajuan kerja sama dari {selectedRequest.providerName}?
                    </h4>
                    <p className="text-rose-800 text-xs mt-1">
                      Pilih alasan penolakan untuk menginformasikan penyedia jasa:
                    </p>

                    <div className="mt-2.5 space-y-2">
                      {[
                        "Tidak sesuai kebutuhan bisnis",
                        "Area layanan tidak sesuai",
                        "Kategori produk tidak sesuai",
                        "Alasan lainnya",
                      ].map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-2 cursor-pointer text-slate-800 text-xs font-medium"
                        >
                          <input
                            type="radio"
                            name="rejectReason"
                            value={opt}
                            checked={rejectReason === opt}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}

                      {rejectReason === "Alasan lainnya" && (
                        <textarea
                          value={customRejectNote}
                          onChange={(e) => setCustomRejectNote(e.target.value)}
                          placeholder="Tuliskan alasan penolakan spesifik..."
                          rows={2}
                          className="w-full mt-1.5 p-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReject}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs shadow-xs"
                  >
                    Ya, Tolak Pengajuan
                  </button>
                </div>
              </div>
            )}

            {/* Provider Profile Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-indigo-700 flex items-center justify-center font-bold text-xl shrink-0 shadow-xs border border-indigo-200">
                {selectedRequest.providerName ? selectedRequest.providerName.slice(0, 2).toUpperCase() : "PJ"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {selectedRequest.providerName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <ShieldCheck size={12} weight="fill" />
                    Mitra Terverifikasi
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-slate-700 flex-wrap">
                  {selectedRequest.providerRating && (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star size={14} weight="fill" />
                      {selectedRequest.providerRating} ({selectedRequest.providerReviewCount || 100}+ ulasan)
                    </span>
                  )}
                  <span>•</span>
                  <span>
                    Area: <strong className="text-slate-900">{selectedRequest.providerServiceArea || "Jabodetabek"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Jumlah Layanan: <strong className="text-slate-900">{selectedRequest.providerServiceCount || 12} Layanan</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {selectedRequest.providerDescription ||
                    "Penyedia jasa pemeliharaan pendingin udara dan instalasi kelistrikan bergaransi resmi Servio."}
                </p>
              </div>
            </div>

            {/* Request Context & Compatibility */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <FileText size={16} weight="duotone" className="text-indigo-600" />
                <span>Informasi Pengajuan & Kompatibilitas</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Request ID
                  </span>
                  <strong className="text-slate-900 font-mono">{selectedRequest.id}</strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Tanggal Pengajuan
                  </span>
                  <strong className="text-slate-900">{selectedRequest.requestedAt}</strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cakupan Kerja Sama (Scope)
                  </span>
                  <strong className="text-slate-900 font-mono">{selectedRequest.scope}</strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Status Saat Ini
                  </span>
                  <strong className="text-indigo-700">{selectedRequest.status}</strong>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                    Pesan Pengajuan dari Provider:
                  </span>
                  <p className="text-xs text-slate-700 italic">&ldquo;{selectedRequest.notes}&rdquo;</p>
                </div>
              )}

              {selectedRequest.productCategories && selectedRequest.productCategories.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Kategori Suku Cadang yang Dibutuhkan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRequest.productCategories.map((cat) => (
                      <span
                        key={cat}
                        className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.approvedAt && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  Kerja sama ini telah <strong>DISETUJUI</strong> pada: {selectedRequest.approvedAt}
                </div>
              )}

              {selectedRequest.rejectedAt && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-0.5">
                  <p>
                    Pengajuan kerja sama <strong>DITOLAK</strong> pada: {selectedRequest.rejectedAt}
                  </p>
                  <p className="text-[11px] font-medium">Alasan: {selectedRequest.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Read-Only Policy Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-500">
              <Info size={16} weight="fill" className="text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Kemitraan formal menghubungkan katalog toko dengan jaringan teknisi penyedia jasa. Penetapan reward afiliasi sepenuhnya dikendalikan oleh sistem kebijakan Servio saat pesanan servis selesai.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setShowAcceptDialog(false);
                  setShowRejectDialog(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                Tutup
              </button>

              {/* Only show decision CTA if request is PENDING */}
              {selectedRequest.status === "PENDING" && !showAcceptDialog && !showRejectDialog && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectDialog(true)}
                    className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAcceptDialog(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Terima Kerja Sama</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
