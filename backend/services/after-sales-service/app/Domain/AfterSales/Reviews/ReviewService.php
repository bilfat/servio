<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Reviews;

use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Models\OrderWarrantyEntitlement;
use App\Models\OutboxEvent;
use App\Models\ReviewEntry;
use App\Models\ReviewModeration;
use App\Models\ReviewReply;
use App\Models\ReviewSubmission;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ReviewService
{
    public function __construct(
        protected OrderEligibilityVerifierInterface $eligibilityVerifier
    ) {}

    public function submitReview(
        string $customerId,
        string $sourceKind, // GOODS or SERVICE
        string $sourceOrderId,
        array $ratings, // array of ['target_type' => 'PRODUCT'|'MERCHANT'|'SERVICE'|'PROVIDER', 'target_id' => ..., 'rating' => 1..5, 'text' => ..., 'source_item_key' => ..., 'media_refs' => ...]
        ?string $sourceMerchantOrderId = null,
        ?string $idempotencyKey = null
    ): ReviewSubmission {
        $sourceKind = strtoupper($sourceKind);

        // 1. Authoritative Order Ownership and Eligibility Verification
        $eligibility = $this->eligibilityVerifier->verifyOrderEligibility(
            customerId: $customerId,
            orderKind: $sourceKind,
            orderId: $sourceOrderId,
            subOrderId: $sourceMerchantOrderId,
            includeClaimedQuantities: false
        );

        if (!$eligibility->isValid) {
            throw new InvalidArgumentException($eligibility->errorMessage ?? "Verifikasi pesanan untuk ulasan gagal.");
        }

        // STRICT: Reviews ONLY permitted for fully COMPLETED orders
        $orderStatus = strtoupper($eligibility->orderStatus);
        if ($orderStatus !== 'COMPLETED') {
            throw new InvalidArgumentException("Ulasan hanya dapat dikirimkan untuk pesanan yang sudah berstatus COMPLETED (Status saat ini: {$orderStatus}). Status DELIVERED / RECEIVED tidak memenuhi syarat ulasan.");
        }

        // 2. Check duplicate submission (supporting multi-merchant suborders)
        $normalizedSubOrderId = $sourceMerchantOrderId ? trim($sourceMerchantOrderId) : '';
        $existingQuery = ReviewSubmission::where('customer_id', $customerId)
            ->where('source_kind', $sourceKind)
            ->where('source_order_id', $sourceOrderId)
            ->where('source_merchant_order_id', $normalizedSubOrderId);

        if ($existingQuery->exists()) {
            throw new RuntimeException("Ulasan untuk pesanan atau suborder ini sudah pernah dikirimkan (REVIEW_ALREADY_SUBMITTED).");
        }

        // 3. Compile authentic item and business targets from verified order
        $validItemIds = [];
        foreach ($eligibility->items as $it) {
            $validItemIds[(string) $it['item_id']] = true;
            $validItemIds[(string) $it['source_ref']] = true;
            if (isset($it['catalog_snapshot']['product_id'])) {
                $validItemIds[(string) $it['catalog_snapshot']['product_id']] = true;
            }
            if (isset($it['catalog_snapshot']['service_id'])) {
                $validItemIds[(string) $it['catalog_snapshot']['service_id']] = true;
            }
            if (isset($it['catalog_snapshot']['service_offering_id'])) {
                $validItemIds[(string) $it['catalog_snapshot']['service_offering_id']] = true;
            }
        }
        $validBusinessOrgId = $eligibility->ownerOrgId;

        // 4. Validate targets against verified order resources
        $hasProductOrService = false;
        $hasBusiness = false;
        $seenTargets = [];

        foreach ($ratings as $r) {
            $targetType = strtoupper($r['target_type'] ?? '');
            $targetId = trim((string) ($r['target_id'] ?? ''));
            $ratingVal = (int) ($r['rating'] ?? 0);

            if (empty($targetId)) {
                throw new InvalidArgumentException("Target ID ulasan tidak boleh kosong.");
            }

            // Absolute SERVIO Rule: Individual worker ratings are strictly prohibited
            if (in_array($targetType, ['WORKER', 'TECHNICIAN', 'WORKER_TECHNICIAN'], true)) {
                throw new InvalidArgumentException("Aturan mutlak SERVIO: Penilaian individu Worker tidak diizinkan dalam sistem ulasan.");
            }

            // Star range: 1..5
            if ($ratingVal < 1 || $ratingVal > 5) {
                throw new InvalidArgumentException("Nilai rating harus berada di antara 1 dan 5 bintang.");
            }

            // Deduplicate targets within single request
            $targetKey = $targetType . ':' . $targetId;
            if (isset($seenTargets[$targetKey])) {
                throw new InvalidArgumentException("Target rating '{$targetKey}' tidak boleh diduplikasi dalam satu pengajuan ulasan.");
            }
            $seenTargets[$targetKey] = true;

            if ($sourceKind === 'GOODS') {
                if (!in_array($targetType, ['PRODUCT', 'MERCHANT'], true)) {
                    throw new InvalidArgumentException("Target rating untuk pesanan barang hanya boleh PRODUCT atau MERCHANT.");
                }

                if ($targetType === 'PRODUCT') {
                    // Target ID must match an actual product in this order
                    if (!empty($validItemIds) && !isset($validItemIds[$targetId])) {
                        throw new InvalidArgumentException("Produk '{$targetId}' bukan merupakan item dalam pesanan ini.");
                    }
                    $hasProductOrService = true;
                }

                if ($targetType === 'MERCHANT') {
                    // Target ID must match the actual merchant organization
                    if ($targetId !== $validBusinessOrgId) {
                        throw new InvalidArgumentException("Merchant '{$targetId}' bukan pemilik dari pesanan suborder ini.");
                    }
                    $hasBusiness = true;
                }
            } elseif ($sourceKind === 'SERVICE') {
                if (!in_array($targetType, ['SERVICE', 'PROVIDER'], true)) {
                    throw new InvalidArgumentException("Target rating untuk pesanan jasa hanya boleh SERVICE atau PROVIDER.");
                }

                if ($targetType === 'SERVICE') {
                    if (!empty($validItemIds) && !isset($validItemIds[$targetId])) {
                        throw new InvalidArgumentException("Layanan jasa '{$targetId}' bukan merupakan layanan dalam pesanan ini.");
                    }
                    $hasProductOrService = true;
                }

                if ($targetType === 'PROVIDER') {
                    if ($targetId !== $validBusinessOrgId) {
                        throw new InvalidArgumentException("Penyedia jasa '{$targetId}' bukan penyedia dalam pesanan ini.");
                    }
                    $hasBusiness = true;
                }
            }
        }

        if (!$hasProductOrService) {
            throw new InvalidArgumentException("Formulir ulasan wajib menilai setidaknya satu Produk atau Jasa.");
        }
        if (!$hasBusiness) {
            throw new InvalidArgumentException("Formulir ulasan wajib menilai reputasi Toko/Merchant atau Penyedia Jasa.");
        }

        return DB::transaction(function () use (
            $customerId,
            $sourceKind,
            $sourceOrderId,
            $normalizedSubOrderId,
            $validBusinessOrgId,
            $ratings,
            $idempotencyKey,
            $eligibility
        ) {
            $now = now();
            $submission = ReviewSubmission::create([
                'source_kind' => $sourceKind,
                'source_order_id' => $sourceOrderId,
                'source_merchant_order_id' => $normalizedSubOrderId,
                'customer_id' => $customerId,
                'submitted_at' => $now,
                'idempotency_key' => $idempotencyKey,
            ]);

            $createdEntries = new \Illuminate\Database\Eloquent\Collection();
            foreach ($ratings as $r) {
                $targetType = strtoupper($r['target_type']);
                $targetId = (string) $r['target_id'];

                $entry = ReviewEntry::create([
                    'submission_id' => $submission->id,
                    'owner_org_id' => $validBusinessOrgId,
                    'source_item_key' => $r['source_item_key'] ?? null,
                    'target_type' => $targetType,
                    'target_id' => $targetId,
                    'rating' => (int) $r['rating'],
                    'text' => $r['text'] ?? $r['comment'] ?? null,
                    'media_refs' => $r['media_refs'] ?? null,
                    'status' => 'VISIBLE',
                    'submitted_at' => $now,
                ]);
                $entry->setRelation('reply', null);
                $entry->setRelation('submission', $submission);
                $createdEntries->push($entry);
            }

            $safeCustomerName = $this->formatSafeCustomerDisplayName(
                $eligibility->customerDisplayName,
                $customerId
            );

            $orderedAtResolved = $eligibility->orderedAt
                ?? $submission->created_at?->toIso8601String()
                ?? $submission->submitted_at?->toIso8601String();

            OutboxEvent::create([
                'event_type' => 'after_sales.review.created.v1',
                'aggregate_type' => 'REVIEW_SUBMISSION',
                'aggregate_id' => $submission->id,
                'payload' => [
                    'submission_id' => $submission->id,
                    'customer_id' => $customerId,
                    'customer_display_name' => $safeCustomerName,
                    'ordered_at' => $eligibility->orderedAt,
                    'source_order_id' => $sourceOrderId,
                    'source_merchant_order_id' => $normalizedSubOrderId,
                    'source_kind' => $sourceKind,
                    'owner_org_id' => $validBusinessOrgId,
                    'entries_count' => count($ratings),
                ],
            ]);

            foreach ($createdEntries as $entry) {
                $entry->setAttribute('review_text', $entry->text);
                $entry->setAttribute('ordered_at', $orderedAtResolved);
                $entry->setAttribute('customer_display_name', $safeCustomerName);
                $entry->setAttribute('source_order_id', $sourceOrderId);
                $entry->setAttribute('source_merchant_order_id', $normalizedSubOrderId);
                $entry->setAttribute('source_kind', $sourceKind);
            }

            $submission->setRelation('entries', $createdEntries);
            $submission->setAttribute('ordered_at', $orderedAtResolved);
            $submission->setAttribute('customer_display_name', $safeCustomerName);

            return $submission;
        });
    }

    public function getCustomerOrderReview(string $customerId, string $orderId, ?string $subOrderId = null): ?ReviewSubmission
    {
        $query = ReviewSubmission::with(['entries.reply'])
            ->where('customer_id', $customerId)
            ->where('source_order_id', $orderId);

        if ($subOrderId !== null && $subOrderId !== '') {
            $query->where('source_merchant_order_id', $subOrderId);
        }

        $submission = $query->first();
        if ($submission) {
            $this->enrichReviewSubmission($submission);
        }

        return $submission;
    }

    public function listCustomerOrderReviews(string $customerId, ?array $orderIds = null): Collection
    {
        $query = ReviewSubmission::with(['entries.reply'])
            ->where('customer_id', $customerId)
            ->orderBy('submitted_at', 'desc');

        if (!empty($orderIds)) {
            $query->whereIn('source_order_id', $orderIds);
        }

        $submissions = $query->get();
        foreach ($submissions as $sub) {
            $this->enrichReviewSubmission($sub);
        }

        return $submissions;
    }

    public function listCatalogReviews(string $targetType, string $targetId, int $perPage = 10): LengthAwarePaginator
    {
        $paginator = ReviewEntry::with(['submission', 'reply'])
            ->where('target_type', strtoupper($targetType))
            ->where('target_id', $targetId)
            ->where('status', 'VISIBLE')
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage);

        $this->enrichReviewEntries($paginator->items());

        return $paginator;
    }

    public function getCatalogReputation(string $targetType, string $targetId): array
    {
        $targetType = strtoupper($targetType);
        $entries = ReviewEntry::where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->where('status', 'VISIBLE')
            ->get();

        $count = $entries->count();
        $average = $count > 0 ? round($entries->avg('rating'), 1) : 0.0;

        $distribution = [
            '5' => $entries->where('rating', 5)->count(),
            '4' => $entries->where('rating', 4)->count(),
            '3' => $entries->where('rating', 3)->count(),
            '2' => $entries->where('rating', 2)->count(),
            '1' => $entries->where('rating', 1)->count(),
        ];

        return [
            'target_type' => $targetType,
            'target_id' => $targetId,
            'total_reviews' => $count,
            'average_rating' => $average,
            'distribution' => $distribution,
        ];
    }

    public function getBatchCatalogReputation(string $targetType, array $targetIds): array
    {
        $targetType = strtoupper($targetType);
        $cleanIds = array_values(array_unique(array_filter(array_map('trim', $targetIds))));

        if (empty($cleanIds)) {
            return [];
        }

        $entries = ReviewEntry::where('target_type', $targetType)
            ->whereIn('target_id', $cleanIds)
            ->where('status', 'VISIBLE')
            ->get(['target_id', 'rating']);

        $grouped = $entries->groupBy('target_id');
        $result = [];

        foreach ($cleanIds as $id) {
            $group = $grouped->get($id, collect());
            $count = $group->count();
            $avg = $count > 0 ? round((float) $group->avg('rating'), 1) : 0.0;

            $result[$id] = [
                'target_type' => $targetType,
                'target_id' => $id,
                'total_reviews' => $count,
                'average_rating' => $avg,
            ];
        }

        return $result;
    }

    public function listBusinessReviewInbox(string $businessOrgId, int $perPage = 15): LengthAwarePaginator
    {
        $paginator = ReviewEntry::with(['submission', 'reply'])
            ->where(function ($q) use ($businessOrgId) {
                $q->where('owner_org_id', $businessOrgId)
                    ->orWhere(function ($sub) use ($businessOrgId) {
                        $sub->whereIn('target_type', ['MERCHANT', 'PROVIDER'])
                            ->where('target_id', $businessOrgId);
                    });
            })
            ->orderBy('submitted_at', 'desc')
            ->paginate($perPage);

        $this->enrichReviewEntries($paginator->items());

        return $paginator;
    }

    public function getBusinessReviewSummary(string $businessOrgId, ?string $orgType = null): array
    {
        $visibleEntries = ReviewEntry::with('reply')
            ->where('status', 'VISIBLE')
            ->where(function ($q) use ($businessOrgId) {
                $q->where('owner_org_id', $businessOrgId)
                    ->orWhere(function ($sub) use ($businessOrgId) {
                        $sub->whereIn('target_type', ['MERCHANT', 'PROVIDER'])
                            ->where('target_id', $businessOrgId);
                    });
            })
            ->get();

        $productEntries = $visibleEntries->where('target_type', 'PRODUCT');
        $merchantEntries = $visibleEntries->where('target_type', 'MERCHANT');
        $serviceEntries = $visibleEntries->where('target_type', 'SERVICE');
        $providerEntries = $visibleEntries->where('target_type', 'PROVIDER');

        $productCount = $productEntries->count();
        $productAvg = $productCount > 0 ? round((float) $productEntries->avg('rating'), 1) : 0.0;

        $merchantCount = $merchantEntries->count();
        $merchantAvg = $merchantCount > 0 ? round((float) $merchantEntries->avg('rating'), 1) : 0.0;

        $serviceCount = $serviceEntries->count();
        $serviceAvg = $serviceCount > 0 ? round((float) $serviceEntries->avg('rating'), 1) : 0.0;

        $providerCount = $providerEntries->count();
        $providerAvg = $providerCount > 0 ? round((float) $providerEntries->avg('rating'), 1) : 0.0;

        $resolvedOrgType = strtoupper((string) $orgType);
        if (!in_array($resolvedOrgType, ['MERCHANT', 'PROVIDER'], true)) {
            $resolvedOrgType = ($serviceCount > 0 || $providerCount > 0) && $productCount === 0 && $merchantCount === 0
                ? 'PROVIDER'
                : 'MERCHANT';
        }

        $itemAvg = $resolvedOrgType === 'PROVIDER' ? $serviceAvg : $productAvg;
        $itemCount = $resolvedOrgType === 'PROVIDER' ? $serviceCount : $productCount;
        $businessAvg = $resolvedOrgType === 'PROVIDER' ? $providerAvg : $merchantAvg;
        $businessCount = $resolvedOrgType === 'PROVIDER' ? $providerCount : $merchantCount;

        $totalVisible = $visibleEntries->count();
        $unrepliedCount = $visibleEntries->filter(fn (ReviewEntry $e) => $e->reply === null)->count();

        return [
            'org_id' => $businessOrgId,
            'org_type' => $resolvedOrgType,
            'item_average_rating' => $itemAvg,
            'item_total_ratings' => $itemCount,
            'business_average_rating' => $businessAvg,
            'business_total_ratings' => $businessCount,
            'product_average_rating' => $productAvg,
            'product_total_ratings' => $productCount,
            'merchant_average_rating' => $merchantAvg,
            'merchant_total_ratings' => $merchantCount,
            'service_average_rating' => $serviceAvg,
            'service_total_ratings' => $serviceCount,
            'provider_average_rating' => $providerAvg,
            'provider_total_ratings' => $providerCount,
            'total_reviews' => $totalVisible,
            'unreplied_count' => $unrepliedCount,
        ];
    }

    protected function enrichReviewSubmission(ReviewSubmission $submission): void
    {
        if (!$submission->relationLoaded('entries')) {
            $submission->load('entries.reply');
        }

        foreach ($submission->entries as $entry) {
            $entry->setRelation('submission', $submission);
        }

        $this->enrichReviewEntries($submission->entries);

        $firstEntry = $submission->entries->first();
        if ($firstEntry) {
            $submission->setAttribute('ordered_at', $firstEntry->getAttribute('ordered_at'));
            $submission->setAttribute('customer_display_name', $firstEntry->getAttribute('customer_display_name'));
        }
    }

    public function enrichReviewEntries(iterable $entries): void
    {
        $entryList = [];
        $submissionIds = [];
        $orderIds = [];

        foreach ($entries as $entry) {
            if (!$entry instanceof ReviewEntry) {
                continue;
            }
            $entryList[] = $entry;
            if ($entry->submission_id) {
                $submissionIds[] = $entry->submission_id;
            }
            $sub = $entry->relationLoaded('submission') ? $entry->submission : null;
            if ($sub && $sub->source_order_id) {
                $orderIds[] = $sub->source_order_id;
            }
        }

        if (empty($entryList)) {
            return;
        }

        $outboxBySubmission = [];
        if (!empty($submissionIds)) {
            $outboxEvents = OutboxEvent::where('event_type', 'after_sales.review.created.v1')
                ->whereIn('aggregate_id', array_values(array_unique($submissionIds)))
                ->get(['aggregate_id', 'payload']);

            foreach ($outboxEvents as $ev) {
                $outboxBySubmission[$ev->aggregate_id] = is_array($ev->payload) ? $ev->payload : [];
            }
        }

        $entitlementOrderDates = [];
        if (!empty($orderIds)) {
            $entitlements = OrderWarrantyEntitlement::whereIn('order_id', array_values(array_unique($orderIds)))
                ->whereNotNull('ordered_at')
                ->get(['order_id', 'ordered_at']);

            foreach ($entitlements as $ent) {
                if ($ent->ordered_at && !isset($entitlementOrderDates[$ent->order_id])) {
                    $entitlementOrderDates[$ent->order_id] = $ent->ordered_at->toIso8601String();
                }
            }
        }

        foreach ($entryList as $entry) {
            $sub = $entry->relationLoaded('submission') ? $entry->submission : null;
            $outboxPayload = $outboxBySubmission[$entry->submission_id] ?? [];
            $orderId = $sub?->source_order_id ?? ($outboxPayload['source_order_id'] ?? null);
            $customerId = (string) ($sub?->customer_id ?? ($outboxPayload['customer_id'] ?? ''));

            $orderedAt = $outboxPayload['ordered_at']
                ?? ($orderId && isset($entitlementOrderDates[$orderId]) ? $entitlementOrderDates[$orderId] : null)
                ?? $sub?->created_at?->toIso8601String()
                ?? $entry->submitted_at?->toIso8601String();

            $customerDisplayName = !empty($outboxPayload['customer_display_name'])
                ? (string) $outboxPayload['customer_display_name']
                : $this->formatSafeCustomerDisplayName(null, $customerId);

            $entry->setAttribute('review_text', $entry->text);
            $entry->setAttribute('ordered_at', $orderedAt);
            $entry->setAttribute('customer_display_name', $customerDisplayName);
            $entry->setAttribute('source_order_id', $orderId);
            $entry->setAttribute('source_merchant_order_id', $sub?->source_merchant_order_id ?? ($outboxPayload['source_merchant_order_id'] ?? null));
            $entry->setAttribute('source_kind', $sub?->source_kind ?? ($outboxPayload['source_kind'] ?? null));

            if ($entry->relationLoaded('reply') && $entry->reply !== null) {
                $entry->reply->setAttribute('reply_text', $entry->reply->text);
            }
        }
    }

    public function formatSafeCustomerDisplayName(?string $rawName, string $customerId): string
    {
        $candidate = trim((string) $rawName);

        // Never expose email or phone number
        if (!empty($candidate) && !str_contains($candidate, '@') && !preg_match('/^\+?[0-9\-\s]{7,}$/', $candidate)) {
            $parts = preg_split('/\s+/', $candidate) ?: [];
            if (count($parts) >= 2) {
                $first = $parts[0];
                $secondInitial = mb_strtoupper(mb_substr($parts[1], 0, 1));
                return "{$first} {$secondInitial}.";
            }
            if (mb_strlen($candidate) > 2) {
                return $candidate;
            }
        }

        $cleanId = trim($customerId);
        if (empty($cleanId)) {
            return 'Pelanggan Terverifikasi';
        }

        // If customer_id has human slug like "cust-budi-santoso" or "user_andi"
        if (preg_match('/^(?:cust|user|pelanggan)[-_]([a-zA-Z]+)(?:[-_]([a-zA-Z]+))?/i', $cleanId, $matches)) {
            $first = ucfirst(strtolower($matches[1]));
            if (!empty($matches[2]) && !is_numeric($matches[2])) {
                $initial = strtoupper(substr($matches[2], 0, 1));
                return "{$first} {$initial}.";
            }
            return "Pelanggan {$first}";
        }

        $suffix = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $cleanId), -4));
        return $suffix ? "Pelanggan #{$suffix}" : 'Pelanggan Terverifikasi';
    }

    public function replyToReview(
        string $reviewEntryId,
        string $businessOrgId,
        string $actorId,
        string $text
    ): ReviewReply {
        $entry = ReviewEntry::with('submission')->findOrFail($reviewEntryId);

        $isOwnerOrg = ($entry->owner_org_id === $businessOrgId);
        $isTargetOrg = (in_array($entry->target_type, ['MERCHANT', 'PROVIDER'], true) && $entry->target_id === $businessOrgId);

        if (!$isOwnerOrg && !$isTargetOrg) {
            throw new RuntimeException("Akses ditolak: Anda tidak memiliki wewenang untuk membalas ulasan ini (Bukan pemilik ulasan atau target organisasi).");
        }

        if (empty(trim($text))) {
            throw new InvalidArgumentException("Teks balasan resmi tidak boleh kosong.");
        }

        return DB::transaction(function () use ($entry, $businessOrgId, $actorId, $text) {
            $reply = ReviewReply::updateOrCreate(
                ['review_entry_id' => $entry->id],
                [
                    'owner_org_id' => $businessOrgId,
                    'text' => $text,
                    'replied_by' => $actorId,
                ]
            );

            OutboxEvent::create([
                'event_type' => 'after_sales.review.reply_created.v1',
                'aggregate_type' => 'REVIEW_ENTRY',
                'aggregate_id' => $entry->id,
                'payload' => [
                    'review_entry_id' => $entry->id,
                    'reply_id' => $reply->id,
                    'business_org_id' => $businessOrgId,
                ],
            ]);

            return $reply;
        });
    }

    public function moderateReview(
        string $reviewEntryId,
        string $adminId,
        string $action, // HIDE or RESTORE
        string $reason
    ): ReviewModeration {
        $action = strtoupper($action);
        if (!in_array($action, ['HIDE', 'RESTORE'], true)) {
            throw new InvalidArgumentException("Aksi moderasi harus 'HIDE' atau 'RESTORE'.");
        }
        if (empty(trim($reason))) {
            throw new InvalidArgumentException("Alasan moderasi wajib disertakan.");
        }

        $entry = ReviewEntry::findOrFail($reviewEntryId);

        return DB::transaction(function () use ($entry, $adminId, $action, $reason) {
            $newStatus = $action === 'HIDE' ? 'HIDDEN' : 'VISIBLE';
            $entry->update(['status' => $newStatus]);

            $mod = ReviewModeration::create([
                'review_entry_id' => $entry->id,
                'admin_id' => $adminId,
                'action' => $action,
                'reason' => $reason,
                'occurred_at' => now(),
            ]);

            OutboxEvent::create([
                'event_type' => 'after_sales.review.moderated.v1',
                'aggregate_type' => 'REVIEW_ENTRY',
                'aggregate_id' => $entry->id,
                'payload' => [
                    'review_entry_id' => $entry->id,
                    'action' => $action,
                    'reason' => $reason,
                    'admin_id' => $adminId,
                ],
            ]);

            return $mod;
        });
    }
}
