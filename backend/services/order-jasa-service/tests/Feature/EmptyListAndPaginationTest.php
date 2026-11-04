<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\ServiceOrder;
use Tests\TestCase;

class EmptyListAndPaginationTest extends TestCase
{
    public function test_customer_order_list_empty_shape(): void
    {
        $headers = $this->customerHeaders('CUST-EMPTY-001');
        $response = $this->getJson('/api/v1/order-jasa/orders', $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_OK',
                'data' => [],
                'meta' => [
                    'pagination' => [
                        'current_page' => 1,
                        'total' => 0,
                    ],
                ],
            ]);
    }

    public function test_provider_order_list_empty_shape(): void
    {
        $headers = $this->providerHeaders('PROV-USER-EMPTY', 'ORG-EMPTY-001');
        $response = $this->getJson('/api/v1/order-jasa/provider/orders', $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_OK',
                'data' => [],
                'meta' => [
                    'pagination' => [
                        'total' => 0,
                    ],
                ],
            ]);
    }

    public function test_worker_task_list_empty_shape(): void
    {
        $headers = $this->workerHeaders('WORKER-EMPTY-001');
        $response = $this->getJson('/api/v1/order-jasa/worker/tasks', $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_OK',
                'data' => [],
                'meta' => [
                    'pagination' => [
                        'total' => 0,
                    ],
                ],
            ]);
    }

    public function test_admin_aggregates_empty_shape(): void
    {
        $headers = $this->adminHeaders('ADMIN-001');
        $response = $this->getJson('/api/v1/order-jasa/admin/orders/aggregates', $headers);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'code' => 'ORDER_JASA_OK',
                'data' => [
                    'total_orders' => ServiceOrder::count(),
                ],
            ]);
    }
}
