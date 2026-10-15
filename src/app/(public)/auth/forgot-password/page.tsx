"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/servioApi";
import {
  EnvelopeSimple,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  Key,
  LockKey,
  Eye,
  EyeSlash,
  ShieldCheck,
  ArrowsClockwise,
} from "@phosphor-icons/react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Wizard Steps: 1 = Email, 2 = Masukkan OTP, 3 = Password Baru, 4 = Sukses
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form States
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetGrant, setResetGrant] = useState<string | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Countdown timer for OTP Resend (30 seconds)
  const [resendTimer, setResendTimer] = useState<number>(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Step 1: Request OTP to Email via Brevo
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      await authApi.forgotPassword(email);
      setStep(2);
      setResendTimer(30);
      setCanResend(false);
      setSuccessNotice(`Kode verifikasi OTP resmi telah dikirim ke ${email}.`);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengirimkan kode OTP. Silakan periksa kembali email Anda.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await authApi.forgotPassword(email);
      setResendTimer(30);
      setCanResend(false);
      setSuccessNotice("Kode OTP baru berhasil dikirimkan ulang ke email Anda.");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengirim ulang kode OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and get Reset Grant
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\s+/g, "");
    if (!cleanCode || cleanCode.length < 6) {
      setErrorMsg("Masukkan 6 digit kode OTP yang dikirimkan ke email Anda.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.verifyPasswordResetOtp(email, cleanCode);
      const grant = res.data?.reset_grant || (res as any)?.reset_grant;

      if (!grant) {
        throw new Error("Gagal memperoleh token verifikasi pemulihan kata sandi.");
      }

      setResetGrant(grant);
      setStep(3);
      setSuccessNotice("Kode OTP berhasil diverifikasi! Silakan buat kata sandi baru.");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Kode OTP tidak valid atau telah kedaluwarsa. Silakan periksa kembali.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Save New Password
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetGrant) {
      setErrorMsg("Sesi pemulihan kata sandi kedaluwarsa. Silakan ulangi proses dari awal.");
      setStep(1);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await authApi.resetPassword(resetGrant, newPassword, confirmPassword);
      setStep(4);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal memperbarui kata sandi. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[78vh] flex items-center justify-center py-12 px-4 bg-slate-50/50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
        
        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : step > s
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                <span
                  className={`text-[11px] font-semibold hidden sm:inline ${
                    step === s ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {s === 1 ? "Email" : s === 2 ? "Kode OTP" : "Sandi Baru"}
                </span>
                {s < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200 mx-1"></div>}
              </div>
            ))}
          </div>
        )}

        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            {step === 1 ? (
              <Key size={26} weight="duotone" />
            ) : step === 2 ? (
              <EnvelopeSimple size={26} weight="duotone" />
            ) : step === 3 ? (
              <LockKey size={26} weight="duotone" />
            ) : (
              <CheckCircle size={26} weight="fill" className="text-emerald-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark">
            {step === 1 && "Lupa Kata Sandi?"}
            {step === 2 && "Verifikasi Kode OTP"}
            {step === 3 && "Buat Kata Sandi Baru"}
            {step === 4 && "Kata Sandi Diperbarui!"}
          </h1>
          <p className="text-xs text-neutral-slate">
            {step === 1 && "Masukkan email terdaftar Anda. Kode verifikasi OTP resmi akan dikirim melalui Brevo."}
            {step === 2 && `Masukkan 6 digit kode OTP yang kami kirimkan ke email ${email}.`}
            {step === 3 && "Buat kata sandi baru yang aman untuk akun SERVIO Anda."}
            {step === 4 && "Kata sandi Anda telah berhasil diperbarui dan siap digunakan."}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Success Notice */}
        {successNotice && step < 4 && (
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs flex items-center gap-2">
            <ShieldCheck size={18} className="shrink-0 text-sky-600" weight="fill" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* STEP 1: FORM MASUKKAN EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-dark">
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
                  <EnvelopeSimple size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Mengirim Kode OTP...</span>
                </>
              ) : (
                <>
                  <span>Kirim Kode OTP via Brevo</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Halaman Masuk</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: FORM MASUKKAN KODE OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-dark text-center">
                6 Digit Kode Verifikasi OTP
              </label>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="• • • • • •"
                  className="w-56 py-3 text-center text-2xl font-bold tracking-[8px] font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition"
                />
              </div>
              <p className="text-[11px] text-center text-slate-500">
                Periksa kotak masuk atau spam email <strong>{email}</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Memverifikasi OTP...</span>
                </>
              ) : (
                <>
                  <span>Verifikasi & Lanjutkan</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Resend OTP button with countdown */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMsg(null);
                }}
                className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
              >
                <ArrowLeft size={14} />
                <span>Ganti Email</span>
              </button>

              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <ArrowsClockwise size={14} />
                  <span>Kirim Ulang OTP</span>
                </button>
              ) : (
                <span className="text-slate-400">
                  Kirim ulang dalam <strong className="text-slate-600">{resendTimer}s</strong>
                </span>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: BUAT KATA SANDI BARU */}
        {step === 3 && (
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-dark">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
                  <LockKey size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Memperbarui Kata Sandi...</span>
                </>
              ) : (
                <>
                  <span>Simpan Kata Sandi Baru</span>
                  <CheckCircle size={16} weight="bold" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: SUKSES */}
        {step === 4 && (
          <div className="text-center space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
              <p className="font-semibold text-sm text-emerald-900">
                Pembaruan Kata Sandi Berhasil!
              </p>
              <p>
                Kata sandi baru Anda telah aktif. Seluruh sesi lama telah direvoke demi keamanan akun.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover transition flex items-center justify-center gap-2"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
