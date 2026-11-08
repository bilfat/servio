<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Reviews\ReviewService;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BusinessReviewController
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $perPage = (int) $request->query('per_page', 15);
        $paginator = $this->reviewService->listBusinessReviewInbox($actor->organizationId, $perPage);
        $summary = $this->reviewService->getBusinessReviewSummary($actor->organizationId, $actor->organizationType);

        return ApiResponse::success($paginator->items(), 200, [
            'summary' => $summary,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function reply(Request $request, string $reviewEntryId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'text' => 'required|string|max:2000',
        ]);

        try {
            $reply = $this->reviewService->replyToReview(
                reviewEntryId: $reviewEntryId,
                businessOrgId: $actor->organizationId,
                actorId: $actor->id,
                text: $validated['text']
            );

            return ApiResponse::success($reply, 200, 'Balasan resmi berhasil disimpan.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_REPLY_FAILED', $e->getMessage(), 422);
        }
    }
}

