<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewCategorySuggestionRequest;
use App\Http\Requests\SubmitCategorySuggestionRequest;
use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CategoryRequestController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * R01: GET /api/v1/category-requests
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $result = $this->categoryService->listRequests($actor, $request->query());

        return ApiResponse::success($result['items'], 'CATEGORY_REQUESTS_LOADED', 200, [
            'pagination' => $result['pagination'] ?? [],
        ]);
    }

    /**
     * R02: GET /api/v1/category-requests/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $categoryRequest = $this->categoryService->getRequest($actor, $id);

        return ApiResponse::success($categoryRequest, 'CATEGORY_REQUEST_LOADED');
    }

    /**
     * R03: POST /api/v1/category-requests
     */
    public function store(SubmitCategorySuggestionRequest $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $result = $this->categoryService->submitRequest($actor, $request->validated());

        return ApiResponse::success($result, 'CATEGORY_REQUEST_CREATED', 201);
    }

    /**
     * R04: PATCH /api/v1/category-requests/{id}/review
     */
    public function review(ReviewCategorySuggestionRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $result = $this->categoryService->reviewRequest($actor, $id, $request->validated(), $expectedVersion);

        return ApiResponse::success($result, 'CATEGORY_REQUEST_REVIEWED');
    }

    private function parseIfMatch(Request $request): int
    {
        $header = $request->header('If-Match');
        if ($header === null || $header === '') {
            throw new HttpException(428, 'Header If-Match berisi lock_version wajib disertakan.');
        }

        return (int) trim($header, '" ');
    }
}
