"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import {
  House,
  MagnifyingGlass,
  ClipboardText,
  ShoppingCart,
  User,
  Wrench,
  CalendarCheck,
  ChatCircleText,
} from "@phosphor-icons/react";
import { useCart } from "@/features/cart/useCart";

interface BottomNavProps {
  orderBadgeCount?: number;
  cartBadgeCount?: number;
}

export function BottomNav({ orderBadgeCount, cartBadgeCount }: BottomNavProps) {
  const { activeRole, isPublicGuest } = useActiveRole();
  const { totalItemCount } = useCart();
  const effectiveCartBadge = cartBadgeCount !== undefined ? cartBadgeCount : totalItemCount;
  const pathname = usePathname();

  // If public guest or role is not mobile-optimized customer/worker, hide bottom nav
  if (isPublicGuest || (activeRole !== "CUSTOMER" && activeRole !== "WORKER_TECHNICIAN")) {
    return null;
  }

  const customerItems = [
    { label: "Beranda", href: "/", icon: House },
    { label: "Eksplor", href: "/search", icon: MagnifyingGlass },
    {
      label: "Pesanan",
      href: "/orders",
      icon: ClipboardText,
      badge: orderBadgeCount && orderBadgeCount > 0 ? String(orderBadgeCount) : undefined,
    },
    {
      label: "Keranjang",
      href: "/cart",
      icon: ShoppingCart,
      badge: effectiveCartBadge && effectiveCartBadge > 0 ? String(effectiveCartBadge) : undefined,
    },
    { label: "Akun", href: "/profile", icon: User },
  ];

  const workerItems = [
    { label: "Dashboard", href: "/worker/dashboard", icon: House },
    {
      label: "Pekerjaan",
      href: "/worker/jobs",
      icon: Wrench,
      badge: orderBadgeCount && orderBadgeCount > 0 ? String(orderBadgeCount) : undefined,
    },
    { label: "Jadwal", href: "/worker/schedule", icon: CalendarCheck },
    { label: "Obrolan", href: "/worker/chat", icon: ChatCircleText },
    { label: "Profil", href: "/worker/profile", icon: User },
  ];

  const items = activeRole === "CUSTOMER" ? customerItems : workerItems;

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/orders") {
      return (
        pathname.startsWith("/orders") ||
        pathname.startsWith("/warranties") ||
        pathname.startsWith("/bookings")
      );
    }
    if (href === "/profile") {
      return pathname.startsWith("/profile");
    }
    if (href === "/cart") {
      return pathname.startsWith("/cart") || pathname.startsWith("/checkout");
    }
    if (href === "/search") {
      return pathname.startsWith("/search");
    }
    if (href === "/worker/dashboard") {
      return pathname === "/worker/dashboard";
    }
    if (href === "/worker/jobs") {
      return pathname.startsWith("/worker/jobs") || pathname.startsWith("/worker/warranty");
    }
    if (href === "/worker/schedule") {
      return pathname.startsWith("/worker/schedule");
    }
    if (href === "/worker/chat") {
      return pathname.startsWith("/worker/chat");
    }
    if (href === "/worker/profile") {
      return pathname.startsWith("/worker/profile");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Navigasi Bawah Seluler"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-200/80 pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-primary font-bold scale-105"
                  : "text-neutral-slate hover:text-neutral-dark font-medium"
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  weight={isActive ? "fill" : "regular"}
                  className={isActive ? "text-primary" : "text-neutral-slate"}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-secondary text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-body">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
