<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\CustomerConsent;
use App\Models\OrderAuditLog;
use App\Models\ServiceBooking;
use App\Models\ServiceOrder;
use App\Models\ServicePaymentObligation;
use App\Models\WorkerAssignmentAttempt;
use Illuminate\Support\Str;
use Tests\TestCase;

class MassAssignmentProtectionTest extends TestCase
{
    public function test_service_order_mass_assignment_discards_sensitive_fields(): void
    {
        $maliciousInput = [
            'order_no' => 'JSA-SAFE-001',
            'complaint_text' => 'AC tidak dingin sama sekali',
            // Maliciously injected sensitive fields that MUST be discarded:
            'id' => (string) Str::ulid(),
            'customer_id' => 'HACKER_ATTACKER_ID',
            'provider_org_id' => 'FORGED_PROVIDER_ORG',
            'status' => 'COMPLETED',
            'phase' => 'COMPLETED',
            'diagnosis_fee_idr' => 0,
            'diagnosis_fee_exemption_type' => 'FREE_PROMO_EXEMPTION',
            'version' => 999,
        ];

        // Using standard Eloquent create() (which respects mass-assignment)
        $order = new ServiceOrder();
        $order->fill($maliciousInput);

        // Assert sensitive and server-authoritative fields were discarded by Eloquent mass assignment protection
        $this->assertNull($order->id, 'ID was not discarded by mass-assignment!');
        $this->assertNull($order->order_no, 'order_no must not be mass-assignable!');
        $this->assertNull($order->customer_id, 'customer_id was not protected from mass-assignment!');
        $this->assertNull($order->provider_org_id, 'provider_org_id was not protected from mass-assignment!');
        $this->assertNull($order->service_offering_id, 'service_offering_id must not be mass-assignable!');
        $this->assertNull($order->service_snapshot, 'service_snapshot must not be mass-assignable!');
        $this->assertNull($order->recipient_snapshot, 'recipient_snapshot must not be mass-assignable!');
        $this->assertNull($order->address_snapshot, 'address_snapshot must not be mass-assignable!');
        $this->assertNull($order->original_order_id, 'original_order_id must not be mass-assignable!');
        $this->assertNull($order->status, 'status was not protected from mass-assignment!');
        $this->assertNull($order->phase, 'phase was not protected from mass-assignment!');
        $this->assertNull($order->diagnosis_fee_idr, 'diagnosis_fee_idr was not protected from mass-assignment!');

        // Assert permitted customer narrative fields were filled
        $this->assertEquals('AC tidak dingin sama sekali', $order->complaint_text);
    }

    public function test_service_booking_mass_assignment_protects_status_and_ownership(): void
    {
        $input = [
            'scheduled_start_at' => now()->addDays(2),
            'scheduled_end_at' => now()->addDays(2)->addHours(2),
            'timezone' => 'Asia/Jakarta',
            'slot_reference' => 'SLOT-2026-001',
            // Malicious fields:
            'id' => (string) Str::ulid(),
            'order_id' => (string) Str::ulid(),
            'customer_id' => 'HACKER',
            'provider_org_id' => 'FORGED_ORG',
            'status' => 'COMPLETED',
            'schedule_revision' => 50,
        ];

        $booking = new ServiceBooking();
        $booking->fill($input);

        $this->assertNull($booking->id);
        $this->assertNull($booking->order_id);
        $this->assertNull($booking->customer_id);
        $this->assertNull($booking->provider_org_id);
        $this->assertNull($booking->slot_reference, 'slot_reference must be server-authoritative and guarded!');
        $this->assertNull($booking->status);
        $this->assertNull($booking->schedule_revision);
        $this->assertEquals('Asia/Jakarta', $booking->timezone);
    }

    public function test_worker_assignment_attempt_protects_accepted_status(): void
    {
        $input = [
            'rejection_reason_code' => 'SCHEDULE_CONFLICT',
            'rejection_notes' => 'Tidak bisa hadir',
            // Malicious fields:
            'id' => (string) Str::ulid(),
            'worker_id' => 'IMPERSONATED_WORKER',
            'status' => 'ACCEPTED',
            'attempt_no' => 10,
        ];

        $attempt = new WorkerAssignmentAttempt();
        $attempt->fill($input);

        $this->assertNull($attempt->id);
        $this->assertNull($attempt->worker_id);
        $this->assertNull($attempt->status);
        $this->assertNull($attempt->attempt_no);
        $this->assertEquals('SCHEDULE_CONFLICT', $attempt->rejection_reason_code);
    }

    public function test_financial_ledger_models_completely_reject_mass_assignment(): void
    {
        // Eloquent throws MassAssignmentException because guarded = ['*']
        $this->expectException(\Illuminate\Database\Eloquent\MassAssignmentException::class);

        $obligation = new ServicePaymentObligation();
        $obligation->fill([
            'id' => (string) Str::ulid(),
            'order_id' => (string) Str::ulid(),
            'purpose' => 'DIAGNOSIS',
            'principal_idr' => 1000,
            'state' => 'PAID',
        ]);
    }

    public function test_audit_log_and_consent_strictly_reject_mass_assignment(): void
    {
        $this->expectException(\Illuminate\Database\Eloquent\MassAssignmentException::class);

        $consent = new CustomerConsent();
        $consent->fill([
            'id' => (string) Str::ulid(),
            'customer_id' => 'HACKER',
            'statement_acknowledged' => true,
        ]);
    }
}
