"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, House } from "@phosphor-icons/react";
import Link from "next/link";

export default function CustomerAddressesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3 font-body">
      <CircleNotch size={32} weight="bold" className="animate-spin text-[#0F4C81]" />
      <p className="text-sm font-bold text-slate-800">Mengalihkan ke Buku Alamat Saya di Profil...</p>
      <p className="text-xs text-slate-500 max-w-sm">
        Kelola seluruh alamat pengiriman barang dan lokasi servis teknisi langsung di halaman Profil utama.
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-sky-900 transition"
      >
        <House size={14} weight="bold" />
        <span>Buka Halaman Profil</span>
      </Link>
    </div>
  );
}
