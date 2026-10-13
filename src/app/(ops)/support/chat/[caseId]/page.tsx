"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChatCircleText,
  PaperPlaneTilt,
  ShieldCheck,
  WarningCircle,
  Clock,
  User,
  Storefront,
  Headset,
  FileText,
  Gavel,
  CheckCircle,
  Sparkle,
} from "@phosphor-icons/react";
import { useSupportOperations, TripartiteChatMessage } from "@/features/support/useSupportOperations";
import { Toast } from "@/components/feedback/Toast";

export default function SupportTripartiteChatPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = (params?.caseId as string) || "disp-901";

  const { getCaseById, sendTripartiteMessage } = useSupportOperations();
  const currentCase = getCaseById(caseId);

  const [inputMessage, setInputMessage] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cannedResponses = [
    "Selamat pagi/siang. Saya Rina dari Tim Mediasi Servio. Mohon kedua belah pihak menyampaikan kronologi secara objektif.",
    "Berdasarkan foto yang terlampir, mohon pihak mitra memberikan klarifikasi terkait pembersihan saluran drainase dalam 2 jam.",
    "Pelanggan dan mitra dimohon menunggu, kami sedang melakukan verifikasi teknis bersama tim supervisor.",
    "Putusan mediasi resmi telah diterbitkan di portal. Mohon kedua pihak membaca klausul penyelesaian yang berlaku.",
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    sendTripartiteMessage(
      currentCase.id,
      inputMessage,
      "SUPPORT_MEDIATOR",
      "Rina Kusuma (Mediator CS)"
    );
    setInputMessage("");
    setToastMessage("Pesan mediasi resmi berhasil dipancarkan ke obrolan 3 arah.");
  };

  const handleApplyCanned = (text: string) => {
    setInputMessage(text);
  };

  return (
    <div className="space-y-4 pb-20 max-w-3xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header Context Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/support/cases/${currentCase.id}`}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition shrink-0"
            >
              <ArrowLeft size={18} weight="bold" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                  #{currentCase.id}
                </span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Tripartite Mediation Channel
                </span>
              </div>
              <h1 className="text-base font-bold font-display text-slate-900 mt-0.5">
                {currentCase.serviceTitle}
              </h1>
            </div>
          </div>

          <Link
            href={`/support/cases/${currentCase.id}`}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
          >
            <Gavel size={15} />
            <span>Form Putusan</span>
          </Link>
        </div>

        {/* Status ticker */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <User size={15} className="text-sky-600" />
              <strong>{currentCase.customerName}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Storefront size={15} className="text-indigo-600" />
              <strong>{currentCase.providerName}</strong>
            </span>
          </div>

          <span className="font-mono text-emerald-700 font-bold">
            Escrow: Rp {currentCase.escrowAmount.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-3.5 overflow-y-auto max-h-[420px] pr-1">
          {/* Security Mediation Disclaimer */}
          <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/70 text-center text-xs text-teal-900 space-y-0.5">
            <p className="font-bold flex items-center justify-center gap-1">
              <ShieldCheck size={16} weight="fill" className="text-teal-700" />
              Ruang Mediasi Terenkripsi & Diawasi CS Servio
            </p>
            <p className="text-[11px] text-teal-800">
              Seluruh rekaman pesan mengikat secara hukum untuk bahan pertimbangan pencairan atau pengembalian dana escrow.
            </p>
          </div>

          {currentCase.chatThread.map((msg) => {
            const isMediator = msg.senderRole === "SUPPORT_MEDIATOR";
            const isCustomer = msg.senderRole === "CUSTOMER";
            const isProvider = msg.senderRole === "PROVIDER";

            if (msg.isSystemNotice) {
              return (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 my-2"
                >
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Gavel size={15} weight="fill" />
                    Pemberitahuan Sistem Mediasi:
                  </p>
                  <p className="whitespace-pre-line text-[11px] text-slate-800 leading-relaxed">
                    {msg.message}
                  </p>
                  <span className="text-[10px] text-slate-400 block text-right mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  isMediator
                    ? "bg-teal-50/60 border-teal-200 ml-4"
                    : isCustomer
                    ? "bg-sky-50/50 border-sky-200 mr-4"
                    : "bg-slate-50 border-slate-200 mr-4"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-bold text-xs flex items-center gap-1.5 ${
                      isMediator
                        ? "text-teal-900"
                        : isCustomer
                        ? "text-sky-900"
                        : "text-indigo-900"
                    }`}
                  >
                    {isMediator ? (
                      <Headset size={14} weight="fill" className="text-teal-700" />
                    ) : isCustomer ? (
                      <User size={14} className="text-sky-600" />
                    ) : (
                      <Storefront size={14} className="text-indigo-600" />
                    )}
                    {msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                </div>

                <p className="text-slate-800 leading-relaxed">{msg.message}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Canned Responses */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Template Respon Cepat Mediator:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {cannedResponses.map((res, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyCanned(res)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-left truncate max-w-xs transition"
                title={res}
              >
                {res.slice(0, 36)}...
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="pt-2 flex gap-2">
          <input
            type="text"
            placeholder="Ketik instruksi atau arahan mediasi resmi..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 shrink-0"
          >
            <PaperPlaneTilt size={16} weight="bold" />
            <span>Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
}
