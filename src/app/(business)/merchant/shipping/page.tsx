"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Truck,
  Barcode,
  MapPin,
  ArrowRight,
  Plus,
  MagnifyingGlass,
  User,
  Package,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import {
  merchantShipmentDispatchSchema,
  MerchantShipmentDispatchFormValues,
} from "@/lib/validation/schemas";
import { MerchantShipment, MerchantShipmentStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function MerchantShippingContent() {
  const { shipments, dispatchShipment, orders } = useMerchantOperations();

  const [selectedShipment, setSelectedShipment] = useState<MerchantShipment | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Orders that are packed and ready to dispatch
  const readyToShipOrders = useMemo(() => {
    return orders.filter((o) => o.status === "PACKED");
  }, [orders]);

  // Dispatch Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MerchantShipmentDispatchFormValues>({
    resolver: zodResolver(merchantShipmentDispatchSchema),
    defaultValues: {
      orderId: "",
      courier: "SiCepat Express",
      serviceType: "REG (Reguler)",
      awbNumber: "",
      dispatchNotes: "",
    },
  });

  const openDispatchModal = (orderId?: string) => {
    if (orderId) {
      setValue("orderId", orderId);
      setValue("awbNumber", `AWB-${Math.floor(100000000 + Math.random() * 900000000)}`);
    } else {
      reset({
        orderId: readyToShipOrders[0]?.id || "",
        courier: "SiCepat Express",
        serviceType: "REG (Reguler)",
        awbNumber: `AWB-${Math.floor(100000000 + Math.random() * 900000000)}`,
        dispatchNotes: "",
      });
    }
    setIsDispatchModalOpen(true);
  };

  const onSubmitDispatch = (values: MerchantShipmentDispatchFormValues) => {
    const targetOrder = orders.find((o) => o.id === values.orderId);
    if (!targetOrder) return;

    dispatchShipment({
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      customerName: targetOrder.customerName,
      customerPhone: targetOrder.customerPhone,
      shippingAddress: targetOrder.shippingAddress,
      courier: values.courier,
      serviceType: values.serviceType,
      awbNumber: values.awbNumber,
      weightKg: 1.5,
      shippingCost: targetOrder.shippingFee,
      status: "AWAITING_PICKUP",
      estimatedDelivery: "2-3 Hari Kerja",
    });

    setIsDispatchModalOpen(false);
    reset();
    setToastMessage(`Pengiriman resi ${values.awbNumber} berhasil dibuat untuk ${targetOrder.orderNumber}!`);
  };

  const handleBulkHandover = () => {
    setToastMessage("Berita Acara Serah Terima (BAST) massal berhasil dibuat dan disahkan kurir!");
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter(
      (s) =>
        !searchQuery ||
        s.awbNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shipments, searchQuery]);

  const getStatusBadge = (status: MerchantShipmentStatus) => {
    switch (status) {
      case "AWAITING_PICKUP":
        return <Badge variant="warning" size="sm">Menunggu Pick-Up Kurir</Badge>;
      case "PICKED_UP":
        return <Badge variant="primary" size="sm">Diserahkan ke Kurir</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="primary" size="sm">Dalam Perjalanan</Badge>;
      case "OUT_FOR_DELIVERY":
        return <Badge variant="warning" size="sm">Kurir Mengantar ke Alamat</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="sm">Terkirim / Diterima</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Truck size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Pengiriman & Dispatch Logistik (AWB)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kepatuhan 12C: Pengiriman terkirim (delivered) tidak otomatis menyelesaikan pesanan sebelum rilis dana escrow
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={handleBulkHandover}
                className="text-xs"
              >
                Cetak BAST Serah Terima
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => openDispatchModal()}
                disabled={readyToShipOrders.length === 0}
                className="flex items-center gap-2"
              >
                <Plus size={18} weight="bold" />
                <span>Buat Pengiriman AWB ({readyToShipOrders.length})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Ready To Ship Banner if any */}
        {readyToShipOrders.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary text-white rounded-xl shrink-0">
                <Package size={20} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {readyToShipOrders.length} paket selesai dipacking dan menunggu pembuatan nomor resi / AWB!
                </h3>
                <p className="text-xs text-slate-600">
                  {readyToShipOrders.map((o) => o.orderNumber).join(", ")}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openDispatchModal(readyToShipOrders[0]?.id)}
              className="whitespace-nowrap"
            >
              Input Nomor Resi Sekarang
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari nomor AWB resi, pesanan, atau nama penerima..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Daftar Resi & Pengiriman Aktif
            </h2>
            <span className="text-xs text-slate-400">Terhubung langsung ke gateway kurir</span>
          </div>

          {filteredShipments.length === 0 ? (
            <EmptyState
              title="Tidak ada riwayat pengiriman"
              description="Belum ada pesanan yang didispatch atau kata kunci tidak sesuai."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Nomor Resi (AWB)</th>
                    <th className="py-3 px-4">No. Pesanan / Penerima</th>
                    <th className="py-3 px-4">Ekspedisi Kurir</th>
                    <th className="py-3 px-4">Tujuan Pengiriman</th>
                    <th className="py-3 px-4 text-center">Status Pelacakan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredShipments.map((shp) => (
                    <tr
                      key={shp.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                          <Barcode size={16} />
                          <span>{shp.awbNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Dispatched: {shp.dispatchedAt}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-800">
                          {shp.orderNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <User size={12} />
                          <span>{shp.customerName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{shp.courier}</div>
                        <div className="text-[10px] text-slate-500">{shp.serviceType}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-600 line-clamp-1 max-w-xs">
                          {shp.shippingAddress}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Estimasi: {shp.estimatedDelivery}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(shp.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedShipment(shp)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <span>Lacak Resi</span>
                          <ArrowRight size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Buat Pengiriman & Terbitkan Nomor Resi (AWB)"
      >
        <form onSubmit={handleSubmit(onSubmitDispatch)} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Pilih Pesanan Siap Kirim (Packed) *
            </label>
            <select
              {...register("orderId")}
              className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {readyToShipOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.customerName} (Rp {o.totalAmount.toLocaleString("id-ID")})
                </option>
              ))}
            </select>
            {errors.orderId && (
              <p className="text-rose-600 text-[11px] mt-1">{errors.orderId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">Ekspedisi Kurir *</label>
              <select
                {...register("courier")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="SiCepat Express">SiCepat Express</option>
                <option value="JNE Reguler">JNE Express</option>
                <option value="J&T Express">J&T Express</option>
                <option value="AnterAja">AnterAja</option>
                <option value="GoSend Instant">GoSend Sameday / Instant</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Jenis Layanan *</label>
              <input
                type="text"
                placeholder="REG (Reguler) / BEST (Next Day)"
                {...register("serviceType")}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Nomor Resi / AWB (Dibuat Otomatis atau Diubah Manual) *
            </label>
            <input
              type="text"
              {...register("awbNumber")}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold uppercase tracking-wider text-sm"
            />
            {errors.awbNumber && (
              <p className="text-rose-600 text-[11px] mt-1">{errors.awbNumber.message}</p>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">Catatan Serah Terima</label>
            <input
              type="text"
              placeholder="Contoh: Paket dijemput rider sore pukul 16:30"
              {...register("dispatchNotes")}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDispatchModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              Simpan & Terbitkan Resi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shipment Tracking Timeline Modal */}
      {selectedShipment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedShipment(null)}
          title={`Pelacakan Resi: ${selectedShipment.awbNumber}`}
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Kurir Pengantar</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedShipment.courier} ({selectedShipment.serviceType})
                </span>
                <div className="text-slate-500 font-mono mt-0.5">
                  Ref Order: {selectedShipment.orderNumber}
                </div>
              </div>
              <div>{getStatusBadge(selectedShipment.status)}</div>
            </div>

            {/* Destination */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <User size={14} />
                <span>
                  {selectedShipment.customerName} ({selectedShipment.customerPhone})
                </span>
              </div>
              <div className="text-slate-600 flex items-start gap-1.5">
                <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400" />
                <span>{selectedShipment.shippingAddress}</span>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <span className="font-bold text-slate-800 block mb-3">
                Riwayat Jejak Perjalanan (Tracking Checkpoints):
              </span>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedShipment.checkpoints.map((cp, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-primary border-2 border-white shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{cp.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cp.timestamp}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium mt-0.5">
                        {cp.location}
                      </div>
                      <p className="text-slate-600 mt-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {cp.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedShipment(null)}
              >
                Tutup Pelacakan
              </Button>
            </div>
          </div>
        </Modal>
      )}

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

export default function MerchantShippingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Pengiriman & Resi...</div>}>
      <MerchantShippingContent />
    </Suspense>
  );
}
