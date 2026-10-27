"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  ClipboardText,
  MagnifyingGlass,
  CheckCircle,
  Package,
  Clock,
  User,
  MapPin,
  Eye,
  Sparkle,
  Truck,
  ArrowsClockwise,
  ArrowSquareOut,
  Funnel,
  Buildings,
  Wrench,
  ShieldCheck,
  WarningCircle,
  Info,
  ClockCounterClockwise,
  X,
} from "@phosphor-icons/react";
import { useOrderBarang } from "@/features/order-barang/hooks/useOrderBarang";
import { MockMerchantOrder, DeliveryMethod, DeliveryProvider } from "@/types/order-barang";
import { MerchantOrderCard } from "@/features/order-barang/components/MerchantOrderCard";
import {
  ConfigureDeliveryModal,
  RecordDeliveredModal,
  DeliveryFailedModal,
  RespondCancellationModal,
  OperationalCancelModal,
  MerchantOrderDetailModal,
} from "@/features/order-barang/components/MerchantFulfillmentModals";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { formatDateTimeIndo } from "@/features/order-barang/helpers";

type MerchantTab = "BELUM_BAYAR" | "MASUK" | "DIPROSES" | "DIKIRIM" | "TIBA" | "SELESAI" | "BATAL";

function MerchantOrdersContent() {
  const {
    merchantOrders,
    merchantOrdersByTab,
    merchantProcessOrder,
    merchantPackOrder,
    merchantSetupDelivery,
    merchantStartDelivery,
    merchantMarkDeliveryFailed,
    merchantRetryDelivery,
    merchantConfirmDelivered,
    respondCancellation,
    cancelOperationalMerchantOrder,
    currentTime,
    isLoadingBackend,
    hasLoadedBackend,
    syncBackendOrders,
  } = useOrderBarang();

  const [activeTab, setActiveTab] = useState<MerchantTab>("MASUK");
  const [diprosesSubFilter, setDiprosesSubFilter] = useState<"ALL" | "PENDING_DECISION">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  React.useEffect(() => {
    if (merchantOrders.length === 0 && !hasLoadedBackend) {
      setInitialLoading(true);
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setInitialLoading(false);
    }
  }, [merchantOrders.length, hasLoadedBackend]);

  const handleTabChange = (tabId: MerchantTab) => {
    if (tabId === activeTab) return;
    setActiveTab(tabId);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await syncBackendOrders();
      setToastMessage("Data pesanan berhasil dimuat ulang.");
      setToastType("success");
    } catch {
      setToastMessage("Gagal memuat ulang data pesanan.");
      setToastType("error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Modals state
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForRecordDelivered, setSelectedOrderForRecordDelivered] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForFailed, setSelectedOrderForFailed] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForCancellation, setSelectedOrderForCancellation] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForOperationalCancel, setSelectedOrderForOperationalCancel] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<MockMerchantOrder | null>(null);
  const [previewProofPhoto, setPreviewProofPhoto] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">("success");

  // Tab configurations
  const tabs: { id: MerchantTab; label: string; count: number; alert?: boolean }[] = [
    {
      id: "BELUM_BAYAR",
      label: "Belum Bayar",
      count: merchantOrdersByTab.BELUM_BAYAR?.length || 0,
      alert: false,
    },
    {
      id: "MASUK",
      label: "Masuk",
      count: merchantOrdersByTab.MASUK.length,
      alert: merchantOrdersByTab.MASUK.length > 0,
    },
    {
      id: "DIPROSES",
      label: "Diproses",
      count: merchantOrdersByTab.DIPROSES.length,
      alert: merchantOrdersByTab.DIPROSES.some((o) => o.cancellationRequest?.status === "PENDING"),
    },
    {
      id: "DIKIRIM",
      label: "Dikirim",
      count: merchantOrdersByTab.DIKIRIM.length,
      alert: merchantOrdersByTab.DIKIRIM.some((o) => o.delivery.deliveryStatus === "FAILED"),
    },
    {
      id: "TIBA",
      label: "Tiba di Tujuan",
      count: merchantOrdersByTab.TIBA.length,
      alert: merchantOrdersByTab.TIBA.length > 0,
    },
    {
      id: "SELESAI",
      label: "Selesai",
      count: merchantOrdersByTab.SELESAI.length,
    },
    {
      id: "BATAL",
      label: "Batal",
      count: merchantOrdersByTab.BATAL.length,
    },
  ];

  const pendingCancellationCount = useMemo(() => {
    return merchantOrdersByTab.DIPROSES.filter((o) => o.cancellationRequest?.status === "PENDING").length;
  }, [merchantOrdersByTab.DIPROSES]);

  // Filtered orders for current active tab
  const currentOrders = useMemo(() => {
    let list = merchantOrdersByTab[activeTab] || [];
    if (activeTab === "DIPROSES" && diprosesSubFilter === "PENDING_DECISION") {
      list = list.filter((o) => o.cancellationRequest?.status === "PENDING");
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.shippingAddressSnapshot.recipientName.toLowerCase().includes(q) ||
        (o.delivery.trackingNumber || "").toLowerCase().includes(q) ||
        o.items.some((it) => it.title.toLowerCase().includes(q))
    );
  }, [merchantOrdersByTab, activeTab, diprosesSubFilter, searchQuery]);

  return (
    <div className="w-full pb-16 font-body space-y-3.5">
      {/* Top Header */}
      <div className="w-full bg-white border-b border-slate-200/80 px-4 sm:px-6 pt-3 pb-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <ClipboardText size={18} weight="bold" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                Pesanan Toko
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pemenuhan pesanan toko, konfirmasi pesanan lunas, pengemasan, dan pilihan kurir pengiriman.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isLoadingBackend || isRefreshing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-2xs shrink-0 cursor-pointer disabled:opacity-60"
              title="Muat ulang data pesanan toko dari server"
            >
              <ArrowsClockwise
                size={15}
                className={`text-blue-600 ${(isLoadingBackend || isRefreshing) ? "animate-spin" : ""}`}
              />
              <span>{(isLoadingBackend || isRefreshing) ? "Memuat Data..." : "Muat Data"}</span>
            </button>
            <Link
              href="/merchant/shipping-settings"
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
            >
              <Truck size={15} className="text-blue-600" />
              <span>Pengaturan Ongkir</span>
            </Link>
          </div>
        </div>

        {/* 5 CANONICAL MERCHANT TABS */}
        <div className="flex items-center gap-1.5 -mb-px overflow-x-auto pb-1.5 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border cursor-pointer ${
                  isActive
                    ? tab.alert
                      ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs font-extrabold"
                      : "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-extrabold"
                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? tab.alert
                        ? "bg-amber-200/80 text-amber-900"
                        : "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subtabs for DIPROSES: Menunggu Keputusan Pembatalan */}
        {activeTab === "DIPROSES" && (
          <div className="flex items-center gap-2 pt-2 pb-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDiprosesSubFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                diprosesSubFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Diproses ({merchantOrdersByTab.DIPROSES.length})
            </button>
            <button
              type="button"
              onClick={() => setDiprosesSubFilter("PENDING_DECISION")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                diprosesSubFilter === "PENDING_DECISION"
                  ? "bg-amber-600 text-white"
                  : pendingCancellationCount > 0
                  ? "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <WarningCircle size={14} weight="bold" />
              <span>Menunggu Keputusan Pembatalan</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                diprosesSubFilter === "PENDING_DECISION" ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
              }`}>
                {pendingCancellationCount}
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="w-full px-4 sm:px-6 py-3 space-y-3">
        {/* Search Bar */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari ID order (#ORD-MC-...), nama penerima, suku cadang, atau nomor resi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Content List of Orders */}
        {(initialLoading || (isLoadingBackend && !hasLoadedBackend) || isRefreshing) ? (
          <div className="space-y-3 animate-fade-in">
            {/* Loading Indicator Banner */}
            <div className="flex items-center justify-between gap-2 p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <ArrowsClockwise size={15} className="animate-spin text-blue-600" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block leading-tight">Memuat Data Pesanan Toko</span>
                  <span className="text-[11px] text-slate-500">Sinkronisasi status pesanan dan transaksi terkini dari server...</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-100 text-blue-600 shadow-3xs shrink-0">
                Memuat Data...
              </span>
            </div>

            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 animate-pulse space-y-3.5 shadow-2xs"
              >
                <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-28 bg-slate-200 rounded-md" />
                    <div className="h-4 w-16 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-5 w-24 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="h-4 w-2/5 bg-slate-200 rounded-md" />
                    <div className="h-3 w-1/4 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-4 w-20 bg-slate-200 rounded-md shrink-0" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-3 w-40 bg-slate-100 rounded-md" />
                  <div className="h-8 w-24 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : currentOrders.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pesanan pada Tab Ini"
            description={
              searchQuery
                ? "Tidak ditemukan pesanan yang sesuai dengan kata kunci pencarian Anda."
                : activeTab === "BELUM_BAYAR"
                ? "Belum ada pesanan yang sedang menunggu pembayaran customer."
                : activeTab === "MASUK"
                ? "Belum ada pesanan lunas baru yang menunggu diproses."
                : activeTab === "DIPROSES"
                ? "Tidak ada pesanan yang sedang dipersiapkan atau menunggu pengiriman."
                : activeTab === "DIKIRIM"
                ? "Tidak ada pesanan yang sedang berada dalam perjalanan kurir."
                : activeTab === "TIBA"
                ? "Belum ada pesanan yang tiba di tujuan dan menunggu konfirmasi penerimaan pelanggan."
                : activeTab === "SELESAI"
                ? "Belum ada riwayat pesanan yang telah selesai diserahterimakan."
                : activeTab === "BATAL"
                ? "Tidak ada pesanan toko yang dibatalkan."
                : "Belum ada pesanan masuk untuk toko ini."
            }
            action={
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isLoadingBackend || isRefreshing}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <ArrowsClockwise size={14} className={(isLoadingBackend || isRefreshing) ? "animate-spin" : ""} />
                <span>{(isLoadingBackend || isRefreshing) ? "Memuat Data..." : "Periksa & Muat Ulang Data"}</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {currentOrders.map((order) => (
              <MerchantOrderCard
                key={order.id}
                order={order}
                currentTime={currentTime}
                onViewDetail={(ord) => setSelectedOrderForDetail(ord)}
                onStartProcessing={(ord) => {
                  merchantProcessOrder(ord.id);
                  setActiveTab("DIPROSES");
                  setToastMessage(`Pesanan #${ord.orderNumber} mulai diproses (pindah ke tab Diproses).`);
                  setToastType("success");
                }}
                onCancelOperational={(ord) => setSelectedOrderForOperationalCancel(ord)}
                onPackOrder={(ord) => {
                  merchantPackOrder(ord.id);
                  setToastMessage(`Pesanan #${ord.orderNumber} selesai dikemas & siap diatur pengirimannya.`);
                  setToastType("success");
                }}
                onConfigureDelivery={(ord) => setSelectedOrderForDelivery(ord)}
                onRespondCancellation={(ord) => setSelectedOrderForCancellation(ord)}
                onRecordDelivered={(ord) => setSelectedOrderForRecordDelivered(ord)}
                onMarkDeliveryFailed={(ord) => setSelectedOrderForFailed(ord)}
                onRetryDelivery={(ord) => {
                  merchantRetryDelivery(ord.id);
                  setToastMessage(`Percobaan pengiriman ulang dijadwalkan untuk pesanan #${ord.orderNumber}.`);
                  setToastType("success");
                }}
                onViewProof={(ord) => setSelectedOrderForProof(ord)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <ConfigureDeliveryModal
        order={selectedOrderForDelivery}
        isOpen={!!selectedOrderForDelivery}
        onClose={() => setSelectedOrderForDelivery(null)}
        onStartDelivery={(
          orderId,
          courierMethod,
          courierProvider,
          courierName,
          courierPhone,
          trackingNumber,
          trackingUrl,
          deliveryNotes
        ) => {
          merchantSetupDelivery(orderId, {
            courierMethod,
            provider: courierProvider,
            courierName,
            courierPhone,
            trackingReference: trackingNumber,
            trackingUrl: trackingUrl,
            deliveryNotes,
          });
          merchantStartDelivery(orderId);
          setSelectedOrderForDelivery(null);
          setActiveTab("DIKIRIM");
          setToastMessage("Pengiriman telah dimulai! Pesanan kini berada di tab Dikirim.");
          setToastType("success");
        }}
      />

      <RecordDeliveredModal
        order={selectedOrderForRecordDelivered}
        isOpen={!!selectedOrderForRecordDelivered}
        onClose={() => setSelectedOrderForRecordDelivered(null)}
        onConfirm={(orderId, receivedBy, proofType, notes, photoUrl) => {
          merchantConfirmDelivered(orderId, receivedBy, proofType, notes, photoUrl);
          setSelectedOrderForRecordDelivered(null);
          setActiveTab("TIBA");
          setToastMessage("Penerimaan barang berhasil dicatat! Pesanan berpindah ke tab 'Tiba di Tujuan' menunggu konfirmasi pelanggan.");
          setToastType("success");
        }}
      />

      <DeliveryFailedModal
        order={selectedOrderForFailed}
        isOpen={!!selectedOrderForFailed}
        onClose={() => setSelectedOrderForFailed(null)}
        onConfirm={(orderId, failureReason) => {
          merchantMarkDeliveryFailed(orderId, failureReason);
          setSelectedOrderForFailed(null);
          setToastMessage("Status kendala pengiriman telah dicatat.");
          setToastType("warning");
        }}
      />

      <RespondCancellationModal
        order={selectedOrderForCancellation}
        isOpen={!!selectedOrderForCancellation}
        onClose={() => setSelectedOrderForCancellation(null)}
        onDecision={(orderId, approved, rejectionReason) => {
          respondCancellation(orderId, approved ? "APPROVED" : "REJECTED", rejectionReason);
          setSelectedOrderForCancellation(null);
          if (approved) {
            setActiveTab("BATAL");
            setToastMessage("Pengajuan pembatalan disetujui. Pesanan dibatalkan & refund 100% diproses.");
            setToastType("success");
          } else {
            setToastMessage("Pengajuan pembatalan ditolak. Anda dapat melanjutkan proses pengemasan.");
            setToastType("warning");
          }
        }}
      />

      <OperationalCancelModal
        order={selectedOrderForOperationalCancel}
        isOpen={!!selectedOrderForOperationalCancel}
        onClose={() => setSelectedOrderForOperationalCancel(null)}
        onConfirm={(orderId, reason) => {
          cancelOperationalMerchantOrder(orderId, reason);
          setSelectedOrderForOperationalCancel(null);
          setActiveTab("BATAL");
          setToastMessage("Pesanan berhasil dibatalkan. Pelanggan akan menerima refund penuh 100%.");
          setToastType("success");
        }}
      />

      <MerchantOrderDetailModal
        order={selectedOrderForDetail}
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        currentTime={currentTime}
        onStartProcessing={(o) => {
          merchantProcessOrder(o.id);
          setActiveTab("DIPROSES");
          setToastMessage(`Pesanan #${o.orderNumber} sedang diproses.`);
          setToastType("success");
        }}
        onCancelOperational={(o) => setSelectedOrderForOperationalCancel(o)}
        onPackOrder={(o) => {
          merchantPackOrder(o.id);
          setToastMessage(`Pesanan #${o.orderNumber} selesai dikemas. Siap kirim!`);
          setToastType("success");
        }}
        onConfigureDelivery={(o) => setSelectedOrderForDelivery(o)}
        onRespondCancellation={(o) => setSelectedOrderForCancellation(o)}
        onRecordDelivered={(o) => setSelectedOrderForRecordDelivered(o)}
        onMarkDeliveryFailed={(o) => setSelectedOrderForFailed(o)}
        onRetryDelivery={(o) => setSelectedOrderForDelivery(o)}
        onViewProof={(o) => setSelectedOrderForProof(o)}
      />

      {/* Proof of Delivery Summary Modal (4 Items Saved & Displayed) */}
      {selectedOrderForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200/90 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <CheckCircle size={24} weight="bold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Bukti Serah Terima Paket (POD)
                  </h3>
                  <p className="text-xs text-slate-500">#{selectedOrderForProof.orderNumber} • 4 Item Tersimpan di Database</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForProof(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              {/* Item 1: Nama Penerima */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">1. Nama Penerima Barang:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedOrderForProof.delivery.recipientReceivedBy || selectedOrderForProof.delivery.deliveredToName || selectedOrderForProof.shippingAddressSnapshot.recipientName}
                </span>
              </div>

              {/* Item 2: Hubungan / Jenis Bukti */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
                <span className="font-semibold text-slate-800 bg-teal-50 px-2 py-0.5 rounded text-[11px] text-teal-800 border border-teal-200">
                  {selectedOrderForProof.delivery.proofType || "Foto Serah Terima Paket"}
                </span>
              </div>

              {/* Waktu Penyerahan */}
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Waktu Penyerahan:</span>
                <span className="font-mono text-slate-700">
                  {selectedOrderForProof.delivery.deliveredAt
                    ? formatDateTimeIndo(selectedOrderForProof.delivery.deliveredAt)
                    : "Baru saja"}
                </span>
              </div>

              {/* Item 3: Catatan Penyerahan */}
              {selectedOrderForProof.delivery.deliveredNotes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">3. Catatan Penyerahan:</span>
                  <p className="text-slate-800 italic bg-white p-2.5 rounded-xl border border-slate-200/80">
                    &ldquo;{selectedOrderForProof.delivery.deliveredNotes}&rdquo;
                  </p>
                </div>
              )}

              {/* Item 4: Foto Bukti Paket */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">4. Foto Bukti Paket Sampai:</span>
                {selectedOrderForProof.delivery.proofPhotoUrl ? (
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setPreviewProofPhoto(selectedOrderForProof.delivery.proofPhotoUrl || null)}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white cursor-pointer hover:border-teal-400 transition"
                      title="Klik untuk memperbesar foto bukti"
                    >
                      <img
                        src={selectedOrderForProof.delivery.proofPhotoUrl}
                        alt="Bukti Serah Terima"
                        className="w-full h-44 object-cover group-hover:scale-102 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                        <Eye size={18} weight="bold" />
                        <span>Klik untuk Perbesar Gambar</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      * Klik foto di atas untuk membuka popup gambar berukuran penuh.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                    <Info size={14} weight="bold" className="text-amber-700 shrink-0" />
                    <span>Foto bukti fisik tidak dilampirkan oleh kurir saat konfirmasi.</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Catatan: Ke-4 item di atas tersimpan dalam database pesanan dan ditampilkan langsung kepada pelanggan di halaman detail pesanan. Pesanan akan otomatis selesai (COMPLETED) setelah 48 jam jika tidak ada komplain.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForProof(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Bukti Penyerahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Popup: Perbesar Gambar Bukti Paket Sampai */}
      {previewProofPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewProofPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200/90 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} weight="bold" className="text-teal-600" />
                <span className="font-bold text-slate-900 text-xs">
                  Foto Bukti Serah Terima Paket (Proof of Delivery / POD)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProofPhoto(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewProofPhoto}
                alt="Foto Bukti Paket Sampai"
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewProofPhoto(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType as any}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default function MerchantOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Pesanan Toko...</div>}>
      <MerchantOrdersContent />
    </Suspense>
  );
}
