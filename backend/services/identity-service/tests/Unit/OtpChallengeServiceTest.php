<?php

namespace Tests\Unit;

use App\Models\OtpChallenge;
use App\Models\PasswordResetGrant;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OtpChallengeServiceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_can_create_otp_challenge_with_five_minute_expiration(): void
    {
        $email = 'test_user_' . uniqid() . '@example.com';
        $challenge = OtpService::createChallenge(null, $email, 'ACCOUNT_VERIFICATION');

        $this->assertInstanceOf(OtpChallenge::class, $challenge);
        $this->assertEquals('ISSUED', $challenge->status);
        $this->assertEquals(0, $challenge->attempts);
        $this->assertNotNull($challenge->otp_hmac);
        $this->assertTrue($challenge->expires_at->gt(now()));
        $this->assertTrue($challenge->expires_at->lte(now()->addSeconds(305)));
        $this->assertEquals(OtpService::hashIdentifier($email), $challenge->identifier_hash);
    }

    public function test_verifying_with_wrong_otp_increments_attempts(): void
    {
        $email = 'wrong_test_' . uniqid() . '@example.com';
        $challenge = OtpService::createChallenge(null, $email, 'ACCOUNT_VERIFICATION');

        $result = OtpService::verifyChallenge($challenge->id, '000000', $email);

        $this->assertFalse($result['success']);
        $this->assertEquals('IDENTITY_OTP_INVALID', $result['code']);

        $refreshed = OtpChallenge::find($challenge->id);
        $this->assertEquals(1, $refreshed->attempts);
        $this->assertEquals('ISSUED', $refreshed->status);
    }

    public function test_exceeding_five_attempts_does_not_lock_challenge_per_cr01(): void
    {
        $email = 'lock_test_' . uniqid() . '@example.com';
        $challenge = OtpService::createChallenge(null, $email, 'ACCOUNT_VERIFICATION');

        for ($i = 1; $i <= 5; $i++) {
            $res = OtpService::verifyChallenge($challenge->id, '11111' . $i, $email);
            $this->assertFalse($res['success']);
            $this->assertEquals('IDENTITY_OTP_INVALID', $res['code']);
        }

        $refreshed = OtpChallenge::find($challenge->id);
        $this->assertEquals(5, $refreshed->attempts);
        // CR-01: Challenge remains ISSUED (no attempt lock), expires only by time (30s)
        $this->assertEquals('ISSUED', $refreshed->status);
    }

    public function test_expired_challenge_is_rejected(): void
    {
        $email = 'expire_test_' . uniqid() . '@example.com';
        $challenge = OtpService::createChallenge(null, $email, 'CUSTOMER_REGISTRATION');

        // Force expiration
        $challenge->expires_at = now()->subMinutes(1);
        $challenge->save();

        $res = OtpService::verifyChallenge($challenge->id, '123456', $email);
        $this->assertFalse($res['success']);
        $this->assertEquals('IDENTITY_OTP_EXPIRED', $res['code']);
    }

    public function test_password_reset_purpose_generates_single_use_grant(): void
    {
        $user = User::where('email', 'customer@servio.id')->firstOrFail();
        $email = $user->email;

        // Create challenge with known code
        $rawCode = '654321';
        $otpHmac = OtpService::hmacOtp($rawCode, $email);

        $challenge = OtpChallenge::create([
            'user_id' => $user->id,
            'identifier_hash' => OtpService::hashIdentifier($email),
            'purpose' => 'PASSWORD_RESET',
            'otp_hmac' => $otpHmac,
            'status' => 'ISSUED',
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'delivery_state' => 'SENT',
        ]);

        $result = OtpService::verifyChallenge($challenge->id, $rawCode, $email);

        $this->assertTrue($result['success']);
        $this->assertNotNull($result['reset_grant']);

        // Assert grant stored in database
        $grant = PasswordResetGrant::where('challenge_id', $challenge->id)->first();
        $this->assertNotNull($grant);
        $this->assertEquals(hash('sha256', $result['reset_grant']), $grant->grant_token_hash);
        $this->assertNull($grant->consumed_at);
    }

    public function test_resend_cooldown_is_enforced(): void
    {
        $email = 'cooldown_' . uniqid() . '@example.com';
        $challenge = OtpService::createChallenge(null, $email, 'CUSTOMER_REGISTRATION');

        $result = OtpService::resend($challenge->id, $email);

        $this->assertFalse($result['success']);
        $this->assertEquals('IDENTITY_RATE_LIMITED', $result['code']);
        $this->assertGreaterThan(0, $result['retry_after']);
    }
}
