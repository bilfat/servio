"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  User,
  CheckCircle,
  Phone,
  Wrench,
  Clock,
  MapPin,
  Check,
} from "@phosphor-icons/react";
import { ServiceOrder } from "../../types";
import { getStoredWorkerPhoto } from "@/features/worker/workerPhotoHelper";
import { providerApi } from "@/lib/servioApi";

interface ProviderAssignWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onConfirmAssign: (workerId: string, workerName: string, workerPhone: string) => void;
}

interface WorkerCandidate {
  id: string;
  name: string;
  phone: string;
  photo: string;
  skills: string[];
  activeJobs: number;
  distanceKm: number;
}

const ELIGIBLE_WORKERS: WorkerCandidate[] = [
  {
    id: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    name: "Ahmad Teknisi (Terverifikasi)",
    phone: "+628196677889",
    photo: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    skills: ["AC Split & Inverter", "Cuci Steam", "Kulkas & Chiller"],
    activeJobs: 0,
    distanceKm: 1.8,
  },
];

export function ProviderAssignWorkerModal({
  isOpen,
  onClose,
  order,
  onConfirmAssign,
}: ProviderAssignWorkerModalProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("acfdfc27-9ba5-472f-bec1-3c372f47fff6");
  const [candidates, setCandidates] = useState<WorkerCandidate[]>(ELIGIBLE_WORKERS);

  useEffect(() => {
    if (isOpen) {
      providerApi.getWorkers().then((res) => {
        if (res?.data && res.data.length > 0) {
          const mapped: WorkerCandidate[] = res.data.map((w: any) => ({
            id: w.userId || w.user_id || w.id,
            name: w.fullName || w.name || "Ahmad Teknisi",
            phone: w.phone || "+628196677889",
            photo:
              w.avatarUrl ||
              w.avatar ||
              w.photo_url ||
              w.photo ||
              getStoredWorkerPhoto(w.userId) ||
              getStoredWorkerPhoto(w.id) ||
              getStoredWorkerPhoto() ||
              "",
            skills: w.skills && w.skills.length > 0 ? w.skills : ["AC Split & Inverter", "Cuci Steam", "Kulkas & Chiller"],
            activeJobs: 0,
            distanceKm: 1.8,
          }));
          setCandidates(mapped);
          if (mapped[0]?.id) setSelectedWorkerId(mapped[0].id);
        }
      }).catch((err) => console.warn("Failed to fetch assignable workers:", err));
    }
  }, [isOpen]);

  if (!order) return null;

  const handleConfirm = () => {
    const candidate = candidates.find((w) => w.id === selectedWorkerId);
    if (!candidate) return;
    onConfirmAssign(candidate.id, candidate.name, candidate.phone);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih &amp; Tugaskan Teknisi Lapangan"
      size="lg"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Order Context */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pesanan #{order.orderNumber}</span>
            <span className="font-bold text-slate-900 block text-xs">
              {(() => {
                const rawTitle = order.serviceSnapshot?.title || "";
                return (!rawTitle || rawTitle.toLowerCase().includes("service offering") || /[0-9a-f]{8}-[0-9a-f]{4}/i.test(rawTitle))
                  ? "Cuci dan Servis AC Split Bergaransi Mandiri Teknik"
                  : rawTitle;
              })()}
            </span>
            <span className="text-[11px] text-slate-500">Jadwal: {order.schedule.date} ({order.schedule.timeSlot})</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-[#0F4C81] border border-sky-200 shrink-0">
            {order.addressSnapshot.city}
          </span>
        </div>

        {/* List of Eligible Workers */}
        <div className="space-y-2">
          <span className="font-bold text-slate-900 text-xs block">Daftar Teknisi Tersedia ({candidates.length})</span>

          <div className="space-y-2">
            {candidates.map((worker) => {
              const isSelected = selectedWorkerId === worker.id;
              const photo =
                (worker.photo && !worker.photo.includes("unsplash.com") ? worker.photo : null) ||
                getStoredWorkerPhoto(worker.id) ||
                getStoredWorkerPhoto();
              return (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorkerId(worker.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-sky-50 border-primary ring-2 ring-primary/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={photo} alt={worker.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{worker.name}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                        <span>{worker.phone}</span>
                        <span>•</span>
                        <span>{worker.distanceKm} km dari lokasi</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">{worker.activeJobs} Tugas Aktif</span>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {worker.skills.map((s, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <input
                      type="radio"
                      name="selectedWorker"
                      checked={isSelected}
                      onChange={() => setSelectedWorkerId(worker.id)}
                      className="w-4 h-4 accent-primary cursor-pointer pointer-events-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-slate-500 italic">
          * Teknisi yang ditugaskan akan menerima notifikasi dan memiliki waktu 30 menit operasional untuk mengonfirmasi penerimaan tugas.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle size={15} weight="bold" />
            <span>Tugaskan Teknisi Ini</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
