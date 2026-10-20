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
  X,
  Phone,
  EnvelopeSimple,
  MapPin,
  Briefcase,
  IdentificationCard,
  Storefront,
  Wrench,
  Package,
} from "@phosphor-icons/react";

export default function AdminRegistrationApplicationsPage() {
  const [applications, setApplications] = useState<RegistrationApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Review Modal state (Requested: Tinjau berubah jadi modal lengkap)
  const [detailModalApp, setDetailModalApp] = useState<RegistrationApplicationData | null>(null);

  // Decision & Confirmation Modal state
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT" | "REQUEST_REVISION" | "DELETE" | null>(null);
  const [modalTargetApp, setModalTargetApp] = useState<RegistrationApplicationData | null>(null);
  const [selectedRevisionDocs, setSelectedRevisionDocs] = useState<string[]>([]);
  const [modalNote, setModalNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "warning" | "info" } | null>(null);

  // Main 3 Tabs State: Pendaftaran Mitra Baru | Mitra Aktif | Permohonan Perubahan Legalitas
  const [activeMainTab, setActiveMainTab] = useState<"NEW_REGISTRATIONS" | "ACTIVE_PARTNERS" | "CHANGE_REQUESTS">("NEW_REGISTRATIONS");
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
      const filters: { status?: string; search?: string; applicantType?: string } = {};

      if (activeMainTab === "ACTIVE_PARTNERS") {
        filters.status = "APPROVED";
      } else if (filterStatus !== "ALL") {
        filters.status = filterStatus;
      }

      if (filterRole !== "ALL") {
        filters.applicantType = filterRole;
      }

      if (search.trim()) {
        filters.search = search.trim();
      }

      const res = await opsApi.getApplications(filters);
      if (res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
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
    if (activeMainTab === "CHANGE_REQUESTS") {
      fetchChangeRequests();
    } else {
      fetchApplications();
    }
  }, [filterStatus, filterRole, activeMainTab]);

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
        if (detailModalApp?.id === modalTargetApp.id) {
          setDetailModalApp(null);
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
          setDetailModalApp(res.data);
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

  // Filtered views
  const newRegistrationsList = applications.filter((app) => app.status !== "APPROVED");
  const activePartnersList = applications.filter((app) => app.status === "APPROVED");
  const displayedList = activeMainTab === "ACTIVE_PARTNERS" ? activePartnersList : newRegistrationsList;

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
            Tinjau legalitas dan dokumen mitra Provider Jasa, Merchant, dan Supplier B2B secara real-time dari database.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeMainTab === "CHANGE_REQUESTS") {
              fetchChangeRequests();
            } else {
              fetchApplications();
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-neutral-dark transition cursor-pointer shadow-servio-xs"
        >
          {(loading || loadingCR) ? <SpinnerGap size={14} className="animate-spin" /> : null}
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* 3 Main Tabs: Pendaftaran Mitra Baru | Mitra Aktif | Perubahan Legalitas */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto">
        {/* Tab 1: Pendaftaran Mitra Baru */}
        <button
          type="button"
          id="tab-new-registrations-btn"
          onClick={() => setActiveMainTab("NEW_REGISTRATIONS")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeMainTab === "NEW_REGISTRATIONS"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-slate hover:text-neutral-dark"
          }`}
        >
          <FileText size={18} />
          <span>Pendaftaran Mitra Baru</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-neutral-dark font-medium">
            {newRegistrationsList.length}
          </span>
        </button>

        {/* Tab 2: Mitra Aktif */}
        <button
          type="button"
          id="tab-active-partners-btn"
          onClick={() => setActiveMainTab("ACTIVE_PARTNERS")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
            activeMainTab === "ACTIVE_PARTNERS"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-slate hover:text-neutral-dark"
          }`}
        >
          <CheckCircle size={18} weight="fill" className="text-emerald-600" />
          <span>Mitra Aktif</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-bold">
            {activePartnersList.length}
          </span>
        </button>

        {/* Tab 3: Perubahan Legalitas (NIB / NPWP) */}
        <button
          type="button"
          id="tab-change-requests-btn"
          onClick={() => setActiveMainTab("CHANGE_REQUESTS")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
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

      {/* TAB CONTENT 3: Permohonan Perubahan Legalitas */}
      {activeMainTab === "CHANGE_REQUESTS" ? (
        <div className="space-y-6" id="change-requests-panel">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-3">
            <ShieldCheck size={20} className="text-sky-600 shrink-0 mt-0.5" weight="fill" />
            <div>
              <p className="font-bold text-sky-950">Apa fungsi tab Permohonan Perubahan Legalitas?</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Fitur ini mencatat permintaan pembaruan dokumen resmi (seperti perubahan nama PT, pembaruan NIB OSS masa berlaku, atau format NPWP 16-digit baru) dari <strong>mitra yang telah aktif beroperasi bertahun-tahun</strong>. Sesuai prinsip kepatuhan hukum, data legalitas inti tidak boleh diubah sembarangan oleh pengguna tanpa persetujuan Admin & Operations.
              </p>
            </div>
          </div>

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
                    <p>Mitra bisnis aktif yang mengajukan perubahan NIB, NPWP, atau nama badan usaha akan tampil di sini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="change-requests-table">
                      <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-neutral-slate uppercase tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">ID Permohonan</th>
                          <th className="py-3.5 px-4">Waktu Pengajuan</th>
                          <th className="py-3.5 px-4">Mitra / Organisasi</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-neutral-dark">
                        {changeRequests.map((cr) => (
                          <tr key={cr.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-mono font-bold text-primary">{cr.id}</td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">{formatDateTime(cr.created_at || cr.createdAt)}</td>
                            <td className="py-3.5 px-4 font-bold">{cr.organization?.profile?.display_name || cr.organization_id || "Mitra Aktif"}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                cr.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                cr.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}>
                                {cr.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedCR(cr)}
                                className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover transition cursor-pointer"
                              >
                                Tinjau
                              </button>
                            </td>
                          </tr>
                        ))}
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
                    className="text-neutral-slate hover:text-neutral-dark text-xs font-semibold cursor-pointer"
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
                          rows={2}
                          value={crDecisionReason}
                          onChange={(e) => setCrDecisionReason(e.target.value)}
                          placeholder="Masukkan alasan verifikasi atau penolakan..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={crActionLoading}
                          onClick={() => handleDecisionCR(selectedCR.id, "REJECT")}
                          className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                        >
                          Tolak Perubahan
                        </button>
                        <button
                          type="button"
                          disabled={crActionLoading}
                          onClick={() => handleDecisionCR(selectedCR.id, "APPROVE")}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
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
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filter Status (Only active in Tab 1) */}
              {activeMainTab === "NEW_REGISTRATIONS" && (
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: "ALL", label: "Semua Status" },
                    { id: "UNDER_REVIEW", label: "Menunggu Review" },
                    { id: "REVISION_REQUIRED", label: "Revisi Diminta" },
                    { id: "REJECTED", label: "Ditolak" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setFilterStatus(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        filterStatus === s.id
                          ? "bg-primary text-white shadow-servio-xs"
                          : "bg-slate-50 text-neutral-slate hover:bg-slate-100 hover:text-neutral-dark"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filter Jenis Mitra */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-neutral-dark focus:outline-none focus:border-primary"
              >
                <option value="ALL">Semua Jenis Mitra</option>
                <option value="SERVICE_PROVIDER">Provider Jasa</option>
                <option value="MERCHANT">Merchant / Retail</option>
                <option value="SUPPLIER">Supplier B2B</option>
              </select>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-80">
              <div className="relative flex-1">
                <MagnifyingGlass size={16} className="absolute left-3 top-2.5 text-neutral-slate" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari No. Reg / Nama / HP / Email..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-neutral-dark focus:outline-none focus:border-primary focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-neutral-dark transition cursor-pointer"
              >
                Cari
              </button>
            </form>
          </div>

          {/* Full-width Responsive Table */}
          <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
                <SpinnerGap size={20} className="animate-spin text-primary" />
                <span>Memuat data pendaftaran mitra dari database...</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-slate space-y-1">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" weight="duotone" />
                <p className="font-semibold text-neutral-dark">
                  {activeMainTab === "ACTIVE_PARTNERS" ? "Belum ada mitra yang disetujui / aktif" : "Belum ada permohonan pendaftaran baru"}
                </p>
                <p>Data pendaftaran resmi dari formulir pendaftaran mitra akan muncul di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" id="applications-table">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-neutral-slate uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap">No. Registrasi</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Waktu Pendaftaran</th>
                      <th className="py-3.5 px-4">Nama Usaha / Mitra</th>
                      <th className="py-3.5 px-4">Penanggung Jawab (PIC)</th>
                      <th className="py-3.5 px-4">Jenis Mitra</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Dokumen</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-neutral-dark">
                    {displayedList.map((app) => (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50/80 transition"
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
                          <span className="font-bold block text-neutral-dark">
                            {app.businessData?.brandName || app.businessData?.legalName || "Mitra Baru"}
                          </span>
                          <span className="text-[11px] text-neutral-slate block">
                            {app.businessData?.legalName ? `Legal: ${app.businessData.legalName}` : "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold block text-neutral-dark">
                            {app.picData?.fullName || app.user?.fullName || "-"}
                          </span>
                          <span className="text-[11px] text-neutral-slate font-mono block">
                            {app.picData?.phone || app.user?.phone || app.picData?.email || app.user?.email || "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            app.applicantType === "SERVICE_PROVIDER"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : app.applicantType === "MERCHANT"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}>
                            {app.applicantType === "SERVICE_PROVIDER" ? (
                              <><Wrench size={12} weight="fill" /> Provider Jasa</>
                            ) : app.applicantType === "MERCHANT" ? (
                              <><Storefront size={12} weight="fill" /> Merchant</>
                            ) : (
                              <><Package size={12} weight="fill" /> Supplier B2B</>
                            )}
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
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                            {app.documents?.length || 0} berkas
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalApp(app)}
                              className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-servio-xs transition cursor-pointer"
                            >
                              Tinjau
                            </button>
                            <button
                              type="button"
                              disabled={app.status === "REVISION_REQUIRED"}
                              onClick={() => handleOpenActionModal("DELETE", app)}
                              className={`p-1.5 rounded-xl border transition ${
                                app.status === "REVISION_REQUIRED"
                                  ? "border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-50"
                                  : "border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                              }`}
                              title={app.status === "REVISION_REQUIRED" ? "Tidak dapat dihapus saat dalam proses revisi mitra" : "Hapus Akun & Pendaftaran"}
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* =========================================================================
          MODAL DETAIL LENGKAP PENDAFTARAN MITRA (Permintaan User: Ubah Jadi Modal)
          ========================================================================= */}
      {detailModalApp && (
        <div className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/70">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-base font-bold text-primary px-2.5 py-0.5 rounded-lg bg-sky-50 border border-sky-200">
                    {detailModalApp.registrationNumber}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    detailModalApp.applicantType === "SERVICE_PROVIDER"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : detailModalApp.applicantType === "MERCHANT"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-teal-50 text-teal-700 border-teal-200"
                  }`}>
                    {detailModalApp.applicantType === "SERVICE_PROVIDER" ? "Provider Jasa" : detailModalApp.applicantType === "MERCHANT" ? "Merchant" : "Supplier B2B"}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    detailModalApp.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : detailModalApp.status === "REVISION_REQUIRED"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : detailModalApp.status === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {detailModalApp.status === "APPROVED" ? (
                      <><CheckCircle size={13} weight="fill" /> Disetujui (Approved)</>
                    ) : detailModalApp.status === "REVISION_REQUIRED" ? (
                      <><WarningCircle size={13} weight="fill" /> Perlu Revisi Dokumen</>
                    ) : detailModalApp.status === "REJECTED" ? (
                      <><XCircle size={13} weight="fill" /> Ditolak (Rejected)</>
                    ) : (
                      <><Clock size={13} weight="fill" /> Menunggu Review Admin</>
                    )}
                  </span>
                </div>
                <h2 className="text-lg font-bold font-display text-neutral-dark">
                  {detailModalApp.businessData?.brandName || detailModalApp.businessData?.legalName || "Nama Usaha Mitra"}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-neutral-slate font-mono">
                  <CalendarBlank size={14} className="text-primary" />
                  <span>Waktu Terdaftar: {formatDateTime(detailModalApp.createdAt)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalApp(null)}
                className="p-2 rounded-xl text-neutral-slate hover:text-neutral-dark hover:bg-slate-200 transition cursor-pointer"
                title="Tutup Modal"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Modal Body: Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-dark">
              {/* Section 1: Data PIC & Akun */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-dark border-b border-slate-100 pb-1.5">
                  <User size={16} className="text-primary" weight="bold" />
                  <span>01. Data Penanggung Jawab (PIC) & Akun Pengguna</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nama Lengkap PIC</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.picData?.fullName || detailModalApp.user?.fullName || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nomor Induk Kependudukan (NIK)</span>
                    <span className="font-bold text-neutral-dark font-mono block text-sm">
                      {detailModalApp.picData?.nik || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Jabatan / Posisi</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.picData?.position || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nomor Telepon / WhatsApp</span>
                    <span className="font-bold text-neutral-dark font-mono block text-sm">
                      {detailModalApp.picData?.phone || detailModalApp.user?.phone || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 sm:col-span-2">
                    <span className="text-[11px] text-neutral-slate block font-medium">Alamat Email Resmi (Terverifikasi Brevo)</span>
                    <span className="font-bold text-neutral-dark font-mono block text-sm">
                      {detailModalApp.picData?.email || detailModalApp.user?.email || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Data Legalitas Usaha & Perusahaan */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-dark border-b border-slate-100 pb-1.5">
                  <Buildings size={16} className="text-primary" weight="bold" />
                  <span>02. Data Legalitas Usaha & Perusahaan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nama Legal Entitas Usaha</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.businessData?.legalName || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nama Merek / Toko / Bengkel</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.businessData?.brandName || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Bentuk Badan Usaha</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.businessData?.businessType || "Perseorangan"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Nomor Induk Berusaha (NIB)</span>
                    <span className="font-bold text-neutral-dark font-mono block text-sm">
                      {detailModalApp.businessData?.nib || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">NPWP Badan / Usaha</span>
                    <span className="font-bold text-neutral-dark font-mono block text-sm">
                      {detailModalApp.businessData?.npwp || "-"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] text-neutral-slate block font-medium">Kota & Provinsi</span>
                    <span className="font-bold text-neutral-dark block text-sm">
                      {detailModalApp.businessData?.city || "-"}, {detailModalApp.businessData?.province || "-"}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 sm:col-span-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-slate block font-medium">Alamat Lengkap Operasional Usaha</span>
                      {Boolean((detailModalApp.businessData as any)?.address_json || (detailModalApp.businessData as any)?.addressData) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                          Data Wilayah Terstruktur (Emsifa API)
                        </span>
                      )}
                    </div>
                    {(() => {
                      const addrObj = (detailModalApp.businessData as any)?.address_json || (detailModalApp.businessData as any)?.addressData;
                      if (addrObj && typeof addrObj === "object") {
                        return (
                          <div className="space-y-1.5 text-xs">
                            <p className="font-semibold text-neutral-dark text-sm leading-relaxed">
                              {addrObj.street_address || detailModalApp.businessData?.address || "-"}
                            </p>
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              {addrObj.rt_rw && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                                  RT/RW: {addrObj.rt_rw}
                                </span>
                              )}
                              {addrObj.village_name && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                                  Kel. {addrObj.village_name}
                                </span>
                              )}
                              {addrObj.district_name && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                                  Kec. {addrObj.district_name}
                                </span>
                              )}
                              {addrObj.city_name && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                                  {addrObj.city_name}
                                </span>
                              )}
                              {addrObj.province_name && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-medium">
                                  {addrObj.province_name}
                                </span>
                              )}
                              {addrObj.postal_code && (
                                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                                  Kode Pos: {addrObj.postal_code}
                                </span>
                              )}
                            </div>
                            {addrObj.landmark && (
                              <p className="text-slate-600 text-xs italic pt-0.5">
                                <span className="font-semibold not-italic text-slate-700">Patokan / Landmark:</span> {addrObj.landmark}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span className="font-medium text-neutral-dark block text-sm leading-relaxed">
                          {detailModalApp.businessData?.address || "-"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Section 3: Data Spesialisasi / Bidang Jasa */}
              {Boolean(detailModalApp.specializedData) && (() => {
                const spec = detailModalApp.specializedData as Record<string, any>;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-dark border-b border-slate-100 pb-1.5">
                      <Briefcase size={16} className="text-primary" weight="bold" />
                      <span>03. Spesialisasi Layanan / Bidang Usaha</span>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      {Boolean(spec.services) && (
                        <div>
                          <span className="text-[11px] text-neutral-slate font-medium block">Layanan Spesialisasi:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Array.isArray(spec.services)
                              ? spec.services.map((srv: string, idx: number) => (
                                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-neutral-dark font-semibold text-xs">
                                    {srv}
                                  </span>
                                ))
                              : String(spec.services)}
                          </div>
                        </div>
                      )}
                      {Boolean(spec.operationalHours) && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-[11px] text-neutral-slate font-medium block">Jam Operasional:</span>
                          <span className="font-semibold text-neutral-dark">{String(spec.operationalHours)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Section 4: Berkas Dokumen Lengkap & Link Download */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-neutral-dark">
                    <FileText size={16} className="text-primary" weight="bold" />
                    <span>04. Berkas Dokumen Pendukung & Legalitas</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 font-bold text-slate-700">
                    {detailModalApp.documents?.length || 0} Berkas Terunggah
                  </span>
                </div>

                {(!detailModalApp.documents || detailModalApp.documents.length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-neutral-slate">
                    Tidak ada berkas fisik yang dilampirkan pada pendaftaran ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailModalApp.documents.map((doc) => {
                      const downloadUrl = doc.filePath || `/api/v1/registration-applications/${detailModalApp.id}/documents/${doc.id}/download`;
                      const isDocEmptyOrMissing = Boolean((doc as any).is_empty || (doc as any).is_deleted_for_revision || !doc.id || doc.id.startsWith("rev-"));
                      const isDocWaitingApplicantUpload =
                        detailModalApp.status === "REVISION_REQUIRED" && isDocEmptyOrMissing;

                      const isNewlyUploadedRevision =
                        (detailModalApp.status === "PENDING_REVIEW" || detailModalApp.status === "UNDER_REVIEW") &&
                        ((detailModalApp.revisionDocTypes || []).includes(doc.documentType) ||
                          ((detailModalApp as any).requiredChanges || []).includes(doc.documentType));

                      return (
                        <div
                          key={doc.id || doc.documentType}
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 shadow-servio-xs transition ${
                            isDocWaitingApplicantUpload
                              ? "bg-rose-50/40 border-rose-300"
                              : isNewlyUploadedRevision
                              ? "bg-amber-50/60 border-amber-300"
                              : "bg-white border-slate-200/90 hover:border-primary/40"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-neutral-dark text-xs block">
                                {doc.documentType} {doc.version ? `(v${doc.version})` : ""}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                                isDocWaitingApplicantUpload
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : isNewlyUploadedRevision
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : doc.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                {isDocWaitingApplicantUpload ? (
                                  <>
                                    <WarningCircle size={12} weight="fill" className="text-rose-600" />
                                    <span>MENUNGGU UPLOAD ULANG</span>
                                  </>
                                ) : isNewlyUploadedRevision ? (
                                  <>
                                    <Clock size={12} weight="fill" className="text-amber-600" />
                                    <span>REVISI BARU (MENUNGGU REVIEW)</span>
                                  </>
                                ) : doc.status === "APPROVED" ? (
                                  <>
                                    <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                                    <span>APPROVED</span>
                                  </>
                                ) : (
                                  <span>PENDING</span>
                                )}
                              </span>
                            </div>

                            {isDocWaitingApplicantUpload ? (
                              <span className="text-[11px] text-rose-700 font-medium italic block">
                                Berkas telah diminta revisi — Menunggu mitra mengunggah berkas pengganti
                              </span>
                            ) : isNewlyUploadedRevision ? (
                              <span className="text-[11px] text-amber-800 font-medium block">
                                Berkas pengganti baru telah diunggah mitra: <strong className="font-mono">{doc.fileName || doc.documentType}</strong>
                              </span>
                            ) : (
                              <span className="text-[11px] text-neutral-slate block truncate font-mono">
                                {doc.fileName || doc.documentType}
                              </span>
                            )}

                            {doc.fileSize && !isDocEmptyOrMissing ? (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Ukuran: {Math.round(doc.fileSize / 1024)} KB
                              </span>
                            ) : null}
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-slate">
                              {isDocWaitingApplicantUpload
                                ? "Status: Belum Diunggah Ulang"
                                : isNewlyUploadedRevision
                                ? "Status: Menunggu Peninjauan Ulang"
                                : doc.uploadedAt
                                ? `Diunggah: ${formatDateTime(doc.uploadedAt)}`
                                : "Dokumen Sah"}
                            </span>

                            {isDocEmptyOrMissing ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-xs cursor-not-allowed">
                                Berkas Kosong
                              </span>
                            ) : (
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-semibold text-xs transition cursor-pointer"
                              >
                                <span>Buka Dokumen</span>
                                <ArrowSquareOut size={13} weight="bold" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 5: Catatan Riwayat Verifikasi Terakhir */}
              {detailModalApp.reviewNote && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <WarningCircle size={16} className="text-amber-600" weight="fill" />
                    <span>Catatan Tim Verifikator Terakhir:</span>
                  </div>
                  <p className="text-amber-900 leading-relaxed font-medium">
                    "{detailModalApp.reviewNote}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer: Action Buttons */}
            {(() => {
              const isUnderRevision = detailModalApp.status === "REVISION_REQUIRED";

              return (
                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/70 flex flex-col gap-3">
                  {isUnderRevision && (
                    <div className="w-full bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-3 text-xs flex items-center gap-2.5">
                      <WarningCircle size={20} className="text-amber-600 shrink-0" weight="fill" />
                      <div className="leading-relaxed">
                        <strong className="block text-amber-950 font-bold">Status Pendaftaran: PERLU REVISI DOKUMEN</strong>
                        <span>Tombol tindakan (Setujui, Tolak, Minta Revisi, Hapus) dinonaktifkan sementara sampai mitra selesai mengunggah dan mengirim berkas revisi baru.</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isUnderRevision}
                      onClick={() => handleOpenActionModal("DELETE", detailModalApp)}
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                        isUnderRevision
                          ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                          : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                      }`}
                      title={isUnderRevision ? "Tidak dapat dihapus saat dalam proses revisi mitra" : "Hapus Akun & Data"}
                    >
                      <Trash size={15} />
                      <span>Hapus Akun &amp; Data</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setDetailModalApp(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-100 transition cursor-pointer"
                      >
                        Tutup
                      </button>

                      {detailModalApp.status !== "APPROVED" && detailModalApp.status !== "REJECTED" && (
                        <>
                          <button
                            type="button"
                            disabled={isUnderRevision}
                            onClick={() => handleOpenActionModal("REJECT", detailModalApp)}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                              isUnderRevision
                                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                : "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                            }`}
                            title={isUnderRevision ? "Tombol dinonaktifkan saat menunggu revisi mitra" : "Tolak pendaftaran"}
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            disabled={isUnderRevision}
                            onClick={() => handleOpenActionModal("REQUEST_REVISION", detailModalApp)}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
                              isUnderRevision
                                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                : "border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 cursor-pointer"
                            }`}
                            title={isUnderRevision ? "Pendaftaran sudah dalam status revisi" : "Minta revisi dokumen"}
                          >
                            Minta Revisi
                          </button>
                          <button
                            type="button"
                            disabled={isUnderRevision}
                            onClick={() => handleOpenActionModal("APPROVE", detailModalApp)}
                            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                              isUnderRevision
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-servio-xs cursor-pointer"
                            }`}
                            title={isUnderRevision ? "Tidak dapat menyetujui dokumen yang masih direvisi" : "Setujui pendaftaran"}
                          >
                            <CheckCircle size={16} weight="fill" />
                            <span>Setujui (Approve)</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL KONFIRMASI TINDAKAN (APPROVE, REJECT, REQUEST REVISION, DELETE)
          ========================================================================= */}
      {modalTargetApp && modalAction && (
        <div className="fixed inset-0 bg-neutral-dark/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  <li>Seluruh dokumen ({modalTargetApp.documents?.length || 0} berkas) otomatis <strong>DISETUJUI (APPROVED)</strong> sekaligus.</li>
                  <li>Status pendaftaran di database berubah menjadi <strong className="font-semibold text-emerald-800">APPROVED</strong>.</li>
                  <li>Organisasi usaha dibuat di database, status akun pendaftar menjadi <strong className="font-semibold text-emerald-800">ACTIVE</strong> dengan peran resmi mitra.</li>
                </ul>
              )}
              {modalAction === "REJECT" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Status pendaftaran di database berubah menjadi <strong className="font-semibold text-rose-800">REJECTED</strong>.</li>
                  <li>Alasan penolakan akan tersimpan di database dan tampil saat mitra mengecek status pendaftaran.</li>
                </ul>
              )}
              {modalAction === "REQUEST_REVISION" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Status pendaftaran berubah menjadi <strong className="font-semibold text-amber-800">REVISION_REQUIRED</strong>.</li>
                  <li>Pilih berkas mana saja yang perlu direvisi di bawah. Mitra dapat mengunggah dokumen baru melalui menu pantau status.</li>
                </ul>
              )}
              {modalAction === "DELETE" && (
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Data pendaftaran (<code className="font-mono">business_applications</code>) dihapus permanen.</li>
                  <li>Seluruh dokumen fisik dan akun pendaftar yang belum aktif dibersihkan dari database.</li>
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
                </div>
              );
            })()}

            {/* Note textarea */}
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
                      : "Contoh: Mohon unggah ulang foto KTP yang lebih jelas dan NPWP sesuai NIB."
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
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteModalAction}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 shadow-servio-xs cursor-pointer ${
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
    </div>
  );
}
