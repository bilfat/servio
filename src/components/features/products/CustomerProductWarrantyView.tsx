"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldPlus,
  Clock,
  WarningCircle,
  CheckCircle,
  Package,
  Storefront,
  ArrowRight,
  Camera,
  X,
  ArrowsClockwise,
  Receipt,
  Wrench,
} from "@phosphor-icons/react";
import { warrantiesApi, productOrdersApi } from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";

export type ProductWarrantySubTab =
  | "PERLU_DIAKTIFKAN"
  | "GARANSI_AKTIF"
  | "KLAIM_GARANSI"
  | "RIWAYAT_PERLINDUNGAN";

function CustomerProductWarrantyInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSubTab = (searchParams.get("subTab") as ProductWarrantySubTab) || "GARANSI_AKTIF";
  const [activeSubTab, setActiveSubTab] = useState<ProductWarrantySubTab>(initialSubTab);

  // Sync when searchParams changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("subTab") as ProductWarrantySubTab;
    if (tabFromUrl && ["PERLU_DIAKTIFKAN", "GARANSI_AKTIF", "KLAIM_GARANSI", "RIWAYAT_PERLINDUNGAN"].includes(tabFromUrl)) {
      setActiveSubTab(tabFromUrl);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isActivatingOrder, setIsActivatingOrder] = useState<string | null>(null);

  // Data states
  const [warranties, setWarranties] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([]);

  // Claim Modal states
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<any | null>(null);
  const [claimReason, setClaimReason] = useState("Kerusakan komponen bawaan / malfungsi kelistrikan");
  const [claimDescription, setClaimDescription] = useState("");
  const [claimPhotos, setClaimPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  ]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Respond Need More Information Modal states
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [selectedClaimForRespond, setSelectedClaimForRespond] = useState<any | null>(null);
  const [respondNotes, setRespondNotes] = useState("");
  const [respondPhotos, setRespondPhotos] = useState<string[]>([]);
  const [isSubmittingRespond, setIsSubmittingRespond] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wRes, cRes, oRes] = await Promise.all([
        warrantiesApi.list().catch(() => ({ data: [] })),
        warrantiesApi.listClaims().catch(() => ({ data: [] })),
        productOrdersApi.list().catch(() => ({ data: [] })),
      ]);

      if (wRes && Array.isArray(wRes.data)) {
        setWarranties(wRes.data);
      }
      if (cRes && Array.isArray(cRes.data)) {
        setClaims(cRes.data);
      }
      if (oRes && Array.isArray(oRes.data)) {
        const delivered = oRes.data.filter(
          (o: any) => o.status === "DELIVERED" || o.status === "COMPLETED"
        );
        setDeliveredOrders(delivered);
      }
    } catch (err) {
      console.warn("Could not load product warranty data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmReceived = async (orderId: string) => {
    setIsActivatingOrder(orderId);
    try {
      await productOrdersApi.confirmReceived(orderId);
      setToastMessage("Penerimaan barang berhasil dikonfirmasi! Garansi resmi otomatis aktif.");
      await loadData();
      setActiveSubTab("GARANSI_AKTIF");
    } catch (err: any) {
      alert(err.message || "Gagal mengonfirmasi penerimaan barang.");
    } finally {
      setIsActivatingOrder(null);
    }
  };

  // Filtered Entitlements
  const activeWarranties = warranties.filter(
    (w) => w.status === "ACTIVE" || (!w.status && !w.isExpired)
  );
  const expiredWarranties = warranties.filter((w) => w.status === "EXPIRED" || w.isExpired);

  const handleOpenClaimModal = (w?: any) => {
    const target = w || activeWarranties[0];
    if (!target) {
      alert("Tidak ada garansi produk aktif yang memenuhi syarat klaim.");
      return;
    }
    setSelectedWarranty(target);
    setClaimReason("Kerusakan komponen bawaan / malfungsi kelistrikan");
    setClaimDescription("");
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;
    if (!claimReason.trim()) {
      alert("Harap tentukan alasan klaim.");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const targetWarrantyId = selectedWarranty.warrantyId || selectedWarranty.id;
      await warrantiesApi.createClaim(targetWarrantyId, {
        reason: claimReason.trim(),
        description: claimDescription.trim(),
        evidenceMedia: claimPhotos.map((url) => ({
          url,
          type: "PHOTO",
          description: "Foto bukti kendala fisik / komponen",
        })),
      });

      setToastMessage("Klaim garansi produk berhasil diajukan dan sedang ditinjau Merchant!");
      setIsClaimModalOpen(false);
      await loadData();
      setActiveSubTab("KLAIM_GARANSI");
    } catch (err: any) {
      alert(err.message || "Gagal mengajukan klaim garansi produk.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForRespond) return;
    if (!respondNotes.trim()) {
      alert("Harap berikan catatan atau penjelasan.");
      return;
    }

    setIsSubmittingRespond(true);
    try {
      await warrantiesApi.respondNeedMoreInfo(selectedClaimForRespond.claimId, {
        notes: respondNotes.trim(),
        additionalEvidence: respondPhotos.map((url) => ({
          url,
          type: "PHOTO",
          description: "Foto bukti klarifikasi tambahan",
        })),
      });

      setToastMessage("Klarifikasi dan bukti tambahan berhasil dikirim ke Merchant!");
      setIsRespondModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Gagal mengirim klarifikasi tambahan.");
    } finally {
      setIsSubmittingRespond(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 SUB-NAVIGATION TABS (Point 5.1 & Section 12-13) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          {
            key: "PERLU_DIAKTIFKAN" as const,
            label: "Perlu Diaktifkan",
            count: deliveredOrders.length,
            badgeClass: "bg-amber-100 text-amber-800",
          },
          {
            key: "GARANSI_AKTIF" as const,
            label: "Garansi Aktif",
            count: activeWarranties.length,
            badgeClass: "bg-emerald-100 text-emerald-800",
          },
          {
            key: "KLAIM_GARANSI" as const,
            label: "Klaim Garansi",
            count: claims.length,
            badgeClass: "bg-sky-100 text-sky-800",
          },
          {
            key: "RIWAYAT_PERLINDUNGAN" as const,
            label: "Riwayat Perlindungan",
            count: expiredWarranties.length,
            badgeClass: "bg-slate-100 text-slate-700",
          },
        ].map((tab) => {
          const isSelected = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
                isSelected
                  ? "border-[#0F4C81] text-[#0F4C81]"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${tab.badgeClass}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: PERLU DIAKTIFKAN */}
      {activeSubTab === "PERLU_DIAKTIFKAN" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Aktivasi Garansi Otomatis:</span> Berdasarkan audit Level 07 & Business Policy SERVIO, garansi resmi toko/pabrik teraktivasi secara otoritatif segera setelah pesanan berstatus <strong>Sampai / Selesai (Delivered)</strong>. Tanggal aktivasi dihitung presisi dari tanggal serah terima barang.
          </div>

          {deliveredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Package size={36} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Tidak ada pesanan produk yang menunggu aktivasi garansi.</p>
              <p className="text-[11px] text-slate-500">Semua produk dari pesanan terkirim telah terdaftar dalam Garansi Aktif.</p>
            </div>
          ) : (
            deliveredOrders.map((ord: any, idx: number) => {
              const orderId = ord.orderId || ord.id || `order-${idx}`;
              return (
              <div
                key={orderId}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800">#{orderId}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-700">{ord.merchantName || "Toko Mitra"}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Telah Diterima
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Selesai: {ord.completedAt ? new Date(ord.completedAt).toLocaleDateString("id-ID") : "Hari Ini"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      {(ord.items && ord.items.map((i: any) => i.title || i.name).join(", ")) || "Produk Suku Cadang"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Perlindungan Garansi Resmi: <strong>{ord.warrantyPolicy?.durationMonths ? `${ord.warrantyPolicy.durationMonths} Bulan` : (ord.items?.[0]?.warrantyDuration ? `${ord.items[0].warrantyDuration} Bulan` : "Garansi Toko & Pabrikan Resmi")}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Cakupan: Cacat manufaktur pabrik, malfungsi kelistrikan komponen resmi SERVIO.
                    </p>
                  </div>

                  {ord.status === "DELIVERED" ? (
                    <button
                      type="button"
                      disabled={isActivatingOrder === (ord.orderId || ord.id)}
                      onClick={() => handleConfirmReceived(ord.orderId || ord.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm shrink-0 disabled:opacity-50"
                    >
                      <ShieldCheck size={16} weight="bold" />
                      <span>{isActivatingOrder === (ord.orderId || ord.id) ? "Mengaktifkan..." : "Konfirmasi Terima & Aktifkan Garansi"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab("GARANSI_AKTIF")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm shrink-0"
                    >
                      <ShieldCheck size={16} weight="bold" />
                      <span>Lihat Garansi Aktif</span>
                    </button>
                  )}
                </div>
              </div>
            );
            })
          )}
        </div>
      )}

      {/* SUB-VIEW 2: GARANSI AKTIF */}
      {activeSubTab === "GARANSI_AKTIF" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Daftar garansi suku cadang dan produk resmi yang sedang berlaku dan dapat diklaim sewaktu-waktu.
            </p>
            {activeWarranties.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenClaimModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm shrink-0"
              >
                <ShieldPlus size={16} weight="bold" />
                <span>Ajukan Klaim Garansi</span>
              </button>
            )}
          </div>

          {activeWarranties.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <ShieldCheck size={40} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Belum Ada Garansi Produk yang Aktif</p>
              <p className="text-[11px] text-slate-500">Beli suku cadang berkualitas dengan jaminan garansi resmi di katalog Servio.</p>
              <Link
                href="/products"
                className="inline-block mt-2 px-5 py-2 bg-[#0F4C81] text-white text-xs font-bold rounded-xl"
              >
                Belanja Produk
              </Link>
            </div>
          ) : (
            activeWarranties.map((w: any, idx: number) => {
              const warrantyKey = w.warrantyId || w.id || `warranty-active-${idx}`;
              return (
              <div
                key={warrantyKey}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#0F4C81]">{warrantyKey}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500">Order: #{w.orderId || "ORD-2026"}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      GARANSI AKTIF
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={14} className="text-emerald-600" />
                    <span>Masa Berlaku: {w.startAt || "-"} s.d. <strong className="text-slate-800">{w.endAt || "-"}</strong> ({w.durationMonths || 6} Bulan)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      {w.productName || w.serviceTitle || "Produk Suku Cadang"} <span className="text-xs font-normal text-slate-500">({w.variantName || "Original"})</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-900 block mb-0.5">Cakupan Perlindungan:</span>
                        <p className="text-slate-600 leading-relaxed">
                          {w.coverage || "Kerusakan fungsi bawaan pabrik, cacat manufaktur, malfungsi kelistrikan komponen resmi."}
                        </p>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-rose-900 block mb-0.5">Pengecualian (Exclusions):</span>
                        <p className="text-slate-600 leading-relaxed">
                          {w.exclusions || "Kerusakan fisik akibat benturan, kesalahan instalasi non-resmi, karat karena air, atau modifikasi."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                    <Link
                      href={`/warranties/${warrantyKey}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs"
                    >
                      <Receipt size={16} />
                      <span>Sertifikat</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenClaimModal(w)}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-sm"
                    >
                      <ShieldPlus size={16} weight="bold" />
                      <span>Klaim Garansi</span>
                    </button>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      )}

      {/* SUB-VIEW 3: KLAIM GARANSI */}
      {activeSubTab === "KLAIM_GARANSI" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Riwayat klaim garansi yang diajukan beserta status verifikasi merchant dan hasil penyelesaian (perbaikan, ganti unit, atau pengembalian dana).
          </p>

          {claims.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <CheckCircle size={40} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Belum Ada Klaim Garansi Diajukan</p>
              <p className="text-[11px] text-slate-500">Seluruh produk Anda berfungsi dengan baik.</p>
            </div>
          ) : (
            claims.map((claim: any, idx: number) => {
              const claimKey = claim.claimId || claim.id || claim.claimNumber || `claim-${idx}`;
              return (
              <div
                key={claimKey}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900">{claim.claimNumber || claimKey}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500">Garansi: #{claim.warrantyId}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        claim.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : claim.status === "APPROVED"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : claim.status === "NEED_MORE_INFORMATION"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : claim.status === "IN_SERVICE"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : claim.status === "REPLACEMENT_PROCESS"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : claim.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {claim.status === "SUBMITTED"
                        ? "Menunggu Tinjauan Merchant"
                        : claim.status === "UNDER_REVIEW"
                        ? "Sedang Ditinjau Merchant"
                        : claim.status === "NEED_MORE_INFORMATION"
                        ? "Butuh Informasi Tambahan"
                        : claim.status === "APPROVED"
                        ? "Klaim Disetujui (Dalam Penanganan)"
                        : claim.status === "IN_SERVICE"
                        ? "Dalam Proses Perbaikan (In Service)"
                        : claim.status === "REPLACEMENT_PROCESS"
                        ? "Proses Pergantian Unit Baru"
                        : claim.status === "REJECTED"
                        ? "Klaim Ditolak"
                        : claim.status === "COMPLETED"
                        ? "Selesai Dituntaskan"
                        : claim.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Diajukan: {claim.submittedAt || "Hari Ini"}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {claim.productName || "Produk Suku Cadang"} {claim.variantName && `(${claim.variantName})`}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Kendala / Alasan: <strong className="text-slate-800">{claim.reason}</strong>
                  </p>
                  {claim.description && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {claim.description}
                    </p>
                  )}

                  {/* Need More Information Prompt Banner & Action */}
                  {claim.status === "NEED_MORE_INFORMATION" && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <WarningCircle size={16} weight="bold" className="text-amber-600" />
                        <span>Catatan Merchant / Support:</span>
                      </div>
                      <p className="text-xs text-amber-800">
                        {claim.needMoreInfoPrompt || "Mohon berikan informasi detail atau foto tambahan terkait kendala unit."}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClaimForRespond(claim);
                          setRespondNotes("");
                          setRespondPhotos([]);
                          setIsRespondModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shadow-xs"
                      >
                        <ArrowsClockwise size={14} weight="bold" />
                        <span>Kirim Informasi / Bukti Tambahan</span>
                      </button>
                    </div>
                  )}

                  {claim.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <strong>Alasan Penolakan:</strong> {claim.rejectionReason}
                    </div>
                  )}
                </div>
              </div>
            );
            })
          )}
        </div>
      )}

      {/* SUB-VIEW 4: RIWAYAT PERLINDUNGAN */}
      {activeSubTab === "RIWAYAT_PERLINDUNGAN" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Arsip garansi yang telah kedaluwarsa atau masa berlaku perlindungannya telah terlewati.
          </p>

          {expiredWarranties.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Clock size={36} className="mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Tidak Ada Riwayat Garansi Kedaluwarsa</p>
              <p className="text-[11px] text-slate-500">Semua produk yang Anda miliki masih terlindungi dalam masa garansi aktif.</p>
            </div>
          ) : (
            expiredWarranties.map((w: any, idx: number) => {
              const warrantyKey = w.warrantyId || w.id || `warranty-expired-${idx}`;
              return (
              <div
                key={warrantyKey}
                className="bg-white rounded-3xl border border-slate-200/70 p-6 opacity-75 hover:opacity-100 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{warrantyKey}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      KEDALUWARSA
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Berakhir: {w.endAt || "-"}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-800">{w.productName || w.serviceTitle || "Produk Suku Cadang"} ({w.variantName || "Original"})</h3>
                <p className="text-[11px] text-slate-400">
                  Masa perlindungan {w.durationMonths ? `${w.durationMonths} bulan` : ""} telah selesai. Hubungi pusat servis untuk perbaikan reguler.
                </p>
              </div>
            );
            })
          )}
        </div>
      )}

      {/* CLAIM SUBMISSION MODAL */}
      <AnimatePresence>
        {isClaimModalOpen && selectedWarranty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Klaim Garansi Suku Cadang & Produk
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                    Ajukan Klaim Garansi Resmi
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Product Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Terdaftar:</span>
                <p className="text-xs font-bold text-slate-900">{selectedWarranty.productName}</p>
                <p className="text-[11px] text-slate-500">
                  Varian: {selectedWarranty.variantName} • Masa Berlaku s.d. <strong>{selectedWarranty.endAt}</strong>
                </p>
              </div>

              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Masalah / Kendala Komponen
                  </label>
                  <input
                    type="text"
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    placeholder="Contoh: Kapasitor bocor, malfungsi relay, dll"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ceritakan Detail Kerusakan
                  </label>
                  <textarea
                    rows={3}
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    placeholder="Jelaskan kapan masalah mulai terjadi, gejala yang terlihat, atau kendala pemasangan..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Foto Bukti Fisik / Kerusakan
                  </label>
                  <div className="flex items-center gap-2">
                    {claimPhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setClaimPhotos((prev) => [
                          ...prev,
                          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80",
                        ])
                      }
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-bold">+ Bukti</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>{isSubmittingClaim ? "Mengirim..." : "Kirim Klaim Garansi"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* RESPOND TO NEED MORE INFORMATION MODAL */}
        {isRespondModalOpen && selectedClaimForRespond && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Klarifikasi Klaim Garansi
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                    Kirim Informasi &amp; Bukti Tambahan
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRespondModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Merchant Prompt Card */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 uppercase">Permintaan Merchant:</span>
                <p className="text-xs text-amber-950 font-medium">
                  {selectedClaimForRespond.needMoreInfoPrompt || "Mohon berikan informasi detail atau foto tambahan terkait kendala unit."}
                </p>
              </div>

              <form onSubmit={handleRespondSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Penjelasan / Tanggapan Anda
                  </label>
                  <textarea
                    rows={4}
                    value={respondNotes}
                    onChange={(e) => setRespondNotes(e.target.value)}
                    placeholder="Tuliskan keterangan detail atau kronologi tambahan yang diminta..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Foto Bukti Tambahan (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    {respondPhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={url} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setRespondPhotos((prev) => [
                          ...prev,
                          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
                        ])
                      }
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-1 transition"
                    >
                      <Camera size={18} />
                      <span className="text-[9px] font-bold">+ Foto</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRespondModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRespond}
                    className="px-6 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle size={16} weight="bold" />
                    <span>{isSubmittingRespond ? "Mengirim..." : "Kirim Tanggapan"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export function CustomerProductWarrantyView() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat garansi produk...</div>}>
      <CustomerProductWarrantyInner />
    </Suspense>
  );
}
