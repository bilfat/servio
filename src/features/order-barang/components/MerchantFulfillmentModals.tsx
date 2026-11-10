"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Truck,
  CheckCircle,
  WarningCircle,
  Package,
  Storefront,
  Clock,
  ShieldCheck,
  User,
  MapPin,
  Info,
  ArrowsClockwise,
  Receipt,
  XCircle,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { MockMerchantOrder, DeliveryMethod, DeliveryProvider } from "@/types/order-barang";
import { formatRupiah, formatDateTimeIndo } from "../helpers";

// ==========================================
// 1. CONFIGURE DELIVERY MODAL
// ==========================================
interface ConfigureDeliveryModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDelivery: (
    orderId: string,
    courierMethod: DeliveryMethod,
    courierProvider: DeliveryProvider,
    courierName?: string,
    courierPhone?: string,
    trackingNumber?: string,
    trackingUrl?: string,
    deliveryNotes?: string
  ) => void;
}

export function ConfigureDeliveryModal({
  order,
  isOpen,
  onClose,
  onStartDelivery,
}: ConfigureDeliveryModalProps) {
  const [courierMethod, setCourierMethod] = useState<DeliveryMethod>("MERCHANT_DELIVERY");
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [gosendPreBooked, setGosendPreBooked] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const provider: DeliveryProvider = courierMethod === "THIRD_PARTY" ? "GOSEND" : "MERCHANT";
    onStartDelivery(
      order.id,
      courierMethod,
      provider,
      courierMethod === "THIRD_PARTY"
        ? (courierName || "GoSend Instant")
        : (courierName || "Kurir Toko"),
      courierMethod === "THIRD_PARTY" ? undefined : courierPhone,
      courierMethod === "THIRD_PARTY" ? trackingNumber : undefined,
      courierMethod === "THIRD_PARTY" ? (trackingUrl.trim() || undefined) : undefined,
      courierMethod === "THIRD_PARTY" ? undefined : deliveryNotes
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200/90 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Truck size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Atur Pengiriman Pesanan
              </h3>
              <p className="text-xs text-slate-500">
                #{order.orderNumber} • Tujuan: {order.shippingAddressSnapshot.recipientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Destination & Local Shipping Fee Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Alamat Tujuan:</span>
            <span className="font-semibold text-slate-800 text-right max-w-[240px] truncate">
              {order.shippingAddressSnapshot.street}, {order.shippingAddressSnapshot.city}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Jarak Pengiriman:</span>
            <span className="font-semibold text-slate-800">
              ~{order.delivery.distanceKm ?? order.simulatedDistanceKm ?? 2.5} km
            </span>
          </div>
          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
            <span>Tarif Ongkir Diterima dari Pelanggan:</span>
            <span className="font-mono font-bold text-[#0F4C81]">
              {formatRupiah(order.pricing.shippingFee)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Method Selection Radio */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">Pilih Kurir Pengiriman:</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  courierMethod === "MERCHANT_DELIVERY"
                    ? "border-[#0F4C81] bg-sky-50/50 shadow-xs ring-1 ring-[#0F4C81]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="courierMethod"
                    value="MERCHANT_DELIVERY"
                    checked={courierMethod === "MERCHANT_DELIVERY"}
                    onChange={() => setCourierMethod("MERCHANT_DELIVERY")}
                    className="text-[#0F4C81]"
                  />
                  <span>Kurir Toko</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pengiriman sendiri oleh staf / kurir toko (Tanpa GPS)
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  courierMethod === "THIRD_PARTY"
                    ? "border-[#0F4C81] bg-sky-50/50 shadow-xs ring-1 ring-[#0F4C81]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="courierMethod"
                    value="THIRD_PARTY"
                    checked={courierMethod === "THIRD_PARTY"}
                    onChange={() => setCourierMethod("THIRD_PARTY")}
                    className="text-[#0F4C81]"
                  />
                  <span>GoSend (Gojek)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pengiriman eksternal manual melalui aplikasi Gojek
                </p>
              </label>
            </div>
          </div>

          {/* Details for GoSend (Gojek) */}
          {courierMethod === "THIRD_PARTY" ? (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950">
              <div className="flex items-start gap-2">
                <Info size={16} weight="bold" className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 text-xs">
                    GoSend — Pengiriman Eksternal (Manual, Tanpa API Gojek)
                  </p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Merchant memesan kurir GoSend sendiri melalui aplikasi Gojek. Merchant dapat menyalin (copy) link tracking dari aplikasi Gojek lalu menempelkannya (paste) ke kolom di bawah agar pelanggan dapat melacak kiriman.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nomor Referensi / Booking GoSend (Opsional):
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Contoh: GK-88912 atau No. Order Gojek"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Link Tracking GoSend (Opsional, jika tersedia):
                  </label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="Contoh: https://gjk.id/... atau link live tracking Gojek"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Jika diisi, tombol &ldquo;Lacak Pengiriman&rdquo; akan aktif di sisi pelanggan. Jika dikosongkan, pelanggan akan melihat keterangan &ldquo;Link pelacakan belum tersedia&rdquo;.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Details for Kurir Toko */
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-2 text-slate-700">
                <Info size={16} weight="bold" className="text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-xs">
                    Kurir Toko — Pengiriman Sendiri (Tanpa GPS)
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Barang diantar oleh kurir / staf milik Merchant sendiri tanpa pelacakan live GPS. Nomor HP kurir akan ditampilkan kepada pelanggan untuk koordinasi serah terima.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nama Kurir: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Contoh: Pak Budi / Staf Toko"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    No. HP Kurir: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Catatan Pengiriman (Opsional):
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Contoh: Titipkan ke satpam lobby depan jika penerima tidak ada"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Truck size={15} weight="bold" />
              <span>Mulai Pengiriman</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 2. RECORD DELIVERED MODAL
// ==========================================
interface RecordDeliveredModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    orderId: string,
    recipientReceivedBy: string,
    proofType: string,
    deliveredNotes?: string,
    photoUrl?: string
  ) => void;
}

export function RecordDeliveredModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: RecordDeliveredModalProps) {
  const [receivedBy, setReceivedBy] = useState(order?.shippingAddressSnapshot?.recipientName || "");
  const [proofType, setProofType] = useState("Foto Serah Terima Paket");
  const [notes, setNotes] = useState("Paket diterima dalam kondisi baik");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fileSizeText, setFileSizeText] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(true);

  // Maximum allowed POD photo size: 2MB
  const MAX_POD_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

  // Sync recipient name and clear photo states when order or modal state changes
  useEffect(() => {
    if (order?.shippingAddressSnapshot?.recipientName) {
      setReceivedBy(order.shippingAddressSnapshot.recipientName);
    }
    setPhotoError(null);
    setFileSizeText(null);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 2MB size limit check
    if (file.size > MAX_POD_PHOTO_SIZE_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
      setPhotoError(`Ukuran foto (${sizeInMb} MB) melebihi batas maksimal 2MB. Silakan pilih foto dengan ukuran maksimal 2MB.`);
      e.target.value = "";
      return;
    }

    const formattedSize = file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`;
    setFileSizeText(formattedSize);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSamplePhoto = () => {
    setPhotoError(null);
    setFileSizeText("120 KB");
    // High quality sample photo of delivery package handover
    setPhotoUrl("https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80");
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined);
    setFileSizeText(null);
    setPhotoError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedBy.trim()) return;
    onConfirm(order.id, receivedBy.trim(), proofType, notes.trim(), photoUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200/90 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <CheckCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Catat Barang Telah Diterima
              </h3>
              <p className="text-xs text-slate-500">
                #{order.orderNumber} • {order.merchantName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Info Banner: 4 Items will be saved and visible to customer */}
          <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200/90 text-teal-900 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldCheck size={18} weight="bold" className="text-teal-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-teal-950">Bukti Penyerahan Paket (Proof of Delivery / POD)</p>
              <p className="text-teal-800 mt-0.5">
                4 item di bawah akan disimpan ke database &amp; ditampilkan secara transparan kepada pelanggan. Foto bukti dapat diklik oleh pelanggan untuk diperbesar (popup).
              </p>
            </div>
          </div>

          {/* ITEM 1: Nama Penerima Barang */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              1. Nama Penerima Barang: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Contoh: Nama orang yang menerima paket fisik"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* ITEM 2: Jenis Bukti Penyerahan / Hubungan */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              2. Hubungan / Jenis Bukti Penyerahan: <span className="text-rose-500">*</span>
            </label>
            <select
              value={proofType}
              onChange={(e) => setProofType(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="Foto Serah Terima Paket">Foto Serah Terima Paket (Diterima Langsung Pemilik)</option>
              <option value="Tanda Tangan Penerima">Tanda Tangan Langsung Penerima</option>
              <option value="Diterima Anggota Keluarga / Rekan">Diterima Anggota Keluarga / Rekan Kerja</option>
              <option value="Diterima Satpam / Pos Keamanan">Diterima Satpam / Pos Keamanan / Resepsionis</option>
              <option value="Diletakkan di Tempat Aman / Depan Pintu">Diletakkan di Tempat Aman / Depan Pintu Rumah</option>
            </select>
          </div>

          {/* ITEM 3: Catatan Penyerahan */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              3. Catatan Penyerahan:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Paket diterima langsung dalam kondisi baik dan tersegel rapi"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* ITEM 4: Upload Foto Bukti Paket Sampai */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block">
                4. Foto Bukti Paket Sampai (POD):
              </label>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Maksimal 2MB
              </span>
            </div>

            {photoUrl ? (
              <div className="p-3 rounded-2xl border border-teal-200 bg-teal-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                      <CheckCircle size={14} weight="bold" className="text-teal-600" />
                      Foto Bukti Terpasang
                    </span>
                    {fileSizeText && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        {fileSizeText} &bull; Sesuai batas &le; 2MB
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-rose-600 hover:text-rose-700 text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <X size={12} weight="bold" />
                    <span>Hapus Foto</span>
                  </button>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-teal-200 bg-white max-h-48 flex items-center justify-center">
                  <img
                    src={photoUrl}
                    alt="Pratinjau Bukti Sampai"
                    className="w-full h-44 object-cover"
                  />
                </div>
                <p className="text-[10px] text-teal-700 italic">
                  Foto ini akan tampil di detail pesanan pelanggan &amp; dapat diklik untuk melihat popup gambar besar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-teal-400 bg-slate-50/70 hover:bg-teal-50/30 transition cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-teal-100/70 text-teal-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
                    <Package size={20} weight="bold" />
                  </div>
                  <span className="font-bold text-slate-800 text-xs">Pilih / Ambil Foto Bukti Serah Terima</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Mendukung format JPG, PNG, atau WebP (Maksimal 2MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {photoError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2 animate-fade-in">
                    <WarningCircle size={16} weight="bold" className="shrink-0 text-rose-600" />
                    <span className="font-medium">{photoError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[10px] text-slate-400">Atau untuk simulasi instan:</span>
                  <button
                    type="button"
                    onClick={handleUseSamplePhoto}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200 transition cursor-pointer"
                  >
                    Gunakan Foto Contoh Serah Terima
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Konfirmasi Checkbox */}
          <label className="flex items-start gap-2 pt-2 cursor-pointer border-t border-slate-100">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 text-teal-600 rounded cursor-pointer"
            />
            <span className="text-[11px] text-slate-600 leading-snug">
              Saya mengonfirmasi bahwa 4 item bukti serah terima di atas telah benar dan paket pesanan telah sampai di tangan penerima yang sah.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || !receivedBy.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Konfirmasi Barang Diterima
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 3. DELIVERY FAILED MODAL
// ==========================================
interface DeliveryFailedModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, failureReason: string) => void;
}

export function DeliveryFailedModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: DeliveryFailedModalProps) {
  const [reason, setReason] = useState("Penerima tidak berada di lokasi pengiriman");

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <WarningCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Tandai Pengiriman Gagal
              </h3>
              <p className="text-xs text-slate-500">
                #{order.orderNumber} • Status pesanan tetap Dikirim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Menandai pengiriman gagal tidak membatalkan pesanan. Anda dapat menghubungi pelanggan dan mengatur percobaan pengiriman ulang.
          </p>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Kendala yang Dihadapi:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white"
            >
              <option value="Penerima tidak berada di lokasi pengiriman">Penerima tidak berada di lokasi pengiriman</option>
              <option value="Alamat pengiriman tidak ditemukan / tidak lengkap">Alamat pengiriman tidak ditemukan / tidak lengkap</option>
              <option value="Nomor telepon penerima tidak dapat dihubungi">Nomor telepon penerima tidak dapat dihubungi</option>
              <option value="Kurir mengalami kendala teknis / cuaca buruk">Kurir mengalami kendala teknis / cuaca buruk</option>
              <option value="Pihak ketiga (GoSend) membatalkan pesanan">Pihak ketiga (GoSend) membatalkan pesanan</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.id, reason)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
          >
            Tandai Bermasalah
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. RESPOND CANCELLATION MODAL
// ==========================================
interface RespondCancellationModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (orderId: string, approved: boolean, rejectionReason?: string) => void;
}

export function RespondCancellationModal({
  order,
  isOpen,
  onClose,
  onDecision,
}: RespondCancellationModalProps) {
  const [rejectionReason, setRejectionReason] = useState("Barang suku cadang telah disiapkan dan disesuaikan khusus untuk pesanan ini");
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Keputusan Pengajuan Pembatalan
              </h3>
              <p className="text-xs text-slate-500">
                #{order.orderNumber} • Dari Pelanggan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
          <p className="font-bold text-amber-900">Detail Permintaan dari Pelanggan:</p>
          <div className="space-y-1">
            <p>Alasan: <strong>&ldquo;{order.cancellationRequest?.reason}&rdquo;</strong></p>
            {order.cancellationRequest?.notes && (
              <p className="text-[11px] text-amber-800 italic">Catatan: &ldquo;{order.cancellationRequest.notes}&rdquo;</p>
            )}
            <p className="text-[10px] text-amber-700 pt-1 font-mono">
              Diajukan pada: {formatDateTimeIndo(order.cancellationRequest?.requestedAt || order.createdAt)}
            </p>
          </div>
        </div>

        {!showRejectInput ? (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Jika Anda <strong>menyetujui</strong> pembatalan, pesanan akan dibatalkan dan dana pelanggan dikembalikan 100%.
              Jika Anda <strong>menolak</strong>, Anda dapat melanjutkan proses pengemasan dan pengiriman barang.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectInput(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition"
              >
                Tolak Pembatalan
              </button>
              <button
                type="button"
                onClick={() => onDecision(order.id, true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                Setujui Pembatalan & Refund
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Alasan Penolakan Pembatalan (Wajib):
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Berikan alasan yang jelas kepada pelanggan..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectInput(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={() => onDecision(order.id, false, rejectionReason)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
              >
                Kirim Penolakan & Lanjutkan Pengemasan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. OPERATIONAL CANCEL MODAL (MERCHANT CANCEL)
// ==========================================
interface OperationalCancelModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => void;
}

export function OperationalCancelModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: OperationalCancelModalProps) {
  const [reason, setReason] = useState("Stok fisik di toko habis / tidak tersedia");

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <XCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Batalkan Pesanan Operasional
              </h3>
              <p className="text-xs text-slate-500">
                #{order.orderNumber} • Pembatalan oleh Toko
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950">
            <p className="font-bold text-rose-900">Perhatian:</p>
            <p className="text-[11px] leading-relaxed mt-1">
              Membatalkan pesanan yang telah dibayar akan mengembalikan dana 100% kepada pelanggan ({formatRupiah(order.pricing.merchantOrderTotal)}).
              Pastikan alasan yang dipilih sesuai dengan kendala inventaris atau operasional nyata.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Alasan Pembatalan Operasional:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white"
            >
              <option value="Stok fisik di toko habis / tidak tersedia">Stok fisik di toko habis / tidak tersedia</option>
              <option value="Barang ditemukan rusak saat pengecekan mutu">Barang ditemukan rusak saat pengecekan mutu</option>
              <option value="Inventory mismatch / selisih stok gudang">Inventory mismatch / selisih stok gudang</option>
              <option value="Kendala operasional toko mendadak">Kendala operasional toko mendadak</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.id, reason)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
          >
            Ya, Batalkan Pesanan Toko
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. MERCHANT ORDER DETAIL MODAL
// ==========================================
interface MerchantOrderDetailModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime?: Date;
  onStartProcessing?: (order: MockMerchantOrder) => void;
  onCancelOperational?: (order: MockMerchantOrder) => void;
  onPackOrder?: (order: MockMerchantOrder) => void;
  onConfigureDelivery?: (order: MockMerchantOrder) => void;
  onRespondCancellation?: (order: MockMerchantOrder) => void;
  onRecordDelivered?: (order: MockMerchantOrder) => void;
  onMarkDeliveryFailed?: (order: MockMerchantOrder) => void;
  onRetryDelivery?: (order: MockMerchantOrder) => void;
  onViewProof?: (order: MockMerchantOrder) => void;
}

export function MerchantOrderDetailModal({
  order,
  isOpen,
  onClose,
  currentTime,
  onStartProcessing,
  onCancelOperational,
  onPackOrder,
  onConfigureDelivery,
  onRespondCancellation,
  onRecordDelivered,
  onMarkDeliveryFailed,
  onRetryDelivery,
  onViewProof,
}: MerchantOrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const isUnpaid = order.status === "PAYMENT_PENDING" || order.status === "CREATED";
  const isCancellationPending = order.cancellationRequest?.status === "PENDING";
  const isDeliveryFailed = order.delivery.deliveryStatus === "FAILED";

  const createdAtTime = new Date(order.createdAt).getTime();
  const expiresAtTime = createdAtTime + 6 * 3600 * 1000;
  const nowMs = currentTime?.getTime() || Date.now();
  const diffMs = Math.max(0, expiresAtTime - nowMs);
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const countdownFormatted = diffMs <= 0
    ? "Waktu Pembayaran Habis"
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Sequential Downward Flow Animation for Timeline (starts at step 0 and flows to the currently running step)
  const [animatedTimelineIndex, setAnimatedTimelineIndex] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !order?.timeline?.length) {
      setAnimatedTimelineIndex(0);
      return;
    }

    const target = order.timeline.length - 1;
    if (target <= 0) {
      setAnimatedTimelineIndex(0);
      return;
    }

    setAnimatedTimelineIndex(0);
    let current = 0;
    let interval: NodeJS.Timeout | null = null;

    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        current += 1;
        setAnimatedTimelineIndex(current);
        if (current >= target) {
          if (interval) clearInterval(interval);
        }
      }, 550);
    }, 400);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [isOpen, order?.id, order?.timeline?.length]);

  const getStatusBadgeConfig = () => {
    switch (order.status) {
      case "PAYMENT_PENDING":
      case "CREATED":
        return {
          title: "Menunggu Pembayaran Customer",
          desc: "Pesanan telah dibuat di sistem. Menunggu pembeli menyelesaikan pembayaran via QRIS/VA.",
          badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
          dotClass: "bg-amber-500",
        };
      case "CONFIRMED":
        return {
          title: "Pesanan Baru Masuk (Lunas)",
          desc: "Pembayaran telah diverifikasi sistem. Silakan periksa stok dan segera proses pesanan.",
          badgeClass: "bg-sky-50 text-[#0F4C81] border-sky-300",
          dotClass: "bg-[#0F4C81]",
        };
      case "PROCESSING":
        return {
          title: isCancellationPending ? "Pengajuan Batal dari Pelanggan" : "Pesanan Sedang Diproses",
          desc: isCancellationPending
            ? "Pelanggan meminta pembatalan. Harap berikan tanggapan sebelum memproses barang."
            : "Barang sedang disiapkan dan dikemas oleh toko Anda.",
          badgeClass: isCancellationPending
            ? "bg-orange-50 text-orange-900 border-orange-300"
            : "bg-blue-50 text-blue-900 border-blue-300",
          dotClass: isCancellationPending ? "bg-orange-500" : "bg-blue-500",
        };
      case "PACKED":
        return {
          title: "Selesai Dikemas (Siap Kirim)",
          desc: "Barang telah siap. Silakan pilih kurir internal atau panggil GoSend Instant.",
          badgeClass: "bg-indigo-50 text-indigo-900 border-indigo-300",
          dotClass: "bg-indigo-500",
        };
      case "DELIVERING":
        return {
          title: isDeliveryFailed ? "Pengiriman Bermasalah" : "Dalam Pengiriman Kurir",
          desc: isDeliveryFailed
            ? `Kendala: ${order.delivery.failureReason || "Kurir gagal mengantarkan paket"}`
            : "Paket dalam perjalanan ke alamat penerima.",
          badgeClass: isDeliveryFailed
            ? "bg-rose-50 text-rose-900 border-rose-300"
            : "bg-purple-50 text-purple-900 border-purple-300",
          dotClass: isDeliveryFailed ? "bg-rose-500" : "bg-purple-500",
        };
      case "DELIVERED":
        return {
          title: "Telah Diserahkan (DELIVERED)",
          desc: `Diterima oleh ${order.delivery.recipientReceivedBy || order.shippingAddressSnapshot.recipientName}. Menunggu konfirmasi pembeli (auto-selesai 48 jam).`,
          badgeClass: "bg-teal-50 text-teal-900 border-teal-300",
          dotClass: "bg-teal-500",
        };
      case "COMPLETED":
        return {
          title: "Pesanan Selesai (COMPLETED)",
          desc: "Transaksi berhasil diselesaikan. Dana penjualan telah diteruskan ke saldo dompet S-Pay.",
          badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
          dotClass: "bg-emerald-500",
        };
      case "CANCELLED":
        return {
          title: "Pesanan Dibatalkan (CANCELLED)",
          desc: `Dibatalkan oleh ${order.cancellationDetails?.actor || "Sistem"}. Alasan: ${order.cancellationDetails?.reason || "-"}`,
          badgeClass: "bg-rose-50 text-rose-900 border-rose-300",
          dotClass: "bg-rose-500",
        };
      default:
        return {
          title: order.status,
          desc: "Status pesanan aktif.",
          badgeClass: "bg-slate-50 text-slate-800 border-slate-300",
          dotClass: "bg-slate-500",
        };
    }
  };

  const statusConfig = getStatusBadgeConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-white/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200/90 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0F4C81] flex items-center justify-center shrink-0 border border-blue-100">
              <Storefront size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  #{order.orderNumber}
                </span>
                {order.checkoutGroupId && (
                  <span className="text-[10px] font-mono text-slate-400">
                    Checkout #{order.checkoutGroupId}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                  <span>{statusConfig.title}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dibuat: {formatDateTimeIndo(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/merchant/chat?partner_id=${encodeURIComponent(
                order.customerId || "692f03fd-2362-485a-9a23-a672bbb4533f"
              )}&partner_type=customer&partner_name=${encodeURIComponent(
                order.customerName || "Ahmad Fauzi"
              )}&ctx_type=order_barang&ctx_id=${encodeURIComponent(
                order.orderNumber || order.id
              )}&ctx_title=${encodeURIComponent(
                order.items[0]?.title || `Pesanan #${order.orderNumber || order.id}`
              )}&ctx_status=${encodeURIComponent(order.status)}&ctx_price=${encodeURIComponent(
                order.pricing?.merchantOrderTotal ?? order.totalAmount ?? 0
              )}&ctx_thumb=${encodeURIComponent(
                order.items[0]?.thumbnailUrl || ""
              )}&ctx_summary=${encodeURIComponent(
                `Pembeli: ${order.customerName || "Pelanggan"} • ${order.items.length} Barang • Total: ${formatRupiah(order.pricing?.merchantOrderTotal ?? order.totalAmount ?? 0)}`
              )}&ctx_url=${encodeURIComponent(`/merchant/orders?order_id=${order.id}`)}`}
              className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-[#0F4C81] hover:bg-sky-100 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
              title="Chat Pembeli (In-App)"
            >
              <ChatCircleDots size={16} weight="bold" />
              <span>Chat Pembeli</span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Content: 2 Columns Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-4 overflow-y-auto flex-1 text-xs">
          {/* LEFT COLUMN: Produk, Pengiriman, Rincian Biaya (60% / col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Daftar Produk Suku Cadang */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Package size={14} className="text-blue-600" />
                  <span>Daftar Produk ({order.items.length})</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Subtotal: {formatRupiah(order.pricing.itemsSubtotal)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {order.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                        {item.thumbnailUrl && item.thumbnailUrl !== "/brand/logo.png" ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.classList.add("hidden");
                              e.currentTarget.nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <div className={`${item.thumbnailUrl && item.thumbnailUrl !== "/brand/logo.png" ? "hidden" : "flex"} items-center justify-center`}>
                          <Package size={18} className="text-slate-400" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate leading-snug">{item.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {item.quantity} × {formatRupiah(item.unitPrice)}
                          {item.variantName && ` • Varian: ${item.variantName}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Detail Customer & Pengiriman */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <MapPin size={14} className="text-rose-500" />
                  <span>Detail Penerima & Pengiriman</span>
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  Jarak: ~{order.delivery.distanceKm ?? order.simulatedDistanceKm ?? 2.5} km
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Nama Penerima</span>
                  <p className="font-bold text-slate-900">{order.shippingAddressSnapshot.recipientName}</p>
                  <p className="font-mono text-slate-600 text-[11px]">{order.shippingAddressSnapshot.phone}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Metode Pengiriman</span>
                  <p className="font-semibold text-slate-800">
                    {order.delivery.provider === "GOSEND" || order.delivery.method === "THIRD_PARTY"
                      ? "GoSend Instant (Manual Booking)"
                      : "Kurir Toko Internal (Armada Sendiri)"}
                  </p>
                  {order.delivery.trackingNumber && (
                    <p className="text-[10px] font-mono text-blue-600">Resi: {order.delivery.trackingNumber}</p>
                  )}
                </div>
              </div>
              {/* Full Address Snapshot Section */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Alamat Lengkap Tujuan</span>
                  {order.shippingAddressSnapshot.label && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {order.shippingAddressSnapshot.label}
                    </span>
                  )}
                </div>
                <p className="text-slate-800 leading-relaxed font-semibold text-xs">
                  {order.shippingAddressSnapshot.street || order.shippingAddressSnapshot.fullAddress}
                </p>
                <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5">
                  {order.shippingAddressSnapshot.subdistrict && (
                    <span>Kel. {order.shippingAddressSnapshot.subdistrict}</span>
                  )}
                  {order.shippingAddressSnapshot.district && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>Kec. {order.shippingAddressSnapshot.district}</span>
                    </>
                  )}
                  {order.shippingAddressSnapshot.city && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{order.shippingAddressSnapshot.city}</span>
                    </>
                  )}
                  {order.shippingAddressSnapshot.postalCode && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono">Kodepos {order.shippingAddressSnapshot.postalCode}</span>
                    </>
                  )}
                </div>
                {order.shippingAddressSnapshot.notes && (
                  <div className="mt-1 p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-snug">
                    <span className="font-bold">Patokan / Catatan Alamat:</span> &ldquo;{order.shippingAddressSnapshot.notes}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* 3. Rincian Biaya & Settlement Toko (Ketentuan Platform) */}
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Receipt size={14} className="text-emerald-600" />
                  <span>Rincian Pembayaran &amp; Potongan Biaya Platform</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                  Ketentuan Platform
                </span>
              </div>

              {/* A. Rincian Dana yang Dibayar / Ditransfer Pelanggan */}
              <div className="space-y-1.5 text-slate-600 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  1. Tagihan yang Ditransfer / Dibayar Pelanggan
                </span>
                <div className="flex justify-between">
                  <span>Subtotal Nilai Barang:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(order.pricing.itemsSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkos Kirim Toko:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(order.pricing.shippingFee)}</span>
                </div>
                {order.customerServiceFee > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Biaya Layanan Aplikasi Pelanggan:</span>
                    <span className="font-mono">{formatRupiah(order.customerServiceFee)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-bold">
                  <span>Total yang Dibayar Pelanggan:</span>
                  <span className="font-mono text-[#0F4C81]">{formatRupiah(order.totalAmount || order.pricing.merchantOrderTotal)}</span>
                </div>
              </div>

              {/* B. Rincian Potongan Platform Toko & Estimasi Cair */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  2. Rincian Potongan Platform &amp; Estimasi Pencairan
                </span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Tagihan Pesanan Toko (Barang + Ongkir):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatRupiah(order.pricing.itemsSubtotal + order.pricing.shippingFee)}
                    </span>
                  </div>

                  {/* Rincian Komponen Potongan Platform Toko */}
                  <div className="space-y-1 py-1.5 px-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                      Rincian Potongan Platform Toko:
                    </span>
                    {order.pricing.merchantFeeBreakdown && order.pricing.merchantFeeBreakdown.length > 0 ? (
                      order.pricing.merchantFeeBreakdown.map((fee, idx) => (
                        <div key={idx} className="flex justify-between text-rose-600 font-medium text-[11px]">
                          <span>• Potongan {fee.name}:</span>
                          <span className="font-mono font-bold">- {formatRupiah(fee.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between text-rose-600 font-medium text-[11px]">
                          <span>• Potongan Biaya Layanan Barang:</span>
                          <span className="font-mono font-bold">- {formatRupiah(6000)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-medium text-[11px]">
                          <span>• Potongan Biaya Aplikasi Toko:</span>
                          <span className="font-mono font-bold">- {formatRupiah(5000)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-rose-700 font-bold pt-1 border-t border-rose-200/60 text-xs">
                      <span>Total Potongan Biaya Platform:</span>
                      <span className="font-mono font-bold">
                        - {formatRupiah(
                          order.pricing.merchantCommissionFee ||
                          (order.pricing.merchantFeeBreakdown
                            ? order.pricing.merchantFeeBreakdown.reduce((s, i) => s + i.amount, 0)
                            : 11000)
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Sesuai ketentuan tarif layanan transaksi platform Servio (Biaya Layanan Barang + Biaya Aplikasi).
                  </p>
                </div>

                {/* Net Payout Box */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="font-bold block text-emerald-900">Estimasi Bersih Masuk Saldo S-Pay Toko:</span>
                    <span className="text-[10px] text-emerald-700">Diterima setelah pesanan selesai</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm sm:text-base text-emerald-800">
                      {formatRupiah(
                        order.pricing.merchantNetPayout ||
                        Math.max(
                          0,
                          (order.pricing.itemsSubtotal + order.pricing.shippingFee) -
                            (order.pricing.merchantCommissionFee || 11000)
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Status & Aksi Sekarang + Riwayat Timeline (40% / col-span-5) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Status & Action Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Status & Aksi Operasional
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.badgeClass}`}>
                  {order.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900">{statusConfig.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {statusConfig.desc}
                </p>
              </div>

              {/* Specific Context & Actions based on Status */}
              {isUnpaid && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                    <Clock size={16} weight="bold" className="text-amber-600 animate-pulse" />
                    <span>Sisa Waktu Pembayaran: {countdownFormatted}</span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-normal">
                    Pesanan ini belum dibayar oleh pembeli. Sesuai kebijakan pembayaran Servio, toko baru dapat memproses barang setelah pembayaran lunas diverifikasi.
                  </p>
                  <div className="p-2 rounded-lg bg-white/80 border border-amber-200 text-[10px] text-slate-600">
                    Status Pembayaran: <strong>Menunggu Pembayaran (PENDING)</strong>
                  </div>
                </div>
              )}

              {order.status === "CONFIRMED" && (
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-[#0F4C81] flex items-center gap-2">
                    <CheckCircle size={16} weight="fill" className="text-[#0F4C81] shrink-0" />
                    <span>Pembayaran telah lunas diverifikasi sistem. Silakan mulai proses barang.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {onCancelOperational && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onCancelOperational(order);
                        }}
                        className="w-full py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs transition cursor-pointer"
                      >
                        Tolak Pesanan
                      </button>
                    )}
                    {onStartProcessing && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onStartProcessing(order);
                        }}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Package size={14} weight="bold" />
                        <span>Proses Pesanan</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {order.status === "PROCESSING" && (
                <div className="space-y-2 pt-1">
                  {isCancellationPending ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                        <WarningCircle size={16} weight="fill" className="text-amber-600" />
                        <span>Pengajuan Pembatalan Pembeli</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        &ldquo;{order.cancellationRequest?.reason}&rdquo;
                      </p>
                      {onRespondCancellation && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onRespondCancellation(order);
                          }}
                          className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                        >
                          Respon Pengajuan Batal
                        </button>
                      )}
                    </div>
                  ) : (
                    onPackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onPackOrder(order);
                        }}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle size={15} weight="bold" />
                        <span>Tandai Selesai Dikemas</span>
                      </button>
                    )
                  )}
                </div>
              )}

              {order.status === "PACKED" && onConfigureDelivery && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onConfigureDelivery(order);
                    }}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Truck size={15} weight="bold" />
                    <span>Atur Pengiriman / Kurir</span>
                  </button>
                </div>
              )}

              {order.status === "DELIVERING" && (
                <div className="space-y-2 pt-1">
                  {isDeliveryFailed ? (
                    onRetryDelivery && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRetryDelivery(order);
                        }}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Atur Pengiriman Ulang
                      </button>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {onMarkDeliveryFailed && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onMarkDeliveryFailed(order);
                          }}
                          className="w-full py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition cursor-pointer"
                        >
                          Kendala Pengiriman
                        </button>
                      )}
                      {onRecordDelivered && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onRecordDelivered(order);
                          }}
                          className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <CheckCircle size={14} weight="bold" />
                          <span>Telah Diserahkan</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {order.status === "DELIVERED" && onViewProof && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewProof(order);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Lihat Bukti Penyerahan (POD)</span>
                  </button>
                </div>
              )}

              {order.status === "COMPLETED" && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                  <span className="font-bold block text-emerald-900">Transaksi Sukses</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Dana sebesar <strong>{formatRupiah(order.pricing.itemsSubtotal + order.pricing.shippingFee)}</strong> telah masuk ke saldo dompet S-Pay toko.
                  </p>
                </div>
              )}
            </div>

            {/* Riwayat Timeline Pesanan dengan Animasi Presisi & Garis Tengah Sempurna */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Riwayat Aktivitas Pesanan ({order.timeline.length})
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                  Live Audit
                </span>
              </div>

              {/* Dedicated Timeline Track with Precision Centering & Animated Downward Flow */}
              <div className="relative space-y-0 pr-1">
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes pulseBeam {
                    0% { transform: translateY(-100%); opacity: 0; }
                    25% { opacity: 0.9; }
                    75% { opacity: 0.9; }
                    100% { transform: translateY(280%); opacity: 0; }
                  }
                  @keyframes growTrack {
                    from { transform: scaleY(0); }
                    to { transform: scaleY(1); }
                  }
                `}} />

                {order.timeline.map((event, idx) => {
                  const isLast = idx === order.timeline.length - 1;
                  const isCancelledEvent = event.step === "CANCELLED" || event.title?.toLowerCase().includes("batal");

                  const isStepReached = idx <= animatedTimelineIndex;
                  const isLineFlowed = idx < animatedTimelineIndex;
                  const isStepCurrentlyRunning =
                    idx === animatedTimelineIndex &&
                    animatedTimelineIndex === order.timeline.length - 1;
                  const isPassingThrough =
                    idx === animatedTimelineIndex &&
                    animatedTimelineIndex < order.timeline.length - 1;

                  return (
                    <div
                      key={idx}
                      className="relative flex items-start gap-3 group"
                    >
                      {/* COLUMN 1: Centered Timeline Rail (Width 24px) */}
                      <div className="relative flex flex-col items-center shrink-0 w-6 self-stretch">
                        {/* Connecting Line to next step */}
                        {!isLast && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-0 w-0.5 bg-slate-200 overflow-hidden">
                            {/* Animated filling gradient track flowing downwards */}
                            <div
                              className={`w-full h-full origin-top transition-transform duration-500 ease-out ${
                                isCancelledEvent || (idx === order.timeline.length - 2 && (order.timeline[idx + 1].step === "CANCELLED" || order.timeline[idx + 1].title?.toLowerCase().includes("batal")))
                                  ? "bg-gradient-to-b from-blue-600 via-amber-500 to-rose-600"
                                  : "bg-gradient-to-b from-blue-600 to-[#0F4C81]"
                              }`}
                              style={{
                                transform: isLineFlowed ? "scaleY(1)" : "scaleY(0)",
                              }}
                            />
                            {/* Traveling luminous pulse beam moving down towards the next milestone */}
                            {isLineFlowed && (
                              <div
                                className="absolute inset-x-0 h-4 bg-sky-300 blur-[0.5px]"
                                style={{
                                  animation: 'pulseBeam 2s infinite ease-in-out',
                                  animationDelay: `${idx * 300}ms`,
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* Dot Indicator: Strictly dead-center of the 24px rail */}
                        <div className="relative z-10 flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                          {isCancelledEvent ? (
                            isStepReached ? (
                              <div className="relative flex items-center justify-center transition-all duration-500 scale-105">
                                {/* Pulsing red radar wave */}
                                <span className="absolute w-5 h-5 rounded-full bg-rose-500/30 animate-ping" />
                                <span className="w-4 h-4 rounded-full bg-rose-600 ring-4 ring-rose-100 shadow-md z-20 flex items-center justify-center text-white">
                                  <X size={10} weight="bold" />
                                </span>
                              </div>
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-rose-200 ring-4 ring-white shadow-2xs z-20 transition-all duration-500" />
                            )
                          ) : isStepCurrentlyRunning ? (
                            <div className="relative flex items-center justify-center transition-all duration-500 scale-105">
                              {/* Pulsing radar wave stopping at current active step */}
                              <span className="absolute w-5 h-5 rounded-full bg-blue-500/30 animate-ping" />
                              <span className="absolute w-4 h-4 rounded-full bg-blue-400/25 animate-pulse" />
                              {/* Center active node */}
                              <span className="w-3.5 h-3.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100 shadow-md z-20 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              </span>
                            </div>
                          ) : isPassingThrough ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#0F4C81] ring-4 ring-sky-100 shadow-xs z-20 transition-all duration-500" />
                          ) : isStepReached ? (
                            <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white shadow-xs z-20 transition-all duration-500" />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-slate-200 ring-4 ring-white shadow-2xs z-20 transition-all duration-500" />
                          )}
                        </div>
                      </div>

                      {/* COLUMN 2: Event Details */}
                      <div
                        className={`flex-1 pb-4 pt-0.5 min-w-0 space-y-1 transition-all duration-500 ${
                          isStepReached ? "opacity-100 translate-y-0" : "opacity-35 translate-y-1"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs font-bold leading-tight transition-colors duration-300 ${
                              isCancelledEvent && isStepReached
                                ? "text-rose-700"
                                : isStepCurrentlyRunning
                                ? "text-[#0F4C81]"
                                : isStepReached
                                ? "text-slate-900"
                                : "text-slate-400"
                            }`}
                          >
                            {event.title}
                          </p>
                          {isCancelledEvent && isStepReached ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 flex items-center gap-1 animate-fade-in">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>Dibatalkan</span>
                            </span>
                          ) : isStepCurrentlyRunning ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 flex items-center gap-1 animate-fade-in">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              <span>Sedang Berjalan</span>
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`text-[11px] leading-snug ${
                            isCancelledEvent && isStepReached
                              ? "text-rose-800 bg-rose-50/60 p-2 rounded-xl border border-rose-100"
                              : "text-slate-600"
                          }`}
                        >
                          {event.description}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {formatDateTimeIndo(event.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
