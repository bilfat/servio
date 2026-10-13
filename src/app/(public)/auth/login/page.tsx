"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { authApi } from "@/lib/servioApi";
import { UserRole } from "@/types/auth";
import {
  EnvelopeSimple,
  LockKey,
  Eye,
  EyeSlash,
  ArrowRight,
  ShieldCheck,
  WarningCircle,
  SpinnerGap,
  Key,
  X,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Lightning,
  Crown,
  Briefcase,
  Bank,
  Wrench,
  Storefront,
  Truck,
  UserCircle,
  Headset,
  Sparkle,
} from "@phosphor-icons/react";

interface DevRoleOption {
  role: UserRole;
  label: string;
  name: string;
  email: string;
  password: string;
  badge: string;
  dest: string;
  category: "INTERNAL" | "BUSINESS" | "CUSTOMER";
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
}

const DEV_ROLE_ACCOUNTS: DevRoleOption[] = [
  // 1. Eksekutif & Manajemen Internal
  {
    role: "CEO_PRODUCT_OWNER",
    label: "CEO / Product Owner",
    name: "Michael Surya",
    email: "ceo@servio.id",
    password: "ServioCeo2026!",
    badge: "Eksekutif",
    dest: "/ceo/dashboard",
    category: "INTERNAL",
    icon: Crown,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    role: "ADMIN_OPERATIONS",
    label: "Admin Operations",
    name: "Siti Rahmawati",
    email: "admin@servio.id",
    password: "ServioAdmin2026!",
    badge: "Operasional",
    dest: "/ops/admin/dashboard",
    category: "INTERNAL",
    icon: ShieldCheck,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    role: "FINANCE_PAYMENT_OPS",
    label: "Finance & Escrow",
    name: "Hendrik Wijaya",
    email: "finance@servio.id",
    password: "ServioFinance2026!",
    badge: "Keuangan",
    dest: "/finance/dashboard",
    category: "INTERNAL",
    icon: Bank,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },

  // 2. Mitra Bisnis & Lapangan
  {
    role: "SERVICE_PROVIDER",
    label: "Service Provider",
    name: "Budi Santoso",
    email: "provider@servio.id",
    password: "ServioProvider2026!",
    badge: "Mitra Bengkel",
    dest: "/provider/dashboard",
    category: "BUSINESS",
    icon: Briefcase,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    role: "MERCHANT",
    label: "Merchant Toko",
    name: "Ko Hendra",
    email: "merchant@servio.id",
    password: "ServioMerchant2026!",
    badge: "Retail Part",
    dest: "/merchant/dashboard",
    category: "BUSINESS",
    icon: Storefront,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-700",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    role: "SUPPLIER",
    label: "Supplier B2B",
    name: "Suryanto Wijaya",
    email: "supplier@servio.id",
    password: "ServioSupplier2026!",
    badge: "Principal",
    dest: "/supplier/dashboard",
    category: "BUSINESS",
    icon: Truck,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-700",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    role: "WORKER_TECHNICIAN",
    label: "Worker / Teknisi",
    name: "Bambang Sudirman",
    email: "worker@servio.id",
    password: "ServioWorker2026!",
    badge: "Teknisi",
    dest: "/worker/dashboard",
    category: "BUSINESS",
    icon: Wrench,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-700",
    badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
  },

  // 3. Pelanggan & Layanan
  {
    role: "CUSTOMER",
    label: "Customer / Pelanggan",
    name: "Ahmad Fauzi",
    email: "customer@servio.id",
    password: "ServioCustomer2026!",
    badge: "Konsumen",
    dest: "/",
    category: "CUSTOMER",
    icon: UserCircle,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    role: "CUSTOMER_SUPPORT",
    label: "Customer Support",
    name: "Rina Oktaviani",
    email: "support@servio.id",
    password: "ServioSupport2026!",
    badge: "Helpdesk CS",
    dest: "/support/dashboard",
    category: "CUSTOMER",
    icon: Headset,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-700",
    badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
];

function getRoleDashboard(role?: string): string {
  switch (role) {
    case "CEO_PRODUCT_OWNER":
      return "/ceo/dashboard";
    case "ADMIN_OPERATIONS":
      return "/ops/admin/dashboard";
    case "SERVICE_PROVIDER":
      return "/provider/dashboard";
    case "WORKER_TECHNICIAN":
      return "/worker/dashboard";
    case "MERCHANT":
      return "/merchant/dashboard";
    case "SUPPLIER":
      return "/supplier/dashboard";
    case "CUSTOMER_SUPPORT":
      return "/support/dashboard";
    case "FINANCE_PAYMENT_OPS":
      return "/finance/dashboard";
    default:
      return "/";
  }
}

function resolveRedirectPath(role?: string, returnUrl?: string | null): string {
  if (!returnUrl || returnUrl.startsWith("/auth/") || returnUrl === "/login") {
    return getRoleDashboard(role);
  }
  if (role === "CEO_PRODUCT_OWNER" && (returnUrl.startsWith("/ceo") || returnUrl.startsWith("/executive"))) {
    return returnUrl;
  }
  if (role === "ADMIN_OPERATIONS" && returnUrl.startsWith("/ops")) {
    return returnUrl;
  }
  if (role === "SERVICE_PROVIDER" && returnUrl.startsWith("/provider")) {
    return returnUrl;
  }
  if (role === "WORKER_TECHNICIAN" && returnUrl.startsWith("/worker")) {
    return returnUrl;
  }
  if (role === "MERCHANT" && returnUrl.startsWith("/merchant")) {
    return returnUrl;
  }
  if (role === "SUPPLIER" && returnUrl.startsWith("/supplier")) {
    return returnUrl;
  }
  if (role === "CUSTOMER_SUPPORT" && returnUrl.startsWith("/support")) {
    return returnUrl;
  }
  if (role === "FINANCE_PAYMENT_OPS" && returnUrl.startsWith("/finance")) {
    return returnUrl;
  }
  if (
    role === "CUSTOMER" &&
    !returnUrl.startsWith("/provider") &&
    !returnUrl.startsWith("/worker") &&
    !returnUrl.startsWith("/merchant") &&
    !returnUrl.startsWith("/supplier") &&
    !returnUrl.startsWith("/ops") &&
    !returnUrl.startsWith("/ceo")
  ) {
    return returnUrl;
  }
  return getRoleDashboard(role);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { refreshUser, isAuthenticated, activeRole } = useActiveRole();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dev Stage Role Switcher State
  const [devCategoryFilter, setDevCategoryFilter] = useState<"ALL" | "INTERNAL" | "BUSINESS" | "CUSTOMER">("ALL");
  const [devLoginLoadingRole, setDevLoginLoadingRole] = useState<string | null>(null);

  // Quick Login Handler for Dev Stage
  const handleQuickLogin = async (account: DevRoleOption) => {
    setDevLoginLoadingRole(account.role);
    setErrorMsg(null);
    setEmail(account.email);
    setPassword(account.password);

    try {
      const res = await authApi.login(account.email, account.password);
      const sessionToken = res.data?.token;

      if (typeof window !== "undefined") {
        if (sessionToken) {
          document.cookie = `servio_token=${sessionToken}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `servio_session=${sessionToken}; path=/; max-age=604800; SameSite=Lax`;
        }
        document.cookie = "servio_guest=0; path=/; max-age=604800; SameSite=Lax";
        document.cookie = `servio_active_role=${account.role}; path=/; max-age=604800; SameSite=Lax`;
      }

      await refreshUser();
      const targetPath = resolveRedirectPath(account.role, returnUrl);
      router.replace(targetPath);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || `Gagal login sebagai ${account.label}`);
      setDevLoginLoadingRole(null);
    }
  };

  const handleFillFormOnly = (e: React.MouseEvent, account: DevRoleOption) => {
    e.stopPropagation();
    setEmail(account.email);
    setPassword(account.password);
    setErrorMsg(null);
  };

  const filteredDevAccounts = DEV_ROLE_ACCOUNTS.filter((acc) => {
    if (devCategoryFilter === "ALL") return true;
    return acc.category === devCategoryFilter;
  });

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"REQUEST" | "RESET" | "SUCCESS">("REQUEST");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotToken, setForgotToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // Business Registration Application Status Modal (Merchant, Provider, Supplier)
  const [businessStatusModal, setBusinessStatusModal] = useState<{
    isOpen: boolean;
    status: "UNDER_REVIEW" | "REVISION_REQUIRED" | "REJECTED";
    registrationNumber?: string;
    reviewNote?: string;
  }>({
    isOpen: false,
    status: "UNDER_REVIEW",
  });

  // If already authenticated, redirect straight to appropriate role dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const dest = resolveRedirectPath(activeRole, returnUrl);
      router.replace(dest);
    }
  }, [isAuthenticated, activeRole, returnUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Mohon masukkan email dan password Anda.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authApi.login(email, password);
      const sessionToken = res.data?.token;

      if (typeof window !== "undefined") {
        if (sessionToken) {
          document.cookie = `servio_token=${sessionToken}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `servio_session=${sessionToken}; path=/; max-age=604800; SameSite=Lax`;
        }
        document.cookie = "servio_guest=0; path=/; max-age=604800; SameSite=Lax";
      }

      await refreshUser();

      // Level 02 Hardening: Derive redirect target strictly from canonical active role assignment
      const canonicalActiveRole = (res.data?.user?.role as UserRole) || "CUSTOMER";

      if (typeof window !== "undefined") {
        document.cookie = `servio_active_role=${canonicalActiveRole}; path=/; max-age=604800; SameSite=Lax`;
      }

      // Determine redirect path matching the canonical active role safely
      const targetPath = resolveRedirectPath(canonicalActiveRole, returnUrl);
      router.replace(targetPath);
    } catch (err: unknown) {
      const error = err as Error & {
        message?: string;
        errors?: Record<string, string[]>;
      };

      const rawMsg = error.message || "";
      const appStatus = error.errors?.applicationStatus?.[0] as "UNDER_REVIEW" | "REVISION_REQUIRED" | "REJECTED" | undefined;
      const regNo = error.errors?.registrationNumber?.[0] || rawMsg.match(/REG-\d{4}-\d+/)?.[0];
      const note = error.errors?.reviewNote?.[0] || (
        rawMsg.includes(":") ? rawMsg.split(":").slice(1).join(":").split(".")[0].trim() : undefined
      );

      // Check if this error is due to a business application status check
      const detectedStatus = appStatus || (
        rawMsg.includes("UNDER_REVIEW") || rawMsg.includes("dalam peninjauan") ? "UNDER_REVIEW" :
        rawMsg.includes("REVISION_REQUIRED") || rawMsg.includes("memerlukan revisi") ? "REVISION_REQUIRED" :
        rawMsg.includes("REJECTED") || rawMsg.includes("telah ditolak") ? "REJECTED" : null
      );

      if (detectedStatus) {
        setBusinessStatusModal({
          isOpen: true,
          status: detectedStatus,
          registrationNumber: regNo,
          reviewNote: note,
        });
        return;
      }

      const finalMsg = error.errors?.email?.[0] || error.message || "Gagal masuk. Periksa kembali email dan password.";
      setErrorMsg(finalMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError("Mohon masukkan email Anda.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      if (!res.data?.token) {
        throw new Error(res.message || "Email tidak terdaftar dalam sistem SERVIO.");
      }
      setForgotToken(res.data.token);
      setForgotStep("RESET");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setForgotError(error.message || "Gagal memproses permohonan reset kata sandi.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotToken) {
      setForgotError("Token reset kata sandi wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setForgotError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authApi.resetPassword(forgotToken, newPassword, newPasswordConfirm);
      setForgotStep("SUCCESS");
      setForgotSuccessMsg("Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.");
      setEmail(forgotEmail);
      setPassword("");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setForgotError(error.message || "Gagal memperbarui kata sandi. Pastikan token masih berlaku.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <SpinnerGap size={36} className="text-primary animate-spin" />
        <p className="text-xs text-neutral-slate font-medium">Mengarahkan ke Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Login Card (lg:col-span-5) */}
        <div className="lg:col-span-5 w-full space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-md space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
                <ShieldCheck size={14} weight="bold" />
                <span>Akses Tunggal SERVIO</span>
              </div>
              <h1 className="text-2xl font-bold font-display text-neutral-dark tracking-tight">
                Selamat Datang Kembali
              </h1>
              <p className="text-xs text-neutral-slate max-w-sm mx-auto">
                Satu pintu masuk untuk seluruh peran ekosistem Pelanggan, Bisnis Mitra, dan Operasional SERVIO.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                <WarningCircle size={18} className="shrink-0 mt-0.5 text-rose-600" weight="fill" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-dark">
                  Alamat Email
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

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Kata Sandi
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotStep("REQUEST");
                        setForgotError(null);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] font-medium text-primary hover:underline focus:outline-none"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-slate">
                    <LockKey size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-xs shadow-servio-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <SpinnerGap size={18} className="animate-spin" />
                    <span>Memverifikasi Sesi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Register Link */}
            <div className="pt-2 text-center text-xs text-neutral-slate space-y-2">
              <div>
                <span>Belum memiliki akun SERVIO? </span>
                <Link
                  href="/auth/register"
                  className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Daftar Sekarang
                </Link>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/registration/status"
                  className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-primary transition py-1 px-2.5 rounded-lg hover:bg-slate-50"
                >
                  <FileText size={14} weight="bold" />
                  <span>Pendaftar Bisnis / Mitra? Cek Status Pendaftaran</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-slate">
            <ShieldCheck size={16} className="text-emerald-600" weight="fill" />
            <span>Enkripsi TLS 1.3 & Servio Keamanan</span>
          </div>
        </div>

        {/* Right Column: Dev Stage Role Switcher Panel (lg:col-span-7) */}
        <div className="lg:col-span-7 w-full bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-800 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[11px] font-bold tracking-wide uppercase">
                <Lightning size={13} weight="fill" />
                <span>Dev Stage • Quick Access</span>
              </div>
              <h2 className="text-lg font-bold font-display text-white mt-1.5 flex items-center gap-2">
                <span>Pintas Masuk Semua Role</span>
                <Sparkle size={16} weight="fill" className="text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Akses cepat untuk pengujian alur kerja & dashboard 9 role ekosistem tanpa perlu mengetik kredensial.
              </p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => setDevCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                devCategoryFilter === "ALL"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Semua Role (9)
            </button>
            <button
              type="button"
              onClick={() => setDevCategoryFilter("INTERNAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                devCategoryFilter === "INTERNAL"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Internal & Ops (3)
            </button>
            <button
              type="button"
              onClick={() => setDevCategoryFilter("BUSINESS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                devCategoryFilter === "BUSINESS"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Mitra Bisnis (4)
            </button>
            <button
              type="button"
              onClick={() => setDevCategoryFilter("CUSTOMER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                devCategoryFilter === "CUSTOMER"
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              Pelanggan & CS (2)
            </button>
          </div>

          {/* Grid of Role Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredDevAccounts.map((account) => {
              const IconComp = account.icon;
              const isLoggingIn = devLoginLoadingRole === account.role;

              return (
                <div
                  key={account.role}
                  className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-2xl p-3.5 transition flex flex-col justify-between gap-3 group relative overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${account.iconBg} ${account.iconColor} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                      <IconComp size={20} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-primary-light transition-colors">
                          {account.label}
                        </h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${account.badgeBg}`}>
                          {account.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                        {account.name}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        <span>{account.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                    <button
                      type="button"
                      disabled={devLoginLoadingRole !== null || loading}
                      onClick={() => handleQuickLogin(account)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary-hover active:scale-[0.98] text-white text-[11px] font-bold shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoggingIn ? (
                        <>
                          <SpinnerGap size={13} className="animate-spin" />
                          <span>Masuk...</span>
                        </>
                      ) : (
                        <>
                          <Lightning size={13} weight="fill" />
                          <span>Masuk Langsung</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      title="Isi email & sandi ke formulir"
                      onClick={(e) => handleFillFormOnly(e, account)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-[11px] font-medium transition cursor-pointer"
                    >
                      Isi Form
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dev Help Note */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between gap-3 text-slate-400 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Mock Engine Frontend Aktif (Standalone, tanpa backend eksternal).</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">v1.0.0-dev</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Interactive Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-servio-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Key size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-neutral-dark">
                    Pemulihan Kata Sandi
                  </h3>
                  <p className="text-[11px] text-neutral-slate">
                    Reset kata sandi akun SERVIO Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotError(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-neutral-slate hover:text-neutral-dark flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <WarningCircle size={16} className="shrink-0 mt-0.5 text-rose-600" weight="fill" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Step 1: Request Token by Email */}
            {forgotStep === "REQUEST" && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs text-neutral-slate">
                  Masukkan alamat email yang terdaftar pada akun SERVIO Anda. Kami akan menerbitkan token pemulihan.
                </p>

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
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-neutral-slate font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-hover disabled:opacity-60 transition flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <SpinnerGap size={16} className="animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Minta Token Reset</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Input Token and New Password */}
            {forgotStep === "RESET" && (
              <form onSubmit={handlePerformReset} className="space-y-4">
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs">
                  <span>Permintaan reset untuk <strong>{forgotEmail}</strong> telah diproses. Masukkan token reset dan kata sandi baru.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Token Reset
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotToken}
                    onChange={(e) => setForgotToken(e.target.value)}
                    placeholder="Masukkan token reset"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Ulangi Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Konfirmasi kata sandi baru"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep("REQUEST")}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-neutral-slate font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-hover disabled:opacity-60 transition flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <SpinnerGap size={16} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span>Simpan Kata Sandi</span>
                        <CheckCircle size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Confirmation */}
            {forgotStep === "SUCCESS" && (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} weight="fill" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-neutral-dark">
                    Kata Sandi Berhasil Diperbarui
                  </h4>
                  <p className="text-xs text-neutral-slate">
                    {forgotSuccessMsg || "Silakan login menggunakan kata sandi baru Anda."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary-hover transition"
                >
                  Masuk Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Application Status Modal */}
      {businessStatusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleUp relative">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setBusinessStatusModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-5 right-5 text-neutral-slate hover:text-neutral-dark p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>

            {/* Status Visual Header */}
            <div className="text-center space-y-3">
              {businessStatusModal.status === "UNDER_REVIEW" && (
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                  <Clock size={36} weight="duotone" />
                </div>
              )}
              {businessStatusModal.status === "REVISION_REQUIRED" && (
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <WarningCircle size={36} weight="duotone" />
                </div>
              )}
              {businessStatusModal.status === "REJECTED" && (
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                  <XCircle size={36} weight="duotone" />
                </div>
              )}

              <div className="space-y-1">
                {businessStatusModal.registrationNumber && (
                  <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                    {businessStatusModal.registrationNumber}
                  </span>
                )}
                <h3 className="text-lg font-bold font-display text-neutral-dark pt-1">
                  {businessStatusModal.status === "UNDER_REVIEW" && "Pendaftaran Sedang Ditinjau"}
                  {businessStatusModal.status === "REVISION_REQUIRED" && "Permintaan Revisi Dokumen"}
                  {businessStatusModal.status === "REJECTED" && "Pendaftaran Belum Disetujui"}
                </h3>
                <p className="text-xs text-neutral-slate max-w-sm mx-auto leading-relaxed">
                  {businessStatusModal.status === "UNDER_REVIEW" &&
                    "Dokumen pendaftaran dan profil legal usaha Anda sedang dalam proses verifikasi operasional oleh tim verifikator SERVIO. Proses ini biasanya memakan waktu 1x24 jam kerja."}
                  {businessStatusModal.status === "REVISION_REQUIRED" &&
                    "Tim Admin telah meninjau pendaftaran Anda dan meminta perbaikan berkas dokumen sebelum akun kemitraan dapat diaktifkan."}
                  {businessStatusModal.status === "REJECTED" &&
                    "Mohon maaf, pendaftaran bisnis belum memenuhi kualifikasi standar mitra SERVIO saat ini."}
                </p>
              </div>
            </div>

            {/* Review Note Box if present */}
            {businessStatusModal.reviewNote && (
              <div
                className={`p-4 rounded-2xl border text-left text-xs space-y-1 ${
                  businessStatusModal.status === "REVISION_REQUIRED"
                    ? "bg-amber-50/80 border-amber-200 text-amber-950"
                    : "bg-rose-50/80 border-rose-200 text-rose-950"
                }`}
              >
                <span className="font-bold text-[11px] uppercase tracking-wider block opacity-80">
                  Catatan dari Verifikator Admin:
                </span>
                <p className="font-medium leading-relaxed italic">
                  &ldquo;{businessStatusModal.reviewNote}&rdquo;
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              {businessStatusModal.status === "REVISION_REQUIRED" && businessStatusModal.registrationNumber && (
                <button
                  type="button"
                  onClick={() => {
                    const regId = businessStatusModal.registrationNumber;
                    setBusinessStatusModal((prev) => ({ ...prev, isOpen: false }));
                    router.push(`/registration/status?id=${regId}`);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-servio-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Unggah Dokumen Revisi Sekarang</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              )}

              {businessStatusModal.status === "UNDER_REVIEW" && businessStatusModal.registrationNumber && (
                <button
                  type="button"
                  onClick={() => {
                    const regId = businessStatusModal.registrationNumber;
                    setBusinessStatusModal((prev) => ({ ...prev, isOpen: false }));
                    router.push(`/registration/status?id=${regId}`);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span>Pantau Detail Status Berkas</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setBusinessStatusModal((prev) => ({ ...prev, isOpen: false }))}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-neutral-slate font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
