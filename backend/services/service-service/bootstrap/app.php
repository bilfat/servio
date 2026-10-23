<?php

use App\Support\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::group([], __DIR__.'/../routes/internal.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'service.auth' => \App\Http\Middleware\AuthenticateServiceActor::class,
            'service.perm' => \App\Http\Middleware\RequireServicePermission::class,
            'service.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
            'service.idempotency' => \App\Http\Middleware\HandleIdempotency::class,
        ]);

        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'internal/*',
            'api/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'SERVICE_VALIDATION_FAILED',
                    'Validasi data formulir gagal.',
                    422,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'SERVICE_UNAUTHENTICATED',
                    403 => 'SERVICE_FORBIDDEN',
                    404 => 'SERVICE_NOT_FOUND',
                    409 => 'SERVICE_VERSION_CONFLICT',
                    413 => 'SERVICE_MEDIA_TOO_LARGE',
                    415 => 'SERVICE_MEDIA_UNSUPPORTED',
                    422 => 'SERVICE_VALIDATION_FAILED',
                    428 => 'SERVICE_PRECONDITION_REQUIRED',
                    429 => 'SERVICE_RATE_LIMITED',
                    503 => 'SERVICE_UNAVAILABLE',
                    default => 'SERVICE_HTTP_ERROR',
                };

                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada permintaan HTTP.',
                    $e->getStatusCode()
                );
            }
        });

        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $debug = config('app.debug', false);

                return ApiResponse::error(
                    'SERVICE_INTERNAL_SERVER_ERROR',
                    $debug ? $e->getMessage() : 'Terjadi kesalahan sistem internal pada layanan jasa.',
                    500,
                    [],
                    $debug ? [
                        'exception' => get_class($e),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                    ] : null
                );
            }
        });
    })->create();
