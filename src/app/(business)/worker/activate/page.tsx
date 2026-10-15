"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/servioApi";
import {
  Wrench,
  LockKey,
  Eye,
  EyeSlash,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ShieldCheck,
  HouseLine,
} from "@phosphor-icons/react";

function WorkerActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    organization_name?: string;
    masked_recipient?: string;
    target_role?: string;
  } | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setPreviewLoading(true);
      apiFetch<{
        organization_name?: string;
        masked_recipient?: string;
        target_role?: string;
      }>(`/invitations/${token}/preview`)
        .then((res) => {
          if (res.data) {
            setPreviewData(res.data);
          }
        })
        .catch(() => {
          // Non-blocking preview error
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMsg("Token undangan wajib disertakan.");
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
      const res = await apiFetch(`/invitations/${encodeURIComponent(token.trim())}/accept`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (res.success || res.code === "IDENTITY_INVITATION_ACCEPTED") {
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setErrorMsg(res.message || "Gagal mengaktifkan akun teknisi.");
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal mengaktifkan akun teknisi. Periksa kembali token Anda.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-servio-md text-center space-y-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle size={32} weight="fill" />
        </div>
        <h2 className="text-xl font-bold font-display text-neutral-dark">
          Akun Teknisi Berhasil Diaktifkan!
        </h2>
        <p className="text-xs text-neutral-slate">
          Kata sandi berhasil disimpan dan Anda kini resmi terdaftar di bengkel mitra Servio. Mengalihkan ke halaman login...
        </p>
        <Link
          href="/auth/login"
          id="btn-goto-login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-servio-sm max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
          <Wrench size={24} weight="bold" />
        </div>
        <h1 className="text-xl font-bold font-display text-neutral-dark">
          Aktivasi Akun Teknisi Bengkel
        </h1>
        <p className="text-xs text-neutral-slate">
          Terima undangan bergabung sebagai mitra teknisi Servio (W06 &amp; W07)
        </p>
      </div>

      {previewLoading ? (
        <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-center gap-2 text-xs text-slate-500">
          <SpinnerGap size={16} className="animate-spin text-primary" />
          <span>Memeriksa detail undangan bengkel...</span>
        </div>
      ) : previewData ? (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-900">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <HouseLine size={16} weight="fill" />
            <span>Bengkel Pengundang: {previewData.organization_name || "Mitra Servio"}</span>
          </div>
          <p className="text-[11px] text-emerald-700">
            Penerima: <span className="font-mono">{previewData.masked_recipient}</span> • Role:{" "}
            <span className="font-bold">{previewData.target_role || "WORKER_TECHNICIAN"}</span>
          </p>
        </div>
      ) : null}

      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
        <span className="font-bold flex items-center gap-1 text-amber-800">
          <ShieldCheck size={16} weight="fill" />
          Invarian Single Active Worker
        </span>
        <p className="text-[11px] leading-relaxed">
          Sesuai aturan bisnis SERVIO, seorang teknisi hanya dapat aktif di <strong>1 bengkel mitra</strong> dalam satu waktu.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="form-activate-worker">
        <div>
          <label className="block text-xs font-bold text-neutral-dark mb-1">
            Token Undangan
          </label>
          <input
            id="input-worker-invite-token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Masukkan token undangan dari SMS/Email"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-dark mb-1">
            Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              id="input-worker-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-dark mb-1">
            Konfirmasi Kata Sandi
          </label>
          <input
            id="input-worker-password-confirm"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="Ketik ulang kata sandi"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <button
          id="btn-accept-invite"
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-servio-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <SpinnerGap size={16} className="animate-spin" />
              <span>Memproses Aktivasi...</span>
            </>
          ) : (
            <span>Aktifkan Akun &amp; Terima Undangan Bengkel</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function WorkerActivatePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <Suspense fallback={<div className="text-xs text-slate-400">Memuat halaman aktivasi...</div>}>
        <WorkerActivateContent />
      </Suspense>
    </div>
  );
}
