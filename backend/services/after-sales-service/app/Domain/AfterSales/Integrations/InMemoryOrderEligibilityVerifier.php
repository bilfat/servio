<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Integrations;

use App\Domain\AfterSales\Contracts\OrderEligibilityDto;
use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;

class InMemoryOrderEligibilityVerifier implements OrderEligibilityVerifierInterface
{
    /** @var array<string, OrderEligibilityDto> */
    protected array $records = [];

    public function setOrder(string $orderId, OrderEligibilityDto $dto): void
    {
        $this->records[$orderId] = $dto;
    }

    public function verifyOrderEligibility(
        string $customerId,
        string $orderKind,
        string $orderId,
        ?string $subOrderId = null,
        bool $includeClaimedQuantities = true
    ): OrderEligibilityDto {
        if (isset($this->records[$orderId])) {
            $dto = $this->records[$orderId];
            if ($dto->customerId !== $customerId) {
                return OrderEligibilityDto::invalid(
                    "Akses ditolak: Anda bukan pemilik sah dari pesanan '{$orderId}'.",
                    $orderId,
                    $customerId
                );
            }
            return $dto;
        }

        // Test environment fallback
        if (str_starts_with($orderId, 'non-existent') || str_starts_with($orderId, 'invalid-')) {
            return OrderEligibilityDto::invalid("Pesanan '{$orderId}' tidak ditemukan.", $orderId, $customerId);
        }

        if (str_starts_with($orderId, 'unpaid-') || str_starts_with($orderId, 'pending-')) {
            return new OrderEligibilityDto(
                isValid: true,
                orderId: $orderId,
                subOrderId: $subOrderId,
                customerId: $customerId,
                ownerOrgId: 'org-merchant-001',
                ownerOrgType: strtoupper($orderKind) === 'GOODS' ? 'MERCHANT' : 'PROVIDER',
                orderStatus: 'PENDING_PAYMENT',
                isEligibleForAfterSales: false,
                items: [],
                errorMessage: "Pesanan belum lunas atau selesai."
            );
        }

        $ownerOrgId = strtoupper($orderKind) === 'GOODS' ? 'org-merchant-001' : 'org-provider-001';
        if ($orderId === 'ord-g-901' || $subOrderId === 'mo-901') {
            $ownerOrgId = 'org-merchant-601';
        } elseif ($orderId === 'ord-s-902') {
            $ownerOrgId = 'org-provider-601';
        } elseif ($orderId === 'ord-g-202') {
            $ownerOrgId = 'org-merchant-202';
        } elseif ($orderId === 'ord-s-edge-202') {
            $ownerOrgId = 'org-provider-edge';
        }
        $ownerOrgType = strtoupper($orderKind) === 'GOODS' ? 'MERCHANT' : 'PROVIDER';

        $status = 'COMPLETED';
        if (str_starts_with($orderId, 'delivered-only-') || str_starts_with($orderId, 'uncompleted-')) {
            $status = 'DELIVERED';
        }

        return new OrderEligibilityDto(
            isValid: true,
            orderId: $orderId,
            subOrderId: $subOrderId,
            customerId: $customerId,
            ownerOrgId: $ownerOrgId,
            ownerOrgType: $ownerOrgType,
            orderStatus: $status,
            isEligibleForAfterSales: true,
            items: [
                [
                    'item_id' => 'item-001',
                    'source_ref' => 'item-001',
                    'name' => 'Produk Uji Sah',
                    'price' => 100000.0,
                    'quantity' => 2,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 2,
                    'catalog_snapshot' => ['title' => 'Produk Uji Sah', 'sku' => 'SKU-001'],
                ],
                [
                    'item_id' => 'item-202',
                    'source_ref' => 'prod-202',
                    'name' => 'Kipas Angin Garansi',
                    'price' => 150000.0,
                    'quantity' => 2,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 2,
                    'catalog_snapshot' => ['title' => 'Kipas Angin Garansi', 'sku' => 'SKU-202'],
                ],
                [
                    'item_id' => 'item-303',
                    'source_ref' => 'item-303',
                    'name' => 'Item Uji 303',
                    'price' => 50000.0,
                    'quantity' => 2,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 2,
                    'catalog_snapshot' => ['title' => 'Item Uji 303'],
                ],
                [
                    'item_id' => 'item-part-01',
                    'source_ref' => 'item-part-01',
                    'name' => 'Item Partial 01',
                    'price' => 75000.0,
                    'quantity' => 3,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 3,
                    'catalog_snapshot' => ['title' => 'Item Partial 01'],
                ],
                [
                    'item_id' => 'srv-ac-cuci',
                    'source_ref' => 'cat-srv-ac',
                    'name' => 'Cuci AC Inverter',
                    'price' => 120000.0,
                    'quantity' => 1,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 1,
                    'catalog_snapshot' => ['title' => 'Cuci AC Inverter'],
                ],
                [
                    'item_id' => 'item-901',
                    'source_ref' => 'prod-901',
                    'name' => 'Produk Review 901',
                    'price' => 250000.0,
                    'quantity' => 1,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 1,
                    'catalog_snapshot' => ['title' => 'Produk Review 901'],
                ],
                [
                    'item_id' => 'item-902',
                    'source_ref' => 'srv-902',
                    'name' => 'Servis AC 902',
                    'price' => 100000.0,
                    'quantity' => 1,
                    'claimed_quantity' => 0,
                    'remaining_quantity' => 1,
                    'catalog_snapshot' => ['title' => 'Servis AC 902'],
                ],
            ]
        );
    }
}

