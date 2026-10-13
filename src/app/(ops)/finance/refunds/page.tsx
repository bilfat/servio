"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Receipt,
  MagnifyingGlass,
  ArrowRight,
  CheckCircle,
  WarningCircle,
  XCircle,
  Check,
  X,
  Clock,
  ShieldCheck,
  Scales,
  Package,
  User,
  Bank,
  FileText,
} from "@phosphor-icons/react";
import { useFinanceOperations, RefundRequest } from "@/features/finance/useFinanceOperations";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useUrlQueryState } from "@/hooks/useUrlQueryState";
import { refundAuditSchema, RefundAuditFormValues } from "@/lib/validation/schemas";
import { refundsApi } from "@/lib/servioApi";

export default function RefundOperationsQueuePage() {
  const { refunds, approveRefund, rejectRefund } = useFinanceOperations();
  const { getParam, setParam } = useUrlQueryState();

  const searchQuery = getParam("q", "");
  const statusFilter = getParam("status", "ALL");

  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [serverRefunds, setServerRefunds] = useState<any[]>([]);

  const fetchRefunds = async () => {
    try {
      const res = await refundsApi.list();
      if (res && res.data) {
        setServerRefunds(res.data);
      }
    } catch (err) {
      console.warn("Could not load backend refunds:", err);
    }
  };

  React.useEffect(() => {
    fetchRefunds();
  }, []);

  const combinedRefunds: RefundRequest[] = useMemo(() => {
    if (serverRefunds && serverRefunds.length > 0) {
      return serverRefunds.map((sr): RefundRequest => ({
        id: sr.refundId || sr.id,
        orderId: sr.orderId,
        disputeCaseId: sr.disputeCaseId || undefined,
        customerName: sr.customerName || (sr.customerId ? `Customer (${sr.customerId.slice(-6)})` : "Pelanggan"),
        customerBank: sr.refundDestination || "ORIGINAL_PAYMENT_CHANNEL",
        customerAccountNo: sr.providerRefundReference || sr.originalTransactionId || "Gateway Settlement",
        refundAmount: (sr.amount !== undefined ? sr.amount : sr.refundAmount) || 0,
        escrowTotal: (sr.amount !== undefined ? sr.amount : sr.refundAmount) || 0,
        reason: sr.reason || "Pengembalian dana resmi Finance",
        source: sr.returnId ? "RETURN_PARTS" : (sr.warrantyId ? "CS_MEDIATION" : "AUTO_CANCELLATION"),
        status: sr.status === "COMPLETED" ? "APPROVED" : (sr.status === "PENDING" ? "PENDING_APPROVAL" : sr.status),
        requestedAt: sr.createdAt ? new Date(sr.createdAt).toLocaleDateString("id-ID") : "Hari ini",
        auditNotes: sr.status === "COMPLETED" ? "Telah dieksekusi resmi oleh Finance Payment Ops" : undefined,
      }));
    }
    return refunds;
  }, [serverRefunds, refunds]);

  // RHF + Zod for Refund Audit (ROOT-04)
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RefundAuditFormValues>({
    resolver: zodResolver(refundAuditSchema),
    defaultValues: {
      decision: "APPROVE",
      auditNotes: "",
      confirmDisbursement: false,
    },
  });

  const handleOpenModal = (r: RefundRequest, action: "APPROVE" | "REJECT") => {
    setSelectedRefund(r);
    setModalAction(action);
    setValue("decision", action);
    setValue(
      "auditNotes",
      action === "APPROVE"
        ? "Audit rekening dan verifikasi CS mediasi valid. Disetujui untuk transfer dana."
        : "Alasan penahanan audit / ketidaksesuaian rekening nasabah."
    );
    setValue("confirmDisbursement", false);
  };

  const onAuditSubmit = async (data: RefundAuditFormValues) => {
    if (!selectedRefund || !modalAction) return;

    if (modalAction === "APPROVE") {
      try {
        await refundsApi.execute({
          orderId: selectedRefund.orderId,
          amount: selectedRefund.refundAmount,
          reason: data.auditNotes,
          refundId: selectedRefund.id,
        });
        setToastMessage(
          `Refund ${selectedRefund.id} sebesar Rp ${selectedRefund.refundAmount.toLocaleString(
            "id-ID"
          )} telah DISETUJUI dan mutasi resmi dicatat oleh Finance.`
        );
        fetchRefunds();
      } catch (err: any) {
        approveRefund(selectedRefund.id, data.auditNotes);
        setToastMessage(
          `Refund ${selectedRefund.id} sebesar Rp ${selectedRefund.refundAmount.toLocaleString(
            "id-ID"
          )} telah DISETUJUI dan mutasi dicatat.`
        );
      }
    } else {
      rejectRefund(selectedRefund.id, data.auditNotes);
      setToastMessage(`Refund ${selectedRefund.id} telah DITOLAK dengan catatan audit.`);
    }

    setSelectedRefund(null);
    setModalAction(null);
    reset();
  };

  const filteredRefunds = useMemo(() => {
    return combinedRefunds.filter((r) => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerBank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      return true;
    });
  }, [combinedRefunds, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 pb-16 font-body text-left">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            Escrow Reversal & Refund Queue
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
            Antrean Persetujuan Pengembalian Dana (Refund)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Tinjau pengajuan pencairan balik dana penampung hasil putusan mediasi sengketa CS atau retur suku cadang sebelum ditransfer ke rekening pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-2 rounded-2xl bg-slate-100 text-slate-700">
            Total {refunds.length} Pengajuan Refund
          </span>
        </div>
      </div>

      {/* Filter & Search Bar (Sync with URL ROOT-06) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <MagnifyingGlass
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="Cari ID refund (REF-...), order, nama customer, atau bank..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "PENDING_APPROVAL", label: "Perlu Persetujuan" },
              { id: "APPROVED", label: "Disetujui" },
              { id: "REJECTED_AUDIT", label: "Ditolak" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setParam("status", st.id === "ALL" ? null : st.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === st.id
                    ? "bg-[#0F4C81] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Refund Items List */}
      {filteredRefunds.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={searchQuery || statusFilter !== "ALL" ? "Tidak Ada Refund yang Cocok" : "Antrean Refund Kosong"}
          description={
            searchQuery || statusFilter !== "ALL"
              ? "Tidak ditemukan pengajuan refund yang sesuai dengan filter pencarian Anda."
              : "Saat ini tidak ada permohonan pengembalian dana yang menunggu proses audit."
          }
          action={
            searchQuery || statusFilter !== "ALL" ? (
              <Button size="sm" variant="outline" onClick={() => { setParam("q", null); setParam("status", null); }}>
                Reset Filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRefunds.map((r) => {
            const isPending = r.status === "PENDING_APPROVAL";
            const isApproved = r.status === "APPROVED" || r.status === "COMPLETED";

            return (
              <div
                key={r.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition hover:border-slate-300"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200">
                      {r.id}
                    </span>
                    <span className="font-mono text-xs text-slate-400">Order #{r.orderId}</span>
                    {r.disputeCaseId && (
                      <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 flex items-center gap-1">
                        <Scales size={12} />
                        Mediasi #{r.disputeCaseId}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isPending ? "Menunggu Audit" : isApproved ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{r.reason}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User size={14} className="text-slate-400" />
                        {r.customerName}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                        <Bank size={14} className="text-slate-400" />
                        {r.customerBank} ({r.customerAccountNo})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        Diajukan: {r.requestedAt}
                      </span>
                    </div>
                  </div>

                  {r.auditNotes && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      Catatan Audit: &quot;{r.auditNotes}&quot;
                    </p>
                  )}
                </div>

                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nilai Refund</p>
                    <p className="text-base font-bold font-mono text-rose-600">
                      Rp {r.refundAmount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      dari Escrow: Rp {r.escrowTotal.toLocaleString("id-ID")}
                    </p>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(r, "REJECT")}
                        className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        Tolak
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenModal(r, "APPROVE")}
                      >
                        Setujui Refund
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACCESSIBLE AUDIT MODAL (ROOT-08, ROOT-04) */}
      <Modal
        isOpen={!!selectedRefund && !!modalAction}
        onClose={() => { setSelectedRefund(null); setModalAction(null); }}
        title={modalAction === "APPROVE" ? "Persetujuan Pengembalian Dana" : "Tolak / Tahan Pengembalian Dana"}
        description={`Tiket Refund: ${selectedRefund?.id || ""} (Order ${selectedRefund?.orderId || ""})`}
        maxWidth="md"
      >
        {selectedRefund && (
          <form onSubmit={handleSubmit(onAuditSubmit)} className="space-y-4">
            <input type="hidden" {...register("decision")} value={modalAction || "APPROVE"} />

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Penerima Dana:</span>
                <span className="font-bold text-slate-900">{selectedRefund.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank & Rekening:</span>
                <span className="font-mono text-slate-800">
                  {selectedRefund.customerBank} - {selectedRefund.customerAccountNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Transfer:</span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  Rp {selectedRefund.refundAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {modalAction === "APPROVE"
                  ? "Catatan Kliring Finance (Wajib minimal 10 karakter):"
                  : "Alasan Audit Penolakan / Penahanan Refund (Wajib):"}
              </label>
              <textarea
                {...register("auditNotes")}
                rows={3}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
              />
              {errors.auditNotes && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.auditNotes.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                {...register("confirmDisbursement")}
                className="w-4 h-4 rounded text-primary accent-primary"
              />
              <span className="text-[11px] text-slate-700 font-medium">
                Saya mengonfirmasi bahwa data nasabah dan putusan telah diverifikasi.
              </span>
            </label>
            {errors.confirmDisbursement && (
              <p className="text-[11px] text-rose-500">{errors.confirmDisbursement.message}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setSelectedRefund(null); setModalAction(null); }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant={modalAction === "APPROVE" ? "primary" : "outline"}
                isLoading={isSubmitting}
                className={modalAction === "REJECT" ? "border-rose-200 text-rose-600 hover:bg-rose-50" : ""}
              >
                {modalAction === "APPROVE" ? "Konfirmasi Setujui Refund" : "Simpan Putusan Tolak"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
