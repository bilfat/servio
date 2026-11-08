<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Warranties\WarrantyService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BusinessWarrantyOptionController
{
    public function __construct(
        private readonly WarrantyService $warrantyService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $orgType = $actor->isMerchant() ? 'MERCHANT' : 'PROVIDER';
        $options = $this->warrantyService->listBusinessOptions($orgType, $actor->organizationId);

        return ApiResponse::success($options);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'name' => 'required|string|max:128',
            'duration_days' => 'required|integer|min:1',
            'coverage_text' => 'required|string|max:3000',
            'exclusion_text' => 'nullable|string|max:3000',
        ]);

        $orgType = $actor->isMerchant() ? 'MERCHANT' : 'PROVIDER';

        try {
            $option = $this->warrantyService->createOption(
                orgType: $orgType,
                orgId: $actor->organizationId,
                name: $validated['name'],
                durationDays: (int) $validated['duration_days'],
                coverage: $validated['coverage_text'],
                exclusion: $validated['exclusion_text'] ?? null,
                actorId: $actor->id
            );

            return ApiResponse::success($option, 201, 'Opsi garansi berhasil dibuat.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_OPTION_CREATE_FAILED', $e->getMessage(), 422);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $option = $this->warrantyService->getOptionById($id, $actor->organizationId);
        if (!$option) {
            return ApiResponse::error('AFTER_SALES_OPTION_NOT_FOUND', 'Opsi garansi tidak ditemukan.', 404);
        }

        return ApiResponse::success($option);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'name' => 'required|string|max:128',
            'duration_days' => 'required|integer|min:1',
            'coverage_text' => 'required|string|max:3000',
            'exclusion_text' => 'nullable|string|max:3000',
        ]);

        try {
            $option = $this->warrantyService->updateOption(
                optionId: $id,
                orgId: $actor->organizationId,
                name: $validated['name'],
                durationDays: (int) $validated['duration_days'],
                coverage: $validated['coverage_text'],
                exclusion: $validated['exclusion_text'] ?? null,
                actorId: $actor->id
            );

            return ApiResponse::success($option, 200, 'Versi baru opsi garansi berhasil diterbitkan.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_OPTION_UPDATE_FAILED', $e->getMessage(), 422);
        }
    }

    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        try {
            $option = $this->warrantyService->toggleOptionStatus($id, $actor->organizationId);
            return ApiResponse::success($option, 200, 'Status opsi garansi berhasil diperbarui.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_OPTION_TOGGLE_FAILED', $e->getMessage(), 422);
        }
    }
}

