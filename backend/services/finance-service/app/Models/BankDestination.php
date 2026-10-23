<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class BankDestination extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'owner_type',
        'owner_external_id',
        'bank_code',
        'account_number',
        'account_holder_name',
        'account_number_ciphertext',
        'account_number_hmac',
        'account_last4',
        'account_holder_name_ciphertext',
        'account_holder_name_masked',
        'verification_status',
        'verification_method',
        'verified_at',
        'is_default',
        'created_by_user_id',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'verified_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::ulid();
            }
        });
    }

    public function setAccountNumberAttribute(string $value): void
    {
        $this->attributes['account_number_ciphertext'] = Crypt::encryptString($value);
        $this->attributes['account_number_hmac'] = hash_hmac('sha256', $value, (string) config('app.key'));
        $this->attributes['account_last4'] = substr($value, -4);
    }

    public function setAccountHolderNameAttribute(string $value): void
    {
        $this->attributes['account_holder_name_ciphertext'] = Crypt::encryptString($value);
        $this->attributes['account_holder_name_masked'] = self::maskName($value);
    }

    public function getDecryptedAccountNumber(): ?string
    {
        if (empty($this->account_number_ciphertext)) {
            return null;
        }
        try {
            return Crypt::decryptString($this->account_number_ciphertext);
        } catch (\Throwable) {
            return null;
        }
    }

    public static function maskName(string $name): string
    {
        $parts = explode(' ', trim($name));
        $masked = [];
        foreach ($parts as $p) {
            if (strlen($p) <= 2) {
                $masked[] = $p;
            } else {
                $masked[] = substr($p, 0, 1) . str_repeat('*', strlen($p) - 1);
            }
        }
        return implode(' ', $masked);
    }

    public function withdrawals(): HasMany
    {
        return $this->hasMany(WithdrawalRequest::class, 'bank_destination_id');
    }
}
