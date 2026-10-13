"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useActiveRole } from "@/context/RoleContext";
import {
  internalAccountApi,
  InternalOnboarding,
  OnboardingTask,
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
  Check,
  X,
  FileText,
  LockKey,
  IdentificationCard,
  WarningCircle,
  ArrowsClockwise,
  UploadSimple,
  Eye,
  Trash,
  Calendar,
  Phone,
  Info,
  Shield,
} from "@phosphor-icons/react";

export default function StaffOnboardingPage() {
  const { user, activeRole, refreshUser } = useActiveRole();
  const [onboarding, setOnboarding] = useState<InternalOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  // Active Task Modal for Inputting Data
  const [activeTaskModal, setActiveTaskModal] = useState<OnboardingTask | null>(null);
  const [viewDetailsTask, setViewDetailsTask] = useState<OnboardingTask | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Task 2: Profile Fields
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileGender, setProfileGender] = useState("MALE");
  const [profileDateOfBirth, setProfileDateOfBirth] = useState("1998-05-15");

  // Task 4: Identity & KTP Fields
  const [verificationNik, setVerificationNik] = useState("");
  const [verificationKtpPreview, setVerificationKtpPreview] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const ktpFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Task 1, 3, 5, 6: Agreement Checkboxes
  const [accountAgreed, setAccountAgreed] = useState(false);
  const [employmentConfirmed, setEmploymentConfirmed] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [accessAgreed, setAccessAgreed] = useState(false);

  const fetchOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internalAccountApi.getOnboarding("me");
      if (res.data) {
        setOnboarding(res.data);
      }
    } catch {
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  // Open appropriate modal when clicking "Selesaikan Tugas"
  const handleOpenTaskModal = (task: OnboardingTask) => {
    setFormError(null);
    setActiveTaskModal(task);

    if (task.code === "PROFILE_COMPLETION") {
      setProfileDisplayName(onboarding?.profile?.displayName || (user.name ?? "") || "");
      setProfileAvatar(onboarding?.profile?.avatar || (user as unknown as Record<string, string>).avatar || "");
      setProfileBio(onboarding?.profile?.bio || (task.metadata?.bio as string) || "Staf Operasional SERVIO - Penanganan Layanan & Verifikasi.");
      setProfileGender(onboarding?.profile?.gender || (task.metadata?.gender as string) || "MALE");
      setProfileDateOfBirth(onboarding?.profile?.dateOfBirth || (task.metadata?.dateOfBirth as string) || "1998-05-15");
    } else if (task.code === "REQUIRED_VERIFICATION") {
      setVerificationNik(onboarding?.user?.nik || (task.metadata?.nik as string) || "");
      setVerificationKtpPreview(onboarding?.user?.ktpFilePath || (task.metadata?.ktpFilePath as string) || "");
      setEmergencyContactName(onboarding?.user?.emergencyContact?.name || (task.metadata?.emergencyContactName as string) || "");
      setEmergencyContactPhone(onboarding?.user?.emergencyContact?.phone || (task.metadata?.emergencyContactPhone as string) || "");
    } else if (task.code === "EMPLOYMENT_CONFIRMATION") {
      setEmploymentConfirmed(false);
    } else if (task.code === "POLICY_ACKNOWLEDGEMENT") {
      setPolicyAgreed(false);
    } else if (task.code === "ACCESS_CONFIRMATION") {
      setAccessAgreed(false);
    } else if (task.code === "ACCOUNT_ACCEPTANCE") {
      setAccountAgreed(false);
    }
  };

  // Handle KTP file upload
  const handleKtpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file foto KTP maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setVerificationKtpPreview(reader.result as string);
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  // Generate test KTP SVG placeholder
  const handleUseSampleKtp = () => {
    const sampleKtpSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" rx="16" fill="%230284c7"/><rect x="20" y="20" width="560" height="340" rx="12" fill="%23f0f9ff"/><text x="300" y="55" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230369a1" text-anchor="middle">REPUBLIK INDONESIA</text><text x="300" y="78" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230284c7" text-anchor="middle">KARTU TANDA PENDUDUK (E-KTP)</text><rect x="40" y="110" width="110" height="150" rx="8" fill="%23bae6fd" stroke="%230284c7" stroke-width="2"/><circle cx="95" cy="165" r="28" fill="%230284c7"/><path d="M55,240 Q95,195 135,240 Z" fill="%230284c7"/><text x="180" y="130" font-family="monospace" font-size="16" font-weight="bold" fill="%230f172a">NIK: 3171012304980005</text><text x="180" y="165" font-family="sans-serif" font-size="13" fill="%23334155">Nama: ${encodeURIComponent(user.name || "STAF INTERNAL")}</text><text x="180" y="195" font-family="sans-serif" font-size="13" fill="%23334155">Tempat/Tgl Lahir: JAKARTA, 15-05-1998</text><text x="180" y="225" font-family="sans-serif" font-size="13" fill="%23334155">Jenis Kelamin: LAKI-LAKI</text><text x="180" y="255" font-family="sans-serif" font-size="13" fill="%23334155">Status: VERIFIED INTERNAL STAFF</text><rect x="420" y="270" width="130" height="60" rx="4" fill="%23e2e8f0" stroke="%2394a3b8"/><text x="485" y="305" font-family="sans-serif" font-size="11" fill="%2364748b" text-anchor="middle">[ Tanda Tangan ]</text></svg>`;
    setVerificationKtpPreview(sampleKtpSvg);
    if (!verificationNik) {
      setVerificationNik("3171012304980005");
    }
    setFormError(null);
  };

  // Handle avatar upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Ukuran file avatar maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileAvatar(reader.result as string);
      setFormError(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit Active Task Modal
  const handleSubmitTaskModal = async () => {
    if (!activeTaskModal) return;
    setFormError(null);

    let payload: Record<string, unknown> = {};

    if (activeTaskModal.code === "PROFILE_COMPLETION") {
      if (!profileDisplayName.trim()) {
        setFormError("Nama tampilan profil wajib diisi.");
        return;
      }
      if (!profileBio.trim()) {
        setFormError("Deskripsi bio singkat peran wajib diisi.");
        return;
      }
      payload = {
        displayName: profileDisplayName.trim(),
        avatar: profileAvatar.trim(),
        bio: profileBio.trim(),
        gender: profileGender,
        dateOfBirth: profileDateOfBirth,
      };
    } else if (activeTaskModal.code === "REQUIRED_VERIFICATION") {
      const cleanNik = verificationNik.replace(/\s+/g, "");
      if (!/^\d{16}$/.test(cleanNik)) {
        setFormError("NIK harus tepat 16 digit angka sesuai KTP.");
        return;
      }
      if (!verificationKtpPreview) {
        setFormError("Wajib mengunggah foto kartu e-KTP.");
        return;
      }
      if (!emergencyContactName.trim()) {
        setFormError("Nama kontak darurat wajib diisi.");
        return;
      }
      if (!emergencyContactPhone.trim()) {
        setFormError("Nomor telepon kontak darurat wajib diisi.");
        return;
      }
      payload = {
        nik: cleanNik,
        ktpFilePath: verificationKtpPreview,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      };
    } else if (activeTaskModal.code === "EMPLOYMENT_CONFIRMATION") {
      if (!employmentConfirmed) {
        setFormError("Centang persetujuan konfirmasi data hubungan kerja terlebih dahulu.");
        return;
      }
      payload = {
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      };
    } else if (activeTaskModal.code === "POLICY_ACKNOWLEDGEMENT") {
      if (!policyAgreed) {
        setFormError("Centang persetujuan Pakta Integritas & Kebijakan Operasional terlebih dahulu.");
        return;
      }
      payload = {
        acknowledged: true,
        policyVersion: "2026.1",
        acknowledgedAt: new Date().toISOString(),
      };
    } else if (activeTaskModal.code === "ACCESS_CONFIRMATION") {
      if (!accessAgreed) {
        setFormError("Centang konfirmasi pemahaman wewenang dan batasan akses sistem terlebih dahulu.");
        return;
      }
      payload = {
        accessConfirmed: true,
        confirmedAt: new Date().toISOString(),
      };
    } else if (activeTaskModal.code === "ACCOUNT_ACCEPTANCE") {
      if (!accountAgreed) {
        setFormError("Centang persetujuan penerimaan akun operasional terlebih dahulu.");
        return;
      }
      payload = {
        accepted: true,
        acceptedAt: new Date().toISOString(),
      };
    }

    setActionTaskId(activeTaskModal.id);
    try {
      const res = await internalAccountApi.completeTask("me", activeTaskModal.id, "COMPLETE", payload);
      if (res.data) {
        setOnboarding(res.data);
        await refreshUser();
        setToast({
          message: `Tugas "${activeTaskModal.title}" berhasil diselesaikan.`,
          type: "success",
        });
        setActiveTaskModal(null);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setFormError(error.message || "Gagal menyelesaikan tugas onboarding.");
    } finally {
      setActionTaskId(null);
    }
  };

  const handleCompleteAllOnboarding = async () => {
    setCompletingAll(true);
    try {
      const res = await internalAccountApi.completeOnboarding("me");
      if (res.data) {
        setOnboarding(res.data);
        await refreshUser();
        setToast({
          message: "Selamat! Seluruh proses onboarding internal Anda telah tuntas dan disetujui sistem.",
          type: "success",
        });
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal menuntaskan onboarding. Pastikan semua tugas wajib telah diselesaikan.",
        type: "error",
      });
    } finally {
      setCompletingAll(false);
    }
  };

  const getTaskIcon = (code: string) => {
    switch (code) {
      case "ACCOUNT_ACCEPTANCE":
        return <LockKey size={18} className="text-primary" />;
      case "PROFILE_COMPLETION":
        return <User size={18} className="text-primary" />;
      case "EMPLOYMENT_CONFIRMATION":
        return <Briefcase size={18} className="text-primary" />;
      case "REQUIRED_VERIFICATION":
        return <IdentificationCard size={18} className="text-primary" />;
      case "POLICY_ACKNOWLEDGEMENT":
        return <FileText size={18} className="text-primary" />;
      case "ACCESS_CONFIRMATION":
        return <ShieldCheck size={18} className="text-primary" />;
      default:
        return <CheckCircle size={18} className="text-primary" />;
    }
  };

  const readiness = onboarding?.readiness;
  const tasks = Array.isArray(onboarding?.tasks) ? onboarding.tasks : [];
  const completedTasksCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const totalTasksCount = tasks.length;
  const allRequiredDone = tasks.length > 0
    ? tasks.filter((t) => t.required).every((t) => t.status === "COMPLETED" || t.status === "WAIVED")
    : false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Internal Staff Onboarding
          </span>
          <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
            Selamat Datang, {user.name || "Staf Internal"}
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Lengkapi formulir profil, unggah KTP identitas, dan konfirmasi SOP operasional agar akun Anda berstatus <strong>READY</strong>.
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

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-servio-xs">
          <SpinnerGap size={28} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-xs font-medium text-neutral-slate">Memuat status onboarding staf...</p>
        </div>
      ) : !onboarding || tasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-servio-xs space-y-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit mx-auto">
            <WarningCircle size={32} weight="fill" />
          </div>
          <h2 className="text-base font-bold text-neutral-dark">Belum Ada Onboarding Aktif</h2>
          <p className="text-xs text-neutral-slate max-w-md mx-auto">
            Akun Anda saat ini belum memiliki lembar onboarding operasional atau telah terdaftar di bawah akun umum. Hubungi CEO atau tim administrasi untuk menghubungkan konteks pekerjaan internal.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Operational Readiness Card (Level 04 Section 81) */}
          <div className={`p-6 rounded-3xl border shadow-servio-xs transition-all ${
            readiness?.ready
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 text-emerald-950"
              : "bg-gradient-to-br from-amber-50 to-amber-100/40 border-amber-200 text-amber-950"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  readiness?.ready ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {readiness?.ready ? (
                    <CheckCircle size={28} weight="fill" />
                  ) : (
                    <Clock size={28} weight="bold" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-slate">
                    Status Kesiapan Operasional (Operational Readiness)
                  </div>
                  <div className="text-xl font-black font-display mt-0.5 flex items-center gap-2">
                    <span>{readiness?.ready ? "OPERATIONAL READY" : "NOT READY"}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      readiness?.ready ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                    }`}>
                      {readiness?.ready ? "Akses Operasional Penuh" : "Akses Dibatasi"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-dark/80 mt-1">
                    {readiness?.reason || (readiness?.ready
                      ? "Seluruh persyaratan akun, keanggotaan, peran, pekerjaan, dan onboarding telah terpenuhi."
                      : "Selesaikan seluruh formulir dan checklist onboarding untuk mengaktifkan akses operasional.")}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 bg-white/70 backdrop-blur-sm p-3 rounded-2xl border border-white/80">
                <span className="text-[10px] font-semibold text-neutral-slate uppercase">Progres Onboarding</span>
                <div className="text-2xl font-black font-display text-primary">
                  {onboarding.progress}%
                </div>
                <span className="text-[10px] font-bold text-neutral-slate">
                  {onboarding.status}
                </span>
              </div>
            </div>

            {/* 5 Readiness Checks Breakdown */}
            {readiness?.checks && (
              <div className="mt-4 pt-4 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  {readiness.checks.accountActive ? (
                    <Check size={14} weight="bold" className="text-emerald-700" />
                  ) : (
                    <X size={14} weight="bold" className="text-rose-500" />
                  )}
                  <span>Akun Aktif</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {readiness.checks.membershipActive ? (
                    <Check size={14} weight="bold" className="text-emerald-700" />
                  ) : (
                    <X size={14} weight="bold" className="text-rose-500" />
                  )}
                  <span>Membership</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {readiness.checks.roleAssignmentValid ? (
                    <Check size={14} weight="bold" className="text-emerald-700" />
                  ) : (
                    <X size={14} weight="bold" className="text-rose-500" />
                  )}
                  <span>Role Valid</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {readiness.checks.employmentActive ? (
                    <Check size={14} weight="bold" className="text-emerald-700" />
                  ) : (
                    <X size={14} weight="bold" className="text-rose-500" />
                  )}
                  <span>Pekerjaan Aktif</span>
                </div>

                <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  {readiness.checks.onboardingCompleted ? (
                    <Check size={14} weight="bold" className="text-emerald-700" />
                  ) : (
                    <X size={14} weight="bold" className="text-rose-500" />
                  )}
                  <span>Onboarding 100%</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar Container */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-servio-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-dark">Kelengkapan Formulir & Tugas Onboarding</span>
              <span className="font-mono font-bold text-primary">{onboarding.progress}% Selesai</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/80">
              <div
                className="bg-gradient-to-r from-primary to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${onboarding.progress}%` }}
              />
            </div>
          </div>

          {/* Checklist of Tasks */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-servio-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-dark">
                  Daftar Tugas Kesiapan (Onboarding Checklist)
                </h2>
                <p className="text-[11px] text-neutral-slate">
                  Klik setiap tugas untuk mengisi formulir, melengkapi identitas KTP, dan menandatangani SOP kerja.
                </p>
              </div>
              <span className="text-xs text-neutral-slate font-medium">
                {completedTasksCount} dari {totalTasksCount} Selesai
              </span>
            </div>

            <div className="space-y-3">
              {tasks.map((task, idx) => {
                const isCompleted = task.status === "COMPLETED";

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? "bg-slate-50/70 border-slate-200/80"
                        : "bg-white border-primary/20 hover:border-primary/50 shadow-servio-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {isCompleted ? <CheckCircle size={20} weight="fill" /> : getTaskIcon(task.code)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-neutral-dark">
                            {idx + 1}. {task.title}
                          </span>
                          {task.required && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200 uppercase">
                              Wajib
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {task.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-slate">
                          {task.description}
                        </p>
                        {task.completedAt && (
                          <div className="text-[10px] text-neutral-muted">
                            Diselesaikan pada: {new Date(task.completedAt).toLocaleString("id-ID")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0 flex items-center gap-2">
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <CheckCircle size={14} weight="fill" />
                            <span>Telah Selesai</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewDetailsTask(task)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-primary bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Lihat Data</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenTaskModal(task)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-servio-xs cursor-pointer"
                        >
                          <span>{task.code === "PROFILE_COMPLETION" || task.code === "REQUIRED_VERIFICATION" ? "Isi Formulir" : "Selesaikan Tugas"}</span>
                          <ArrowRight size={13} weight="bold" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complete Entire Onboarding CTA */}
            {onboarding.status !== "COMPLETED" && (
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-neutral-slate">
                  {allRequiredDone
                    ? "Seluruh tugas wajib telah terpenuhi! Klik tombol di samping untuk memfinalisasi onboarding."
                    : "Selesaikan seluruh formulir dan tugas wajib di atas untuk mengaktifkan tombol finalisasi onboarding."}
                </p>

                <button
                  type="button"
                  disabled={!allRequiredDone || completingAll}
                  onClick={handleCompleteAllOnboarding}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-servio-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  {completingAll ? (
                    <>
                      <SpinnerGap size={15} className="animate-spin" />
                      <span>Menyelesaikan Onboarding...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} weight="fill" />
                      <span>Tuntaskan Onboarding</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE TASK COMPLETION MODAL
      ========================================================================= */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  {getTaskIcon(activeTaskModal.code)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-dark">{activeTaskModal.title}</h3>
                  <p className="text-xs text-neutral-slate">{activeTaskModal.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="p-1.5 text-neutral-slate hover:text-neutral-dark rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <WarningCircle size={16} weight="bold" className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 2: PROFILE_COMPLETION FORM
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "PROFILE_COMPLETION" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>Lengkapi identitas profil internal Anda. Data ini akan ditampilkan pada sistem operasional dan badge profil staf Anda.</span>
                  </div>

                  {/* Avatar Upload / Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-dark">Foto Profil / Avatar</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {profileAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} className="text-slate-400" />
                        )}
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-neutral-dark text-xs font-semibold shadow-servio-xs cursor-pointer"
                        >
                          <UploadSimple size={14} />
                          <span>Pilih Foto Baru</span>
                        </button>
                        <p className="text-[10px] text-neutral-slate">Format JPG, PNG, atau WEBP. Maks 2MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-dark">Nama Tampilan (Display Name) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      placeholder="Contoh: Budi Santoso (Ops)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Gender and Date of Birth */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-dark">Jenis Kelamin</label>
                      <select
                        value={profileGender}
                        onChange={(e) => setProfileGender(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-primary"
                      >
                        <option value="MALE">Laki-laki</option>
                        <option value="FEMALE">Perempuan</option>
                        <option value="OTHER">Lainnya</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-dark">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={profileDateOfBirth}
                        onChange={(e) => setProfileDateOfBirth(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-dark">Bio Singkat / Ringkasan Peran <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={3}
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Tuliskan spesialisasi atau deskripsi singkat tugas harian Anda di SERVIO..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 4: REQUIRED_VERIFICATION FORM (NIK & KTP UPLOAD)
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "REQUIRED_VERIFICATION" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
                    <Shield size={16} className="shrink-0 mt-0.5" />
                    <span>Sesuai standar kepatuhan regulasi (compliance), seluruh staf operasional wajib memverifikasi Nomor Induk Kependudukan (NIK) dan mengunggah kartu e-KTP asli.</span>
                  </div>

                  {/* NIK Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-dark">Nomor Induk Kependudukan (NIK) <span className="text-rose-500">*</span></label>
                      <span className="text-[10px] font-mono text-neutral-slate">{verificationNik.length}/16 digit</span>
                    </div>
                    <input
                      type="text"
                      maxLength={16}
                      value={verificationNik}
                      onChange={(e) => setVerificationNik(e.target.value.replace(/\D/g, ""))}
                      placeholder="16 digit angka KTP (contoh: 3171012304980005)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary tracking-wider"
                    />
                  </div>

                  {/* KTP File Upload & Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-dark">Foto e-KTP Asli <span className="text-rose-500">*</span></label>
                      <button
                        type="button"
                        onClick={handleUseSampleKtp}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        + Gunakan Contoh KTP Uji Coba
                      </button>
                    </div>

                    <input
                      ref={ktpFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleKtpFileChange}
                      className="hidden"
                    />

                    {verificationKtpPreview ? (
                      <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={verificationKtpPreview}
                          alt="Preview KTP"
                          className="w-full h-44 object-contain rounded-xl bg-slate-900/5"
                        />
                        <div className="mt-2 flex items-center justify-between px-2">
                          <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                            <CheckCircle size={14} weight="fill" />
                            Foto KTP Terunggah
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => ktpFileInputRef.current?.click()}
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              Ganti Foto
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setVerificationKtpPreview("")}
                              className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash size={12} />
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => ktpFileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl p-6 text-center cursor-pointer transition hover:bg-slate-50 group"
                      >
                        <UploadSimple size={28} className="mx-auto text-slate-400 group-hover:text-primary mb-2 transition" />
                        <p className="text-xs font-bold text-neutral-dark group-hover:text-primary">
                          Klik untuk Unggah Foto KTP
                        </p>
                        <p className="text-[10px] text-neutral-slate mt-1">
                          Pastikan tulisan NIK dan foto wajah terlihat terang dan tidak buram (Format JPG/PNG, Maks 5MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <span className="text-xs font-bold text-neutral-dark block">Kontak Darurat (Emergency Contact)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-slate">Nama Kontak Darurat <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          placeholder="Nama kerabat / orang tua"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-neutral-slate">Nomor Telepon / WhatsApp <span className="text-rose-500">*</span></label>
                        <input
                          type="tel"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          placeholder="0812xxxxxxxx"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 3: EMPLOYMENT_CONFIRMATION
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "EMPLOYMENT_CONFIRMATION" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>Silakan tinjau data penempatan dan spesifikasi kontrak kerja Anda di SERVIO berikut ini:</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-neutral-slate">ID Karyawan (NIP):</span>
                      <span className="font-mono font-bold text-neutral-dark">{onboarding?.employment?.employeeId || "Belum Ditugaskan"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-neutral-slate">Departemen:</span>
                      <span className="font-bold text-neutral-dark">{onboarding?.employment?.department || "OPERATIONS"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-neutral-slate">Posisi / Jabatan:</span>
                      <span className="font-bold text-neutral-dark">{onboarding?.employment?.position || "Staff Internal"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-neutral-slate">Tipe Kepegawaian:</span>
                      <span className="font-bold text-primary">{onboarding?.employment?.employmentType || "FULL_TIME"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Tanggal Mulai Berlaku:</span>
                      <span className="font-bold text-neutral-dark">{onboarding?.employment?.startDate || "Segera"}</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employmentConfirmed}
                      onChange={(e) => setEmploymentConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs text-neutral-dark leading-relaxed">
                      Saya mengonfirmasi bahwa data penempatan, divisi, dan status hubungan kerja di atas adalah benar dan sesuai dengan penugasan saya.
                    </span>
                  </label>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 5: POLICY_ACKNOWLEDGEMENT
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "POLICY_ACKNOWLEDGEMENT" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
                    <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                    <span>Setiap personel staf SERVIO wajib memahami dan menandatangani Pakta Integritas dan Kebijakan Operasional Platform.</span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs space-y-3 max-h-56 overflow-y-auto">
                    <div className="space-y-1">
                      <h4 className="font-bold text-neutral-dark">1. Kerahasiaan Data & Rahasia Dagang (NDA)</h4>
                      <p className="text-neutral-slate text-[11px] leading-relaxed">
                        Staf dilarang keras menyebarluaskan, menyalin, atau mempergunakan data identitas merchant, dokumen KYC, maupun data transaksi pelanggan untuk kepentingan pribadi di luar penugasan resmi SERVIO.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-neutral-dark">2. Netralitas Audit & Larangan Gratifikasi</h4>
                      <p className="text-neutral-slate text-[11px] leading-relaxed">
                        Verifikasi dokumen pendaftaran merchant wajib dilakukan secara objektif. Staf dilarang menerima imbalan, hadiah, atau fasilitas apapun dari pihak merchant.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-neutral-dark">3. Penggunaan Kredensial & Akun Sistem</h4>
                      <p className="text-neutral-slate text-[11px] leading-relaxed">
                        Kredensial login bersifat rahasia dan individual. Seluruh aktivitas pada dashboard operasional tercatat dalam Audit Log permanen yang dipantau langsung oleh Direksi / CEO.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={(e) => setPolicyAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs text-neutral-dark leading-relaxed">
                      Saya telah membaca, memahami, dan berkomitmen mematuhi seluruh ketentuan dalam Pakta Integritas dan Kebijakan Operasional SERVIO.
                    </span>
                  </label>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 6: ACCESS_CONFIRMATION
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "ACCESS_CONFIRMATION" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>Konfirmasikan pemahaman batasan wewenang sistem dan tanggung jawab akun Anda.</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Peran Operasional:</span>
                      <span className="font-bold text-primary">{activeRole || (user as unknown as Record<string, string>).role || "Staff Internal"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Cakupan Akses:</span>
                      <span className="font-bold text-neutral-dark">INTERNAL_PLATFORM</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Sistem Pengawasan:</span>
                      <span className="font-bold text-emerald-700">Audit Logging Aktif</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accessAgreed}
                      onChange={(e) => setAccessAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs text-neutral-dark leading-relaxed">
                      Saya mengonfirmasi pemahaman wewenang dan batasan akses akun saya, serta bertanggung jawab penuh atas seluruh tindakan operasional yang saya lakukan.
                    </span>
                  </label>
                </div>
              )}

              {/* -------------------------------------------------------------
                  TASK 1: ACCOUNT_ACCEPTANCE
              ------------------------------------------------------------- */}
              {activeTaskModal.code === "ACCOUNT_ACCEPTANCE" && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Nama Staf:</span>
                      <span className="font-bold text-neutral-dark">{user.name}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-neutral-slate">Email Akun:</span>
                      <span className="font-bold text-neutral-dark">{user.email}</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accountAgreed}
                      onChange={(e) => setAccountAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                    />
                    <span className="text-xs text-neutral-dark leading-relaxed">
                      Saya mengonfirmasi bahwa akun ini adalah akun resmi saya dan menerima penugasan operasional di sistem SERVIO.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-neutral-slate hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={actionTaskId !== null}
                onClick={handleSubmitTaskModal}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-servio-xs disabled:opacity-60 cursor-pointer"
              >
                {actionTaskId ? (
                  <>
                    <SpinnerGap size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} weight="bold" />
                    <span>Simpan & Tuntaskan Tugas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW DETAILS MODAL (FOR ALREADY COMPLETED TASKS)
      ========================================================================= */}
      {viewDetailsTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle size={20} weight="fill" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-dark">{viewDetailsTask.title}</h3>
                  <p className="text-xs text-neutral-slate">Rincian data yang telah diserahkan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDetailsTask(null)}
                className="p-1.5 text-neutral-slate hover:text-neutral-dark rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {viewDetailsTask.code === "PROFILE_COMPLETION" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                      {onboarding?.profile?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={onboarding.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User size={24} className="text-slate-400" /></div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-neutral-dark">{onboarding?.profile?.displayName || user.name}</div>
                      <div className="text-[11px] text-neutral-slate">{onboarding?.profile?.gender || "Laki-laki"} • Lahir: {onboarding?.profile?.dateOfBirth || "-"}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider">Bio Peran</span>
                    <p className="text-neutral-dark text-xs">{onboarding?.profile?.bio || "-"}</p>
                  </div>
                </div>
              )}

              {viewDetailsTask.code === "REQUIRED_VERIFICATION" && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider">Nomor Induk Kependudukan (NIK)</span>
                    <p className="font-mono font-bold text-neutral-dark text-sm tracking-wider">
                      {onboarding?.user?.nik ? `${onboarding.user.nik.slice(0, 6)}******${onboarding.user.nik.slice(12)}` : (viewDetailsTask.metadata?.nik as string) || "-"}
                    </p>
                  </div>

                  {(onboarding?.user?.ktpFilePath || viewDetailsTask.metadata?.ktpFilePath) && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider">Dokumen e-KTP</span>
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(onboarding?.user?.ktpFilePath || viewDetailsTask.metadata?.ktpFilePath) as string}
                          alt="Foto KTP"
                          className="w-full h-40 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider">Kontak Darurat</span>
                    <p className="text-neutral-dark font-medium">
                      {onboarding?.user?.emergencyContact?.name || (viewDetailsTask.metadata?.emergencyContactName as string) || "-"}
                      {" - "}
                      {onboarding?.user?.emergencyContact?.phone || (viewDetailsTask.metadata?.emergencyContactPhone as string) || "-"}
                    </p>
                  </div>
                </div>
              )}

              {viewDetailsTask.code === "EMPLOYMENT_CONFIRMATION" && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-neutral-slate">ID Karyawan:</span>
                    <span className="font-mono font-bold text-neutral-dark">{onboarding?.employment?.employeeId || "-"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-neutral-slate">Departemen:</span>
                    <span className="font-bold text-neutral-dark">{onboarding?.employment?.department || "-"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-slate">Posisi:</span>
                    <span className="font-bold text-neutral-dark">{onboarding?.employment?.position || "-"}</span>
                  </div>
                </div>
              )}

              {viewDetailsTask.code !== "PROFILE_COMPLETION" && viewDetailsTask.code !== "REQUIRED_VERIFICATION" && viewDetailsTask.code !== "EMPLOYMENT_CONFIRMATION" && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 space-y-1">
                  <div className="font-bold">Telah Diverifikasi & Dikonfirmasi</div>
                  <div className="text-[11px]">Tugas ini telah diselesaikan dan diverifikasi oleh sistem pada {viewDetailsTask.completedAt ? new Date(viewDetailsTask.completedAt).toLocaleString("id-ID") : "-"}.</div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewDetailsTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
