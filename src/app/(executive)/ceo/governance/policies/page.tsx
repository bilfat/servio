"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Percent,
  Receipt,
  ArrowsClockwise,
  CheckCircle,
  CalendarBlank,
  Info,
  Clock,
  Check,
  Eye,
  MagnifyingGlass,
  ArrowSquareOut,
  Handshake,
  UserCheck,
  Sparkle,
  Sliders,
  WarningCircle,
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

type CeoTab = "active" | "edit" | "scheduled" | "history";

export default function CeoPlatformPoliciesPage() {
  const [activeTab, setActiveTab] = useState<CeoTab>("active");

  const [activePolicy, setActivePolicy] = useState<PlatformPolicyVersion | null>(null);
  const [scheduledPolicy, setScheduledPolicy] = useState<PlatformPolicyVersion | null>(null);
  const [history, setHistory] = useState<PlatformPolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section 2: Edit Form State
  const [changeAppFee, setChangeAppFee] = useState(false);
  const [appFeeType, setAppFeeType] = useState<"FIXED_AMOUNT" | "PERCENTAGE">("FIXED_AMOUNT");
  const [appFeeVal, setAppFeeVal] = useState<number>(5000);

  const [changeAffFee, setChangeAffFee] = useState(false);
  const [affFeeType, setAffFeeType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [affFeeVal, setAffFeeVal] = useState<number>(5);

  const [changeRewards, setChangeRewards] = useState(false);
  const [provRewardVal, setProvRewardVal] = useState<number>(60);
  const [workRewardVal, setWorkRewardVal] = useState<number>(40);

  const [changeTax, setChangeTax] = useState(false);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(11);

  const [effectiveMode, setEffectiveMode] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [changeReason, setChangeReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Preview & Confirm Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

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
        // Pre-fill default form values from current active
        const cur = activeRes.data.configuration;
        setAppFeeType((cur.applicationFee?.calculationType as any) || "FIXED_AMOUNT");
        setAppFeeVal(cur.applicationFee?.value ?? 5000);
        setAffFeeType((cur.affiliateFee?.calculationType as any) || "PERCENTAGE");
        setAffFeeVal(cur.affiliateFee?.value ?? 5);
        setProvRewardVal(cur.providerReward?.value ?? 60);
        setWorkRewardVal(cur.workerReward?.value ?? 40);
        setTaxEnabled(cur.tax?.enabled ?? false);
        setTaxRate(cur.tax?.rate ?? 11);
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

  const handleProviderRewardChange = (val: number) => {
    setProvRewardVal(val);
    setWorkRewardVal(Math.max(0, 100 - val));
  };

  const handleWorkerRewardChange = (val: number) => {
    setWorkRewardVal(val);
    setProvRewardVal(Math.max(0, 100 - val));
  };

  // Build Proposed Configuration Object for Preview
  const currentConfig: PlatformPolicyConfiguration = activePolicy?.configuration || {
    applicationFee: { calculationType: "FIXED_AMOUNT", value: 5000, currency: "IDR" },
    affiliateFee: { calculationType: "PERCENTAGE", value: 5, basis: "ELIGIBLE_PRODUCT_SUBTOTAL" },
    providerReward: { calculationType: "PERCENTAGE", value: 60 },
    workerReward: { calculationType: "PERCENTAGE", value: 40 },
    tax: { enabled: false, status: "NOT_USED", taxType: "PPN", calculationType: "PERCENTAGE", rate: null, taxBasis: "SERVICE_PRICE" },
  };

  const proposedConfig: PlatformPolicyConfiguration = {
    applicationFee: changeAppFee
      ? { calculationType: appFeeType, value: appFeeVal, currency: "IDR" }
      : currentConfig.applicationFee,
    affiliateFee: changeAffFee
      ? { calculationType: affFeeType, value: affFeeVal, basis: "ELIGIBLE_PRODUCT_SUBTOTAL" }
      : currentConfig.affiliateFee,
    providerReward: changeRewards
      ? { calculationType: "PERCENTAGE", value: provRewardVal }
      : currentConfig.providerReward,
    workerReward: changeRewards
      ? { calculationType: "PERCENTAGE", value: workRewardVal }
      : currentConfig.workerReward,
    tax: changeTax
      ? {
          enabled: taxEnabled,
          status: taxEnabled ? "USED" : "NOT_USED",
          taxType: "PPN",
          calculationType: "PERCENTAGE",
          rate: taxEnabled ? taxRate : null,
          taxBasis: "SERVICE_PRICE",
        }
      : currentConfig.tax,
  };

  const hasAnyChanges = changeAppFee || changeAffFee || changeRewards || changeTax;

  const handleOpenPreview = () => {
    if (!hasAnyChanges) {
      setError("Pilih setidaknya satu bidang kebijakan yang ingin diubah.");
      return;
    }
    if (!changeReason.trim()) {
      setError("Alasan perubahan (Change Reason) wajib diisi sebelum melanjutkan.");
      return;
    }
    if (effectiveMode === "SCHEDULED" && !effectiveDate) {
      setError("Pilih tanggal dan waktu berlaku untuk penerapan terjadwal.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleApplyPolicy = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const changesPayload: any = {};
      if (changeAppFee) {
        changesPayload.applicationFee = { calculationType: appFeeType, value: appFeeVal };
      }
      if (changeAffFee) {
        changesPayload.affiliateFee = { calculationType: affFeeType, value: affFeeVal };
      }
      if (changeRewards) {
        changesPayload.providerReward = { value: provRewardVal };
        changesPayload.workerReward = { value: workRewardVal };
      }
      if (changeTax) {
        changesPayload.tax = {
          enabled: taxEnabled,
          status: taxEnabled ? "USED" : "NOT_USED",
          rate: taxEnabled ? taxRate : null,
          taxType: "PPN",
          taxBasis: "SERVICE_PRICE",
        };
      }

      const res = await platformPolicyApi.applyPlatformPolicy({
        effectiveMode,
        effectiveFrom: effectiveMode === "SCHEDULED" ? effectiveDate : undefined,
        changeReason: changeReason.trim(),
        notes: notes.trim() ? notes.trim() : undefined,
        changes: changesPayload,
      });

      setShowConfirmModal(false);
      setSuccessToast(
        effectiveMode === "IMMEDIATE"
          ? `Kebijakan platform ${res.data?.version || ""} berhasil diterapkan dan langsung AKTIF.`
          : `Kebijakan platform ${res.data?.version || ""} berhasil DIJADWALKAN.`
      );

      // Reset form toggles
      setChangeAppFee(false);
      setChangeAffFee(false);
      setChangeRewards(false);
      setChangeTax(false);
      setChangeReason("");
      setNotes("");

      await loadAllPolicyData();
      setActiveTab(effectiveMode === "IMMEDIATE" ? "active" : "scheduled");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menerapkan kebijakan platform.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <PageHeader
        title="Tata Kelola Kebijakan Platform"
        description="Pusat kendali eksekutif CEO untuk menetapkan kebijakan ekonomi terpadu SERVIO (Biaya Aplikasi, Komisi Afiliasi, Reward Mitra/Teknisi, dan Pajak PPN)."
        breadcrumbs={[
          { label: "Dashboard", href: "/ceo/dashboard" },
          { label: "Governance", href: "/ceo/governance/policies" },
          { label: "Kebijakan Platform" },
        ]}
      />

      {/* Toast Alert */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <WarningCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-700 hover:text-rose-950 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-1 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
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
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "edit"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4 text-white" />
            <span>Ubah Kebijakan</span>
          </button>

          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "scheduled"
                ? "bg-[#0F4C81] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarBlank className="w-4 h-4 text-white" />
            <span>Kebijakan Akan Berlaku</span>
            {scheduledPolicy && (
              <Badge variant="primary" className="text-[10px] ml-1">
                1
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
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
          className="self-start sm:self-auto border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <ArrowsClockwise className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      {/* =========================================================================
          TAB 1: KEBIJAKAN AKTIF (ACTIVE POLICY CARD)
          ========================================================================= */}
      {activeTab === "active" && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[#0F4C81]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight font-heading">Kebijakan Platform Aktif</h2>
                  <Badge variant="success" className="px-2.5 py-0.5 text-xs font-semibold">
                    {activePolicy?.version || "v1"} • AKTIF
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
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
                  • Diterapkan oleh:{" "}
                  <span className="text-slate-700 font-medium">{activePolicy?.appliedBy || "Michael Surya (CEO)"}</span>
                </p>
              </div>
            </div>

            <Button
              onClick={() => setActiveTab("edit")}
              className="bg-[#0F4C81] hover:bg-[#0B3860] text-white text-xs font-semibold self-start md:self-auto"
            >
              <Sliders className="w-4 h-4 mr-1.5" />
              Ubah Parameter Kebijakan
            </Button>
          </div>

          {/* Live Active Values Grid */}
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
                <span>Reward Mitra Bengkel</span>
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
                <span>Pajak Platform (PPN)</span>
                <Sparkle className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
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

          {/* Reason footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span className="text-slate-400">Alasan Versi:</span>{" "}
              <span className="text-slate-700 font-medium">{activePolicy?.changeReason || "—"}</span>
            </div>
            {activePolicy?.notes && (
              <div>
                <span className="text-slate-400">Catatan:</span>{" "}
                <span className="text-slate-700 font-medium">{activePolicy.notes}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 2: UBAH KEBIJAKAN (SELECTIVE POLICY EDITOR)
          ========================================================================= */}
      {activeTab === "edit" && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Form Perubahan Kebijakan Platform</h2>
              <p className="text-xs text-slate-500">
                Centang dan ubah bidang ekonomi yang diperlukan. Parameter yang tidak dicentang otomatis mewarisi nilai aktif saat ini.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Application Fee */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                changeAppFee
                  ? "bg-sky-50/40 border-[#0F4C81]/40 shadow-xs"
                  : "bg-slate-50/50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changeAppFee}
                    onChange={(e) => setChangeAppFee(e.target.checked)}
                    className="rounded border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81]"
                  />
                  <span className="text-sm font-semibold text-slate-900">Ubah Biaya Aplikasi</span>
                </label>
                <Badge variant={changeAppFee ? "primary" : "neutral"} className="text-[11px]">
                  {changeAppFee ? "Akan Diubah" : "Mewarisi Nilai"}
                </Badge>
              </div>

              {changeAppFee ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Tipe Perhitungan</label>
                    <select
                      value={appFeeType}
                      onChange={(e) => setAppFeeType(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0F4C81]"
                    >
                      <option value="FIXED_AMOUNT">Nominal Tetap (IDR)</option>
                      <option value="PERCENTAGE">Persentase (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">
                      Nilai {appFeeType === "FIXED_AMOUNT" ? "(Rupiah)" : "(%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={appFeeVal}
                      onChange={(e) => setAppFeeVal(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  Nilai saat ini:{" "}
                  <span className="font-semibold text-slate-800">
                    {currentConfig.applicationFee.calculationType === "FIXED_AMOUNT"
                      ? `Rp ${currentConfig.applicationFee.value.toLocaleString("id-ID")}`
                      : `${currentConfig.applicationFee.value}%`}
                  </span>
                </div>
              )}
            </div>

            {/* Field 2: Affiliate Fee */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                changeAffFee
                  ? "bg-emerald-50/40 border-emerald-500/40 shadow-xs"
                  : "bg-slate-50/50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changeAffFee}
                    onChange={(e) => setChangeAffFee(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">Ubah Komisi Afiliasi</span>
                </label>
                <Badge variant={changeAffFee ? "success" : "neutral"} className="text-[11px]">
                  {changeAffFee ? "Akan Diubah" : "Mewarisi Nilai"}
                </Badge>
              </div>

              {changeAffFee ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Persentase Komisi Platform (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={affFeeVal}
                      onChange={(e) => setAffFeeVal(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Basis perhitungan: Subtotal Suku Cadang yang Terkualifikasi.
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  Nilai saat ini: <span className="font-semibold text-slate-800">{currentConfig.affiliateFee.value}%</span>
                </div>
              )}
            </div>

            {/* Field 3: Provider & Worker Rewards */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                changeRewards
                  ? "bg-indigo-50/40 border-indigo-500/40 shadow-xs"
                  : "bg-slate-50/50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changeRewards}
                    onChange={(e) => setChangeRewards(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">Ubah Pembagian Reward Mitra & Teknisi</span>
                </label>
                <Badge variant={changeRewards ? "secondary" : "neutral"} className="text-[11px]">
                  {changeRewards ? "Akan Diubah" : "Mewarisi Nilai"}
                </Badge>
              </div>

              {changeRewards ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Mitra Bengkel (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={provRewardVal}
                        onChange={(e) => handleProviderRewardChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Teknisi Lapangan (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={workRewardVal}
                        onChange={(e) => handleWorkerRewardChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Total Split:</span>
                    <span className={`font-semibold ${provRewardVal + workRewardVal === 100 ? "text-emerald-600" : "text-rose-600"}`}>
                      {provRewardVal + workRewardVal}% / 100%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  Nilai saat ini:{" "}
                  <span className="font-semibold text-slate-800">
                    Mitra {currentConfig.providerReward.value}% • Teknisi {currentConfig.workerReward.value}%
                  </span>
                </div>
              )}
            </div>

            {/* Field 4: Tax Configuration */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                changeTax
                  ? "bg-purple-50/40 border-purple-500/40 shadow-xs"
                  : "bg-slate-50/50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={changeTax}
                    onChange={(e) => setChangeTax(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">Ubah Kebijakan Pajak (PPN)</span>
                </label>
                <Badge variant={changeTax ? "primary" : "neutral"} className="text-[11px]">
                  {changeTax ? "Akan Diubah" : "Mewarisi Nilai"}
                </Badge>
              </div>

              {changeTax ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="taxStatus"
                        checked={!taxEnabled}
                        onChange={() => setTaxEnabled(false)}
                        className="text-purple-600 border-slate-300 focus:ring-purple-500"
                      />
                      <span>NOT_USED (Nonaktif • Tarif —)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="taxStatus"
                        checked={taxEnabled}
                        onChange={() => setTaxEnabled(true)}
                        className="text-purple-600 border-slate-300 focus:ring-purple-500"
                      />
                      <span>USED (Aktif)</span>
                    </label>
                  </div>

                  {taxEnabled && (
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Tarif Pajak PPN (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  Nilai saat ini:{" "}
                  <span className="font-semibold text-slate-800">
                    {currentConfig.tax.status === "USED" ? `PPN ${currentConfig.tax.rate}%` : "NOT_USED (—)"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Mode & Explanation Container */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Mode Keberlakuan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEffectiveMode("IMMEDIATE")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      effectiveMode === "IMMEDIATE"
                        ? "bg-[#0F4C81] border-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-bold">Terapkan Sekarang</span>
                    <span className={`text-[11px] mt-1 ${effectiveMode === "IMMEDIATE" ? "text-sky-100" : "text-slate-500"}`}>
                      Langsung aktif & menggantikan versi sebelumnya
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEffectiveMode("SCHEDULED")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      effectiveMode === "SCHEDULED"
                        ? "bg-[#0F4C81] border-[#0F4C81] text-white shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-sm font-bold">Jadwalkan</span>
                    <span className={`text-[11px] mt-1 ${effectiveMode === "SCHEDULED" ? "text-sky-100" : "text-slate-500"}`}>
                      Aktif otomatis pada tanggal yang ditentukan
                    </span>
                  </button>
                </div>
              </div>

              {effectiveMode === "SCHEDULED" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal & Waktu Efektif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0F4C81]"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alasan Perubahan (Change Reason) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Contoh: Penyesuaian tarif PPN sesuai regulasi perpajakan Q4 2026..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0F4C81] placeholder-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nomor SK Direksi / Referensi memo internal"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0F4C81] placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-end">
            <Button
              size="lg"
              onClick={handleOpenPreview}
              disabled={!hasAnyChanges}
              className="bg-[#0F4C81] hover:bg-[#0B3860] text-white font-semibold px-6 shadow-xs"
            >
              Tinjau & Konfirmasi Perubahan
            </Button>
          </div>
        </section>
      )}

      {/* =========================================================================
          TAB 3: KEBIJAKAN AKAN BERLAKU (SCHEDULED POLICIES)
          ========================================================================= */}
      {activeTab === "scheduled" && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 text-[#0F4C81]">
              <CalendarBlank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Kebijakan Platform Akan Berlaku (Scheduled)</h2>
              <p className="text-xs text-slate-500">
                Penerapan kebijakan masa depan yang sedang menunggu tanggal dan waktu aktivasi otomatis.
              </p>
            </div>
          </div>

          {scheduledPolicy ? (
            <div className="p-5 rounded-xl bg-sky-50/30 border border-sky-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Badge variant="primary" className="px-2.5 py-0.5 text-xs font-semibold">
                    {scheduledPolicy.version} • TERJADWAL
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">
                    Akan aktif pada:{" "}
                    {new Date(scheduledPolicy.effectiveFrom).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Ditetapkan oleh: <span className="text-slate-700 font-medium">{scheduledPolicy.appliedBy || "Michael Surya (CEO)"}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Biaya Aplikasi</span>
                  <span className="font-semibold text-slate-900">
                    {scheduledPolicy.configuration.applicationFee.calculationType === "FIXED_AMOUNT"
                      ? `Rp ${scheduledPolicy.configuration.applicationFee.value.toLocaleString("id-ID")}`
                      : `${scheduledPolicy.configuration.applicationFee.value}%`}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Komisi Afiliasi</span>
                  <span className="font-semibold text-slate-900">
                    {scheduledPolicy.configuration.affiliateFee.value}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Reward Mitra</span>
                  <span className="font-semibold text-slate-900">
                    {scheduledPolicy.configuration.providerReward.value}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Reward Teknisi</span>
                  <span className="font-semibold text-slate-900">
                    {scheduledPolicy.configuration.workerReward.value}%
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                  <span className="text-slate-400 block text-[10px]">Pajak (PPN)</span>
                  <span className="font-semibold text-slate-900">
                    {scheduledPolicy.configuration.tax.status === "USED"
                      ? `${scheduledPolicy.configuration.tax.rate}%`
                      : "NOT_USED (—)"}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 border-t border-slate-200/60 pt-3">
                <span className="text-slate-400">Alasan:</span>{" "}
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
            <div className="p-12 text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-slate-500 text-xs">
              <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              Tidak ada perubahan kebijakan yang sedang dijadwalkan saat ini.
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 4: RIWAYAT PENERAPAN (POLICY AUDIT HISTORY)
          ========================================================================= */}
      {activeTab === "history" && (
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Riwayat Penerapan Kebijakan Platform</h2>
              <p className="text-xs text-slate-500">
                Log audit kronologis seluruh versi kebijakan platform lengkap dengan rincian parameter tarif, jadwal, alasan, dan pelaksana.
              </p>
            </div>
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
        </section>
      )}

      {/* =========================================================================
          KONFIRMASI & PREVIEW MODAL
          ========================================================================= */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Konfirmasi Penerapan Kebijakan Platform"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-xs text-slate-500">
            Periksa perbandingan antara konfigurasi aktif saat ini dan konfigurasi yang diusulkan. Bidang yang tidak
            diubah secara otomatis mewarisi nilai sebelumnya.
          </p>

          {/* Current vs Proposed Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Bidang Kebijakan</th>
                  <th className="p-3">Nilai Saat Ini (Aktif)</th>
                  <th className="p-3">Nilai Baru (Diusulkan)</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {/* Application Fee */}
                <tr>
                  <td className="p-3 font-medium text-slate-900">Biaya Aplikasi</td>
                  <td className="p-3 text-slate-500">
                    {currentConfig.applicationFee.calculationType === "FIXED_AMOUNT"
                      ? `Rp ${currentConfig.applicationFee.value.toLocaleString("id-ID")}`
                      : `${currentConfig.applicationFee.value}%`}
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    {proposedConfig.applicationFee.calculationType === "FIXED_AMOUNT"
                      ? `Rp ${proposedConfig.applicationFee.value.toLocaleString("id-ID")}`
                      : `${proposedConfig.applicationFee.value}%`}
                  </td>
                  <td className="p-3 text-right">
                    {changeAppFee ? (
                      <Badge variant="primary" className="text-[10px]">Diubah</Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Inherited</span>
                    )}
                  </td>
                </tr>

                {/* Affiliate Fee */}
                <tr>
                  <td className="p-3 font-medium text-slate-900">Komisi Afiliasi</td>
                  <td className="p-3 text-slate-500">{currentConfig.affiliateFee.value}%</td>
                  <td className="p-3 font-semibold text-slate-900">{proposedConfig.affiliateFee.value}%</td>
                  <td className="p-3 text-right">
                    {changeAffFee ? (
                      <Badge variant="success" className="text-[10px]">Diubah</Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Inherited</span>
                    )}
                  </td>
                </tr>

                {/* Provider Reward */}
                <tr>
                  <td className="p-3 font-medium text-slate-900">Reward Mitra Bengkel</td>
                  <td className="p-3 text-slate-500">{currentConfig.providerReward.value}%</td>
                  <td className="p-3 font-semibold text-slate-900">{proposedConfig.providerReward.value}%</td>
                  <td className="p-3 text-right">
                    {changeRewards ? (
                      <Badge variant="secondary" className="text-[10px]">Diubah</Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Inherited</span>
                    )}
                  </td>
                </tr>

                {/* Worker Reward */}
                <tr>
                  <td className="p-3 font-medium text-slate-900">Reward Teknisi</td>
                  <td className="p-3 text-slate-500">{currentConfig.workerReward.value}%</td>
                  <td className="p-3 font-semibold text-slate-900">{proposedConfig.workerReward.value}%</td>
                  <td className="p-3 text-right">
                    {changeRewards ? (
                      <Badge variant="secondary" className="text-[10px]">Diubah</Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Inherited</span>
                    )}
                  </td>
                </tr>

                {/* Tax */}
                <tr>
                  <td className="p-3 font-medium text-slate-900">Pajak PPN</td>
                  <td className="p-3 text-slate-500">
                    {currentConfig.tax.status === "USED" ? `PPN ${currentConfig.tax.rate}%` : "NOT_USED (—)"}
                  </td>
                  <td className="p-3 font-semibold text-slate-900">
                    {proposedConfig.tax.status === "USED" ? `PPN ${proposedConfig.tax.rate}%` : "NOT_USED (—)"}
                  </td>
                  <td className="p-3 text-right">
                    {changeTax ? (
                      <Badge variant="primary" className="text-[10px]">Diubah</Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Inherited</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deployment Info */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Mode Eksekusi:</span>
              <span className="font-semibold text-slate-900">
                {effectiveMode === "IMMEDIATE" ? "Terapkan Sekarang (Langsung Aktif)" : "Terjadwal"}
              </span>
            </div>
            {effectiveMode === "SCHEDULED" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tanggal Efektif:</span>
                <span className="font-semibold text-[#0F4C81]">
                  {new Date(effectiveDate).toLocaleString("id-ID")}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Alasan:</span>
              <span className="font-medium text-slate-800">{changeReason}</span>
            </div>
            {notes && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Catatan:</span>
                <span className="font-medium text-slate-800">{notes}</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Kembali Edit
            </Button>
            <Button
              onClick={handleApplyPolicy}
              disabled={isSubmitting}
              className="bg-[#0F4C81] hover:bg-[#0B3860] text-white font-semibold shadow-xs"
            >
              {isSubmitting ? "Menerapkan..." : "Konfirmasi & Terapkan Kebijakan"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
