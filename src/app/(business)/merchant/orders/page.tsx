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
  Storefront,
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

type MerchantTab = "MASUK" | "DIPROSES" | "DIKIRIM" | "SELESAI" | "BATAL";

function MerchantOrdersContent() {
  const {
    merchantOrders,
    merchantOrdersByTab,
    activeMerchant,
    activeMerchantId,
    merchants,
    switchMerchantContext,
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
  } = useOrderBarang();

  const [activeTab, setActiveTab] = useState<MerchantTab>("MASUK");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForRecordDelivered, setSelectedOrderForRecordDelivered] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForFailed, setSelectedOrderForFailed] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForCancellation, setSelectedOrderForCancellation] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForOperationalCancel, setSelectedOrderForOperationalCancel] = useState<MockMerchantOrder | null>(null);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<MockMerchantOrder | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "warning">("success");

  // Tab configurations
  const tabs: { id: MerchantTab; label: string; count: number; alert?: boolean }[] = [
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

  // Filtered orders for current active tab
  const currentOrders = useMemo(() => {
    const list = merchantOrdersByTab[activeTab] || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.shippingAddressSnapshot.recipientName.toLowerCase().includes(q) ||
        (o.delivery.trackingNumber || "").toLowerCase().includes(q) ||
        o.items.some((it) => it.title.toLowerCase().includes(q))
    );
  }, [merchantOrdersByTab, activeTab, searchQuery]);

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
                Pesanan Masuk Toko
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pemenuhan pesanan suku cadang toko, konfirmasi pesanan lunas, pengemasan, dan pilihan kurir lokal.
            </p>
          </div>

          {/* Active Merchant Context Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center gap-2">
              <Storefront size={17} className="text-blue-600 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">
                  Toko Aktif (Merchant Scope):
                </span>
                <select
                  value={activeMerchantId}
                  onChange={(e) => switchMerchantContext(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {Object.values(merchants).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Link
              href="/merchant/shipping-settings"
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
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
                onClick={() => setActiveTab(tab.id)}
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
        {currentOrders.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pesanan pada Tab Ini"
            description={
              searchQuery
                ? "Tidak ditemukan pesanan yang sesuai dengan kata kunci pencarian Anda."
                : activeTab === "MASUK"
                ? "Belum ada pesanan lunas baru yang menunggu diproses."
                : activeTab === "DIPROSES"
                ? "Tidak ada pesanan yang sedang dipersiapkan atau menunggu pengiriman."
                : activeTab === "DIKIRIM"
                ? "Tidak ada pesanan yang sedang berada dalam perjalanan kurir."
                : activeTab === "SELESAI"
                ? "Belum ada riwayat pesanan yang telah selesai diserahterimakan."
                : activeTab === "BATAL"
                ? "Tidak ada pesanan toko yang dibatalkan."
                : "Belum ada pesanan masuk untuk toko ini."
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
          deliveryNotes
        ) => {
          merchantSetupDelivery(orderId, {
            method: courierMethod,
            provider: courierProvider,
            courierName,
            courierPhone,
            trackingUrl: trackingNumber,
            deliveryNote: deliveryNotes,
          });
          merchantStartDelivery(orderId);
          setSelectedOrderForDelivery(null);
          setToastMessage("Pengiriman telah dimulai! Pesanan kini berada di tab Dikirim.");
          setToastType("success");
        }}
      />

      <RecordDeliveredModal
        order={selectedOrderForRecordDelivered}
        isOpen={!!selectedOrderForRecordDelivered}
        onClose={() => setSelectedOrderForRecordDelivered(null)}
        onConfirm={(orderId, receivedBy, notes) => {
          merchantConfirmDelivered(orderId, { receivedBy, note: notes });
          setSelectedOrderForRecordDelivered(null);
          setToastMessage("Penerimaan barang berhasil dicatat! Menunggu konfirmasi pelanggan (48 jam auto-selesai).");
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
          respondCancellation(orderId, approved ? "APPROVE" : "REJECT", rejectionReason);
          setSelectedOrderForCancellation(null);
          if (approved) {
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
          setToastMessage("Pesanan berhasil dibatalkan. Pelanggan akan menerima refund penuh 100%.");
          setToastType("success");
        }}
      />

      <MerchantOrderDetailModal
        order={selectedOrderForDetail}
        isOpen={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
      />

      {/* Proof of Delivery Summary Modal */}
      {selectedOrderForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <CheckCircle size={22} weight="bold" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    Bukti Serah Terima Paket
                  </h3>
                  <p className="text-xs text-slate-500">#{selectedOrderForProof.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForProof(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Penerima yang Sah:</span>
                <span className="font-bold text-slate-900">
                  {selectedOrderForProof.delivery.recipientReceivedBy || selectedOrderForProof.shippingAddressSnapshot.recipientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Penyerahan:</span>
                <span className="font-mono text-slate-700">
                  {selectedOrderForProof.delivery.deliveredAt
                    ? formatDateTimeIndo(selectedOrderForProof.delivery.deliveredAt)
                    : "Baru saja"}
                </span>
              </div>
              {selectedOrderForProof.delivery.deliveredNotes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Catatan Penyerahan:</span>
                  <p className="text-slate-700 italic">&ldquo;{selectedOrderForProof.delivery.deliveredNotes}&rdquo;</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Catatan: Pesanan DELIVERED akan selesai otomatis (COMPLETED) setelah 48 jam jika tidak ada komplain yang diajukan oleh pelanggan.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForProof(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup
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
