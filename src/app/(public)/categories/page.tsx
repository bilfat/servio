"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MOCK_TAXONOMY_DOMAINS } from "@/mocks/taxonomy";
import {
  Wrench,
  HouseLine,
  Sparkle,
  Broom,
  Tree,
  Car,
  ArrowRight,
  CaretRight,
  Users,
  ShieldCheck,
} from "@phosphor-icons/react";

import type { Icon } from "@phosphor-icons/react";

const DOMAIN_ICONS: Record<string, Icon> = {
  repair: Wrench,
  home: HouseLine,
  cleaning: Broom,
  maintenance: Wrench,
  environment: Tree,
  automotive: Car,
};

export default function CategoriesPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky text-primary text-xs font-bold">
          <ShieldCheck size={16} weight="fill" />
          <span>Taksonomi Layanan Servio Resmi</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-neutral-dark">
          Jelajahi Semua Layanan Di Servio
        </h1>
        <p className="text-sm text-neutral-slate">
          Pilih kategori yang sesuai dengan kebutuhan perawatan hunian, kendaraan, atau perbaikan perangkat Anda.
        </p>
      </div>

      {/* AI Assistance CTA Banner */}
      <div className="glass-card p-5 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky/40 via-sky/10 to-ivory flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-secondary text-white shrink-0">
            <Sparkle size={24} weight="fill" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-neutral-dark">
              Bingung Menentukan Kategori yang Tepat?
            </h3>
            <p className="text-xs text-neutral-slate">
              Biarkan AI Servio menganalisis keluhan Anda secara otomatis dan mengarahkan ke teknisi yang tepat.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/smart-discovery")}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center gap-2"
        >
          <span>Bantuan Diagnosa AI</span>
          <ArrowRight size={14} weight="bold" />
        </button>
      </div>

      {/* 6 Domains Detailed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_TAXONOMY_DOMAINS.map((domain, index) => {
          const Icon = DOMAIN_ICONS[domain.id] || Wrench;
          return (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="glass-card p-6 rounded-3xl border border-slate-200/80 hover:border-primary/30 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3.5 rounded-2xl bg-sky text-primary border border-sky-200">
                      <Icon size={28} weight="duotone" />
                    </div>
                    <div>
                      {domain.badge && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-secondary border border-rose-200">
                          {domain.badge}
                        </span>
                      )}
                      <h2 className="text-lg font-display font-bold text-neutral-dark mt-0.5">
                        {domain.name}
                      </h2>
                    </div>
                  </div>
                  <Link
                    href={`/categories/${domain.id}`}
                    className="p-2 rounded-xl text-neutral-slate hover:text-primary hover:bg-slate-100 transition-colors"
                  >
                    <CaretRight size={20} weight="bold" />
                  </Link>
                </div>

                <p className="text-xs text-neutral-slate mt-3 leading-relaxed">
                  {domain.description}
                </p>

                {/* Subcategories List */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
                    Subkategori Tersedia ({domain.subcategories.length})
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {domain.subcategories.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/categories/${domain.id}?sub=${sub.id}`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky/30 transition-colors group"
                      >
                        <span className="text-xs font-medium text-neutral-dark group-hover:text-primary">
                          {sub.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-muted">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {sub.activeProvidersCount} Mitra
                          </span>
                          <CaretRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={`/categories/${domain.id}`}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-neutral-dark hover:bg-primary hover:text-white font-display font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Buka Domain {domain.name}</span>
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
