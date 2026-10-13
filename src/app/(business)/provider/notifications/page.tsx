"use client";

import React, { useState } from "react";
import {
  Bell,
  CheckCircle,
  Clock,
  WarningCircle,
  Trash,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { Toast } from "@/components/feedback/Toast";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: "ORDER" | "PRICE" | "DISPUTE" | "SYSTEM";
}

export default function ProviderNotificationsPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Booking Baru Masuk",
      message: "Sarah Wijaya mengajukan booking servis AC Inverter untuk 21 Sept 13:00 WIB.",
      time: "10 menit yang lalu",
      isRead: false,
      type: "ORDER",
    },
    {
      id: "notif-2",
      title: "Pengajuan Otorisasi Biaya",
      message: "Teknisi Dani mengajukan penyesuaian biaya untuk Order #ORD-2026-8902.",
      time: "45 menit yang lalu",
      isRead: false,
      type: "PRICE",
    },
    {
      id: "notif-3",
      title: "Garansi Diaktifkan",
      message: "Pelanggan telah mengonfirmasi penyelesaian pekerjaan pada Order #ORD-2026-8904.",
      time: "2 jam yang lalu",
      isRead: true,
      type: "SYSTEM",
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    setToastMessage("Semua notifikasi ditandai telah dibaca.");
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Pusat Notifikasi
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
              Notifikasi &amp; Pemberitahuan
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pemberitahuan operasional, pengajuan biaya teknisi, dan pembaruan sengketa pelanggan.
            </p>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition self-start sm:self-auto"
          >
            Tandai Semua Dibaca
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs divide-y divide-slate-100 text-xs">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`py-3.5 flex items-start gap-3 transition ${
              !n.isRead ? "bg-sky-50/30 -mx-3 px-3 rounded-2xl" : ""
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                !n.isRead ? "bg-[#0F4C81]" : "bg-slate-300"
              }`}
            />
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="font-bold text-slate-900">{n.title}</p>
              <p className="text-slate-600 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-slate-400 pt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
