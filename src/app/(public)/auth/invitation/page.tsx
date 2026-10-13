"use client";

import React, { useState, Suspense } from "react";
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
} from "@phosphor-icons/react";

function StaffInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Token undangan wajib dimasukkan.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await authApi.completeInvitation(token, password, passwordConfirmation);
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 2500);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengaktifkan akun. Pastikan token undangan valid.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold font-display text-neutral-dark">
          Akun Berhasil Diaktifkan!
        </h2>
        <p className="text-xs text-neutral-slate">
          Kata sandi berhasil disimpan dan akun Anda kini AKTIF. Mengalihkan Anda ke portal login...
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
        >
          <span>Masuk ke Akun</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-dark">
          Token Undangan Staf / Teknisi
        </label>
        <input
          type="text"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Masukkan token undangan aktivasi akun"
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark font-mono placeholder:text-neutral-slate/60 focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-dark">
          Tentukan Kata Sandi Anda
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
          Konfirmasi Kata Sandi
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

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <WarningCircle size={16} className="shrink-0 text-rose-600" weight="fill" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <SpinnerGap size={18} className="animate-spin" />
            <span>Mengaktifkan Akun...</span>
          </>
        ) : (
          <>
            <span>Aktifkan Akun & Selesai</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export default function StaffInvitationPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <IdentificationBadge size={28} weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark">
            Aktivasi Akun Staf &amp; Teknisi
          </h1>
          <p className="text-xs text-neutral-slate">
            Anda telah diundang untuk bergabung dalam ekosistem SERVIO. Buat kata sandi akun Anda untuk mengaktifkan akses.
          </p>
        </div>

        <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-neutral-slate">Memuat form...</div>}>
          <StaffInvitationForm />
        </Suspense>

        <div className="text-center pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-neutral-slate">
          <ShieldCheck size={16} className="text-emerald-600" weight="fill" />
          <span>Portal Operasional &amp; Teknisi Lapangan SERVIO</span>
        </div>
      </div>
    </div>
  );
}
