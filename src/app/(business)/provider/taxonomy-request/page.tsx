"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDomainRepository } from "@/lib/repository/domainRepository";
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
} from "@phosphor-icons/react";
import { taxonomyApi, ApiTaxonomyCategory, ApiTaxonomyRequest } from "@/lib/servioApi";
import { SubcategoryRequest } from "@/types/domain";

export default function ProviderTaxonomyRequestPage() {
  const repo = useDomainRepository();
  const { user } = useActiveRole();

  const currentProviderId = user.id || "prov-bintang-teknik";
  const currentProviderName = user.name || "PT Bintang Teknik Mandiri";

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    categoryName: string;
    subcategoryName: string;
    reason: string;
  } | null>(null);

  // Form State
  const [selectedCatId, setSelectedCatId] = useState("");
  const [reqSubName, setReqSubName] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  // Live Backend State
  const [apiCategories, setApiCategories] = useState<ApiTaxonomyCategory[] | null>(null);
  const [apiRequests, setApiRequests] = useState<SubcategoryRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRes, reqsRes] = await Promise.allSettled([
        taxonomyApi.getCategories({ status: "ACTIVE" }),
        taxonomyApi.getRequests(),
      ]);

      if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value?.data)) {
        setApiCategories(catsRes.value.data);
      }

      if (reqsRes.status === "fulfilled" && Array.isArray(reqsRes.value?.data)) {
        setApiRequests(
          reqsRes.value.data.map((r: any) => ({
            id: r._id || r.id,
            providerId: r.providerOrganizationId || r.providerId || currentProviderId,
            providerName: r.providerName || currentProviderName,
            categoryId: r.requestedCategoryId || r.categoryId || "",
            categoryName: r.category?.name || r.categoryName || "",
            requestedSubcategoryName: r.requestedName || r.requestedSubcategoryName || "",
            reason: r.reason || "",
            notes: r.notes || "",
            status: r.status as SubcategoryRequest["status"],
            createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString("id-ID") : new Date().toLocaleString("id-ID"),
            adminReviewNotes: r.adminReview?.reason || r.adminNotes,
            ceoReviewNotes: r.ceoReview?.reason || r.reviewNotes,
          }))
        );
      }
    } catch (err) {
      console.warn("Provider taxonomy API load warning:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProviderId, currentProviderName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCategories = useMemo(() => {
    if (apiCategories && apiCategories.length > 0) {
      return apiCategories.map((c) => ({
        id: c._id || c.id,
        name: c.name,
        code: c.code,
      }));
    }
    return repo.categories.filter((c) => c.status === "ACTIVE");
  }, [apiCategories, repo.categories]);

  const actor = useMemo(
    () => ({
      id: currentProviderId,
      name: currentProviderName,
    }),
    [currentProviderId, currentProviderName]
  );

  // My requests (filtered from live API or fallback)
  const myRequests = useMemo(() => {
    if (apiRequests) {
      return apiRequests.filter((r) => r.providerId === currentProviderId || !r.providerId || r.providerId === "prov-001");
    }
    return repo.taxonomyRequests.filter((r) => r.providerId === currentProviderId);
  }, [apiRequests, repo.taxonomyRequests, currentProviderId]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const catId = selectedCatId || activeCategories[0]?.id;
    const catObj = activeCategories.find((c) => c.id === catId);
    const subNameClean = reqSubName.trim();
    const reasonClean = reqReason.trim();

    if (!catId || !subNameClean || !reasonClean) {
      alert("Harap lengkapi kategori, nama subkategori, dan alasan pengajuan.");
      return;
    }

    try {
      setIsSubmitting(true);
      try {
        await taxonomyApi.submitRequest({
          categoryId: catId,
          requestedSubcategoryName: subNameClean,
          reason: reasonClean,
          notes: reqNotes.trim() || undefined,
        });
      } catch (apiErr) {
        console.warn("taxonomyApi.submitRequest warning:", apiErr);
      }

      repo.submitSubcategoryRequest(
        {
          categoryId: catId,
          requestedSubcategoryName: subNameClean,
          reason: reasonClean,
          notes: reqNotes.trim() || undefined,
        },
        actor
      );

      // Open Success Modal with animated checkmark
      setSuccessModalData({
        categoryName: catObj?.name || "Kategori Terpilih",
        subcategoryName: subNameClean,
        reason: reasonClean,
      });

      setReqSubName("");
      setReqReason("");
      setReqNotes("");
      setToastMessage("Pengajuan subkategori berhasil dikirim ke Admin Operasi.");
      await loadData();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim pengajuan");
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Pengajuan Subkategori Baru"
          description="Ajukan penambahan subkategori spesialisasi baru jika ruang lingkup keahlian bengkel Anda belum tersedia pada taksonomi aktif platform."
          breadcrumbs={[
            { label: "Mitra Bengkel", href: "/provider/dashboard" },
            { label: "Katalog Layanan", href: "/provider/services" },
            { label: "Ajukan Subkategori", href: "/provider/taxonomy-request" },
          ]}
        />
        <Link
          href="/provider/services"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-xs transition"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Pengajuan (Left Column) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="p-2 rounded-xl bg-sky-50 text-[#0F4C81] border border-sky-200">
              <TreeStructure size={20} weight="duotone" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Formulir Pengajuan Subkategori</h2>
              <p className="text-[11px] text-slate-500">Ditinjau oleh Admin Operasi &amp; disahkan oleh CEO.</p>
            </div>
          </div>

          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Induk</label>
              <select
                value={selectedCatId || activeCategories[0]?.id || ""}
                onChange={(e) => setSelectedCatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              >
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Subkategori yang Diajukan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Waterproofing Membran Bakar"
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
                placeholder="Jelaskan potensi permintaan konsumen, kebutuhan industri, atau volume pesanan terkait..."
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                rows={2}
                placeholder="Sertakan informasi sertifikasi teknisi atau kemitraan peralatan bila ada..."
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
              <p className="font-bold text-slate-700">Alur Tata Kelola Taksonomi:</p>
              <p>1. Diajukan oleh Mitra &bull; 2. Verifikasi Admin Operasi &bull; 3. Otorisasi CEO &bull; 4. Dipublikasikan</p>
            </div>

            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-1.5 bg-[#0F4C81] hover:bg-[#0d3f6c] text-white font-bold"
            >
              {isSubmitting ? (
                <>
                  <ArrowsClockwise size={16} className="animate-spin" />
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={16} weight="bold" />
                  <span>Kirim Pengajuan Subkategori</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* History Pengajuan Saya (Right Column) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Riwayat Pengajuan Saya</h2>
              <p className="text-xs text-slate-500">Status peninjauan dan riwayat pengajuan subkategori dari bengkel Anda.</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {myRequests.length} Pengajuan
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <TreeStructure size={32} weight="duotone" className="mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Belum ada riwayat pengajuan subkategori.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {req.categoryName}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{req.requestedSubcategoryName}</h4>
                      <p className="text-[11px] text-slate-400">Diajukan pada: {req.createdAt}</p>
                    </div>
                    <div>
                      {req.status === "SUBMITTED" && (
                        <Badge variant="warning" size="sm">Menunggu Review</Badge>
                      )}
                      {["UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO", "CEO_APPROVED", "CEO_REJECTED"].includes(req.status) && (
                        <Badge variant="neutral" size="sm">Sedang Ditinjau</Badge>
                      )}
                      {req.status === "APPROVED" && (
                        <Badge variant="success" size="sm">Disetujui</Badge>
                      )}
                      {req.status === "PUBLISHED" && (
                        <Badge variant="success" size="sm">Dipublikasikan</Badge>
                      )}
                      {["REJECTED_BY_ADMIN", "REJECTED_BY_CEO"].includes(req.status) && (
                        <Badge variant="danger" size="sm">Ditolak</Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">Alasan: </span>
                    {req.reason}
                  </p>

                  {/* Status Note Card for Provider: Only display official communication from Admin */}
                  {req.status === "APPROVED" && (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                        <span>Pengajuan Disetujui Admin</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        {req.adminReviewNotes || "Pengajuan subkategori Anda telah disetujui. Admin sedang menyiapkan pendaftaran subkategori ke katalog platform."}
                      </p>
                    </div>
                  )}

                  {req.status === "PUBLISHED" && (
                    <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-[#0F4C81] font-bold text-xs">
                        <Sparkle size={16} weight="fill" className="text-[#0F4C81]" />
                        <span>Subkategori Resmi Aktif di Katalog</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Subkategori ini sekarang sudah dapat dipilih saat Anda membuat Master Service dan paket layanan baru.
                      </p>
                    </div>
                  )}

                  {["REJECTED_BY_ADMIN", "REJECTED_BY_CEO"].includes(req.status) && (
                    <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                        <XCircle size={16} weight="fill" className="text-rose-600" />
                        <span>Pengajuan Ditolak</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        <span className="font-semibold">Keterangan Admin: </span>
                        {req.adminReviewNotes || "Pengajuan belum memenuhi kriteria standardisasi taksonomi saat ini."}
                      </p>
                    </div>
                  )}

                  {["UNDER_ADMIN_REVIEW", "FORWARDED_TO_CEO", "CEO_APPROVED", "CEO_REJECTED"].includes(req.status) && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                        <HourglassSimple size={16} weight="bold" className="text-amber-600" />
                        <span>Sedang Ditinjau Tim Operasi</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Pengajuan subkategori Anda sedang dalam proses peninjauan tata kelola operasional dan standardisasi platform.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL POPUP: Pengajuan Berhasil dengan Animasi Checklist */}
      {successModalData && (
        <Modal
          isOpen={!!successModalData}
          onClose={() => setSuccessModalData(null)}
          title="Pengajuan Terkirim"
        >
          <div className="space-y-5 text-center py-2 font-body">
            {/* Animated Checkmark Circle */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border-4 border-emerald-100 animate-in zoom-in-50 duration-300">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-in fade-in zoom-in-75 duration-500">
                <CheckCircle size={36} weight="bold" className="animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Pengajuan Subkategori Berhasil Diajukan!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Permintaan penambahan subkategori baru Anda telah masuk ke sistem antrean peninjauan Admin Operasi.
              </p>
            </div>

            <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Kategori Induk:</span>
                <span className="font-bold text-slate-900">{successModalData.categoryName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Nama Subkategori:</span>
                <span className="font-bold text-[#0F4C81]">{successModalData.subcategoryName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block mb-0.5">Alasan Pengajuan:</span>
                <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 font-medium text-[11px] italic">
                  &ldquo;{successModalData.reason}&rdquo;
                </p>
              </div>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                <Clock size={14} />
                <span>Status: Menunggu Review Admin Operasi &rarr; Verifikasi CEO</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                className="w-full bg-[#0F4C81] hover:bg-[#0d3f6c] text-white font-bold"
                onClick={() => setSuccessModalData(null)}
              >
                Mengerti &amp; Pantau Riwayat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
