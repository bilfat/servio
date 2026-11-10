"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useCart } from "@/features/cart/useCart";
import { resolveLocationToCityCode } from "@/lib/servioApi";
import { useActiveLocation } from "@/context/LocationContext";
import { UserRole } from "@/types/auth";
import { getRoleDashboard, getRoleProfileUrl } from "@/lib/roleNavigation";
import { useWorkerPhoto } from "@/features/worker/workerPhotoHelper";
import {
  MagnifyingGlass,
  Bell,
  ShoppingCart,
  List,
  X,
  ChatCircleDots,
  ArrowRight,
  CaretDown,
  Question,
  Headset,
  Info,
  UserPlus,
  SignIn,
  User,
  Gear,
  SignOut,
  ShieldCheck,
  MapPin,
  FileText,
  Lock,
} from "@phosphor-icons/react";

interface NavbarProps {
  onToggleSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
  cartCount?: number;
  hideSidebarToggle?: boolean;
}

export function Navbar({ onToggleSidebar, isMobileSidebarOpen, cartCount, hideSidebarToggle }: NavbarProps) {
  const { activeRole: rawActiveRole, user, isPublicGuest: rawIsPublicGuest, setIsPublicGuest, logout } = useActiveRole();
  const { location: activeLocation, openLocationModal } = useActiveLocation();
  const { totalItemCount } = useCart();
  const [optimisticCartCount, setOptimisticCartCount] = useState<number | null>(null);
  const pendingCountRef = useRef<number | null>(null);
  const isFlightActiveRef = useRef<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync optimistic count when backend totalItemCount arrives, unless flight animation is currently active
  useEffect(() => {
    if (typeof totalItemCount === "number" && !isFlightActiveRef.current) {
      setOptimisticCartCount(totalItemCount);
    }
  }, [totalItemCount]);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"help" | "register" | "profile" | "notifications" | null>(null);

  const pathname = usePathname() || "/";
  const [cartBouncing, setCartBouncing] = useState(false);

  // Re-verify cart badge count immediately on route change without requiring page reload
  useEffect(() => {
    if (typeof window !== "undefined" && !isFlightActiveRef.current) {
      try {
        const raw = localStorage.getItem("servio_customer_cart_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          const count = Array.isArray(parsed)
            ? parsed.reduce((sum: number, g: any) => sum + (g.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0), 0)
            : 0;
          setOptimisticCartCount(count);
        } else {
          setOptimisticCartCount(0);
        }
      } catch {
        setOptimisticCartCount(0);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const handleFlightStart = () => {
      isFlightActiveRef.current = true;
    };

    const handleOptimistic = (e: Event) => {
      const ce = e as CustomEvent<{ newTotalCount?: number; pending?: boolean }>;
      if (typeof ce.detail?.newTotalCount === "number") {
        if (ce.detail.pending || isFlightActiveRef.current) {
          // Keep current badge number untouched while item is flying
          pendingCountRef.current = ce.detail.newTotalCount;
        } else {
          setOptimisticCartCount(ce.detail.newTotalCount);
        }
      }
    };

    const handleCartLanded = () => {
      isFlightActiveRef.current = false;
      // Increment indicator at the exact moment the item lands and icon scales up
      if (typeof pendingCountRef.current === "number") {
        setOptimisticCartCount(pendingCountRef.current);
        pendingCountRef.current = null;
      }
      setCartBouncing(true);
      setTimeout(() => setCartBouncing(false), 800);
    };

    const handleCartUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ totalCount?: number; count?: number }>;
      if (typeof ce?.detail?.totalCount === "number") {
        setOptimisticCartCount(ce.detail.totalCount);
      } else if (typeof ce?.detail?.count === "number") {
        setOptimisticCartCount(ce.detail.count);
      } else if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("servio_customer_cart_v1");
          if (raw) {
            const parsed = JSON.parse(raw);
            const count = Array.isArray(parsed)
              ? parsed.reduce((sum: number, g: any) => sum + (g.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0), 0)
              : 0;
            setOptimisticCartCount(count);
          } else {
            setOptimisticCartCount(0);
          }
        } catch {
          setOptimisticCartCount(0);
        }
      }
    };

    window.addEventListener("servio:cart-flight-start", handleFlightStart);
    window.addEventListener("servio:cart-optimistic-add", handleOptimistic);
    window.addEventListener("servio:cart-item-landed", handleCartLanded);
    window.addEventListener("servio:cart-updated", handleCartUpdated);
    window.addEventListener("storage", handleCartUpdated);

    return () => {
      window.removeEventListener("servio:cart-flight-start", handleFlightStart);
      window.removeEventListener("servio:cart-optimistic-add", handleOptimistic);
      window.removeEventListener("servio:cart-item-landed", handleCartLanded);
      window.removeEventListener("servio:cart-updated", handleCartUpdated);
      window.removeEventListener("storage", handleCartUpdated);
    };
  }, []);

  const effectiveCartCount =
    cartCount !== undefined
      ? cartCount
      : optimisticCartCount !== null
      ? optimisticCartCount
      : totalItemCount;

  function resolveRouteRole(path?: string): UserRole | null {
    if (!path) return null;
    if (path.startsWith("/provider/") || path === "/provider" || path.startsWith("/business/provider")) return "SERVICE_PROVIDER";
    if (path.startsWith("/worker/") || path === "/worker" || path.startsWith("/business/worker")) return "WORKER_TECHNICIAN";
    if (path.startsWith("/ceo/") || path === "/ceo" || path.startsWith("/executive/") || path === "/executive" || path.startsWith("/ops/executive")) return "CEO_PRODUCT_OWNER";
    if (path.startsWith("/ops/") || path === "/ops" || path.startsWith("/admin/") || path === "/admin") return "ADMIN_OPERATIONS";
    if (path.startsWith("/merchant/") || path === "/merchant" || path.startsWith("/business/merchant")) return "MERCHANT";
    if (path.startsWith("/supplier/") || path === "/supplier" || path.startsWith("/business/supplier")) return "SUPPLIER";
    if (path.startsWith("/support/dashboard") || path.startsWith("/support/cases") || path.startsWith("/support/chat") || path.startsWith("/support/disputes")) return "CUSTOMER_SUPPORT";
    if (path.startsWith("/finance/") || path === "/finance") return "FINANCE_PAYMENT_OPS";
    return null;
  }

  const isOperationalRoute = Boolean(
    pathname?.startsWith("/provider/") ||
    pathname === "/provider" ||
    pathname?.startsWith("/worker/") ||
    pathname === "/worker" ||
    pathname?.startsWith("/ceo/") ||
    pathname === "/ceo" ||
    pathname?.startsWith("/executive/") ||
    pathname === "/executive" ||
    pathname?.startsWith("/ops/") ||
    pathname === "/ops" ||
    pathname?.startsWith("/admin/") ||
    pathname === "/admin" ||
    pathname?.startsWith("/staff/") ||
    pathname === "/staff" ||
    pathname?.startsWith("/merchant/") ||
    pathname === "/merchant" ||
    pathname?.startsWith("/supplier/") ||
    pathname === "/supplier" ||
    pathname?.startsWith("/finance/") ||
    pathname === "/finance" ||
    pathname?.startsWith("/support/dashboard") ||
    pathname?.startsWith("/support/cases") ||
    pathname?.startsWith("/support/chat") ||
    pathname?.startsWith("/support/disputes")
  );

  const routeRole = resolveRouteRole(pathname);
  const activeRole = isOperationalRoute && rawActiveRole === "CUSTOMER"
    ? (routeRole || rawActiveRole)
    : rawActiveRole;

  // On operational dashboard routes, never treat as public guest
  const isPublicGuest = !mounted ? true : (isOperationalRoute ? false : rawIsPublicGuest);
  const isCustomer = mounted && activeRole === "CUSTOMER" && !isPublicGuest;
  const isDashboardRole = isOperationalRoute;

  const liveWorkerPhoto = useWorkerPhoto();
  const isWorker = activeRole === "WORKER_TECHNICIAN";
  const userPhoto = (isWorker ? liveWorkerPhoto : null) || user.avatar || user.personalProfile?.avatar || (user.avatarUrl && user.avatarUrl !== "/brand/logo.png" ? user.avatarUrl : null);

  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const fetchLiveNotifications = () => {
    if (!isPublicGuest && user) {
      import("@/lib/servioApi").then(({ notificationsApi }) => {
        notificationsApi.getNotifications({ limit: 5 }).then((res) => {
          if (res && res.data) {
            setLiveNotifications(res.data);
            const count = (res as any).meta?.unreadCount ?? res.data.filter((n: any) => !n.readAt).length;
            setUnreadNotifCount(count);
          }
        }).catch(() => {});
      });
    }
  };

  useEffect(() => {
    if (!isPublicGuest && user) {
      fetchLiveNotifications();
    }
  }, [isPublicGuest, user]);

  // Penentu status aktif navigasi publik
  const isHomeActive = pathname === "/";
  const isServicesActive =
    pathname.startsWith("/services") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/providers");
  const isProductsActive =
    pathname.startsWith("/products") || pathname.startsWith("/merchants");
  const isPartnersActive = pathname === "/registration";
  const isSupportActive =
    pathname.startsWith("/how-it-works") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/registration/status");
  const isOrdersActive =
    pathname.startsWith("/orders") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/warranties");

  // Penentu status aktif sub-item Bantuan
  const isHelpItemActive = (href: string) => {
    if (href === "/how-it-works") return pathname.startsWith("/how-it-works");
    if (href === "/faq") return pathname.startsWith("/faq");
    if (href === "/contact") return pathname.startsWith("/contact");
    if (href === "/registration/status") return pathname.startsWith("/registration/status");
    return false;
  };

  const navRef = useRef<HTMLElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name: "help" | "register" | "profile" | "notifications") => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <nav
      ref={navRef}
      aria-label="Navigasi Utama SERVIO"
      className="sticky top-0 z-40 glass-panel border-b border-slate-200/70 transition-all bg-white/85 backdrop-blur-md"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* LEFT: Logo & Role Toggle */}
          <div className="flex items-center gap-3">
            {/* Dashboard Sidebar Toggle */}
            {isDashboardRole && !hideSidebarToggle && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2.5 rounded-xl text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/80 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Buka/Tutup Menu Workspace"
                aria-label={isMobileSidebarOpen ? "Tutup navigasi panel samping" : "Buka navigasi panel samping"}
                aria-expanded={isMobileSidebarOpen}
              >
                {isMobileSidebarOpen ? (
                  <X size={22} weight="bold" className="md:hidden text-neutral-dark" />
                ) : (
                  <List size={22} weight="bold" className="md:hidden text-neutral-dark" />
                )}
                <List size={22} weight="bold" className="hidden md:block" />
              </button>
            )}

            {/* Brand Logo: Klik membawa ke Beranda (Customer/Guest) atau Dashboard Workspace (Role Operasional) */}
            <Link
              href={isCustomer || isPublicGuest ? "/" : getRoleDashboard(activeRole)}
              className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg py-0.5 px-1"
              title={isCustomer || isPublicGuest ? "SERVIO — Beranda" : `Dashboard ${activeRole?.replace(/_/g, " ")}`}
            >
              <div className="relative h-9 flex items-center shrink-0">
                <Image
                  src="/brand/logo.png"
                  alt="SERVIO Logo"
                  width={48}
                  height={36}
                  className="h-9 w-auto object-contain shrink-0"
                  priority
                />
              </div>
              <span className="font-brand-latin text-[27px] leading-none font-bold text-slate-900 group-hover:text-primary transition-colors select-none tracking-tight pt-1">
                Servio
              </span>
            </Link>

            {/* Smart Discovery AI Chip (Customer view) */}
            {isCustomer && (
              <Link
                href="/smart-discovery"
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-light/70 hover:bg-sky-light text-primary border border-primary/25 hover:border-primary/45 text-xs font-bold shadow-2xs hover:shadow-xs transition-all min-h-[36px] group"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ChatCircleDots size={14} weight="duotone" className="group-hover:scale-110 transition-transform" />
                </span>
                <span>Diagnosa AI</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </Link>
            )}
          </div>

          {/* CENTER: Navigation Links (Public), Search (Customer), or Workspace Title (Dashboard) */}
          {isPublicGuest ? (
            /* --- PUBLIC NAV LINKS (5 MENU RINGKAS + INDIKATOR AKTIF) --- */
            <div className="hidden lg:flex items-center gap-1 xl:gap-1.5">
              {/* 1. Beranda */}
              <Link
                href="/"
                className={`relative px-3 xl:px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isHomeActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isHomeActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Beranda</span>
                {isHomeActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* 2. Jasa (Langsung ke Katalog Sekota tanpa Dropdown) */}
              <Link
                href={`/services?city=${resolveLocationToCityCode(activeLocation.city)}`}
                title={`Lihat Katalog Layanan Area ${activeLocation.city || "Jakarta"}`}
                className={`relative px-3 xl:px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isServicesActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isServicesActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Jasa</span>
                {activeLocation.isGps && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white shrink-0"
                    title="GPS Beranda Terhubung"
                  />
                )}
                {isServicesActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* 3. Produk & Sparepart */}
              <Link
                href="/products"
                className={`relative px-3 xl:px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isProductsActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isProductsActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Produk &amp; Sparepart</span>
                {isProductsActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* 4. Gabung Mitra (Halaman Penjelasan Peran Mitra Sebelum Formulir) */}
              <Link
                href="/registration"
                className={`relative px-3 xl:px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isPartnersActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isPartnersActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Gabung Mitra</span>
                {isPartnersActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* 5. Cara Kerja & Bantuan (Dropdown Gabungan) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("help")}
                  aria-expanded={activeDropdown === "help"}
                  className={`relative flex items-center gap-1.5 px-3 xl:px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all min-h-[44px] cursor-pointer ${
                    isSupportActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : activeDropdown === "help"
                      ? "bg-sky text-primary font-bold"
                      : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  {isSupportActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  )}
                  <span>Cara Kerja &amp; Bantuan</span>
                  <CaretDown
                    size={14}
                    weight="bold"
                    className={`transition-transform duration-200 ${
                      activeDropdown === "help" ? "rotate-180" : ""
                    } ${isSupportActive ? "text-white" : "text-neutral-slate"}`}
                  />
                  {isSupportActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </button>

                {activeDropdown === "help" && (
                  <div className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-servio-lg p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted">
                        Panduan &amp; Dukungan
                      </span>
                      {isSupportActive && (
                        <span className="text-[10px] font-bold text-primary bg-sky px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    {[
                      {
                        href: "/how-it-works",
                        label: "Cara Kerja & Keamanan Uang",
                        desc: "Alur order, Escrow, BAST & garansi",
                        icon: Info,
                        color: "text-primary",
                      },
                      {
                        href: "/faq",
                        label: "FAQ & Garansi Digital",
                        desc: "Jawaban cepat kebijakan & klaim",
                        icon: Question,
                        color: "text-secondary",
                      },
                      {
                        href: "/contact",
                        label: "Hubungi Kami 24/7",
                        desc: "Layanan bantuan & saluran kontak",
                        icon: Headset,
                        color: "text-primary",
                      },
                      {
                        href: "/registration/status",
                        label: "Cek Status Pendaftaran Mitra",
                        desc: "Pantau aplikasi & revisi berkas",
                        icon: FileText,
                        color: "text-emerald-600",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = isHelpItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setActiveDropdown(null)}
                          className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                            isActive
                              ? "bg-sky/70 font-bold text-primary border border-primary/20 shadow-xs"
                              : "hover:bg-slate-100 text-neutral-dark font-medium"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Icon
                              size={18}
                              className={`${isActive ? "text-primary" : item.color} shrink-0 mt-0.5`}
                              weight="duotone"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs leading-tight">{item.label}</p>
                              <p className="text-[10px] text-neutral-slate truncate mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white shrink-0">
                              Aktif
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : isCustomer ? (
            /* --- CUSTOMER CENTER (P0.4) --- */
            <div className="hidden md:flex items-center mx-4">
              {/* Customer Quick Links */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/"
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isHomeActive
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  <span>Home</span>
                  {isHomeActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
                <Link
                  href={`/services?city=${resolveLocationToCityCode(activeLocation.city)}`}
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                    isServicesActive
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                  title={`Katalog Layanan Area ${activeLocation.city}`}
                >
                  <span>Jasa</span>
                  {activeLocation.isGps && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="GPS Beranda Terhubung" />
                  )}
                  {isServicesActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
                <Link
                  href="/products"
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isProductsActive
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  <span>Produk</span>
                  {isProductsActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
                <Link
                  href="/chat"
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                    pathname?.startsWith("/chat")
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  <span>Chat</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white">
                    2
                  </span>
                  {pathname?.startsWith("/chat") && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
                <Link
                  href="/orders"
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isOrdersActive && !pathname.startsWith("/warranties")
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  <span>Pesanan</span>
                  {isOrdersActive && !pathname.startsWith("/warranties") && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
                <Link
                  href="/warranties"
                  className={`relative px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    pathname.startsWith("/warranties")
                      ? "font-bold text-primary"
                      : "font-medium text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  <span>Garansi &amp; Perlindungan</span>
                  {pathname.startsWith("/warranties") && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </Link>
              </div>
            </div>
          ) : (
            /* --- DASHBOARD CENTER --- */
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold font-display uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-sky border border-sky-200">
                {user.organizationName || activeRole.replace(/_/g, " ")}
              </span>
            </div>
          )}

          {/* RIGHT: CTAs & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isPublicGuest ? (
              /* --- PUBLIC GUEST ACTIONS --- */
              <div className="hidden sm:flex items-center gap-1.5 lg:gap-2">
                {/* Chip Lokasi Kota / GPS Ringkas */}
                <button
                  type="button"
                  onClick={openLocationModal}
                  title="Ubah Kota atau Aktifkan GPS"
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-neutral-dark transition-colors max-w-[160px] min-h-[40px] cursor-pointer"
                >
                  <MapPin
                    size={15}
                    weight="fill"
                    className={activeLocation.isGps ? "text-emerald-600 shrink-0" : "text-primary shrink-0"}
                  />
                  <span className="truncate">{activeLocation.city || activeLocation.displayName}</span>
                  {activeLocation.isGps && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>

                {/* Ikon Cari Cepat */}
                <Link
                  href="/search"
                  title="Cari Layanan & Suku Cadang"
                  aria-label="Cari Layanan dan Suku Cadang"
                  className="hidden lg:flex p-2.5 rounded-xl text-neutral-slate hover:text-primary hover:bg-slate-100/80 transition-colors min-w-[40px] min-h-[40px] items-center justify-center"
                >
                  <MagnifyingGlass size={18} weight="bold" />
                </Link>

                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-dark hover:bg-slate-100 transition-colors min-h-[44px]"
                >
                  <SignIn size={16} weight="bold" />
                  <span>Masuk</span>
                </Link>

                {/* Daftar Dropdown: Pelanggan vs Pelajari & Daftar Jadi Mitra */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("register")}
                    aria-expanded={activeDropdown === "register"}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs min-h-[44px] cursor-pointer"
                  >
                    <UserPlus size={16} weight="bold" />
                    <span>Daftar</span>
                    <CaretDown size={12} weight="bold" />
                  </button>

                  {activeDropdown === "register" && (
                    <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-servio-lg p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <Link
                        href="/auth/register?type=customer"
                        onClick={() => setActiveDropdown(null)}
                        className="block p-2.5 rounded-xl hover:bg-sky/50 transition-colors"
                      >
                        <p className="text-xs font-bold text-neutral-dark">Sebagai Pelanggan</p>
                        <p className="text-[11px] text-neutral-slate">
                          Pesan jasa, Diagnosa AI &amp; beli suku cadang
                        </p>
                      </Link>
                      <Link
                        href="/registration"
                        onClick={() => setActiveDropdown(null)}
                        className="block p-2.5 rounded-xl hover:bg-sky/50 transition-colors border-t border-slate-100"
                      >
                        <p className="text-xs font-bold text-primary inline-flex items-center gap-1">
                          <span>Pelajari &amp; Daftar Jadi Mitra</span>
                          <ArrowRight size={12} weight="bold" />
                        </p>
                        <p className="text-[11px] text-neutral-slate">
                          Provider Jasa, Merchant Toko &amp; Supplier B2B
                        </p>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* --- LOGGED-IN ACTIONS (Customer or Operations) --- */
              <>
                {/* Cart Icon (Customer) */}
                {isCustomer && (
                  <Link
                    id="navbar-cart-button"
                    href="/cart"
                    className={`relative p-2.5 rounded-xl transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      cartBouncing
                        ? "text-primary bg-sky/80 scale-125 shadow-md ring-4 ring-primary/25"
                        : "text-neutral-slate hover:text-primary hover:bg-sky/50"
                    }`}
                    title="Keranjang Belanja"
                    aria-label="Keranjang Belanja"
                  >
                    <ShoppingCart
                      size={22}
                      weight="duotone"
                      className={`transition-transform duration-300 ${cartBouncing ? "scale-125 rotate-[-12deg]" : ""}`}
                    />
                    {effectiveCartCount > 0 && (
                      <span
                        id="navbar-cart-badge"
                        className={`absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                          cartBouncing
                            ? "bg-emerald-500 scale-125 ring-2 ring-white shadow-md animate-bounce"
                            : "bg-secondary"
                        }`}
                      >
                        {effectiveCartCount}
                      </span>
                    )}
                  </Link>
                )}

                  {/* Notifications Bell & Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        toggleDropdown("notifications");
                        fetchLiveNotifications();
                      }}
                      aria-expanded={activeDropdown === "notifications"}
                      className="relative p-2.5 rounded-xl text-neutral-slate hover:text-primary hover:bg-sky/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Notifikasi Operasional"
                      aria-label="Lihat Notifikasi"
                    >
                      <Bell size={22} weight="duotone" />
                      {unreadNotifCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white px-1">
                          {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                        </span>
                      )}
                    </button>

                    {activeDropdown === "notifications" && (
                      <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-servio-lg p-3 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-neutral-dark">Pemberitahuan Operasional</p>
                          {unreadNotifCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                import("@/lib/servioApi").then(({ notificationsApi }) => {
                                  notificationsApi.markAllAsRead().then(() => {
                                    fetchLiveNotifications();
                                  });
                                });
                              }}
                              className="text-[10px] font-semibold text-primary hover:underline"
                            >
                              Tandai Semua Dibaca
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {liveNotifications.length > 0 ? (
                            liveNotifications.map((n) => (
                              <div
                                key={n.notificationId || n._id}
                                className={`p-2.5 rounded-xl border transition text-left ${
                                  !n.readAt ? "bg-sky-50/50 border-sky-100" : "bg-white border-slate-100 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-primary">{n.title}</span>
                                  <span className="text-[9px] text-slate-400">
                                    {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.body}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-500">
                              Belum ada notifikasi baru.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                {/* Profile Pill with Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("profile")}
                    aria-expanded={activeDropdown === "profile"}
                    className="flex items-center gap-2 pl-2 border-l border-slate-200 min-h-[44px] text-left group focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all overflow-hidden shrink-0">
                      {userPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userPhoto}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-semibold text-neutral-dark font-display max-w-[120px] truncate leading-tight">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-neutral-slate capitalize leading-tight">
                        {activeRole.toLowerCase().replace(/_/g, " ")}
                      </p>
                    </div>
                  </button>

                  {activeDropdown === "profile" && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-servio-lg p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden shrink-0">
                          {userPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={userPhoto}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-dark truncate">{user.name}</p>
                          <p className="text-[10px] text-neutral-muted truncate">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        href={getRoleProfileUrl(activeRole)}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-xs text-neutral-dark"
                      >
                        <User size={16} className="text-neutral-slate" />
                        <span>Profil Akun</span>
                      </Link>
                      {activeRole === "CUSTOMER" && (
                        <Link
                          href="/warranties"
                          onClick={() => setActiveDropdown(null)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-xs text-neutral-dark"
                        >
                          <ShieldCheck size={16} className="text-neutral-slate" />
                          <span>Garansi &amp; Perlindungan</span>
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-xs text-neutral-dark"
                      >
                        <Gear size={16} className="text-neutral-slate" />
                        <span>Pengaturan</span>
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          setActiveDropdown(null);
                          await logout();
                          setIsPublicGuest(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors text-xs font-medium"
                      >
                        <SignOut size={16} />
                        <span>Keluar / Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Hamburger (for Public <1024px or Customer <768px) */}
            {(isPublicGuest || isCustomer) && (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className={`${
                  isPublicGuest ? "lg:hidden" : "md:hidden"
                } p-2.5 rounded-xl text-neutral-slate hover:text-neutral-dark hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center`}
                aria-label={mobileDrawerOpen ? "Tutup Menu" : "Buka Menu"}
                aria-expanded={mobileDrawerOpen}
              >
                {mobileDrawerOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE RESPONSIVE DRAWER */}
      {mobileDrawerOpen && (
        <div
          className={`${
            isPublicGuest ? "lg:hidden" : "md:hidden"
          } border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-servio-md animate-in slide-in-from-top-4 duration-200`}
        >
          {isPublicGuest ? (
            <div className="space-y-3">
              {/* Lokasi & Cari Cepat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    openLocationModal();
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-neutral-dark font-medium"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin
                      size={15}
                      weight="fill"
                      className={activeLocation.isGps ? "text-emerald-600 shrink-0" : "text-primary shrink-0"}
                    />
                    <span className="truncate">
                      Lokasi: {activeLocation.city || activeLocation.displayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-primary underline shrink-0 ml-2">
                    Ubah
                  </span>
                </button>

                <Link
                  href="/search"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-neutral-slate font-medium"
                >
                  <MagnifyingGlass size={15} weight="bold" className="text-primary shrink-0" />
                  <span>Cari layanan atau suku cadang...</span>
                </Link>
              </div>

              {/* 5 Navigasi Utama Guest */}
              <div className="space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isHomeActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-neutral-dark font-semibold hover:bg-slate-100"
                  }`}
                >
                  <span>Beranda</span>
                  {isHomeActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                      Aktif
                    </span>
                  )}
                </Link>

                <Link
                  href={`/services?city=${resolveLocationToCityCode(activeLocation.city)}`}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isServicesActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-neutral-dark font-semibold hover:bg-slate-100"
                  }`}
                >
                  <span>Jasa</span>
                  {isServicesActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                      Aktif
                    </span>
                  )}
                </Link>

                <Link
                  href="/products"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isProductsActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-neutral-dark font-semibold hover:bg-slate-100"
                  }`}
                >
                  <span>Produk &amp; Sparepart</span>
                  {isProductsActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                      Aktif
                    </span>
                  )}
                </Link>

                <Link
                  href="/registration"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                    isPartnersActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "text-neutral-dark font-semibold hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <p>Gabung Mitra</p>
                    <p className={`text-[10px] font-normal ${isPartnersActive ? "text-sky-100" : "text-neutral-slate"}`}>
                      Penjelasan Provider Jasa, Merchant &amp; Supplier B2B
                    </p>
                  </div>
                  {isPartnersActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary shrink-0">
                      Aktif
                    </span>
                  )}
                </Link>
              </div>

              {/* Cara Kerja & Bantuan */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted px-3 block">
                  Cara Kerja &amp; Bantuan
                </span>
                {[
                  { href: "/how-it-works", label: "Cara Kerja & Keamanan Uang" },
                  { href: "/faq", label: "FAQ & Garansi Digital" },
                  { href: "/contact", label: "Hubungi Kami 24/7" },
                  { href: "/registration/status", label: "Cek Status Pendaftaran Mitra" },
                ].map((item) => {
                  const active = isHelpItemActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        active
                          ? "bg-primary text-white font-bold shadow-xs"
                          : "font-semibold text-neutral-dark hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                          Aktif
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Kartu Diagnosa AI (Wajib Login Pelanggan untuk Chat Penuh) */}
              <Link
                href="/smart-discovery"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-sky-200 text-neutral-dark shadow-2xs hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky text-primary flex items-center justify-center shrink-0">
                    <ChatCircleDots size={18} weight="duotone" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-dark flex items-center gap-1.5">
                      <span>Diagnosa AI Penuh</span>
                      <Lock size={11} weight="fill" className="text-secondary" />
                    </p>
                    <p className="text-[10px] text-neutral-slate">
                      Khusus Pelanggan login (simulasi gratis di Beranda)
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary bg-sky/70 px-2 py-0.5 rounded-full border border-sky-200 shrink-0 inline-flex items-center gap-1">
                  <span>Masuk</span>
                  <ArrowRight size={10} weight="bold" />
                </span>
              </Link>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-neutral-dark text-xs font-bold text-center hover:bg-slate-100"
                >
                  Masuk Akun
                </Link>
                <Link
                  href="/auth/register?type=customer"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold text-center shadow-servio-xs hover:bg-primary-dark"
                >
                  Daftar Pelanggan Gratis
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Diagnosa AI highlight card for Mobile Customer */}
              <Link
                href="/smart-discovery"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 shadow-servio-xs hover:border-amber-300 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-light text-primary flex items-center justify-center shrink-0">
                    <ChatCircleDots size={17} weight="duotone" className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Diagnosa AI</p>
                    <p className="text-[10px] text-amber-800">Cari solusi kerusakan &amp; teknisi otomatis</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                  <span>Mulai</span>
                  <ArrowRight size={10} weight="bold" />
                </span>
              </Link>

              <Link
                href="/"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isHomeActive
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <span>Home / Beranda</span>
                {isHomeActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
              <Link
                href="/services"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isServicesActive
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <span>Katalog Jasa</span>
                {isServicesActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isProductsActive
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <span>Katalog Produk & Sparepart</span>
                {isProductsActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
              <Link
                href="/chat"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  pathname.startsWith("/chat")
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Chat &amp; Pesan</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white">
                    2
                  </span>
                </div>
                {pathname.startsWith("/chat") && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
              <Link
                href="/orders"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  isOrdersActive
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <span>Riwayat Pesanan</span>
                {isOrdersActive && !pathname.startsWith("/warranties") && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
              <Link
                href="/warranties"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                  pathname.startsWith("/warranties")
                    ? "font-bold text-primary bg-sky/50"
                    : "font-semibold text-neutral-dark hover:bg-slate-100"
                }`}
              >
                <span>Garansi &amp; Perlindungan</span>
                {pathname.startsWith("/warranties") && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                    Aktif
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
