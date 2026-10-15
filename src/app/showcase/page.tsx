"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useActiveRole } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { PermissionGate } from "@/components/feedback/PermissionGate";
import { GlobalStatesShowcase } from "@/components/features/states/GlobalStatesShowcase";
import { DesignSystemShowcase } from "@/components/features/design-system/DesignSystemShowcase";
import { MockEngineShowcase } from "@/components/features/mocks/MockEngineShowcase";
import { SIX_SERVICE_DOMAINS } from "@/config/navigation";

import {
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  CalendarCheck,
  LockKey,
} from "@phosphor-icons/react";

export default function ShowcasePage() {
  const { activeRole, user, isPublicGuest } = useActiveRole();
  const [activeTab, setActiveTab] = useState<"overview" | "states" | "design-system" | "mock-engine">("mock-engine");

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title={
          isPublicGuest
            ? "Platform Jasa Terpercaya & Suku Cadang Resmi"
            : activeRole === "CUSTOMER"
            ? "Pusat Solusi Perbaikan & Pemeliharaan"
            : `Workspace Operasional — ${activeRole.replace(/_/g, " ")}`
        }
        description={
          isPublicGuest
            ? "Temukan ribuan teknisi berlisensi, proteksi transaksi escrow anti-penipuan, dan garansi kerja terstandarisasi."
            : activeRole === "CUSTOMER"
            ? "Pesan jasa teknisi berpengalaman, beli spare part bergaransi, dan pantau perawatan aset rumah Anda dalam satu platform terintegrasi."
            : `Anda sedang aktif sebagai ${user.name} (${user.email}). Tampilan layout, menu navigasi, dan hak wewenang telah otomatis disesuaikan.`
        }
        breadcrumbs={[
          { label: "Servio", href: "/" },
          { label: "Developer Showcase", href: "/showcase" },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={14} weight="fill" />
            Milestone 1, 2 & 3 Active
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("mock-engine")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === "mock-engine"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              Mock Engine & Adapters (M3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              Ringkasan Peran
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("states")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "states"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              11 Standar State
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("design-system")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "design-system"
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              Atomic Design System (M2)
            </button>
          </div>
        }
      />

      {activeTab === "overview" ? (
        <div className="space-y-8">
          {/* Active Role Notification Banner */}
          <div className="glass-panel p-4 rounded-2xl border border-sky-200/80 bg-sky/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-white shrink-0">
                <ShieldCheck size={24} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-dark font-display">
                  Multi-Role Context Aktif: {isPublicGuest ? "GUEST_PUBLIC (Mode Pengunjung)" : activeRole}
                </p>
                <p className="text-[11px] text-neutral-slate">
                  Gunakan tombol melayang <strong>Role Switcher</strong> di kanan bawah untuk berpindah peran secara instan (Customer, Provider, Worker, CS, Finance, Merchant, Supplier, Admin, CEO, atau Public Guest).
                </p>
              </div>
            </div>

            {/* PermissionGate Demo */}
            <div className="shrink-0 flex items-center gap-2">
              <PermissionGate
                action="MANAGE"
                resource="TAXONOMY"
                disabledMessage="Hanya Admin dan CEO yang berhak mengelola kategori jasa"
              >
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                >
                  Kelola Kategori Jasa
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* 6 Fixed Service Domains */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-neutral-dark">
              Layanan Servio (Kategori Jasa Resmi)
              </h2>
              <span className="text-xs text-neutral-slate">PRD Feature #1 — Discovery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIX_SERVICE_DOMAINS.map((domain, index) => {
                const Icon = domain.icon;
                return (
                  <motion.div
                    key={domain.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="glass-card glass-card-hover p-5 rounded-2xl flex items-start gap-4 cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-sky text-primary border border-sky-200 shrink-0">
                      <Icon size={24} weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-neutral-dark text-sm truncate">
                        {domain.label}
                      </h3>
                      <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                        Layanan profesional terverifikasi dengan garansi kepuasan & perlindungan escrow.
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary mt-2">
                        Telusuri Jasa <ArrowRight size={12} weight="bold" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Architecture & Security Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="glass-card p-6 rounded-2xl space-y-3">
              <h3 className="font-display font-bold text-sm text-neutral-dark flex items-center gap-2">
                <CalendarCheck size={18} className="text-primary" weight="duotone" />
                Dual Navigation Matrix (P0.3 & P0.4)
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Shell aplikasi secara dinamis merender Public Landing Navbar (lengkap dengan 6 Domain Jasa, Bantuan & Auth) saat belum login, dan Customer Mega-Menu + BottomNav saat masuk sebagai Pelanggan.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-3">
              <h3 className="font-display font-bold text-sm text-neutral-dark flex items-center gap-2">
                <LockKey size={18} className="text-secondary" weight="duotone" />
                Zero-Bypass Authorization Matrix (P0.1 & P0.2)
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Setiap aksi divalidasi ketat terhadap model data kanonikal. CEO dibatasi pada macro governance analytics, sedangkan Admin dibatasi dari eksekusi teknis lapangan.
              </p>
              <div className="flex items-center gap-2 text-xs text-neutral-slate">
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">Role: {activeRole}</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded">Org: {user.organizationId || "Personal"}</span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "mock-engine" ? (
        <MockEngineShowcase />
      ) : activeTab === "states" ? (
        <GlobalStatesShowcase />
      ) : (
        <DesignSystemShowcase />
      )}
    </AppShell>
  );
}
