/**
 * SERVIO — PHASE 05A ORDER BARANG
 * Centralized Reactive Mock Store
 * Persists to localStorage and syncs Customer & Merchant views instantly.
 */

import {
  MockMerchantOrder,
  MockCheckoutGroup,
  MockShippingSettings,
  MockDeliveryMethod,
  MockDeliveryProvider,
} from "@/types/order-barang";
import {
  INITIAL_ORDERS,
  INITIAL_CHECKOUT_GROUPS,
  INITIAL_SHIPPING_SETTINGS,
} from "./seed";
import { addOperatingHours } from "./helpers";

const STORAGE_KEY_ORDERS = "servio_05a_mock_orders_v3";
const STORAGE_KEY_GROUPS = "servio_05a_mock_groups_v3";
const STORAGE_KEY_SHIPPING = "servio_05a_mock_shipping_v3";
const STORAGE_KEY_MERCHANT = "servio_05a_mock_active_merchant_v3";
const STORAGE_KEY_OFFSET = "servio_05a_mock_time_offset_v3";

type Listener = () => void;

class OrderBarangStore {
  private orders: MockMerchantOrder[] = [];
  private checkoutGroups: MockCheckoutGroup[] = [];
  private shippingSettings: Record<string, MockShippingSettings> = {};
  private activeMerchantId: string = "merch-jaya-motor";
  private timeOffsetMinutes: number = 0;
  private listeners: Set<Listener> = new Set();
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private normalizeOrder(o: any): MockMerchantOrder {
    const itemsSubtotal = o.itemsSubtotal ?? o.pricing?.itemsSubtotal ?? 0;
    const shippingFee = o.shippingFee ?? o.pricing?.shippingFee ?? 0;
    const platformFee = o.customerServiceFee ?? o.pricing?.platformFee ?? 2000;
    const taxAmount = o.customerTax ?? o.pricing?.taxAmount ?? 1000;
    const totalAmount = o.totalAmount ?? o.pricing?.merchantOrderTotal ?? (itemsSubtotal + shippingFee + platformFee + taxAmount);
    const recipient = o.recipientAddress ?? o.shippingAddressSnapshot ?? {
      recipientName: o.customerName || "Budi Santoso",
      phone: o.customerPhone || "0812-9876-5432",
      fullAddress: "Jl. Margonda Raya No. 100, Jakarta Selatan",
      street: "Jl. Margonda Raya No. 100",
      city: "Jakarta Selatan",
    };

    const pricing = {
      itemsSubtotal,
      shippingFee,
      platformFee,
      taxAmount,
      merchantOrderTotal: totalAmount,
    };

    const payment = o.payment ?? {
      status: o.paymentStatus || "PENDING",
      totalAmount,
      method: o.paymentMethod || "QRIS",
      paidAt: o.paidAt,
    };

    const refund = o.refund ?? {
      status: o.refundStatus || "NOT_REQUIRED",
      amount: o.refundAmount || 0,
    };

    return {
      ...o,
      itemsSubtotal,
      shippingFee,
      customerServiceFee: platformFee,
      customerTax: taxAmount,
      totalAmount,
      recipientAddress: { ...recipient, street: recipient.street || recipient.fullAddress },
      shippingAddressSnapshot: { ...recipient, street: recipient.street || recipient.fullAddress },
      pricing,
      payment,
      refund,
      cancellationDetails: o.cancellationDetails || (o.cancelledAt ? { reason: o.cancellationReason || "Dibatalkan", actor: o.cancelledBy || "SISTEM" } : undefined),
      delivery: {
        ...o.delivery,
        distanceKm: o.delivery?.distanceKm ?? o.simulatedDistanceKm ?? 3.5,
        recipientReceivedBy: o.delivery?.recipientReceivedBy ?? o.delivery?.deliveredToName ?? recipient.recipientName,
        deliveredNotes: o.delivery?.deliveredNotes ?? o.delivery?.notes,
        courierMethod: o.delivery?.courierMethod ?? (o.delivery?.provider === "GOSEND" ? "GOSEND" : "MERCHANT_DELIVERY"),
        deliveryStatus: o.delivery?.deliveryStatus ?? o.delivery?.status,
      },
    };
  }

  private init() {
    if (typeof window === "undefined") {
      this.orders = INITIAL_ORDERS.map((o) => this.normalizeOrder(o));
      this.checkoutGroups = [...INITIAL_CHECKOUT_GROUPS];
      this.shippingSettings = { ...INITIAL_SHIPPING_SETTINGS };
      return;
    }

    try {
      const savedOrders = localStorage.getItem(STORAGE_KEY_ORDERS);
      const savedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
      const savedShipping = localStorage.getItem(STORAGE_KEY_SHIPPING);
      const savedMerchant = localStorage.getItem(STORAGE_KEY_MERCHANT);
      const savedOffset = localStorage.getItem(STORAGE_KEY_OFFSET);

      this.orders = (savedOrders ? JSON.parse(savedOrders) : [...INITIAL_ORDERS]).map((o: any) => this.normalizeOrder(o));
      this.checkoutGroups = savedGroups
        ? JSON.parse(savedGroups)
        : [...INITIAL_CHECKOUT_GROUPS];
      this.shippingSettings = savedShipping
        ? JSON.parse(savedShipping)
        : { ...INITIAL_SHIPPING_SETTINGS };
      this.activeMerchantId = savedMerchant || "merch-jaya-motor";
      this.timeOffsetMinutes = savedOffset ? parseInt(savedOffset, 10) : 0;
      this.initialized = true;
    } catch {
      this.orders = INITIAL_ORDERS.map((o) => this.normalizeOrder(o));
      this.checkoutGroups = [...INITIAL_CHECKOUT_GROUPS];
      this.shippingSettings = { ...INITIAL_SHIPPING_SETTINGS };
    }
  }

  private save() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(this.orders));
      localStorage.setItem(
        STORAGE_KEY_GROUPS,
        JSON.stringify(this.checkoutGroups)
      );
      localStorage.setItem(
        STORAGE_KEY_SHIPPING,
        JSON.stringify(this.shippingSettings)
      );
      localStorage.setItem(STORAGE_KEY_MERCHANT, this.activeMerchantId);
      localStorage.setItem(
        STORAGE_KEY_OFFSET,
        this.timeOffsetMinutes.toString()
      );
    } catch (e) {
      console.warn("Storage save failed:", e);
    }
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Current mock simulated time
  public getNow(): Date {
    const base = new Date();
    base.setMinutes(base.getMinutes() + this.timeOffsetMinutes);
    return base;
  }

  public getTimeOffsetMinutes(): number {
    return this.timeOffsetMinutes;
  }

  // Getters
  public getOrders(): MockMerchantOrder[] {
    return this.orders.map((o) => this.normalizeOrder(o));
  }

  public getOrderById(id: string): MockMerchantOrder | undefined {
    const o = this.orders.find((o) => o.id === id || o.orderNumber === id);
    return o ? this.normalizeOrder(o) : undefined;
  }

  public getCheckoutGroups(): MockCheckoutGroup[] {
    return [...this.checkoutGroups];
  }

  public getCheckoutGroupById(id: string): MockCheckoutGroup | undefined {
    return this.checkoutGroups.find(
      (g) => g.id === id || g.checkoutGroupNumber === id
    );
  }

  public getShippingSettings(merchantId: string): MockShippingSettings {
    if (this.shippingSettings[merchantId]) {
      return this.shippingSettings[merchantId];
    }
    // Default fallback
    return {
      merchantId,
      merchantName: "Toko Mitra SERVIO",
      address: "Jl. Pertokoan Resmi No. 1",
      city: "Jakarta Barat",
      coordinates: { lat: -6.143, lng: 106.815 },
      isLocalDeliveryActive: true,
      maxRadiusKm: 10,
      rateTiers: [
        { id: "t-def-1", minKm: 0, maxKm: 3, rate: 7000 },
        { id: "t-def-2", minKm: 3, maxKm: 5, rate: 12000 },
        { id: "t-def-3", minKm: 5, maxKm: 10, rate: 18000 },
      ],
      note: "Pengiriman lokal terjamin.",
    };
  }

  public getActiveMerchantId(): string {
    return this.activeMerchantId;
  }

  public setActiveMerchantId(merchantId: string): void {
    this.activeMerchantId = merchantId;
    this.save();
  }

  // 1. CREATE MULTI-MERCHANT CHECKOUT GROUP
  public createCheckoutGroup(payload: {
    cartGroups: Array<{
      merchantId: string;
      merchantName: string;
      merchantCity?: string;
      items: Array<{
        productId: string;
        variantId?: string;
        title: string;
        variantName?: string;
        quantity: number;
        price: number;
        thumbnailUrl?: string;
      }>;
      distanceKm: number;
      shippingFee: number;
      note?: string;
    }>;
    recipientAddress: MockMerchantOrder["recipientAddress"];
    paymentMethod: "QRIS" | "VIRTUAL_ACCOUNT";
    selectedBank?: "BCA" | "BNI" | "BRI" | "MANDIRI";
  }): { checkoutGroup: MockCheckoutGroup; orders: MockMerchantOrder[] } {
    const nowIso = this.getNow().toISOString();
    const expiresAt = new Date(
      this.getNow().getTime() + 6 * 3600 * 1000
    ).toISOString(); // +6 hours LOCKED

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const checkoutGroupId = `CHK-GRP-${Date.now().toString().slice(-6)}-${randomSuffix}`;
    const checkoutGroupNumber = `CHK-2026-${Date.now().toString().slice(-6)}`;

    const createdOrders: MockMerchantOrder[] = [];
    let grandTotal = 0;
    let totalItemsPrice = 0;
    let totalShipping = 0;
    let totalServiceFee = 0;
    let totalTax = 0;

    payload.cartGroups.forEach((group, idx) => {
      const orderItems = group.items.map((it, itemIdx) => ({
        id: `item-${Date.now().toString().slice(-5)}-${itemIdx}`,
        productId: it.productId,
        variantId: it.variantId,
        title: it.title,
        variantName: it.variantName,
        quantity: it.quantity,
        unitPrice: it.price,
        subtotal: it.price * it.quantity,
        thumbnailUrl:
          it.thumbnailUrl ||
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80",
      }));

      const itemsSubtotal = orderItems.reduce((acc, it) => acc + it.subtotal, 0);
      const shippingFee = group.shippingFee;
      const customerServiceFee = 2000; // Allocated fee
      const customerTax = 1000; // Allocated tax
      const totalAmount =
        itemsSubtotal + shippingFee + customerServiceFee + customerTax;

      totalItemsPrice += itemsSubtotal;
      totalShipping += shippingFee;
      totalServiceFee += customerServiceFee;
      totalTax += customerTax;
      grandTotal += totalAmount;

      const orderId = `ORD-MC-${Date.now().toString().slice(-5)}-${idx + 1}`;
      const orderNumber = `ORD-MC-2026-${Date.now().toString().slice(-4)}${idx + 1}`;

      const order: MockMerchantOrder = {
        id: orderId,
        orderNumber,
        checkoutGroupId,
        checkoutGroupNumber,
        merchantId: group.merchantId,
        merchantName: group.merchantName,
        merchantCity: group.merchantCity || "Jakarta Selatan",
        customerId: "cust-01",
        customerName: payload.recipientAddress.recipientName,
        customerPhone: payload.recipientAddress.phone,
        recipientAddress: payload.recipientAddress,
        shippingAddressSnapshot: payload.recipientAddress,
        items: orderItems,
        itemsSubtotal,
        shippingFee,
        simulatedDistanceKm: group.distanceKm,
        customerServiceFee,
        customerTax,
        totalAmount,
        pricing: {
          itemsSubtotal,
          shippingFee,
          platformFee: customerServiceFee,
          taxAmount: customerTax,
          merchantOrderTotal: totalAmount,
        },
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        refundStatus: "NOT_REQUIRED",
        refundAmount: 0,
        refund: {
          status: "NOT_REQUIRED",
          amount: 0,
        },
        payment: {
          status: "PENDING",
          totalAmount,
          method: payload.paymentMethod,
        },
        paymentMethod: payload.paymentMethod,
        selectedBank: payload.selectedBank,
        customerNote: group.note,
        delivery: {
          method: "MERCHANT_DELIVERY",
          provider: "MERCHANT",
          status: "NOT_STARTED",
          retryCount: 0,
          attempts: [],
        },
        timeline: [
          {
            step: "1",
            title: "Pesanan Dibuat",
            description: "Pesanan checkout berhasil dibuat",
            timestamp: nowIso,
            isCompleted: true,
          },
          {
            step: "2",
            title: "Menunggu Pembayaran",
            description: `Batas waktu pembayaran 6 jam hingga ${new Date(expiresAt).toLocaleTimeString("id-ID")}`,
            timestamp: nowIso,
            isCompleted: true,
            isCurrent: true,
          },
          {
            step: "3",
            title: "Pembayaran Berhasil",
            description: "Menunggu pembayaran diverifikasi",
            timestamp: "",
            isCompleted: false,
          },
          {
            step: "4",
            title: "Diproses Toko",
            description: "Toko menyiapkan barang",
            timestamp: "",
            isCompleted: false,
          },
          {
            step: "5",
            title: "Dikemas",
            description: "Barang selesai dikemas",
            timestamp: "",
            isCompleted: false,
          },
          {
            step: "6",
            title: "Sedang Diantar",
            description: "Kurir mengantar paket ke alamat tujuan",
            timestamp: "",
            isCompleted: false,
          },
          {
            step: "7",
            title: "Pesanan Diterima",
            description: "Paket diterima pemesan",
            timestamp: "",
            isCompleted: false,
          },
          {
            step: "8",
            title: "Pesanan Selesai",
            description: "Transaksi selesai",
            timestamp: "",
            isCompleted: false,
          },
        ],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      createdOrders.push(order);
    });

    const checkoutGroup: MockCheckoutGroup = {
      id: checkoutGroupId,
      checkoutGroupNumber,
      orderIds: createdOrders.map((o) => o.id),
      merchantIds: payload.cartGroups.map((g) => g.merchantId),
      merchantNames: payload.cartGroups.map((g) => g.merchantName),
      grandTotal,
      totalItemsPrice,
      totalShipping,
      totalServiceFee,
      totalTax,
      paymentStatus: "PENDING",
      paymentMethod: payload.paymentMethod,
      selectedBank: payload.selectedBank,
      vaNumber:
        payload.paymentMethod === "VIRTUAL_ACCOUNT"
          ? `DEMO-VA-${payload.selectedBank || "BCA"}-889${Date.now().toString().slice(-7)}`
          : undefined,
      qrisPayload:
        payload.paymentMethod === "QRIS"
          ? "00020101021226600016ID.CO.SERVIO.WWW01189360091100234102030015204599953033605802ID5914SERVIO PLATFORM6007JAKARTA62070703A016304C2D1"
          : undefined,
      createdAt: nowIso,
      expiresAt,
    };

    this.checkoutGroups.unshift(checkoutGroup);
    this.orders.unshift(...createdOrders);
    this.save();

    return { checkoutGroup, orders: createdOrders };
  }

  // 2. SIMULATE PAYMENT SUCCESS
  public simulatePaymentSuccess(checkoutGroupId: string): void {
    const group = this.checkoutGroups.find((g) => g.id === checkoutGroupId);
    if (!group) return;

    const nowIso = this.getNow().toISOString();
    group.paymentStatus = "PAID";
    group.paidAt = nowIso;

    // Update all linked merchant orders to CONFIRMED
    this.orders = this.orders.map((order) => {
      if (order.checkoutGroupId === checkoutGroupId) {
        return {
          ...order,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paidAt: nowIso,
          updatedAt: nowIso,
          timeline: order.timeline.map((t) => {
            if (t.step === "2") return { ...t, isCurrent: false };
            if (t.step === "3") {
              return {
                ...t,
                timestamp: nowIso,
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return order;
    });

    this.save();
  }

  // 3. SIMULATE PAYMENT FAILED
  public simulatePaymentFailed(checkoutGroupId: string): void {
    const group = this.checkoutGroups.find((g) => g.id === checkoutGroupId);
    if (!group) return;

    const nowIso = this.getNow().toISOString();
    group.paymentStatus = "FAILED";

    this.orders = this.orders.map((order) => {
      if (order.checkoutGroupId === checkoutGroupId && order.status === "PAYMENT_PENDING") {
        return {
          ...order,
          status: "CANCELLED",
          paymentStatus: "FAILED",
          cancelledAt: nowIso,
          cancelledBy: "SYSTEM",
          cancellationReason: "Pembayaran gagal diverifikasi oleh bank.",
          updatedAt: nowIso,
        };
      }
      return order;
    });

    this.save();
  }

  // 4. SIMULATE PAYMENT EXPIRED (6 Hours Locked)
  public simulatePaymentExpired(checkoutGroupId: string): void {
    const group = this.checkoutGroups.find((g) => g.id === checkoutGroupId);
    if (!group || group.paymentStatus === "PAID") return;

    const nowIso = this.getNow().toISOString();
    group.paymentStatus = "EXPIRED";
    group.isExpired = true;

    this.orders = this.orders.map((order) => {
      if (order.checkoutGroupId === checkoutGroupId && order.status === "PAYMENT_PENDING") {
        return {
          ...order,
          status: "CANCELLED",
          paymentStatus: "EXPIRED",
          cancelledAt: nowIso,
          cancelledBy: "SYSTEM",
          cancellationReason: "Batas waktu pembayaran 6 jam telah berakhir.",
          updatedAt: nowIso,
        };
      }
      return order;
    });

    this.save();
  }

  // 5. CANCEL UNPAID CHECKOUT (Before Payment)
  // Cancels ALL MerchantOrders in that checkout group
  public cancelUnpaidCheckout(checkoutGroupId: string, reason: string): void {
    const group = this.checkoutGroups.find((g) => g.id === checkoutGroupId);
    if (!group) return;

    const nowIso = this.getNow().toISOString();
    group.paymentStatus = "FAILED";

    this.orders = this.orders.map((order) => {
      if (order.checkoutGroupId === checkoutGroupId && order.status === "PAYMENT_PENDING") {
        return {
          ...order,
          status: "CANCELLED",
          paymentStatus: "FAILED",
          refundStatus: "NOT_REQUIRED",
          refundAmount: 0,
          cancelledAt: nowIso,
          cancelledBy: "CUSTOMER",
          cancellationReason: reason || "Pembatalan checkout sebelum pembayaran oleh pembeli.",
          updatedAt: nowIso,
          timeline: [
            ...order.timeline,
            {
              step: "cancel",
              title: "Checkout Dibatalkan",
              description: reason || "Checkout dibatalkan sebelum bayar. Tidak ada refund.",
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return order;
    });

    this.save();
  }

  // 6. CANCEL CONFIRMED ORDER (Direct Cancellation before Merchant starts processing)
  // Creates full refund 100% of this MerchantOrder only
  public cancelConfirmedOrder(orderId: string, reason: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "CONFIRMED") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          refundStatus: "SUCCEEDED",
          refundAmount: o.totalAmount, // 100% Full refund
          cancelledAt: nowIso,
          cancelledBy: "CUSTOMER",
          cancellationReason: reason || "Dibatalkan pembeli sebelum diproses toko.",
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cancel",
              title: "Pesanan Dibatalkan Pembeli",
              description: `Dibatalkan pada status Menunggu Diproses. Pengembalian dana 100% (Rp${o.totalAmount.toLocaleString("id-ID")}) berhasil.`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    // Check if other orders in same group are cancelled or not
    this.updateGroupPaymentStatus(order.checkoutGroupId);
    this.save();
  }

  // 7. REQUEST CANCELLATION WHILE IN "PROCESSING" (Customer requests, starts 12 operating hours SLA)
  public requestOrderCancellation(
    orderId: string,
    reason: string,
    note?: string
  ): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "PROCESSING") return;

    const now = this.getNow();
    const nowIso = now.toISOString();
    const deadline = addOperatingHours(now, 12); // 12 operating hours SLA (LOCKED)

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          cancellationRequest: {
            id: `cncl-${Date.now()}`,
            orderId,
            requestedAt: nowIso,
            responseDeadlineAt: deadline.toISOString(),
            reason,
            note,
            status: "PENDING",
          },
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cncl-req",
              title: "Pengajuan Pembatalan Masuk",
              description: `Alasan: ${reason}. Toko memiliki 12 jam operasional untuk merespon (hingga ${deadline.toLocaleString("id-ID")}).`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.save();
  }

  // 8. MERCHANT APPROVES CANCELLATION REQUEST
  public merchantApproveCancellation(orderId: string): void {
    const order = this.getOrderById(orderId);
    if (!order || !order.cancellationRequest) return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          refundStatus: "SUCCEEDED",
          refundAmount: o.totalAmount, // 100% full refund
          cancelledAt: nowIso,
          cancelledBy: "CUSTOMER",
          cancellationReason: `Pengajuan pembatalan disetujui toko (${o.cancellationRequest?.reason})`,
          cancellationRequest: o.cancellationRequest
            ? {
                ...o.cancellationRequest,
                status: "APPROVED",
                decidedAt: nowIso,
                decidedBy: "MERCHANT",
              }
            : undefined,
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cncl-app",
              title: "Pengajuan Pembatalan Disetujui",
              description: `Toko menyetujui pembatalan. Refund 100% sebesar Rp${o.totalAmount.toLocaleString("id-ID")} diproses ke pembeli.`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.updateGroupPaymentStatus(order.checkoutGroupId);
    this.save();
  }

  // 9. MERCHANT REJECTS CANCELLATION REQUEST
  public merchantRejectCancellation(
    orderId: string,
    rejectionReason: string
  ): void {
    const order = this.getOrderById(orderId);
    if (!order || !order.cancellationRequest) return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId && o.cancellationRequest) {
        return {
          ...o,
          cancellationRequest: {
            ...o.cancellationRequest,
            status: "REJECTED",
            rejectionReason,
            decidedAt: nowIso,
            decidedBy: "MERCHANT",
          },
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cncl-rej",
              title: "Pengajuan Pembatalan Ditolak Toko",
              description: `Alasan penolakan: ${rejectionReason}. Proses persiapan pesanan dilanjutkan.`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.save();
  }

  // 10. MERCHANT STARTS PROCESSING (CONFIRMED -> PROCESSING)
  public merchantStartProcessing(orderId: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "CONFIRMED") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "PROCESSING",
          updatedAt: nowIso,
          timeline: o.timeline.map((t) => {
            if (t.step === "3") return { ...t, isCurrent: false };
            if (t.step === "4") {
              return {
                ...t,
                timestamp: nowIso,
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return o;
    });

    this.save();
  }

  // 11. MERCHANT MARKS PACKED (PROCESSING -> PACKED)
  // Guard: CANNOT PACK if cancellation request is PENDING
  public merchantMarkPacked(orderId: string): { success: boolean; error?: string } {
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, error: "Pesanan tidak ditemukan." };
    if (order.status !== "PROCESSING") {
      return { success: false, error: "Pesanan harus berstatus Sedang Disiapkan (PROCESSING)." };
    }
    if (order.cancellationRequest?.status === "PENDING") {
      return {
        success: false,
        error: "Pengemasan ditahan! Harap setujui atau tolak pengajuan pembatalan pembeli terlebih dahulu.",
      };
    }

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "PACKED",
          packedAt: nowIso,
          updatedAt: nowIso,
          delivery: {
            ...o.delivery,
            status: "READY_FOR_DELIVERY",
          },
          timeline: o.timeline.map((t) => {
            if (t.step === "4") return { ...t, isCurrent: false };
            if (t.step === "5") {
              return {
                ...t,
                timestamp: nowIso,
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return o;
    });

    this.save();
    return { success: true };
  }

  // 12. MERCHANT SETS UP COURIER / DELIVERY DETAILS (While PACKED)
  public merchantSetupDelivery(
    orderId: string,
    payload: {
      method: MockDeliveryMethod;
      provider: MockDeliveryProvider;
      courierName?: string;
      courierPhone?: string;
      trackingReference?: string;
      trackingUrl?: string;
      notes?: string;
    }
  ): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "PACKED") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          delivery: {
            ...o.delivery,
            method: payload.method,
            provider: payload.provider,
            courierName: payload.courierName,
            courierPhone: payload.courierPhone,
            trackingReference: payload.trackingReference,
            trackingUrl: payload.trackingUrl,
            notes: payload.notes,
            status: "READY_FOR_DELIVERY",
          },
          updatedAt: nowIso,
        };
      }
      return o;
    });

    this.save();
  }

  // 13. MERCHANT STARTS DELIVERY (PACKED -> DELIVERING)
  // After package is physically handed over to courier
  public merchantStartDelivery(orderId: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "PACKED") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        const courierDesc =
          o.delivery.provider === "GOSEND"
            ? `GoSend Instant (${o.delivery.courierName || "Driver Gojek"})`
            : `Kurir Toko (${o.delivery.courierName || "Kurir Internal"})`;

        return {
          ...o,
          status: "DELIVERING",
          dispatchedAt: nowIso,
          updatedAt: nowIso,
          delivery: {
            ...o.delivery,
            status: "IN_TRANSIT",
            pickupAt: nowIso,
          },
          timeline: o.timeline.map((t) => {
            if (t.step === "5") return { ...t, isCurrent: false };
            if (t.step === "6") {
              return {
                ...t,
                title: "Sedang Diantar",
                description: `Paket telah diserahkan dan sedang diantar oleh ${courierDesc}`,
                timestamp: nowIso,
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return o;
    });

    this.save();
  }

  // 14. MERCHANT MARKS DELIVERY FAILED (Order remains DELIVERING, Delivery becomes FAILED)
  public merchantMarkDeliveryFailed(orderId: string, failureReason: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "DELIVERING") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        const attempts = [
          ...o.delivery.attempts,
          {
            attemptNumber: o.delivery.attempts.length + 1,
            timestamp: nowIso,
            status: "FAILED" as const,
            failureReason,
          },
        ];

        return {
          ...o,
          delivery: {
            ...o.delivery,
            status: "FAILED",
            failureReason,
            retryCount: o.delivery.retryCount + 1,
            attempts,
          },
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: `fail-${attempts.length}`,
              title: "Pengiriman Terkendala",
              description: `Kendala: ${failureReason}. Menunggu koordinasi pengiriman ulang.`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.save();
  }

  // 15. MERCHANT RETRIES DELIVERY (Delivery returns to IN_TRANSIT)
  public merchantRetryDelivery(orderId: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "DELIVERING") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          delivery: {
            ...o.delivery,
            status: "IN_TRANSIT",
            failureReason: undefined,
          },
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: `retry-${o.delivery.retryCount}`,
              title: "Pengiriman Ulang Berjalan",
              description: "Kurir kembali mengantarkan paket ke alamat tujuan.",
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.save();
  }

  // 16. MERCHANT CONFIRMS DELIVERED (DELIVERING -> DELIVERED)
  // Starts 48-hour auto-completion countdown (LOCKED)
  public merchantConfirmDelivered(
    orderId: string,
    payload: {
      deliveredToName: string;
      notes?: string;
      proofPhotoUrl?: string;
      proofType?: string;
    }
  ): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "DELIVERING") return;

    const now = this.getNow();
    const nowIso = now.toISOString();
    const autoDeadline = new Date(now.getTime() + 48 * 3600 * 1000).toISOString(); // +48 hours

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "DELIVERED",
          deliveredAt: nowIso,
          autoCompleteDeadlineAt: autoDeadline,
          updatedAt: nowIso,
          delivery: {
            ...o.delivery,
            status: "DELIVERED",
            deliveredAt: nowIso,
            deliveredToName: payload.deliveredToName,
            notes: payload.notes || o.delivery.notes,
            proofPhotoUrl: payload.proofPhotoUrl,
            proofType: payload.proofType || "FOTO_PENYERAHAN_LANGSUNG",
          },
          timeline: o.timeline.map((t) => {
            if (t.step === "6") return { ...t, isCurrent: false };
            if (t.step === "7") {
              return {
                ...t,
                timestamp: nowIso,
                description: `Paket diterima oleh ${payload.deliveredToName}. Menunggu konfirmasi pembeli (selesai otomatis dalam 48 jam).`,
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return o;
    });

    this.save();
  }

  // 17. CUSTOMER CONFIRMS RECEIVED (DELIVERED -> COMPLETED)
  public customerConfirmReceived(orderId: string): void {
    const order = this.getOrderById(orderId);
    if (!order || order.status !== "DELIVERED") return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "COMPLETED",
          completedAt: nowIso,
          completionSource: "CUSTOMER_CONFIRMATION",
          updatedAt: nowIso,
          timeline: o.timeline.map((t) => {
            if (t.step === "7") return { ...t, isCurrent: false };
            if (t.step === "8") {
              return {
                ...t,
                timestamp: nowIso,
                description: "Pesanan dikonfirmasi selesai langsung oleh pembeli.",
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }
      return o;
    });

    this.save();
  }

  // 18. MERCHANT OPERATIONAL CANCELLATION (Before PACKED)
  // Valid operational reasons (e.g. out of stock, damaged item)
  public merchantCancelOperational(orderId: string, reason: string): void {
    const order = this.getOrderById(orderId);
    if (!order || !["CONFIRMED", "PROCESSING"].includes(order.status)) return;

    const nowIso = this.getNow().toISOString();

    this.orders = this.orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          refundStatus: "SUCCEEDED",
          refundAmount: o.totalAmount, // 100% full refund
          cancelledAt: nowIso,
          cancelledBy: "MERCHANT",
          cancellationReason: reason || "Dibatalkan toko karena kendala stok/operasional gudang.",
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cancel-merch",
              title: "Dibatalkan Toko (Alasan Operasional)",
              description: `${reason}. Dana Rp${o.totalAmount.toLocaleString("id-ID")} dikembalikan 100% penuh ke pembeli.`,
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }
      return o;
    });

    this.updateGroupPaymentStatus(order.checkoutGroupId);
    this.save();
  }

  // 19. UPDATE SHIPPING SETTINGS
  public updateShippingSettings(
    merchantId: string,
    settings: MockShippingSettings
  ): void {
    this.shippingSettings[merchantId] = { ...settings };
    this.save();
  }

  // 20. ADVANCE MOCK TIME (For testing countdowns & SLAs)
  public advanceMockMinutes(minutes: number): void {
    this.timeOffsetMinutes += minutes;

    // Check SLA timeouts for PENDING cancellation requests (12 operating hours)
    const now = this.getNow();
    const nowIso = now.toISOString();

    this.orders = this.orders.map((o) => {
      // 1. Auto-reject cancellation request on timeout (LOCKED: TIMEOUT_NO_RESPONSE)
      if (
        o.cancellationRequest?.status === "PENDING" &&
        new Date(o.cancellationRequest.responseDeadlineAt).getTime() <= now.getTime()
      ) {
        return {
          ...o,
          cancellationRequest: {
            ...o.cancellationRequest,
            status: "REJECTED",
            rejectionReason: "TIMEOUT_NO_RESPONSE",
            decidedAt: nowIso,
            decidedBy: "SYSTEM",
          },
          updatedAt: nowIso,
          timeline: [
            ...o.timeline,
            {
              step: "cncl-timeout",
              title: "Pembatalan Ditolak Otomatis (Timeout)",
              description: "Batas 12 jam operasional respon toko terlampaui (TIMEOUT_NO_RESPONSE). Pengemasan dapat dilanjutkan.",
              timestamp: nowIso,
              isCompleted: true,
              isCurrent: true,
            },
          ],
        };
      }

      // 2. Auto-completion for DELIVERED orders after 48 hours (if no issue hold)
      if (
        o.status === "DELIVERED" &&
        !o.isIssueHoldActive &&
        o.autoCompleteDeadlineAt &&
        new Date(o.autoCompleteDeadlineAt).getTime() <= now.getTime()
      ) {
        return {
          ...o,
          status: "COMPLETED",
          completedAt: nowIso,
          completionSource: "AUTO_COMPLETION",
          updatedAt: nowIso,
          timeline: o.timeline.map((t) => {
            if (t.step === "7") return { ...t, isCurrent: false };
            if (t.step === "8") {
              return {
                ...t,
                timestamp: nowIso,
                description: "Pesanan selesai otomatis setelah 48 jam barang diterima (Auto-Completion).",
                isCompleted: true,
                isCurrent: true,
              };
            }
            return t;
          }),
        };
      }

      return o;
    });

    // Check payment expiry for PENDING checkout groups (6 hours)
    this.checkoutGroups = this.checkoutGroups.map((group) => {
      if (
        group.paymentStatus === "PENDING" &&
        new Date(group.expiresAt).getTime() <= now.getTime()
      ) {
        return {
          ...group,
          paymentStatus: "EXPIRED",
          isExpired: true,
        };
      }
      return group;
    });

    this.save();
  }

  // 21. RESET DEMO DATA
  public resetDemoData(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_ORDERS);
      localStorage.removeItem(STORAGE_KEY_GROUPS);
      localStorage.removeItem(STORAGE_KEY_SHIPPING);
      localStorage.removeItem(STORAGE_KEY_MERCHANT);
      localStorage.removeItem(STORAGE_KEY_OFFSET);
    }
    this.orders = [...INITIAL_ORDERS];
    this.checkoutGroups = [...INITIAL_CHECKOUT_GROUPS];
    this.shippingSettings = { ...INITIAL_SHIPPING_SETTINGS };
    this.activeMerchantId = "merch-jaya-motor";
    this.timeOffsetMinutes = 0;
    this.save();
  }

  private updateGroupPaymentStatus(checkoutGroupId: string) {
    const group = this.checkoutGroups.find((g) => g.id === checkoutGroupId);
    if (!group) return;

    const groupOrders = this.orders.filter(
      (o) => o.checkoutGroupId === checkoutGroupId
    );
    const allCancelled = groupOrders.every((o) => o.status === "CANCELLED");
    const anyCancelled = groupOrders.some((o) => o.status === "CANCELLED");

    if (allCancelled) {
      group.paymentStatus = "REFUNDED";
    } else if (anyCancelled) {
      group.paymentStatus = "PARTIALLY_REFUNDED";
    }
  }
}

export const orderBarangStore = new OrderBarangStore();
