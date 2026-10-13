"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Truck,
  MapPin,
  CheckCircle,
  ClockCountdown,
  Copy,
  Receipt,
  ShieldCheck,
  WarningCircle,
  XCircle,
  Package,
} from "@phosphor-icons/react";
import { returnsApi } from "@/lib/servioApi";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Toast } from "@/components/feedback/Toast";

export default function ReturnDetailPage() {
  const params = useParams();
  const returnId = (params?.returnId as string) || "ret-701";

  const [returnItem, setReturnItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchReturn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await returnsApi.get(returnId);
      if (res && res.data) {
        setReturnItem(res.data);
      }
    } catch (err: any) {
      setError(err?.message || "Gagal memuat detail pengajuan retur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [returnId]);

  const warehouseAddress =
    "Gudang Sentra Servio QC, Komplek Pergudangan Daan Mogot Blok C No. 4, Kalideres, Jakarta Barat 11840 (UP: Tim Retur Servio)";

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(warehouseAddress);
    setToastMessage("Alamat gudang pengembalian berhasil disalin!");
  };

  const [submittingTracking, setSubmittingTracking] = useState(false);

  const handleSubmitTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName || !trackingNumber) return;
    try {
      setSubmittingTracking(true);
      await returnsApi.ship(returnId, {
        courierName,
        trackingNumber,
      });
      setToastMessage("Nomor resi kirim balik berhasil disimpan!");
      await fetchReturn();
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal menyimpan nomor resi.");
    } finally {
      setSubmittingTracking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 flex items-center justify-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0F4C81] animate-ping" />
          <span>Memuat berkas pengajuan retur resmi...</span>
        </div>
      </div>
    );
  }

  const currentStatus = returnItem?.status || "REQUESTED";
  const displayId = returnItem?.returnNumber || returnItem?.returnId || returnId;
  const resolution = returnItem?.resolution;
  const refund = returnItem?.refund;
  const inspection = returnItem?.inspection;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/returns"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
              aria-label="Kembali ke Daftar Retur"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    currentStatus === "APPROVED" || currentStatus === "WAITING_RETURN"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : currentStatus === "RESOLVED"
                      ? "text-purple-700 bg-purple-50 border-purple-200"
                      : currentStatus === "REJECTED"
                      ? "text-rose-700 bg-rose-50 border-rose-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}
                >
                  Status: {currentStatus}
                </span>
                <span className="text-xs font-mono text-slate-400">#{displayId}</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Pengembalian Barang & Resolusi Klaim
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Rejection Notification if Rejected */}
        {currentStatus === "REJECTED" && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-xs">
            <XCircle size={24} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-rose-900">Pengajuan Retur Ditolak Penjual</p>
              <p className="text-slate-600 leading-relaxed">
                Alasan Penolakan:{" "}
                <span className="font-bold text-rose-950">
                  {returnItem?.rejectionReason || "Klaim tidak memenuhi syarat verifikasi merchant"}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Return Details Overview */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Package size={20} weight="duotone" className="text-[#0F4C81]" />
            Detail Pengajuan Retur
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px]">No. Pesanan Asal:</span>
              <span className="font-mono font-bold text-slate-800">{returnItem?.orderId || "-"}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-slate-400 block text-[10px]">Alasan Diajukan:</span>
              <span className="font-medium text-slate-800">{returnItem?.reason || "-"}</span>
            </div>
            {returnItem?.description && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 sm:col-span-2">
                <span className="text-slate-400 block text-[10px]">Deskripsi Masalah:</span>
                <span className="font-medium text-slate-800">{returnItem.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Return Address Card (when approved or waiting return) */}
        {(currentStatus === "APPROVED" || currentStatus === "WAITING_RETURN") && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} weight="duotone" className="text-[#0F4C81]" />
                Alamat Pengembalian Fisik Barang (Gudang QC)
              </h2>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4C81] hover:underline"
              >
                <Copy size={14} />
                Salin Alamat
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-mono">
              {warehouseAddress}
            </div>
            <p className="text-[11px] text-slate-400">
              * Tempelkan kode ID Retur <strong>#{displayId}</strong> di luar paket pengiriman agar mudah diidentifikasi petugas gudang.
            </p>
          </div>
        )}

        {/* Return Shipment & Tracking Card */}
        {(currentStatus === "APPROVED" || currentStatus === "WAITING_RETURN" || currentStatus === "RETURN_SHIPPED" || returnItem?.trackingNumber) && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Truck size={20} weight="duotone" className="text-[#0F4C81]" />
              Pengiriman Kembali Barang Retur
            </h2>

            {returnItem?.trackingNumber || currentStatus === "RETURN_SHIPPED" ? (
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900">Paket Dalam Perjalanan ke Penjual</span>
                  <span className="font-mono px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                    {returnItem?.courierName || "JNE Express Return"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span>Nomor Resi:</span>
                  <span className="font-mono font-bold text-slate-900">{returnItem?.trackingNumber || trackingNumber}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Paket retur sedang dalam perjalanan menuju gudang penjual. Pemeriksaan QC akan dimulai setelah paket diterima.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTracking} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Setelah menyerahkan paket ke kurir, masukkan nama kurir dan nomor resi pengiriman di bawah ini:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kurir / Ekspedisi</label>
                    <input
                      type="text"
                      id="courier-name-input"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="Contoh: JNE / SiCepat / J&T"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Resi Pengiriman</label>
                    <input
                      type="text"
                      id="tracking-number-input"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Contoh: JNE-982341234"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#0F4C81]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    id="submit-tracking-btn"
                    disabled={submittingTracking || !courierName || !trackingNumber}
                    className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3d68] transition disabled:opacity-50"
                  >
                    {submittingTracking ? "Menyimpan Resi..." : "Kirimkan Resi Pengiriman"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* QC Inspection & Resolution Card */}
        {(inspection || resolution || currentStatus === "ITEM_RECEIVED" || currentStatus === "INSPECTION" || currentStatus === "RESOLVED") && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck size={20} weight="duotone" className="text-emerald-600" />
              Hasil Inspeksi QC & Penyelesaian (Resolution)
            </h3>

            <div className="space-y-3 text-xs">
              {inspection ? (
                <div className="p-3.5 bg-sky-50/70 rounded-2xl border border-sky-200 text-sky-950 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Disposisi Inventori:</span>
                    <span className="font-mono">{inspection.inventoryDisposition || "RESTOCK"}</span>
                  </div>
                  {inspection.conditionFound && (
                    <p className="text-sky-800">Kondisi Fisik: {inspection.conditionFound}</p>
                  )}
                  {inspection.notes && (
                    <p className="text-sky-700 text-[11px]">Catatan QC: {inspection.notes}</p>
                  )}
                </div>
              ) : currentStatus === "ITEM_RECEIVED" ? (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                  <span className="font-bold">Barang Telah Tiba di Penjual:</span> Menunggu jadwal pemeriksaan teknis QC.
                </div>
              ) : null}

              {resolution && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-950 space-y-1.5">
                  <div className="flex justify-between font-bold">
                    <span>Resolusi Final:</span>
                    <span className="text-purple-700">
                      {resolution.resolutionType === "FULL_REFUND" || resolution.resolutionType === "REFUND"
                        ? "Pengembalian Dana (Refund)"
                        : resolution.resolutionType === "REPLACEMENT"
                        ? "Penggantian Unit Baru (Replacement)"
                        : resolution.resolutionType}
                    </span>
                  </div>

                  {resolution.refundAmount ? (
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-purple-200/60">
                      <span>Nominal Refund Resmi:</span>
                      <span className="text-[#0F4C81]">{formatRupiah(resolution.refundAmount)}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Finance Refund Execution Status */}
              {(refund || resolution?.refundId) && (
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Status Eksekusi Keuangan (Finance):</span>
                    <span
                      className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        (refund?.status || "PENDING") === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {refund?.status || "PENDING"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    {(refund?.status || "PENDING") === "COMPLETED"
                      ? "Dana refund telah berhasil ditransfer kembali ke metode pembayaran asal secara resmi oleh Tim Finance."
                      : "Berkas refund telah terdaftar dan menunggu validasi serta eksekusi pembayaran oleh Tim Keuangan."}
                  </p>
                  {refund?.refundDestination && (
                    <div className="text-[11px] font-mono text-slate-500">
                      Tujuan Transfer: {refund.refundDestination}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
