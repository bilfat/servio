"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
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
  X,
  Camera,
  Phone,
  DotsThreeVertical,
  Storefront,
  Buildings,
  User,
  Users,
  CheckCircle,
  Paperclip,
  Sparkle,
  ChatCircleDots,
  ArrowSquareOut,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useActiveRole } from "@/context/RoleContext";
import { getReverbClient } from "@/lib/chat/reverbClient";
import { compressImage, playChatChime } from "@/lib/chat/chatMediaUtils";
import { CameraCaptureModal } from "./CameraCaptureModal";

export interface ContextData {
  type: "catalog" | "order" | "warranty";
  subType?:
    | "catalog_barang"
    | "catalog_jasa"
    | "order_barang"
    | "order_jasa"
    | "warranty_barang"
    | "warranty_jasa";
  id: string;
  title: string;
  subtitle?: string;
  price?: number;
  statusBadge?: string;
  thumbnail?: string;
  summary?: string;
  actionUrl?: string;
}

export function resolveContextDetails(meta: Record<string, any>) {
  const rawSub = String(meta.sub_type || meta.ctx_type || "").toLowerCase();
  const rawType = String(meta.type || "").toLowerCase();
  const rawTitle = String(meta.title || "");
  const orderId = meta.order_id || (rawType === "order" ? meta.id : undefined);
  const catalogId = meta.catalog_id || (rawType === "catalog" ? meta.id : undefined);
  const warrantyId = meta.warranty_id || (rawType === "warranty" ? meta.id : undefined);

  let category:
    | "catalog_barang"
    | "catalog_jasa"
    | "order_barang"
    | "order_jasa"
    | "warranty_barang"
    | "warranty_jasa" = "catalog_barang";

  if (rawSub === "catalog_barang") {
    category = "catalog_barang";
  } else if (rawSub === "catalog_jasa") {
    category = "catalog_jasa";
  } else if (rawSub === "order_barang") {
    category = "order_barang";
  } else if (rawSub === "order_jasa") {
    category = "order_jasa";
  } else if (rawSub === "warranty_barang") {
    category = "warranty_barang";
  } else if (rawSub === "warranty_jasa") {
    category = "warranty_jasa";
  } else if (orderId) {
    if (
      orderId.startsWith("SO-") ||
      orderId.startsWith("ORD-JASA") ||
      rawTitle.toLowerCase().includes("servis") ||
      rawTitle.toLowerCase().includes("cuci")
    ) {
      category = "order_jasa";
    } else {
      category = "order_barang";
    }
  } else if (warrantyId) {
    if (
      rawTitle.toLowerCase().includes("servis") ||
      rawTitle.toLowerCase().includes("jasa") ||
      rawTitle.toLowerCase().includes("dingin")
    ) {
      category = "warranty_jasa";
    } else {
      category = "warranty_barang";
    }
  } else if (catalogId) {
    if (
      catalogId.startsWith("srv") ||
      rawTitle.toLowerCase().includes("servis") ||
      rawTitle.toLowerCase().includes("cuci") ||
      rawTitle.toLowerCase().includes("perbaikan")
    ) {
      category = "catalog_jasa";
    } else {
      category = "catalog_barang";
    }
  } else if (
    rawTitle.toLowerCase().includes("cuci") ||
    rawTitle.toLowerCase().includes("servis") ||
    rawTitle.toLowerCase().includes("perbaikan")
  ) {
    category = "catalog_jasa";
  }

  // 1. Action URL Resolver
  let actionUrl = meta.action_url || meta.actionUrl || meta.ctx_url;
  const targetId = meta.id || orderId || catalogId || warrantyId;

  if (!actionUrl) {
    if (category === "catalog_barang") {
      actionUrl = targetId ? `/products/${targetId}` : "/products";
    } else if (category === "catalog_jasa") {
      actionUrl = targetId ? `/services/${targetId}` : "/services";
    } else if (category === "order_barang") {
      actionUrl = targetId ? `/orders/products/${targetId}` : "/orders";
    } else if (category === "order_jasa") {
      actionUrl = targetId ? `/orders/${targetId}` : "/orders";
    } else if (category === "warranty_barang") {
      actionUrl = "/warranties";
    } else if (category === "warranty_jasa") {
      actionUrl = "/warranties?tab=submissions";
    }
  }

  // 2. Thumbnail Fallback Resolver
  let thumbnail = meta.thumbnail || meta.thumb || meta.ctx_thumb;
  if (!thumbnail || thumbnail === "undefined" || thumbnail === "null") {
    if (category === "catalog_barang" || category === "order_barang") {
      thumbnail = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80";
    } else if (category === "catalog_jasa" || category === "order_jasa") {
      thumbnail = "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80";
    } else if (category === "warranty_jasa") {
      thumbnail = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80";
    } else {
      thumbnail = "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&auto=format&fit=crop&q=80";
    }
  }

  // 3. Category Specific Badge, Theme & Texts
  let badgeLabel = "Katalog Produk";
  let ctaText = "Lihat Detail Produk";
  let defaultSummary = "Stok Tersedia • Garansi Resmi Platform";
  let icon = <Package size={13} weight="bold" />;
  let iconLarge = <Package size={28} weight="duotone" />;
  let iconBg = "bg-blue-500/10 text-blue-600";
  let text = "text-blue-500";

  if (category === "catalog_barang") {
    badgeLabel = "Katalog Suku Cadang";
    ctaText = "Buka Halaman Produk";
    defaultSummary = "Produk Resmi • Siap Kirim Hari Ini";
    icon = <Package size={13} weight="bold" />;
    iconLarge = <Package size={28} weight="duotone" />;
    iconBg = "bg-blue-500/10 text-blue-600";
    text = "text-blue-500";
  } else if (category === "catalog_jasa") {
    badgeLabel = "Layanan Servis";
    ctaText = "Buka Halaman Layanan";
    defaultSummary = "Mitra Resmi • Garansi Pengerjaan 30 Hari";
    icon = <Wrench size={13} weight="bold" />;
    iconLarge = <Wrench size={28} weight="duotone" />;
    iconBg = "bg-emerald-500/10 text-emerald-600";
    text = "text-emerald-500";
  } else if (category === "order_barang") {
    badgeLabel = `Pesanan #${orderId || "Barang"}`;
    ctaText = "Lihat Detail Pesanan";
    defaultSummary = "Ringkasan: Pengiriman Kurir Toko • Pembayaran Terverifikasi";
    icon = <Receipt size={13} weight="bold" />;
    iconLarge = <Receipt size={28} weight="duotone" />;
    iconBg = "bg-sky-500/10 text-sky-600";
    text = "text-sky-500";
  } else if (category === "order_jasa") {
    badgeLabel = `Pesanan #${orderId || "Jasa"}`;
    ctaText = "Lihat Detail Pesanan";
    defaultSummary = "Ringkasan: Kunjungan Teknisi Lapangan • Garansi Dingin";
    icon = <Clock size={13} weight="bold" />;
    iconLarge = <Clock size={28} weight="duotone" />;
    iconBg = "bg-amber-500/10 text-amber-600";
    text = "text-amber-500";
  } else if (category === "warranty_barang") {
    badgeLabel = "Garansi Toko Resmi";
    ctaText = "Lihat Kartu Garansi";
    defaultSummary = "Ringkasan: Garansi Suku Cadang Asli • Perlindungan 100%";
    icon = <ShieldCheck size={13} weight="bold" />;
    iconLarge = <ShieldCheck size={28} weight="duotone" />;
    iconBg = "bg-teal-500/10 text-teal-600";
    text = "text-teal-500";
  } else if (category === "warranty_jasa") {
    badgeLabel = "Garansi Servis Dingin";
    ctaText = "Lihat Garansi Servis";
    defaultSummary = "Ringkasan: Garansi Dingin 20-30 Hari • Layanan Prioritas";
    icon = <ShieldCheck size={13} weight="bold" />;
    iconLarge = <ShieldCheck size={28} weight="duotone" />;
    iconBg = "bg-purple-500/10 text-purple-600";
    text = "text-purple-500";
  }

  return {
    category,
    actionUrl,
    thumbnail,
    title: meta.title || "Detail Konteks",
    price: meta.price ? Number(meta.price) : undefined,
    status: meta.status || meta.statusBadge,
    summary: meta.summary || meta.ctx_summary || defaultSummary,
    badgeLabel,
    ctaText,
    badgeTheme: {
      icon,
      iconLarge,
      iconBg,
      text,
    },
  };
}

export function InteractiveContextCard({
  metadata,
  isMe,
}: {
  metadata: Record<string, any>;
  isMe: boolean;
}) {
  const details = resolveContextDetails(metadata);
  const [imgError, setImgError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (details.actionUrl) {
      window.open(details.actionUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md mb-2.5 max-w-sm sm:max-w-md ${
        isMe
          ? "bg-slate-800/95 hover:bg-slate-800 border-slate-700/80 text-white"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
      }`}
    >
      {/* Top Banner: Category Badge & Status */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between gap-2 border-b text-[10px] font-bold ${
          isMe
            ? "bg-slate-900/60 border-slate-700/60"
            : "bg-slate-50/90 border-slate-100"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`p-1 rounded-md ${details.badgeTheme.iconBg}`}>
            {details.badgeTheme.icon}
          </span>
          <span className={`tracking-wider uppercase font-extrabold ${details.badgeTheme.text}`}>
            {details.badgeLabel}
          </span>
        </div>

        {details.status && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              isMe
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {details.status}
          </span>
        )}
      </div>

      {/* Main Body: Image Thumbnail + Details */}
      <div className="p-3 flex items-start gap-3">
        {/* Photo Thumbnail */}
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-2xs">
          {!imgError && details.thumbnail ? (
            <img
              src={details.thumbnail}
              alt={details.title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
              {details.badgeTheme.iconLarge}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <h4
              className={`font-bold text-xs sm:text-[13px] leading-snug line-clamp-2 transition-colors ${
                isMe
                  ? "text-slate-100 group-hover:text-emerald-300"
                  : "text-slate-900 group-hover:text-emerald-700"
              }`}
            >
              {details.title}
            </h4>

            {details.price !== undefined && details.price > 0 && (
              <p
                className={`text-xs font-black mt-1 ${
                  isMe ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                Rp {details.price.toLocaleString("id-ID")}
              </p>
            )}
          </div>

          {/* Ringkasan Summary Box */}
          {details.summary && (
            <div
              className={`mt-2 p-1.5 rounded-lg text-[10.5px] leading-relaxed line-clamp-2 ${
                isMe
                  ? "bg-slate-900/50 text-slate-300 border border-slate-700/50"
                  : "bg-slate-100/80 text-slate-600 border border-slate-200/60"
              }`}
            >
              <span className="font-semibold">{details.summary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA: Direct Clickable Link */}
      <div
        className={`px-3 py-2 border-t flex items-center justify-between text-[11px] font-bold transition-colors ${
          isMe
            ? "bg-slate-900/40 border-slate-700/60 text-emerald-400 group-hover:text-emerald-300 group-hover:bg-slate-900/70"
            : "bg-slate-50/80 border-slate-100 text-emerald-700 group-hover:text-emerald-800 group-hover:bg-emerald-50/40"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span>{details.ctaText}</span>
        </span>
        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>Buka</span>
          <ArrowSquareOut size={13} weight="bold" />
        </span>
      </div>
    </div>
  );
}

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "merchant" | "provider" | "worker" | "support";
  message: string;
  timestamp: string;
  status: "pending" | "sent" | "delivered" | "read";
  isRead: boolean;
  attachment?: {
    type: "IMAGE" | "FILE";
    url: string;
    name: string;
  };
  contextMetadata?: Record<string, any>;
}

export interface ChatConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerRoleTitle: string;
  partnerInitials: string;
  partnerColor: string;
  partnerAvatarUrl?: string;
  partnerProviderName?: string;
  isOnline: boolean;
  category: "ACTIVE_ORDER" | "COMPLETED_ORDER" | "GENERAL_INQUIRY";
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  messages: ChatMessageItem[];
}

interface UniversalChatViewProps {
  currentEntityRole?: "customer" | "merchant" | "provider" | "worker";
  portalTitle?: string;
}

function getInitials(name: string): string {
  if (!name) return "SV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(idOrName: string): string {
  const colors = [
    "bg-sky-600 text-white",
    "bg-emerald-600 text-white",
    "bg-purple-600 text-white",
    "bg-indigo-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = (hash << 5) - hash + idOrName.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

function mapRoleTitle(entityType?: string): string {
  const norm = (entityType || "").toLowerCase();
  if (norm.includes("worker") || norm.includes("teknisi")) return "Teknisi Lapangan";
  if (norm.includes("merchant") || norm.includes("toko")) return "Merchant Toko";
  if (norm.includes("provider") || norm.includes("bengkel")) return "Provider Jasa";
  return "Pelanggan";
}

const CANONICAL_PARTNER_MAP: Record<
  string,
  {
    userId: string;
    entityId: string;
    name: string;
    role: "merchant" | "provider" | "worker" | "customer";
    avatar: string;
    providerName?: string;
  }
> = {
  // Customer: Ahmad Fauzi
  "692f03fd-2362-485a-9a23-a672bbb4533f": {
    userId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    entityId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    name: "Ahmad Fauzi",
    role: "customer",
    avatar: "/brand/logo.png",
  },
  customer: {
    userId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    entityId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    name: "Ahmad Fauzi",
    role: "customer",
    avatar: "/brand/logo.png",
  },
  "customer-01": {
    userId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    entityId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    name: "Ahmad Fauzi",
    role: "customer",
    avatar: "/brand/logo.png",
  },
  "ahmad fauzi": {
    userId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    entityId: "692f03fd-2362-485a-9a23-a672bbb4533f",
    name: "Ahmad Fauzi",
    role: "customer",
    avatar: "/brand/logo.png",
  },
  // Merchant: BUDIAJASA / Ko Hendra / Sinar AC
  "0c1467e7-af68-4b26-ae84-daa41d51aed0": {
    userId: "4bee4c28-6799-4054-87a3-321e29811921",
    entityId: "0c1467e7-af68-4b26-ae84-daa41d51aed0",
    name: "BUDIAJASA (Ko Hendra)",
    role: "merchant",
    avatar: "/brand/logo.png",
  },
  budiajasa: {
    userId: "4bee4c28-6799-4054-87a3-321e29811921",
    entityId: "0c1467e7-af68-4b26-ae84-daa41d51aed0",
    name: "BUDIAJASA (Ko Hendra)",
    role: "merchant",
    avatar: "/brand/logo.png",
  },
  "merch-sentra-teknik": {
    userId: "4bee4c28-6799-4054-87a3-321e29811921",
    entityId: "0c1467e7-af68-4b26-ae84-daa41d51aed0",
    name: "Sentra Teknik Sparepart",
    role: "merchant",
    avatar: "/brand/logo.png",
  },
  "merchant-01": {
    userId: "4bee4c28-6799-4054-87a3-321e29811921",
    entityId: "0c1467e7-af68-4b26-ae84-daa41d51aed0",
    name: "BUDIAJASA (Ko Hendra)",
    role: "merchant",
    avatar: "/brand/logo.png",
  },

  // Provider: sukses gembira / Budi Santoso / PT Servio Mandiri Teknik
  "0740d857-b665-4191-aaf5-d7dd3611dc1d": {
    userId: "8ecc27f5-d30e-401e-89d5-aceec765a19a",
    entityId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    name: "sukses gembira (Budi Santoso)",
    role: "provider",
    avatar: "/brand/logo.png",
  },
  "sukses gembira": {
    userId: "8ecc27f5-d30e-401e-89d5-aceec765a19a",
    entityId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    name: "sukses gembira (Budi Santoso)",
    role: "provider",
    avatar: "/brand/logo.png",
  },
  "prov-bintang-teknik": {
    userId: "8ecc27f5-d30e-401e-89d5-aceec765a19a",
    entityId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    name: "sukses gembira (Budi Santoso)",
    role: "provider",
    avatar: "/brand/logo.png",
  },
  "provider-01": {
    userId: "8ecc27f5-d30e-401e-89d5-aceec765a19a",
    entityId: "0740d857-b665-4191-aaf5-d7dd3611dc1d",
    name: "sukses gembira (Budi Santoso)",
    role: "provider",
    avatar: "/brand/logo.png",
  },

  // Worker: Ahmad Teknisi
  "acfdfc27-9ba5-472f-bec1-3c372f47fff6": {
    userId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    entityId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    name: "Ahmad Teknisi",
    role: "worker",
    avatar: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    providerName: "sukses gembira",
  },
  "worker-01": {
    userId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    entityId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    name: "Ahmad Teknisi",
    role: "worker",
    avatar: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    providerName: "sukses gembira",
  },
  "worker-ahmad-01": {
    userId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    entityId: "acfdfc27-9ba5-472f-bec1-3c372f47fff6",
    name: "Ahmad Teknisi",
    role: "worker",
    avatar: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg",
    providerName: "sukses gembira",
  },
};

export function UniversalChatView({
  currentEntityRole = "customer",
  portalTitle,
}: UniversalChatViewProps) {
  const { user } = useActiveRole();
  const searchParams = useSearchParams();

  // Resolved current user identity context
  const getActorContext = useCallback(() => {
    if (user?.id && user.id !== "guest") {
      return {
        id: user.id,
        name: user.name || "Pengguna",
        role: (user.activeRole || currentEntityRole).toUpperCase(),
        avatar: user.avatarUrl || user.avatar || "/brand/logo.png",
      };
    }
    // Reliable fallbacks matching database seeds
    if (currentEntityRole === "worker") {
      return { id: "acfdfc27-9ba5-472f-bec1-3c372f47fff6", name: "Ahmad Teknisi", role: "WORKER_TECHNICIAN", avatar: "/storage/avatars/tY7SeXSkRKHBMrsVkJ3mqGV8Jl6pn6q3H0cRI0f2.jpg" };
    }
    if (currentEntityRole === "provider") {
      return { id: "8ecc27f5-d30e-401e-89d5-aceec765a19a", name: "Budi Santoso", role: "SERVICE_PROVIDER", avatar: "/brand/logo.png" };
    }
    if (currentEntityRole === "merchant") {
      return { id: "4bee4c28-6799-4054-87a3-321e29811921", name: "Ko Hendra", role: "MERCHANT", avatar: "/brand/logo.png" };
    }
    return { id: "692f03fd-2362-485a-9a23-a672bbb4533f", name: "Ahmad Fauzi", role: "CUSTOMER", avatar: "/brand/logo.png" };
  }, [user, currentEntityRole]);

  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ORDER" | "CATALOG" | "WARRANTY">("ALL");
  const [inputMessage, setInputMessage] = useState<string>("");
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Floating Context Banner State
  const [floatingContext, setFloatingContext] = useState<ContextData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Parse URL Context Parameters (Catalog, Order, Warranty)
  useEffect(() => {
    const ctxType = searchParams.get("ctx_type") || searchParams.get("context_type");
    const ctxId = searchParams.get("ctx_id") || searchParams.get("order_id") || searchParams.get("product_id");
    const ctxTitle = searchParams.get("ctx_title") || searchParams.get("title");
    const ctxPrice = searchParams.get("ctx_price") ? Number(searchParams.get("ctx_price")) : undefined;
    const ctxStatus = searchParams.get("ctx_status") || searchParams.get("status");
    const ctxThumb = searchParams.get("ctx_thumb") || searchParams.get("thumbnail");
    const ctxSummary = searchParams.get("ctx_summary") || searchParams.get("summary");
    const ctxUrl = searchParams.get("ctx_url") || searchParams.get("action_url");

    if (ctxType && ctxId) {
      let mainType: "catalog" | "order" | "warranty" = "catalog";
      if (ctxType.startsWith("order")) mainType = "order";
      else if (ctxType.startsWith("warranty")) mainType = "warranty";

      let defaultUrl = ctxUrl;
      if (!defaultUrl) {
        if (ctxType === "catalog_barang") defaultUrl = `/products/${ctxId}`;
        else if (ctxType === "catalog_jasa") defaultUrl = `/services/${ctxId}`;
        else if (ctxType === "order_barang") {
          defaultUrl = currentEntityRole === "merchant" ? `/merchant/orders?order_id=${ctxId}` : `/orders/products/${ctxId}`;
        } else if (ctxType === "order_jasa") {
          if (currentEntityRole === "provider") defaultUrl = `/provider/orders/${ctxId}`;
          else if (currentEntityRole === "worker") defaultUrl = `/worker/jobs/${ctxId}`;
          else defaultUrl = `/orders/${ctxId}`;
        } else if (ctxType === "warranty_barang") {
          defaultUrl = currentEntityRole === "merchant" ? `/merchant/warranty` : `/warranties`;
        } else if (ctxType === "warranty_jasa") {
          defaultUrl = currentEntityRole === "provider" ? `/provider/warranty` : `/warranties?tab=submissions`;
        }
      }

      setFloatingContext({
        type: mainType,
        subType: ctxType as any,
        id: ctxId,
        title: ctxTitle || (ctxType.startsWith("order") ? `Pesanan #${ctxId}` : "Detail Layanan / Produk"),
        subtitle: ctxStatus ? `Status: ${ctxStatus}` : undefined,
        price: ctxPrice,
        statusBadge: ctxStatus || undefined,
        thumbnail: ctxThumb || undefined,
        summary: ctxSummary || undefined,
        actionUrl: defaultUrl || undefined,
      });
    }
  }, [searchParams]);

  // 2. Fetch Conversations from Real Backend API
  const fetchConversations = useCallback(async () => {
    const actor = getActorContext();
    setIsLoadingConversations(true);

    try {
      // Unified query parameter extraction (supports partner_* and target_*)
      const rawPartnerId =
        searchParams.get("partner_id") ||
        searchParams.get("target_id") ||
        searchParams.get("target_user_id");
      const rawPartnerType =
        searchParams.get("partner_type") ||
        searchParams.get("target_role") ||
        searchParams.get("partner_role") ||
        "merchant";
      const rawPartnerName =
        searchParams.get("partner_name") ||
        searchParams.get("target_name") ||
        searchParams.get("name");
      const partnerAvatar =
        searchParams.get("partner_avatar") ||
        searchParams.get("target_avatar");

      let targetUserId = rawPartnerId;
      let targetEntityId = rawPartnerId;
      let targetDisplayName = rawPartnerName || "Mitra SERVIO";
      let targetEntityType = (rawPartnerType || "merchant").toLowerCase();
      let targetAvatarUrl = partnerAvatar || "/brand/logo.png";

      // Canonical Map Lookup if passed an org id or name alias
      if (rawPartnerId) {
        const key = rawPartnerId.toLowerCase().trim();
        const mapped =
          CANONICAL_PARTNER_MAP[key] ||
          Object.values(CANONICAL_PARTNER_MAP).find(
            (p) =>
              p.userId.toLowerCase() === key ||
              p.entityId.toLowerCase() === key ||
              p.name.toLowerCase().includes(key)
          );

        if (mapped) {
          targetUserId = mapped.userId;
          targetEntityId = mapped.entityId;
          targetDisplayName = rawPartnerName || mapped.name;
          targetEntityType = mapped.role;
          targetAvatarUrl = partnerAvatar || mapped.avatar;
        }
      }

      let initiatedConvId: string | null = null;

      if (targetUserId) {
        try {
          const initRes = await fetch("/api/v1/chat/conversations/initiate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Actor-User-Id": actor.id,
              "X-Actor-Role": actor.role,
              "X-Actor-Name": actor.name,
            },
            body: JSON.stringify({
              target_user_id: targetUserId,
              target_entity_type: targetEntityType,
              target_entity_id: targetEntityId || targetUserId,
              target_display_name: targetDisplayName,
              target_avatar_url: targetAvatarUrl,
              my_entity_type: currentEntityRole,
              my_entity_id: actor.id,
              my_display_name: actor.name,
            }),
          });
          const initData = await initRes.json();
          if (initData?.data?.conversation?.id) {
            initiatedConvId = initData.data.conversation.id;
          }
        } catch (err) {
          console.warn("Could not initiate conversation:", err);
        }
      }

      // Fetch list of conversations for current actor
      const res = await fetch("/api/v1/chat/conversations", {
        headers: {
          "X-Actor-User-Id": actor.id,
          "X-Actor-Role": actor.role,
          "X-Actor-Name": actor.name,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load chat list: ${res.status}`);
      }

      const json = await res.json();
      const rawList: any[] = json?.data?.conversations || [];

      const parsed: ChatConversation[] = rawList.map((item) => {
        const partner = item.partner || {};
        const pName = partner.display_name || "Lawan Bicara";
        const lastMsg = item.last_message;
        const msgTime = lastMsg?.created_at
          ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "Baru saja";

        const isWorker =
          (partner.entity_type || "").toLowerCase().includes("worker") ||
          (partner.entity_type || "").toLowerCase().includes("teknisi") ||
          pName.toLowerCase().includes("teknisi") ||
          (partner.user_id && CANONICAL_PARTNER_MAP[partner.user_id.toLowerCase()]?.role === "worker");

        const partnerProviderName = isWorker
          ? partner.provider_name ||
            (partner.user_id && CANONICAL_PARTNER_MAP[partner.user_id.toLowerCase()]?.providerName) ||
            searchParams.get("provider_name") ||
            "sukses gembira"
          : undefined;

        return {
          id: item.conversation_id,
          partnerId: partner.user_id || item.conversation_id,
          partnerName: pName,
          partnerRoleTitle: mapRoleTitle(partner.entity_type),
          partnerInitials: getInitials(pName),
          partnerColor: getAvatarColor(partner.user_id || pName),
          partnerAvatarUrl: partner.avatar_url,
          partnerProviderName: partnerProviderName,
          isOnline: Boolean(partner.is_online),
          category: "ACTIVE_ORDER",
          unreadCount: item.unread_count || 0,
          lastMessage: lastMsg?.body || (lastMsg?.media_url ? "[Foto Lampiran]" : "Belum ada pesan"),
          lastMessageTime: msgTime,
          messages: [],
        };
      });

      setConversations(parsed);

      // Priority Selection:
      // 1. Directly targetted / initiated conversation from URL
      // 2. Conversation matching targetUserId or targetDisplayName
      // 3. Keep current activeChatId if in list
      // 4. Default: DO NOT auto-select (leave null so right pane is empty by default)
      if (initiatedConvId) {
        setActiveChatId(initiatedConvId);
        setShowMobileChat(true);
      } else if (targetUserId) {
        const matched = parsed.find(
          (c) =>
            c.id === initiatedConvId ||
            c.partnerId === targetUserId ||
            c.partnerName.toLowerCase().includes(targetDisplayName.toLowerCase()) ||
            targetDisplayName.toLowerCase().includes(c.partnerName.toLowerCase())
        );
        if (matched) {
          setActiveChatId(matched.id);
          setShowMobileChat(true);
        }
      } else {
        setActiveChatId((current) => {
          if (current && parsed.some((c) => c.id === current)) return current;
          return null;
        });
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [getActorContext, searchParams, currentEntityRole]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 3. Fetch Messages for Active Conversation
  const activeChat = conversations.find((c) => c.id === activeChatId) || null;

  useEffect(() => {
    if (!activeChatId) return;

    const actor = getActorContext();
    let isCancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/v1/chat/conversations/${activeChatId}/messages`, {
          headers: {
            "X-Actor-User-Id": actor.id,
            "X-Actor-Role": actor.role,
          },
        });

        if (!res.ok) return;

        const json = await res.json();
        const rawMsgs: any[] = json?.data?.messages || [];

        if (isCancelled) return;

        const mappedMsgs: ChatMessageItem[] = rawMsgs.map((m) => {
          const isMe = m.is_me ?? m.sender_id === actor.id;
          const msgRole = m.sender_entity_type || (isMe ? currentEntityRole : "customer");

          return {
            id: m.id,
            senderId: m.sender_id,
            senderName: isMe ? actor.name : activeChat?.partnerName || "Lawan Bicara",
            senderRole: msgRole as any,
            message: m.body || "",
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            status: (m.status as any) || "sent",
            isRead: m.status === "read",
            attachment: m.media_url
              ? { type: "IMAGE", url: m.media_url, name: "Foto Lampiran" }
              : undefined,
            contextMetadata: m.context_metadata || undefined,
          };
        });

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId) {
              return { ...c, messages: mappedMsgs };
            }
            return c;
          })
        );
      } catch (err) {
        console.warn("Could not load messages:", err);
      } finally {
        if (!isCancelled) setIsLoadingMessages(false);
      }
    }

    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [activeChatId, getActorContext, currentEntityRole, activeChat?.partnerName]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // 4. WebSocket Realtime Subscription with Laravel Reverb
  useEffect(() => {
    if (!activeChatId) return;

    const pusher = getReverbClient();
    if (!pusher) return;

    const actor = getActorContext();
    const channelName = `chat.${activeChatId}`;
    const channel = pusher.subscribe(channelName);

    // Listen for incoming new messages
    channel.bind("message.new", (data: any) => {
      if (data.sender_id !== actor.id) {
        playChatChime();

        const incomingMsg: ChatMessageItem = {
          id: data.id || `m-ws-${Date.now()}`,
          senderId: data.sender_id,
          senderName: activeChat?.partnerName || "Lawan Bicara",
          senderRole: (data.sender_entity_type as any) || "merchant",
          message: data.body || "",
          timestamp: new Date(data.created_at || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "delivered",
          isRead: false,
          attachment: data.media_url
            ? { type: "IMAGE", url: data.media_url, name: "Foto Lampiran" }
            : undefined,
          contextMetadata: data.context_metadata || undefined,
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                lastMessage: data.body || "[Foto Lampiran]",
                lastMessageTime: "Baru saja",
                messages: [...c.messages, incomingMsg],
              };
            }
            return c;
          })
        );

        // Notify server that message was read
        fetch(`/api/v1/chat/conversations/${activeChatId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Actor-User-Id": actor.id,
          },
          body: JSON.stringify({ status: "read", message_ids: [data.id] }),
        }).catch(() => {});
      }
    });

    // Listen for status updates (Delivered / Read Checkmarks)
    channel.bind("message.status_updated", (data: any) => {
      const updatedStatus = data.status; // 'delivered' or 'read'
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeChatId) {
            return {
              ...c,
              messages: c.messages.map((m) => {
                if (data.message_ids && data.message_ids.includes(m.id)) {
                  return { ...m, status: updatedStatus, isRead: updatedStatus === "read" };
                }
                if (!data.message_ids) {
                  return { ...m, status: updatedStatus, isRead: updatedStatus === "read" };
                }
                return m;
              }),
            };
          }
          return c;
        })
      );
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [activeChatId, getActorContext, activeChat?.partnerName]);

  // 5. Send Message Handler (Pola A Smart Auto-Attach)
  const handleSendMessage = async (textToSend?: string, attachedContext?: ContextData | null) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    const contextToAttach = attachedContext !== undefined ? attachedContext : floatingContext;

    if (!text && !contextToAttach && !isUploading) return;
    if (!activeChatId) return;

    const actor = getActorContext();

    const contextMeta = contextToAttach
      ? {
          order_id: contextToAttach.type === "order" ? contextToAttach.id : undefined,
          catalog_id: contextToAttach.type === "catalog" ? contextToAttach.id : undefined,
          warranty_id: contextToAttach.type === "warranty" ? contextToAttach.id : undefined,
          sub_type: contextToAttach.subType,
          type: contextToAttach.type,
          id: contextToAttach.id,
          title: contextToAttach.title,
          price: contextToAttach.price,
          status: contextToAttach.statusBadge,
          thumbnail: contextToAttach.thumbnail,
          summary: contextToAttach.summary,
          action_url: contextToAttach.actionUrl,
        }
      : undefined;

    let defaultMsgText = "";
    if (contextToAttach) {
      if (contextToAttach.type === "order") {
        defaultMsgText = `Halo, saya ingin menanyakan terkait pesanan ini:`;
      } else if (contextToAttach.type === "warranty") {
        defaultMsgText = `Halo, saya ingin konsultasi klaim garansi terkait:`;
      } else {
        defaultMsgText = `Halo, saya ingin menanyakan ketersediaan produk/layanan ini:`;
      }
    }

    const clientMsgId = `client-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: clientMsgId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: currentEntityRole as any,
      message: text || defaultMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "pending",
      isRead: false,
      contextMetadata: contextMeta,
    };

    // Optimistic UI insert
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: optimisticMsg.message,
            lastMessageTime: "Baru saja",
            messages: [...c.messages, optimisticMsg],
          };
        }
        return c;
      })
    );

    setInputMessage("");
    setFloatingContext(null); // Dismiss floating banner once card sent

    // Store to Backend REST API
    try {
      const msgType = contextToAttach ? `context_${contextToAttach.type}` : "text";
      const res = await fetch(`/api/v1/chat/conversations/${activeChatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-User-Id": actor.id,
          "X-Actor-Role": actor.role,
        },
        body: JSON.stringify({
          client_msg_id: clientMsgId,
          type: msgType,
          body: optimisticMsg.message,
          context_metadata: contextMeta,
        }),
      });

      const resJson = await res.json();
      if (res.ok && resJson?.data?.message?.id) {
        // Upgrade status to "sent" (Centang 1 ✓)
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === clientMsgId
                    ? { ...m, id: resJson.data.message.id, status: "sent" }
                    : m
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.warn("Message sent locally, backend sync warning:", err);
    }
  };

  // 6. Handle Photo & Camera Upload
  const handlePhotoUpload = async (blob: Blob, previewUrl: string) => {
    if (!activeChatId) return;
    const actor = getActorContext();

    const clientMsgId = `client-media-${Date.now()}`;
    const optimisticMediaMsg: ChatMessageItem = {
      id: clientMsgId,
      senderId: actor.id,
      senderName: actor.name,
      senderRole: currentEntityRole as any,
      message: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "pending",
      isRead: false,
      attachment: {
        type: "IMAGE",
        url: previewUrl,
        name: "Foto Lampiran",
      },
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMessage: "[Foto Lampiran]",
            lastMessageTime: "Baru saja",
            messages: [...c.messages, optimisticMediaMsg],
          };
        }
        return c;
      })
    );

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", blob, `chat_${Date.now()}.webp`);

      const res = await fetch("/api/v1/chat/upload-media", {
        method: "POST",
        body: formData,
      });

      const resData = await res.json();
      const uploadedUrl = resData?.data?.url || previewUrl;

      // Send media message to chat room
      const msgRes = await fetch(`/api/v1/chat/conversations/${activeChatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-User-Id": actor.id,
          "X-Actor-Role": actor.role,
        },
        body: JSON.stringify({
          client_msg_id: clientMsgId,
          type: "image",
          body: "",
          media_url: uploadedUrl,
        }),
      });

      const msgData = await msgRes.json();
      if (msgRes.ok && msgData?.data?.message?.id) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === clientMsgId
                    ? { ...m, id: msgData.data.message.id, status: "sent" }
                    : m
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.warn("Upload fallback warning:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { blob, previewUrl } = await compressImage(file);
      handlePhotoUpload(blob, previewUrl);
    } catch (err) {
      console.error("Compression error:", err);
    }
  };

  // WhatsApp-style Checkmark / Clock Status Renderer
  const renderDeliveryStatus = (status?: string, isRead?: boolean) => {
    const effectiveStatus = status || (isRead ? "read" : "sent");

    if (effectiveStatus === "read") {
      return (
        <span title="Dibaca">
          <Checks size={15} weight="bold" className="text-emerald-500 inline-block ml-1" />
        </span>
      );
    }
    if (effectiveStatus === "delivered") {
      return (
        <span title="Tersampaikan ke penerima">
          <Checks size={15} weight="bold" className="text-slate-400 inline-block ml-1" />
        </span>
      );
    }
    if (effectiveStatus === "sent") {
      return (
        <span title="Terkirim ke server">
          <Check size={14} weight="bold" className="text-slate-400 inline-block ml-1" />
        </span>
      );
    }
    return (
      <span title="Sedang mengirim">
        <Clock size={13} className="text-slate-400 inline-block ml-1 animate-pulse" />
      </span>
    );
  };

  // Role Badge Helper (with optional Provider Affiliation for Technicians)
  const renderRoleBadge = (roleTitle: string, providerName?: string) => {
    const isWorker = roleTitle.toLowerCase().includes("teknisi") || roleTitle.toLowerCase().includes("worker");
    const isMerchant = roleTitle.toLowerCase().includes("merchant") || roleTitle.toLowerCase().includes("toko");
    const isProvider = roleTitle.toLowerCase().includes("provider") || roleTitle.toLowerCase().includes("pt");

    if (isWorker) {
      const parentProvider = providerName || "sukses gembira";
      return (
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench size={12} weight="bold" /> Teknisi Lapangan
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-3xs"
            title={`Teknisi resmi di bawah naungan provider ${parentProvider}`}
          >
            <Buildings size={12} weight="bold" className="text-purple-600" />
            <span>Naungan: <strong className="font-bold">{parentProvider}</strong></span>
          </span>
        </div>
      );
    }
    if (isMerchant) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <Storefront size={12} weight="bold" /> Merchant Toko
        </span>
      );
    }
    if (isProvider) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          <Users size={12} weight="bold" /> Provider Jasa
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <User size={12} weight="bold" /> Pelanggan
      </span>
    );
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="h-full max-h-full w-full flex overflow-hidden bg-slate-100/90 font-sans min-h-0">
      {/* ========================================================================= */}
      {/* 1. LEFT PANE: CONVERSATION LIST (INBOX) - ONLY INBOX LIST SCROLLS           */}
      {/* ========================================================================= */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full min-h-0 overflow-hidden z-10 ${
          showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Inbox Header (FIXED: Never scrolls) */}
        <div className="shrink-0 p-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{portalTitle || "Obrolan & Pesan"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                Live
              </span>
            </h1>
          </div>

          {/* Search Box */}
          <div className="relative">
            <MagnifyingGlass
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari lawan bicara, pesanan, atau layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "ALL", label: "Semua" },
                { id: "ORDER", label: "Pesanan" },
                { id: "CATALOG", label: "Katalog" },
                { id: "WARRANTY", label: "Garansi" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Items List (SCROLLABLE: Only this list scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
          {isLoadingConversations ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <SpinnerGap size={24} className="animate-spin text-emerald-600" />
              <span className="text-xs">Memuat daftar obrolan...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
              <ChatCircleDots size={40} weight="thin" className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Belum ada obrolan aktif</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Mulai percakapan langsung melalui detail katalog atau halaman pesanan.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === activeChat?.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    if (isSelected) {
                      setActiveChatId(null);
                      setShowMobileChat(false);
                      setFloatingContext(null);
                    } else {
                      setActiveChatId(conv.id);
                      setShowMobileChat(true);
                    }
                  }}
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/70 border-r-4 border-emerald-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Avatar with Online dot */}
                  <div className="relative shrink-0">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        conv.partnerColor || "bg-purple-600 text-white"
                      }`}
                    >
                      {conv.partnerInitials}
                    </div>
                    {conv.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {conv.partnerName}
                      </span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {conv.lastMessageTime}
                      </span>
                    </div>

                    <div className="mb-1">{renderRoleBadge(conv.partnerRoleTitle, conv.partnerProviderName)}</div>

                    <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <span className="shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RIGHT PANE: ACTIVE CHAT ROOM                                           */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#f8fafc] relative ${
          !showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {activeChat ? (
          <>
            {/* Room Header (FIXED: Profile & Controls Never Scroll) */}
            <div className="shrink-0 h-16 px-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileChat(false);
                    setActiveChatId(null);
                    setFloatingContext(null);
                  }}
                  className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  title="Kembali ke Daftar Kontak"
                >
                  <ArrowLeft size={20} weight="bold" />
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                      activeChat.partnerColor || "bg-purple-600 text-white"
                    }`}
                  >
                    {activeChat.partnerInitials}
                  </div>
                  {activeChat.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-sm text-slate-900 truncate">
                      {activeChat.partnerName}
                    </h2>
                    {renderRoleBadge(activeChat.partnerRoleTitle, activeChat.partnerProviderName)}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                    {activeChat.isOnline ? (
                      <span className="text-emerald-600 font-medium">● Online</span>
                    ) : (
                      <span>Terakhir dilihat baru saja</span>
                    )}
                    {activeChat.partnerRoleTitle.toLowerCase().includes("teknisi") && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600">
                          Mitra Provider: <strong className="text-purple-700 font-semibold">{activeChat.partnerProviderName || "sukses gembira"}</strong>
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-slate-600">
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
                  title="Panggilan Telepon"
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
                  title="Menu Opsi"
                >
                  <DotsThreeVertical size={20} weight="bold" />
                </button>

                {/* Close/Deselect Chat Button */}
                <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => {
                    setActiveChatId(null);
                    setShowMobileChat(false);
                    setFloatingContext(null);
                  }}
                  className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                  title="Tutup Ruang Obrolan"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* Message Feed Area (SCROLLABLE: Only this section scrolls) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              {/* Security Pill */}
              <div className="flex justify-center my-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 font-medium shadow-xs">
                  <ShieldCheck size={14} weight="fill" className="text-amber-600" />
                  <span>Obrolan dilindungi enkripsi SERVIO. Jangan bagikan PIN/Password.</span>
                </div>
              </div>

              {isLoadingMessages ? (
                <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
                  <SpinnerGap size={20} className="animate-spin text-emerald-600" />
                  <span className="text-xs">Memuat pesan...</span>
                </div>
              ) : activeChat.messages.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-xs">Belum ada percakapan. Ketik pesan untuk memulai.</p>
                </div>
              ) : (
                activeChat.messages.map((msg) => {
                  const actor = getActorContext();
                  const isMe =
                    msg.senderRole === currentEntityRole || msg.senderId === actor.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs ${
                          isMe
                            ? "bg-slate-900 text-white rounded-tr-xs"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                        }`}
                      >
                        {/* Interactive Context Attached Card inside message */}
                        {msg.contextMetadata && (
                          <InteractiveContextCard
                            metadata={msg.contextMetadata}
                            isMe={isMe}
                          />
                        )}

                        {/* Attached Image if any */}
                        {msg.attachment?.type === "IMAGE" && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-white/20">
                            <img
                              src={msg.attachment.url}
                              alt="Lampiran"
                              className="max-h-60 w-full object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => window.open(msg.attachment?.url, "_blank")}
                            />
                          </div>
                        )}

                        {/* Text Body */}
                        {msg.message && (
                          <p className="whitespace-pre-wrap leading-relaxed select-text">
                            {msg.message}
                          </p>
                        )}

                        {/* Timestamp & WhatsApp Status Checkmarks */}
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                            isMe ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isMe && renderDeliveryStatus(msg.status, msg.isRead)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ========================================================================= */}
            {/* FLOATING CONTEXT CARD (FIXED: Bar above input, never scrolls)             */}
            {/* ========================================================================= */}
            {floatingContext && (() => {
              const details = resolveContextDetails({
                ...floatingContext,
                sub_type: floatingContext.subType,
                status: floatingContext.statusBadge,
                action_url: floatingContext.actionUrl,
              });

              return (
                <div className="shrink-0 px-4 pt-2.5 pb-2 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-sky-50/90 border-t border-emerald-200/80 shadow-xs z-20">
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Thumbnail & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-xl overflow-hidden bg-white border border-emerald-200 shrink-0 shadow-2xs">
                        {details.thumbnail ? (
                          <img
                            src={details.thumbnail}
                            alt={details.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-emerald-600 bg-emerald-50">
                            {details.badgeTheme.iconLarge}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wider">
                            {details.badgeTheme.icon}
                            {details.badgeLabel}
                          </span>
                          {details.status && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {details.status}
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-xs text-slate-900 truncate">
                          {details.title}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {details.price !== undefined && details.price > 0 && (
                            <span className="text-xs font-black text-emerald-700">
                              Rp {details.price.toLocaleString("id-ID")}
                            </span>
                          )}
                          {details.summary && (
                            <span className="text-[11px] text-slate-600 truncate max-w-xs hidden sm:inline">
                              • {details.summary}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {details.actionUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(details.actionUrl, "_blank", "noopener,noreferrer")}
                          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                          title="Buka halaman detail"
                        >
                          <span>Lihat</span>
                          <ArrowSquareOut size={13} weight="bold" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSendMessage(undefined, floatingContext)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        <PaperPlaneRight size={14} weight="fill" />
                        <span>Kirim Kartu Ini</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFloatingContext(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
                        title="Tutup banner konteks"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Input Controls Bar (FIXED: Never scrolls, always at bottom) */}
            <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              {/* File Attachment Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
                title="Unggah Foto Galeri"
              >
                <Paperclip size={20} />
              </button>

              {/* Camera Snap Button */}
              <button
                onClick={() => setIsCameraModalOpen(true)}
                disabled={isUploading}
                className="p-2.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition disabled:opacity-50"
                title="Ambil Foto Kamera"
              >
                <Camera size={20} />
              </button>

              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={`Tulis pesan untuk ${activeChat.partnerName}... (Tekan Enter)`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputMessage.trim() && !floatingContext) || isUploading}
                className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center shadow-sm transition"
                title="Kirim Pesan"
              >
                <PaperPlaneRight size={18} weight="bold" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-slate-50/50">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-3 shadow-inner">
              <ChatCircleDots size={36} weight="duotone" className="text-slate-400" />
            </div>
            <h3 className="font-bold text-sm text-slate-700">
              Belum Ada Obrolan Dipilih
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Pilih salah satu kontak di daftar sebelah kiri untuk membuka ruang obrolan, atau mulai percakapan langsung dari katalog produk, layanan, dan pesanan.
            </p>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(blob, previewUrl) => handlePhotoUpload(blob, previewUrl)}
      />
    </div>
  );
}
