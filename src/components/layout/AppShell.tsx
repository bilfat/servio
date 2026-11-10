"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { Navbar } from "@/components/navigation/Navbar";
import { RoleSidebar } from "@/components/navigation/RoleSidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { Footer } from "@/components/layout/Footer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { activeRole, isPublicGuest } = useActiveRole();
  const { storeStatus } = useProviderOperations();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar drawer whenever route changes without triggering cascading effect render
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileSidebarOpen(false);
  }

  const isAuthPage = pathname?.startsWith("/auth/") || pathname === "/login" || pathname === "/register";

  const isOperationalRoute = Boolean(
    pathname?.startsWith("/provider/") ||
    pathname === "/provider" ||
    pathname?.startsWith("/business/provider") ||
    pathname?.startsWith("/worker") ||
    pathname?.startsWith("/ceo") ||
    pathname?.startsWith("/executive") ||
    pathname?.startsWith("/ops") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/staff") ||
    pathname?.startsWith("/merchant/") ||
    pathname === "/merchant" ||
    pathname?.startsWith("/supplier") ||
    pathname?.startsWith("/finance") ||
    pathname?.startsWith("/support")
  );

  const isProviderRoute = Boolean(
    pathname?.startsWith("/provider/") || pathname === "/provider" || pathname?.startsWith("/business/provider")
  );
  const isProviderClosed = isProviderRoute && storeStatus === "TEMPORARY_CLOSED";

  const isCustomer = !isOperationalRoute && !isPublicGuest && activeRole === "CUSTOMER" && !isAuthPage;
  const isWorker = (pathname?.startsWith("/worker") || (!isPublicGuest && activeRole === "WORKER_TECHNICIAN")) && !isAuthPage;
  // Dashboard sidebar only rendered on operational management routes
  const isDashboardRole = isOperationalRoute && !isAuthPage;

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const isChatRoute = Boolean(
    pathname === "/chat" ||
    pathname?.startsWith("/chat/") ||
    pathname === "/provider/chat" ||
    pathname?.startsWith("/provider/chat/") ||
    pathname === "/worker/chat" ||
    pathname?.startsWith("/worker/chat/") ||
    pathname === "/merchant/chat" ||
    pathname?.startsWith("/merchant/chat/")
  );

  // Transactional, catalog, storefront, and homepage pages that manage their own full-bleed canvas
  const isHomeRoute = pathname === "/";
  const isFullBleed =
    isHomeRoute ||
    pathname?.startsWith("/completion") ||
    pathname?.startsWith("/proof") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/payments") ||
    pathname?.startsWith("/returns/new") ||
    pathname?.startsWith("/products") ||
    pathname?.startsWith("/services") ||
    pathname?.startsWith("/merchants") ||
    pathname?.startsWith("/providers") ||
    pathname?.startsWith("/warranties") ||
    pathname?.startsWith("/orders/products/") ||
    pathname === "/cart" ||
    pathname?.startsWith("/cart") ||
    isChatRoute;

  const isAiDiscoveryPage = Boolean(
    pathname === "/smart-discovery" || pathname?.startsWith("/smart-discovery")
  );

  // Check if current route is a store detail page (provider/jasa or merchant/barang storefront)
  const isStoreDetailPage = Boolean(
    pathname?.startsWith("/providers/") ||
    pathname?.startsWith("/merchants/")
  );

  const showFooter =
    !isOperationalRoute &&
    !isChatRoute &&
    !isAiDiscoveryPage &&
    !isStoreDetailPage &&
    !isProviderClosed &&
    !isAuthPage;

  return (
    <div
      className={`bg-white flex flex-col selection:bg-sky selection:text-primary ${
        isChatRoute || isAiDiscoveryPage
          ? "h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "min-h-screen"
      } ${isProviderClosed ? "overflow-hidden" : ""}`}
    >
      {/* Top Navbar: Disembunyikan di halaman detail etalase toko & halaman diagnosa AI */}
      {!isStoreDetailPage && !isAiDiscoveryPage && (
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          isMobileSidebarOpen={mobileSidebarOpen}
          hideSidebarToggle={isProviderClosed || !isDashboardRole}
        />
      )}

      {/* Main Layout Body */}
      <div className={`flex-1 flex w-full ${isChatRoute || isAiDiscoveryPage ? "min-h-0 overflow-hidden" : ""}`}>
        {/* Sidebar for Dashboard roles: Disembunyikan saat Toko Tutup */}
        {isDashboardRole && !isProviderClosed && (
          <RoleSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            isOpenMobile={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Content Viewport */}
        <main
          className={`flex-1 flex flex-col min-w-0 transition-all ${
            isChatRoute || isAiDiscoveryPage
              ? "p-0 min-h-0 overflow-hidden"
              : isProviderClosed
              ? "p-0 overflow-hidden"
              : isFullBleed
              ? "p-0"
              : isCustomer
              ? "pb-20 md:pb-8"
              : isWorker
              ? "pb-20 md:pb-12"
              : "pb-12"
          }`}
        >
          {isFullBleed || isProviderClosed || isAiDiscoveryPage ? (
            <div className={`flex-1 w-full ${isHomeRoute ? "overflow-x-clip" : "overflow-hidden"} ${isChatRoute || isAiDiscoveryPage ? "h-full min-h-0 flex flex-col" : ""}`}>{children}</div>
          ) : isDashboardRole ? (
            <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          ) : (
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Footer Navigasi & Informasi Publik/Pelanggan */}
      {showFooter && <Footer />}

      {/* Mobile Bottom Navigation for Customer & Worker */}
      <BottomNav />
    </div>
  );
}
