"use client";

import React, { useState } from "react";
import { MagnifyingGlassPlus, X, ArrowsLeftRight } from "@phosphor-icons/react";

export interface MediaItem {
  id: string;
  title: string;
  beforeUrl: string;
  afterUrl: string;
  serviceCategory?: string;
}

export interface MediaGalleryProps {
  items: MediaItem[];
  className?: string;
}

export function MediaGallery({ items, className = "" }: MediaGalleryProps) {
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50); // 0% - 100%

  return (
    <div className={`space-y-4 font-body text-left ${className}`}>
      {/* Grid Thumbnail Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setActiveItem(item);
              setSliderPosition(50);
            }}
            className="group rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-servio-xs hover:shadow-servio-md transition-all cursor-pointer"
          >
            {/* Split Comparison Preview Banner */}
            <div className="relative h-44 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 grid grid-cols-2">
                <div className="relative h-full bg-slate-200 flex items-center justify-center border-r border-white/80">
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-dark/70 text-white z-10 backdrop-blur-sm">
                    Sebelum
                  </span>
                  <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center text-neutral-slate text-xs font-bold">
                    Foto 1
                  </div>
                </div>
                <div className="relative h-full bg-sky-100 flex items-center justify-center">
                  <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/80 text-white z-10 backdrop-blur-sm">
                    Sesudah
                  </span>
                  <div className="w-12 h-12 rounded-full bg-sky-200 flex items-center justify-center text-primary text-xs font-bold">
                    Foto 2
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-neutral-dark/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]">
                <ArrowsLeftRight size={16} weight="bold" />
                <span>Buka Slider Komparasi</span>
              </div>
            </div>

            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-display text-neutral-dark truncate">
                  {item.title}
                </h4>
                {item.serviceCategory && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-neutral-slate">
                    {item.serviceCategory}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-slate flex items-center gap-1">
                <MagnifyingGlassPlus size={14} className="text-primary" />
                Klik untuk interaksi komparasi Before/After
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Before/After Split Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-neutral-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-5 sm:p-6 max-w-2xl w-full bg-white/95 border border-white shadow-servio-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-neutral-dark">
                  {activeItem.title} — Komparasi Hasil Kerja
                </h3>
                <p className="text-xs text-neutral-slate">
                  Geser tuas horizontal untuk membandingkan kondisi sebelum vs sesudah pengerjaan teknisi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="p-1.5 rounded-lg text-neutral-slate hover:text-neutral-dark hover:bg-slate-100 transition-colors"
                title="Tutup Modal"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Split Comparison Canvas */}
            <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-200 select-none border border-slate-300">
              {/* After Layer (Background) */}
              <div className="absolute inset-0 bg-sky-100 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center font-bold">
                    Clean
                  </div>
                  <p className="text-xs font-bold text-emerald-800">
                    KONDISI SESUDAH (Unit Bersih & Servis Selesai)
                  </p>
                </div>
                <span className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-primary text-white shadow-sm">
                  Sesudah
                </span>
              </div>

              {/* Before Layer (Clipped by slider position) */}
              <div
                className="absolute inset-y-0 left-0 bg-slate-300 flex items-center justify-center overflow-hidden border-r-2 border-white shadow-md"
                style={{ width: `${sliderPosition}%` }}
              >
                <div className="w-full text-center space-y-2 px-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center font-bold">
                    Dirty
                  </div>
                  <p className="text-xs font-bold text-amber-900 truncate">
                    KONDISI SEBELUM (Bocor / Kotor)
                  </p>
                </div>
                <span className="absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-dark text-white shadow-sm">
                  Sebelum
                </span>
              </div>

              {/* Divider Handle */}
              <div
                className="absolute top-0 bottom-0 -ml-3 w-6 flex items-center justify-center pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-white shadow-servio-md border border-slate-300 flex items-center justify-center text-primary">
                  <ArrowsLeftRight size={12} weight="bold" />
                </div>
              </div>
            </div>

            {/* Range Slider Control */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full accent-primary cursor-ew-resize"
              />
              <div className="flex justify-between text-[11px] text-neutral-slate font-medium">
                <span>← Lihat 100% Sebelum</span>
                <span>Posisi: {sliderPosition}%</span>
                <span>Lihat 100% Sesudah →</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
