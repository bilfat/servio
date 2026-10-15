<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class UserNikRecord extends Model
{
    use HasFactory;

    protected $table = 'user_nik_records';
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'nik_ciphertext',
        'format_validated_at',
        'locked_at',
    ];

    protected $casts = [
        'format_validated_at' => 'datetime',
        'locked_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getDecryptedNikAttribute(): ?string
    {
        if (empty($this->nik_ciphertext)) {
            return null;
        }

        try {
            return Crypt::decryptString($this->nik_ciphertext);
        } catch (\Throwable) {
            // fallback if base64 encoded
            try {
                return base64_decode($this->nik_ciphertext);
            } catch (\Throwable) {
                return null;
            }
        }
    }

    public function getMaskedNikAttribute(): ?string
    {
        $nik = $this->decrypted_nik;
        if (empty($nik)) {
            return null;
        }

        return str_repeat('*', 12) . substr($nik, -4);
    }
}
