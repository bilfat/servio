<?php

namespace App\Services;

use App\Models\IdempotencyRecord;
use Illuminate\Http\JsonResponse;

class IdempotencyService
{
    public static function check(string $scope, string $idempotencyKey, array $requestData, ?string $actorUserId = null): ?IdempotencyRecord
    {
        $actorBucket = $actorUserId ?? request()->ip() ?? 'anonymous';
        $requestHash = hash('sha256', json_encode($requestData));

        $record = IdempotencyRecord::where('scope', $scope)
            ->where('actor_bucket', $actorBucket)
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($record) {
            if ($record->expires_at < now()) {
                $record->delete();
                return null;
            }

            if ($record->request_hash !== $requestHash) {
                abort(response()->json([
                    'success' => false,
                    'code' => 'IDENTITY_IDEMPOTENCY_KEY_REUSED',
                    'message' => 'Idempotency key telah digunakan dengan payload yang berbeda.',
                    'error' => [
                        'details' => [],
                        'field_errors' => [],
                        'retry_after_seconds' => null,
                    ],
                    'meta' => ['request_id' => request()->header('X-Request-Id', '')],
                ], 409));
            }

            return $record;
        }

        return null;
    }

    public static function record(
        string $scope,
        string $idempotencyKey,
        array $requestData,
        int $responseStatus,
        array $responseData,
        ?string $actorUserId = null,
        int $ttlHours = 24
    ): IdempotencyRecord {
        $actorBucket = $actorUserId ?? request()->ip() ?? 'anonymous';
        $requestHash = hash('sha256', json_encode($requestData));

        return IdempotencyRecord::updateOrCreate(
            [
                'scope' => $scope,
                'actor_bucket' => $actorBucket,
                'idempotency_key' => $idempotencyKey,
            ],
            [
                'actor_user_id' => $actorUserId,
                'request_hash' => $requestHash,
                'response_status' => $responseStatus,
                'response_json' => $responseData,
                'expires_at' => now()->addHours($ttlHours),
            ]
        );
    }
}
