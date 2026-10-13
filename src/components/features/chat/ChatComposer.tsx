"use client";

import React, { useState } from "react";
import { Paperclip, PaperPlaneRight, Image as ImageIcon } from "@phosphor-icons/react";

export interface ChatComposerProps {
  onSendMessage: (text: string, attachmentName?: string) => void;
  quickTemplates?: string[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_QUICK_TEMPLATES = [
  "Teknisi sudah tiba di lokasi?",
  "Mohon kirimkan foto komponen yang rusak.",
  "Saya setuju dengan estimasi biaya tambahan.",
  "Kapan pekerjaan diperkirakan selesai?",
];

export function ChatComposer({
  onSendMessage,
  quickTemplates = DEFAULT_QUICK_TEMPLATES,
  disabled = false,
  className = "",
}: ChatComposerProps) {
  const [text, setText] = useState("");
  const [simulatedAttachment, setSimulatedAttachment] = useState<string | null>(null);

  const handleSend = () => {
    if ((!text.trim() && !simulatedAttachment) || disabled) return;
    onSendMessage(text.trim(), simulatedAttachment || undefined);
    setText("");
    setSimulatedAttachment(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`p-3 bg-white border-t border-slate-200 space-y-2.5 font-body ${className}`}>
      {/* Quick Templates Pill Ribbon */}
      {quickTemplates.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickTemplates.map((template) => (
            <button
              key={template}
              type="button"
              disabled={disabled}
              onClick={() => setText(template)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-sky/60 hover:text-primary text-neutral-slate text-[11px] font-medium transition-colors shrink-0 whitespace-nowrap"
            >
              {template}
            </button>
          ))}
        </div>
      )}

      {/* Simulated Attachment Banner */}
      {simulatedAttachment && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-sky/40 border border-sky-200 text-xs text-primary">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon size={16} />
            <span className="truncate font-mono">{simulatedAttachment}</span>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedAttachment(null)}
            className="text-[11px] font-bold text-secondary hover:underline ml-2"
          >
            Hapus
          </button>
        </div>
      )}

      {/* Composer Row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setSimulatedAttachment("foto_kerusakan_unit_ac.jpg")}
          className="p-2.5 rounded-xl text-neutral-slate hover:text-primary hover:bg-slate-100 transition-colors shrink-0"
          title="Lampirkan foto atau dokumen"
          aria-label="Lampirkan berkas"
        >
          <Paperclip size={18} weight="bold" />
        </button>

        <input
          type="text"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan ke penyedia jasa atau teknisi..."
          className="flex-1 py-2 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all shadow-servio-xs min-h-[42px]"
        />

        <button
          type="button"
          disabled={disabled || (!text.trim() && !simulatedAttachment)}
          onClick={handleSend}
          className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-servio-xs shrink-0 flex items-center justify-center min-w-[42px] min-h-[42px]"
          title="Kirim Pesan"
          aria-label="Kirim Pesan"
        >
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>
    </div>
  );
}
