"use client";

import React from "react";
import { useActiveRole } from "@/context/RoleContext";
import {
  PermissionAction,
  BusinessResource,
  PermissionScope,
  ResourceRecord,
  UserContext,
} from "@/types/auth";
import { evaluateAccess } from "@/lib/permissions/hasPermission";

interface PermissionGateProps {
  action: PermissionAction;
  resource: BusinessResource;
  scope?: PermissionScope;
  condition?: (user: UserContext, data?: ResourceRecord) => boolean;
  resourceData?: ResourceRecord;
  disabledMessage?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate automatically enforces:
 * - No Permission / Scope -> HIDE (render fallback or null)
 * - Permission Granted but Business Condition Invalid -> DISABLED (render disabled with tooltip)
 */
export function PermissionGate({
  action,
  resource,
  scope,
  condition,
  resourceData,
  disabledMessage,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { user } = useActiveRole();

  const evaluation = evaluateAccess(user, action, resource, {
    scope,
    condition,
    resourceData,
  });

  // 1. Fully Allowed
  if (evaluation.allowed) {
    return <>{children}</>;
  }

  // 2. Business Condition Failed (User has authority, but action is locked by lifecycle state) -> DISABLED
  if (evaluation.status === "DISABLED_BUSINESS_CONDITION") {
    const tooltipText = disabledMessage || evaluation.reason || "Aksi terkunci oleh aturan bisnis saat ini";
    return (
      <div className="relative group inline-block cursor-not-allowed">
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-neutral-dark text-white text-[11px] rounded-lg px-2.5 py-1 shadow-lg whitespace-nowrap pointer-events-none">
          {tooltipText}
        </div>
      </div>
    );
  }

  // 3. Unauthorized / Insufficient Scope -> HIDE completely
  return <>{fallback}</>;
}
