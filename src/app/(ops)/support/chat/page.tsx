"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChatCircleText,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  User,
  Storefront,
  Clock,
  ArrowLeft,
  Headset,
} from "@phosphor-icons/react";
import { useSupportOperations } from "@/features/support/useSupportOperations";

export default function SupportChatDirectoryPage() {
  const { cases } = useSupportOperations();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCases = cases.filter((c) => {
    return (
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-body text-left">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            Kanal Komunikasi Tripartite
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Obrolan Mediasi 3 Arah
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dialog langsung antara Pelanggan, Mitra Bengkel, dan Mediator CS resmi platform Servio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/support/dashboard"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            <span>Dashboard CS</span>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm">
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari ruang obrolan berdasarkan nama pihak atau ID kasus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
          />
        </div>
      </div>

      {/* Tripartite Threads List */}
      <div className="space-y-3">
        {filteredCases.map((c) => {
          const lastMessage =
            c.chatThread.length > 0
              ? c.chatThread[c.chatThread.length - 1]
              : { message: "Belum ada pesan mediasi baru.", timestamp: "Hari ini" };

          return (
            <Link
              key={c.id}
              href={`/support/chat/${c.id}`}
              className="block bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:border-teal-300 transition group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    #{c.id}
                  </span>
                  <span className="text-xs font-bold text-slate-900 font-display">
                    {c.serviceTitle}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold shrink-0">
                  {lastMessage.timestamp}
                </span>
              </div>

              {/* Parties summary */}
              <div className="flex items-center gap-3 text-xs text-slate-600 mb-3">
                <span className="flex items-center gap-1">
                  <User size={14} className="text-sky-600" />
                  {c.customerName}
                </span>
                <span className="text-slate-300">vs</span>
                <span className="flex items-center gap-1">
                  <Storefront size={14} className="text-indigo-600" />
                  {c.providerName}
                </span>
              </div>

              {/* Snippet */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-600 line-clamp-1">
                  <strong className="text-slate-900">Pesan Terakhir:</strong> {lastMessage.message}
                </p>
                <ArrowRight
                  size={16}
                  className="text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition shrink-0"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
