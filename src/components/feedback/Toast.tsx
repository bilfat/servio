"use client";

import React, { useEffect } from "react";
import { CheckCircle, WarningCircle, Info, X } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = "success",
  duration = 3500,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" />,
    error: <WarningCircle size={20} weight="fill" className="text-rose-500 shrink-0" />,
    warning: <WarningCircle size={20} weight="fill" className="text-amber-500 shrink-0" />,
    info: <Info size={20} weight="fill" className="text-[#0F4C81] shrink-0" />,
  };

  const bgStyles = {
    success: "bg-emerald-950/90 border-emerald-800/80 text-emerald-100",
    error: "bg-rose-950/90 border-rose-800/80 text-rose-100",
    warning: "bg-amber-950/90 border-amber-800/80 text-amber-100",
    info: "bg-slate-950/90 border-slate-800/80 text-slate-100",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-md shadow-2xl rounded-2xl"
      >
        <div
          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md shadow-lg ${bgStyles[type]}`}
        >
          {icons[type]}
          <p className="text-xs font-semibold leading-snug flex-1 pr-2">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
