"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { taxonomyApi } from "@/lib/servioApi";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import {
  Wrench,
  Sparkle,
  ArrowRight,
  CaretRight,
  ShieldCheck,
  CircleNotch,
} from "@phosphor-icons/react";

interface SubcategoryItem {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  status: string;
  badge?: string;
  subcategories: SubcategoryItem[];
}

const CATEGORY_BADGES: Record<string, string> = {
  "Repair & Technical": "Paling Populer",
  "Cleaning": "Diskon Promo",
  "Maintenance": "Paket Rutin",
};

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    taxonomyApi
      .getTree({ master_code: "JASA" })
      .then((res) => {
        if (!isMounted) return;
        const branches = res.data || [];
        const jasaBranch = Array.isArray(branches)
          ? branches.find((b: any) => b.code === "JASA") || branches[0]
          : null;

        if (jasaBranch && Array.isArray(jasaBranch.categories)) {
          const mapped: CategoryItem[] = jasaBranch.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            icon_name: c.icon_name,
            status: c.status,
            badge: CATEGORY_BADGES[c.name],
            subcategories: Array.isArray(c.subcategories)
              ? c.subcategories.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  description: s.description,
                  status: s.status,
                }))
              : [],
          }));
          setCategories(mapped);
        }
      })
      .catch((err) => {
        console.warn("Public categories API error:", err);
        if (isMounted) setError("Gagal memuat kategori dari server.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 pb-16 font-body">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky text-primary text-xs font-bold">
          <ShieldCheck size={16} weight="fill" />
          <span>Kategori Jasa Servio Resmi (Terverifikasi)</span>
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

      {/* Live Categories Status Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {isLoading
            ? "Memuat Kategori Resmi..."
            : `${categories.length} Kategori Resmi Aktif dari Category Service`}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Sync Database
        </span>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass-card p-6 rounded-3xl border border-slate-200/80 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Live Categories Cards Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((cat, index) => {
            const Icon = CATEGORY_ICON_MAP[cat.icon_name || ""] || Wrench;
            return (
              <motion.div
                key={cat.id}
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
                        {cat.badge && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-secondary border border-rose-200">
                            {cat.badge}
                          </span>
                        )}
                        <h2 className="text-lg font-display font-bold text-neutral-dark mt-0.5">
                          {cat.name}
                        </h2>
                      </div>
                    </div>
                    <Link
                      href={`/categories/${cat.id}`}
                      className="p-2 rounded-xl text-neutral-slate hover:text-primary hover:bg-slate-100 transition-colors"
                      title={`Buka kategori ${cat.name}`}
                    >
                      <CaretRight size={20} weight="bold" />
                    </Link>
                  </div>

                  <p className="text-xs text-neutral-slate mt-3 leading-relaxed">
                    {cat.description ||
                      `Layanan terstandarisasi untuk ${cat.name.toLowerCase()} dengan teknisi mitra terverifikasi.`}
                  </p>

                  {/* Subcategories List */}
                  {cat.subcategories.length === 0 ? (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted block mb-1">
                        Subkategori
                      </span>
                      <p className="text-xs text-neutral-slate italic py-1">
                        Belum ada subkategori yang terdaftar untuk domain ini.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted">
                        Subkategori Tersedia ({cat.subcategories.length})
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/categories/${cat.id}?sub=${sub.id}`}
                            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-sky/30 transition-colors group"
                          >
                            <span className="text-xs font-medium text-neutral-dark group-hover:text-primary">
                              {sub.name}
                            </span>
                            <span className="text-[11px] text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Lihat Layanan <CaretRight size={12} weight="bold" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Link
                    href={`/categories/${cat.id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-neutral-dark hover:bg-primary hover:text-white font-display font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Buka Domain {cat.name}</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200 space-y-2">
          <p className="font-display font-bold text-neutral-dark">Belum ada kategori layanan aktif</p>
          <p className="text-xs text-neutral-slate">Basis data kategori saat ini belum memiliki kategori aktif.</p>
        </div>
      )}
    </div>
  );
}
