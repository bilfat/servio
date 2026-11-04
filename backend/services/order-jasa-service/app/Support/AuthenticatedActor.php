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

    public function isProvider(): bool
    {
        return $this->role === 'PROVIDER' || $this->role === 'SERVICE_PROVIDER';
    }

    public function isWorker(): bool
    {
        return $this->role === 'WORKER' || $this->role === 'TECHNICIAN' || $this->role === 'WORKER_TECHNICIAN';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN_OPERATIONS' || $this->role === 'SUPER_ADMIN' || $this->role === 'ADMIN';
    }

    public function isFinance(): bool
    {
        return $this->role === 'FINANCE_PAYMENT_OPS' || $this->role === 'FINANCE_OPS' || $this->role === 'FINANCE';
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
