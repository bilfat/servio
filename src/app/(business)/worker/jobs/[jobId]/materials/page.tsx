"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Package,
  Plus,
  Barcode,
  ArrowUUpLeft,
  CheckCircle,
  FloppyDisk,
  WarningCircle,
  Trash,
  QrCode,
  Wrench,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { domainRepository } from "@/lib/repository/domainRepository";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  workerMaterialUsageSchema,
  WorkerMaterialUsageFormValues,
} from "@/lib/validation/schemas";
import { WorkerSparepartStation } from "@/components/features/worker/WorkerSparepartStation";

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  barcodeNew?: string;
  serialOld?: string;
  status: "USED" | "RETURNED_TO_SHOP";
}

export default function WorkerMaterialUsagePage() {
  const params = useParams();
  const router = useRouter();
  const rawJobId = params?.jobId as string;

  const { saveMaterialUsage } = useWorkerOperations();
  const job = domainRepository.getWorkerJob(rawJobId);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Materials list
  const [materials, setMaterials] = useState<MaterialItem[]>([
    {
      id: "mat-1",
      name: "Freon R32 Tabung 1kg Original Daikin",
      quantity: 1,
      barcodeNew: "BC-R32-9902-DKN",
      serialOld: "TABUNG-RETUR-01",
      status: "USED",
    },
    {
      id: "mat-2",
      name: "Kapasitor Dual Run 35+1.5 uF",
      quantity: 1,
      barcodeNew: "BC-CAP-35UF-009",
      serialOld: "SN-OLD-PANAS-35",
      status: "USED",
    },
  ]);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // RHF + Zod for adding material (ROOT-04)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkerMaterialUsageFormValues>({
    resolver: zodResolver(workerMaterialUsageSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      status: "USED",
      barcodeNew: "",
      serialOld: "",
    },
  });

  const handleToggleStatus = (id: string) => {
    setMaterials((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "USED" ? "RETURNED_TO_SHOP" : "USED",
            }
          : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setMaterials((prev) => prev.filter((item) => item.id !== id));
    setToastMessage("Item material dihapus dari daftar.");
  };

  const onAddMaterialSubmit = (data: WorkerMaterialUsageFormValues) => {
    const created: MaterialItem = {
      id: `mat-${materials.length + 1}`,
      name: data.name,
      quantity: data.quantity,
      barcodeNew: data.barcodeNew || `BC-MANUAL-${materials.length + 1}`,
      serialOld: data.serialOld,
      status: data.status,
    };

    setMaterials((prev) => [...prev, created]);
    setShowAddModal(false);
    reset();
    setToastMessage(`Material "${created.name}" berhasil ditambahkan!`);
  };

  const handleSave = () => {
    if (!job) return;
    saveMaterialUsage(job.id, materials);
    setToastMessage("Laporan pemakaian suku cadang berhasil disimpan!");
    setTimeout(() => {
      router.push(`/worker/jobs/${job.id}`);
    }, 800);
  };

  if (!job) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <EmptyState
          icon={Wrench}
          title="Tugas Tidak Ditemukan"
          description={`Tugas dengan ID "${rawJobId || "—"}" tidak terdaftar di sistem operasional.`}
          action={
            <Link
              href="/worker/jobs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all"
            >
              Kembali ke Daftar Pekerjaan
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/worker/jobs/${job.id}`}
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            #{job.orderId}
          </span>
          <h1 className="text-base font-bold font-display text-slate-900 truncate">
            Laporan Pemakaian Sparepart
          </h1>
        </div>
      </div>

      {/* Full Phase D Sparepart Station */}
      <WorkerSparepartStation job={job} onToast={setToastMessage} />

      {/* Materials List */}
      <div className="space-y-3">
        {materials.map((item) => {
          const isUsed = item.status === "USED";

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isUsed
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}
                  >
                    <Package size={20} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-display text-slate-900 leading-snug">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Jumlah: <strong>{item.quantity} Unit</strong>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isUsed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isUsed ? "Terpasang di Unit" : "Retur ke Bengkel"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="Hapus item"
                >
                  <Trash size={16} />
                </button>
              </div>

              {/* Barcode & Serial */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {item.barcodeNew && (
                  <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-xl">
                    <Barcode size={14} className="text-[#0F4C81]" />
                    <span className="font-mono text-[10px]">{item.barcodeNew}</span>
                  </div>
                )}
                {item.serialOld && (
                  <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 p-2 rounded-xl">
                    <QrCode size={14} className="text-amber-600" />
                    <span className="font-mono text-[10px]">SN Lama: {item.serialOld}</span>
                  </div>
                )}
              </div>

              {/* Toggle Status Button */}
              <button
                type="button"
                onClick={() => handleToggleStatus(item.id)}
                className={`w-full py-1.5 text-xs font-semibold rounded-xl border transition ${
                  isUsed
                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {isUsed ? "Tandai Retur ke Bengkel" : "Tandai Terpasang di Pelanggan"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New Material Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowAddModal(true)}
        className="w-full flex items-center justify-center gap-2 border-dashed border-2 py-3 text-xs"
      >
        <Plus size={16} weight="bold" />
        <span>Tambah Sparepart / Material Baru</span>
      </Button>

      {/* Save Button */}
      <div className="pt-2">
        <Button
          type="button"
          size="lg"
          variant="primary"
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 text-sm shadow-servio-md"
        >
          <FloppyDisk size={18} weight="bold" />
          <span>Simpan Laporan Material</span>
        </Button>
      </div>

      {/* MODAL ADD MATERIAL (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tambah Suku Cadang / Material"
        description="Masukkan rincian sparepart yang digunakan dalam pengerjaan unit ini."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onAddMaterialSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Material / Suku Cadang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register("name")}
              placeholder="Contoh: Kapasitor 35 uF Daikin"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kuantitas <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                {...register("quantity")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
              {errors.quantity && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Penggunaan
              </label>
              <select
                {...register("status")}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="USED">Terpasang di Unit</option>
                <option value="RETURNED_TO_SHOP">Retur ke Bengkel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Barcode / Serial Part Baru
            </label>
            <input
              type="text"
              {...register("barcodeNew")}
              placeholder="Contoh: BC-CAP-35UF-009"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Seri Part Bekas (Untuk Garansi)
            </label>
            <input
              type="text"
              {...register("serialOld")}
              placeholder="Contoh: SN-PANAS-DEFECT-882"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Tambahkan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
