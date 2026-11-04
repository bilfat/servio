<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ServiceOrder;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaginationValidationTest extends TestCase
{
    public function test_pagination_bounds_and_clamping(): void
    {
        $customerId = 'CUST-PAGINATE-01';
        $headers = $this->customerHeaders($customerId);

        // Seed 5 actual order records for this customer
        for ($i = 1; $i <= 5; $i++) {
            ServiceOrder::forceCreate([
                'id' => (string) Str::ulid(),
                'order_no' => "JSA-PAG-{$i}-" . Str::random(4),
                'customer_id' => $customerId,
                'provider_org_id' => 'ORG-001',
                'service_offering_id' => 'srv-01',
                'service_snapshot' => ['title' => "Layanan {$i}"],
                'recipient_snapshot' => ['name' => 'Budi'],
                'address_snapshot' => ['city' => 'Jakarta'],
                'complaint_text' => "Keluhan {$i}",
                'status' => 'CONFIRMED',
                'phase' => 'WORKER_ASSIGNMENT_PENDING',
                'created_at' => now()->subMinutes(10 - $i),
                'updated_at' => now()->subMinutes(10 - $i),
            ]);
        }

        // Test 1: Zero per_page is clamped to default 15
        $resZero = $this->getJson('/api/v1/order-jasa/orders?per_page=0', $headers);
        $resZero->assertStatus(200);
        $this->assertEquals(15, $resZero->json('meta.pagination.per_page'));
        $this->assertEquals(5, $resZero->json('meta.pagination.total'));

        // Test 2: Negative per_page is clamped to default 15
        $resNeg = $this->getJson('/api/v1/order-jasa/orders?per_page=-10', $headers);
        $resNeg->assertStatus(200);
        $this->assertEquals(15, $resNeg->json('meta.pagination.per_page'));

        // Test 3: Excessive per_page is clamped to maximum 50
        $resMax = $this->getJson('/api/v1/order-jasa/orders?per_page=500', $headers);
        $resMax->assertStatus(200);
        $this->assertEquals(50, $resMax->json('meta.pagination.per_page'));

        // Test 4: Invalid non-numeric per_page clamped to default
        $resInvalid = $this->getJson('/api/v1/order-jasa/orders?per_page=bad_string', $headers);
        $resInvalid->assertStatus(200);
        $this->assertEquals(15, $resInvalid->json('meta.pagination.per_page'));

        // Test 5: Positive pagination across multiple pages with actual data
        // Page 1 with per_page = 2
        $resPage1 = $this->getJson('/api/v1/order-jasa/orders?per_page=2&page=1', $headers);
        $resPage1->assertStatus(200);
        $this->assertCount(2, $resPage1->json('data'));
        $this->assertEquals(1, $resPage1->json('meta.pagination.current_page'));
        $this->assertEquals(5, $resPage1->json('meta.pagination.total'));
        $this->assertEquals(3, $resPage1->json('meta.pagination.last_page'));

        // Page 2 with per_page = 2
        $resPage2 = $this->getJson('/api/v1/order-jasa/orders?per_page=2&page=2', $headers);
        $resPage2->assertStatus(200);
        $this->assertCount(2, $resPage2->json('data'));
        $this->assertEquals(2, $resPage2->json('meta.pagination.current_page'));

        // Page 3 with per_page = 2 (should return the remaining 1 item)
        $resPage3 = $this->getJson('/api/v1/order-jasa/orders?per_page=2&page=3', $headers);
        $resPage3->assertStatus(200);
        $this->assertCount(1, $resPage3->json('data'));
        $this->assertEquals(3, $resPage3->json('meta.pagination.current_page'));

        // Test 6: Negative page is clamped to page 1
        $resNegPage = $this->getJson('/api/v1/order-jasa/orders?per_page=2&page=-5', $headers);
        $resNegPage->assertStatus(200);
        $this->assertEquals(1, $resNegPage->json('meta.pagination.current_page'));
    }
}
