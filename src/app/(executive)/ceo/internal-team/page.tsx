"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Link as LinkIcon,
  FileText,
  ArrowsOutSimple,
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

  // Staff Invitation Link Copy states
  const [copyingInviteId, setCopyingInviteId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  const [staffInviteUrl, setStaffInviteUrl] = useState<Record<string, string>>({});

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

  // Tab State: Tim Internal vs Antrean Pengecekan Berkas (CR-03 CEO Exclusive)
  const [activeTab, setActiveTab] = useState<"TEAM" | "EMPLOYEE_KYC">("TEAM");
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [selectedKycDetail, setSelectedKycDetail] = useState<any | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    id: string;
    name?: string;
    email?: string;
    action: "APPROVE" | "REQUEST_REVISION" | "REJECT";
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Lightbox state for previewing photos / KTP
  const [imageLightbox, setImageLightbox] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const fetchKycQueue = useCallback(async () => {
    setLoadingKyc(true);
    try {
      const res = await opsApi.getCeoVerifications();
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
        setKycQueue(list);
      }
    } catch {
      // Safe fallback
    } finally {
      setLoadingKyc(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "EMPLOYEE_KYC") {
      fetchKycQueue();
    }
  }, [activeTab, fetchKycQueue]);

  const handleExecuteKycDecision = async () => {
    if (!decisionModal) return;
    if ((decisionModal.action === "REQUEST_REVISION" || decisionModal.action === "REJECT") && !decisionReason.trim()) {
      setToast({
        message: "Alasan wajib diisi saat meminta revisi atau menolak berkas staf.",
        type: "error",
      });
      return;
    }

    setSubmittingDecision(true);
    try {
      const res = await opsApi.ceoKycDecision(
        decisionModal.id,
        decisionModal.action,
        decisionReason || "Disetujui oleh CEO"
      );
      if (!res.data && res.message) {
        setToast({ message: res.message, type: "error" });
      } else {
        const actionLabel =
          decisionModal.action === "APPROVE"
            ? "disetujui"
            : decisionModal.action === "REQUEST_REVISION"
              ? "diminta revisi"
              : "ditolak";
        setToast({
          message: `Verifikasi Pengecekan Berkas ${decisionModal.name ? `untuk ${decisionModal.name}` : ""} berhasil ${actionLabel}.`,
          type: "success",
        });
        setDecisionModal(null);
        setDecisionReason("");
        await fetchKycQueue();
        await fetchAccounts();
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal memproses keputusan verifikasi.", type: "error" });
    } finally {
      setSubmittingDecision(false);
    }
  };

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

  // Dynamic preview for role-based auto-generated Employee ID
  // e.g. ADMIN -> ADM-BUDI-[AUTO], FINANCE -> FNC-BUDI-[AUTO], SUPPORT -> CS-BUDI-[AUTO]
  const previewEmployeeId = useMemo(() => {
    const roleUpper = formData.role.toUpperCase();
    const rolePrefix = roleUpper.includes("ADMIN")
      ? "ADM"
      : roleUpper.includes("FINANCE")
        ? "FNC"
        : roleUpper.includes("SUPPORT") || roleUpper.includes("CS")
          ? "CS"
          : "STF";

    const firstWord = formData.fullName.trim() ? formData.fullName.trim().split(/\s+/)[0] : "STAF";
    const cleanName = firstWord.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "STAF";

    return `${rolePrefix}-${cleanName}-[AUTO]`;
  }, [formData.role, formData.fullName]);

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
          totalStaff: res.data.stats.totalStaff || res.data.stats.total || 0,
          adminOperations: res.data.stats.adminOperations || 0,
          financeOperations: res.data.stats.financeOperations || 0,
          customerSupport: res.data.stats.customerSupport || 0,
          operationalReady: res.data.stats.operationalReady || res.data.stats.ready || 0,
          onboardingActive: res.data.stats.onboardingActive || res.data.stats.onboarding || 0,
        });

        const rawList = res.data.accounts || (res.data as any).items || [];
        const normalized = rawList.map((acc: any) => ({
          ...acc,
          role: typeof acc.role === "object" && acc.role ? acc.role : {
            code: acc.role || acc.roleCode || "STAFF",
            name: acc.role || acc.roleCode || "STAFF",
          },
        }));
        setAccounts(normalized);
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

  const handleCopyStaffInvitationLink = async (staffId: string, staffName?: string) => {
    setCopyingInviteId(staffId);
    try {
      const res = await internalAccountApi.getInvitationLink(staffId);
      const inviteUrl =
        res.data?.invitation_url ||
        (typeof window !== "undefined" && res.data?.invitation_token
          ? `${window.location.origin}/auth/invitation?token=${res.data?.invitation_token}`
          : "");

      if (inviteUrl) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(inviteUrl);
        } else if (typeof document !== "undefined") {
          const ta = document.createElement("textarea");
          ta.value = inviteUrl;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setStaffInviteUrl((prev) => ({ ...prev, [staffId]: inviteUrl }));
        setCopiedInviteId(staffId);
        setTimeout(() => setCopiedInviteId(null), 3000);
        setToast({
          message: `Tautan undangan untuk ${staffName || "staf"} berhasil disalin! Silakan berikan kepada staf terkait.`,
          type: "success",
        });
      } else {
        setToast({
          message: "Tautan undangan tidak dapat dibuat. Silakan coba kembali.",
          type: "error",
        });
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal menyalin tautan undangan staf.",
        type: "error",
      });
    } finally {
      setCopyingInviteId(null);
    }
  };

  const handleResendInvitation = async (staffId: string, staffName?: string) => {
    setResendingInviteId(staffId);
    try {
      const res = await internalAccountApi.resendInvitation(staffId);
      if (res.data) {
        setToast({
          message: `Undangan untuk ${staffName || "staf"} berhasil dikirim ulang ke ${res.data.email} via Brevo Transactional Email. Token baru aktif selama 12 jam.`,
          type: "success",
        });
        await fetchAccounts();
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal mengirim ulang undangan staf.",
        type: "error",
      });
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCancelInvitation = async (staffId: string, staffName?: string) => {
    if (!confirm(`Apakah Anda yakin ingin membatalkan undangan untuk ${staffName || "staf"} ini?`)) {
      return;
    }
    setCancellingInviteId(staffId);
    try {
      await internalAccountApi.cancelInvitation(staffId);
      setToast({
        message: `Undangan untuk ${staffName || "staf"} berhasil dibatalkan. Tautan undangan sebelumnya telah dinonaktifkan.`,
        type: "success",
      });
      await fetchAccounts();
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({
        message: error.message || "Gagal membatalkan undangan staf.",
        type: "error",
      });
    } finally {
      setCancellingInviteId(null);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setDetailModalId(id);
    setLoadingDetail(true);
    try {
      const res = await internalAccountApi.getAccount(id);
      if (res.data) {
        setDetailData(res.data);
      }
      try {
        const linkRes = await internalAccountApi.getInvitationLink(id);
        const url = linkRes?.data?.invitation_url;
        if (url) {
          setStaffInviteUrl((prev) => ({ ...prev, [id]: url }));
        }
      } catch {
        // Safe ignore
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
        fullName: formData.fullName.trim(),
        employeeId: "", // Auto-generated in database: [Role Prefix]-[Name]-[Random]
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        roleCode: formData.role,
        department: formData.department.trim(),
        position: formData.position.trim(),
        employmentType: formData.employmentType,
        startDate: formData.startDate,
      });

      const resData = (res as any)?.data || res;
      const rawToken =
        resData?.invitationToken ||
        resData?.invitation_token ||
        resData?.token ||
        "";
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const fullUrl = rawToken
        ? `${origin}/auth/invitation?token=${rawToken}`
        : resData?.invitationUrl || resData?.invitation_url || `${origin}/auth/invitation`;

      if (resData) {
        setCreatedInvite({
          token: rawToken,
          url: fullUrl,
          name: formData.fullName.trim(),
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
      const error = err as Error & { message?: string; errors?: Record<string, string[]> };
      if (error.errors && typeof error.errors === "object") {
        const errorDetails = Object.values(error.errors).flat().join(" ");
        setErrorMsg(errorDetails || error.message || "Validasi data formulir gagal.");
      } else {
        setErrorMsg(error.message || "Gagal membuat akun staf.");
      }
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
          id="btn-add-staff-modal"
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

      {/* Tab Navigation: Daftar Staf vs Antrean Employee KYC */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("TEAM")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px ${activeTab === "TEAM"
            ? "border-primary text-primary bg-primary/5"
            : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
            }`}
        >
          <Users size={16} />
          <span>Daftar Tim Internal</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-neutral-dark font-mono">
            {accounts.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-employee-kyc-queue"
          onClick={() => setActiveTab("EMPLOYEE_KYC")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px ${activeTab === "EMPLOYEE_KYC"
            ? "border-purple-600 text-purple-700 bg-purple-50/50"
            : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
            }`}
        >
          <IdentificationBadge size={16} />
          <span>Antrean Pengecekan Berkas</span>
          {kycQueue.filter((k) => k.status === "PENDING" || k.status === "PENDING_REVIEW").length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-bold animate-pulse font-mono">
              {kycQueue.filter((k) => k.status === "PENDING" || k.status === "PENDING_REVIEW").length}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 font-mono">
              {kycQueue.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "TEAM" ? (
        <>
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
              <table id="table-ceo-staff-list" className="w-full text-left text-xs">
                <thead className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-3">Nama Staf</th>
                    <th className="py-3 px-3">Employee ID</th>
                    <th className="py-3 px-3">Role & Jabatan</th>
                    <th className="py-3 px-3">Email Kantor</th>
                    <th className="py-3 px-3">Password</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Onboarding</th>
                    <th className="py-3 px-3">Readiness</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-slate">
                        <SpinnerGap size={20} className="animate-spin mx-auto text-primary mb-1" />
                        <span>Memuat data staf internal...</span>
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-neutral-slate">
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
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${(member.role?.code || (member as any).roleCode || member.role) === "CEO_PRODUCT_OWNER" ? "bg-purple-100 text-purple-800" :
                              (member.role?.code || (member as any).roleCode || member.role) === "ADMIN_OPERATIONS" ? "bg-blue-100 text-blue-800" :
                                (member.role?.code || (member as any).roleCode || member.role) === "FINANCE_PAYMENT_OPS" ? "bg-emerald-100 text-emerald-800" :
                                  "bg-amber-100 text-amber-800"
                              }`}>
                              {member.role?.code || (member as any).roleCode || member.role || "STAFF"}
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

                        {/* Password: CR-03 Wajib hanya menampilkan Belum Dibuat atau Sudah Dibuat */}
                        <td className="py-3 px-3">
                          {(member.password_status === "PENDING_INVITATION" ||
                            (member.employmentStatus as string) === "PENDING" ||
                            (member.employmentStatus as string) === "PENDING_START" ||
                            (member as any).status === "PENDING" ||
                            (member.onboardingStatus as string) === "INVITED") ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold" title="Kata sandi akun staf belum dibuat.">
                              <Clock size={13} className="text-amber-600 shrink-0" weight="bold" />
                              <span>Belum Dibuat</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold" title="Kata sandi akun staf telah dibuat.">
                              <CheckCircle size={13} className="text-emerald-600 shrink-0" weight="fill" />
                              <span>Sudah Dibuat</span>
                            </div>
                          )}
                        </td>

                        {/* Department */}
                        <td className="py-3 px-3 text-neutral-slate font-medium">
                          {member.department}
                        </td>

                        {/* Onboarding Status */}
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${member.onboardingStatus === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : member.onboardingStatus === "IN_PROGRESS"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : member.onboardingStatus === "PENDING_REVIEW"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : member.onboardingStatus === "REVISION_REQUIRED"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : member.onboardingStatus === "REJECTED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
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
                            {/* Quick Copy, Resend, Cancel Invitation Link ONLY if status is INVITED and password not yet created */}
                            {((member.onboardingStatus === "INVITED" || member.password_status === "PENDING_INVITATION" || (member as any).status === "PENDING") && (member as any).status !== "ACTIVE" && member.password_status !== "CREATED") && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  id={`btn-copy-invite-${member.id}`}
                                  onClick={() => handleCopyStaffInvitationLink(member.id, member.fullName)}
                                  disabled={copyingInviteId === member.id}
                                  className="px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold transition inline-flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                                  title="Salin tautan undangan staf agar staf bisa langsung aktivasi jika link hilang"
                                >
                                  {copyingInviteId === member.id ? (
                                    <SpinnerGap size={12} className="animate-spin" />
                                  ) : copiedInviteId === member.id ? (
                                    <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                                  ) : (
                                    <LinkIcon size={12} weight="bold" />
                                  )}
                                  <span>{copiedInviteId === member.id ? "Tersalin" : "Salin"}</span>
                                </button>

                                <button
                                  type="button"
                                  id={`btn-resend-invite-${member.id}`}
                                  onClick={() => handleResendInvitation(member.id, member.fullName)}
                                  disabled={resendingInviteId === member.id}
                                  className="px-2 py-1 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-semibold transition inline-flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                                  title="Kirim ulang undangan via email Brevo (menghasilkan token baru dan membatalkan token sebelumnya)"
                                >
                                  {resendingInviteId === member.id ? (
                                    <SpinnerGap size={12} className="animate-spin" />
                                  ) : (
                                    <EnvelopeSimple size={12} weight="bold" />
                                  )}
                                  <span>Kirim Ulang</span>
                                </button>

                                <button
                                  type="button"
                                  id={`btn-cancel-invite-${member.id}`}
                                  onClick={() => handleCancelInvitation(member.id, member.fullName)}
                                  disabled={cancellingInviteId === member.id}
                                  className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold transition inline-flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                                  title="Batalkan undangan staf ini"
                                >
                                  {cancellingInviteId === member.id ? (
                                    <SpinnerGap size={12} className="animate-spin" />
                                  ) : (
                                    <XCircle size={12} weight="bold" />
                                  )}
                                  <span>Batalkan</span>
                                </button>
                              </div>
                            )}

                            {/* Detail Button */}
                            <button
                              id={`btn-staff-detail-${member.id}`}
                              type="button"
                              onClick={() => handleOpenDetail(member.id)}
                              className="btn-staff-detail-action px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition"
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
                                    id={`btn-staff-suspend-${member.id}`}
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
                                    className="btn-staff-suspend-action p-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
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
        </>
      ) : (
        /* Antrean Employee KYC Table (CR-02 CEO Exclusive V08 & V09) */
        <div className="bg-white rounded-3xl border border-purple-200/80 shadow-servio-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                  CEO Exclusive
                </span>
                <h2 className="text-sm font-bold text-neutral-dark">
                  Antrean Verifikasi Berkas
                </h2>
              </div>
              <p className="text-[11px] text-neutral-slate mt-0.5">
                Persetujuan KYC staf internal hanya dapat dieksekusi oleh CEO / Product Owner. Admin dilarang (403 Forbidden).
              </p>
            </div>
            <button
              onClick={fetchKycQueue}
              className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1"
            >
              <SpinnerGap size={14} className={loadingKyc ? "animate-spin" : ""} />
              <span>Refresh Antrean</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" id="table-ceo-kyc-queue">
              <thead className="text-[10px] font-bold text-neutral-slate uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">ID Verifikasi</th>
                  <th className="py-3 px-3">Staf Pemohon</th>
                  <th className="py-3 px-3">Email & Kontak</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Waktu Pengajuan</th>
                  <th className="py-3 px-3 text-right">Keputusan CEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingKyc ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-slate">
                      <SpinnerGap size={20} className="animate-spin mx-auto text-purple-600 mb-1" />
                      <span>Memuat antrean Pengecekan Berkas...</span>
                    </td>
                  </tr>
                ) : kycQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-slate">
                      <IdentificationCard size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-neutral-dark">Tidak ada antrean Pengecekan Berkas</p>
                      <p className="text-[11px] text-neutral-slate mt-0.5">
                        Semua pengajuan Pengecekan Berkas staf telah diproses atau belum ada pengajuan baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  kycQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-purple-50/30 transition">
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-slate">
                        {item.id}
                      </td>
                      <td className="py-3 px-3">
                        <div
                          onClick={() => setSelectedKycDetail(item)}
                          className="font-bold text-neutral-dark hover:text-purple-700 cursor-pointer transition flex items-center gap-1.5"
                          title="Klik untuk melihat detail lengkap pengajuan onboarding"
                        >
                          <span>{item.applicant_name || item.user?.profile?.full_name || item.user?.profile?.display_name || item.user?.email || "Staf Internal"}</span>
                        </div>
                        <div className="text-[10px] text-neutral-slate font-mono">
                          NIP: {item.applicant_employee_id || item.user?.profile?.employee_id || item.user_id}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-neutral-slate">
                        <div>{item.applicant_email || item.user?.email || "-"}</div>
                        <div className="text-[10px] text-neutral-muted">{item.applicant_phone || item.user?.phone_e164 || "-"}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "REVISION_REQUIRED"
                              ? "bg-amber-100 text-amber-800"
                              : item.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                        >
                          {item.status === "PENDING" ? "PENDING_REVIEW" : item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-slate text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            id={`btn-detail-kyc-${item.id}`}
                            onClick={() => setSelectedKycDetail(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs shadow-servio-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} weight="bold" />
                            <span>Lihat Detail</span>
                          </button>
                          {(item.status === "PENDING" || item.status === "PENDING_REVIEW") ? (
                            <>
                              <button
                                type="button"
                                id={`btn-approve-kyc-${item.id}`}
                                onClick={() =>
                                  setDecisionModal({
                                    id: item.id,
                                    name: item.applicant_name || item.user?.profile?.full_name || item.user?.profile?.display_name || item.user?.email,
                                    email: item.applicant_email || item.user?.email,
                                    action: "APPROVE",
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                id={`btn-revision-kyc-${item.id}`}
                                onClick={() =>
                                  setDecisionModal({
                                    id: item.id,
                                    name: item.applicant_name || item.user?.profile?.full_name || item.user?.profile?.display_name || item.user?.email,
                                    email: item.applicant_email || item.user?.email,
                                    action: "REQUEST_REVISION",
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                              >
                                Minta Revisi
                              </button>
                              <button
                                type="button"
                                id={`btn-reject-kyc-${item.id}`}
                                onClick={() =>
                                  setDecisionModal({
                                    id: item.id,
                                    name: item.applicant_name || item.user?.profile?.full_name || item.user?.profile?.display_name || item.user?.email,
                                    email: item.applicant_email || item.user?.email,
                                    action: "REJECT",
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                              >
                                Tolak
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-neutral-muted italic">
                              Selesai ({item.status})
                            </span>
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
      )}

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
                <div className={`p-4 rounded-2xl border ${detailData.readiness.ready
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
                    <div
                      onClick={() =>
                        detailData.profile?.avatar &&
                        setImageLightbox({
                          src: detailData.profile.avatar,
                          title: "Foto Profil Staf",
                          subtitle: detailData.identity.fullName,
                        })
                      }
                      className={`w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0 shadow-sm border border-slate-200 ${
                        detailData.profile?.avatar ? "cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-primary/40 transition" : ""
                      }`}
                      title={detailData.profile?.avatar ? "Klik untuk melihat foto profil ukuran penuh" : undefined}
                    >
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
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${detailData.identity.status === "ACTIVE"
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

                  {/* Foto Profil Preview Tahap Onboarding */}
                  {detailData.profile?.avatar && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          onClick={() =>
                            setImageLightbox({
                              src: detailData.profile!.avatar!,
                              title: "Foto Profil Staf",
                              subtitle: detailData.identity.fullName,
                            })
                          }
                          className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer hover:opacity-90 transition"
                          title="Klik untuk memperbesar"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={detailData.profile.avatar}
                            alt="Foto Profil"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-neutral-dark block">Foto Profil Staf</span>
                          <span className="text-[10px] text-slate-400">Hasil unggahan dari formulir onboarding</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setImageLightbox({
                            src: detailData.profile!.avatar!,
                            title: "Foto Profil Staf",
                            subtitle: detailData.identity.fullName,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowsOutSimple size={13} weight="bold" />
                        <span>Buka Foto Profil</span>
                      </button>
                    </div>
                  )}

                  {/* Preview Foto e-KTP Asli */}
                  {detailData.identity.ktpFilePath ? (
                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-dark flex items-center gap-1.5">
                          <IdentificationCard size={16} weight="bold" className="text-primary" />
                          Foto e-KTP Asli Terunggah:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Telah Diunggah Staf
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setImageLightbox({
                                src: detailData.identity.ktpFilePath!,
                                title: "Dokumen Fisik e-KTP Asli",
                                subtitle: `NIK: ${detailData.identity.nik || "-"} • ${detailData.identity.fullName}`,
                              })
                            }
                            className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowsOutSimple size={12} weight="bold" />
                            <span>Buka / Perbesar</span>
                          </button>
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          setImageLightbox({
                            src: detailData.identity.ktpFilePath!,
                            title: "Dokumen Fisik e-KTP Asli",
                            subtitle: `NIK: ${detailData.identity.nik || "-"} • ${detailData.identity.fullName}`,
                          })
                        }
                        className="rounded-2xl overflow-hidden border border-slate-200 bg-white max-w-sm p-1 cursor-pointer hover:shadow-md hover:border-purple-300 transition"
                        title="Klik untuk memperbesar dokumen e-KTP"
                      >
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
                      {detailData.identity.status === "PENDING" || (detailData.identity as any).employmentStatus === "PENDING" || (detailData.identity as any).onboardingStatus === "INVITED" ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[10px] text-neutral-slate">Kata Sandi:</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <Clock size={11} className="text-amber-600" />
                            Belum dibuat (Menunggu aktivasi undangan)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[10px] text-neutral-slate">Kata Sandi:</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle size={11} weight="fill" className="text-emerald-600" />
                            Sudah Dibuat (Tersimpan aman &amp; terenkripsi)
                          </span>
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

                {/* Tautan Undangan & Aktivasi Akun Staf */}
                <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                        <LinkIcon size={16} weight="bold" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-dark">
                          Tautan Undangan & Aktivasi Akun Staf
                        </h4>
                        <p className="text-[11px] text-neutral-slate">
                          Kirimkan tautan ini ke staf agar dapat melengkapi profil dan membuat kata sandi tanpa harus membuat ulang akun.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="btn-copy-staff-invitation-modal"
                      onClick={() => handleCopyStaffInvitationLink(detailData.identity.id, detailData.identity.fullName)}
                      disabled={copyingInviteId === detailData.identity.id}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {copyingInviteId === detailData.identity.id ? (
                        <>
                          <SpinnerGap size={14} className="animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : copiedInviteId === detailData.identity.id ? (
                        <>
                          <CheckCircle size={14} weight="fill" className="text-emerald-300" />
                          <span>Tautan Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} weight="bold" />
                          <span>Salin Tautan Undangan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-xl px-3 py-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        staffInviteUrl[detailData.identity.id] ||
                        (typeof window !== "undefined"
                          ? `${window.location.origin}/auth/invitation?token=...`
                          : "https://servio.id/auth/invitation?token=...")
                      }
                      className="bg-transparent text-xs font-mono text-purple-900 w-full outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyStaffInvitationLink(detailData.identity.id, detailData.identity.fullName)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 shrink-0 px-2 py-0.5 rounded hover:bg-purple-100 transition"
                      title="Salin ke clipboard"
                    >
                      {copiedInviteId === detailData.identity.id ? "Tersalin ✓" : "Salin"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-slate">
                    <span>Masa berlaku token: 12 jam sejak dibuat/disalin.</span>
                    <button
                      type="button"
                      onClick={() => handleCopyStaffInvitationLink(detailData.identity.id, detailData.identity.fullName)}
                      className="text-purple-600 hover:underline font-semibold"
                    >
                      Perbarui Token Undangan Baru
                    </button>
                  </div>
                </div>

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
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${task.status === "COMPLETED"
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

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {detailData && (
                <button
                  type="button"
                  id="btn-footer-copy-invite"
                  onClick={() => handleCopyStaffInvitationLink(detailData.identity.id, detailData.identity.fullName)}
                  disabled={copyingInviteId === detailData.identity.id}
                  className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-xs font-bold text-purple-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  title="Salin tautan undangan staf agar staf bisa langsung aktivasi"
                >
                  {copiedInviteId === detailData.identity.id ? (
                    <>
                      <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                      <span>Tautan Undangan Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon size={15} weight="bold" />
                      <span>Salin Tautan Undangan</span>
                    </>
                  )}
                </button>
              )}
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
                  id="input-staff-fullname"
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
                    Employee ID / NIP Staf
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs flex items-center justify-between">
                    <span className="font-mono text-slate-800 font-bold text-xs tracking-wide">
                      {previewEmployeeId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                      Auto-Generate
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-slate">
                    Dibuat otomatis oleh database dari identitas role &amp; nama staf.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-dark">
                    Peran / Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="select-staff-role"
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
                    id="input-staff-department"
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
                    id="input-staff-position"
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
                    id="input-staff-email"
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
                    id="input-staff-phone"
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
                    id="input-staff-startdate"
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
                  id="btn-staff-submit"
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
              <div className={`p-3 rounded-2xl shrink-0 ${statusTarget.nextStatus === "SUSPENDED"
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
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 shadow-servio-xs ${statusTarget.nextStatus === "SUSPENDED"
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

            {/* Retention Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldWarning size={14} className="text-amber-600" />
                Kebijakan Retensi Data &amp; Kepatuhan:
              </span>
              <p>
                Sesuai CR-03, akun dengan riwayat onboarding, berkas identitas, NDA, atau audit tidak akan dihapus permanen (no hard delete), melainkan dinonaktifkan (deactivated) untuk integritas audit tata kelola.
              </p>
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

      {/* Modal: Keputusan Employee KYC (CR-02 CEO Exclusive V09) */}
      {decisionModal && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-servio-xl space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${decisionModal.action === "APPROVE"
                  ? "bg-emerald-100 text-emerald-700"
                  : decisionModal.action === "REQUEST_REVISION"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                  }`}
              >
                {decisionModal.action === "APPROVE" ? (
                  <CheckCircle size={26} weight="fill" />
                ) : decisionModal.action === "REQUEST_REVISION" ? (
                  <WarningCircle size={26} weight="fill" />
                ) : (
                  <XCircle size={26} weight="fill" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  {decisionModal.action === "APPROVE"
                    ? "Setujui Onboarding Staf"
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "Minta Revisi Berkas Onboarding"
                      : "Tolak Onboarding Staf"}
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  {decisionModal.action === "APPROVE"
                    ? "Akun staf akan otomatis berstatus OPERATIONAL_READY dan dashboard operasional terbuka."
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "Kirim catatan perbaikan agar staf dapat mengunggah ulang data atau berkas yang diminta."
                      : "Tolak pengajuan staf jika tidak memenuhi kualifikasi resmi."}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-slate">Staf:</span>
                <span className="font-bold text-neutral-dark">{decisionModal.name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">ID Pengajuan:</span>
                <span className="font-mono text-purple-700 font-bold">{decisionModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-slate">Keputusan:</span>
                <span
                  className={`font-bold ${decisionModal.action === "APPROVE"
                    ? "text-emerald-700"
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "text-amber-700"
                      : "text-rose-700"
                    }`}
                >
                  {decisionModal.action === "APPROVE"
                    ? "DISETUJUI (APPROVE)"
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "MINTA REVISI (REQUEST_REVISION)"
                      : "DITOLAK (REJECT)"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-dark">
                Alasan / Catatan Keputusan: {decisionModal.action !== "APPROVE" && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={3}
                placeholder={
                  decisionModal.action === "APPROVE"
                    ? "Contoh: Dokumen KTP valid dan terverifikasi sesuai standar perusahaan."
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "Contoh: Foto kartu e-KTP buram atau NIK tidak sesuai. Mohon unggah ulang foto fisik yang jelas."
                      : "Contoh: Berkas tidak memenuhi kriteria verifikasi resmi perusahaan."
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-purple-600 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-kyc-decision"
                disabled={submittingDecision}
                onClick={handleExecuteKycDecision}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 shadow-servio-xs cursor-pointer ${decisionModal.action === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : decisionModal.action === "REQUEST_REVISION"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                  }`}
              >
                {submittingDecision && <SpinnerGap size={14} className="animate-spin" />}
                <span>
                  {decisionModal.action === "APPROVE"
                    ? "Konfirmasi Setujui"
                    : decisionModal.action === "REQUEST_REVISION"
                      ? "Kirim Permintaan Revisi"
                      : "Konfirmasi Tolak"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Pengajuan Onboarding Staf Modal (CR-03 CEO Exclusive Detail View) */}
      {selectedKycDetail && (
        <div className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200/80 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  onClick={() => {
                    const photoSrc = selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path;
                    if (photoSrc) {
                      setImageLightbox({
                        src: photoSrc,
                        title: "Foto Profil Staf",
                        subtitle: selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || "Staf Internal",
                      });
                    }
                  }}
                  className={`w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden shadow-sm ${
                    (selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path)
                      ? "cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-purple-400 transition"
                      : ""
                  }`}
                  title={(selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path) ? "Klik untuk melihat foto profil ukuran penuh" : undefined}
                >
                  {selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path}
                      alt={selectedKycDetail.applicant_name || "Staf"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || "S").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200">
                      ONBOARDING STAF INTERNAL (CR-03)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedKycDetail.status === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedKycDetail.status === "REVISION_REQUIRED"
                          ? "bg-amber-100 text-amber-800"
                          : selectedKycDetail.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                    >
                      {selectedKycDetail.status === "PENDING" ? "PENDING_REVIEW" : selectedKycDetail.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-display text-neutral-dark mt-1">
                    {selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || selectedKycDetail.user?.profile?.display_name || "Staf Internal"}
                  </h3>
                  <p className="text-xs text-neutral-slate">
                    ID Verifikasi: <span className="font-mono text-purple-700 font-bold">{selectedKycDetail.id}</span> • NIP: <span className="font-mono text-neutral-dark font-bold">{selectedKycDetail.applicant_employee_id || selectedKycDetail.user?.profile?.employee_id || "-"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKycDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* 4 Point Onboarding Overview */}
            <div className="space-y-4">
              {/* Point 1: Profil Pribadi & Kontak */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                    <User size={15} className="text-primary" />
                    Tahap 1: Profil Pribadi &amp; Kontak Staf
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Telah Diisi Staf
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nama Lengkap Staf:</span>
                    <span className="font-semibold text-neutral-dark">
                      {selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nama Sesuai KTP (Legal Name):</span>
                    <span className="font-semibold text-neutral-dark">
                      {selectedKycDetail.applicant_legal_name || selectedKycDetail.user?.profile?.legal_name || selectedKycDetail.applicant_name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email Resmi Kantor:</span>
                    <span className="font-mono text-neutral-dark">
                      {selectedKycDetail.applicant_email || selectedKycDetail.user?.email || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nomor HP / WhatsApp Aktif:</span>
                    <span className="text-neutral-dark font-medium">
                      {selectedKycDetail.applicant_phone || selectedKycDetail.user?.phone_e164 || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Jenis Kelamin:</span>
                    <span className="font-semibold text-neutral-dark">
                      {selectedKycDetail.applicant_gender || selectedKycDetail.onboarding_data?.profile?.gender || (selectedKycDetail.user?.profile as any)?.gender || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Tanggal Lahir:</span>
                    <span className="font-semibold text-neutral-dark">
                      {selectedKycDetail.applicant_birth_date ? String(selectedKycDetail.applicant_birth_date).split("T")[0] : selectedKycDetail.onboarding_data?.profile?.birth_date ? String(selectedKycDetail.onboarding_data.profile.birth_date).split("T")[0] : "-"}
                    </span>
                  </div>
                </div>

                {/* Foto Profil Preview Tahap 1 */}
                {(selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path || selectedKycDetail.onboarding_data?.profile?.photo_path) && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={() => {
                          const src = selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path || selectedKycDetail.onboarding_data?.profile?.photo_path;
                          setImageLightbox({
                            src,
                            title: "Foto Profil Staf",
                            subtitle: selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || "Staf Internal",
                          });
                        }}
                        className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 cursor-pointer hover:opacity-90 transition"
                        title="Klik untuk memperbesar"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path || selectedKycDetail.onboarding_data?.profile?.photo_path}
                          alt="Foto Profil"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-neutral-dark block">Foto Profil Staf</span>
                        <span className="text-[10px] text-slate-400">Diunggah saat pengisian profil tahap 1</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const src = selectedKycDetail.applicant_photo || selectedKycDetail.user?.profile?.photo_path || selectedKycDetail.onboarding_data?.profile?.photo_path;
                        setImageLightbox({
                          src,
                          title: "Foto Profil Staf",
                          subtitle: selectedKycDetail.applicant_name || selectedKycDetail.user?.profile?.full_name || "Staf Internal",
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowsOutSimple size={13} weight="bold" />
                      <span>Buka Foto Profil</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Point 2: Pengecekan Berkas (NIK & e-KTP) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                    <IdentificationCard size={15} className="text-primary" />
                    Tahap 2: Pengecekan Berkas (NIK &amp; e-KTP)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Telah Diunggah
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nomor Induk Kependudukan (NIK):</span>
                    <span className="font-mono font-bold text-neutral-dark text-sm tracking-wider">
                      {selectedKycDetail.nik_masked || selectedKycDetail.onboarding_data?.berkas?.nik_masked || "3171************"}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Terenkripsi server-side AES-256</span>
                  </div>

                  {/* Documents List & Preview */}
                  {selectedKycDetail.documents && selectedKycDetail.documents.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Berkas Fisik e-KTP Terunggah ({selectedKycDetail.documents.length} dokumen):
                      </span>
                      {selectedKycDetail.documents.map((doc: any) => (
                        <div key={doc.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText size={18} className="text-primary shrink-0" />
                              <div>
                                <span className="font-bold text-neutral-dark block">{doc.type || "KTP Staf"}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {doc.mime || "image/jpeg"} • {doc.size_bytes ? `${Math.round(doc.size_bytes / 1024)} KB` : "Dokumen"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setImageLightbox({
                                    src: `${doc.download_url}?inline=true`,
                                    title: doc.type || "Dokumen Asli e-KTP",
                                    subtitle: `ID Verifikasi: ${selectedKycDetail.id} • ${selectedKycDetail.applicant_name || "Staf"}`,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowsOutSimple size={12} weight="bold" />
                                <span>Perbesar</span>
                              </button>
                              <a
                                href={doc.download_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-1"
                              >
                                <Eye size={12} />
                                <span>Buka / Unduh</span>
                              </a>
                            </div>
                          </div>

                          {/* Image preview */}
                          {doc.download_url && (
                            <div
                              onClick={() =>
                                setImageLightbox({
                                  src: `${doc.download_url}?inline=true`,
                                  title: doc.type || "Dokumen Asli e-KTP",
                                  subtitle: `ID Verifikasi: ${selectedKycDetail.id} • ${selectedKycDetail.applicant_name || "Staf"}`,
                                })
                              }
                              className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1 flex justify-center cursor-pointer hover:border-purple-300 hover:shadow-sm transition"
                              title="Klik untuk memperbesar dokumen e-KTP"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`${doc.download_url}?inline=true`}
                                alt="Pratinjau e-KTP"
                                className="max-h-52 object-contain rounded-lg bg-white"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 italic">
                      Dokumen e-KTP tersimpan dalam berkas verifikasi identitas resmi.
                    </div>
                  )}
                </div>
              </div>

              {/* Point 3: Perjanjian Kerahasiaan (NDA) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" />
                    Tahap 3: Perjanjian Kerahasiaan Informasi (NDA)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Disetujui Digital
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Versi Dokumen:</span>
                    <span className="font-mono font-bold text-neutral-dark">
                      {selectedKycDetail.onboarding_data?.nda?.version || "NDA-SERVIO-v2026.1"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Status Penandatanganan:</span>
                    <span className="text-emerald-700 font-bold">
                      Telah Disetujui Secara Mengikat
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                  Staf menyetujui kewajiban perlindungan rahasia data pengguna, mitra, transaksi, dan algoritma sistem SERVIO sesuai UU PDP dan UU ITE.
                </p>
              </div>

              {/* Point 4: Konfirmasi Hak Akses Sistem */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-dark uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-primary" />
                    Tahap 4: Konfirmasi Hak Akses Sistem
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Dikonfirmasi Staf
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Role &amp; Otoritas:</span>
                    <span className="font-bold text-primary">
                      {selectedKycDetail.applicant_role_name || selectedKycDetail.applicant_role || "ADMIN_OPERATIONS"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Departemen:</span>
                    <span className="font-semibold text-neutral-dark">
                      {selectedKycDetail.applicant_department || "Operasional"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Prinsip Akses:</span>
                    <span className="text-slate-700 font-medium">Least-Privilege Scoped</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Decisions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedKycDetail(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup Detail
              </button>

              {(selectedKycDetail.status === "PENDING" || selectedKycDetail.status === "PENDING_REVIEW") && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedKycDetail;
                      setSelectedKycDetail(null);
                      setDecisionModal({
                        id: item.id,
                        name: item.applicant_name || item.user?.profile?.full_name || item.user?.email,
                        email: item.applicant_email || item.user?.email,
                        action: "REQUEST_REVISION",
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                  >
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedKycDetail;
                      setSelectedKycDetail(null);
                      setDecisionModal({
                        id: item.id,
                        name: item.applicant_name || item.user?.profile?.full_name || item.user?.email,
                        email: item.applicant_email || item.user?.email,
                        action: "REJECT",
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedKycDetail;
                      setSelectedKycDetail(null);
                      setDecisionModal({
                        id: item.id,
                        name: item.applicant_name || item.user?.profile?.full_name || item.user?.email,
                        email: item.applicant_email || item.user?.email,
                        action: "APPROVE",
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-servio-xs transition cursor-pointer"
                  >
                    Setujui Pengajuan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal for Photos and KTP */}
      {imageLightbox && (
        <div
          className="fixed inset-0 bg-neutral-dark/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setImageLightbox(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200/80 space-y-4 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  {imageLightbox.title}
                </h3>
                {imageLightbox.subtitle && (
                  <p className="text-xs text-neutral-slate mt-0.5">
                    {imageLightbox.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={imageLightbox.src}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Buka gambar di tab baru"
                >
                  <Eye size={14} weight="bold" />
                  <span>Tab Baru</span>
                </a>
                <button
                  type="button"
                  onClick={() => setImageLightbox(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            {/* Lightbox Image View */}
            <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-950/5 rounded-2xl p-2 border border-slate-200 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageLightbox.src}
                alt={imageLightbox.title}
                className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-sm"
              />
            </div>

            {/* Lightbox Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-400">
                Dokumen resmi terverifikasi sistem SERVIO
              </span>
              <button
                type="button"
                onClick={() => setImageLightbox(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-dark font-semibold transition cursor-pointer"
              >
                Tutup Pratinjau
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
