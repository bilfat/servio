<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompletionAndSettlementService;
use App\Services\FinanceEventIngestionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalOrderJasaController
{
    public function __construct(
        private readonly FinanceEventIngestionService $financeEventService,
        private readonly CompletionAndSettlementService $completionService,
    ) {}

    /**
     * Ingest events emitted by Finance Service 06
     */
    public function handleFinanceEvent(Request $request): JsonResponse
    {
        $result = $this->financeEventService->ingestFinanceEvent($request->all());

        return ApiResponse::success($result, 200);
    }

    /**
     * S2S internal order snapshot query
     */
    public function show(Request $request, string $id): JsonResponse
    {
        if ($request->query('projection') === 'eligibility') {
            $order = ServiceOrder::select([
                'id',
                'customer_id',
                'provider_org_id',
                'service_offering_id',
                'service_snapshot',
                'recipient_snapshot',
                'status',
                'created_at',
            ])->find($id);

            if (!$order) {
                return ApiResponse::error('ORDER_JASA_NOT_FOUND', 'Pesanan jasa tidak ditemukan.', 404);
            }

            $serviceSnapshot = is_array($order->service_snapshot) ? $order->service_snapshot : [];
            $recipientSnapshot = is_array($order->recipient_snapshot) ? $order->recipient_snapshot : [];

            $serviceTitle = $serviceSnapshot['title']
                ?? $serviceSnapshot['name']
                ?? $serviceSnapshot['display_name']
                ?? 'Layanan Jasa';

            return ApiResponse::success([
                'id' => $order->id,
                'customer_id' => $order->customer_id,
                'provider_org_id' => $order->provider_org_id,
                'service_offering_id' => $order->service_offering_id,
                'service_snapshot' => [
                    'id' => $serviceSnapshot['id'] ?? $order->service_offering_id,
                    'title' => $serviceTitle,
                    'name' => $serviceSnapshot['name'] ?? $serviceTitle,
                ],
                'customer_name' => $recipientSnapshot['name'] ?? $recipientSnapshot['recipient_name'] ?? null,
                'status' => $order->status,
                'created_at' => $order->created_at?->toIso8601String(),
            ], 200);
        }

        $order = ServiceOrder::with([
            'booking.activeAssignment.attempt',
            'visit',
            'execution',
            'paymentObligations.attempts',
            'issues',
        ])->find($id);

        if (!$order) {
            return ApiResponse::error('ORDER_JASA_NOT_FOUND', 'Pesanan jasa tidak ditemukan.', 404);
        }

        return ApiResponse::success($order, 200);
    }

    /**
     * Trigger release of matured 120-hour escrow funds
     */
    public function processMaturedHeldFunds(Request $request): JsonResponse
    {
        $count = $this->completionService->releaseMaturedFunds();

        return ApiResponse::success([
            'released_count' => $count,
            'message' => "Berhasil memproses pembebasan {$count} dana escrow matang.",
        ], 200);
    }

    /**
     * Create real non-commercial Rp0 warranty rework job for Phase 07.
     */
    public function createWarrantyJob(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'case_id' => 'required|string',
            'source_order_id' => 'required|string',
            'provider_org_id' => 'required|string',
            'customer_id' => 'required|string',
            'scope_description' => 'required|string',
            'worker_id' => 'nullable|string',
        ]);

        $existing = \App\Models\ServiceWarrantyJob::where('case_id', $validated['case_id'])->first();
        if ($existing) {
            return ApiResponse::success($existing, 200);
        }

        try {
            $job = \App\Models\ServiceWarrantyJob::create([
                'case_id' => $validated['case_id'],
                'source_order_id' => $validated['source_order_id'],
                'provider_org_id' => $validated['provider_org_id'],
                'customer_id' => $validated['customer_id'],
                'badge' => 'GARANSI',
                'scope_description' => $validated['scope_description'],
                'price_idr' => 0,
                'status' => 'ASSIGNED',
                'worker_id' => $validated['worker_id'] ?? 'acfdfc27-9ba5-472f-bec1-3c372f47fff6',
            ]);

            return ApiResponse::success($job, 201);
        } catch (\Illuminate\Database\QueryException $e) {
            // Concurrent race condition caught by DB unique constraint
            $existing = \App\Models\ServiceWarrantyJob::where('case_id', $validated['case_id'])->first();
            if ($existing) {
                return ApiResponse::success($existing, 200);
            }
            throw $e;
        }
    }

    /**
     * Read real warranty job record.
     */
    public function showWarrantyJob(string $id): JsonResponse
    {
        $job = \App\Models\ServiceWarrantyJob::find($id)
            ?? \App\Models\ServiceWarrantyJob::where('case_id', $id)->first();

        if (!$job) {
            return ApiResponse::error('WARRANTY_JOB_NOT_FOUND', 'Data warranty job tidak ditemukan.', 404);
        }

        return ApiResponse::success($job, 200);
    }

    /**
     * Complete warranty job with authentic work evidence.
     */
    public function completeWarrantyJob(Request $request, string $id): JsonResponse
    {
        $job = \App\Models\ServiceWarrantyJob::find($id)
            ?? \App\Models\ServiceWarrantyJob::where('case_id', $id)->first();

        if (!$job) {
            return ApiResponse::error('WARRANTY_JOB_NOT_FOUND', 'Data warranty job tidak ditemukan.', 404);
        }

        $validated = $request->validate([
            'completion_evidence' => 'required|string',
        ]);

        $job->update([
            'status' => 'COMPLETED',
            'completion_evidence' => $validated['completion_evidence'],
            'completed_at' => now(),
        ]);

        return ApiResponse::success($job, 200);
    }
}

