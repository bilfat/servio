"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProviders } from "@/features/discovery/useProviders";
import { useServices } from "@/features/discovery/useServices";
import { MOCK_WORKERS } from "@/mocks/workers";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ServiceCard, ServiceCardData } from "@/components/features/services/ServiceCard";
import { ServiceOffering } from "@/types/domain";
import {
  ShieldCheck,
  Star,
  Clock,
  MapPin,
  ChatCircleText,
  CheckCircle,
  ArrowRight,
} from "@phosphor-icons/react";

type ProviderTab = "services" | "technicians" | "about";

export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params?.providerId as string;

  const { providers } = useProviders();
  const provider = providers.find((p) => p.id === providerId) || providers[0];
  const { services } = useServices();

  const [activeTab, setActiveTab] = useState<ProviderTab>("services");

  if (!provider) {
    return (
      <div className="py-12">
        <EmptyState
          title="Mitra Tidak Ditemukan"
          description={`Mitra dengan ID "${providerId}" tidak terdaftar dalam jaringan bengkel terverifikasi Servio.`}
          action={
            <button
              type="button"
              onClick={() => router.push("/search")}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
            >
              Kembali ke Pencarian
            </button>
          }
        />
      </div>
    );
  }

  // Available technicians for this provider
  const assignedWorkers = MOCK_WORKERS.filter((w) => w.providerId === provider?.id || true).slice(0, 3);
  const providerServices = services.slice(0, 4);

  const toCardData = (s: ServiceOffering): ServiceCardData => ({
    id: s.id,
    title: s.title,
    category: s.subcategoryName || s.categoryName || "Layanan",
    price: s.basePrice,
    priceMin: s.priceMin ?? s.basePrice,
    priceMax: s.priceMax ?? s.basePrice,
    pricingModel: s.pricingModel,
    rating: s.rating,
    reviewCount: s.reviewCount,
    warrantyDays: s.warrantyDays,
    providerName: s.providerName,
    isVerifiedProvider: s.isVerifiedProvider,
    thumbnailUrl: s.thumbnailUrl,
    description: s.description || s.shortDescription || "",
  });

  return (
    <div className="space-y-8 pb-16">
      {/* 1. PROVIDER HERO HEADER */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-servio-sm bg-white space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-display font-black text-2xl sm:text-3xl shadow-servio-md shrink-0">
              {provider?.name.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {provider?.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={14} weight="fill" />
                    Verified Mitra Servio Shield
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky text-primary">
                  {provider?.businessType}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-neutral-dark">
                {provider?.name}
              </h1>

              <div className="flex items-center gap-4 text-xs text-neutral-slate flex-wrap pt-1">
                <div className="flex items-center gap-1 font-bold text-amber-600">
                  <Star size={16} weight="fill" />
                  <span>{provider?.rating}</span>
                  <span className="text-neutral-muted font-normal">({provider?.completedJobs} pekerjaan tuntas)</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin size={15} className="text-rose-500" />
                  <span>{provider?.city} (Radius {provider?.workRadiusKm} km)</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock size={15} className="text-primary" />
                  <span>{provider?.operationalHoursSummary}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/chat/conv-01`)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-neutral-dark text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <ChatCircleText size={16} weight="bold" />
              <span>Tanya Mitra</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/bookings/new?providerId=${provider?.id}`)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-1.5 shadow-servio-xs"
            >
              <span>Booking Langsung</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
          {(
            [
              { id: "services", label: `Katalog Layanan (${providerServices.length})` },
              { id: "technicians", label: `Teknisi Lapangan (${assignedWorkers.length})` },
              { id: "about", label: "Tentang & Sertifikasi" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-servio-xs"
                  : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. TAB CONTENT */}
      {activeTab === "services" ? (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-base text-neutral-dark">
            Layanan Disediakan oleh {provider?.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {providerServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={toCardData(service)}
                onBook={(id: string) => router.push(`/services/${id}?providerId=${provider?.id}`)}
              />
            ))}
          </div>
        </div>
      ) : activeTab === "technicians" ? (
        <div className="space-y-4">
          <h2 className="font-display font-bold text-base text-neutral-dark">
            Teknisi Lapangan Berlisensi ({assignedWorkers.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {assignedWorkers.map((worker) => (
              <div
                key={worker.id}
                className="glass-card p-5 rounded-2xl border border-slate-200/80 flex items-start gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {worker.name.charAt(0)}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="font-display font-bold text-xs sm:text-sm text-neutral-dark truncate">
                    {worker.name}
                  </h4>
                  <p className="text-xs text-neutral-slate">{worker.skills?.join(", ")}</p>
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                      <Star size={13} weight="fill" /> {worker.rating}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-muted">{worker.completedJobs} order</span>
                  </div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Status: {worker.isOnline ? "Tersedia Hari Ini" : "Sedang Tugas"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/80 space-y-4 max-w-2xl">
          <h3 className="font-display font-bold text-base text-neutral-dark">
            SOP Kerja & Jaminan Kualitas
          </h3>
          <p className="text-xs text-neutral-slate leading-relaxed">
            {provider?.name} merupakan mitra bengkel teknik terverifikasi yang menerapkan SOP ketat, termasuk penggunaan alat ukur bersertifikasi, seragam resmi dengan ID card Servio, serta transparansi penggantian suku cadang bekas kepada pelanggan.
          </p>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-dark">
              <CheckCircle size={16} className="text-emerald-600" weight="fill" />
              <span>Peralatan Uji Terstandar SNI</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-dark">
              <CheckCircle size={16} className="text-emerald-600" weight="fill" />
              <span>Teknisi Bersertifikat BNSP / APITU</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-dark">
              <CheckCircle size={16} className="text-emerald-600" weight="fill" />
              <span>Pemeriksaan SKCK & Bebas Narkoba</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-dark">
              <CheckCircle size={16} className="text-emerald-600" weight="fill" />
              <span>Laporan Foto Bukti Before/After Wajib</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
