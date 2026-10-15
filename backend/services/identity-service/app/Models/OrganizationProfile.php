<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationProfile extends Model
{
    protected $table = 'organization_profiles';
    protected $primaryKey = 'organization_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'organization_id',
        'legal_name',
        'display_name',
        'business_email',
        'business_phone',
        'address_json',
        'nib_ciphertext',
        'nib_lookup_hash',
        'npwp_ciphertext',
        'npwp_lookup_hash',
        'specialization_json',
    ];

    protected function casts(): array
    {
        return [
            'address_json' => 'array',
            'specialization_json' => 'array',
        ];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class, 'organization_id', 'id');
    }

    public function getDecryptedNib(): ?string
    {
        if (empty($this->nib_ciphertext)) {
            return null;
        }
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($this->nib_ciphertext);
        } catch (\Throwable $e) {
            return base64_decode($this->nib_ciphertext) ?: $this->nib_ciphertext;
        }
    }

    public function getDecryptedNpwp(): ?string
    {
        if (empty($this->npwp_ciphertext)) {
            return null;
        }
        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($this->npwp_ciphertext);
        } catch (\Throwable $e) {
            return base64_decode($this->npwp_ciphertext) ?: $this->npwp_ciphertext;
        }
    }
}
