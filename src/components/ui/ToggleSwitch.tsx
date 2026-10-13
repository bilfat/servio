"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleSwitchProps) {
  const generatedId = useId();

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const isSmall = size === "sm";

  return (
    <div className="flex items-center justify-between gap-4 font-body">
      {(label || description) && (
        <div className="text-left flex-1 min-w-0">
          {label && (
            <label
              htmlFor={generatedId}
              onClick={handleToggle}
              className={`text-xs font-semibold text-neutral-dark font-display block select-none ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-neutral-slate mt-0.5">{description}</p>
          )}
        </div>
      )}

      <button
        type="button"
        id={generatedId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 ${
          isSmall ? "w-9 h-5" : "w-11 h-6"
        } ${checked ? "bg-primary" : "bg-slate-300"} ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`inline-block rounded-full bg-white shadow-servio-xs ${
            isSmall ? "w-3.5 h-3.5" : "w-4.5 h-4.5"
          } ${
            checked
              ? isSmall
                ? "translate-x-4.5"
                : "translate-x-5.5"
              : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
