<?php

declare(strict_types=1);

namespace App\Infrastructure\ServiceCatalog;

use App\Contracts\ServiceOfferingClientInterface;
use DateTimeInterface;

class FakeServiceOfferingClient implements ServiceOfferingClientInterface
{
    public function getOfferingSnapshot(string $offeringId): array
    {
        $diagnosisFee = str_contains($offeringId, 'free-diagnosis') ? 0 : 50000;
        $isActive = !str_contains($offeringId, 'inactive');

        return [
            'id' => $offeringId,
            'version' => 1,
            'title' => 'Servis AC Standar',
            'diagnosis_fee_idr' => $diagnosisFee,
            'is_active' => $isActive,
            'provider_org_id' => 'ORG-PROVIDER-01',
            'pricing_snapshot' => [
                'model' => 'FIXED',
                'min_price_idr' => 75000,
                'max_price_idr' => 200000,
                'currency' => 'IDR',
            ],
            'survey_snapshot' => [
                'fee_idr' => $diagnosisFee,
                'fee_model' => $diagnosisFee > 0 ? 'FLAT' : 'FREE',
                'requirement' => 'REQUIRED',
            ],
        ];
    }

    public function reserveBookingSlot(
        string $providerOrgId,
        string $slotReference,
        DateTimeInterface $startAt,
        DateTimeInterface $endAt
    ): array {
        return [
            'is_reserved' => true,
            'slot_id' => $slotReference ?: 'SLOT-' . bin2hex(random_bytes(4)),
            'expires_at' => $startAt->format('c'),
        ];
    }

    public function releaseBookingSlot(string $slotReference): bool
    {
        return true;
    }
}
