<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Contracts;

use App\Models\AfterSalesCase;
use App\Models\CaseResolution;

interface ResolutionCoordinatorInterface
{
    /**
     * Dispatches external coordination to target service (05A, 05B, 06).
     * Returns array with ['external_id' => string, 'external_status' => string, 'target_service' => string, 'purpose' => string]
     */
    public function initiateExternalResolution(AfterSalesCase $case, CaseResolution $resolution): array;

    /**
     * Authoritatively verifies whether the external action was completed by the downstream service.
     * Prevents fake completion.
     */
    public function verifyExternalCompletion(AfterSalesCase $case, CaseResolution $resolution, string $evidenceRef): bool;
}

