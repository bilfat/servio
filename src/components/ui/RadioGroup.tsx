"use client";

import React, { createContext, useId } from "react";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

interface RadioGroupContextValue {
  name: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name?: string;
  value: string;
  onChange: (val: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal" | "cards";
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  label,
  error,
  disabled,
  orientation = "vertical",
}: RadioGroupProps) {
  const generatedName = useId();
  const groupName = name || generatedName;

  return (
    <RadioGroupContext.Provider value={{ name: groupName, value, onChange, disabled }}>
      <div className="space-y-2 text-left font-body">
        {label && (
          <label className="block text-xs font-semibold text-neutral-dark font-display">
            {label}
          </label>
        )}

        <div
          className={`gap-3 ${
            orientation === "cards"
              ? "grid grid-cols-1 sm:grid-cols-2"
              : orientation === "horizontal"
              ? "flex flex-wrap items-center gap-4"
              : "space-y-2"
          }`}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            const isDisabled = disabled || opt.disabled;

            if (orientation === "cards") {
              return (
                <label
                  key={opt.value}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isSelected
                      ? "border-primary bg-sky/30 shadow-servio-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    name={groupName}
                    value={opt.value}
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => onChange(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? "border-primary bg-primary" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-dark font-display">
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <p className="text-[11px] text-neutral-slate mt-0.5">{opt.description}</p>
                    )}
                  </div>
                </label>
              );
            }

            return (
              <label
                key={opt.value}
                className={`flex items-start gap-2.5 text-xs select-none ${
                  isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? "border-primary bg-primary" : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="font-medium text-neutral-dark">{opt.label}</span>
                  {opt.description && (
                    <p className="text-[11px] text-neutral-slate">{opt.description}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {error && <p className="text-[11px] text-error font-medium">{error}</p>}
      </div>
    </RadioGroupContext.Provider>
  );
}
