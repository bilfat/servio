<?php

namespace Tests;

use App\Models\User;
use App\Models\AuthSession;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;

abstract class TestCase extends BaseTestCase
{
    protected function authenticateAs(User $user, ?string $roleCode = null, ?string $organizationId = null): array
    {
        $sessionId = (string) Str::uuid();

        $activeRole = $roleCode ?? $user->roleAssignments()->where('status', 'ACTIVE')->first()?->role_code ?? 'CUSTOMER';

        $session = AuthSession::create([
            'session_id' => $sessionId,
            'user_id' => $user->id,
            'active_role' => $activeRole,
            'active_organization_id' => $organizationId,
            'ip_hash' => hash('sha256', '127.0.0.1'),
            'user_agent_hash' => hash('sha256', 'PHPUnit'),
            'last_active_at' => now(),
            'expires_at' => now()->addDays(7),
        ]);

        return [
            'session' => $session,
            'token' => $sessionId,
            'headers' => [
                'Authorization' => 'Bearer ' . $sessionId,
                'Accept' => 'application/json',
            ],
        ];
    }
}
