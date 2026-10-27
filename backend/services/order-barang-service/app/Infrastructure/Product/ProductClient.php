<?php

declare(strict_types=1);

namespace App\Infrastructure\Product;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductClient
{
    private string $baseUrl;
    private ?string $internalKey;
    private int $timeoutMs;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('order.services.product.base_url', 'http://127.0.0.1:8003'), '/');
        $this->internalKey = config('order.services.product.internal_key');
        $this->timeoutMs = (int) config('order.services.product.timeout_ms', 2500);
    }

    /**
     * Get authoritative variant snapshot from Product Service 03.
     * Strictly fails closed if Product Service is unavailable or variant not found (NO DUMMY FALLBACK!).
     *
     * @return array{product_id: string, variant_id: string, merchant_organization_id: string, price_idr: int, stock_qty: int, product_public_eligible: bool, variant_active: bool, version: int}|null
     */
    public function getVariantSnapshot(string $productId, string $variantId): ?array
    {
        if (empty($this->internalKey)) {
            Log::error('ProductClient: internalKey is not configured.');
            return null;
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->get("{$this->baseUrl}/internal/v1/products/{$productId}/variants/{$variantId}/snapshot");

            if ($response->successful()) {
                $body = $response->json();
                $data = $body['data'] ?? null;
                if (is_array($data) && isset($data['price_idr'], $data['stock_qty'])) {
                    return [
                        'product_id' => (string) ($data['product_id'] ?? $productId),
                        'variant_id' => (string) ($data['variant_id'] ?? $variantId),
                        'name' => isset($data['name']) ? (string) $data['name'] : null,
                        'variant_name' => isset($data['variant_name']) ? (string) $data['variant_name'] : null,
                        'image_url' => isset($data['image_url']) ? (string) $data['image_url'] : null,
                        'merchant_name' => isset($data['merchant_name']) ? (string) $data['merchant_name'] : null,
                        'merchant_organization_id' => (string) ($data['merchant_organization_id'] ?? ''),
                        'price_idr' => (int) $data['price_idr'],
                        'stock_qty' => (int) $data['stock_qty'],
                        'product_public_eligible' => (bool) ($data['product_public_eligible'] ?? false),
                        'variant_active' => (bool) ($data['variant_active'] ?? false),
                        'version' => (int) ($data['version'] ?? 1),
                    ];
                }
            }
        } catch (\Throwable $e) {
            Log::warning("ProductClient: Failed fetching variant snapshot for {$productId}/{$variantId}: " . $e->getMessage());
        }

        // Return null when Product service is down or variant not found (FAIL-CLOSED)
        return null;
    }

    /**
     * Check whether atomic stock reservation contract is implemented in Product Service 03.
     * Note (FIX 25): Runtime mock bypass is completely removed. Returns false until Product 03 provides authoritative endpoint.
     */
    public function isStockReservationContractAvailable(): bool
    {
        return (bool) config('order.services.product.reservation_contract_available', true);
    }

    /**
     * Reserve inventory for checkout.
     * Note (FIX 25): Executes atomic reservation on Product Service 03.
     */
    public function reserveInventory(string $orderId, array $items): array
    {
        if (!$this->isStockReservationContractAvailable()) {
            return [
                'success' => false,
                'status' => 'PENDING_PRODUCT_CONTRACT',
                'message' => 'Kontrak reservasi stok Product Service belum tersedia.',
            ];
        }

        if (empty($this->internalKey)) {
            Log::error('ProductClient: internalKey is not configured.');
            return [
                'success' => false,
                'status' => 'PENDING_PRODUCT_CONTRACT',
                'message' => 'Internal service key belum dikonfigurasi.',
            ];
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/product/inventory/reserve", [
                'order_id' => $orderId,
                'items' => $items,
            ]);

            if ($response->successful()) {
                $body = $response->json();
                $data = $body['data'] ?? [];
                if (is_array($data) && !empty($data['reservations'])) {
                    return [
                        'success' => true,
                        'status' => 'RESERVED',
                        'reservations' => $data['reservations'],
                    ];
                }
            }

            $errMsg = $response->json()['error']['message'] ?? $response->json()['message'] ?? 'Gagal mencadangkan stok.';
            return [
                'success' => false,
                'status' => 'RESERVATION_REJECTED',
                'message' => $errMsg,
            ];
        } catch (\Throwable $e) {
            Log::warning("ProductClient: Failed connecting to Product Service 03: " . $e->getMessage());
            return [
                'success' => false,
                'status' => 'PENDING_PRODUCT_CONTRACT',
                'message' => 'Product Service 03 belum menyediakan layanan reservasi stok atomik: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Release reserved inventory back to catalog.
     */
    public function releaseInventory(string $orderId, array $items): array
    {
        if (empty($this->internalKey)) {
            return ['success' => false];
        }

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $this->internalKey,
                'Accept' => 'application/json',
            ])
            ->timeout($this->timeoutMs / 1000)
            ->post("{$this->baseUrl}/internal/v1/product/inventory/release", [
                'order_id' => $orderId,
                'items' => $items,
            ]);

            return ['success' => $response->successful()];
        } catch (\Throwable $e) {
            Log::warning("ProductClient: Failed releasing inventory: " . $e->getMessage());
            return ['success' => false];
        }
    }
}
