"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { opsApi } from "@/lib/servioApi";
import {
  Users,
  Scales,
  Package,
  ChatCircleText,
  ClockCountdown,
  Truck,
  Storefront,
  ShieldCheck,
  ArrowRight,
  ClipboardText,
  Wrench,
  Sparkle,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminDashboardPage() {
  const { dashboardStats, auditLogs, user } = useAdminOperations();
  const [pendingPartnerCount, setPendingPartnerCount] = useState<number | null>(null);

  useEffect(() => {
    opsApi
      .getCeoMonitoringStats()
      .then((res) => {
        if (res.data) {
          // underReview count from real MongoDB database
          setPendingPartnerCount(res.data.underReview);
        }
      })
      .catch(() => {
        // fallback to default
      });
  }, []);

  const queueCards = [
    {
      title: "Verifikasi Pendaftaran Mitra",
      count: pendingPartnerCount !== null ? pendingPartnerCount : dashboardStats.pendingKYC,
      label: "Entitas Perlu Review",
      description: "Pendaftaran Provider Jasa, Merchant, dan Supplier B2B menunggu verifikasi legalitas & dokumen.",
      href: "/ops/admin/registration-applications",
      icon: Users,
      color: "text-amber-600 bg-amber-50 border-amber-200",
      urgency: (pendingPartnerCount ?? dashboardStats.pendingKYC) > 0 ? "ATTENTION" : "NORMAL",
    },
    {
      title: "Eskalasi Sengketa Aktif",
      count: dashboardStats.openDisputes,
      label: "Kasus Mediasi",
      description: "Tiket perselisihan antara pelanggan dan penyedia jasa yang membutuhkan intervensi mediasi formal.",
      href: "/ops/admin/disputes",
      icon: Scales,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      urgency: dashboardStats.openDisputes > 0 ? "URGENT" : "NORMAL",
    },
    {
      title: "Antrean Moderasi Produk",
      count: dashboardStats.pendingProductModeration,
      label: "Listing Katalog",
      description: "Listing suku cadang toko dan penawaran grosir B2B menunggu verifikasi kompatibilitas & tier harga.",
      href: "/ops/admin/products",
      icon: Package,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      urgency: dashboardStats.pendingProductModeration > 0 ? "ATTENTION" : "NORMAL",
    },
    {
      title: "Moderasi Ulasan & Konten",
      count: dashboardStats.pendingContentModeration,
      label: "Laporan UGC",
      description: "Ulasan dengan bintang rendah, indikasi spam, atau pelaporan bahasa tidak pantas.",
      href: "/ops/admin/moderation",
      icon: ChatCircleText,
      color: "text-purple-600 bg-purple-50 border-purple-200",
      urgency: dashboardStats.pendingContentModeration > 0 ? "ATTENTION" : "NORMAL",
    },
    {
      title: "Risiko SLA Fulfillment",
      count: dashboardStats.totalFulfillmentAtRisk,
      label: "Order Staging",
      description: "Paket retail dan palet kargo yang mendekati batas waktu picking & packing di gudang.",
      href: "/ops/admin/fulfillment",
      icon: ClockCountdown,
      color: "text-orange-600 bg-orange-50 border-orange-200",
      urgency: dashboardStats.totalFulfillmentAtRisk > 0 ? "ATTENTION" : "NORMAL",
    },
    {
      title: "Pengecualian Pengiriman",
      count: dashboardStats.shippingExceptions,
      label: "Kendala Ekspedisi",
      description: "Pengiriman tertahan akibat alamat tidak ditemukan, cuaca, atau kegagalan kurir.",
      href: "/ops/admin/shipping",
      icon: Truck,
      color: "text-red-600 bg-red-50 border-red-200",
      urgency: dashboardStats.shippingExceptions > 0 ? "URGENT" : "NORMAL",
    },
    {
      title: "Peringatan Stok Gudang",
      count: dashboardStats.totalInventoryAlerts,
      label: "Stok Menipis",
      description: "Stok komponen multi-gudang di bawah batas minimum pemesanan ulang (safety alert).",
      href: "/ops/admin/inventory",
      icon: Storefront,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      urgency: dashboardStats.totalInventoryAlerts > 0 ? "ATTENTION" : "NORMAL",
    },
    {
      title: "Log Audit Sistem Terkini",
      count: auditLogs.length,
      label: "Event Terverifikasi",
      description: "Audit trail transaksi, otorisasi peran, dan evaluasi kepatuhan operasional platform.",
      href: "/ops/admin/audit",
      icon: ShieldCheck,
      color: "text-slate-700 bg-slate-50 border-slate-200",
      urgency: "NORMAL",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Context */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Pusat Kendali Operasional Platform
              </h1>
              <p className="text-xs text-slate-500">
                Otoritas Operasional: <span className="font-semibold text-slate-700">{user.name}</span> &bull; Modul Administrator Aktif
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/ops/admin/taxonomy">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal size={16} />
              <span>Kelola Taksonomi</span>
            </Button>
          </Link>
          <Link href="/ops/admin/audit">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs">
              <ShieldCheck size={16} />
              <span>Inspeksi Audit Trail</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Platform Volumes Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Order Servis Jasa</span>
            <Wrench size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display mt-2">
            {dashboardStats.totalServices}
          </p>
          <Link href="/ops/admin/services" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            Lihat antrean eksekusi &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Order Produk Retail</span>
            <ClipboardText size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display mt-2">
            {dashboardStats.totalProductOrders}
          </p>
          <Link href="/ops/admin/orders" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            Pantau transaksi toko &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Purchase Order B2B</span>
            <Package size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display mt-2">
            {dashboardStats.totalB2BPOs}
          </p>
          <Link href="/ops/admin/orders" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            Pengadaan grosir &rarr;
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Reservasi Booking</span>
            <Sparkle size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-display mt-2">
            {dashboardStats.totalBookings}
          </p>
          <Link href="/ops/admin/orders" className="text-[11px] text-primary hover:underline mt-1 inline-block">
            Booking masuk &rarr;
          </Link>
        </div>
      </div>

      {/* Operational Queues Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 font-heading">
          Antrean Operasional yang Memerlukan Tindakan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {queueCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                href={card.href}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`p-2 rounded-xl border ${card.color}`}>
                      <Icon size={20} weight="duotone" />
                    </span>
                    {card.urgency === "URGENT" && card.count > 0 ? (
                      <Badge variant="danger" size="sm">
                        Mendesak
                      </Badge>
                    ) : card.count > 0 ? (
                      <Badge variant="warning" size="sm">
                        {card.count} Antrean
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Nihil
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary">
                  <span>Buka Modul</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Trail Snippet */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Aktivitas Audit Trail Platform Terkini
            </h3>
            <p className="text-xs text-slate-500">
              Log sistem terverifikasi yang mencatat seluruh mutasi status dan intervensi operasional.
            </p>
          </div>
          <Link href="/ops/admin/audit">
            <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
              Lihat Seluruh Log &rarr;
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pelaku / Aktor</th>
                <th className="py-2.5 px-3">Aksi Operasional</th>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Alasan / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    <div>{log.actorName}</div>
                    <span className="text-[10px] text-slate-400 capitalize">{log.actorRole.toLowerCase().replace(/_/g, " ")}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-700">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {log.resource} ({log.resourceId})
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.result === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : log.result === "DENIED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-slate-500">
                    {log.reason || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
