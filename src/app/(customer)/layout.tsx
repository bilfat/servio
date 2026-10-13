"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useActiveRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { Lock, SignIn, UserSwitch, House } from "@phosphor-icons/react";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPublicGuest, switchRole } = useActiveRole();
  const pathname = usePathname();
  const isPublicAllowed = pathname === "/support" || pathname?.startsWith("/support");

  if (isPublicGuest && !isPublicAllowed) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-light/60 p-8 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60 shadow-sm">
              <Lock size={28} weight="duotone" />
            </div>

            <h2 className="text-xl font-bold text-neutral-dark mb-2">
              Akses Halaman Dibatasi
            </h2>
            <p className="text-sm text-neutral mb-6 leading-relaxed">
              Anda sedang menjelajah sebagai <strong className="text-neutral-dark">Tamu Publik (Guest)</strong>. 
              Halaman ini memerlukan akun SERVIO aktif untuk mengelola pesanan, aset, garansi, dan data pelanggan.
            </p>

            <div className="flex flex-col gap-3">
              <Link href={`/auth/login?returnUrl=${encodeURIComponent(pathname || "/orders")}`}>
                <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                  <SignIn size={18} weight="bold" />
                  <span>Masuk ke Akun SERVIO</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => switchRole("CUSTOMER")}
              >
                <UserSwitch size={18} weight="bold" />
                <span>Simulasi Role Customer</span>
              </Button>

              <Link href="/">
                <Button variant="ghost" className="w-full flex items-center justify-center gap-2 text-neutral hover:text-neutral-dark">
                  <House size={18} />
                  <span>Kembali ke Beranda</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
