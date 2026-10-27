/**
 * SERVIO MODUL 05A - ORDER BARANG API CLIENT
 * Connects directly to backend/services/order-barang-service (Port 8005)
 * Prefix: /api/v1/order-barang
 */

import { apiFetch, ApiResponse } from "./servioApi";

// -------------------------------------------------------------
// TYPES & CONTRACTS
// -------------------------------------------------------------

export interface CartItemProductSnapshot {
  product_id: string;
  variant_id: string;
  name?: string;
  sku?: string;
  price_idr: number;
  stock_qty: number;
  image_url?: string;
  product_public_eligible?: boolean;
  variant_active?: boolean;
}

export interface BackendCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price_idr: number;
  line_total_idr: number;
  stock_qty: number;
  is_active: boolean;
  added_at: string;
  name?: string;
  variant_name?: string;
  image_url?: string;
}

export interface BackendMerchantGroup {
  merchant_org_id: string;
  merchant_name: string;
  items: BackendCartItem[];
  estimated_subtotal_idr: number;
}

export interface BackendCartGrouped {
  cart_id: string;
  customer_id: string;
  cart_state: string;
  merchants: BackendMerchantGroup[];
  total_items_count: number;
}

export interface CheckoutQuoteItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price_idr: number;
  line_total_idr: number;
}

export interface MerchantQuoteBreakdown {
  merchant_org_id: string;
  merchant_name: string;
  items: CheckoutQuoteItem[];
  items_subtotal_idr?: number;
  product_subtotal_idr?: number;
  shipping_fee_idr?: number;
  shipping_customer_idr?: number;
  distance_km: number;
  distance_method?: string;
  merchant_commission_allocated_idr?: number;
  merchant_order_total_idr?: number;
  estimated_total_idr?: number;
  notes?: string;
}

export interface CustomerFeePolicyInfo {
  has_active_policy: boolean;
  policy_name: string;
  policy_slug?: string | null;
  version_no?: number | null;
  policy_code?: string;
  fee_type: "FIXED" | "PERCENTAGE";
  fixed_amount_idr?: number | null;
  percentage_rate?: number | null;
  charge_scope?: string;
  calculation_base?: string;
  display_amount?: number | null;
  display_label?: string;
  description?: string | null;
}

export interface CheckoutQuoteResponse {
  address_id: string;
  address_snapshot?: {
    recipient_name: string;
    phone: string;
    address_line: string;
    city: string;
    postal_code: string;
    lat?: number;
    lng?: number;
  };
  merchants: MerchantQuoteBreakdown[];
  total_products_subtotal_idr: number;
  total_shipping_fee_idr: number;
  customer_app_fee_idr: number;
  customer_fee_policy?: CustomerFeePolicyInfo | null;
  tax_idr: number;
  customer_grand_total_idr: number;
  currency: string;
}

export interface CheckoutCreatedOrder {
  id: string;
  order_number: string;
  merchant_org_id: string;
  merchant_display_snapshot?: any;
  status: string;
  customer_total_idr: number;
  product_subtotal_idr: number;
  shipping_customer_idr: number;
  app_fee_allocated_idr: number;
  items: Array<{
    id: string;
    product_id: string;
    variant_id: string;
    quantity: number;
    unit_price_idr: number;
    line_total_idr: number;
    line_subtotal_idr?: number;
    product_snapshot?: any;
    variant_snapshot?: any;
    product_image_ref?: string;
  }>;
}

export interface CheckoutCreatedResponse {
  id: string;
  checkout_group_number: string;
  customer_id: string;
  customer_total_idr: number;
  customer_app_fee_idr: number;
  currency: string;
  payment_status_projection: string;
  orders: CheckoutCreatedOrder[];
}

export interface PaymentProjectionResponse {
  checkout_group_id: string;
  finance_payment_id?: string;
  payment_status: string;
  amount_idr: number;
  currency: string;
  expires_at?: string;
  paid_at?: string;
}

export interface PaymentIntentResponse {
  payment_intent_id?: string;
  payment_id?: string;
  checkout_group_id: string;
  method: string;
  payment_reference?: string;
  qr_code_data?: string;
  virtual_account_number?: string;
  amount_idr: number;
  currency: string;
  expires_at: string;
  instructions?: string[];
  mode?: string;
  disclaimer?: string;
}

export interface DeliverySettingTier {
  id?: string;
  from_km: number;
  to_km: number;
  shipping_fee_idr: number;
  position?: number;
  is_active?: boolean;
}

export interface DeliverySettingResponse {
  id?: string;
  merchant_org_id: string;
  merchant_name?: string;
  store_name?: string;
  address?: string;
  address_line?: string;
  city?: string;
  is_enabled: boolean;
  origin_reference_id?: string;
  origin_lat?: number;
  origin_lng?: number;
  origin_region_code?: string;
  maximum_distance_km: number;
  distance_method?: string;
  operational_note?: string;
  version: number;
  tiers: DeliverySettingTier[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price_idr: number;
  line_total_idr?: number;
  line_subtotal_idr?: number;
  name?: string;
  sku?: string;
  product_image_ref?: string;
  product_snapshot?: {
    name?: string;
    variant_name?: string;
    image_url?: string;
    sku?: string;
    product_id?: string;
    [key: string]: any;
  };
  variant_snapshot?: {
    name?: string;
    sku?: string;
    price_idr?: number;
    variant_id?: string;
    [key: string]: any;
  };
}

export interface OrderDeliveryAttempt {
  id: string;
  attempt_number: number;
  status: string;
  failed_reason_code?: string;
  note?: string;
  created_at: string;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  courier_method?: "KURIR_TOKO" | "GOSEND" | "EXTERNAL_COURIER" | null;
  courier_name?: string;
  courier_phone?: string;
  booking_reference?: string | null;
  tracking_url?: string | null;
  delivery_status?: "PENDING" | "COURIER_ASSIGNED" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | string;
  status?: string;
  service_type?: string;
  provider?: string | null;
  distance_km?: number | null;
  recipient_name?: string | null;
  proof_reference?: string | null;
  proof_verified?: boolean;
  dispatched_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  attempts?: OrderDeliveryAttempt[];
  events?: any[];
}

export interface OrderCancellationRequest {
  id: string;
  order_id: string;
  requester_user_id: string;
  reason_code: string;
  reason_note?: string;
  note?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision_by?: string;
  decision_at?: string;
  decision_note?: string;
  sla_deadline?: string;
  version: number;
  created_at: string;
  requested_at?: string;
}

export interface MerchantOrderEntity {
  id: string;
  order_number: string;
  checkout_group_id: string;
  customer_id: string;
  merchant_org_id: string;
  status: "CREATED" | "PAYMENT_PENDING" | "CONFIRMED" | "PROCESSING" | "PACKED" | "DELIVERING" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  payment_status_projection: string;
  currency: string;
  product_subtotal_idr: number;
  shipping_customer_idr: number;
  app_fee_allocated_idr: number;
  customer_tax_allocated_idr: number;
  customer_total_idr: number;
  merchant_commission_allocated_idr: number;
  merchant_receivable_idr: number;
  version: number;
  merchant_display_snapshot?: {
    name?: string;
    city?: string;
    org_code?: string;
    [key: string]: any;
  };
  recipient_snapshot?: {
    recipient_name?: string;
    phone?: string;
    recipient_phone?: string;
    notes?: string;
    [key: string]: any;
  };
  address_snapshot?: {
    address_line?: string;
    city?: string;
    postal_code?: string;
    subdistrict?: string;
    district?: string;
    region_code?: string;
    label?: string;
    is_official_verified?: boolean;
    recipient_name?: string;
    recipient_phone?: string;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    [key: string]: any;
  };
  origin_snapshot?: {
    merchant_org_id?: string;
    name?: string;
    address_line?: string;
    city?: string;
    region_code?: string;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    phone?: string;
    [key: string]: any;
  };
  shipping_snapshot?: any;
  finance_allocation_reference?: string | null;
  discount_allocated_idr?: number;
  discount_bearer?: string;
  notes?: string | null;
  cancel_reason_code?: string | null;
  confirmed_at?: string;
  processed_at?: string;
  packed_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancel_actor_role?: string;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
  delivery?: OrderDelivery;
  cancellation_requests?: OrderCancellationRequest[];
  cancellationRequests?: OrderCancellationRequest[];
  active_cancellation_request?: OrderCancellationRequest;
}

export interface PaginatedResult<T> {
  current_page: number;
  data: T[];
  first_page_url?: string;
  from?: number;
  last_page: number;
  last_page_url?: string;
  next_page_url?: string | null;
  path?: string;
  per_page: number;
  prev_page_url?: string | null;
  to?: number;
  total: number;
}

export interface AdminOrderCounts {
  total: number;
  belum_bayar: number;
  masuk: number;
  diproses: number;
  dikemas: number;
  dikirim: number;
  diterima: number;
  selesai: number;
  batal: number;
  payment_pending: number;
  payment_paid: number;
  payment_expired: number;
  payment_failed: number;
}

export interface AdminFinancePaymentDetail {
  payment_id: string;
  checkout_group_id: string;
  method?: string;
  provider?: string;
  status?: string;
  amount_idr?: number;
  currency?: string;
  paid_at?: string;
  expires_at?: string;
  is_real_payment?: boolean;
}

export interface AdminFinanceAllocationDetail {
  allocation_id?: string;
  merchant_order_id: string;
  merchant_org_id: string;
  product_subtotal_idr: number;
  shipping_customer_idr: number;
  app_fee_allocated_idr: number;
  customer_tax_allocated_idr: number;
  customer_total_idr: number;
  merchant_commission_idr: number;
  merchant_fee_breakdown?: Array<{
    name: string;
    slug?: string;
    policy_code?: string;
    fee_type?: string;
    amount_idr: number;
  }>;
  merchant_tax_or_withholding_idr: number;
  merchant_net_entitlement_idr?: number;
  status?: string;
}

export interface AdminFinanceRefundDetail {
  refund_id?: string;
  merchant_order_id: string;
  status: string;
  refund_amount_idr: number;
  credited_amount_idr: number;
  destination: string;
  processed_at?: string;
}

export interface AdminFinanceSettlementDetail {
  held_fund_id?: string;
  merchant_order_id: string;
  status: string;
  gross_held_idr: number;
  merchant_entitlement_idr: number;
  completed_at?: string;
  eligible_release_at?: string;
  released_at?: string;
  refunded_at?: string;
  hold_reason_code?: string;
}

export interface AdminOrderStatusHistory {
  id: string;
  order_id: string;
  previous_status?: string | null;
  new_status: string;
  action: string;
  actor_id?: string;
  actor_role?: string;
  source_service?: string;
  reason_code?: string | null;
  reason_note?: string | null;
  related_event_id?: string | null;
  order_version?: number;
  occurred_at: string;
}

export interface AdminOrderDetailEntity extends MerchantOrderEntity {
  checkout_group?: {
    id: string;
    customer_id: string;
    address_id: string;
    recipient_snapshot: any;
    address_snapshot: any;
    orchestration_status: string;
    payment_status_projection: string;
    finance_payment_id?: string;
    finance_expires_at?: string;
    customer_total_idr: number;
    [key: string]: any;
  };
  histories?: AdminOrderStatusHistory[];
  cancellation_requests?: OrderCancellationRequest[];
  finance_payment?: AdminFinancePaymentDetail | null;
  finance_allocation?: AdminFinanceAllocationDetail | null;
  finance_refund?: AdminFinanceRefundDetail | null;
  finance_settlement?: AdminFinanceSettlementDetail | null;
}

// -------------------------------------------------------------
// ORDER BARANG API CLIENT METHODS
// -------------------------------------------------------------

export const orderBarangApi = {
  // ===========================================================
  // CUSTOMER APIS
  // ===========================================================
  customer: {
    // Cart operations
    async getCart() {
      return apiFetch<BackendCartGrouped>("/order-barang/cart");
    },

    async addItem(data: {
      product_id: string;
      variant_id: string;
      quantity: number;
      merchant_org_id?: string;
    }) {
      return apiFetch<BackendCartItem>("/order-barang/cart/items", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateItem(itemId: string, quantity: number) {
      return apiFetch<BackendCartItem>(`/order-barang/cart/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
    },

    async removeItem(itemId: string) {
      return apiFetch<{ removed_item_id: string }>(`/order-barang/cart/items/${itemId}`, {
        method: "DELETE",
      });
    },

    // Checkout & Quotes
    async previewQuote(data: {
      address_id: string;
      cart_item_ids?: string[];
      buy_now_item?: {
        product_id: string;
        variant_id: string;
        quantity: number;
        merchant_org_id?: string;
      };
      merchant_notes?: Record<string, string>;
    }) {
      return apiFetch<CheckoutQuoteResponse>("/order-barang/checkout-quotes", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async createCheckout(
      data: {
        address_id: string;
        cart_item_ids?: string[];
        buy_now_item?: {
          product_id: string;
          variant_id: string;
          quantity: number;
          merchant_org_id?: string;
        };
        merchant_notes?: Record<string, string>;
      },
      idempotencyKey?: string
    ) {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }
      return apiFetch<CheckoutCreatedResponse>("/order-barang/checkouts", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
    },

    async getCheckout(id: string) {
      return apiFetch<CheckoutCreatedResponse>(`/order-barang/checkouts/${id}`);
    },

    async getCheckoutPayment(id: string) {
      return apiFetch<PaymentProjectionResponse>(`/order-barang/checkouts/${id}/payment`);
    },

    async createPaymentIntent(
      checkoutGroupId: string,
      method: "QRIS" | "VA" | "MOCK_QRIS" | "MOCK_VA" | "MOCK_VA_BCA" | "MOCK_VA_BRI" | "MOCK_VA_MANDIRI" | "MOCK_VA_BNI"
    ) {
      return apiFetch<PaymentIntentResponse>(
        `/order-barang/checkouts/${checkoutGroupId}/payment-intents`,
        {
          method: "POST",
          body: JSON.stringify({ method }),
        }
      );
    },

    async cancelUnpaidCheckout(checkoutGroupId: string, reasonCode: string) {
      return apiFetch<{ success: boolean; cancelled_checkout_group_id: string }>(
        `/order-barang/checkouts/${checkoutGroupId}/cancel-unpaid`,
        {
          method: "POST",
          body: JSON.stringify({ reason_code: reasonCode }),
        }
      );
    },

    // Orders
    async getOrders(tab?: "unpaid" | "processing" | "shipping" | "completed" | "cancelled", page = 1, perPage = 20) {
      const q = new URLSearchParams();
      if (tab) q.append("tab", tab);
      if (page) q.append("page", String(page));
      if (perPage) q.append("per_page", String(perPage));
      const qs = q.toString();
      return apiFetch<PaginatedResult<MerchantOrderEntity>>(`/order-barang/orders${qs ? `?${qs}` : ""}`);
    },

    async getOrder(id: string) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/orders/${id}`);
    },

    async cancelConfirmedDirect(id: string, reasonCode: string, note?: string) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason_code: reasonCode, note }),
      });
    },

    async requestCancellation(id: string, reasonCode: string, note?: string) {
      return apiFetch<OrderCancellationRequest>(`/order-barang/orders/${id}/cancellation-requests`, {
        method: "POST",
        body: JSON.stringify({ reason_code: reasonCode, note }),
      });
    },

    async getCancellationRequests(id: string) {
      return apiFetch<OrderCancellationRequest[]>(`/order-barang/orders/${id}/cancellation-requests`);
    },

    async confirmReceived(id: string) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/orders/${id}/confirm-received`, {
        method: "POST",
      });
    },

    async getReceiptContext(id: string) {
      return apiFetch<{
        order_id: string;
        order_number: string;
        merchant_name: string;
        recipient: any;
        address: any;
        items: OrderItem[];
        product_subtotal_idr: number;
        shipping_customer_idr: number;
        app_fee_allocated_idr: number;
        customer_tax_allocated_idr: number;
        customer_total_idr: number;
        completed_at?: string;
        finance_payment_id?: string;
      }>(`/order-barang/orders/${id}/receipt-context`);
    },
  },

  // ===========================================================
  // PUBLIC / GENERAL APIS
  // ===========================================================
  public: {
    async checkDelivery(params: {
      merchant_org_id: string;
      dest_lat?: number;
      dest_lng?: number;
      dest_city?: string;
    }) {
      const q = new URLSearchParams();
      q.append("merchant_org_id", params.merchant_org_id);
      if (params.dest_lat != null) q.append("dest_lat", String(params.dest_lat));
      if (params.dest_lng != null) q.append("dest_lng", String(params.dest_lng));
      if (params.dest_city) q.append("dest_city", params.dest_city);
      return apiFetch<{
        merchant_org_id: string;
        store_name: string;
        origin_city: string;
        is_enabled: boolean;
        is_deliverable: boolean;
        is_within_range: boolean;
        distance_km: number;
        maximum_distance_km: number;
        origin_lat: number;
        origin_lng: number;
        dest_lat: number;
        dest_lng: number;
        reason?: string | null;
      }>(`/order-barang/delivery-check?${q.toString()}`);
    },
  },

  // ===========================================================
  // MERCHANT APIS
  // ===========================================================
  merchant: {
    // Delivery Settings
    async getDeliverySettings() {
      return apiFetch<DeliverySettingResponse>("/order-barang/merchant/delivery-settings");
    },

    async updateDeliverySettings(payload: {
      is_enabled: boolean;
      maximum_distance_km: number;
      tiers: Array<{
        from_km: number;
        to_km: number;
        shipping_fee_idr: number;
        position?: number;
      }>;
      operational_note?: string;
      expected_version?: number;
    }) {
      return apiFetch<DeliverySettingResponse>("/order-barang/merchant/delivery-settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    // Merchant Orders (5 Tabs: incoming, processing, shipping, completed, cancelled)
    async getOrders(
      tab?: "unpaid" | "incoming" | "processing" | "shipping" | "completed" | "cancelled",
      page = 1,
      perPage = 20,
      merchantOrgId?: string
    ) {
      const q = new URLSearchParams();
      if (tab) q.append("tab", tab);
      if (page) q.append("page", String(page));
      if (perPage) q.append("per_page", String(perPage));
      const qs = q.toString();
      const headers: Record<string, string> = {};
      if (merchantOrgId) {
        headers["X-Actor-Org-Id"] = merchantOrgId;
      }
      return apiFetch<PaginatedResult<MerchantOrderEntity>>(
        `/order-barang/merchant/orders${qs ? `?${qs}` : ""}`,
        { headers }
      );
    },

    async getOrder(id: string) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}`);
    },

    async processOrder(id: string, expectedVersion?: number) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}/process`, {
        method: "POST",
        body: JSON.stringify({ expected_version: expectedVersion }),
      });
    },

    async packOrder(id: string, expectedVersion?: number) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}/pack`, {
        method: "POST",
        body: JSON.stringify({ expected_version: expectedVersion }),
      });
    },

    async updateDelivery(
      id: string,
      payload: {
        courier_method: "KURIR_TOKO" | "GOSEND" | "EXTERNAL_COURIER";
        booking_reference?: string;
        tracking_url?: string;
        courier_name?: string;
        courier_phone?: string;
      }
    ) {
      return apiFetch<OrderDelivery>(`/order-barang/merchant/orders/${id}/delivery`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    async dispatchOrder(
      id: string,
      payload?: {
        proof_of_pickup?: string;
        expected_version?: number;
      }
    ) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}/dispatch`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
    },

    async markDelivered(
      id: string,
      payload: {
        recipient_name: string;
        proof_reference: string;
        expected_version?: number;
      }
    ) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}/delivered`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async reportDeliveryFailure(
      id: string,
      payload: {
        failure_reason_code: string;
        note?: string;
      }
    ) {
      return apiFetch<OrderDelivery>(`/order-barang/merchant/orders/${id}/delivery-failure`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async retryDelivery(
      id: string,
      payload?: {
        courier_method?: string;
        note?: string;
      }
    ) {
      return apiFetch<OrderDelivery>(`/order-barang/merchant/orders/${id}/delivery-retry`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
    },

    async deliveryRetry(
      id: string,
      payload?: {
        courier_method?: string;
        note?: string;
      }
    ) {
      return this.retryDelivery(id, payload);
    },

    async cancelOrder(
      id: string,
      payload: {
        reason_code: string;
        note?: string;
      }
    ) {
      return apiFetch<MerchantOrderEntity>(`/order-barang/merchant/orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async decideCancellationRequest(
      requestId: string,
      payload: {
        decision: "APPROVED" | "REJECTED";
        reason_code?: string;
        decision_note?: string;
        expected_request_version?: number;
      }
    ) {
      return apiFetch<OrderCancellationRequest>(
        `/order-barang/merchant/cancellation-requests/${requestId}/decision`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
  },

  // ===========================================================
  // ADMIN OPERATIONS APIS (Global Product Orders)
  // ===========================================================
  admin: {
    async getOrders(params?: {
      status?: string;
      payment_status?: string;
      search?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      per_page?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.status && params.status !== "ALL") q.append("status", params.status);
      if (params?.payment_status && params.payment_status !== "ALL") q.append("payment_status", params.payment_status);
      if (params?.search) q.append("search", params.search);
      if (params?.date_from) q.append("date_from", params.date_from);
      if (params?.date_to) q.append("date_to", params.date_to);
      if (params?.page) q.append("page", String(params.page));
      if (params?.per_page) q.append("per_page", String(params.per_page));
      const qs = q.toString();
      return apiFetch<PaginatedResult<AdminOrderDetailEntity>>(`/order-barang/admin/orders${qs ? `?${qs}` : ""}`);
    },

    async getOrderCounts() {
      return apiFetch<AdminOrderCounts>("/order-barang/admin/orders/counts");
    },

    async getOrder(id: string) {
      return apiFetch<AdminOrderDetailEntity>(`/order-barang/admin/orders/${id}`);
    },
  },
};

