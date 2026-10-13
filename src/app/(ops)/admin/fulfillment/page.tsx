"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import {
  ClockCountdown,
  MagnifyingGlass,
  CheckCircle,
  SlidersHorizontal,
  Storefront,
  Buildings,
  Hourglass,
  Flame,
  Megaphone,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminFulfillmentPage() {
  const { platformFulfillments, repo, user } = useAdminOperations();

  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [slaFilter, setSlaFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredFulfillments = platformFulfillments.filter((f) => {
    const matchChannel = channelFilter === "ALL" || f.channel === channelFilter;
    const matchSla = slaFilter === "ALL" || f.slaStatus === slaFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      f.id.toLowerCase().includes(q) ||
      f.orderId.toLowerCase().includes(q) ||
      f.entityName.toLowerCase().includes(q) ||
      f.itemSummary.toLowerCase().includes(q);
    return matchChannel && matchSla && matchSearch;
  });

  const atRiskCount = platformFulfillments.filter((f) => f.slaStatus === "AT_RISK" || f.slaStatus === "BREACHED").length;

  const handleExpedite = (fulfillment: (typeof platformFulfillments)[number]) => {
    repo.logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: "ADMIN_OPERATIONS",
      action: "FULFILLMENT_SLA_EXPEDITE",
      resource: fulfillment.channel,
      resourceId: fulfillment.id,
      reason: "Percepatan operasional otomatis oleh Admin - peringatan SLA dipicu ke Manajer Gudang",
      details: {
        orderId: fulfillment.orderId,
        slaStatus: fulfillment.slaStatus,
        elapsed: fulfillment.elapsedMinutes,
      },
    });

    setToastMessage(`Notifikasi urgensi tinggi terkirim ke Manajer Gudang untuk percepatan order ${fulfillment.orderId}!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <ClockCountdown size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Monitoring Kepatuhan SLA Pemenuhan Pesanan (Fulfillment SLA)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan kecepatan Pick &amp; Pack toko Retail dan Staging &amp; Palletizing kargo Grosir B2B untuk mencegah keterlambatan pengiriman.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={atRiskCount > 0 ? "warning" : "success"} size="md">
              {atRiskCount} Berpotensi / Lewat Batas SLA
            </Badge>
            <Badge variant="neutral" size="md">
              Total {platformFulfillments.length} Antrean Aktif
            </Badge>
          </div>
        </div>
      </div>

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={24} weight="fill" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold">Tepat Waktu (ON_TIME)</span>
            <p className="text-xl font-bold text-slate-900 font-heading">
              {platformFulfillments.filter((f) => f.slaStatus === "ON_TIME").length} Antrean
            </p>
            <span className="text-[10px] text-emerald-600">Dalam rentang target aman</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Hourglass size={24} weight="fill" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold">Beresiko Terlambat (AT_RISK)</span>
            <p className="text-xl font-bold text-slate-900 font-heading">
              {platformFulfillments.filter((f) => f.slaStatus === "AT_RISK").length} Antrean
            </p>
            <span className="text-[10px] text-amber-600">&gt;70% target waktu terlewati</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Flame size={24} weight="fill" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold">Melanggar Batas (BREACHED)</span>
            <p className="text-xl font-bold text-slate-900 font-heading">
              {platformFulfillments.filter((f) => f.slaStatus === "BREACHED").length} Antrean
            </p>
            <span className="text-[10px] text-rose-600">Memerlukan intervensi segera</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID fulfillment, no order, nama gudang/entitas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Kanal Pemenuhan</option>
              <option value="RETAIL_MERCHANT">Merchant Retail (Pick &amp; Pack)</option>
              <option value="B2B_SUPPLIER">Supplier B2B (Staging &amp; Kargo)</option>
            </select>

            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status SLA</option>
              <option value="ON_TIME">ON_TIME (Tepat Waktu)</option>
              <option value="AT_RISK">AT_RISK (Berisiko)</option>
              <option value="BREACHED">BREACHED (Terlambat)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID &amp; Referensi Pesanan</th>
                <th className="px-4 py-3">Kanal &amp; Entitas Gudang</th>
                <th className="px-4 py-3">Suku Cadang Dikemas</th>
                <th className="px-4 py-3">Status Tahapan</th>
                <th className="px-4 py-3">Elapsed / SLA Target</th>
                <th className="px-4 py-3">Kondisi SLA</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFulfillments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data pemenuhan pesanan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredFulfillments.map((f) => {
                  const isB2B = f.channel === "B2B_SUPPLIER";
                  const progressPct = Math.min(100, Math.round((f.elapsedMinutes / f.slaTargetMinutes) * 100));

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-slate-900">{f.id}</span>
                        <p className="font-mono text-[10px] text-slate-400">Ref: {f.orderId}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          {isB2B ? (
                            <Buildings size={14} className="text-indigo-600 shrink-0" />
                          ) : (
                            <Storefront size={14} className="text-emerald-600 shrink-0" />
                          )}
                          <span className="line-clamp-1">{f.entityName}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium mt-0.5 inline-block ${
                          isB2B ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isB2B ? "Kargo Grosir B2B" : "Pick & Pack Retail"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="text-[11px] text-slate-800 font-semibold line-clamp-1">{f.itemSummary}</p>
                        <span className="text-[10px] text-slate-400">{f.itemsCount} Macam Barang</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {f.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-slate-800">{f.elapsedMinutes} m</span>
                          <span className="text-slate-400">/ {f.slaTargetMinutes} m</span>
                        </div>
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className={`h-full rounded-full ${
                              progressPct > 90 ? "bg-rose-500" : progressPct > 60 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge
                          variant={f.slaStatus === "ON_TIME" ? "success" : f.slaStatus === "AT_RISK" ? "warning" : "danger"}
                          size="sm"
                        >
                          {f.slaStatus}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleExpedite(f)}
                          className="ml-auto flex items-center gap-1 text-amber-800 hover:bg-amber-50"
                        >
                          <Megaphone size={12} />
                          <span>Percepat (Expedite)</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
