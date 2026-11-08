<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Integrations;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Models\CaseItem;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class HttpOrderEligibilityVerifier implements OrderEligibilityVerifierInterface
{
    public function verifyOrderEligibility(
        string $customerId,
        string $orderKind,
        string $orderId,
        ?string $subOrderId = null
    ): OrderEligibilityDto {
        $orderKind = strtoupper($orderKind);

        if ($orderKind === 'GOODS') {
            return $this->verifyGoodsOrder($customerId, $orderId, $subOrderId);
        }

        if ($orderKind === 'SERVICE') {
            return $this->verifyServiceOrder($customerId, $orderId);
        }

        return OrderEligibilityDto::invalid("Jenis pesanan '{$orderKind}' tidak valid.", $orderId, $customerId);
    }

    protected function verifyGoodsOrder(string $customerId, string $orderId, ?string $subOrderId): OrderEligibilityDto
    {
        $baseUrl = config('after_sales.services.order_barang.base_url', 'http://127.0.0.1:8005');
        $internalKey = config('after_sales.services.order_barang.internal_key', 'servio_local_internal_service_key_2026');

        try {
            // If subOrderId is specified, verify specific merchant suborder, otherwise orderId
            $lookupId = $subOrderId ?: $orderId;
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(5)->get("{$baseUrl}/internal/v1/order-barang/orders/{$lookupId}");

            if (!$response->successful()) {
                Log::warning("HttpOrderEligibilityVerifier: Goods order {$lookupId} lookup failed with status {$response->status()}");
                return OrderEligibilityDto::invalid(
                    "Pesanan barang '{$lookupId}' tidak ditemukan di sistem pesanan (05A).",
                    $orderId,
                    $customerId
                );
            }

            $body = $response->json();
            $data = $body['data'] ?? null;
            if (!$data) {
                return OrderEligibilityDto::invalid("Data pesanan barang tidak valid.", $orderId, $customerId);
            }

            // Verify customer ownership
            $orderCustomerId = (string) ($data['customer_id'] ?? '');
            if ($orderCustomerId !== $customerId) {
                return OrderEligibilityDto::invalid(
                    "Akses ditolak: Anda bukan pemilik sah dari pesanan barang '{$lookupId}'.",
                    $orderId,
                    $customerId
                );
            }

            // Authoritative Parent-Child Order Integrity Verification
            // When both source order ID and merchant suborder ID are provided:
            // 05A must authoritatively confirm that the merchant suborder belongs to the specified parent order.
            if ($subOrderId) {
                $actualSubId = (string) ($data['id'] ?? '');
                $parentRef = trim((string) ($data['checkout_group_id'] ?? $data['parent_order_id'] ?? ''));

                if ($actualSubId !== $subOrderId) {
                    return OrderEligibilityDto::invalid(
                        "Suborder ID '{$subOrderId}' tidak cocok dengan data pesanan sah (Ditemukan: '{$actualSubId}').",
                        $orderId,
                        $customerId
                    );
                }

                if ($subOrderId !== $orderId) {
                    // Strict: Parent reference cannot be empty or missing when suborder claims under parent
                    if (empty($parentRef)) {
                        return OrderEligibilityDto::invalid(
                            "Suborder '{$subOrderId}' tidak memiliki referensi pesanan induk yang sah pada 05A (MISSING_PARENT_ORDER_REFERENCE).",
                            $orderId,
                            $customerId
                        );
                    }

                    if ($parentRef !== $orderId) {
                        return OrderEligibilityDto::invalid(
                            "Pelanggaran integritas: Suborder '{$subOrderId}' terikat pada pesanan utama '{$parentRef}', bukan '{$orderId}' (CROSS_PARENT_ORDER_VIOLATION).",
                            $orderId,
                            $customerId
                        );
                    }
                }
            }

            $orderStatus = strtoupper((string) ($data['status'] ?? ''));
            // STRICT: PAID alone is NOT eligible. Order must be received/delivered/completed.
            $eligibleStatuses = ['COMPLETED', 'DELIVERED', 'RECEIVED'];
            $isEligible = in_array($orderStatus, $eligibleStatuses, true);

            // NO FALLBACK: Merchant org ID must strictly exist in order data
            $merchantOrgId = (string) ($data['merchant_org_id'] ?? $data['merchant_id'] ?? '');
            if (empty(trim($merchantOrgId))) {
                return OrderEligibilityDto::invalid(
                    "Organisasi merchant tidak teridentifikasi pada pesanan '{$lookupId}'.",
                    $orderId,
                    $customerId
                );
            }

            // Parse items and calculate remaining claimable quantity
            $rawItems = $data['items'] ?? [];
            if (empty($rawItems)) {
                return OrderEligibilityDto::invalid("Pesanan tidak memiliki daftar item barang yang sah.", $orderId, $customerId);
            }

            $parsedItems = [];

            foreach ($rawItems as $item) {
                $itemId = (string) ($item['id'] ?? $item['order_item_id'] ?? '');
                if (empty($itemId)) {
                    continue;
                }
                $qty = (int) ($item['quantity'] ?? 1);

                // Check existing claimed quantity in AfterSalesCase with row locking
                $alreadyClaimed = (int) CaseItem::whereHas('case', function ($q) use ($customerId, $lookupId) {
                    $q->where('customer_id', $customerId)
                        ->where(function ($sub) use ($lookupId) {
                            $sub->where('source_order_id', $lookupId)
                                ->orWhere('source_merchant_order_id', $lookupId);
                        })
                        ->whereNotIn('main_status', ['REJECTED', 'CANCELLED']);
                })->where('source_item_ref', $itemId)->sum('quantity_requested');

                $remainingQty = max(0, $qty - $alreadyClaimed);

                $parsedItems[] = [
                    'item_id' => $itemId,
                    'source_ref' => $itemId,
                    'name' => $item['name'] ?? $item['product_name'] ?? 'Barang Pesanan',
                    'price' => (float) ($item['price'] ?? $item['unit_price'] ?? 0),
                    'quantity' => $qty,
                    'claimed_quantity' => $alreadyClaimed,
                    'remaining_quantity' => $remainingQty,
                    'catalog_snapshot' => $item,
                ];
            }

            $orderedAt = isset($data['ordered_at']) ? (string) $data['ordered_at'] : (isset($data['created_at']) ? (string) $data['created_at'] : null);
            $customerDisplayName = isset($data['customer_name'])
                ? (string) $data['customer_name']
                : (isset($data['customer']['name'])
                    ? (string) $data['customer']['name']
                    : (isset($data['recipient_name']) ? (string) $data['recipient_name'] : null));

            return new OrderEligibilityDto(
                isValid: true,
                orderId: $orderId,
                subOrderId: $subOrderId,
                customerId: $customerId,
                ownerOrgId: $merchantOrgId,
                ownerOrgType: 'MERCHANT',
                orderStatus: $orderStatus,
                isEligibleForAfterSales: $isEligible,
                items: $parsedItems,
                orderedAt: $orderedAt,
                customerDisplayName: $customerDisplayName
            );
        } catch (Throwable $e) {
            Log::error("HttpOrderEligibilityVerifier goods exception: " . $e->getMessage());
            return OrderEligibilityDto::invalid(
                "Gagal memverifikasi pesanan barang ke service 05A: " . $e->getMessage(),
                $orderId,
                $customerId
            );
        }
    }

    protected function verifyServiceOrder(string $customerId, string $orderId): OrderEligibilityDto
    {
        $baseUrl = config('after_sales.services.order_jasa.base_url', 'http://127.0.0.1:8007');
        $internalKey = config('after_sales.services.order_jasa.internal_key', 'servio_local_internal_service_key_2026');

        try {
            $response = Http::withHeaders([
                'X-Internal-Service-Key' => $internalKey,
                'X-Source-Service' => 'after-sales-service',
                'Accept' => 'application/json',
            ])->timeout(5)->get("{$baseUrl}/internal/v1/order-jasa/orders/{$orderId}");

            if (!$response->successful()) {
                Log::warning("HttpOrderEligibilityVerifier: Service order {$orderId} lookup failed with status {$response->status()}");
                return OrderEligibilityDto::invalid(
                    "Pesanan jasa '{$orderId}' tidak ditemukan di sistem pesanan jasa (05B).",
                    $orderId,
                    $customerId
                );
            }

            $body = $response->json();
            $data = $body['data'] ?? null;
            if (!$data) {
                return OrderEligibilityDto::invalid("Data pesanan jasa tidak valid.", $orderId, $customerId);
            }

            $orderCustomerId = (string) ($data['customer_id'] ?? '');
            if ($orderCustomerId !== $customerId) {
                return OrderEligibilityDto::invalid(
                    "Akses ditolak: Anda bukan pemilik sah dari pesanan jasa '{$orderId}'.",
                    $orderId,
                    $customerId
                );
            }

            $orderStatus = strtoupper((string) ($data['status'] ?? ''));
            // STRICT: CONFIRMED and PAID are NOT eligible. Service must be executed/completed.
            $eligibleStatuses = ['COMPLETED', 'DELIVERED', 'RECEIVED', 'WORK_COMPLETED'];
            $isEligible = in_array($orderStatus, $eligibleStatuses, true);

            // NO FALLBACK: Provider org ID must exist in data
            $providerOrgId = (string) ($data['provider_org_id'] ?? $data['provider_id'] ?? '');
            if (empty(trim($providerOrgId))) {
                return OrderEligibilityDto::invalid(
                    "Organisasi provider tidak teridentifikasi pada pesanan jasa '{$orderId}'.",
                    $orderId,
                    $customerId
                );
            }

            $rawItems = $data['items'] ?? [];
            $parsedItems = [];

            $serviceOfferingId = (string) ($data['service_offering_id'] ?? $data['service_snapshot']['id'] ?? $data['service_id'] ?? $orderId);

            if (empty($rawItems)) {
                $rawItems = [[
                    'id' => (string) ($data['id'] ?? $orderId),
                    'service_id' => $serviceOfferingId,
                    'service_offering_id' => $serviceOfferingId,
                    'name' => $data['service_snapshot']['title'] ?? $data['service_name'] ?? 'Layanan Jasa',
                    'quantity' => 1,
                    'price' => (float) ($data['total_amount'] ?? 0),
                    'catalog_snapshot' => [
                        'service_id' => $serviceOfferingId,
                        'service_offering_id' => $serviceOfferingId,
                    ],
                ]];
            }

            foreach ($rawItems as $item) {
                $itemId = (string) ($item['service_offering_id'] ?? $item['service_id'] ?? $item['id'] ?? $serviceOfferingId);
                $qty = (int) ($item['quantity'] ?? 1);

                $alreadyClaimed = (int) CaseItem::whereHas('case', function ($q) use ($customerId, $orderId) {
                    $q->where('customer_id', $customerId)
                        ->where('source_order_id', $orderId)
                        ->whereNotIn('main_status', ['REJECTED', 'CANCELLED']);
                })->where('source_item_ref', $itemId)->sum('quantity_requested');

                $remainingQty = max(0, $qty - $alreadyClaimed);

                $parsedItems[] = [
                    'item_id' => $itemId,
                    'source_ref' => (string) ($item['id'] ?? $orderId),
                    'name' => $item['name'] ?? $item['service_name'] ?? 'Layanan Jasa',
                    'price' => (float) ($item['price'] ?? $item['total_amount'] ?? 0),
                    'quantity' => $qty,
                    'claimed_quantity' => $alreadyClaimed,
                    'remaining_quantity' => $remainingQty,
                    'catalog_snapshot' => array_merge(is_array($item) ? $item : [], [
                        'service_id' => $itemId,
                        'service_offering_id' => $itemId,
                    ]),
                ];
            }

            $orderedAt = isset($data['ordered_at']) ? (string) $data['ordered_at'] : (isset($data['created_at']) ? (string) $data['created_at'] : null);
            $customerDisplayName = isset($data['customer_name'])
                ? (string) $data['customer_name']
                : (isset($data['customer']['name'])
                    ? (string) $data['customer']['name']
                    : null);

            return new OrderEligibilityDto(
                isValid: true,
                orderId: $orderId,
                subOrderId: null,
                customerId: $customerId,
                ownerOrgId: $providerOrgId,
                ownerOrgType: 'PROVIDER',
                orderStatus: $orderStatus,
                isEligibleForAfterSales: $isEligible,
                items: $parsedItems,
                orderedAt: $orderedAt,
                customerDisplayName: $customerDisplayName
            );
        } catch (Throwable $e) {
            Log::error("HttpOrderEligibilityVerifier service exception: " . $e->getMessage());
            return OrderEligibilityDto::invalid(
                "Gagal memverifikasi pesanan jasa ke service 05B: " . $e->getMessage(),
                $orderId,
                $customerId
            );
        }
    }
}
