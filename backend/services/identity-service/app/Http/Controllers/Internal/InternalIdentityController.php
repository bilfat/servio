<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\AuthSession;
use App\Models\Organization;
use App\Models\RoleAssignment;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class InternalIdentityController extends Controller
{
    /**
     * I01: Session Introspection
     */
    public function introspectSession(Request $request)
    {
        $validated = $request->validate([
            'session_reference' => 'required|string',
        ]);

        $session = AuthSession::where('session_id', $validated['session_reference'])
            ->whereNull('revoked_at')
            ->with('user')
            ->first();

        if (!$session || !$session->user || $session->user->status === 'SUSPENDED' || $session->user->status === 'DEACTIVATED') {
            return response()->json([
                'success' => true,
                'code' => 'IDENTITY_SESSION_INACTIVE',
                'data' => [
                    'active' => false,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'code' => 'IDENTITY_SESSION_ACTIVE',
            'data' => [
                'active' => true,
                'user_id' => $session->user_id,
                'role_assignment_id' => $session->active_role_assignment_id,
                'organization_id' => $session->active_organization_id,
                'authz_version' => $session->user->authz_version,
                'expires_at' => now()->addMinutes(120)->toIso8601String(),
            ],
        ]);
    }

    /**
     * I02: Evaluate Authorization
     */
    public function evaluateAuthorization(Request $request)
    {
        $validated = $request->validate([
            'actor_user_id' => 'required|string',
            'permission' => 'required|string',
            'active_role_assignment_id' => 'nullable|string',
            'organization_id' => 'nullable|string',
        ]);

        $user = User::find($validated['actor_user_id']);
        if (!$user || $user->status !== 'ACTIVE') {
            return response()->json([
                'success' => true,
                'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                'data' => [
                    'allow' => false,
                    'reason_code' => 'ACCOUNT_INACTIVE_OR_SUSPENDED',
                    'authz_version' => $user?->authz_version ?? 0,
                ],
            ]);
        }

        $query = RoleAssignment::where('user_id', $user->id)->where('status', 'ACTIVE');
        if (!empty($validated['active_role_assignment_id'])) {
            $query->where('id', $validated['active_role_assignment_id']);
        }

        $assignment = $query->whereHas('role.permissions', function ($q) use ($validated) {
            $q->where('code', $validated['permission']);
        })->first();

        if (!$assignment) {
            return response()->json([
                'success' => true,
                'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                'data' => [
                    'allow' => false,
                    'reason_code' => 'PERMISSION_NOT_GRANTED',
                    'authz_version' => $user->authz_version,
                ],
            ]);
        }

        // If organization scoped, verify organization match
        if ($assignment->membership_id && !empty($validated['organization_id'])) {
            if ($assignment->membership?->organization_id !== $validated['organization_id']) {
                return response()->json([
                    'success' => true,
                    'code' => 'IDENTITY_AUTHORIZATION_DENIED',
                    'data' => [
                        'allow' => false,
                        'reason_code' => 'ORGANIZATION_SCOPE_MISMATCH',
                        'authz_version' => $user->authz_version,
                    ],
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'code' => 'IDENTITY_AUTHORIZATION_EVALUATED',
            'data' => [
                'allow' => true,
                'reason_code' => 'POLICY_ALLOW',
                'authz_version' => $user->authz_version,
            ],
        ]);
    }

    /**
     * I03: Get User Access Context
     */
    public function getUserAccessContext(Request $request, string $userId)
    {
        $user = User::with(['roleAssignments.role', 'memberships.organization'])->find($userId);
        if (!$user) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Pengguna tidak ditemukan.', 404);
        }

        $roles = $user->roleAssignments->map(fn($ra) => [
            'assignment_id' => $ra->id,
            'role_code' => $ra->role->code,
            'organization_id' => $ra->membership?->organization_id,
            'status' => $ra->status,
        ])->all();

        $memberships = $user->memberships->map(fn($m) => [
            'membership_id' => $m->id,
            'organization_id' => $m->organization_id,
            'kind' => $m->kind,
            'status' => $m->status,
        ])->all();

        return response()->json([
            'success' => true,
            'code' => 'IDENTITY_ACCESS_CONTEXT_LOADED',
            'data' => [
                'user_id' => $user->id,
                'status' => $user->status,
                'roles' => $roles,
                'memberships' => $memberships,
                'authz_version' => $user->authz_version,
            ],
        ]);
    }

    /**
     * I04: Get Organization Status
     */
    public function getOrganizationStatus(Request $request, string $id)
    {
        $org = Organization::find($id);
        if (!$org) {
            return ApiResponse::error('IDENTITY_RESOURCE_NOT_FOUND', 'Organisasi tidak ditemukan.', 404);
        }

        return response()->json([
            'success' => true,
            'code' => 'IDENTITY_ORGANIZATION_STATUS_LOADED',
            'data' => [
                'organization_id' => $org->id,
                'type' => $org->type,
                'status' => $org->status,
                'authorization_version' => 1,
            ],
        ]);
    }

    /**
     * U01: Get Identity Audit Logs
     */
    public function getAuditLogs(Request $request)
    {
        $query = AuditLog::query();

        if ($request->has('actor_user_id')) {
            $query->where('actor_user_id', $request->query('actor_user_id'));
        }
        if ($request->has('event_code')) {
            $query->where('event_code', $request->query('event_code'));
        }
        if ($request->has('target_type')) {
            $query->where('target_type', $request->query('target_type'));
        }

        $items = $query->orderBy('occurred_at', 'desc')->paginate(30);

        return ApiResponse::success([
            'items' => $items->items(),
            'has_more' => $items->hasMorePages(),
        ], 'IDENTITY_AUDIT_LOGS_LOADED', 200);
    }
}
