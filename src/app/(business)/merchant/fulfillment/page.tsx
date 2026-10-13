"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Package,
  Printer,
  Truck,
  ListChecks,
  Cube,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import {
  merchantFulfillmentPackSchema,
  MerchantFulfillmentPackFormValues,
} from "@/lib/validation/schemas";
import { MerchantFulfillment, MerchantFulfillmentStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function MerchantFulfillmentContent() {
  const { fulfillments, updateFulfillmentStatus } = useMerchantOperations();

  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [packingTarget, setPackingTarget] = useState<MerchantFulfillment | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelTarget, setLabelTarget] = useState<MerchantFulfillment | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Packing Form
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MerchantFulfillmentPackFormValues>({
    resolver: zodResolver(merchantFulfillmentPackSchema),
    defaultValues: {
      orderId: "",
      lengthCm: 25,
      widthCm: 18,
      heightCm: 12,
      weightKg: 1.2,
      packerNotes: "",
      confirmPacked: false,
    },
  });

  const openPackingModal = (ful: MerchantFulfillment) => {
    setPackingTarget(ful);
    setValue("orderId", ful.orderId);
    setValue("lengthCm", ful.boxDimensions?.lengthCm || 25);
    setValue("widthCm", ful.boxDimensions?.widthCm || 18);
    setValue("heightCm", ful.boxDimensions?.heightCm || 12);
    setValue("weightKg", ful.boxDimensions?.weightKg || 1.2);
    setIsPackModalOpen(true);
  };

  const onSubmitPack = (values: MerchantFulfillmentPackFormValues) => {
    if (!packingTarget) return;

    updateFulfillmentStatus(packingTarget.id, "PACKED", {
      lengthCm: values.lengthCm,
      widthCm: values.widthCm,
      heightCm: values.heightCm,
      weightKg: values.weightKg,
    });

    setIsPackModalOpen(false);
    reset();
    setToastMessage(`Paket untuk ${packingTarget.orderNumber} berhasil diverifikasi & dikemas!`);
  };

  const handleStartPicking = (ful: MerchantFulfillment) => {
    updateFulfillmentStatus(ful.id, "PICKING");
    setToastMessage(`Tugas picking pesanan ${ful.orderNumber} dimulai!`);
  };

  const handlePrintLabel = (ful: MerchantFulfillment) => {
    setLabelTarget(ful);
    setIsLabelModalOpen(true);
    if (ful.status === "PACKED") {
      updateFulfillmentStatus(ful.id, "LABEL_PRINTED");
    }
  };

  const getFulfillmentBadge = (status: MerchantFulfillmentStatus) => {
    switch (status) {
      case "PENDING_PICK":
        return <Badge variant="warning" size="sm">Menunggu Pick</Badge>;
      case "PICKING":
        return <Badge variant="primary" size="sm">Sedang Diambil</Badge>;
      case "PICKED":
        return <Badge variant="primary" size="sm">Selesai Ambil</Badge>;
      case "PACKING":
        return <Badge variant="primary" size="sm">Sedang Packing</Badge>;
      case "PACKED":
        return <Badge variant="success" size="sm">Selesai Packing</Badge>;
      case "LABEL_PRINTED":
        return <Badge variant="success" size="sm">Label Dicetak</Badge>;
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
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Package size={22} weight="bold" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900 font-heading">
                      Fulfillment Gudang (Outbound Pick & Pack)
                    </h1>
                    <Badge variant="primary" size="sm" className="bg-blue-100 text-blue-800">
                      OUTBOUND: Pesanan Pelanggan Retail
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Operasi gudang penyiapan fisik barang pesanan retail pelanggan (OUTBOUND): pengambilan dari rak, verifikasi dimensi kardus, penimbangan, dan pencetakan barcode resi kurir.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/business/merchant/procurement?tab=receiving">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Truck size={16} />
                  <span>Penerimaan Masuk B2B (Inbound) &rarr;</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Fulfillment Queue Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Antrean Picking</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">
              {fulfillments.filter((f) => ["PENDING_PICK", "PICKING"].includes(f.status)).length}
            </div>
            <span className="text-[10px] text-slate-400">Harus diambil dari rak segera</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Antrean Packing & Timbang</span>
            <div className="text-2xl font-bold text-purple-600 font-heading mt-1">
              {fulfillments.filter((f) => f.status === "PICKED" || f.status === "PACKING").length}
            </div>
            <span className="text-[10px] text-slate-400">Siap diberi kardus & bubble wrap</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Siap Serah Terima Kurir</span>
            <div className="text-2xl font-bold text-emerald-600 font-heading mt-1">
              {fulfillments.filter((f) => ["PACKED", "LABEL_PRINTED"].includes(f.status)).length}
            </div>
            <span className="text-[10px] text-slate-400">Telah tertempel label barcode pengiriman</span>
          </div>
        </div>

        {/* Fulfillment Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Daftar Antrean Fisik Pengemasan (Fulfillment Queue)
            </h2>
            <span className="text-xs text-slate-400">Prioritas pengemasan FIFO</span>
          </div>

          {fulfillments.length === 0 ? (
            <EmptyState
              title="Tidak ada antrean fulfillment"
              description="Semua pesanan yang masuk telah selesai dikemas atau belum ada order terkonfirmasi."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Pesanan / Prioritas</th>
                    <th className="py-3 px-4">Tujuan & Kurir</th>
                    <th className="py-3 px-4">Item Komponen & Lokasi Rak (Bin)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Alur Kerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {fulfillments.map((ful) => {
                    return (
                      <tr
                        key={ful.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {ful.orderNumber}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                ful.priority === "HIGH"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {ful.priority === "HIGH" ? "Urgent / Sameday" : "Reguler"}
                            </span>
                            <span className="text-[11px] text-slate-400">{ful.customerName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Truck size={14} className="text-slate-400" />
                            <span>{ful.courier}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ful.destinationCity}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-sm">
                            {ful.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200/60"
                              >
                                <div className="truncate mr-2">
                                  <span className="font-semibold text-slate-800">
                                    {item.quantity}x
                                  </span>{" "}
                                  <span className="text-slate-700">{item.title}</span>
                                </div>
                                <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-purple-700 font-semibold shrink-0">
                                  {item.binLocation}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getFulfillmentBadge(ful.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {ful.status === "PENDING_PICK" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartPicking(ful)}
                                className="flex items-center gap-1"
                              >
                                <ListChecks size={14} weight="bold" />
                                <span>Mulai Pick</span>
                              </Button>
                            )}

                            {ful.status === "PICKING" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openPackingModal(ful)}
                                className="flex items-center gap-1 text-purple-700 border-purple-300 bg-purple-50 hover:bg-purple-100"
                              >
                                <Cube size={14} weight="bold" />
                                <span>Packing & Timbang</span>
                              </Button>
                            )}

                            {(ful.status === "PACKED" || ful.status === "LABEL_PRINTED") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintLabel(ful)}
                                className="flex items-center gap-1.5 text-slate-700 hover:text-primary"
                              >
                                <Printer size={15} weight="bold" />
                                <span>Cetak Label</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Packing Verification Modal */}
      {packingTarget && (
        <Modal
          isOpen={isPackModalOpen}
          onClose={() => setIsPackModalOpen(false)}
          title={`Verifikasi Packing Pesanan: ${packingTarget.orderNumber}`}
        >
          <form onSubmit={handleSubmit(onSubmitPack)} className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
              <div className="font-semibold text-purple-900">
                Item Komponen yang Telah Diambil dari Rak:
              </div>
              <ul className="space-y-1 mt-1">
                {packingTarget.items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between text-slate-700">
                    <span>
                      {item.title} ({item.quantity}x)
                    </span>
                    <span className="font-mono text-[11px] text-purple-800 font-semibold">
                      {item.binLocation}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Dimensi Kotak Kardus Pengiriman (cm) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Panjang (P)</span>
                  <input
                    type="number"
                    min={1}
                    {...register("lengthCm", { valueAsNumber: true })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Lebar (L)</span>
                  <input
                    type="number"
                    min={1}
                    {...register("widthCm", { valueAsNumber: true })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Tinggi (T)</span>
                  <input
                    type="number"
                    min={1}
                    {...register("heightCm", { valueAsNumber: true })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Berat Timbangan Aktual (kg) *
              </label>
              <input
                type="number"
                step="0.05"
                min={0.05}
                {...register("weightKg", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-sm font-bold"
              />
              {errors.weightKg && (
                <p className="text-rose-600 text-[11px] mt-1">{errors.weightKg.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">Catatan Tambahan Packer</label>
              <input
                type="text"
                placeholder="Contoh: Dilapisi 3 lapis bubble wrap + lakban fragile merah"
                {...register("packerNotes")}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="confirmPacked"
                {...register("confirmPacked")}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="confirmPacked" className="font-medium text-slate-800">
                Saya mengonfirmasi bahwa produk telah dicek fisik dan disegel rapat sesuai SOP *
              </label>
            </div>
            {errors.confirmPacked && (
              <p className="text-rose-600 text-[11px]">{errors.confirmPacked.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPackModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                Konfirmasi Packing Selesai
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Shipping Label Preview Modal */}
      {labelTarget && (
        <Modal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          title={`Label Pengiriman: ${labelTarget.orderNumber}`}
        >
          <div className="space-y-4 text-xs">
            {/* Label Card */}
            <div className="border-2 border-dashed border-slate-400 p-5 rounded-2xl bg-white space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl text-primary tracking-tight font-heading">
                    SERVIO
                  </span>
                  <span className="text-[10px] bg-slate-100 font-mono px-1.5 py-0.5 rounded">
                    LOGISTICS
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {labelTarget.courier}
                  </span>
                  <div className="text-[10px] text-slate-500">STANDARD EXPEDITION</div>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="py-2 text-center bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-mono text-2xl tracking-[0.3em] font-black text-slate-800">
                  ||| | |||| | |||||| || |
                </div>
                <div className="font-mono text-xs font-bold text-slate-600 mt-1">
                  {labelTarget.labelBarcode || `AWB-${labelTarget.orderNumber.replace("ORD-MC-", "")}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Penerima:</span>
                  <div className="font-bold text-slate-900">{labelTarget.customerName}</div>
                  <div className="text-slate-600 mt-0.5">{labelTarget.destinationCity}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pengirim:</span>
                  <div className="font-bold text-slate-900">Toko Suku Cadang Sejuk Abadi</div>
                  <div className="text-slate-600 mt-0.5">Tebet, Jakarta Selatan</div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Isi Paket (Suku Cadang):
                </span>
                <div className="bg-slate-50 p-2 rounded-lg font-mono text-[11px] text-slate-700">
                  {labelTarget.items.map((it) => `${it.title} (${it.quantity}x)`).join(", ")}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                <span>Berat: {labelTarget.boxDimensions?.weightKg || 1.2} kg</span>
                <span>Dimensi: {labelTarget.boxDimensions?.lengthCm || 25}x{labelTarget.boxDimensions?.widthCm || 18}x{labelTarget.boxDimensions?.heightCm || 12} cm</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Tempelkan pada sisi atas paket yang datar.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLabelModalOpen(false)}
                >
                  Tutup
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setToastMessage("Perintah cetak terkirim ke printer thermal gudang!");
                    setIsLabelModalOpen(false);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Printer size={15} />
                  <span>Cetak ke Printer Thermal</span>
                </Button>
              </div>
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

export default function MerchantFulfillmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Antrean Fulfillment...</div>}>
      <MerchantFulfillmentContent />
    </Suspense>
  );
}
