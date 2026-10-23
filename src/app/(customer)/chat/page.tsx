"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChatCircleText,
  MagnifyingGlass,
  PaperPlaneRight,
  ShieldCheck,
  Check,
  Checks,
  Image as ImageIcon,
  Clock,
  Package,
  Wrench,
  Receipt,
  ArrowLeft,
  Sparkle,
  ArrowRight,
  Info,
  CircleNotch,
} from "@phosphor-icons/react";
import {
  INITIAL_CHAT_CONVERSATIONS,
  ChatConversation,
  ChatCategory,
  ChatMessageItem,
} from "@/mocks/customerChat.mock";

export default function CustomerChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CHAT_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string>("chat-active-srv-01");
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeChat = conversations.find((c) => c.id === activeChatId) || conversations[0];

  // Scroll messages container to bottom when messages update
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeChat?.messages, isTyping]);

  // Mark active chat as read
  useEffect(() => {
    if (activeChat && activeChat.unreadCount > 0) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeChat.id) {
            return {
              ...c,
              unreadCount: 0,
              messages: c.messages.map((m) => ({ ...m, isRead: true })),
            };
          }
          return c;
        })
      );
    }
  }, [activeChatId]);

  // Prevent any browser window scrollbar on chat page
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesCategory =
      selectedCategory === "ALL" || c.category === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === "" ||
      c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.orderNumber && c.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getUnreadCountForCategory = (cat: ChatCategory) => {
    if (cat === "ALL") {
      return conversations.reduce((acc, c) => acc + c.unreadCount, 0);
    }
    return conversations
      .filter((c) => c.category === cat)
      .reduce((acc, c) => acc + c.unreadCount, 0);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeChat) return;

    const newMsg: ChatMessageItem = {
      id: `m-${Date.now()}`,
      senderId: "customer-user",
      senderName: "Ahmad Fauzi",
      senderRole: "customer",
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isRead: false,
    };

    const updatedConversations = conversations.map((c) => {
      if (c.id === activeChat.id) {
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: "Baru saja",
          messages: [...c.messages, newMsg],
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    setInputMessage("");

    // Simulate partner response
    setIsTyping(true);
    setTimeout(() => {
      let replyText = "Baik Pak/Kak, pesan Anda sudah kami terima dan akan segera kami tindak lanjuti.";
      if (activeChat.category === "ACTIVE_ORDER") {
        replyText = "Siap Pak, informasi ini sudah dicatat oleh teknisi/tim logistik kami. Mohon ditunggu ya!";
      } else if (activeChat.category === "COMPLETED_ORDER") {
        replyText = "Terima kasih atas konfirmasinya Pak Ahmad. Jika ada kendala terkait garansi jangan ragu hubungi kami kembali.";
      } else if (activeChat.category === "GENERAL_INQUIRY") {
        replyText = "Tentu kak, produk/layanan ini 100% original dan bergaransi resmi Servio. Kakak bisa langsung checkout melalui tombol di atas ya!";
      }

      const replyMsg: ChatMessageItem = {
        id: `m-reply-${Date.now()}`,
        senderId: activeChat.partnerId,
        senderName: activeChat.partnerName,
        senderRole: activeChat.itemType === "PRODUCT" ? "merchant" : "worker",
        message: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isRead: true,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeChat.id) {
            return {
              ...c,
              lastMessage: replyText,
              lastMessageTime: "Baru saja",
              messages: [...c.messages, replyMsg],
            };
          }
          return c;
        })
      );
      setIsTyping(false);
    }, 1200);
  };

  const handleSendQuickChip = (text: string) => {
    handleSendMessage(text);
  };

  return (
    <div className="h-full max-h-full flex-1 w-full min-h-0 overflow-hidden flex flex-col bg-slate-100/70">
      {/* 1. Header Strip Kompak (Tidak Menyebabkan Scroll Halaman) */}
      <div className="shrink-0 w-full max-w-[1720px] mx-auto px-3 sm:px-6 pt-2.5 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <ChatCircleText size={18} weight="bold" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
              Pesan &amp; Obrolan
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 hidden md:inline shrink-0">
              Layanan Komunikasi Terpadu
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase shrink-0">
              DEMO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/orders"
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Receipt size={14} weight="bold" />
            <span className="hidden sm:inline">Pesanan Saya</span>
          </Link>
          <Link
            href="/warranties"
            className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition flex items-center gap-1.5 shadow-2xs"
          >
            <ShieldCheck size={14} weight="bold" />
            <span className="hidden sm:inline">Garansi &amp; Pengajuan</span>
          </Link>
        </div>
      </div>

      {/* 2. Chat Workspace (Mengisi Penuh Sisa Layar Tanpa Scroll Halaman) */}
      <div className="flex-1 min-h-0 w-full max-w-[1720px] mx-auto px-3 sm:px-6 pb-3">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-full min-h-0">
          {/* ========================================================= */}
          {/* KOLOM KIRI (lg:col-span-5 xl:col-span-4): DAFTAR CHAT & FILTER */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-5 xl:col-span-4 border-r border-slate-200 flex flex-col h-full min-h-0 bg-slate-50/40 ${
              showMobileChat ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Header List + Search + Filter: Pinned di Atas Kolom Kiri */}
            <div className="p-3.5 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Daftar Obrolan
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {filteredConversations.length}
                  </span>
                </div>

                {getUnreadCountForCategory("ALL") > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                    {getUnreadCountForCategory("ALL")} Baru
                  </span>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama toko, teknisi, pesanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Filter Tabs (Semua, Pesanan Aktif, Pesanan Selesai, Chat Biasa) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {(
                  [
                    { id: "ALL", label: "Semua" },
                    { id: "ACTIVE_ORDER", label: "Pesanan Aktif" },
                    { id: "COMPLETED_ORDER", label: "Selesai" },
                    { id: "GENERAL_INQUIRY", label: "Chat Biasa" },
                  ] as const
                ).map((tab) => {
                  const unread = getUnreadCountForCategory(tab.id);
                  const isSelected = selectedCategory === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCategory(tab.id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {unread > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                            isSelected ? "bg-white text-blue-600" : "bg-rose-500 text-white"
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation List: Section Kiri Bisa di-Scroll (Point 3) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <ChatCircleText size={36} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Tidak ada obrolan</p>
                  <p className="text-[11px] text-slate-400">
                    Tidak ditemukan percakapan pada filter ini.
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeChatId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveChatId(conv.id);
                        setShowMobileChat(true);
                      }}
                      className={`p-3.5 transition cursor-pointer flex items-start gap-3 relative ${
                        isActive
                          ? "bg-blue-50/70 border-l-4 border-l-blue-600"
                          : "hover:bg-slate-100/70 bg-white"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xs ${conv.partnerColor}`}
                        >
                          {conv.partnerInitials}
                        </div>
                        {conv.isOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"
                            title="Online sekarang"
                          />
                        )}
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-bold text-slate-900 truncate">
                            {conv.partnerName}
                          </h3>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            {conv.lastMessageTime}
                          </span>
                        </div>

                        {/* Category & Order Tag */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {conv.category === "ACTIVE_ORDER" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {conv.itemType === "SERVICE" ? <Wrench size={10} weight="bold" /> : <Package size={10} weight="bold" />}
                              Pesanan Aktif • #{conv.orderNumber}
                            </span>
                          ) : conv.category === "COMPLETED_ORDER" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check size={10} weight="bold" />
                              Pesanan Selesai • #{conv.orderNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Sparkle size={10} weight="fill" />
                              Chat Biasa / Tanya Produk
                            </span>
                          )}
                        </div>

                        {/* Item Title */}
                        <p className="text-[11px] font-semibold text-slate-700 truncate">
                          {conv.itemTitle}
                        </p>

                        {/* Last Message Snippet */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <p className="text-[11px] text-slate-500 truncate flex-1">
                            {conv.lastMessage}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* KOLOM KANAN (lg:col-span-7 xl:col-span-8): RUANG CHAT AKTIF */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 bg-white ${
              showMobileChat ? "flex" : "hidden lg:flex"
            }`}
          >
            {activeChat ? (
              <>
                {/* 1. Header Ruang Chat: STICKY DI ATAS (Point 4) */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs shrink-0 z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setShowMobileChat(false)}
                      className="lg:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <ArrowLeft size={18} weight="bold" />
                    </button>

                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xs ${activeChat.partnerColor}`}
                      >
                        {activeChat.partnerInitials}
                      </div>
                      {activeChat.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {activeChat.partnerName}
                        </h2>
                        {activeChat.isOnline ? (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            Offline
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeChat.partnerRoleTitle}
                      </p>
                    </div>
                  </div>

                  {/* Context Action Button in Header */}
                  {activeChat.actionUrl && (
                    <Link
                      href={activeChat.actionUrl}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs"
                    >
                      <span>{activeChat.actionLabel || "Buka Dokumen"}</span>
                      <ArrowRight size={13} weight="bold" />
                    </Link>
                  )}
                </div>

                {/* 2. STICKY RINGKASAN ORDER SEDANG BERJALAN DI HEADER (Point 4 & Point 5) */}
                {activeChat.category === "ACTIVE_ORDER" ? (
                  <div className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        {activeChat.itemType === "SERVICE" ? (
                          <Wrench size={16} weight="bold" />
                        ) : (
                          <Package size={16} weight="bold" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                            PESANAN BERJALAN
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800">
                            #{activeChat.orderNumber}
                          </span>
                          {activeChat.orderStatus && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              {activeChat.orderStatus}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                          {activeChat.itemTitle}
                          {activeChat.itemSubtitle && (
                            <span className="text-slate-500 font-normal"> • {activeChat.itemSubtitle}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeChat.itemPrice && (
                        <span className="text-xs font-black text-blue-700 bg-white/90 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                          Rp{activeChat.itemPrice.toLocaleString("id-ID")}
                        </span>
                      )}
                      {activeChat.orderHref && (
                        <Link
                          href={activeChat.orderHref}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span>Buka Pesanan</span>
                          <ArrowRight size={13} weight="bold" />
                        </Link>
                      )}
                    </div>
                  </div>
                ) : activeChat.category === "COMPLETED_ORDER" ? (
                  <div className="shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        Selesai
                      </span>
                      <span className="font-mono text-xs text-slate-600 font-semibold">
                        #{activeChat.orderNumber}
                      </span>
                      <span className="text-slate-700 font-medium truncate">• {activeChat.itemTitle}</span>
                    </div>
                    <Link
                      href={activeChat.actionUrl || "/warranties"}
                      className="text-xs font-bold text-blue-600 hover:underline shrink-0"
                    >
                      {activeChat.actionLabel || "Lihat Garansi"} &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="shrink-0 px-4 py-2 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between gap-2 text-xs z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                        Pra-Order
                      </span>
                      <span className="text-slate-800 font-bold truncate">{activeChat.itemTitle}</span>
                      {activeChat.itemPrice && (
                        <span className="text-purple-700 font-bold shrink-0">
                          Rp{activeChat.itemPrice.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                    <Link
                      href={activeChat.actionUrl || "/products"}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shrink-0"
                    >
                      {activeChat.actionLabel || "Lihat Produk"}
                    </Link>
                  </div>
                )}

                {/* 3. Messages Stream: SATU-SATUNYA BAGIAN RUANG CHAT YANG DI-SCROLL (Point 4) */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/40 space-y-3.5"
                >
                  {/* Safety Notice */}
                  <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 shadow-2xs">
                    <Info size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Jaga Privasi &amp; Transaksi:</strong> Jangan pernah membagikan nomor rekening, PIN, atau mentransfer uang di luar sistem Servio Escrow resmi. Percakapan ini dipantau demi perlindungan garansi konsumen Anda.
                    </span>
                  </div>

                  {activeChat.messages.map((msg) => {
                    const isMe = msg.senderRole === "customer";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-700">{msg.senderName}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        {/* Bubble Chat: NO BG HITAM! Biru Cerah SERVIO (Point 1) */}
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                            isMe
                              ? "bg-blue-600 text-white rounded-tr-xs shadow-sm"
                              : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>

                          {msg.attachment && (
                            <div
                              className={`flex items-center gap-2 p-2 rounded-xl text-[11px] ${
                                isMe ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              <ImageIcon size={16} weight="duotone" className="shrink-0" />
                              <span className="truncate flex-1 font-mono">
                                {msg.attachment.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Read Receipt */}
                        {isMe && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                            {msg.isRead ? (
                              <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                                <Checks size={13} weight="bold" />
                                Dibaca
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Check size={13} weight="bold" />
                                Terkirim
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="mr-auto items-start max-w-[75%] flex flex-col">
                      <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs text-xs text-slate-500 shadow-2xs">
                        <CircleNotch size={14} className="animate-spin text-blue-600" />
                        <span className="italic">{activeChat.partnerName} sedang mengetik...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Quick Suggested Action Chips: STICKY DI BAWAH (Point 4) */}
                <div className="shrink-0 bg-white border-t border-slate-200 z-10">
                  <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      Balas Cepat:
                    </span>
                    {(activeChat.category === "ACTIVE_ORDER"
                      ? [
                          "Kapan perkiraan tiba di lokasi?",
                          "Posisi saya sudah di rumah.",
                          "Tolong cek kelistrikan juga ya.",
                          "Apakah nomor resi sudah bisa dilacak?",
                        ]
                      : activeChat.category === "COMPLETED_ORDER"
                      ? [
                          "Terima kasih atas pelayanannya!",
                          "AC nya sudah dingin dan normal.",
                          "Sampai kapan masa garansinya berlaku?",
                          "Nanti saya rekomendasikan ke teman.",
                        ]
                      : [
                          "Apakah stok ini masih ready?",
                          "Bisa kirim hari ini?",
                          "Apakah cocok untuk unit AC saya?",
                          "Berapa estimasi waktu pengerjaan?",
                        ]
                    ).map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuickChip(chip)}
                        className="px-3 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-600 transition shrink-0 border border-slate-200 cursor-pointer shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* 5. Message Composer Input Bar: STICKY DI BAWAH (Point 4) */}
                  <div className="p-3 bg-white">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder={`Ketik pesan untuk ${activeChat.partnerName}...`}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        className="flex-1 p-2.5 px-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />

                      {/* Tombol Kirim: NO BG HITAM! (Point 1) */}
                      <button
                        type="submit"
                        disabled={!inputMessage.trim()}
                        className="p-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Kirim</span>
                        <PaperPlaneRight size={14} weight="bold" />
                      </button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <ChatCircleText size={48} className="text-slate-300" />
                <h3 className="font-bold text-slate-700 text-sm">Pilih Percakapan</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Pilih salah satu kontak di sebelah kiri untuk memulai obrolan dengan mitra jasa atau toko merchant.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
