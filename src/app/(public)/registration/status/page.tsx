"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { registrationApi, RegistrationApplicationData } from "@/lib/servioApi";
import {
  Clock,
  CheckCircle,
  WarningCircle,
  XCircle,
  UploadSimple,
  SpinnerGap,
  ArrowRight,
  ArrowLeft,
  FileText,
  ShieldCheck,
  Building,
  CalendarBlank,
} from "@phosphor-icons/react";

function RegistrationStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id") || "";

  const [searchId, setSearchId] = useState(idFromUrl);
  const [application, setApplication] = useState<RegistrationApplicationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unified multi-file revision state
  const [revisionFiles, setRevisionFiles] = useState<Record<string, File>>({});
  const [uploadingAll, setUploadingAll] = useState(false);
  const [replacementSuccess, setReplacementSuccess] = useState(false);

  const fetchApplication = async (appId: string) => {
    if (!appId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await registrationApi.getApplication(appId);
      if (res.data) {
        setApplication(res.data);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Pendaftaran tidak ditemukan. Periksa kembali nomor pendaftaran Anda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idFromUrl) {
      fetchApplication(idFromUrl);
    }
  }, [idFromUrl]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplication(searchId);
  };

  const requestedRevisionTypes = React.useMemo(() => {
    if (!application || application.status !== "REVISION_REQUIRED") return [];
    const types = application.revisionDocTypes || (application as any).requiredChanges || (application as any).required_changes;
    if (Array.isArray(types) && types.length > 0) {
      return types;
    }
    return (application.documents || [])
      .filter((d) => d.status === "REVISION_REQUIRED" || d.status === "REPLACEMENT_REQUIRED" || Boolean((d as any).is_deleted_for_revision))
      .map((d) => d.documentType);
  }, [application]);

  const handleUploadAllRevisions = async () => {
    if (!application || requestedRevisionTypes.length === 0) return;

    setUploadingAll(true);
    setErrorMsg(null);
    try {
      for (const docType of requestedRevisionTypes) {
        const file = revisionFiles[docType];
        if (file) {
          await registrationApi.uploadDocument(application.id, docType, file);
        }
      }

      // Resubmit application revision to transition from REVISION_REQUIRED to PENDING_REVIEW
      const res = await registrationApi.resubmitApplication(application.id);
      
      const appCode = application.registrationNumber || (application as any).application_code || application.id;

      // 1. Immediately update state so the UI flips to PENDING_REVIEW reactively without manual search
      if (res?.data) {
        setApplication({ ...res.data });
      } else {
        setApplication((prev) => (prev ? { ...prev, status: "PENDING_REVIEW" } : null));
      }
      
      setReplacementSuccess(true);
      setRevisionFiles({});

      // 2. Smoothly scroll up so user immediately sees the success banner & updated status
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 120, behavior: "smooth" });
      }

      // 3. Background re-fetch to ensure fresh server documents & decisions are completely synced
      try {
        const fresh = await registrationApi.getApplication(appCode);
        if (fresh?.data) {
          setApplication({ ...fresh.data });
        }
      } catch (freshErr) {
        console.warn("Background refresh detail notice:", freshErr);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengunggah dokumen pengganti.");
    } finally {
      setUploadingAll(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Navigation Bar / Back button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/auth/register");
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-50 transition shadow-servio-xs cursor-pointer group"
          >
            <ArrowLeft size={16} weight="bold" className="text-neutral-slate group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali</span>
          </button>

          <Link
            href="/"
            className="text-xs font-semibold text-neutral-slate hover:text-primary transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Beranda
          </Link>
        </div>

        {/* Search header if accessed directly */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-servio-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold font-display text-neutral-dark">
                Pantau Status Pendaftaran Bisnis
              </h1>
              <p className="text-xs text-neutral-slate mt-0.5">
                Masukkan nomor pendaftaran (APP-XXXX), nomor handphone (0858xxxx), atau alamat email pendaftar untuk mengecek tahapan verifikasi dokumen Anda.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Contoh: APP-2026-302465, 085830208131, atau email@gmail.com"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-60 transition flex items-center gap-1.5"
            >
              {loading ? <SpinnerGap size={16} className="animate-spin" /> : <span>Cari Status</span>}
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
            <span>{errorMsg}</span>
          </div>
        )}

        {replacementSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle size={18} className="shrink-0 text-emerald-600" weight="fill" />
            <span>Dokumen perbaikan berhasil diunggah. Status pendaftaran telah diperbarui menjadi RESUBMITTED.</span>
          </div>
        )}

        {/* Application Status Card (Section 45 & 46) */}
        {application && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-[11px] font-semibold text-neutral-slate uppercase tracking-wider block">
                  Nomor Pendaftaran
                </span>
                <span className="text-xl font-bold font-mono text-neutral-dark">
                  {application.registrationNumber}
                </span>
                <p className="text-xs text-neutral-muted mt-0.5">
                  Mitra {application.applicantType === "SERVICE_PROVIDER" ? "Provider Jasa" : application.applicantType === "MERCHANT" ? "Merchant" : "Supplier B2B"} • {application.businessData?.brandName || application.businessData?.legalName || "Nama Usaha"}
                </p>
              </div>

              {/* Status Badge */}
              <div>
                {application.status === "UNDER_REVIEW" || application.status === "RESUBMITTED" || application.status === "SUBMITTED" || application.status === "PENDING_REVIEW" ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                    <Clock size={16} weight="fill" className="text-amber-500 animate-pulse" />
                    <span>{application.status === "PENDING_REVIEW" || application.status === "RESUBMITTED" ? "Sedang Ditinjau Kembali" : "Menunggu Review Admin"}</span>
                  </span>
                ) : application.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                    <span>Pendaftaran Disetujui (Approved)</span>
                  </span>
                ) : application.status === "REVISION_REQUIRED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                    <WarningCircle size={16} weight="fill" className="text-rose-600" />
                    <span>Perlu Revisi Dokumen</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                    <XCircle size={16} weight="fill" />
                    <span>{application.status}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Revision Resubmitted Banner */}
            {(application.status === "PENDING_REVIEW" || application.status === "RESUBMITTED") && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Clock size={18} className="text-amber-600 animate-pulse" weight="fill" />
                  <span>Dokumen Pengganti Sedang Ditinjau Kembali</span>
                </div>
                <p className="text-neutral-slate leading-relaxed">
                  Berkas perbaikan dokumen telah berhasil diterima dan sedang dalam antrean verifikasi ulang oleh Tim Verifikator Operasional SERVIO. Harap pantau halaman ini secara berkala.
                </p>
              </div>
            )}

            {/* Revision Required Banner (Section 46) */}
            {application.status === "REVISION_REQUIRED" && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <WarningCircle size={18} className="text-amber-600" weight="fill" />
                  <span>Catatan dari Tim Verifikator Operasional:</span>
                </div>
                <p className="text-xs text-amber-800 bg-white/70 p-3 rounded-xl border border-amber-200/60 leading-relaxed">
                  {application.reviewNote || "Terdapat dokumen yang tidak terbaca atau memerlukan perbaikan. Silakan unggah dokumen pengganti di bawah ini."}
                </p>
              </div>
            )}

            {/* Approved Message */}
            {application.status === "APPROVED" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle size={18} className="text-emerald-600" weight="fill" />
                  <span>Selamat! Akun Mitra Anda Telah Aktif</span>
                </div>
                <p>
                  Pendaftaran bisnis Anda telah diverifikasi oleh tim Admin SERVIO. Akun Anda kini berstatus <strong>ACTIVE</strong>. Silakan login ke dashboard workspace Anda.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition"
                >
                  <span>Masuk ke Workspace Mitra</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Documents Checklist (Section 46) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-neutral-dark uppercase tracking-wider">
                  Status Dokumen yang Dilampirkan
                </h3>
                {application.status === "REVISION_REQUIRED" && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {requestedRevisionTypes.length} Dokumen Memerlukan Perbaikan
                  </span>
                )}
                {(application.status === "PENDING_REVIEW" || application.status === "RESUBMITTED") && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Semua Berkas Revisi Telah Dikirim
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {application.documents.map((doc) => {
                  const typeLabels: Record<string, string> = {
                    KTP_PIC: "Identitas Penanggung Jawab (KTP)",
                    NPWP_BISNIS: "NPWP Badan / Usaha",
                    NIB: "Nomor Induk Berusaha (NIB)",
                    FOTO_TOKO: "Foto Fisik Plang & Ruko Toko",
                    FOTO_BENGKEL: "Foto Fisik Bengkel / Workshop",
                    AKTA_PERUSAHAAN: "Akta Pendirian PT / SK Kemenkumham",
                  };
                  const label = typeLabels[doc.documentType] || doc.documentType;
                  const isThisDocForRevision = requestedRevisionTypes.includes(doc.documentType);

                  return (
                    <div
                      key={doc.id || doc.documentType}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition overflow-hidden ${
                        isThisDocForRevision
                          ? "bg-rose-50/40 border-rose-300"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          isThisDocForRevision
                            ? "bg-rose-100 text-rose-700 border-rose-200"
                            : "bg-white text-neutral-dark border-slate-200"
                        }`}>
                          <FileText size={20} weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-neutral-dark text-xs truncate max-w-[220px] sm:max-w-[260px]">{label}</span>
                            <span className="text-[10px] font-mono text-neutral-slate bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {doc.documentType}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] mt-0.5 block truncate max-w-full ${isThisDocForRevision ? "text-rose-700 font-medium" : "text-neutral-slate"}`}
                            title={doc.fileName || undefined}
                          >
                            {isThisDocForRevision
                              ? "Berkas diminta verifikator untuk diperbaiki & diunggah ulang."
                              : doc.fileName || "Dokumen telah diunggah dan diverifikasi sah"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        {isThisDocForRevision ? (
                          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                            <WarningCircle size={14} weight="fill" className="text-rose-600 shrink-0" />
                            <span>Perlu Revisi Dokumen</span>
                          </span>
                        ) : (application.status === "PENDING_REVIEW" || application.status === "RESUBMITTED") && (doc.status === "PENDING" || (application.revisionDocTypes || []).includes(doc.documentType)) ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 whitespace-nowrap">
                            <Clock size={14} weight="fill" className="text-amber-500 shrink-0" />
                            <span>Revisi Terkirim (Menunggu Review)</span>
                          </span>
                        ) : application.status === "REVISION_REQUIRED" ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap">
                            <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                            <span>Dokumen Sah / Sesuai</span>
                          </span>
                        ) : doc.status === "APPROVED" ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 whitespace-nowrap">
                            <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                            <span>Disetujui</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 whitespace-nowrap">
                            <Clock size={14} weight="fill" className="text-amber-500 shrink-0" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unified Form Unggah Berkas Pengganti (Khusus Dokumen yang Direvisi) */}
            {application.status === "REVISION_REQUIRED" && requestedRevisionTypes.length > 0 && (
              <div className="p-6 rounded-3xl border-2 border-amber-300 bg-amber-50/40 space-y-5 animate-fadeIn shadow-servio-xs">
                <div className="border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <WarningCircle size={22} className="text-amber-600" weight="fill" />
                    <h3 className="font-bold text-sm text-neutral-dark">
                      Form Unggah Dokumen Perbaikan ({requestedRevisionTypes.length} Dokumen Diperlukan)
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                    Hanya dokumen yang tercantum di bawah ini yang perlu dan dapat diperbaiki. Dokumen lain telah sah dan tidak dapat diubah.
                  </p>
                </div>

                <div className="space-y-4">
                  {requestedRevisionTypes.map((docType, idx) => {
                    const typeLabels: Record<string, string> = {
                      KTP_PIC: "Identitas Penanggung Jawab (KTP)",
                      NPWP_BISNIS: "NPWP Badan / Toko / Usaha",
                      NIB: "Nomor Induk Berusaha (NIB)",
                      FOTO_TOKO: "Foto Fisik Plang & Ruko Toko",
                      FOTO_BENGKEL: "Foto Fisik Bengkel / Workshop",
                      AKTA_PERUSAHAAN: "Akta Pendirian PT / SK Kemenkumham",
                    };
                    const label = typeLabels[docType] || docType;
                    const selectedFile = revisionFiles[docType];

                    return (
                      <div
                        key={docType}
                        className="p-4 rounded-2xl bg-white border border-amber-200 shadow-servio-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-dark flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{label}</span>
                            <span className="font-mono text-[10px] text-neutral-slate bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                              {docType}
                            </span>
                          </label>
                          {selectedFile ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle size={12} weight="fill" /> Berkas Terpilih
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Wajib Diunggah
                            </span>
                          )}
                        </div>

                        <label className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-xs ${
                          selectedFile
                            ? "border-emerald-400 bg-emerald-50/20"
                            : "border-slate-300 hover:border-primary/50 bg-slate-50/50 hover:bg-slate-50"
                        }`}>
                          <UploadSimple size={24} className={selectedFile ? "text-emerald-600 mb-1" : "text-primary mb-1"} />
                          <span className="font-bold text-neutral-dark">
                            {selectedFile ? selectedFile.name : `Pilih Berkas Pengganti: ${label}`}
                          </span>
                          <span className="text-[11px] text-neutral-slate mt-0.5 font-mono">
                            {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : "Format: PDF, JPG, PNG (Maks 5MB)"}
                          </span>
                          <input
                            type="file"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                const f = e.target.files[0];
                                setRevisionFiles(prev => ({ ...prev, [docType]: f }));
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                {/* Submit All Revisions button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={
                      uploadingAll ||
                      requestedRevisionTypes.some((t) => !revisionFiles[t])
                    }
                    onClick={handleUploadAllRevisions}
                    className="w-full py-3.5 px-5 rounded-2xl bg-primary text-white font-bold text-xs shadow-servio-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploadingAll ? (
                      <>
                        <SpinnerGap size={18} className="animate-spin" />
                        <span>Mengunggah Seluruh Berkas &amp; Mengajukan Ulang...</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Dokumen Pengganti (Resubmit)</span>
                        <ArrowRight size={16} weight="bold" />
                      </>
                    )}
                  </button>
                  {requestedRevisionTypes.some((t) => !revisionFiles[t]) && (
                    <p className="text-[11px] text-center text-amber-800 mt-2 font-medium">
                      * Harap pilih berkas untuk semua ({requestedRevisionTypes.length}) dokumen yang diminta revisi sebelum mengirim.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Informational Card when documents have been submitted and are under review */}
            {(application.status === "PENDING_REVIEW" || application.status === "RESUBMITTED" || application.status === "UNDER_REVIEW") && (
              <div className="p-6 rounded-3xl border border-amber-200 bg-amber-50/50 space-y-4 shadow-servio-xs animate-fadeIn">
                <div className="flex items-center gap-3 border-b border-amber-200/80 pb-3">
                  <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                    <Clock size={22} weight="fill" className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-dark">
                      Berkas Pengganti Berhasil Terkirim — Menunggu Verifikasi Admin
                    </h3>
                    <p className="text-xs text-neutral-slate mt-0.5">
                      Dokumen perbaikan Anda telah masuk ke sistem operasional SERVIO dan sedang ditinjau ulang oleh tim verifikator.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-neutral-dark uppercase tracking-wider block">
                    Dokumen Perbaikan yang Telah Masuk:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {application.documents
                      .filter((d) => (application.revisionDocTypes || []).includes(d.documentType) || d.status === "PENDING")
                      .map((d) => {
                        const typeLabels: Record<string, string> = {
                          KTP_PIC: "Identitas Penanggung Jawab (KTP)",
                          NPWP_BISNIS: "NPWP Badan / Usaha",
                          NIB: "Nomor Induk Berusaha (NIB)",
                          FOTO_TOKO: "Foto Fisik Plang & Ruko Toko",
                          FOTO_BENGKEL: "Foto Fisik Bengkel / Workshop",
                          AKTA_PERUSAHAAN: "Akta Pendirian PT / SK Kemenkumham",
                        };
                        return (
                          <div key={d.id} className="p-3 bg-white rounded-xl border border-amber-200/80 flex items-center justify-between text-xs shadow-2xs">
                            <div className="flex items-center gap-2.5 truncate">
                              <CheckCircle size={18} weight="fill" className="text-emerald-600 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-neutral-dark block truncate">{typeLabels[d.documentType] || d.documentType}</span>
                                <span className="text-[10px] text-neutral-slate font-mono truncate block">{d.fileName || d.documentType}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-full shrink-0 border border-amber-200">
                              Telah Diunggah
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/90 border border-amber-200/60 text-xs text-neutral-slate flex items-start gap-2.5">
                  <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" weight="fill" />
                  <span className="leading-relaxed">
                    Anda tidak perlu mengunggah ulang dokumen lagi. Verifikasi dokumen dilakukan secara bertahap dalam antrean resmi verifikator kami (1x24 jam kerja). Status akan otomatis diperbarui setelah admin selesai memeriksa.
                  </span>
                </div>
              </div>
            )}

            {/* Timeline meta */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-slate">
              <div className="flex items-center gap-1.5">
                <CalendarBlank size={14} />
                <span>Diajukan: {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString("id-ID") : "Draf"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" weight="fill" />
                <span>Pemeriksaan Resmi Tim Kepatuhan SERVIO</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegistrationStatusPage() {
  return (
    <Suspense fallback={<div className="h-60 flex items-center justify-center text-xs text-neutral-slate">Memuat status pendaftaran...</div>}>
      <RegistrationStatusContent />
    </Suspense>
  );
}
