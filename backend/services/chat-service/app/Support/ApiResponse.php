<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ApiResponse
{
    public static function success(mixed $data = null, mixed $statusOrMessage = 200, mixed $metaOrStatus = [], string $code = 'CHAT_OK'): JsonResponse
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
        array $fields = []
    ): JsonResponse {
        $httpStatus = is_int($status) ? $status : 400;
        $requestId = request()->header('X-Request-Id', (string) Str::uuid());

        $payload = [
            'success' => false,
            'code' => $code,
            'error' => [
                'message' => $message,
                'details' => $details,
                'fields' => $fields,
            ],
            'meta' => [
                'request_id' => $requestId,
                'version' => 'v1',
            ],
        ];

        return response()->json($payload, $httpStatus);
    }
}
