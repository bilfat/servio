"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  NavigationArrow,
  ShieldCheck,
  Wrench,
  Camera,
  ClipboardText,
  Hourglass,
  CaretDown,
  CaretUp,
  ArrowRight,
  Sparkle,
  Phone,
  WarningCircle,
  WarningOctagon,
  Package,
  CurrencyCircleDollar,
  Receipt,
  SealCheck,
  Storefront,
  HandCoins,
  MagnifyingGlass,
  Info,
  ShieldStar,
  MapPin,
  CheckSquare,
  XCircle,
  UserCheck,
  SlidersHorizontal,
  Broadcast,
  ArrowsLeftRight,
} from "@phosphor-icons/react";

interface GuideStep {
  number: number;
  title: string;
  badge: string;
  canonicalStatus: string;
  uiStatus: string;
  buttonLabel: string;
  icon: React.ElementType;
  purpose: string;
  contextExamined: string[];
  action: string;
  restrictions?: string[];
  exampleContext?: {
    orderId: string;
    serviceName: string;
    category: string;
    subcategory: string;
    customer: string;
    location: string;
    schedule: string;
    status: string;
    initialPrice: string;
    customerNotes?: string;
  };
  specialSopRules?: string[];
  nextStep: string;
  aftermath: string;
  tip?: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    number: 1,
    title: "Lihat & Terima Tugas",
    badge: "Pemahaman Service Order",
    canonicalStatus: "ASSIGNED",
    uiStatus: "Tugas Baru / Ditugaskan",
    buttonLabel: "Lihat Detail Tugas / Terima Tugas",
    icon: Clock,
    purpose:
      "Memahami ruang lingkup pekerjaan resmi Service Order, identitas pelanggan, keluhan unit, jadwal waktu kunjungan, dan estimasi biaya awal sebelum teknisi berangkat ke lokasi.",
    contextExamined: [
      "Order ID / Service Order ID (kode referensi sah platform)",
      "Nama Layanan & Master Service Provider",
      "Kategori & Subkategori Layanan (misal: Repair & Technical > AC & Cooling)",
      "Nama Pelanggan & Kontak (sesuai izin privasi platform)",
      "Alamat Lengkap Layanan & Titik Akses Lokasi",
      "Jadwal Waktu Kunjungan (Slot Janji Temu)",
      "Metode Servis (On-Site / Home Visit)",
      "Catatan Keluhan Khusus dari Pelanggan",
      "Konteks Harga Estimasi Awal yang boleh dilihat Teknisi",
      "Status Penugasan & Prioritas Pekerjaan",
    ],
    exampleContext: {
      orderId: "SV-2026-00125",
      serviceName: "AC Repair & Maintenance (Split Inverter)",
      category: "Repair & Technical",
      subcategory: "AC & Cooling",
      customer: "Bpk. Andi Wijaya",
      location: "Kebayoran Baru, Jakarta Selatan",
      schedule: "Hari Ini, 10:00 WIB",
      status: "Assigned (Prioritas Normal)",
      initialPrice: "Rp 150.000 (Estimasi Dasar Jasa)",
      customerNotes: "AC kamar utama hanya keluar angin, lampu indikator outdoor tidak menyala.",
    },
    action:
      "Buka kartu tugas di Dashboard atau Daftar Pekerjaan. Pelajari rute dan detail order. Jika proyek memerlukan konfirmasi penerimaan, tekan 'Terima Tugas'.",
    restrictions: [
      "Teknisi TIDAK boleh mengubah status order di luar siklus penugasan yang sah.",
      "Teknisi TIDAK boleh mengubah kategori, subkategori, atau master service provider.",
      "Teknisi TIDAK boleh membuat order fiktif untuk dirinya sendiri.",
    ],
    nextStep: "Persiapkan Pekerjaan & Perlengkapan K3 (Langkah 2).",
    aftermath: "Penugasan terverifikasi aktif, teknisi siap memeriksa perlengkapan kerja.",
    tip: "Hubungi pelanggan via chat/telepon resmi bila alamat memerlukan izin satpam kluster atau tangga tinggi.",
  },
  {
    number: 2,
    title: "Persiapkan Pekerjaan",
    badge: "Kesiapan & K3 Lapangan",
    canonicalStatus: "ASSIGNED (Ready Confirmation)",
    uiStatus: "Siap Tugas",
    buttonLabel: "Siap Berangkat / Konfirmasi Kesiapan Kerja & APD",
    icon: ShieldCheck,
    purpose:
      "Memastikan seluruh perkakas teknis, Alat Pelindung Diri (APD/K3), kendaraan operasional, dan material awal telah siap pakai demi keselamatan kerja dan kelancaran servis.",
    contextExamined: [
      "Peralatan Kerja Teknisi (Toolkit, manifold gauge, digital multitester, pompa steam, vacuum pump)",
      "Standar Keselamatan Kerja & APD (Sarung tangan isolasi listrik, kacamata pelindung, sepatu karet anti-slip, tangga lipat pengaman)",
      "Kondisi Fisik Kendaraan Operasional & BBM",
      "Kebutuhan Material Awal yang sudah tersedia dari bengkel mitra",
      "Catatan Khusus Order & Metode Servis yang Diterapkan",
    ],
    specialSopRules: [
      "Checklist ini adalah checklist operasional kesiapan teknisi, BUKAN Asset taxonomy.",
      "Standar K3 wajib dipatuhi sebelum menyalakan kendaraan menuju lokasi servis.",
      "Jika instalasi kelistrikan di lokasi bertegangan bocor, utamakan keselamatan kerja.",
    ],
    action:
      "Periksa kelengkapan perkakas dan APD. Buka detail tugas, centang checklist kesiapan K3, lalu tekan tombol 'Siap Berangkat / Konfirmasi Kesiapan Kerja & APD'.",
    nextStep: "Mulai Berangkat ke Lokasi Pelanggan (Langkah 3).",
    aftermath: "Status kesiapan operasional tercatat pada sistem monitoring bengkel mitra.",
    tip: "Pastikan multimeter digital memiliki baterai cadangan untuk menguji tegangan kompresor di lokasi.",
  },
  {
    number: 3,
    title: "Berangkat ke Lokasi",
    badge: "Perjalanan Lapangan",
    canonicalStatus: "DISPATCHED",
    uiStatus: "Sedang Menuju Lokasi",
    buttonLabel: "Berangkat / Mulai Berangkat ke Lokasi",
    icon: NavigationArrow,
    purpose:
      "Memberikan notifikasi resmi kepada pelanggan dan sistem dispatch bengkel bahwa teknisi sedang dalam perjalanan menuju lokasi servis.",
    contextExamined: [
      "Alamat Tujuan & Titik Koordinat Peta",
      "Estimasi Waktu Perjalanan (ETA)",
      "Kontak Pelanggan Resmi (sesuai izin panggilan platform)",
      "Referensi Service Order aktif",
    ],
    specialSopRules: [
      "Jika pelacakan lokasi aktif: Sistem menampilkan status 'Pelacakan aktif'.",
      "Jika pelacakan lokasi belum aktif: Sistem menampilkan status 'Pelacakan lokasi tidak aktif'.",
      "Pelacakan lokasi BUKAN syarat mutlak kapabilitas teknisi dan TIDAK mengubah status order secara otomatis.",
      "Dilarang membuat duplicate travel state engine di luar state canonical platform.",
    ],
    action:
      "Tekan tombol 'Mulai Berangkat ke Lokasi'. Buka peta rute (Google Maps) melalui pintasan yang tersedia untuk panduan arah jalan.",
    nextStep: "Check-in & Konfirmasi Tiba di Lokasi (Langkah 4).",
    aftermath:
      "Pelanggan dapat melihat bahwa teknisi sedang bergerak menuju lokasi dengan estimasi tiba yang akurat.",
    tip: "Gunakan fitur 'Info Macet / Telat' jika menghadapi hambatan jalan agar pelanggan tetap tenang menunggu.",
  },
  {
    number: 4,
    title: "Tiba di Lokasi",
    badge: "Check-in & Presensi",
    canonicalStatus: "ARRIVED",
    uiStatus: "Tiba di Lokasi",
    buttonLabel: "Check-in / Saya Sudah Tiba di Lokasi",
    icon: CheckCircle,
    purpose:
      "Mengonfirmasi kedatangan fisik teknisi di lokasi pelanggan secara resmi, melakukan salam ramah standar SERVIO, dan memulai interaksi awal dengan pelanggan.",
    contextExamined: [
      "Nomor Service Order Sah",
      "Nama Pelanggan & Unit yang akan Diservis",
      "Alamat Fisik Lokasi Kedatangan",
      "Jam Tiba Resmi tercatat di Server",
      "GPS Location Confirmation (opsional)",
    ],
    specialSopRules: [
      "Check-in wajib dilakukan saat teknisi benar-benar berada di depan gerbang/lokasi pelanggan.",
      "Setelah check-in, status operasional beralih ke ARRIVED sesuai canonical state.",
      "Teknisi TIDAK boleh melompati state langsung ke pengerjaan tanpa presensi kedatangan.",
    ],
    action:
      "Saat tiba, tekan tombol 'Check-in / Saya Sudah Tiba di Lokasi'. Berikan salam santun, perkenalkan diri dari bengkel mitra SERVIO, dan minta izin memeriksa unit.",
    nextStep: "Lakukan Diagnosis & Dokumentasi Fisik (Langkah 5).",
    aftermath:
      "Layanan berpindah ke fase inspeksi fisik, modul lembar kerja teknis resmi aktif di aplikasi.",
    tip: "Tanyakan apakah unit sedang menyala atau ada gejala bau hangus/suara berdengung sebelum menyalakan MCB.",
  },
  {
    number: 5,
    title: "Diagnosis & Pemeriksaan",
    badge: "Inspeksi Fisik Unit",
    canonicalStatus: "ARRIVED -> DIAGNOSIS",
    uiStatus: "Diagnosis / Inspeksi Fisik",
    buttonLabel: "Mulai Diagnosis Fisik di Lokasi / Simpan Temuan",
    icon: Wrench,
    purpose:
      "Melakukan pemeriksaan teknis menyeluruh terhadap unit pelanggan di lokasi sebelum melakukan tindakan perbaikan, mendokumentasikan temuan, dan merumuskan solusi.",
    contextExamined: [
      "Pemeriksaan Visual Unit (kebocoran, karat, kotoran, getaran)",
      "Pengukuran Teknis Aktual (tekanan refrigeran PSI, arus ampere, tegangan voltase, suhu evaporator)",
      "Pengecekan Komponen Kritis (kapasitor starting, motor fan, PCB modul, sensor thermistor)",
      "Bukti Foto Kondisi Sebelum Servis & Layar Alat Ukur Digital",
      "Catatan Rekomendasi Solusi & Kebutuhan Tambahan",
    ],
    exampleContext: {
      orderId: "SV-2026-00125",
      serviceName: "AC Repair & Maintenance",
      category: "Repair & Technical",
      subcategory: "AC & Cooling",
      customer: "Bpk. Andi Wijaya",
      location: "Kebayoran Baru, Jakarta Selatan",
      schedule: "10:00 WIB",
      status: "Diagnosis Berlangsung",
      initialPrice: "Rp 150.000",
      customerNotes:
        "Temuan aktual: Tekanan freon rendah (35 PSI karena nepel outdoor kendor) & kapasitor melembung.",
    },
    specialSopRules: [
      "Worker HANYA mendiagnosis dan merekomendasikan solusi teknis.",
      "Worker TIDAK berwenang menyetujui atau mengunci harga secara sepihak.",
      "Wajib mengambil foto bukti fisik kondisi rusak sebelum dibongkar lebih jauh.",
    ],
    action:
      "Tekan 'Mulai Diagnosis Fisik di Lokasi'. Lakukan uji fisik, input temuan teknis pada form, unggah foto bukti pengukuran, dan simpan temuan diagnosis.",
    restrictions: [
      "Dilarang membongkar komponen berisiko tanpa mencatat kondisi awal.",
      "Dilarang langsung memvonis ganti unit tanpa bukti data pengukuran konkret.",
    ],
    nextStep: "Konfirmasi Kebutuhan Perubahan Biaya / Material (Langkah 6).",
    aftermath:
      "Dokumen diagnosis tersimpan pada Service Order dan siap dievaluasi untuk kebutuhan penyesuaian biaya atau suku cadang.",
    tip: "Gunakan kamera ponsel dengan pencahayaan jelas saat mengambil foto plat spesifikasi dan jarum manifold gauge.",
  },
  {
    number: 6,
    title: "Konfirmasi Perubahan Biaya & Material",
    badge: "Persetujuan Pelanggan",
    canonicalStatus: "PRICE_ADJUSTMENT_PENDING / WAITING_APPROVAL / WAITING_SPAREPART",
    uiStatus: "Menunggu Persetujuan Pelanggan",
    buttonLabel: "Ajukan Rekomendasi / Tunggu Persetujuan Pelanggan",
    icon: Receipt,
    purpose:
      "Memastikan setiap penyesuaian biaya jasa (Price Adjustment) atau kebutuhan suku cadang (Sparepart/Product) disetujui secara resmi oleh Pelanggan sebelum pekerjaan dilanjutkan.",
    contextExamined: [
      "Komponen Jasa Tambahan (Additional Service Fee) hasil temuan teknis",
      "Kebutuhan Suku Cadang: 1) Provider-Owned, 2) Toko Mitra Partner, 3) Bawaan Pelanggan",
      "Mode Kehadiran Pelanggan (Hadir Langsung di Lokasi vs Tidak Hadir / Remote)",
      "Persetujuan Otorisasi Provider jika penyesuaian biaya melebihi ambang batas policy",
      "Status Kesiapan & Pengiriman Material Suku Cadang",
    ],
    specialSopRules: [
      "PEMISAHAN WEWENANG HARGA (PRICE ADJUSTMENT): Pelanggan adalah EXCLUSIVE APPROVAL OWNER untuk seluruh penyesuaian biaya.",
      "Worker TIDAK BOLEH: Menyetujui harga atas nama pelanggan, memaksakan approval, menganggap proposal otomatis deal, atau mengubah nominal invoice secara sepihak.",
      "ATURAN STOP: 'Jika biaya berubah berdasarkan hasil diagnosis, ikuti proses persetujuan harga resmi pada Service Order. JANGAN mulai pekerjaan yang membutuhkan biaya tambahan sebelum approval yang dipersyaratkan telah diterima.'",
      "ALUR SUKU CADANG (SPAREPART FLOW): Kebutuhan part dicatat -> Dipilih sumber part yang sah -> Pelanggan menyetujui -> Pengadaan/pengiriman -> Material siap di lokasi -> Teknisi menggunakannya.",
      "SERVICE BLOCKING RULE: Jika suku cadang bersifat WAJIB (Mandatory) dan belum tersedia/disetujui, pengerjaan WAJIB DITAHAN (MANDATORY_PART_BLOCKED). Dilarang keras memaksakan pengerjaan tanpa part yang dibutuhkan!",
    ],
    action:
      "Jika ada biaya tambahan atau part: Susun rincian kebutuhan pada lembar kerja. Jika Pelanggan hadir, minta beliau memeriksa dan menyetujui di aplikasi. Jika tidak hadir, kirim permintaan persetujuan remote. Tunggu konfirmasi resmi sebelum mulai!",
    restrictions: [
      "Dilarang meminta uang tunai di luar sistem Servio untuk pembayaran invoice resmi.",
      "Dilarang memasang suku cadang tanpa persetujuan sumber dan harga oleh pelanggan.",
    ],
    nextStep: "Kerjakan Layanan Sesuai SOP (Langkah 7).",
    aftermath:
      "Biaya dan ketersediaan material telah terkunci secara sah, risiko sengketa biaya tereliminasi.",
    tip: "Jelaskan dengan ramah manfaat suku cadang original agar pelanggan memahami pentingnya komponen berkualitas.",
  },
  {
    number: 7,
    title: "Kerjakan Layanan",
    badge: "Eksekusi SOP & Penggunaan Material",
    canonicalStatus: "IN_PROGRESS",
    uiStatus: "Sedang Dikerjakan",
    buttonLabel: "Mulai Pengerjaan Servis / Lanjutkan Checklist SOP",
    icon: Wrench,
    purpose:
      "Melaksanakan perbaikan atau perawatan teknis secara menyeluruh sesuai langkah checklist SOP resmi bengkel mitra dan mencatat pemakaian suku cadang aktual.",
    contextExamined: [
      "Checklist Tahapan Teknis SOP (Pembersihan, pengelasan kebocoran, vakum sistem, isi refrigeran, uji kelistrikan)",
      "Pencatatan Material Terpasang (Status: USED / RETURNED_TO_SHOP)",
      "Pengujian Fungsi Unit (Running Test 10-15 Menit)",
      "Kerapian & Kebersihan Area Kerja Pelanggan",
      "Pemberitahuan Kendala (Tombol 'Lapor Kendala' jika terjadi hambatan tak terduga)",
    ],
    specialSopRules: [
      "Setiap langkah SOP wajib dicentang secara bertahap seiring pelaksanaan kerja fisik.",
      "Seluruh suku cadang yang dipasang wajib dicatat nomor seri atau nama komponennya di menu Material.",
      "Sisa material bengkel yang tidak terpakai wajib ditandai RETURNED_TO_SHOP.",
      "Jika terjadi bahaya keselamatan mendadak, teknisi berhak menahan status dengan tombol 'Lapor Kendala'.",
    ],
    action:
      "Tekan 'Mulai Pengerjaan Servis'. Kerjakan checklist SOP satu per satu. Pasang sparepart yang telah disetujui dan catat di modul Material. Jalankan running test unit.",
    nextStep: "Selesaikan & Serahkan Bukti Pekerjaan (Langkah 8).",
    aftermath:
      "Progres pengerjaan terekam transparan di dashboard monitoring provider dan aplikasi pelanggan.",
    tip: "Selalu bersihkan tetesan air atau debu di lantai sebelum mematikan alat kerja Anda.",
  },
  {
    number: 8,
    title: "Selesaikan & Serahkan Bukti Pekerjaan",
    badge: "Serah Terima Bukti",
    canonicalStatus: "PROOF_SUBMITTED",
    uiStatus: "Menunggu Konfirmasi Pelanggan",
    buttonLabel: "Unggah Bukti Pengerjaan & SOP / Kirim Bukti & Ajukan Selesai",
    icon: ClipboardText,
    purpose:
      "Menyerahkan hasil pengerjaan secara resmi ke platform dengan bukti otentik Before & After, parameter teknis digital, dan pengajuan penyelesaian servis.",
    contextExamined: [
      "Foto Dokumentasi Before & After Unit",
      "Parameter Pengukuran Akhir (Suhu hembusan dingin, arus ampere running, tekanan pipa)",
      "Formulir Checklist SOP yang Tercentang Lengkap",
      "Tanda Tangan Digital Serah Terima Pelanggan (jika pelanggan hadir di tempat)",
      "Catatan Edukasi Perawatan untuk Pelanggan",
    ],
    specialSopRules: [
      "BATASAN WEWENANG PENYELESAIAN (COMPLETION BOUNDARY):",
      "Teknisi HANYA mengajukan penyelesaian (Submit Proof / PROOF_SUBMITTED).",
      "Teknisi BUKAN pemilik penyelesaian transaksi keuangan akhir (Final Financial Completion).",
      "Setelah tombol ditekan, tanggung jawab operasional teknisi lapangan telah tuntas.",
      "Alur selanjutnya berpindah ke konfirmasi pelanggan, pelepasan escrow, dan aktivasi garansi resmi secara otomatis.",
    ],
    action:
      "Tekan tombol 'Unggah Bukti Pengerjaan & SOP'. Masukkan foto Before/After, parameter suhu dan ampere, mintakan tanda tangan serah terima, lalu tekan 'Kirim Bukti & Ajukan Selesai'.",
    restrictions: [
      "Dilarang menandatangani tanda tangan digital atas nama pelanggan sendiri.",
      "Dilarang mengunggah foto palsu atau foto dari pekerjaan servis lain.",
    ],
    nextStep: "Layanan Selesai di Sisi Teknisi — Sistem memproses Konfirmasi & Escrow.",
    aftermath:
      "Lembar kerja teknisi dikunci resmi. Teknisi dapat kembali ke dashboard untuk mengambil tugas berikutnya.",
    tip: "Tunjukkan parameter suhu dingin termometer digital kepada pelanggan sebelum berpamitan dengan sopan.",
  },
];

export default function WorkerGuidePage() {
  const [activeTab, setActiveTab] = useState<"STEPS" | "ROLE_LOCK" | "COST_MATERIAL" | "POST_SERVICE">("STEPS");
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpand = (stepNum: number) => {
    setExpandedStep((prev) => (prev === stepNum ? null : stepNum));
  };

  const expandAll = () => setExpandedStep(-1);
  const collapseAll = () => setExpandedStep(null);

  // Filtered steps based on search query
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_STEPS;
    const q = searchQuery.toLowerCase();
    return GUIDE_STEPS.filter(
      (step) =>
        step.title.toLowerCase().includes(q) ||
        step.purpose.toLowerCase().includes(q) ||
        step.badge.toLowerCase().includes(q) ||
        step.canonicalStatus.toLowerCase().includes(q) ||
        step.uiStatus.toLowerCase().includes(q) ||
        step.contextExamined.some((c) => c.toLowerCase().includes(q)) ||
        (step.specialSopRules && step.specialSopRules.some((r) => r.toLowerCase().includes(q)))
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 pb-28 max-w-3xl mx-auto font-body text-left">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/worker/dashboard"
            className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs transition shrink-0"
            title="Kembali ke Dashboard Pekerjaan"
          >
            <ArrowLeft size={18} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C81]">
              <BookOpen size={15} weight="bold" />
              <span>SOP OPERASIONAL TEKNISI RESMI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
              Panduan Alur Pengerjaan Servis
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/worker/jobs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Wrench size={14} weight="bold" />
            <span>Daftar Pekerjaan</span>
          </Link>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-sky-50 text-[#0F4C81] border border-sky-200 font-bold">
            v2.6 Locked Flow
          </span>
        </div>
      </div>

      {/* 2. Banner Arsitektur Service Order */}
      <div className="bg-gradient-to-br from-[#0F4C81] via-sky-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-sky-200 text-[10px] font-bold uppercase tracking-wider">
              <Sparkle size={13} weight="fill" className="text-amber-300" />
              <span>Satu Siklus Service Order Terpadu</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold font-display leading-snug">
              Prinsip Operasional Teknisi di Platform SERVIO
            </h2>
          </div>
          <ShieldStar size={32} weight="duotone" className="text-sky-300 shrink-0 hidden sm:block" />
        </div>

        <p className="text-xs sm:text-[13px] text-sky-100/90 leading-relaxed">
          Teknisi berfokus pada <strong>eksekusi lapangan berkualitas tinggi</strong> dan mengonsumsi konteks resmi <strong>Service Order</strong>. Seluruh tindakan di aplikasi—mulai dari penerimaan tugas, diagnosis fisik, penyesuaian biaya, hingga serah terima bukti—berada di bawah satu payung kontrak pesanan resmi.
        </p>

        {/* Master Canonical Flow Chain Diagram */}
        <div className="bg-white/10 rounded-2xl p-3 sm:p-4 border border-white/15 backdrop-blur-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 block">
            Rantai Hubungan Service Order:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-white">
            <span className="px-2 py-0.5 rounded bg-white/15">Pelanggan (Booking)</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15">Mitra Provider (Terima)</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">Service Order</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15">Penugasan Teknisi</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/80 text-white font-bold">8 Langkah Eksekusi Lapangan</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-white/15">Kirim Bukti Selesai</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-sky-400/30 text-sky-100">Konfirmasi Pelanggan</span>
            <span className="text-sky-300">→</span>
            <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold">Escrow &amp; Garansi</span>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigasi & Search Bar */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("STEPS")}
            className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "STEPS"
                ? "bg-white text-[#0F4C81] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckSquare size={16} weight={activeTab === "STEPS" ? "fill" : "bold"} />
            <span>8 Langkah SOP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ROLE_LOCK")}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "ROLE_LOCK"
                ? "bg-white text-rose-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck size={16} weight={activeTab === "ROLE_LOCK" ? "fill" : "bold"} />
            <span>Batasan Wewenang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COST_MATERIAL")}
            className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "COST_MATERIAL"
                ? "bg-white text-violet-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={16} weight={activeTab === "COST_MATERIAL" ? "fill" : "bold"} />
            <span>Biaya &amp; Sparepart</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POST_SERVICE")}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "POST_SERVICE"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <SealCheck size={16} weight={activeTab === "POST_SERVICE" ? "fill" : "bold"} />
            <span>Garansi &amp; Escrow</span>
          </button>
        </div>

        {/* Search Bar & Quick Controls (Visible on STEPS tab) */}
        {activeTab === "STEPS" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari SOP (cth: diagnosis, K3, APD, biaya, freon, check-in)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F4C81] focus:border-transparent transition shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold self-end sm:self-auto">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 8 LANGKAH OPERASIONAL (MAIN WORKER STEPS) */}
      {/* ========================================================================= */}
      {activeTab === "STEPS" && (
        <div className="space-y-4">
          {filteredSteps.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <WarningCircle size={32} weight="duotone" className="mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-800">Tidak ada SOP yang sesuai kata kunci &quot;{searchQuery}&quot;</p>
              <p className="text-xs">Coba kata kunci lain atau bersihkan pencarian untuk melihat seluruh 8 langkah.</p>
            </div>
          ) : (
            filteredSteps.map((step) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === -1 || expandedStep === step.number;

              return (
                <div
                  key={step.number}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                    isExpanded
                      ? "border-[#0F4C81] ring-1 ring-sky-300 shadow-sm"
                      : "border-slate-200/80 shadow-xs hover:border-slate-300"
                  }`}
                >
                  {/* Step Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(step.number)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 transition ${
                          isExpanded
                            ? "bg-[#0F4C81] text-white shadow-xs"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <span>{step.number}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold text-[#0F4C81] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            {step.badge}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                            Status: {step.canonicalStatus}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold font-display text-slate-900">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden md:inline-block ${
                          step.canonicalStatus.includes("COMPLETED")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : step.canonicalStatus.includes("PRICE") || step.canonicalStatus.includes("WAITING")
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {step.uiStatus}
                      </span>
                      <CaretDown
                        size={18}
                        weight="bold"
                        className={`text-slate-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-[#0F4C81]" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Step Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 space-y-4 border-t border-slate-100 pt-4 text-xs">
                      {/* Tujuan & Fungsi */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Tujuan &amp; Fungsi SOP:
                        </span>
                        <p className="text-slate-800 leading-relaxed font-medium text-xs sm:text-[13px]">
                          {step.purpose}
                        </p>
                      </div>

                      {/* Konteks yang Dipelajari / Diperiksa */}
                      {step.contextExamined && step.contextExamined.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] flex items-center gap-1.5">
                            <Info size={14} weight="bold" />
                            Konteks Service Order yang Wajib Dipahami:
                          </span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700">
                            {step.contextExamined.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                                <span className="text-sky-600 shrink-0 font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Contoh Visual Kartu Konteks Service Order (Step 1 & Step 5) */}
                      {step.exampleContext && (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Contoh Konteks Nyata pada Aplikasi:
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">
                              {step.exampleContext.orderId}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Layanan</span>
                              <strong className="text-slate-900 block truncate">{step.exampleContext.serviceName}</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Kategori</span>
                              <span className="text-slate-700 block truncate">{step.exampleContext.category} &gt; {step.exampleContext.subcategory}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Pelanggan</span>
                              <strong className="text-slate-900 block truncate">{step.exampleContext.customer}</strong>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Lokasi Servis</span>
                              <span className="text-slate-700 block truncate">{step.exampleContext.location}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Jadwal</span>
                              <span className="text-slate-700 block truncate">{step.exampleContext.schedule}</span>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Estimasi Dasar</span>
                              <strong className="text-emerald-700 block truncate">{step.exampleContext.initialPrice}</strong>
                            </div>
                          </div>

                          {step.exampleContext.customerNotes && (
                            <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900">
                              <strong>Keluhan Pelanggan: </strong>
                              &quot;{step.exampleContext.customerNotes}&quot;
                            </div>
                          )}
                        </div>
                      )}

                      {/* Aturan Khusus SOP */}
                      {step.specialSopRules && step.specialSopRules.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                            <WarningCircle size={14} weight="fill" className="text-amber-600" />
                            Aturan Mutlak SOP &amp; Kebijakan Platform:
                          </span>
                          <ul className="space-y-1 text-[11px] text-amber-950">
                            {step.specialSopRules.map((rule, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-amber-700 font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Yang Harus Dilakukan Teknisi */}
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block">
                          Tindakan Teknisi di Aplikasi:
                        </span>
                        <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px]">{step.action}</p>
                      </div>

                      {/* Larangan Khusus Step Ini */}
                      {step.restrictions && step.restrictions.length > 0 && (
                        <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-950 space-y-1 text-[11px]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                            <XCircle size={14} weight="fill" className="text-rose-600" />
                            Larangan Khusus:
                          </span>
                          <ul className="space-y-0.5">
                            {step.restrictions.map((res, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-rose-600 font-bold shrink-0">✕</span>
                                <span>{res}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action & Status Meta Table */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-100">
                          <span className="text-[10px] text-slate-500 block font-semibold">
                            Tombol Aksi Resmi yang Digunakan:
                          </span>
                          <strong className="text-[#0F4C81] font-display text-xs">
                            &quot;{step.buttonLabel}&quot;
                          </strong>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">
                            Status yang Ditampilkan di Dashboard:
                          </span>
                          <strong className="text-slate-900 font-display text-xs">
                            &quot;{step.uiStatus}&quot; ({step.canonicalStatus})
                          </strong>
                        </div>
                      </div>

                      {/* Aftermath & Next Step */}
                      <div className="space-y-1 pt-1 text-[11px]">
                        <p className="text-slate-600">
                          <strong>Setelah Langkah Ini Dijalankan: </strong>
                          {step.aftermath}
                        </p>
                        <p className="text-[#0F4C81] font-semibold flex items-center gap-1">
                          <ArrowRight size={13} weight="bold" />
                          <span>Langkah Berikutnya: {step.nextStep}</span>
                        </p>
                      </div>

                      {/* Pro Tip */}
                      {step.tip && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
                          <Sparkle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Tips Teknisi Ahli: </strong>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BATASAN WEWENANG (ABSOLUTE ROLE LOCK) */}
      {/* ========================================================================= */}
      {activeTab === "ROLE_LOCK" && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} weight="fill" className="text-emerald-400" />
              <h2 className="text-base font-bold font-display uppercase tracking-wide">
                Absolute Role Lock — Batasan Wewenang Teknisi
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Teknisi hanya menjalankan pekerjaan operasional lapangan dan mengonsumsi konteks Service Order. Teknisi bukan pemilik otorisasi komersial bengkel dan bukan pembeli atas nama pelanggan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hak & Wewenang Sah (BOLEH) */}
            <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-emerald-950">
                    Hak &amp; Wewenang Teknisi
                  </h3>
                  <span className="text-[10px] font-semibold text-emerald-700">Tindakan Resmi yang Diizinkan</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Melihat tugas yang ditugaskan &amp; rincian Service Order lengkap.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Melihat detail Pelanggan &amp; keluhan unit sesuai izin privasi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Melihat rujukan awal persiapan dari Provider &amp; sistem AI.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mengisi hasil diagnosis fisik di lokasi &amp; mengunggah bukti multitester/foto.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mencatat kebutuhan pekerjaan tambahan &amp; merekomendasikan suku cadang.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Menggunakan material bengkel mitra atau toko rekanan yang sah &amp; disetujui.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Memperbarui status operasional yang sah (Berangkat, Check-in, Kerjakan, Bukti).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Menjalankan checklist teknis SOP servis di lapangan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mengunggah bukti hasil pekerjaan Before &amp; After.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={15} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mengajukan penyelesaian pekerjaan (Submit Proof).</span>
                </li>
              </ul>
            </div>

            {/* Larangan Mutlak (TIDAK BOLEH) */}
            <div className="bg-white rounded-3xl border border-rose-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                  ✕
                </div>
                <div>
                  <h3 className="text-sm font-bold font-display text-rose-950">
                    Larangan Mutlak Teknisi
                  </h3>
                  <span className="text-[10px] font-semibold text-rose-700">Dilarang Keras oleh Platform</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengubah global Category, Subcategory, atau Master Service Provider.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengubah harga jasa atau total tagihan invoice secara sepihak.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Menyetujui Price Adjustment atas nama Pelanggan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Menganggap proposal usulan biaya otomatis disetujui tanpa konfirmasi resmi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengapprove atau memproses status pembayaran Pelanggan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengubah invoice Customer atau invoice Merchant mitra.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengubah Affiliate Fee, Reward Policy, atau Order Policy.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Membatalkan pesanan sepihak hanya karena pelacakan (GPS) nonaktif.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Mengakses data pelacakan atau lembar kerja teknisi lain.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle size={15} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                  <span>Membuat Service Order untuk dirinya sendiri tanpa alur yang sah.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATURAN BIAYA & MATERIAL (PRICE ADJUSTMENT & SPAREPART) */}
      {/* ========================================================================= */}
      {activeTab === "COST_MATERIAL" && (
        <div className="space-y-4">
          {/* Section Penyesuaian Harga */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CurrencyCircleDollar size={24} weight="duotone" className="text-violet-700" />
              <div>
                <h3 className="text-sm sm:text-base font-bold font-display text-slate-900">
                  Pemisahan Peran Penyesuaian Biaya (Price Adjustment)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Keputusan penyesuaian biaya berdasarkan hasil diagnosis di lokasi
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-2 text-xs leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <WarningOctagon size={16} weight="fill" className="text-amber-700" />
                <span>Prinsip Otoritas Mutlak Pelanggan:</span>
              </div>
              <p>
                <strong>Pelanggan adalah Exclusive Approval Owner untuk penyesuaian harga.</strong> Teknisi hanya mengajukan temuan dan usulan penyesuaian. Teknisi DILARANG memulai pekerjaan yang memerlukan biaya tambahan sebelum persetujuan resmi diterima di sistem.
              </p>
            </div>

            {/* Price Adjustment Flow Chart */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Alur Resmi Penyesuaian Harga:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-800 font-bold inline-flex items-center justify-center text-[10px]">1</span>
                  <strong className="block text-slate-900">Diagnosis Teknisi</strong>
                  <span className="text-slate-500 text-[10px] block">Temuan kerusakan &amp; usulan rincian biaya</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-[#0F4C81] font-bold inline-flex items-center justify-center text-[10px]">2</span>
                  <strong className="block text-slate-900">Review Provider</strong>
                  <span className="text-slate-500 text-[10px] block">Otorisasi jika melampaui batas policy</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center text-[10px]">3</span>
                  <strong className="block text-slate-900">Customer Approval</strong>
                  <span className="text-slate-500 text-[10px] block">Persetujuan di tempat / remote via aplikasi</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-bold inline-flex items-center justify-center text-[10px]">4</span>
                  <strong className="block text-emerald-950">Lanjut Servis</strong>
                  <span className="text-emerald-700 text-[10px] block">Pengerjaan dimulai dengan aman</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-display">Mode Pelanggan Ada di Tempat:</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Tunjukkan rincian temuan dan estimasi biaya tambahan di layar aplikasi. Pelanggan dapat langsung memberikan persetujuan saat itu juga.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <strong className="text-slate-900 block font-display">Mode Pelanggan Tidak Hadir (Remote):</strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Sistem mengirimkan notifikasi persetujuan remote ke aplikasi Pelanggan. Teknisi wajib menunggu hingga status berubah menjadi <em>Approved</em> sebelum eksekusi.
                </p>
              </div>
            </div>
          </div>

          {/* Section Alur Sparepart & Suku Cadang */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Storefront size={24} weight="duotone" className="text-[#0F4C81]" />
              <div>
                <h3 className="text-sm sm:text-base font-bold font-display text-slate-900">
                  Alur Pengadaan Suku Cadang (Sparepart Flow)
                </h3>
                <span className="text-[11px] text-slate-500">
                  3 Sumber material resmi yang didukung platform SERVIO
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Sumber 1 */}
              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F4C81] block">
                  Sumber 1:
                </span>
                <strong className="text-slate-900 block font-display text-xs">
                  Provider-Owned Material
                </strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Material fisik resmi milik bengkel mitra yang dibawa teknisi. Dicatat pada lembar kerja dan ditagihkan transparan ke invoice jasa pelanggan.
                </p>
              </div>

              {/* Sumber 2 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Sumber 2:
                </span>
                <strong className="text-slate-900 block font-display text-xs">
                  Toko Mitra Rekanan (Partner Store)
                </strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Teknisi merekomendasikan produk toko rekanan bergaransi terdekat. Pelanggan menyetujui pesanan barang dan dikirim menggunakan kurir instan ke lokasi.
                </p>
              </div>

              {/* Sumber 3 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Sumber 3:
                </span>
                <strong className="text-slate-900 block font-display text-xs">
                  Suku Cadang Pelanggan (Self-Purchase)
                </strong>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Pelanggan sudah memiliki suku cadang atau membelinya sendiri. Teknisi wajib memverifikasi kelayakan fisik dan kecocokan model sebelum dipasang.
                </p>
              </div>
            </div>

            {/* Aturan Pemblokiran Pengerjaan (Blocking Rule) */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <WarningCircle size={16} weight="fill" className="text-rose-600" />
                <span>Aturan Penahanan Servis (Service Blocking Rule):</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Jika suku cadang bersifat <strong>WAJIB (Mandatory)</strong> dan belum tersedia atau belum disetujui pelanggan, pengerjaan servis <strong>WAJIB DITAHAN (MANDATORY_PART_BLOCKED)</strong>. Teknisi dilarang keras memaksakan pengerjaan setengah jadi atau menandai servis telah selesai!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PASCA-SERVIS (GARANSI, ESCROW, SENGKETA) */}
      {/* ========================================================================= */}
      {activeTab === "POST_SERVICE" && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white space-y-1.5">
            <div className="flex items-center gap-2">
              <SealCheck size={22} weight="fill" className="text-emerald-300" />
              <h2 className="text-base font-bold font-display uppercase tracking-wide">
                Tahap Pasca-Pekerjaan Lapangan
              </h2>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Setelah teknisi menyelesaikan Step 8 (Unggah Bukti &amp; Ajukan Selesai), tanggung jawab teknis lapangan telah tuntas. Sistem Servio secara otomatis melanjutkan tahapan Service Order berikut:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Konfirmasi Pelanggan */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2 text-xs">
              <div className="w-9 h-9 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center font-bold">
                <UserCheck size={20} weight="bold" />
              </div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                1. Konfirmasi Pelanggan &amp; Verifikasi Mutu
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Pelanggan memeriksa hasil pekerjaan teknisi melalui aplikasi. Pelanggan dapat memberikan rating kepuasan dan konfirmasi selesai. Jika pelanggan tidak merespons dalam jendela waktu sistem (auto-confirm window), sistem menyelesaikan order secara otomatis.
              </p>
            </div>

            {/* 2. Escrow & Pembayaran */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2 text-xs">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <HandCoins size={20} weight="bold" />
              </div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                2. Pembayaran &amp; Pelepasan Rekening Escrow
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Dana pembayaran jasa pelanggan yang diamankan di rekening penampungan bersama (escrow) SERVIO akan secara otomatis dicairkan ke saldo pendapatan Provider dan bagi hasil Teknisi. Teknisi tidak perlu menagih pembayaran langsung di luar sistem.
              </p>
            </div>

            {/* 3. Sertifikat Garansi Resmi */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2 text-xs">
              <div className="w-9 h-9 rounded-2xl bg-violet-50 text-violet-800 flex items-center justify-center font-bold">
                <ShieldStar size={20} weight="bold" />
              </div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                3. Penerbitan Sertifikat Garansi Resmi
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Sertifikat garansi resmi Servio aktif otomatis di aplikasi pelanggan dengan nomor seri dan barcode unik. Menjamin perbaikan bebas biaya jika terjadi kendala pada komponen yang sama selama masa garansi (30–90 hari).
              </p>
            </div>

            {/* 4. Penanganan Sengketa */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2 text-xs">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                <WarningOctagon size={20} weight="bold" />
              </div>
              <h3 className="text-sm font-bold font-display text-slate-900">
                4. Penanganan Komplain &amp; Sengketa (Dispute)
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Jika timbul ketidaksesuaian hasil kerja atau komplain pelanggan, sengketa diselesaikan melalui mediasi resmi Provider &amp; Customer Care SERVIO. Teknisi dilindungi oleh bukti foto Before &amp; After dan catatan SOP yang telah diunggah.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Banner Kembali ke Dashboard */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold font-display text-slate-900">
            Siap Menjalankan Pekerjaan Sesuai Standar?
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            Patuhi seluruh 8 langkah operasional dan jaga integritas wewenang teknisi demi keselamatan dan kepuasan pelanggan Servio.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/worker/jobs"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
          >
            <span>Daftar Pekerjaan</span>
          </Link>
          <Link
            href="/worker/dashboard"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs shadow-md transition"
          >
            <span>Buka Dashboard</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  );
}
