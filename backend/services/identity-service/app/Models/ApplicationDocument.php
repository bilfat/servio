<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ApplicationDocument extends Model
{
    protected $table = 'application_documents';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'application_id',
        'revision_no',
        'doc_type',
        'private_storage_key',
        'sha256',
        'mime',
        'size_bytes',
        'verification_status',
    ];

    protected function casts(): array
    {
        return [
            'revision_no' => 'integer',
            'size_bytes' => 'integer',
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
}
