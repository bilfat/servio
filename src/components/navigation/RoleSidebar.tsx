"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { CANONICAL_NAVIGATION, CANONICAL_NAVIGATION_SECTIONS } from "@/config/navigation";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { UserRole } from "@/types/auth";
import { X, SignOut } from "@phosphor-icons/react";

interface RoleSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function RoleSidebar({
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
}: RoleSidebarProps) {
  const { activeRole, user, logout } = useActiveRole();
  const pathname = usePathname();
  const repo = useDomainRepository();
  const merchantPendingCount = repo.getMerchantPartnershipRequests("merch-01").length;

  const resolveItemBadge = (item: { id: string; badge?: string }) => {
    if (item.id === "merch-part-req") {
      return merchantPendingCount > 0 ? String(merchantPendingCount) : undefined;
    }
    return item.badge;
  };

  // Close mobile drawer when Escape key is pressed
  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseMobile?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  // Lock body scroll when mobile drawer is open to prevent background bleed
  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpenMobile]);

  function resolveRouteRole(path?: string): UserRole | null {
    if (!path) return null;
    if (path.startsWith("/provider") || path.startsWith("/business/provider")) return "SERVICE_PROVIDER";
    if (path.startsWith("/worker") || path.startsWith("/business/worker")) return "WORKER_TECHNICIAN";
    if (path.startsWith("/ceo") || path.startsWith("/executive") || path.startsWith("/ops/executive")) return "CEO_PRODUCT_OWNER";
    if (path.startsWith("/ops") || path.startsWith("/admin") || path.startsWith("/staff")) return "ADMIN_OPERATIONS";
    if (path.startsWith("/merchant/") || path === "/merchant" || path.startsWith("/business/merchant")) return "MERCHANT";
    if (path.startsWith("/supplier") || path.startsWith("/business/supplier")) return "SUPPLIER";
    if (path.startsWith("/support")) return "CUSTOMER_SUPPORT";
    if (path.startsWith("/finance")) return "FINANCE_PAYMENT_OPS";
    return null;
  }

  const routeRole = resolveRouteRole(pathname);
  const effectiveRole: UserRole = activeRole !== "CUSTOMER" ? activeRole : (routeRole || activeRole);

  // For customer role without operational route, sidebar is not used
  if (effectiveRole === "CUSTOMER") {
    return null;
  }

  const sections = CANONICAL_NAVIGATION_SECTIONS[effectiveRole];
  const flatItems = CANONICAL_NAVIGATION[effectiveRole] || [];

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    const cleanHref = href.replace(/^\/business/, "").replace(/^\/ops/, "").replace(/^\/executive/, "");
    const cleanPath = (pathname || "").replace(/^\/business/, "").replace(/^\/ops/, "").replace(/^\/executive/, "");
    return cleanPath === cleanHref;
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP STICKY ASIDE SIDEBAR (Hidden on Mobile < md)                    */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col self-start sticky top-16 h-[calc(100vh-4rem)] border-r border-slate-200/80 bg-white/95 backdrop-blur-md transition-all duration-200 z-30 shrink-0 select-none overflow-hidden ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header / Role Context Info */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Image
                  src="/brand/logo.png"
                  alt="SERVIO Logo"
                  width={28}
                  height={21}
                  className="h-5 w-auto object-contain shrink-0"
                />
                <span className="font-brand-latin text-xl font-bold text-slate-900 leading-none select-none tracking-tight pt-0.5">
                  Servio
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">
                Workspace
              </p>
              <p className="text-xs font-bold text-neutral-dark font-display truncate">
                {user.organizationName || activeRole.replace(/_/g, " ")}
              </p>
            </div>
          ) : (
            <div className="mx-auto flex flex-col items-center">
              <Image
                src="/brand/logo.png"
                alt="SERVIO Logo"
                width={28}
                height={21}
                className="h-6 w-auto object-contain"
              />
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-neutral-slate hover:text-neutral-dark hover:bg-slate-100 transition-colors ml-auto text-xs"
            title={isCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {sections ? (
            sections.map((section) => (
              <div key={section.id} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-neutral-muted uppercase tracking-wider font-display">
                    {section.title}
                  </p>
                )}
                {isCollapsed && <div className="border-t border-slate-100 my-1" />}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                        active
                          ? "bg-primary text-white font-semibold shadow-servio-xs"
                          : "text-neutral-slate hover:bg-slate-100/80 hover:text-neutral-dark font-medium"
                      }`}
                      title={item.label}
                    >
                      <Icon
                        size={20}
                        weight={active ? "fill" : "duotone"}
                        className={active ? "text-white shrink-0" : "text-neutral-slate shrink-0"}
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1 font-body">{item.label}</span>
                      )}
                      {!isCollapsed && resolveItemBadge(item) && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-secondary/15 text-secondary"
                          }`}
                        >
                          {resolveItemBadge(item)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="space-y-1">
              {flatItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                      active
                        ? "bg-primary text-white font-semibold shadow-servio-xs"
                        : "text-neutral-slate hover:bg-slate-100/80 hover:text-neutral-dark font-medium"
                    }`}
                    title={item.label}
                  >
                    <Icon
                      size={20}
                      weight={active ? "fill" : "duotone"}
                      className={active ? "text-white shrink-0" : "text-neutral-slate shrink-0"}
                    />
                    {!isCollapsed && (
                      <span className="truncate flex-1 font-body">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-secondary/15 text-secondary"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-neutral-muted shrink-0">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="space-y-0.5">
                <p className="font-semibold text-neutral-dark truncate">{user.name}</p>
                <p className="text-[10px] truncate text-neutral-slate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-slate hover:text-rose-600 transition font-semibold text-[11px]"
                title="Keluar / Logout"
              >
                <SignOut size={14} />
                <span>Keluar / Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 mx-auto rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
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
              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-slate hover:text-rose-600 transition"
                title="Keluar / Logout"
              >
                <SignOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE RESPONSIVE DRAWER & BACKDROP (Rendered when isOpenMobile = true) */}
      {/* ========================================================================= */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200 select-none"
            aria-label="Navigasi Workspace Mobile"
          >
            {/* Header with Workspace Info & Close Button */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <div className="min-w-0 flex-1 mr-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Image
                    src="/brand/logo.png"
                    alt="SERVIO Logo"
                    width={28}
                    height={21}
                    className="h-5 w-auto object-contain shrink-0"
                  />
                  <span className="font-brand-latin text-xl font-bold text-slate-900 leading-none select-none tracking-tight pt-0.5">
                    Servio
                  </span>
                </div>
                <p className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">
                  Workspace
                </p>
                <p className="text-xs font-bold text-neutral-dark font-display truncate">
                  {user.organizationName || activeRole.replace(/_/g, " ")}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-neutral-slate hover:text-neutral-dark hover:bg-slate-200/70 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Tutup navigasi"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Nav Items List */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {sections ? (
                sections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-neutral-muted uppercase tracking-wider font-display">
                      {section.title}
                    </p>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isItemActive(item.href);

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                            active
                              ? "bg-primary text-white font-semibold shadow-servio-xs"
                              : "text-neutral-slate hover:bg-slate-100/80 hover:text-neutral-dark font-medium"
                          }`}
                        >
                          <Icon
                            size={20}
                            weight={active ? "fill" : "duotone"}
                            className={active ? "text-white shrink-0" : "text-neutral-slate shrink-0"}
                          />
                          <span className="truncate flex-1 font-body">{item.label}</span>
                          {resolveItemBadge(item) && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-secondary/15 text-secondary"
                              }`}
                            >
                              {resolveItemBadge(item)}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="space-y-1">
                  {flatItems.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                          active
                            ? "bg-primary text-white font-semibold shadow-servio-xs"
                            : "text-neutral-slate hover:bg-slate-100/80 hover:text-neutral-dark font-medium"
                        }`}
                      >
                        <Icon
                          size={20}
                          weight={active ? "fill" : "duotone"}
                          className={active ? "text-white shrink-0" : "text-neutral-slate shrink-0"}
                        />
                        <span className="truncate flex-1 font-body">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-secondary/15 text-secondary"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm overflow-hidden">
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
                  <p className="font-semibold text-xs text-neutral-dark truncate leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-neutral-slate capitalize leading-tight truncate">
                    {activeRole.toLowerCase().replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCloseMobile?.();
                  logout();
                }}
                className="p-2 rounded-xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-neutral-slate hover:text-rose-600 transition shrink-0"
                title="Keluar / Logout"
              >
                <SignOut size={16} />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
