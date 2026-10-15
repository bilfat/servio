<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success(mixed $data = null, string $code = 'IDENTITY_OK', int $status = 200, array $meta = []): JsonResponse
    {
        $requestId = request()->header('X-Request-Id', (string) Str::uuid());

        $payload = [
            'success' => true,
            'code' => $code,
            'data' => $data,
            'meta' => array_merge([
                'request_id' => $requestId,
                'version' => 'v1',
            ], $meta),
        ];

        return response()->json($payload, $status);
    }

    public static function error(
        string $code,
        string $message,
        mixed $status = 400,
        array $fieldErrors = [],
        array $details = [],
        ?int $retryAfterSeconds = null
    ): JsonResponse {
        $httpStatus = is_numeric($status) ? (int) $status : 400;
        if ($httpStatus < 100 || $httpStatus > 599) {
            $httpStatus = 400;
        }

        $requestId = request()->header('X-Request-Id', (string) Str::uuid());

        $payload = [
            'success' => false,
            'code' => $code,
            'message' => $message,
            'error' => [
                'details' => $details,
                'field_errors' => $fieldErrors,
                'retry_after_seconds' => $retryAfterSeconds,
            ],
            'meta' => [
                'request_id' => $requestId,
            ],
        ];

        $response = response()->json($payload, $httpStatus);
        if ($retryAfterSeconds !== null && $httpStatus === 429) {
            $response->header('Retry-After', (string) $retryAfterSeconds);
        }

        return $response;
    }
}
