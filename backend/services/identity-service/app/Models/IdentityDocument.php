<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class IdentityDocument extends Model
{
    protected $table = 'identity_documents';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'verification_request_id',
        'type',
        'private_storage_key',
        'sha256',
        'mime',
        'size_bytes',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
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

    public function verificationRequest()
    {
        return $this->belongsTo(IdentityVerificationRequest::class, 'verification_request_id', 'id');
    }
}
