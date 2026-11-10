<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Cases\CaseService;
use App\Domain\AfterSales\Decisions\DecisionService;
use App\Domain\AfterSales\Resolutions\ResolutionService;
use App\Domain\AfterSales\Returns\PhysicalReturnService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BusinessCaseController
{
    public function __construct(
        private readonly CaseService $caseService,
        private readonly DecisionService $decisionService,
        private readonly ResolutionService $resolutionService,
        private readonly PhysicalReturnService $returnService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $type = $request->query('type');
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 15);

        $paginator = $this->caseService->listBusinessCases($actor->organizationId, $type, $status, $perPage);

        return ApiResponse::success($paginator->items(), 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        try {
            $case = $this->caseService->getCaseDetail(
                caseId: $id,
                actorUserId: null,
                actorOrgId: $actor->organizationId
            );

            return ApiResponse::success($case);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        }
    }

    public function makeDecision(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'action' => 'required|string|in:ACCEPT_INITIAL,REJECT_WITH_REASON,PROPOSE_ALTERNATIVE,REQUEST_EVIDENCE',
            'alternative_solution' => 'nullable|string|in:REPLACEMENT,REWORK,REFUND,REPAIR_GOODS',
            'reason' => 'nullable|string|max:2000',
            'case_version' => 'nullable|integer',
        ]);

        try {
            $case = $this->decisionService->handleBusinessDecision(
                caseId: $id,
                businessOrgId: $actor->organizationId,
                actorId: $actor->id,
                action: $validated['action'],
                alternativeSolution: $validated['alternative_solution'] ?? null,
                reason: $validated['reason'] ?? null,
                expectedCaseVersion: (int) ($validated['case_version'] ?? 1)
            );

            return ApiResponse::success($case, 200, 'Tanggapan/keputusan kasus berhasil disimpan.');
        } catch (Throwable $e) {
            $statusCode = str_contains($e->getMessage(), 'Stale Case Version') ? 409 : 422;
            return ApiResponse::error('AFTER_SALES_DECISION_FAILED', $e->getMessage(), $statusCode);
        }
    }

    public function startResolution(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        try {
            $resolution = $this->resolutionService->startResolutionAction(
                caseId: $id,
                actorId: $actor->id,
                actorOrgId: $actor->organizationId
            );

            return ApiResponse::success($resolution, 200, 'Tindakan penyelesaian solusi berhasil dimulai.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_RESOLUTION_FAILED', $e->getMessage(), 422);
        }
    }

    public function completeCase(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'evidence_ref' => 'required|string',
        ]);

        try {
            $case = $this->resolutionService->completeCase(
                caseId: $id,
                evidenceRef: $validated['evidence_ref'],
                actorId: $actor->id,
                actorOrgId: $actor->organizationId
            );

            return ApiResponse::success($case, 200, 'Kasus berhasil diselesaikan.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_COMPLETE_FAILED', $e->getMessage(), 422);
        }
    }

    public function saveReturnInstructions(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'requires_physical_return' => 'required|boolean',
            'no_return_reason' => 'nullable|string|max:1000',
            'waived_reason' => 'nullable|string|max:1000',
            'recipient_name' => 'nullable|string|max:100',
            'return_recipient_name' => 'nullable|string|max:100',
            'recipient_phone' => 'nullable|string|max:50',
            'return_phone' => 'nullable|string|max:50',
            'return_address' => 'nullable|string|max:1000',
            'packaging_instructions' => 'nullable|string|max:1000',
            'return_courier_notes' => 'nullable|string|max:1000',
            'shipping_fee_payer' => 'nullable|string|in:MERCHANT,CUSTOMER,THIRD_PARTY',
            'shipping_fee_bearer' => 'nullable|string|in:MERCHANT,CUSTOMER,THIRD_PARTY',
            'shipping_fee_method' => 'nullable|string|max:100',
            'reimbursement_instructions' => 'nullable|string|max:1000',
            'deadline_at' => 'nullable|date',
            'merchant_notes' => 'nullable|string|max:1000',
        ]);

        $data = [
            'requires_physical_return' => (bool) $validated['requires_physical_return'],
            'no_return_reason' => $validated['no_return_reason'] ?? $validated['waived_reason'] ?? null,
            'recipient_name' => $validated['recipient_name'] ?? $validated['return_recipient_name'] ?? null,
            'recipient_phone' => $validated['recipient_phone'] ?? $validated['return_phone'] ?? null,
            'return_address' => $validated['return_address'] ?? null,
            'packaging_instructions' => $validated['packaging_instructions'] ?? $validated['return_courier_notes'] ?? null,
            'shipping_fee_payer' => $validated['shipping_fee_payer'] ?? $validated['shipping_fee_bearer'] ?? 'MERCHANT',
            'shipping_fee_method' => $validated['shipping_fee_method'] ?? null,
            'reimbursement_instructions' => $validated['reimbursement_instructions'] ?? null,
            'deadline_at' => $validated['deadline_at'] ?? null,
            'merchant_notes' => $validated['merchant_notes'] ?? null,
        ];

        try {
            $case = $this->returnService->saveReturnInstructions(
                caseId: $id,
                actorId: $actor->id,
                orgId: $actor->organizationId,
                data: $data
            );

            return ApiResponse::success($case, 200, 'Instruksi pengembalian barang berhasil disimpan.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_RETURN_INSTRUCTION_FAILED', $e->getMessage(), 422);
        }
    }

    public function confirmReturnReceipt(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'received_at' => 'nullable|date',
            'received_by' => 'nullable|string|max:100',
            'quantity_received' => 'nullable|integer|min:1',
            'package_condition' => 'nullable|string|max:100',
            'condition_upon_arrival' => 'nullable|string|max:100',
            'receipt_proof_ref' => 'nullable|string|max:255',
            'proof_url' => 'nullable|string|max:255',
            'receipt_notes' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:RECEIVED,DISPUTED_NOT_RECEIVED',
            'dispute_reason' => 'nullable|string|max:1000',
        ]);

        $data = [
            'received_at' => $validated['received_at'] ?? null,
            'received_by' => $validated['received_by'] ?? null,
            'quantity_received' => $validated['quantity_received'] ?? 1,
            'package_condition' => $validated['package_condition'] ?? $validated['condition_upon_arrival'] ?? 'BAIK_TERSEGEL',
            'receipt_proof_ref' => $validated['receipt_proof_ref'] ?? $validated['proof_url'] ?? null,
            'receipt_notes' => $validated['receipt_notes'] ?? $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'RECEIVED',
            'dispute_reason' => $validated['dispute_reason'] ?? null,
        ];

        try {
            $case = $this->returnService->confirmReturnReceipt(
                caseId: $id,
                actorId: $actor->id,
                orgId: $actor->organizationId,
                data: $data
            );

            return ApiResponse::success($case, 200, 'Konfirmasi penerimaan barang retur berhasil disimpan.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_RETURN_RECEIPT_FAILED', $e->getMessage(), 422);
        }
    }

    public function submitReturnInspection(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'inspected_at' => 'nullable|date',
            'inspected_by' => 'nullable|string|max:100',
            'quantity_inspected' => 'nullable|integer|min:1',
            'quantity_approved' => 'nullable|integer|min:0',
            'item_condition' => 'nullable|string|max:100',
            'physical_condition' => 'nullable|string|max:100',
            'is_sku_matched' => 'nullable|boolean',
            'sku_match' => 'nullable|boolean',
            'is_issue_matched' => 'nullable|boolean',
            'is_components_complete' => 'nullable|boolean',
            'inspection_outcome' => 'required|string|in:MATCHED,PARTIAL,MISMATCH',
            'inspection_notes' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:1000',
            'evidence_refs' => 'nullable|array',
            'proof_urls' => 'nullable|array',
        ]);

        $data = [
            'inspected_at' => $validated['inspected_at'] ?? null,
            'inspected_by' => $validated['inspected_by'] ?? null,
            'quantity_inspected' => $validated['quantity_inspected'] ?? 1,
            'quantity_approved' => array_key_exists('quantity_approved', $validated) ? (int) $validated['quantity_approved'] : 1,
            'item_condition' => $validated['item_condition'] ?? $validated['physical_condition'] ?? 'SESUAI_SPESIFIKASI',
            'is_sku_matched' => $validated['is_sku_matched'] ?? $validated['sku_match'] ?? true,
            'is_issue_matched' => $validated['is_issue_matched'] ?? true,
            'is_components_complete' => $validated['is_components_complete'] ?? true,
            'inspection_outcome' => $validated['inspection_outcome'],
            'inspection_notes' => $validated['inspection_notes'] ?? $validated['notes'] ?? null,
            'evidence_refs' => $validated['evidence_refs'] ?? $validated['proof_urls'] ?? [],
        ];

        try {
            $case = $this->returnService->submitReturnInspection(
                caseId: $id,
                actorId: $actor->id,
                orgId: $actor->organizationId,
                data: $data
            );

            return ApiResponse::success($case, 200, 'Hasil pemeriksaan barang retur berhasil disimpan.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_RETURN_INSPECTION_FAILED', $e->getMessage(), 422);
        }
    }

    public function shipReplacement(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'shipping_method' => 'nullable|string|in:GOSEND,KURIR_TOKO',
            'courier_name' => 'required|string|max:100',
            'driver_name' => 'nullable|string|max:100',
            'driver_phone' => 'nullable|string|max:50',
            'tracking_number' => 'nullable|string|max:100',
            'tracking_url' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $case = \Illuminate\Support\Facades\DB::transaction(function () use ($id, $actor, $validated) {
                /** @var \App\Models\AfterSalesCase $case */
                $case = \App\Models\AfterSalesCase::where('id', $id)->lockForUpdate()->firstOrFail();

                if ($case->owner_org_id !== $actor->organizationId) {
                    throw new \Illuminate\Auth\Access\AuthorizationException("Akses ditolak: Kasus ini bukan milik toko Anda.");
                }

                if ($case->main_status !== 'IN_RESOLUTION' && $case->main_status !== 'AWAITING_RETURN') {
                    throw new \InvalidArgumentException("Pengiriman unit pengganti hanya dapat dilakukan pada tahap resolusi (IN_RESOLUTION).");
                }

                $now = now();
                $shippingMethod = $validated['shipping_method'] ?? (str_contains(strtolower($validated['courier_name']), 'gosend') ? 'GOSEND' : 'KURIR_TOKO');
                $courierName = trim($validated['courier_name']);
                $driverName = !empty($validated['driver_name']) ? trim($validated['driver_name']) : null;
                $driverPhone = !empty($validated['driver_phone']) ? trim($validated['driver_phone']) : null;
                $trackingNumber = !empty($validated['tracking_number']) ? trim($validated['tracking_number']) : ($driverPhone ?: null);
                $trackingUrl = !empty($validated['tracking_url']) ? trim($validated['tracking_url']) : null;
                $notes = !empty($validated['notes']) ? trim($validated['notes']) : null;

                // Ensure resolution exists
                $resolution = \App\Models\CaseResolution::where('case_id', $case->id)->first();
                if (!$resolution) {
                    $resolution = \App\Models\CaseResolution::create([
                        'case_id' => $case->id,
                        'solution_code' => 'REPLACEMENT',
                        'status' => 'IN_PROGRESS',
                        'started_at' => $now,
                    ]);
                } else {
                    $resolution->update(['status' => 'IN_PROGRESS']);
                }

                // Update or create external ref
                $ref = \App\Models\CaseExternalRef::where('case_id', $case->id)
                    ->where('purpose', 'REPLACEMENT_FULFILLMENT')
                    ->first();

                if ($ref) {
                    $ref->update([
                        'external_id' => $driverPhone ?: ($trackingNumber ?: $ref->external_id),
                        'external_status' => 'SHIPPED',
                        'last_checked_at' => $now,
                    ]);
                } else {
                    $ref = \App\Models\CaseExternalRef::create([
                        'case_id' => $case->id,
                        'resolution_id' => $resolution->id,
                        'target_service' => '05A',
                        'external_id' => $driverPhone ?: ($trackingNumber ?: ('REP-' . strtoupper(\Illuminate\Support\Str::random(10)))),
                        'external_status' => 'SHIPPED',
                        'purpose' => 'REPLACEMENT_FULFILLMENT',
                        'last_checked_at' => $now,
                    ]);
                }

                // If order-barang-service has order_replacements, update it too
                try {
                    $orderReplacement = \Illuminate\Support\Facades\DB::connection('order_barang_db')
                        ->table('order_replacements')
                        ->where('case_id', $case->id)
                        ->first();
                    if ($orderReplacement) {
                        \Illuminate\Support\Facades\DB::connection('order_barang_db')
                            ->table('order_replacements')
                            ->where('case_id', $case->id)
                            ->update([
                                'status' => 'SHIPPED',
                                'courier_name' => $courierName,
                                'waybill_number' => $trackingUrl ?: ($driverPhone ?: $trackingNumber),
                                'shipped_at' => $now,
                                'updated_at' => $now,
                            ]);
                    }
                } catch (\Throwable $ignored) {}

                $case->main_status = 'IN_RESOLUTION';
                $case->save();

                $driverInfo = $driverName ? " (Driver: {$driverName}" . ($driverPhone ? " - {$driverPhone}" : "") . ")" : "";
                $reasonText = "Toko telah mengirimkan unit baru via {$courierName}{$driverInfo}" . ($trackingUrl ? " (Live Tracking: {$trackingUrl})" : "");

                $lastSeq = (int) $case->events()->max('sequence');
                \App\Models\CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $lastSeq + 1,
                    'event_type' => 'REPLACEMENT_SHIPPED',
                    'from_state' => 'IN_RESOLUTION',
                    'to_state' => 'IN_RESOLUTION',
                    'actor_kind' => 'MERCHANT',
                    'actor_id' => $actor->id,
                    'reason' => $reasonText,
                    'data_json' => [
                        'shipping_method' => $shippingMethod,
                        'courier_name' => $courierName,
                        'driver_name' => $driverName,
                        'driver_phone' => $driverPhone,
                        'tracking_number' => $trackingNumber,
                        'tracking_url' => $trackingUrl,
                        'notes' => $notes,
                        'shipping_fee' => 0,
                    ],
                    'occurred_at' => $now,
                ]);

                return $case->load(['items', 'evidence', 'events', 'returnInstruction', 'returnShipment', 'returnReceipt', 'returnInspection', 'externalRefs', 'resolution']);
            });

            return ApiResponse::success($case, 200, 'Unit pengganti baru berhasil dikirim via ' . $validated['courier_name'] . '.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_SHIP_REPLACEMENT_FAILED', $e->getMessage(), 422);
        }
    }
}

