"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/servioApi";
import {
  LockKey,
  Eye,
  EyeSlash,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ShieldCheck,
  IdentificationBadge,
  Buildings,
  UserCheck,
  Key,
  User,
  Calendar,
  Phone,
} from "@phosphor-icons/react";

function extractToken(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  if (trimmed.includes("token=")) {
    const match = trimmed.match(/token=([a-zA-Z0-9_\-\.]+)/);
    if (match) return match[1];
  }
  return trimmed;
}

interface InvitationPreviewData {
  kind?: string;
  organization_id?: string;
  organization_name?: string;
  entity_name?: string;
  entity_label?: string;
  worker_name?: string;
  recipient_name?: string;
  employee_id?: string;
  phone?: string;
  masked_recipient?: string;
  recipient_email?: string;
  raw_email?: string;
  target_role?: string;
  role_name?: string;
  role_label?: string;
  expires_at?: string;
  token?: string;
}

function StaffInvitationForm({
  onPreviewLoaded,
}: {
  onPreviewLoaded?: (preview: InvitationPreviewData | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParamToken = searchParams.get("token") || "";

  const [token, setToken] = useState(() => extractToken(rawParamToken));
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const [invitePreview, setInvitePreview] = useState<InvitationPreviewData | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  // Worker Quick Profile Fields (Modul 01 Identity Specification)
  const [workerName, setWorkerName] = useState("");
  const [gender, setGender] = useState<"LAKI_LAKI" | "PEREMPUAN">("LAKI_LAKI");
  const [birthDate, setBirthDate] = useState("1998-05-12");
  const [phone, setPhone] = useState("");
  const [sopAgreed, setSopAgreed] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState("/auth/login");

  // Validate and preview invitation when token changes
  useEffect(() => {
    const clean = extractToken(token);
    if (!clean) {
      setInvitePreview(null);
      setTokenError(null);
      return;
    }

    let isMounted = true;
    setValidatingToken(true);
    setTokenError(null);

    authApi
      .previewInvitation(clean)
      .then((res: any) => {
        if (!isMounted) return;
        const data = (res && (res.data || res)) as InvitationPreviewData;
        if (data && (data.organization_name || data.masked_recipient || data.entity_name)) {
          setInvitePreview(data);
          onPreviewLoaded?.(data);
          setTokenError(null);
          if (data.worker_name && data.worker_name !== "Teknisi" && data.worker_name !== "Staf Internal") {
            setWorkerName(data.worker_name);
          }
          if (data.phone) {
            setPhone(data.phone);
          }
        } else {
          setInvitePreview(null);
          onPreviewLoaded?.(null);
          setTokenError("Undangan tidak valid atau telah kedaluwarsa.");
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setInvitePreview(null);
        onPreviewLoaded?.(null);
        setTokenError(err.message || "Tautan undangan tidak valid atau telah kedaluwarsa.");
      })
      .finally(() => {
        if (isMounted) setValidatingToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = extractToken(token);
    if (!cleanToken) {
      setErrorMsg("Token undangan wajib dimasukkan.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    const isWorker = invitePreview?.kind === "WORKER";
    if (isWorker && !sopAgreed) {
      setErrorMsg("Anda wajib menyetujui SOP Kerja & Etika Layanan SERVIO untuk mengaktifkan akun.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.completeInvitation(cleanToken, password, passwordConfirmation, {
        display_name: isWorker && workerName.trim() ? workerName.trim() : undefined,
        gender: isWorker ? gender : undefined,
        birth_date: isWorker ? birthDate : undefined,
        phone: isWorker && phone.trim() ? phone.trim() : undefined,
        sop_agreed: isWorker ? sopAgreed : true,
      });

      const resData = (res as any)?.data || res;
      const targetUrl = resData?.redirect_url || (isWorker ? "/worker/profile" : "/auth/login");
      setRedirectDestination(targetUrl);
      setSuccess(true);
      setTimeout(() => {
        router.push(targetUrl);
      }, 2500);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengaktifkan akun. Pastikan token undangan valid.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const isWorker = invitePreview?.kind === "WORKER";
    return (
      <div className="text-center space-y-4 py-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold font-display text-neutral-dark">
          Akun {isWorker ? "Teknisi" : "Staf"} Berhasil Diaktifkan!
        </h2>
        <p className="text-xs text-neutral-slate leading-relaxed">
          Kata sandi dan profil dasar Anda berhasil disimpan. Akun Anda kini aktif di{" "}
          <strong className="text-neutral-dark">{invitePreview?.organization_name || "SERVIO"}</strong>.
          Mengalihkan Anda ke {isWorker ? "profil teknisi" : "portal login"}...
        </p>
        <Link
          href={redirectDestination}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
        >
          <span>{isWorker ? "Buka Profil Teknisi" : "Masuk ke Akun"}</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Invitation Details Banner */}
      {validatingToken ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-xs text-neutral-slate">
          <SpinnerGap size={18} className="animate-spin text-primary" />
          <span>Memverifikasi token undangan...</span>
        </div>
      ) : invitePreview ? (
        <div
          className={`p-4 rounded-2xl space-y-2.5 animate-fadeIn border ${
            invitePreview.kind === "STAFF"
              ? "bg-purple-50/70 border-purple-200/80"
              : "bg-sky-50/70 border-sky-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                invitePreview.kind === "STAFF" ? "text-purple-900" : "text-sky-800"
              }`}
            >
              <CheckCircle size={15} weight="fill" className="text-emerald-600" />
              {invitePreview.kind === "STAFF"
                ? "Undangan Staf Terverifikasi"
                : "Undangan Teknisi Terverifikasi"}
            </span>
            <button
              type="button"
              onClick={() => setShowManualToken(!showManualToken)}
              className={`text-[10px] hover:underline font-medium ${
                invitePreview.kind === "STAFF" ? "text-purple-700" : "text-sky-700"
              }`}
            >
              {showManualToken ? "Sembunyikan Token" : "Lihat Token"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-neutral-dark">
            <div className="flex items-center gap-2">
              {invitePreview.kind === "STAFF" ? (
                <IdentificationBadge size={18} className="text-purple-600 shrink-0" weight="duotone" />
              ) : (
                <Buildings size={18} className="text-[#0F4C81] shrink-0" weight="duotone" />
              )}
              <div>
                <p className="text-[10px] text-neutral-slate">
                  {invitePreview.kind === "STAFF" ? "Unit Kerja / Entitas:" : "Mitra / Bengkel:"}
                </p>
                <p className="font-bold text-neutral-dark">
                  {invitePreview.kind === "STAFF"
                    ? "Staf Internal SERVIO"
                    : (invitePreview.organization_name || "Mitra Bengkel")}
                </p>
                {invitePreview.role_name && (
                  <span
                    className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      invitePreview.kind === "STAFF"
                        ? "text-purple-700 bg-purple-100/90"
                        : "text-sky-700 bg-sky-100/90"
                    }`}
                  >
                    {invitePreview.role_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserCheck
                size={18}
                className={
                  invitePreview.kind === "STAFF"
                    ? "text-purple-600 shrink-0"
                    : "text-emerald-600 shrink-0"
                }
                weight="duotone"
              />
              <div>
                <p className="text-[10px] text-neutral-slate">
                  {invitePreview.kind === "STAFF" ? "Tujuan Akun Staf:" : "Tujuan Akun Teknisi:"}
                </p>
                <p className="font-bold text-neutral-dark font-mono text-[11px]">
                  {invitePreview.masked_recipient || invitePreview.recipient_email || "Akun Terundang"}
                </p>
                {invitePreview.worker_name && invitePreview.worker_name !== "Teknisi" && invitePreview.worker_name !== "Staf Internal" && (
                  <p className="text-[10px] text-neutral-slate mt-0.5 font-medium">{invitePreview.worker_name}</p>
                )}
              </div>
            </div>

            {/* Employee ID Preview Badge */}
            {invitePreview.employee_id && (
              <div className="p-2 bg-white/70 rounded-xl border border-sky-200/60 flex items-center justify-between text-xs sm:col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">Employee ID / Kode Teknisi:</span>
                <span className="font-mono font-bold text-[#0F4C81] text-[11px] bg-sky-100/80 px-2 py-0.5 rounded-md">
                  {invitePreview.employee_id}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Manual Token Input (shown if no preview yet, or toggled) */}
      {(!invitePreview || showManualToken) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-neutral-dark">
              {invitePreview?.kind === "STAFF"
                ? "Token Undangan Staf Internal"
                : "Token Undangan Staf / Teknisi"}
            </label>
            {invitePreview && (
              <span className="text-[10px] text-emerald-600 font-bold">Terverifikasi ✓</span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
              <Key size={16} />
            </div>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => {
                const cleaned = extractToken(e.target.value);
                setToken(cleaned);
              }}
              placeholder="Masukkan token dari link undangan Anda"
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark font-mono placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>
          <p className="text-[11px] text-neutral-slate">
            Jika membuka dari tautan yang disalin, token otomatis terisi. Anda juga dapat menempelkan URL lengkap di sini.
          </p>
          {tokenError && (
            <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
              <WarningCircle size={14} weight="fill" />
              {tokenError}
            </p>
          )}
        </div>
      )}

      {/* Password Inputs */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-dark">
          Tentukan Kata Sandi Baru
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
            <LockKey size={18} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-slate hover:text-neutral-dark"
          >
            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-dark">
          Konfirmasi Kata Sandi Baru
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
            <LockKey size={18} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="Ulangi kata sandi"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
          />
        </div>
      </div>

      {/* If Worker: Basic Personal Profile & SOP Agreement (Modul 01 Identity Specification) */}
      {invitePreview?.kind === "WORKER" && (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#0F4C81]" weight="bold" />
            <span className="font-bold text-xs text-slate-800">
              Data Profil Pribadi Teknisi
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              (Identitas dasar terdaftar)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-dark mb-1">
                Nama Lengkap
              </label>
              <input
                id="input-worker-display-name"
                type="text"
                required
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="Nama sesuai KTP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-dark mb-1">
                Nomor WhatsApp / HP
              </label>
              <input
                id="input-worker-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-dark mb-1">
                Jenis Kelamin
              </label>
              <select
                id="select-worker-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as "LAKI_LAKI" | "PEREMPUAN")}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
              >
                <option value="LAKI_LAKI">Laki-laki</option>
                <option value="PEREMPUAN">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-dark mb-1">
                Tanggal Lahir
              </label>
              <input
                id="input-worker-birth-date"
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
              />
            </div>
          </div>

          {/* Persetujuan SOP Kerja */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#0F4C81]/40 cursor-pointer transition">
              <input
                id="checkbox-sop-agreed"
                type="checkbox"
                checked={sopAgreed}
                onChange={(e) => setSopAgreed(e.target.checked)}
                className="mt-0.5 rounded text-[#0F4C81] focus:ring-[#0F4C81] cursor-pointer"
              />
              <div className="text-[11px] text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block mb-0.5">
                  Persetujuan SOP Kerja &amp; Kode Etik Teknisi SERVIO
                </span>
                Saya menyatakan tunduk dan menyetujui seluruh Standar Operasional Prosedur (SOP) pengerjaan servis, etika keramahan pelanggan, dan standar keselamatan kerja SERVIO.
              </div>
            </label>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <WarningCircle size={16} className="shrink-0 text-rose-600" weight="fill" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || validatingToken}
        className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <SpinnerGap size={18} className="animate-spin" />
            <span>Mengaktifkan Akun...</span>
          </>
        ) : (
          <>
            <span>{invitePreview?.kind === "WORKER" ? "Aktifkan Akun Teknisi & Mulai Bertugas" : "Aktifkan Akun & Selesai"}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export default function StaffInvitationPage() {
  const [previewData, setPreviewData] = useState<InvitationPreviewData | null>(null);
  const isStaff = previewData?.kind === "STAFF";

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
        <div className="text-center space-y-2">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto transition-colors ${
              isStaff ? "bg-purple-100 text-purple-600" : "bg-blue-50 text-blue-600"
            }`}
          >
            <IdentificationBadge size={28} weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark">
            {isStaff
              ? "Aktivasi Akun Staf Internal"
              : previewData?.kind === "WORKER"
              ? "Aktivasi Akun Teknisi Lapangan"
              : "Aktivasi Akun Staf & Teknisi"}
          </h1>
          <p className="text-xs text-neutral-slate">
            {isStaff
              ? "Anda telah diundang sebagai Staf Operasional SERVIO. Buat kata sandi akun Anda untuk mengaktifkan akses."
              : previewData?.kind === "WORKER"
              ? "Anda telah diundang sebagai Teknisi Mitra Bengkel SERVIO. Buat kata sandi akun Anda untuk mengaktifkan akses."
              : "Anda telah diundang untuk bergabung dalam ekosistem SERVIO. Buat kata sandi akun Anda untuk mengaktifkan akses."}
          </p>
        </div>

        <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-neutral-slate">Memuat form...</div>}>
          <StaffInvitationForm onPreviewLoaded={setPreviewData} />
        </Suspense>

        <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-neutral-slate">
          <ShieldCheck size={16} className="text-emerald-600" weight="fill" />
          <span>
            {isStaff
              ? "Portal Manajemen & Staf Operasional SERVIO"
              : previewData?.kind === "WORKER"
              ? "Portal Teknisi Lapangan & Mitra Bengkel SERVIO"
              : "Portal Layanan & Operasional Terpadu SERVIO"}
          </span>
        </div>
      </div>
    </div>
  );
}
