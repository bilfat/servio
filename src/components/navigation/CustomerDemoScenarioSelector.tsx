"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CUSTOMER_SCENARIOS_META, CustomerScenarioMeta } from "@/mocks/customerScenarios";
import {
  CaretDown,
  CaretUp,
  Flask,
  CheckCircle,
  Clock,
  WarningCircle,
  CurrencyCircleDollar,
  Wrench,
  Package,
  ShieldCheck,
  ArrowSquareOut,
} from "@phosphor-icons/react";

interface CustomerDemoScenarioSelectorProps {
  currentOrderId?: string;
  onSelectScenario?: (orderId: string) => void;
}

export function CustomerDemoScenarioSelector({
  currentOrderId: _currentOrderId,
  onSelectScenario: _onSelectScenario,
}: CustomerDemoScenarioSelectorProps) {
  return null;
}

function _UnusedCustomerDemoScenarioSelector({
  currentOrderId,
  onSelectScenario,
}: CustomerDemoScenarioSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const activeScenario = CUSTOMER_SCENARIOS_META.find(
    (s) => s.orderId === currentOrderId || s.id.toLowerCase() === currentOrderId?.toLowerCase()
  );

  const categories = [
    { id: "ALL", label: "Semua Skenario (28)" },
    { id: "BOOKING_ASSIGNMENT", label: "Booking & Penugasan (SC01-03)" },
    { id: "DIAGNOSIS_PRICING", label: "Diagnosis & Biaya (SC04-09)" },
    { id: "SPAREPART_PRODUCT", label: "Sparepart & Toko (SC10-17)" },
    { id: "PAYMENT", label: "Pembayaran (SC18-20)" },
    { id: "EXECUTION_PROOF", label: "Pengerjaan & Bukti (SC21-22)" },
    { id: "COMPLETION_POST", label: "Penyelesaian & Purna Jual (SC23-28)" },
  ];

  const filteredScenarios = CUSTOMER_SCENARIOS_META.filter((sc) => {
    if (selectedCategory !== "ALL" && sc.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sc.id.toLowerCase().includes(q) ||
        sc.title.toLowerCase().includes(q) ||
        sc.description.toLowerCase().includes(q) ||
        sc.orderId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelect = (scenario: CustomerScenarioMeta) => {
    if (onSelectScenario) {
      onSelectScenario(scenario.orderId);
    }
    if (pathname !== `/orders/${scenario.orderId}`) {
      router.push(`/orders/${scenario.orderId}`);
    }
  };

  return (
    <div className="w-full bg-slate-900 border-b border-amber-500/30 text-white shadow-md z-40 transition-all">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-extrabold border border-amber-500/40 tracking-wider">
            <Flask size={14} weight="fill" />
            DEV / DEMO FIXTURE SELECTOR
          </span>

          {activeScenario ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">
                [{activeScenario.id}]
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {activeScenario.title}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Status: {activeScenario.expectedStatus}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              Pilih 1 dari 28 skenario deterministic untuk demo & verifikasi langsung seluruh alur.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
          >
            <span>{isExpanded ? "Tutup Pilihan Skenario" : "Ganti Skenario (28 Fixtures)"}</span>
            {isExpanded ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
          </button>
        </div>
      </div>

      {/* Expanded Scenario Drawer */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950/95 px-4 sm:px-6 lg:px-8 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Active Scenario Explainer Card */}
          {activeScenario && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span>{activeScenario.id}: {activeScenario.title}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-amber-900/60 rounded border border-amber-700/60">
                    ID: {activeScenario.orderId}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {activeScenario.description}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400">Aksi Utama:</span>
                <span className="px-2.5 py-1 rounded bg-primary/20 text-sky font-semibold text-xs border border-primary/40">
                  {activeScenario.primaryActionLabel}
                </span>
              </div>
            </div>
          )}

          {/* Category Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari skenario (e.g. SC-C06, Kapasitor, Garansi)..."
              className="px-3.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 sm:w-72"
            />
          </div>

          {/* Grid of Scenario Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredScenarios.map((sc) => {
              const isCurrent = sc.orderId === currentOrderId || sc.id.toLowerCase() === currentOrderId?.toLowerCase();
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    handleSelect(sc);
                    setIsExpanded(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 group ${
                    isCurrent
                      ? "bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50 shadow-sm"
                      : "bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-mono text-xs font-bold ${isCurrent ? "text-amber-400" : "text-amber-300 group-hover:text-amber-200"}`}>
                        {sc.id}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {sc.expectedStatus}
                      </span>
                    </div>
                    <p className={`text-xs font-semibold line-clamp-2 ${isCurrent ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
                      {sc.title}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[170px] text-slate-400">{sc.primaryActionLabel}</span>
                    <ArrowSquareOut size={13} className="text-slate-500 group-hover:text-amber-400 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
