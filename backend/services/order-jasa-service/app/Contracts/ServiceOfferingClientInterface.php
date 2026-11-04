<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface contract for communicating with Phase 04 Service Offering Service (Port 8004).
 * Formalized for Prompt 02 integration while keeping feature_gates.phase04_offering_and_slot fail-closed in Prompt 01.
 */
interface ServiceOfferingClientInterface
{
    /**
     * Validate offering existence, active status, and lock pricing snapshot.
     *
     * @param string $offeringId
     * @return array{id: string, version: int, title: string, diagnosis_fee_idr: int, is_active: bool, provider_org_id: string}
     */
    public function getOfferingSnapshot(string $offeringId): array;

    /**
     * Verify slot reservation and lock booking calendar time.
     *
     * @param string $providerOrgId
     * @param string $slotReference
     * @param \DateTimeInterface $startAt
     * @param \DateTimeInterface $endAt
     * @return array{is_reserved: bool, slot_id: string, expires_at: string}
     */
    public function reserveBookingSlot(
        string $providerOrgId,
        string $slotReference,
        \DateTimeInterface $startAt,
        \DateTimeInterface $endAt
    ): array;

    /**
     * Release previously reserved slot upon cancellation or expiry.
     *
     * @param string $slotReference
     * @return bool
     */
    public function releaseBookingSlot(string $slotReference): bool;
}

