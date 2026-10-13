"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { PermissionDenied } from "@/components/feedback/PermissionDenied";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { Crown } from "@phosphor-icons/react";

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { activeRole, switchRole, isLoadingAuth, user } = useActiveRole();

  // Auto switch role if authenticated user is CEO
  React.useEffect(() => {
    if (
      !isLoadingAuth &&
      (user.activeRole === "CEO_PRODUCT_OWNER" || user.availableRoles?.includes("CEO_PRODUCT_OWNER")) &&
      activeRole !== "CEO_PRODUCT_OWNER"
    ) {
      switchRole("CEO_PRODUCT_OWNER");
    }
  }, [isLoadingAuth, user, activeRole, switchRole]);

  const isCeo =
    user.activeRole === "CEO_PRODUCT_OWNER" ||
    Boolean(user.availableRoles?.includes("CEO_PRODUCT_OWNER"));

  if (isLoadingAuth) {
    return (
      <AppShell>
        <ServioLoadingScreen
          message="Memuat Tata Kelola Eksekutif..."
          subMessage="Menyiapkan hak akses pimpinan SERVIO"
          fullScreen={false}
        />
      </AppShell>
    );
  }

  if (!isCeo) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-12">
          <PermissionDenied
            requiredRole="CEO_PRODUCT_OWNER"
            message={`Portal Eksekutif & Tata Kelola Strategis hanya dapat diakses oleh pimpinan eksekutif dengan peran CEO / Product Owner. Peran Anda saat ini adalah ${activeRole}.`}
            action={
              <Button
                variant="primary"
                onClick={() => switchRole("CEO_PRODUCT_OWNER")}
                className="flex items-center gap-1.5"
              >
                <Crown size={16} weight="bold" />
                <span>Beralih ke Peran CEO / Product Owner</span>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
