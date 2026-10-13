"use client";

import React, { useState, useEffect } from "react";
import { opsApi, RegistrationApplicationData } from "@/lib/servioApi";
import {
  ChartLineUp,
  Clock,
  CheckCircle,
  WarningCircle,
  XCircle,
  FileText,
  Buildings,
  User,
  SpinnerGap,
  MagnifyingGlass,
  Eye,
  ShieldCheck,
  CalendarBlank,
} from "@phosphor-icons/react";

export default function CeoBusinessOnboardingPage() {
  const [stats, setStats] = useState({
    totalApplications: 0,
    underReview: 0,
    approved: 0,
    revisionRequired: 0,
    rejected: 0,
  });
  const [applications, setApplications] = useState<RegistrationApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<RegistrationApplicationData | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, appsRes] = await Promise.all([
        opsApi.getCeoMonitoringStats(),
        opsApi.getApplications(),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (appsRes.data) {
        // Enforce newest created at the top
        const sorted = [...appsRes.data].sort((a, b) => {
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

  useEffect(() => {
    fetchData();
  }, []);

  const filteredApps = applications.filter((app) => {
    if (filterType === "ALL") return true;
    return app.applicantType === filterType;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 px-3 py-1 rounded-full bg-purple-50 border border-purple-200">
            Eksekutif & Monitoring
          </span>
          <h1 className="text-2xl font-bold font-display text-neutral-dark mt-2">
            Monitoring Onboarding Bisnis (CEO View)
          </h1>
          <p className="text-xs text-neutral-slate mt-0.5">
            Pengawasan alur pendaftaran mitra (Read-Only) sesuai Section 14. Otoritas persetujuan dipegang oleh Tim Operasi.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-neutral-dark transition"
        >
          {loading ? <SpinnerGap size={14} className="animate-spin" /> : null}
          <span>Refresh Metrik</span>
        </button>
      </div>

      {/* KPI Stat Cards (Section 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-servio-xs space-y-1">
          <span className="text-[11px] font-semibold text-neutral-slate uppercase tracking-wider">
            Total Aplikasi
          </span>
          <div className="text-2xl font-bold font-display text-neutral-dark">
            {stats.totalApplications}
          </div>
          <span className="text-[10px] text-neutral-muted">Kumulatif seluruh mitra</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-servio-xs space-y-1">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock size={14} weight="fill" className="text-amber-500" />
            Under Review
          </span>
          <div className="text-2xl font-bold font-display text-amber-900">
            {stats.underReview}
          </div>
          <span className="text-[10px] text-amber-700">Dalam antrean verifikasi</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-servio-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle size={14} weight="fill" className="text-emerald-500" />
            Approved
          </span>
          <div className="text-2xl font-bold font-display text-emerald-900">
            {stats.approved}
          </div>
          <span className="text-[10px] text-emerald-700">Mitra aktif terverifikasi</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-servio-xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <WarningCircle size={14} weight="fill" className="text-rose-500" />
            Revision
          </span>
          <div className="text-2xl font-bold font-display text-rose-900">
            {stats.revisionRequired}
          </div>
          <span className="text-[10px] text-rose-700">Menunggu perbaikan mitra</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-servio-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <XCircle size={14} weight="fill" className="text-slate-400" />
            Rejected
          </span>
          <div className="text-2xl font-bold font-display text-slate-800">
            {stats.rejected}
          </div>
          <span className="text-[10px] text-slate-500">Aplikasi tidak memenuhi syarat</span>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {["ALL", "SERVICE_PROVIDER", "MERCHANT", "SUPPLIER"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterType === type
                    ? "bg-neutral-dark text-white"
                    : "bg-slate-50 text-neutral-slate hover:bg-slate-100"
                }`}
              >
                {type === "ALL" && "Semua Mitra"}
                {type === "SERVICE_PROVIDER" && "Provider Jasa"}
                {type === "MERCHANT" && "Merchant"}
                {type === "SUPPLIER" && "Supplier B2B"}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-slate font-medium">
            Menampilkan {filteredApps.length} pendaftaran
          </span>
        </div>

        {/* Table (Section 14) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-neutral-slate uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-3 whitespace-nowrap">ID Registrasi</th>
                <th className="py-3 px-3 whitespace-nowrap">Waktu Pendaftaran</th>
                <th className="py-3 px-3">Nama Bisnis / Usaha</th>
                <th className="py-3 px-3">Tipe Mitra</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 whitespace-nowrap">Diajukan Pada</th>
                <th className="py-3 px-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-mono font-bold text-primary whitespace-nowrap">
                    {app.registrationNumber}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-neutral-dark font-medium font-mono text-[11px]">
                      <CalendarBlank size={13} className="text-purple-600 shrink-0" />
                      <span>{formatDateTime(app.createdAt)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold block text-neutral-dark">
                      {app.businessData?.brandName || app.businessData?.legalName || "Nama Mitra"}
                    </span>
                    <span className="text-[11px] text-neutral-slate">
                      {app.businessData?.legalName} ({app.businessData?.businessType})
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {app.applicantType === "SERVICE_PROVIDER" ? "Provider" : app.applicantType === "MERCHANT" ? "Merchant" : "Supplier"}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      app.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      app.status === "REVISION_REQUIRED" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      app.status === "REJECTED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-neutral-slate whitespace-nowrap">
                    {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-primary text-[11px] font-semibold text-primary transition"
                    >
                      <Eye size={14} />
                      <span>Lihat</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CEO Read-Only Detail Modal (Section 14) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-neutral-dark/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-servio-xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-sm font-bold text-primary">
                  {selectedApp.registrationNumber}
                </span>
                <h3 className="text-base font-bold text-neutral-dark mt-0.5">
                  {selectedApp.businessData?.brandName || selectedApp.businessData?.legalName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-xs font-semibold text-neutral-slate hover:text-neutral-dark p-1"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p><strong>Waktu Pendaftaran:</strong> <span className="font-mono font-semibold">{formatDateTime(selectedApp.createdAt)}</span></p>
                <p><strong>Jenis Mitra:</strong> {selectedApp.applicantType}</p>
                <p><strong>Status Pendaftaran:</strong> <span className="font-bold text-primary">{selectedApp.status}</span></p>
                <p><strong>PIC:</strong> {selectedApp.picData?.fullName || selectedApp.user?.fullName} ({selectedApp.picData?.phone})</p>
                <p><strong>NIB:</strong> {selectedApp.businessData?.nib || "-"}</p>
                <p><strong>Alamat:</strong> {selectedApp.businessData?.address}, {selectedApp.businessData?.city}</p>
              </div>

              {selectedApp.reviewedBy && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                  <p><strong>Verifikator:</strong> {selectedApp.reviewedBy}</p>
                  <p><strong>Waktu Review:</strong> {selectedApp.reviewedAt ? new Date(selectedApp.reviewedAt).toLocaleString("id-ID") : "-"}</p>
                  {selectedApp.reviewNote && <p><strong>Catatan Review:</strong> {selectedApp.reviewNote}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="font-bold text-neutral-dark block">Daftar Dokumen:</span>
                <div className="space-y-1">
                  {selectedApp.documents?.map((d) => (
                    <div key={d.id} className="p-2 rounded-lg border border-slate-200 bg-white flex justify-between">
                      <span className="truncate">{d.documentType} (v{d.version})</span>
                      <span className="font-bold text-slate-700">{d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-neutral-slate">
              <span className="flex items-center gap-1">
                <ShieldCheck size={14} className="text-purple-600" weight="fill" />
                Mode Pengawasan CEO (Read-Only)
              </span>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-neutral-dark transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
