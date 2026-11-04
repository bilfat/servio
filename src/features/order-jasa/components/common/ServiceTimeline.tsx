"use client";

import React from "react";
import {
  CheckCircle,
  Clock,
  Wrench,
  CreditCard,
  User,
  ShieldCheck,
  WarningCircle,
  XCircle,
  Bank,
  Buildings,
} from "@phosphor-icons/react";
import { ServiceOrderTimelineEvent } from "../../types";

interface ServiceTimelineProps {
  events: ServiceOrderTimelineEvent[];
}

export function ServiceTimeline({ events }: ServiceTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
        Belum ada riwayat aktivitas yang tercatat.
      </div>
    );
  }

  const getActorBadge = (role: string) => {
    switch (role) {
      case "CUSTOMER":
        return { label: "Pelanggan", color: "bg-blue-50 text-blue-800 border-blue-200" };
      case "WORKER":
        return { label: "Teknisi", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "PROVIDER":
        return { label: "Bengkel / Provider", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "FINANCE":
        return { label: "Finance Ops", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "SYSTEM":
        return { label: "Sistem", color: "bg-slate-100 text-slate-700 border-slate-200" };
      default:
        return { label: role, color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getEventIcon = (type?: string) => {
    const t = type || "";
    if (t.includes("PAID") || t.includes("INVOICE")) {
      return <CreditCard size={14} weight="bold" className="text-amber-600" />;
    }
    if (t.includes("CANCELLED") || t.includes("REJECTED")) {
      return <XCircle size={14} weight="bold" className="text-rose-600" />;
    }
    if (t.includes("COMPLETED") || t.includes("ACCEPTED") || t.includes("SUCCEEDED")) {
      return <CheckCircle size={14} weight="bold" className="text-emerald-600" />;
    }
    if (t.includes("WORKER") || t.includes("EXECUTION") || t.includes("DIAGNOSIS")) {
      return <Wrench size={14} weight="bold" className="text-primary" />;
    }
    return <Clock size={14} className="text-slate-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((evt, idx) => {
          const actor = getActorBadge(evt.actorRole);
          return (
            <div key={evt.id || idx} className="relative group">
              {/* Dot Icon */}
              <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-primary transition-colors shadow-2xs">
                {getEventIcon(evt.type)}
              </div>

              {/* Event Content */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {evt.title}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {evt.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${actor.color}`}>
                    {actor.label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    Oleh {evt.actorName}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug">
                  {evt.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
