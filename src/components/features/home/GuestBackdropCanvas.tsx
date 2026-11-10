"use client";

import React from "react";

interface GuestBackdropCanvasProps {
  children: React.ReactNode;
}

/**
 * Kanvas utama beranda guest dengan latar belakang putih polos bersih
 * dan kontainer lebar selaras Navbar (max-w-[1600px]) tanpa ruang kosong kanan-kiri berlebih.
 */
export function GuestBackdropCanvas({ children }: GuestBackdropCanvasProps) {
  return (
    <div className="relative w-full bg-white overflow-x-clip">
      <div className="relative z-10 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-12 md:pb-16">
        {children}
      </div>
    </div>
  );
}

/**
 * Spacer opsional antar section tanpa garis pembatas atau bingkai dekoratif.
 */
export function SectionFlowConnector() {
  return null;
}
