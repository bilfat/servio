"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TerminalWindow,
  Heartbeat,
  Pulse,
  Bug,
  GitBranch,
  ListChecks,
  Monitor,
  ArrowsClockwise,
  Database,
  MagnifyingGlass,
  SignOut,
  ShieldCheck,
  List,
  X,
  Sparkle,
  CaretDoubleLeft,
  CaretDoubleRight,
  SidebarSimple,
} from "@phosphor-icons/react";
import {
  DevAutoRefreshProvider,
  RefreshIntervalMode,
  useDevAutoRefresh,
} from "./DevAutoRefreshContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeKey?: "errors" | "clientErrors" | "sync";
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Ringkasan",
    items: [
      {
        href: "/dev/dashboard",
        label: "Overview & Peringatan",
        icon: <Pulse size={17} />,
      },
    ],
  },
  {
    title: "Infrastruktur & Log",
    items: [
      {
        href: "/dev/health",
        label: "Kesehatan Microservice",
        icon: <Heartbeat size={17} />,
      },
      {
        href: "/dev/logs",
        label: "Log Error Backend",
        icon: <Bug size={17} />,
        badgeKey: "errors",
      },
    ],
  },
  {
    title: "Tracking Audit",
    items: [
      {
        href: "/dev/tracer",
        label: "Pelacak End-to-End",
        icon: <GitBranch size={17} />,
      },
      {
        href: "/dev/audits",
        label: "Audit Lintas Fitur",
        icon: <ListChecks size={17} />,
      },
      {
        href: "/dev/client-errors",
        label: "Monitor Error Frontend",
        icon: <Monitor size={17} />,
        badgeKey: "clientErrors",
      },
    ],
  },
  {
    title: "Sinkronisasi",
    items: [
      {
        href: "/dev/sync",
        label: "Outbox, Inbox & Queue",
        icon: <Database size={17} />,
        badgeKey: "sync",
      },
    ],
  },
  {
    title: "AI & Agent Studio",
    items: [
      {
        href: "/dev/ai-agent",
        label: "AI Diagnosa & Gemini",
        icon: <Sparkle size={17} />,
      },
    ],
  },
];

const COLLAPSED_STORAGE_KEY = "servio_dev_sidebar_collapsed_v1";

function DevShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    intervalMode,
    setIntervalMode,
    triggerRefresh,
    topSummary,
    topServices,
    isRefreshingSummary,
  } = useDevAutoRefresh();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [quickTrace, setQuickTrace] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // non-fatal
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
        } catch {
          // non-fatal
        }
      }
      return next;
    });
  };

  const handleQuickTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = quickTrace.trim();
    if (!val) return;
    router.push(`/dev/tracer?q=${encodeURIComponent(val)}`);
    setQuickTrace("");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/dev/auth/logout", { method: "POST" });
    } finally {
      router.push("/dev/login");
      router.refresh();
    }
  };

  const getBadgeCount = (key?: "errors" | "clientErrors" | "sync"): number => {
    if (key === "errors") return topSummary.totalLogErrors;
    if (key === "clientErrors") return topSummary.totalClientErrors;
    if (key === "sync") return topSummary.outboxIssuesCount;
    return 0;
  };

  const renderSidebar = (collapsed: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary via-primary to-primary-dark border-r border-primary-dark text-white select-none shadow-servio-md overflow-hidden">
      {/* 1. Brand Header */}
      {collapsed ? (
        <div className="py-3.5 px-2 border-b border-white/15 flex flex-col items-center gap-2.5 shrink-0">
          <Link
            href="/dev/dashboard"
            title="SERVIO DEV - Observability Cockpit"
            className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-sky shadow-xs hover:bg-white/25 transition-colors"
          >
            <TerminalWindow size={22} weight="bold" />
          </Link>
          <button
            type="button"
            onClick={toggleCollapse}
            title="Perluas Sidebar"
            aria-label="Perluas Sidebar"
            className="p-1.5 rounded-lg text-sky/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <CaretDoubleRight size={16} weight="bold" />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3.5 border-b border-white/15 flex items-center justify-between shrink-0">
          <Link href="/dev/dashboard" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-sky shadow-xs shrink-0">
              <TerminalWindow size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold font-display tracking-wider text-white flex items-center gap-1.5">
                <span>SERVIO</span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-sky/20 text-sky border border-sky/35">
                  DEV
                </span>
              </div>
              <div className="text-[11px] text-sky/80 truncate">Observability Cockpit</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {!isMobile && (
              <button
                type="button"
                onClick={toggleCollapse}
                title="Kecilkan Sidebar (Hanya Icon)"
                aria-label="Kecilkan Sidebar"
                className="hidden lg:flex p-1.5 rounded-lg text-sky/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <CaretDoubleLeft size={16} weight="bold" />
              </button>
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Quick Trace Search */}
      {collapsed ? (
        <div className="px-2 pt-3 pb-1 flex justify-center shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            title="Buka Pencarian Trace Order / req-ID"
            className="w-10 h-10 rounded-xl bg-primary-dark/65 hover:bg-primary-dark border border-white/20 flex items-center justify-center text-sky hover:text-white transition-colors cursor-pointer shadow-xs"
          >
            <MagnifyingGlass size={17} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleQuickTraceSubmit} className="px-3.5 pt-3.5 pb-1 shrink-0">
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sky/75"
            />
            <input
              type="text"
              value={quickTrace}
              onChange={(e) => setQuickTrace(e.target.value)}
              placeholder="Trace Order / req-ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-primary-dark/65 border border-white/20 text-white placeholder:text-sky/60 focus:outline-none focus:border-sky focus:bg-primary-dark/90 transition-colors"
            />
          </div>
        </form>
      )}

      {/* 3. Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2 lg:px-2.5 py-3 space-y-4 custom-scrollbar">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={group.title}>
            {!collapsed ? (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky/70">
                {group.title}
              </div>
            ) : gIdx > 0 ? (
              <div className="my-2 border-t border-white/10 mx-2" />
            ) : null}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge = getBadgeCount(item.badgeKey);

                if (collapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={`${item.label}${badge > 0 ? ` (${badge} issue)` : ""}`}
                      className={`relative flex items-center justify-center w-11 h-10 mx-auto rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-primary font-semibold shadow-servio-sm"
                          : "text-white/85 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span className={isActive ? "text-primary" : "text-sky/85"}>
                        {item.icon}
                      </span>
                      {badge > 0 && (
                        <span
                          className={`absolute -top-1 -right-1 px-1 min-w-[17px] h-4 text-[9px] font-mono font-bold flex items-center justify-center rounded-full border ${
                            item.badgeKey === "errors" || item.badgeKey === "sync"
                              ? "bg-secondary text-white border-rose-300"
                              : "bg-amber-400 text-neutral-dark border-amber-200"
                          } shadow-xs animate-pulse`}
                        >
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-primary font-semibold shadow-servio-sm"
                        : "text-white/85 font-medium hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? "text-primary" : "text-sky/85"}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                          isActive
                            ? item.badgeKey === "errors" || item.badgeKey === "sync"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                            : item.badgeKey === "errors" || item.badgeKey === "sync"
                              ? "bg-secondary text-white border-rose-400/50"
                              : "bg-amber-400 text-neutral-dark border-amber-300"
                        }`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 4. Developer Isolated Account Footer */}
      {collapsed ? (
        <div className="p-2.5 border-t border-white/15 bg-primary-dark/60 flex flex-col items-center gap-2 shrink-0">
          <div
            className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-300 shadow-xs cursor-default"
            title="developer@servio.com · SYSTEM_DEVELOPER (ISOLATED)"
          >
            <ShieldCheck size={19} weight="fill" />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Keluar Portal Dev"
            aria-label="Keluar Portal Dev"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-secondary/90 text-white border border-white/20 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
          >
            <SignOut size={16} />
          </button>
        </div>
      ) : (
        <div className="p-3.5 border-t border-white/15 bg-primary-dark/60 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck size={17} weight="fill" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                developer@servio.com
              </div>
              <div className="text-[10px] font-mono text-emerald-300/95">
                SYSTEM_DEVELOPER · ISOLATED
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-secondary/90 hover:border-secondary text-white border border-white/20 transition-colors cursor-pointer disabled:opacity-60"
          >
            <SignOut size={15} />
            <span>{loggingOut ? "Keluar..." : "Keluar Portal Dev"}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-neutral-subtle text-neutral-dark flex">
      {/* Desktop Frozen Sidebar (Independent, pinned on the left) */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full select-none transition-all duration-200 z-30 overflow-hidden ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderSidebar(isCollapsed, false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-neutral-dark/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-68 max-w-[85vw] h-full">
            {renderSidebar(false, true)}
          </div>
        </div>
      )}

      {/* Main Content Area (Independent scroll viewport) */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Top Engineering Health Bar (Sticky at top of content area) */}
        <header className="shrink-0 h-14 bg-white/95 backdrop-blur-md border-b border-neutral-border px-4 lg:px-6 flex items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-dark hover:bg-neutral-soft cursor-pointer"
            >
              <List size={20} />
            </button>

            {/* Desktop Quick Toggle Sidebar Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              title={isCollapsed ? "Perluas Sidebar" : "Kecilkan Sidebar (Hanya Icon)"}
              aria-label="Toggle Sidebar"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border shadow-2xs transition-colors cursor-pointer"
            >
              <SidebarSimple size={16} weight={isCollapsed ? "fill" : "regular"} className="text-primary" />
              <span className="text-[11px] font-medium hidden xl:inline">
                {isCollapsed ? "Buka Sidebar" : "Kecilkan"}
              </span>
            </button>

            {/* Live 8-Port Strip */}
            <div className="hidden xl:flex items-center gap-1.5">
              {topServices.length === 0 ? (
                <span className="text-[11px] font-mono text-neutral-slate">
                  Memeriksa 8 microservice...
                </span>
              ) : (
                topServices.map((svc) => {
                  const dotClass =
                    svc.status === "UP"
                      ? "bg-emerald-500"
                      : svc.status === "DEGRADED"
                        ? "bg-amber-500"
                        : "bg-rose-500";

                  return (
                    <Link
                      key={svc.id}
                      href="/dev/health"
                      title={`${svc.shortName} (:${svc.port}) — ${svc.status} (${svc.latencyMs}ms)`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-subtle border border-neutral-border hover:border-primary/40 hover:bg-sky-light text-[11px] font-mono font-medium text-neutral-dark transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                      <span>{svc.port}</span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="xl:hidden flex items-center gap-2 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  topSummary.downCount > 0
                    ? "bg-rose-500"
                    : topSummary.degradedCount > 0
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
              />
              <span className="text-neutral-dark font-semibold">
                {topSummary.upCount}/{topSummary.totalServices} UP
              </span>
            </div>
          </div>

          {/* Right Controls: Auto-Refresh + Manual Sync */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center bg-neutral-soft border border-neutral-border rounded-lg p-0.5 text-[11px] font-mono">
              {(["5s", "10s", "paused"] as RefreshIntervalMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setIntervalMode(mode)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    intervalMode === mode
                      ? "bg-white text-primary font-bold shadow-2xs"
                      : "text-neutral-slate hover:text-neutral-dark"
                  }`}
                >
                  {mode === "paused" ? "Pause" : mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={triggerRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-soft text-neutral-dark border border-neutral-border shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowsClockwise
                size={14}
                className={isRefreshingSummary ? "animate-spin text-primary" : "text-primary"}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Dedicated Scrollable Viewport: Only the right side scrolls! */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          <div className="max-w-[1600px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function DevShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/dev/login") {
    return <>{children}</>;
  }

  return (
    <DevAutoRefreshProvider>
      <DevShellInner>{children}</DevShellInner>
    </DevAutoRefreshProvider>
  );
}
