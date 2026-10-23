<?php

namespace App\Domain\Finance\Policies;

use App\Models\FeePolicyGroup;
use App\Models\FeePolicyTarget;
use App\Models\FeePolicyVersion;
use App\Models\FinanceAuditLog;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class FeePolicyService
{
    public function listPolicies(?string $status = null, ?string $scope = null, ?string $search = null, int $page = 1, int $perPage = 20): array
    {
        $query = FeePolicyGroup::with(['versions.targets']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $total = $query->count();
        $items = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
        ];
    }

    public function getPolicy(string $groupId): FeePolicyGroup
    {
        $group = FeePolicyGroup::with(['versions.targets'])->find($groupId);
        if (!$group) {
            throw new HttpException(404, 'Grup kebijakan biaya tidak ditemukan.');
        }
        return $group;
    }

    public function createPolicy(array $data, string $actorUserId): array
    {
        $slug = $data['slug'];
        $displayName = $data['name'] ?? $data['display_name'];
        $description = $data['description'] ?? null;
        $changeReason = $data['change_reason'] ?? 'Inisialisasi draft kebijakan biaya';
        $targets = $data['targets'] ?? [];

        if (empty($targets)) {
            throw new HttpException(422, 'Target kebijakan biaya minimal harus ada satu.');
        }

        if (FeePolicyGroup::where('slug', $slug)->exists()) {
            throw new HttpException(409, 'Slug kebijakan biaya sudah digunakan.');
        }

        return DB::transaction(function () use ($slug, $displayName, $description, $changeReason, $targets, $actorUserId) {
            $group = FeePolicyGroup::create([
                'slug' => $slug,
                'display_name' => $displayName,
                'description' => $description,
                'business_status' => 'ACTIVE',
                'created_by_user_id' => $actorUserId,
            ]);

            $version = FeePolicyVersion::create([
                'group_id' => $group->id,
                'version_no' => 1,
                'status' => 'DRAFT',
                'change_reason' => $changeReason,
                'created_by_user_id' => $actorUserId,
            ]);

            foreach ($targets as $t) {
                FeePolicyTarget::create([
                    'version_id' => $version->id,
                    'policy_code' => $t['policy_code'],
                    'scope' => $t['scope'] ?? 'PRODUCT',
                    'payer_type' => $t['payer_type'],
                    'fee_type' => $t['fee_type'],
                    'fixed_amount_idr' => $t['fixed_amount_idr'] ?? null,
                    'percentage_rate' => $t['percentage_rate'] ?? null,
                    'charge_scope' => $t['charge_scope'] ?? 'CHECKOUT',
                    'calculation_base' => $t['calculation_base'] ?? 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                    'rounding_method' => $t['rounding_method'] ?? 'HALF_UP',
                    'min_fee_idr' => $t['min_fee_idr'] ?? null,
                    'max_fee_idr' => $t['max_fee_idr'] ?? null,
                ]);
            }

            FinanceAuditLog::create([
                'actor_user_id' => $actorUserId,
                'actor_service' => 'finance-service',
                'action' => 'FEE_POLICY_DRAFT_CREATED',
                'subject_type' => 'FeePolicyGroup',
                'subject_id' => $group->id,
                'result' => 'SUCCESS',
                'after_state' => ['version_id' => $version->id, 'targets_count' => count($targets)],
            ]);

            return [
                'group_id' => $group->id,
                'version_id' => $version->id,
                'version_no' => 1,
                'status' => 'DRAFT',
                'targets_count' => count($targets),
            ];
        });
    }

    public function createRevision(string $groupId, array $data, string $actorUserId): array
    {
        $group = $this->getPolicy($groupId);
        $changeReason = $data['change_reason'] ?? 'Revisi kebijakan';
        $targets = $data['targets'] ?? [];

        if (empty($targets)) {
            throw new HttpException(422, 'Target kebijakan revisi tidak boleh kosong.');
        }

        $nextVersionNo = (int) $group->versions()->max('version_no') + 1;

        return DB::transaction(function () use ($group, $nextVersionNo, $changeReason, $targets, $actorUserId) {
            $version = FeePolicyVersion::create([
                'group_id' => $group->id,
                'version_no' => $nextVersionNo,
                'status' => 'DRAFT',
                'change_reason' => $changeReason,
                'created_by_user_id' => $actorUserId,
            ]);

            foreach ($targets as $t) {
                FeePolicyTarget::create([
                    'version_id' => $version->id,
                    'policy_code' => $t['policy_code'],
                    'scope' => $t['scope'] ?? 'PRODUCT',
                    'payer_type' => $t['payer_type'],
                    'fee_type' => $t['fee_type'],
                    'fixed_amount_idr' => $t['fixed_amount_idr'] ?? null,
                    'percentage_rate' => $t['percentage_rate'] ?? null,
                    'charge_scope' => $t['charge_scope'] ?? 'CHECKOUT',
                    'calculation_base' => $t['calculation_base'] ?? 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                    'rounding_method' => $t['rounding_method'] ?? 'HALF_UP',
                    'min_fee_idr' => $t['min_fee_idr'] ?? null,
                    'max_fee_idr' => $t['max_fee_idr'] ?? null,
                ]);
            }

            return [
                'group_id' => $group->id,
                'version_id' => $version->id,
                'version_no' => $nextVersionNo,
                'status' => 'DRAFT',
                'targets_count' => count($targets),
            ];
        });
    }

    public function updateDraft(string $versionId, array $data, string $actorUserId): FeePolicyVersion
    {
        $version = FeePolicyVersion::with('targets')->find($versionId);
        if (!$version) {
            throw new HttpException(404, 'Versi kebijakan tidak ditemukan.');
        }

        if ($version->status !== 'DRAFT') {
            throw new HttpException(409, 'Versi kebijakan yang sudah terbit tidak boleh diubah secara langsung.');
        }

        return DB::transaction(function () use ($version, $data, $actorUserId) {
            if (!empty($data['change_reason'])) {
                $version->change_reason = $data['change_reason'];
            }
            $version->save();

            if (!empty($data['targets'])) {
                $version->targets()->delete();
                foreach ($data['targets'] as $t) {
                    FeePolicyTarget::create([
                        'version_id' => $version->id,
                        'policy_code' => $t['policy_code'],
                        'scope' => $t['scope'] ?? 'PRODUCT',
                        'payer_type' => $t['payer_type'],
                        'fee_type' => $t['fee_type'],
                        'fixed_amount_idr' => $t['fixed_amount_idr'] ?? null,
                        'percentage_rate' => $t['percentage_rate'] ?? null,
                        'charge_scope' => $t['charge_scope'] ?? 'CHECKOUT',
                        'calculation_base' => $t['calculation_base'] ?? 'CHECKOUT_ELIGIBLE_SUBTOTAL',
                        'rounding_method' => $t['rounding_method'] ?? 'HALF_UP',
                    ]);
                }
            }

            return $version->load('targets');
        });
    }

    public function publishVersion(string $versionId, ?string $effectiveFrom, ?string $reason, string $actorUserId): FeePolicyVersion
    {
        $version = FeePolicyVersion::with(['group', 'targets'])->find($versionId);
        if (!$version) {
            throw new HttpException(404, 'Versi kebijakan tidak ditemukan.');
        }

        if ($version->status !== 'DRAFT') {
            throw new HttpException(409, 'Hanya versi DRAFT yang dapat diterbitkan.');
        }

        $effectiveAt = $effectiveFrom ? now()->parse($effectiveFrom) : now();
        $isScheduled = $effectiveAt->isFuture();

        return DB::transaction(function () use ($version, $effectiveAt, $isScheduled, $reason, $actorUserId) {
            // Archive old active versions of this group
            FeePolicyVersion::where('group_id', $version->group_id)
                ->where('status', 'ACTIVE')
                ->where('id', '!=', $version->id)
                ->update(['status' => 'HISTORICAL', 'effective_until' => $effectiveAt]);

            $version->status = $isScheduled ? 'SCHEDULED' : 'ACTIVE';
            $version->effective_from = $effectiveAt;
            $version->published_by_user_id = $actorUserId;
            $version->published_at = now();
            if ($reason) {
                $version->change_reason = $reason;
            }
            $version->save();

            FinanceAuditLog::create([
                'actor_user_id' => $actorUserId,
                'actor_service' => 'finance-service',
                'action' => 'FEE_POLICY_PUBLISHED',
                'subject_type' => 'FeePolicyVersion',
                'subject_id' => $version->id,
                'result' => 'SUCCESS',
                'after_state' => ['status' => $version->status, 'effective_from' => $version->effective_from],
            ]);

            return $version;
        });
    }

    public function deactivatePolicy(string $groupId, string $reason, string $actorUserId): FeePolicyGroup
    {
        $group = $this->getPolicy($groupId);

        return DB::transaction(function () use ($group, $reason, $actorUserId) {
            $group->business_status = 'INACTIVE';
            $group->save();

            $group->versions()->where('status', 'ACTIVE')->update([
                'status' => 'INACTIVE',
                'effective_until' => now(),
            ]);

            FinanceAuditLog::create([
                'actor_user_id' => $actorUserId,
                'actor_service' => 'finance-service',
                'action' => 'FEE_POLICY_DEACTIVATED',
                'subject_type' => 'FeePolicyGroup',
                'subject_id' => $group->id,
                'result' => 'SUCCESS',
                'reason_code' => $reason,
            ]);

            return $group;
        });
    }
}
