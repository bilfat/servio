"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useCart } from "@/features/cart/useCart";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { taxonomyApi, resolveLocationToCityCode } from "@/lib/servioApi";
import { useActiveLocation } from "@/context/LocationContext";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import { UserRole } from "@/types/auth";
import {
  MagnifyingGlass,
  Bell,
  ShoppingCart,
  List,
  X,
  Sparkle,
  CaretDown,
  ArrowRight,
  Question,
  Headset,
  Info,
  UserPlus,
  SignIn,
  User,
  Gear,
  SignOut,
  ShieldCheck,
  Wrench,
  CircleNotch,
  MapPin,
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
  const effectiveCartCount = cartCount !== undefined ? cartCount : totalItemCount;
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"services" | "help" | "register" | "profile" | "notifications" | null>(null);

  const pathname = usePathname() || "/";
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const updateHash = () => {
      if (typeof window !== "undefined") {
        setCurrentHash(window.location.hash);
      }
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

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
  const isPublicGuest = isOperationalRoute ? false : rawIsPublicGuest;
  const isCustomer = (activeRole === "CUSTOMER" || !isOperationalRoute) && !isPublicGuest;
  const isDashboardRole = isOperationalRoute;

  // Filter service categories dynamically from canonical taxonomy API
  const repo = useDomainRepository();
  const [canonicalCategories, setCanonicalCategories] = useState<{ id: string; name: string; code?: string; status: string }[]>([]);
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

  const [liveServiceCategories, setLiveServiceCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    let mounted = true;
    taxonomyApi
      .getCategories({ master_code: "JASA", status: "ACTIVE" })
      .then((res) => {
        if (mounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setLiveServiceCategories(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCategories(false);
      });

    if (!isPublicGuest) {
      fetchLiveNotifications();
    }

    return () => {
      mounted = false;
    };
  }, [isPublicGuest, user]);

  const activeServiceDomains = React.useMemo(() => {
    if (liveServiceCategories.length > 0) {
      return liveServiceCategories.map((c) => {
        const IconComponent = CATEGORY_ICON_MAP[c.icon_name || ""] || Wrench;
        return {
          id: c.id,
          label: c.name,
          href: `/services?categories=${c.id}`,
          icon: IconComponent,
        };
      });
    }
    return [];
  }, [liveServiceCategories]);

  // Penentu status aktif navigasi publik
  const isHomeActive = pathname === "/";
  const isServicesActive =
    pathname.startsWith("/services") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/providers");
  const isProductsActive = pathname.startsWith("/products");
  const isHowItWorksActive = pathname.startsWith("/how-it-works");
  const isSupportActive =
    pathname.startsWith("/support") || pathname.startsWith("/faq") || pathname.startsWith("/contact");
  const isOrdersActive =
    pathname.startsWith("/orders") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/warranties");

  // Penentu status aktif sub-item domain Jasa
  const isServiceDomainActive = (domainHref: string) => {
    return pathname === domainHref || pathname.startsWith(domainHref);
  };

  // Penentu status aktif sub-item Bantuan
  const isHelpItemActive = (href: string) => {
    if (href === "/support") {
      return pathname === "/support" && (!currentHash || currentHash === "#overview");
    }
    if (href === "/faq") {
      return pathname.startsWith("/faq") || (pathname === "/support" && currentHash === "#faq");
    }
    if (href === "/contact") {
      return pathname.startsWith("/contact") || (pathname === "/support" && currentHash === "#contact");
    }
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

  const toggleDropdown = (name: "services" | "help" | "register" | "profile" | "notifications") => {
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

            {/* Brand Logo: Hanya role pelanggan (Customer) & public guest yang dapat mengklik ke beranda. Role lainnya tidak terjadi apa-apa */}
            {isCustomer || isPublicGuest ? (
              <Link
                href="/"
                className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg py-0.5 px-1"
                title="SERVIO — Beranda"
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
            ) : (
              <div
                className="flex items-center gap-2.5 shrink-0 select-none py-0.5 px-1 cursor-default"
                title="SERVIO Workspace"
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
                <span className="font-brand-latin text-[27px] leading-none font-bold text-slate-900 select-none tracking-tight pt-1">
                  Servio
                </span>
              </div>
            )}

            {/* Smart Discovery AI Chip (Customer view) */}
            {isCustomer && (
              <Link
                href="/smart-discovery"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ivory text-amber-900 border border-amber-200 text-xs font-semibold hover:border-secondary hover:text-secondary transition-colors min-h-[36px]"
              >
                <Sparkle size={14} weight="fill" className="text-secondary" />
                Diagnosa AI
              </Link>
            )}
          </div>

          {/* CENTER: Navigation Links (Public), Search (Customer), or Workspace Title (Dashboard) */}
          {isPublicGuest ? (
            /* --- PUBLIC NAV LINKS (P0.3) DENGAN INDIKATOR AKTIF --- */
            <div className="hidden md:flex items-center gap-1 lg:gap-1.5">
              {/* Beranda */}
              <Link
                href="/"
                className={`relative px-3.5 py-2 rounded-xl text-xs transition-all min-h-[44px] flex items-center gap-1.5 ${
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

              {/* Jasa Dropdown (6 Domains) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("services")}
                  aria-expanded={activeDropdown === "services"}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all min-h-[44px] ${
                    isServicesActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : activeDropdown === "services"
                      ? "bg-sky text-primary font-bold"
                      : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                  }`}
                >
                  {isServicesActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  )}
                  <span>Jasa</span>
                  {activeLocation.isGps && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white shrink-0" title="GPS Beranda Terhubung" />
                  )}
                  <CaretDown
                    size={14}
                    weight="bold"
                    className={`transition-transform duration-200 ${
                      activeDropdown === "services" ? "rotate-180" : ""
                    } ${isServicesActive ? "text-white" : "text-neutral-slate"}`}
                  />
                  {isServicesActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                  )}
                </button>

                {activeDropdown === "services" && (
                  <div className="absolute top-full left-0 mt-2 w-88 rounded-2xl bg-white border border-slate-200/90 shadow-servio-lg p-2.5 grid grid-cols-1 gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Active GPS Location Card from Beranda */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${activeLocation.isGps ? "bg-emerald-100 text-emerald-700" : "bg-sky text-primary"}`}>
                          <MapPin size={16} weight="fill" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Lokasi Beranda (GPS)
                          </p>
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {activeLocation.city || activeLocation.displayName}
                          </p>
                        </div>
                      </div>
                      {activeLocation.isGps ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          GPS Aktif
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDropdown(null);
                            openLocationModal();
                          }}
                          className="text-[10px] text-primary font-bold underline hover:text-primary-dark shrink-0 cursor-pointer"
                        >
                          Ubah
                        </button>
                      )}
                    </div>

                    {/* Direct 1-City Catalog Link */}
                    <Link
                      href={`/services?city=${resolveLocationToCityCode(activeLocation.city)}`}
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition shadow-xs group font-bold"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-white/20">
                          <Wrench size={16} weight="bold" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">Semua Layanan Jasa</p>
                          <p className="text-[10px] text-sky-light font-normal">Katalog Sekota ({activeLocation.city || "Jakarta"})</p>
                        </div>
                      </div>
                      <ArrowRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>

                    <div className="flex items-center justify-between px-3 pt-2 pb-0.5 border-t border-slate-100 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted">
                        Kategori Layanan
                      </span>
                      <span className="text-[10px] text-neutral-slate">
                        Pilih Kategori Spesifik
                      </span>
                    </div>

                    {isLoadingCategories ? (
                      <div className="py-6 px-4 text-center space-y-2">
                        <CircleNotch size={20} className="animate-spin text-primary mx-auto" />
                        <p className="text-xs text-neutral-slate">Memuat kategori database...</p>
                      </div>
                    ) : activeServiceDomains.length === 0 ? (
                      <div className="py-6 px-4 text-center space-y-1">
                        <p className="text-xs font-bold text-neutral-dark">Belum ada kategori layanan</p>
                        <p className="text-[11px] text-neutral-slate">Kategori jasa aktif belum tersedia di database.</p>
                      </div>
                    ) : (
                      activeServiceDomains.map((domain) => {
                        const Icon = domain.icon;
                        const isActive = isServiceDomainActive(domain.href);
                        return (
                          <Link
                            key={domain.id}
                            href={domain.href}
                            onClick={() => setActiveDropdown(null)}
                            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors group ${
                              isActive
                                ? "bg-sky/70 text-primary font-bold border border-primary/20 shadow-xs"
                                : "hover:bg-sky/40 text-neutral-dark"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg transition-colors ${
                                isActive
                                  ? "bg-primary text-white"
                                  : "bg-sky/60 text-primary group-hover:bg-primary group-hover:text-white"
                              }`}
                            >
                              <Icon size={18} weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs ${
                                  isActive
                                    ? "font-bold text-primary"
                                    : "font-semibold text-neutral-dark group-hover:text-primary"
                                }`}
                              >
                                {domain.label}
                              </p>
                            </div>
                            {isActive ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white shrink-0">
                                Aktif
                              </span>
                            ) : (
                              <ArrowRight
                                size={14}
                                className="text-neutral-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                              />
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Produk & Sparepart */}
              <Link
                href="/products"
                className={`relative px-3.5 py-2 rounded-xl text-xs transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isProductsActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isProductsActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Produk & Sparepart</span>
                {isProductsActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* Cara Kerja */}
              <Link
                href="/how-it-works"
                className={`relative px-3.5 py-2 rounded-xl text-xs transition-all min-h-[44px] flex items-center gap-1.5 ${
                  isHowItWorksActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "font-semibold text-neutral-slate hover:text-neutral-dark hover:bg-slate-100/70"
                }`}
              >
                {isHowItWorksActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                )}
                <span>Cara Kerja</span>
                {isHowItWorksActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>

              {/* Bantuan Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("help")}
                  aria-expanded={activeDropdown === "help"}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs transition-all min-h-[44px] ${
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
                  <span>Bantuan</span>
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
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200/90 shadow-servio-lg p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted">
                        Bantuan & Informasi
                      </span>
                      {isSupportActive && (
                        <span className="text-[10px] font-bold text-primary bg-sky px-2 py-0.5 rounded-full">
                          Menu Aktif
                        </span>
                      )}
                    </div>
                    {[
                      { href: "/support", label: "Pusat Bantuan", icon: Info, color: "text-primary" },
                      { href: "/faq", label: "FAQ & Garansi", icon: Question, color: "text-secondary" },
                      { href: "/contact", label: "Hubungi Kami", icon: Headset, color: "text-primary" },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = isHelpItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setActiveDropdown(null);
                            if (item.href.includes("#")) {
                              setCurrentHash(item.href.substring(item.href.indexOf("#")));
                            } else {
                              setCurrentHash("");
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                            isActive
                              ? "bg-sky/70 font-bold text-primary border border-primary/20 shadow-xs"
                              : "hover:bg-slate-100 text-neutral-dark font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={18} className={isActive ? "text-primary" : item.color} weight="duotone" />
                            <span>{item.label}</span>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
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
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-dark hover:bg-slate-100 transition-colors min-h-[44px]"
                >
                  <SignIn size={16} weight="bold" />
                  Masuk
                </Link>

                {/* Daftar Dropdown with 3 Persona Options */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("register")}
                    aria-expanded={activeDropdown === "register"}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-all shadow-servio-xs min-h-[44px]"
                  >
                    <UserPlus size={16} weight="bold" />
                    <span>Daftar</span>
                    <CaretDown size={12} weight="bold" />
                  </button>

                  {activeDropdown === "register" && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-servio-lg p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <Link
                        href="/auth/register?type=customer"
                        onClick={() => setActiveDropdown(null)}
                        className="block p-2.5 rounded-xl hover:bg-sky/50 transition-colors"
                      >
                        <p className="text-xs font-bold text-neutral-dark">Sebagai Pelanggan</p>
                        <p className="text-[11px] text-neutral-slate">Pesan jasa & spare part</p>
                      </Link>
                      <Link
                        href="/auth/register?type=provider"
                        onClick={() => setActiveDropdown(null)}
                        className="block p-2.5 rounded-xl hover:bg-sky/50 transition-colors"
                      >
                        <p className="text-xs font-bold text-neutral-dark">Sebagai Mitra Teknisi</p>
                        <p className="text-[11px] text-neutral-slate">Terima order jasa & servis</p>
                      </Link>
                      <Link
                        href="/auth/register?type=merchant"
                        onClick={() => setActiveDropdown(null)}
                        className="block p-2.5 rounded-xl hover:bg-sky/50 transition-colors"
                      >
                        <p className="text-xs font-bold text-neutral-dark">Sebagai Toko / Merchant</p>
                        <p className="text-[11px] text-neutral-slate">Jual suku cadang resmi</p>
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
                    href="/cart"
                    className="relative p-2.5 rounded-xl text-neutral-slate hover:text-primary hover:bg-sky/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Keranjang Belanja"
                    aria-label="Keranjang Belanja"
                  >
                    <ShoppingCart size={22} weight="duotone" />
                    {effectiveCartCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center">
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
                      {user.avatar || (user.personalProfile?.avatar) || (user.avatarUrl && user.avatarUrl !== "/brand/logo.png") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar || user.personalProfile?.avatar || user.avatarUrl}
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
                          {user.avatar || (user.personalProfile?.avatar) || (user.avatarUrl && user.avatarUrl !== "/brand/logo.png") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar || user.personalProfile?.avatar || user.avatarUrl}
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
                        href={
                          activeRole === "SERVICE_PROVIDER"
                            ? "/provider/profile"
                            : activeRole === "MERCHANT"
                            ? "/merchant/profile"
                            : activeRole === "SUPPLIER"
                            ? "/supplier/profile"
                            : activeRole === "WORKER_TECHNICIAN"
                            ? "/worker/profile"
                            : "/profile"
                        }
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

            {/* Mobile Menu Hamburger (for Public or Customer) */}
            {(isPublicGuest || isCustomer) && (
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                className="md:hidden p-2.5 rounded-xl text-neutral-slate hover:text-neutral-dark hover:bg-slate-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={mobileDrawerOpen ? "Tutup Menu" : "Buka Menu"}
                aria-expanded={mobileDrawerOpen}
              >
                {mobileDrawerOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE RESPONSIVE DRAWER (P0.3 Mobile Navigation) */}
      {mobileDrawerOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-servio-md animate-in slide-in-from-top-4 duration-200">
          {isPublicGuest ? (
            <div className="space-y-3">
              {/* Beranda Mobile */}
              <Link
                href="/"
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors ${
                  isHomeActive
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "text-neutral-dark font-semibold hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isHomeActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary" />}
                  <span>Beranda</span>
                </div>
                {isHomeActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                    Aktif
                  </span>
                )}
              </Link>

              {/* Layanan Servio */}
              <div className="flex items-center justify-between px-2 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
                  Layanan Servio
                </p>
                {isServicesActive && (
                  <span className="text-[10px] font-bold text-primary bg-sky px-2 py-0.5 rounded-full">
                    Kategori Aktif
                  </span>
                )}
              </div>
              {isLoadingCategories ? (
                <div className="py-4 text-center text-xs text-neutral-slate flex items-center justify-center gap-2">
                  <CircleNotch size={14} className="animate-spin text-primary" />
                  <span>Memuat kategori...</span>
                </div>
              ) : activeServiceDomains.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-slate bg-slate-50 rounded-xl">
                  Belum ada kategori layanan aktif.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {activeServiceDomains.map((domain) => {
                    const Icon = domain.icon;
                    const isActive = isServiceDomainActive(domain.href);
                    return (
                      <Link
                        key={domain.id}
                        href={domain.href}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-xs transition-colors ${
                          isActive
                            ? "bg-sky text-primary font-bold border border-primary/30 shadow-xs"
                            : "bg-slate-50 hover:bg-sky/50 text-neutral-dark font-medium"
                        }`}
                      >
                        <Icon size={16} className={isActive ? "text-primary" : "text-primary shrink-0"} weight="duotone" />
                        <span className="truncate flex-1">{domain.label}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-slate-100 pt-2 space-y-1">
                <Link
                  href="/smart-discovery"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-900 shadow-servio-xs hover:border-amber-300 transition-all mb-1"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Sparkle size={15} weight="fill" className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950">Diagnosa AI</p>
                      <p className="text-[10px] text-amber-800">Smart Discovery kendala & solusi</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                    Coba →
                  </span>
                </Link>
                <Link
                  href="/products"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    isProductsActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "font-semibold text-neutral-dark hover:bg-slate-100"
                  }`}
                >
                  <span>Produk & Sparepart</span>
                  {isProductsActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                      Aktif
                    </span>
                  )}
                </Link>
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    isHowItWorksActive
                      ? "bg-primary text-white font-bold shadow-xs"
                      : "font-semibold text-neutral-dark hover:bg-slate-100"
                  }`}
                >
                  <span>Cara Kerja & Escrow</span>
                  {isHowItWorksActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                      Aktif
                    </span>
                  )}
                </Link>
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted px-3">
                    Bantuan & Dukungan
                  </span>
                  <Link
                    href="/support"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      pathname === "/support"
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "font-semibold text-neutral-dark hover:bg-slate-100"
                    }`}
                  >
                    <span>Pusat Bantuan Umum</span>
                    {pathname === "/support" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                        Aktif
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      pathname.startsWith("/faq")
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "font-semibold text-neutral-dark hover:bg-slate-100"
                    }`}
                  >
                    <span>FAQ & Garansi</span>
                    {pathname.startsWith("/faq") && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                        Aktif
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      pathname.startsWith("/contact")
                        ? "bg-primary text-white font-bold shadow-xs"
                        : "font-semibold text-neutral-dark hover:bg-slate-100"
                    }`}
                  >
                    <span>Hubungi Kami</span>
                    {pathname.startsWith("/contact") && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-primary">
                        Aktif
                      </span>
                    )}
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-300 text-neutral-dark text-xs font-bold text-center hover:bg-slate-100"
                >
                  Masuk Akun
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold text-center shadow-servio-xs hover:bg-primary-dark"
                >
                  Daftar Sekarang
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Diagnosa AI highlight card for Mobile Customer */}
              <Link
                href="/smart-discovery"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-900 shadow-servio-xs hover:border-amber-300 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Sparkle size={15} weight="fill" className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Diagnosa AI</p>
                    <p className="text-[10px] text-amber-800">Cari solusi kerusakan & teknisi otomatis</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                  Mulai →
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
