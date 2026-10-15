"use client";

import React, { useState, useEffect } from "react";
import { opsApi } from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";
import {
  Users,
  MagnifyingGlass,
  Prohibit,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  SpinnerGap,
  Funnel,
  ArrowsClockwise,
} from "@phosphor-icons/react";

interface AdminUserItem {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role?: string;
  roles?: string[];
  status?: string;
  phoneNumber?: string;
  phone?: string;
  nik?: string;
  createdAt?: string;
  created_at?: string;
}

export default function AdminUsersGovernancePage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Suspend Modal
  const [suspendModalUser, setSuspendModalUser] = useState<AdminUserItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: { role?: string; status?: string; search?: string } = {};
      if (roleFilter !== "ALL") params.role = roleFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await opsApi.adminListUsers(params);
      if (res.data) {
        const raw = Array.isArray(res.data) ? res.data : (res.data as any).items || (res.data as any).data || [];
        setUsers(raw);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setToast({ message: error.message || "Gagal memuat daftar pengguna platform.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleOpenSuspendModal = (user: AdminUserItem) => {
    setSuspendModalUser(user);
    setSuspendReason("");
    setModalError(null);
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModalUser) return;
    if (!suspendReason.trim()) {
      setModalError("Alasan penangguhan (suspend) wajib diisi untuk catatan kepatuhan.");
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      await opsApi.adminSuspendUser(suspendModalUser.id, suspendReason.trim());
      setToast({
        message: `Akun ${suspendModalUser.email} berhasil ditangguhkan (SUSPENDED). Seluruh sesi telah dicabut.`,
        type: "warning",
      });
      setSuspendModalUser(null);
      await fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      setModalError(error.message || "Gagal menangguhkan akun pengguna.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateUser = async (user: AdminUserItem) => {
    if (!confirm(`Reaktifkan akun ${user.email}? Pengguna akan diizinkan login kembali.`)) return;
    setActionLoading(true);
    try {
      await opsApi.adminReactivateUser(user.id);
      setToast({
        message: `Akun ${user.email} berhasil direaktifkan (ACTIVE).`,
        type: "success",
      });
      await fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({ message: error.message || "Gagal mereaktifkan akun.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="admin-users-governance-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-default pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck size={16} /> Tata Kelola Identitas & Hak Akses
          </div>
          <h1 className="text-2xl font-bold text-content-primary">Pengelolaan Akun Pengguna (Platform Users)</h1>
          <p className="text-sm text-content-secondary mt-1">
            Pantau seluruh akun terdaftar, status operasional, role, serta lakukan tindakan suspend / reaktivasi sesuai kebijakan kepatuhan.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border-default rounded-xl hover:bg-surface-secondary text-content-primary transition self-start"
          id="refresh-users-btn"
        >
          <ArrowsClockwise size={16} className={loading ? "animate-spin" : ""} />
          Perbarui Data
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-surface-primary border border-border-default rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            id="search-user-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari email, nama, atau NIK..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-secondary border border-border-default rounded-xl focus:outline-none focus:border-primary text-content-primary"
          />
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-content-secondary">
            <Funnel size={14} /> Filter:
          </div>
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-surface-secondary border border-border-default rounded-xl px-3 py-2 text-content-primary focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PENDING">PENDING</option>
          </select>
          <select
            id="filter-role-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-surface-secondary border border-border-default rounded-xl px-3 py-2 text-content-primary focus:outline-none focus:border-primary"
          >
            <option value="ALL">Semua Role</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
            <option value="WORKER_TECHNICIAN">WORKER_TECHNICIAN</option>
            <option value="MERCHANT">MERCHANT</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="ADMIN_OPERATIONS">ADMIN_OPERATIONS</option>
            <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
            <option value="FINANCE_PAYMENT_OPS">FINANCE_PAYMENT_OPS</option>
            <option value="CEO_PRODUCT_OWNER">CEO_PRODUCT_OWNER</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-primary border border-border-default rounded-2xl shadow-sm overflow-hidden" id="admin-users-table">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary text-xs uppercase font-semibold text-content-secondary border-b border-border-default">
              <tr>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Role Utama</th>
                <th className="px-6 py-4">Status Akun</th>
                <th className="px-6 py-4">NIK Terdaftar</th>
                <th className="px-6 py-4 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-secondary">
                    <SpinnerGap size={24} className="animate-spin mx-auto mb-2 text-primary" />
                    Memuat data akun pengguna dari Identity Service...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-content-secondary">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const displayName = u.fullName || u.name || "Tanpa Nama";
                  const primaryRole = u.role || (u.roles && u.roles[0]) || "CUSTOMER";
                  const status = (u.status || "ACTIVE").toUpperCase();
                  const isSuspended = status === "SUSPENDED";

                  return (
                    <tr key={u.id} className="hover:bg-surface-secondary/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-content-primary">{displayName}</div>
                        <div className="text-xs text-content-secondary">{u.email}</div>
                        {u.phoneNumber && <div className="text-xs text-content-tertiary">{u.phoneNumber}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-secondary border border-border-default text-content-primary">
                          {primaryRole}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                            isSuspended
                              ? "bg-danger-subtle text-danger border border-danger/20"
                              : status === "ACTIVE"
                              ? "bg-success-subtle text-success border border-success/20"
                              : "bg-surface-secondary text-content-secondary border border-border-default"
                          }`}
                        >
                          {isSuspended ? <Prohibit size={12} /> : <CheckCircle size={12} />}
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-content-secondary">
                        {u.nik ? u.nik : <span className="text-content-tertiary italic">Belum tercatat</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isSuspended ? (
                          <button
                            id={`reactivate-btn-${u.id}`}
                            disabled={actionLoading}
                            onClick={() => handleReactivateUser(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-success text-white hover:bg-success/90 transition disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Reaktifkan
                          </button>
                        ) : (
                          <button
                            id={`suspend-btn-${u.id}`}
                            disabled={actionLoading}
                            onClick={() => handleOpenSuspendModal(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-danger-subtle text-danger border border-danger/20 hover:bg-danger hover:text-white transition disabled:opacity-50"
                          >
                            <Prohibit size={14} /> Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Confirmation Modal */}
      {suspendModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-primary border border-border-default rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-danger">
              <div className="w-10 h-10 rounded-2xl bg-danger-subtle flex items-center justify-center">
                <Prohibit size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-content-primary">Tangguhkan Akun Pengguna</h3>
                <p className="text-xs text-content-secondary">Tindakan ini akan mencabut seluruh sesi dan mencegah akses login.</p>
              </div>
            </div>

            <div className="p-4 bg-surface-secondary rounded-2xl border border-border-default text-sm space-y-1">
              <div>
                <span className="text-content-secondary">Nama:</span>{" "}
                <strong className="text-content-primary">{suspendModalUser.fullName || suspendModalUser.name || "Tanpa Nama"}</strong>
              </div>
              <div>
                <span className="text-content-secondary">Email:</span>{" "}
                <strong className="text-content-primary">{suspendModalUser.email}</strong>
              </div>
              <div>
                <span className="text-content-secondary">Role:</span>{" "}
                <strong className="text-content-primary">{suspendModalUser.role || "CUSTOMER"}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-content-primary">
                Alasan Penangguhan Akun <span className="text-danger">*</span>
              </label>
              <textarea
                id="suspend-reason-input"
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Misal: Pelanggaran ketentuan syarat & ketentuan, indikasi penipuan transaksi, atau permintaan regulator..."
                className="w-full text-sm p-3 bg-surface-secondary border border-border-default rounded-xl focus:outline-none focus:border-danger text-content-primary"
              />
            </div>

            {modalError && (
              <div className="p-3 bg-danger-subtle border border-danger/30 rounded-xl text-xs text-danger flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0" />
                {modalError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold border border-border-default rounded-xl hover:bg-surface-secondary text-content-secondary transition"
              >
                Batal
              </button>
              <button
                type="button"
                id="confirm-suspend-btn"
                onClick={handleConfirmSuspend}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-danger text-white hover:bg-danger/90 transition shadow-sm disabled:opacity-50"
              >
                {actionLoading && <SpinnerGap size={14} className="animate-spin" />}
                Konfirmasi Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
