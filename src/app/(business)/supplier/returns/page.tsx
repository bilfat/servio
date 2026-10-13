"use client";

import React, { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ClockCounterClockwise,
  Receipt,
  ShieldCheck,
  Eye,
  TrendDown,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import {
  supplierReturnInspectionSchema,
  SupplierReturnInspectionFormValues,
} from "@/lib/validation/schemas";
import { SupplierReturn, SupplierReturnStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function SupplierReturnsContent() {
  const { returns, inspectReturn } = useSupplierOperations();

  const [selectedReturn, setSelectedReturn] = useState<SupplierReturn | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<SupplierReturn | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for Inspection and Credit Note Generation
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierReturnInspectionFormValues>({
    resolver: zodResolver(supplierReturnInspectionSchema),
    defaultValues: {
      returnId: "",
      condition: "PRISTINE_RESTOCK",
      creditAmount: 0,
      inspectorNotes: "",
      confirmCreditNote: false,
    },
  });

  const openInspectionModal = (ret: SupplierReturn) => {
    setInspectTarget(ret);
    setValue("returnId", ret.id);
    setValue("condition", "PRISTINE_RESTOCK");
    setValue("creditAmount", ret.totalCreditAmount);
    setValue("inspectorNotes", "Pemeriksaan fisik batch komoditas telah selesai dilakukan oleh tim QC gudang");
    setValue("confirmCreditNote", false);
    setIsInspectModalOpen(true);
  };

  const onSubmitInspection = (values: SupplierReturnInspectionFormValues) => {
    if (!inspectTarget) return;

    inspectReturn(
      values.returnId,
      values.condition,
      values.creditAmount,
      values.inspectorNotes
    );

    setIsInspectModalOpen(false);
    reset();
    setToastMessage(`Nota Kredit (Credit Note) resmi berhasil diterbitkan untuk ${inspectTarget.buyerName}!`);
  };

  const getStatusBadge = (status: SupplierReturnStatus) => {
    switch (status) {
      case "REQUESTED":
        return <Badge variant="warning" size="sm">Klaim Diajukan</Badge>;
      case "ARRIVED_WAREHOUSE":
        return <Badge variant="primary" size="sm">Tiba di Gudang</Badge>;
      case "QC_INSPECTION":
        return <Badge variant="primary" size="sm">Proses Uji QC</Badge>;
      case "CREDIT_NOTE_ISSUED":
        return <Badge variant="success" size="sm">Credit Note Terbit</Badge>;
      case "REJECTED":
        return <Badge variant="neutral" size="sm">Ditolak</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const totalCreditIssued = returns
    .filter((r) => r.status === "CREDIT_NOTE_ISSUED")
    .reduce((sum, r) => sum + r.totalCreditAmount, 0);

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
                Retur Barang B2B & Penerbitan Nota Kredit (Credit Note)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Klaim pengembalian volume palet dari mitra merchant dan bengkel rekanan, inspeksi cacat pabrik, serta kompensasi kredit tagihan
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">
              Total Nilai Nota Kredit (Credit Note) Diterbitkan
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              Rp {totalCreditIssued.toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Dipotongkan otomatis pada PO pesanan berikutnya
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">
              Tingkat Retur Grosir (Return Rate)
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
              0.42%
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
              <TrendDown size={14} weight="bold" />
              <span>Jauh di bawah batas toleransi industri (1.5%)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">
                SOP Penggantian Pabrikan
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1">
                Klaim Garansi OEM Langsung ke Pabrik Daikin / Panasonic
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Barang cacat pabrik diteruskan ke prinsipal setiap akhir bulan
            </div>
          </div>
        </div>

        {/* Returns Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Daftar Klaim Retur B2B Masuk
            </h2>
            <span className="text-xs text-slate-400">Total {returns.length} berkas</span>
          </div>

          {returns.length === 0 ? (
            <EmptyState
              title="Tidak ada klaim retur B2B"
              description="Semua pesanan grosir berjalan lancar tanpa kendala."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Retur / Ref PO</th>
                    <th className="py-3 px-4">Pembeli Mitra B2B</th>
                    <th className="py-3 px-4">Item & Alasan Pengembalian</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Nilai Kompensasi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returns.map((ret) => (
                    <tr
                      key={ret.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {ret.returnNumber}
                        </div>
                        <div className="font-mono text-[10px] text-purple-700 mt-0.5">
                          Ref: {ret.poNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">{ret.requestedAt}</div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {ret.buyerName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {ret.items.map((it, idx) => (
                            <div key={idx}>
                              <div className="font-medium text-slate-800">
                                {it.title} ({it.quantity} unit)
                              </div>
                              <div className="text-[11px] text-slate-500 italic">
                                &ldquo;{it.reason}&rdquo;
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(ret.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        Rp {ret.totalCreditAmount.toLocaleString("id-ID")}
                        {ret.creditNoteNumber && (
                          <div className="text-[10px] text-emerald-700 font-mono">
                            {ret.creditNoteNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReturn(ret)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </Button>

                          {ret.status === "QC_INSPECTION" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openInspectionModal(ret)}
                              className="text-xs bg-rose-600 hover:bg-rose-700 flex items-center gap-1"
                            >
                              <ShieldCheck size={14} weight="bold" />
                              <span>Terbitkan Credit Note</span>
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
          title={`Detail Berkas Retur B2B: ${selectedReturn.returnNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedReturn.returnNumber}
                </span>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Mitra: {selectedReturn.buyerName} • Ref PO: {selectedReturn.poNumber}
                </div>
              </div>
              <div>{getStatusBadge(selectedReturn.status)}</div>
            </div>

            {selectedReturn.creditNoteNumber && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Receipt size={18} weight="fill" />
                  <span>Nota Kredit (Credit Note) Resmi Telah Diterbitkan</span>
                </div>
                <div className="font-mono text-emerald-800 text-[11px] mt-1">
                  Nomor Dokumen: <strong>{selectedReturn.creditNoteNumber}</strong>
                </div>
                <div className="text-emerald-800 text-[11px]">
                  Nilai Kredit: <strong>Rp {selectedReturn.totalCreditAmount.toLocaleString("id-ID")}</strong>
                </div>
              </div>
            )}

            {selectedReturn.inspectorNotes && (
              <div>
                <span className="font-bold text-slate-800 block mb-1">
                  Catatan Tim QC Gudang Besar:
                </span>
                <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {selectedReturn.inspectorNotes}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedReturn(null)}
              >
                Tutup Berkas
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Inspection & Credit Note Modal */}
      {inspectTarget && (
        <Modal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          title={`Penerbitan Nota Kredit (Credit Note): ${inspectTarget.returnNumber}`}
        >
          <form onSubmit={handleSubmit(onSubmitInspection)} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-semibold text-slate-800">
                Penerima Kompensasi: {inspectTarget.buyerName}
              </div>
              <div className="text-slate-500 mt-0.5">
                Item: {inspectTarget.items.map((i) => `${i.title} (${i.quantity} unit)`).join(", ")}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kondisi Fisik Hasil Uji Laboratorium Gudang *
              </label>
              <select
                {...register("condition")}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="PRISTINE_RESTOCK">Barang Prima (Restock 100% ke Rak)</option>
                <option value="DEFECTIVE_FACTORY">Cacat Manufaktur Pabrik (Retur ke Prinsipal)</option>
                <option value="DAMAGED_SCRAP">Rusak Total / Scrap (Dimusnahkan)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Nominal Nota Kredit yang Diterbitkan (Rp) *
              </label>
              <input
                type="number"
                min={0}
                {...register("creditAmount", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm text-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Catatan Hasil Inspeksi Teknis (Minimal 10 karakter) *
              </label>
              <textarea
                rows={3}
                placeholder="Rincian hasil uji toleransi spesifikasi dan justifikasi penerbitan nota kredit..."
                {...register("inspectorNotes")}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
              {errors.inspectorNotes && (
                <p className="text-rose-600 text-[11px] mt-1">{errors.inspectorNotes.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="confirmCreditNote"
                {...register("confirmCreditNote")}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="confirmCreditNote" className="font-medium text-slate-800">
                Saya menyetujui penerbitan Nota Kredit resmi yang memotong piutang buyer *
              </label>
            </div>
            {errors.confirmCreditNote && (
              <p className="text-rose-600 text-[11px]">{errors.confirmCreditNote.message}</p>
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
                Sahkan & Terbitkan Credit Note
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

export default function SupplierReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Retur Grosir...</div>}>
      <SupplierReturnsContent />
    </Suspense>
  );
}
