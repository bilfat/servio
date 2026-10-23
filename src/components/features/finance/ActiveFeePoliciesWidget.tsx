"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Receipt,
  Percent,
  Sliders,
  CheckCircle,
  ArrowRight,
  Info,
} from "@phosphor-icons/react";
import { ActiveFeePolicyItem } from "@/types/finance";

export interface ActiveFeePoliciesWidgetProps {
  policies: ActiveFeePolicyItem[];
  isReadOnly?: boolean; // True for Finance, False for CEO
  editHref?: string;
  className?: string;
}

export function ActiveFeePoliciesWidget({
  policies,
  isReadOnly = true,
  editHref = "/ceo/governance/policies",
  className = "",
}: ActiveFeePoliciesWidgetProps) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#0F4C81]">
              <ShieldCheck size={18} weight="bold" />
            </span>
            <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              Kebijakan Biaya Platform Aktif (Fee Governance)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isReadOnly
              ? "Parameter biaya Model C yang berlaku secara operasional (Hak akses read-only)"
              : "Ringkasan tarif resmi platform yang ditetapkan oleh CEO"}
          </p>
        </div>

        {!isReadOnly && editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold hover:bg-[#0B3860] transition shadow-xs self-start sm:self-auto"
          >
            <Sliders size={14} weight="bold" />
            <span>Kelola Kebijakan di Governance</span>
          </Link>
        )}
      </div>

      {isReadOnly && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-[11px] flex items-center gap-2">
          <Info size={16} className="text-slate-400 shrink-0" />
          <span>
            Finance memantau kebijakan biaya secara <strong>read-only</strong>. Perubahan parameter tarif dan komisi hanya dapat diajukan & diotorisasi melalui portal CEO.
          </span>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {policies.map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                  {p.orderType === "PRODUCT" ? "Produk" : "Jasa"}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle size={10} weight="fill" />
                  <span>{p.version}</span>
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                {p.title}
              </h4>
            </div>

            <div>
              <div className="text-xl font-black font-display text-slate-900">
                {p.displayValue}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {p.notes}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
