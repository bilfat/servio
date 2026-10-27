<?php

declare(strict_types=1);

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
        public readonly bool $organizationIsActive = true,
        public readonly bool $membershipIsActive = true,
        public readonly array $permissions = [],
    ) {}

    public function isCustomer(): bool
    {
        return $this->role === 'CUSTOMER';
    }

    public function isMerchant(): bool
    {
        return $this->role === 'MERCHANT';
    }

    public function isCEO(): bool
    {
        return $this->role === 'CEO_PRODUCT_OWNER';
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions, true) || $this->isCEO();
    }
}
