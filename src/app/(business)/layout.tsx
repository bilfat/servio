"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { PermissionDenied } from "@/components/feedback/PermissionDenied";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { UserSwitch } from "@phosphor-icons/react";

import { UserRole } from "@/types/auth";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeRole, switchRole, isLoadingAuth, user } = useActiveRole();
  const pathname = usePathname();

  const isWorkerRoute = pathname?.startsWith("/worker") || pathname?.startsWith("/business/worker");
  const isProviderRoute = pathname?.startsWith("/provider") || pathname?.startsWith("/business/provider");
  const isMerchantRoute = pathname?.startsWith("/merchant") || pathname?.startsWith("/business/merchant");
  const isSupplierRoute = pathname?.startsWith("/supplier") || pathname?.startsWith("/business/supplier");

  let targetRole: UserRole = "SERVICE_PROVIDER";
  let portalName = "Portal Mitra Provider";
  let roleLabel = "Mitra Provider";

  if (isWorkerRoute) {
    targetRole = "WORKER_TECHNICIAN";
    portalName = "Portal Teknisi Lapangan";
    roleLabel = "Teknisi Lapangan";
  } else if (isMerchantRoute) {
    targetRole = "MERCHANT";
    portalName = "Portal Merchant Toko Suku Cadang";
    roleLabel = "Merchant Toko";
  } else if (isSupplierRoute) {
    targetRole = "SUPPLIER";
    portalName = "Portal Supplier B2B Grosir";
    roleLabel = "Supplier Grosir";
  } else if (isProviderRoute) {
    targetRole = "SERVICE_PROVIDER";
    portalName = "Portal Mitra Provider";
    roleLabel = "Mitra Provider";
  }

  // Auto switch role if authenticated user has target role
  React.useEffect(() => {
    if (
      !isLoadingAuth &&
      (user.activeRole === targetRole || user.availableRoles?.includes(targetRole)) &&
      activeRole !== targetRole
    ) {
      switchRole(targetRole);
    }
  }, [isLoadingAuth, user, activeRole, targetRole, switchRole]);

  const isRoleMatching =
    user.activeRole === targetRole ||
    Boolean(user.availableRoles?.includes(targetRole));

  if (isLoadingAuth) {
    return (
      <AppShell>
        <ServioLoadingScreen
          message="Memuat Portal Bisnis..."
          subMessage="Menyiapkan hak akses mitra SERVIO"
          fullScreen={false}
        />
      </AppShell>
    );
  }

  if (!isRoleMatching) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-12">
          <PermissionDenied
            requiredRole={targetRole}
            message={`Halaman ${portalName} hanya dapat diakses oleh pengguna dengan peran ${targetRole}. Peran Anda saat ini adalah ${activeRole}.`}
            action={
              <Button
                variant="primary"
                onClick={() => switchRole(targetRole)}
                className="flex items-center gap-1.5"
              >
                <UserSwitch size={16} />
                <span>Beralih ke Peran {roleLabel}</span>
              </Button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
