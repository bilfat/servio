import { UserRole } from "@/types/auth";

/**
 * Resolves the appropriate canonical dashboard URL for a given user role.
 */
export function getRoleDashboard(role?: string | null): string {
  if (!role) return "/";
  const r = role.toUpperCase().trim();
  if (r === "CUSTOMER" || r === "GUEST") return "/";
  if (r === "CEO_PRODUCT_OWNER" || r.includes("CEO")) return "/ceo/dashboard";
  if (r === "FINANCE_PAYMENT_OPS" || r.includes("FINANCE")) return "/finance/dashboard";
  if (r === "MERCHANT") return "/merchant/dashboard";
  if (r === "SERVICE_PROVIDER" || r.includes("PROVIDER")) return "/provider/dashboard";
  if (r === "WORKER_TECHNICIAN" || r.includes("WORKER") || r.includes("TECHNICIAN")) return "/worker/dashboard";
  if (r === "ADMIN_OPERATIONS" || r.includes("ADMIN")) return "/admin/dashboard";
  if (r === "CUSTOMER_SUPPORT" || r.includes("SUPPORT")) return "/support/dashboard";
  if (r === "SUPPLIER") return "/supplier/dashboard";
  if (r === "STAFF") return "/staff/onboarding";
  return "/";
}

/**
 * Resolves the appropriate profile URL for a given user role.
 * Non-customer roles are routed to their respective operational profile or staff onboarding.
 */
export function getRoleProfileUrl(role?: string | null): string {
  if (!role) return "/profile";
  const r = role.toUpperCase().trim();
  if (r === "SERVICE_PROVIDER" || r.includes("PROVIDER")) return "/provider/profile";
  if (r === "MERCHANT") return "/merchant/profile";
  if (r === "SUPPLIER") return "/supplier/profile";
  if (r === "WORKER_TECHNICIAN" || r.includes("WORKER") || r.includes("TECHNICIAN")) return "/worker/profile";
  if (r === "CEO_PRODUCT_OWNER" || r.includes("CEO")) return "/ceo/dashboard";
  if (
    r === "FINANCE_PAYMENT_OPS" ||
    r.includes("FINANCE") ||
    r === "ADMIN_OPERATIONS" ||
    r.includes("ADMIN") ||
    r === "CUSTOMER_SUPPORT" ||
    r.includes("SUPPORT") ||
    r === "STAFF"
  ) {
    return "/staff/onboarding";
  }
  return "/profile";
}

/**
 * Checks if the role represents a regular customer.
 */
export function isCustomerRole(role?: string | null): boolean {
  if (!role) return false;
  return role.toUpperCase().trim() === "CUSTOMER";
}

/**
 * Checks if the role represents an operational / business / internal role (non-customer).
 */
export function isOperationalRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.toUpperCase().trim();
  return r !== "CUSTOMER" && r !== "GUEST" && r !== "";
}
