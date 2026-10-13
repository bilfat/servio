"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClockCounterClockwise,
  Eye,
  VideoCamera,
  ShieldCheck,
  User,
} from "@phosphor-icons/react";
import { useMerchantOperations } from "@/features/merchant/useMerchantOperations";
import {
  merchantReturnInspectionSchema,
  MerchantReturnInspectionFormValues,
} from "@/lib/validation/schemas";
import { MerchantReturn, MerchantReturnStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function MerchantReturnsContent() {
  const { returns, inspectReturn } = useMerchantOperations();

  const [selectedReturn, setSelectedReturn] = useState<MerchantReturn | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [targetForInspection, setTargetForInspection] = useState<MerchantReturn | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for Return Inspection & Disposition
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MerchantReturnInspectionFormValues>({
    resolver: zodResolver(merchantReturnInspectionSchema),
    defaultValues: {
      returnId: "",
      condition: "GOOD",
      disposition: "ACCEPT_RESTOCK",
      acceptedQty: 1,
      rejectedQty: 0,
      inspectionNotes: "",
      refundAmount: 0,
      confirmVerdict: false,
    },
  });

  const openInspectionModal = (ret: MerchantReturn) => {
    setTargetForInspection(ret);
    const firstItem = ret.items[0];
    const totalQty = firstItem?.quantity || 1;
    const unitPrice = firstItem?.unitPrice || 0;

    setValue("returnId", ret.id);
    setValue("condition", "GOOD");
    setValue("disposition", "ACCEPT_RESTOCK");
    setValue("acceptedQty", totalQty);
    setValue("rejectedQty", 0);
    setValue("refundAmount", totalQty * unitPrice);
    setValue("inspectionNotes", "Kondisi segel dan fisik produk telah diperiksa sesuai standar");
    setValue("confirmVerdict", false);

    setIsInspectModalOpen(true);
  };

  const onSubmitInspection = (values: MerchantReturnInspectionFormValues) => {
    if (!targetForInspection) return;

    inspectReturn(
      values.returnId,
      values.disposition,
      values.acceptedQty,
      values.rejectedQty,
      values.inspectionNotes,
      values.refundAmount
    );

    setIsInspectModalOpen(false);
    reset();
    setToastMessage(`Hasil inspeksi klaim retur ${targetForInspection.orderNumber} berhasil dicatat!`);
  };

  const getReturnStatusBadge = (status: MerchantReturnStatus) => {
    switch (status) {
      case "REQUESTED":
        return <Badge variant="warning" size="sm">Menunggu Kirim Balik</Badge>;
      case "IN_TRANSIT_BACK":
        return <Badge variant="primary" size="sm">Dalam Pengiriman Balik</Badge>;
      case "RECEIVED_AWAITING_INSPECTION":
        return <Badge variant="danger" size="sm">Barang Diterima (Perlu QC)</Badge>;
      case "INSPECTING":
        return <Badge variant="primary" size="sm">Sedang Diinspeksi</Badge>;
      case "PARTIALLY_ACCEPTED":
        return <Badge variant="warning" size="sm">Diterima Sebagian (Partial)</Badge>;
      case "ACCEPTED":
        return <Badge variant="success" size="sm">Retur Disetujui Penuh</Badge>;
      case "REJECTED":
        return <Badge variant="neutral" size="sm">Retur Ditolak</Badge>;
      case "REFUND_PROCESSED":
        return <Badge variant="success" size="sm">Refund Selesai</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ClockCounterClockwise size={22} weight="bold" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Manajemen Klaim & Retur Suku Cadang
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Kepatuhan 12C: Penerimaan fisik tidak otomatis menyetujui refund dana; mendukung penerimaan parsial (sebagian disetujui, sebagian ditolak)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Returns Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Antrean Klaim Retur & Inspeksi Fisik
            </h2>
            <span className="text-xs text-slate-400">Total {returns.length} klaim tercatat</span>
          </div>

          {returns.length === 0 ? (
            <EmptyState
              title="Tidak ada klaim retur barang"
              description="Belum ada pembeli yang mengajukan pengembalian komponen suku cadang."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Pesanan / Tanggal</th>
                    <th className="py-3 px-4">Pelanggan & Alasan Klaim</th>
                    <th className="py-3 px-4">Item Komponen</th>
                    <th className="py-3 px-4 text-center">Status Klaim</th>
                    <th className="py-3 px-4 text-right">Potensi Refund</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {returns.map((ret) => (
                    <tr
                      key={ret.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {ret.orderNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Diajukan: {ret.requestedAt}
                        </div>
                        {ret.courierAwb && (
                          <div className="text-[10px] text-purple-700 font-mono mt-0.5">
                            Resi Balik: {ret.courierAwb}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400" />
                          <span>{ret.customerName}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 italic">
                          &ldquo;{ret.reason}&rdquo;
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {ret.items.map((item, idx) => (
                            <div key={idx} className="text-slate-800">
                              <span className="font-medium">{item.title}</span>{" "}
                              <span className="font-mono text-slate-500 font-semibold">
                                ({item.quantity} unit)
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getReturnStatusBadge(ret.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        Rp {ret.refundAmount.toLocaleString("id-ID")}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReturn(ret)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Eye size={14} />
                            <span>Detail</span>
                          </Button>

                          {ret.status === "RECEIVED_AWAITING_INSPECTION" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openInspectionModal(ret)}
                              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-xs"
                            >
                              <ShieldCheck size={14} weight="bold" />
                              <span>Inspeksi QC</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReturn(null)}
          title={`Detail Klaim Retur: ${selectedReturn.orderNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedReturn.orderNumber}
                </span>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Pembeli: {selectedReturn.customerName} ({selectedReturn.customerPhone})
                </div>
              </div>
              <div>{getReturnStatusBadge(selectedReturn.status)}</div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Alasan Retur:</span>
              <p className="p-2.5 bg-slate-50 rounded-xl text-slate-800 border border-slate-200">
                {selectedReturn.reason}
              </p>
            </div>

            {/* Evidence Photos */}
            <div>
              <span className="font-semibold text-slate-700 block mb-1">
                Bukti Foto Unboxing / Kerusakan dari Pembeli:
              </span>
              <div className="flex gap-2">
                {selectedReturn.evidencePhotoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100"
                  >
                    <Image
                      src={url}
                      alt="Bukti foto"
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedReturn.unboxingVideoUrl && (
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-900 font-medium">
                  <VideoCamera size={16} weight="bold" />
                  <span>Video unboxing tanpa jeda dilampirkan</span>
                </div>
                <Badge variant="primary" size="sm">Tersedia</Badge>
              </div>
            )}

            {selectedReturn.inspectionNotes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="font-semibold text-amber-900 block">
                  Catatan Hasil Pemeriksaan Teknisi QC:
                </span>
                <p className="text-amber-800">{selectedReturn.inspectionNotes}</p>
                <div className="text-[11px] font-mono text-amber-900 pt-1 border-t border-amber-200/60 flex justify-between">
                  <span>Nominal Refund Disetujui:</span>
                  <span className="font-bold">Rp {selectedReturn.refundAmount.toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReturn(null)}
              >
                Tutup
              </Button>
              {selectedReturn.status === "RECEIVED_AWAITING_INSPECTION" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const ret = selectedReturn;
                    setSelectedReturn(null);
                    openInspectionModal(ret);
                  }}
                >
                  Mulai Inspeksi QC Sekarang
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Inspection Modal */}
      {targetForInspection && (
        <Modal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          title={`Inspeksi Fisik & Disposisi Retur: ${targetForInspection.orderNumber}`}
        >
          <form onSubmit={handleSubmit(onSubmitInspection)} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-semibold text-slate-800">
                Item Komponen yang Dikembalikan:
              </div>
              <div className="text-slate-600 mt-1">
                {targetForInspection.items.map((it) => `${it.title} (Total ${it.quantity} unit, @Rp ${it.unitPrice.toLocaleString("id-ID")})`).join(", ")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Kondisi Fisik Aktual *
                </label>
                <select
                  {...register("condition")}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
                >
                  <option value="GOOD">Segel Utuh & Normal (Bisa Dijual Lagi)</option>
                  <option value="DAMAGED">Rusak / Cacat Tekuk / Patah</option>
                  <option value="WRONG_ITEM">Salah Barang / Kemasan Berbeda</option>
                  <option value="DEFECTIVE">Cacat Manufaktur Pabrik</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Disposisi Akhir Toko *
                </label>
                <select
                  {...register("disposition")}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
                >
                  <option value="ACCEPT_RESTOCK">Terima & Masukkan Kembali ke Stok</option>
                  <option value="ACCEPT_REFURBISH">Terima untuk Rekondisi</option>
                  <option value="ACCEPT_DISPOSE">Terima & Musnahkan (Scrap)</option>
                  <option value="REJECT">Tolak Retur (Kembalikan ke Pembeli)</option>
                </select>
              </div>
            </div>

            {/* Partial Accept Quantities per 12C */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-xl">
              <div>
                <label className="font-semibold text-amber-900 block mb-1">
                  Jumlah Diterima (Layak Refund) *
                </label>
                <input
                  type="number"
                  min={0}
                  {...register("acceptedQty", { valueAsNumber: true })}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-amber-900 block mb-1">
                  Jumlah Ditolak (Tidak Refund) *
                </label>
                <input
                  type="number"
                  min={0}
                  {...register("rejectedQty", { valueAsNumber: true })}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Nominal Refund yang Disetujui (Rp) *
              </label>
              <input
                type="number"
                min={0}
                {...register("refundAmount", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-primary"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sesuaikan jika ada penalti retur atau penerimaan parsial.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Catatan Hasil Inspeksi Teknis (Minimal 10 karakter) *
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan kondisi detail komponen, nomor seri, dan alasan putusan..."
                {...register("inspectionNotes")}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.inspectionNotes && (
                <p className="text-rose-600 text-[11px] mt-1">{errors.inspectionNotes.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="confirmVerdict"
                {...register("confirmVerdict")}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="confirmVerdict" className="font-medium text-slate-800">
                Saya mengonfirmasi bahwa pemeriksaan fisik telah dilakukan dan putusan bersifat final *
              </label>
            </div>
            {errors.confirmVerdict && (
              <p className="text-rose-600 text-[11px]">{errors.confirmVerdict.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInspectModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
              >
                Kirim Putusan Inspeksi
              </Button>
            </div>
          </form>
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

export default function MerchantReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Klaim Retur...</div>}>
      <MerchantReturnsContent />
    </Suspense>
  );
}
