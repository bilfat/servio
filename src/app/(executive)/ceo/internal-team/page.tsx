"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  internalAccountApi,
  InternalAccountSummary,
  InternalAccountDetail,
  InternalEmployment,
  opsApi,
} from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  Copy,
  SpinnerGap,
  WarningCircle,
  Buildings,
  EnvelopeSimple,
  Phone,
  IdentificationBadge,
  Trash,
  XCircle,
  Eye,
  EyeSlash,
  Prohibit,
  PencilSimple,
  Info,
  MagnifyingGlass,
  Funnel,
  Briefcase,
  CalendarCheck,
  Clock,
  ArrowRight,
  ShieldWarning,
  Check,
  X,
  IdentificationCard,
  User,
} from "@phosphor-icons/react";

export default function CeoInternalTeamPage() {
  const [stats, setStats] = useState({
    adminOperations: 0,
    financeOperations: 0,
    customerSupport: 0,
    totalStaff: 0,
    operationalReady: 0,
    onboardingActive: 0,
  });

  const [accounts, setAccounts] = useState<InternalAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [employmentFilter, setEmploymentFilter] = useState("ALL");
  const [readinessFilter, setReadinessFilter] = useState("ALL");

  // Deletion modal
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    employeeId: string;
    role: string;
    department: string;
    email: string;
  } | null>(null);

  // Password Visibility & Copy states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);

  // Status Deactivation/Activation Modal state
  const [statusTarget, setStatusTarget] = useState<{
    member: {
      id: string;
      name: string;
      employeeId: string;
      role: string;
      department: string;
      email: string;
      status: string;
    };
    nextStatus: "ACTIVE" | "SUSPENDED";
  } | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Offboard Modal state
  const [offboardTarget, setOffboardTarget] = useState<InternalAccountSummary | null>(null);
  const [offboardingId, setOffboardingId] = useState<string | null>(null);
  const [offboardReason, setOffboardReason] = useState("");

  // Detail Modal state
  const [detailModalId, setDetailModalId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<InternalAccountDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit Employment Modal state
  const [editTarget, setEditTarget] = useState<InternalAccountSummary | null>(null);
  const [editFormData, setEditFormData] = useState({
    department: "",
    position: "",
    employmentType: "FULL_TIME",
    startDate: "",
  });
  const [updatingEmployment, setUpdatingEmployment] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  // Add Account Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    employeeId: "",
    email: "",
    phone: "",
    role: "ADMIN_OPERATIONS" as "ADMIN_OPERATIONS" | "FINANCE_PAYMENT_OPS" | "CUSTOMER_SUPPORT",
    department: "Operations",
    position: "Operations Administrator",
    employmentType: "FULL_TIME" as "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
    startDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{
    token: string;
    url: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (search.trim()) filters.search = search.trim();
      if (roleFilter !== "ALL") filters.role = roleFilter;
      if (employmentFilter !== "ALL") filters.employmentStatus = employmentFilter;
      if (readinessFilter !== "ALL") filters.readiness = readinessFilter;

      const res = await internalAccountApi.getAccounts(filters);
      if (res.data) {
        setStats({
          totalStaff: res.data.stats.totalStaff || 0,
          adminOperations: res.data.stats.adminOperations || 0,
          financeOperations: res.data.stats.financeOperations || 0,
          customerSupport: res.data.stats.customerSupport || 0,
          operationalReady: res.data.stats.operationalReady || 0,
          onboardingActive: res.data.stats.onboardingActive || 0,
        });
        setAccounts(res.data.accounts || []);
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, employmentFilter, readinessFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenDetail = async (id: string) => {
    setDetailModalId(id);
    setLoadingDetail(true);
    try {
      const res = await internalAccountApi.getAccount(id);
      if (res.data) {
        setDetailData(res.data);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal memuat rincian akun staf.",
        type: "error",
      });
      setDetailModalId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenEdit = (acc: InternalAccountSummary) => {
    setEditTarget(acc);
    setEditFormData({
      department: acc.department || "Operations",
      position: acc.position || "",
      employmentType: acc.employmentType || "FULL_TIME",
      startDate: acc.startDate ? acc.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
    });
  };

  const handleEditEmploymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setUpdatingEmployment(true);
    try {
      await internalAccountApi.updateEmployment(editTarget.id, editFormData);
      await fetchAccounts();
      setToast({
        message: `Konteks pekerjaan ${editTarget.fullName} berhasil diperbarui.`,
        type: "success",
      });
      setEditTarget(null);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal memperbarui metadata pekerjaan staf.",
        type: "error",
      });
    } finally {
      setUpdatingEmployment(false);
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await internalAccountApi.createAccount({
        fullName: formData.fullName,
        employeeId: formData.employeeId,
        email: formData.email,
        phone: formData.phone || undefined,
        roleCode: formData.role,
        department: formData.department,
        position: formData.position,
        employmentType: formData.employmentType,
        startDate: formData.startDate,
      });

      if (res.data) {
        setCreatedInvite({
          token: res.data.invitationToken,
          url: res.data.invitationUrl,
          name: formData.fullName,
        });
        setShowModal(false);
        setFormData({
          fullName: "",
          employeeId: "",
          email: "",
          phone: "",
          role: "ADMIN_OPERATIONS",
          department: "Operations",
          position: "Operations Administrator",
          employmentType: "FULL_TIME",
          startDate: new Date().toISOString().split("T")[0],
        });
        await fetchAccounts();
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setErrorMsg(error.message || "Gagal membuat akun staf.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInvite) return;
    navigator.clipboard.writeText(createdInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDeleteStaff = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);
    try {
      await internalAccountApi.deleteAccount(deleteTarget.id);
      await fetchAccounts();
      setToast({
        message: `Akun staf ${deleteTarget.name} (${deleteTarget.employeeId}) berhasil dihapus permanen dari database.`,
        type: "success",
      });
      setDeleteTarget(null);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal menghapus akun staf.",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyPassword = (id: string, password?: string) => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPasswordId(id);
    setTimeout(() => setCopiedPasswordId(null), 2000);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;

    const { member, nextStatus } = statusTarget;
    setUpdatingStatusId(member.id);
    try {
      if (nextStatus === "SUSPENDED") {
        await internalAccountApi.suspendEmployment(member.id, "Ditangguhkan oleh CEO / Eksekutif");
      } else {
        await opsApi.updateStaffStatus(member.id, "ACTIVE");
      }
      await fetchAccounts();
      setToast({
        message: nextStatus === "SUSPENDED"
          ? `Akun staf ${member.name} (${member.employeeId}) berhasil dinonaktifkan sementara (SUSPENDED).`
          : `Akun staf ${member.name} (${member.employeeId}) berhasil diaktifkan kembali (ACTIVE).`,
        type: "success",
      });
      setStatusTarget(null);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal memperbarui status akun staf.",
        type: "error",
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmOffboard = async () => {
    if (!offboardTarget) return;

    setOffboardingId(offboardTarget.id);
    try {
      await internalAccountApi.offboardEmployment(offboardTarget.id, offboardReason || "Offboarded by CEO");
      await fetchAccounts();
      setToast({
        message: `Staf ${offboardTarget.fullName} (${offboardTarget.employeeId}) berhasil dioffboard. Riwayat pekerjaan tetap tersimpan.`,
        type: "success",
      });
      setOffboardTarget(null);
      setOffboardReason("");
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal melakukan offboard staf.",
        type: "error",
      });
    } finally {
      setOffboardingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
            Eksekutif & Tata Kelola
          </span>
          <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
            Internal Team & Access
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Kelola akun internal, konteks pekerjaan, onboarding, dan kesiapan operasional (Operational Readiness) sesuai Level 04.
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setCreatedInvite(null);
            setErrorMsg(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-servio-sm hover:bg-primary-hover transition"
        >
          <UserPlus size={16} />
          <span>+ Add Account</span>
        </button>
      </div>

      {/* Invitation Created Banner */}
      {createdInvite && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <CheckCircle size={18} className="text-emerald-600" weight="fill" />
              <span>Undangan Berhasil Dibuat untuk {createdInvite.name}</span>
            </div>
            <button
              onClick={() => setCreatedInvite(null)}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Tutup
            </button>
          </div>
          <p className="text-xs text-emerald-800">
            Kirimkan token atau tautan aktivasi berikut kepada staf terkait untuk menentukan kata sandi akunnya:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={createdInvite.url}
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-emerald-300 text-xs font-mono text-neutral-dark"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shrink-0"
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              <span>{copied ? "Tersalin!" : "Salin Tautan"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards (Level 04 Enhanced) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-semibold text-neutral-slate uppercase tracking-wider">
            Total Staf
          </span>
          <div className="text-xl font-bold font-display text-neutral-dark">
            {stats.totalStaff}
          </div>
          <span className="text-[9px] text-neutral-muted">Personel terdaftar</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider">
            Admin Ops
          </span>
          <div className="text-xl font-bold font-display text-blue-900">
            {stats.adminOperations}
          </div>
          <span className="text-[9px] text-blue-700">Verifikasi & kepatuhan</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
            Finance Ops
          </span>
          <div className="text-xl font-bold font-display text-emerald-900">
            {stats.financeOperations}
          </div>
          <span className="text-[9px] text-emerald-700">Escrow & pembayaran</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
            CS Support
          </span>
          <div className="text-xl font-bold font-display text-amber-900">
            {stats.customerSupport}
          </div>
          <span className="text-[9px] text-amber-700">Mediasi & tiket</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle size={12} weight="bold" />
            <span>Ready Ops</span>
          </span>
          <div className="text-xl font-bold font-display text-purple-900">
            {stats.operationalReady}
          </div>
          <span className="text-[9px] text-purple-700">Siap operasional</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-servio-xs space-y-1">
          <span className="text-[10px] font-semibold text-indigo-800 uppercase tracking-wider">
            Onboarding
          </span>
          <div className="text-xl font-bold font-display text-indigo-900">
            {stats.onboardingActive}
          </div>
          <span className="text-[9px] text-indigo-700">Dalam proses</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-servio-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, Employee ID, email..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Funnel size={14} className="text-slate-500" />
            <span className="text-neutral-slate font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent font-semibold text-neutral-dark focus:outline-none text-xs"
            >
              <option value="ALL">Semua</option>
              <option value="ADMIN_OPERATIONS">Admin Ops</option>
              <option value="FINANCE_PAYMENT_OPS">Finance Ops</option>
              <option value="CUSTOMER_SUPPORT">Customer Support</option>
              <option value="CEO_PRODUCT_OWNER">CEO</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Briefcase size={14} className="text-slate-500" />
            <span className="text-neutral-slate font-medium">Employment:</span>
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="bg-transparent font-semibold text-neutral-dark focus:outline-none text-xs"
            >
              <option value="ALL">Semua</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_START">Pending Start</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="OFFBOARDED">Offboarded</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <ShieldCheck size={14} className="text-slate-500" />
            <span className="text-neutral-slate font-medium">Readiness:</span>
            <select
              value={readinessFilter}
              onChange={(e) => setReadinessFilter(e.target.value)}
              className="bg-transparent font-semibold text-neutral-dark focus:outline-none text-xs"
            >
              <option value="ALL">Semua</option>
              <option value="READY">Ready</option>
              <option value="NOT_READY">Not Ready</option>
            </select>
          </div>

          {(search || roleFilter !== "ALL" || employmentFilter !== "ALL" || readinessFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("ALL");
                setEmploymentFilter("ALL");
                setReadinessFilter("ALL");
              }}
              className="text-xs text-primary font-semibold hover:underline px-2 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Staff Table (Section 77 & 78) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-dark">
              Daftar Staf Internal & Kesiapan Operasional
            </h2>
            <p className="text-[11px] text-neutral-slate">
              Source of truth: Level 04 Internal Employment & Onboarding.
            </p>
          </div>
          <span className="text-xs text-neutral-slate font-medium">
            {accounts.length} Akun Ditampilkan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-3">Nama Staf</th>
                <th className="py-3 px-3">Employee ID</th>
                <th className="py-3 px-3">Role & Jabatan</th>
                <th className="py-3 px-3">Email Kantor</th>
                <th className="py-3 px-3">Password</th>
                <th className="py-3 px-3">Departemen</th>
                <th className="py-3 px-3">Pekerjaan</th>
                <th className="py-3 px-3">Onboarding</th>
                <th className="py-3 px-3">Readiness</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-slate">
                    <SpinnerGap size={20} className="animate-spin mx-auto text-primary mb-1" />
                    <span>Memuat data staf internal...</span>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-neutral-slate">
                    Tidak ada staf internal yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                accounts.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition">
                    {/* Name */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-dark">
                        {member.fullName}
                      </div>
                      <div className="text-[10px] text-neutral-muted">
                        Mulai: {member.startDate || "-"}
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3 px-3 font-mono text-primary font-medium">
                      {member.employeeId}
                    </td>

                    {/* Role & Position */}
                    <td className="py-3 px-3">
                      <div className="inline-block">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                          member.role.code === "CEO_PRODUCT_OWNER" ? "bg-purple-100 text-purple-800" :
                          member.role.code === "ADMIN_OPERATIONS" ? "bg-blue-100 text-blue-800" :
                          member.role.code === "FINANCE_PAYMENT_OPS" ? "bg-emerald-100 text-emerald-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {member.role.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-dark font-medium mt-0.5">
                        {member.position || "-"}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 text-neutral-slate">
                      {member.email}
                    </td>

                    {/* Password Field */}
                    <td className="py-3 px-3">
                      {member.role.code === "CEO_PRODUCT_OWNER" ? (
                        <span className="font-mono text-xs text-neutral-slate tracking-widest select-none">••••••••</span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/90 rounded-lg px-2 py-1">
                          <span className="font-mono text-[11px] font-medium text-neutral-dark select-all min-w-[65px]">
                            {visiblePasswords[member.id] ? (
                              member.password || "Password2026!"
                            ) : (
                              <span className="tracking-widest text-neutral-slate select-none">••••••••</span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(member.id)}
                            className="text-neutral-slate hover:text-primary transition p-0.5"
                            title={visiblePasswords[member.id] ? "Sembunyikan password" : "Lihat password"}
                          >
                            {visiblePasswords[member.id] ? (
                              <EyeSlash size={14} weight="bold" />
                            ) : (
                              <Eye size={14} weight="bold" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(member.id, member.password || "Password2026!")}
                            className="text-neutral-slate hover:text-primary transition p-0.5"
                            title="Salin password"
                          >
                            {copiedPasswordId === member.id ? (
                              <CheckCircle size={14} className="text-emerald-600" weight="fill" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3 text-neutral-slate font-medium">
                      {member.department}
                    </td>

                    {/* Employment Status */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        member.employmentStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : member.employmentStatus === "PENDING_START"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : member.employmentStatus === "SUSPENDED"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          member.employmentStatus === "ACTIVE" ? "bg-emerald-500" :
                          member.employmentStatus === "PENDING_START" ? "bg-blue-500" :
                          member.employmentStatus === "SUSPENDED" ? "bg-amber-500" : "bg-slate-500"
                        }`} />
                        {member.employmentStatus}
                      </span>
                    </td>

                    {/* Onboarding Status */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        member.onboardingStatus === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : member.onboardingStatus === "IN_PROGRESS"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {member.onboardingStatus}
                      </span>
                    </td>

                    {/* Operational Readiness Badge */}
                    <td className="py-3 px-3">
                      {member.readiness === "READY" ? (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-sm">
                          <CheckCircle size={13} weight="fill" className="text-emerald-600" />
                          <span>READY</span>
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1"
                          title={member.readinessReason || "Syarat operasional belum lengkap"}
                        >
                          <Clock size={12} weight="bold" className="text-slate-400" />
                          <span>NOT READY</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {/* Detail Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(member.id)}
                          className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition"
                          title="Lihat rincian lengkap staf & kesiapan operasional"
                        >
                          Detail
                        </button>

                        {member.role.code !== "CEO_PRODUCT_OWNER" && (
                          <>
                            {/* Edit Employment Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(member)}
                              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                              title="Edit metadata pekerjaan (Departemen, Posisi, Mulai)"
                            >
                              <PencilSimple size={14} />
                            </button>

                            {/* Suspend / Activate Button */}
                            {member.employmentStatus === "ACTIVE" ? (
                              <button
                                type="button"
                                onClick={() => setStatusTarget({
                                  member: {
                                    id: member.id,
                                    name: member.fullName,
                                    employeeId: member.employeeId,
                                    role: member.role.code,
                                    department: member.department,
                                    email: member.email,
                                    status: member.employmentStatus,
                                  },
                                  nextStatus: "SUSPENDED",
                                })}
                                className="p-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                                title={`Tangguhkan (Suspend) pekerjaan ${member.fullName}`}
                              >
                                <Prohibit size={14} weight="bold" />
                              </button>
                            ) : member.employmentStatus === "SUSPENDED" ? (
                              <button
                                type="button"
                                onClick={() => setStatusTarget({
                                  member: {
                                    id: member.id,
                                    name: member.fullName,
                                    employeeId: member.employeeId,
                                    role: member.role.code,
                                    department: member.department,
                                    email: member.email,
                                    status: member.employmentStatus,
                                  },
                                  nextStatus: "ACTIVE",
                                })}
                                className="p-1 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
                                title={`Aktifkan kembali pekerjaan ${member.fullName}`}
                              >
                                <CheckCircle size={14} weight="bold" />
                              </button>
                            ) : null}

                            {/* Offboard Button */}
                            {member.employmentStatus !== "OFFBOARDED" && (
                              <button
                                type="button"
                                onClick={() => setOffboardTarget(member)}
                                className="px-1.5 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 text-[10px] font-bold transition"
                                title="Offboard staf (mengakhiri pekerjaan dengan riwayat utuh)"
                              >
                                Offboard
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({
                                id: member.id,
                                name: member.fullName,
                                employeeId: member.employeeId,
                                role: member.role.code,
                                department: member.department,
                                email: member.email,
                              })}
                              className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                              title={`Hapus permanen akun staf ${member.fullName}`}
                            >
                              <Trash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Rincian Staf & Kesiapan Operasional (Level 04 Section 79) */}
      {detailModalId && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl w-full shadow-servio-xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  Rincian Staf & Kesiapan Operasional
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Audit canonical untuk Profil, Employment, Onboarding, dan Readiness.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalId(null)}
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark p-1"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-neutral-slate">
                <SpinnerGap size={24} className="animate-spin mx-auto text-primary mb-2" />
                <span>Memuat data detail staf...</span>
              </div>
            ) : detailData ? (
              <div className="space-y-4 text-xs">
                {/* Readiness Summary Banner */}
                <div className={`p-4 rounded-2xl border ${
                  detailData.readiness.ready
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-amber-50 border-amber-200 text-amber-950"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {detailData.readiness.ready ? (
                        <CheckCircle size={22} weight="fill" className="text-emerald-600" />
                      ) : (
                        <ShieldWarning size={22} weight="fill" className="text-amber-600" />
                      )}
                      <div>
                        <div className="font-extrabold text-sm uppercase tracking-wide">
                          Operational Readiness: {detailData.readiness.status}
                        </div>
                        <div className="text-[11px] text-neutral-slate">
                          {detailData.readiness.reason}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5 Mandatory Checks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {detailData.readiness.checks.accountActive ? (
                        <Check size={14} weight="bold" className="text-emerald-600" />
                      ) : (
                        <X size={14} weight="bold" className="text-rose-500" />
                      )}
                      <span>Akun User Aktif: <strong>{detailData.identity.status}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {detailData.readiness.checks.membershipActive ? (
                        <Check size={14} weight="bold" className="text-emerald-600" />
                      ) : (
                        <X size={14} weight="bold" className="text-rose-500" />
                      )}
                      <span>Membership SERVIO: <strong>{detailData.membership?.status || "NONE"}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {detailData.readiness.checks.roleAssignmentValid ? (
                        <Check size={14} weight="bold" className="text-emerald-600" />
                      ) : (
                        <X size={14} weight="bold" className="text-rose-500" />
                      )}
                      <span>Role Assignment: <strong>{detailData.role.assignmentStatus || "PENDING"}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {detailData.readiness.checks.employmentActive ? (
                        <Check size={14} weight="bold" className="text-emerald-600" />
                      ) : (
                        <X size={14} weight="bold" className="text-rose-500" />
                      )}
                      <span>Status Pekerjaan: <strong>{detailData.employment?.status || "NONE"}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-full">
                      {detailData.readiness.checks.onboardingCompleted ? (
                        <Check size={14} weight="bold" className="text-emerald-600" />
                      ) : (
                        <X size={14} weight="bold" className="text-rose-500" />
                      )}
                      <span>Onboarding Selesai: <strong>{detailData.onboarding?.status || "NONE"} ({detailData.onboarding?.progress || 0}%)</strong></span>
                    </div>
                  </div>
                </div>

                {/* Identity & Profile Header (Avatar, Display Name, Bio) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0 shadow-sm border border-slate-200">
                      {detailData.profile?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detailData.profile.avatar}
                          alt={detailData.identity.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        detailData.identity.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-dark text-base">
                          {detailData.profile?.displayName || detailData.identity.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {detailData.role.code}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-slate mt-0.5">
                        {detailData.identity.fullName !== detailData.profile?.displayName && (
                          <span>Nama Resmi: <strong>{detailData.identity.fullName}</strong> • </span>
                        )}
                        <span>{detailData.identity.email}</span>
                        {detailData.identity.phone && <span> • {detailData.identity.phone}</span>}
                      </div>
                      {detailData.profile?.bio && (
                        <p className="text-xs text-slate-600 italic mt-1">&ldquo;{detailData.profile.bio}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right sm:self-center shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      detailData.identity.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      Status Akun: {detailData.identity.status}
                    </span>
                  </div>
                </div>

                {/* Data Identitas & Dokumen KTP (Data Yang Diinputkan Staf) */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <span className="text-[10px] uppercase font-bold text-neutral-slate block">
                    Verifikasi Dokumen & Identitas (Data Hasil Input Staf)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-slate text-[10px] block">NIK Kependudukan</span>
                      <span className="font-mono font-bold text-neutral-dark text-sm tracking-wider">
                        {detailData.identity.nik || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-slate text-[10px] block">Jenis Kelamin</span>
                      <span className="font-semibold text-neutral-dark">
                        {detailData.profile?.gender === "MALE"
                          ? "Laki-laki"
                          : detailData.profile?.gender === "FEMALE"
                          ? "Perempuan"
                          : detailData.profile?.gender || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-slate text-[10px] block">Tanggal Lahir</span>
                      <span className="font-semibold text-neutral-dark">
                        {detailData.profile?.dateOfBirth ? String(detailData.profile.dateOfBirth).split("T")[0] : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Kontak Darurat */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-neutral-slate text-[11px]">Kontak Darurat (Emergency Contact):</span>
                    <span className="font-bold text-neutral-dark">
                      {detailData.identity.emergencyContact?.name
                        ? `${detailData.identity.emergencyContact.name} (${detailData.identity.emergencyContact.phone})`
                        : "-"}
                    </span>
                  </div>

                  {/* Preview Foto e-KTP Asli */}
                  {detailData.identity.ktpFilePath ? (
                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-dark flex items-center gap-1.5">
                          <IdentificationCard size={16} weight="bold" className="text-primary" />
                          Foto e-KTP Asli Terunggah:
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Telah Diunggah Staf
                        </span>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white max-w-sm p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailData.identity.ktpFilePath}
                          alt="Foto e-KTP Staf"
                          className="w-full h-44 object-contain rounded-xl bg-slate-50"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-neutral-slate italic">
                      Foto KTP belum diunggah oleh staf (menunggu penyelesaian task verifikasi).
                    </div>
                  )}
                </div>

                {/* Employment Context */}
                {detailData.employment && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-neutral-slate">
                        Konteks Pekerjaan (Internal Employment)
                      </span>
                      {detailData.identity.password && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-slate">Kata Sandi:</span>
                          <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                            {visiblePasswords[detailData.identity.id] ? detailData.identity.password : "••••••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVisiblePasswords((prev) => ({
                              ...prev,
                              [detailData.identity.id]: !prev[detailData.identity.id],
                            }))}
                            className="p-1 rounded text-neutral-slate hover:text-neutral-dark hover:bg-slate-200"
                            title={visiblePasswords[detailData.identity.id] ? "Sembunyikan" : "Tampilkan"}
                          >
                            {visiblePasswords[detailData.identity.id] ? <EyeSlash size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(detailData.identity.password || "");
                              setCopiedPasswordId(detailData.identity.id);
                              setTimeout(() => setCopiedPasswordId(null), 2000);
                            }}
                            className="p-1 rounded text-neutral-slate hover:text-primary hover:bg-slate-200"
                            title="Salin Password"
                          >
                            {copiedPasswordId === detailData.identity.id ? (
                              <CheckCircle size={14} className="text-emerald-600" weight="fill" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-neutral-slate text-[10px]">Employee ID</span>
                        <div className="font-mono font-bold text-primary">{detailData.employment.employeeId}</div>
                      </div>
                      <div>
                        <span className="text-neutral-slate text-[10px]">Departemen</span>
                        <div className="font-semibold text-neutral-dark">{detailData.employment.department}</div>
                      </div>
                      <div>
                        <span className="text-neutral-slate text-[10px]">Posisi / Jabatan</span>
                        <div className="font-semibold text-neutral-dark">{detailData.employment.position}</div>
                      </div>
                      <div>
                        <span className="text-neutral-slate text-[10px]">Tipe Kontrak</span>
                        <div className="font-semibold text-neutral-dark">{detailData.employment.employmentType}</div>
                      </div>
                      <div>
                        <span className="text-neutral-slate text-[10px]">Tanggal Mulai</span>
                        <div className="text-neutral-dark">{detailData.employment.startDate || "-"}</div>
                      </div>
                      <div>
                        <span className="text-neutral-slate text-[10px]">Status Pekerjaan</span>
                        <div className="font-bold text-neutral-dark">{detailData.employment.status}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Onboarding Tasks Checklist */}
                {detailData.onboarding && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-neutral-slate">
                        Onboarding Tasks Checklist ({detailData.onboarding.progress}% Selesai)
                      </span>
                      <span className="text-[10px] font-bold text-primary">
                        Status: {detailData.onboarding.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${detailData.onboarding.progress}%` }}
                      />
                    </div>

                    <div className="space-y-1.5 pt-2">
                      {detailData.onboarding.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {task.status === "COMPLETED" ? (
                              <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                            ) : task.status === "IN_PROGRESS" ? (
                              <Clock size={16} weight="bold" className="text-indigo-600 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-neutral-dark">{task.title}</div>
                              <div className="text-[10px] text-neutral-slate">{task.description}</div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : task.status === "IN_PROGRESS"
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {task.status}
                            </span>
                            {task.required && (
                              <span className="block text-[8px] text-rose-500 font-bold uppercase mt-0.5">Wajib</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-neutral-dark transition"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Employment Metadata (Level 04 Section 53) */}
      {editTarget && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-servio-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  Edit Konteks Pekerjaan Staf
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Ubah data departemen, posisi operasional, dan tanggal mulai staf {editTarget.fullName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditEmploymentSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-dark">
                  Departemen
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  placeholder="Contoh: Operations, Finance, Customer Care"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-dark">
                  Posisi Operasional
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  placeholder="Contoh: Operations Specialist, Verifikator"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Tipe Pekerjaan
                  </label>
                  <select
                    value={editFormData.employmentType}
                    onChange={(e) => setEditFormData({ ...editFormData, employmentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  >
                    <option value="FULL_TIME">FULL_TIME</option>
                    <option value="PART_TIME">PART_TIME</option>
                    <option value="CONTRACT">CONTRACT</option>
                    <option value="INTERN">INTERN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-neutral-slate">
                Catatan: Employee ID (<code className="font-mono text-primary font-bold">{editTarget.employeeId}</code>) dan Status merupakan field terproteksi dan tidak diubah di sini.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingEmployment}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-60 transition flex items-center gap-1.5"
                >
                  {updatingEmployment ? (
                    <>
                      <SpinnerGap size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Account (Section 25, 26, 51) */}
      {showModal && (
        <div className="fixed inset-0 bg-neutral-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-servio-xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  Tambah Akun Staf Internal
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Buat akun staf operasional SERVIO lengkap dengan employment context & onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0 text-rose-600" weight="fill" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-dark">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="EMP-012"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Peran / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as "ADMIN_OPERATIONS" | "FINANCE_PAYMENT_OPS" | "CUSTOMER_SUPPORT";
                      const defaultPos = nextRole === "ADMIN_OPERATIONS"
                        ? "Operations Administrator"
                        : nextRole === "FINANCE_PAYMENT_OPS"
                        ? "Finance Operations Staff"
                        : "Customer Care Officer";
                      const defaultDept = nextRole === "FINANCE_PAYMENT_OPS"
                        ? "Finance"
                        : nextRole === "CUSTOMER_SUPPORT"
                        ? "Customer Care"
                        : "Operations";
                      setFormData({
                        ...formData,
                        role: nextRole,
                        position: defaultPos,
                        department: defaultDept,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  >
                    <option value="ADMIN_OPERATIONS">ADMIN_OPERATIONS</option>
                    <option value="FINANCE_PAYMENT_OPS">FINANCE_PAYMENT_OPS</option>
                    <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Departemen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Operations"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Posisi / Jabatan
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Operations Administrator"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Email Kantor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staf@servio.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+628123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Tipe Pekerjaan
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  >
                    <option value="FULL_TIME">FULL_TIME</option>
                    <option value="PART_TIME">PART_TIME</option>
                    <option value="CONTRACT">CONTRACT</option>
                    <option value="INTERN">INTERN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 flex items-start gap-2">
                <ShieldCheck size={16} className="text-purple-600 shrink-0 mt-0.5" weight="fill" />
                <span>
                  Sesuai Level 04 Section 25, CEO tidak memasukkan kata sandi staf. Tautan undangan aktivasi akan digenerate otomatis agar staf menentukan kata sandi sendiri.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-60 transition flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <SpinnerGap size={14} className="animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <span>Buat Akun & Undangan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Nonaktifkan / Aktifkan Akun Staf */}
      {statusTarget && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-servio-xl space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${
                statusTarget.nextStatus === "SUSPENDED"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
                {statusTarget.nextStatus === "SUSPENDED" ? (
                  <Prohibit size={26} weight="fill" />
                ) : (
                  <CheckCircle size={26} weight="fill" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  {statusTarget.nextStatus === "SUSPENDED"
                    ? "Konfirmasi Penangguhan Staf (SUSPENDED)"
                    : "Konfirmasi Aktifkan Kembali Akun Staf"}
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  {statusTarget.nextStatus === "SUSPENDED"
                    ? "Penangguhan akan memblokir kesiapan operasional (Readiness = NOT_READY) dan akses operasional staff."
                    : "Tindakan ini akan mengaktifkan kembali status pekerjaan staf menjadi ACTIVE."}
                </p>
              </div>
            </div>

            {/* Staff info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-neutral-dark">
              <div className="flex justify-between">
                <span className="text-neutral-slate">Nama Staf:</span>
                <span className="font-bold">{statusTarget.member.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Employee ID:</span>
                <span className="font-mono text-primary font-bold">{statusTarget.member.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Role:</span>
                <span className="font-semibold">{statusTarget.member.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Email Kantor:</span>
                <span>{statusTarget.member.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={Boolean(updatingStatusId)}
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(updatingStatusId)}
                onClick={handleConfirmStatusChange}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 shadow-servio-xs ${
                  statusTarget.nextStatus === "SUSPENDED"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {updatingStatusId && <SpinnerGap size={14} className="animate-spin" />}
                <span>
                  {statusTarget.nextStatus === "SUSPENDED" ? "Tangguhkan Pekerjaan" : "Aktifkan Pekerjaan"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Offboard Staf (Level 04 Section 34 & 57) */}
      {offboardTarget && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-servio-xl space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 shrink-0">
                <Briefcase size={26} weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  Konfirmasi Offboard Staf
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Mengakhiri hubungan kerja operasional staf {offboardTarget.fullName} ({offboardTarget.employeeId}).
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-purple-950 space-y-1">
              <p className="font-bold text-purple-900">Ketentuan Offboarding Level 04:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Riwayat data pekerjaan dan identitas <strong>tetap tersimpan</strong> untuk kepatuhan audit.</li>
                <li>Status pekerjaan berubah menjadi <strong>OFFBOARDED</strong> (terminal state).</li>
                <li>Seluruh penugasan peran dicabut dan Operational Readiness menjadi <strong>NOT_READY</strong>.</li>
              </ul>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-semibold text-neutral-dark">
                Alasan / Catatan Offboarding
              </label>
              <textarea
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                placeholder="Contoh: Pengunduran diri sukarela / Kontrak kerja berakhir"
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={Boolean(offboardingId)}
                onClick={() => setOffboardTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(offboardingId)}
                onClick={handleConfirmOffboard}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-servio-xs"
              >
                {offboardingId && <SpinnerGap size={14} className="animate-spin" />}
                <span>Offboard Staf</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Akun Staf */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-servio-xl space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                <Trash size={26} weight="fill" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  Konfirmasi Hapus Akun Staf
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Apakah Anda yakin ingin menghapus akun staf operasional berikut?
                </p>
              </div>
            </div>

            {/* Staff info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5 text-neutral-dark">
              <div className="flex justify-between">
                <span className="text-neutral-slate">Nama Staf:</span>
                <span className="font-bold">{deleteTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Employee ID:</span>
                <span className="font-mono text-primary font-bold">{deleteTarget.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Role:</span>
                <span className="font-semibold">{deleteTarget.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Email Kantor:</span>
                <span>{deleteTarget.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={handleConfirmDeleteStaff}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-servio-xs"
              >
                {deletingId && <SpinnerGap size={14} className="animate-spin" />}
                <span>Hapus Akun Staf</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
