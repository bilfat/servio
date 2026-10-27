<?php

declare(strict_types=1);

namespace App\Domain\Cart;

use App\Infrastructure\Product\ProductClient;
use App\Models\Cart;
use App\Models\CartItem;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartService
{
    public function __construct(
        protected ProductClient $productClient
    ) {}

    /**
     * Get or create active cart for customer.
     */
    public function getOrCreateActiveCart(string $customerId): Cart
    {
        return Cart::firstOrCreate(
            ['customer_id' => $customerId, 'cart_state' => 'ACTIVE'],
            ['id' => (string) Str::ulid(), 'version' => 1]
        );
    }

    /**
     * Get cart details grouped by merchant organization.
     */
    public function getCartGrouped(string $customerId): array
    {
        $cart = $this->getOrCreateActiveCart($customerId);
        $items = $cart->items()->get();

        $merchantGroups = [];

        foreach ($items as $item) {
            $orgId = $item->merchant_org_id;

            // Enrich from Product Service if available
            $productSnapshot = $this->productClient->getVariantSnapshot($item->product_id, $item->variant_id);

            $priceIdr = $productSnapshot['price_idr'] ?? 0;
            $lineTotal = $priceIdr * $item->quantity;
            $productName = $productSnapshot['name'] ?? null;
            $variantName = $productSnapshot['variant_name'] ?? null;
            $imageUrl = $productSnapshot['image_url'] ?? null;
            $merchantName = !empty($productSnapshot['merchant_name']) ? $productSnapshot['merchant_name'] : "Toko {$orgId}";

            if (!isset($merchantGroups[$orgId])) {
                $merchantGroups[$orgId] = [
                    'merchant_org_id' => $orgId,
                    'merchant_name' => $merchantName,
                    'items' => [],
                    'estimated_subtotal_idr' => 0,
                ];
            } elseif ($merchantGroups[$orgId]['merchant_name'] === "Toko {$orgId}" && !empty($productSnapshot['merchant_name'])) {
                $merchantGroups[$orgId]['merchant_name'] = $productSnapshot['merchant_name'];
            }

            $merchantGroups[$orgId]['items'][] = [
                'id' => $item->id,
                'cart_id' => $cart->id,
                'product_id' => $item->product_id,
                'variant_id' => $item->variant_id,
                'name' => $productName,
                'variant_name' => $variantName,
                'image_url' => $imageUrl,
                'quantity' => $item->quantity,
                'unit_price_idr' => $priceIdr,
                'line_total_idr' => $lineTotal,
                'stock_qty' => $productSnapshot['stock_qty'] ?? 0,
                'is_active' => ($productSnapshot['product_public_eligible'] ?? false) && ($productSnapshot['variant_active'] ?? false),
                'added_at' => $item->added_at?->toIso8601String(),
            ];

            $merchantGroups[$orgId]['estimated_subtotal_idr'] += $lineTotal;
        }

        return [
            'cart_id' => $cart->id,
            'customer_id' => $customerId,
            'cart_state' => $cart->cart_state,
            'merchants' => array_values($merchantGroups),
            'total_items_count' => $items->sum('quantity'),
        ];
    }

    /**
     * Add item to customer cart.
     * Enforces authoritative snapshot validation (FIX 02).
     */
    public function addItem(
        string $customerId,
        string $productId,
        string $variantId,
        int $quantity,
        ?string $merchantOrgId = null
    ): CartItem {
        if ($quantity <= 0) {
            throw new Exception('Kuantitas item harus lebih besar dari 0.', 422);
        }

        // Fetch authoritative product snapshot from Product 03 - ZERO DUMMY FALLBACK!
        $snapshot = $this->productClient->getVariantSnapshot($productId, $variantId);
        if (!$snapshot) {
            throw new Exception('Produk atau varian tidak ditemukan di Product Service.', 404);
        }

        if (!$snapshot['product_public_eligible'] || !$snapshot['variant_active']) {
            throw new Exception('Produk atau varian tidak aktif dan tidak dapat dibeli.', 422);
        }

        if (empty($snapshot['merchant_organization_id'])) {
            throw new Exception('Data merchant organisasi produk tidak valid.', 422);
        }

        $authoritativeOrgId = $snapshot['merchant_organization_id'];

        return DB::transaction(function () use ($customerId, $productId, $variantId, $quantity, $authoritativeOrgId) {
            $cart = $this->getOrCreateActiveCart($customerId);

            $cartItem = CartItem::where('cart_id', $cart->id)
                ->where('variant_id', $variantId)
                ->first();

            if ($cartItem) {
                $cartItem->quantity += $quantity;
                $cartItem->save();
            } else {
                $cartItem = CartItem::create([
                    'id' => (string) Str::ulid(),
                    'cart_id' => $cart->id,
                    'merchant_org_id' => $authoritativeOrgId,
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'quantity' => $quantity,
                    'added_at' => now(),
                ]);
            }

            return $cartItem;
        });
    }

    /**
     * Update item quantity with strict ownership verification (FIX 04).
     */
    public function updateQuantity(string $customerId, string $itemId, int $quantity): ?CartItem
    {
        $cart = $this->getOrCreateActiveCart($customerId);
        $item = CartItem::where('cart_id', $cart->id)->where('id', $itemId)->first();

        if (!$item) {
            if (CartItem::where('id', $itemId)->exists()) {
                throw new Exception('Akses ditolak: Item keranjang milik pengguna lain.', 403);
            }
            throw new Exception('Item keranjang tidak ditemukan.', 404);
        }

        if ($quantity <= 0) {
            $item->delete();
            return null;
        }

        $item->quantity = $quantity;
        $item->save();

        return $item;
    }

    /**
     * Remove item from cart with strict ownership verification (FIX 04).
     */
    public function removeItem(string $customerId, string $itemId): bool
    {
        $cart = $this->getOrCreateActiveCart($customerId);
        $item = CartItem::where('cart_id', $cart->id)->where('id', $itemId)->first();

        if (!$item) {
            if (CartItem::where('id', $itemId)->exists()) {
                throw new Exception('Akses ditolak: Item keranjang milik pengguna lain.', 403);
            }
            throw new Exception('Item keranjang tidak ditemukan.', 404);
        }

        return (bool) $item->delete();
    }
}
