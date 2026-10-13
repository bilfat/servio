"use client";

import React from "react";
import { Check, CircleNotch, Warning, Clock } from "@phosphor-icons/react";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: "completed" | "current" | "pending" | "alert";
  author?: string;
}

export interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className = "" }: TimelineProps) {
  return (
    <div className={`space-y-6 font-body text-left relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 ${className}`}>
      {events.map((event) => {
        const isCompleted = event.status === "completed";
        const isCurrent = event.status === "current";
        const isAlert = event.status === "alert";

        return (
          <div key={event.id} className="relative flex items-start gap-4 group">
            {/* Step Dot / Icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 z-10 transition-all ${
                isCompleted
                  ? "bg-primary border-primary text-white shadow-servio-xs"
                  : isCurrent
                  ? "bg-white border-primary text-primary ring-4 ring-primary/10 shadow-servio-xs"
                  : isAlert
                  ? "bg-secondary border-secondary text-white ring-4 ring-secondary/10"
                  : "bg-white border-slate-300 text-neutral-muted"
              }`}
            >
              {isCompleted ? (
                <Check size={14} weight="bold" />
              ) : isCurrent ? (
                <CircleNotch size={14} weight="bold" className="animate-spin" />
              ) : isAlert ? (
                <Warning size={14} weight="fill" />
              ) : (
                <Clock size={12} weight="bold" />
              )}
            </div>

            {/* Event Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p
                  className={`text-xs font-bold font-display ${
                    isCurrent
                      ? "text-primary"
                      : isAlert
                      ? "text-secondary"
                      : "text-neutral-dark"
                  }`}
                >
                  {event.title}
                </p>
                <time className="text-[10px] text-neutral-slate font-mono shrink-0">
                  {event.timestamp}
                </time>
              </div>

              {event.description && (
                <p className="text-xs text-neutral-slate mt-1 leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.author && (
                <span className="inline-block text-[10px] font-semibold bg-slate-100 text-neutral-slate px-2 py-0.5 rounded-full mt-2">
                  Oleh: {event.author}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
