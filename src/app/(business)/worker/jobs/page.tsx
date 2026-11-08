"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Wrench,
  Clock,
  CheckCircle,
  ShieldCheck,
  WarningCircle,
  MagnifyingGlass,
  User,
  ArrowsClockwise,
  ArrowRight,
  CalendarBlank,
  CreditCard,
  Building,
  XCircle,
} from "@phosphor-icons/react";
import { useOrderJasa } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrderCard } from "@/features/order-jasa/components/common/ServiceOrderCard";
import { WorkerTabType, ServiceOrder } from "@/features/order-jasa/types";
import { Toast } from "@/components/feedback/Toast";

function WorkerJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get("tab")?.toUpperCase() as WorkerTabType;
  const initialFilter: WorkerTabType = [
    "TUGAS_MASUK",
    "HARI_INI",
    "TERJADWAL",
    "BERLANGSUNG",
    "SELESAI",
    "RIWAYAT",
  ].includes(rawFilter)
    ? rawFilter
    : "TUGAS_MASUK";

  const {
    orders: serviceOrders05B,
    workerOrdersByTab,
    workerTabCounts,
    acceptAssignment,
    rejectAssignment,
    startTrip,
    arriveAtLocation,
    refresh,
  } = useOrderJasa();

  const [activeWorkerTab, setActiveWorkerTab] = useState<WorkerTabType>(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Worker task rejection modal state
  const [rejectingOrder, setRejectingOrder] = useState<ServiceOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Jadwal bentrok dengan pekerjaan lain");
  const [rejectNotes, setRejectNotes] = useState("");

  const rejectionOptions = [
    "Jadwal bentrok dengan pekerjaan lain",
    "Keahlian atau perlengkapan tidak sesuai dengan keluhan pelanggan",
    "Jarak lokasi / kendala transportasi di luar jangkauan operasional",
    "Kondisi darurat operasional / kesehatan",
    "Lainnya",
  ];

  const workerTabs: { id: WorkerTabType; label: string; count: number; alert?: boolean }[] = [
    {
      id: "TUGAS_MASUK",
      label: "Tugas Masuk",
      count: workerTabCounts.TUGAS_MASUK,
      alert: workerTabCounts.TUGAS_MASUK > 0,
    },
    { id: "HARI_INI", label: "Hari Ini", count: workerTabCounts.HARI_INI, alert: workerTabCounts.HARI_INI > 0 },
    { id: "TERJADWAL", label: "Terjadwal", count: workerTabCounts.TERJADWAL },
    { id: "BERLANGSUNG", label: "Berlangsung", count: workerTabCounts.BERLANGSUNG },
    { id: "SELESAI", label: "Selesai", count: workerTabCounts.SELESAI },
    { id: "RIWAYAT", label: "Riwayat", count: workerTabCounts.RIWAYAT },
  ];

  const filtered05BWorkerJobs = useMemo(() => {
    const list = workerOrdersByTab[activeWorkerTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.serviceSnapshot.title.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.addressSnapshot.district?.toLowerCase().includes(q) ||
        o.addressSnapshot.city.toLowerCase().includes(q)
    );
  }, [workerOrdersByTab, activeWorkerTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-body">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-servio-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] border border-sky-100 flex items-center justify-center font-bold text-lg shadow-3xs">
              <Wrench size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
                  Tugas Kerja Teknisi
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F4C81] text-white tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Workspace operasional teknisi SERVIO: Terima tugas, perjalanan OTW, diagnosa fisik, persetujuan lisan di lokasi, hingga penyelesaian pengerjaan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => refresh()}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-bold"
              title="Perbarui Penugasan"
            >
              <ArrowsClockwise size={15} />
              <span>Sinkron</span>
            </button>
            <Link
              href="/worker/profile"
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Profil Teknisi
            </Link>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Tugas Masuk</span>
            <span className="text-base font-bold text-amber-700 font-heading">
              {workerTabCounts.TUGAS_MASUK} Tugas
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Terjadwal &amp; Siap</span>
            <span className="text-base font-bold text-sky-700 font-heading">
              {workerTabCounts.TERJADWAL} Kunjungan
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Berlangsung Aktif</span>
            <span className="text-base font-bold text-[#0F4C81] font-heading">
              {workerTabCounts.BERLANGSUNG} Servis
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Tugas Tuntas</span>
            <span className="text-base font-bold text-emerald-700 font-heading">
              {workerTabCounts.SELESAI} Selesai
            </span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari ID Penugasan, No. Order (#SRV-ORD), Pelanggan, atau Layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0F4C81] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 5 CANONICAL WORKER TABS (SECTION 15) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {workerTabs.map((tab) => {
          const isActive = activeWorkerTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorkerTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition flex items-center gap-2 shrink-0 ${
                isActive
                  ? tab.alert
                    ? "bg-amber-500 text-white shadow-servio-xs"
                    : "bg-[#0F4C81] text-white shadow-servio-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LIST OF SERVICE ORDER CARDS (WORKER VIEW) */}
      <div className="space-y-4">
        {filtered05BWorkerJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-500 space-y-2 shadow-2xs">
            <Wrench size={36} className="mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-800 text-sm">
              Tidak ada tugas pada tab {workerTabs.find((t) => t.id === activeWorkerTab)?.label}.
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              {searchQuery
                ? `Tidak ditemukan penugasan yang sesuai dengan pencarian "${searchQuery}".`
                : "Saat mitra Provider menugaskan pekerjaan servis atau terjadi pembaruan status, data akan langsung muncul di sini."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                <ArrowsClockwise size={14} />
                <span>Reset Pencarian</span>
              </button>
            )}
          </div>
        ) : (
          filtered05BWorkerJobs.map((order, idx) => (
            <ServiceOrderCard
              key={`worker-card-${order.id}-${order.assignment?.assignmentId || idx}`}
              order={order}
              role="WORKER"
              onSecondaryAction={(o) => {
                setRejectingOrder(o);
                setRejectReason("Jadwal bentrok dengan pekerjaan lain");
                setRejectNotes("");
              }}
              onPrimaryAction={async (o) => {
                const isAwaitingAcceptance =
                  o.assignment?.status === "ASSIGNED" ||
                  o.subStatus === "ASSIGNED_PENDING" ||
                  (o.assignment?.status as any) === "PENDING";

                if (isAwaitingAcceptance) {
                  setIsProcessing(true);
                  try {
                    await acceptAssignment(o.id);
                    const todayJakarta = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Jakarta",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date());
                    const schedDate = o.schedule?.date || (o as any).scheduledDate || "";
                    const targetTab: WorkerTabType = (schedDate && schedDate > todayJakarta) ? "TERJADWAL" : "HARI_INI";
                    setToastMessage(`Penugasan diterima! Pesanan kini masuk ke tab ${targetTab === "HARI_INI" ? "Hari Ini" : "Terjadwal"}.`);
                    setActiveWorkerTab(targetTab);
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal menerima penugasan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else if (o.subStatus === "WORKER_ACCEPTED") {
                  setIsProcessing(true);
                  try {
                    await startTrip(o.id);
                    setToastMessage("Perjalanan menuju lokasi dimulai! Status diubah: Menuju Lokasi.");
                    setActiveWorkerTab("BERLANGSUNG");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal memulai perjalanan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else if (
                  o.subStatus === "WORKER_OTW" ||
                  o.visit?.status === "OTW" ||
                  o.visit?.status === "ON_THE_WAY"
                ) {
                  setIsProcessing(true);
                  try {
                    await arriveAtLocation(o.id);
                    setToastMessage("Status diubah: Telah Tiba di Lokasi. Silakan mulai pemeriksaan.");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal memperbarui status kedatangan.");
                  } finally {
                    setIsProcessing(false);
                  }
                } else {
                  router.push(`/worker/jobs/${o.id}`);
                }
              }}
            />
          ))
        )}
      </div>

      {/* Modal Konfirmasi Tolak Penugasan */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <XCircle size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    Tolak Penugasan Pekerjaan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order #{rejectingOrder.orderNumber} • {rejectingOrder.serviceSnapshot.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <p className="font-bold mb-1">Perhatian Teknisi:</p>
                <p>
                  Penolakan tugas akan mengembalikan pesanan ke antrean Provider agar dapat ditugaskan ke teknisi lain. Pelanggan tidak perlu melakukan pemesanan ulang.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">
                  Pilih Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {rejectionOptions.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition ${
                        rejectReason === opt
                          ? "border-rose-400 bg-rose-50/50 text-rose-950 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={opt}
                        checked={rejectReason === opt}
                        onChange={() => setRejectReason(opt)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tambahkan detail kendala operasional untuk pihak Provider..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isProcessing || !rejectReason}
                onClick={async () => {
                  if (!rejectingOrder) return;
                  setIsProcessing(true);
                  try {
                    const finalReason = rejectNotes.trim()
                      ? `${rejectReason}: ${rejectNotes.trim()}`
                      : rejectReason;
                    await rejectAssignment(rejectingOrder.id, finalReason);
                    setToastMessage(`Penugasan #${rejectingOrder.orderNumber} telah ditolak. Pesanan dikembalikan ke antrean Provider.`);
                    setRejectingOrder(null);
                    setActiveWorkerTab("RIWAYAT");
                  } catch (err: any) {
                    setToastMessage(err?.message || "Gagal menolak tugas.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle size={15} weight="bold" />
                <span>{isProcessing ? "Menolak..." : "Konfirmasi Tolak Tugas"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function WorkerAssignedJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Memuat ruang kerja teknisi SERVIO...
        </div>
      }
    >
      <WorkerJobsContent />
    </Suspense>
  );
}
