"use client";

import React, { useState } from "react";
import { useAdminOperations } from "@/features/admin/useAdminOperations";
import { ContentModerationItem } from "@/types/domain";
import {
  ChatCircleText,
  MagnifyingGlass,
  CheckCircle,
  SlidersHorizontal,
  Star,
  Flag,
  Check,
  Prohibit,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminContentModerationPage() {
  const { contentModerations, moderateContent } = useAdminOperations();

  const [contentTypeFilter, setContentTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ContentModerationItem | null>(null);
  const [censorReason, setCensorReason] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredContent = contentModerations.filter((item) => {
    const matchType = contentTypeFilter === "ALL" || item.contentType === contentTypeFilter;
    const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      item.content.toLowerCase().includes(q) ||
      item.authorName.toLowerCase().includes(q) ||
      item.targetTitle.toLowerCase().includes(q) ||
      (item.reportedReason || "").toLowerCase().includes(q);
    return matchType && matchStatus && matchSearch;
  });

  const pendingCount = contentModerations.filter((c) => c.status === "PENDING").length;

  const handleAction = (item: ContentModerationItem, decision: "APPROVED" | "CENSORED", reason?: string) => {
    moderateContent(item.id, decision, reason || (decision === "APPROVED" ? "Konten lolos pedoman komunitas" : "Konten disensor karena melanggar aturan"));
    setToastMessage(`Konten ${item.id} berhasil ditandai sebagai ${decision}!`);
    setTimeout(() => setToastMessage(null), 4000);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200/60">
              <ChatCircleText size={24} weight="duotone" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Moderasi Konten &amp; Ulasan Komunitas (Content Moderation)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Penyaringan otomatis ujaran kebencian, promosi kompetitor di luar platform, kebocoran nomor kontak pribadi, dan sengketa ulasan bintang 1 mitra.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="md">
              {pendingCount} Konten Terindikasi Pelanggaran
            </Badge>
            <Badge variant="neutral" size="md">
              Total {contentModerations.length} Laporan
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari isi ulasan, penulis, target layanan/produk, atau alasan lapor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal size={16} className="text-slate-400" />
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Jenis Konten</option>
              <option value="SERVICE_REVIEW">Ulasan Layanan Jasa</option>
              <option value="PRODUCT_REVIEW">Ulasan Produk Suku Cadang</option>
              <option value="SELLER_COMMENT">Komentar Penjual / Diskusi</option>
              <option value="CHAT_MESSAGE">Pesan Obrolan Langsung</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu Kurasi (PENDING)</option>
              <option value="APPROVED">Disetujui / Lolos (APPROVED)</option>
              <option value="CENSORED">Disensor / Dihapus (CENSORED)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Moderation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Tipe &amp; Target Konten</th>
                <th className="px-4 py-3">Penulis &amp; Rating</th>
                <th className="px-4 py-3">Isi Konten / Komentar</th>
                <th className="px-4 py-3">Alasan Dilaporkan</th>
                <th className="px-4 py-3">Pelapor &amp; Waktu</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ditemukan konten yang memerlukan kurasi.
                  </td>
                </tr>
              ) : (
                filteredContent.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[10px] font-bold text-violet-600 uppercase">
                        {item.contentType}
                      </span>
                      <p className="font-bold text-slate-900 line-clamp-1 mt-0.5">{item.targetTitle}</p>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {item.targetId}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800">{item.authorName}</span>
                      <span className="text-[10px] text-slate-400 block">{item.authorRole}</span>
                      {item.rating && (
                        <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Star key={i} size={12} weight="fill" />
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 max-w-[240px]">
                      <p className="text-[11px] text-slate-700 font-medium line-clamp-2">
                        &ldquo;{item.content}&rdquo;
                      </p>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                        <Flag size={13} weight="fill" />
                        <span>{item.reportedReason || "Pedoman Komunitas"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      <span>{item.reportedBy || "Sistem AI Filter"}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{item.reportedAt}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <Badge
                        variant={item.status === "APPROVED" ? "success" : item.status === "CENSORED" ? "danger" : "warning"}
                        size="sm"
                      >
                        {item.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {item.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAction(item, "APPROVED")}
                            className="text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                          >
                            <Check size={12} weight="bold" />
                            <span>Lolos</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setCensorReason(item.reportedReason || "Melanggar etika komunikasi platform");
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
                          >
                            <Prohibit size={12} weight="bold" />
                            <span>Sensor</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {item.actionTaken || "Selesai ditinjau"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Censor Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Prohibit size={20} weight="bold" />
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Konfirmasi Sensor Konten
                </h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 block text-[10px]">Teks Konten:</span>
              <p className="font-semibold text-slate-800 mt-0.5 italic">&ldquo;{selectedItem.content}&rdquo;</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Pelanggaran</label>
                <select
                  value={censorReason}
                  onChange={(e) => setCensorReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value="Ujaran Kebencian / Kata Kasar">Ujaran Kebencian / Kata Kasar</option>
                  <option value="Kebocoran Nomor Kontak Pribadi / Bypass Transaksi">Kebocoran Nomor Kontak Pribadi / Bypass Transaksi</option>
                  <option value="Promosi Layanan / Produk Kompetitor Eksternal">Promosi Layanan / Produk Kompetitor Eksternal</option>
                  <option value="Spam / Teks Tidak Masuk Akal">Spam / Teks Tidak Masuk Akal</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => setSelectedItem(null)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAction(selectedItem, "CENSORED", censorReason)}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Terapkan Sensor &amp; Log Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
