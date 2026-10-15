"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Toast } from "@/components/feedback/Toast";
import { authApi } from "@/lib/servioApi";
import {
  ShieldCheck,
  Key,
  Devices,
  SignOut,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  LockKey,
  Eye,
  EyeSlash,
  Globe,
  Trash,
  Laptop,
  DeviceMobile,
  Check,
} from "@phosphor-icons/react";

interface DeviceSession {
  id: string;
  device_name?: string;
  created_ip?: string;
  last_seen_at?: string;
  created_at?: string;
  current?: boolean;
}

export default function AccountSecurityPage() {
  const { user, refreshUser } = useActiveRole();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" } | null>(null);

  // Change Password Form State (A16)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Device Sessions State (A12, A13, A11)
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  // Google Linking State (A05-A07)
  const [googleLinking, setGoogleLinking] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await authApi.getSessions();
      if (res.data && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
      }
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword.length < 8) {
      setPassError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setChangingPass(true);
    try {
      const res = await authApi.changePassword(oldPassword, newPassword, confirmPassword);
      setToast({
        message: res.message || "Kata sandi berhasil diubah! Sesi lain telah direvoke demi keamanan.",
        type: "success",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await fetchSessions();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setPassError(error.message || "Gagal mengubah kata sandi. Pastikan kata sandi lama benar.");
    } finally {
      setChangingPass(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Apakah Anda yakin ingin mencabut akses sesi pada perangkat ini?")) return;
    setRevokingSessionId(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setToast({ message: "Sesi perangkat berhasil dicabut.", type: "success" });
      await fetchSessions();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal mencabut sesi.", type: "error" });
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    if (!confirm("Cabut semua sesi perangkat lain yang sedang aktif? Anda akan tetap masuk di perangkat ini.")) return;
    setRevokingAll(true);
    try {
      await authApi.logoutAll();
      setToast({ message: "Semua sesi perangkat lain telah berhasil dicabut.", type: "success" });
      await fetchSessions();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal mencabut sesi lain.", type: "error" });
    } finally {
      setRevokingAll(false);
    }
  };

  const handleGoogleLink = async () => {
    setGoogleLinking(true);
    try {
      const res = await authApi.googleLinkStart();
      if (res.data?.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        setToast({ message: "Konfigurasi Google OAuth belum disetel di server.", type: "warning" });
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal menghubungkan Google.", type: "error" });
    } finally {
      setGoogleLinking(false);
    }
  };

  const handleGoogleUnlink = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan tautan akun Google dari akun SERVIO ini?")) return;
    setGoogleLinking(true);
    try {
      await authApi.googleUnlink();
      setToast({ message: "Tautan akun Google berhasil diputus.", type: "success" });
      await refreshUser();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal memutuskan tautan Google.", type: "error" });
    } finally {
      setGoogleLinking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-neutral-dark hover:bg-slate-50 text-xs font-bold shadow-servio-xs transition-all"
        >
          <ArrowLeft size={16} weight="bold" className="text-primary" />
          <span>Kembali ke Profil Akun</span>
        </Link>
      </div>

      <PageHeader
        title="Keamanan Akun & Sesi Perangkat"
        description="Kelola kata sandi, pantau perangkat aktif yang terhubung, dan kontrol integrasi akun Google Anda."
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Profil", href: "/profile" },
          { label: "Keamanan Akun" },
        ]}
      />

      {/* Row 9: Change Password Card (A16) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Key size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-neutral-dark">
              Ubah Kata Sandi Akun
            </h2>
            <p className="text-xs text-neutral-slate">
              Disarankan menggunakan kombinasi minimal 8 karakter huruf, angka, dan simbol.
            </p>
          </div>
        </div>

        {passError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle size={18} className="shrink-0 text-rose-600" weight="fill" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg" id="form-change-password">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-dark">Kata Sandi Saat Ini</label>
            <div className="relative">
              <input
                id="input-current-password"
                type={showOldPass ? "text" : "password"}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOldPass ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-dark">Kata Sandi Baru (Min. 8 Karakter)</label>
            <div className="relative">
              <input
                id="input-new-password"
                type={showNewPass ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Buat kata sandi baru yang kuat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-dark">Konfirmasi Kata Sandi Baru</label>
            <input
              id="input-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <button
            id="btn-submit-change-password"
            type="submit"
            disabled={changingPass}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-hover transition shadow-servio-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {changingPass ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                <span>Menyimpan Kata Sandi...</span>
              </>
            ) : (
              <>
                <LockKey size={16} weight="bold" />
                <span>Perbarui Kata Sandi</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Row 10: Device Sessions Management (A12, A13, A11) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              <Devices size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-neutral-dark">
                Sesi Perangkat Masuk (Active Sessions)
              </h2>
              <p className="text-xs text-neutral-slate">
                Daftar browser dan perangkat yang saat ini memiliki token login aktif ke akun Anda.
              </p>
            </div>
          </div>

          <button
            id="btn-logout-all-sessions"
            type="button"
            onClick={handleLogoutAllOtherSessions}
            disabled={revokingAll || sessions.length <= 1}
            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 self-start sm:self-auto cursor-pointer"
          >
            {revokingAll ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <SignOut size={14} weight="bold" />
            )}
            <span>Cabut Semua Sesi Lain</span>
          </button>
        </div>

        {loadingSessions ? (
          <div className="py-8 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
            <SpinnerGap size={16} className="animate-spin text-primary" />
            <span>Memeriksa sesi perangkat aktif...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-neutral-slate">
            Hanya sesi browser saat ini yang terdeteksi aktif.
          </div>
        ) : (
          <div className="space-y-3" id="list-active-sessions">
            {sessions.map((sess, idx) => (
              <div
                key={sess.id || idx}
                className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Laptop size={18} weight="duotone" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-dark">
                        {sess.device_name || "Browser Web / Sesi HTTP"}
                      </span>
                      {sess.current ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Perangkat Ini
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-neutral-slate mt-0.5">
                      IP: <strong className="font-mono text-neutral-dark">{sess.created_ip || "127.0.0.1"}</strong> • Terakhir aktif:{" "}
                      {sess.last_seen_at ? new Date(sess.last_seen_at).toLocaleString("id-ID") : "Baru saja"}
                    </p>
                  </div>
                </div>

                {!sess.current && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    disabled={revokingSessionId === sess.id}
                    className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer disabled:opacity-50"
                  >
                    {revokingSessionId === sess.id ? (
                      <SpinnerGap size={13} className="animate-spin" />
                    ) : (
                      <Trash size={13} />
                    )}
                    <span>Cabut Akses</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Row 13: Google Account Linking (A05-A07) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-servio-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Globe size={22} weight="duotone" />
          </div>
          <div>
            <h2 className="text-base font-bold font-display text-neutral-dark">
              Tautan Akun Google (Single Sign-On)
            </h2>
            <p className="text-xs text-neutral-slate">
              Hubungkan akun Google untuk kemudahan login 1-klik tanpa memasukkan kata sandi.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-lg text-primary">
              G
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-dark">Google OAuth Provider</p>
              <p className="text-[11px] text-neutral-slate">
                {user.email ? `Status: Terkait dengan ${user.email}` : "Belum ditautkan ke akun Google eksternal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-link-google"
              type="button"
              onClick={handleGoogleLink}
              disabled={googleLinking}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-neutral-dark text-xs font-bold transition flex items-center gap-1.5 shadow-servio-xs disabled:opacity-50 cursor-pointer"
            >
              {googleLinking ? <SpinnerGap size={14} className="animate-spin" /> : null}
              <span>Hubungkan Akun Google</span>
            </button>
            <button
              id="btn-unlink-google"
              type="button"
              onClick={handleGoogleUnlink}
              disabled={googleLinking}
              className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              Putuskan
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type || "success"}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
