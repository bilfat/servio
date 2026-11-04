<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface contract for communicating with SERVIO Identity & Access Service (Port 8001).
 * Formalized for Prompt 02 integration while keeping feature_gates.identity_worker_eligibility fail-closed in Prompt 01.
 */
interface IdentityServiceClientInterface
{
    /**
     * Verify that a worker is active and holds active membership in the provider organization.
     *
     * @param string $workerId User ID of the technician
     * @param string $providerOrgId Organization ID of the service provider
     * @return array{is_active: bool, is_member: bool, capabilities: array<string>, snapshot: array<string, mixed>}
     */
    public function verifyWorkerEligibility(string $workerId, string $providerOrgId): array;

    /**
     * Verify customer account standing.
     *
     * @param string $customerId User ID of the customer
     * @return array{is_active: bool, is_verified: bool}
     */
    public function getCustomerContext(string $customerId): array;

    /**
     * Introspect gateway token context against Identity Service S2S.
     *
     * @param string $token Bearer session token
     * @return array<string, mixed>
     */
    public function introspectSession(string $token): array;
}

