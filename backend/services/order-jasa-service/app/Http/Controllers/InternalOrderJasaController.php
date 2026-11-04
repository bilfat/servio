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
}

