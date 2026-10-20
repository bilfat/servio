<?php

namespace App\Support;

class AuthenticatedActor
{
    public function __construct(
        public readonly string $id,
        public readonly string $role,
        public readonly ?string $organizationId = null,
        public readonly ?string $organizationType = null,
        public readonly ?string $roleAssignmentId = null,
        public readonly int $authzVersion = 1,
        public readonly bool $isGuest = false,
    ) {}

    public static function guest(): self
    {
        return new self(
            id: 'guest',
            role: 'GUEST',
            isGuest: true
        );
    }

    public function isMerchant(): bool
    {
        return $this->role === 'MERCHANT';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN_OPERATIONS';
    }

    public function isCeo(): bool
    {
        return $this->role === 'CEO_PRODUCT_OWNER';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'CUSTOMER';
    }

    public function isGovernance(): bool
    {
        return $this->isAdmin() || $this->isCeo();
    }

    public function ownsOrganization(?string $targetOrgId): bool
    {
        if (empty($targetOrgId) || empty($this->organizationId)) {
            return false;
        }

        return hash_equals((string) $this->organizationId, (string) $targetOrgId);
    }
}
