"use client";

import React, { useState, useEffect } from "react";
import { opsApi, RegistrationApplicationData } from "@/lib/servioApi";
import { Toast } from "@/components/feedback/Toast";
import {
  FileText,
  CheckCircle,
  WarningCircle,
  XCircle,
  Clock,
  Buildings,
  User,
  ArrowRight,
  SpinnerGap,
  MagnifyingGlass,
  ArrowSquareOut,
  ShieldCheck,
  Trash,
  CalendarBlank,
  ArrowLeft,
} from "@phosphor-icons/react";

export default function AdminRegistrationApplicationsPage() {
  const [applications, setApplications] = useState<RegistrationApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<RegistrationApplicationData | null>(null);

  // Review & Confirmation Modal state
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION" | "DELETE" | null>(null);
  const [modalTargetApp, setModalTargetApp] = useState<RegistrationApplicationData | null>(null);
  const [selectedRevisionDocs, setSelectedRevisionDocs] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  // Main Tab State (New Registrations vs Sensitive Change Requests)
  const [activeMainTab, setActiveMainTab] = useState<"NEW_REGISTRATIONS" | "CHANGE_REQUESTS">("NEW_REGISTRATIONS");
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [loadingCR, setLoadingCR] = useState(false);
  const [selectedCR, setSelectedCR] = useState<any | null>(null);
  const [crDecisionReason, setCrDecisionReason] = useState("");
  const [crActionLoading, setCrActionLoading] = useState(false);

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const filters: { status?: string; search?: string } = {};
      if (filterStatus !== "ALL") filters.status = filterStatus;
      if (search) filters.search = search;
      const res = await opsApi.getApplications(filters);
      if (res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
        // Enforce newest created at the very top (descending order)
        const sorted = [...rawList].sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        setApplications(sorted);
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    setLoadingCR(true);
    try {
      const res = await opsApi.adminListChangeRequests();
      if (res.data) {
        setChangeRequests(Array.isArray(res.data) ? res.data : (res.data as any).items || []);
      }
    } catch {
      // safe fallback
    } finally {
      setLoadingCR(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchChangeRequests();
  }, [filterStatus]);

  const handleDecisionCR = async (id: string, decision: "APPROVE" | "REJECT") => {
    if (decision === "REJECT" && !crDecisionReason.trim()) {
      setToast({ message: "Alasan penolakan perubahan legalitas wajib diisi.", type: "warning" });
      return;
    }
    setCrActionLoading(true);
    try {
      await opsApi.adminDecisionChangeRequest(id, decision, crDecisionReason.trim() || undefined);
      setToast({
        message: `Permohonan perubahan data legalitas #${id} berhasil di-${decision === "APPROVE" ? "setujui" : "tolak"}. Data profil mitra otomatis diperbarui.`,
        type: "success",
      });
      setCrDecisionReason("");
      setSelectedCR(null);
      await fetchChangeRequests();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({ message: error.message || "Gagal memproses permohonan perubahan.", type: "error" });
    } finally {
      setCrActionLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  const handleSelectApp = (app: RegistrationApplicationData) => {
    setSelectedApp(app);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById("inspection-detail-panel")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  const handleOpenActionModal = (
    action: "APPROVE" | "REJECT" | "REQUEST_REVISION" | "DELETE",
    app: RegistrationApplicationData
  ) => {
    setModalAction(action);
    setModalTargetApp(app);
    setModalNote(action === "DELETE" ? "" : reviewNote);
    setSelectedRevisionDocs([]);
    setModalError(null);
  };

  const handleExecuteModalAction = async () => {
    if (!modalTargetApp || !modalAction) return;

    if (modalAction === "REQUEST_REVISION") {
      if (selectedRevisionDocs.length === 0) {
        setModalError("Pilih minimal 1 dokumen yang perlu diperbaiki / diunggah ulang oleh mitra.");
        return;
      }
      if (!modalNote.trim()) {
        setModalError("Catatan perbaikan dokumen wajib diisi agar mitra tahu apa yang perlu direvisi.");
        return;
      }
    }

    if (modalAction === "REJECT" && !modalNote.trim()) {
      setModalError("Alasan penolakan pendaftaran wajib diisi.");
      return;
    }

    setActionLoading(true);
    setModalError(null);

    try {
      if (modalAction === "DELETE") {
        await opsApi.deleteApplication(modalTargetApp.id);
        if (selectedApp?.id === modalTargetApp.id) {
          setSelectedApp(null);
        }
        await fetchApplications();
        setToast({
          message: `Pendaftaran #${modalTargetApp.registrationNumber} dan seluruh akun terkait berhasil dihapus permanen dari database.`,
          type: "success",
        });
      } else {
        const res = await opsApi.reviewApplication(
          modalTargetApp.id,
          modalAction,
          modalNote.trim() || undefined,
          modalAction === "REQUEST_REVISION" ? selectedRevisionDocs : undefined
        );
        if (res.data) {
          setSelectedApp(res.data);
        }
        setReviewNote("");
        await fetchApplications();

        if (modalAction === "APPROVE") {
          setToast({
            message: `Pendaftaran #${modalTargetApp.registrationNumber} & seluruh dokumen berhasil disetujui (APPROVED)! Akun Mitra: ACTIVE.`,
            type: "success",
          });
        } else if (modalAction === "REJECT") {
          setToast({
            message: `Pendaftaran #${modalTargetApp.registrationNumber} & seluruh dokumen telah ditolak (REJECTED).`,
            type: "warning",
          });
        } else if (modalAction === "REQUEST_REVISION") {
          setToast({
            message: `Permintaan revisi (${selectedRevisionDocs.length} berkas) terkirim ke mitra #${modalTargetApp.registrationNumber}. Status: REVISION_REQUIRED.`,
            type: "info",
          });
        }
      }
      setModalTargetApp(null);
      setModalAction(null);
      setSelectedRevisionDocs([]);
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setModalError(error.message || "Gagal memproses permohonan.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewDoc = async (docId: string, status: "APPROVED" | "REPLACEMENT_REQUIRED") => {
    if (!selectedApp) return;
    try {
      await opsApi.reviewDocument(selectedApp.id, docId, status);
      const updated = await opsApi.getApplication(selectedApp.id);
      if (updated.data) {
        setSelectedApp(updated.data);
      }
    } catch (err: unknown) {
      const error = err as Error & { message?: string };
      setToast({ message: error.message || "Gagal memperbarui status dokumen.", type: "error" });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-slate hover:text-neutral-dark mb-2 transition cursor-pointer"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Kepatuhan & Operasional
            </span>
          </div>
          <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
            Verifikasi Pendaftaran Mitra Bisnis
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Tinjau legalitas dan dokumen mitra Provider Jasa, Merchant, dan Supplier B2B sesuai Section 15.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeMainTab === "NEW_REGISTRATIONS") {
              fetchApplications();
            } else {
              fetchChangeRequests();
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-neutral-dark transition"
        >
          {(loading || loadingCR) ? <SpinnerGap size={14} className="animate-spin" /> : null}
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          type="button"
          id="tab-new-registrations-btn"
          onClick={() => setActiveMainTab("NEW_REGISTRATIONS")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeMainTab === "NEW_REGISTRATIONS"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-slate hover:text-neutral-dark"
          }`}
        >
          <FileText size={18} />
          <span>Pendaftaran Mitra Baru</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-neutral-dark font-medium">
            {applications.length}
          </span>
        </button>
        <button
          type="button"
          id="tab-change-requests-btn"
          onClick={() => {
            setActiveMainTab("CHANGE_REQUESTS");
            fetchChangeRequests();
          }}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeMainTab === "CHANGE_REQUESTS"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-slate hover:text-neutral-dark"
          }`}
        >
          <ShieldCheck size={18} />
          <span>Permohonan Perubahan Legalitas (NIB / NPWP)</span>
          {changeRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
              {changeRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeMainTab === "CHANGE_REQUESTS" ? (
        <div className="space-y-6" id="change-requests-panel">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className={`${selectedCR ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden">
                {loadingCR ? (
                  <div className="py-16 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
                    <SpinnerGap size={20} className="animate-spin text-primary" />
                    <span>Memuat permohonan perubahan legalitas...</span>
                  </div>
                ) : changeRequests.length === 0 ? (
                  <div className="py-16 text-center text-xs text-neutral-slate space-y-1">
                    <ShieldCheck size={32} className="mx-auto text-slate-300 mb-2" weight="duotone" />
                    <p className="font-semibold text-neutral-dark">Belum ada permohonan perubahan legalitas</p>
                    <p>Mitra bisnis yang mengajukan perubahan NIB, NPWP, atau nama usaha akan tampil di sini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="change-requests-table">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-neutral-slate uppercase tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">ID Permohonan</th>
                          <th className="py-3.5 px-4">Pemohon</th>
                          <th className="py-3.5 px-4">Data Yang Diubah</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-neutral-dark">
                        {changeRequests.map((cr) => {
                          const isSel = selectedCR?.id === cr.id;
                          const st = (cr.status || "PENDING").toUpperCase();
                          return (
                            <tr
                              key={cr.id}
                              onClick={() => setSelectedCR(cr)}
                              className={`cursor-pointer transition-all border-l-4 ${
                                isSel
                                  ? "bg-sky-50/90 border-l-primary shadow-sm"
                                  : "hover:bg-slate-50/80 border-l-transparent"
                              }`}
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-neutral-dark">
                                #{cr.id?.slice(0, 8)}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-neutral-dark">{cr.user_name || cr.userName || cr.email || "Mitra"}</div>
                                <div className="text-[11px] text-neutral-slate">{cr.organization_name || cr.user_email || cr.email}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(cr.fields || cr.requested_fields || {}).map((f) => (
                                    <span key={f} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-neutral-dark font-semibold">
                                      {f.toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  st === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  st === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                  "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {st}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCR(cr);
                                  }}
                                  className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition"
                                >
                                  Tinjau
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {selectedCR && (
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-dark">Detail Pengajuan Perubahan Legalitas</h3>
                    <p className="text-xs text-neutral-slate font-mono">ID: {selectedCR.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCR(null)}
                    className="text-neutral-slate hover:text-neutral-dark text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="text-neutral-slate font-medium">Alasan Pengajuan oleh Mitra:</div>
                    <div className="font-medium text-neutral-dark italic">"{selectedCR.reason || "Tidak ada alasan spesifik"}"</div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-neutral-dark">Data Yang Diminta Perubahan:</div>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                      {Object.entries(selectedCR.fields || selectedCR.requested_fields || {}).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex justify-between items-center border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-mono text-neutral-slate uppercase">{k}:</span>
                          <span className="font-bold text-neutral-dark font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedCR.status === "PENDING" && (
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div>
                        <label className="font-semibold text-neutral-dark block mb-1">
                          Catatan / Alasan (Wajib jika menolak):
                        </label>
                        <textarea
                          id="cr-decision-reason-input"
                          rows={2}
                          value={crDecisionReason}
                          onChange={(e) => setCrDecisionReason(e.target.value)}
                          placeholder="Masukkan alasan verifikasi atau alasan penolakan..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          id="cr-reject-btn"
                          disabled={crActionLoading}
                          onClick={() => handleDecisionCR(selectedCR.id, "REJECT")}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition disabled:opacity-50"
                        >
                          Tolak Perubahan
                        </button>
                        <button
                          type="button"
                          id="cr-approve-btn"
                          disabled={crActionLoading}
                          onClick={() => handleDecisionCR(selectedCR.id, "APPROVE")}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50"
                        >
                          Setujui Perubahan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
      <>
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-servio-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {["ALL", "UNDER_REVIEW", "REVISION_REQUIRED", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === status
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-50 text-neutral-slate hover:bg-slate-100 hover:text-neutral-dark"
              }`}
            >
              {status === "ALL" && "Semua Status"}
              {status === "UNDER_REVIEW" && "Menunggu Review"}
              {status === "REVISION_REQUIRED" && "Revisi Diminta"}
              {status === "APPROVED" && "Disetujui"}
              {status === "REJECTED" && "Ditolak"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-neutral-slate" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No. Reg / Nama Usaha..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-neutral-dark transition"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Grid Layout: Application Table + Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className={`${selectedApp ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
                <SpinnerGap size={20} className="animate-spin text-primary" />
                <span>Memuat data aplikasi pendaftaran...</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-slate space-y-1">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" weight="duotone" />
                <p className="font-semibold text-neutral-dark">Belum ada permohonan pendaftaran</p>
                <p>Data pendaftaran baru dari formulir publik akan tampil di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" id="applications-table">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-neutral-slate uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap">No. Registrasi</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Waktu Pendaftaran</th>
                      <th className="py-3.5 px-4">Nama Usaha / Mitra</th>
                      <th className="py-3.5 px-4">Jenis Mitra</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Dokumen</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-neutral-dark">
                    {applications.map((app) => {
                      const isSelected = selectedApp?.id === app.id;
                      return (
                        <tr
                          key={app.id}
                          onClick={() => handleSelectApp(app)}
                          className={`cursor-pointer transition-all border-l-4 ${
                            isSelected
                              ? "bg-sky-50/90 border-l-primary shadow-sm ring-1 ring-primary/25"
                              : "hover:bg-slate-50/80 border-l-transparent"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                            {app.registrationNumber}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-neutral-dark font-medium font-mono text-[11px]">
                              <CalendarBlank size={13} className="text-primary shrink-0" />
                              <span>{formatDateTime(app.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold block">
                              {app.businessData?.brandName || app.businessData?.legalName || "Mitra Baru"}
                            </span>
                            <span className="text-[11px] text-neutral-slate">
                              PIC: {app.picData?.fullName || app.user?.fullName || "-"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                              {app.applicantType === "SERVICE_PROVIDER" ? "Provider Jasa" : app.applicantType === "MERCHANT" ? "Merchant" : "Supplier"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {app.status === "APPROVED" ? (
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={14} weight="fill" /> Approved
                              </span>
                            ) : app.status === "REVISION_REQUIRED" ? (
                              <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                                <WarningCircle size={14} weight="fill" /> Revisi
                              </span>
                            ) : app.status === "REJECTED" ? (
                              <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                                <XCircle size={14} weight="fill" /> Rejected
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                                <Clock size={14} weight="fill" /> Review
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                            {app.documents?.length || 0} berkas
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleSelectApp(app)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                                  isSelected
                                    ? "border-primary bg-primary text-white shadow-servio-xs"
                                    : "border-slate-200 hover:border-primary hover:bg-sky/10 text-primary"
                                }`}
                              >
                                {isSelected ? "Sedang Ditinjau" : "Tinjau"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal("DELETE", app)}
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition"
                                title="Hapus Akun & Pendaftaran"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Inspection Detail Column (Section 15) */}
        {selectedApp && (
          <div
            id="inspection-detail-panel"
            className="lg:col-span-5 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto space-y-4 pr-1 scrollbar-thin"
          >
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-servio-md space-y-5 animate-fadeIn">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-primary">
                      {selectedApp.registrationNumber}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {selectedApp.applicantType}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-dark mt-1">
                    {selectedApp.businessData?.brandName || selectedApp.businessData?.legalName}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenActionModal("DELETE", selectedApp)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                    title="Hapus Akun / Pendaftaran"
                  >
                    <Trash size={13} />
                    <span>Hapus Akun</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark p-1 ml-1"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Status & Reviewers */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-slate">Waktu Pendaftaran:</span>
                  <span className="font-semibold text-neutral-dark font-mono text-[11px]">
                    {formatDateTime(selectedApp.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-slate">Status Aplikasi:</span>
                  <span className="font-bold text-neutral-dark">{selectedApp.status}</span>
                </div>
                {selectedApp.reviewedBy && (
                  <div className="flex justify-between">
                    <span className="text-neutral-slate">Ditinjau oleh:</span>
                    <span className="font-semibold text-neutral-dark">{selectedApp.reviewedBy}</span>
                  </div>
                )}
                {selectedApp.reviewNote && (
                  <div className="pt-1.5 border-t border-slate-200/60 text-amber-800">
                    <span className="font-semibold block text-[11px]">Catatan Terakhir:</span>
                    <p className="text-[11px]">{selectedApp.reviewNote}</p>
                  </div>
                )}
              </div>

              {/* PIC Info */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-neutral-dark flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <User size={14} className="text-primary" /> Penanggung Jawab (PIC)
                </span>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-neutral-slate">
                  <p><strong className="text-neutral-dark">Nama:</strong> {selectedApp.picData?.fullName || selectedApp.user?.fullName}</p>
                  <p><strong className="text-neutral-dark">NIK:</strong> {selectedApp.picData?.nik || "-"}</p>
                  <p><strong className="text-neutral-dark">Jabatan:</strong> {selectedApp.picData?.position || "-"}</p>
                  <p><strong className="text-neutral-dark">HP / Email:</strong> {selectedApp.picData?.phone || selectedApp.user?.phone} • {selectedApp.picData?.email || selectedApp.user?.email}</p>
                </div>
              </div>

              {/* Business Data */}
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-neutral-dark flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Buildings size={14} className="text-primary" /> Data Legal Usaha
                </span>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-neutral-slate">
                  <p><strong className="text-neutral-dark">Nama Legal:</strong> {selectedApp.businessData?.legalName} ({selectedApp.businessData?.businessType})</p>
                  <p><strong className="text-neutral-dark">NIB:</strong> {selectedApp.businessData?.nib || "-"}</p>
                  <p><strong className="text-neutral-dark">NPWP:</strong> {selectedApp.businessData?.npwp || "-"}</p>
                  <p><strong className="text-neutral-dark">Alamat:</strong> {selectedApp.businessData?.address}, {selectedApp.businessData?.city}, {selectedApp.businessData?.province}</p>
                </div>
              </div>

              {/* Documents Checklist */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-neutral-dark flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <FileText size={14} className="text-primary" /> Berkas Dokumen Terbaru
                </span>

                {selectedApp.status === "REVISION_REQUIRED" && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Clock size={16} className="text-amber-600 shrink-0" weight="fill" />
                    <span className="font-medium text-[11px]">
                      Menunggu pengguna mengupload dokumen revisi yang diminta...
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Deduplicate documents to show only the latest version per documentType */}
                  {(() => {
                    const docMap = new Map<string, NonNullable<typeof selectedApp.documents>[0]>();
                    (selectedApp.documents || []).forEach((d) => {
                      const cur = docMap.get(d.documentType);
                      if (!cur || (d.version || 1) >= (cur.version || 1)) {
                        docMap.set(d.documentType, d);
                      }
                    });
                    const latestDocs = Array.from(docMap.values());

                    return latestDocs.map((doc) => {
                      const isWaitingUpload = selectedApp.status === "REVISION_REQUIRED" && doc.status === "REPLACEMENT_REQUIRED";

                      return (
                        <div
                          key={doc.id}
                          className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-servio-xs"
                        >
                          <div className="truncate">
                            <span className="font-bold block text-neutral-dark text-xs">
                              {doc.documentType} {doc.version ? `(v${doc.version})` : ""}
                            </span>
                            <span className="text-[11px] text-neutral-slate truncate block">
                              {isWaitingUpload ? "Menunggu unggahan berkas baru dari mitra" : doc.fileName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {doc.filePath && !isWaitingUpload ? (
                              <a
                                href={`http://127.0.0.1:8000${doc.filePath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 hover:border-primary text-primary transition"
                                title="Buka Dokumen"
                              >
                                <ArrowSquareOut size={14} />
                              </a>
                            ) : null}

                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                doc.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : doc.status === "REPLACEMENT_REQUIRED"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {doc.status === "APPROVED"
                                ? "APPROVED"
                                : doc.status === "REPLACEMENT_REQUIRED"
                                ? "PERLU REVISI"
                                : "PENDING REVIEW"}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Status Notice */}
              {selectedApp.status === "APPROVED" && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                  <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <p className="font-bold text-sm text-emerald-900">Pendaftaran Bisnis Telah Disetujui</p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Mitra telah aktif secara operasional dengan hak akses penuh ke ekosistem SERVIO.
                    </p>
                  </div>
                </div>
              )}

              {selectedApp.status === "REJECTED" && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
                  <XCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <p className="font-bold text-sm text-rose-900">Pendaftaran Bisnis Ditolak</p>
                    <p className="text-[11px] text-rose-700 mt-1">
                      Alasan penolakan: {selectedApp.reviewNote || "Tidak memenuhi kualifikasi mitra SERVIO."}
                    </p>
                  </div>
                </div>
              )}

              {selectedApp.status === "REVISION_REQUIRED" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <WarningCircle size={20} className="text-amber-600 shrink-0 mt-0.5" weight="fill" />
                  <div>
                    <p className="font-bold text-sm text-amber-900">Permintaan Revisi Telah Dikirim</p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Catatan verifikator: {selectedApp.reviewNote || "-"}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons: Only show if application is NOT yet finalized (NOT APPROVED and NOT REJECTED) */}
              {selectedApp.status !== "APPROVED" && selectedApp.status !== "REJECTED" && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="text-[11px] font-bold text-neutral-dark uppercase tracking-wider block">
                    Keputusan Verifikasi Operasional
                  </span>

                  {/* Review Note input */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-slate font-semibold block">
                      Catatan Review Verifikator <span className="text-rose-500">*wajib jika Tolak / Revisi</span>:
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Tuliskan keterangan perbaikan berkas atau alasan penolakan..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleOpenActionModal("REJECT", selectedApp)}
                      className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <XCircle size={14} weight="fill" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleOpenActionModal("REQUEST_REVISION", selectedApp)}
                      className="py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <WarningCircle size={14} weight="fill" />
                      <span>Minta Revisi</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleOpenActionModal("APPROVE", selectedApp)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-servio-xs cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                    >
                      <CheckCircle size={14} weight="fill" />
                      <span>Setujui</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Tindakan (Approve, Reject, Request Revision, Delete) */}
      {modalTargetApp && modalAction && (
        <div className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-servio-xl space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  modalAction === "APPROVE"
                    ? "bg-emerald-100 text-emerald-600"
                    : modalAction === "REJECT"
                    ? "bg-rose-100 text-rose-600"
                    : modalAction === "REQUEST_REVISION"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {modalAction === "APPROVE" ? (
                  <CheckCircle size={28} weight="fill" />
                ) : modalAction === "REJECT" ? (
                  <XCircle size={28} weight="fill" />
                ) : modalAction === "REQUEST_REVISION" ? (
                  <WarningCircle size={28} weight="fill" />
                ) : (
                  <Trash size={28} weight="fill" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-display text-neutral-dark">
                  {modalAction === "APPROVE"
                    ? "Konfirmasi Persetujuan Kemitraan"
                    : modalAction === "REJECT"
                    ? "Konfirmasi Penolakan Pendaftaran"
                    : modalAction === "REQUEST_REVISION"
                    ? "Konfirmasi Permintaan Revisi Dokumen"
                    : "Konfirmasi Hapus Akun & Data Pendaftaran"}
                </h3>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Mitra:{" "}
                  <strong className="text-neutral-dark">
                    {modalTargetApp.businessData?.brandName || modalTargetApp.businessData?.legalName || "Mitra"}
                  </strong>{" "}
                  ({modalTargetApp.registrationNumber})
                </p>
              </div>
            </div>

            {/* Information Notice Box */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                modalAction === "APPROVE"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                  : modalAction === "REJECT"
                  ? "bg-rose-50/80 border-rose-200 text-rose-950"
                  : modalAction === "REQUEST_REVISION"
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-red-50/80 border-red-200 text-red-950"
              }`}
            >
              <p className="font-bold text-[11px] uppercase tracking-wider">
                {modalAction === "APPROVE"
                  ? "✓ Dampak Persetujuan di Database:"
                  : modalAction === "REJECT"
                  ? "✕ Dampak Penolakan di Database:"
                  : modalAction === "REQUEST_REVISION"
                  ? "⚠ Petunjuk Permintaan Revisi:"
                  : "⚠ Peringatan Penghapusan Permanen:"}
              </p>
              {modalAction === "APPROVE" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Seluruh dokumen ({modalTargetApp.documents?.length || 0} berkas) otomatis <strong>DISETUJUI (APPROVED)</strong> sekaligus. Tidak perlu verifikasi berkas satu per satu.</li>
                  <li>Status pendaftaran di database berubah menjadi <strong className="font-semibold text-emerald-800">APPROVED</strong>.</li>
                  <li>Status akun pengguna menjadi <strong className="font-semibold text-emerald-800">ACTIVE</strong> dan profil bisnis diaktifkan.</li>
                </ul>
              )}
              {modalAction === "REJECT" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Seluruh dokumen ({modalTargetApp.documents?.length || 0} berkas) otomatis <strong>DITOLAK (REJECTED)</strong> semua.</li>
                  <li>Status pendaftaran di database berubah menjadi <strong className="font-semibold text-rose-800">REJECTED</strong>.</li>
                  <li>Akses login ke akun mitra dinonaktifkan secara permanen.</li>
                </ul>
              )}
              {modalAction === "REQUEST_REVISION" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Status pendaftaran berubah menjadi <strong className="font-semibold text-amber-800">REVISION_REQUIRED</strong>.</li>
                  <li>Pilih berkas mana saja yang perlu direvisi di bawah. Dokumen yang tidak dicentang otomatis disetujui (<strong>Approved</strong>).</li>
                </ul>
              )}
              {modalAction === "DELETE" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Data pendaftaran (<code className="font-mono">registration_applications</code>) dihapus permanen.</li>
                  <li>Seluruh berkas dokumen fisik dan verifikasi identitas dimusnahkan.</li>
                  <li>Akun login (<code className="font-mono">users</code>), role assignment, dan sesi aktif dihapus bersih dari database.</li>
                </ul>
              )}
            </div>

            {/* Document Selection Checklist (Only for REQUEST_REVISION) */}
            {modalAction === "REQUEST_REVISION" && (() => {
              const docMap = new Map<string, NonNullable<typeof modalTargetApp.documents>[0]>();
              (modalTargetApp.documents || []).forEach((d) => {
                const cur = docMap.get(d.documentType);
                if (!cur || (d.version || 1) >= (cur.version || 1)) {
                  docMap.set(d.documentType, d);
                }
              });
              const modalDocs = Array.from(docMap.values());

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-dark flex items-center gap-1.5">
                      <span>Pilih Dokumen yang Harus Direvisi:</span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Wajib Pilih Min. 1
                      </span>
                    </label>
                    <div className="flex items-center gap-2 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedRevisionDocs(modalDocs.map((d) => d.documentType))}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRevisionDocs([])}
                        className="text-neutral-slate hover:underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200">
                    {modalDocs.length === 0 ? (
                      <p className="text-xs text-neutral-slate text-center py-4">Tidak ada berkas terlampir.</p>
                    ) : (
                      modalDocs.map((doc) => {
                        const isChecked = selectedRevisionDocs.includes(doc.documentType);
                        return (
                          <label
                            key={doc.id || doc.documentType}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                              isChecked
                                ? "bg-amber-50 border-amber-300 text-amber-950 font-medium shadow-xs"
                                : "bg-white border-slate-200 text-neutral-dark hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate mr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedRevisionDocs(selectedRevisionDocs.filter((t) => t !== doc.documentType));
                                  } else {
                                    setSelectedRevisionDocs([...selectedRevisionDocs, doc.documentType]);
                                  }
                                  if (modalError) setModalError(null);
                                }}
                                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                              />
                              <div className="truncate">
                                <span className="font-bold block text-[11px] text-neutral-dark truncate">
                                  {doc.documentType} {doc.version ? `(v${doc.version})` : ""}
                                </span>
                                <span className="text-[10px] text-neutral-slate truncate block">
                                  {doc.fileName}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isChecked
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isChecked ? "Minta Revisi" : "ACC (Disetujui)"}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-slate">
                    * Dokumen yang dicentang akan berstatus <strong>Perlu Penggantian</strong>. Dokumen yang tidak dicentang otomatis disetujui (<strong>Approved</strong>).
                  </p>
                </div>
              );
            })()}

            {/* Note textarea for APPROVE, REJECT, REQUEST_REVISION */}
            {modalAction !== "DELETE" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-dark flex items-center justify-between">
                  <span>
                    {modalAction === "APPROVE"
                      ? "Catatan Persetujuan (Opsional):"
                      : modalAction === "REJECT"
                      ? "Alasan Penolakan:"
                      : "Catatan Instruksi Revisi untuk Mitra:"}
                  </span>
                  {(modalAction === "REJECT" || modalAction === "REQUEST_REVISION") && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Wajib Diisi
                    </span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={modalNote}
                  onChange={(e) => {
                    setModalNote(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder={
                    modalAction === "APPROVE"
                      ? "Contoh: Seluruh berkas legalitas telah lengkap dan diverifikasi."
                      : modalAction === "REJECT"
                      ? "Contoh: Dokumen NIB dan NPWP tidak valid atau tidak terbaca."
                      : "Contoh: Mohon unggah ulang foto KTP yang lebih jelas/tidak buram dan NPWP sesuai NIB."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white resize-none"
                />
              </div>
            )}

            {/* Error Message */}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <WarningCircle size={16} className="shrink-0 text-rose-600" weight="fill" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setModalTargetApp(null);
                  setModalAction(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteModalAction}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 shadow-servio-xs ${
                  modalAction === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : modalAction === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : modalAction === "REQUEST_REVISION"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading && <SpinnerGap size={14} className="animate-spin" />}
                <span>
                  {modalAction === "APPROVE"
                    ? "Ya, Setujui Pendaftaran"
                    : modalAction === "REJECT"
                    ? "Ya, Tolak Pendaftaran"
                    : modalAction === "REQUEST_REVISION"
                    ? "Kirim Permintaan Revisi"
                    : "Hapus Permanen Dari Database"}
                </span>
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
      </>
      )}
    </div>
  );
}
