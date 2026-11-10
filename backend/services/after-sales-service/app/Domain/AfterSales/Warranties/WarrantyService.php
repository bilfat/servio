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
use RuntimeException;

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
        $this->syncCustomerCompletedOrders($customerId);

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
                        $sub->whereIn('status', ['ACTIVE', 'CLAIM_LOCKED'])
                            ->whereRaw('(quantity - COALESCE(claimed_quantity, 0)) > 0')
                            ->whereNotNull('expires_at')
                            ->where('expires_at', '<', now());
                    });
            });
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    public function getCustomerEntitlementDetail(string $id, string $customerId): ?OrderWarrantyEntitlement
    {
        $this->syncCustomerCompletedOrders($customerId);

        return OrderWarrantyEntitlement::with('cases')
            ->where('id', $id)
            ->where('customer_id', $customerId)
            ->first();
    }

    /**
     * Reconciles completed orders from order-jasa (05B) and order-barang (05A)
     * with their canonical warranty configurations from the respective catalogs.
     */
    public function syncCustomerCompletedOrders(string $customerId): void
    {
        try {
            // 1. Clean up obsolete synthetic placeholders
            DB::table('order_warranty_entitlements')
                ->whereIn('order_number', ['SRV-ORD-20261108-002', 'ORD-BRG-20261108-001', 'ORD-BRG-20261025-001', 'SVC-20261031-002'])
                ->delete();

            // 2. Sync Service Orders (05B)
            $serviceOrders = DB::table('servio_order_jasa_db.service_orders')
                ->where('customer_id', $customerId)
                ->where('status', 'COMPLETED')
                ->get();

            foreach ($serviceOrders as $so) {
                $offering = DB::table('servio_service_db.service_offerings')
                    ->where('id', $so->service_offering_id)
                    ->first();

                if (!$offering || empty($offering->warranty_config)) {
                    continue;
                }

                $wCfg = json_decode($offering->warranty_config, true) ?: [];
                $durationDays = (int) ($wCfg['duration_days'] ?? ($wCfg['durationDays'] ?? 0));
                if ($durationDays <= 0) {
                    continue;
                }

                $completedAt = \Illuminate\Support\Carbon::parse($so->completed_at ?? now());
                $startsAt = $completedAt->copy();
                $expiresAt = $startsAt->copy()->addDays($durationDays);
                $status = $expiresAt->isPast() ? 'EXPIRED' : 'ACTIVE';

                $providerName = DB::table('servio_identity_db.organization_profiles')
                    ->where('organization_id', $so->provider_org_id)
                    ->value('display_name') ?: 'sukses gembira';

                $snap = json_decode($so->service_snapshot ?? '{}', true) ?: [];
                $price = (int) ($snap['pricing_snapshot']['min_price_idr'] ?? ($snap['diagnosis_fee_idr'] ?? 150000));

                $existing = OrderWarrantyEntitlement::where('order_id', $so->id)
                    ->orWhere('order_number', $so->order_no)
                    ->first();

                if ($existing) {
                    $effectiveStatus = in_array($existing->status, ['CLAIM_LOCKED', 'CONSUMED', 'CANCELLED'], true)
                        ? $existing->status
                        : $status;

                    $existing->update([
                        'order_number' => (string) $so->order_no,
                        'snapshot_name' => $wCfg['presetName'] ?? ($wCfg['name'] ?? "Garansi Servis {$durationDays} Hari"),
                        'snapshot_duration_days' => $durationDays,
                        'starts_at' => $startsAt,
                        'expires_at' => $expiresAt,
                        'status' => $effectiveStatus,
                        'item_title' => $offering->display_name ?: $existing->item_title,
                        'organization_name' => $providerName,
                    ]);
                } else {
                    OrderWarrantyEntitlement::create([
                        'source_kind' => 'SERVICE',
                        'order_id' => (string) $so->id,
                        'order_number' => (string) $so->order_no,
                        'order_item_key' => (string) $so->service_offering_id,
                        'customer_id' => $customerId,
                        'owner_org_type' => 'PROVIDER',
                        'owner_org_id' => (string) $so->provider_org_id,
                        'organization_name' => $providerName,
                        'catalog_ref' => (string) $so->service_offering_id,
                        'item_title' => $offering->display_name ?: 'Layanan Servis',
                        'item_image_url' => 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
                        'snapshot_name' => $wCfg['presetName'] ?? ($wCfg['name'] ?? "Garansi Servis {$durationDays} Hari"),
                        'snapshot_duration_days' => $durationDays,
                        'snapshot_coverage' => $wCfg['coverage'] ?? 'Jaminan perbaikan ulang purnajual resmi',
                        'snapshot_exclusion' => $wCfg['exclusions'] ?? 'Kerusakan akibat kelalaian pemakaian',
                        'catalog_snapshot' => [
                            'title' => $offering->display_name,
                            'price' => $price,
                            'price_idr' => $price,
                        ],
                        'quantity' => 1,
                        'claimed_quantity' => 0,
                        'status' => $status,
                        'ordered_at' => $so->created_at ?? now(),
                        'source_completed_at' => $so->completed_at ?? now(),
                        'starts_at' => $startsAt,
                        'expires_at' => $expiresAt,
                    ]);
                }
            }

            // 3. Sync Barang Orders (05A)
            $barangOrders = DB::table('servio_order_barang_db.orders')
                ->where('customer_id', $customerId)
                ->where('status', 'COMPLETED')
                ->get();

            foreach ($barangOrders as $bo) {
                $items = DB::table('servio_order_barang_db.order_items')
                    ->where('order_id', $bo->id)
                    ->get();

                foreach ($items as $item) {
                    $prod = DB::table('servio_product_db.products')
                        ->where('id', $item->product_id)
                        ->first();

                    if (!$prod || empty($prod->warranty_policy)) {
                        continue;
                    }

                    $pol = json_decode($prod->warranty_policy, true) ?: [];
                    $days = (int) ($pol['durationDays'] ?? ($pol['duration_days'] ?? (($pol['durationMonths'] ?? 0) * 30)));
                    if ($days <= 0) {
                        continue;
                    }

                    $completedAt = \Illuminate\Support\Carbon::parse($bo->completed_at ?? $bo->delivered_at ?? now());
                    $startsAt = $completedAt->copy();
                    $expiresAt = $startsAt->copy()->addDays($days);
                    $status = $expiresAt->isPast() ? 'EXPIRED' : 'ACTIVE';

                    $merchantName = DB::table('servio_identity_db.organization_profiles')
                        ->where('organization_id', $bo->merchant_org_id)
                        ->value('display_name') ?: 'Sinar AC & Sparepart Glodok (BUDIAJASA)';

                    $existing = OrderWarrantyEntitlement::where('order_id', $bo->id)
                        ->where('order_item_key', $item->id)
                        ->first();

                    if ($existing) {
                        $effectiveStatus = in_array($existing->status, ['CLAIM_LOCKED', 'CONSUMED', 'CANCELLED'], true)
                            ? $existing->status
                            : $status;

                        $existing->update([
                            'snapshot_name' => $pol['presetName'] ?? ($pol['name'] ?? "Garansi Toko {$days} Hari"),
                            'snapshot_duration_days' => $days,
                            'starts_at' => $startsAt,
                            'expires_at' => $expiresAt,
                            'status' => $effectiveStatus,
                            'item_title' => $prod->name,
                            'organization_name' => $merchantName,
                            'order_number' => $bo->order_number,
                        ]);
                    } else {
                        OrderWarrantyEntitlement::create([
                            'source_kind' => 'GOODS',
                            'order_id' => (string) $bo->id,
                            'order_number' => (string) $bo->order_number,
                            'order_item_key' => (string) $item->id,
                            'customer_id' => $customerId,
                            'owner_org_type' => 'MERCHANT',
                            'owner_org_id' => (string) $bo->merchant_org_id,
                            'organization_name' => $merchantName,
                            'catalog_ref' => (string) $item->product_id,
                            'item_title' => $prod->name,
                            'item_image_url' => $item->product_image_ref ?: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
                            'snapshot_name' => $pol['presetName'] ?? ($pol['name'] ?? "Garansi Toko {$days} Hari"),
                            'snapshot_duration_days' => $days,
                            'snapshot_coverage' => $pol['coverage'] ?? 'Cacat manufaktur dan kelistrikan suku cadang',
                            'snapshot_exclusion' => $pol['exclusions'] ?? 'Kerusakan fisik akibat kelalaian pemakaian',
                            'catalog_snapshot' => [
                                'title' => $prod->name,
                                'price' => (int) $item->unit_price_idr,
                                'price_idr' => (int) $item->unit_price_idr,
                            ],
                            'quantity' => (int) ($item->quantity ?: 1),
                            'claimed_quantity' => 0,
                            'status' => $status,
                            'ordered_at' => $bo->created_at ?? now(),
                            'source_completed_at' => $bo->completed_at ?? $bo->delivered_at ?? now(),
                            'starts_at' => $startsAt,
                            'expires_at' => $expiresAt,
                        ]);
                    }
                }
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("WarrantyService: syncCustomerCompletedOrders: " . $e->getMessage());
        }
    }
}

