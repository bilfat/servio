<?php

namespace App\Support;

class AuthenticatedActor
{
    public function __construct(
        public readonly string $id,
        public readonly string $role,
        public readonly ?string $organizationId = null,
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

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN_OPERATIONS';
    }

    public function isCeo(): bool
    {
        return $this->role === 'CEO_PRODUCT_OWNER';
    }

    public function isMerchant(): bool
    {
        return $this->role === 'MERCHANT';
    }

    public function isProvider(): bool
    {
        return $this->role === 'SERVICE_PROVIDER';
    }

    public function isSupplier(): bool
    {
        return $this->role === 'SUPPLIER';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'CUSTOMER';
    }

    public function isGovernance(): bool
    {
        return $this->isAdmin() || $this->isCeo();
    }

    /**
     * Determines whether the actor can read a specific branch (PRODUK / JASA).
     * All users (customers, guests, providers buying parts, merchants, suppliers, admin) can read active catalog branches.
     */
    public function canReadBranch(string $branch): bool
    {
        return true;
    }

    /**
     * Determines whether the actor can submit suggestions for a specific branch (DEC-11).
     */
    public function canSuggestBranch(string $branch): bool
    {
        $branch = strtoupper($branch);

        // Merchant can only suggest PRODUK (even though they can read JASA)
        if ($this->isMerchant()) {
            return $branch === 'PRODUK';
        }

        // Supplier can only suggest PRODUK
        if ($this->isSupplier()) {
            return $branch === 'PRODUK';
        }

        // Service Provider can only suggest JASA
        if ($this->isProvider()) {
            return $branch === 'JASA';
        }

        // Admin, CEO, Customer, Worker, CS, Finance cannot submit suggestions
        return false;
    }
}
