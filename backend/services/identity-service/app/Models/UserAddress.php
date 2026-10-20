<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'user_addresses';

    protected $fillable = [
        'id',
        'user_id',
        'label',
        'recipient_name',
        'phone',
        'address_line',
        'province',
        'city',
        'district',
        'village',
        'postal_code',
        'latitude',
        'longitude',
        'is_default',
        'status',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Map model attributes to frontend ApiAddress contract
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => (string) $this->id,
            'ownerType' => 'USER',
            'ownerId' => (string) $this->user_id,
            'label' => $this->label ?? 'Rumah',
            'recipientName' => $this->recipient_name,
            'phone' => $this->phone,
            'addressLine' => $this->address_line,
            'province' => $this->province,
            'city' => $this->city,
            'district' => $this->district,
            'village' => $this->village,
            'postalCode' => $this->postal_code,
            'latitude' => $this->latitude !== null ? (float) $this->latitude : null,
            'longitude' => $this->longitude !== null ? (float) $this->longitude : null,
            'isDefault' => (bool) $this->is_default,
            'status' => $this->status ?? 'ACTIVE',
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
