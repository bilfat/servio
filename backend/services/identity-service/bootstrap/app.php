<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use App\Support\ApiResponse;

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
            'identity.auth' => \App\Http\Middleware\AuthenticateIdentitySession::class,
            'identity.perm' => \App\Http\Middleware\RequirePermission::class,
            'identity.internal' => \App\Http\Middleware\RequireInternalServiceKey::class,
        ]);

        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'internal/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ValidationException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'IDENTITY_VALIDATION_FAILED',
                    'Validasi data formulir gagal.',
                    422,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (HttpException $e, $request) {
            if ($request->is('api/*') || $request->is('internal/*') || $request->expectsJson()) {
                $code = match ($e->getStatusCode()) {
                    401 => 'IDENTITY_AUTH_UNAUTHENTICATED',
                    403 => 'IDENTITY_PERMISSION_DENIED',
                    404 => 'IDENTITY_RESOURCE_NOT_FOUND',
                    409 => 'IDENTITY_APPLICATION_VERSION_CONFLICT',
                    410 => 'IDENTITY_INVITATION_EXPIRED',
                    419 => 'IDENTITY_CSRF_TOKEN_MISMATCH',
                    423 => 'IDENTITY_OTP_LOCKED',
                    429 => 'IDENTITY_RATE_LIMITED',
                    default => 'IDENTITY_ERROR',
                };
                return ApiResponse::error(
                    $code,
                    $e->getMessage() ?: 'Terjadi kesalahan pada server.',
                    $e->getStatusCode()
                );
            }
        });
    })->create();
