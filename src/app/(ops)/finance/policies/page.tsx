"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ArrowsClockwise,
  Eye,
  CalendarBlank,
  WarningCircle,
  FileText,
  LockKey,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { financeApi } from "@/lib/servioApi";
import {
  FeePolicyGroupModel,
  FeePolicyVersionModel,
  FeePolicyTargetModel,
} from "@/types/finance";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";

type FinanceTab = "active" | "scheduled" | "history";

interface FlatVersionItem {
  group: FeePolicyGroupModel;
  version: FeePolicyVersionModel;
}

export default function FinancePlatformPoliciesPage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("active");

  const [policyGroups, setPolicyGroups] = useState<FeePolicyGroupModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Snapshot Inspection Modal
  const [inspectingItem, setInspectingItem] = useState<FlatVersionItem | null>(null);

  const loadAllPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await financeApi.policies.list({ per_page: 50 });
      if (res && res.data && Array.isArray(res.data.items)) {
        setPolicyGroups(res.data.items);
      } else if (res && Array.isArray((res as any).items)) {
        setPolicyGroups((res as any).items);
      } else {
        setPolicyGroups([]);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat kebijakan:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data kebijakan platform dari Finance Service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllPolicies();
  }, []);

  // Flatten versions
  const allFlattenedVersions: FlatVersionItem[] = useMemo(() => {
    const list: FlatVersionItem[] = [];
    policyGroups.forEach((group) => {
      if (Array.isArray(group.versions)) {
        group.versions.forEach((ver) => {
          list.push({ group, version: ver });
        });
      }
    });
    return list;
  }, [policyGroups]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { active: 0, scheduled: 0, history: 0 };
    allFlattenedVersions.forEach((item) => {
      const s = item.version.status;
      if (s === "ACTIVE") counts.active++;
      else if (s === "SCHEDULED") counts.scheduled++;
      else if (s === "HISTORICAL" || s === "SUPERSEDED" || s === "INACTIVE") counts.history++;
    });
    return counts;
  }, [allFlattenedVersions]);

  // Filter flattened versions by activeTab
  const filteredVersions = useMemo(() => {
    return allFlattenedVersions.filter((item) => {
      const status = item.version.status;
      let matchesTab = false;

      if (activeTab === "active") {
        matchesTab = status === "ACTIVE";
      } else if (activeTab === "scheduled") {
        matchesTab = status === "SCHEDULED";
      } else if (activeTab === "history") {
        matchesTab = status === "HISTORICAL" || status === "SUPERSEDED" || status === "INACTIVE";
      }

      if (!matchesTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.group.display_name.toLowerCase().includes(q) ||
          item.group.slug.toLowerCase().includes(q) ||
          `v${item.version.version_no}`.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allFlattenedVersions, activeTab, searchQuery]);

  return (
    <div className="space-y-6 pb-20 font-body text-left">
      {/* Header */}
      <PageHeader
        title="Audit Kebijakan Platform (Read-Only)"
        description="Pemantauan audit tarif resmi platform yang ditetapkan oleh CEO. Finance Operations hanya berwenang membaca dan menerapkan kebijakan ini secara authoritative tanpa hak modifikasi."
        breadcrumbs={[
          { label: "Dashboard", href: "/finance/dashboard" },
          { label: "Kebijakan Platform" },
        ]}
      />

      {/* Read-Only Scope Warning Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 text-xs leading-relaxed">
        <LockKey size={20} className="text-amber-700 shrink-0 mt-0.5" weight="fill" />
        <div>
          <strong className="font-bold">Akses Read-Only Terproteksi:</strong>
          <p className="mt-0.5 text-amber-900">
            Penetapan, revisi, dan publikasi aturan tarif biaya aplikasi serta komisi toko merupakan wewenang eksklusif role <strong>CEO_PRODUCT_OWNER</strong>. Petugas Finance Operations dilarang mengubah besaran tarif secara sepihak.
          </p>
        </div>
      </div>

      {/* Governance & Policy Life-Cycle Metrics Cards (Option B) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Enforced Policies */}
        <div
          onClick={() => setActiveTab("active")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "active" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Kebijakan Aktif (Enforced)
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.active}
                </span>
                <span className="text-xs font-bold text-slate-500">Aturan</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Authoritative
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ShieldCheck size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Dasar acuan tagihan checkout & order aktif</span>
            <span className="font-bold text-emerald-700">Lihat Aktif →</span>
          </div>
        </div>

        {/* Card 2: Scheduled Policies */}
        <div
          onClick={() => setActiveTab("scheduled")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "scheduled" ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Terjadwal Mendatang
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.scheduled}
                </span>
                <span className="text-xs font-bold text-slate-500">Versi</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Antrean Jadwal
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <CalendarBlank size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Kebijakan dengan tanggal efektif mendatang</span>
            <span className="font-bold text-sky-700">Lihat Terjadwal →</span>
          </div>
        </div>

        {/* Card 3: Historical Policies */}
        <div
          onClick={() => setActiveTab("history")}
          className={`p-5 rounded-3xl bg-white border transition-all cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between ${
            activeTab === "history" ? "border-slate-500 ring-2 ring-slate-500/20" : "border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Riwayat & Arsip Audit
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {tabCounts.history}
                </span>
                <span className="text-xs font-bold text-slate-500">Versi Lampau</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Superseded
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FileText size={22} weight="duotone" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Arsip versi sebelumnya untuk audit finansial</span>
            <span className="font-bold text-slate-700">Lihat Riwayat →</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
          <WarningCircle size={20} className="text-rose-600 shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1">
            <h4 className="font-bold">Kendala Koneksi</h4>
            <p className="text-xs text-rose-800 mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllPolicies}
            className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Control Bar: Tabs & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "active"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" weight={activeTab === "active" ? "fill" : "regular"} />
              <span>Kebijakan Aktif</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "active" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tabCounts.active}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("scheduled")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "scheduled"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <CalendarBlank className="w-4 h-4" weight={activeTab === "scheduled" ? "fill" : "regular"} />
              <span>Terjadwal</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "scheduled" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tabCounts.scheduled}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "history"
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-4 h-4" weight={activeTab === "history" ? "fill" : "regular"} />
              <span>Riwayat</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tabCounts.history}
              </span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllPolicies}
            disabled={loading}
            className="rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <ArrowsClockwise className={`w-4 h-4 mr-1.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kebijakan berdasarkan nama atau slug..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 font-mono"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <ArrowsClockwise className="w-8 h-8 animate-spin text-[#0F4C81]" />
            <p className="text-xs font-medium text-slate-500">Memuat data kebijakan dari Finance Service...</p>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="p-16 text-center">
            <EmptyState
              title={`Tidak Ada Kebijakan di Tab ${activeTab.toUpperCase()}`}
              description="Belum ada versi kebijakan platform yang sesuai dengan filter ini."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Nama Aturan & Versi</th>
                  <th className="py-3.5 px-4">Biaya Aplikasi Customer</th>
                  <th className="py-3.5 px-4">Komisi Toko Merchant</th>
                  <th className="py-3.5 px-4">Status & Efektif</th>
                  <th className="py-3.5 px-4">Alasan Pembaruan</th>
                  <th className="py-3.5 px-5 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredVersions.map(({ group, version }) => {
                  const targets = version.targets || [];
                  const customerTarget = targets.find(
                    (t) => t.policy_code === "CUSTOMER_PRODUCT_APP_FEE"
                  );
                  const merchantTarget = targets.find(
                    (t) => t.policy_code === "MERCHANT_PRODUCT_COMMISSION"
                  );

                  return (
                    <tr key={version.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900">{group.display_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {group.slug}
                          </span>
                          <span className="font-bold text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                            v{version.version_no}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {customerTarget ? (
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>
                                {customerTarget.fee_type === "FIXED"
                                  ? `Rp ${(customerTarget.fixed_amount_idr || 0).toLocaleString("id-ID")}`
                                  : `${customerTarget.percentage_rate || 0}%`}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-100">
                                {customerTarget.fee_type === "FIXED" ? "Rp" : "%"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Sekali / Checkout
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            — Bebas Biaya
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {merchantTarget ? (
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              <span>
                                {merchantTarget.fee_type === "PERCENTAGE"
                                  ? `${merchantTarget.percentage_rate || 0}%`
                                  : `Rp ${(merchantTarget.fixed_amount_idr || 0).toLocaleString("id-ID")}`}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {merchantTarget.fee_type === "PERCENTAGE" ? "%" : "Rp"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Per Pesanan Toko
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            — Bebas Komisi
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              version.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : version.status === "SCHEDULED"
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {version.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {version.effective_from
                            ? new Date(version.effective_from).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Langsung saat terbit"}
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-xs">
                          {version.change_reason || "-"}
                        </p>
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectingItem({ group, version })}
                          className="text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Rincian
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot Inspection Modal */}
      <Modal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title="Spesifikasi Tarif Kebijakan (Audit Read-Only)"
        size="lg"
      >
        {inspectingItem && (
          <div className="space-y-5 text-left font-body text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500 text-[11px]">
                  ID Versi: {inspectingItem.version.id} • Grup: {inspectingItem.group.slug}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inspectingItem.version.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {inspectingItem.version.status}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {inspectingItem.group.display_name} (Versi v{inspectingItem.version.version_no})
              </h3>
              <p className="text-slate-600 text-xs">
                {inspectingItem.group.description || "Tidak ada deskripsi kebijakan."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-2">Target Tarif yang Diberlakukan</h4>
              <div className="space-y-2.5">
                {(inspectingItem.version.targets || []).map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{t.policy_code}</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-bold">
                          {t.payer_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Charge Scope: {t.charge_scope} • Basis: {t.calculation_base}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        {t.fee_type === "FIXED"
                          ? `Rp ${(t.fixed_amount_idr || 0).toLocaleString("id-ID")}`
                          : `${t.percentage_rate}%`}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">
                        {t.fee_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>
                <strong>Alasan Kebijakan:</strong> {inspectingItem.version.change_reason || "-"}
              </div>
              <div>
                <strong>Mulai Efektif:</strong>{" "}
                {inspectingItem.version.effective_from
                  ? new Date(inspectingItem.version.effective_from).toLocaleString("id-ID")
                  : "Langsung saat terbit"}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
