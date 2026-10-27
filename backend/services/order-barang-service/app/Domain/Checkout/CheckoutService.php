<?php

declare(strict_types=1);

namespace App\Domain\Checkout;

use App\Domain\Shipping\DeliveryException;
use App\Domain\Shipping\DeliveryQuoteService;
use App\Infrastructure\Finance\FinanceCheckoutClient;
use App\Infrastructure\Identity\IdentityAddressClient;
use App\Infrastructure\Product\ProductClient;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CheckoutGroup;
use App\Models\Delivery;
use App\Models\MerchantDeliverySetting;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\OrderStockReservation;
use App\Models\PaymentProjection;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutService
{
    public function __construct(
        protected IdentityAddressClient $identityClient,
        protected ProductClient $productClient,
        protected DeliveryQuoteService $deliveryQuoteService,
        protected FinanceCheckoutClient $financeClient,
    ) {}

    /**
     * Preview / calculate preliminary quote for selected items.
     * All-or-nothing: if one merchant fails eligibility, fail entire quote!
     */
    public function previewQuote(
        string $customerId,
        ?array $cartItemIds,
        ?array $buyNowItem,
        string $addressId,
        array $merchantNotes = []
    ): array {
        $address = $this->identityClient->getCustomerAddress($customerId, $addressId);
        if (!$address) {
            throw new Exception('Alamat pengiriman tidak ditemukan atau belum terverifikasi di Identity Service.', 404);
        }

        $itemsGrouped = $this->resolveAndValidateItems($customerId, $cartItemIds, $buyNowItem);

        $merchantOrders = [];
        $totalProductSubtotal = 0;
        $totalShippingFee = 0;

        foreach ($itemsGrouped as $merchantOrgId => $group) {
            $officialOrigin = $this->identityClient->getMerchantOrigin($merchantOrgId);
            if (!$officialOrigin) {
                throw new DeliveryException('MERCHANT_LOCATION_UNAVAILABLE', "Lokasi asal toko resmi {$merchantOrgId} belum terverifikasi di Identity Service.");
            }

            $setting = MerchantDeliverySetting::where('merchant_org_id', $merchantOrgId)->first();
            if (!$setting || !$setting->is_enabled) {
                // If merchant has not activated delivery settings, shipping is free (gratis ongkir)
                $shipping = [
                    'shipping_fee_idr' => 0,
                    'distance_km' => 0.0,
                    'distance_method' => 'FREE_SHIPPING',
                    'tier_id' => 'TIER_FREE',
                ];
            } else {
                $shipping = $this->deliveryQuoteService->calculateShipping(
                    $setting,
                    (float) $address['latitude'],
                    (float) $address['longitude'],
                    $address['region_code'] ?? null
                );
            }

            $merchantProductSubtotal = $group['subtotal_idr'];
            $totalProductSubtotal += $merchantProductSubtotal;
            $totalShippingFee += $shipping['shipping_fee_idr'];

            $merchantOrders[] = [
                'merchant_org_id' => $merchantOrgId,
                'merchant_name' => $officialOrigin['name'] ?? "Toko {$merchantOrgId}",
                'items' => $group['items'],
                'product_subtotal_idr' => $merchantProductSubtotal,
                'items_subtotal_idr' => $merchantProductSubtotal,
                'shipping_customer_idr' => $shipping['shipping_fee_idr'],
                'shipping_fee_idr' => $shipping['shipping_fee_idr'],
                'distance_km' => $shipping['distance_km'],
                'distance_method' => $shipping['distance_method'],
                'estimated_total_idr' => $merchantProductSubtotal + $shipping['shipping_fee_idr'],
            ];
        }

        // Fetch active customer fee policy from Finance 06
        $activeFeePolicy = $this->financeClient->getActiveCustomerFeePolicy();
        $customerAppFee = 0;
        if ($activeFeePolicy) {
            if (($activeFeePolicy['fee_type'] ?? '') === 'FIXED') {
                $customerAppFee = (int) ($activeFeePolicy['fixed_amount_idr'] ?? 0);
            } elseif (($activeFeePolicy['fee_type'] ?? '') === 'PERCENTAGE') {
                $rate = (float) ($activeFeePolicy['percentage_rate'] ?? 0);
                $customerAppFee = (int) round(($totalProductSubtotal * $rate) / 100);
            }
        }

        $grandTotal = $totalProductSubtotal + $totalShippingFee + $customerAppFee;

        return [
            'quote_reference' => 'Q_' . Str::upper(Str::random(10)),
            'quote_revision' => 1,
            'address_id' => $addressId,
            'address' => $address,
            'merchant_orders' => $merchantOrders,
            'merchants' => $merchantOrders,
            'product_subtotal_idr' => $totalProductSubtotal,
            'total_products_subtotal_idr' => $totalProductSubtotal,
            'shipping_total_idr' => $totalShippingFee,
            'total_shipping_fee_idr' => $totalShippingFee,
            'customer_app_fee_idr' => $customerAppFee,
            'customer_fee_policy' => $activeFeePolicy,
            'tax_idr' => 0,
            'estimated_grand_total_idr' => $grandTotal,
            'customer_grand_total_idr' => $grandTotal,
            'finance_quote_status' => $activeFeePolicy ? 'POLICY_APPLIED' : 'AWAITING_FINAL_CHECKOUT',
            'currency' => 'IDR',
        ];
    }

    /**
     * Create CheckoutGroup and child Orders in single combined transaction, then fetch official Finance quote.
     */
    public function createCheckout(
        string $customerId,
        string $addressId,
        ?array $cartItemIds,
        ?array $buyNowItem,
        array $merchantNotes,
        string $idempotencyKey
    ): array {
        // Idempotency check on CheckoutGroup
        $existingGroup = CheckoutGroup::where('customer_id', $customerId)
            ->where('idempotency_key', $idempotencyKey)
            ->with(['orders.items'])
            ->first();

        if ($existingGroup) {
            return $this->formatCheckoutResponse($existingGroup);
        }

        $address = $this->identityClient->getCustomerAddress($customerId, $addressId);
        if (!$address) {
            throw new Exception('Alamat pengiriman tidak ditemukan atau belum terverifikasi di Identity Service.', 404);
        }

        $itemsGrouped = $this->resolveAndValidateItems($customerId, $cartItemIds, $buyNowItem);

        // Pre-validate all merchants shipping eligibility & origins before any mutation (all-or-nothing)
        $merchantShippingQuotes = [];
        $merchantOrigins = [];
        foreach ($itemsGrouped as $merchantOrgId => $group) {
            $officialOrigin = $this->identityClient->getMerchantOrigin($merchantOrgId);
            if (!$officialOrigin) {
                throw new DeliveryException('MERCHANT_LOCATION_UNAVAILABLE', "Lokasi asal toko resmi {$merchantOrgId} belum terverifikasi di Identity Service.");
            }
            $merchantOrigins[$merchantOrgId] = $officialOrigin;

            $setting = MerchantDeliverySetting::where('merchant_org_id', $merchantOrgId)->first();
            if (!$setting || !$setting->is_enabled) {
                $shipping = [
                    'shipping_fee_idr' => 0,
                    'distance_km' => 0.0,
                    'distance_method' => 'FREE_SHIPPING',
                    'tier_id' => 'TIER_FREE',
                ];
            } else {
                $shipping = $this->deliveryQuoteService->calculateShipping(
                    $setting,
                    (float) $address['latitude'],
                    (float) $address['longitude'],
                    $address['region_code'] ?? null
                );
            }

            $merchantShippingQuotes[$merchantOrgId] = [
                'setting' => $setting,
                'shipping' => $shipping,
            ];
        }

        $checkoutGroupId = (string) Str::ulid();
        $selectedItemsHash = hash('sha256', json_encode(array_keys($itemsGrouped)) . json_encode($cartItemIds ?? $buyNowItem));

        // 1. Persist local CheckoutGroup and Orders in MySQL transaction
        $checkoutGroup = DB::transaction(function () use (
            $checkoutGroupId,
            $customerId,
            $addressId,
            $address,
            $cartItemIds,
            $selectedItemsHash,
            $idempotencyKey,
            $itemsGrouped,
            $merchantShippingQuotes,
            $merchantOrigins,
            $merchantNotes
        ) {
            $group = CheckoutGroup::create([
                'id' => $checkoutGroupId,
                'customer_id' => $customerId,
                'address_id' => $addressId,
                'recipient_snapshot' => [
                    'recipient_name' => $address['recipient_name'],
                    'recipient_phone' => $address['recipient_phone'],
                ],
                'address_snapshot' => $address,
                'selected_items_hash' => $selectedItemsHash,
                'selected_cart_item_ids' => $cartItemIds ?: null,
                'idempotency_key' => $idempotencyKey,
                'quote_revision' => 1,
                'orchestration_status' => 'PREPARING',
                'payment_status_projection' => 'PENDING',
                'currency' => 'IDR',
                'version' => 1,
            ]);

            foreach ($itemsGrouped as $merchantOrgId => $groupData) {
                $shippingInfo = $merchantShippingQuotes[$merchantOrgId];
                $shipping = $shippingInfo['shipping'];
                $setting = $shippingInfo['setting'];
                $officialOrigin = $merchantOrigins[$merchantOrgId];
                $orderId = (string) Str::ulid();
                $orderNumber = 'ORD-' . date('Ymd') . '-' . Str::upper(Str::random(6));

                $order = Order::create([
                    'id' => $orderId,
                    'order_number' => $orderNumber,
                    'checkout_group_id' => $group->id,
                    'customer_id' => $customerId,
                    'merchant_org_id' => $merchantOrgId,
                    'merchant_display_snapshot' => [
                        'merchant_org_id' => $merchantOrgId,
                        'name' => $officialOrigin['name'] ?? "Toko {$merchantOrgId}",
                        'city' => $officialOrigin['city'] ?? $address['city'],
                    ],
                    'address_id' => $addressId,
                    'recipient_snapshot' => [
                        'recipient_name' => $address['recipient_name'],
                        'recipient_phone' => $address['recipient_phone'],
                    ],
                    'address_snapshot' => $address,
                    'origin_snapshot' => $officialOrigin,
                    'shipping_snapshot' => [
                        'delivery_setting_id' => $setting?->id,
                        'setting_version' => $setting?->version ?? 1,
                        'distance_km' => $shipping['distance_km'],
                        'distance_method' => $shipping['distance_method'],
                        'shipping_fee_idr' => $shipping['shipping_fee_idr'],
                    ],
                    'product_subtotal_idr' => $groupData['subtotal_idr'],
                    'shipping_customer_idr' => $shipping['shipping_fee_idr'],
                    'customer_total_idr' => $groupData['subtotal_idr'] + $shipping['shipping_fee_idr'],
                    'payment_status_projection' => 'PENDING',
                    'status' => Order::STATUS_CREATED,
                    'notes' => $merchantNotes[$merchantOrgId] ?? null,
                    'version' => 1,
                ]);

                // Create Order Items
                foreach ($groupData['items'] as $item) {
                    OrderItem::create([
                        'id' => (string) Str::ulid(),
                        'order_id' => $order->id,
                        'product_id' => $item['product_id'],
                        'variant_id' => $item['variant_id'],
                        'product_snapshot' => $item['product_snapshot'],
                        'variant_snapshot' => $item['variant_snapshot'],
                        'product_image_ref' => $item['product_image_ref'] ?? null,
                        'quantity' => $item['quantity'],
                        'unit_price_idr' => $item['unit_price_idr'],
                        'line_subtotal_idr' => $item['line_subtotal_idr'],
                    ]);
                }

                // Create Delivery record
                Delivery::create([
                    'id' => (string) Str::ulid(),
                    'order_id' => $order->id,
                    'service_type' => 'LOCAL_MERCHANT_MANAGED',
                    'status' => Delivery::STATUS_NOT_STARTED,
                    'version' => 1,
                ]);

                // Append initial history
                OrderStatusHistory::create([
                    'id' => (string) Str::ulid(),
                    'order_id' => $order->id,
                    'previous_status' => null,
                    'new_status' => Order::STATUS_CREATED,
                    'action' => 'CHECKOUT_CREATED',
                    'actor_id' => $customerId,
                    'actor_role' => 'CUSTOMER',
                    'source_service' => 'ORDER_05A',
                    'order_version' => 1,
                    'occurred_at' => now(),
                ]);
            }

            return $group->fresh(['orders.items']);
        });

        // 2. Prepare payload for Finance Quote
        $financeMerchantOrders = [];
        foreach ($checkoutGroup->orders as $order) {
            $financeMerchantOrders[] = [
                'merchant_order_id' => $order->id,
                'merchant_org_id' => $order->merchant_org_id,
                'product_subtotal_idr' => $order->product_subtotal_idr,
                'shipping_customer_idr' => $order->shipping_customer_idr,
                'discount_idr' => 0,
                'discount_bearer' => 'MERCHANT',
            ];
        }

        try {
            $financeQuote = $this->financeClient->requestCheckoutQuote([
                'checkout_group_id' => $checkoutGroup->id,
                'customer_id' => $customerId,
                'currency' => 'IDR',
                'order_quote_revision' => 1,
                'validated_by_order_service' => true,
                'merchant_orders' => $financeMerchantOrders,
            ]);
        } catch (\Throwable $e) {
            $checkoutGroup->update([
                'orchestration_status' => 'FINANCE_QUOTE_FAILED',
                'failure_code' => 'FINANCE_UPSTREAM_ERROR',
            ]);
            throw new Exception("Gagal menghubungi Finance Service untuk kalkulasi biaya: " . $e->getMessage(), 502);
        }

        // 3. Verify allocations & finance total invariant
        $allocations = $financeQuote['allocations'] ?? [];
        $allocationsByOrderId = collect($allocations)->keyBy('merchant_order_id');

        $allocatedSum = 0;
        foreach ($checkoutGroup->orders as $order) {
            $alloc = $allocationsByOrderId->get($order->id);
            if (!$alloc) {
                throw new Exception("Finance Service tidak mengembalikan alokasi untuk order {$order->id}.", 409);
            }
            $allocatedSum += (int) $alloc['customer_total_idr'];
        }

        $financeTotal = (int) ($financeQuote['customer_total_idr'] ?? 0);
        if ($allocatedSum !== $financeTotal) {
            throw new Exception("Ketidakcocokan total alokasi Finance ({$allocatedSum} vs {$financeTotal}). Checkout dibatalkan.", 409);
        }

        // 4. Update orders with Finance allocations
        DB::transaction(function () use ($checkoutGroup, $allocationsByOrderId, $financeQuote, $financeTotal) {
            foreach ($checkoutGroup->orders as $order) {
                $alloc = $allocationsByOrderId->get($order->id);
                $order->update([
                    'app_fee_allocated_idr' => (int) ($alloc['app_fee_allocated_idr'] ?? 0),
                    'customer_tax_allocated_idr' => (int) ($alloc['customer_tax_allocated_idr'] ?? 0),
                    'discount_allocated_idr' => (int) ($alloc['discount_allocated_idr'] ?? 0),
                    'discount_bearer' => $alloc['discount_bearer'] ?? null,
                    'customer_total_idr' => (int) $alloc['customer_total_idr'],
                    'finance_allocation_reference' => $financeQuote['payload_hash'] ?? null,
                ]);
            }

            $checkoutGroup->update([
                'finance_quote_hash' => $financeQuote['payload_hash'] ?? null,
                'customer_total_idr' => $financeTotal,
                'orchestration_status' => 'FINANCE_QUOTED',
            ]);
        });

        // 5. Note: Selected cart items are PRESERVED until payment is confirmed (FIX 04).
        // They are only purged when payment.confirmed event is received!

        return $this->formatCheckoutResponse($checkoutGroup->fresh(['orders.items']));
    }

    /**
     * Create or retrieve single combined payment intent from Finance Service 06.
     * Enforces stock reservation gate (FIX 03) and authoritative values (FIX 05).
     */
    public function createPaymentIntent(
        string $customerId,
        string $checkoutGroupId,
        string $method
    ): array {
        $group = CheckoutGroup::where('id', $checkoutGroupId)->where('customer_id', $customerId)->first();
        if (!$group) {
            throw new Exception('Checkout group tidak ditemukan atau bukan milik Anda.', 404);
        }

        if (empty($group->finance_quote_hash)) {
            throw new Exception('Checkout group belum memiliki quote Finance yang sah.', 409);
        }

        // Check if active payment projection exists
        $existingProjection = PaymentProjection::where('checkout_group_id', $group->id)->first();
        if ($existingProjection && $existingProjection->payment_status === 'PENDING' && $existingProjection->expires_at && now()->lessThan($existingProjection->expires_at)) {
            return [
                'payment_id' => $existingProjection->finance_payment_id,
                'checkout_group_id' => $group->id,
                'status' => 'PENDING',
                'amount_idr' => $existingProjection->amount_idr,
                'currency' => $existingProjection->currency,
                'expires_at' => $existingProjection->expires_at->toIso8601String(),
                'payment_instruction' => 'Silakan selesaikan pembayaran sesuai instruksi QRIS/VA sebelumnya.',
            ];
        }

        // FIX 03: Stock Reservation Fail-Closed Gate
        // Verify that atomic stock reservation is either confirmed or supported.
        foreach ($group->orders as $ord) {
            $reservationResult = $this->productClient->reserveInventory(
                $ord->id,
                $ord->items->map(fn($it) => [
                    'variant_id' => $it->variant_id,
                    'quantity' => $it->quantity,
                ])->toArray()
            );

            if (!$reservationResult['success']) {
                $status = $reservationResult['status'] ?? 'PENDING_PRODUCT_CONTRACT';
                foreach ($ord->items as $it) {
                    OrderStockReservation::updateOrCreate(
                        ['order_item_id' => $it->id],
                        [
                            'id' => (string) Str::ulid(),
                            'order_id' => $ord->id,
                            'variant_id' => $it->variant_id,
                            'quantity' => $it->quantity,
                            'remote_reservation_id' => 'PENDING_' . $ord->id,
                            'reservation_status' => $status,
                            'reserved_until' => now()->addHours(6),
                        ]
                    );
                }

                if ($status === 'PENDING_PRODUCT_CONTRACT') {
                    throw new Exception('PENDING_PRODUCT_CONTRACT: Kontrak reservasi stok anti-oversell atomik belum tersedia di Product Service 03. Pembayaran diblokir demi keamanan stok.', 409);
                }

                throw new Exception("Gagal mencadangkan stok produk untuk pesanan toko {$ord->merchant_org_id}: " . ($reservationResult['message'] ?? 'Stok tidak mencukupi'), 409);
            }

            // Persist confirmed stock reservation
            foreach ($ord->items as $it) {
                OrderStockReservation::updateOrCreate(
                    ['order_item_id' => $it->id],
                    [
                        'id' => (string) Str::ulid(),
                        'order_id' => $ord->id,
                        'variant_id' => $it->variant_id,
                        'quantity' => $it->quantity,
                        'remote_reservation_id' => 'RES_' . $ord->id,
                        'reservation_status' => 'RESERVED',
                        'reserved_until' => now()->addHours(6),
                    ]
                );
            }
        }

        // Call Finance Service for authoritative payment intent
        $intent = $this->financeClient->createPaymentIntent(
            $group->id,
            $method,
            $group->finance_quote_hash,
            $group->quote_revision
        );

        // FIX 05: Strict Authoritative Validation - NO DUMMY FALLBACKS!
        if (empty($intent['payment_id'])) {
            throw new Exception('Finance Service tidak mengembalikan payment_id yang sah.', 502);
        }
        $paymentId = (string) $intent['payment_id'];

        if (!isset($intent['amount_idr']) || (int) $intent['amount_idr'] !== (int) $group->customer_total_idr) {
            $intentAmt = $intent['amount_idr'] ?? 'null';
            throw new Exception("Nominal pembayaran Finance ({$intentAmt}) tidak sesuai dengan total tagihan checkout group ({$group->customer_total_idr}).", 409);
        }
        $amountIdr = (int) $intent['amount_idr'];

        if (empty($intent['expires_at'])) {
            throw new Exception('Finance Service tidak mengembalikan waktu kedaluwarsa pembayaran (expires_at).', 502);
        }
        $expiresAt = \Carbon\Carbon::parse($intent['expires_at']);

        // Update local projection and order states in single transaction
        DB::transaction(function () use ($group, $paymentId, $amountIdr, $expiresAt) {
            PaymentProjection::updateOrCreate(
                ['checkout_group_id' => $group->id],
                [
                    'id' => (string) Str::ulid(),
                    'finance_payment_id' => $paymentId,
                    'payment_status' => 'PENDING',
                    'amount_idr' => $amountIdr,
                    'currency' => 'IDR',
                    'expires_at' => $expiresAt,
                    'last_verified_at' => now(),
                ]
            );

            $group->update([
                'finance_payment_id' => $paymentId,
                'finance_expires_at' => $expiresAt,
                'payment_status_projection' => 'PENDING',
                'orchestration_status' => 'PAYMENT_ISSUED',
            ]);

            foreach ($group->orders as $order) {
                if ($order->status === Order::STATUS_CREATED) {
                    $order->update([
                        'status' => Order::STATUS_PAYMENT_PENDING,
                        'payment_status_projection' => 'PENDING',
                    ]);

                    OrderStatusHistory::create([
                        'id' => (string) Str::ulid(),
                        'order_id' => $order->id,
                        'previous_status' => Order::STATUS_CREATED,
                        'new_status' => Order::STATUS_PAYMENT_PENDING,
                        'action' => 'PAYMENT_INTENT_ISSUED',
                        'actor_id' => $group->customer_id,
                        'actor_role' => 'CUSTOMER',
                        'source_service' => 'ORDER_05A',
                        'order_version' => $order->version,
                        'occurred_at' => now(),
                    ]);
                }
            }
        });

        return [
            'payment_id' => $paymentId,
            'checkout_group_id' => $group->id,
            'method' => $method,
            'provider' => $intent['provider'] ?? 'MOCK_GATEWAY',
            'status' => 'PENDING',
            'amount_idr' => $amountIdr,
            'currency' => 'IDR',
            'expires_at' => $expiresAt->toIso8601String(),
            'payment_instruction' => $intent['payment_instruction'] ?? 'Instruksi pembayaran QRIS / Virtual Account.',
        ];
    }

    /**
     * Resolve items from cart IDs or buy-now item, grouped by merchant.
     * Enforces Cart Ownership (FIX 04) and Authoritative Product Snapshots (FIX 02).
     */
    private function resolveAndValidateItems(string $customerId, ?array $cartItemIds, ?array $buyNowItem): array
    {
        $rawItems = [];

        if (!empty($buyNowItem)) {
            $rawItems[] = [
                'product_id' => $buyNowItem['product_id'],
                'variant_id' => $buyNowItem['variant_id'],
                'quantity' => (int) ($buyNowItem['quantity'] ?? 1),
                'merchant_org_id' => $buyNowItem['merchant_org_id'] ?? null,
            ];
        } elseif (!empty($cartItemIds)) {
            // FIX 04: Verify cart ownership strictly!
            $cart = Cart::where('customer_id', $customerId)->where('cart_state', 'ACTIVE')->first();
            if (!$cart) {
                throw new Exception('Keranjang belanja aktif tidak ditemukan.', 404);
            }

            // Check if any requested item belongs to another customer's cart
            $foreignItem = CartItem::whereIn('id', $cartItemIds)->where('cart_id', '!=', $cart->id)->first();
            if ($foreignItem) {
                throw new Exception('Akses ditolak: Satu atau lebih item keranjang milik pengguna lain.', 403);
            }

            $cartItems = CartItem::where('cart_id', $cart->id)->whereIn('id', $cartItemIds)->get();
            if ($cartItems->count() !== count(array_unique($cartItemIds))) {
                throw new Exception('Satu atau lebih item keranjang yang dipilih tidak ditemukan.', 404);
            }

            foreach ($cartItems as $cItem) {
                $rawItems[] = [
                    'product_id' => $cItem->product_id,
                    'variant_id' => $cItem->variant_id,
                    'quantity' => $cItem->quantity,
                    'merchant_org_id' => $cItem->merchant_org_id,
                ];
            }
        } else {
            throw new Exception('Pilih item dari keranjang atau gunakan Beli Sekarang.', 422);
        }

        $grouped = [];

        foreach ($rawItems as $item) {
            $productId = $item['product_id'];
            $variantId = $item['variant_id'];
            $qty = $item['quantity'];

            // FIX 02: Fetch authoritative live snapshot from Product 03 - ZERO DUMMY FALLBACK!
            $snapshot = $this->productClient->getVariantSnapshot($productId, $variantId);
            if (!$snapshot) {
                throw new Exception("Produk {$productId} varian {$variantId} tidak ditemukan atau Product Service tidak merespons.", 404);
            }

            if (empty($snapshot['merchant_organization_id'])) {
                throw new Exception("Data organisasi toko untuk produk {$productId} tidak valid.", 422);
            }
            $merchantOrgId = $snapshot['merchant_organization_id'];

            // Validate merchant match if merchant_org_id was provided
            if (!empty($item['merchant_org_id']) && $item['merchant_org_id'] !== $merchantOrgId) {
                throw new Exception("Ketidaksesuaian toko: Produk {$productId} bukan milik toko yang dipilih.", 422);
            }

            $priceIdr = $snapshot['price_idr'];
            $stockQty = $snapshot['stock_qty'];
            $isEligible = $snapshot['product_public_eligible'] && $snapshot['variant_active'];

            if (!$isEligible) {
                throw new Exception("Produk atau varian {$productId} tidak aktif dan tidak dapat dibeli.", 422);
            }

            if ($stockQty < $qty) {
                throw new Exception("Stok untuk varian produk {$productId} tidak mencukupi (sisa: {$stockQty}).", 422);
            }

            if (!isset($grouped[$merchantOrgId])) {
                $grouped[$merchantOrgId] = [
                    'merchant_org_id' => $merchantOrgId,
                    'items' => [],
                    'subtotal_idr' => 0,
                ];
            }

            $lineSubtotal = $priceIdr * $qty;

            $grouped[$merchantOrgId]['items'][] = [
                'product_id' => $productId,
                'variant_id' => $variantId,
                'quantity' => $qty,
                'unit_price_idr' => $priceIdr,
                'line_subtotal_idr' => $lineSubtotal,
                'product_snapshot' => [
                    'product_id' => $productId,
                    'name' => $snapshot['name'] ?? ($item['product_name'] ?? "Produk {$productId}"),
                ],
                'variant_snapshot' => [
                    'variant_id' => $variantId,
                    'sku' => "SKU-{$variantId}",
                    'name' => $snapshot['variant_name'] ?? ($item['variant_name'] ?? "Varian {$variantId}"),
                    'price_idr' => $priceIdr,
                ],
                'product_image_ref' => $snapshot['image_url'] ?? ($item['image_url'] ?? null),
            ];

            $grouped[$merchantOrgId]['subtotal_idr'] += $lineSubtotal;
        }

        return $grouped;
    }

    private function formatCheckoutResponse(CheckoutGroup $group): array
    {
        $orders = [];
        foreach ($group->orders as $o) {
            $items = [];
            if ($o->relationLoaded('items')) {
                foreach ($o->items as $it) {
                    $items[] = [
                        'id' => $it->id,
                        'order_id' => $it->order_id,
                        'product_id' => $it->product_id,
                        'variant_id' => $it->variant_id,
                        'quantity' => $it->quantity,
                        'unit_price_idr' => $it->unit_price_idr,
                        'line_subtotal_idr' => $it->line_subtotal_idr,
                        'line_total_idr' => $it->line_subtotal_idr,
                        'product_snapshot' => $it->product_snapshot,
                        'variant_snapshot' => $it->variant_snapshot,
                        'product_image_ref' => $it->product_image_ref,
                    ];
                }
            }
            $orders[] = [
                'id' => $o->id,
                'order_id' => $o->id,
                'order_number' => $o->order_number,
                'merchant_org_id' => $o->merchant_org_id,
                'merchant_display_snapshot' => $o->merchant_display_snapshot,
                'status' => $o->status,
                'product_subtotal_idr' => $o->product_subtotal_idr,
                'shipping_customer_idr' => $o->shipping_customer_idr,
                'customer_total_idr' => $o->customer_total_idr,
                'items_count' => $o->relationLoaded('items') ? $o->items->count() : 0,
                'items' => $items,
            ];
        }

        return [
            'id' => $group->id,
            'checkout_group_id' => $group->id,
            'checkout_group_number' => $group->checkout_group_number,
            'orders' => $orders,
            'merchant_orders' => $orders,
            'finance_quote_payload_hash' => $group->finance_quote_hash,
            'grand_total_idr' => $group->customer_total_idr,
            'customer_total_idr' => $group->customer_total_idr,
            'currency' => $group->currency,
            'payment_status' => $group->payment_status_projection,
            'payment_status_projection' => $group->payment_status_projection,
            'expires_at' => $group->finance_expires_at?->toIso8601String(),
        ];
    }
}
