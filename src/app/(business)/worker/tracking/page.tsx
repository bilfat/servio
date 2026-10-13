"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Broadcast,
  MapPin,
  Warning,
  CheckCircle,
  ArrowsClockwise,
  ShieldCheck,
  PhoneCall,
  Clock,
  Car,
  Wrench,
  X,
  ArrowLeft,
  NavigationArrow,
} from "@phosphor-icons/react";
import { useWorkerOperations } from "@/features/worker/useWorkerOperations";
import { Toast } from "@/components/feedback/Toast";
import { trackingApi } from "@/lib/servioApi";

export default function WorkerTrackingPage() {
  const {
    gpsActive,
    setGpsActive,
    lastCheckIn,
    triggerManualCheckIn,
    sosActive,
    triggerEmergencySOS,
    resolveEmergencySOS,
  } = useWorkerOperations();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<string>("TRACKING_OFF");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: -6.230129,
    lng: 106.850211,
    accuracy: 6,
  });

  const handleToggleGps = async () => {
    if (activeSessionId || gpsActive) {
      // Stop session
      if (activeSessionId) {
        try {
          await trackingApi.stopSession(activeSessionId);
        } catch {
          // ignore error on stop
        }
      }
      setActiveSessionId(null);
      setGpsActive(false);
      setTrackingStatus("TRACKING_STOPPED");
      setToastMessage("Sesi pelacakan GPS teknisi telah dinonaktifkan.");
      return;
    }

    // Start session
    setTrackingStatus("TRACKING_PENDING_PERMISSION");
    if (!navigator.geolocation) {
      setTrackingStatus("TRACKING_LOCATION_UNAVAILABLE");
      setToastMessage("Geolocation tidak didukung pada browser ini.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 10;
        setCurrentCoords({ lat, lng, accuracy: Math.round(acc) });

        try {
          const res = await trackingApi.createSession({
            actorType: "WORKER_TECHNICIAN",
            latitude: lat,
            longitude: lng,
            accuracy: acc,
          });
          if (res.data?.sessionId) {
            setActiveSessionId(res.data.sessionId);
          }
          setTrackingStatus(res.data?.status || "TRACKING_ACTIVE");
          setGpsActive(true);
          setToastMessage("GPS Berhasil Diaktifkan — Sesi pelacakan aktif di sistem Servio.");
        } catch (err: any) {
          setGpsActive(true); // UI fallback
          setTrackingStatus("TRACKING_ACTIVE");
          setToastMessage(err?.message || "GPS diaktifkan secara lokal.");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setTrackingStatus("TRACKING_PERMISSION_DENIED");
          setToastMessage("Izin akses lokasi GPS ditolak oleh pengguna.");
        } else {
          setTrackingStatus("TRACKING_LOCATION_UNAVAILABLE");
          setToastMessage("Lokasi GPS tidak dapat diakses saat ini.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Manual checkpoint state
  const [checkpointInput, setCheckpointInput] = useState("");
  const [checkpointHistory, setCheckpointHistory] = useState([
    { id: "cp-1", time: "10:05 WIB", location: "Jl. Gandaria Tengah IV (Tiba di Lokasi Klien)", type: "AUTO_GPS" },
    { id: "cp-2", time: "09:35 WIB", location: "Lampu Merah CSW / Blok M (Transit Perjalanan)", type: "AUTO_GPS" },
    { id: "cp-3", time: "08:15 WIB", location: "Bengkel Bintang Teknik Mandiri (Check-in Pagi)", type: "MANUAL" },
  ]);

  // SOS Modal
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosType, setSosType] = useState<"VEHICLE_BREAKDOWN" | "ACCIDENT" | "SECURITY_THREAT">("VEHICLE_BREAKDOWN");
  const [sosDetails, setSosDetails] = useState("Ban belakang bocor di dekat flyover Antasari");

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointInput.trim()) return;

    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    triggerManualCheckIn(checkpointInput);
    setCheckpointHistory((prev) => [
      { id: `cp-${Date.now()}`, time: timeStr, location: checkpointInput, type: "MANUAL" },
      ...prev,
    ]);
    setToastMessage(`Checkpoint manual "${checkpointInput}" berhasil dicatat dan dipancarkan ke dispatch bengkel.`);
    setCheckpointInput("");
  };

  const handleSendSOS = () => {
    setShowSosModal(false);
    triggerEmergencySOS(sosDetails);
    setToastMessage("Sinyal DARURAT SOS telah dipancarkan ke Pusat Bantuan Mitra & Customer Support!");
  };

  return (
    <div className="space-y-5 pb-20 max-w-xl mx-auto font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/worker/dashboard"
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition"
        >
          <ArrowLeft size={18} weight="bold" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900">
            Pelacakan GPS & Check-In
          </h1>
          <p className="text-xs text-slate-500">
            Pusat status telemetri perjalanan dan pemancar lokasi lapangan.
          </p>
        </div>
      </div>

      {/* SOS Active Alert Banner */}
      {sosActive && (
        <div className="p-4 rounded-3xl bg-rose-50 border-2 border-rose-400 text-rose-900 space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Warning size={20} weight="fill" className="text-rose-600" />
              <span>SINYAL DARURAT SOS AKTIF</span>
            </div>
            <button
              type="button"
              onClick={resolveEmergencySOS}
              className="text-xs font-bold px-2.5 py-1 bg-white rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              Matikan SOS
            </button>
          </div>
          <p className="text-xs text-rose-800">
            Pusat operasional telah menerima lokasi darurat Anda. Bantuan sedang diarahkan.
          </p>
        </div>
      )}

      {/* Live GPS Telemetry Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                gpsActive ? "bg-emerald-500 animate-ping" : "bg-slate-400"
              }`}
            />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {gpsActive ? `GPS Aktif (${trackingStatus})` : `GPS Terputus (${trackingStatus})`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleGps}
            className="text-xs font-bold text-[#0F4C81] hover:underline"
          >
            {gpsActive ? "Nonaktifkan" : "Aktifkan GPS"}
          </button>
        </div>

        {/* Real Coordinate Display */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
          <div className="flex items-center justify-between text-xs text-sky-200 font-mono">
            <span>Lat: {currentCoords.lat.toFixed(6)}</span>
            <span>Lng: {currentCoords.lng.toFixed(6)}</span>
            <span className="text-emerald-400">Akurasi: ±{currentCoords.accuracy}m</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin size={16} className="text-rose-400 shrink-0" />
              <span className="truncate">Status Sesi: {trackingStatus}</span>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {activeSessionId ? `Session #${activeSessionId.slice(-6)}` : "Standalone"}
            </span>
          </div>
        </div>

        {/* Last Check-in summary */}
        <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
          <span>Check-in Terakhir:</span>
          <strong className="text-slate-900">{lastCheckIn}</strong>
        </div>
      </div>

      {/* Manual Check-in Form (For basements or weak GPS) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold font-display text-slate-900">
          Check-In Checkpoint Manual
        </h2>
        <p className="text-xs text-slate-500">
          Gunakan jika Anda berada di area basement, apartemen bertingkat, atau saat sinyal GPS terhalang.
        </p>

        <form onSubmit={handleManualCheckIn} className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder="Contoh: Lobi Tower Kemuning Lt. Dasar..."
            value={checkpointInput}
            onChange={(e) => setCheckpointInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-sm transition shrink-0"
          >
            Check-In
          </button>
        </form>
      </div>

      {/* Check-In History Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold font-display text-slate-900">
          Riwayat Perjalanan Hari Ini
        </h2>

        <div className="space-y-3 pt-1">
          {checkpointHistory.map((cp, idx) => (
            <div key={cp.id} className="flex items-start gap-3 text-xs">
              <div className="relative flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-[#0F4C81] flex items-center justify-center font-bold text-[10px]">
                  {idx + 1}
                </div>
                {idx < checkpointHistory.length - 1 && (
                  <div className="w-0.5 h-8 bg-slate-200 my-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 truncate">{cp.location}</p>
                  <span className="text-[11px] text-slate-400 font-semibold">{cp.time}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {cp.type === "AUTO_GPS" ? "Pencatatan Otomatis GPS" : "Check-in Manual Teknisi"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Assistance SOS Button */}
      <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 space-y-3">
        <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
          <Warning size={20} weight="fill" className="text-rose-600" />
          <span>Bantuan Darurat & Kendala Kendaraan</span>
        </div>
        <p className="text-xs text-rose-800">
          Jika Anda mengalami kecelakaan, ancaman keamanan, atau motor mogok di perjalanan, tekan tombol di bawah.
        </p>

        <button
          type="button"
          onClick={() => setShowSosModal(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#F43F5E] hover:bg-rose-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
        >
          <Warning size={18} weight="bold" />
          <span>Kirim Sinyal Darurat SOS / Kendala</span>
        </button>
      </div>

      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-display text-rose-900 flex items-center gap-1.5">
                <Warning size={20} weight="fill" className="text-rose-600" />
                Peringatan Darurat
              </h3>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jenis Masalah:
                </label>
                <select
                  value={sosType}
                  onChange={(e) => setSosType(e.target.value as typeof sosType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                >
                  <option value="VEHICLE_BREAKDOWN">Kendaraan Rusak / Ban Bocor / Mogok</option>
                  <option value="ACCIDENT">Insiden Kecelakaan di Jalan</option>
                  <option value="SECURITY_THREAT">Keadaan Darurat Lapangan / Keamanan</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Detail Lokasi & Kebutuhan Bantuan:
                </label>
                <textarea
                  value={sosDetails}
                  onChange={(e) => setSosDetails(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendSOS}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F43F5E] text-white hover:bg-rose-600 shadow-sm"
              >
                Pancarkan SOS Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
