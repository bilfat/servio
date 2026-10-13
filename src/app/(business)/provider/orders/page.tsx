"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardText,
  User,
  MapPin,
  CalendarBlank,
  ArrowRight,
  CheckCircle,
  Clock,
  WarningCircle,
  Truck,
  Wrench,
  ChatCircleText,
  Package,
  CurrencyCircleDollar,
  CheckSquareOffset,
  SlidersHorizontal,
  Warning,
  ShieldCheck,
  Tag,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OrderStatus } from "@/types/domain";

export default function ProviderOrdersListPage() {
  const { orders } = useServiceOrder();
  const [statusFilter, setStatusFilter] = useUrlQueryState<string>("status", "ALL");
  const [searchQuery, setSearchQuery] = useUrlQueryState<string>("search", "");

  const filterTabs = [
    { id: "ALL", label: "Semua Order", count: orders.length },
    {
      id: "ACTIVE",
      label: "Order Aktif",
      count: orders.filter((o) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status)).length,
    },
    {
      id: "PENDING_WORKER",
      label: "Menunggu Teknisi",
      count: orders.filter((o) => o.status === "PENDING_WORKER" || (!o.assignedWorker && o.status !== "COMPLETED")).length,
    },
    {
      id: "TECHNICIAN_DISPATCHED",
      label: "Teknisi di Jalan",
      count: orders.filter((o) => o.status === "TECHNICIAN_DISPATCHED").length,
    },
    {
      id: "DIAGNOSING",
      label: "Tiba / Diagnosis",
      count: orders.filter((o) => o.status === "TECHNICIAN_ARRIVED" || o.status === "DIAGNOSING").length,
    },
    {
      id: "WAITING_APPROVAL",
      label: "Menunggu Persetujuan",
      count: orders.filter(
        (o) =>
          o.status === "WAITING_APPROVAL" ||
          o.status === "QUOTATION_REVIEW" ||
          o.priceAdjustment?.providerAuthStatus === "PENDING"
      ).length,
    },
    {
      id: "WAITING_SPAREPART",
      label: "Menunggu Sparepart",
      count: orders.filter((o) => o.status === "WAITING_SPAREPART" || o.sparepartBlockStatus?.isBlocked).length,
    },
    {
      id: "IN_PROGRESS",
      label: "Sedang Dikerjakan",
      count: orders.filter((o) => o.status === "IN_PROGRESS").length,
    },
    {
      id: "AWAITING_PROOF_REVIEW",
      label: "Verifikasi Bukti",
      count: orders.filter(
        (o) =>
          o.status === "AWAITING_PROOF_REVIEW" ||
          o.proofOfService?.verificationStatus === "PENDING_PROVIDER_REVIEW"
      ).length,
    },
    {
      id: "COMPLETED",
      label: "Selesai",
      count: orders.filter((o) => o.status === "COMPLETED").length,
    },
    {
      id: "DISPUTED",
      label: "Kendala / Sengketa",
      count: orders.filter((o) => o.status === "DISPUTED").length,
    },
  ];

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.assignedWorker?.name && o.assignedWorker.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") {
      return !["COMPLETED", "CANCELLED", "REFUNDED"].includes(o.status);
    }
    if (statusFilter === "PENDING_WORKER") {
      return o.status === "PENDING_WORKER" || (!o.assignedWorker && o.status !== "COMPLETED");
    }
    if (statusFilter === "TECHNICIAN_DISPATCHED") {
      return o.status === "TECHNICIAN_DISPATCHED";
    }
    if (statusFilter === "DIAGNOSING") {
      return o.status === "TECHNICIAN_ARRIVED" || o.status === "DIAGNOSING";
    }
    if (statusFilter === "WAITING_APPROVAL") {
      return (
        o.status === "WAITING_APPROVAL" ||
        o.status === "QUOTATION_REVIEW" ||
        o.priceAdjustment?.providerAuthStatus === "PENDING"
      );
    }
    if (statusFilter === "WAITING_SPAREPART") {
      return o.status === "WAITING_SPAREPART" || o.sparepartBlockStatus?.isBlocked;
    }
    if (statusFilter === "IN_PROGRESS") {
      return o.status === "IN_PROGRESS";
    }
    if (statusFilter === "AWAITING_PROOF_REVIEW") {
      return (
        o.status === "AWAITING_PROOF_REVIEW" ||
        o.proofOfService?.verificationStatus === "PENDING_PROVIDER_REVIEW"
      );
    }
    if (statusFilter === "COMPLETED") {
      return o.status === "COMPLETED";
    }
    if (statusFilter === "DISPUTED") {
      return o.status === "DISPUTED";
    }

    return o.status === statusFilter;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Workspace Sentral Layanan
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Single Service Order Lifecycle
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Order Operasional
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring menyeluruh status teknisi di lapangan, peninjauan biaya paska diagnosis, suku cadang, dan verifikasi kualitas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3.5 py-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200">
            Total {orders.length} Service Order
          </span>
        </div>
      </div>

      {/* Search Input & Operational Status Filter Tabs (docs/todo.md Section 56C.6) */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari order ID (#order-...), nama pelanggan, teknisi penanggung jawab, atau judul layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C81] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-[#0F4C81] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List or Empty State */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardText}
          title="Tidak Ada Order Ditemukan"
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ada order yang cocok dengan filter atau kata kunci pencarian yang dipilih."
              : "Belum ada order layanan yang terdaftar saat ini."
          }
          action={{
            label: "Reset Filter",
            onClick: () => {
              setSearchQuery("");
              setStatusFilter("ALL");
            },
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            // Pricing Adjustment Context helper
            const hasPendingAuth =
              order.priceAdjustment?.requiresProviderAuth &&
              order.priceAdjustment.providerAuthStatus === "PENDING";
            const isAuthorizedByProvider =
              order.priceAdjustment?.providerAuthStatus === "AUTHORIZED";
            const isApprovedByCustomer =
              order.priceAdjustment?.customerApprovalStatus === "APPROVED";

            // Sparepart Context helper
            const isBlockedByPart =
              order.status === "WAITING_SPAREPART" || order.sparepartBlockStatus?.isBlocked;
            const hasProviderMaterial =
              order.providerMaterials && order.providerMaterials.length > 0;
            const hasPartnerStorePart =
              order.diagnosis?.sparepartSource === "PARTNER_STORE" ||
              (order.relatedProductOrderIds && order.relatedProductOrderIds.length > 0);

            // Proof Context helper
            const isAwaitingProofReview =
              order.status === "AWAITING_PROOF_REVIEW" ||
              order.proofOfService?.verificationStatus === "PENDING_PROVIDER_REVIEW";
            const isProofVerified =
              order.proofOfService?.verificationStatus === "VERIFIED_BY_PROVIDER";

            return (
              <motion.div
                key={order.id}
                layout
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5"
              >
                {/* Top Row: Order ID, Service Title, Status Badges */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <ClipboardText size={20} weight="duotone" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {order.id}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : order.status === "IN_PROGRESS"
                              ? "bg-purple-100 text-purple-800"
                              : order.status === "WAITING_APPROVAL" || order.status === "QUOTATION_REVIEW"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : order.status === "WAITING_SPAREPART"
                              ? "bg-purple-100 text-purple-900"
                              : order.status === "AWAITING_PROOF_REVIEW"
                              ? "bg-sky-100 text-sky-900"
                              : order.status === "DISPUTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {order.statusLabel || order.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {order.serviceTitle}
                      </h3>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] text-slate-400 block font-medium">Nilai Transaksi:</span>
                    <span className="text-base font-bold font-display text-slate-900">
                      Rp {(order.pricing?.totalAmount || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-semibold">
                      {order.isEscrowLocked ? "Escrow Diamankan" : "Escrow Selesai"}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Customer, Worker, Schedule, Context Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Col 1: Customer & Address */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Klien &amp; Lokasi
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User size={14} className="text-[#0F4C81]" />
                      <span>{order.customerName}</span>
                    </p>
                    <p className="text-slate-500 flex items-start gap-1">
                      <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{order.address}</span>
                    </p>
                  </div>

                  {/* Col 2: Assigned Worker & Schedule */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Teknisi &amp; Jadwal
                    </span>
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Wrench size={14} className="text-emerald-600" />
                      <span>{order.assignedWorker?.name || "Belum Ditugaskan"}</span>
                    </p>
                    <p className="text-slate-500 flex items-center gap-1.5">
                      <CalendarBlank size={14} className="text-[#0F4C81]" />
                      <span>{order.scheduledDate} ({order.scheduledTimeSlot})</span>
                    </p>
                  </div>

                  {/* Col 3: Operational Status Tags */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Status Kontekstual
                    </span>

                    <div className="space-y-1">
                      {/* Price adjustment status */}
                      {hasPendingAuth && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <CurrencyCircleDollar size={12} weight="bold" />
                          Otorisasi Biaya Diperlukan
                        </span>
                      )}
                      {isAuthorizedByProvider && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                          <CheckCircle size={12} weight="fill" />
                          Otorisasi Disetujui Provider
                        </span>
                      )}

                      {/* Sparepart status */}
                      {isBlockedByPart && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900">
                          <Package size={12} />
                          Menunggu Part Mitra Toko
                        </span>
                      )}
                      {hasProviderMaterial && !isBlockedByPart && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                          <Package size={12} />
                          Material Bengkel (Non-Inventory)
                        </span>
                      )}

                      {/* Proof status */}
                      {isAwaitingProofReview && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-900">
                          <CheckSquareOffset size={12} />
                          Bukti Perlu Diverifikasi QA
                        </span>
                      )}
                      {isProofVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle size={12} weight="fill" />
                          Bukti Terverifikasi QA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Timeline Lapangan:</span>
                    <span className="font-bold text-slate-700">
                      {order.stepper.find((s) => s.isCurrent)?.title || order.statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {hasPendingAuth && (
                      <Link
                        href={`/provider/orders/${order.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <CurrencyCircleDollar size={14} weight="bold" />
                        <span>Review Otorisasi</span>
                      </Link>
                    )}

                    {isAwaitingProofReview && (
                      <Link
                        href={`/provider/orders/${order.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckSquareOffset size={14} />
                        <span>Verifikasi Bukti</span>
                      </Link>
                    )}

                    <Link
                      href={`/provider/orders/${order.id}`}
                      className="px-4 py-1.5 rounded-xl bg-[#0F4C81] text-white hover:bg-[#0d3f6b] font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <span>Buka Workspace Order</span>
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
