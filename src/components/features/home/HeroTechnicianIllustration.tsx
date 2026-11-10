"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle,
  Wrench,
  Certificate,
  Lightning,
  Snowflake,
  GearSix,
} from "@phosphor-icons/react";

/**
 * Ilustrasi vektor animasi unik Teknisi Servio menggunakan GPU CSS animations murni
 * agar scroll halaman tetap sangat halus tanpa beban JS framer-motion frame-by-frame.
 */
export function HeroTechnicianIllustration() {
  return (
    <div className="relative w-full max-w-[440px] mx-auto h-[340px] sm:h-[385px] flex items-center justify-center select-none">
      {/* 1. Ambient Halo & Lightweight Expanding Sonar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-68 h-68 sm:w-76 sm:h-76 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.20) 0%, rgba(244,63,94,0.10) 55%, transparent 72%)",
          }}
        />
        <div className="animate-servio-wave absolute w-60 h-60 sm:w-68 sm:h-68 rounded-full border border-sky-300/35" />
      </div>

      {/* 2. Kinetic Orbital Rings (GPU CSS Spin) */}
      <svg
        viewBox="0 0 400 400"
        className="animate-servio-spin absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <circle
          cx="200"
          cy="200"
          r="164"
          fill="none"
          stroke="rgba(224, 242, 254, 0.28)"
          strokeWidth="1.5"
          strokeDasharray="10 10"
        />
        <circle cx="200" cy="36" r="5" fill="#FB7185" />
        <circle cx="364" cy="200" r="4" fill="#38BDF8" />
        <circle cx="36" cy="200" r="4" fill="#FBBF24" />
      </svg>

      <svg
        viewBox="0 0 400 400"
        className="animate-servio-spin-reverse absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <circle
          cx="200"
          cy="200"
          r="128"
          fill="none"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.2"
          strokeDasharray="5 8"
        />
        <circle cx="200" cy="328" r="4" fill="#34D399" />
      </svg>

      {/* 3. Interlocking Mechanical Gears */}
      <div className="animate-servio-spin-fast absolute top-5 right-10 sm:right-12 text-sky-200/80 pointer-events-none">
        <GearSix size={42} weight="duotone" />
      </div>
      <div className="animate-servio-spin-reverse absolute top-[46px] right-[18px] sm:right-[24px] text-rose-300/85 pointer-events-none">
        <GearSix size={24} weight="fill" />
      </div>

      {/* Orbiting Technical Badges */}
      <div
        className="animate-servio-float absolute left-2 sm:left-3 bottom-24 w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-sky-200 shadow-md"
        title="Servis AC & Pendingin"
      >
        <Snowflake size={18} weight="duotone" />
      </div>

      <div
        className="animate-servio-float-alt absolute right-2 sm:right-3 top-34 w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-amber-300 shadow-md"
        title="Instalasi Listrik & Elektronik"
      >
        <Lightning size={18} weight="fill" />
      </div>

      {/* 4. Karakter Utama Vektor Teknisi Servio (SVG) */}
      <div className="animate-servio-float relative z-10 w-58 sm:w-64">
        <svg
          viewBox="0 0 320 340"
          className="w-full h-auto"
          role="img"
          aria-label="Ilustrasi Teknisi Profesional Servio membawa tablet diagnosa dan kunci perbaikan"
        >
          <defs>
            <linearGradient id="servioVestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A64A3" />
              <stop offset="100%" stopColor="#0B3860" />
            </linearGradient>
            <linearGradient id="servioTabletScreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#BAE6FD" />
            </linearGradient>
            <linearGradient id="servioWrenchMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="55%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </linearGradient>
          </defs>

          {/* Podium Lingkaran Platform Teknisi */}
          <ellipse cx="160" cy="308" rx="108" ry="20" fill="#082846" fillOpacity="0.55" />
          <ellipse cx="160" cy="303" rx="94" ry="15" fill="#38BDF8" fillOpacity="0.22" stroke="#7DD3FC" strokeWidth="1.5" strokeOpacity="0.45" />

          {/* Badan / Kemeja & Rompi Teknisi */}
          <path d="M94 295 C94 235, 114 202, 160 202 C206 202, 226 235, 226 295 Z" fill="#F1F5F9" />
          <path
            d="M108 296 C108 232, 122 204, 160 204 C198 204, 212 232, 212 296 L186 296 L186 226 L134 226 L134 296 Z"
            fill="url(#servioVestGrad)"
          />
          <path d="M134 206 L160 242 L186 206" fill="none" stroke="#F43F5E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="114" y="264" width="18" height="4" rx="2" fill="#38BDF8" />
          <rect x="188" y="264" width="18" height="4" rx="2" fill="#38BDF8" />

          {/* Lencana ID Card Teknisi */}
          <rect x="172" y="238" width="22" height="14" rx="3" fill="#FFFFFF" />
          <circle cx="179" cy="245" r="3" fill="#0F4C81" />
          <rect x="184" y="243" width="7" height="2" rx="1" fill="#F43F5E" />
          <rect x="184" y="247" width="5" height="1.5" rx="0.75" fill="#94A3B8" />

          {/* Sabuk Perkakas */}
          <rect x="110" y="286" width="100" height="11" rx="4" fill="#1E293B" />
          <rect x="150" y="284" width="20" height="15" rx="3" fill="#F59E0B" />
          <rect x="155" y="288" width="10" height="7" rx="1.5" fill="#1E293B" />

          {/* Leher & Kepala */}
          <rect x="147" y="176" width="26" height="30" rx="10" fill="#F7C9A5" />
          <path d="M147 188 Q160 198 173 188 L173 178 L147 178 Z" fill="#E3AE88" />
          <circle cx="118" cy="146" r="9" fill="#F0BA92" />
          <circle cx="202" cy="146" r="9" fill="#F0BA92" />

          {/* Wajah Ramah Teknisi */}
          <rect x="121" y="100" width="78" height="84" rx="36" fill="#F7C9A5" />
          <path d="M137 132 Q144 128 150 132" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
          <path d="M170 132 Q176 128 183 132" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
          <circle cx="144" cy="142" r="4.2" fill="#172033" />
          <circle cx="176" cy="142" r="4.2" fill="#172033" />
          <circle cx="145.5" cy="140.5" r="1.4" fill="#FFFFFF" />
          <circle cx="177.5" cy="140.5" r="1.4" fill="#FFFFFF" />
          <path d="M148 160 Q160 170 172 160" fill="none" stroke="#9A4B34" strokeWidth="3.2" strokeLinecap="round" />
          <ellipse cx="135" cy="153" rx="5.5" ry="3" fill="#F43F5E" fillOpacity="0.22" />
          <ellipse cx="185" cy="153" rx="5.5" ry="3" fill="#F43F5E" fillOpacity="0.22" />

          {/* Rambut Rapi */}
          <path d="M121 124 C121 104, 134 94, 160 94 C186 94, 199 104, 199 124 C194 114, 180 112, 160 112 C140 112, 126 114, 121 124 Z" fill="#1E293B" />

          {/* Topi Teknisi Servio */}
          <path d="M116 116 C116 80, 136 66, 160 66 C184 66, 204 80, 204 116 Z" fill="#0F4C81" />
          <path d="M138 68 C144 65, 176 65, 182 68 L178 108 L142 108 Z" fill="#1A64A3" />
          <path d="M112 114 Q160 104 214 116 Q162 124 112 114 Z" fill="#F43F5E" />
          <rect x="150" y="79" width="20" height="22" rx="6" fill="#FFFFFF" />
          <path d="M160 84 L166 87 V92 C166 96 160 98.5 160 98.5 C160 98.5 154 96 154 92 V87 Z" fill="#F43F5E" />

          {/* Lengan Kiri + Tablet Diagnosa */}
          <path d="M108 218 C82 228, 72 252, 84 270" fill="none" stroke="#1A64A3" strokeWidth="18" strokeLinecap="round" />
          <circle cx="88" cy="268" r="10" fill="#F7C9A5" />
          <g transform="translate(36, 206) rotate(-8)">
            <rect x="0" y="0" width="64" height="82" rx="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
            <rect x="5" y="7" width="54" height="66" rx="6" fill="url(#servioTabletScreen)" />
            <path d="M12 34 L22 34 L27 22 L33 44 L39 28 L44 34 L52 34" fill="none" stroke="#0F4C81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="12" y="14" width="26" height="5" rx="2.5" fill="#0F4C81" fillOpacity="0.4" />
            <rect x="12" y="52" width="40" height="12" rx="4" fill="#10B981" />
            <path d="M26 58 L30 61 L37 54" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Lengan Kanan + Kunci Pas Mekanik (CSS Animated) */}
          <g className="animate-servio-wrench">
            <path d="M212 218 C240 226, 250 248, 240 264" fill="none" stroke="#1A64A3" strokeWidth="18" strokeLinecap="round" />
            <g transform="translate(232, 166) rotate(22)">
              <rect x="8" y="24" width="12" height="72" rx="5" fill="url(#servioWrenchMetal)" stroke="#475569" strokeWidth="1.5" />
              <circle cx="14" cy="18" r="16" fill="url(#servioWrenchMetal)" stroke="#475569" strokeWidth="1.5" />
              <path d="M7 2 L21 2 L21 16 L14 21 L7 16 Z" fill="#0F4C81" />
              <rect x="7" y="58" width="14" height="28" rx="4" fill="#F43F5E" />
              <line x1="10" y1="65" x2="18" y2="65" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.6" />
              <line x1="10" y1="72" x2="18" y2="72" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.6" />
              <line x1="10" y1="79" x2="18" y2="79" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.6" />
            </g>
            <circle cx="240" cy="256" r="10.5" fill="#F7C9A5" />
          </g>
        </svg>
      </div>

      {/* 5. Tiga Kartu Status Melayang (Crisp Solid Surface, Zero Blur Lag) */}
      <div className="animate-servio-float absolute top-2 right-0 sm:right-2 z-20 px-3 py-2 rounded-2xl bg-white/95 text-neutral-dark shadow-lg border border-sky-100 flex items-center gap-2.5 max-w-[190px]">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} weight="fill" />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-extrabold text-neutral-dark">Escrow 100% Aman</p>
          <p className="text-[10px] text-neutral-slate">Cair setelah selesai</p>
        </div>
      </div>

      <div className="animate-servio-float-alt absolute top-11 left-0 sm:-left-1 z-20 px-3 py-2 rounded-2xl bg-white/95 text-neutral-dark shadow-lg border border-sky-100 flex items-center gap-2.5 max-w-[195px]">
        <div className="w-8 h-8 rounded-xl bg-sky text-primary flex items-center justify-center shrink-0">
          <Wrench size={18} weight="duotone" />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-extrabold text-neutral-dark">Diagnosa Transparan</p>
          <p className="text-[10px] text-emerald-700 font-bold">Rp 185rb • Setujui Biaya</p>
        </div>
      </div>

      <div className="animate-servio-float absolute bottom-2 right-0 sm:right-2 z-20 px-3 py-2 rounded-2xl bg-white/95 text-neutral-dark shadow-lg border border-sky-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Certificate size={18} weight="fill" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-extrabold text-neutral-dark">Teknisi Terkurasi</span>
            <CheckCircle size={12} weight="fill" className="text-primary" />
          </div>
          <p className="text-[10px] text-neutral-slate">KTP, SKCK &amp; Garansi Digital</p>
        </div>
      </div>
    </div>
  );
}
