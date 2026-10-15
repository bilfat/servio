"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { PermissionDenied } from "@/components/feedback/PermissionDenied";
import { ServioLoadingScreen } from "@/components/feedback/ServioLoadingScreen";
import { UserSwitch, ShieldWarning, ArrowRight } from "@phosphor-icons/react";

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeRole, switchRole, isLoadingAuth, user } = useActiveRole();
  const pathname = usePathname();
  const router = useRouter();

  const isSupportRoute = pathname?.includes("/support");
  const isFinanceRoute = pathname?.includes("/finance");
  const isAdminRoute = pathname?.includes("/admin");
  const isOnboardingRoute = pathname?.includes("/staff/onboarding");

  const isStaffRole = ["ADMIN_OPERATIONS", "FINANCE_PAYMENT_OPS", "CUSTOMER_SUPPORT"].includes(
    activeRole || user.activeRole
  );

  // CR-03 Section C & G: Ready only when active, password created, onboarding complete & approved by CEO
  const isStaffOperationalReady =
    user.status === "ACTIVE" &&
    (user.readiness === "READY" ||
      user.isOperationalReady ||
      user.staffOnboardingStatus === "COMPLETED" ||
      user.staffOnboardingStatus === "OPERATIONAL_READY");

  // Auto redirect internal staff to onboarding if not ready and trying to access operational routes
  React.useEffect(() => {
    if (!isLoadingAuth && isStaffRole && !isOnboardingRoute && !isStaffOperationalReady) {
      router.push("/ops/staff/onboarding");
    }
  }, [isLoadingAuth, isStaffRole, isOnboardingRoute, isStaffOperationalReady, router]);

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
    (!isSupportRoute && !isFinanceRoute && !isAdminRoute) ||
    isOnboardingRoute;

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

  // CR-03: Block operational dashboard if onboarding incomplete or not operational ready
  if (isStaffRole && !isOnboardingRoute && !isStaffOperationalReady) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-12 px-4">
          <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-servio-md text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldWarning size={36} weight="fill" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                STATUS: NOT OPERATIONAL READY
              </span>
              <h2 className="text-xl font-bold font-display text-neutral-dark mt-2">
                Akses Dashboard Operasional Dibatasi
              </h2>
              <p className="text-xs text-neutral-slate mt-1 max-w-md mx-auto leading-relaxed">
                Berdasarkan tata kelola SERVIO (CR-03), akun staf operasional wajib menyelesaikan empat tahap onboarding (Profil, Pengecekan Berkas, NDA, dan Konfirmasi Hak Akses) serta memperoleh persetujuan CEO sebelum dashboard operasional dibuka.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => router.push("/ops/staff/onboarding")}
                className="inline-flex items-center gap-2"
              >
                <span>Buka Formulir Onboarding Staf</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
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
