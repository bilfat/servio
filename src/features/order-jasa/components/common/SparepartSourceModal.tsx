"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  Cube,
  Storefront,
  User,
  Buildings,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Info,
} from "@phosphor-icons/react";
import { SparepartItem, SparepartSource } from "../../types";

interface SparepartSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  spareparts: SparepartItem[];
  onSaveSourceSelection: (updatedParts: SparepartItem[]) => void;
}

export function SparepartSourceModal({
  isOpen,
  onClose,
  spareparts,
  onSaveSourceSelection,
}: SparepartSourceModalProps) {
  const [items, setItems] = useState<SparepartItem[]>(spareparts);

  const handleSourceChange = (idx: number, newSource: SparepartSource) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        let unitPrice = item.unitPrice;
        if (newSource === "CUSTOMER") {
          unitPrice = 0; // Rp0 di tagihan jasa 05B
        } else if (newSource === "PROVIDER" && unitPrice === 0) {
          unitPrice = 75000;
        }
        return {
          ...item,
          source: newSource,
          unitPrice,
          subtotal: unitPrice * item.qty,
        };
      })
    );
  };

  const handleConfirm = () => {
    onSaveSourceSelection(items);
    onClose();
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih Sumber Penyediaan Suku Cadang"
      size="lg"
    >
      <div className="space-y-5 text-xs text-slate-700">
        <p className="text-slate-600 leading-relaxed">
          Anda memiliki kebebasan menentukan sumber suku cadang yang digunakan oleh teknisi untuk perbaikan ini:
        </p>

        <div className="space-y-4">
          {items.map((sp, idx) => (
            <div
              key={sp.id || idx}
              className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{sp.name}</h4>
                  <p className="text-[11px] text-slate-500">{sp.specification || "Suku cadang standar perbaikan"}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  Kebutuhan: {sp.qty} Unit
                </span>
              </div>

              {/* 3 Source Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* 1. Provider */}
                <button
                  type="button"
                  onClick={() => handleSourceChange(idx, "PROVIDER")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    sp.source === "PROVIDER"
                      ? "bg-sky-50 border-primary ring-1 ring-primary/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <Buildings size={13} className="text-primary" weight="bold" />
                      <span>Dari Bengkel</span>
                    </span>
                    {sp.source === "PROVIDER" && (
                      <CheckCircle size={14} weight="fill" className="text-primary" />
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-primary">
                    {formatRupiah(sp.unitPrice * sp.qty)}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Disediakan langsung oleh teknisi saat ini.
                  </span>
                </button>

                {/* 2. Merchant SERVIO */}
                <button
                  type="button"
                  onClick={() => handleSourceChange(idx, "MERCHANT_05A")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    sp.source === "MERCHANT_05A"
                      ? "bg-sky-50 border-primary ring-1 ring-primary/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <Storefront size={13} className="text-emerald-600" weight="bold" />
                      <span>Beli di Toko SERVIO</span>
                    </span>
                    {sp.source === "MERCHANT_05A" && (
                      <CheckCircle size={14} weight="fill" className="text-primary" />
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-700">
                    Beli Terpisah
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Order via marketplace produk SERVIO (05A).
                  </span>
                </button>

                {/* 3. Customer Supplied */}
                <button
                  type="button"
                  onClick={() => handleSourceChange(idx, "CUSTOMER")}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    sp.source === "CUSTOMER"
                      ? "bg-sky-50 border-primary ring-1 ring-primary/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <User size={13} className="text-slate-600" weight="bold" />
                      <span>Milik Sendiri</span>
                    </span>
                    {sp.source === "CUSTOMER" && (
                      <CheckCircle size={14} weight="fill" className="text-primary" />
                    )}
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    Rp 0 (Tagihan Jasa)
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Anda sudah memiliki suku cadang yang cocok.
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
          <Info size={15} weight="bold" className="text-amber-700 shrink-0 mt-0.5" />
          <span>
            Jika Anda mengubah sumber suku cadang, versi rincian biaya akan diperbarui dan teknisi akan memastikan kompatibilitas fisik barang sebelum memulai pengerjaan.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition shadow-xs"
          >
            Terapkan Perubahan Sumber
          </button>
        </div>
      </div>
    </Modal>
  );
}
