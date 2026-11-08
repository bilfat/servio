<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Warranties;

use App\Models\OrderWarrantyEntitlement;
use App\Models\WarrantyOption;
use App\Models\WarrantyOptionVersion;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class WarrantyService
{
    public function createOption(
        string $orgType,
        string $orgId,
        string $name,
        int $durationDays,
        string $coverage,
        ?string $exclusion,
        string $actorId
    ): WarrantyOption {
        if ($durationDays <= 0) {
            throw new InvalidArgumentException('Durasi garansi harus lebih dari 0 hari.');
        }

        return DB::transaction(function () use ($orgType, $orgId, $name, $durationDays, $coverage, $exclusion, $actorId) {
            $baseSlug = Str::slug($name);
            $slug = $baseSlug ?: 'garansi-' . Str::random(6);
            $existing = WarrantyOption::where('org_type', $orgType)
                ->where('org_id', $orgId)
                ->where('slug', $slug)
                ->first();

            if ($existing) {
                $slug .= '-' . Str::random(4);
            }

            $option = WarrantyOption::create([
                'org_type' => $orgType,
                'org_id' => $orgId,
                'slug' => $slug,
                'status' => 'ACTIVE',
            ]);

            $version = WarrantyOptionVersion::create([
                'option_id' => $option->id,
                'version_no' => 1,
                'name' => $name,
                'duration_days' => $durationDays,
                'coverage_text' => $coverage,
                'exclusion_text' => $exclusion,
                'published_at' => now(),
                'changed_by' => $actorId,
            ]);

            $option->update(['latest_version_id' => $version->id]);

            return $option->load('latestVersion');
        });
    }

    public function updateOption(
        string $optionId,
        string $orgId,
        string $name,
        int $durationDays,
        string $coverage,
        ?string $exclusion,
        string $actorId
    ): WarrantyOption {
        if ($durationDays <= 0) {
            throw new InvalidArgumentException('Durasi garansi harus lebih dari 0 hari.');
        }

        return DB::transaction(function () use ($optionId, $orgId, $name, $durationDays, $coverage, $exclusion, $actorId) {
            /** @var WarrantyOption $option */
            $option = WarrantyOption::where('id', $optionId)
                ->where('org_id', $orgId)
                ->lockForUpdate()
                ->firstOrFail();

            $latestVersionNo = (int) $option->versions()->max('version_no');
            $newVersionNo = $latestVersionNo + 1;

            $version = WarrantyOptionVersion::create([
                'option_id' => $option->id,
                'version_no' => $newVersionNo,
                'name' => $name,
                'duration_days' => $durationDays,
                'coverage_text' => $coverage,
                'exclusion_text' => $exclusion,
                'published_at' => now(),
                'changed_by' => $actorId,
            ]);

            $option->update(['latest_version_id' => $version->id]);

            return $option->load('latestVersion');
        });
    }

    public function toggleOptionStatus(string $optionId, string $orgId): WarrantyOption
    {
        return DB::transaction(function () use ($optionId, $orgId) {
            $option = WarrantyOption::where('id', $optionId)
                ->where('org_id', $orgId)
                ->firstOrFail();

            $newStatus = $option->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            $option->update(['status' => $newStatus]);

            return $option->load('latestVersion');
        });
    }

    public function listBusinessOptions(string $orgType, string $orgId): Collection
    {
        return WarrantyOption::with('latestVersion')
            ->where('org_type', $orgType)
            ->where('org_id', $orgId)
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getOptionById(string $optionId, ?string $orgId = null): ?WarrantyOption
    {
        $query = WarrantyOption::with(['latestVersion', 'versions'])->where('id', $optionId);
        if ($orgId !== null) {
            $query->where('org_id', $orgId);
        }

        return $query->first();
    }

    public function recordOrderEntitlement(array $data): OrderWarrantyEntitlement
    {
        $existing = OrderWarrantyEntitlement::where('source_kind', $data['source_kind'])
            ->where('order_id', $data['order_id'])
            ->where('order_item_key', $data['order_item_key'])
            ->first();

        if ($existing) {
            // Immutable snapshot verification across all core warranty promise fields
            $isIdentical = ($existing->snapshot_name === $data['snapshot_name']
                && $existing->snapshot_duration_days === (int) $data['snapshot_duration_days']
                && $existing->owner_org_id === $data['owner_org_id']
                && $existing->owner_org_type === ($data['owner_org_type'] ?? $existing->owner_org_type)
                && $existing->customer_id === $data['customer_id']
                && $existing->source_kind === $data['source_kind']
                && $existing->order_id === $data['order_id']
                && $existing->order_item_key === $data['order_item_key']
                && ($existing->catalog_ref ?? '') === ($data['catalog_ref'] ?? '')
                && ($existing->snapshot_coverage ?? null) === ($data['snapshot_coverage'] ?? null)
                && ($existing->snapshot_exclusion ?? null) === ($data['snapshot_exclusion'] ?? null)
                && (int) ($existing->quantity ?? 1) === (int) ($data['quantity'] ?? 1)
            );

            if ($isIdentical) {
                return $existing; // Exact replay idempotent
            }

            throw new RuntimeException("Konflik janji garansi: Snapshot garansi untuk pesanan dan item ini sudah tercatat dan bersifat immutable.");
        }

        return OrderWarrantyEntitlement::create([
            'source_kind' => $data['source_kind'],
            'order_id' => $data['order_id'],
            'merchant_order_id' => $data['merchant_order_id'] ?? null,
            'order_number' => $data['order_number'] ?? ($data['merchant_order_id'] ?? $data['order_id']),
            'order_item_key' => $data['order_item_key'],
            'customer_id' => $data['customer_id'],
            'owner_org_type' => $data['owner_org_type'],
            'owner_org_id' => $data['owner_org_id'],
            'organization_name' => $data['organization_name'] ?? null,
            'catalog_ref' => $data['catalog_ref'],
            'item_title' => $data['item_title'] ?? null,
            'item_image_url' => $data['item_image_url'] ?? null,
            'warranty_option_version_id' => $data['warranty_option_version_id'] ?? null,
            'snapshot_name' => $data['snapshot_name'],
            'snapshot_duration_days' => (int) $data['snapshot_duration_days'],
            'snapshot_coverage' => $data['snapshot_coverage'] ?? null,
            'snapshot_exclusion' => $data['snapshot_exclusion'] ?? null,
            'catalog_snapshot' => $data['catalog_snapshot'] ?? null,
            'quantity' => (int) ($data['quantity'] ?? 1),
            'status' => $data['status'] ?? 'PENDING_START',
            'ordered_at' => $data['ordered_at'] ?? now(),
            'source_completed_at' => $data['source_completed_at'] ?? null,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'source_event_id' => $data['source_event_id'] ?? null,
        ]);
    }

    public function createOrActivateEntitlement(array $data): OrderWarrantyEntitlement
    {
        $existing = OrderWarrantyEntitlement::where('source_kind', $data['source_kind'])
            ->where('order_id', $data['order_id'])
            ->where('order_item_key', $data['order_item_key'])
            ->first();

        $completedTime = !empty($data['source_completed_at'])
            ? \Illuminate\Support\Carbon::parse($data['source_completed_at'])
            : now();
        $durationDays = (int) ($data['snapshot_duration_days'] ?? 30);
        $startsAt = $completedTime;
        $expiresAt = (clone $startsAt)->addDays($durationDays);

        if ($existing) {
            $existing->update([
                'status' => 'ACTIVE',
                'source_completed_at' => $completedTime,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'item_title' => $data['item_title'] ?? $existing->item_title,
                'item_image_url' => $data['item_image_url'] ?? $existing->item_image_url,
                'organization_name' => $data['organization_name'] ?? $existing->organization_name,
                'order_number' => $data['order_number'] ?? $existing->order_number,
                'catalog_snapshot' => $data['catalog_snapshot'] ?? $existing->catalog_snapshot,
            ]);
            return $existing;
        }

        return OrderWarrantyEntitlement::create([
            'source_kind' => $data['source_kind'],
            'order_id' => $data['order_id'],
            'merchant_order_id' => $data['merchant_order_id'] ?? null,
            'order_number' => $data['order_number'] ?? ($data['merchant_order_id'] ?? $data['order_id']),
            'order_item_key' => $data['order_item_key'],
            'customer_id' => $data['customer_id'],
            'owner_org_type' => $data['owner_org_type'],
            'owner_org_id' => $data['owner_org_id'],
            'organization_name' => $data['organization_name'] ?? null,
            'catalog_ref' => $data['catalog_ref'],
            'item_title' => $data['item_title'] ?? null,
            'item_image_url' => $data['item_image_url'] ?? null,
            'warranty_option_version_id' => $data['warranty_option_version_id'] ?? null,
            'snapshot_name' => $data['snapshot_name'],
            'snapshot_duration_days' => $durationDays,
            'snapshot_coverage' => $data['snapshot_coverage'] ?? null,
            'snapshot_exclusion' => $data['snapshot_exclusion'] ?? null,
            'catalog_snapshot' => $data['catalog_snapshot'] ?? null,
            'quantity' => (int) ($data['quantity'] ?? 1),
            'status' => 'ACTIVE',
            'ordered_at' => $data['ordered_at'] ?? now(),
            'source_completed_at' => $completedTime,
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'source_event_id' => $data['source_event_id'] ?? null,
        ]);
    }

    public function activateOrderEntitlement(
        string $sourceKind,
        string $orderId,
        ?string $orderItemKey = null,
        ?\DateTimeInterface $completedAt = null
    ): int {
        $completedTime = $completedAt ? \Illuminate\Support\Carbon::instance($completedAt) : now();

        $query = OrderWarrantyEntitlement::where('source_kind', $sourceKind)
            ->where('order_id', $orderId)
            ->where('status', 'PENDING_START');

        if ($orderItemKey !== null) {
            $query->where('order_item_key', $orderItemKey);
        }

        $entitlements = $query->get();
        $updatedCount = 0;

        foreach ($entitlements as $entitlement) {
            $startsAt = $completedTime;
            $expiresAt = (clone $startsAt)->addDays($entitlement->snapshot_duration_days);

            $entitlement->update([
                'status' => 'ACTIVE',
                'source_completed_at' => $completedTime,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
            ]);
            $updatedCount++;
        }

        return $updatedCount;
    }

    public function listCustomerEntitlements(
        string $customerId,
        ?string $state = null, // 'active', 'expired'
        ?string $type = null, // 'goods', 'service'
        int $perPage = 15
    ): LengthAwarePaginator {
        $query = OrderWarrantyEntitlement::with(['cases' => function ($q) {
            $q->orderBy('created_at', 'desc');
        }])->where('customer_id', $customerId);

        if ($type) {
            $kind = strtoupper($type) === 'GOODS' ? 'GOODS' : 'SERVICE';
            $query->where('source_kind', $kind);
        }

        if ($state === 'active') {
            $query->where('status', 'ACTIVE')
                ->whereRaw('(quantity - COALESCE(claimed_quantity, 0)) > 0')
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
                });
        } elseif ($state === 'expired') {
            $query->where(function ($q) {
                $q->where('status', 'EXPIRED')
                    ->orWhere(function ($sub) {
                        $sub->where('status', 'ACTIVE')
                            ->whereRaw('COALESCE(claimed_quantity, 0) = 0')
                            ->whereNotNull('expires_at')
                            ->where('expires_at', '<', now());
                    });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getCustomerEntitlementDetail(string $id, string $customerId): ?OrderWarrantyEntitlement
    {
        return OrderWarrantyEntitlement::with('cases')
            ->where('id', $id)
            ->where('customer_id', $customerId)
            ->first();
    }
}

