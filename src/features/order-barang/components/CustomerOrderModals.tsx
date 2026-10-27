"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  WarningCircle,
  CheckCircle,
  Receipt,
  Truck,
  Package,
  Storefront,
  Clock,
  ShieldCheck,
  CreditCard,
  MapPin,
  Info,
  Phone,
  ArrowSquareOut,
  Eye,
} from "@phosphor-icons/react";
import { MockMerchantOrder, MockCheckoutGroup } from "@/types/order-barang";
import { formatRupiah, formatDateTimeIndo } from "../helpers";

// ==========================================
// 1. CANCEL UNPAID CHECKOUT MODAL
// ==========================================
interface CancelUnpaidCheckoutModalProps {
  order: MockMerchantOrder | null;
  checkoutGroup?: MockCheckoutGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (checkoutGroupId: string) => void;
}

export function CancelUnpaidCheckoutModal({
  order,
  checkoutGroup,
  isOpen,
  onClose,
  onConfirm,
}: CancelUnpaidCheckoutModalProps) {
  if (!isOpen || !order) return null;

  const targetGroupId = checkoutGroup?.id || order.checkoutGroupId || order.id;
  const merchantCount = checkoutGroup?.merchantOrderIds?.length || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <WarningCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Batalkan Checkout Belum Bayar?
              </h3>
              <p className="text-xs text-slate-500">
                Invoice Tagihan: <span className="font-mono font-bold">#{targetGroupId}</span>
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

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <p className="font-bold">
            Peringatan Tagihan Gabungan:
          </p>
          <p className="leading-relaxed">
            Pesanan ini termasuk dalam <strong>satu pembayaran gabungan ({merchantCount} toko)</strong>.
            Membatalkan pembayaran ini akan membatalkan seluruh pesanan toko yang berada dalam checkout ini secara bersamaan.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Toko yang terdampak:</label>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Storefront size={15} className="text-primary" />
                {order.merchantName}
              </span>
              <span className="font-mono text-slate-600">
                {formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}
              </span>
            </div>
            {checkoutGroup && (checkoutGroup.orderIds || checkoutGroup.merchantOrderIds || []).length > 1 && (
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                +{(checkoutGroup.orderIds || checkoutGroup.merchantOrderIds || []).length - 1} toko rekanan lainnya dalam invoice ini
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={() => onConfirm(targetGroupId)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
          >
            Ya, Batalkan Seluruh Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. CANCEL CONFIRMED ORDER MODAL (BEFORE PROCESSING)
// ==========================================
interface CancelConfirmedModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => void;
}

export function CancelConfirmedModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: CancelConfirmedModalProps) {
  const [reason, setReason] = useState("Ingin mengubah varian / spesifikasi produk");

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <WarningCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Batalkan Pesanan Toko Ini?
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

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck size={16} weight="bold" />
            Jaminan Pengembalian Dana 100%
          </p>
          <p className="text-[11px] leading-relaxed">
            Karena penjual belum memproses pesanan ini, pesanan dapat langsung dibatalkan dan dana Anda sebesar{" "}
            <strong>{formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}</strong> akan dikembalikan penuh (termasuk ongkir, fee, dan pajak yang dialokasikan).
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Pilih Alasan Pembatalan:</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Ingin mengubah varian / spesifikasi produk">Ingin mengubah varian / spesifikasi produk</option>
            <option value="Ingin mengubah alamat pengiriman">Ingin mengubah alamat pengiriman</option>
            <option value="Menemukan harga lebih hemat">Menemukan harga lebih hemat</option>
            <option value="Berubah pikiran / tidak lagi membutuhkan barang">Berubah pikiran / tidak lagi membutuhkan barang</option>
            <option value="Salah memesan jumlah barang">Salah memesan jumlah barang</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
          >
            Konfirmasi Pembatalan
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. REQUEST CANCELLATION MODAL (WHEN PROCESSING)
// ==========================================
interface RequestCancellationModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string, notes?: string) => void;
}

export function RequestCancellationModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: RequestCancellationModalProps) {
  const [reason, setReason] = useState("Salah memilih barang");
  const [notes, setNotes] = useState("");

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Ajukan Pembatalan Pesanan
              </h3>
              <p className="text-xs text-slate-500">
                Pesanan sedang dipersiapkan oleh {order.merchantName}
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

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <Info size={16} weight="bold" />
            Aturan SLA Persetujuan Merchant (12 Jam Operasional)
          </p>
          <p className="text-[11px] leading-relaxed">
            Karena barang sudah dalam tahap persiapan, pembatalan memerlukan persetujuan penjual.
            Merchant memiliki batas waktu <strong>12 jam operasional</strong> untuk merespons.
            Jika tidak ada respons hingga batas waktu berakhir, <strong>pengajuan akan otomatis ditolak</strong> dan pengemasan dilanjutkan.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Alasan Pengajuan:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="Salah memilih barang">Salah memilih barang</option>
              <option value="Salah memilih varian">Salah memilih varian</option>
              <option value="Salah alamat">Salah alamat</option>
              <option value="Berubah pikiran">Berubah pikiran</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Catatan Tambahan (Opsional):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Berikan penjelasan singkat untuk penjual..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.id, reason, notes)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
          >
            Kirim Pengajuan Pembatalan
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. CONFIRM DELIVERED MODAL
// ==========================================
interface ConfirmDeliveredModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string) => void;
}

export function ConfirmDeliveredModal({
  order,
  isOpen,
  onClose,
  onConfirm,
}: ConfirmDeliveredModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200/90">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <CheckCircle size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Konfirmasi Pesanan Diterima
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

        <div className="space-y-3 text-xs text-slate-700">
          <p className="leading-relaxed">
            Apakah Anda sudah menerima seluruh barang dari toko <strong>{order.merchantName}</strong> dalam kondisi baik dan sesuai pesanan?
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-bold text-slate-800 block">Daftar Barang:</span>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                <span>{item.quantity}x {item.title}</span>
                <span className="font-mono">{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Setelah dikonfirmasi, status pesanan akan menjadi <strong>Selesai</strong> dan dana pembayaran akan diteruskan ke penjual.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
          >
            Periksa Lagi
          </button>
          <button
            type="button"
            onClick={() => onConfirm(order.id)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-sm"
          >
            Ya, Barang Sesuai & Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. RECEIPT MODAL
// ==========================================
interface ReceiptModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ order, isOpen, onClose }: ReceiptModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200/90 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold font-display tracking-tight text-primary">
                SERVIO
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-50 text-primary border border-sky-200">
                Struk Resmi Transaksi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              No. Transaksi: <strong className="font-mono">{order.payment.paymentReference || `INV-${order.id}`}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Payment & Order Meta */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Penjual / Toko:</span>
            <span className="font-bold text-slate-900">{order.merchantName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Waktu Pembayaran:</span>
            <span className="font-bold text-slate-900">
              {order.payment.paidAt ? formatDateTimeIndo(order.payment.paidAt) : formatDateTimeIndo(order.createdAt)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Metode Pembayaran:</span>
            <span className="font-bold text-slate-900">{order.payment.method}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Status Pembayaran:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              <CheckCircle size={12} weight="fill" />
              LUNAS (PAID)
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-2.5 px-3 text-left font-bold">Produk</th>
                <th className="py-2.5 px-3 text-center font-bold">Qty</th>
                <th className="py-2.5 px-3 text-right font-bold">Harga</th>
                <th className="py-2.5 px-3 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    {item.variantName && (
                      <p className="text-[10px] text-slate-500">Varian: {item.variantName}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">
                    {formatRupiah(item.unitPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal Barang:</span>
            <span className="font-mono">{formatRupiah(order.itemsSubtotal ?? order.pricing?.itemsSubtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Ongkos Kirim Lokal (~{order.delivery.distanceKm ?? order.simulatedDistanceKm ?? 3.5} km):</span>
            <span className="font-mono">{formatRupiah(order.shippingFee ?? order.pricing?.shippingFee ?? 0)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Biaya Layanan Pelanggan:</span>
            <span className="font-mono">{formatRupiah(order.customerServiceFee ?? order.pricing?.platformFee ?? 0)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pajak (PPN):</span>
            <span className="font-mono">{formatRupiah(order.customerTax ?? order.pricing?.taxAmount ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
            <span>Total Tagihan Pesanan Toko:</span>
            <span className="font-mono text-primary">{formatRupiah(order.totalAmount ?? order.pricing?.merchantOrderTotal ?? 0)}</span>
          </div>
        </div>

        <p className="text-[10px] text-center text-slate-400 italic">
          * Dokumen ini diterbitkan secara otomatis oleh sistem SERVIO sebagai simulasi bukti transaksi digital yang sah.
        </p>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs"
          >
            Tutup Struk
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. TRACKING MODAL
// ==========================================
interface TrackingModalProps {
  order: MockMerchantOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TrackingModal({ order, isOpen, onClose }: TrackingModalProps) {
  // Step-by-step Sequential Flow Animation (flows downwards from top to running status)
  const [animatedTimelineIndex, setAnimatedTimelineIndex] = useState<number>(0);
  const [previewTrackingPhoto, setPreviewTrackingPhoto] = useState<string | null>(null);

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

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200/90 max-h-[92vh] overflow-y-auto my-auto">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Truck size={24} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Lacak Pengiriman Lokal
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

        {/* Courier Info Summary */}
        {(() => {
          const isGosend = order.delivery.provider === "GOSEND" || order.delivery.courierMethod === "GOSEND";
          const hasValidTrackingUrl = !!(order.delivery.trackingUrl && order.delivery.trackingUrl.trim().startsWith("http"));

          return (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Metode Pengiriman:</span>
                  <span className="font-bold text-slate-900">
                    {isGosend ? "GoSend (Gojek)" : "Kurir Toko (Pengiriman Sendiri)"}
                  </span>
                </div>

                {isGosend ? (
                  // GoSend Info
                  <>
                    {(order.delivery.trackingNumber || order.delivery.trackingReference) && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Nomor Referensi / Resi:</span>
                        <span className="font-mono font-bold text-indigo-700">
                          {order.delivery.trackingNumber || order.delivery.trackingReference}
                        </span>
                      </div>
                    )}
                    {order.delivery.courierName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Driver / Kurir:</span>
                        <span className="font-semibold text-slate-800">{order.delivery.courierName}</span>
                      </div>
                    )}
                  </>
                ) : (
                  // Kurir Toko Info
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Keterangan:</span>
                      <span className="font-semibold text-slate-800">Pesanan sedang diantar oleh kurir toko.</span>
                    </div>
                    {order.delivery.courierName && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Nama Kurir:</span>
                        <span className="font-semibold text-slate-800">{order.delivery.courierName}</span>
                      </div>
                    )}
                    {order.delivery.courierPhone && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Nomor HP Kurir:</span>
                        <a
                          href={`tel:${order.delivery.courierPhone}`}
                          className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone size={12} weight="bold" />
                          <span>{order.delivery.courierPhone}</span>
                        </a>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500">Alamat Tujuan:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[220px] truncate">
                    {order.recipientAddress?.fullAddress || order.shippingAddressSnapshot?.fullAddress || order.shippingAddressSnapshot?.street}, {order.recipientAddress?.city || order.shippingAddressSnapshot?.city}
                  </span>
                </div>
              </div>

              {/* Specific Notice & Actions for GoSend vs Kurir Toko */}
              {isGosend ? (
                <div>
                  {hasValidTrackingUrl ? (
                    <a
                      href={order.delivery.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition"
                    >
                      <ArrowSquareOut size={15} weight="bold" />
                      <span>Lacak Pengiriman di Gojek</span>
                    </a>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                      <Info size={14} weight="bold" className="text-amber-700 shrink-0" />
                      <span>Link pelacakan belum tersedia</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
                    * Merchant memesan GoSend secara manual melalui aplikasi Gojek. Jika link pelacakan tersedia, Anda dapat memantau pergerakan kurir secara eksternal.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-950 space-y-1">
                  <p className="font-semibold text-sky-900 flex items-center gap-1">
                    <Info size={14} weight="bold" className="text-blue-600 shrink-0" />
                    <span>Pengiriman Sendiri Tanpa GPS</span>
                  </p>
                  <p className="text-slate-600 leading-snug">
                    Tidak ada pelacakan live GPS untuk kurir toko. Penjual memperbarui status pengiriman secara manual dan mencatat bukti serah terima saat paket tiba.
                  </p>
                </div>
              )}

              {/* Bukti Serah Terima Paket (4 Item) if already delivered */}
              {(order.status === "DELIVERED" || order.status === "COMPLETED" || order.delivery.deliveryStatus === "DELIVERED" || order.delivery.recipientReceivedBy) && (
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-teal-200/60">
                    <span className="font-bold text-teal-900 flex items-center gap-1.5">
                      <ShieldCheck size={16} weight="bold" className="text-teal-600" />
                      Bukti Serah Terima Paket (POD)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900">
                      Tersimpan di Sistem
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-teal-200/80 text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">1. Nama Penerima:</span>
                      <span className="font-bold text-slate-900">
                        {order.delivery.recipientReceivedBy || order.delivery.deliveredToName || order.shippingAddressSnapshot.recipientName}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
                      <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {order.delivery.proofType || "Foto Serah Terima Paket"}
                      </span>
                    </div>

                    {order.delivery.deliveredNotes && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">3. Catatan:</span>
                        <span className="text-slate-700 italic">&ldquo;{order.delivery.deliveredNotes}&rdquo;</span>
                      </div>
                    )}

                    {order.delivery.deliveredAt && (
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Waktu Penyerahan:</span>
                        <span>{formatDateTimeIndo(order.delivery.deliveredAt)}</span>
                      </div>
                    )}

                    {/* 4. Foto Bukti */}
                    {order.delivery.proofPhotoUrl && (
                      <div className="pt-2 border-t border-teal-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            onClick={() => setPreviewTrackingPhoto(order.delivery.proofPhotoUrl || null)}
                            className="relative w-14 h-14 rounded-xl overflow-hidden border border-teal-200 cursor-pointer group shrink-0 bg-slate-100"
                            title="Klik untuk memperbesar foto bukti"
                          >
                            <img
                              src={order.delivery.proofPhotoUrl}
                              alt="Bukti Paket Sampai"
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                              <Eye size={16} weight="bold" />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block uppercase">4. Foto Bukti:</span>
                            <button
                              type="button"
                              onClick={() => setPreviewTrackingPhoto(order.delivery.proofPhotoUrl || null)}
                              className="text-teal-700 hover:text-teal-900 font-bold text-xs underline flex items-center gap-1 cursor-pointer mt-0.5"
                            >
                              <Eye size={13} weight="bold" />
                              <span>Perbesar Foto Bukti</span>
                            </button>
                          </div>
                        </div>
                        <span className="text-[10px] text-teal-700/80 italic">
                          (Klik untuk perbesar)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Timeline Auto-Expanded without Inner Scroll & Downward Flow Animation */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              Riwayat Perjalanan Pengiriman ({order.timeline.length})
            </h4>
            <span className="text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full font-bold border border-sky-100">
              Live Progress
            </span>
          </div>

          <div className="relative space-y-0 pr-1">
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes trackingPulseBeam {
                0% { transform: translateY(-100%); opacity: 0; }
                25% { opacity: 0.9; }
                75% { opacity: 0.9; }
                100% { transform: translateY(280%); opacity: 0; }
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
                  {/* COLUMN 1: Centered Timeline Rail (24px) */}
                  <div className="relative flex flex-col items-center shrink-0 w-6 self-stretch">
                    {!isLast && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-0 w-0.5 bg-slate-200 overflow-hidden">
                        <div
                          className={`w-full h-full origin-top transition-transform duration-500 ease-out ${
                            isCancelledEvent || (idx === order.timeline.length - 2 && (order.timeline[idx + 1].step === "CANCELLED" || order.timeline[idx + 1].title?.toLowerCase().includes("batal")))
                              ? "bg-gradient-to-b from-primary via-amber-500 to-rose-600"
                              : "bg-gradient-to-b from-primary to-sky-600"
                          }`}
                          style={{
                            transform: isLineFlowed ? "scaleY(1)" : "scaleY(0)",
                          }}
                        />
                        {isLineFlowed && (
                          <div
                            className="absolute inset-x-0 h-4 bg-sky-300 blur-[0.5px]"
                            style={{
                              animation: 'trackingPulseBeam 2s infinite ease-in-out',
                              animationDelay: `${idx * 300}ms`,
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Dot Indicator */}
                    <div className="relative z-10 flex items-center justify-center w-6 h-6 shrink-0 mt-0.5">
                      {isCancelledEvent ? (
                        isStepReached ? (
                          <div className="relative flex items-center justify-center transition-all duration-500 scale-105">
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
                          <span className="absolute w-5 h-5 rounded-full bg-sky-500/30 animate-ping" />
                          <span className="absolute w-4 h-4 rounded-full bg-sky-400/25 animate-pulse" />
                          <span className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-sky-100 shadow-md z-20 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          </span>
                        </div>
                      ) : isPassingThrough ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-sky-100 shadow-xs z-20 transition-all duration-500" />
                      ) : isStepReached ? (
                        <span className="w-3 h-3 rounded-full bg-primary ring-4 ring-white shadow-xs z-20 transition-all duration-500" />
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
                            ? "text-primary"
                            : isStepReached
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {event.title}
                      </p>
                      {isCancelledEvent && isStepReached ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-1 animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>Dibatalkan</span>
                        </span>
                      ) : isStepCurrentlyRunning ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 flex items-center gap-1 animate-fade-in">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox Popup: Perbesar Gambar Bukti Paket Sampai */}
      {previewTrackingPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewTrackingPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200/90 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} weight="bold" className="text-teal-600" />
                <span className="font-bold text-slate-900 text-xs">
                  Foto Bukti Serah Terima Paket #{order.orderNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTrackingPhoto(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewTrackingPhoto}
                alt="Foto Bukti Paket Sampai"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">1. Nama Penerima:</span>
                <span className="font-bold text-slate-800">
                  {order.delivery.recipientReceivedBy || order.delivery.deliveredToName || order.shippingAddressSnapshot.recipientName}
                </span>
              </div>
              {order.delivery.proofType && (
                <div className="flex justify-between">
                  <span className="text-slate-500">2. Hubungan / Jenis Bukti:</span>
                  <span className="text-teal-800 font-semibold">{order.delivery.proofType}</span>
                </div>
              )}
              {order.delivery.deliveredNotes && (
                <div className="flex justify-between">
                  <span className="text-slate-500">3. Catatan:</span>
                  <span className="text-slate-700 italic">&ldquo;{order.delivery.deliveredNotes}&rdquo;</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewTrackingPhoto(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Gambar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
