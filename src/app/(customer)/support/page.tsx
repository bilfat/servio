"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Headset,
  Question,
  ChatCircleDots,
  ShieldCheck,
  CreditCard,
  Wrench,
  Package,
  CaretDown,
  MagnifyingGlass,
  ArrowRight,
  PhoneCall,
  Envelope,
} from "@phosphor-icons/react";

interface FaqItem {
  question: string;
  answer: string;
  category: "PAYMENT" | "SERVICE" | "WARRANTY" | "PRODUCT";
}

const FAQS: FaqItem[] = [
  {
    category: "PAYMENT",
    question: "Bagaimana cara kerja sistem rekening penampung (Escrow) Servio?",
    answer:
      "Dana yang Anda bayarkan akan aman tersimpan di rekening resmi Servio dan baru dilepaskan kepada mitra penyedia jasa setelah Anda menyetujui bukti pengerjaan teknisi dan mengonfirmasi pekerjaan selesai tanpa keluhan.",
  },
  {
    category: "SERVICE",
    question: "Bagaimana jika teknisi terlambat datang ke lokasi?",
    answer:
      "Anda dapat melacak posisi live teknisi pada peta rute secara real-time. Jika teknisi mengalami kendala di jalan, Anda dapat langsung menghubunginya lewat fitur Chat Kontekstual atau mengajukan kompensasi keterlambatan ke tim support kami.",
  },
  {
    category: "WARRANTY",
    question: "Apakah semua servis memiliki garansi resmi?",
    answer:
      "Ya, setiap pesanan di Servio dilindungi Garansi Servio Protection minimal 30 hingga 90 hari tergantung jenis layanan. Sertifikat garansi digital otomatis terbit di menu 'Pusat Garansi' setelah pesanan selesai.",
  },
  {
    category: "PRODUCT",
    question: "Bagaimana jika suku cadang yang dibeli tidak cocok dengan unit saya?",
    answer:
      "Anda dapat mengajukan retur dalam 7 hari sejak barang diterima melalui menu Pusat Retur dengan melampirkan video unboxing. Anda bisa memilih penukaran unit yang cocok atau pengembalian dana 100%.",
  },
];

export default function CustomerSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesQuery =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || faq.category === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-3 py-1 rounded-full border border-sky-200 inline-flex items-center gap-1.5">
            <Headset size={16} weight="fill" />
            Pusat Bantuan & Layanan Pelanggan 24/7
          </span>
          <h1 className="text-3xl font-bold font-display text-slate-900 mt-3">
            Ada yang Bisa Kami Bantu Hari Ini?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto">
            Temukan jawaban cepat seputar transaksi, rekening escrow, garansi pengerjaan, atau hubungi tim customer service kami.
          </p>

          {/* Search Box */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik kata kunci: garansi, escrow, teknisi, retur..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C81] shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Support Channels Cards */}
        <div id="contact" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saluran Kontak Cepat</h2>
              <p className="text-xs text-slate-500">Hubungi langsung via telepon, chat, atau buat tiket bantuan</p>
            </div>
            <Link
              href="/contact"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Halaman Hubungi Kami Lengkap</span>
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0F4C81] flex items-center justify-center">
                <ChatCircleDots size={24} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Live Chat Tim Servio</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Respon cepat rata-rata kurang dari 2 menit untuk kendala servis mendesak.
              </p>
              <Link
                href="/chat/conv-order-normal-progress"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] hover:underline pt-2"
              >
                Mulai Chat Sekarang &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={24} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Pusat Mediasi & Sengketa</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ajukan klaim perbaikan gratis atau pengembalian dana jika teknisi tidak sesuai standar.
              </p>
              <Link
                href="/complaints/disp-901"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline pt-2"
              >
                Buka Pusat Komplain &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <PhoneCall size={24} weight="duotone" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Call Center Darurat</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hubungi 1500-789 untuk kebocoran pipa besar atau korsleting kelistrikan darurat.
              </p>
              <a
                href="tel:1500789"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:underline pt-2"
              >
                Telepon 1500-789 &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div id="faq" className="scroll-mt-24 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Pertanyaan yang Sering Diajukan (FAQ)</h2>
                <Link
                  href="/faq"
                  className="text-xs font-bold text-primary hover:underline hidden sm:inline-flex items-center gap-1"
                >
                  <span>Lihat Seluruh Garansi & FAQ &rarr;</span>
                </Link>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Panduan lengkap seputar kebijakan platform Servio</p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: "ALL", label: "Semua" },
                { id: "PAYMENT", label: "Escrow & Bayar" },
                { id: "SERVICE", label: "Pengerjaan" },
                { id: "WARRANTY", label: "Garansi" },
                { id: "PRODUCT", label: "Suku Cadang" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === c.id
                      ? "bg-[#0F4C81] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div key={index} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 text-left font-bold text-sm text-slate-900 hover:text-[#0F4C81] transition"
                  >
                    <span>{faq.question}</span>
                    <CaretDown
                      size={16}
                      className={`transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 text-xs text-slate-600 leading-relaxed"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
