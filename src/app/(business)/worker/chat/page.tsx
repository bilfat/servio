"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChatCircleDots,
  User,
  Wrench,
  PaperPlaneRight,
  Phone,
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { Toast } from "@/components/feedback/Toast";

export default function WorkerChatPage() {
  const { jobs } = useWorkerOperations();
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || "job-srv-001");
  const [inputText, setInputText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setToastMessage(`Pesan terkirim ke ${selectedJob.customerName}.`);
    setInputText("");
  };

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto font-body text-left">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Operasional Teknisi
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Pusat Komunikasi
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
          Obrolan & Pesan
        </h1>
        <p className="text-xs text-slate-500">
          Saluran komunikasi langsung dengan pelanggan dan dispatch bengkel mitra.
        </p>

        {/* Quick thread tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2">
          {jobs.slice(0, 6).map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedJobId(job.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedJobId === job.id
                  ? "bg-[#0F4C81] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>#{job.orderId}</span>
              <span className="font-normal opacity-80">{job.customerName.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Conversation Container */}
      {selectedJob && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[480px]">
          {/* Thread Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs shrink-0">
                {selectedJob.customerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-xs truncate">
                  {selectedJob.customerName}
                </p>
                <p className="text-slate-500 text-[10px] truncate">
                  Pesanan #{selectedJob.orderId} • {selectedJob.serviceTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${selectedJob.customerPhone}`}
                className="p-2 rounded-xl bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition text-xs font-bold flex items-center gap-1"
                title="Telepon Pelanggan"
              >
                <Phone size={14} weight="fill" />
                <span className="hidden sm:inline">Telepon</span>
              </a>

              <Link
                href={`/worker/jobs/${selectedJob.id}`}
                className="p-2 rounded-xl bg-white border border-slate-200 text-[#0F4C81] hover:bg-sky-50 transition text-xs font-bold flex items-center gap-1"
                title="Buka Lembar Kerja"
              >
                <Wrench size={14} weight="bold" />
                <span className="hidden sm:inline">Lembar Kerja</span>
              </Link>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {/* System Info Bubble */}
            <div className="text-center my-2">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium inline-block">
                Terkoneksi aman untuk pesanan #{selectedJob.orderId}
              </span>
            </div>

            {/* Simulated Customer Incoming Message */}
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                {selectedJob.customerName.charAt(0)}
              </div>
              <div className="max-w-[75%] p-3 rounded-2xl bg-slate-100 text-slate-800 space-y-1">
                <p className="text-[11px] font-bold text-slate-600">{selectedJob.customerName}</p>
                <p className="text-xs leading-relaxed">
                  Halo teknisi, mohon info estimasi tiba di lokasi ya. Keluhannya: &quot;{selectedJob.issueDescription}&quot;.
                </p>
                <span className="text-[9px] text-slate-400 block text-right">10:12 WIB</span>
              </div>
            </div>

            {/* Simulated Worker Outgoing Message */}
            <div className="flex items-end justify-end gap-2">
              <div className="max-w-[75%] p-3 rounded-2xl bg-[#0F4C81] text-white space-y-1">
                <p className="text-xs leading-relaxed">
                  Baik Bapak/Ibu {selectedJob.customerName.split(" ")[0]}, saya teknisi SERVIO sedang dalam perjalanan menuju lokasi Anda. Estimasi tiba sekitar {selectedJob.scheduledTime}.
                </p>
                <span className="text-[9px] text-sky-200 block text-right">10:15 WIB • Terkirim</span>
              </div>
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Ketik pesan untuk ${selectedJob.customerName.split(" ")[0]}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="py-2.5 px-4 rounded-xl bg-[#0F4C81] hover:bg-sky-900 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs shrink-0"
            >
              <span>Kirim</span>
              <PaperPlaneRight size={14} weight="bold" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
