<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ReviewEntry;
use App\Models\ReviewSubmission;
use Tests\TestCase;

class ReviewAndRatingPolicyTest extends TestCase
{
    public function test_customer_can_submit_goods_review_with_product_and_merchant_ratings(): void
    {
        $headers = $this->customerHeaders('cust-601');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-g-901',
            'source_merchant_order_id' => 'mo-901',
            'ratings' => [
                [
                    'target_type' => 'PRODUCT',
                    'target_id' => 'prod-901',
                    'rating' => 5,
                    'text' => 'Barang sangat bagus dan sesuai deskripsi!',
                    'source_item_key' => 'item-901',
                ],
                [
                    'target_type' => 'MERCHANT',
                    'target_id' => 'org-merchant-601',
                    'rating' => 5,
                    'text' => 'Toko ramah dan pengiriman sangat cepat.',
                ],
            ],
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('review_submissions', [
            'customer_id' => 'cust-601',
            'source_order_id' => 'ord-g-901',
        ]);

        $this->assertDatabaseHas('review_entries', [
            'target_type' => 'PRODUCT',
            'target_id' => 'prod-901',
            'rating' => 5,
        ]);

        $this->assertDatabaseHas('review_entries', [
            'target_type' => 'MERCHANT',
            'target_id' => 'org-merchant-601',
            'rating' => 5,
        ]);
    }

    public function test_strict_rule_worker_rating_is_forbidden(): void
    {
        $headers = $this->customerHeaders('cust-601');

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'SERVICE',
            'source_order_id' => 'ord-s-902',
            'ratings' => [
                [
                    'target_type' => 'SERVICE',
                    'target_id' => 'srv-902',
                    'rating' => 4,
                ],
                [
                    'target_type' => 'PROVIDER',
                    'target_id' => 'org-provider-601',
                    'rating' => 4,
                ],
                [
                    // Attempting to rate WORKER / TECHNICIAN!
                    'target_type' => 'WORKER',
                    'target_id' => 'worker-902',
                    'rating' => 5,
                ],
            ],
        ], $headers);

        // Must be rejected by business invariant!
        $response->assertStatus(422);
    }

    public function test_duplicate_review_submission_for_same_order_is_blocked(): void
    {
        $headers = $this->customerHeaders('cust-601');

        ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-g-dup',
            'customer_id' => 'cust-601',
            'submitted_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/after-sales/reviews', [
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-g-dup',
            'ratings' => [
                ['target_type' => 'PRODUCT', 'target_id' => 'p1', 'rating' => 5],
                ['target_type' => 'MERCHANT', 'target_id' => 'm1', 'rating' => 5],
            ],
        ], $headers);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'AFTER_SALES_REVIEW_FAILED');
    }

    public function test_business_can_post_one_official_reply(): void
    {
        $submission = ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-g-reply',
            'customer_id' => 'cust-601',
            'submitted_at' => now(),
        ]);

        $entry = ReviewEntry::create([
            'submission_id' => $submission->id,
            'target_type' => 'MERCHANT',
            'target_id' => 'org-merchant-reply',
            'rating' => 5,
            'text' => 'Pelayanan mantap',
            'submitted_at' => now(),
        ]);

        $merchHeaders = $this->merchantHeaders('merch-user-reply', 'org-merchant-reply');

        $response = $this->postJson("/api/v1/after-sales/business/reviews/{$entry->id}/reply", [
            'text' => 'Terima kasih atas kepercayaannya berbelanja di toko kami!',
        ], $merchHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('review_replies', [
            'review_entry_id' => $entry->id,
            'owner_org_id' => 'org-merchant-reply',
            'text' => 'Terima kasih atas kepercayaannya berbelanja di toko kami!',
        ]);
    }

    public function test_admin_can_moderate_review_without_changing_rating_value(): void
    {
        $submission = ReviewSubmission::create([
            'source_kind' => 'GOODS',
            'source_order_id' => 'ord-g-mod',
            'customer_id' => 'cust-601',
            'submitted_at' => now(),
        ]);

        $entry = ReviewEntry::create([
            'submission_id' => $submission->id,
            'target_type' => 'PRODUCT',
            'target_id' => 'prod-mod-001',
            'rating' => 1,
            'text' => 'Mengandung kata-kata kasar yang tidak pantas.',
            'status' => 'VISIBLE',
            'submitted_at' => now(),
        ]);

        $adminHeaders = $this->adminHeaders('admin-001');

        $response = $this->postJson("/api/v1/after-sales/admin/reviews/{$entry->id}/moderate", [
            'action' => 'HIDE',
            'reason' => 'Melanggar standar komunitas (kata-kata kasar).',
        ], $adminHeaders);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $entry->refresh();
        $this->assertEquals('HIDDEN', $entry->status);
        $this->assertEquals(1, $entry->rating); // Original rating preserved!

        $this->assertDatabaseHas('review_moderations', [
            'review_entry_id' => $entry->id,
            'action' => 'HIDE',
            'admin_id' => 'admin-001',
        ]);
    }
}
