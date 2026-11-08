<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Domain\AfterSales\Reviews\ReviewService;
use App\Models\ReviewEntry;
use App\Support\ApiResponse;
use App\Support\AuthenticatedActor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AdminReviewController
{
    public function __construct(
        private readonly ReviewService $reviewService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 20);

        $query = ReviewEntry::with(['submission', 'reply', 'moderations']);

        if ($status) {
            $query->where('status', strtoupper($status));
        }

        $paginator = $query->orderBy('submitted_at', 'desc')->paginate($perPage);
        $this->reviewService->enrichReviewEntries($paginator->items());

        return ApiResponse::success($paginator->items(), 200, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function moderate(Request $request, string $reviewId): JsonResponse
    {
        /** @var AuthenticatedActor $actor */
        $actor = $request->attributes->get('actor');

        $validated = $request->validate([
            'action' => 'required|string|in:HIDE,RESTORE',
            'reason' => 'required|string|max:1000',
        ]);

        try {
            $moderation = $this->reviewService->moderateReview(
                reviewEntryId: $reviewId,
                adminId: $actor->id,
                action: $validated['action'],
                reason: $validated['reason']
            );

            return ApiResponse::success($moderation, 200, 'Tindakan moderasi ulasan berhasil dicatat.');
        } catch (Throwable $e) {
            return ApiResponse::error('AFTER_SALES_MODERATION_FAILED', $e->getMessage(), 422);
        }
    }
}

