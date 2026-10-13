"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Headset,
  PhoneCall,
  ChatCircleDots,
  Envelope,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle,
  Paperclip,
  PaperPlaneRight,
  ArrowRight,
  Question,
  WarningCircle,
  Buildings,
  WhatsappLogo,
} from "@phosphor-icons/react";

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "SERVICE_ORDER",
    orderId: "",
    subject: "",
    message: "",
  });

  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage("Mohon lengkapi Nama, Email, dan Isi Pesan Anda.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API dispatch to Support Ticket Queue
    setTimeout(() => {
      const generatedId = `SRV-TCK-${Math.floor(100000 + Math.random() * 900000)}`;
      setIsSubmitting(false);
      setSubmittedTicketId(generatedId);
      setFormData({
        name: "",
        email: "",
        phone: "",
        category: "SERVICE_ORDER",
        orderId: "",
        subject: "",
        message: "",
      });
      setFileName(null);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-sky/20 to-slate-50 border-b border-slate-200/80 pt-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky/60 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Headset size={16} weight="fill" className="text-secondary" />
            Layanan Pelanggan & Bantuan Operasional 24/7
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-dark font-display tracking-tight">
            Hubungi Tim <span className="text-primary">Layanan Pelanggan</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-neutral-slate max-w-2xl mx-auto leading-relaxed">
            Punya kendala transaksi, pertanyaan garansi, atau ingin konsultasi kemitraan teknisi? Tim SERVIO siap memberikan solusi cepat dan tanggap setiap saat.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* 4 Direct Support Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Channel 1: Live Chat */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-primary/30 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky/60 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChatCircleDots size={26} weight="duotone" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-neutral-dark">Live Chat Servio</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Online
                  </span>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Interaksi langsung dengan agen customer service dalam hitungan detik.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <Link
                href="/chat/conv-order-normal-progress"
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold text-center block hover:bg-primary-dark shadow-xs transition"
              >
                Mulai Chat Sekarang
              </Link>
              <p className="text-[10px] text-center text-neutral-muted mt-2">SLA Respon: &lt; 2 Menit</p>
            </div>
          </div>

          {/* Channel 2: WhatsApp Resmi */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-emerald-500/30 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <WhatsappLogo size={26} weight="duotone" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-neutral-dark">WhatsApp Resmi</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Centang Hijau
                  </span>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Konsultasi praktis via WhatsApp Business terverifikasi resmi.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <a
                href="https://wa.me/6281198765432"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center block hover:bg-emerald-700 shadow-xs transition"
              >
                Chat WhatsApp (+62)
              </a>
              <p className="text-[10px] text-center text-neutral-muted mt-2">+62 811-9876-5432</p>
            </div>
          </div>

          {/* Channel 3: Call Center Darurat */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-amber-500/30 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PhoneCall size={26} weight="duotone" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-neutral-dark">Call Center Darurat</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    24 Jam
                  </span>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Hotline darurat kebocoran pipa utama atau korsleting listrik bahaya.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <a
                href="tel:1500789"
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold text-center block hover:bg-amber-700 shadow-xs transition"
              >
                Telepon 1500-789
              </a>
              <p className="text-[10px] text-center text-neutral-muted mt-2">Bebas Pulsa / Tarif Lokal</p>
            </div>
          </div>

          {/* Channel 4: Email Resmi */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-servio-xs hover:shadow-servio-md hover:border-indigo-500/30 transition-all flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Envelope size={26} weight="duotone" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-neutral-dark">Email Dukungan</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Resmi
                  </span>
                </div>
                <p className="text-xs text-neutral-slate leading-relaxed">
                  Kirimkan berkas kontrak B2B, permohonan faktur pajak, atau klaim resmi.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <a
                href="mailto:support@servio.id"
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold text-center block hover:bg-indigo-700 shadow-xs transition"
              >
                Kirim Email Resmi
              </a>
              <p className="text-[10px] text-center text-neutral-muted mt-2">support@servio.id</p>
            </div>
          </div>
        </div>

        {/* 2-Column Section: Inquiry Form & Office Information */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Ticket Submission Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-servio-sm">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-dark">
                  Kirim Pesan atau Tiket Bantuan
                </h2>
                <p className="text-xs text-neutral-slate mt-0.5">
                  Isi formulir berikut dan petugas khusus kami akan menindaklanjuti dalam waktu singkat.
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-sky/60 text-primary flex items-center justify-center shrink-0">
                <PaperPlaneRight size={20} weight="duotone" />
              </div>
            </div>

            {/* Success Alert Modal */}
            <AnimatePresence>
              {submittedTicketId && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2"
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
                    <span>Pesan Berhasil Terkirim!</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-700">
                    Nomor Tiket Bantuan Anda:{" "}
                    <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">
                      {submittedTicketId}
                    </strong>
                    . Salinan tiket dan konfirmasi balasan telah kami jadwalkan ke email Anda dalam 15–30 menit.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedTicketId(null)}
                    className="text-xs font-bold text-emerald-800 underline pt-1 block hover:text-emerald-900"
                  >
                    Kirim pesan lain &rarr;
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <WarningCircle size={16} weight="fill" className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Budi Prasetyo"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="nama@email.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="0812xxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    Kategori Kendala <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition font-medium"
                  >
                    <option value="SERVICE_ORDER">Pesanan Servis & Teknisi</option>
                    <option value="PAYMENT_ESCROW">Pembayaran & Rekening Escrow</option>
                    <option value="WARRANTY_CLAIM">Klaim Garansi Servio Protection</option>
                    <option value="PARTS_RETURN">Retur Suku Cadang / Pengiriman</option>
                    <option value="PARTNERSHIP">Kemitraan Teknisi / Merchant Toko</option>
                    <option value="OTHER">Pertanyaan Umum Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    ID Pesanan (Opsional)
                  </label>
                  <input
                    type="text"
                    name="orderId"
                    value={formData.orderId}
                    onChange={handleInputChange}
                    placeholder="Contoh: ORD-2026-8901"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-dark">
                    Subjek Singkat
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Contoh: Kendala AC Belum Dingin Pasca Servis"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-dark">
                  Detail Pesan & Deskripsi Kendala <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Jelaskan secara rinci kronologi atau pertanyaan yang ingin Anda sampaikan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-neutral-dark focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition leading-relaxed resize-y"
                  required
                />
              </div>

              {/* Attachment upload box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-dark flex items-center justify-between">
                  <span>Lampiran Foto / Dokumen Pendukung (Opsional)</span>
                  <span className="text-[10px] text-neutral-muted">JPG, PNG, PDF maks 5MB</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-neutral-slate hover:bg-slate-100 hover:border-primary/50 cursor-pointer transition"
                  >
                    <span className="truncate">
                      {fileName ? `File terpilih: ${fileName}` : "Klik untuk memilih file bukti kendala..."}
                    </span>
                    <Paperclip size={16} className="text-neutral-muted shrink-0 ml-2" />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-primary text-white text-xs sm:text-sm font-bold hover:bg-primary-dark shadow-servio-sm transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Mengirimkan Tiket Dukungan...</span>
                  </>
                ) : (
                  <>
                    <PaperPlaneRight size={18} weight="bold" />
                    <span>Kirimkan Pesan Sekarang</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Operational SLA & Office Info (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* SLA Commitment Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-servio-sm space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Clock size={20} weight="fill" className="text-secondary" />
                <span>Komitmen Standar Waktu Respons (SLA)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs text-neutral-slate">
                <div className="py-2.5 flex items-center justify-between">
                  <span>Live Chat Pelanggan</span>
                  <span className="font-bold text-neutral-dark bg-sky/70 px-2 py-0.5 rounded-full text-[11px]">
                    &lt; 2 Menit
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>Dispatch Teknisi Darurat</span>
                  <span className="font-bold text-neutral-dark bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[11px]">
                    &lt; 45 Menit
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>Mediasi Sengketa & Resolusi BAST</span>
                  <span className="font-bold text-neutral-dark bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[11px]">
                    Maks. 24 Jam
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>Pencairan Rekening Escrow</span>
                  <span className="font-bold text-neutral-dark bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[11px]">
                    Instan Pasca BAST
                  </span>
                </div>
              </div>
            </div>

            {/* Office & Headquarters Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-servio-sm space-y-4">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Buildings size={20} weight="duotone" />
                <span>Kantor Pusat & Hub Operasional</span>
              </div>
              <div className="space-y-3 text-xs text-neutral-slate leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <MapPin size={18} weight="fill" className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-neutral-dark block">Menara Servio Indonesia</strong>
                    Lantai 18, Kawasan Bisnis Mega Kuningan, Jl. Prof. Dr. Satrio Kav. E-4 No. 6, Jakarta Selatan, DKI Jakarta 12950
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100">
                  <Clock size={18} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-neutral-dark block">Jam Layanan Kantor</strong>
                    Senin – Jumat: 08.30 – 18.00 WIB<br />
                    Sabtu – Minggu: 09.00 – 16.00 WIB<br />
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      *Hotline Darurat & Live Chat beroperasi 24 Jam Non-stop
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick FAQ Link Banner */}
            <div className="bg-gradient-to-r from-sky/40 to-blue-50 border border-primary/20 rounded-3xl p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Question size={16} weight="bold" />
                  Pertanyaan Sering Diajukan
                </h4>
                <p className="text-[11px] text-neutral-slate">
                  Ingin cek info garansi atau mekanisme escrow sebelum mengirim pesan?
                </p>
              </div>
              <Link
                href="/faq"
                className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold whitespace-nowrap hover:bg-primary-dark transition shrink-0"
              >
                Buka FAQ &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
