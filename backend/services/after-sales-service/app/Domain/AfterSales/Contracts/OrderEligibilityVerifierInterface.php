<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Contracts;

interface OrderEligibilityVerifierInterface
{
    /**
     * Verifies if an order belongs to the customer, its current status,
     * and returns the verified owner organization and items.
     */
    public function verifyOrderEligibility(
        string $customerId,
        string $orderKind, // GOODS or SERVICE
        string $orderId,
        ?string $subOrderId = null,
        bool $includeClaimedQuantities = true
    ): OrderEligibilityDto;
}

