<?php

namespace App\Http\Controllers;

use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryAuditController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * A01: GET /api/v1/category-audit
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $result = $this->categoryService->listAuditLogs($actor, $request->query());

        return ApiResponse::success($result['items'], 'CATEGORY_AUDIT_LOGS_LOADED', 200, [
            'pagination' => $result['pagination'] ?? [],
        ]);
    }
}
