<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuthSession extends Model
{
    protected $table = 'auth_sessions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'session_id',
        'user_id',
        'active_role_assignment_id',
        'active_organization_id',
        'device_name',
        'created_ip',
        'last_seen_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'revoked_at' => 'datetime',
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

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function activeRoleAssignment()
    {
        return $this->belongsTo(RoleAssignment::class, 'active_role_assignment_id', 'id');
    }

    public function activeOrganization()
    {
        return $this->belongsTo(Organization::class, 'active_organization_id', 'id');
    }
}
