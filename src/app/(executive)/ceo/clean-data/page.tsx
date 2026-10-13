"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  executiveApi,
  DatabaseStats,
  DatabaseCleanResult,
} from "@/lib/servioApi";
import { useActiveRole } from "@/context/RoleContext";
import { Toast } from "@/components/feedback/Toast";
import {
  Broom,
  Trash,
  ShieldWarning,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  ArrowClockwise,
  Users,
  FolderSimple,
  TreeStructure,
  Crown,
  Key,
  EnvelopeSimple,
  ShieldCheck,
  Check,
  X,
  FileText,
  Buildings,
  LockKey,
} from "@phosphor-icons/react";

export default function CeoCleanDataPage() {
  const { user, refreshUser } = useActiveRole();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>("");
  const [lastResult, setLastResult] = useState<DatabaseCleanResult | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    variant: "success" | "error" | "info" | "warning";
  }>({
    show: false,
    message: "",
    variant: "info",
  });

  const showToast = (
    message: string,
    variant: "success" | "error" | "info" | "warning" = "info"
  ) => {
    setToast({ show: true, message, variant });
  };

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await executiveApi.getDatabaseStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Gagal memuat statistik database", "error");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleOpenConfirm = () => {
    setConfirmInput("");
    setShowConfirmModal(true);
  };

  const handleExecuteClean = async () => {
    if (confirmInput.trim().toUpperCase() !== "BERSIHKAN DATA") {
      showToast('Ketik kata verifikasi "BERSIHKAN DATA" dengan benar.', "warning");
      return;
    }

    setIsCleaning(true);
    try {
      const res = await executiveApi.cleanDatabase(confirmInput);
      if (res.data) {
        setLastResult(res.data);
        setShowConfirmModal(false);
        showToast(
          res.message || "Database berhasil dibersihkan! 1 Akun CEO & Kategori Utama dipertahankan.",
          "success"
        );
        // Refresh local stats
        await loadStats();
        // Refresh auth context so user remains synced
        await refreshUser();
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Gagal mengeksekusi pembersihan database", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          // variant={toast.variant}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      {/* Top Header Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
                <Crown size={16} weight="fill" className="text-amber-500" />
                <span>Executive Office • Role: CEO_PRODUCT_OWNER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Broom size={32} className="text-rose-600 shrink-0" weight="duotone" />
                <span>Pembersihan Data Sistem</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Otoritas tingkat tinggi untuk mereset dan membersihkan seluruh database akun dan subkategori,
                dengan memproteksi penuh 1 akun CEO Michael Surya dan seluruh Kategori utama.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadStats}
                disabled={isLoadingStats || isCleaning}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
              >
                <ArrowClockwise
                  size={16}
                  className={isLoadingStats ? "animate-spin text-primary" : ""}
                />
                <span>Refresh Metrik</span>
              </button>
              <button
                type="button"
                onClick={handleOpenConfirm}
                disabled={isCleaning || isLoadingStats}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                <Trash size={18} weight="bold" />
                <span>Bersihkan Database Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Critical Rule & Security Notice */}
        <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-50/60 to-amber-50/60 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-sm shrink-0">
              <ShieldWarning size={28} weight="duotone" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <span>Peraturan & Spesifikasi Pembersihan Database</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Operasi Permanen
                </span>
              </h2>
              <div className="text-xs sm:text-sm text-rose-900/90 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg bg-white/80 border border-rose-200/80 p-3">
                  <p className="font-semibold text-rose-950 flex items-center gap-1.5 mb-1">
                    <Trash size={15} className="text-rose-600" weight="bold" />
                    <span>Data yang AKAN DIHAPUS (Dibersihkan):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-rose-900">
                    <li>Semua akun pengguna pada setiap role (Customer, Provider, Worker, Merchant, Supplier, Finance, Support, Admin).</li>
                    <li>Seluruh data subkategori layanan (termasuk permintaan pengajuan subkategori).</li>
                    <li>Seluruh transaksi pemesanan (service orders) & riwayat operasional.</li>
                    <li>Seluruh aplikasi registrasi mitra, berkas identitas & membership.</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-white/80 border border-emerald-200/80 p-3">
                  <p className="font-semibold text-emerald-950 flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={16} className="text-emerald-600" weight="bold" />
                    <span>Data yang TETAP DIPERTAHANKAN (Aman):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-emerald-900">
                    <li>
                      <strong>1 Akun CEO Eksekutif:</strong> Michael Surya (<code className="bg-emerald-100/80 px-1 py-0.5 rounded text-[11px]">ceo@servio.id</code>)
                    </li>
                    <li>
                      <strong>Seluruh Kategori Utama:</strong> Kategori layanan root tidak akan dihapus.
                    </li>
                    <li>
                      <strong>Skema & RBAC Sistem:</strong> Definisi role, permission, dan kebijakan inti.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preserved Account Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Crown size={26} weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Akun CEO Eksekutif Terproteksi
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Root Master Account
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Akun tunggal yang disisakan dan memiliki hak penuh atas tata kelola SERVIO.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                <Check size={14} weight="bold" />
                <span>Terproteksi dari Penghapusan</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Nama Akun / CEO</span>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Users size={16} className="text-primary shrink-0" />
                <span>Michael Surya</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Email / Login</span>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <EnvelopeSimple size={16} className="text-primary shrink-0" />
                <span className="font-mono text-xs">ceo@servio.id</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Role Sistem</span>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <LockKey size={16} className="text-amber-600 shrink-0" />
                <span className="font-mono text-xs">CEO_PRODUCT_OWNER</span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-medium text-slate-500 block mb-0.5">Kredensial Password</span>
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                <Key size={16} className="text-emerald-600 shrink-0" />
                <span className="font-mono text-xs">ServioCeo2026!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Metrics Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
              Status Data Saat Ini di Database
            </h3>
            {isLoadingStats && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <SpinnerGap size={14} className="animate-spin text-primary" />
                <span>Memperbarui metrik...</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Total Akun Pengguna</span>
                <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <Users size={20} weight="bold" />
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900">
                  {isLoadingStats ? "..." : (stats?.totalUsers ?? 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Akan dibersihkan menjadi 1 akun CEO
                </p>
              </div>
            </div>

            {/* Total Subcategories */}
            <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Total Subkategori</span>
                <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <TreeStructure size={20} weight="bold" />
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900">
                  {isLoadingStats ? "..." : (stats?.totalSubcategories ?? 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-rose-600 font-medium mt-1">
                  Seluruh subkategori akan dihapus
                </p>
              </div>
            </div>

            {/* Total Categories (PRESERVED) */}
            <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Kategori Utama</span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <FolderSimple size={20} weight="bold" />
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900">
                  {isLoadingStats ? "..." : (stats?.totalCategories ?? 0).toLocaleString()}
                </div>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle size={14} weight="fill" />
                  <span>Tetap Dipertahankan (Aman)</span>
                </p>
              </div>
            </div>

            {/* Operational Orders / Apps */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Order & Mitra Terdaftar</span>
                <span className="p-2 rounded-lg bg-slate-50 text-slate-600">
                  <Buildings size={20} weight="bold" />
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-slate-900">
                  {isLoadingStats
                    ? "..."
                    : ((stats?.totalOrders ?? 0) + (stats?.totalApplications ?? 0)).toLocaleString()}
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Order ({stats?.totalOrders ?? 0}), Mitra ({stats?.totalApplications ?? 0})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Last Result Summary Box */}
        {lastResult && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                <CheckCircle size={24} weight="bold" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="text-base font-bold text-emerald-950">
                  Hasil Pembersihan Database Berhasil Dieksekusi
                </h4>
                <p className="text-xs text-emerald-900">{lastResult.message}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-slate-500 block">Akun Dihapus:</span>
                    <span className="font-bold text-rose-600 text-sm">
                      {lastResult.stats.deletedUsersCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-slate-500 block">Subkategori Dihapus:</span>
                    <span className="font-bold text-rose-600 text-sm">
                      {lastResult.stats.deletedSubcategoriesCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-slate-500 block">Kategori Tersisa:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {lastResult.stats.preservedCategoriesCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-slate-500 block">Akun Tersisa:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {lastResult.stats.remainingUsersCount} (CEO Michael Surya)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Callout Box */}
        
      </div>

      {/* Confirmation & Verification Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="p-5 border-b border-rose-100 bg-rose-50/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <WarningCircle size={24} weight="bold" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-rose-950">
                  Konfirmasi Pembersihan Database
                </h3>
                <p className="text-xs text-rose-800">
                  Tindakan ini tidak dapat dibatalkan (Irreversible Action).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isCleaning}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>
                  Anda akan menjalankan proses pembersihan database. Pastikan Anda telah memahami dampak berikut:
                </p>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold">
                    <Trash size={14} />
                    <span>Dihapus: Semua akun setiap role & seluruh data subkategori</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle size={14} weight="fill" />
                    <span>Dipertahankan: Seluruh Kategori utama & 1 akun CEO Michael Surya</span>
                  </div>
                </div>
              </div>

              {/* Preserved Account Details in Modal */}
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-950">
                <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900">
                  <Crown size={15} weight="fill" className="text-amber-600" />
                  <span>Akun CEO yang tetap aktif setelah pembersihan:</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                  <div>Email: <strong>ceo@servio.id</strong></div>
                  <div>Password: <strong>ServioCeo2026!</strong></div>
                  <div>Nama: <strong>Michael Surya</strong></div>
                  <div>Role: <strong>CEO_PRODUCT_OWNER</strong></div>
                </div>
              </div>

              {/* Typed Confirmation Safeguard */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Ketik <span className="font-mono text-rose-600 font-bold">BERSIHKAN DATA</span> di bawah untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Ketik BERSIHKAN DATA"
                  disabled={isCleaning}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isCleaning}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClean}
                disabled={
                  confirmInput.trim().toUpperCase() !== "BERSIHKAN DATA" || isCleaning
                }
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCleaning ? (
                  <>
                    <SpinnerGap size={16} className="animate-spin" />
                    <span>Mengeksekusi...</span>
                  </>
                ) : (
                  <>
                    <Trash size={16} weight="bold" />
                    <span>Ya, Bersihkan Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
