import {
  UserRole,
  PermissionAction,
  BusinessResource,
  PermissionScope,
  UserContext,
  ResourceRecord,
  AccessEvaluation,
} from "@/types/auth";

/**
 * Standard Role-to-Scope mapping defaults
 */
const ROLE_DEFAULT_SCOPES: Record<UserRole, PermissionScope[]> = {
  CUSTOMER: ["OWN", "RELATED"],
  SERVICE_PROVIDER: ["OWN", "ORGANIZATION", "RELATED"],
  WORKER_TECHNICIAN: ["ASSIGNED", "RELATED"],
  CUSTOMER_SUPPORT: ["RELATED", "PLATFORM"],
  FINANCE_PAYMENT_OPS: ["PLATFORM", "AGGREGATE"],
  MERCHANT: ["OWN", "ORGANIZATION", "RELATED"],
  SUPPLIER: ["OWN", "ORGANIZATION", "RELATED"],
  ADMIN_OPERATIONS: ["PLATFORM", "ORGANIZATION", "AGGREGATE"],
  CEO_PRODUCT_OWNER: ["PLATFORM", "AGGREGATE"],
};

/**
 * Canonical Role Authority Matrix by Resource
 */
const ROLE_RESOURCE_AUTHORITY: Record<UserRole, BusinessResource[]> = {
  CUSTOMER: [
    "DISCOVERY",
    "BOOKING_JASA",
    "ORDER_JASA",
    "QUOTATION",
    "CHAT",
    "PAYMENT",
    "TRACKING",
    "PROOF",
    "COMPLETION",
    "REVIEW",
    "DISPUTE",
    "WARRANTY",
    "SERVICE_HISTORY",
    "MAINTENANCE",
    "LOYALTY",
    "SMART_RECOMMENDATION",
    "PRODUCT",
    "CART",
    "PRODUCT_ORDER",
    "RETURN_REFUND",
  ],
  SERVICE_PROVIDER: [
    "DISCOVERY",
    "BOOKING_JASA",
    "ORDER_JASA",
    "QUOTATION",
    "CHAT",
    "EXECUTION",
    "TRACKING",
    "PROOF",
    "COMPLETION",
    "REVIEW",
    "DISPUTE",
    "WARRANTY",
    "SERVICE_HISTORY",
    "INVENTORY",
    "FULFILLMENT",
    "SHIPPING",
    "RETURN_REFUND",
  ],
  WORKER_TECHNICIAN: [
    "EXECUTION",
    "TRACKING",
    "PROOF",
    "CHAT",
    "SHIPPING",
  ],
  CUSTOMER_SUPPORT: [
    "DISPUTE",
    "ORDER_JASA",
    "PRODUCT_ORDER",
    "CHAT",
    "REVIEW",
  ],
  FINANCE_PAYMENT_OPS: [
    "PAYMENT",
    "FINANCE_OPS",
  ],
  MERCHANT: [
    "PRODUCT",
    "PRODUCT_ORDER",
    "INVENTORY",
    "FULFILLMENT",
    "SHIPPING",
    "RETURN_REFUND",
    "FINANCE_OPS",
  ],
  SUPPLIER: [
    "PRODUCT",
    "INVENTORY",
    "FULFILLMENT",
    "SHIPPING",
    "RETURN_REFUND",
  ],
  ADMIN_OPERATIONS: [
    "DISCOVERY",
    "BOOKING_JASA",
    "ORDER_JASA",
    "QUOTATION",
    "CHAT",
    "PAYMENT",
    "EXECUTION",
    "TRACKING",
    "PROOF",
    "COMPLETION",
    "REVIEW",
    "DISPUTE",
    "WARRANTY",
    "SERVICE_HISTORY",
    "MAINTENANCE",
    "LOYALTY",
    "SMART_RECOMMENDATION",
    "PRODUCT",
    "CART",
    "PRODUCT_ORDER",
    "INVENTORY",
    "FULFILLMENT",
    "SHIPPING",
    "RETURN_REFUND",
    "USER_MANAGEMENT",
    "TAXONOMY",
    "FINANCE_OPS",
  ],
  CEO_PRODUCT_OWNER: [
    "EXECUTIVE_GOVERNANCE",
    "TAXONOMY",
    "USER_MANAGEMENT",
    "FINANCE_OPS",
    "SMART_RECOMMENDATION",
  ],
};

/**
 * Check if the given user role has scope authority
 */
export function hasScope(
  role: UserRole,
  requiredScope: PermissionScope
): boolean {
  const allowed = ROLE_DEFAULT_SCOPES[role] || [];
  return allowed.includes(requiredScope);
}

/**
 * Check if the user is directly related to the target resource
 */
export function isRelated(
  context: UserContext,
  resourceData?: {
    customerId?: string;
    providerId?: string;
    workerId?: string;
    organizationId?: string;
  }
): boolean {
  if (!resourceData) return false;

  if (context.activeRole === "CUSTOMER" && resourceData.customerId === context.id) {
    return true;
  }
  if (
    context.activeRole === "SERVICE_PROVIDER" &&
    (resourceData.providerId === context.id ||
      resourceData.organizationId === context.organizationId)
  ) {
    return true;
  }
  if (context.activeRole === "WORKER_TECHNICIAN" && resourceData.workerId === context.id) {
    return true;
  }
  return false;
}

/**
 * Master Authorization Evaluation Formula:
 * ROLE + ACTION + RESOURCE + SCOPE + BUSINESS CONDITION = ACCESS DECISION
 *
 * Explicitly separates Permission Failure (HIDE) from Business Condition Failure (DISABLED)
 */
export function evaluateAccess(
  context: UserContext,
  action: PermissionAction,
  resource: BusinessResource,
  options?: {
    scope?: PermissionScope;
    resourceData?: ResourceRecord;
    condition?: (ctx: UserContext, data?: ResourceRecord) => boolean;
  }
): AccessEvaluation {
  const { activeRole } = context;

  // 1. Role-to-Resource Authorization Check
  const authorizedResources = ROLE_RESOURCE_AUTHORITY[activeRole] || [];
  if (!authorizedResources.includes(resource)) {
    return {
      allowed: false,
      status: "DENIED_NO_PERMISSION",
      reason: `Peran ${activeRole} tidak memiliki hak akses pada resource ${resource}.`,
    };
  }

  // 2. Role-to-Action Guardrails (e.g. CEO is read/analyze only, cannot EXECUTE operational jobs)
  if (activeRole === "CEO_PRODUCT_OWNER" && (action === "EXECUTE" || action === "SUBMIT")) {
    return {
      allowed: false,
      status: "DENIED_NO_PERMISSION",
      reason: "CEO berwenang untuk tata kelola & analitik, bukan untuk eksekusi transaksi harian.",
    };
  }

  // Admin cannot directly sign-off as Worker or Customer for EXECUTE/REVIEW
  if (
    activeRole === "ADMIN_OPERATIONS" &&
    action === "EXECUTE" &&
    (resource === "EXECUTION" || resource === "PROOF")
  ) {
    return {
      allowed: false,
      status: "DENIED_NO_PERMISSION",
      reason: "Eksekusi pekerjaan teknis hanya dapat dilakukan oleh Worker/Teknisi yang ditugaskan.",
    };
  }

  // 3. Scope Authority Check
  const defaultScope = ROLE_DEFAULT_SCOPES[activeRole]?.[0] || "OWN";
  const scope = options?.scope || defaultScope;
  if (!hasScope(activeRole, scope)) {
    return {
      allowed: false,
      status: "DENIED_SCOPE",
      reason: `Peran ${activeRole} tidak memiliki lingkup otorisasi ${scope}.`,
    };
  }

  // 4. Business Condition Validation (e.g. Order status expired, or action locked by lifecycle)
  if (options?.condition && !options.condition(context, options.resourceData)) {
    return {
      allowed: false,
      status: "DISABLED_BUSINESS_CONDITION",
      reason: "Tindakan saat ini terkunci atau tidak memenuhi kondisi bisnis sistem.",
    };
  }

  return {
    allowed: true,
    status: "ALLOWED",
  };
}

/**
 * Convenience wrapper returning boolean
 */
export function hasPermission(
  context: UserContext,
  action: PermissionAction,
  resource: BusinessResource,
  options?: {
    scope?: PermissionScope;
    resourceData?: ResourceRecord;
    condition?: (ctx: UserContext, data?: ResourceRecord) => boolean;
  }
): boolean {
  const result = evaluateAccess(context, action, resource, options);
  return result.allowed;
}
