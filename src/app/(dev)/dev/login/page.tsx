"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TerminalWindow,
  Lock,
  Eye,
  EyeSlash,
  ShieldCheck,
  Warning,
  ArrowLeft,
  ArrowRight,
} from "@phosphor-icons/react";

function DevLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dev/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/dev/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json?.message || "Kredensial Developer Observability tidak valid.");
        return;
      }

      const safeNext =
        nextPath.startsWith("/dev") && nextPath !== "/dev/login" ? nextPath : "/dev/dashboard";
      router.push(safeNext);
      router.refresh();
    } catch {
      setErrorMsg("Gagal terhubung ke Next.js Dev Auth Gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen ambient-glow-mesh text-neutral-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md bg-white border border-neutral-border rounded-3xl p-7 shadow-servio-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-sky border border-primary/15 flex items-center justify-center text-primary">
            <TerminalWindow size={24} weight="bold" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-primary">
              SERVIO ENGINEERING
            </div>
            <h1 className="text-lg font-bold font-display text-neutral-dark">
              Developer Observability Portal
            </h1>
          </div>
        </div>

        <div className="mb-5 p-3.5 rounded-2xl bg-sky-light border border-sky flex items-start gap-2.5 text-xs text-primary-dark">
          <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" weight="fill" />
          <span>
            Portal ini terisolasi dari akun operasional bisnis &amp; tetap dapat diakses penuh walaupun{" "}
            <span className="font-mono font-semibold text-primary">identity-service :8001</span> sedang mati.
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <Warning size={16} className="shrink-0 mt-0.5 text-rose-600" weight="fill" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-dark mb-1.5">
              Developer Email
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@servio.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-dark mb-1.5">
              Passphrase Developer
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-slate"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi developer"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-subtle border border-neutral-border text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-slate hover:text-neutral-dark cursor-pointer"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-servio-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            <span>{loading ? "Memverifikasi Sesi..." : "Masuk ke Dev Console"}</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-neutral-border">
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-subtle hover:bg-neutral-soft border border-neutral-border text-neutral-dark font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>Kembali ke Landing Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DevLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-subtle flex items-center justify-center text-xs font-mono text-neutral-slate">
          Memuat Gerbang Developer...
        </div>
      }
    >
      <DevLoginForm />
    </Suspense>
  );
}
