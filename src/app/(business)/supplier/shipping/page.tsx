"use client";

import React, { useState, useMemo, Suspense } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Truck,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  Eye,
  Camera,
} from "@phosphor-icons/react";
import { useSupplierOperations } from "@/features/supplier/useSupplierOperations";
import {
  supplierKargoManifestSchema,
  SupplierKargoManifestFormValues,
} from "@/lib/validation/schemas";
import { SupplierShipment, SupplierShipmentStatus } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";

function SupplierShippingContent() {
  const { shipments, createShipmentManifest, orders } = useSupplierOperations();

  const [selectedManifest, setSelectedManifest] = useState<SupplierShipment | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [podTarget, setPodTarget] = useState<SupplierShipment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // POs ready for manifest
  const readyPOs = useMemo(() => {
    return orders.filter((o) => o.status === "PACKED" || o.status === "PREPARING");
  }, [orders]);

  // Form for New Kargo Manifest
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierKargoManifestFormValues>({
    resolver: zodResolver(supplierKargoManifestSchema),
    defaultValues: {
      poNumber: "",
      kargoCarrier: "Dakota Cargo Express",
      truckType: "CDD (Colt Diesel Double) Box",
      driverName: "Surya Kencana",
      driverPhone: "0812-9876-5432",
      plateNumber: "B 9482 FDE",
      palletCount: 2,
      totalWeightKg: 450,
      manifestNotes: "",
      confirmLoading: false,
    },
  });

  const openCreateModal = (poNum?: string) => {
    if (poNum) {
      setValue("poNumber", poNum);
    } else if (readyPOs[0]) {
      setValue("poNumber", readyPOs[0].poNumber);
    }
    setIsCreateModalOpen(true);
  };

  const onSubmitManifest = (values: SupplierKargoManifestFormValues) => {
    const targetPO = orders.find((o) => o.poNumber === values.poNumber);

    createShipmentManifest({
      poNumber: values.poNumber,
      buyerName: targetPO?.buyerName || "Buyer B2B Servio",
      destination: targetPO?.deliveryAddress || "Jabodetabek Hub",
      kargoCarrier: values.kargoCarrier,
      truckType: values.truckType,
      plateNumber: values.plateNumber,
      driverName: values.driverName,
      driverPhone: values.driverPhone,
      palletCount: values.palletCount,
      totalWeightKg: values.totalWeightKg,
      status: "SCHEDULED",
      estimatedArrival: "Besok (1-2 Hari Kerja)",
    });

    setIsCreateModalOpen(false);
    reset();
    setToastMessage(`Surat Jalan Kargo Manifest untuk PO ${values.poNumber} berhasil diterbitkan!`);
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter(
      (s) =>
        !searchQuery ||
        s.manifestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.driverName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shipments, searchQuery]);

  const getStatusBadge = (status: SupplierShipmentStatus) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge variant="warning" size="sm">Jadwal Keberangkatan</Badge>;
      case "LOADING_CARGO":
        return <Badge variant="primary" size="sm">Pemuatan Truk</Badge>;
      case "DEPARTED":
        return <Badge variant="primary" size="sm">Armada Berangkat</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="primary" size="sm">Dalam Perjalanan Kargo</Badge>;
      case "DELIVERED":
        return <Badge variant="success" size="sm">Bongkar Selesai (POD)</Badge>;
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
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Truck size={22} weight="bold" />
                </span>
                <h1 className="text-xl font-bold text-slate-900 font-heading">
                  Surat Jalan & Manifest Ekspedisi Kargo B2B
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Administrasi logistik pengangkutan truk besar, pelacakan armada ekspedisi, dan verifikasi bukti terima (POD)
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => openCreateModal()}
              className="flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              <span>Buat Manifest Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari nomor manifest, nomor PO, nama pembeli, atau sopir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Manifest Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              Daftar Manifest Pengiriman Kargo Nasional
            </h2>
            <span className="text-xs text-slate-400">Total {shipments.length} armada terdaftar</span>
          </div>

          {filteredShipments.length === 0 ? (
            <EmptyState
              title="Tidak ada manifest ditemukan"
              description="Belum ada surat jalan kargo yang sesuai dengan kata kunci pencarian."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Manifest / Ref PO</th>
                    <th className="py-3 px-4">Pembeli & Tujuan Kargo</th>
                    <th className="py-3 px-4">Ekspedisi & Jenis Armada</th>
                    <th className="py-3 px-4">Pengemudi / No. Polisi</th>
                    <th className="py-3 px-4 text-center">Muatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map((shp) => (
                    <tr
                      key={shp.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {shp.manifestNumber}
                        </div>
                        <div className="font-mono text-[10px] text-purple-700 mt-0.5">
                          PO: {shp.poNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {shp.buyerName}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {shp.destination}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{shp.kargoCarrier}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {shp.truckType}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{shp.driverName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {shp.plateNumber} ({shp.driverPhone})
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                        <span className="font-bold text-slate-800">{shp.palletCount} Palet</span>
                        <div className="text-[10px] text-slate-500">{shp.totalWeightKg} kg</div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(shp.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {shp.status === "DELIVERED" && shp.podImageUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPodTarget(shp)}
                              className="text-xs flex items-center gap-1 text-emerald-700 border-emerald-200 bg-emerald-50"
                            >
                              <Camera size={13} />
                              <span>Lihat POD</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedManifest(shp)}
                            className="text-xs flex items-center gap-1"
                          >
                            <Eye size={13} />
                            <span>Surat Jalan</span>
                          </Button>
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

      {/* Create Manifest Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Terbitkan Surat Jalan Manifest Kargo B2B"
      >
        <form onSubmit={handleSubmit(onSubmitManifest)} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Nomor Purchase Order (PO) *
            </label>
            <input
              type="text"
              placeholder="PO-B2B-2026-0045"
              {...register("poNumber")}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-mono uppercase font-bold"
            />
            {errors.poNumber && (
              <p className="text-rose-600 text-[11px] mt-1">{errors.poNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Ekspedisi Kargo Logistik *
              </label>
              <select
                {...register("kargoCarrier")}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Dakota Cargo Express">Dakota Cargo Express</option>
                <option value="Indah Logistik Kargo">Indah Logistik Kargo</option>
                <option value="JNE Trucking (JTR)">JNE Trucking (JTR)</option>
                <option value="Internal Fleet Servio B2B">Internal Fleet Servio B2B</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Jenis Armada Truk *
              </label>
              <select
                {...register("truckType")}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="CDE (Colt Diesel Engkel) Box 2-Ton">CDE Engkel Box (2-Ton)</option>
                <option value="CDD (Colt Diesel Double) Box 4-Ton">CDD Double Box (4-Ton)</option>
                <option value="Fuso Heavy Duty Box 8-Ton">Fuso Box (8-Ton)</option>
                <option value="Tronton Wingbox 15-Ton">Tronton Wingbox (15-Ton)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Nama Pengemudi / Sopir *
              </label>
              <input
                type="text"
                placeholder="Bpk. Hendra Gunawan"
                {...register("driverName")}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
              {errors.driverName && (
                <p className="text-rose-600 text-[11px] mt-1">{errors.driverName.message}</p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                No. HP Sopir *
              </label>
              <input
                type="text"
                placeholder="0812-9988-7766"
                {...register("driverPhone")}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                No. Polisi Truk *
              </label>
              <input
                type="text"
                placeholder="B 9001 SERV"
                {...register("plateNumber")}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Jumlah Palet *
              </label>
              <input
                type="number"
                min={1}
                {...register("palletCount", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Total Berat (kg) *
              </label>
              <input
                type="number"
                min={1}
                {...register("totalWeightKg", { valueAsNumber: true })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Catatan Instruksi Bongkar
            </label>
            <input
              type="text"
              placeholder="Contoh: Lokasi memiliki loading dock, butuh pallet jack"
              {...register("manifestNotes")}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="confirmLoading"
              {...register("confirmLoading")}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            <label htmlFor="confirmLoading" className="font-medium text-slate-800">
              Muatan telah diikat aman (strapping) dan dokumen lolos timbangan gerbang *
            </label>
          </div>
          {errors.confirmLoading && (
            <p className="text-rose-600 text-[11px]">{errors.confirmLoading.message}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              Terbitkan Surat Jalan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manifest Detail View Modal */}
      {selectedManifest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedManifest(null)}
          title={`Surat Jalan Kargo: ${selectedManifest.manifestNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedManifest.manifestNumber}
                  </span>
                  <div className="text-[11px] text-slate-500 font-mono">
                    PO Referensi: {selectedManifest.poNumber}
                  </div>
                </div>
                <div>{getStatusBadge(selectedManifest.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Penerima:</span>
                  <div className="font-bold text-slate-900">{selectedManifest.buyerName}</div>
                  <div className="text-slate-600 mt-0.5">{selectedManifest.destination}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Armada Pengangkut:</span>
                  <div className="font-bold text-slate-900">{selectedManifest.kargoCarrier}</div>
                  <div className="text-slate-600 font-mono mt-0.5">
                    {selectedManifest.truckType} • Plat: {selectedManifest.plateNumber}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Sopir: {selectedManifest.driverName} ({selectedManifest.driverPhone})
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 flex items-center justify-between font-mono text-[11px]">
                <span>Total Muatan: <strong>{selectedManifest.palletCount} Palet Kayu</strong></span>
                <span>Total Tonase: <strong>{selectedManifest.totalWeightKg} kg</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedManifest(null)}
              >
                Tutup Dokumen
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Proof of Delivery (POD) Modal */}
      {podTarget && (
        <Modal
          isOpen={true}
          onClose={() => setPodTarget(null)}
          title={`Bukti Penerimaan Kargo (POD): ${podTarget.manifestNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle size={16} weight="fill" />
                <span>Muatan Telah Diterima Lengkap & Selesai Dibongkar</span>
              </div>
              <div className="text-emerald-800 text-[11px]">
                Disahkan oleh: <strong>{podTarget.podSignedBy}</strong> pada {podTarget.deliveredAt}
              </div>
            </div>

            {podTarget.podImageUrl && (
              <div>
                <span className="font-bold text-slate-800 block mb-1">
                  Foto Bukti Bongkar & Lembar Surat Jalan Bertandatangan:
                </span>
                <div className="w-full h-56 rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
                  <Image
                    src={podTarget.podImageUrl}
                    alt="POD Dokumentasi"
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPodTarget(null)}
              >
                Tutup Bukti
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

export default function SupplierShippingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Manifest Kargo...</div>}>
      <SupplierShippingContent />
    </Suspense>
  );
}
