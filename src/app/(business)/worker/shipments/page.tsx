"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  CheckCircle,
  Package,
  ShieldCheck,
  User,
  ArrowRight,
  ArrowsClockwise,
  WarningCircle,
  Check,
  Storefront,
  X,
} from "@phosphor-icons/react";
import { useWorkerOperations, WorkerShipmentItem } from "@/features/worker/useWorkerOperations";
import { Toast } from "@/components/feedback/Toast";

function WorkerShipmentsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "SPAREPART" ? "SPAREPART" : "UNITS";
  const { shipments, updateShipmentStatus, merchantShipments } = useWorkerOperations();

  const [activeCategory, setActiveCategory] = useState<"SPAREPART" | "UNITS">(initialTab);
  const [filterType, setFilterType] = useState<"ALL" | "PICKUP" | "DELIVERY">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal handover confirmation
  const [selectedShipment, setSelectedShipment] = useState<WorkerShipmentItem | null>(null);
  const [conditionChecked, setConditionChecked] = useState(true);
  const [packagingChecked, setPackagingChecked] = useState(true);
  const [recipientName, setRecipientName] = useState("");

  const filteredUnitShipments = shipments.filter((s) => {
    if (filterType === "PICKUP") return s.type === "PICKUP_FROM_CUSTOMER";
    if (filterType === "DELIVERY") return s.type === "DELIVERY_TO_CUSTOMER";
    return true;
  });

  const handleProgression = (id: string, currentStatus: WorkerShipmentItem["status"]) => {
    if (currentStatus === "SCHEDULED") {
      updateShipmentStatus(id, "IN_TRANSIT");
      setToastMessage("Status: Kurir/Teknisi sedang dalam perjalanan!");
    } else if (currentStatus === "IN_TRANSIT") {
      updateShipmentStatus(id, "ARRIVED");
      setToastMessage("Status: Tiba di lokasi serah terima unit!");
    }
  };

  const handleOpenHandoverModal = (shipment: WorkerShipmentItem) => {
    setSelectedShipment(shipment);
    setRecipientName(shipment.customerName);
  };

  const handleConfirmHandover = () => {
    if (!selectedShipment) return;
    updateShipmentStatus(selectedShipment.id, "HANDED_OVER");
    setSelectedShipment(null);
    setToastMessage(
      `Surat serah terima unit #${selectedShipment.id} berhasil ditandatangani dan status ditutup selesai!`
    );
  };

  return (
    <div className="space-y-5 pb-20 max-w-xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/worker/dashboard"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition"
          >
            <ArrowLeft size={16} weight="bold" />
          </Link>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Logistik Lapangan
            </span>
            <h1 className="text-xl font-bold font-display text-slate-900 mt-0.5">
              Pengiriman & Logistik
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Pantau pengiriman suku cadang dari toko partner dan logistik serah terima unit pelanggan.
        </p>

        {/* Primary Segmented Category Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveCategory("SPAREPART")}
            className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeCategory === "SPAREPART"
                ? "bg-white text-[#0F4C81] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={16} weight="bold" />
            <span>Pesanan Sparepart Mitra</span>
            <span className="bg-sky-100 text-[#0F4C81] text-[10px] px-1.5 py-0.2 rounded-full">
              {merchantShipments.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("UNITS")}
            className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeCategory === "UNITS"
                ? "bg-white text-[#0F4C81] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck size={16} weight="bold" />
            <span>Unit Bengkel</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
              {shipments.length}
            </span>
          </button>
        </div>
      </div>

      {/* CATEGORY 1: SPAREPART SHIPMENTS (PHASE D9) */}
      {activeCategory === "SPAREPART" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700">
              Pengiriman Suku Cadang Aktif
            </span>
            <span className="text-[11px] text-slate-500">
              Terkait Pekerjaan Lapangan Anda
            </span>
          </div>

          {merchantShipments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
              Belum ada pesanan suku cadang yang sedang dikirimkan ke lokasi kerja Anda.
            </div>
          ) : (
            <div className="space-y-3.5">
              {merchantShipments.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F4C81] font-mono">
                          {s.awbNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.courier} • {s.serviceType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Order #{s.orderNumber}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        s.status === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "IN_TRANSIT"
                          ? "bg-sky-100 text-[#0F4C81] animate-pulse"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status === "DELIVERED"
                        ? "TIBA DI LOKASI"
                        : s.status === "IN_TRANSIT"
                        ? "SEDANG DIKIRIM"
                        : "DIPROSES TOKO"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User size={14} className="text-sky-600" />
                        Penerima: {s.customerName}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Estimasi: {s.estimatedDelivery}
                      </span>
                    </div>
                    <p className="text-slate-600 flex items-start gap-1 text-[11px]">
                      <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{s.shippingAddress}</span>
                    </p>
                  </div>

                  {/* Latest Checkpoint */}
                  {s.checkpoints && s.checkpoints.length > 0 && (
                    <div className="p-3 bg-sky-50/50 rounded-2xl border border-sky-100/80 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                        Update Terakhir Kurir:
                      </span>
                      <p className="font-semibold text-slate-800 text-[11px]">
                        {s.checkpoints[s.checkpoints.length - 1].location}
                      </p>
                      <p className="text-slate-500 text-[10px]">
                        {s.checkpoints[s.checkpoints.length - 1].note} •{" "}
                        {s.checkpoints[s.checkpoints.length - 1].timestamp}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Terkait Pekerjaan: <span className="font-mono font-bold text-slate-800">#job-102</span>
                    </span>
                    <Link
                      href="/worker/jobs/job-102"
                      className="px-3.5 py-1.5 rounded-xl bg-[#0F4C81] text-white font-bold text-xs hover:bg-sky-900 transition flex items-center gap-1.5"
                    >
                      <span>Buka Lembar Kerja</span>
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CATEGORY 2: WORKSHOP UNITS */}
      {activeCategory === "UNITS" && (
        <div className="space-y-4">
          {/* Sub Filter Tabs */}
          <div className="flex items-center gap-2 text-xs font-bold">
            {[
              { id: "ALL", label: "Semua Tugas" },
              { id: "PICKUP", label: "Penjemputan (Pickup)" },
              { id: "DELIVERY", label: "Pengantaran (Delivery)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`px-3 py-2 rounded-xl transition ${
                  filterType === tab.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Unit Shipments List */}
          <div className="space-y-3.5">
            {filteredUnitShipments.map((s) => {
              const isPickup = s.type === "PICKUP_FROM_CUSTOMER";
              const isCompleted = s.status === "HANDED_OVER";

              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-3xl border p-5 shadow-sm space-y-3 transition ${
                    s.status === "IN_TRANSIT"
                      ? "border-sky-300 ring-1 ring-sky-300"
                      : "border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPickup
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isPickup ? "JEMPUT UNIT DARI KLIEN" : "ANTAR KEMBALI KE KLIEN"}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{s.scheduledTime}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {s.unitModel}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        s.status === "HANDED_OVER"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : s.status === "IN_TRANSIT"
                          ? "bg-sky-50 text-[#0F4C81] border border-sky-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.status === "HANDED_OVER"
                        ? "SELESAI SERAH TERIMA"
                        : s.status === "IN_TRANSIT"
                        ? "DI JALAN"
                        : s.status === "ARRIVED"
                        ? "TIBA DI LOKASI"
                        : "MENUNGGU JADWAL"}
                    </span>
                  </div>

                  {/* Location & Customer Info */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <User size={15} className="text-sky-600" />
                        {s.customerName}
                      </span>
                      <a
                        href={`tel:${s.customerPhone}`}
                        className="text-[#0F4C81] font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Phone size={13} weight="fill" />
                        <span>{s.customerPhone}</span>
                      </a>
                    </div>
                    <p className="text-slate-600 flex items-start gap-1 text-[11px]">
                      <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{s.customerAddress}</span>
                    </p>
                    {s.notes && (
                      <p className="text-amber-800 text-[11px] pt-1 border-t border-slate-200/60 flex items-start gap-1">
                        <WarningCircle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                        <span>Instruksi: {s.notes}</span>
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    {!isCompleted ? (
                      s.status === "ARRIVED" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenHandoverModal(s)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle size={16} weight="bold" />
                          <span>Konfirmasi Serah Terima Barang</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleProgression(s.id, s.status)}
                          className="px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                        >
                          {s.status === "SCHEDULED" ? (
                            <>
                              <Truck size={16} weight="bold" />
                              <span>Mulai Jalan Antar/Jemput</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} weight="bold" />
                              <span>Tiba di Lokasi</span>
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={16} weight="fill" />
                        Unit Telah Diterima & Tercatat
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Handover Confirmation Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-slate-900 flex items-center gap-1.5">
                <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                Serah Terima Unit
              </h3>
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="font-bold text-slate-900">{selectedShipment.unitModel}</p>
                <p className="text-slate-500 text-[11px]">{selectedShipment.customerAddress}</p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={conditionChecked}
                    onChange={(e) => setConditionChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F4C81]"
                  />
                  <span>Kondisi fisik unit telah diinspeksi bersama klien</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={packagingChecked}
                    onChange={(e) => setPackagingChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F4C81]"
                  />
                  <span>Kemasan / pelindung unit terpasang rapi & aman</span>
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Penerima / Yang Menyerahkan:
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Tandatangani & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkerShipmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Memuat pengiriman...
        </div>
      }
    >
      <WorkerShipmentsContent />
    </Suspense>
  );
}
