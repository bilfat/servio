/**
 * SERVIO — PHASE 05A ORDER BARANG
 * Comprehensive Frontend-Only Types System
 * Strictly aligned with PHASE-05A-ORDER-BARANG-REVISED-LOCKED.md (V3)
 */

// 1. CANONICAL ORDER STATUS (STRICT: NO OTHER STATUSES ALLOWED)
export type CanonicalOrderStatus =
  | "CREATED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "DELIVERING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

// 2. FINANCIAL & PAYMENT STATUS
export type MockPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type MockRefundProgress =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

// 3. DELIVERY & COURIER STATUS
export type MockDeliveryStatus =
  | "NOT_STARTED"
  | "READY_FOR_DELIVERY"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED";

export type MockDeliveryMethod = "MERCHANT_DELIVERY" | "THIRD_PARTY";
export type MockDeliveryProvider = "MERCHANT" | "GOSEND";

export type DeliveryMethod = MockDeliveryMethod;
export type DeliveryProvider = MockDeliveryProvider;

// 4. CANCELLATION REQUEST STATUS (LOCKED: SLA 12 OPERATING HOURS)
export type MockCancellationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MockCancellationRequest {
  id: string;
  orderId: string;
  requestedAt: string;
  responseDeadlineAt: string; // 12 operating hours from requestedAt
  reason: string;
  note?: string;
  notes?: string;
  status: MockCancellationStatus;
  rejectionReason?: string;
  decidedAt?: string;
  decidedBy?: "MERCHANT" | "SYSTEM";
}

// 5. MERCHANT SHIPPING SETTINGS & TIERS
export interface MockShippingRateTier {
  id: string;
  minKm: number;
  maxKm: number;
  rate: number;
}

export interface MockShippingSettings {
  merchantId: string;
  merchantName: string;
  address: string;
  city: string;
  coordinates: { lat: number; lng: number };
  isLocalDeliveryActive: boolean;
  maxRadiusKm: number;
  rateTiers: MockShippingRateTier[];
  note?: string;
}

// 6. ORDER ITEMS & TIMELINE
export interface MockOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  thumbnailUrl: string;
}

export interface MockTimelineEvent {
  step: string;
  title: string;
  description: string;
  timestamp: string;
  isCompleted: boolean;
  isCurrent?: boolean;
}

export interface MockDeliveryAttempt {
  attemptNumber: number;
  timestamp: string;
  status: MockDeliveryStatus;
  failureReason?: string;
  notes?: string;
}

export interface MockDeliveryInfo {
  method: MockDeliveryMethod;
  provider: MockDeliveryProvider;
  status: MockDeliveryStatus;
  deliveryStatus?: MockDeliveryStatus;
  courierMethod?: string;
  courierName?: string;
  courierPhone?: string;
  trackingNumber?: string;
  trackingReference?: string;
  trackingUrl?: string;
  pickupAt?: string;
  deliveredAt?: string;
  deliveredToName?: string;
  recipientReceivedBy?: string;
  distanceKm?: number;
  notes?: string;
  deliveredNotes?: string;
  proofPhotoUrl?: string;
  proofType?: string;
  failureReason?: string;
  retryCount: number;
  attempts: MockDeliveryAttempt[];
}

export interface MockRecipientAddress {
  id?: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  street?: string;
  city: string;
  district?: string;
  postalCode?: string;
  notes?: string;
  coordinates?: { lat: number; lng: number };
}

export interface MockOrderPricing {
  itemsSubtotal: number;
  shippingFee: number;
  platformFee: number;
  taxAmount: number;
  merchantOrderTotal: number;
}

export interface MockOrderPayment {
  status: MockPaymentStatus;
  totalAmount: number;
  method: "QRIS" | "VIRTUAL_ACCOUNT";
  paymentReference?: string;
  paidAt?: string;
  bank?: "BCA" | "BNI" | "BRI" | "MANDIRI";
  vaNumber?: string;
}

export interface MockOrderCancellationDetails {
  reason?: string;
  actor?: string;
}

// 7. INDEPENDENT MERCHANT ORDER (PER-TOKO)
export interface MockMerchantOrder {
  id: string;
  orderNumber: string;
  checkoutGroupId: string;
  checkoutGroupNumber: string;

  // Merchant info
  merchantId: string;
  merchantName: string;
  merchantCity: string;

  // Customer & recipient snapshot
  customerId: string;
  customerName: string;
  customerPhone: string;
  recipientAddress: MockRecipientAddress;
  shippingAddressSnapshot: MockRecipientAddress;

  // Items & financial allocation
  items: MockOrderItem[];
  itemsSubtotal: number;
  shippingFee: number;
  simulatedDistanceKm: number;
  customerServiceFee: number;
  customerTax: number;
  totalAmount: number; // Subtotal + shipping + serviceFee + tax

  // Pricing snapshot alias
  pricing: MockOrderPricing;

  // Lifecycle statuses
  status: CanonicalOrderStatus;
  paymentStatus: MockPaymentStatus;
  refundStatus: MockRefundProgress;
  refundAmount: number;
  refund: {
    status: MockRefundProgress;
    amount: number;
  };

  payment: MockOrderPayment;

  paymentMethod: "QRIS" | "VIRTUAL_ACCOUNT";
  selectedBank?: "BCA" | "BNI" | "BRI" | "MANDIRI";
  customerNote?: string;

  // Cancellation
  cancellationRequest?: MockCancellationRequest;
  cancelledAt?: string;
  cancelledBy?: "CUSTOMER" | "MERCHANT" | "SYSTEM";
  cancellationReason?: string;
  cancellationDetails?: MockOrderCancellationDetails;

  // Delivery details
  delivery: MockDeliveryInfo;

  // Timeline
  timeline: MockTimelineEvent[];

  // Timestamps & Auto-completion
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  packedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  completionSource?: "CUSTOMER_CONFIRMATION" | "AUTO_COMPLETION";
  autoCompleteDeadlineAt?: string; // deliveredAt + 48 hours
  isIssueHoldActive?: boolean;
  issueHoldReason?: string;
}

// 8. MULTI-MERCHANT CHECKOUT GROUP
export interface MockCheckoutGroup {
  payment?: any;
  id: string;
  checkoutGroupNumber: string;
  orderIds: string[];
  merchantOrderIds?: string[];
  merchantIds: string[];
  merchantNames: string[];

  grandTotal: number;
  totalItemsPrice: number;
  totalShipping: number;
  totalServiceFee: number;
  totalTax: number;

  paymentStatus: MockPaymentStatus;
  paymentMethod: "QRIS" | "VIRTUAL_ACCOUNT";
  selectedBank?: "BCA" | "BNI" | "BRI" | "MANDIRI";
  vaNumber?: string;
  qrisPayload?: string;

  createdAt: string;
  expiresAt: string; // createdAt + 6 hours
  paidAt?: string;
  isExpired?: boolean;
}

// 9. CUSTOMER & MERCHANT TABS
export type CustomerOrderSecondaryTab =
  | "BELUM_BAYAR"
  | "DIPROSES"
  | "DIKIRIM"
  | "SELESAI"
  | "BATAL";

export type MerchantOrderTab =
  | "MASUK"
  | "DIPROSES"
  | "DIKIRIM"
  | "SELESAI"
  | "BATAL";
