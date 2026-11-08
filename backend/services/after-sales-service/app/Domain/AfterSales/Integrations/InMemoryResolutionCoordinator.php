<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Integrations;

use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseResolution;
use Illuminate\Support\Str;
use RuntimeException;

class InMemoryResolutionCoordinator implements ResolutionCoordinatorInterface
{
    protected array $externalStatuses = [];

    public function setExternalStatus(string $caseId, string $status): void
    {
        $this->externalStatuses[$caseId] = $status;
    }

    public function initiateExternalResolution(AfterSalesCase $case, CaseResolution $resolution): array
    {
        $solution = $resolution->solution_code;

        if ($solution === 'REPAIR_GOODS') {
            throw new RuntimeException("Integrasi solusi REPAIR_GOODS saat ini ditangguhkan (BLOCKED): Modul 05A belum menyediakan kontrak alur perbaikan barang. Barang pengganti (REPLACEMENT) dilarang dikirimkan untuk perbaikan.");
        }

        $targetService = match ($solution) {
            'REPLACEMENT' => '05A',
            'REWORK' => '05B',
            'REFUND' => '06',
            default => '05A',
        };

        $purpose = match ($solution) {
            'REPLACEMENT' => 'REPLACEMENT_FULFILLMENT',
            'REWORK' => 'WARRANTY_JOB',
            'REFUND' => 'REFUND_DECISION',
            default => 'GENERAL_RESOLUTION',
        };

        $externalId = match ($solution) {
            'REPLACEMENT' => 'rep_' . Str::ulid(),
            'REWORK' => 'wjb_' . Str::ulid(),
            'REFUND' => 'rfd_' . Str::ulid(),
            default => 'res_' . Str::ulid(),
        };

        $status = $this->externalStatuses[$case->id] ?? match ($solution) {
            'REFUND' => 'PENDING_FINANCE_REFUND',
            'REPLACEMENT', 'REPAIR_GOODS' => 'PENDING_DISPATCH',
            'REWORK' => 'PENDING_ASSIGNMENT',
            default => 'PENDING_INTEGRATION',
        };

        return [
            'external_id' => $externalId,
            'external_status' => $status,
            'target_service' => $targetService,
            'purpose' => $purpose,
        ];
    }

    public function verifyExternalCompletion(AfterSalesCase $case, CaseResolution $resolution, string $evidenceRef): bool
    {
        $status = $this->externalStatuses[$case->id] ?? null;

        if ($status && in_array($status, ['SUCCESS', 'CONFIRMED', 'DELIVERED', 'COMPLETED', 'VERIFIED_DONE'], true)) {
            return true;
        }

        // Strict: No prefix bypass permitted. Downstream confirmation required.
        throw new RuntimeException("Fake completion rejected: Bukti status eksternal belum diverifikasi oleh downstream service.");
    }
}
