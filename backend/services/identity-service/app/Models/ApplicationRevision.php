<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApplicationRevision extends Model
{
    protected $table = 'application_revisions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'application_id',
        'revision_no',
        'snapshot_ciphertext',
        'submitted_at',
        'submitted_by',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'revision_no' => 'integer',
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

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by', 'id');
    }
}
