"use client";

import React from "react";
import { Check, CircleNotch } from "@phosphor-icons/react";

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "upcoming";
}

export interface OrderStepperProps {
  steps: StepItem[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function OrderStepper({
  steps,
  orientation = "horizontal",
  className = "",
}: OrderStepperProps) {
  if (orientation === "vertical") {
    return (
      <div className={`space-y-4 font-body text-left relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 ${className}`}>
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-display z-10 transition-all ${
                  isCompleted
                    ? "bg-primary text-white"
                    : isCurrent
                    ? "bg-white border-2 border-primary text-primary ring-4 ring-primary/10 shadow-servio-xs"
                    : "bg-white border-2 border-slate-300 text-neutral-muted"
                }`}
              >
                {isCompleted ? <Check size={16} weight="bold" /> : index + 1}
              </div>

              <div className="pt-1">
                <p
                  className={`text-xs font-bold font-display ${
                    isCurrent ? "text-primary" : "text-neutral-dark"
                  }`}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-[11px] text-neutral-slate mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`w-full font-body ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";

          return (
            <div
              key={step.id}
              className="flex-1 flex flex-col items-center text-center relative z-10 px-1"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display transition-all ${
                  isCompleted
                    ? "bg-primary text-white shadow-servio-xs"
                    : isCurrent
                    ? "bg-white border-2 border-primary text-primary ring-4 ring-primary/15 shadow-servio-xs"
                    : "bg-white border-2 border-slate-300 text-neutral-muted"
                }`}
              >
                {isCompleted ? (
                  <Check size={16} weight="bold" />
                ) : isCurrent ? (
                  <CircleNotch size={16} weight="bold" className="animate-spin text-primary" />
                ) : (
                  index + 1
                )}
              </div>

              <span
                className={`text-[11px] font-bold font-display mt-2 leading-tight max-w-[100px] truncate ${
                  isCurrent ? "text-primary" : isCompleted ? "text-neutral-dark" : "text-neutral-muted"
                }`}
              >
                {step.title}
              </span>

              {step.description && (
                <span className="hidden sm:block text-[10px] text-neutral-slate mt-0.5 max-w-[120px] line-clamp-1">
                  {step.description}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
