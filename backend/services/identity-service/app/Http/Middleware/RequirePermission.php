<?php

namespace App\Http\Middleware;

use App\Models\RoleAssignment;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = Auth::user();
        if (!$user) {
            return ApiResponse::error(
                'IDENTITY_AUTH_UNAUTHENTICATED',
                'Unauthenticated',
                401
            );
        }

        // Check if user has active role assignment that includes this permission
        $hasPermission = RoleAssignment::where('user_id', $user->id)
            ->where('status', 'ACTIVE')
            ->whereHas('role.permissions', function ($q) use ($permission) {
                $q->where('code', $permission);
            })->exists();

        if (!$hasPermission) {
            return ApiResponse::error(
                'IDENTITY_PERMISSION_DENIED',
                'Akses tidak diizinkan untuk konteks ini.',
                403
            );
        }

        return $next($request);
    }
}
