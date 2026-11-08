"use client";

import React, { useState } from "react";
import { ServiceOrder } from "@/features/order-jasa/types";
import {
  X,
  FileText,
  MapPin,
  Clock,
  Storefront,
  Wrench,
  Camera,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  XCircle,
  Copy,
  User,
  Phone,
  Package,
} from "@phosphor-icons/react";

interface CompleteOrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
}

export function CompleteOrderSummaryModal({
  isOpen,
  onClose,
  order,
}: CompleteOrderSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return "Rp 0";
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  const handleCopyOrderNumber = () => {
    if (typeof window !== "undefined" && order.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const diagPayment = order.paymentSummary?.diagnosisPayment;
  const execPayment = order.paymentSummary?.executionPayment;
  const refund = order.paymentSummary?.refundSummary;
  const providerFunds = order.paymentSummary?.providerFunds;

  const tabs = [
    { id: "ALL", label: "Semua Kategori" },
    { id: "A", label: "A. Layanan" },
    { id: "B", label: "B. Lokasi" },
    { id: "C", label: "C. Jadwal" },
    { id: "D", label: "D. Mitra & Teknisi" },
    { id: "E", label: "E. Keluhan" },
    { id: "F", label: "F. Diagnosa & Biaya" },
    { id: "G", label: "G. Pembayaran" },
    { id: "H", label: "H. Garansi" },
    ...(order.status === "CANCELLED" || order.cancellation || order.providerRejectionReason
      ? [{ id: "I", label: "I. Pembatalan & Refund" }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neutral-dark/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-servio-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-body text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText size={22} weight="duotone" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-neutral-dark font-display">
                  Ringkasan Lengkap Pesanan Jasa
                </h3>
                <span className="font-mono text-xs font-bold text-primary bg-sky/30 border border-primary/20 px-2 py-0.5 rounded-md">
                  #{order.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  title="Salin Nomor Order"
                  className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <Copy size={14} />
                </button>
                {copied && <span className="text-[10px] text-emerald-600 font-bold">Tersalin!</span>}
              </div>
              <p className="text-[11px] text-neutral-slate mt-0.5">
                Dokumentasi terstruktur multi-seksi dari pemesanan awal hingga penyelesaian.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/60 text-neutral-slate hover:text-neutral-dark transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === t.id
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs bg-slate-50/40">
          {/* SEKSI A: IDENTITAS ORDER & LAYANAN */}
          {(activeTab === "ALL" || activeTab === "A") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  A. Identitas Order & Layanan Jasa
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">Nomor Service Order:</span>
                  <span className="font-mono font-bold text-slate-800">#{order.orderNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Status Operasional:</span>
                  <span className="font-bold text-primary">{order.subStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Waktu Dibuat:</span>
                  <span className="font-medium text-slate-700">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString("id-ID") : "-"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px] block">Layanan Dipesan:</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {order.serviceSnapshot?.title || "Layanan Servis Resmi"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Kategori: {order.serviceSnapshot?.categoryName || "Servis & Perbaikan"} • Subkategori: {order.serviceSnapshot?.subcategoryName || "Standar"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Model Estimasi Biaya:</span>
                  <span className="font-semibold text-slate-700">{order.serviceSnapshot?.priceModel || "ESTIMATED_RANGE"}</span>
                </div>
              </div>
            </div>
          )}

          {/* SEKSI B: DATA PELANGGAN & LOKASI */}
          {(activeTab === "ALL" || activeTab === "B") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  B. Data Pelanggan & Lokasi Pengerjaan
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">Nama Penerima / Kontak:</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 mt-0.5">
                    <User size={14} className="text-slate-400" />
                    <span>{order.customerName || order.addressSnapshot?.recipientName || "Pelanggan Servio"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-slate-600 mt-0.5 text-[11px]">
                    <Phone size={14} className="text-slate-400" />
                    <span>{order.customerPhone || order.addressSnapshot?.phone || "-"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Area / Kota Operasional:</span>
                  <span className="font-bold text-slate-800">
                    {order.addressSnapshot?.city || "DKI Jakarta"}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 text-[11px] block">Alamat Lengkap Kunjungan:</span>
                  <p className="font-medium text-slate-800 leading-relaxed mt-0.5">
                    {order.addressSnapshot?.fullAddress || "Alamat tercantum pada profil pelanggan"}
                  </p>
                  {order.addressSnapshot?.notes && (
                    <p className="text-[11px] text-primary font-semibold mt-1 bg-sky/15 p-2 rounded-lg border border-sky/30">
                      Catatan Akses Lokasi: {order.addressSnapshot.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEKSI C: JADWAL & MODE PENGERJAAN */}
          {(activeTab === "ALL" || activeTab === "C") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Clock size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  C. Jadwal & Mode Pengerjaan
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400 text-[11px] block">Mode Layanan:</span>
                  <span className="font-bold text-slate-800">Home Service (Kunjungan ke Lokasi)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tanggal Kunjungan Terjadwal:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {order.schedule?.date || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Slot Waktu / Jam:</span>
                  <span className="font-bold text-slate-800">
                    {order.schedule?.timeSlot || "Segera Hari Ini"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Status Kunjungan Operasional:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full inline-block text-[11px] ${
                    order.execution?.visitStatus === "PAID_VISIT_ENDED" || order.status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-sky-50 text-primary border border-sky-200"
                  }`}>
                    {order.execution?.visitStatus || (order.status === "COMPLETED" ? "CLOSED" : "IN_PROGRESS")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Keputusan Mitra (Gate C):</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full inline-block text-[11px] ${
                    order.providerDecisionStatus === "ACCEPTED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : order.providerDecisionStatus === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {order.providerDecisionStatus || "PENDING"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SEKSI D: MITRA PENYEDIA JASA & TEKNISI */}
          {(activeTab === "ALL" || activeTab === "D") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Storefront size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  D. Mitra Penyedia Jasa & Teknisi Bertugas
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mitra Penyedia Jasa</span>
                  <h5 className="font-bold text-slate-900 text-sm">{order.providerName || "sukses gembira"}</h5>
                  <p className="text-[11px] text-slate-500">ID Mitra: {order.providerId}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Teknisi Bertugas</span>
                  {order.assignment?.workerName ? (
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <CheckCircle size={15} weight="fill" className="text-emerald-600" />
                        {order.assignment.workerName}
                      </h5>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ID: {order.assignment.workerId} {order.assignment.workerPhone ? `• ${order.assignment.workerPhone}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 italic font-semibold">
                      Belum ditugaskan oleh penyedia jasa (Menunggu Dispatch)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEKSI E: KELUHAN AWAL & MEDIA */}
          {(activeTab === "ALL" || activeTab === "E") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Camera size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  E. Keluhan Awal & Bukti Media Pelanggan
                </h4>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-400 text-[11px] block">Deskripsi Kendala Konsumen:</span>
                  <p className="font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-0.5 leading-relaxed">
                    {order.complaint?.description || "Pemeriksaan unit servis terstandar"}
                  </p>
                </div>
                {order.complaint?.symptoms && order.complaint.symptoms.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Gejala / Model Unit:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {order.complaint.symptoms.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {order.complaint?.photos && order.complaint.photos.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1.5">Foto Bukti Keluhan ({order.complaint.photos.length}):</span>
                    <div className="flex flex-wrap gap-2">
                      {order.complaint.photos.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Bukti ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEKSI F: HASIL DIAGNOSA & BIAYA */}
          {(activeTab === "ALL" || activeTab === "F") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Wrench size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  F. Hasil Diagnosa, Rincian Jasa & Suku Cadang
                </h4>
              </div>
              {order.diagnosis ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Catatan Analisa Diagnosa Teknisi:</span>
                    <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                      {order.diagnosis.findings || order.diagnosis.rootCause || "Pemeriksaan fisik unit telah selesai dilaksanakan."}
                    </p>
                  </div>
                  {order.diagnosis.costBreakdown?.workItems && order.diagnosis.costBreakdown.workItems.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-slate-400 text-[11px] block font-bold">Rincian Tindakan / Pekerjaan:</span>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                        {order.diagnosis.costBreakdown.workItems.map((it: any, idx: number) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-800">{it.title || it.description || it.name}</span>
                            <span className="font-mono font-bold text-slate-900">{formatRupiah(it.subtotal || it.price || it.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.diagnosis.costBreakdown?.spareparts && order.diagnosis.costBreakdown.spareparts.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-slate-400 text-[11px] block font-bold">Suku Cadang / Material Tambahan:</span>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                        {order.diagnosis.costBreakdown.spareparts.map((sp: any, idx: number) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-slate-800 block">{sp.name || sp.productName}</span>
                              <span className="text-[10px] text-slate-400">Qty: {sp.qty || sp.quantity || 1} • {sp.sourceType || "PROVIDER_STOCK"}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900">{formatRupiah(sp.subtotal || sp.totalPrice || sp.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                  Teknisi belum mengunggah laporan hasil diagnosa (Pemeriksaan di lokasi belum dilaksanakan).
                </p>
              )}
            </div>
          )}

          {/* SEKSI G: PEMBAYARAN & ESCROW */}
          {(activeTab === "ALL" || activeTab === "G") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CreditCard size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  G. Riwayat Pembayaran & Escrow Dana
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">1. Biaya Diagnosa</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      diagPayment?.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {diagPayment?.status || "Rp 0 / Bebas Biaya"}
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold text-slate-900 block">
                    {formatRupiah(diagPayment?.amount || 0)}
                  </span>
                  {diagPayment?.paidAt && (
                    <span className="text-[10px] text-slate-400 block">
                      Lunas pada: {new Date(diagPayment.paidAt).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">2. Pelunasan Pengerjaan</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      execPayment?.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {execPayment?.status || "Belum Diterbitkan"}
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold text-slate-900 block">
                    {formatRupiah(execPayment?.amount || 0)}
                  </span>
                  {execPayment?.paidAt && (
                    <span className="text-[10px] text-slate-400 block">
                      Lunas pada: {new Date(execPayment.paidAt).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>

                {providerFunds && (
                  <div className="sm:col-span-2 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-emerald-900 block">Escrow Penampungan Mitra (120 Jam)</span>
                      <span className="text-[11px] text-emerald-700">
                        Dana bersih mitra: {formatRupiah(providerFunds.netAmount || (providerFunds as any).netEarnings || 0)} (Status: {providerFunds.status || "HOLD_ESCROW"})
                      </span>
                    </div>
                    <ShieldCheck size={24} className="text-emerald-600" weight="fill" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEKSI H: GARANSI & PURNAJUAL */}
          {(activeTab === "ALL" || activeTab === "H") && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-servio-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck size={18} className="text-primary" weight="bold" />
                <h4 className="font-bold text-neutral-dark font-display text-sm">
                  H. Jaminan Garansi & Purnajual Servio
                </h4>
              </div>
              {(() => {
                const wDays = order.serviceSnapshot?.warrantyDurationDays;
                const hasW = Boolean(wDays && wDays > 0);

                if (!hasW) {
                  return (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-slate-400" />
                          Tanpa Garansi Tambahan
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                          TIDAK ADA GARANSI
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Layanan ini tidak menyertakan klausul garansi pasca perbaikan. Hasil pengerjaan diverifikasi pada saat serah terima di lokasi.
                      </p>
                    </div>
                  );
                }

                const isWarrantyActive = order.status === "COMPLETED";

                return (
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                        <ShieldCheck size={16} weight="fill" className="text-purple-600" />
                        Garansi Resmi {wDays} Hari Servio
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isWarrantyActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-purple-100 text-purple-800 border-purple-300"
                      }`}>
                        {isWarrantyActive ? "GARANSI AKTIF" : "AKTIF SETELAH ORDER COMPLETED"}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Layanan ini dilindungi jaminan pengerjaan ulang resmi tanpa biaya tambahan apabila kendala yang sama berulang dalam jangka waktu {wDays} hari kalender sejak pesanan berstatus selesai (COMPLETED) dan terdaftar di Modul After-Sales 07.
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* SEKSI I: PEMBATALAN & REFUND */}
          {(order.status === "CANCELLED" || order.cancellation || order.providerRejectionReason) &&
            (activeTab === "ALL" || activeTab === "I") && (
              <div className="bg-rose-50/40 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-servio-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-200/80">
                  <XCircle size={18} className="text-rose-600" weight="fill" />
                  <h4 className="font-bold text-rose-950 font-display text-sm">
                    I. Pembatalan Pesanan &amp; Pengembalian Dana (Refund S-Pay)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                      Alasan Penolakan / Pembatalan
                    </span>
                    <p className="font-semibold text-rose-900 leading-relaxed">
                      {order.cancellation?.reasonDetail || order.providerRejectionReason || "Pesanan ditolak/dibatalkan."}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                      Status Pengembalian Dana (Section 50)
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <ShieldCheck size={16} weight="fill" className="text-emerald-600" />
                      <span>Refund 100% Berhasil ke S-Pay Pelanggan</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900 block pt-0.5">
                      Nominal: {formatRupiah(order.serviceSnapshot?.diagnosisFee || 50000)}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-1 sm:col-span-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">
                      Pihak yang Menolak / Membatalkan
                    </span>
                    <span className="font-bold text-slate-800">
                      {order.cancellation?.cancelledByName || (order.providerDecisionStatus === "REJECTED" ? `Mitra Penyedia Jasa (${order.providerName})` : "Sistem SERVIO")}
                    </span>
                    {order.cancellation?.cancelledAt && (
                      <span className="text-[10px] text-slate-400 block">
                        Waktu Penolakan: {new Date(order.cancellation.cancelledAt).toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Tutup Ringkasan
          </button>
        </div>
      </div>
    </div>
  );
}

