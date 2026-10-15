<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class StaffWorkerInvitationLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    public function test_expired_invitation_preview_returns_410(): void
    {
        $rawToken = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        $org = Organization::firstOrCreate(
            ['type' => 'PROVIDER'],
            ['status' => 'ACTIVE', 'activated_at' => now()]
        );

        $invitation = Invitation::create([
            'kind' => 'STAFF',
            'issuer_user_id' => User::where('email', 'ceo@servio.id')->first()?->id,
            'recipient_email' => 'expired_staff_' . uniqid() . '@servio.id',
            'target_role' => 'CUSTOMER_SUPPORT',
            'token_hash' => $tokenHash,
            'status' => 'INVITED',
            'expires_at' => now()->subHours(2), // Expired 2 hours ago
        ]);

        $response = $this->getJson("/api/v1/auth/invitations/{$rawToken}");
        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVITATION_EXPIRED',
            ]);
    }

    public function test_expired_invitation_accept_returns_410(): void
    {
        $rawToken = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        $invitation = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => User::where('email', 'provider@servio.id')->first()?->id,
            'recipient_email' => 'expired_worker_' . uniqid() . '@servio.id',
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => $tokenHash,
            'status' => 'INVITED',
            'expires_at' => now()->subMinutes(10), // Expired 10 mins ago
        ]);

        $response = $this->postJson("/api/v1/auth/invitations/{$rawToken}/accept", [
            'password' => 'NewPassword123!',
        ]);

        $response->assertStatus(410)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_INVITATION_EXPIRED',
            ]);
    }

    public function test_canceled_invitation_cannot_be_accepted(): void
    {
        $rawToken = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);

        $invitation = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => User::where('email', 'provider@servio.id')->first()?->id,
            'recipient_email' => 'canceled_worker_' . uniqid() . '@servio.id',
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => $tokenHash,
            'status' => 'CANCELED',
            'expires_at' => now()->addHours(12),
        ]);

        $response = $this->postJson("/api/v1/auth/invitations/{$rawToken}/accept", [
            'password' => 'NewPassword123!',
        ]);

        $response->assertStatus(410);
    }

    public function test_valid_invitation_acceptance_activates_account_without_duplicate(): void
    {
        $rawToken = Str::random(40);
        $tokenHash = hash('sha256', $rawToken);
        $email = 'worker_unique_' . uniqid() . '@servio.id';

        $provider = User::where('email', 'provider@servio.id')->firstOrFail();
        $providerMembership = Membership::where('user_id', $provider->id)->where('kind', 'OWNER')->firstOrFail();

        $workerUser = User::create([
            'email' => $email,
            'password_hash' => bcrypt('temp_pass'),
            'status' => 'PENDING',
            'authz_version' => 1,
        ]);
        UserProfile::create([
            'user_id' => $workerUser->id,
            'display_name' => 'Teknisi Handal',
        ]);

        $invitation = Invitation::create([
            'kind' => 'WORKER',
            'issuer_user_id' => $provider->id,
            'recipient_user_id' => $workerUser->id,
            'recipient_email' => $email,
            'organization_id' => $providerMembership->organization_id,
            'target_role' => 'WORKER_TECHNICIAN',
            'token_hash' => $tokenHash,
            'status' => 'INVITED',
            'expires_at' => now()->addHours(12),
        ]);

        $acceptRes = $this->postJson("/api/v1/auth/invitations/{$rawToken}/accept", [
            'password' => 'AktifPassword123!',
        ]);

        $acceptRes->assertStatus(200);

        // Account is now ACTIVE
        $workerUser->refresh();
        $this->assertEquals('ACTIVE', $workerUser->status);

        // Membership created
        $this->assertDatabaseHas('memberships', [
            'user_id' => $workerUser->id,
            'organization_id' => $providerMembership->organization_id,
            'kind' => 'WORKER',
            'status' => 'ACTIVE',
        ]);

        // Only 1 user with this email
        $this->assertEquals(1, User::where('email', $email)->count());

        // Repeated accept fails with 410 because status is now ACCEPTED
        $repeatRes = $this->postJson("/api/v1/auth/invitations/{$rawToken}/accept", [
            'password' => 'AktifPassword123!',
        ]);
        $repeatRes->assertStatus(410);
    }
}
