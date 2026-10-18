<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangeCategoryStatusRequest;
use App\Http\Requests\CreateCategoryRequest;
use App\Http\Requests\DeleteCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Services\CategoryService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CategoryController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * C02: GET /api/v1/categories/tree
     */
    public function tree(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();
        $master = $request->query('master');
        $includeInactive = filter_var($request->query('include_inactive', false), FILTER_VALIDATE_BOOLEAN);

        $tree = $this->categoryService->getTree($actor, $master, $includeInactive);

        return ApiResponse::success($tree, 'CATEGORY_TREE_LOADED');
    }

    /**
     * C03: GET /api/v1/categories
     */
    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();

        $result = $this->categoryService->listCategories($actor, $request->query());

        return ApiResponse::success($result['items'], 'CATEGORIES_LOADED', 200, [
            'pagination' => $result['pagination'] ?? [],
        ]);
    }

    /**
     * C04: GET /api/v1/categories/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor') ?? AuthenticatedActor::guest();

        $category = $this->categoryService->getCategory($actor, $id);

        return ApiResponse::success($category, 'CATEGORY_LOADED');
    }

    /**
     * C05: POST /api/v1/categories
     */
    public function store(CreateCategoryRequest $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $category = $this->categoryService->createCategory($actor, $request->validated());

        return ApiResponse::success($category, 'CATEGORY_CREATED', 201);
    }

    /**
     * C06: PATCH /api/v1/categories/{id}
     */
    public function update(UpdateCategoryRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $category = $this->categoryService->updateCategory($actor, $id, $request->validated(), $expectedVersion);

        return ApiResponse::success($category, 'CATEGORY_UPDATED');
    }

    /**
     * C07: PATCH /api/v1/categories/{id}/status
     */
    public function changeStatus(ChangeCategoryStatusRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $result = $this->categoryService->changeCategoryStatus(
            $actor,
            $id,
            $request->validated('status'),
            $request->validated('reason'),
            $expectedVersion
        );

        return ApiResponse::success($result, 'CATEGORY_STATUS_CHANGED');
    }

    /**
     * C08: DELETE /api/v1/categories/{id}
     */
    public function destroy(DeleteCategoryRequest $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');
        $expectedVersion = $this->parseIfMatch($request);

        $result = $this->categoryService->deleteCategory(
            $actor,
            $id,
            $request->validated('reason'),
            $expectedVersion
        );

        return ApiResponse::success($result, 'CATEGORY_NODE_HARD_DELETED');
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
