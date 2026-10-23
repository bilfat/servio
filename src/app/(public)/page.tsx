"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useActiveRole } from "@/context/RoleContext";
import { useServices } from "@/features/discovery/useServices";
import { useMaintenancePlans } from "@/features/maintenance/useMaintenancePlans";
import { useServiceOrder } from "@/features/orders/useServiceOrder";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { CATEGORY_ICON_MAP } from "@/config/navigation";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { StatusBadge } from "@/components/data-display/StatusBadge";
import { ServiceOffering } from "@/types/domain";
import { taxonomyApi } from "@/lib/servioApi";
import {
  MagnifyingGlass,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Wrench,
  Clock,
  MapPin,
  CheckCircle,
  CaretRight,
  BellRinging,
  Star,
  Lightning,
  NavigationArrow,
  CircleNotch,
} from "@phosphor-icons/react";
import { useActiveLocation } from "@/context/LocationContext";
import { SPayBalanceCard } from "@/components/features/spay/SPayBalanceCard";
import { useSPay } from "@/features/spay/spay.frontend-provider";

export default function HomePage() {
  const router = useRouter();
  const { isPublicGuest } = useActiveRole();
  const { summary: spaySummary, isBalanceVisible, toggleBalanceVisibility } = useSPay();
  const { services, isLoading: loadingServices } = useServices();
  const { plans } = useMaintenancePlans();
  const { order: activeOrder } = useServiceOrder("ord-normal-progress");

  const [searchQuery, setSearchQuery] = useState("");
  const {
    location: activeLoc,
    isDetectingGps,
    locationFeedback,
    detectGps,
    openLocationModal,
  } = useActiveLocation();

  const [liveServiceCategories, setLiveServiceCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    taxonomyApi
      .getCategories({ master_code: "JASA", status: "ACTIVE" })
      .then((res) => {
        if (mounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setLiveServiceCategories(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCategories(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeDomains = React.useMemo(() => {
    if (liveServiceCategories.length > 0) {
      return liveServiceCategories.map((c) => {
        const IconComponent = CATEGORY_ICON_MAP[c.icon_name || ""] || Wrench;
        return {
          id: c.id,
          label: c.name,
          href: `/services?categories=${c.id}`,
          icon: IconComponent,
        };
      });
    }
    return [];
  }, [liveServiceCategories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const duePlan = plans.find((p) => p.isOverdue) || plans[0];
  const featuredServices = services.slice(0, 4);

  const toCardData = (s: ServiceOffering): ServiceCardData => ({
    id: s.id,
    title: s.title,
    category: s.subcategoryName || s.categoryName || "Layanan",
    price: s.basePrice,
    priceMin: s.priceMin ?? s.basePrice,
    priceMax: s.priceMax ?? s.basePrice,
    pricingModel: s.pricingModel,
    providerName: s.providerName || "Penyedia Jasa",
    isVerifiedProvider: s.isVerifiedProvider,
    thumbnailUrl: s.thumbnailUrl,
    description: s.description || s.shortDescription || "",
    surveyFee: s.surveyFee,
    surveyFeeModel: s.surveyFeeModel,
    durationMin: s.durationMin,
    durationMax: s.durationMax,
    durationUnit: s.durationUnit,
  });

  return (
    <div className="space-y-10 pb-16">
      {/* 1. HERO SECTION WITH AMBIENT GRADIENT */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F4C81] via-[#155e9c] to-[#0b3860] text-white p-6 sm:p-10 lg:p-12 shadow-servio-xl">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-sky/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-sky tracking-wide">
            <ShieldCheck size={16} weight="fill" className="text-secondary" />
            <span>Garansi Resmi & Proteksi Rekening Escrow Terstandarisasi</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-tight">
            More Than Service, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-amber-200 to-sky">
              A Better Everyday.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
            Solusi satu atap perbaikan, perawatan hunian, suku cadang resmi, dan teknisi bersertifikasi dengan sistem transparansi biaya mutlak.
          </p>

          {/* Large Halo Search Input */}
          <form onSubmit={handleSearch} className="pt-2">
            <div className="relative flex items-center shadow-servio-lg rounded-2xl bg-white p-1.5 focus-within:ring-4 focus-within:ring-sky/40 transition-all">
              <div className="pl-4 text-neutral-slate flex items-center pointer-events-none">
                <MagnifyingGlass size={22} weight="bold" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari servis AC bocor, ganti oli, cuci sofa, teknisi listrik..."
                className="w-full px-3 py-3 text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none rounded-xl"
              />
              <button
                type="submit"
                className="shrink-0 px-6 py-3 rounded-xl bg-secondary text-white font-display font-bold text-xs sm:text-sm hover:bg-secondary-dark active:scale-[0.98] transition-all flex items-center gap-2 shadow-servio-sm"
              >
                <span>Cari</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>

            {/* Quick Keyword Suggestions & Location */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Populer:</span>
                {["Cuci AC", "Freon R32", "Pipa Bocor", "Tune Up Mobil", "Sedot Tungau"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSearchQuery(k);
                      router.push(`/search?q=${encodeURIComponent(k)}`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-[11px]"
                  >
                    {k}
                  </button>
                ))}
              </div>

              {/* Location Badge & Aktifkan GPS Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openLocationModal}
                  className="flex items-center gap-1.5 text-sky-light text-[11px] font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur-xs transition cursor-pointer"
                  title="Klik untuk memilih kota atau alamat pengiriman Anda"
                >
                  <MapPin size={14} weight="fill" className={activeLoc.isGps ? "text-emerald-300" : "text-sky-300"} />
                  <span>Lokasi: {activeLoc.displayName}</span>
                  {activeLoc.isGps && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-400/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      GPS Aktif
                    </span>
                  )}
                  <span className="text-[10px] text-sky-200 underline font-semibold ml-0.5">Ubah</span>
                </button>

                <button
                  type="button"
                  onClick={() => detectGps()}
                  disabled={isDetectingGps}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary hover:bg-secondary-dark text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
                  title="Deteksi wilayah Anda secara otomatis menggunakan GPS perangkat"
                >
                  {isDetectingGps ? (
                    <>
                      <CircleNotch size={13} weight="bold" className="animate-spin text-white" />
                      <span>Mendeteksi GPS...</span>
                    </>
                  ) : activeLoc.isGps ? (
                    <>
                      <CheckCircle size={13} weight="fill" className="text-emerald-300" />
                      <span>GPS Terhubung</span>
                    </>
                  ) : (
                    <>
                      <NavigationArrow size={13} weight="bold" className="text-white" />
                      <span>Aktifkan GPS</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Location Feedback Message */}
            {locationFeedback && (
              <div className="mt-2 text-left">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md ${
                    activeLoc.isGps
                      ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                      : "bg-sky-500/20 text-sky-200 border border-sky-400/30"
                  }`}
                >
                  <CheckCircle size={13} weight="fill" />
                  <span>{locationFeedback}</span>
                </span>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* 2. S-PAY BALANCE CARD & ACTIVE ORDER TRACKER (KHUSUS PELANGGAN TERDAFTAR, BUKAN GUEST) */}
      {!isPublicGuest && (
        <>
          {/* S-PAY BALANCE CARD (CUSTOMER ONLY) */}
          <section className="w-full">
            <SPayBalanceCard
              balance={spaySummary.withdrawableBalance}
              ownerType="CUSTOMER"
              subtitle="Saldo Refund Tersedia"
              detailHref="/spay"
              isBalanceVisible={isBalanceVisible}
              onToggleVisibility={toggleBalanceVisibility}
            />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Order Widget */}
          {activeOrder && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 rounded-2xl border border-sky-200 bg-sky/15 flex flex-col justify-between space-y-4 hover:shadow-servio-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary text-white shrink-0">
                    <Lightning size={22} weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Pesanan Aktif</span>
                      <StatusBadge status="info" label={activeOrder.statusLabel || "Sedang Berjalan"} />
                    </div>
                    <h3 className="font-display font-bold text-sm text-neutral-dark mt-0.5">
                      {activeOrder.serviceTitle}
                    </h3>
                    <p className="text-xs text-neutral-slate">
                      Teknisi: {activeOrder.assignedWorker?.name || activeOrder.providerName}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-neutral-dark">
                  Rp {activeOrder.pricing?.totalAmount?.toLocaleString("id-ID") ?? "250.000"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-sky-200/60 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-slate">
                  <Clock size={15} className="text-primary" />
                  <span>Jadwal: {activeOrder.scheduledDate} ({activeOrder.scheduledTimeSlot})</span>
                </div>
                <Link
                  href={`/orders/${activeOrder.id}`}
                  className="font-bold text-primary hover:text-primary-dark flex items-center gap-1 group"
                >
                  <span>Pantau Live</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}

          {/* Maintenance Due Alert */}
          {duePlan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 rounded-2xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between space-y-4 hover:shadow-servio-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500 text-white shrink-0">
                    <BellRinging size={22} weight="fill" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Jatuh Tempo Perawatan</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {duePlan.isOverdue ? "Jatuh Tempo" : "Terjadwal"}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm text-neutral-dark mt-0.5">
                      {duePlan.title}
                    </h3>
                    <p className="text-xs text-neutral-slate">Unit: {duePlan.assetName} • Rutinitas {duePlan.frequencyMonths} bulanan</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs">
                <span className="text-neutral-slate">Batas tempo: {duePlan.nextDueDate}</span>
                <Link
                  href={`/bookings/new?serviceId=${duePlan.recommendedServiceId}&assetId=${duePlan.assetId}`}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors flex items-center gap-1 text-xs"
                >
                  <span>Panggil Teknisi Sekarang</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          )}
        </section>
        </>
      )}

      {/* 3. 6 SERVICE DOMAINS HIERARCHY */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Wrench size={16} weight="duotone" />
              <span>Kategori Resmi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-dark mt-1">
              Layanan Servio
            </h2>
          </div>
          <Link
            href="/services"
            className="text-xs sm:text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1"
          >
            <span>Semua Layanan Jasa</span>
            <CaretRight size={16} weight="bold" />
          </Link>
        </div>

        {isLoadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="glass-card p-4 rounded-2xl flex flex-col items-center text-center animate-pulse border border-slate-200/80 space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : activeDomains.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <p className="text-xs font-bold text-neutral-dark">Belum ada kategori layanan aktif</p>
            <p className="text-[11px] text-neutral-slate">Kategori layanan dari database belum tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {activeDomains.map((domain, index) => {
              const Icon = domain.icon;
              return (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  onClick={() => router.push(domain.href)}
                  className="glass-card glass-card-hover p-4 rounded-2xl flex flex-col items-center text-center cursor-pointer group border border-slate-200/80 hover:border-primary/40 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-sky/60 text-primary group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center mb-3 group-hover:scale-105">
                    <Icon size={26} weight="duotone" />
                  </div>
                  <h3 className="font-display font-bold text-xs sm:text-sm text-neutral-dark group-hover:text-primary transition-colors">
                    {domain.label}
                  </h3>
                  <span className="text-[11px] text-neutral-muted mt-1">Jelajahi Layanan</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. SMART DISCOVERY AI BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky via-sky-light to-ivory border border-sky-200 p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-servio-sm">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center shrink-0 shadow-servio-md">
            <Sparkle size={30} weight="fill" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-[11px] font-bold">
              <span>AI Troubleshooting Assistant</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-dark">
              Bingung Gejala Kerusakan Alat Anda?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
              Ceritakan gejala kerusakan dengan bahasa sehari-hari. Asisten AI Servio akan menganalisis penyebab, memberikan estimasi biaya, dan memilihkan teknisi spesialis yang tepat.
            </p>
          </div>
        </div>

        <Link
          href="/smart-discovery"
          className="shrink-0 px-6 py-3.5 rounded-2xl bg-primary text-white font-display font-bold text-xs sm:text-sm hover:bg-primary-dark transition-all flex items-center gap-2 shadow-servio-md active:scale-95"
        >
          <Sparkle size={18} weight="fill" className="text-amber-300" />
          <span>Mulai Diagnosa AI</span>
          <ArrowRight size={16} weight="bold" />
        </Link>
      </section>

      {/* 5. RECOMMENDED & POPULAR SERVICES CAROUSEL */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider">
              <Star size={16} weight="fill" />
              <span>Layanan Unggulan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-neutral-dark mt-1">
              Rekomendasi Teknisi & Servis Terdekat
            </h2>
          </div>
          <Link
            href="/search"
            className="text-xs sm:text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1"
          >
            <span>Lihat Semua ({services.length})</span>
            <CaretRight size={16} weight="bold" />
          </Link>
        </div>

        {loadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={toCardData(service)}
                onBook={(id: string) => router.push(`/services/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. TRUST & ESCROW BADGE BANNER */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <ShieldCheck size={24} weight="duotone" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-dark">100% Escrow Protection</h4>
            <p className="text-xs text-neutral-slate mt-1">
              Dana Anda tersimpan aman di rekening penampung resmi. Pembayaran baru diteruskan ke teknisi setelah Anda menyetujui hasil kerja.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky text-primary shrink-0">
            <CheckCircle size={24} weight="duotone" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-dark">Teknisi Terverifikasi & SKCK</h4>
            <p className="text-xs text-neutral-slate mt-1">
              Setiap teknisi mitra melalui uji sertifikasi teknis, verifikasi identitas resmi, dan standard operational procedure (SOP) higienis.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <CalendarCheck size={24} weight="duotone" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-neutral-dark">Garansi Pekerjaan</h4>
            <p className="text-xs text-neutral-slate mt-1">
              Klaim perbaikan ulang tanpa biaya tambahan jika masalah berulang selama periode garansi aktif melalui Warranty Center.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
