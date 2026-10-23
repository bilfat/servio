<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success(mixed $data = null, mixed $statusOrMessage = 200, mixed $metaOrStatus = [], string $code = 'FINANCE_OK'): JsonResponse
    {
        $httpStatus = 200;
        $meta = [];

        if (is_int($statusOrMessage)) {
            $httpStatus = $statusOrMessage;
        } elseif (is_string($statusOrMessage) && !empty($statusOrMessage)) {
            $meta['message'] = $statusOrMessage;
        }

        if (is_int($metaOrStatus)) {
            $httpStatus = $metaOrStatus;
        } elseif (is_array($metaOrStatus)) {
            $meta = array_merge($meta, $metaOrStatus);
        }

        $requestId = request()->header('X-Request-Id', (string) Str::uuid());

        $payload = [
            'success' => true,
            'code' => $code,
            'data' => $data,
            'meta' => array_merge([
                'request_id' => $requestId,
                'mode' => 'MOCK',
                'version' => 'v1',
            ], $meta),
        ];

        return response()->json($payload, $httpStatus);
    }

    public static function error(
        string $code,
        string $message,
        mixed $status = 400,
        mixed $details = null,
        array $fields = [],
        ?int $retryAfterSeconds = null
    ): JsonResponse {
        $httpStatus = is_numeric($status) ? (int) $status : 400;
        if ($httpStatus < 100 || $httpStatus > 599) {
            $httpStatus = 400;
        }

        $requestId = request()->header('X-Request-Id', (string) Str::uuid());

        $payload = [
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
                'fields' => $fields,
            ],
            'meta' => [
                'request_id' => $requestId,
                'mode' => 'MOCK',
                'version' => 'v1',
            ],
        ];

        $response = response()->json($payload, $httpStatus);

        if ($retryAfterSeconds !== null) {
            $response->header('Retry-After', (string) $retryAfterSeconds);
        }

        return $response;
    }
}
