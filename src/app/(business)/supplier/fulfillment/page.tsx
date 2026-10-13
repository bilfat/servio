"use client";

import React, { useState, Suspense } from "react";
import {
  ShieldCheck,
  Cube,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import { SupplierFulfillment } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function SupplierFulfillmentContent() {
  const {
    fulfillments,
    updateFulfillmentQC,
    updateFulfillmentStatus,
  } = useSupplierOperations();

  const [selectedFulfillment, setSelectedFulfillment] = useState<SupplierFulfillment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToggleQC = (fulId: string, checkId: string, currentPassed: boolean) => {
    updateFulfillmentQC(fulId, checkId, !currentPassed);
    setToastMessage("Status checklist inspeksi QC berhasil diperbarui!");
    if (selectedFulfillment && selectedFulfillment.id === fulId) {
      const updatedList = selectedFulfillment.qcChecklist.map((c) =>
        c.id === checkId ? { ...c, isPassed: !currentPassed } : c
      );
      setSelectedFulfillment({
        ...selectedFulfillment,
        qcChecklist: updatedList,
      });
    }
  };

  const handleAdvanceStatus = (
    ful: SupplierFulfillment,
    nextStatus: SupplierFulfillment["status"],
    label: string
  ) => {
    updateFulfillmentStatus(ful.id, nextStatus);
    setToastMessage(`Status fulfillment ${ful.poNumber} dialihkan ke: ${label}`);
    if (selectedFulfillment && selectedFulfillment.id === ful.id) {
      setSelectedFulfillment({
        ...selectedFulfillment,
        status: nextStatus,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "QUEUED":
        return <Badge variant="warning" size="sm">Antre Staging</Badge>;
      case "PALLETIZING":
        return <Badge variant="primary" size="sm">Palletizing & Strapping</Badge>;
      case "QC_IN_PROGRESS":
        return <Badge variant="primary" size="sm">Inspeksi QC</Badge>;
      case "QC_PASSED":
        return <Badge variant="success" size="sm">Lolos QC Pabrik</Badge>;
      case "MANIFEST_GENERATED":
        return <Badge variant="success" size="sm">Manifest Terbit</Badge>;
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
                  <Cube size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Fulfillment Kargo & Quality Control Pre-Shipment
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Proses penyusunan palet muatan berat (Palletizing), uji kebocoran gas/pipa bertekanan, dan inspeksi segel mutu ISO
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Kargo Queue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Antrean Palletizing</span>
            <div className="text-2xl font-bold text-slate-900 font-heading mt-1">
              {fulfillments.filter((f) => f.status === "QUEUED" || f.status === "PALLETIZING").length} PO
            </div>
            <span className="text-[10px] text-slate-400">Penyusunan palet kayu & wrapping</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Sedang Uji Teknis QC</span>
            <div className="text-2xl font-bold text-purple-600 font-heading mt-1">
              {fulfillments.filter((f) => f.status === "QC_IN_PROGRESS").length} PO
            </div>
            <span className="text-[10px] text-slate-400">Pemeriksaan sampling uji lab</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-medium text-slate-500 block">Lolos QC Siap Muat Truk</span>
            <div className="text-2xl font-bold text-emerald-600 font-heading mt-1">
              {fulfillments.filter((f) => f.status === "QC_PASSED" || f.status === "MANIFEST_GENERATED").length} PO
            </div>
            <span className="text-[10px] text-slate-400">Siap diterbitkan surat jalan kargo</span>
          </div>
        </div>

        {/* Fulfillments Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Antrean Muatan Kargo B2B (Pallet Manifest Queue)
            </h2>
            <span className="text-xs text-slate-400">Standar Fumigasi ISPM 15</span>
          </div>

          {fulfillments.length === 0 ? (
            <EmptyState
              title="Tidak ada antrean kargo aktif"
              description="Semua PO telah dimuat atau belum ada order masuk ke fase persiapan."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. PO / Tanggal</th>
                    <th className="py-3 px-4">Pembeli & Tujuan Kargo</th>
                    <th className="py-3 px-4">Muatan Palet & Tonase</th>
                    <th className="py-3 px-4">Item Komoditas</th>
                    <th className="py-3 px-4 text-center">Status QC</th>
                    <th className="py-3 px-4 text-right">Aksi Alur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fulfillments.map((ful) => {
                    return (
                      <tr
                        key={ful.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                            {ful.poNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Dibuat: {ful.createdAt}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 line-clamp-1">
                            {ful.buyerName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Tujuan: {ful.destinationCity}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-purple-700">
                            {ful.palletCount} Palet Kayu
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Berat: {ful.totalWeightKg} kg
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-xs">
                            {ful.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100"
                              >
                                <span className="truncate mr-2 font-medium text-slate-800">
                                  {it.title}
                                </span>
                                <span className="font-mono text-primary font-bold shrink-0">
                                  {it.packedQty}/{it.requestedQty}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(ful.status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedFulfillment(ful)}
                              className="text-xs flex items-center gap-1"
                            >
                              <ShieldCheck size={14} />
                              <span>Checklist QC</span>
                            </Button>

                            {ful.status === "QUEUED" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  handleAdvanceStatus(
                                    ful,
                                    "PALLETIZING",
                                    "Proses Palletizing"
                                  )
                                }
                                className="text-xs"
                              >
                                Mulai Palletizing
                              </Button>
                            )}

                            {ful.status === "PALLETIZING" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleAdvanceStatus(
                                    ful,
                                    "QC_IN_PROGRESS",
                                    "Inspeksi Teknis QC"
                                  )
                                }
                                className="text-xs text-purple-700 border-purple-300"
                              >
                                Ajukan Uji QC
                              </Button>
                            )}

                            {ful.status === "QC_PASSED" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  handleAdvanceStatus(
                                    ful,
                                    "MANIFEST_GENERATED",
                                    "Manifest Siap Angkut"
                                  )
                                }
                                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                Generate Manifest
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

      {/* QC Checklist & Inspection Modal */}
      {selectedFulfillment && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFulfillment(null)}
          title={`Verifikasi QC Pre-Shipment: ${selectedFulfillment.poNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-purple-950 text-sm">
                  {selectedFulfillment.poNumber}
                </span>
                <div className="text-[11px] text-purple-800 mt-0.5">
                  Pembeli: {selectedFulfillment.buyerName} ({selectedFulfillment.destinationCity})
                </div>
              </div>
              <div>{getStatusBadge(selectedFulfillment.status)}</div>
            </div>

            {/* QC Check items */}
            <div>
              <span className="font-bold text-slate-800 block mb-2">
                Daftar Uji Kepatuhan Mutu & Keselamatan Muatan:
              </span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {selectedFulfillment.qcChecklist.map((check) => (
                  <div
                    key={check.id}
                    onClick={() =>
                      handleToggleQC(
                        selectedFulfillment.id,
                        check.id,
                        check.isPassed
                      )
                    }
                    className="p-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={check.isPassed}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          check.isPassed ? "text-slate-900 font-semibold" : "text-slate-700"
                        }`}
                      >
                        {check.checkLabel}
                      </div>
                      {check.notes && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded mt-1">
                          Catatan: {check.notes}
                        </div>
                      )}
                    </div>
                    {check.isPassed ? (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        PASSED
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                        PENDING
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pallet breakdown */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">
                Alokasi Nomor Palet Muatan:
              </span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                {selectedFulfillment.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-200/60 pb-1">
                    <span className="text-slate-700">{it.title} ({it.packedQty} unit)</span>
                    <span className="font-bold text-purple-800">{it.palletNumber}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Lead Auditor: {selectedFulfillment.inspectedBy || "Bachtiar (Lead QC)"}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedFulfillment(null)}
              >
                Simpan & Selesai
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

export default function SupplierFulfillmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Fulfillment Kargo...</div>}>
      <SupplierFulfillmentContent />
    </Suspense>
  );
}
