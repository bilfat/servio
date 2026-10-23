"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | string;
}

const maxWidthStyles: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  "3xl": "max-w-4xl",
  "4xl": "max-w-5xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  size,
}: ModalProps) {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-dark/45 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className={`relative w-full max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200/90 shadow-servio-lg z-10 overflow-hidden font-body text-left ${maxWidthStyles[size || maxWidth || "md"] || "max-w-2xl"}`}
          >
            {/* Header */}
            {(title || description) && (
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  {title && (
                    <h3 className="text-base font-bold font-display text-neutral-dark leading-tight">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-neutral-slate leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  id="modal-close-button"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shrink-0 cursor-pointer shadow-2xs"
                  title="Tutup dialog"
                  aria-label="Tutup dialog"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white/95 backdrop-blur-sm shrink-0 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
