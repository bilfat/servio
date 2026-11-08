<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Models\AfterSalesCase;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCaseController
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $status = $request->query('status');
        $sla = $request->query('response_state');
        $perPage = (int) $request->query('per_page', 20);

        $query = AfterSalesCase::with(['items', 'resolution', 'latestProposal']);

        if ($type) {
            $query->where('case_type', strtoupper($type));
        }

        if ($status) {
            $query->where('main_status', strtoupper($status));
        }

        if ($sla) {
            $query->where('response_state', strtoupper($sla));
        }

        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return ApiResponse::success($paginator->items(), 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}

