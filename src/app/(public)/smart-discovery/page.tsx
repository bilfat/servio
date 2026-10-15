"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkle,
  PaperPlaneTilt,
  ShieldCheck,
  ArrowRight,
} from "@phosphor-icons/react";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  recommendation?: {
    serviceId: string;
    serviceTitle: string;
    domain: string;
    estimatedCost: string;
    recommendedPart?: string;
    urgency: "HIGH" | "MEDIUM" | "ROUTINE";
  };
}

export default function SmartDiscoveryPage() {
  const router = useRouter();
  const [inputMessage, setInputMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messageIdCounterRef = useRef(2);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Halo! Saya Asisten AI Servio. Ceritakan keluhan atau gejala kerusakan pada peralatan atau hunian Anda dengan bahasa santai. Saya akan menganalisis penyebab, estimasi biaya, dan teknisi yang paling cocok.",
    },
  ]);

  const quickSymptoms = [
    "AC tidak dingin dan keluar angin hangat",
    "MCB listrik sering anjlok mendadak saat nyalain oven",
    "Pipa pembuangan wastafel dapur rembes dan bocor",
    "Mesin cuci bergetar keras dan air tidak terbuang",
  ];

  const handleSend = useCallback((textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsgId = `usr-${messageIdCounterRef.current++}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsAnalyzing(true);

    setTimeout(() => {
      let recServiceId = "srv-ac-01";
      let recTitle = "Cuci & Perbaikan AC Split Wall";
      let recDomain = "Repair & Technical";
      let recCost = "Rp 150.000 - Rp 350.000";
      let recPart = "Freon R32 / Selang Drainase";

      if (text.toLowerCase().includes("listrik") || text.toLowerCase().includes("mcb")) {
        recServiceId = "srv-elec-01";
        recTitle = "Pemeriksaan Korsleting & Panel Listrik";
        recDomain = "Repair & Technical";
        recCost = "Rp 120.000 - Rp 250.000";
        recPart = "MCB Schneider 16A";
      } else if (
        text.toLowerCase().includes("pipa") ||
        text.toLowerCase().includes("wastafel") ||
        text.toLowerCase().includes("bocor")
      ) {
        recServiceId = "srv-plumb-01";
        recTitle = "Pelancaran Pipa Mampet & Deteksi Kebocoran";
        recDomain = "Home Installation";
        recCost = "Rp 200.000 - Rp 450.000";
        recPart = "Pipa P-Trap PVC 1.5 inch";
      }

      const aiMsgId = `ai-${messageIdCounterRef.current++}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: "Berdasarkan analisis gejala tersebut, kemungkinan besar terjadi penyumbatan pada saluran atau kebutuhan isi freon/penggantian komponen kecil. Berikut adalah estimasi layanan teknis rekomendasi kami:",
        recommendation: {
          serviceId: recServiceId,
          serviceTitle: recTitle,
          domain: recDomain,
          estimatedCost: recCost,
          recommendedPart: recPart,
          urgency: "HIGH",
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsAnalyzing(false);
    }, 700);
  }, [inputMessage]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky/40 via-white to-sky/20 shadow-servio-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary text-white shadow-servio-xs">
            <Sparkle size={26} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-white border border-sky-200">
                AI Diagnostic Engine
              </span>
              <span className="text-xs text-neutral-slate">Model Versi 2.4</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-neutral-dark mt-1">
              Smart Discovery & Diagnosa Gejala
            </h1>
          </div>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-servio-xs overflow-hidden flex flex-col h-[520px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${msg.sender === "user"
                  ? "bg-primary text-white rounded-br-none shadow-servio-xs"
                  : "bg-slate-100 text-neutral-dark rounded-bl-none border border-slate-200/70"
                  }`}
              >
                <p>{msg.text}</p>

                {/* AI Structured Recommendation Card */}
                {msg.recommendation && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-white border border-sky-200 text-neutral-dark shadow-servio-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                        {msg.recommendation.domain}
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Prioritas {msg.recommendation.urgency}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm font-display text-neutral-dark">
                      {msg.recommendation.serviceTitle}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-slate py-1 border-t border-slate-100">
                      <div>
                        <span>Estimasi Tarif:</span>
                        <p className="font-bold text-neutral-dark font-mono">
                          {msg.recommendation.estimatedCost}
                        </p>
                      </div>
                      {msg.recommendation.recommendedPart && (
                        <div>
                          <span>Potensi Sparepart:</span>
                          <p className="font-medium text-neutral-dark truncate">
                            {msg.recommendation.recommendedPart}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                        <ShieldCheck size={16} weight="fill" />
                        <span>Garansi Pekerjaan</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/bookings/new?serviceId=${msg.recommendation?.serviceId}`)
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-all flex items-center gap-1 shadow-servio-xs"
                      >
                        <span>Pesan Sekarang</span>
                        <ArrowRight size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-neutral-slate flex items-center gap-2">
                <Sparkle size={16} className="text-primary animate-spin" />
                <span>AI sedang mencocokkan kategori jasa kerusakan & estimasi biaya...</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Quick Suggestions Chips */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-neutral-slate shrink-0">Contoh Cepat:</span>
          {quickSymptoms.map((sym, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(sym)}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-neutral-slate hover:text-primary hover:border-primary text-[11px] font-medium transition-colors shrink-0 truncate max-w-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ceritakan kendala alat Anda di sini (misal: AC bunyi mendesis dan angin bau apek)..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isAnalyzing}
              aria-label="Kirim pesan diagnosa"
              className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-servio-xs active:scale-95"
            >
              <PaperPlaneTilt size={18} weight="bold" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
