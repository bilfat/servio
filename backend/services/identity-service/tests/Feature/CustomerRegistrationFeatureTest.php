<?php

namespace Tests\Feature;

use App\Models\OtpChallenge;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CustomerRegistrationFeatureTest extends TestCase
{
    use DatabaseTransactions;

    public function test_customer_can_register_successfully(): void
    {
        $email = 'new_customer_' . uniqid() . '@example.com';
        $payload = [
            'name' => 'Budi Santoso',
            'email' => $email,
            'phone' => '+628129999' . rand(1000, 9999),
            'password' => 'Password123!',
            'registration_type' => 'CUSTOMER',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_REGISTRATION_CREATED',
            ])
            ->assertJsonStructure([
                'success',
                'code',
                'data' => ['user_id', 'status', 'next_step'],
                'meta' => ['request_id', 'version'],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'status' => 'VERIFICATION_REQUIRED',
        ]);

        $this->assertDatabaseHas('user_profiles', [
            'display_name' => 'Budi Santoso',
        ]);
    }

    public function test_registration_with_existing_email_fails_with_409(): void
    {
        $existing = User::where('email', 'customer@servio.id')->firstOrFail();

        $payload = [
            'name' => 'Duplikat User',
            'email' => $existing->email,
            'password' => 'Password123!',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_EMAIL_ALREADY_REGISTERED',
            ]);
    }

    public function test_registration_with_short_password_fails_validation(): void
    {
        $payload = [
            'name' => 'Short Pass',
            'email' => 'shortpass_' . uniqid() . '@example.com',
            'password' => '123',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(422);
    }

    public function test_customer_can_request_and_verify_otp(): void
    {
        $email = 'otp_user_' . uniqid() . '@example.com';

        // 1. Request OTP challenge
        $reqResponse = $this->postJson('/api/v1/otp/challenges', [
            'purpose' => 'ACCOUNT_VERIFICATION',
            'identifier' => $email,
        ]);

        $reqResponse->assertStatus(202)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_OTP_REQUEST_ACCEPTED',
            ]);

        $challengeId = $reqResponse->json('data.challenge_id');
        $this->assertNotEmpty($challengeId);

        // Fetch challenge and calculate correct HMAC test code
        $rawCode = '123456';
        $challenge = OtpChallenge::find($challengeId);
        $challenge->otp_hmac = OtpService::hmacOtp($rawCode, $email);
        $challenge->save();

        // 2. Verify with wrong code fails
        $wrongResponse = $this->postJson("/api/v1/otp/challenges/{$challengeId}/verify", [
            'code' => '000000',
            'identifier' => $email,
        ]);

        $wrongResponse->assertStatus(422)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_OTP_INVALID',
            ]);

        // 3. Verify with correct code succeeds
        $verifyResponse = $this->postJson("/api/v1/otp/challenges/{$challengeId}/verify", [
            'code' => $rawCode,
            'identifier' => $email,
        ]);

        $verifyResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_OTP_VERIFIED',
                'data' => [
                    'verified' => true,
                ],
            ]);
    }

    public function test_customer_can_submit_nik_and_it_is_permanently_locked(): void
    {
        $user = User::create([
            'email' => 'nik_test_' . uniqid() . '@example.com',
            'status' => 'VERIFICATION_REQUIRED',
            'authz_version' => 1,
        ]);
        $auth = $this->authenticateAs($user, 'CUSTOMER');

        $nik = '3201011234567890';
        $payload = [
            'nik' => $nik,
        ];

        // 1. First submission succeeds with 201
        $response = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/identity/customer/nik', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'code' => 'IDENTITY_CUSTOMER_NIK_FORMAT_VALID',
                'data' => [
                    'nik_format_status' => 'FORMAT_VALID',
                    'nik_locked' => true,
                    'nik_masked' => '************7890',
                ],
            ]);

        $this->assertDatabaseHas('user_nik_records', [
            'user_id' => $user->id,
        ]);

        // 2. Second submission rejected with 409 Conflict per CR02-NIK-IMMUTABLE
        $secondResponse = $this->withHeaders($auth['headers'])
            ->postJson('/api/v1/identity/customer/nik', [
                'nik' => '3201019999990001',
            ]);

        $secondResponse->assertStatus(409)
            ->assertJson([
                'success' => false,
                'code' => 'IDENTITY_NIK_PERMANENTLY_LOCKED',
            ]);
    }
}
