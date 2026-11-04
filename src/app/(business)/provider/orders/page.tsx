"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardText,
  User,
  MapPin,
  CalendarBlank,
  ArrowRight,
  CheckCircle,
  Clock,
  WarningCircle,
  Wrench,
  Package,
  CurrencyCircleDollar,
  SlidersHorizontal,
  ShieldCheck,
  Tag,
  ArrowsClockwise,
  MagnifyingGlass,
  Buildings,
} from "@phosphor-icons/react";
import { useOrderJasa, ORDER_JASA_UPDATED_EVENT } from "@/features/order-jasa/hooks/useOrderJasa";
import { ServiceOrderCard } from "@/features/order-jasa/components/common/ServiceOrderCard";
import { ProviderTabType, ServiceOrder } from "@/features/order-jasa/types";
import { ProviderAssignWorkerModal } from "@/features/order-jasa/components/provider/ProviderAssignWorkerModal";
import { Toast } from "@/components/feedback/Toast";

export default function ProviderOrdersListPage() {
  const router = useRouter();
  const {
    orders: serviceOrders05B,
    providerOrdersByTab,
    providerTabCounts,
    assignWorker,
    refresh,
  } = useOrderJasa();

  const [activeProviderTab, setActiveProviderTab] = useState<ProviderTabType>("BOOKING_MASUK");
  const [searchQuery, setSearchQuery] = useState("");
  const [assigningOrder, setAssigningOrder] = useState<ServiceOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time synchronization across multi-role tabs
  useEffect(() => {
    refresh(true).catch(() => {});

    if (typeof window === "undefined") return;

    let debounceTimer: any = null;
    const triggerDebouncedSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refresh(true).catch(() => {});
      }, 300);
    };

    window.addEventListener(ORDER_JASA_UPDATED_EVENT, triggerDebouncedSync);

    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("servio_order_jasa_channel");
        channel.onmessage = () => {
          triggerDebouncedSync();
        };
      }
    } catch {}

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refresh(false).catch(() => {});
    }, 5000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener(ORDER_JASA_UPDATED_EVENT, triggerDebouncedSync);
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await refresh(true);
      const count = updated?.length ?? 0;
      setToastType("success");
      setToastMessage(`Data pesanan operasional berhasil disinkronkan (${count} pesanan).`);
    } catch (err: any) {
      setToastType("error");
      setToastMessage(err?.message || "Gagal menyinkronkan data pesanan dari server. Coba beberapa saat lagi.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const providerTabs: { id: ProviderTabType; label: string; count: number; alert?: boolean }[] = [
    {
      id: "BOOKING_MASUK",
      label: "Booking Masuk",
      count: providerTabCounts.BOOKING_MASUK,
      alert: providerTabCounts.BOOKING_MASUK > 0,
    },
    { id: "PENUGASAN", label: "Penugasan", count: providerTabCounts.PENUGASAN },
    { id: "BERLANGSUNG", label: "Berlangsung", count: providerTabCounts.BERLANGSUNG },
    { id: "SELESAI", label: "Selesai", count: providerTabCounts.SELESAI },
    { id: "BATAL", label: "Batal", count: providerTabCounts.BATAL },
  ];

  const filtered05BProviderOrders = useMemo(() => {
    const list = providerOrdersByTab[activeProviderTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.serviceSnapshot.title.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.assignment?.workerName?.toLowerCase().includes(q) ||
        o.addressSnapshot.district?.toLowerCase().includes(q) ||
        o.addressSnapshot.city.toLowerCase().includes(q)
    );
  }, [providerOrdersByTab, activeProviderTab, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-body">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-servio-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-lg shadow-3xs">
              <Buildings size={26} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
                  Manajemen Pesanan Jasa Mitra
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F4C81] text-white tracking-wider">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pusat pengawasan operasional pesanan servis: Penugasan teknisi, monitoring progres survei/reparasi, pengawalan pembayaran pengerjaan, dan riwayat pesanan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-bold ${
                isRefreshing ? "opacity-70 cursor-not-allowed" : "hover:text-[#0F4C81]"
              }`}
              title="Perbarui Data Pesanan"
            >
              <ArrowsClockwise
                size={15}
                className={isRefreshing ? "animate-spin text-[#0F4C81]" : ""}
              />
              <span>{isRefreshing ? "Menyinkronkan..." : "Sinkron"}</span>
            </button>
            <Link
              href="/provider/spay"
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              S-Pay Mitra
            </Link>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Booking Masuk</span>
            <span className="text-base font-bold text-amber-700 font-heading">
              {providerTabCounts.BOOKING_MASUK} Reservasi
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Perlu Penugasan</span>
            <span className="text-base font-bold text-purple-700 font-heading">
              {providerTabCounts.PENUGASAN} Order
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Sedang Berlangsung</span>
            <span className="text-base font-bold text-[#0F4C81] font-heading">
              {providerTabCounts.BERLANGSUNG} Servis
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] text-slate-500 block">Order Selesai</span>
            <span className="text-base font-bold text-emerald-700 font-heading">
              {providerTabCounts.SELESAI} Selesai
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
            placeholder="Cari Service Order ID (#SRV-ORD), nama pelanggan, teknisi yang bertugas, atau layanan..."
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

      {/* 5 CANONICAL PROVIDER TABS (SECTION 19) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {providerTabs.map((tab) => {
          const isActive = activeProviderTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveProviderTab(tab.id)}
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

      {/* LIST OF SERVICE ORDER CARDS (PROVIDER VIEW) */}
      <div className="space-y-4">
        {filtered05BProviderOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-500 space-y-2 shadow-2xs">
            <ClipboardText size={36} className="mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-slate-800 text-sm">
              Tidak ada pesanan pada tab {providerTabs.find((t) => t.id === activeProviderTab)?.label}.
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              {searchQuery
                ? `Tidak ditemukan pesanan yang sesuai dengan kata pencarian "${searchQuery}".`
                : "Saat pelanggan melakukan pemesanan dan diagnosis terkonfirmasi, pesanan baru akan masuk di tab Booking Masuk."}
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
          filtered05BProviderOrders.map((order) => (
            <ServiceOrderCard
              key={order.id}
              order={order}
              role="PROVIDER"
              onPrimaryAction={(o) => {
                if (o.subStatus === "UNASSIGNED" || o.subStatus === "ASSIGNED_PENDING") {
                  setAssigningOrder(o);
                } else {
                  router.push(`/provider/orders/${o.id}`);
                }
              }}
            />
          ))
        )}
      </div>

      {assigningOrder && (
        <ProviderAssignWorkerModal
          isOpen={!!assigningOrder}
          onClose={() => setAssigningOrder(null)}
          order={assigningOrder}
          onConfirmAssign={async (workerId, workerName, workerPhone) => {
            try {
              await assignWorker(assigningOrder.id, workerId, workerName, workerPhone);
              setToastType("success");
              setToastMessage(`Teknisi ${workerName} berhasil ditugaskan! Pesanan masuk ke tab Penugasan.`);
              setActiveProviderTab("PENUGASAN");
              await refresh(true);
            } catch (err: any) {
              setToastType("error");
              setToastMessage(err?.message || "Gagal menugaskan teknisi.");
            } finally {
              setAssigningOrder(null);
            }
          }}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
