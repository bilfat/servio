<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\Request;

class AuthenticatedActor
{
    public readonly ?string $actorId;

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
        public readonly array $permissions = [],
    ) {
        $this->actorId = $id;
    }

    public static function fromRequest(Request $request): ?self
    {
        /** @var self|null $actor */
        $actor = $request->attributes->get('actor');
        return $actor;
    }

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
            permissions: [],
        );
    }

    public function isCeo(): bool
    {
        return $this->role === 'CEO_PRODUCT_OWNER';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN_OPERATIONS';
    }

    public function isFinanceOps(): bool
    {
        return $this->role === 'FINANCE_PAYMENT_OPS';
    }

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
        return $this->role === 'SERVICE_PROVIDER';
    }

    public function isWorker(): bool
    {
        return $this->role === 'WORKER_TECHNICIAN';
    }

    public function isSupport(): bool
    {
        return $this->role === 'CUSTOMER_SUPPORT';
    }

    public function isSupplier(): bool
    {
        return $this->role === 'SUPPLIER';
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isCeo()) {
            return true;
        }
        return in_array($permission, $this->permissions, true);
    }
}
