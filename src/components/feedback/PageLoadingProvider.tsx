"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

// 500ms: Durasi responsif dan cepat agar halaman segera interaktif tanpa jeda berlebih
const DEFAULT_REFRESH_DURATION = 500;
const DEFAULT_ROUTE_CHANGE_DURATION = 350;

export function PageLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [overrideMessage, setOverrideMessage] = useState<string | null>(null);
  const [overrideSubMessage, setOverrideSubMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Pemetaan pesan kontekstual berdasarkan rute halaman
  const contextualInfo = useMemo(() => {
    if (!pathname) {
      return {
        message: "Menyiapkan Layanan...",
        subMessage: "Memuat ekosistem platform SERVIO",
      };
    }
    if (pathname.startsWith("/ceo")) {
      return {
        message: "Menyiapkan Dashboard Eksekutif...",
        subMessage: "Mengompilasi analitik makro dan tata kelola platform",
      };
    }
    if (pathname.startsWith("/merchant")) {
      return {
        message: "Menyiapkan Workspace Bisnis...",
        subMessage: "Memuat inventaris gudang dan operasional toko mitra",
      };
    }
    if (pathname.startsWith("/supplier")) {
      return {
        message: "Menyiapkan Workspace Supplier...",
        subMessage: "Memuat katalog suku cadang dan rantai pasok B2B",
      };
    }
    if (pathname.startsWith("/ops") || pathname.startsWith("/admin")) {
      return {
        message: "Menyiapkan Pusat Kendali Operasi...",
        subMessage: "Sinkronisasi audit trail dan antrean verifikasi platform",
      };
    }
    if (pathname.startsWith("/provider") || pathname.startsWith("/technician")) {
      return {
        message: "Menyiapkan Workspace Teknisi...",
        subMessage: "Sinkronisasi pesanan servis dan pembaruan jadwal",
      };
    }
    if (pathname.startsWith("/dispatcher")) {
      return {
        message: "Menyiapkan Konsol Dispatcher...",
        subMessage: "Sinkronisasi penugasan teknisi dan status tiket darurat",
      };
    }
    if (pathname.startsWith("/finance")) {
      return {
        message: "Menyiapkan Portal Finansial...",
        subMessage: "Rekonsiliasi dana escrow dan antrean pengembalian",
      };
    }
    if (
      pathname.startsWith("/customer") ||
      pathname.startsWith("/pelanggan") ||
      pathname.startsWith("/services") ||
      pathname.startsWith("/catalog") ||
      pathname.startsWith("/booking")
    ) {
      return {
        message: "Menyiapkan Layanan...",
        subMessage: "Lebih dari servis, menghadirkan hari yang lebih baik",
      };
    }
    return {
      message: "Menyiapkan Layanan...",
      subMessage: "Memuat ekosistem platform SERVIO",
    };
  }, [pathname]);

  // Efek 1: Saat halaman pertama kali di-refresh atau dibuka (Initial Page Load / Refresh)
  // Menjaga tampilan loading tetap terlihat selama minimal 1.4 detik
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setIsLoading(false);
      isInitialMount.current = false;
    }, DEFAULT_REFRESH_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Efek 2: Saat navigasi rute berubah (Route Transition)
  useEffect(() => {
    if (isInitialMount.current) return;

    setIsLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setIsLoading(false);
      setOverrideMessage(null);
      setOverrideSubMessage(null);
    }, DEFAULT_ROUTE_CHANGE_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  // Efek 3: Intersep klik tautan internal agar loading langsung muncul tanpa jeda
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.getAttribute("target") === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }
      if (href.startsWith("/") && href !== window.location.pathname) {
        setIsLoading(true);
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, []);

  // Fungsi helper yang dapat dipanggil komponen mana pun
  const showLoading = useCallback(
    (durationMs = 500, customMessage?: string, customSubMessage?: string) => {
      if (customMessage) setOverrideMessage(customMessage);
      if (customSubMessage) setOverrideSubMessage(customSubMessage);
      setIsLoading(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsLoading(false);
        setOverrideMessage(null);
        setOverrideSubMessage(null);
      }, durationMs);
    },
    []
  );

  const hideLoading = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLoading(false);
    setOverrideMessage(null);
    setOverrideSubMessage(null);
  }, []);

  const activeMessage = overrideMessage || contextualInfo.message;
  const activeSubMessage = overrideSubMessage || contextualInfo.subMessage;

  return (
    <PageLoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="servio-global-loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] pointer-events-auto"
          >
            <ServioLoadingScreen
              message={activeMessage}
              subMessage={activeSubMessage}
              fullScreen
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageLoadingContext.Provider>
  );
}
