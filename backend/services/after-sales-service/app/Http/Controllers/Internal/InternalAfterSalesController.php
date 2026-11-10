<?php

declare(strict_types=1);

namespace App\Http\Controllers\Internal;

use App\Domain\AfterSales\Warranties\WarrantyService;
use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\CaseExternalRef;
use App\Models\InboxEvent;
use App\Models\WarrantyOption;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class InternalAfterSalesController
{
    public function __construct(
        private readonly WarrantyService $warrantyService
    ) {}

    public function checkOptionEligibility(Request $request, string $id): JsonResponse
    {
        $option = WarrantyOption::with('latestVersion')->find($id);

        if (!$option) {
            return ApiResponse::error(
                'AFTER_SALES_OPTION_NOT_FOUND',
                'Opsi garansi tidak ditemukan.',
                404
            );
        }

        $isActive = ($option->status === 'ACTIVE' && $option->latestVersion !== null);

        $versionData = $option->latestVersion ? [
            'id' => $option->latestVersion->id,
            'name' => $option->latestVersion->name,
            'duration_days' => $option->latestVersion->duration_days,
            'coverage_text' => $option->latestVersion->coverage_text,
        ] : null;

        return ApiResponse::success([
            'option_id' => $option->id,
            'is_eligible' => $isActive,
            'status' => $option->status,
            'latest_version' => $versionData,
            'version' => $versionData,
        ]);
    }

    public function recordWarrantySnapshot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_kind' => 'required|string|in:GOODS,SERVICE',
            'order_id' => 'required|string',
            'merchant_order_id' => 'nullable|string',
            'order_item_key' => 'required|string',
            'customer_id' => 'required|string',
            'owner_org_type' => 'required|string|in:MERCHANT,PROVIDER',
            'owner_org_id' => 'required|string',
            'catalog_ref' => 'required|string',
            'warranty_option_version_id' => 'nullable|string',
            'snapshot_name' => 'required|string',
            'snapshot_duration_days' => 'required|integer|min:1',
            'snapshot_coverage' => 'nullable|string',
            'snapshot_exclusion' => 'nullable|string',
            'quantity' => 'nullable|integer|min:1',
        ]);

        try {
            $entitlement = $this->warrantyService->recordOrderEntitlement($validated);

            return ApiResponse::success($entitlement, 201, 'Snapshot garansi pesanan berhasil dicatat.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_SNAPSHOT_CONFLICT', $e->getMessage(), 409);
        }
    }

    public function handleOrderCompletion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_kind' => 'required|string|in:GOODS,SERVICE',
            'order_id' => 'required|string',
            'order_item_key' => 'nullable|string',
            'completed_at' => 'nullable|date',
            'items' => 'nullable|array',
        ]);

        $completedAt = !empty($validated['completed_at']) ? new \DateTimeImmutable($validated['completed_at']) : now();

        $count = 0;
        if (!empty($validated['items']) && is_array($validated['items'])) {
            foreach ($validated['items'] as $itemData) {
                $hasWarranty = !empty($itemData['has_warranty']) || !empty($itemData['snapshot_name']);
                $duration = (int) ($itemData['snapshot_duration_days'] ?? 0);
                if ($hasWarranty && $duration > 0) {
                    $itemData['source_kind'] = $validated['source_kind'];
                    $itemData['order_id'] = $validated['order_id'];
                    $itemData['source_completed_at'] = $completedAt->format('Y-m-d H:i:s');
                    $this->warrantyService->createOrActivateEntitlement($itemData);
                    $count++;
                }
            }
        } else {
            $count = $this->warrantyService->activateOrderEntitlement(
                sourceKind: $validated['source_kind'],
                orderId: $validated['order_id'],
                orderItemKey: $validated['order_item_key'] ?? null,
                completedAt: $completedAt
            );
        }

        return ApiResponse::success([
            'order_id' => $validated['order_id'],
            'activated_entitlements_count' => $count,
        ], 200, 'Aktivasi garansi pesanan selesai berhasil diproses.');
    }

    public function handleExternalUpdate(Request $request, string $id): JsonResponse
    {
        $callerService = trim((string) ($request->header('X-Source-Service') ?: $request->header('X-Caller-Service') ?: ''));

        if (empty($callerService)) {
            return ApiResponse::error(
                'SOURCE_SERVICE_REQUIRED',
                "Header 'X-Source-Service' wajib disertakan untuk semua pemanggilan internal callback.",
                403
            );
        }

        $validated = $request->validate([
            'target_service' => 'required|string|in:05A,05B,06,09',
            'external_id' => 'required|string',
            'external_status' => 'required|string',
            'purpose' => 'required|string',
            'last_event_id' => 'nullable|string',
            'data' => 'nullable|array',
        ]);

        $targetService = $validated['target_service'];

        // 1. Strict S2S Credential Isolation: Sensitive mutation REQUIRES service-specific token.
        // Shared global internal key fallback is strictly FORBIDDEN.
        $serviceToken = trim((string) ($request->header('X-Service-Token') ?: $request->header('X-Internal-Service-Key') ?: $request->bearerToken() ?: ''));
        $expectedServiceToken = (string) config("after_sales.s2s.{$targetService}");

        if (empty($serviceToken) || empty($expectedServiceToken) || !hash_equals($expectedServiceToken, $serviceToken)) {
            return ApiResponse::error(
                'S2S_AUTHENTICATION_FAILED',
                "Autentikasi S2S gagal untuk service '{$targetService}'. Kredensial khusus service tidak valid atau shared global key ditolak.",
                403
            );
        }

        // 2. Verify caller service identity matches claimed target service
        $serviceMapping = [
            '05A' => 'order-barang-service',
            '05B' => 'order-jasa-service',
            '06' => 'finance-service',
            '09' => 'support-service',
        ];

        $expectedCaller = $serviceMapping[$targetService] ?? '';
        if ($callerService !== $expectedCaller && $callerService !== $targetService) {
            return ApiResponse::error(
                'SOURCE_IDENTITY_MISMATCH',
                "Identitas service pemanggil '{$callerService}' tidak cocok dengan target service '{$targetService}'.",
                403
            );
        }

        // 3. Validate allowed statuses per target service
        $newStatus = strtoupper($validated['external_status']);
        $serviceAllowedStatuses = [
            '06' => ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
            '05A' => ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            '05B' => ['ASSIGNED', 'ACCEPTED', 'OTW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            '09' => ['ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'],
        ];

        if (!in_array($newStatus, $serviceAllowedStatuses[$targetService] ?? [], true)) {
            return ApiResponse::error(
                'INVALID_EXTERNAL_STATUS',
                "Status eksternal '{$newStatus}' tidak diizinkan untuk service '{$targetService}'.",
                422
            );
        }

        $case = AfterSalesCase::findOrFail($id);

        // 4. Lookup registered external reference
        /** @var CaseExternalRef|null $ref */
        $ref = CaseExternalRef::where('case_id', $case->id)
            ->where('external_id', $validated['external_id'])
            ->first();

        if (!$ref) {
            return ApiResponse::error(
                'UNKNOWN_EXTERNAL_RESOURCE',
                "External ID '{$validated['external_id']}' tidak terdaftar pada kasus ini. Callback ditolak.",
                404
            );
        }

        if ($ref->target_service !== $targetService) {
            return ApiResponse::error(
                'TARGET_SERVICE_MISMATCH',
                "Target service '{$targetService}' tidak cocok dengan registrasi koordinasi ({$ref->target_service}).",
                422
            );
        }

        if ($ref->purpose !== $validated['purpose']) {
            return ApiResponse::error(
                'MISMATCHED_PURPOSE',
                "Tujuan callback '{$validated['purpose']}' tidak cocok dengan tujuan koordinasi terdaftar ({$ref->purpose}).",
                422
            );
        }

        // 5. Enforce service action permission matrix
        $allowedPurposes = [
            '06' => ['REFUND_DECISION'],
            '05A' => ['REPLACEMENT_FULFILLMENT'],
            '05B' => ['WARRANTY_JOB'],
            '09' => ['DISPUTE_ESCALATION'],
        ];

        if (!in_array($validated['purpose'], $allowedPurposes[$targetService] ?? [], true)) {
            return ApiResponse::error(
                'SERVICE_ACTION_UNAUTHORIZED',
                "Service '{$targetService}' tidak memiliki izin untuk mengupdate koordinasi dengan tujuan '{$validated['purpose']}'.",
                403
            );
        }

        // 6. State Machine Protection: Terminal states cannot regress
        $currentStatus = strtoupper((string) $ref->external_status);
        $terminalStates = ['SUCCEEDED', 'DELIVERED', 'COMPLETED', 'CONFIRMED', 'CANCELLED', 'CLOSED', 'RESOLVED'];

        if (in_array($currentStatus, $terminalStates, true) && $currentStatus !== $newStatus) {
            return ApiResponse::error(
                'INVALID_STATE_REGRESSION',
                "Status eksternal terminal '{$currentStatus}' tidak boleh diubah atau mundur menjadi '{$newStatus}'.",
                422
            );
        }

        // 7. Deduplicate event ID if provided
        if (!empty($validated['last_event_id'])) {
            if ($ref->last_event_id === $validated['last_event_id']) {
                return ApiResponse::success($ref, 200, 'Callback duplikat diabaikan (IDEMPOTENT_EVENT).');
            }
        }

        $ref->update([
            'purpose' => $validated['purpose'],
            'external_status' => $newStatus,
            'last_checked_at' => now(),
            'last_event_id' => $validated['last_event_id'] ?? $ref->last_event_id,
        ]);

        if ($newStatus === 'COMPLETED') {
            $evidence = $validated['data']['completion_evidence'] ?? null;
            if ($evidence) {
                if ($case->resolution) {
                    $case->resolution->update([
                        'status' => 'VERIFIED_DONE',
                        'evidence_ref' => $evidence,
                    ]);
                } elseif ($ref->resolution) {
                    $ref->resolution->update([
                        'status' => 'VERIFIED_DONE',
                        'evidence_ref' => $evidence,
                    ]);
                }
            }
        }

        $lastSeq = (int) $case->events()->max('sequence');
        CaseEvent::create([
            'case_id' => $case->id,
            'sequence' => $lastSeq + 1,
            'event_type' => 'EXTERNAL_STATUS_UPDATED',
            'from_state' => $case->main_status,
            'to_state' => $case->main_status,
            'actor_kind' => 'SYSTEM',
            'actor_id' => 'service-' . $targetService,
            'reason' => "Status eksternal terautentikasi diperbarui: {$newStatus}",
            'data_json' => [
                'external_id' => $ref->external_id,
                'target_service' => $targetService,
                'new_status' => $newStatus,
                'event_id' => $validated['last_event_id'] ?? null,
                'completion_evidence' => $validated['data']['completion_evidence'] ?? null,
            ],
            'occurred_at' => now(),
        ]);

        return ApiResponse::success($ref, 200, 'Pembaruan status koordinasi eksternal berhasil disimpan.');
    }
}
