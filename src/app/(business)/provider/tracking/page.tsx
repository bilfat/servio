"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  MapPin,
  Car,
  Warning,
  Phone,
  ChatCircleText,
  Clock,
  BatteryCharging,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Broadcast,
  User,
  Wrench,
  Tag,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { useActiveRole } from "@/context/RoleContext";
import { Toast } from "@/components/feedback/Toast";
import { trackingApi } from "@/lib/servioApi";

export default function ProviderTrackingRadarPage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();
  const currentProviderId = user.id || "usr-prov-001";

  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("worker-budi");
  const [providerSessionId, setProviderSessionId] = useState<string | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [liveRadar, setLiveRadar] = useState<{
    totalPersonnel: number;
    trackingActive: number;
    locationStale: number;
    trackingOff: number;
    assignedCount: number;
    workers: any[];
  } | null>(null);

  // Load real radar data from Laravel REST API
  const loadRadar = async () => {
    try {
      const res = await trackingApi.getRadar();
      if (res.data) {
        setLiveRadar(res.data);
      }
    } catch {
      // Fallback repo if offline
    }
  };

  React.useEffect(() => {
    loadRadar();
    const interval = setInterval(loadRadar, 10000);
    return () => clearInterval(interval);
  }, []);

  // Provider GPS toggle
  const handleToggleProviderGps = async () => {
    setIsGpsLoading(true);
    try {
      if (providerSessionId) {
        await trackingApi.stopSession(providerSessionId);
        setProviderSessionId(null);
        setAlertSuccess("Pelacakan GPS Provider berhasil dimatikan.");
      } else {
        const res = await trackingApi.createSession({
          actorType: "SERVICE_PROVIDER",
          role: "SERVICE_PROVIDER",
        });
        if (res.data?.sessionId) {
          setProviderSessionId(res.data.sessionId);
          setAlertSuccess("Pelacakan GPS Provider AKTIF dan terhubung ke radar.");
        }
      }
      await loadRadar();
    } catch (err: any) {
      setAlertSuccess(err?.message || "Gagal mengubah status pelacakan GPS.");
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Merge repo fallback with live radar data
  const fallbackRadar = repo.getProviderTrackingRadar(currentProviderId);
  const radarData = useMemo(() => {
    if (!liveRadar) return fallbackRadar;
    return {
      totalWorkers: liveRadar.totalPersonnel ?? fallbackRadar.totalWorkers,
      trackingActive: liveRadar.trackingActive ?? fallbackRadar.trackingActive,
      locationStale: liveRadar.locationStale ?? fallbackRadar.locationStale,
      trackingOff: liveRadar.trackingOff ?? fallbackRadar.trackingOff,
      workerAssigned: liveRadar.assignedCount ?? fallbackRadar.workerAssigned,
      workers: fallbackRadar.workers,
    };
  }, [liveRadar, fallbackRadar]);

  const selectedWorker = useMemo(() => {
    return (
      radarData.workers.find((w) => w.id === selectedWorkerId) ||
      radarData.workers[0] ||
      null
    );
  }, [radarData.workers, selectedWorkerId]);

  const handleNotifyCustomerDelay = (workerName: string, customerName?: string) => {
    setAlertSuccess(
      `Pemberitahuan estimasi kedatangan teknisi ${workerName} telah dikirimkan ke pelanggan ${customerName || "terkait"}.`
    );
  };

  return (
    <div className="space-y-6 font-body text-left pb-20">
      {/* Toast Notification */}
      {alertSuccess && (
        <Toast
          message={alertSuccess}
          type="success"
          onClose={() => setAlertSuccess(null)}
        />
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-display text-neutral-dark">
              Radar Pelacakan Teknisi Lapangan
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Telemetry Feed
            </span>
          </div>
          <p className="text-sm text-neutral-slate mt-1">
            Monitoring telemetri perjalanan kerja, status pelacakan GPS, dan pengawasan penugasan teknisi bengkel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isGpsLoading}
            onClick={handleToggleProviderGps}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition shadow-xs ${
              providerSessionId
                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Broadcast size={16} weight="bold" />
            <span>
              {isGpsLoading
                ? "Memproses..."
                : providerSessionId
                ? "Stop GPS Provider"
                : "Aktifkan GPS Provider"}
            </span>
          </button>
          <Link
            href="/provider/workers"
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Manajemen Tim Teknisi &rarr;
          </Link>
        </div>
      </div>

      {/* Section 26.1: Radar Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-servio-xs">
          <div className="text-slate-400 text-xs font-semibold">Total Personel</div>
          <div className="text-2xl font-bold font-display text-slate-900 mt-1">
            {radarData.totalWorkers}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Teknisi terdaftar</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-servio-xs">
          <div className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Tracking Aktif (Live)
          </div>
          <div className="text-2xl font-bold font-display text-emerald-800 mt-1">
            {radarData.trackingActive}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Memancarkan lokasi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-servio-xs">
          <div className="text-amber-700 text-xs font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Lokasi Stale
          </div>
          <div className="text-2xl font-bold font-display text-amber-800 mt-1">
            {radarData.locationStale}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">&gt; 5 mnt tanpa ping</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-servio-xs">
          <div className="text-slate-500 text-xs font-semibold">Tracking Off</div>
          <div className="text-2xl font-bold font-display text-slate-700 mt-1">
            {radarData.trackingOff}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tidak berbagi GPS</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-servio-xs col-span-2 sm:col-span-1">
          <div className="text-[#0F4C81] text-xs font-semibold">Sedang Ditugaskan</div>
          <div className="text-2xl font-bold font-display text-[#0F4C81] mt-1">
            {radarData.workerAssigned}
          </div>
          <div className="text-[11px] text-sky-700 mt-0.5">Memiliki job aktif</div>
        </div>
      </div>

      {/* Main Grid: Radar Map View + Detailed Worker List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Radar Visual Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-5 shadow-servio-xs flex flex-col justify-between min-h-[480px] relative overflow-hidden">
          {/* Simulated Satellite Map Background */}
          <div className="absolute inset-0 bg-slate-100 opacity-60 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  "radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#cbd5e1 1px, #f8fafc 1px)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 12px 12px",
              }}
            />
          </div>

          {/* Map Overlay Controls */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 text-xs shadow-xs flex items-center gap-2">
              <Compass size={16} weight="duotone" className="text-[#0F4C81]" />
              <span className="font-bold text-slate-800">Cakupan Radius Bengkel: 25 km</span>
              <span className="text-[10px] text-slate-500">(Jakarta Selatan &amp; Sekitar)</span>
            </div>

            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600 font-semibold shadow-xs flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Live
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Stale (&gt;5m)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Off
              </span>
            </div>
          </div>

          {/* Simulated Position Pins */}
          <div className="relative z-10 my-auto py-12 flex items-center justify-around gap-4 flex-wrap">
            {radarData.workers.map((w, idx) => {
              const isSelected = selectedWorker?.id === w.id;
              const isLive = w.freshnessState === "LIVE";
              const isStale = w.freshnessState === "STALE";

              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`cursor-pointer transition-all p-3 rounded-2xl border flex items-center gap-2.5 shadow-sm ${
                    isSelected
                      ? "bg-white border-[#0F4C81] ring-3 ring-[#0F4C81]/20 scale-105"
                      : "bg-white/90 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white ${
                      isLive
                        ? "bg-emerald-600 ring-2 ring-emerald-300"
                        : isStale
                        ? "bg-amber-500 ring-2 ring-amber-200"
                        : "bg-slate-400"
                    }`}
                  >
                    {w.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs text-slate-900 leading-tight">{w.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                      {w.trackingSession?.lastAddress || w.currentLocation?.address || "Dekat Workshop"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Worker Telemetry Detail Strip */}
          {selectedWorker && (
            <div className="relative z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 text-xs shadow-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedWorker.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedWorker.isOnline
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {selectedWorker.isOnline ? "● ON DUTY" : "○ OFF DUTY"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedWorker.freshnessState === "LIVE"
                        ? "bg-emerald-500 text-white"
                        : selectedWorker.freshnessState === "STALE"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-400 text-white"
                    }`}
                  >
                    {selectedWorker.freshnessState === "LIVE"
                      ? "● LIVE"
                      : selectedWorker.freshnessState === "STALE"
                      ? "○ STALE"
                      : "○ OFFLINE"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Pelat: <strong>{selectedWorker.vehicleNumber || "Motor Operasional"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Lokasi Terakhir:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.trackingSession?.lastAddress || selectedWorker.currentLocation?.address || "Jakarta Selatan"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Order Ditugaskan:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedWorker.currentOrder
                      ? `${selectedWorker.currentOrder.id} (${selectedWorker.currentOrder.serviceTitle})`
                      : "Standby / Tidak Ada Job Berjalan"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Akurasi GPS / Sinyal:</span>
                  <span className="font-semibold text-slate-800">
                    ± {selectedWorker.trackingSession?.lastAccuracyMeters || 12} meter (Update:{" "}
                    {selectedWorker.freshnessState === "LIVE"
                      ? "Baru saja"
                      : selectedWorker.freshnessState === "STALE"
                      ? "8 menit lalu"
                      : "Tidak aktif"}
                    )
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 26.2: Worker List & Telemetry Status (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-servio-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-sm font-display text-slate-900 flex items-center gap-1.5">
                <Broadcast size={16} weight="duotone" className="text-[#0F4C81]" />
                Daftar Armada Teknisi ({radarData.workers.length})
              </h2>
              <span className="text-[11px] font-semibold text-slate-500">
                Tenant: {user.organizationName || "PT Servio Mandiri Teknik"}
              </span>
            </div>

            {/* List of Workers with Freshness Indicators */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {radarData.workers.map((worker) => {
                const isSelected = selectedWorker?.id === worker.id;
                const isLive = worker.freshnessState === "LIVE";
                const isStale = worker.freshnessState === "STALE";

                return (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? "bg-sky-50/70 border-[#0F4C81] shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#0F4C81] font-bold flex items-center justify-center text-xs">
                          {worker.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{worker.name}</p>
                          <p className="text-[10px] text-slate-500">{worker.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            worker.isOnline
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {worker.isOnline ? "ON DUTY" : "OFF"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLive
                              ? "bg-emerald-500 text-white"
                              : isStale
                              ? "bg-amber-500 text-white"
                              : "bg-slate-300 text-slate-700"
                          }`}
                        >
                          {isLive ? "LIVE" : isStale ? "STALE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="text-[11px] text-slate-600 space-y-1 bg-white/80 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Order:</span>
                        <span className="font-semibold text-slate-800">
                          {worker.currentOrder ? worker.currentOrder.id : "Standby"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Layanan:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                          {worker.currentOrder
                            ? worker.currentOrder.serviceTitle
                            : worker.trackingSession?.currentOrderService || "Standby Bengkel"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Lokasi:</span>
                        <span className="font-medium text-slate-700 truncate max-w-[170px]">
                          {worker.trackingSession?.lastAddress || worker.currentLocation?.address || "Jakarta Selatan"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Scope Disclaimer (Section 28) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 flex items-start gap-2">
            <ShieldCheck size={16} className="text-[#0F4C81] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">Tenant Isolation &amp; Privasi</p>
              <p className="mt-0.5">
                Data radar hanya memuat teknisi resmi dari {user.organizationName || "PT Servio Mandiri Teknik"}. Pelanggan tidak menerima koordinat mentah GPS demi keamanan operasional armada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
