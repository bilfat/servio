"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useChat } from "@/features/chat/useChat";
import { ChatThread } from "@/components/features/chat/ChatThread";
import { ChatComposer } from "@/components/features/chat/ChatComposer";
import {
  ShieldCheck,
  ArrowLeft,
  Wrench,
} from "@phosphor-icons/react";

export default function ContextualChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;

  const { messages, sendMessage } = useChat(conversationId);
  const [showSafetyNotice, setShowSafetyNotice] = useState(true);

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16">
      {/* Transactional Context Header */}
      <div className="glass-card p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-servio-xs bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl text-neutral-slate hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>

          <div className="w-10 h-10 rounded-2xl bg-sky text-primary flex items-center justify-center shrink-0">
            <Wrench size={20} weight="duotone" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-sm sm:text-base text-neutral-dark truncate">
                Obrolan Teknisi Lapangan
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Terhubung
              </span>
            </div>
            <p className="text-xs text-neutral-slate truncate">
              Order ID: <strong className="text-neutral-dark">{conversationId}</strong> • Budi Santoso (HVAC Specialist)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/orders/${conversationId}`}
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-neutral-dark hover:bg-slate-50"
          >
            Detail Order
          </Link>
        </div>
      </div>

      {/* Safety Notice Callout */}
      {showSafetyNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Keamanan Transaksi:</strong> Jangan pernah melakukan transfer dana di luar sistem rekening Escrow resmi Servio. Seluruh komunikasi dalam thread ini diawasi demi keamanan garansi Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSafetyNotice(false)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Chat Thread Box */}
      <div className="glass-card rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white overflow-hidden flex flex-col h-[520px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          <ChatThread
            orderId={conversationId}
            orderTitle="Cuci & Perbaikan AC Split Wall"
            orderStatus="Dalam Pengerjaan"
            messages={messages}
            currentUserId="cust-sarah"
          />
        </div>

        {/* Composer */}
        <div className="p-3 bg-white border-t border-slate-200">
          <ChatComposer
            onSendMessage={(text, attachment) => {
              sendMessage(
                text,
                "customer",
                attachment ? { url: attachment, name: "Foto Lampiran" } : undefined
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
