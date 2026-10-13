"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Percent,
  Receipt,
  ArrowsClockwise,
  Clock,
  Handshake,
  UserCheck,
  Sparkle,
  Eye,
  CalendarBlank,
  WarningCircle,
  FileText,
} from "@phosphor-icons/react";
import {
  platformPolicyApi,
  PlatformPolicyVersion,
  PlatformPolicyConfiguration,
} from "@/lib/servioApi";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type FinanceTab = "active" | "scheduled" | "history";

export default function FinancePlatformPoliciesPage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("active");

  const [activePolicy, setActivePolicy] = useState<PlatformPolicyVersion | null>(null);
  const [scheduledPolicy, setScheduledPolicy] = useState<PlatformPolicyVersion | null>(null);
  const [history, setHistory] = useState<PlatformPolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Snapshot Inspection Modal
  const [inspectingVersion, setInspectingVersion] = useState<PlatformPolicyVersion | null>(null);

  const loadAllPolicyData = async () => {
    try {
      setLoading(true);
      const [activeRes, schedRes, histRes] = await Promise.all([
        platformPolicyApi.getPlatformPolicy(),
        platformPolicyApi.getScheduledPlatformPolicy().catch(() => ({ data: null })),
        platformPolicyApi.getPlatformPolicyHistory().catch(() => ({ data: [] })),
      ]);

      if (activeRes.data) {
        setActivePolicy(activeRes.data as any);
      }
      setScheduledPolicy(schedRes.data as any);
      setHistory((histRes.data || []) as any);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data kebijakan platform.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPolicyData();
  }, []);

  const currentConfig: PlatformPolicyConfiguration = activePolicy?.configuration || {
    applicationFee: { calculationType: "FIXED_AMOUNT", value: 5000, currency: "IDR" },
    affiliateFee: { calculationType: "PERCENTAGE", value: 5, basis: "ELIGIBLE_PRODUCT_SUBTOTAL" },
    providerReward: { calculationType: "PERCENTAGE", value: 60 },
    workerReward: { calculationType: "PERCENTAGE", value: 40 },
    tax: { enabled: false, status: "NOT_USED", taxType: "PPN", calculationType: "PERCENTAGE", rate: null, taxBasis: "SERVICE_PRICE" },
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <PageHeader
        title="Kebijakan Platform (Read-Only)"
        description="Portal operasional Finance untuk memantau kebijakan platform aktif, jadwal penerapan mendatang, dan riwayat audit kebijakan yang ditetapkan oleh CEO."
        breadcrumbs={[
          { label: "Finance Ops", href: "/finance/dashboard" },
          { label: "Kebijakan Platform" },
        ]}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WarningCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-medium text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-400/80 hover:text-rose-300 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Kebijakan Aktif</span>
            <Badge variant={activeTab === "active" ? "neutral" : "success"} className="text-[10px] ml-1">
              {activePolicy?.version || "v1"}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "scheduled"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarBlank className="w-4 h-4 text-white" />
            <span>Akan Berlaku</span>
            {scheduledPolicy && (
              <Badge variant="primary" className="text-[10px] ml-1">
                1
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4 text-white" />
            <span>Riwayat Penerapan</span>
            <Badge variant="neutral" className="text-[10px] ml-1">
              {history.length}
            </Badge>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAllPolicyData}
          disabled={loading}
          className="border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <ArrowsClockwise className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* =========================================================================
          TAB 1: KEBIJAKAN AKTIF (READ-ONLY)
          ========================================================================= */}
      {activeTab === "active" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-900 font-heading">Kebijakan Platform Aktif</h3>
                  <Badge variant="success" className="text-xs">
                    {activePolicy?.version || "v1"} • AKTIF
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Berlaku sejak:{" "}
                  <span className="text-slate-700 font-medium">
                    {activePolicy?.effectiveFrom
                      ? new Date(activePolicy.effectiveFrom).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>{" "}
                  • Ditetapkan oleh CEO:{" "}
                  <span className="text-slate-700 font-medium">{activePolicy?.appliedBy || "Michael Surya (CEO)"}</span>
                </p>
              </div>
            </div>

            {/* 5 Core Policy Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
              {/* 1. Application Fee */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                  <span>Biaya Aplikasi</span>
                  <Receipt className="w-4 h-4 text-[#0F4C81]" />
                </div>
                <div className="text-xl font-bold text-slate-900 font-heading">
                  {currentConfig.applicationFee.calculationType === "FIXED_AMOUNT"
                    ? `Rp ${currentConfig.applicationFee.value.toLocaleString("id-ID")}`
                    : `${currentConfig.applicationFee.value}%`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Per transaksi pemesanan</div>
              </div>

              {/* 2. Affiliate Fee */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                  <span>Komisi Afiliasi</span>
                  <Percent className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 font-heading">{currentConfig.affiliateFee.value}%</div>
                <div className="text-[11px] text-slate-400 mt-1">Basis: Subtotal suku cadang</div>
              </div>

              {/* 3. Provider Reward */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                  <span>Reward Mitra</span>
                  <Handshake className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 font-heading">{currentConfig.providerReward.value}%</div>
                <div className="text-[11px] text-slate-400 mt-1">Bagi hasil komisi afiliasi</div>
              </div>

              {/* 4. Worker Reward */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                  <span>Reward Teknisi</span>
                  <UserCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 font-heading">{currentConfig.workerReward.value}%</div>
                <div className="text-[11px] text-slate-400 mt-1">Bagi hasil komisi afiliasi</div>
              </div>

              {/* 5. Tax */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1.5">
                  <span>Pajak (PPN)</span>
                  <Sparkle className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-bold text-slate-900 font-heading">
                  {currentConfig.tax.status === "USED" && currentConfig.tax.rate !== null ? (
                    `${currentConfig.tax.rate}%`
                  ) : (
                    <span className="text-slate-400 text-base font-medium">NOT_USED (—)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {currentConfig.tax.status === "USED" ? "PPN Aktif • Basis: Layanan" : "Belum diaktifkan"}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                <span className="text-slate-400">Alasan Kebijakan:</span>{" "}
                <span className="text-slate-700 font-medium">{activePolicy?.changeReason || "—"}</span>
              </div>
              {activePolicy?.notes && (
                <div>
                  <span className="text-slate-400">Catatan:</span>{" "}
                  <span className="text-slate-700 font-medium">{activePolicy.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: AKAN BERLAKU (SCHEDULED - READ-ONLY)
          ========================================================================= */}
      {activeTab === "scheduled" && (
        <div className="space-y-6">
          {scheduledPolicy ? (
            <div className="bg-white border border-sky-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant="primary" className="text-xs">
                      {scheduledPolicy.version} • TERJADWAL
                    </Badge>
                    <span className="text-base font-bold text-slate-900">
                      Akan Berlaku: {new Date(scheduledPolicy.effectiveFrom).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Diterapkan oleh CEO:{" "}
                    <span className="text-slate-700 font-medium">
                      {scheduledPolicy.appliedBy || "Michael Surya (CEO)"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Grid Values */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px]">Biaya Aplikasi</span>
                  <span className="font-bold text-slate-900">
                    {scheduledPolicy.configuration.applicationFee.calculationType === "FIXED_AMOUNT"
                      ? `Rp ${scheduledPolicy.configuration.applicationFee.value.toLocaleString("id-ID")}`
                      : `${scheduledPolicy.configuration.applicationFee.value}%`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px]">Komisi Afiliasi</span>
                  <span className="font-bold text-slate-900">
                    {scheduledPolicy.configuration.affiliateFee.value}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px]">Reward Mitra</span>
                  <span className="font-bold text-slate-900">
                    {scheduledPolicy.configuration.providerReward.value}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px]">Reward Teknisi</span>
                  <span className="font-bold text-slate-900">
                    {scheduledPolicy.configuration.workerReward.value}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[11px]">Pajak (PPN)</span>
                  <span className="font-bold text-slate-900">
                    {scheduledPolicy.configuration.tax.status === "USED"
                      ? `${scheduledPolicy.configuration.tax.rate}%`
                      : "NOT_USED (—)"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 border-t border-slate-100 pt-3">
                <span className="text-slate-400">Alasan Perubahan:</span>{" "}
                <span className="text-slate-800 font-medium">{scheduledPolicy.changeReason}</span>
                {scheduledPolicy.notes && (
                  <span className="ml-3">
                    • <span className="text-slate-400">Catatan:</span>{" "}
                    <span className="text-slate-800">{scheduledPolicy.notes}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 text-slate-500 text-xs">
              <CalendarBlank className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              Tidak ada perubahan kebijakan yang sedang dijadwalkan oleh CEO saat ini.
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: RIWAYAT PENERAPAN (HISTORY - READ-ONLY)
          ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-heading">Riwayat Penerapan Kebijakan Platform</h3>
            <p className="text-xs text-slate-500">
              Log audit kronologis seluruh versi kebijakan platform lengkap dengan rincian parameter tarif, jadwal, alasan, dan pelaksana.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left min-w-[900px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Versi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tanggal Efektif</th>
                  <th className="p-3">Biaya Aplikasi</th>
                  <th className="p-3">Komisi Afiliasi</th>
                  <th className="p-3">Split Reward</th>
                  <th className="p-3">Pajak PPN</th>
                  <th className="p-3">Alasan & Catatan Perubahan</th>
                  <th className="p-3">Diterapkan Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {history.map((item) => {
                  const cfg = item.configuration;
                  return (
                    <tr key={item.id || item.version} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{item.version}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            item.status === "ACTIVE"
                              ? "success"
                              : item.status === "SCHEDULED"
                              ? "primary"
                              : item.status === "SUPERSEDED"
                              ? "neutral"
                              : "danger"
                          }
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {item.effectiveFrom
                          ? new Date(item.effectiveFrom).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {cfg?.applicationFee?.calculationType === "FIXED_AMOUNT"
                          ? `Rp ${cfg?.applicationFee?.value.toLocaleString("id-ID")}`
                          : `${cfg?.applicationFee?.value}%`}
                      </td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {cfg?.affiliateFee?.value}%
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        Mitra {cfg?.providerReward?.value}% / Tek {cfg?.workerReward?.value}%
                      </td>
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        {cfg?.tax?.status === "USED" && cfg?.tax?.rate !== null ? `${cfg?.tax?.rate}%` : "NOT_USED (—)"}
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-slate-900">{item.changeReason || "—"}</div>
                        {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{item.appliedBy || "Michael Surya (CEO)"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
