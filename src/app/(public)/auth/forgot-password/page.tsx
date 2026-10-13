"use client";

import React, { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/servioApi";
import {
  EnvelopeSimple,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  Key,
} from "@phosphor-icons/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      if (res.data?.token) {
        setResetToken(res.data.token);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal memproses permohonan reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-servio-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Key size={26} weight="duotone" />
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark">
            Lupa Kata Sandi?
          </h1>
          <p className="text-xs text-neutral-slate">
            Masukkan email yang terdaftar untuk menerima instruksi pemulihan kata sandi.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle size={20} className="text-emerald-600" weight="fill" />
                <span>Instruksi Terkirim!</span>
              </div>
              <p>
                Jika email <strong>{email}</strong> terdaftar di sistem, tautan atau token reset telah dibuat.
              </p>
              {resetToken && (
                <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-300 text-neutral-dark">
                  <span className="text-[11px] font-semibold text-neutral-slate block mb-1">
                    Token Reset (Mode Pengujian Lokal):
                  </span>
                  <code className="text-xs font-mono bg-slate-100 p-1.5 rounded block break-all select-all text-primary">
                    {resetToken}
                  </code>
                </div>
              )}
            </div>

            <Link
              href={resetToken ? `/auth/reset-password?token=${resetToken}` : "/auth/reset-password"}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover transition flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Formulir Reset Password</span>
              <ArrowRight size={16} />
            </Link>

            <div className="text-center pt-2">
              <Link
                href="/auth/login"
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark inline-flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Halaman Masuk</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <SpinnerGap size={18} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Kirim Tautan Reset</span>
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
      </div>
    </div>
  );
}
