"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useActiveRole } from "@/context/RoleContext";
import { UserRole } from "@/types/auth";
import {
  UserCircle,
  CaretUp,
  Check,
  Briefcase,
  Wrench,
  Headset,
  Bank,
  Storefront,
  Truck,
  ShieldCheck,
  Crown,
  Eye,
} from "@phosphor-icons/react";

type IconComponent = React.ComponentType<{
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
}>;

const ROLE_METADATA: Record<
  UserRole,
  { label: string; icon: IconComponent; color: string; desc: string }
> = {
  CUSTOMER: {
    label: "Customer / Pelanggan",
    icon: UserCircle,
    color: "text-primary",
    desc: "Portal pemesanan jasa & belanja sparepart",
  },
  SERVICE_PROVIDER: {
    label: "Service Provider (Mitra)",
    icon: Briefcase,
    color: "text-blue-600",
    desc: "Manajemen order, penawaran & penugasan teknisi",
  },
  WORKER_TECHNICIAN: {
    label: "Worker / Teknisi Lapangan",
    icon: Wrench,
    color: "text-amber-600",
    desc: "Workspace mobile-first untuk eksekusi & bukti servis",
  },
  CUSTOMER_SUPPORT: {
    label: "Customer Support (CS)",
    icon: Headset,
    color: "text-teal-600",
    desc: "Mediasi sengketa, tiket komplain & eskalasi",
  },
  FINANCE_PAYMENT_OPS: {
    label: "Finance & Payment Ops",
    icon: Bank,
    color: "text-emerald-600",
    desc: "Monitoring escrow, persetujuan payout & refund",
  },
  MERCHANT: {
    label: "Merchant (Toko Sparepart)",
    icon: Storefront,
    color: "text-purple-600",
    desc: "Katalog produk, manajemen stok & fulfillment",
  },
  SUPPLIER: {
    label: "Supplier (Distributor B2B)",
    icon: Truck,
    color: "text-indigo-600",
    desc: "Pengadaan suku cadang grosir untuk mitra",
  },
  ADMIN_OPERATIONS: {
    label: "Admin & Operations",
    icon: ShieldCheck,
    color: "text-rose-600",
    desc: "Pengawasan operasional, kategori jasa & audit global",
  },
  CEO_PRODUCT_OWNER: {
    label: "CEO / Product Owner",
    icon: Crown,
    color: "text-amber-700",
    desc: "Executive dashboard, tata kelola kategori jasa & policy",
  },
};

const DEFAULT_ROLE_HOME: Partial<Record<UserRole, string>> = {
  CUSTOMER: "/bookings",
  SERVICE_PROVIDER: "/provider/dashboard",
  WORKER_TECHNICIAN: "/worker/dashboard",
  CUSTOMER_SUPPORT: "/ops/support/dashboard",
  FINANCE_PAYMENT_OPS: "/ops/finance/dashboard",
  MERCHANT: "/ops/merchant/dashboard",
  SUPPLIER: "/ops/supplier/dashboard",
  ADMIN_OPERATIONS: "/ops/admin/dashboard",
  CEO_PRODUCT_OWNER: "/ceo/dashboard",
};

export function RoleSwitcher() {
  const router = useRouter();
  const { activeRole, switchRole, user, isPublicGuest, setIsPublicGuest } = useActiveRole();
  const [isOpen, setIsOpen] = useState(false);

  const CurrentIcon = isPublicGuest ? Eye : ROLE_METADATA[activeRole].icon;

  // Enforce role membership: only allow switching to roles the user actually has
  const allowedRoles = user.availableRoles || [activeRole];

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-80 sm:w-96 glass-panel rounded-2xl shadow-servio-lg border border-slate-200/80 p-3 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-neutral-dark font-display uppercase tracking-wider">
                  Active Role Switcher
                </p>
                <p className="text-[11px] text-neutral-slate">
                  Membership Validated ({allowedRoles.length} Peran Tersedia)
                </p>
              </div>
              <span className="text-[10px] font-semibold bg-sky text-primary px-2 py-0.5 rounded-full border border-sky-200">
                Dev Environment
              </span>
            </div>

            {/* Public Guest Toggle */}
            <div className="p-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsPublicGuest(!isPublicGuest);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  isPublicGuest
                    ? "bg-amber-500/15 text-amber-900 border border-amber-300/80"
                    : "bg-slate-100/70 text-neutral-slate hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye size={16} weight={isPublicGuest ? "fill" : "regular"} />
                  <span>Mode Pengunjung Publik (Unauthenticated)</span>
                </div>
                {isPublicGuest && <Check size={14} className="text-amber-700 font-bold" />}
              </button>
            </div>

            {/* Allowed Roles List */}
            <div className="max-h-64 overflow-y-auto py-2 space-y-1 pr-1">
              {allowedRoles.map((role) => {
                const meta = ROLE_METADATA[role];
                if (!meta) return null;
                const Icon = meta.icon;
                const isSelected = !isPublicGuest && activeRole === role;

                return (
                  <button
                    key={role}
                    type="button"
                    id={`role-option-${role}`}
                    onClick={() => {
                      setIsPublicGuest(false);
                      switchRole(role);
                      setIsOpen(false);
                      const targetHome = DEFAULT_ROLE_HOME[role];
                      if (targetHome) {
                        router.push(targetHome);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      isSelected
                        ? "bg-primary/10 border border-primary/20 text-neutral-dark"
                        : "hover:bg-slate-100/70 border border-transparent text-neutral-slate hover:text-neutral-dark"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? "bg-primary text-white" : "bg-slate-100 " + meta.color
                      }`}
                    >
                      <Icon size={18} weight={isSelected ? "fill" : "duotone"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold font-display truncate">
                          {meta.label}
                        </span>
                        {isSelected && (
                          <Check size={14} className="text-primary font-bold shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-slate truncate mt-0.5">
                        {meta.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 px-3 py-1 bg-slate-50/50 rounded-xl text-[11px] text-neutral-slate flex items-center justify-between">
              <span className="truncate">
                {isPublicGuest ? "Tamu Publik" : user.organizationName || user.name}
              </span>
              <span className="font-mono text-[10px] text-primary shrink-0 ml-2">
                {isPublicGuest ? "GUEST" : `ID: ${user.id.slice(0, 12)}`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Pill */}
      <button
        type="button"
        id="role-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full glass-card border border-primary/20 shadow-servio-md hover:shadow-servio-lg transition-all active:scale-95 group bg-white/95"
      >
        <div className={`w-2.5 h-2.5 rounded-full ${isPublicGuest ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
        <CurrentIcon size={18} className="text-primary" weight="duotone" />
        <div className="text-left">
          <p className="text-[10px] uppercase font-bold text-neutral-slate tracking-wider">
            {isPublicGuest ? "Sesi Tamu" : "Peran Aktif"}
          </p>
          <p className="text-xs font-semibold text-neutral-dark font-display max-w-[130px] truncate">
            {isPublicGuest ? "Publik" : ROLE_METADATA[activeRole].label.split(" (")[0]}
          </p>
        </div>
        <CaretUp
          size={14}
          className={`text-neutral-slate transition-transform duration-200 ml-1 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>
  );
}
