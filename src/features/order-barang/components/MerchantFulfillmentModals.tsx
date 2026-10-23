"use client";

import React, { useState } from "react";
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
      courierName || (courierMethod === "THIRD_PARTY" ? "GoSend Instant" : "Kurir Toko Internal"),
      courierPhone,
      trackingNumber || (courierMethod === "THIRD_PARTY" ? `GOSEND-${Date.now().toString().slice(-6)}` : undefined),
      deliveryNotes
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
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
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
            <span className="font-semibold text-slate-800">~{order.delivery.distanceKm} km</span>
          </div>
          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
            <span>Tarif Ongkir Diterima dari Pelanggan:</span>
            <span className="font-mono font-bold text-primary">
              {formatRupiah(order.pricing.shippingFee)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Method Selection Radio */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">Pilih Metode Pengiriman:</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  courierMethod === "MERCHANT_DELIVERY"
                    ? "border-primary bg-sky-50/50 shadow-xs ring-1 ring-primary"
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
                    className="text-primary"
                  />
                  <span>Kurir Toko</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Diantar langsung oleh staf / armada toko sendiri
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  courierMethod === "THIRD_PARTY"
                    ? "border-primary bg-sky-50/50 shadow-xs ring-1 ring-primary"
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
                    className="text-primary"
                  />
                  <span>GoSend (Manual)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pesan manual melalui aplikasi Gojek
                </p>
              </label>
            </div>
          </div>

          {/* Details for GoSend */}
          {courierMethod === "THIRD_PARTY" ? (
            <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <Info size={16} weight="bold" />
                Ketentuan Pengiriman GoSend Manual:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed">
                <li>Merchant memesan kurir GoSend secara manual melalui aplikasi Gojek.</li>
                <li>Pelanggan membayar ongkir flat sesuai tarif Pengiriman Lokal toko ({formatRupiah(order.pricing.shippingFee)}).</li>
                <li>Jika tarif GoSend aktual berbeda, selisih biaya ditanggung oleh Merchant.</li>
              </ul>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setGosendPreBooked(!gosendPreBooked)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    gosendPreBooked
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-amber-300 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <CheckCircle size={14} weight="bold" />
                  <span>{gosendPreBooked ? "Kurir GoSend Telah Dipesan" : "Saya Sudah Memesan Kurir (Simulasi)"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    No. Booking / Resi GoSend (Opsional):
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Contoh: GK-88912"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nama Driver GoSend (Opsional):
                  </label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Contoh: Pak Budi"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Details for Kurir Toko */
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nama Petugas / Kurir Toko:
                  </label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    placeholder="Nama kurir pengantar"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    No. Handphone Kurir:
                  </label>
                  <input
                    type="text"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Catatan Pengantaran (Opsional):
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Contoh: Titipkan ke satpam lobby depan jika penerima tidak ada"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Truck size={15} weight="bold" />
              <span>Mulai Pengiriman (Serahkan ke Kurir)</span>
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
  onConfirm: (orderId: string, recipientReceivedBy: string, deliveredNotes?: string) => void;
}

export function RecordDeliveredModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: RecordDeliveredModalProps) {
  const [receivedBy, setReceivedBy] = useState(order?.shippingAddressSnapshot?.recipientName || "");
  const [notes, setNotes] = useState("Paket diterima dalam kondisi baik");
  const [proofType, setProofType] = useState("Tanda Tangan Penerima");
  const [isConfirmed, setIsConfirmed] = useState(true);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedBy.trim()) return;
    onConfirm(order.id, receivedBy, `${proofType}: ${notes}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
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
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Nama Penerima Barang:
            </label>
            <input
              type="text"
              required
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Nama orang yang menerima paket"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Jenis Bukti Penyerahan:
            </label>
            <select
              value={proofType}
              onChange={(e) => setProofType(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white"
            >
              <option value="Tanda Tangan Penerima">Tanda Tangan Langsung Penerima</option>
              <option value="Foto Paket Diterima">Foto Serah Terima Paket</option>
              <option value="Diterima Satpam / Pos Keamanan">Diterima Satpam / Pos Keamanan</option>
              <option value="Diterima Anggota Keluarga / Rekan">Diterima Anggota Keluarga / Rekan</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Catatan Penyerahan:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Diterima langsung oleh yang bersangkutan"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          <label className="flex items-start gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 text-teal-600 rounded"
            />
            <span className="text-[11px] text-slate-600">
              Saya mengonfirmasi bahwa paket pesanan telah benar-benar diserahkan kepada pihak penerima di alamat tujuan.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || !receivedBy.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-sm"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100">
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
}

export function MerchantOrderDetailModal({
  order,
  isOpen,
  onClose,
}: MerchantOrderDetailModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                #{order.orderNumber}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-primary border border-sky-200">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Waktu Pesanan: {formatDateTimeIndo(order.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer & Address Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Penerima / Pelanggan:
            </span>
            <p className="font-bold text-slate-900">{order.shippingAddressSnapshot.recipientName}</p>
            <p className="text-slate-600 font-mono">{order.shippingAddressSnapshot.phone}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Alamat Pengiriman (Snapshot):
            </span>
            <p className="font-medium text-slate-800 leading-relaxed">
              {order.shippingAddressSnapshot.street}, {order.shippingAddressSnapshot.city}
            </p>
          </div>
        </div>

        {/* Items List */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
            Daftar Barang Pesanan
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    {item.variantName && (
                      <p className="text-[10px] text-slate-500">Varian: {item.variantName}</p>
                    )}
                  </div>
                </div>
                <div className="text-right pl-3">
                  <span className="text-slate-500">{item.quantity} × {formatRupiah(item.unitPrice)}</span>
                  <p className="font-mono font-bold text-slate-900">{formatRupiah(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial & Settlement Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Rincian Nilai Transaksi & Settlement Toko:
          </span>
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Nilai Barang:</span>
            <span className="font-mono font-semibold text-slate-900">{formatRupiah(order.pricing.itemsSubtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Ongkir Lokal Diterima:</span>
            <span className="font-mono font-semibold text-slate-900">{formatRupiah(order.pricing.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Biaya Layanan Platform (Customer):</span>
            <span className="font-mono">{formatRupiah(order.pricing.platformFee)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pajak (Customer):</span>
            <span className="font-mono">{formatRupiah(order.pricing.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Transaksi Toko Ini:</span>
            <span className="font-mono text-primary">{formatRupiah(order.pricing.merchantOrderTotal)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex justify-between items-center mt-2">
            <span>Estimasi Dana Cair ke Toko (Net Settlement):</span>
            <span className="font-mono font-bold text-emerald-800">
              {formatRupiah(order.pricing.itemsSubtotal + order.pricing.shippingFee)}
            </span>
          </div>
        </div>

        {/* Timeline Events */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Riwayat Aktivitas Pesanan:</span>
          <div className="space-y-3 pl-3 border-l-2 border-primary/30 ml-2">
            {order.timeline.map((event, idx) => (
              <div key={idx} className="relative pl-4 space-y-0.5">
                <span className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow-sm" />
                <p className="text-xs font-bold text-slate-900">{event.title}</p>
                <p className="text-[11px] text-slate-600">{event.description}</p>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDateTimeIndo(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
