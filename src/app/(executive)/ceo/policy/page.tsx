"use client";

import React from "react";
import { useCeoPolicyGovernance, PolicyTab } from "@/features/ceo/useCeoPolicyGovernance";
import { PageHeader } from "@/components/layout/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  ArrowUUpLeft,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkle,
  Sliders,
} from "@phosphor-icons/react";

export default function CeoPolicyGovernancePage() {
  const {
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    confirmModalOpen,
    setConfirmModalOpen,
    successMessage,
    shippingPolicy,
    returnPolicy,
    guaranteePolicy,
    shippingDraft,
    setShippingDraft,
    returnDraft,
    setReturnDraft,
    guaranteeDraft,
    setGuaranteeDraft,
    startEdit,
    handlePublishCurrentTab,
  } = useCeoPolicyGovernance();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tata Kelola Kebijakan Logistik, Retur & Garansi"
        description="Pengaturan strategis batas SLA pengiriman, syarat bukti retur fisik, dan standar perlindungan garansi digital pelanggan."
        breadcrumbs={[
          { label: "Executive", href: "/ceo/dashboard" },
          { label: "Policy Governance", href: "/ceo/policy" },
        ]}
      />

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
          <CheckCircle size={20} className="text-emerald-600 shrink-0" weight="fill" />
          <div className="text-xs">
            <p className="font-bold">Pembaruan Kebijakan Berhasil Disahkan</p>
            <p className="opacity-90 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Policy Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("shipping");
            setIsEditing(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
            activeTab === "shipping"
              ? "border-primary text-primary bg-sky/20"
              : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
          }`}
        >
          <Truck size={16} />
          <span>1. Kebijakan Logistik & SLA Pengiriman</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("return");
            setIsEditing(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
            activeTab === "return"
              ? "border-primary text-primary bg-sky/20"
              : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
          }`}
        >
          <ArrowUUpLeft size={16} />
          <span>2. Kebijakan Retur & Mitigasi Fraud</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("guarantee");
            setIsEditing(false);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
            activeTab === "guarantee"
              ? "border-primary text-primary bg-sky/20"
              : "border-transparent text-neutral-slate hover:text-neutral-dark hover:bg-slate-50"
          }`}
        >
          <ShieldCheck size={16} />
          <span>3. Jaminan Pengerjaan & Garansi Escrow</span>
        </button>
      </div>

      {/* TAB 1: Shipping Policy */}
      {activeTab === "shipping" && (
        <div className="glass-card p-6 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-dark font-display">
                  Standar Logistik & SLA Kurir Ekosistem
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {shippingPolicy.version} • {shippingPolicy.status}
                </span>
              </div>
              <p className="text-xs text-neutral-slate mt-0.5">
                Terakhir disahkan: {shippingPolicy.updatedAt} oleh {shippingPolicy.updatedBy}
              </p>
            </div>

            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Ubah Parameter Kebijakan
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" onClick={() => setConfirmModalOpen(true)}>
                  Sahkan Kebijakan Logistik
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">SLA Fulfillment Reguler</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={shippingDraft.standardFulfillmentSlaHours}
                  onChange={(e) =>
                    setShippingDraft({
                      ...shippingDraft,
                      standardFulfillmentSlaHours: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-primary"
                />
                <span className="text-xs font-semibold text-neutral-slate">Jam kerja</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Batas waktu Merchant pick & pack paket</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">SLA Fulfillment Express</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={shippingDraft.expressFulfillmentSlaHours}
                  onChange={(e) =>
                    setShippingDraft({
                      ...shippingDraft,
                      expressFulfillmentSlaHours: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-primary"
                />
                <span className="text-xs font-semibold text-neutral-slate">Jam kerja</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Khusus pesanan darurat & kurir instan</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Eskalasi Kurir Webhook</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={shippingDraft.carrierEscalationThresholdMinutes}
                  onChange={(e) =>
                    setShippingDraft({
                      ...shippingDraft,
                      carrierEscalationThresholdMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-primary"
                />
                <span className="text-xs font-semibold text-neutral-slate">Menit</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Ambang batas tanpa update status AWB</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-neutral-dark">Catatan Implementasi Kebijakan</span>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={shippingDraft.notes}
              onChange={(e) => setShippingDraft({ ...shippingDraft, notes: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border bg-white disabled:bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Return Policy */}
      {activeTab === "return" && (
        <div className="glass-card p-6 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-dark font-display">
                  Ketentuan Retur & Pencegahan Fraud Suku Cadang
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {returnPolicy.version} • {returnPolicy.status}
                </span>
              </div>
              <p className="text-xs text-neutral-slate mt-0.5">
                Terakhir disahkan: {returnPolicy.updatedAt} oleh {returnPolicy.updatedBy}
              </p>
            </div>

            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Ubah Parameter Kebijakan
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" onClick={() => setConfirmModalOpen(true)}>
                  Sahkan Kebijakan Retur
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Jendela Retur Retail</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={returnDraft.retailReturnWindowDays}
                  onChange={(e) =>
                    setReturnDraft({
                      ...returnDraft,
                      retailReturnWindowDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-purple-600"
                />
                <span className="text-xs font-semibold text-neutral-slate">Hari kalender</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Masa garansi tukar produk cacat pabrik</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Jendela Retur Grosir B2B</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={returnDraft.b2bReturnWindowDays}
                  onChange={(e) =>
                    setReturnDraft({
                      ...returnDraft,
                      b2bReturnWindowDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-indigo-600"
                />
                <span className="text-xs font-semibold text-neutral-slate">Hari kalender</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Pengembalian partai besar ke distributor</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Bukti Video Unboxing</span>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-unboxing"
                  disabled={!isEditing}
                  checked={returnDraft.requireUnboxingVideo}
                  onChange={(e) =>
                    setReturnDraft({ ...returnDraft, requireUnboxingVideo: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-primary"
                />
                <label htmlFor="chk-unboxing" className="text-xs font-bold text-neutral-dark">
                  Wajib Lampirkan Video
                </label>
              </div>
              <p className="text-[10px] text-neutral-muted">Video tanpa jeda untuk klaim sparepart</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-neutral-dark">Catatan Implementasi Kebijakan</span>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={returnDraft.notes}
              onChange={(e) => setReturnDraft({ ...returnDraft, notes: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border bg-white disabled:bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* TAB 3: Guarantee Policy */}
      {activeTab === "guarantee" && (
        <div className="glass-card p-6 rounded-2xl border border-slate-200/80 shadow-servio-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-dark font-display">
                  Standar Jaminan Servis & Resolusi Garansi
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {guaranteePolicy.version} • {guaranteePolicy.status}
                </span>
              </div>
              <p className="text-xs text-neutral-slate mt-0.5">
                Terakhir disahkan: {guaranteePolicy.updatedAt} oleh {guaranteePolicy.updatedBy}
              </p>
            </div>

            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Ubah Parameter Kebijakan
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" onClick={() => setConfirmModalOpen(true)}>
                  Sahkan Kebijakan Garansi
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Garansi Pengerjaan (Jasa)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={guaranteeDraft.workmanshipWarrantyDays}
                  onChange={(e) =>
                    setGuaranteeDraft({
                      ...guaranteeDraft,
                      workmanshipWarrantyDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-emerald-600"
                />
                <span className="text-xs font-semibold text-neutral-slate">Hari</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Jaminan revisi pengerjaan ulang gratis</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Garansi Suku Cadang</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={guaranteeDraft.sparepartWarrantyDays}
                  onChange={(e) =>
                    setGuaranteeDraft({
                      ...guaranteeDraft,
                      sparepartWarrantyDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-emerald-600"
                />
                <span className="text-xs font-semibold text-neutral-slate">Hari</span>
              </div>
              <p className="text-[10px] text-neutral-muted">Proteksi komponen resmi dari mitra</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-slate uppercase">Ambang Auto-Refund Escrow</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isEditing}
                  value={guaranteeDraft.autoRefundThreshold}
                  onChange={(e) =>
                    setGuaranteeDraft({
                      ...guaranteeDraft,
                      autoRefundThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32 p-2 rounded-lg border bg-white disabled:bg-slate-100 text-sm font-bold text-emerald-600"
                />
              </div>
              <p className="text-[10px] text-neutral-muted">Persetujuan instan tanpa eskalasi manual</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-neutral-dark">Catatan Implementasi Kebijakan</span>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={guaranteeDraft.notes}
              onChange={(e) => setGuaranteeDraft({ ...guaranteeDraft, notes: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border bg-white disabled:bg-slate-100"
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Pengesahan Kebijakan Tata Kelola"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold">Konfirmasi Pengesahan Peraturan</p>
            <p className="mt-0.5 opacity-90">
              Kebijakan baru ini akan langsung mengikat secara operasional ke seluruh alur logistik, klaim retur,
              dan perlindungan konsumen SERVIO.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setConfirmModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handlePublishCurrentTab}>
              Sahkan Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
