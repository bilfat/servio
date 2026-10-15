<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BusinessApplication extends Model
{
    protected $table = 'business_applications';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'application_code',
        'applicant_user_id',
        'target_role',
        'status',
        'revision_no',
        'lock_version',
        'draft_data_ciphertext',
        'submitted_at',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'revision_no' => 'integer',
            'lock_version' => 'integer',
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

    public function applicant()
    {
        return $this->belongsTo(User::class, 'applicant_user_id', 'id');
    }

    public function revisions()
    {
        return $this->hasMany(ApplicationRevision::class, 'application_id', 'id');
    }

    public function documents()
    {
        return $this->hasMany(ApplicationDocument::class, 'application_id', 'id');
    }

    public function decisions()
    {
        return $this->hasMany(ApplicationDecision::class, 'application_id', 'id');
    }
}
