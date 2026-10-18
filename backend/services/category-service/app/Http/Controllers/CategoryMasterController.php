<?php

namespace App\Http\Controllers;

use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryMasterController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * C01: GET /api/v1/category-masters
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();

        $masters = $this->categoryService->getMasters($actor);

        return ApiResponse::success($masters, 'CATEGORY_MASTERS_LOADED');
    }
}
