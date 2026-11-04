"use client";

import React, { useState, useMemo } from "react";
import {
  Wrench,
  MagnifyingGlass,
  SlidersHorizontal,
  ArrowClockwise,
  Eye,
  CheckCircle,
  WarningCircle,
  CaretLeft,
  CaretRight,
  User,
  Buildings,
  CalendarBlank,
  CreditCard,
  X,
  Funnel,
  ClockCountdown,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useOrderJasa } from "../../hooks/useOrderJasa";
import { ServiceOrder } from "../../types";
import { getSubStatusBadgeInfo, resolveCustomerTab } from "../../constants";
import { ServiceOrderDetailLayout } from "../common/ServiceOrderDetailLayout";

export function AdminServiceOrdersTab() {
  const { orders, refresh } = useOrderJasa();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [diagPaymentFilter, setDiagPaymentFilter] = useState<string>("ALL");
  const [workPaymentFilter, setWorkPaymentFilter] = useState<string>("ALL");
  const [quickFlag, setQuickFlag] = useState<"ALL" | "UNASSIGNED" | "OVERDUE" | "HAS_ISSUE">("ALL");

  const [page, setPage] = useState(1);
  const perPage = 10;

  // Selected Order for Detail View Modal
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  // Status Counts
  const counts = useMemo(() => {
    let belumBayar = 0;
    let menungguJadwal = 0;
    let berlangsung = 0;
    let selesai = 0;
    let batal = 0;
    let unassigned = 0;
    let overdue = 0;
    let hasIssue = 0;

    orders.forEach((o) => {
      const tab = resolveCustomerTab(o);
      if (tab === "BELUM_BAYAR") belumBayar++;
      else if (tab === "MENUNGGU_JADWAL") menungguJadwal++;
      else if (tab === "BERLANGSUNG") berlangsung++;
      else if (tab === "SELESAI") selesai++;
      else if (tab === "BATAL") batal++;

      if (!o.assignment) unassigned++;
      if (o.paymentSummary.executionPayment?.status === "OVERDUE") overdue++;
      if (o.issues && o.issues.length > 0) hasIssue++;
    });

    return {
      total: orders.length,
      belumBayar,
      menungguJadwal,
      berlangsung,
      selesai,
      batal,
      unassigned,
      overdue,
      hasIssue,
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesId = o.id.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = o.customerName.toLowerCase().includes(q);
        const matchesProvider = o.providerName.toLowerCase().includes(q);
        const matchesService = o.serviceSnapshot.title.toLowerCase().includes(q);
        const matchesWorker = o.assignment?.workerName?.toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesProvider && !matchesService && !matchesWorker) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL") {
        const tab = resolveCustomerTab(o);
        if (tab !== statusFilter) return false;
      }

      // Diagnosis Payment
      if (diagPaymentFilter !== "ALL") {
        const diagStatus = o.paymentSummary.diagnosisPayment?.status || "NONE";
        if (diagStatus !== diagPaymentFilter) return false;
      }

      // Execution Payment
      if (workPaymentFilter !== "ALL") {
        const workStatus = o.paymentSummary.executionPayment?.status || "UNBILLED";
        if (workStatus !== workPaymentFilter) return false;
      }

      // Quick Flag
      if (quickFlag === "UNASSIGNED") {
        if (o.assignment) return false;
      } else if (quickFlag === "OVERDUE") {
        if (o.paymentSummary.executionPayment?.status !== "OVERDUE") return false;
      } else if (quickFlag === "HAS_ISSUE") {
        if (!o.issues || o.issues.length === 0) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, diagPaymentFilter, workPaymentFilter, quickFlag]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / perPage));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredOrders.slice(start, start + perPage);
  }, [filteredOrders, page, perPage]);

  const formatRupiah = (num?: number) => {
    if (num === undefined || num === null) return "Rp 0";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setStatusFilter("ALL");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "ALL" && quickFlag === "ALL"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua Status ({counts.total})
        </button>

        <button
          onClick={() => {
            setStatusFilter("BELUM_BAYAR");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "BELUM_BAYAR"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Belum Bayar ({counts.belumBayar})
        </button>

        <button
          onClick={() => {
            setStatusFilter("MENUNGGU_JADWAL");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "MENUNGGU_JADWAL"
              ? "bg-sky-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Menunggu Jadwal ({counts.menungguJadwal})
        </button>

        <button
          onClick={() => {
            setStatusFilter("BERLANGSUNG");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "BERLANGSUNG"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Berlangsung ({counts.berlangsung})
        </button>

        <button
          onClick={() => {
            setStatusFilter("SELESAI");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "SELESAI"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Selesai ({counts.selesai})
        </button>

        <button
          onClick={() => {
            setStatusFilter("BATAL");
            setQuickFlag("ALL");
            setPage(1);
          }}
          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === "BATAL"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Batal ({counts.batal})
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          onClick={() => {
            setQuickFlag(quickFlag === "UNASSIGNED" ? "ALL" : "UNASSIGNED");
            setPage(1);
          }}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
            quickFlag === "UNASSIGNED"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
          }`}
        >
          Worker Belum Ditugaskan ({counts.unassigned})
        </button>

        <button
          onClick={() => {
            setQuickFlag(quickFlag === "OVERDUE" ? "ALL" : "OVERDUE");
            setPage(1);
          }}
          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
            quickFlag === "OVERDUE"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
          }`}
        >
          Pembayaran Terlambat ({counts.overdue})
        </button>

        {counts.hasIssue > 0 && (
          <button
            onClick={() => {
              setQuickFlag(quickFlag === "HAS_ISSUE" ? "ALL" : "HAS_ISSUE");
              setPage(1);
            }}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
              quickFlag === "HAS_ISSUE"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Kendala Aktif ({counts.hasIssue})
          </button>
        )}
      </div>

      {/* Search & Advanced Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari Service Order ID, Pelanggan, Mitra Provider, Teknisi, atau Layanan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Diagnosis Payment Filter */}
          <div className="w-full md:w-auto">
            <select
              value={diagPaymentFilter}
              onChange={(e) => {
                setDiagPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium w-full"
            >
              <option value="ALL">Semua Pembayaran Diagnosis</option>
              <option value="PENDING">Diagnosis: PENDING</option>
              <option value="PAID">Diagnosis: PAID</option>
              <option value="REFUNDED">Diagnosis: REFUNDED</option>
            </select>
          </div>

          {/* Execution Payment Filter */}
          <div className="w-full md:w-auto">
            <select
              value={workPaymentFilter}
              onChange={(e) => {
                setWorkPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium w-full"
            >
              <option value="ALL">Semua Pembayaran Pengerjaan</option>
              <option value="UNBILLED">Pengerjaan: Belum Ditagih</option>
              <option value="PENDING">Pengerjaan: PENDING</option>
              <option value="PAID">Pengerjaan: PAID</option>
              <option value="OVERDUE">Pengerjaan: OVERDUE / Terlambat</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await refresh(true);
              } finally {
                setIsRefreshing(false);
              }
            }}
            disabled={isRefreshing}
            title="Perbarui Data"
            className={`p-2 text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shrink-0 ${
              isRefreshing ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <ArrowClockwise size={16} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. Order &amp; Layanan</th>
                <th className="px-4 py-3">Customer &amp; Lokasi</th>
                <th className="px-4 py-3">Provider &amp; Teknisi</th>
                <th className="px-4 py-3">Jadwal Kunjungan</th>
                <th className="px-4 py-3">Status Pembayaran</th>
                <th className="px-4 py-3">Status Pesanan</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Wrench size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold">Tidak ada transaksi Service Order yang cocok.</p>
                    <p className="text-[11px] mt-0.5">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const badgeInfo = getSubStatusBadgeInfo(order.subStatus);
                  const diagStatus = order.paymentSummary.diagnosisPayment?.status;
                  const diagAmount = order.paymentSummary.diagnosisPayment?.amount ?? 0;
                  const workPayment = order.paymentSummary.executionPayment;

                  const badgeClass = {
                    primary: "bg-sky-50 text-[#0F4C81] border-sky-200",
                    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
                    warning: "bg-amber-50 text-amber-800 border-amber-200",
                    danger: "bg-rose-50 text-rose-800 border-rose-200",
                    info: "bg-blue-50 text-blue-800 border-blue-200",
                    neutral: "bg-slate-100 text-slate-700 border-slate-200",
                  }[badgeInfo.variant];

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* No. Order & Layanan */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Wrench size={16} weight="duotone" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold font-mono text-slate-900 group-hover:text-indigo-600 transition-colors">
                                #{order.orderNumber}
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-indigo-100 text-indigo-700">
                                05B
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800 line-clamp-1 mt-0.5">
                              {(() => {
                                const rawTitle = order.serviceSnapshot?.title || "";
                                return (!rawTitle || rawTitle.toLowerCase().includes("service offering") || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle))
                                  ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                                  : rawTitle;
                              })()}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {order.createdAt}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Customer & Lokasi */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <User size={12} className="text-slate-400" />
                            <span>{order.customerName}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {order.addressSnapshot.recipientName} ({order.customerPhone})
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {order.addressSnapshot.district}, {order.addressSnapshot.city}
                          </p>
                        </div>
                      </td>

                      {/* Provider & Teknisi */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <Buildings size={12} className="text-slate-400" />
                            <span className="line-clamp-1">{order.providerName}</span>
                          </div>
                          {order.assignment ? (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200/60 font-medium">
                              <ShieldCheck size={12} />
                              <span className="line-clamp-1">{order.assignment.workerName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 inline-block">
                              Belum Ditugaskan
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Jadwal Kunjungan */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <CalendarBlank size={13} className="text-slate-400 shrink-0" />
                          <span>
                            {order.schedule.date}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {order.schedule.timeSlot}
                        </span>
                      </td>

                      {/* Status Pembayaran */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 font-mono text-[11px]">
                          {/* Diagnosis */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 text-[10px]">Diag:</span>
                            {diagAmount === 0 ? (
                              <span className="text-emerald-600 font-bold">GRATIS</span>
                            ) : order.paymentSummary.refundSummary?.status === "SUCCEEDED" ? (
                              <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.2 rounded-xs border border-sky-200/60">
                                REFUNDED
                              </span>
                            ) : diagStatus === "PAID" ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200/60">
                                {formatRupiah(diagAmount)} (PAID)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200/60">
                                {formatRupiah(diagAmount)} (PENDING)
                              </span>
                            )}
                          </div>

                          {/* Pengerjaan */}
                          {workPayment && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 text-[10px]">Kerja:</span>
                              {workPayment.status === "PAID" ? (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200/60">
                                  {formatRupiah(workPayment.amount)} (PAID)
                                </span>
                              ) : workPayment.status === "OVERDUE" ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded-xs border border-rose-200/60">
                                  {formatRupiah(workPayment.amount)} (TERLAMBAT)
                                </span>
                              ) : (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200/60">
                                  {formatRupiah(workPayment.amount)} (PENDING)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Pesanan */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass}`}
                        >
                          {badgeInfo.label}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                          className="gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <Eye size={14} />
                          <span>Detail</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan{" "}
            <span className="font-bold text-slate-800">
              {filteredOrders.length === 0 ? 0 : (page - 1) * perPage + 1}
            </span>{" "}
            hingga{" "}
            <span className="font-bold text-slate-800">
              {Math.min(page * perPage, filteredOrders.length)}
            </span>{" "}
            dari <span className="font-bold text-slate-800">{filteredOrders.length}</span> transaksi
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CaretLeft size={14} />
            </button>
            <span className="font-bold text-slate-700 px-2">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CaretRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Service Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Wrench size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">
                    Admin Operational View: {selectedOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Audit komprehensif, diagnosis, rincian biaya, escrow, dan riwayat pesanan jasa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <ServiceOrderDetailLayout
                order={selectedOrder}
                role="ADMIN"
                backHref="#"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
