"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { PermissionDenied } from "@/components/feedback/PermissionDenied";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { UserSwitch } from "@phosphor-icons/react";

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeRole, switchRole, isLoadingAuth, user } = useActiveRole();
  const pathname = usePathname();

  const isSupportRoute = pathname?.includes("/support");
  const isFinanceRoute = pathname?.includes("/finance");
  const isAdminRoute = pathname?.includes("/admin");

  const targetRole = isFinanceRoute
    ? "FINANCE_PAYMENT_OPS"
    : isAdminRoute
    ? "ADMIN_OPERATIONS"
    : "CUSTOMER_SUPPORT";

  const portalName = isFinanceRoute
    ? "Portal Finance & Payments"
    : isAdminRoute
    ? "Portal Administrator Operasional"
    : "Portal Customer Support & Mediasi";

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

  const hasTargetRole =
    user.activeRole === targetRole ||
    Boolean(user.availableRoles?.includes(targetRole));

  const isRoleMatching =
    hasTargetRole ||
    (!isSupportRoute && !isFinanceRoute && !isAdminRoute);

  if (isLoadingAuth) {
    return (
      <AppShell>
        <ServioLoadingScreen
          message="Memuat Portal Operasional..."
          subMessage="Menyiapkan hak akses tim operasional SERVIO"
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
                <span>
                  Beralih ke Peran {targetRole === "FINANCE_PAYMENT_OPS" ? "Finance Ops" : targetRole === "ADMIN_OPERATIONS" ? "Admin Ops" : "CS Mediator"}
                </span>
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
