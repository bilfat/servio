<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\AfterSalesCase;
use Illuminate\Support\Str;
use Tests\TestCase;

class IdempotencyAndConcurrencyTest extends TestCase
{
    /**
     * Test Idempotency with exact payload matches returns 200 Replay.
     */
    public function test_idempotent_request_replay_with_identical_payload(): void
    {
        $idempotencyKey = 'idem-' . Str::uuid();
        $headers = array_merge($this->customerHeaders('cust-idem-1'), [
            'Idempotency-Key' => $idempotencyKey,
        ]);

        $payload = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-idem-101',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED_BOX',
            'description' => 'Paket rusak saat diterima',
        ];

        // First Request
        $res1 = $this->postJson('/api/v1/after-sales/cases', $payload, $headers);
        $res1->assertStatus(201);
        $firstCaseId = $res1->json('data.id');

        // Second Request with identical key and payload
        $res2 = $this->postJson('/api/v1/after-sales/cases', $payload, $headers);
        $res2->assertStatus(201);
        $res2->assertHeader('X-Idempotent-Replay', 'true');
        $this->assertEquals($firstCaseId, $res2->json('data.id'));
    }

    /**
     * Test Idempotency with mismatched payload returns 409 Conflict.
     */
    public function test_idempotent_request_with_mismatched_payload_returns_409(): void
    {
        $idempotencyKey = 'idem-conflict-' . Str::uuid();
        $headers = array_merge($this->customerHeaders('cust-idem-2'), [
            'Idempotency-Key' => $idempotencyKey,
        ]);

        $payload1 = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-idem-201',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DAMAGED_BOX',
            'description' => 'Paket pertama',
        ];

        $res1 = $this->postJson('/api/v1/after-sales/cases', $payload1, $headers);
        $res1->assertStatus(201);

        // Second Request with same Idempotency-Key but different description/solution
        $payload2 = [
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-g-idem-201',
            'case_type' => 'GOODS_RETURN',
            'initial_solution' => 'REPLACEMENT', // DIFFERENT!
            'reason_code' => 'WRONG_ITEM',
            'description' => 'Mencoba ganti payload dengan key sama',
        ];

        $res2 = $this->postJson('/api/v1/after-sales/cases', $payload2, $headers);
        $res2->assertStatus(409)
            ->assertJsonPath('error.code', 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
    }

    /**
     * Test optimistic lock concurrency collision returns 409 Conflict.
     */
    public function test_concurrent_case_update_triggers_stale_version_conflict_409(): void
    {
        $case = AfterSalesCase::create([
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-concurrent-1',
            'owner_org_id' => 'org-merchant-001',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => 'ord-conc-1',
            'initial_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Barang cacat',
            'main_status' => 'SUBMITTED',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'WAITING',
            'version' => 1,
        ]);

        $merchHeaders = $this->merchantHeaders('merch-001', 'org-merchant-001');

        // First Business Update (version 1 -> 2)
        $res1 = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'REQUEST_EVIDENCE',
            'reason' => 'Mohon kirim video unboxing',
            'case_version' => 1,
        ], $merchHeaders);

        $res1->assertStatus(200);

        // Parallel/Stale Business Update still expecting version 1
        $res2 = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/decision", [
            'action' => 'ACCEPT_INITIAL',
            'case_version' => 1, // STALE VERSION!
        ], $merchHeaders);

        $res2->assertStatus(409)
            ->assertJsonPath('error.code', 'AFTER_SALES_DECISION_FAILED');
    }
}

