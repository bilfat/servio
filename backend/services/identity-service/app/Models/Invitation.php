<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Invitation extends Model
{
    protected $table = 'invitations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'kind',
        'issuer_user_id',
        'recipient_user_id',
        'recipient_email',
        'organization_id',
        'target_role',
        'token_hash',
        'encrypted_token',
        'status',
        'expires_at',
        'accepted_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
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

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issuer_user_id', 'id');
    }

    public function recipient()
    {
        return $this->belongsTo(User::class, 'recipient_user_id', 'id');
    }

    public function recipientUser()
    {
        return $this->recipient();
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }
}
