<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApplicationDecision extends Model
{
    protected $table = 'application_decisions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'application_id',
        'reviewer_user_id',
        'decision',
        'reason',
        'required_changes_json',
        'from_status',
        'to_status',
        'lock_version',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'decided_at' => 'datetime',
            'required_changes_json' => 'array',
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

    public function application()
    {
        return $this->belongsTo(BusinessApplication::class, 'application_id', 'id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_user_id', 'id');
    }
}
