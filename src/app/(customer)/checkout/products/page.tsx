"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Truck,
  ShieldCheck,
  Receipt,
  CheckCircle,
  Package,
  Storefront,
  X,
  Plus,
  Buildings,
  House,
  WarningCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import { useCart } from "@/features/cart/useCart";
import { useProductCheckout } from "@/features/checkout/useProductCheckout";
import { formatRupiah } from "@/components/data-display/PriceBreakdown";
import { Toast } from "@/components/feedback/Toast";

export default function ProductCheckoutPage() {
  const router = useRouter();
  const { cartGroups, clearCart } = useCart();
  const {
    deliveryAddress,
    setDeliveryAddress,
    savedAddresses,
    selectSavedAddress,
    selectedCourier,
    setSelectedCourier,
    isInsuranceEnabled,
    setIsInsuranceEnabled,
    itemsSubtotal,
    shippingCost,
    insuranceCost,
    platformFee,
    grandTotal,
    validationIssues,
    submitOrder,
    isSubmitting,
    courierOptions,
  } = useProductCheckout(cartGroups);

  const [notes, setNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [tempAddress, setTempAddress] = useState(deliveryAddress);

  const handleOpenAddressModal = () => {
    setTempAddress(deliveryAddress);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressModal = () => {
    if (!tempAddress.recipientName.trim() || !tempAddress.phone.trim() || !tempAddress.street.trim()) {
      setToastMessage("Harap lengkapi nama penerima, nomor telepon, dan alamat jalan.");
      setToastType("warning");
      return;
    }
    setDeliveryAddress(tempAddress);
    setIsAddressModalOpen(false);
    setToastMessage("Alamat pengiriman berhasil diperbarui!");
    setToastType("success");
  };

  const handleCreateOrder = async () => {
    try {
      const result = await submitOrder();
      // Clear client cart state so navbar badge and cart page stay synced
      clearCart();
      setToastMessage("Pesanan produk berhasil dibuat! Mengalihkan ke pembayaran...");
      setToastType("success");
      setTimeout(() => {
        router.push(`/payments/products/${result.paymentIntentId || result.orderId}`);
      }, 700);
    } catch (err: any) {
      setToastMessage(err?.message || "Gagal membuat pesanan. Silakan periksa kembali keranjang Anda.");
      setToastType("warning");
    }
  };

  const isEmptyCart = cartGroups.length === 0;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              id="back-to-cart-btn"
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <ArrowLeft size={20} weight="bold" />
            </Link>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                Penyelesaian Pesanan Produk
              </span>
              <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                Checkout & Pengiriman Suku Cadang
              </h1>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
            Tahap 2 dari 2: Checkout & Pembayaran
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Validation Issues Banner if any */}
        {validationIssues.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <WarningCircle size={22} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Perhatian Terkait Ketersediaan Barang:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {isEmptyCart ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4 max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center mx-auto">
              <Package size={32} weight="duotone" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Keranjang Belanja Kosong</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Anda belum memiliki suku cadang di keranjang checkout. Silakan pilih varian produk yang Anda butuhkan di katalog kami.
            </p>
            <Link
              href="/products"
              id="empty-cart-to-products"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-md"
            >
              Eksplorasi Suku Cadang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Forms: Items Summary, Address & Courier */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Items Summary Card */}
              <div
                id="items-summary-card"
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Package size={20} weight="duotone" className="text-[#0F4C81]" />
                  Daftar Barang & Toko Pengirim
                </h2>

                <div className="space-y-4">
                  {cartGroups.map((group) => (
                    <div
                      key={group.merchantId}
                      className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Storefront size={16} weight="duotone" className="text-[#0F4C81]" />
                        <span>{group.merchantName}</span>
                      </div>

                      <div className="divide-y divide-slate-200/60">
                        {group.items.map((it) => (
                          <div
                            key={it.productId + (it.variantId || "")}
                            className="py-2.5 flex items-center justify-between text-xs gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900">{it.productTitle}</p>
                              <p className="text-[11px] text-slate-500">
                                {it.variantName && <span className="font-semibold text-slate-700">{it.variantName} • </span>}
                                {formatRupiah(it.unitPriceSnapshot ?? it.unitPrice)} × {it.quantity} Unit
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#0F4C81]">
                                {formatRupiah((it.unitPriceSnapshot ?? it.unitPrice) * it.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address Card */}
              <div
                id="delivery-address-card"
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={20} weight="duotone" className="text-[#0F4C81]" />
                    Alamat Pengiriman Barang
                  </h2>
                  <button
                    type="button"
                    id="btn-change-address"
                    onClick={handleOpenAddressModal}
                    className="text-xs text-[#0F4C81] font-bold hover:underline"
                  >
                    Ubah Alamat
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs space-y-1">
                  <p className="font-bold text-slate-900">
                    <span id="recipient-name-display">{deliveryAddress.recipientName}</span>{" "}
                    <span id="recipient-phone-display" className="font-normal text-slate-500">
                      ({deliveryAddress.phone})
                    </span>
                  </p>
                  <p id="recipient-street-display" className="text-slate-600 leading-relaxed">
                    {deliveryAddress.street}
                  </p>
                  <p className="text-slate-500 font-semibold">
                    <span id="recipient-city-display">{deliveryAddress.city}</span>,{" "}
                    <span id="recipient-postal-display">{deliveryAddress.postalCode}</span>
                  </p>
                </div>
              </div>

              {/* Logistics Courier Selection */}
              <div
                id="logistics-courier-card"
                className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm space-y-4"
              >
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Truck size={20} weight="duotone" className="text-[#0F4C81]" />
                  Pilihan Ekspedisi & Kurir Pengiriman
                </h2>

                <div className="space-y-3">
                  {courierOptions.map((courier) => {
                    const isSelected = selectedCourier.id === courier.id;

                    return (
                      <label
                        key={courier.id}
                        id={`courier-option-${courier.id}`}
                        onClick={() => setSelectedCourier(courier)}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "border-[#0F4C81] bg-sky-50/50 shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="courier"
                            checked={isSelected}
                            onChange={() => setSelectedCourier(courier)}
                            className="w-4 h-4 accent-[#0F4C81]"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {courier.name} — {courier.service}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Estimasi Tiba: {courier.estimatedDays}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {formatRupiah(courier.cost * Math.max(1, cartGroups.length))}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Insurance Toggle */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck size={18} weight="fill" className="text-emerald-600" />
                    <div>
                      <p className="font-bold text-slate-800">
                        Proteksi Kerusakan Pengiriman ({formatRupiah(insuranceCost)})
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Jaminan penggantian 100% jika suku cadang pecah atau rusak dalam transit
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="insurance-toggle"
                    checked={isInsuranceEnabled}
                    onChange={(e) => setIsInsuranceEnabled(e.target.checked)}
                    className="w-5 h-5 accent-[#0F4C81] rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Notes for Seller */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Catatan untuk Penjual / Ekspedisi (Opsional)
                </h3>
                <input
                  type="text"
                  id="checkout-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Mohon beri label Fragile dan bubble wrap tebal..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>
            </div>

            {/* Sidebar: Payment Summary */}
            <div>
              <div
                id="payment-summary-card"
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6 sticky top-24"
              >
                <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                  <Receipt size={18} weight="duotone" className="text-[#0F4C81]" />
                  Ringkasan Pembayaran
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal Produk</span>
                    <span id="breakdown-items-subtotal" className="font-semibold text-slate-800">
                      {formatRupiah(itemsSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Ongkos Kirim ({selectedCourier.name})</span>
                    <span id="breakdown-shipping-fee" className="font-semibold text-slate-800">
                      {formatRupiah(shippingCost)}
                    </span>
                  </div>
                  {isInsuranceEnabled && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Asuransi Pengiriman</span>
                      <span id="breakdown-insurance-fee" className="font-semibold text-slate-800">
                        {formatRupiah(insuranceCost)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Biaya Layanan Platform</span>
                    <span id="breakdown-platform-fee" className="font-semibold text-slate-800">
                      {formatRupiah(platformFee)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Total Pembayaran:</span>
                  <span id="breakdown-grand-total" className="text-xl font-bold font-display text-[#0F4C81]">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>

                <button
                  type="button"
                  id="confirm-order-button"
                  onClick={handleCreateOrder}
                  disabled={isSubmitting || isEmptyCart}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c66] text-white text-xs font-bold transition shadow-md shadow-sky-900/15 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch size={18} weight="bold" className="animate-spin" />
                      <span>Membuat Pesanan Resmi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="bold" />
                      <span>Buat Pesanan & Bayar</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Pesanan dilindungi oleh Sistem Escrow SERVIO. Dana diteruskan ke penjual hanya setelah barang Anda terima dengan baik.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Address Selection Modal */}
      {isAddressModalOpen && (
        <div
          id="address-selection-modal"
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} weight="duotone" className="text-[#0F4C81]" />
                Pilih atau Sesuaikan Alamat Pengiriman
              </h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Saved Addresses Quick Pick */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Alamat Tersimpan Akun Anda:
                </p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => {
                        selectSavedAddress(addr);
                        setTempAddress({
                          recipientName: addr.recipientName || "Pelanggan",
                          phone: addr.phone || "0812-9988-1122",
                          street: addr.addressLine,
                          city: addr.city || "Jakarta Selatan",
                          postalCode: addr.postalCode || "12190",
                        });
                      }}
                      className="p-3 rounded-xl border border-slate-200 hover:border-[#0F4C81] hover:bg-sky-50/40 cursor-pointer text-xs transition space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-[#0F4C81]">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 line-clamp-1">{addr.addressLine}</p>
                      <p className="text-[11px] text-slate-400">{addr.city}, {addr.postalCode}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Form Editing */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Detail Alamat Tujuan:
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    id="modal-recipient-name"
                    value={tempAddress.recipientName}
                    onChange={(e) => setTempAddress({ ...tempAddress, recipientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    id="modal-recipient-phone"
                    value={tempAddress.phone}
                    onChange={(e) => setTempAddress({ ...tempAddress, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Alamat Lengkap / Jalan & Patokan
                </label>
                <textarea
                  rows={2}
                  id="modal-recipient-street"
                  value={tempAddress.street}
                  onChange={(e) => setTempAddress({ ...tempAddress, street: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kota / Kabupaten
                  </label>
                  <input
                    type="text"
                    id="modal-recipient-city"
                    value={tempAddress.city}
                    onChange={(e) => setTempAddress({ ...tempAddress, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    id="modal-recipient-postal"
                    value={tempAddress.postalCode}
                    onChange={(e) => setTempAddress({ ...tempAddress, postalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-address-modal"
                onClick={handleSaveAddressModal}
                className="px-5 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0c3c66] transition shadow-sm"
              >
                Gunakan Alamat Ini
              </button>
            </div>
          </div>
        </div>
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
