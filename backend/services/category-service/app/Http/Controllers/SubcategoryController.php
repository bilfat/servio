<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeSubcategoryStatusRequest;
use App\Http\Requests\CreateSubcategoryRequest;
use App\Http\Requests\DeleteSubcategoryRequest;
use App\Http\Requests\UpdateSubcategoryRequest;
use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SubcategoryController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * S01: GET /api/v1/subcategories
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();

        $result = $this->categoryService->listSubcategories($actor, $request->query());

        return ApiResponse::success($result['items'], 'SUBCATEGORIES_LOADED', 200, [
            'pagination' => $result['pagination'] ?? [],
        ]);
    }

    /**
     * S02: GET /api/v1/subcategories/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();

        $subcategory = $this->categoryService->getSubcategory($actor, $id);

        return ApiResponse::success($subcategory, 'SUBCATEGORY_LOADED');
    }

    /**
     * S03: POST /api/v1/subcategories
     */
    public function store(CreateSubcategoryRequest $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $subcategory = $this->categoryService->createSubcategory($actor, $request->validated());

        return ApiResponse::success($subcategory, 'SUBCATEGORY_CREATED', 201);
    }

    /**
     * S04: PATCH /api/v1/subcategories/{id}
     */
    public function update(UpdateSubcategoryRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $subcategory = $this->categoryService->updateSubcategory($actor, $id, $request->validated(), $expectedVersion);

        return ApiResponse::success($subcategory, 'SUBCATEGORY_UPDATED');
    }

    /**
     * S05: PATCH /api/v1/subcategories/{id}/status
     */
    public function changeStatus(ChangeSubcategoryStatusRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $result = $this->categoryService->changeSubcategoryStatus(
            $actor,
            $id,
            $request->validated('status'),
            $request->validated('reason'),
            $expectedVersion
        );

        return ApiResponse::success($result, 'SUBCATEGORY_STATUS_CHANGED');
    }

    /**
     * S06: DELETE /api/v1/subcategories/{id}
     */
    public function destroy(DeleteSubcategoryRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $result = $this->categoryService->deleteSubcategory(
            $actor,
            $id,
            $request->validated('reason'),
            $expectedVersion
        );

        return ApiResponse::success($result, 'SUBCATEGORY_NODE_HARD_DELETED');
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
