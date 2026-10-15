<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class StaffOnboardingStep extends Model
{
    protected $table = 'staff_onboarding_steps';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'onboarding_id',
        'step_key',
        'status',
        'evidence_document_id',
        'document_version',
        'completed_at',
        'reviewed_by',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
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

    public function onboarding()
    {
        return $this->belongsTo(StaffOnboarding::class, 'onboarding_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'id');
    }
}
