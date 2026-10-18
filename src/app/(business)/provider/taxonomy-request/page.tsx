"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useActiveRole } from "@/context/RoleContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  TreeStructure,
  PaperPlaneTilt,
  CheckCircle,
  XCircle,
  Clock,
  HourglassSimple,
  ShieldCheck,
  Info,
  ArrowLeft,
  ArrowsClockwise,
  Sparkle,
  Folder,
} from "@phosphor-icons/react";
import {
  taxonomyApi,
  ApiCategoryNode,
  ApiCategorySuggestion,
} from "@/lib/servioApi";

export default function ProviderTaxonomyRequestPage() {
  const { user } = useActiveRole();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    categoryName: string;
    subcategoryName: string;
    reason: string;
    requestNumber: string;
  } | null>(null);

  // Form State
  const [requestType, setRequestType] = useState<"SUBCATEGORY" | "CATEGORY">("SUBCATEGORY");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [reqSubName, setReqSubName] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  // Live Backend State
  const [apiCategories, setApiCategories] = useState<ApiCategoryNode[]>([]);
  const [myRequests, setMyRequests] = useState<ApiCategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Load active JASA categories and provider's requests
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRes, reqsRes] = await Promise.allSettled([
        taxonomyApi.getCategories({ master_code: "JASA", status: "ACTIVE" }),
        taxonomyApi.getRequests({ master_code: "JASA" }),
      ]);

      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value?.data)) {
        setApiCategories(catsRes.value.data);
        if (!selectedCatId && catsRes.value.data.length > 0) {
          setSelectedCatId(catsRes.value.data[0].id);
        }
      }

      if (reqsRes.status === "fulfilled" && Array.isArray(reqsRes.value?.data)) {
        setMyRequests(reqsRes.value.data);
      }
    } catch (err: any) {
      console.warn("Provider taxonomy API load warning:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const subNameClean = reqSubName.trim();
    const reasonClean = reqReason.trim();

    if (!subNameClean || !reasonClean) {
      showError("Harap lengkapi nama usulan dan alasan pengajuan.");
      return;
    }

    if (requestType === "SUBCATEGORY" && !selectedCatId) {
      showError("Harap pilih kategori induk untuk usulan subkategori.");
      return;
    }

    const catObj = apiCategories.find((c) => c.id === selectedCatId);

    try {
      setIsSubmitting(true);
      const res = await taxonomyApi.submitRequest({
        master_code: "JASA",
        request_type: requestType,
        suggested_name: subNameClean,
        proposed_parent_category_id: requestType === "SUBCATEGORY" ? selectedCatId : null,
        reason: reasonClean,
        business_context: reqNotes.trim() || undefined,
      });

      const created = res.data;

      // Open Success Modal
      setSuccessModalData({
        categoryName: requestType === "SUBCATEGORY" ? (catObj?.name || "Kategori Terpilih") : "Kategori Baru (Root)",
        subcategoryName: subNameClean,
        reason: reasonClean,
        requestNumber: created?.request_number || "REQ-" + Date.now().toString().slice(-6),
      });

      setReqSubName("");
      setReqReason("");
      setReqNotes("");
      showToast("Pengajuan taksonomi berhasil dikirim ke Admin Operasi.");
      loadData();
    } catch (err: any) {
      showError(err.message || "Gagal mengirim pengajuan. Pastikan profil dan izin organisasi valid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-body pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <CheckCircle size={20} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-rose-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <XCircle size={20} className="text-rose-300" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Pengajuan Taksonomi Jasa Baru (Mitra Penyedia)"
        description="Ajukan penambahan subkategori atau kategori jasa baru jika ruang lingkup keahlian mitra Anda belum terdaftar pada taksonomi aktif platform SERVIO."
        breadcrumbs={[
          { label: "Mitra Jasa", href: "/provider/dashboard" },
          { label: "Katalog Layanan", href: "/provider/services" },
          { label: "Ajukan Taksonomi", href: "/provider/taxonomy-request" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await loadData();
                showToast("Data taksonomi berhasil diperbarui.");
              }}
              disabled={loading}
              className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs font-bold cursor-pointer"
            >
              <ArrowsClockwise
                size={16}
                className={loading ? "animate-spin text-[#0F4C81]" : "text-slate-600"}
              />
              <span>{loading ? "Memperbarui..." : "Perbarui Data"}</span>
            </Button>
            <Link
              href="/provider/services"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs transition"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Katalog</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Pengajuan (Left Column) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200">
              <TreeStructure size={20} weight="duotone" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Formulir Usulan Kategori dan Sub Kategori Jasa</h2>
              <p className="text-[11px] text-slate-500">
                Sesuai DEC-11: Mitra Penyedia Jasa mengajukan spesialisasi dalam ruang lingkup JASA.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipe Usulan</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestType("SUBCATEGORY")}
                  className={`p-2.5 rounded-xl border text-center font-bold transition ${
                    requestType === "SUBCATEGORY"
                      ? "bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Subkategori Baru
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType("CATEGORY")}
                  className={`p-2.5 rounded-xl border text-center font-bold transition ${
                    requestType === "CATEGORY"
                      ? "bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Kategori Utama Baru
                </button>
              </div>
            </div>

            {requestType === "SUBCATEGORY" && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Induk (Jasa)</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
                >
                  {apiCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {requestType === "SUBCATEGORY"
                  ? "Nama Subkategori yang Diusulkan"
                  : "Nama Kategori Utama yang Diusulkan"}
              </label>
              <input
                type="text"
                required
                placeholder={
                  requestType === "SUBCATEGORY"
                    ? "Contoh: Waterproofing Membran Bakar"
                    : "Contoh: Otomasi Gedung Pintar"
                }
                value={reqSubName}
                onChange={(e) => setReqSubName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Alasan Pengajuan</label>
              <textarea
                rows={3}
                required
                placeholder="Jelaskan mengapa layanan spesialisasi ini diperlukan dan bagaimana prospek pasarnya..."
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Konteks Bisnis &amp; Spesifikasi Teknis (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Rincian peralatan khusus, sertifikasi keahlian teknisi, atau estimasi harga pasar..."
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <PaperPlaneTilt size={16} weight="bold" />
              <span>{isSubmitting ? "Mengirim Usulan..." : "Kirim Usulan Taksonomi"}</span>
            </Button>
          </form>
        </div>

        {/* History List (Right Column) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Riwayat Usulan Anda</h2>
              <p className="text-[11px] text-slate-500">
                Pantau status review berkas dari Admin Operasional platform.
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title="Refresh Riwayat"
            >
              <ArrowsClockwise size={16} />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center py-8 text-slate-400 font-semibold">Memuat riwayat usulan...</p>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <TreeStructure size={36} className="mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">Belum Ada Pengajuan Taksonomi</p>
                <p className="text-[11px]">
                  Gunakan formulir di sebelah kiri untuk mengusulkan kategori atau subkategori jasa baru.
                </p>
              </div>
            ) : (
              myRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-200/70 hover:border-slate-300 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.suggested_name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600 font-bold">
                          {req.request_type}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#0F4C81]">{req.request_number}</p>
                    </div>
                    <div>
                      {req.status === "NEW" && <Badge variant="warning" size="sm">Menunggu Review</Badge>}
                      {req.status === "PROCESSING" && <Badge variant="neutral" size="sm">Sedang Diproses</Badge>}
                      {req.status === "APPROVED" && <Badge variant="success" size="sm">Disetujui (Terjadwal)</Badge>}
                      {req.status === "FULFILLED" && <Badge variant="primary" size="sm">Sudah Aktif di Sistem</Badge>}
                      {req.status === "REJECTED" && <Badge variant="danger" size="sm">Ditolak</Badge>}
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">Alasan: </span>{req.reason}
                  </p>

                  {/* Review / Schedule Notes from Admin */}
                  {req.review_reason && (
                    <div
                      className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                        req.status === "APPROVED"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                          : req.status === "FULFILLED"
                          ? "bg-sky-50 border-sky-300 text-sky-900"
                          : req.status === "REJECTED"
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-blue-50 border-blue-200 text-blue-900"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {req.status === "APPROVED" && <span>📅 Keterangan Jadwal Penambahan ke Sistem:</span>}
                        {req.status === "FULFILLED" && <span>✅ Keterangan Penerbitan Sistem:</span>}
                        {req.status === "REJECTED" && <span>⚠️ Alasan Penolakan:</span>}
                        {req.status === "PROCESSING" && <span>ℹ️ Catatan Review Admin:</span>}
                      </div>
                      <p>{req.review_reason}</p>
                      {req.status === "APPROVED" && (
                        <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/80 pt-1 mt-1">
                          * Subkategori belum dapat digunakan untuk membuat layanan hingga tim Admin selesai menginputnya ke sistem.
                        </p>
                      )}
                    </div>
                  )}

                  {req.status === "FULFILLED" && (
                    <div className="flex justify-end pt-1">
                      <Link
                        href="/provider/services"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F4C81] text-white rounded-xl text-xs font-bold hover:bg-[#0c3d68] transition"
                      >
                        <span>+ Buat Layanan dengan Subkategori Ini</span>
                      </Link>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Diajukan pada {new Date(req.created_at).toLocaleDateString("id-ID")}</span>
                    {req.reviewed_at && (
                      <span>Ditinjau pada {new Date(req.reviewed_at).toLocaleDateString("id-ID")}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {successModalData && (
        <Modal
          isOpen={!!successModalData}
          onClose={() => setSuccessModalData(null)}
          title="Pengajuan Berhasil Terkirim"
        >
          <div className="space-y-4 text-xs font-body text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle size={28} weight="bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Usulan Berhasil Didaftarkan</h3>
              <p className="font-mono text-xs text-[#0F4C81] font-bold mt-0.5">
                {successModalData.requestNumber}
              </p>
              <p className="text-slate-500 mt-1">
                Usulan penambahan subkategori{" "}
                <span className="font-bold text-slate-900">"{successModalData.subcategoryName}"</span> di bawah{" "}
                <span className="font-bold text-slate-900">"{successModalData.categoryName}"</span> telah masuk ke antrean Admin Operasional.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSuccessModalData(null)}
                className="w-full"
              >
                Tutup &amp; Lihat Riwayat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
