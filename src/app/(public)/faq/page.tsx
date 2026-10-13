"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Question,
  ShieldCheck,
  LockKey,
  Wrench,
  Package,
  CaretDown,
  MagnifyingGlass,
  ArrowRight,
  Headphones,
  CheckCircle,
  Sparkle,
  Clock,
  ArrowCounterClockwise,
  UserCheck,
} from "@phosphor-icons/react";

interface FaqItem {
  id: string;
  category: "WARRANTY" | "ESCROW" | "SERVICE" | "PARTS" | "PARTNERS";
  question: string;
  answer: string;
  badge?: string;
}

const FAQ_CATEGORIES = [
  { id: "ALL", label: "Semua Pertanyaan" },
  { id: "WARRANTY", label: "Garansi & Servio Protection" },
  { id: "ESCROW", label: "Rekening Escrow & Pembayaran" },
  { id: "SERVICE", label: "Layanan & Teknisi" },
  { id: "PARTS", label: "Suku Cadang & Retur" },
  { id: "PARTNERS", label: "Verifikasi Mitra" },
] as const;

const FAQS_DATA: FaqItem[] = [
  {
    id: "faq-w-1",
    category: "WARRANTY",
    question: "Bagaimana cara kerja Garansi Servio Protection?",
    answer:
      "Setiap pesanan jasa dan produk yang diselesaikan melalui SERVIO secara otomatis dilindungi sertifikat garansi digital Servio Protection. Durasi garansi berkisar antara 30 hingga 90 hari tergantung kategori layanan. Jika keluhan yang sama terjadi selama masa garansi aktif, teknisi akan dikirim ulang untuk perbaikan tanpa biaya tambahan, atau Anda berhak mendapatkan pengembalian dana penuh.",
    badge: "Garansi Resmi",
  },
  {
    id: "faq-w-2",
    category: "WARRANTY",
    question: "Di mana saya bisa melihat sertifikat garansi digital saya?",
    answer:
      "Sertifikat garansi digital langsung terbit otomatis di akun Anda begitu Berita Acara Serah Terima (BAST) ditandatangani. Anda dapat mengaksesnya kapan saja melalui menu 'Akun Pelanggan' → 'Pusat Garansi' (/warranties). Sertifikat mencakup QR code verifikasi, tanggal kedaluwarsa, dan tombol 1-klik untuk klaim cepat.",
  },
  {
    id: "faq-w-3",
    category: "WARRANTY",
    question: "Apa saja yang membatalkan (void) garansi servis?",
    answer:
      "Garansi dapat gugur jika: (1) unit dibongkar atau diperbaiki oleh teknisi pihak ketiga non-SERVIO selama masa garansi, (2) terjadi bencana alam, korsleting eksternal akibat sambaran petir atau voltase PLN tidak stabil tanpa pelindung, atau (3) kerusakan fisik akibat kelalaian penggunaan yang disengaja. Penggunaan normal dijamin 100%.",
  },
  {
    id: "faq-e-1",
    category: "ESCROW",
    question: "Apa itu Rekening Escrow Penampung dan bagaimana dana saya diamankan?",
    answer:
      "Servio Escrow Protection adalah rekening penampung resmi terlisensi yang menahan dana pembayaran Anda saat order dibuat. Dana Anda 100% aman dan tidak akan pernah dicairkan kepada mitra teknisi atau merchant sebelum Anda memeriksa hasil pekerjaan dan menandatangani BAST Digital. Jika pekerjaan tidak tuntas atau dibatalkan sesuai ketentuan, dana dikembalikan langsung ke rekening Anda.",
    badge: "Anti-Tipu",
  },
  {
    id: "faq-e-2",
    category: "ESCROW",
    question: "Metode pembayaran apa saja yang didukung?",
    answer:
      "SERVIO mendukung Virtual Account otomatis (BCA, Mandiri, BNI, BRI, Permata), QRIS (GoPay, OVO, DANA, ShopeePay, LinkAja, Mobile Banking), serta Kartu Kredit/Debit Visa & MasterCard dengan 3D Secure OTP. Seluruh transaksi diverifikasi instan secara real-time.",
  },
  {
    id: "faq-e-3",
    category: "ESCROW",
    question: "Apakah biaya survei awal dapat dipotong jika servis disepakati?",
    answer:
      "Ya! Jika survei fisik diperlukan untuk diagnosa lanjutan dan Anda menyetujui penawaran biaya perbaikan teknisi (Quotation Approval), biaya survei awal akan langsung dipotongkan (rebate) sebagai pengurang total biaya jasa perbaikan akhir.",
  },
  {
    id: "faq-s-1",
    category: "SERVICE",
    question: "Apakah saya bisa melacak posisi kedatangan teknisi secara real-time?",
    answer:
      "Tentu! Setelah order Anda dikonfirmasi, sistem menyediakan radar GPS Live Tracking. Anda dapat memantau pergerakan teknisi di peta, melihat estimasi waktu tiba (ETA), serta menghubungi teknisi langsung melalui fitur Chat Kontekstual terenkripsi di aplikasi.",
    badge: "Live GPS",
  },
  {
    id: "faq-s-2",
    category: "SERVICE",
    question: "Bagaimana jika teknisi tidak hadir atau terlambat datang ke lokasi?",
    answer:
      "Jika teknisi terlambat lebih dari 30 menit tanpa konfirmasi, sistem Dispatch Otomatis SERVIO akan memberi peringatan. Anda berhak membatalkan order dengan pengembalian dana 100% seketika atau meminta Dispatcher Pusat mengalihkan order ke teknisi terdekat lainnya dengan voucher diskon kompensasi keterlambatan.",
  },
  {
    id: "faq-s-3",
    category: "SERVICE",
    question: "Apakah teknisi SERVIO wajib mengunggah foto Before & After?",
    answer:
      "Ya. Setiap teknisi diwajibkan memotret kondisi unit sebelum pengerjaan (Before) dan hasil akhir pengerjaan (After) yang tersimpan di catatan Berita Acara Digital. Anda dapat memeriksa foto-foto tersebut sebelum menyetujui penyelesaian pesanan.",
  },
  {
    id: "faq-p-1",
    category: "PARTS",
    question: "Apakah suku cadang yang dijual di SERVIO dijamin asli (original)?",
    answer:
      "Seluruh suku cadang dan sparepart di SERVIO dikurasi ketat dari Distributor Resmi dan Merchant terverifikasi. Setiap produk memiliki segel garansi dan lolos moderasi katalog ketat. Jika terbukti bukan produk asli, SERVIO memberikan garansi pengembalian dana 100% ditambah kompensasi.",
    badge: "100% Original",
  },
  {
    id: "faq-p-2",
    category: "PARTS",
    question: "Bagaimana prosedur retur suku cadang jika tipe tidak cocok?",
    answer:
      "Anda memiliki waktu 7 hari kalender sejak suku cadang diterima untuk mengajukan permohonan retur melalui menu 'Pusat Retur'. Cukup unggah video unboxing dan foto segel. Tim kurir logistik terintegrasi akan menjemput paket kembali dan mengirimkan tipe pengganti yang sesuai.",
  },
  {
    id: "faq-m-1",
    category: "PARTNERS",
    question: "Bagaimana standar verifikasi teknisi dan bengkel di SERVIO?",
    answer:
      "Setiap mitra penyedia jasa melewati proses KYC 4 lapis: verifikasi identitas e-KTP, sertifikasi keahlian teknis (BNSP/pelatihan resmi), pemeriksaan catatan kepolisian (SKCK), serta uji kelayakan perlengkapan kerja. Kualitas mitra juga dievaluasi berkelanjutan melalui rating kepuasan pelanggan.",
  },
];

export default function FaqAndWarrantyPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("faq-w-1");

  const filteredFaqs = FAQS_DATA.filter((faq) => {
    const matchesQuery =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || faq.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky/20 to-slate-50 border-b border-slate-200/80 pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky/60 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <ShieldCheck size={16} weight="fill" className="text-secondary" />
            Pusat Informasi Kebijakan & Perlindungan Pelanggan
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-dark font-display tracking-tight">
            FAQ & Garansi Resmi <span className="text-primary">Servio Protection</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-neutral-slate max-w-2xl mx-auto leading-relaxed">
            Ketahui hak perlindungan Anda, mekanisme rekening escrow anti-tipu, standar jaminan perbaikan 30–90 hari, dan prosedur klaim digital yang transparan.
          </p>

          {/* Search Box */}
          <div className="mt-8 max-w-xl mx-auto relative">
            <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik garansi, rekening escrow, retur sparepart, teknisi..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-neutral-dark placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary shadow-servio-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-muted hover:text-neutral-dark bg-slate-100 px-2 py-1 rounded-lg"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* 4 Pilar Garansi Servio Cards */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-dark">
              4 Pilar Perlindungan Mutlak Konsumen
            </h2>
            <p className="text-xs sm:text-sm text-neutral-slate mt-1.5">
              Setiap pesanan di SERVIO dilindungi secara hukum dan finansial dari awal hingga masa purna-jual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-primary/30 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky/60 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck size={26} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm text-neutral-dark">Garansi Servis 30–90 Hari</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Sertifikat garansi digital otomatis terbit. Servis ulang gratis jika terjadi kendala serupa dalam masa berlaku.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-primary">
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                Sertifikat Digital Terbit
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-primary/30 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LockKey size={26} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm text-neutral-dark">Rekening Escrow Aman</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Uang Anda ditampung di rekening aman. Teknisi baru dibayar setelah Anda puas dan menandatangani BAST.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                100% Anti Penipuan
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-primary/30 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck size={26} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm text-neutral-dark">Teknisi Tersertifikasi</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Mitra melewati KYC KTP, sertifikasi BNSP, serta verifikasi bebas catatan kejahatan kepolisian (SKCK).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                Lolos Kurasi 4 Lapis
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-primary/30 transition-all flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package size={26} weight="duotone" />
                </div>
                <h3 className="font-bold text-sm text-neutral-dark">100% Suku Cadang Asli</h3>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Sparepart bersumber dari distributor resmi dengan jaminan retur 7 hari jika barang cacat atau tidak sesuai.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-secondary">
                <CheckCircle size={14} weight="fill" className="text-emerald-500" />
                Segel Resmi & Garansi
              </div>
            </div>
          </div>
        </div>

        {/* 3 Langkah Mudah Klaim Garansi */}
        <div className="bg-gradient-to-r from-primary to-[#0c3c66] rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-servio-lg">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="max-w-2xl space-y-3 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-sky bg-white/10 px-3 py-1 rounded-full border border-white/20 inline-flex items-center gap-1.5">
              <ArrowCounterClockwise size={14} weight="bold" />
              Prosedur Klaim Instan
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-display">
              Cara Klaim Garansi Digital Servio
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Jika unit yang telah diperbaiki mengalami masalah serupa selama masa garansi aktif, Anda tidak perlu repot berdebat dengan teknisi. Ikuti langkah sederhana ini:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-2">
              <div className="w-8 h-8 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-sm text-white">Buka Sertifikat Garansi</h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                Akses pesanan Anda di menu Akun dan klik tombol <strong>Klaim Garansi</strong> pada sertifikat aktif.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-2">
              <div className="w-8 h-8 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-sm text-white">Lampirkan Bukti Gejala</h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                Kirim foto atau video singkat yang menunjukkan kendala unit yang terulang kembali.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-2">
              <div className="w-8 h-8 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-sm text-white">Teknisi Dikirim Ulang</h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                Sistem mengutus teknisi penjamin dalam &lt; 24 jam tanpa pungutan biaya jasa apapun.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Accordion Section */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-servio-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-neutral-dark">Daftar Pertanyaan Populer (FAQ)</h2>
              <p className="text-xs sm:text-sm text-neutral-slate mt-0.5">
                Menampilkan {filteredFaqs.length} pertanyaan seputar operasional platform
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 text-neutral-slate hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-neutral-muted flex items-center justify-center mx-auto">
                <Question size={24} />
              </div>
              <p className="text-sm font-bold text-neutral-dark">Tidak ada pertanyaan yang sesuai</p>
              <p className="text-xs text-neutral-slate max-w-sm mx-auto">
                Coba gunakan kata kunci pencarian lain atau tanyakan langsung pada tim customer care kami.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFaqs.map((faq) => {
                const isOpen = expandedFaqId === faq.id;

                return (
                  <div key={faq.id} className="py-4 sm:py-5 first:pt-2 last:pb-2">
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      className="w-full flex items-start justify-between gap-4 text-left group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-neutral-dark group-hover:text-primary transition-colors">
                            {faq.question}
                          </span>
                          {faq.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky text-primary shrink-0">
                              {faq.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isOpen ? "bg-primary text-white rotate-180" : "bg-slate-100 text-neutral-muted group-hover:bg-slate-200"
                        }`}
                      >
                        <CaretDown size={16} weight="bold" />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 text-xs sm:text-sm text-neutral-slate leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA Banner Hubungi Kami */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-servio-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary bg-rose-50 px-2.5 py-0.5 rounded-full">
              <Headphones size={14} weight="bold" />
              Layanan Bantuan 24/7
            </div>
            <h3 className="text-lg font-bold text-neutral-dark">
              Pertanyaan Anda Belum Terjawab di Sini?
            </h3>
            <p className="text-xs text-neutral-slate max-w-lg">
              Tim Layanan Pelanggan kami siap membantu menjawab pertanyaan spesifik, mengecek status pesanan, atau membantu klaim garansi Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/contact"
              className="px-5 py-3 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-servio-xs transition inline-flex items-center gap-2"
            >
              <span>Hubungi Kami</span>
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              href="/support"
              className="px-5 py-3 rounded-2xl bg-slate-100 text-neutral-dark text-xs font-bold hover:bg-slate-200 transition"
            >
              Pusat Bantuan Umum
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
