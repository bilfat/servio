import React from "react";
import { ServioLoadingScreen } from "./ServioLoadingScreen";

interface ProcessingOverlayProps {
  isProcessing: boolean;
  message?: string;
  subMessage?: string;
}

export function ProcessingOverlay({
  isProcessing,
  message = "Sedang Memproses Transaksi...",
  subMessage = "Mohon tidak menutup atau menyegarkan halaman ini.",
}: ProcessingOverlayProps) {
  if (!isProcessing) return null;

  return (
    <ServioLoadingScreen
      message={message}
      subMessage={subMessage}
      fullScreen
      className="bg-slate-900/50 backdrop-blur-md"
    />
  );
}

