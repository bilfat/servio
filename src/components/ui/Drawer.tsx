"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "@phosphor-icons/react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: "bottom" | "right";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = "bottom",
}: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const isBottom = position === "bottom";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-dark/45 backdrop-blur-sm"
          />

          {/* Drawer Container */}
          <motion.div
            initial={isBottom ? { y: "100%" } : { x: "100%" }}
            animate={isBottom ? { y: 0 } : { x: 0 }}
            exit={isBottom ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            className={`relative z-10 bg-white border-slate-200/90 shadow-servio-lg font-body flex flex-col ${
              isBottom
                ? "self-end w-full max-h-[85vh] rounded-t-3xl border-t"
                : "h-full w-full max-w-md border-l"
            }`}
          >
            {/* Grab handle for bottom sheet */}
            {isBottom && (
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  {title && (
                    <h3 className="text-base font-bold font-display text-neutral-dark">
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
                  className="p-1.5 rounded-lg text-neutral-slate hover:text-neutral-dark hover:bg-slate-100 transition-colors shrink-0"
                  title="Tutup lembar"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-5 overflow-y-auto flex-1">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5 pb-safe">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
