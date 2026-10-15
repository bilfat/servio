<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StaffOnboarding extends Model
{
    protected $table = 'staff_onboarding';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'staff_user_id',
        'status',
        'revision_notes',
        'rejection_reason',
        'reviewed_by',
        'completed_at',
        'created_by',
        'last_verified_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
            'last_verified_at' => 'datetime',
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

    public function staffUser()
    {
        return $this->belongsTo(User::class, 'staff_user_id', 'id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    public function steps()
    {
        return $this->hasMany(StaffOnboardingStep::class, 'onboarding_id', 'id');
    }

    public function isOperationalReady(): bool
    {
        return $this->status === 'OPERATIONAL_READY';
    }
}
