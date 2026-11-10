<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Cases\CaseService;
use App\Domain\AfterSales\Decisions\DecisionService;
use App\Domain\AfterSales\Returns\PhysicalReturnService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class CustomerCaseController
{
    public function __construct(
        private readonly CaseService $caseService,
        private readonly DecisionService $decisionService,
        private readonly PhysicalReturnService $returnService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $type = $request->query('type');
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 15);

        $paginator = $this->caseService->listCustomerCases($actor->id, $type, $status, $perPage);

        return ApiResponse::success($paginator->items(), 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'source_order_kind' => 'required|string|in:GOODS,SERVICE',
            'source_order_id' => 'required|string',
            'case_type' => 'required|string|in:GOODS_WARRANTY,SERVICE_WARRANTY,GOODS_RETURN',
            'initial_solution' => 'required|string|in:REPLACEMENT,REWORK,REFUND',
            'reason_code' => 'required|string|max:64',
            'description' => 'required|string|max:2000',
            'items' => 'nullable|array',
            'items.*.order_item_id' => 'nullable|string',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.catalog_snapshot' => 'nullable|array',
            'entitlement_id' => 'nullable|string',
            'source_merchant_order_id' => 'nullable|string',
            'owner_org_id' => 'nullable|string',
            'owner_org_type' => 'nullable|string|in:MERCHANT,PROVIDER',
            'evidence_data' => 'nullable|array',
            'evidence_data.*.media_ref' => 'required|string',
            'evidence_data.*.content_type' => 'nullable|string',
            'evidence_data.*.size_bytes' => 'nullable|integer',
        ]);

        // Strict: Reject duplicate order_item_id in a single submission
        if (!empty($validated['items'])) {
            $seenItems = [];
            foreach ($validated['items'] as $item) {
                $itemId = trim((string) ($item['order_item_id'] ?? ''));
                if (!empty($itemId)) {
                    if (isset($seenItems[$itemId])) {
                        return ApiResponse::error(
                            'DUPLICATE_ORDER_ITEM',
                            "Item pesanan '{$itemId}' tidak boleh dicantumkan lebih dari satu kali dalam satu pengajuan (DUPLICATE_ORDER_ITEM).",
                            422
                        );
                    }
                    $seenItems[$itemId] = true;
                }
            }
        }

        try {
            $case = $this->caseService->submitCase(
                customerId: $actor->id,
                sourceOrderKind: $validated['source_order_kind'],
                sourceOrderId: $validated['source_order_id'],
                caseType: $validated['case_type'],
                initialSolution: $validated['initial_solution'],
                reasonCode: $validated['reason_code'],
                description: $validated['description'],
                items: $validated['items'] ?? [],
                entitlementId: $validated['entitlement_id'] ?? null,
                sourceMerchantOrderId: $validated['source_merchant_order_id'] ?? null,
                ownerOrgId: $validated['owner_org_id'] ?? null,
                ownerOrgType: $validated['owner_org_type'] ?? null,
                evidenceData: $validated['evidence_data'] ?? []
            );

            return ApiResponse::success($case, 201, 'Pengajuan berhasil dibuat.');
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_SUBMIT_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        try {
            $case = $this->caseService->getCaseDetail($id, $actor->id);
            return ApiResponse::success($case);
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_CASE_NOT_FOUND',
                $e->getMessage(),
                404
            );
        }
    }

    public function addEvidence(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'media_ref' => 'required|string',
            'content_type' => 'required|string',
            'size_bytes' => 'required|integer',
            'sha256' => 'nullable|string',
        ]);

        try {
            $evidence = $this->caseService->addEvidence(
                caseId: $id,
                uploaderId: $actor->id,
                mediaRef: $validated['media_ref'],
                contentType: $validated['content_type'],
                sizeBytes: (int) $validated['size_bytes'],
                sha256: $validated['sha256'] ?? null,
                actorOrgId: $actor->organizationId
            );

            return ApiResponse::success($evidence, 201, 'Lampiran bukti berhasil ditambahkan.');
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_EVIDENCE_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function submitConsent(Request $request, string $id, string $proposalId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'decision' => 'required|string|in:ACCEPT,DECLINE',
            'reason' => 'nullable|string|max:1000',
        ]);

        $idempotencyKey = $request->header('Idempotency-Key');

        try {
            $case = $this->decisionService->handleCustomerConsent(
                caseId: $id,
                proposalId: $proposalId,
                customerId: $actor->id,
                decision: $validated['decision'],
                reason: $validated['reason'] ?? null,
                idempotencyKey: $idempotencyKey
            );

            return ApiResponse::success($case, 200, 'Tanggapan persetujuan solusi berhasil disimpan.');
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_CONSENT_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function reportIssue(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            $case = $this->caseService->reportIssueToSupport(
                caseId: $id,
                customerId: $actor->id,
                reason: $validated['reason']
            );

            return ApiResponse::success($case, 200, 'Laporan sengketa/kendala berhasil dicatat dengan status PENDING_SUPPORT_INTEGRATION.');
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_REPORT_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function submitReturnShipment(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'courier_name' => 'required|string|max:100',
            'tracking_number' => 'nullable|string|max:100',
            'shipped_at' => 'nullable|date',
            'shipping_fee_paid_idr' => 'nullable|numeric|min:0',
            'shipping_fee_paid' => 'nullable|numeric|min:0',
            'shipping_receipt_ref' => 'nullable|string|max:255',
            'proof_receipt_url' => 'nullable|string|max:255',
            'fee_payment_proof_ref' => 'nullable|string|max:255',
            'reimbursement_proof_url' => 'nullable|string|max:255',
            'customer_notes' => 'nullable|string|max:1000',
        ]);

        $data = [
            'courier_name' => $validated['courier_name'],
            'tracking_number' => $validated['tracking_number'] ?? null,
            'shipped_at' => $validated['shipped_at'] ?? null,
            'shipping_fee_paid_idr' => $validated['shipping_fee_paid_idr'] ?? $validated['shipping_fee_paid'] ?? 0,
            'shipping_receipt_ref' => $validated['shipping_receipt_ref'] ?? $validated['proof_receipt_url'] ?? null,
            'fee_payment_proof_ref' => $validated['fee_payment_proof_ref'] ?? $validated['reimbursement_proof_url'] ?? null,
            'customer_notes' => $validated['customer_notes'] ?? null,
        ];

        try {
            $case = $this->returnService->submitReturnShipment(
                caseId: $id,
                customerId: $actor->id,
                data: $data
            );

            return ApiResponse::success($case, 200, 'Data resi dan konfirmasi pengiriman barang retur berhasil disimpan.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error(
                'AFTER_SALES_RETURN_SHIPMENT_FAILED',
                $e->getMessage(),
                422
            );
        }
    }

    public function confirmCompletion(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        try {
            $case = \Illuminate\Support\Facades\DB::transaction(function () use ($id, $actor, $validated) {
                /** @var \App\Models\AfterSalesCase $case */
                $case = \App\Models\AfterSalesCase::where('id', $id)->lockForUpdate()->firstOrFail();

                // Anti-IDOR: verify customer owns the case
                if ($case->customer_id !== $actor->id) {
                    throw new \Illuminate\Auth\Access\AuthorizationException("Akses ditolak: Kasus ini bukan milik akun Anda.");
                }

                if ($case->main_status === 'COMPLETED') {
                    return $case;
                }

                if ($case->main_status !== 'IN_RESOLUTION') {
                    throw new \InvalidArgumentException("Hanya kasus yang sedang dalam penyelesaian (IN_RESOLUTION) yang dapat diverifikasi selesai.");
                }

                $now = now();

                // Update resolution record if exists
                $resolution = \App\Models\CaseResolution::where('case_id', $case->id)->first();
                if ($resolution) {
                    $resolution->update([
                        'status' => 'VERIFIED_DONE',
                        'evidence_ref' => 'CUSTOMER_VERIFIED_COMPLETION',
                    ]);
                }

                $case->main_status = 'COMPLETED';
                $case->resolved_at = $now;
                $case->version += 1;
                $case->save();

                // Transition linked warranty entitlement to CONSUMED if remaining quantity is 0
                if ($case->entitlement_id) {
                    /** @var \App\Models\OrderWarrantyEntitlement|null $entModel */
                    $entModel = \App\Models\OrderWarrantyEntitlement::where('id', $case->entitlement_id)->lockForUpdate()->first();
                    if ($entModel && $entModel->remaining_quantity <= 0) {
                        $entModel->update(['status' => 'CONSUMED']);
                    }
                }

                $lastSeq = (int) $case->events()->max('sequence');
                \App\Models\CaseEvent::create([
                    'case_id' => $case->id,
                    'sequence' => $lastSeq + 1,
                    'event_type' => 'CASE_COMPLETED',
                    'from_state' => 'IN_RESOLUTION',
                    'to_state' => 'COMPLETED',
                    'actor_kind' => 'CUSTOMER',
                    'actor_id' => $actor->id,
                    'reason' => $validated['notes'] ?? 'Konsumen telah mengonfirmasi penerimaan solusi dan menutup kasus secara sah.',
                    'data_json' => [
                        'verified_by' => 'CUSTOMER',
                        'rating' => $validated['rating'] ?? null,
                    ],
                    'occurred_at' => $now,
                ]);

                return $case;
            });

            return ApiResponse::success($case, 200, 'Verifikasi selesai! Kasus purnajual berhasil diselesaikan.');
        } catch (\Illuminate\Auth\Access\AuthorizationException $e) {
            return ApiResponse::error('AFTER_SALES_FORBIDDEN', $e->getMessage(), 403);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return ApiResponse::error('AFTER_SALES_CASE_NOT_FOUND', $e->getMessage(), 404);
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_CONFIRM_FAILED', $e->getMessage(), 422);
        }
    }
}

