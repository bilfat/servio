"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Warning, ShieldWarning, Info } from "@phosphor-icons/react";

export type DialogIntent = "danger" | "warning" | "info";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: DialogIntent;
  isLoading?: boolean;
}

const intentConfigs: Record<
  DialogIntent,
  { icon: typeof Warning; iconBg: string; iconColor: string; buttonVariant: "danger" | "primary" | "secondary" }
> = {
  danger: {
    icon: ShieldWarning,
    iconBg: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
    buttonVariant: "danger",
  },
  warning: {
    icon: Warning,
    iconBg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    buttonVariant: "primary",
  },
  info: {
    icon: Info,
    iconBg: "bg-sky border-sky-200",
    iconColor: "text-primary",
    buttonVariant: "primary",
  },
};

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  intent = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  const config = intentConfigs[intent];
  const Icon = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="sm"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5 text-left font-body">
        <div className={`p-2.5 rounded-2xl border shrink-0 ${config.iconBg}`}>
          <Icon size={24} weight="duotone" className={config.iconColor} />
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-bold font-display text-neutral-dark">
            {title}
          </h4>
          <p className="text-xs text-neutral-slate leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
