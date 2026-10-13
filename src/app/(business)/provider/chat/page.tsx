"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChatTeardropText,
  MagnifyingGlass,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  User,
} from "@phosphor-icons/react";
import { MOCK_ORDERS } from "@/mocks/orders";

export default function ProviderChatListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  // Orders that have active or potential chats
  const conversations = MOCK_ORDERS.map((order) => {
    const isUnread = order.id === "order-disputed" || order.id === "order-normal-progress";
    const lastMsg =
      order.id === "order-disputed"
        ? "Baik Bu Rina, saya ada di rumah jam 09:00 pagi..."
        : order.id === "order-normal-progress"
        ? "Ini hasil cek suhu awal AC ruang tamu sebelum mulai dicuci ya Bu..."
        : "Silakan konfirmasi jadwal kedatangan teknisi.";
    const lastTime = order.id === "order-disputed" ? "20 Sep 09:30" : "10:05 WIB";

    return {
      id: order.id,
      orderId: order.id,
      customerName: order.customerName || "Pelanggan Servio",
      serviceTitle: order.serviceTitle,
      status: order.status,
      lastMessage: lastMsg,
      lastTimestamp: lastTime,
      unreadCount: isUnread ? 1 : 0,
    };
  });

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.orderId.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedFilter === "ACTIVE") {
      return matchesSearch && c.status !== "COMPLETED" && c.status !== "CANCELLED";
    }
    if (selectedFilter === "COMPLETED") {
      return matchesSearch && (c.status === "COMPLETED" || c.status === "CANCELLED");
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 font-body text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Pusat Komunikasi Operasional
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky text-primary border border-sky-light">
              Terikat ID Order
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Seluruh komunikasi dengan pelanggan diawasi sistem perlindungan transaksi Servio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <ShieldCheck size={16} weight="fill" />
            <span>Escrow Chat Protected</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-servio-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor pesanan (#ord-...), atau jenis layanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["ALL", "ACTIVE", "COMPLETED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                selectedFilter === filter
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              {filter === "ALL" ? "Semua Obrolan" : filter === "ACTIVE" ? "Order Aktif" : "Selesai / Riwayat"}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread Cards */}
      <div className="grid grid-cols-1 gap-3">
        {filteredConversations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <ChatTeardropText size={44} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-neutral-dark">Tidak ada percakapan ditemukan</p>
            <p className="text-xs text-neutral-slate mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          filteredConversations.map((c) => (
            <Link
              key={c.id}
              href={`/provider/chat/${c.id}`}
              className="p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200 shadow-servio-xs hover:shadow-servio transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-sky/60 text-primary flex items-center justify-center shrink-0 font-bold font-display text-base">
                  {c.customerName.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-neutral-dark group-hover:text-primary transition-colors">
                      {c.customerName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-neutral-slate">
                      #{c.orderId}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky text-primary">
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-neutral-slate mt-0.5 truncate">
                    {c.serviceTitle}
                  </p>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-1 italic">
                    &ldquo;{c.lastMessage}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                <div className="text-right">
                  <span className="text-[11px] text-neutral-slate block">{c.lastTimestamp}</span>
                  {c.unreadCount > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">
                      Pesan Baru
                    </span>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowRight size={14} weight="bold" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
