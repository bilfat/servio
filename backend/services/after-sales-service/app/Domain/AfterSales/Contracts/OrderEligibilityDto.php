<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Contracts;

class OrderEligibilityDto
{
    public function __construct(
        public readonly bool $isValid,
        public readonly string $orderId,
        public readonly ?string $subOrderId,
        public readonly string $customerId,
        public readonly string $ownerOrgId,
        public readonly string $ownerOrgType, // MERCHANT or PROVIDER
        public readonly string $orderStatus,
        public readonly bool $isEligibleForAfterSales,
        public readonly array $items, // array of ['item_id' => ..., 'source_ref' => ..., 'name' => ..., 'quantity' => ..., 'claimed_quantity' => ..., 'remaining_quantity' => ...]
        public readonly ?string $errorMessage = null,
        public readonly ?string $orderedAt = null,
        public readonly ?string $customerDisplayName = null
    ) {}

    public static function invalid(string $errorMessage, string $orderId = '', string $customerId = ''): self
    {
        return new self(
            isValid: false,
            orderId: $orderId,
            subOrderId: null,
            customerId: $customerId,
            ownerOrgId: '',
            ownerOrgType: 'MERCHANT',
            orderStatus: 'UNKNOWN',
            isEligibleForAfterSales: false,
            items: [],
            errorMessage: $errorMessage
        );
    }
}

