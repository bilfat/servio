<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Organization extends Model
{
    protected $table = 'organizations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'type',
        'status',
        'approved_application_id',
        'activated_at',
        'deactivated_at',
    ];

    protected function casts(): array
    {
        return [
            'activated_at' => 'datetime',
            'deactivated_at' => 'datetime',
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

    public function profile()
    {
        return $this->hasOne(OrganizationProfile::class, 'organization_id', 'id');
    }

    public function memberships()
    {
        return $this->hasMany(Membership::class, 'organization_id', 'id');
    }

    public function approvedApplication()
    {
        return $this->belongsTo(BusinessApplication::class, 'approved_application_id', 'id');
    }
}
