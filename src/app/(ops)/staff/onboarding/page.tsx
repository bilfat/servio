"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import {
  internalAccountApi,
} from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";
import {
  CheckCircle,
  Clock,
  ShieldCheck,
  SpinnerGap,
  ArrowRight,
  User,
  Briefcase,
  FileText,
  IdentificationCard,
  WarningCircle,
  ArrowsClockwise,
  UploadSimple,
  Eye,
  Check,
  ShieldWarning,
  XCircle,
  LockKey,
} from "@phosphor-icons/react";

interface StepData {
  id: string;
  key: string;
  code: string;
  title: string;
  status: string;
  completed: boolean;
  document_version?: string;
  evidence_document_id?: string;
  completed_at?: string;
}

interface OnboardingResponse {
  id: string;
  user_id: string;
  status: "INVITED" | "IN_PROGRESS" | "PENDING_REVIEW" | "REVISION_REQUIRED" | "REJECTED" | "COMPLETED" | "OPERATIONAL_READY" | string;
  onboarding_status: string;
  revision_notes?: string | null;
  rejection_reason?: string | null;
  progress: number;
  readiness: "READY" | "NOT_READY";
  readiness_status: "READY" | "NOT_READY";
  employee: {
    employee_id: string;
    email: string;
    role: string;
    role_name: string;
    department: string;
    position: string;
  };
  profile: {
    display_name: string;
    legal_name: string;
    gender?: string;
    birth_date?: string;
    phone: string;
    photo_path?: string;
  };
  berkas: {
    nik_masked?: string;
    verification_status: string;
    document_count: number;
    documents: Array<{ id: string; type: string; mime: string; size_bytes: number }>;
  };
  steps: StepData[];
}

export default function StaffOnboardingPage() {
  const { user, activeRole, refreshUser } = useActiveRole();
  const [data, setData] = useState<OnboardingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStepTab, setActiveStepTab] = useState<number>(1);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [savingStep, setSavingStep] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  // Form Step 1: Profil Pribadi & Kontak
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gender, setGender] = useState<string>("Laki-laki");
  const [birthDate, setBirthDate] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form Step 2: Pengecekan Berkas (NIK & e-KTP)
  const [nik, setNik] = useState("");
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string>("");
  const ktpInputRef = useRef<HTMLInputElement>(null);

  // Form Step 3: Perjanjian Kerahasiaan (NDA)
  const [ndaVersion] = useState("v2026.1");
  const [ndaAccepted, setNdaAccepted] = useState(false);

  // Form Step 4: Konfirmasi Hak Akses Sistem
  const [accessAccepted, setAccessAccepted] = useState(false);

  const fetchOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internalAccountApi.getMyOnboarding();
      if (res.data) {
        const payload = res.data as unknown as OnboardingResponse;
        setData(payload);

        // Prepopulate form fields from live backend state
        if (payload.profile) {
          setDisplayName(payload.profile.display_name || user.name || "");
          setLegalName(payload.profile.legal_name || payload.profile.display_name || user.name || "");
          if (payload.profile.gender) {
            setGender(payload.profile.gender);
          }
          if (payload.profile.birth_date) {
            setBirthDate(payload.profile.birth_date.split("T")[0]);
          }
          setPhone(payload.profile.phone || user.phone || "");
          setPhotoPath(payload.profile.photo_path || user.avatar || "");
        }
        if (payload.berkas?.nik_masked) {
          setNik(payload.berkas.nik_masked);
        }

        const ndaStep = payload.steps?.find((s) => s.key === "NDA");
        if (ndaStep?.completed) {
          setNdaAccepted(true);
        }

        const accessStep = payload.steps?.find((s) => s.key === "ACCESS_CONFIRMATION");
        if (accessStep?.completed) {
          setAccessAccepted(true);
        }
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user.name, user.phone, user.avatar]);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  // Handle Photo Upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Ukuran foto profil maksimal 5MB.", type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPath(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle KTP File Upload
  const handleKtpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: "Ukuran berkas e-KTP maksimal 5MB.", type: "error" });
      return;
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setToast({ message: "Format berkas harus JPEG, PNG, atau PDF.", type: "error" });
      return;
    }

    setKtpFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setKtpPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setKtpPreview("PDF_DOCUMENT");
    }
  };

  const handleUseSampleKtp = () => {
    const sampleKtpSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" rx="16" fill="#0284c7"/><rect x="20" y="20" width="560" height="340" rx="12" fill="#f0f9ff"/><text x="300" y="55" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0369a1" text-anchor="middle">REPUBLIK INDONESIA</text><text x="300" y="78" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0284c7" text-anchor="middle">KARTU TANDA PENDUDUK (E-KTP)</text><rect x="40" y="110" width="110" height="150" rx="8" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/><circle cx="95" cy="165" r="28" fill="#0284c7"/><path d="M55,240 Q95,195 135,240 Z" fill="#0284c7"/><text x="180" y="130" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">NIK: 3171012304980005</text><text x="180" y="165" font-family="sans-serif" font-size="13" fill="#334155">Nama: ${encodeURIComponent(displayName || user.name || "STAF INTERNAL")}</text><text x="180" y="195" font-family="sans-serif" font-size="13" fill="#334155">Status: STAF INTERNAL RESMI</text><text x="180" y="225" font-family="sans-serif" font-size="13" fill="#334155">Kewarganegaraan: WNI</text><rect x="420" y="270" width="130" height="60" rx="4" fill="#e2e8f0" stroke="#94a3b8"/><text x="485" y="305" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">[ Tanda Tangan ]</text></svg>`;
    const blob = new Blob([sampleKtpSvg], { type: "image/svg+xml" });
    const file = new File([blob], "sample_ktp_staf.svg", { type: "image/svg+xml" });
    setKtpFile(file);
    setKtpPreview(`data:image/svg+xml;utf8,${encodeURIComponent(sampleKtpSvg)}`);
    setNik("3171012304980005");
  };

  const extractErrorMessage = (err: unknown, defaultMessage: string): string => {
    if (!err) return defaultMessage;
    const anyErr = err as {
      message?: string;
      errors?: Record<string, string[] | string>;
      error?: { field_errors?: Record<string, string[] | string> };
    };

    const fieldErrors = anyErr.errors || anyErr.error?.field_errors;
    if (fieldErrors && typeof fieldErrors === "object") {
      const list = Object.entries(fieldErrors).flatMap(([_, val]) => {
        const msgs = Array.isArray(val) ? val : [val];
        return msgs.map((m) => `${m}`);
      });
      if (list.length > 0) {
        return list.join(" • ");
      }
    }

    return anyErr.message || defaultMessage;
  };

  // Submit Step 1: Profil
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim().length < 2) {
      setToast({ message: "Nama lengkap staf minimal 2 karakter.", type: "error" });
      return;
    }
    setSavingStep(true);
    try {
      const res = await internalAccountApi.completeProfileStep({
        display_name: displayName.trim(),
        legal_name: (legalName.trim() || displayName.trim()),
        gender: gender,
        birth_date: birthDate || undefined,
        phone: phone.trim(),
        photo_path: photoPath || undefined,
      });
      if (res.data) {
        setToast({ message: "Tahap 1: Profil pribadi berhasil disimpan dan dicentang! Melanjutkan ke Tahap 2...", type: "success" });
        await fetchOnboarding();
        await refreshUser();
        setActiveStepTab(2);
      }
    } catch (err: unknown) {
      setToast({ message: extractErrorMessage(err, "Gagal menyimpan tahap profil."), type: "error" });
    } finally {
      setSavingStep(false);
    }
  };

  // Submit Step 2: Pengecekan Berkas (NIK & e-KTP)
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNik = nik.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(cleanNik) && !cleanNik.includes("*")) {
      setToast({ message: "NIK wajib tepat 16 digit angka.", type: "error" });
      return;
    }
    if (!ktpFile && !ktpPreview && !data?.berkas?.document_count) {
      setToast({ message: "Wajib mengunggah foto kartu e-KTP fisik.", type: "error" });
      return;
    }

    setSavingStep(true);
    try {
      const formData = new FormData();
      if (/^\d{16}$/.test(cleanNik)) {
        formData.append("nik", cleanNik);
      }
      if (ktpFile) {
        formData.append("file", ktpFile);
      }

      const res = await internalAccountApi.completeKycStep(formData);
      if (res.data) {
        setToast({ message: "Tahap 2: Pengecekan Berkas (NIK & e-KTP) berhasil disimpan dan dicentang! Melanjutkan ke Tahap 3...", type: "success" });
        await fetchOnboarding();
        setActiveStepTab(3);
      }
    } catch (err: unknown) {
      setToast({ message: extractErrorMessage(err, "Gagal menyimpan berkas e-KTP."), type: "error" });
    } finally {
      setSavingStep(false);
    }
  };

  // Submit Step 3: NDA
  const handleSubmitNda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndaAccepted) {
      setToast({ message: "Anda wajib mencentang persetujuan Perjanjian Kerahasiaan (NDA).", type: "error" });
      return;
    }
    setSavingStep(true);
    try {
      const res = await internalAccountApi.completeNdaStep({
        nda_version: ndaVersion,
        accepted: true,
      });
      if (res.data) {
        setToast({ message: "Tahap 3: Perjanjian Kerahasiaan (NDA) berhasil disetujui dan dicentang! Melanjutkan ke Tahap 4...", type: "success" });
        await fetchOnboarding();
        setActiveStepTab(4);
      }
    } catch (err: unknown) {
      setToast({ message: extractErrorMessage(err, "Gagal mencatat persetujuan NDA."), type: "error" });
    } finally {
      setSavingStep(false);
    }
  };

  // Submit Step 4: Access Confirmation AND Send for CEO Verification
  const handleSubmitAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessAccepted) {
      setToast({ message: "Anda wajib mencentang konfirmasi pemahaman hak akses penugasan CEO.", type: "error" });
      return;
    }
    setSavingStep(true);
    try {
      const res = await internalAccountApi.confirmAccessStep({
        accepted: true,
      });
      if (res.data) {
        // Step 4 is confirmed. Now send entire onboarding for CEO verification!
        setSubmittingVerification(true);
        const submitRes = await internalAccountApi.submitOnboarding();
        if (submitRes.data) {
          setToast({
            message: "Tahap 4 berhasil dikonfirmasi dan seluruh berkas onboarding telah dikirim ke Antrean Verifikasi CEO!",
            type: "success",
          });
          await fetchOnboarding();
          await refreshUser();
        } else {
          setToast({ message: "Tahap 4 berhasil dikonfirmasi. Anda dapat meninjau seluruh data.", type: "success" });
          await fetchOnboarding();
        }
      }
    } catch (err: unknown) {
      setToast({ message: extractErrorMessage(err, "Gagal mengonfirmasi hak akses."), type: "error" });
    } finally {
      setSavingStep(false);
      setSubmittingVerification(false);
    }
  };

  // Submit All for CEO Verification (CR-03 Section E: Manual Trigger if not already submitted)
  const handleFinalSubmit = async () => {
    setSubmittingVerification(true);
    try {
      const res = await internalAccountApi.submitOnboarding();
      if (res.data) {
        setToast({
          message: "Berkas onboarding berhasil dikirim ke Antrean Verifikasi CEO!",
          type: "success",
        });
        await fetchOnboarding();
        await refreshUser();
      }
    } catch (err: unknown) {
      setToast({
        message: extractErrorMessage(err, "Gagal mengirim verifikasi. Pastikan seluruh 4 tahap lengkap."),
        type: "error",
      });
    } finally {
      setSubmittingVerification(false);
    }
  };

  const stepsList = data?.steps || [];
  const stepProfile = stepsList.find((s) => s.key === "PROFILE");
  const stepKyc = stepsList.find((s) => s.key === "EMPLOYEE_KYC");
  const stepNda = stepsList.find((s) => s.key === "NDA");
  const stepAccess = stepsList.find((s) => s.key === "ACCESS_CONFIRMATION");

  const allFourStepsDone = Boolean(
    stepProfile?.completed && stepKyc?.completed && stepNda?.completed && stepAccess?.completed
  );

  const status = data?.status || "IN_PROGRESS";
  const isPendingReview = status === "PENDING_REVIEW";
  const isRevisionRequired = status === "REVISION_REQUIRED";
  const isRejected = status === "REJECTED";
  const isOperationalReady = status === "COMPLETED" || status === "OPERATIONAL_READY" || data?.readiness === "READY";
  const isReviewMode = isPendingReview || isOperationalReady;

  // Sequential Stepper Locking Logic:
  // - Tab 1: Always accessible
  // - Tab 2: Accessible only after Tab 1 completed (or if in review/done mode)
  // - Tab 3: Accessible only after Tab 1 & 2 completed (or if in review/done mode)
  // - Tab 4: Accessible only after Tab 1, 2, & 3 completed (or if in review/done mode)
  // - When submitted or approved, all tabs are unlocked so staff can inspect each point ("bisa lihat isi per pointnya")
  const canAccessTab = (tabIndex: number): boolean => {
    if (isPendingReview || isOperationalReady || isRevisionRequired || isRejected) {
      return true;
    }
    if (tabIndex === 1) return true;
    if (tabIndex === 2) return Boolean(stepProfile?.completed);
    if (tabIndex === 3) return Boolean(stepProfile?.completed && stepKyc?.completed);
    if (tabIndex === 4) return Boolean(stepProfile?.completed && stepKyc?.completed && stepNda?.completed);
    return false;
  };

  const getDashboardUrl = () => {
    switch (activeRole) {
      case "ADMIN_OPERATIONS":
        return "/ops/admin/dashboard";
      case "FINANCE_PAYMENT_OPS":
        return "/ops/finance/dashboard";
      case "CUSTOMER_SUPPORT":
        return "/ops/support/dashboard";
      default:
        return "/ops/admin/dashboard";
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-3 px-2 sm:px-0 pb-16">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Tata Kelola Staf Internal (CR-03)
            </span>
            {data?.employee?.employee_id && (
              <span className="text-[11px] font-mono font-bold text-slate-700 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                NIP: {data.employee.employee_id}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
            Onboarding Staf: {data?.profile?.display_name || user.name || "Staf Internal"}
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Lengkapi empat tahap onboarding untuk diverifikasi oleh CEO agar akun Anda berstatus <strong>OPERATIONAL_READY</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOnboarding}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-neutral-dark text-xs font-semibold hover:bg-slate-50 transition shadow-servio-xs self-start sm:self-auto cursor-pointer"
        >
          <ArrowsClockwise size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* STATUS BANNER */}
      {isOperationalReady ? (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-servio-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck size={28} weight="fill" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 px-2 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-300">
                STATUS: OPERATIONAL_READY
              </span>
              <h2 className="text-base font-bold text-emerald-950 mt-1">
                Selamat! Akun Staf Anda Telah Aktif &amp; Disetujui CEO
              </h2>
              <p className="text-xs text-emerald-800">
                Seluruh tahapan onboarding dan verifikasi berkas telah disetujui. Dashboard operasional Anda kini dapat diakses penuh.
              </p>
            </div>
          </div>
          <Link
            href={getDashboardUrl()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
          >
            <span>Buka Dashboard Operasional</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      ) : isPendingReview ? (
        <div className="p-5 rounded-3xl bg-sky-50 border border-sky-200 shadow-servio-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Clock size={28} weight="fill" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 px-2 py-0.5 rounded-full bg-sky-100 border border-sky-300">
              STATUS: PENDING_REVIEW
            </span>
            <h2 className="text-base font-bold text-sky-950 mt-1">
              Berkas Sedang Ditinjau oleh CEO
            </h2>
            <p className="text-xs text-sky-800">
              Seluruh empat tahapan telah dikirim. Permohonan Anda saat ini berada dalam <strong>Antrean Verifikasi CEO</strong>. Dashboard operasional akan otomatis dibuka setelah disetujui.
            </p>
          </div>
        </div>
      ) : isRevisionRequired ? (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-300 shadow-servio-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <WarningCircle size={28} weight="fill" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                STATUS: REVISION_REQUIRED
              </span>
              <h2 className="text-base font-bold text-amber-950 mt-1">
                CEO Meminta Perbaikan Berkas
              </h2>
              <p className="text-xs text-amber-900 mt-0.5">
                Catatan Revisi: <strong>&ldquo;{data?.revision_notes || "Silakan perbaiki data atau foto e-KTP."}&rdquo;</strong>
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-800 px-3 py-1 bg-amber-100 rounded-xl">
            Perbarui berkas di bawah lalu kirim ulang
          </span>
        </div>
      ) : isRejected ? (
        <div className="p-5 rounded-3xl bg-rose-50 border border-rose-300 shadow-servio-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <XCircle size={28} weight="fill" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300">
              STATUS: REJECTED
            </span>
            <h2 className="text-base font-bold text-rose-950 mt-1">
              Pengajuan Onboarding Ditolak
            </h2>
            <p className="text-xs text-rose-900 mt-0.5">
              Alasan: <strong>&ldquo;{data?.rejection_reason || "Berkas tidak memenuhi persyaratan resmi kepegawaian."}&rdquo;</strong>
            </p>
          </div>
        </div>
      ) : null}

      {/* Progress & Stepper Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-servio-xs space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-neutral-slate">Progres Onboarding:</span>
          <span className="font-bold text-primary font-mono text-sm">{data?.progress ?? 25}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${data?.progress ?? 25}%` }}
          />
        </div>

        {/* 4 Steps Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {/* Step 1 */}
          <button
            type="button"
            id="tab-onboarding-step-1"
            onClick={() => setActiveStepTab(1)}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
              activeStepTab === 1
                ? "bg-primary/5 border-primary text-primary shadow-xs ring-1 ring-primary/20"
                : stepProfile?.completed
                ? "bg-emerald-50/40 border-emerald-200/80 text-slate-800 hover:bg-emerald-50/70"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tahap 1</span>
              {stepProfile?.completed ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs truncate">
              <User size={14} />
              <span>Profil Pribadi</span>
            </div>
            <div className="text-[10px] mt-0.5">
              {stepProfile?.completed ? (
                <span className="text-emerald-600 font-semibold">Selesai (Ceklis)</span>
              ) : activeStepTab === 1 ? (
                <span className="text-primary font-semibold">Sedang Diisi</span>
              ) : (
                <span className="text-slate-400">Belum Lengkap</span>
              )}
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            id="tab-onboarding-step-2"
            disabled={!canAccessTab(2)}
            onClick={() => canAccessTab(2) && setActiveStepTab(2)}
            className={`p-3 rounded-2xl border text-left transition ${
              !canAccessTab(2)
                ? "bg-slate-50/70 border-slate-200/60 text-slate-400 opacity-60 cursor-not-allowed"
                : activeStepTab === 2
                ? "bg-primary/5 border-primary text-primary shadow-xs ring-1 ring-primary/20 cursor-pointer"
                : stepKyc?.completed
                ? "bg-emerald-50/40 border-emerald-200/80 text-slate-800 hover:bg-emerald-50/70 cursor-pointer"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tahap 2</span>
              {!canAccessTab(2) ? (
                <LockKey size={14} className="text-slate-400" />
              ) : stepKyc?.completed ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs truncate">
              <IdentificationCard size={14} />
              <span>Pengecekan Berkas</span>
            </div>
            <div className="text-[10px] mt-0.5">
              {!canAccessTab(2) ? (
                <span className="text-slate-400">Terkunci (Isi Tahap 1)</span>
              ) : stepKyc?.completed ? (
                <span className="text-emerald-600 font-semibold">Selesai (Ceklis)</span>
              ) : activeStepTab === 2 ? (
                <span className="text-primary font-semibold">Sedang Diisi</span>
              ) : (
                <span className="text-slate-400">Siap Diisi</span>
              )}
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            id="tab-onboarding-step-3"
            disabled={!canAccessTab(3)}
            onClick={() => canAccessTab(3) && setActiveStepTab(3)}
            className={`p-3 rounded-2xl border text-left transition ${
              !canAccessTab(3)
                ? "bg-slate-50/70 border-slate-200/60 text-slate-400 opacity-60 cursor-not-allowed"
                : activeStepTab === 3
                ? "bg-primary/5 border-primary text-primary shadow-xs ring-1 ring-primary/20 cursor-pointer"
                : stepNda?.completed
                ? "bg-emerald-50/40 border-emerald-200/80 text-slate-800 hover:bg-emerald-50/70 cursor-pointer"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tahap 3</span>
              {!canAccessTab(3) ? (
                <LockKey size={14} className="text-slate-400" />
              ) : stepNda?.completed ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs truncate">
              <FileText size={14} />
              <span>NDA Perjanjian</span>
            </div>
            <div className="text-[10px] mt-0.5">
              {!canAccessTab(3) ? (
                <span className="text-slate-400">Terkunci (Isi Tahap 2)</span>
              ) : stepNda?.completed ? (
                <span className="text-emerald-600 font-semibold">Selesai (Ceklis)</span>
              ) : activeStepTab === 3 ? (
                <span className="text-primary font-semibold">Sedang Diisi</span>
              ) : (
                <span className="text-slate-400">Siap Diisi</span>
              )}
            </div>
          </button>

          {/* Step 4 */}
          <button
            type="button"
            id="tab-onboarding-step-4"
            disabled={!canAccessTab(4)}
            onClick={() => canAccessTab(4) && setActiveStepTab(4)}
            className={`p-3 rounded-2xl border text-left transition ${
              !canAccessTab(4)
                ? "bg-slate-50/70 border-slate-200/60 text-slate-400 opacity-60 cursor-not-allowed"
                : activeStepTab === 4
                ? "bg-primary/5 border-primary text-primary shadow-xs ring-1 ring-primary/20 cursor-pointer"
                : stepAccess?.completed
                ? "bg-emerald-50/40 border-emerald-200/80 text-slate-800 hover:bg-emerald-50/70 cursor-pointer"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tahap 4</span>
              {!canAccessTab(4) ? (
                <LockKey size={14} className="text-slate-400" />
              ) : stepAccess?.completed ? (
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs truncate">
              <ShieldCheck size={14} />
              <span>Konfirmasi Akses</span>
            </div>
            <div className="text-[10px] mt-0.5">
              {!canAccessTab(4) ? (
                <span className="text-slate-400">Terkunci (Isi Tahap 3)</span>
              ) : stepAccess?.completed ? (
                <span className="text-emerald-600 font-semibold">Selesai (Ceklis)</span>
              ) : activeStepTab === 4 ? (
                <span className="text-primary font-semibold">Tahap Akhir (Kirim)</span>
              ) : (
                <span className="text-slate-400">Siap Diisi</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* STEP CONTENT FORMS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        {/* Review Mode Banner (allows user to see what is filled per point after submit) */}
        {isReviewMode && (
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2.5">
              <Eye size={20} className="text-sky-600 shrink-0" />
              <div>
                <strong>Mode Pratinjau Pengajuan:</strong> Berkas onboarding Anda telah dikirimkan ke Antrean Verifikasi CEO. Anda dapat mengklik setiap tahap di atas untuk memeriksa isi data yang telah diajukan.
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 border border-sky-300 text-sky-800 uppercase self-start sm:self-auto shrink-0">
              {status}
            </span>
          </div>
        )}

        {/* TAHAP 1: PROFIL PRIBADI & KONTAK */}
        {activeStepTab === 1 && (
          <form onSubmit={handleSubmitProfile} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  TAHAP 1
                </span>
                <h2 className="text-lg font-bold font-display text-neutral-dark">
                  Profil Pribadi &amp; Kontak Staf
                </h2>
              </div>
              <p className="text-xs text-neutral-slate mt-1">
                Masukkan nama lengkap, nama resmi sesuai identitas, nomor telepon/WhatsApp aktif, serta foto profil (opsional).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Staf <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  disabled={isReviewMode}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default" : "border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sesuai Identitas (Legal Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  disabled={isReviewMode}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Nama sesuai KTP"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default" : "border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  disabled={isReviewMode}
                  onChange={(e) => setGender(e.target.value)}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default" : "border-slate-200 bg-white"
                  }`}
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  disabled={isReviewMode}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  max={new Date().toISOString().split("T")[0]}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default" : "border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor HP / WhatsApp Aktif
                </label>
                <input
                  type="tel"
                  value={phone}
                  disabled={isReviewMode}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-700 cursor-default" : "border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Profil (Opsional)
                </label>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  disabled={isReviewMode}
                />
                {!isReviewMode ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UploadSimple size={15} />
                    <span>{photoPath ? "Ubah Foto Profil Terpilih" : "Unggah Foto Profil (Maks 5MB)"}</span>
                  </button>
                ) : (
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    {photoPath ? "Foto profil telah diunggah" : "Tidak ada foto profil khusus terlampir"}
                  </div>
                )}
              </div>
            </div>

            {photoPath && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPath} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                <span className="text-xs text-slate-600 font-medium">Foto profil staf terpasang</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Tahap 1 dari 4 • Profil Pribadi</span>
              {isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setActiveStepTab(2)}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  <span>Lihat Tahap 2: Pengecekan Berkas</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={savingStep}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  {savingStep && <SpinnerGap size={14} className="animate-spin" />}
                  <span>Simpan &amp; Lanjutkan ke Berkas</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </form>
        )}

        {/* TAHAP 2: PENGECEKAN BERKAS (Label WAJIB Pengecekan Berkas) */}
        {activeStepTab === 2 && (
          <form onSubmit={handleSubmitKyc} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  TAHAP 2
                </span>
                <h2 className="text-lg font-bold font-display text-neutral-dark">
                  Pengecekan Berkas (NIK &amp; e-KTP)
                </h2>
              </div>
              <p className="text-xs text-neutral-slate mt-1">
                Sesuai ketentuan keamanan SERVIO, staf internal wajib memasukkan NIK 16 digit dan mengunggah kartu e-KTP fisik yang valid untuk diverifikasi oleh CEO.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Induk Kependudukan (NIK 16 Digit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={nik}
                  disabled={isReviewMode}
                  onChange={(e) => setNik(e.target.value.replace(/[^0-9*]/g, ""))}
                  placeholder="3171012304980005"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono tracking-wider focus:ring-2 focus:ring-primary focus:border-primary transition ${
                    isReviewMode ? "bg-slate-50 border-slate-200 text-slate-800 cursor-default" : "border-slate-200"
                  }`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  NIK disimpan dengan enkripsi server-side AES-256 dan hanya ditampilkan bermasker.
                </span>
              </div>

              {!isReviewMode && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Unggah Kartu e-KTP Asli <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleUseSampleKtp}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Gunakan Sampel Valid e-KTP
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={ktpInputRef}
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={handleKtpFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => ktpInputRef.current?.click()}
                    className="w-full p-6 border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <IdentificationCard size={32} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      Klik untuk memilih berkas foto e-KTP atau seret berkas ke sini
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Format: JPEG, PNG, atau PDF (Ukuran maksimal 5MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Preview of KTP */}
              {ktpPreview ? (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                  <span className="text-[11px] font-bold text-sky-800 block">
                    Pratinjau Berkas e-KTP Terunggah:
                  </span>
                  {ktpPreview === "PDF_DOCUMENT" ? (
                    <div className="p-4 bg-white rounded-xl border border-sky-200 flex items-center gap-2 text-xs font-semibold text-sky-900">
                      <FileText size={20} className="text-rose-500" />
                      <span>Dokumen e-KTP (PDF) Siap Diverifikasi</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ktpPreview}
                      alt="Pratinjau e-KTP"
                      className="max-h-48 rounded-xl object-contain border border-slate-200 bg-white"
                    />
                  )}
                </div>
              ) : (data?.berkas?.document_count ?? 0) > 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <IdentificationCard size={24} className="text-emerald-600" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Berkas e-KTP Telah Tersimpan di Basis Data
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Jumlah Berkas: {data?.berkas?.document_count} dokumen tersimpan aman dalam private storage.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStepTab(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Kembali ke Profil
              </button>
              {isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setActiveStepTab(3)}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  <span>Lihat Tahap 3: NDA Perjanjian</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={savingStep}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  {savingStep && <SpinnerGap size={14} className="animate-spin" />}
                  <span>Simpan &amp; Lanjutkan ke NDA</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </form>
        )}

        {/* TAHAP 3: PERJANJIAN KERAHASIAAN (NDA) */}
        {activeStepTab === 3 && (
          <form onSubmit={handleSubmitNda} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  TAHAP 3
                </span>
                <h2 className="text-lg font-bold font-display text-neutral-dark">
                  Perjanjian Kerahasiaan Informasi (NDA)
                </h2>
              </div>
              <p className="text-xs text-neutral-slate mt-1">
                Dokumen resmi Non-Disclosure Agreement SERVIO Versi {ndaVersion}. Baca dan centang persetujuan kerahasiaan sebelum melangkah ke tahap berikutnya.
              </p>
            </div>

            {/* Scrollable NDA Document */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-64 overflow-y-auto text-xs text-slate-700 space-y-3 leading-relaxed">
              <div className="text-center pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase">
                  PERJANJIAN KERAHASIAAN &amp; PERLINDUNGAN DATA PLATFORM SERVIO
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Nomor Dokumen: NDA-SERVIO-2026.1</span>
              </div>
              <p>
                1. <strong>Definisi Informasi Rahasia:</strong> Segala informasi data pengguna (Customer), mitra penyedia (Service Provider), data pembayaran, transaksi, algoritma, basis data, dan rahasia dagang platform SERVIO yang diakses staf internal selama bertugas merupakan informasi rahasia.
              </p>
              <p>
                2. <strong>Larangan Pengungkapan:</strong> Staf dilarang membocorkan, menyalin, mendistribusikan, atau memanfaatkan data sistem untuk kepentingan pribadi maupun pihak ketiga tanpa izin tertulis dari CEO &amp; Product Owner SERVIO.
              </p>
              <p>
                3. <strong>Sanksi &amp; Konsekuensi Hukum:</strong> Pelanggaran terhadap perjanjian kerahasiaan ini dapat berakibat pada pemutusan hubungan kerja sepihak, pencabutan akun sistem, serta tuntutan ganti rugi perdata dan pidana berdasarkan UU ITE dan UU Perlindungan Data Pribadi (UU PDP).
              </p>
              <p>
                4. <strong>Masa Berlaku:</strong> Kewajiban kerahasiaan ini berlaku selama staf aktif dan tetap mengikat hingga 5 (lima) tahun setelah masa penugasan berakhir.
              </p>
            </div>

            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
              isReviewMode ? "bg-emerald-50/50 border-emerald-200 cursor-default" : "bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100/60"
            }`}>
              <input
                type="checkbox"
                checked={ndaAccepted}
                disabled={isReviewMode}
                onChange={(e) => setNdaAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-slate-800 leading-normal">
                Saya telah membaca, memahami, dan menyetujui seluruh ketentuan dalam <strong>Perjanjian Kerahasiaan (NDA) SERVIO Versi {ndaVersion}</strong>.
                {isReviewMode && <span className="ml-2 font-bold text-emerald-700">(Telah Ditandatangani Secara Digital)</span>}
              </span>
            </label>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStepTab(2)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Kembali ke Berkas
              </button>
              {isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setActiveStepTab(4)}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  <span>Lihat Tahap 4: Konfirmasi Akses</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={savingStep}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer"
                >
                  {savingStep && <SpinnerGap size={14} className="animate-spin" />}
                  <span>Simpan &amp; Lanjutkan ke Konfirmasi Akses</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </form>
        )}

        {/* TAHAP 4: KONFIRMASI HAK AKSES SISTEM & FINAL SUBMIT */}
        {activeStepTab === 4 && (
          <form onSubmit={handleSubmitAccess} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  TAHAP 4
                </span>
                <h2 className="text-lg font-bold font-display text-neutral-dark">
                  Konfirmasi Hak Akses Sistem &amp; Penugasan
                </h2>
              </div>
              <p className="text-xs text-neutral-slate mt-1">
                Data penugasan ini ditetapkan langsung oleh CEO dan bersifat tetap (read-only). Pastikan Anda memahami peran dan wewenang yang diberikan sebelum mengirimkan seluruh berkas onboarding.
              </p>
            </div>

            {/* Readonly Assignment Data from CEO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Nomor Induk Pegawai (Employee ID)</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                  {data?.employee?.employee_id || user.employeeId || "ADM-STAF-001"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Email Resmi Kantor</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {data?.employee?.email || user.email}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Role &amp; Otoritas</span>
                <span className="font-bold text-primary text-sm mt-0.5 block">
                  {data?.employee?.role_name || data?.employee?.role || activeRole}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Departemen / Divisi</span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                  {data?.employee?.department || user.department || "Operasional"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold block flex items-center gap-1.5">
                <LockKey size={14} className="text-amber-700" />
                Ketentuan Wewenang Penugasan:
              </span>
              <p className="leading-relaxed">
                Employee ID, email kantor, role, jabatan, dan departemen berasal dari penetapan CEO dan tidak dapat dinaikkan atau diganti sendiri oleh staf. Segala tindakan operasional tercatat dalam jejak audit (Audit Trail) sistem.
              </p>
            </div>

            <label className={`flex items-start gap-3 p-3.5 rounded-2xl border transition ${
              isReviewMode ? "bg-emerald-50/50 border-emerald-200 cursor-default" : "bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100/60"
            }`}>
              <input
                type="checkbox"
                checked={accessAccepted}
                disabled={isReviewMode}
                onChange={(e) => setAccessAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-slate-800 leading-normal">
                Saya mengonfirmasi bahwa penugasan, wewenang, dan batasan hak akses sistem di atas telah sesuai dan saya berkomitmen mematuhi SOP operasional SERVIO.
                {isReviewMode && <span className="ml-2 font-bold text-emerald-700">(Telah Dikonfirmasi)</span>}
              </span>
            </label>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStepTab(3)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Kembali ke NDA
              </button>
              {isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setActiveStepTab(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  <Eye size={14} />
                  <span>Tinjau Ulang dari Tahap 1</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={savingStep || submittingVerification || !accessAccepted}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-servio-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingStep || submittingVerification ? (
                    <>
                      <SpinnerGap size={14} className="animate-spin" />
                      <span>Memproses &amp; Mengirim ke CEO...</span>
                    </>
                  ) : (
                    <>
                      <span>Konfirmasi &amp; Kirim untuk Verifikasi CEO</span>
                      <ArrowRight size={14} weight="bold" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* FINAL SUBMIT SECTION (CR-03 Section E: Status Pengajuan ke CEO) - Hanya Tampil di Tahap 4 */}
      {activeStepTab === 4 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-servio-sm border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              PENGAJUAN VERIFIKASI EKSEKUTIF
            </span>
            <h2 className="text-lg font-bold font-display text-white mt-1.5">
              {isOperationalReady
                ? "Akun Telah Disetujui CEO (Operational Ready)"
                : isPendingReview
                ? "Berkas Onboarding Sedang Dalam Antrean CEO"
                : "Kirimkan Berkas Lengkap ke CEO"}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 max-w-lg leading-relaxed">
              {isOperationalReady
                ? "Seluruh data dan berkas Anda telah diverifikasi oleh CEO. Dashboard operasional Anda aktif penuh."
                : isPendingReview
                ? "Permohonan Anda berada dalam Antrean Pengecekan Berkas CEO. Anda tetap dapat membuka setiap tahap di atas untuk meninjau data Anda."
                : "Setelah keempat tahap selesai, kirimkan permohonan agar berkas Anda masuk ke Antrean Verifikasi CEO dan diproses untuk penetapan status OPERATIONAL_READY."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={!allFourStepsDone || submittingVerification || isPendingReview || isOperationalReady}
            className={`px-6 py-3 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-sm ${
              !allFourStepsDone || isPendingReview || isOperationalReady
                ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                : "bg-primary hover:bg-primary-dark text-white shadow-primary/20 cursor-pointer"
            }`}
          >
            {submittingVerification ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                <span>Mengirimkan...</span>
              </>
            ) : isOperationalReady ? (
              <>
                <ShieldCheck size={16} weight="fill" className="text-emerald-400" />
                <span>Sudah Disetujui CEO</span>
              </>
            ) : isPendingReview ? (
              <>
                <Clock size={16} weight="fill" className="text-sky-400" />
                <span>Menunggu Verifikasi CEO</span>
              </>
            ) : (
              <>
                <span>Kirim untuk Verifikasi</span>
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
