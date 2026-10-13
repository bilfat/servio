"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bank,
  CheckCircle,
  Clock,
  WarningCircle,
  ArrowRight,
  CurrencyCircleDollar,
  Receipt,
  ShieldCheck,
  Plus,
} from "@phosphor-icons/react";
import { useDomainRepository } from "@/lib/repository/domainRepository";
import { Toast } from "@/components/feedback/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export default function ProviderPayoutsPage() {
  const repo = useDomainRepository();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(2500000);

  const payouts = repo.payouts;
  const availableBalance = 4850000;

  const handleRequestPayout = () => {
    setShowRequestModal(false);
    setToastMessage(`Permintaan pencairan dana sebesar Rp ${payoutAmount.toLocaleString("id-ID")} telah dikirim ke bagian Finansial.`);
  };

  return (
    <div className="space-y-6 pb-20 font-body">
      {toastMessage && (
        <Toast message={toastMessage} type="success" onClose={() => setToastMessage(null)} />
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C81] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Pencairan Saldo &amp; Payout
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-1">
              Manajemen Payout Mitra
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Tarik saldo penghasilan jasa ke rekening bank terverifikasi secara aman dan transparan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs self-start sm:self-auto"
          >
            <Plus size={16} weight="bold" />
            <span>Tarik Saldo Payout</span>
          </button>
        </div>
      </div>

      {/* Payout Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-xs space-y-2 bg-gradient-to-br from-white to-emerald-50/20">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Saldo Tersedia untuk Ditarik
          </span>
          <p className="text-3xl font-bold font-display text-emerald-700">
            Rp {availableBalance.toLocaleString("id-ID")}
          </p>
          <p className="text-xs text-slate-500">
            Rekening tujuan: BCA 5420-119-002 (PT Bintang Teknik Mandiri)
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ketentuan Pencairan
          </span>
          <ul className="text-xs text-slate-600 space-y-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              Minimal pencairan Rp 100.000
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              Proses transfer bank 1x24 jam di hari kerja
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              Bebas biaya admin transfer bank BCA
            </li>
          </ul>
        </div>
      </div>

      {/* Payout History List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold font-display text-slate-900 border-b border-slate-100 pb-3">
          Riwayat Pengajuan Payout
        </h2>

        <div className="divide-y divide-slate-100">
          {payouts.map((p) => {
            const isReady = p.status === "READY_BATCH";
            const isHeld = p.status === "HELD_FRAUD_CHECK";

            return (
              <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-display text-slate-900">{p.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isReady
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isHeld
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isReady ? "Siap Ditransfer" : isHeld ? "Pemeriksaan Fraud" : p.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    {p.bankName} • {p.bankAccountNo} a/n {p.accountHolder}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    Diajukan: {p.requestedAt} ({p.totalOrders} order)
                  </p>
                  {p.holdReason && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      {p.holdReason}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-base font-bold font-display text-slate-900">
                    Rp {p.payoutAmount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-slate-400">Risk Score: {p.riskScore}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Tarik Saldo */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Tarik Saldo Penghasilan"
        description="Pilih nominal penarikan dana yang akan ditransfer ke rekening bank terdaftar Anda."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nominal Penarikan (Rp)
            </label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(Number(e.target.value))}
              max={availableBalance}
              min={100000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-base text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Maksimum penarikan: Rp {availableBalance.toLocaleString("id-ID")}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Rekening Tujuan:</p>
            <p>Bank Central Asia (BCA) - 5420-119-002</p>
            <p>a/n PT Bintang Teknik Mandiri</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRequestModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleRequestPayout}>
              Kirim Pengajuan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
