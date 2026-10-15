<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkerInvitationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_service_provider_can_invite_worker(): void
    {
        $provider = User::where('email', 'provider@servio.id')->firstOrFail();
        $auth = $this->authenticateAs($provider, 'SERVICE_PROVIDER');

        $email = 'technician_' . uniqid() . '@example.com';
        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/provider/worker-invitations', [
                'recipient_email' => $email,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_WORKER_INVITED',
                'data' => [
                    'kind' => 'WORKER',
                    'status' => 'INVITED',
                ],
            ]);

        $this->assertDatabaseHas('invitations', [
            'recipient_email' => $email,
            'kind' => 'WORKER',
            'status' => 'INVITED',
        ]);
    }

    public function test_worker_can_preview_and_accept_invitation(): void
    {
        $provider = User::where('email', 'provider@servio.id')->firstOrFail();
        $workerUser = User::where('email', 'customer@servio.id')->firstOrFail(); // Customer accepting worker invite

        $org = Organization::where('type', 'PROVIDER')->firstOrFail();

        $rawToken = Str::random(40);
        $invite = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => $provider->id,
            'recipient_email' => $workerUser->email,
            'organization_id' => $org->id,
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => hash('sha256', $rawToken),
            'status' => 'INVITED',
            'expires_at' => now()->addHours(72),
        ]);

        // Preview (public)
        $previewRes = $this->getJson("/api/v1/invitations/{$rawToken}/preview");
        $previewRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_INVITATION_PREVIEW',
                'data' => [
                    'kind' => 'WORKER',
                    'target_role' => 'WORKER_TECHNICIAN',
                ],
            ]);

        // Accept
        $workerAuth = $this->authenticateAs($workerUser, 'CUSTOMER');
        $acceptRes = $this->withHeaders($workerAuth['headers'])
            ->postJson("/api/v1/invitations/{$rawToken}/accept");

        $acceptRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_INVITATION_ACCEPTED',
                'data' => [
                    'kind' => 'WORKER',
                    'user_id' => $workerUser->id,
                ],
            ]);

        $this->assertDatabaseHas('memberships', [
            'user_id' => $workerUser->id,
            'organization_id' => $org->id,
            'kind' => 'WORKER',
            'status' => 'ACTIVE',
        ]);
    }

    public function test_single_active_worker_invariant_blocks_concurrent_active_memberships(): void
    {
        $provider = User::where('email', 'provider@servio.id')->firstOrFail();
        $workerUser = User::where('email', 'customer@servio.id')->firstOrFail();

        // 1. Create first provider organization & active membership for worker
        $org1 = Organization::create(['type' => 'PROVIDER', 'status' => 'ACTIVE']);
        $membership1 = Membership::create([
            'user_id' => $workerUser->id,
            'organization_id' => $org1->id,
            'kind' => 'WORKER',
            'status' => 'ACTIVE',
            'started_at' => now(),
        ]);

        // 2. Create second provider organization & invitation
        $org2 = Organization::create(['type' => 'PROVIDER', 'status' => 'ACTIVE']);
        $rawToken2 = Str::random(40);
        $invite2 = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => $provider->id,
            'recipient_email' => $workerUser->email,
            'organization_id' => $org2->id,
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => hash('sha256', $rawToken2),
            'status' => 'INVITED',
            'expires_at' => now()->addHours(72),
        ]);

        // 3. Attempting to accept second invitation must fail with 409 conflict
        $workerAuth = $this->authenticateAs($workerUser, 'CUSTOMER');
        $acceptRes = $this->withHeaders($workerAuth['headers'])
            ->postJson("/api/v1/invitations/{$rawToken2}/accept");

        $acceptRes->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_WORKER_ACTIVE_PROVIDER_CONFLICT',
            ]);

        // 4. Deactivate membership1
        $membership1->status = 'DEACTIVATED';
        $membership1->ended_at = now();
        $membership1->save();

        // 5. Now accepting invitation 2 succeeds!
        $acceptRetry = $this->withHeaders($workerAuth['headers'])
            ->postJson("/api/v1/invitations/{$rawToken2}/accept");

        $acceptRetry->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_INVITATION_ACCEPTED',
            ]);

        $this->assertDatabaseHas('memberships', [
            'user_id' => $workerUser->id,
            'organization_id' => $org2->id,
            'kind' => 'WORKER',
            'status' => 'ACTIVE',
        ]);
    }
}
