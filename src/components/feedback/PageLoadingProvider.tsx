"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ServioLoadingScreen } from "./ServioLoadingScreen";

interface PageLoadingContextValue {
  showLoading: (
    durationMs?: number,
    customMessage?: string,
    customSubMessage?: string
  ) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const PageLoadingContext = createContext<PageLoadingContextValue>({
  showLoading: () => {},
  hideLoading: () => {},
  isLoading: false,
});

export function usePageLoading() {
  return useContext(PageLoadingContext);
}

/**
 * Top Progress Bar - High-tech, non-blocking 2.5px gradient line at top of viewport
 * Like YouTube, GitHub & Vercel: Provides immediate visual feedback without blocking the screen
 */
function TopProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[999999] pointer-events-none overflow-hidden">
      <motion.div
        initial={{ x: "-100%", width: "60%" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 0.65, ease: "easeInOut" }}
        className="h-full bg-gradient-to-r from-[#0F4C81] via-sky-400 to-[#F43F5E] shadow-xs"
      />
    </div>
  );
}

export function PageLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isExplicitLoading, setIsExplicitLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);
  const [overrideSubMessage, setOverrideSubMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPathname = useRef(pathname);

  // 1. Immediate visual feedback (0ms): Start top progress bar instantly when any internal link is clicked
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // Ignore hash links, external links, downloads, new tabs, mailto/tel
      if (
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin === window.location.origin) {
          const currentUrl = new URL(window.location.href);
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            setIsNavigating(true);
          }
        }
      } catch {
        // Safe fallback
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  // 2. Clear progress bar as soon as target route renders
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      const navTimer = setTimeout(() => {
        setIsNavigating(false);
      }, 100);

      return () => clearTimeout(navTimer);
    }
  }, [pathname]);

  // Safety fallback: if navigation takes longer than 6 seconds, hide progress bar
  useEffect(() => {
    if (!isNavigating) return;
    const safetyTimer = setTimeout(() => {
      setIsNavigating(false);
    }, 6000);
    return () => clearTimeout(safetyTimer);
  }, [isNavigating]);

  // Explicit loading trigger for heavy manual tasks (Auth login, payment submit, export)
  const showLoading = useCallback(
    (durationMs = 500, customMessage?: string, customSubMessage?: string) => {
      if (customMessage) setOverrideMessage(customMessage);
      if (customSubMessage) setOverrideSubMessage(customSubMessage);
      setIsExplicitLoading(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsExplicitLoading(false);
        setOverrideMessage(null);
        setOverrideSubMessage(null);
      }, durationMs);
    },
    []
  );

  const hideLoading = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsExplicitLoading(false);
    setOverrideMessage(null);
    setOverrideSubMessage(null);
  }, []);

  return (
    <PageLoadingContext.Provider
      value={{ showLoading, hideLoading, isLoading: isExplicitLoading }}
    >
      {/* 1. Sleek Non-Blocking Top Progress Bar on Page Navigation */}
      <TopProgressBar active={isNavigating} />

      {/* 2. Main Page Content (Instant, Unblocked) */}
      {children}

      {/* 3. Explicit Blocking Overlay ONLY when explicitly called */}
      <AnimatePresence>
        {isExplicitLoading && (
          <motion.div
            key="servio-explicit-loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] pointer-events-auto"
          >
            <ServioLoadingScreen
              message={overrideMessage || "Menyiapkan Layanan..."}
              subMessage={overrideSubMessage || "Memuat ekosistem platform SERVIO"}
              fullScreen
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageLoadingContext.Provider>
  );
}
