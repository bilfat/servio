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

    public function isProvider(): bool
    {
        return $this->role === 'PROVIDER' || $this->role === 'SERVICE_PROVIDER';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['ADMIN_OPERATIONS', 'SUPER_ADMIN', 'ADMIN', 'CEO_PRODUCT_OWNER'], true);
    }

    public function isFinance(): bool
    {
        return in_array($this->role, ['FINANCE_PAYMENT_OPS', 'FINANCE_OPS', 'FINANCE', 'FINANCE_CONTROLLER', 'FINANCE_MANAGER'], true);
    }

    public function isSupport(): bool
    {
        return in_array($this->role, ['CUSTOMER_SUPPORT', 'SUPPORT'], true);
    }

    public function hasRole(string ...$roles): bool
    {
        $normalized = array_map('strtoupper', $roles);
        return in_array(strtoupper($this->role), $normalized, true);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions, true) || $this->isAdmin();
    }
}

