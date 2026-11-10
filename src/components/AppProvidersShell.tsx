"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { RoleProvider } from "@/context/RoleContext";
import { LocationProvider } from "@/context/LocationContext";
import { LocationPickerModal } from "@/components/features/location/LocationPickerModal";
import { PageLoadingProvider } from "@/components/feedback/PageLoadingProvider";
import { FlyToCartHost } from "@/components/feedback/FlyToCart";
import { SPayProvider } from "@/features/spay/spay.frontend-provider";
import { AfterSalesProvider } from "@/features/afterSales/useAfterSales";
import { ClientErrorTelemetryHost } from "@/components/dev/ClientErrorTelemetryHost";

export function AppProvidersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDevPortal = pathname === "/dev" || pathname?.startsWith("/dev/");

  // Isolated Developer Observability Portal must not bootstrap business/identity providers
  // so it stays 100% independent when microservices (e.g. :8001 / :8006) are degraded or down.
  if (isDevPortal) {
    return <>{children}</>;
  }

  return (
    <RoleProvider>
      <LocationProvider>
        <SPayProvider>
          <AfterSalesProvider>
            <PageLoadingProvider>{children}</PageLoadingProvider>
            <LocationPickerModal />
            <FlyToCartHost />
            <ClientErrorTelemetryHost />
          </AfterSalesProvider>
        </SPayProvider>
      </LocationProvider>
    </RoleProvider>
  );
}

