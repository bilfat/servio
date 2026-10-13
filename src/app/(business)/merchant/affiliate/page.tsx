"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkle,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  Handshake,
  ClipboardText,
  Bank,
  ArrowRight,
  Info,
  Clock,
  UserCheck,
  Check,
  X,
  FileText,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/feedback/Toast";

export default function MerchantAffiliateProgramPage() {
  const repo = useDomainRepository();
  const currentMerchantId = "merch-01"; // Sejuk Sentra Part AC

  const profile = repo.getMerchantProfile(currentMerchantId);
  const readiness = repo.checkMerchantAffiliateEligibility(currentMerchantId);
  const activePartnerships = repo.getMerchantPartnerships(currentMerchantId).filter((p) => p.status === "ACTIVE");
  const affiliateOrders = repo.merchantOrders.filter(
    (o) => o.orderSource === "SERVICE_RECOMMENDATION" || !!o.affiliateAttribution
  );

  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleEnroll = () => {
    if (!agreedTerms) {
      setToastMessage("Harap setujui Syarat & Ketentuan Program Afiliasi terlebih dahulu.");
      return;
    }
    const res = repo.enrollMerchantAffiliate(
      currentMerchantId,
      "AFF-TERMS-v1.0",
      profile?.responsiblePerson || "Pemilik Toko"
    );
    setTermsModalOpen(false);
    setToastMessage(res.message);
  };

  const handleDeactivate = () => {
    const res = repo.deactivateMerchantAffiliate(currentMerchantId);
    setDeactivateModalOpen(false);
    setToastMessage(res.message);
  };

  const handleReactivate = () => {
    const res = repo.reactivateMerchantAffiliate(currentMerchantId);
    setToastMessage(res.message);
  };

  const getStatusBadge = () => {
    switch (profile?.affiliateStatus) {
      case "ACTIVE":
        return <Badge variant="success" size="md">AFILIASI AKTIF</Badge>;
      case "ELIGIBLE":
        return <Badge variant="primary" size="md">MEMENUHI SYARAT (ELIGIBLE)</Badge>;
      case "INACTIVE":
        return <Badge variant="neutral" size="md">NONAKTIF</Badge>;
      case "SUSPENDED":
        return <Badge variant="danger" size="md">DITANGGUHKAN</Badge>;
      case "NOT_ELIGIBLE":
      default:
        return <Badge variant="warning" size="md">BELUM ELIGIBLE</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {/* Toast */}
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
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Program Kemitraan Komersial
              </span>
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
              Partisipasi Program Afiliasi Toko
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Saluran komersial resmi yang menghubungkan toko suku cadang Anda dengan jaringan bengkel dan teknisi lapangan Servio melalui rekomendasi berbayar yang sah.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {profile?.affiliateStatus === "ELIGIBLE" && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setTermsModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 flex items-center gap-1.5 shadow-xs"
              >
                <Sparkle size={16} weight="fill" />
                <span>Daftar / Aktifkan Afiliasi</span>
              </Button>
            )}

            {profile?.affiliateStatus === "ACTIVE" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeactivateModalOpen(true)}
                className="text-slate-600 border-slate-300 hover:bg-slate-100"
              >
                Nonaktifkan Program
              </Button>
            )}

            {profile?.affiliateStatus === "INACTIVE" && (
              <Button
                variant="primary"
                size="md"
                onClick={handleReactivate}
                className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <CheckCircle size={16} weight="bold" />
                <span>Aktifkan Kembali</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-purple-200/80 p-5 shadow-xs bg-gradient-to-br from-white to-purple-50/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Tarif Affiliate Fee Platform
            </span>
            <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Bank size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-purple-950">5%</p>
          <p className="text-[11px] text-purple-700">
            Dari subtotal suku cadang pesanan rekomendasi resmi
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kemitraan Bengkel Aktif
            </span>
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Handshake size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            {activePartnerships.length} Bengkel Mitra
          </p>
          <p className="text-[11px] text-slate-500">
            Dapat merekomendasikan stok suku cadang toko Anda
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pesanan Teratribusi Afiliasi
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ClipboardText size={18} weight="bold" />
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-slate-900">
            {affiliateOrders.length} Pesanan
          </p>
          <p className="text-[11px] text-slate-500">
            Hasil rekomendasi resmi teknisi yang telah disetujui pelanggan
          </p>
        </div>
      </div>

      {/* Readiness Checklist Card (Section 7 & 72) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
              <ShieldCheck size={20} weight="fill" className="text-primary" />
              <span>Daftar Kesiapan Afiliasi Toko (Readiness Checklist)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standar kelayakan bisnis, profil produk, dan pemenuhan ketentuan operasional toko sebelum dapat menerima pesanan berbasis rekomendasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Status Kelayakan:</span>
            {readiness.isEligible ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle size={14} weight="fill" />
                <span>Memenuhi Syarat</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <WarningCircle size={14} weight="fill" />
                <span>Belum Lengkap</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {readiness.checklist.map((item) => (
            <div
              key={item.key}
              className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                item.passed
                  ? "bg-slate-50/60 border-slate-200/80"
                  : "bg-rose-50/50 border-rose-200"
              }`}
            >
              <span
                className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                  item.passed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {item.passed ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.passed && (
                    <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                      Terverifikasi
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Affiliate Terms Agreement Versioning Info (Section 8 & 71) */}
        <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <FileText size={20} weight="duotone" className="text-purple-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-purple-950 block">
                Persetujuan Syarat &amp; Ketentuan Afiliasi (Versioned Agreement)
              </span>
              {profile?.affiliateTermsAccepted ? (
                <span className="text-slate-500 text-[11px]">
                  Telah disetujui versi <strong>{profile.affiliateTermsVersion || "AFF-TERMS-v1.0"}</strong> oleh{" "}
                  <strong>{profile.affiliateAcceptedBy}</strong> pada{" "}
                  {profile.affiliateAcceptedAt ? new Date(profile.affiliateAcceptedAt).toLocaleDateString("id-ID") : "2026-09-01"}.
                </span>
              ) : (
                <span className="text-amber-800 text-[11px]">
                  Toko belum menandatangani Syarat &amp; Ketentuan Program Afiliasi Servio.
                </span>
              )}
            </div>
          </div>

          {!profile?.affiliateTermsAccepted && readiness.isEligible && (
            <button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 underline shrink-0"
            >
              Baca &amp; Setujui Ketentuan
            </button>
          )}
        </div>
      </div>

      {/* Contextual Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/business/merchant/partnerships/requests"
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-primary/40 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-sky-50 text-sky-700 group-hover:scale-105 transition-transform">
              <Handshake size={22} weight="duotone" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengajuan Kerja Sama Bengkel
              </h3>
              <p className="text-xs text-slate-500">
                Kelola permintaan kemitraan dari bengkel dan penyedia jasa Servio
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
        </Link>

        <Link
          href="/business/merchant/orders?source=AFFILIATE"
          className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-300 transition group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-purple-50 text-purple-700 group-hover:scale-105 transition-transform">
              <Sparkle size={22} weight="fill" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Pesanan Afiliasi
              </h3>
              <p className="text-xs text-slate-500">
                Tinjau seluruh pesanan masuk yang teratribusi rekomendasi teknisi
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-purple-700 transition-colors" />
        </Link>
      </div>

      {/* Modal Terms Acceptance (Section 8 & 71) */}
      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Syarat & Ketentuan Program Afiliasi Toko (AFF-TERMS-v1.0)"
      >
        <div className="space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <p className="font-bold text-slate-900">Informasi Perjanjian:</p>
            <p className="text-[11px] text-slate-600">
              Dokumen: <strong>Servio Affiliate Merchant Agreement v1.0</strong> | Kebijakan: <strong>AFF-001</strong>
            </p>
            <p className="text-[11px] text-slate-600">
              Toko: <strong>{profile?.businessName}</strong> ({profile?.merchantId})
            </p>
          </div>

          <div className="space-y-2 leading-relaxed">
            <h4 className="font-bold text-slate-900">1. Prinsip & Pemotongan Fee Komersial</h4>
            <p className="text-slate-600">
              Toko menyetujui bahwa pesanan suku cadang yang bersumber dari rekomendasi resmi teknisi Servio (SERVICE_RECOMMENDATION) akan dikenakan <strong>Affiliate Fee sebesar 5%</strong> dari Subtotal Barang yang eligible.
            </p>
            <p className="text-slate-600">
              Affiliate Fee dipotong dari nilai penyelesaian dana (Merchant Settlement) dan <strong>bukan merupakan beban biaya tambahan bagi pelanggan (No Customer Surcharge)</strong>.
            </p>

            <h4 className="font-bold text-slate-900 mt-3">2. Tanggung Jawab Fulfillment & Kualitas</h4>
            <p className="text-slate-600">
              Toko wajib menyediakan suku cadang yang asli, sesuai spesifikasi yang direkomendasikan, dan melakukan proses pengemasan tepat waktu sesuai SLA fulfillment.
            </p>

            <h4 className="font-bold text-slate-900 mt-3">3. Atribusi & Pembatalan / Retur</h4>
            <p className="text-slate-600">
              Jika pesanan dibatalkan atau barang diretur/refund, maka pembagian reward reward afiliasi akan dibatalkan/direverse sesuai kebijakan perlindungan transaksi platform.
            </p>

            <h4 className="font-bold text-slate-900 mt-3">4. Hak Pengunduran Diri</h4>
            <p className="text-slate-600">
              Toko berhak menonaktifkan keikutsertaan program sewaktu-waktu. Penonaktifan program tidak memengaruhi pesanan historis yang telah diselesaikan.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-slate-900 font-semibold leading-tight">
                Saya telah membaca, memahami, dan menyetujui seluruh ketentuan Program Afiliasi Toko Servio versi AFF-TERMS-v1.0.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="md" onClick={() => setTermsModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!agreedTerms}
              onClick={handleEnroll}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Setujui &amp; Aktifkan Program
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Deactivation Confirmation */}
      <Modal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title="Konfirmasi Nonaktifkan Program Afiliasi"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
            <p className="font-bold">Perhatian Penonaktifan:</p>
            <p className="text-[11px]">
              Setelah dinonaktifkan, teknisi lapangan tidak lagi dapat memilih toko Anda sebagai rekomendasi suku cadang berbayar reward.
            </p>
            <p className="text-[11px]">
              Seluruh pesanan dan pencairan dana terdahulu tetap berlaku dan tidak akan terhapus.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="md" onClick={() => setDeactivateModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleDeactivate}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Nonaktifkan Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
