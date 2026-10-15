<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'users';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'email',
        'phone_e164',
        'password_hash',
        'status',
        'authz_version',
        'email_verified_at',
        'phone_verified_at',
        'last_login_at',
        'suspended_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'suspended_at' => 'datetime',
            'authz_version' => 'integer',
        ];
    }

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function getAuthPassword(): ?string
    {
        return $this->password_hash;
    }

    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'user_id', 'id');
    }

    public function nikRecord()
    {
        return $this->hasOne(UserNikRecord::class, 'user_id', 'id');
    }

    public function roleAssignments()
    {
        return $this->hasMany(RoleAssignment::class, 'user_id', 'id');
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class, 'user_id', 'id');
    }

    public function staffOnboarding()
    {
        return $this->hasOne(StaffOnboarding::class, 'staff_user_id', 'id');
    }

    public function externalIdentities()
    {
        return $this->hasMany(ExternalAuthIdentity::class, 'user_id', 'id');
    }

    public function verificationRequests()
    {
        return $this->hasMany(IdentityVerificationRequest::class, 'user_id', 'id');
    }

    public function businessApplications()
    {
        return $this->hasMany(BusinessApplication::class, 'applicant_user_id', 'id');
    }

    public function authSessions()
    {
        return $this->hasMany(AuthSession::class, 'user_id', 'id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'SUSPENDED';
    }

    public function hasRole(string $roleCode): bool
    {
        return $this->roleAssignments()
            ->where('status', 'ACTIVE')
            ->whereHas('role', function ($q) use ($roleCode) {
                $q->where('code', $roleCode);
            })->exists();
    }

    public function hasActiveRole(string $roleCode): bool
    {
        return $this->hasRole($roleCode);
    }

    public function getActiveRoleAssignments()
    {
        return $this->roleAssignments()
            ->where('status', 'ACTIVE')
            ->with(['role', 'membership.organization'])
            ->get();
    }

    public function hasPermission(string $permissionCode): bool
    {
        if ($this->hasRole('CEO_PRODUCT_OWNER')) {
            return true;
        }

        return RoleAssignment::where('user_id', $this->id)
            ->where('status', 'ACTIVE')
            ->whereHas('role.permissions', function ($q) use ($permissionCode) {
                $q->where('code', $permissionCode);
            })->exists();
    }

    /**
     * Hapus akun pengguna yang statusnya masih VERIFICATION_REQUIRED dan tidak memasukkan
     * kode verifikasi dalam jangka waktu tertentu (default: 1 jam).
     */
    public static function cleanupUnverifiedExpiredUsers(int $hours = 1): int
    {
        $threshold = now()->subHours($hours);
        $expiredUsers = self::where('status', 'VERIFICATION_REQUIRED')
            ->where('created_at', '<', $threshold)
            ->get();

        $count = 0;
        foreach ($expiredUsers as $user) {
            \Illuminate\Support\Facades\DB::transaction(function () use ($user) {
                UserProfile::where('user_id', $user->id)->delete();
                RoleAssignment::where('user_id', $user->id)->delete();
                Membership::where('user_id', $user->id)->delete();
                AuthSession::where('user_id', $user->id)->delete();
                PasswordResetGrant::where('user_id', $user->id)->delete();
                OtpChallenge::where('user_id', $user->id)->delete();
                if ($user->email) {
                    $hash = \App\Services\OtpService::hashIdentifier($user->email);
                    OtpChallenge::where('identifier_hash', $hash)->delete();
                }
                $user->delete();
            });
            $count++;
        }

        return $count;
    }
}
