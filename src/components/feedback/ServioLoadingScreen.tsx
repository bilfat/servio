"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface ServioLoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ServioLoadingScreen({
  message = "Menyiapkan Layanan...",
  subMessage = "Memuat data ekosistem SERVIO",
  fullScreen = true,
  size = "md",
  className = "",
}: ServioLoadingScreenProps) {
  const isSmall = size === "sm";

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none ${isSmall ? "p-4" : "p-6"}`}>
      {/* Ambient Pulsing Glow and Orbital Rings */}
      <div className={`relative flex items-center justify-center ${isSmall ? "mb-3" : "mb-5"}`}>
        {/* Soft atmospheric gradient glow */}
        <div className={`absolute -inset-6 bg-gradient-to-tr from-primary/15 via-sky/30 to-secondary/15 rounded-full blur-xl animate-pulse pointer-events-none ${isSmall ? "opacity-60" : "opacity-100"}`} />

        {/* Outer Rotating Double Halo */}
        <div className={`relative flex items-center justify-center ${isSmall ? "w-16 h-16" : "w-28 h-28 sm:w-32 sm:h-32"}`}>
          {/* Subtle Track */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200/50" />

          {/* Clockwise Primary Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/70"
          />

          {/* Counter-clockwise Secondary Accented Spinner */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
            className={`absolute rounded-full border-2 border-transparent border-b-secondary border-l-secondary/50 ${isSmall ? "inset-1" : "inset-2"}`}
          />

          {/* Middle Ambient Ring */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className={`absolute rounded-full bg-sky/30 border border-sky/40 ${isSmall ? "inset-2" : "inset-4"}`}
          />

          {/* Central Frosted Glass Shield with 3D Servio Emblem */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className={`relative rounded-xl bg-white/95 backdrop-blur-md shadow-servio-md border border-white flex items-center justify-center z-10 ${
              isSmall ? "w-9 h-9 p-1.5" : "w-16 h-16 sm:w-18 sm:h-18 p-2.5 rounded-2xl"
            }`}
          >
            <Image
              src="/brand/logo.png"
              alt="SERVIO"
              width={isSmall ? 28 : 54}
              height={isSmall ? 22 : 42}
              className={`w-auto object-contain drop-shadow-xs ${isSmall ? "h-5" : "h-10"}`}
              priority
            />
          </motion.div>
        </div>
      </div>

      {/* Brand Identity */}
      <div className="flex flex-col items-center space-y-1">
        {!isSmall && (
          <span className="font-brand-latin text-[28px] sm:text-[34px] leading-none font-bold text-slate-900 tracking-tight">
            Servio
          </span>
        )}

        {/* Dynamic Loading Message */}
        <p className={`font-semibold text-neutral-slate tracking-wide ${isSmall ? "text-xs" : "text-xs sm:text-sm"}`}>
          {message}
        </p>

        {/* High-tech Precision Shimmer Progress Bar */}
        <div className={`h-1.5 bg-slate-200/80 rounded-full overflow-hidden relative shadow-inner mt-1.5 ${isSmall ? "w-32" : "w-48 sm:w-56"}`}>
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary-light to-secondary rounded-full"
            initial={{ x: "-100%", width: "50%" }}
            animate={{ x: ["-100%", "220%"] }}
            transition={{
              repeat: Infinity,
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Informative Sub-label */}
        {subMessage && (
          <p className="text-[11px] text-neutral-400 font-medium pt-0.5">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className={`w-full flex items-center justify-center ${isSmall ? "min-h-[160px]" : "min-h-[300px]"} ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50/90 backdrop-blur-md ${className}`}
    >
      {content}
    </div>
  );
}
