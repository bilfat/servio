<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Domain\AfterSales\Integrations\HttpOrderEligibilityVerifier;
use App\Domain\AfterSales\Integrations\HttpResolutionCoordinator;
use App\Models\AfterSalesCase;
use App\Models\CaseExternalRef;
use App\Models\CaseItem;
use App\Models\CaseResolution;
use App\Models\OrderWarrantyEntitlement;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RealCrossServiceE2ETest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (env('RUN_REAL_CROSS_SERVICE_E2E') !== true && env('RUN_REAL_CROSS_SERVICE_E2E') !== 'true') {
            $this->markTestSkipped('Real cross-service E2E tests are isolated and require RUN_REAL_CROSS_SERVICE_E2E=true to avoid mutating operational databases.');
        }

        // P0-1: Mandatory Multi-Microservice Isolated Test Database Verification Guard (Fail-Closed)
        $servicesToCheck = [
            '05A' => ['name' => 'order-barang', 'url' => 'http://127.0.0.1:8005/internal/v1/order-barang/environment'],
            '05B' => ['name' => 'order-jasa', 'url' => 'http://127.0.0.1:8007/internal/v1/order-jasa/environment'],
            '06'  => ['name' => 'finance', 'url' => 'http://127.0.0.1:8006/internal/v1/finance/environment'],
        ];

        $internalKey = config('after_sales.internal_service_key', 'servio_local_internal_service_key_2026');

        foreach ($servicesToCheck as $srvCode => $info) {
            try {
                $response = Http::withHeaders([
                    'X-Internal-Service-Key' => $internalKey,
                    'X-Source-Service' => 'after-sales-service',
                    'Accept' => 'application/json',
                ])->timeout(3)->get($info['url']);

                if (!$response->successful()) {
                    $this->markTestSkipped("SAFETY HALT: Service {$srvCode} ({$info['name']}) tidak dapat dihubungi atau mengembalikan HTTP {$response->status()}. E2E dihentikan.");
                }

                $envData = $response->json()['data'] ?? [];
                $isIsolated = (bool) ($envData['is_isolated_test_database'] ?? false);
                $dbName = (string) ($envData['database'] ?? 'UNKNOWN');

                if (!$isIsolated) {
                    $this->markTestSkipped("SAFETY HALT: Service {$srvCode} ({$info['name']}) terdeteksi menggunakan database operasional '{$dbName}'! Mutasi database operasional dicegah secara absolut.");
                }
            } catch (\Throwable $e) {
                $this->markTestSkipped("SAFETY HALT: Gagal memverifikasi isolasi lingkungan service {$srvCode}: " . $e->getMessage());
            }
        }

        // Verify local Phase 07 database isolation
        $localDbName = \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
        $isLocalIsolated = str_ends_with($localDbName, '_test_db') || app()->environment('testing');
        if (!$isLocalIsolated) {
            $this->markTestSkipped("SAFETY HALT: After-Sales Service (07) menggunakan database operasional '{$localDbName}'! E2E dihentikan.");
        }

        // Bind PRODUCTION HTTP adapters to test real live S2S communication across microservices
        $this->app->singleton(OrderEligibilityVerifierInterface::class, HttpOrderEligibilityVerifier::class);
        $this->app->singleton(ResolutionCoordinatorInterface::class, HttpResolutionCoordinator::class);
    }

    /**
     * Real E2E Test 1: Real Replacement fulfillment lifecycle with live Order Barang Service (05A on 8005).
     */
    public function test_real_e2e_replacement_with_live_service_05a(): void
    {
        $uniqueOrderId = 'ord-real-e2e-rep-' . time();
        $uniqueCaseId = 'case-real-rep-' . time();

        $case = AfterSalesCase::create([
            'id' => $uniqueCaseId,
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-e2e-buyer',
            'owner_org_id' => 'org-merchant-e2e',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => $uniqueOrderId,
            'initial_solution' => 'REPLACEMENT',
            'agreed_solution' => 'REPLACEMENT',
            'reason_code' => 'DEFECT',
            'description' => 'Test Real E2E Replacement with 05A',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-g-1',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['title' => 'Barang Uji E2E', 'price' => 250000],
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REPLACEMENT',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-e2e-user', 'org-merchant-e2e');

        // 1. Business starts resolution -> initiates real replacement on live 05A
        $startRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $startRes->assertStatus(200);

        /** @var CaseExternalRef $extRef */
        $extRef = CaseExternalRef::where('case_id', $case->id)->first();
        $this->assertNotNull($extRef);
        $this->assertEquals('05A', $extRef->target_service);
        $this->assertEquals('PREPARING', $extRef->external_status);
        $this->assertNotEmpty($extRef->external_id);

        $realReplacementId = $extRef->external_id;

        // 2. Advance fulfillment to DELIVERED directly on live 05A
        $deliverResponse = Http::withHeaders([
            'X-Internal-Service-Key' => 'servio_local_internal_service_key_2026',
            'X-Source-Service' => 'after-sales-service',
            'Accept' => 'application/json',
        ])->post("http://127.0.0.1:8005/internal/v1/order-barang/replacements/{$realReplacementId}/deliver", [
            'proof_of_delivery' => 'POD-SIGNED-BY-BUYER-' . time(),
        ]);

        $this->assertTrue($deliverResponse->successful(), "Failed to deliver replacement on 05A: " . $deliverResponse->body());

        // 3. Business completes case -> verifies authentic DELIVERED status from live 05A
        $completeRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'receipts/e2e-delivery-proof.pdf',
        ], $merchHeaders);

        $completeRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'COMPLETED');

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);
    }

    /**
     * Real E2E Test 2: Real Refund claim lifecycle with live Finance Service (06 on 8006).
     */
    public function test_real_e2e_refund_with_live_finance_06(): void
    {
        $uniqueOrderId = 'ord-real-e2e-fin-' . time();
        $uniqueCaseId = 'case-real-fin-' . time();

        $case = AfterSalesCase::create([
            'id' => $uniqueCaseId,
            'case_type' => 'GOODS_RETURN',
            'customer_id' => 'cust-e2e-spay-user',
            'owner_org_id' => 'org-merchant-e2e',
            'owner_org_type' => 'MERCHANT',
            'source_order_kind' => 'GOODS',
            'source_order_id' => $uniqueOrderId,
            'initial_solution' => 'REFUND',
            'agreed_solution' => 'REFUND',
            'reason_code' => 'DEFECT',
            'description' => 'Test Real E2E Refund with Finance 06',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'item-g-refund-1',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['title' => 'Barang Refund E2E', 'price' => 175000],
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REFUND',
            'status' => 'NOT_STARTED',
        ]);

        $merchHeaders = $this->merchantHeaders('merch-e2e-user', 'org-merchant-e2e');

        // 1. Business starts resolution -> initiates real refund on live 06 (credits S-Pay)
        $startRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $merchHeaders);
        $startRes->assertStatus(200);

        /** @var CaseExternalRef $extRef */
        $extRef = CaseExternalRef::where('case_id', $case->id)->first();
        $this->assertNotNull($extRef);
        $this->assertEquals('06', $extRef->target_service);
        $this->assertEquals('SUCCEEDED', $extRef->external_status);
        $this->assertNotEmpty($extRef->external_id);

        $realRefundId = $extRef->external_id;

        // 2. Business completes case -> queries live 06 to verify real SUCCEEDED status
        $completeRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'receipts/finance-spay-credit-proof.pdf',
        ], $merchHeaders);

        $completeRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'COMPLETED');

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);
    }

    /**
     * Real E2E Test 3: Real Warranty Job lifecycle with live Order Jasa Service (05B on 8007).
     */
    public function test_real_e2e_warranty_job_with_live_service_05b(): void
    {
        $uniqueOrderId = 'ord-s-real-e2e-' . time();
        $uniqueCaseId = 'case-real-job-' . time();

        $case = AfterSalesCase::create([
            'id' => $uniqueCaseId,
            'case_type' => 'SERVICE_WARRANTY',
            'customer_id' => 'cust-e2e-service-buyer',
            'owner_org_id' => 'org-provider-e2e',
            'owner_org_type' => 'PROVIDER',
            'source_order_kind' => 'SERVICE',
            'source_order_id' => $uniqueOrderId,
            'initial_solution' => 'REWORK',
            'agreed_solution' => 'REWORK',
            'reason_code' => 'AC_LEAK',
            'description' => 'AC bocor lagi setelah servis',
            'main_status' => 'IN_RESOLUTION',
            'response_due_at' => now()->addHours(72),
            'response_state' => 'RESPONDED',
            'version' => 1,
        ]);

        CaseItem::create([
            'case_id' => $case->id,
            'source_item_ref' => 'srv-ac-cuci',
            'quantity_requested' => 1,
            'catalog_snapshot' => ['title' => 'Servis AC E2E', 'price' => 150000],
        ]);

        CaseResolution::create([
            'case_id' => $case->id,
            'solution_code' => 'REWORK',
            'status' => 'NOT_STARTED',
        ]);

        $provHeaders = $this->providerHeaders('prov-e2e-user', 'org-provider-e2e');

        // 1. Provider starts resolution -> creates real warranty job on live 05B
        $startRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/resolution-action", [], $provHeaders);
        $startRes->assertStatus(200);

        /** @var CaseExternalRef $extRef */
        $extRef = CaseExternalRef::where('case_id', $case->id)->first();
        $this->assertNotNull($extRef);
        $this->assertEquals('05B', $extRef->target_service);
        $this->assertEquals('ASSIGNED', $extRef->external_status);
        $this->assertNotEmpty($extRef->external_id);

        $realJobId = $extRef->external_id;

        // 2. Worker completes warranty rework job directly on live 05B
        $completeJobResponse = Http::withHeaders([
            'X-Internal-Service-Key' => 'servio_local_internal_service_key_2026',
            'X-Source-Service' => 'after-sales-service',
            'Accept' => 'application/json',
        ])->post("http://127.0.0.1:8007/internal/v1/order-jasa/warranty-jobs/{$realJobId}/complete", [
            'completion_evidence' => 'JOB-DONE-SIGNATURE-' . time(),
        ]);

        $this->assertTrue($completeJobResponse->successful(), "Failed to complete warranty job on 05B: " . $completeJobResponse->body());

        // 3. Provider completes case -> verifies authentic COMPLETED status from live 05B
        $completeRes = $this->postJson("/api/v1/after-sales/business/cases/{$case->id}/complete", [
            'evidence_ref' => 'receipts/service-rework-evidence.pdf',
        ], $provHeaders);

        $completeRes->assertStatus(200)
            ->assertJsonPath('data.main_status', 'COMPLETED');

        $case->refresh();
        $this->assertEquals('COMPLETED', $case->main_status);
    }
}
