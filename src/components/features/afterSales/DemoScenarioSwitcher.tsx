"use client";

import React, { useState } from "react";
import { SlidersHorizontal, ArrowsCounterClockwise, CaretDown, CaretUp } from "@phosphor-icons/react";
import { useAfterSales } from "@/features/afterSales/useAfterSales";

interface DemoScenarioSwitcherProps {
  onSelectCase?: (caseId: string) => void;
  onSelectTab?: (tab: "active" | "submissions" | "expired") => void;
}

export function DemoScenarioSwitcher({ onSelectCase, onSelectTab }: DemoScenarioSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { cases, resetDemoData } = useAfterSales();

  const scenarios = [
    {
      id: "sc-1",
      title: "1. Garansi Aktif Barang / Jasa",
      action: () => onSelectTab && onSelectTab("active"),
    },
    {
      id: "sc-2",
      title: "2. Garansi Berakhir (Expired)",
      action: () => onSelectTab && onSelectTab("expired"),
    },
    {
      id: "sc-5",
      title: "5. Klaim Jasa Disetujui (Pekerjaan Rp0)",
      caseId: "CAS-CLM-SRV-01",
    },
    {
      id: "sc-6",
      title: "6. Klaim Jasa Belum Diputuskan / Inspeksi",
      caseId: "CAS-CLM-SRV-02",
    },
    {
      id: "sc-7",
      title: "7. Retur Parsial 1 dari 2 Unit",
      caseId: "CAS-RET-PRD-01",
    },
    {
      id: "sc-8",
      title: "8. Retur Tanpa Kirim Balik (Komponen Kurang)",
      caseId: "CAS-RET-PRD-02",
    },
    {
      id: "sc-9",
      title: "9. Penggantian Barang Sedang Dikirim",
      caseId: "CAS-RET-PRD-01",
    },
    {
      id: "sc-10a",
      title: "10A. Refund Berhasil Masuk S-Pay (Demo)",
      caseId: "CAS-REF-PRD-01",
    },
    {
      id: "sc-10b",
      title: "10B. Refund Disetujui / Diproses (Belum Cair)",
      caseId: "CAS-REF-PRD-02",
    },
    {
      id: "sc-10c",
      title: "10C. Refund Terkendala",
      caseId: "CAS-REF-PRD-03",
    },
    {
      id: "sc-11",
      title: "11. NO_RESPONSE 72 Jam + Laporkan Masalah",
      caseId: "CAS-NO-RESP-01",
    },
    {
      id: "sc-12",
      title: "12. Solusi Alternatif Menunggu Persetujuan Customer",
      caseId: "CAS-ALT-PROP-01",
    },
    {
      id: "sc-4",
      title: "4. Klaim Barang Ditolak dengan Alasan",
      caseId: "CAS-REJ-PRD-01",
    },
  ];

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-3 text-xs mb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 font-bold text-slate-700 hover:text-primary transition"
        >
          <SlidersHorizontal size={15} weight="bold" className="text-primary" />
          <span>SIMULATOR SKENARIO DEMO AFTER-SALES (12 KASUS DETERMINISTIK)</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
            DEMO
          </span>
          {isOpen ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
        </button>

        <button
          type="button"
          onClick={resetDemoData}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
          title="Kembalikan semua data ke awal"
        >
          <ArrowsCounterClockwise size={13} weight="bold" />
          Reset Data Demo
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                if (sc.caseId && onSelectCase) {
                  onSelectCase(sc.caseId);
                } else if (sc.action) {
                  sc.action();
                }
              }}
              className="text-left p-2 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-sky/20 transition text-[11px] font-semibold text-slate-700 line-clamp-1"
            >
              {sc.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
