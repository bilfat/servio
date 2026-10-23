<?php

namespace App\Support;

class AuthenticatedActor
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $role,
        public readonly ?string $organizationId = null,
        public readonly ?string $organizationType = null,
        public readonly ?string $roleAssignmentId = null,
        public readonly int $authzVersion = 1,
        public readonly bool $isGuest = false,
        public readonly bool $organizationIsActive = true,
        public readonly bool $membershipIsActive = true,
    ) {}

    public static function guest(): self
    {
        return new self(
            id: null,
            role: 'GUEST',
            organizationId: null,
            organizationType: null,
            roleAssignmentId: null,
            authzVersion: 1,
            isGuest: true,
            organizationIsActive: false,
            membershipIsActive: false,
        );
    }

    public function isProvider(): bool
    {
        return $this->role === 'SERVICE_PROVIDER';
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

    public function isWorker(): bool
    {
        return $this->role === 'WORKER_TECHNICIAN';
    }

    public function roleCode(): string
    {
        return $this->role;
    }

    public function organizationId(): ?string
    {
        return $this->organizationId;
    }
}
