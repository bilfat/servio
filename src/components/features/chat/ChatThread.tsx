"use client";

import React from "react";
import { Check, Image as ImageIcon, ShieldCheck } from "@phosphor-icons/react";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "worker" | "support";
  message: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isRead?: boolean;
}

export interface ChatThreadProps {
  orderId: string;
  orderTitle: string;
  orderStatus: string;
  messages: ChatMessage[];
  currentUserId: string;
  className?: string;
}

export function ChatThread({
  orderId,
  orderTitle,
  orderStatus,
  messages,
  currentUserId,
  className = "",
}: ChatThreadProps) {
  return (
    <div className={`flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden font-body text-left ${className}`}>
      {/* Transaction Context Ribbon */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-servio-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky text-primary font-mono">
              #{orderId}
            </span>
            <span className="text-xs font-bold font-display text-neutral-dark truncate">
              {orderTitle}
            </span>
          </div>
          <p className="text-[10px] text-neutral-slate mt-0.5 flex items-center gap-1">
            <ShieldCheck size={12} weight="fill" className="text-emerald-600" />
            Percakapan terpantau sistem perlindungan transaksi Servio
          </p>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          {orderStatus}
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${
                isMe ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-slate">
                <span className="font-semibold text-neutral-dark">{msg.senderName}</span>
                <span>•</span>
                <span className="capitalize">{msg.senderRole}</span>
              </div>

              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2 ${
                  isMe
                    ? "bg-primary text-white rounded-tr-xs shadow-servio-xs"
                    : "bg-white text-neutral-dark border border-slate-200/90 rounded-tl-xs shadow-servio-xs"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.message}</p>

                {/* Attachment Chip */}
                {msg.attachmentUrl && (
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl text-[11px] ${
                      isMe ? "bg-white/15 text-white" : "bg-slate-100 text-neutral-dark"
                    }`}
                  >
                    <ImageIcon size={16} weight="duotone" className="shrink-0" />
                    <span className="truncate flex-1 font-mono">
                      {msg.attachmentName || "lampiran_bukti.jpg"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1 text-[9px] text-neutral-muted">
                <span>{msg.timestamp}</span>
                {isMe && (
                  <Check
                    size={12}
                    weight="bold"
                    className={msg.isRead ? "text-primary" : "text-neutral-muted"}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
