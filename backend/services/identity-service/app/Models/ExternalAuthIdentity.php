<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ExternalAuthIdentity extends Model
{
    protected $table = 'external_auth_identities';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'provider',
        'provider_subject',
        'provider_email',
        'email_verified_at',
        'linked_at',
        'unlinked_at',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'linked_at' => 'datetime',
            'unlinked_at' => 'datetime',
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
}
