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

  // Replacement modal / upload state
  const [replacementDocType, setReplacementDocType] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [uploadingReplacement, setUploadingReplacement] = useState(false);
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

  const handleUploadReplacement = async () => {
    if (!application || !replacementDocType || !replacementFile) return;

    setUploadingReplacement(true);
    try {
      await registrationApi.uploadDocument(application.id, replacementDocType, replacementFile);
      // Resubmit application
      await registrationApi.submitApplication(application.id);
      setReplacementSuccess(true);
      setReplacementDocType(null);
      setReplacementFile(null);
      await fetchApplication(application.id);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      alert(error.message || "Gagal mengunggah dokumen pengganti.");
    } finally {
      setUploadingReplacement(false);
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
                Masukkan nomor pendaftaran (REG-XXXX) atau alamat email pendaftar untuk mengecek tahapan verifikasi dokumen Anda.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Contoh: REG-2026-0169 atau mitra@email.com"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-60 transition flex items-center gap-1.5"
            >
              {loading ? <SpinnerGap size={16} className="animate-spin" /> : <span>Cari</span>}
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
                {application.status === "UNDER_REVIEW" || application.status === "RESUBMITTED" || application.status === "SUBMITTED" ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                    <Clock size={16} weight="fill" className="text-amber-500 animate-pulse" />
                    <span>Menunggu Review Admin</span>
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
              <h3 className="text-xs font-bold text-neutral-dark uppercase tracking-wider">
                Status Dokumen yang Dilampirkan
              </h3>

              <div className="space-y-2">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-neutral-dark">
                        <FileText size={18} weight="duotone" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-dark">{doc.documentType}</span>
                          <span className="text-[10px] font-mono text-neutral-slate">v{doc.version}</span>
                        </div>
                        <span className="text-[11px] text-neutral-slate truncate max-w-xs block">
                          {doc.fileName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {doc.status === "APPROVED" ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={14} weight="fill" /> Disetujui
                        </span>
                      ) : doc.status === "REPLACEMENT_REQUIRED" || doc.status === "REJECTED" ? (
                        <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <WarningCircle size={14} weight="fill" /> Perlu Penggantian
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                          <Clock size={14} weight="fill" /> Pending Review
                        </span>
                      )}

                      {/* Upload Replacement button if revision is required */}
                      {application.status === "REVISION_REQUIRED" && (
                        <button
                          type="button"
                          onClick={() => setReplacementDocType(doc.documentType)}
                          className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-semibold hover:bg-primary-hover transition"
                        >
                          Upload Pengganti
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal / Panel for uploading replacement */}
            {replacementDocType && (
              <div className="p-5 rounded-2xl border-2 border-primary bg-sky/10 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">
                    Upload Berkas Pengganti: {replacementDocType}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplacementDocType(null);
                      setReplacementFile(null);
                    }}
                    className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark"
                  >
                    Batal
                  </button>
                </div>

                <label className="border-2 border-dashed border-primary/40 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer text-xs">
                  <UploadSimple size={20} className="text-primary mb-1" />
                  <span className="font-semibold text-neutral-dark">
                    {replacementFile ? replacementFile.name : "Pilih File Dokumen Pengganti (v Baru)"}
                  </span>
                  <span className="text-[11px] text-neutral-slate mt-0.5">Format PDF, JPG, PNG</span>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setReplacementFile(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  disabled={!replacementFile || uploadingReplacement}
                  onClick={handleUploadReplacement}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {uploadingReplacement ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      <span>Mengunggah Versi Baru...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Dokumen Pengganti (Resubmit)</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
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
