"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  useServiceOrder,
  useQuotation,
  useProof,
  useExecution,
  useTracking,
  useDisputes,
  useWarranties,
  useMaintenancePlans,
  useCart,
  useLoyaltyWallet,
  useChat,
} from "@/features";
import { MOCK_TAXONOMY_DOMAINS } from "@/mocks/taxonomy";
import { MOCK_PROVIDERS } from "@/mocks/providers";
import { MOCK_PRODUCTS } from "@/mocks/products";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import {
  Wrench,
  FileText,
  Camera,
  WarningCircle,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Clock,
  User,
  Database,
  Lightning,
  ArrowsClockwise,
  ArrowRight,
  Package,
  CalendarCheck,
  ChatCircleDots,
} from "@phosphor-icons/react";

const SCENARIOS = [
  {
    id: "order-normal-progress",
    label: "1. Normal Progress",
    description: "Sedang dikerjakan teknisi di lokasi",
    icon: Wrench,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "order-quotation-negotiation",
    label: "2. Quotation / Nego",
    description: "Menunggu persetujuan survei teknisi",
    icon: FileText,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "order-awaiting-proof",
    label: "3. Awaiting Proof",
    description: "Foto before/after diunggah teknisi",
    icon: Camera,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "order-disputed",
    label: "4. Disputed",
    description: "Komplain dalam mediasi tripartite CS",
    icon: WarningCircle,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "order-completed-warranty",
    label: "5. Completed & Warranty",
    description: "Selesai dengan sertifikat garansi aktif",
    icon: ShieldCheck,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

export function MockEngineShowcase() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("order-normal-progress");
  const [activeSubTab, setActiveSubTab] = useState<"scenario" | "taxonomy" | "providers" | "products" | "maintenance" | "cart">("scenario");

  // Domain Hooks
  const { order, switchScenario } = useServiceOrder(selectedScenarioId);
  const { quotation, acceptQuotation, rejectQuotation, isActionLoading: quoteLoading } = useQuotation("quote-802");
  const { proof, approveProof, requestRevision, isSubmitting: proofLoading } = useProof("order-awaiting-proof");
  const { session, toggleSopStep, completedStepsCount, totalStepsCount } = useExecution("order-normal-progress");
  const { tracking } = useTracking(selectedScenarioId);
  const { getDisputeByOrderId } = useDisputes();
  const { getWarrantyByOrderId } = useWarranties();
  const { plans, snoozePlan } = useMaintenancePlans();
  const { cartGroups, grandTotal } = useCart();
  const { wallet } = useLoyaltyWallet();
  const { messages, sendMessage } = useChat(selectedScenarioId);
  const [chatInput, setChatInput] = useState("");

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    switchScenario(id);
  };

  const dispute = getDisputeByOrderId(selectedScenarioId);
  const warranty = getWarrantyByOrderId(selectedScenarioId);

  return (
    <div className="space-y-8 font-body">
      {/* Banner Intro Milestone 3 */}
      <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky/30 via-white to-sky/20 p-6 shadow-servio-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white font-display">
                Milestone 3 Engine
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle size={12} weight="fill" />
                Deterministic Fixtures Active
              </span>
            </div>
            <h2 className="text-xl font-bold font-display text-neutral-dark">
              Mock Fixture Database & Reactive Domain Adapters
            </h2>
            <p className="text-xs text-neutral-slate max-w-2xl">
              Seluruh data bisnis Servio (6 domain, penyedia jasa, produk suku cadang, 5 skenario order deterministik, aset, dan garansi) telah terhubung ke custom React hooks untuk siap dikonsumsi di Milestone 4 s.d. 8.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSubTab("scenario")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "scenario"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-white border border-slate-200 text-neutral-slate hover:bg-slate-50"
              }`}
            >
              5 Skenario Pesanan
            </button>
            <button
              onClick={() => setActiveSubTab("taxonomy")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "taxonomy"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-white border border-slate-200 text-neutral-slate hover:bg-slate-50"
              }`}
            >
              6 Domain Kategori Jasa
            </button>
            <button
              onClick={() => setActiveSubTab("providers")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "providers"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-white border border-slate-200 text-neutral-slate hover:bg-slate-50"
              }`}
            >
              Mitra & Teknisi
            </button>
            <button
              onClick={() => setActiveSubTab("products")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "products"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-white border border-slate-200 text-neutral-slate hover:bg-slate-50"
              }`}
            >
              Suku Cadang
            </button>
            <button
              onClick={() => setActiveSubTab("maintenance")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === "maintenance"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-white border border-slate-200 text-neutral-slate hover:bg-slate-50"
              }`}
            >
              Jadwal Pemeliharaan
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === "scenario" && (
        <div className="space-y-6">
          {/* Skenario Switcher Cards */}
          <div>
            <h3 className="text-sm font-bold font-display text-neutral-dark mb-3">
              Pilih Skenario Pesanan Deterministik:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SCENARIOS.map((sc) => {
                const Icon = sc.icon;
                const isSelected = selectedScenarioId === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-servio-sm ring-2 ring-primary/20"
                        : "bg-white border-slate-200 text-neutral-dark hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-primary"}`}>
                        <Icon size={18} weight="duotone" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isSelected ? "bg-white/20 text-white border-white/30" : sc.badgeColor}`}>
                        #{sc.id.split("-")[1]}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-display">{sc.label}</h4>
                      <p className={`text-[11px] mt-0.5 line-clamp-2 ${isSelected ? "text-sky-100" : "text-neutral-slate"}`}>
                        {sc.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skenario Detail Live Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kolom Kiri: Ringkasan Order & Stepper */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card Utama Order */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-servio-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-sky px-2 py-0.5 rounded">
                        #{order.id}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-neutral-dark border border-slate-200">
                        {order.statusLabel}
                      </span>
                    </div>
                    <h3 className="text-base font-bold font-display text-neutral-dark mt-1">
                      {order.serviceTitle}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-neutral-slate block">Total Nilai Transaksi</span>
                    <span className="text-base font-extrabold font-display text-primary">
                      {formatRupiah(order.pricing.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Info Alamat & Teknisi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-muted uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} weight="fill" /> Lokasi Pengerjaan
                    </span>
                    <p className="font-medium text-neutral-dark">{order.address}</p>
                    <p className="text-[11px] text-neutral-slate">
                      Jadwal: {order.scheduledDate} ({order.scheduledTimeSlot})
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-neutral-muted uppercase tracking-wider flex items-center gap-1">
                      <User size={12} weight="fill" /> Mitra & Teknisi
                    </span>
                    <p className="font-bold text-neutral-dark">{order.providerName}</p>
                    {order.assignedWorker ? (
                      <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={12} weight="fill" /> Teknisi: {order.assignedWorker.name} ({order.assignedWorker.phone})
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-slate">Menunggu penugasan teknisi</p>
                    )}
                  </div>
                </div>

                {/* Visual Order Stepper */}
                <div className="pt-2">
                  <span className="text-xs font-bold font-display text-neutral-dark block mb-3">
                    Alur Riwayat Pekerjaan (Stepper):
                  </span>
                  <div className="space-y-3">
                    {order.stepper.map((st, idx) => (
                      <div key={st.id} className="flex items-start gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              st.isCompleted
                                ? "bg-emerald-600 text-white"
                                : st.isCurrent
                                ? "bg-primary text-white ring-4 ring-sky"
                                : "bg-slate-200 text-neutral-slate"
                            }`}
                          >
                            {st.isCompleted ? <CheckCircle size={14} weight="bold" /> : idx + 1}
                          </div>
                          {idx < order.stepper.length - 1 && (
                            <div
                              className={`w-0.5 h-6 ${
                                st.isCompleted ? "bg-emerald-400" : "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold ${st.isCurrent ? "text-primary" : "text-neutral-dark"}`}>
                              {st.title}
                            </span>
                            {st.timestamp && (
                              <span className="text-[10px] text-neutral-muted font-mono">{st.timestamp}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-slate">{st.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contextual Action Panel per Skenario */}
              {selectedScenarioId === "order-quotation-negotiation" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 font-bold font-display text-sm">
                      <FileText size={18} weight="duotone" />
                      Penawaran Biaya Tambahan Pasca Survei
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      Status: {quotation.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-dark bg-white p-3 rounded-xl border border-amber-200">
                    <span className="font-bold block mb-1">Catatan Survei Teknisi:</span>
                    {quotation.surveySummary}
                  </p>

                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden text-xs">
                    <div className="p-3 bg-amber-100/50 font-bold flex justify-between">
                      <span>Rincian Item & Jasa</span>
                      <span>Total Biaya</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {quotation.items.map((it) => (
                        <div key={it.id} className="p-3 flex justify-between">
                          <span>{it.name} (x{it.quantity})</span>
                          <span className={it.totalPrice < 0 ? "text-emerald-600 font-bold" : "font-bold"}>
                            {formatRupiah(it.totalPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between font-extrabold text-sm text-primary">
                      <span>Total Bayar Bersih</span>
                      <span>{formatRupiah(quotation.finalPayableAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={acceptQuotation}
                      disabled={quoteLoading || quotation.status === "ACCEPTED"}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {quotation.status === "ACCEPTED" ? "Penawaran Telah Disetujui" : "Setujui Penawaran Biaya"}
                    </button>
                    <button
                      onClick={() => rejectQuotation()}
                      disabled={quoteLoading || quotation.status === "REJECTED"}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 font-bold text-xs hover:bg-rose-200 transition-all disabled:opacity-50"
                    >
                      Tolak Penawaran
                    </button>
                  </div>
                </div>
              )}

              {selectedScenarioId === "order-awaiting-proof" && proof && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-900 font-bold font-display text-sm">
                      <Camera size={18} weight="duotone" />
                      Bukti Hasil Kerja Lapangan (Proof of Service)
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {proof.isApprovedByCustomer ? "Sudah Dikonfirmasi" : "Menunggu Konfirmasi"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {proof.media.map((pm) => (
                      <div key={pm.id} className="rounded-xl border border-purple-200 bg-white overflow-hidden text-xs">
                        <div className="h-28 bg-slate-200 relative overflow-hidden">
                          <Image fill unoptimized src={pm.imageUrl} alt={pm.label} className="w-full h-full object-cover" />
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                              pm.type === "BEFORE" ? "bg-amber-600" : "bg-emerald-600"
                            }`}
                          >
                            {pm.type}
                          </span>
                        </div>
                        <div className="p-2.5">
                          <p className="font-bold text-[11px] line-clamp-1">{pm.label}</p>
                          <p className="text-[10px] text-neutral-slate mt-0.5 line-clamp-2">{pm.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => approveProof()}
                      disabled={proofLoading || proof.isApprovedByCustomer}
                      className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                      {proof.isApprovedByCustomer ? "Escrow Dirilis ke Mitra" : "Konfirmasi & Rilis Escrow"}
                    </button>
                    <button
                      onClick={() => requestRevision("Mohon bersihkan ulang noda di sudut kanan.")}
                      disabled={proofLoading}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-neutral-slate font-bold text-xs hover:bg-slate-200 transition-all"
                    >
                      Minta Revisi Pengerjaan
                    </button>
                  </div>
                </div>
              )}

              {selectedScenarioId === "order-disputed" && dispute && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-800 font-bold font-display text-sm">
                      <WarningCircle size={18} weight="duotone" />
                      Detail Sengketa & Mediasi Customer Support
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {dispute.status}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs space-y-1.5">
                    <span className="font-bold text-rose-700 block">Alasan Komplain: {dispute.reason}</span>
                    <p className="text-neutral-dark">{dispute.detailedComplaint}</p>
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-neutral-slate">
                      <span className="font-bold text-primary">Catatan Mediator ({dispute.mediatorName}):</span>
                      <p className="mt-0.5">{dispute.mediationNotes}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedScenarioId === "order-completed-warranty" && warranty && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold font-display text-sm">
                      <ShieldCheck size={20} weight="fill" className="text-emerald-600" />
                      Sertifikat Garansi Resmi Servio
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {warranty.status} (Durasi {warranty.durationDays} Hari)
                    </span>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-neutral-slate">
                      <span>No. Sertifikat: <strong className="font-mono text-neutral-dark">{warranty.certificateNumber}</strong></span>
                      <span>Masa Berlaku: {warranty.startDate} s.d. <strong>{warranty.endDate}</strong></span>
                    </div>
                    <div>
                      <span className="font-bold text-neutral-dark block mb-1">Cakupan Perlindungan:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-neutral-slate text-[11px]">
                        {warranty.coverageDetails.map((cov, idx) => (
                          <li key={idx}>{cov}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {selectedScenarioId === "order-normal-progress" && session && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-servio-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold font-display text-neutral-dark flex items-center gap-1.5">
                      <Lightning size={16} weight="fill" className="text-amber-500" />
                      Live SOP Checklist Teknisi Lapangan ({completedStepsCount}/{totalStepsCount})
                    </h4>
                    <span className="text-xs font-bold text-primary">
                      {Math.round((completedStepsCount / totalStepsCount) * 100)}% Selesai
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {session.sopChecklist.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => toggleSopStep(step.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          step.isCompleted
                            ? "bg-emerald-50/60 border-emerald-200 text-neutral-dark"
                            : "bg-slate-50 border-slate-200 text-neutral-slate hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={step.isCompleted}
                            onChange={() => {}}
                            className="rounded text-primary focus:ring-primary h-4 w-4"
                          />
                          <div>
                            <span className="font-bold block">{step.title}</span>
                            <span className="text-[11px] text-neutral-slate">{step.description}</span>
                          </div>
                        </div>
                        {step.completedAt && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                            {step.completedAt}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Kolom Kanan: Live Tracking Radar & Chat Transaksional */}
            <div className="space-y-6">
              {/* Live Tracking Radar Mini */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-servio-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-display text-neutral-dark flex items-center gap-1.5">
                    <MapPin size={16} weight="fill" className="text-primary" />
                    Radar Teknisi (Live Tracking)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {tracking?.status ?? "OFFLINE"}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-slate">Kendaraan:</span>
                    <strong className="font-mono">{tracking?.workerVehicleNumber || "-"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-slate">Jarak Sisa:</span>
                    <strong>{tracking?.distanceKm ?? 0} Km</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-slate">Estimasi Tiba:</span>
                    <strong className="text-primary">{tracking?.estimatedArrivalMinutes ?? 0} Menit</strong>
                  </div>
                </div>
              </div>

              {/* Chat Thread Terikat Transaksi */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-servio-xs flex flex-col h-96">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <ChatCircleDots size={16} weight="fill" className="text-primary" />
                    <span className="text-xs font-bold font-display">Chat Transaksional #{selectedScenarioId}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 p-1 text-xs">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.senderRole === "customer" ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-neutral-muted mb-0.5">{m.senderName} • {m.timestamp}</span>
                      <div
                        className={`p-2.5 rounded-xl max-w-[85%] ${
                          m.senderRole === "customer"
                            ? "bg-primary text-white"
                            : m.senderRole === "support"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : "bg-slate-100 text-neutral-dark"
                        }`}
                      >
                        <p>{m.message}</p>
                        {m.attachmentName && (
                          <div className="mt-1 pt-1 border-t border-white/20 text-[10px] font-mono flex items-center gap-1">
                            📎 {m.attachmentName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInput.trim()) {
                        sendMessage(chatInput, "customer");
                        setChatInput("");
                      }
                    }}
                    placeholder="Ketik pesan..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      if (chatInput.trim()) {
                        sendMessage(chatInput, "customer");
                        setChatInput("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: 6 Domain Kategori Jasa */}
      {activeSubTab === "taxonomy" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold font-display text-neutral-dark">
            6 Domain Resmi Kategori Jasa Servio & Subkategori
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_TAXONOMY_DOMAINS.map((dom) => (
              <div key={dom.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-servio-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary uppercase bg-sky px-2 py-0.5 rounded">
                    {dom.id}
                  </span>
                  {dom.badge && (
                    <span className="text-[10px] font-bold text-coral bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      {dom.badge}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold font-display text-neutral-dark">{dom.name}</h4>
                  <p className="text-xs text-neutral-slate mt-0.5">{dom.description}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-neutral-muted uppercase tracking-wider block mb-1.5">
                    Subkategori Layanan:
                  </span>
                  <div className="space-y-1">
                    {dom.subcategories.map((sub) => (
                      <div key={sub.id} className="text-xs p-2 rounded-lg bg-slate-50 flex justify-between items-center">
                        <span className="font-medium text-neutral-dark">{sub.name}</span>
                        <span className="text-[10px] text-neutral-muted">{sub.activeProvidersCount} Mitra</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab: Mitra & Teknisi */}
      {activeSubTab === "providers" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold font-display text-neutral-dark">
            Profil Mitra Bengkel Terverifikasi & Teknisi Lapangan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_PROVIDERS.map((p) => (
              <div key={p.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-servio-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-xs font-display">
                    {p.avatarInitials}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-display text-neutral-dark flex items-center gap-1">
                      {p.name}
                      {p.isVerified && <CheckCircle size={14} weight="fill" className="text-emerald-600" />}
                    </h4>
                    <span className="text-[11px] text-neutral-slate">{p.city} • Rating {p.rating} ({p.completedJobs} Selesai)</span>
                  </div>
                </div>
                <div className="text-xs space-y-1 text-neutral-slate">
                  <p>📍 {p.address}</p>
                  <p>⏰ {p.operationalHoursSummary}</p>
                  <p>🎯 Radius: {p.workRadiusKm} Km</p>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.specialties.map((sp, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-neutral-dark font-medium">
                      {sp}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab: Suku Cadang */}
      {activeSubTab === "products" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold font-display text-neutral-dark">
            Katalog Produk & Suku Cadang Resmi (Material Hub)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MOCK_PRODUCTS.map((prod) => (
              <div key={prod.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-servio-xs space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px]">{prod.sku}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    Stok: {prod.stock}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold font-display text-neutral-dark line-clamp-1">{prod.title}</h4>
                  <p className="text-[11px] text-neutral-slate mt-0.5">{prod.merchantName}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm font-extrabold font-display text-primary">{formatRupiah(prod.price)}</span>
                  <span className="text-[10px] text-neutral-muted">Garansi {prod.warrantyMonths} Bln</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab: Jadwal Pemeliharaan */}
      {activeSubTab === "maintenance" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold font-display text-neutral-dark">
            Jadwal Servis Berkala (Maintenance Routine)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((pl) => (
              <div key={pl.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-servio-xs space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-dark">{pl.title}</span>
                  {pl.isOverdue && !pl.isSnoozed ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                      Jatuh Tempo!
                    </span>
                  ) : pl.isSnoozed ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Ditunda s.d. {pl.snoozeUntil}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Tepat Waktu
                    </span>
                  )}
                </div>
                <p className="text-neutral-slate">Aset: {pl.assetName}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-neutral-muted">Frekuensi: Tiap {pl.frequencyMonths} Bulan</span>
                  {!pl.isSnoozed && (
                    <button
                      onClick={() => snoozePlan(pl.id, 7)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-neutral-slate text-[11px] font-bold hover:bg-slate-200"
                    >
                      Tunda 7 Hari
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
