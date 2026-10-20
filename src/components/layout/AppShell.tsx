"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useActiveRole } from "@/context/RoleContext";
import { useProviderOperations } from "@/features/provider/useProviderOperations";
import { Navbar } from "@/components/navigation/Navbar";
import { RoleSidebar } from "@/components/navigation/RoleSidebar";
import { BottomNav } from "@/components/navigation/BottomNav";

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
    pathname?.startsWith("/provider") ||
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
    pathname?.startsWith("/provider") || pathname?.startsWith("/business/provider")
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

  // Transactional, catalog, and storefront pages that have their own sticky top headers and manage their own bleed
  const isFullBleed =
    pathname?.startsWith("/completion") ||
    pathname?.startsWith("/proof") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/returns/new") ||
    pathname?.startsWith("/products") ||
    pathname?.startsWith("/merchants") ||
    (pathname?.startsWith("/warranties/") && pathname !== "/warranties");

  return (
    <div className={`min-h-screen bg-white flex flex-col selection:bg-sky selection:text-primary ${isProviderClosed ? "overflow-hidden" : ""}`}>
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={handleToggleSidebar}
        isMobileSidebarOpen={mobileSidebarOpen}
        hideSidebarToggle={isProviderClosed || !isDashboardRole}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex w-full">
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
            isProviderClosed
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
          {isFullBleed || isProviderClosed ? (
            <div className="flex-1 w-full overflow-hidden">{children}</div>
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

      {/* Mobile Bottom Navigation for Customer & Worker */}
      <BottomNav />
    </div>
  );
}
