"use client";

import React from "react";
import Link from "next/link";
import {
  Handshake,
  Briefcase,
  Storefront,
  Truck,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  Wallet,
  Users,
  FileText,
  Clock,
  ClipboardText,
  MapPin,
  Wrench,
  Package,
  ChartLineUp,
} from "@phosphor-icons/react";

const PARTNER_ROLES = [
  {
    id: "provider",
    badge: "Layanan Jasa & Teknisi",
    title: "Provider Jasa (Bengkel, Tim Teknisi & Perusahaan Servis)",
    subtitle:
      "Untuk pemilik usaha jasa perbaikan AC, kelistrikan, pipa/bangunan, kebersihan, lingkungan, maupun bengkel otomotif.",
    href: "/auth/register?type=provider",
    ctaLabel: "Daftar Sebagai Provider Jasa",
    icon: Briefcase,
    iconBoxClass: "bg-sky text-primary border-sky-200",
    accentBorderClass: "hover:border-primary/50",
    ctaClass: "bg-primary hover:bg-primary-dark text-white",
    capabilities: [
      { icon: Wrench, text: "Kelola katalog layanan jasa, biaya survei & tarif transparan" },
      { icon: Users, text: "Kelola tim teknisi lapangan (Worker) dan penugasan order" },
      { icon: MapPin, text: "Atur cakupan area kota/kabupaten & jam operasional bengkel" },
      { icon: ShieldCheck, text: "Sistem persetujuan biaya, bukti foto Before–After & garansi" },
    ],
    requirements: [
      "Akun penanggung jawab (PIC) & verifikasi OTP email aktif",
      "Identitas usaha (NIB / legalitas usaha & alamat operasional)",
      "Dokumen verifikasi penyedia jasa sesuai panduan form",
    ],
  },
  {
    id: "merchant",
    badge: "Penjualan Suku Cadang & Alat",
    title: "Merchant (Toko Suku Cadang / Sparepart & Perkakas)",
    subtitle:
      "Untuk pemilik toko fisik, agen komponen, atau penjual retail sparepart asli seperti Freon, PCB, kompresor, filter, dan perkakas kerja.",
    href: "/auth/register?type=merchant",
    ctaLabel: "Daftar Sebagai Toko Merchant",
    icon: Storefront,
    iconBoxClass: "bg-amber-50 text-amber-700 border-amber-200",
    accentBorderClass: "hover:border-amber-400",
    ctaClass: "bg-amber-600 hover:bg-amber-700 text-white",
    capabilities: [
      { icon: Package, text: "Etalase katalog suku cadang lengkap dengan varian & stok real-time" },
      { icon: Truck, text: "Pengaturan metode pengiriman & pelacakan resi kurir toko" },
      { icon: ShieldCheck, text: "Proteksi transaksi Escrow, garansi barang & manajemen klaim retur" },
      { icon: Wallet, text: "Settlement penjualan & pencairan saldo otomatis ke rekening via S-Pay" },
    ],
    requirements: [
      "Akun penanggung jawab (PIC) & verifikasi OTP email aktif",
      "Informasi toko retail (NIB, alamat toko/gudang & profil brand)",
      "Dokumen usaha toko untuk proses kurasi Admin Operasi",
    ],
  },
  {
    id: "supplier",
    badge: "Pasokan Grosir & Distribusi B2B",
    title: "Supplier / Distributor B2B",
    subtitle:
      "Untuk pabrikan, importir resmi, atau distributor partai besar yang memasok stok suku cadang ke jaringan toko Merchant di Servio.",
    href: "/auth/register?type=supplier",
    ctaLabel: "Daftar Sebagai Supplier B2B",
    icon: Truck,
    iconBoxClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentBorderClass: "hover:border-emerald-400",
    ctaClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    capabilities: [
      { icon: ChartLineUp, text: "Katalog grosir & manajemen inventaris pasokan B2B terpusat" },
      { icon: ClipboardText, text: "Terima pesanan pembelian partai besar dari Merchant terdaftar" },
      { icon: Truck, text: "Kelola fulfillment kargo, pengiriman B2B & dokumen pengiriman" },
      { icon: CheckCircle, text: "Penanganan klaim & retur B2B terstruktur dan tercatat sistem" },
    ],
    requirements: [
      "Akun penanggung jawab (PIC) & verifikasi OTP email resmi perusahaan",
      "Legalitas badan usaha distributor/pabrikan (NIB, NPWP & alamat gudang)",
      "Dokumen kelengkapan distributor resmi untuk verifikasi B2B",
    ],
  },
];

const REGISTRATION_STEPS = [
  {
    step: "01",
    title: "Verifikasi Akun & OTP",
    desc: "Daftarkan akun pemohon dan masukkan kode OTP yang dikirim ke email Anda.",
  },
  {
    step: "02",
    title: "Data PIC & Legalitas",
    desc: "Isi biodata Penanggung Jawab (PIC), NIB, NPWP, dan alamat lokasi usaha.",
  },
  {
    step: "03",
    title: "Unggah Berkas Usaha",
    desc: "Lampirkan dokumen persyaratan yang diminta sesuai jenis kemitraan Anda.",
  },
  {
    step: "04",
    title: "Review & Aktivasi",
    desc: "Tim Admin Operasi meninjau berkas; pantau progres kapan saja via Cek Status.",
  },
];

export default function PartnerRegistrationHubPage() {
  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="space-y-8 pt-2">
        {/* 1. HEADER PENJELASAN PROGRAM KEMITRAAN */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-servio-sm">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky/70 border border-sky-200 text-primary text-xs font-bold uppercase tracking-wider">
              <Handshake size={15} weight="fill" className="text-secondary" />
              <span>Ekosistem Mitra Bisnis Servio</span>
            </span>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-neutral-dark leading-tight">
              Kenali Peran Mitra Sebelum Mendaftar di Servio
            </h1>

            <p className="text-xs sm:text-sm text-neutral-slate leading-relaxed">
              Sebelum masuk ke formulir pendaftaran, pahami terlebih dahulu <strong>3 bagian kemitraan</strong> yang tersedia di platform Servio agar Anda memilih jalur usaha, fitur dashboard, dan persyaratan dokumen yang paling tepat.
            </p>
          </div>

          {/* 3 Keunggulan Ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <ShieldCheck size={20} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-dark">Transaksi Terproteksi Escrow</p>
                <p className="text-[11px] text-neutral-slate mt-0.5 leading-relaxed">
                  Kepastian pembayaran tercatat sejak order diterima hingga pekerjaan selesai atau barang sampai.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white">
              <div className="p-2 rounded-xl bg-sky text-primary shrink-0">
                <Wallet size={20} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-dark">Dompet S-Pay &amp; Settlement Jelas</p>
                <p className="text-[11px] text-neutral-slate mt-0.5 leading-relaxed">
                  Pantau pendapatan bersih, riwayat potongan fee kebijakan, serta tarik dana langsung ke rekening.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white">
              <div className="p-2 rounded-xl bg-rose-50 text-secondary shrink-0">
                <MapPin size={20} weight="duotone" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-dark">Jangkauan Pelanggan Sekota</p>
                <p className="text-[11px] text-neutral-slate mt-0.5 leading-relaxed">
                  Layanan dan etalase produk Anda tampil relevan bagi pelanggan dan mitra di area layanan yang Anda tentukan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. PENJELASAN 3 BAGIAN MITRA */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-extrabold text-neutral-dark">
              Pilih Bagian Kemitraan yang Sesuai Usaha Anda
            </h2>
            <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
              Setiap peran memiliki ruang kerja operasional, fitur manajemen, dan alur transaksi yang disesuaikan dengan model bisnisnya.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PARTNER_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  className={`rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs hover:shadow-servio-md transition-all flex flex-col justify-between space-y-5 ${role.accentBorderClass}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${role.iconBoxClass}`}>
                        <Icon size={26} weight="duotone" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {role.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-display font-extrabold text-neutral-dark leading-snug">
                        {role.title}
                      </h3>
                      <p className="text-xs text-neutral-slate mt-1.5 leading-relaxed">
                        {role.subtitle}
                      </p>
                    </div>

                    {/* Fitur & Hak Akses */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-dark">
                        Fitur Utama yang Didapat:
                      </p>
                      <ul className="space-y-2">
                        {role.capabilities.map((cap, idx) => {
                          const CapIcon = cap.icon;
                          return (
                            <li key={idx} className="flex items-start gap-2 text-xs text-neutral-slate">
                              <CapIcon size={15} weight="duotone" className="text-primary shrink-0 mt-0.5" />
                              <span className="leading-snug">{cap.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Syarat Ringkas */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
                      <p className="text-[11px] font-bold text-neutral-dark flex items-center gap-1.5">
                        <FileText size={13} weight="bold" className="text-primary" />
                        <span>Yang Perlu Disiapkan:</span>
                      </p>
                      <ul className="space-y-1">
                        {role.requirements.map((req, idx) => (
                          <li key={idx} className="text-[11px] text-neutral-slate flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    href={role.href}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-servio-xs transition-colors ${role.ctaClass}`}
                  >
                    <span>{role.ctaLabel}</span>
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. ALUR PENDAFTARAN 4 LANGKAH */}
        <section className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-neutral-dark">
                Alur Verifikasi &amp; Aktivasi Akun Mitra
              </h2>
              <p className="text-xs text-neutral-slate mt-0.5">
                Proses pendaftaran terstruktur agar kualitas dan keamanan mitra di Servio tetap terjaga.
              </p>
            </div>
            <Link
              href="/registration/status"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline shrink-0"
            >
              <Clock size={15} weight="bold" />
              <span>Cek Status Pendaftaran Anda</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {REGISTRATION_STEPS.map((st) => (
              <div
                key={st.step}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-1.5"
              >
                <span className="inline-block text-xs font-mono font-bold text-primary bg-sky/70 px-2.5 py-0.5 rounded-full">
                  Tahap {st.step}
                </span>
                <h3 className="text-sm font-display font-bold text-neutral-dark">{st.title}</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. BANNER BAWAH: CEK STATUS PENDAFTARAN / DAFTAR PELANGGAN */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                Pelacakan Aplikasi Mitra
              </span>
              <h3 className="text-base sm:text-lg font-display font-extrabold text-neutral-dark">
                Sudah Pernah Mengajukan Pendaftaran Mitra?
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Gunakan nomor pendaftaran (<strong>APP-XXXX</strong>), nomor HP, atau email Anda untuk melihat status verifikasi atau mengunggah dokumen revisi.
              </p>
            </div>
            <div>
              <Link
                href="/registration/status"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-primary text-xs font-bold text-neutral-dark hover:text-primary transition-colors"
              >
                <FileText size={16} weight="bold" />
                <span>Cek Status Pendaftaran Mitra</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                Akun Perorangan
              </span>
              <h3 className="text-base sm:text-lg font-display font-extrabold text-neutral-dark">
                Ingin Memesan Jasa atau Membeli Suku Cadang?
              </h3>
              <p className="text-xs text-neutral-slate leading-relaxed">
                Jika Anda bukan pemilik usaha/toko dan hanya ingin memanggil teknisi atau belanja komponen resmi, daftar cepat sebagai Pelanggan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/auth/register?type=customer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-dark text-white text-xs font-bold shadow-xs transition-colors"
              >
                <span>Daftar Sebagai Pelanggan Gratis</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-neutral-dark transition-colors"
              >
                Masuk Akun
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
