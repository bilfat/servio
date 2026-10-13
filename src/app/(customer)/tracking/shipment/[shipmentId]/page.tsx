"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  Package,
  MapPin,
  CheckCircle,
  Copy,
  Clock,
  User,
  Phone,
  WarningOctagon,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";
import { shipmentsApi } from "@/lib/servioApi";

export default function ShipmentTrackingPage() {
  const params = useParams();
  const shipmentId = (params?.shipmentId as string) || "JNE-REG-0988127391";

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTracking() {
      setLoading(true);
      try {
        const res = await shipmentsApi.getTracking(shipmentId);
        if (res && res.data && isMounted) {
          setTrackingData(res.data);
        }
      } catch (err) {
        console.warn("Could not fetch server shipment tracking:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadTracking();
    return () => {
      isMounted = false;
    };
  }, [shipmentId]);

  const displayData = {
    trackingNumber: trackingData?.trackingNumber || shipmentId,
    courier: trackingData?.carrierName || trackingData?.carrierCode || "JNE Express (Reguler)",
    status: trackingData?.status || "IN_TRANSIT",
    sender: trackingData?.origin?.name || trackingData?.sender || "Gudang Penjual Resmi SERVIO",
    destination: trackingData?.destination?.recipientName || "Alamat Pembeli",
    driverName: trackingData?.driverName || "Kurir Pengantar",
    driverPhone: trackingData?.driverPhone || "0812-9988-7711",
    events: trackingData?.events || [],
    pod: trackingData?.pod || trackingData?.proofOfDelivery || null,
  };

  const handleCopyResi = () => {
    navigator.clipboard?.writeText(displayData.trackingNumber);
    setToastMessage("Nomor resi berhasil disalin!");
  };

  const getStatusBadge = (st: string) => {
    switch (st?.toUpperCase()) {
      case "DELIVERED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle size={16} weight="fill" className="text-emerald-600" />
            Tiba di Tujuan (DELIVERED)
          </span>
        );
      case "IN_TRANSIT":
      case "SHIPPED":
      case "ON_DELIVERY":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <Truck size={16} weight="duotone" />
            Dalam Perjalanan
          </span>
        );
      case "PREPARED":
      case "CREATED":
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5">
            <Package size={16} weight="duotone" />
            Siap Dikirim
          </span>
        );
      default:
        return (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Pelacakan Ekspedisi Resmi
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Lacak Resi Pengiriman
              </h1>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">#{shipmentId}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0F4C81]">{displayData.courier}</span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500">{displayData.trackingNumber}</span>
              <button
                type="button"
                onClick={handleCopyResi}
                className="p-1 hover:text-[#0F4C81] text-slate-400"
              >
                <Copy size={14} />
              </button>
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 mt-1">
              {displayData.status === "DELIVERED"
                ? "Paket Telah Tiba dan Diterima"
                : "Paket Sedang Diantar ke Alamat Anda"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tujuan: {displayData.destination}
            </p>
          </div>

          <div className="self-start sm:self-auto">
            {getStatusBadge(displayData.status)}
          </div>
        </div>

        {/* Proof of Delivery Card if available */}
        {displayData.pod && (
          <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                Bukti Pengiriman Berhasil (Proof of Delivery)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                DELIVERED
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Penerima Paket:</span>
                <span className="font-bold text-slate-900">
                  {displayData.pod.receiverName || "Yang Bersangkutan"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Waktu Penyerahan:</span>
                <span className="font-bold text-slate-900">
                  {displayData.pod.deliveredAt
                    ? new Date(displayData.pod.deliveredAt).toLocaleString("id-ID")
                    : "-"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Catatan / Referensi:</span>
                <span className="font-bold text-slate-900">
                  {displayData.pod.evidenceReference || displayData.pod.notes || "Diterima"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Checkpoint Timeline */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 pb-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={18} weight="duotone" className="text-[#0F4C81]" />
            Riwayat Titik Singgah (Manifest Checkpoint)
          </h3>

          {displayData.events.length > 0 ? (
            <div className="space-y-6 pl-4 border-l-2 border-slate-100">
              {displayData.events.map((cp: any, idx: number) => (
                <div key={idx} className="relative pl-6">
                  <div
                    className={`absolute -left-[25px] top-0.5 w-4 h-4 rounded-full border-2 bg-white ${
                      idx === 0
                        ? "border-[#0F4C81] ring-4 ring-sky-100"
                        : "border-slate-300"
                    }`}
                  />
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">
                      {cp.timestamp ? new Date(cp.timestamp).toLocaleString("id-ID") : cp.time || "-"}
                    </span>
                    <p className="text-xs font-bold text-slate-900">{cp.location || "Pusat Distribusi"}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{cp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs space-y-1 bg-slate-50 rounded-2xl">
              <Truck size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">Belum ada titik singgah manifest yang tercatat.</p>
              <p className="text-[11px] text-slate-400">
                Resi pengiriman telah diterbitkan dan sedang dalam persiapan penjemputan oleh kurir {displayData.courier}.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Paket rusak atau ada kendala pengiriman?</span>
            <Link
              href={`/orders`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4C81] hover:underline"
            >
              <WarningOctagon size={14} weight="bold" />
              Bantuan Pelanggan
            </Link>
          </div>
        </div>
      </div>

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
