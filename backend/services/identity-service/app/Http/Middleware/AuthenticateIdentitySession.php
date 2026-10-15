<?php

namespace App\Http\Middleware;

use App\Models\AuthSession;
use App\Models\User;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthenticateIdentitySession
{
    public function handle(Request $request, Closure $next, ?string $requiredStage = null)
    {
        $user = null;
        $bearerToken = $request->bearerToken()
            ?? $request->cookie('servio_token')
            ?? $request->cookie('servio_session')
            ?? $request->header('X-Session-Token')
            ?? $request->query('token')
            ?? $request->query('session_token');
        if ($bearerToken) {
            $authSession = AuthSession::where('session_id', $bearerToken)
                ->whereNull('revoked_at')
                ->with('user')
                ->first();

            if ($authSession && $authSession->user) {
                $user = $authSession->user;
                Auth::setUser($user);
                $request->attributes->set('auth_session', $authSession);
            } else {
                Auth::forgetGuards();
                return ApiResponse::error(
                    'IDENTITY_AUTH_UNAUTHENTICATED',
                    'Sesi tidak valid atau telah kedaluwarsa.',
                    401
                );
            }
        } else {
            $user = Auth::user();

            // Local development fallback for inline document viewing without headers from <img> tags
            if (!$user && app()->environment('local') && ($request->is('api/v1/identity/documents/*') || $request->has('inline'))) {
                $latestCeoSession = AuthSession::whereNull('revoked_at')
                    ->whereHas('user.roleAssignments.role', function ($q) {
                        $q->where('code', 'CEO_PRODUCT_OWNER');
                    })
                    ->latest()
                    ->with('user')
                    ->first();
                if ($latestCeoSession && $latestCeoSession->user) {
                    $user = $latestCeoSession->user;
                    Auth::setUser($user);
                    $request->attributes->set('auth_session', $latestCeoSession);
                }
            }
        }

        if (!$user) {
            return ApiResponse::error(
                'IDENTITY_AUTH_UNAUTHENTICATED',
                'Sesi tidak valid atau belum terautentikasi.',
                401
            );
        }

        if ($user->status === 'SUSPENDED') {
            return ApiResponse::error(
                'IDENTITY_ACCOUNT_SUSPENDED',
                'Akun Anda sedang ditangguhkan. Hubungi tim dukungan untuk informasi lebih lanjut.',
                403
            );
        }

        if ($user->status === 'DEACTIVATED') {
            return ApiResponse::error(
                'IDENTITY_ACCOUNT_NOT_ACTIVE',
                'Akun Anda telah dinonaktifkan.',
                403
            );
        }

        // Stage check: if route requires ACTIVE account, reject PENDING / VERIFICATION_REQUIRED
        if ($requiredStage === 'ACTIVE' && $user->status !== 'ACTIVE') {
            return ApiResponse::error(
                'IDENTITY_ACCOUNT_NOT_ACTIVE',
                'Akun Anda belum menyelesaikan proses verifikasi identitas (KYC/OTP).',
                403
            );
        }

        return $next($request);
    }
}
