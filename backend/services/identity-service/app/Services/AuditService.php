<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Str;

class AuditService
{
    protected static array $redactedKeys = [
        'password',
        'password_confirmation',
        'token',
        'otp',
        'nik',
        'nib',
        'npwp',
        'ktp',
        'secret',
        'ciphertext',
        'credit_card',
        'credentials',
        'authorization',
    ];

    public static function log(
        ?string $actorUserId,
        string $eventCode,
        ?string $targetType = null,
        ?string $targetId = null,
        string $result = 'SUCCESS',
        array $metadata = []
    ): AuditLog {
        $safeMetadata = self::sanitizeMetadata($metadata);

        $ip = request()?->ip();
        $ipHash = $ip ? hash('sha256', $ip) : null;

        $ua = request()?->userAgent();
        $uaHash = $ua ? hash('sha256', $ua) : null;

        $requestId = request()?->header('X-Request-Id', (string) Str::uuid());

        return AuditLog::create([
            'actor_user_id' => $actorUserId,
            'event_code' => $eventCode,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'result' => $result,
            'ip_hash' => $ipHash,
            'user_agent_hash' => $uaHash,
            'request_id' => $requestId,
            'safe_metadata' => $safeMetadata,
            'occurred_at' => now(),
        ]);
    }

    public static function sanitizeMetadata(array $data): array
    {
        $sanitized = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string) $key);
            $shouldRedact = false;
            foreach (self::$redactedKeys as $redacted) {
                if (str_contains($lowerKey, $redacted)) {
                    $shouldRedact = true;
                    break;
                }
            }

            if ($shouldRedact) {
                $sanitized[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $sanitized[$key] = self::sanitizeMetadata($value);
            } else {
                $sanitized[$key] = $value;
            }
        }
        return $sanitized;
    }
}
