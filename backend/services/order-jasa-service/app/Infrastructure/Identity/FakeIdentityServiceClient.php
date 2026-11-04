<?php

declare(strict_types=1);

namespace App\Infrastructure\Identity;

use App\Contracts\IdentityServiceClientInterface;

class FakeIdentityServiceClient implements IdentityServiceClientInterface
{
    public function verifyWorkerEligibility(string $workerId, string $providerOrgId): array
    {
        $isMockEligible = !str_contains($workerId, 'INACTIVE') && !str_contains($workerId, 'NONMEMBER');
        $isMockMember = !str_contains($workerId, 'NONMEMBER');

        return [
            'is_active' => $isMockEligible,
            'is_member' => $isMockEligible && $isMockMember,
            'capabilities' => ['REPAIR_AC', 'GENERAL_MAINTENANCE'],
            'snapshot' => [
                'worker_id' => $workerId,
                'name' => "Worker {$workerId}",
                'phone' => '+6281234567890',
            ],
        ];
    }

    public function getCustomerContext(string $customerId): array
    {
        return [
            'is_active' => !str_contains($customerId, 'SUSPENDED'),
            'is_verified' => true,
        ];
    }

    public function getCustomerAddress(string $customerId, string $addressId): array
    {
        return [
            'address_id' => $addressId,
            'customer_id' => $customerId,
            'recipient_name' => 'Budi Santoso',
            'recipient_phone' => '+628123456789',
            'address_line' => 'Jl. Kebon Sirih No. 12',
            'city' => 'Jakarta Pusat',
            'district' => 'Menteng',
            'postal_code' => '10340',
            'region_code' => 'KOTA_JAKARTA_PUSAT',
            'latitude' => -6.1852,
            'longitude' => 106.8310,
        ];
    }

    public function introspectSession(string $token): array
    {
        return [
            'valid' => true,
            'token' => $token,
        ];
    }
}

