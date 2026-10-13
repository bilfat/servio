"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  PaperPlaneRight,
  Paperclip,
  Check,
  CheckCircle,
  Clock,
  User,
  Car,
  FileText,
  Warning,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import { MOCK_ORDERS } from "@/mocks/orders";
import { MOCK_CHAT_THREADS } from "@/mocks/chat";
import { ChatMessage } from "@/components/features/chat/ChatThread";

export default function ProviderContextualChatPage() {
  const params = useParams();
  const conversationId = (params?.conversationId as string) || "order-normal-progress";

  const order =
    MOCK_ORDERS.find((o) => o.id === conversationId) ||
    MOCK_ORDERS[0];

  const initialMessages = MOCK_CHAT_THREADS[conversationId] || [
    {
      id: "init-1",
      senderId: "customer",
      senderName: order.customerName || "Pelanggan",
      senderRole: "customer",
      message: "Halo, teknisi bengkel kapan estimasi tiba di lokasi?",
      timestamp: "09:00",
      isRead: true,
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  const quickActionTemplates = [
    { label: "🚗 Teknisi Menuju Lokasi (ETA 15 Menit)", text: "Halo Kak, teknisi kami sudah diberangkatkan dari workshop dan estimasi tiba dalam 15 menit. Mohon pastikan gerbang/akses dapat dimasuki." },
    { label: "📍 Teknisi Sudah Tiba di Depan", text: "Selamat siang Kak, teknisi kami sudah tiba di depan rumah/lokasi membawa perlengkapan lengkap." },
    { label: "⚡ Akses Listrik & Air", text: "Mohon izin Kak, apakah stop kontak dan sumber air terdekat untuk cuci unit sudah siap digunakan?" },
    { label: "📸 Lampiran Bukti Teknis", text: "Berikut kami lampirkan foto pengecekan komponen teknis sebelum pengerjaan dimulai." },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() && !attachedFile) return;

    setIsSending(true);

    setTimeout(() => {
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: "provider-operator",
        senderName: "Bintang Teknik (Mitra Provider)",
        senderRole: "worker",
        message: text,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
        attachmentUrl: attachedFile ? "/mocks/sop-temp-test.jpg" : undefined,
        attachmentName: attachedFile || undefined,
      };

      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
      setAttachedFile(null);
      setIsSending(false);
    }, 200);
  };

  const simulateAttachPhoto = () => {
    setAttachedFile("foto-pengecekan-teknis-" + Date.now().toString().slice(-4) + ".jpg");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[550px] font-body text-left">
      {/* Top Bar with Context */}
      <div className="bg-white border border-slate-200 rounded-t-2xl p-4 shadow-servio-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/provider/chat"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-neutral-dark transition-colors"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-display text-neutral-dark">
                {order.customerName || "Pelanggan Servio"}
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky text-primary font-semibold">
                #{order.id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-neutral-slate truncate max-w-md mt-0.5">
              {order.serviceTitle} • Jadwal: {order.scheduledDate || "21 Sep 2026, 10:00 WIB"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Link
            href={`/provider/orders/${order.id}`}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-neutral-dark flex items-center gap-1.5"
          >
            <FileText size={15} />
            <span>Workspace Order</span>
          </Link>
        </div>
      </div>

      {/* Escrow Banner Note */}
      <div className="bg-sky/40 px-4 py-2 border-x border-slate-200 flex items-center justify-between text-xs text-neutral-dark shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} weight="fill" className="text-primary shrink-0" />
          <span>Percakapan terikat garansi & escrow Servio. Dilarang meminta transfer pribadi ke rekening non-aplikasi.</span>
        </div>
        <span className="text-[10px] text-neutral-slate font-medium hidden sm:inline">ID Sesi: CHAT-{conversationId}</span>
      </div>

      {/* Message History Area */}
      <div className="flex-1 bg-slate-50/60 border-x border-slate-200 p-4 overflow-y-auto space-y-3.5">
        {messages.map((msg) => {
          const isMe = msg.senderRole === "worker" || msg.senderRole === "support";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  {msg.senderName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {msg.timestamp}
                </span>
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                  isMe
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-white text-neutral-dark border border-slate-200 rounded-tl-sm"
                }`}
              >
                <p>{msg.message}</p>

                {msg.attachmentName && (
                  <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 border ${
                    isMe ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-neutral-dark"
                  }`}>
                    <ImageIcon size={18} />
                    <span className="text-[11px] font-mono truncate">{msg.attachmentName}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Ribbon */}
      <div className="bg-white border-x border-slate-200 px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
          Aksi Cepat ETA:
        </span>
        {quickActionTemplates.map((tpl, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(tpl.text)}
            className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-100 hover:bg-sky/60 hover:text-primary text-neutral-slate transition-colors shrink-0 whitespace-nowrap"
          >
            {tpl.label}
          </button>
        ))}
      </div>

      {/* Attachment Preview if any */}
      {attachedFile && (
        <div className="px-4 py-2 bg-sky-light/40 border-x border-slate-200 flex items-center justify-between text-xs text-primary shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} />
            <span className="font-mono text-[11px]">{attachedFile}</span>
            <span className="text-[10px] text-slate-500">(Siap dikirim)</span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-[11px] font-bold hover:underline"
          >
            Batal
          </button>
        </div>
      )}

      {/* Input Composer */}
      <div className="bg-white border border-slate-200 rounded-b-2xl p-3 shadow-servio-xs shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={simulateAttachPhoto}
          title="Lampirkan Foto Teknis"
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors shrink-0"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          placeholder="Ketik pesan resmi ke pelanggan atau pilih pesan cepat di atas..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />

        <button
          type="button"
          disabled={(!inputText.trim() && !attachedFile) || isSending}
          onClick={() => handleSendMessage()}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0"
        >
          <span>Kirim</span>
          <PaperPlaneRight size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
