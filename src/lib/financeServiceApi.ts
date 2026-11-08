/**
 * SERVIO MODUL 06 - FINANCE & S-PAY V3 API CLIENT
 * Connects directly to backend/services/finance-service (Port 8006)
 * Prefix: /api/v1/finance
 */

import { apiFetch, ApiResponse } from "./servioApi";

// -------------------------------------------------------------
// TYPES & CONTRACTS
// -------------------------------------------------------------

export interface FinancePaymentAllocation {
  id: string;
  payment_id: string;
  merchant_order_id: string;
  merchant_org_id: string;
  merchant_gross_subtotal_idr: number;
  shipping_fee_idr: number;
  merchant_commission_rate: number;
  merchant_commission_fee_idr: number;
  merchant_net_payable_idr: number;
  currency: string;
  created_at: string;
}

export interface FinancePaymentDetail {
  id: string;
  source_type: string;
  source_id: string;
  customer_id: string;
  currency: string;
  product_subtotal_idr: number;
  shipping_total_idr: number;
  customer_app_fee_idr: number;
  tax_idr: number;
  total_payable_idr: number;
  payment_status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "PARTIALLY_REFUNDED" | "REFUNDED";
  payment_method: string;
  payment_reference: string;
  qr_code_data?: string;
  virtual_account_number?: string;
  expires_at: string;
  paid_at?: string;
  mode: string;
  disclaimer: string;
  allocations?: FinancePaymentAllocation[];
}

export interface FinanceReceipt {
  receipt_number: string;
  payment_id: string;
  customer_id: string;
  source_id: string;
  payment_method: string;
  paid_at: string;
  currency: string;
  total_paid_idr: number;
  breakdown: {
    product_subtotal_idr: number;
    shipping_total_idr: number;
    customer_app_fee_idr: number;
    tax_idr: number;
  };
  allocations?: Array<{
    merchant_order_id: string;
    merchant_org_id: string;
    merchant_gross_subtotal_idr: number;
    shipping_fee_idr: number;
  }>;
}

export interface CustomerRefundItem {
  id: string;
  payment_id?: string;
  payment_intent_id?: string;
  payment_allocation_id?: string;
  customer_spay_account_id?: string;
  merchant_order_id?: string;
  merchant_org_id?: string;
  checkout_group_id?: string;
  source_event_id?: string;
  order_cancellation_event_id?: string;
  decision_source?: string;
  reason_code?: string;
  refund_reason_scope?: string;
  requested_amount_idr?: number;
  funded_amount_idr?: number;
  credited_amount_idr?: number;
  gross_refund_amount_idr: number;
  customer_net_refund_idr: number;
  product_subtotal_idr?: number;
  shipping_customer_idr?: number;
  app_fee_allocated_idr?: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REVERSED";
  funded_at?: string;
  credited_at?: string;
  processed_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface CustomerSPayAccount {
  account_id: string;
  owner_type: "CUSTOMER";
  owner_id: string;
  currency: string;
  available_idr: number;
  withdrawal_locked_idr: number;
  minimum_withdrawal_idr: number;
  can_withdraw: boolean;
  source_label: "REFUND_ONLY";
  is_wallet_payment_enabled: boolean;
  disclaimer: string;
}

export interface MerchantSPayAccount {
  account_id: string;
  owner_type: "MERCHANT_ORGANIZATION";
  organization_id: string;
  currency: string;
  available_idr: number;
  withdrawal_locked_idr: number;
  pending_held_idr: number;
  minimum_withdrawal_idr: number;
  can_withdraw: boolean;
  disclaimer: string;
}

export interface SPayMovementEntity {
  id: string;
  spay_account_id: string;
  movement_type: "REFUND_CREDIT" | "MERCHANT_SETTLEMENT" | "WITHDRAWAL_LOCK" | "WITHDRAWAL_SETTLED" | "WITHDRAWAL_REVERSED" | "ADJUSTMENT";
  direction: "IN" | "OUT";
  amount_idr: number;
  balance_before_idr: number;
  balance_after_idr: number;
  reference_type: string;
  reference_id: string;
  description: string;
  created_at: string;
}

export interface HeldFundEntity {
  id: string;
  payment_allocation_id: string;
  merchant_order_id?: string;
  merchant_entitlement_idr: number;
  gross_held_idr?: number;
  completed_at?: string;
  order_completed_at?: string;
  eligible_release_at: string;
  hold_duration_hours?: number;
  status: "HELD" | "RELEASED" | "RELEASED_TO_SPAY" | "DISPUTED";
  released_at?: string;
  created_at?: string;
  allocation?: {
    id: string;
    finance_checkout_id?: string;
    merchant_order_id: string;
    merchant_org_id: string;
    product_subtotal_idr?: number;
    merchant_gross_subtotal_idr?: number;
    shipping_customer_idr?: number;
    shipping_fee_idr?: number;
    merchant_commission_idr?: number;
    merchant_commission_fee_idr?: number;
    merchant_net_entitlement_idr?: number;
    merchant_net_payable_idr?: number;
  };
}

export interface BankDestinationEntity {
  id: string;
  owner_type: "CUSTOMER" | "MERCHANT_ORGANIZATION";
  owner_external_id?: string;
  owner_id?: string;
  bank_name?: string;
  bank_code?: string;
  account_number?: string;
  account_last4?: string;
  masked_account_number?: string;
  account_holder_name?: string;
  account_holder_name_masked?: string;
  verification_status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "PENDING";
  verification_method?: string;
  is_default?: boolean;
  verified_at?: string;
  created_at: string;
}

export interface WithdrawalQuoteResponse {
  quote_id: string;
  owner_type: string;
  owner_external_id: string;
  requested_amount_idr: number;
  transfer_fee_idr: number;
  net_disbursement_idr: number;
  bank_destination_id: string;
  bank_name: string;
  masked_account_number: string;
  account_holder_name: string;
  available_balance_before_idr: number;
  remaining_balance_after_idr: number;
  expires_at: string;
  valid_until_seconds: number;
}

export interface WithdrawalRequestEntity {
  withdrawal_id: string;
  id?: string;
  status: "REQUESTED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REJECTED";
  requested_amount_idr: number;
  transfer_fee_idr: number;
  net_to_bank_idr: number;
  locked_amount_idr: number;
  remaining_available_idr?: number;
  bank_destination?: BankDestinationEntity;
  mode: string;
  disclaimer: string;
  created_at?: string;
}

// -------------------------------------------------------------
// FINANCE API CLIENT METHODS
// -------------------------------------------------------------

export const financeServiceApi = {
  // ===========================================================
  // CUSTOMER PAYMENTS & REFUNDS
  // ===========================================================
  customer: {
    async getPayment(paymentId: string) {
      return apiFetch<FinancePaymentDetail>(`/finance/payments/${paymentId}`);
    },

    async getReceipt(paymentId: string) {
      return apiFetch<FinanceReceipt>(`/finance/payments/${paymentId}/receipt`);
    },

    async getRefunds() {
      return apiFetch<CustomerRefundItem[]>("/finance/me/refunds", {
        headers: {
          "X-Actor-Role": "CUSTOMER",
          "x-user-role": "CUSTOMER",
        },
      });
    },

    async getSpay() {
      return apiFetch<CustomerSPayAccount>("/finance/spay/me", {
        headers: {
          "X-Actor-Role": "CUSTOMER",
          "x-user-role": "CUSTOMER",
        },
      });
    },

    async getSpayMovements(params?: { movement_type?: string; per_page?: number; page?: number }) {
      const q = new URLSearchParams();
      if (params?.movement_type) q.append("movement_type", params.movement_type);
      if (params?.per_page) q.append("per_page", String(params.per_page));
      if (params?.page) q.append("page", String(params.page));
      const qs = q.toString();
      return apiFetch<{ data: SPayMovementEntity[]; total: number; current_page: number; last_page: number }>(
        `/finance/spay/me/movements${qs ? `?${qs}` : ""}`,
        {
          headers: {
            "X-Actor-Role": "CUSTOMER",
            "x-user-role": "CUSTOMER",
          },
        }
      );
    },
  },

  // ===========================================================
  // MERCHANT S-PAY & HELD FUNDS
  // ===========================================================
  merchant: {
    async getSpay(orgId: string) {
      return apiFetch<MerchantSPayAccount>(`/finance/spay/organizations/${orgId}`);
    },

    async getSpayMovements(orgId: string, params?: { movement_type?: string; per_page?: number; page?: number }) {
      const q = new URLSearchParams();
      if (params?.movement_type) q.append("movement_type", params.movement_type);
      if (params?.per_page) q.append("per_page", String(params.per_page));
      if (params?.page) q.append("page", String(params.page));
      const qs = q.toString();
      return apiFetch<{ data: SPayMovementEntity[]; total: number; current_page: number; last_page: number }>(
        `/finance/spay/organizations/${orgId}/movements${qs ? `?${qs}` : ""}`
      );
    },

    async getHeldFunds(orgId?: string, params?: { status?: string; per_page?: number; page?: number }) {
      const q = new URLSearchParams();
      if (orgId) q.append("organization_id", orgId);
      if (params?.status) q.append("status", params.status);
      if (params?.per_page) q.append("per_page", String(params.per_page));
      if (params?.page) q.append("page", String(params.page));
      const qs = q.toString();
      return apiFetch<{ data: HeldFundEntity[]; total: number; current_page: number; last_page: number }>(
        `/finance/held-funds${qs ? `?${qs}` : ""}`
      );
    },
  },

  // ===========================================================
  // SHARED BANK DESTINATIONS & WITHDRAWALS
  // ===========================================================
  banking: {
    async getBankDestinations(ownerType?: "CUSTOMER" | "MERCHANT_ORGANIZATION", ownerId?: string) {
      const q = new URLSearchParams();
      if (ownerType) q.append("owner_type", ownerType);
      if (ownerId) q.append("owner_id", ownerId);
      const qs = q.toString();
      const headers: Record<string, string> = {
        "X-Gateway-Key": process.env.NEXT_PUBLIC_FINANCE_GATEWAY_KEY || "servio_local_gateway_key_2026",
      };
      if (!ownerType) {
        headers["X-Actor-Role"] = "FINANCE_PAYMENT_OPS";
        headers["x-user-role"] = "FINANCE_PAYMENT_OPS";
        headers["X-Actor-User-Id"] = "usr-fin-001";
        headers["x-user-id"] = "usr-fin-001";
      }
      return apiFetch<BankDestinationEntity[]>(`/finance/bank-destinations${qs ? `?${qs}` : ""}`, {
        headers,
      });
    },

    async addBankDestination(data: {
      bank_name: string;
      account_number: string;
      account_holder_name: string;
      owner_type?: "CUSTOMER" | "MERCHANT_ORGANIZATION";
      owner_id?: string;
    }) {
      return apiFetch<BankDestinationEntity>("/finance/bank-destinations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async verifyDemo(id: string) {
      return apiFetch<{ id: string; verification_status: string }>(`/finance/bank-destinations/${id}/verify-demo`, {
        method: "POST",
        headers: {
          "X-Gateway-Key": process.env.NEXT_PUBLIC_FINANCE_GATEWAY_KEY || "servio_local_gateway_key_2026",
          "X-Actor-Role": "FINANCE_PAYMENT_OPS",
          "x-user-role": "FINANCE_PAYMENT_OPS",
          "X-Actor-User-Id": "usr-fin-001",
          "x-user-id": "usr-fin-001",
        },
      });
    },

    async quoteWithdrawal(data: {
      amount_idr: number;
      bank_destination_id: string;
      owner_type?: "CUSTOMER" | "MERCHANT_ORGANIZATION";
      owner_id?: string;
    }) {
      return apiFetch<WithdrawalQuoteResponse>("/finance/withdrawals/quote", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async requestWithdrawal(data: {
      quote_id: string;
      bank_destination_id: string;
      step_up_reference: string;
      bank_details_confirmed: boolean;
    }) {
      return apiFetch<WithdrawalRequestEntity>("/finance/withdrawals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getWithdrawals(params?: { status?: string; page?: number; per_page?: number }) {
      const q = new URLSearchParams();
      if (params?.status) q.append("status", params.status);
      if (params?.page) q.append("page", String(params.page));
      if (params?.per_page) q.append("per_page", String(params.per_page));
      const qs = q.toString();
      return apiFetch<{ data: WithdrawalRequestEntity[]; total: number; current_page: number; last_page: number }>(
        `/finance/withdrawals${qs ? `?${qs}` : ""}`
      );
    },

    async getWithdrawal(id: string) {
      return apiFetch<WithdrawalRequestEntity>(`/finance/withdrawals/${id}`);
    },
  },
};
