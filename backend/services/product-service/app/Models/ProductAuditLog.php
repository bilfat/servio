<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAuditLog extends Model
{
    use HasFactory;

    protected $table = 'product_audit_logs';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'product_id',
        'actor_user_id',
        'actor_role',
        'actor_org_id',
        'action',
        'entity_type',
        'entity_id',
        'before_safe',
        'after_safe',
        'reason',
        'request_id',
        'correlation_id',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'before_safe' => 'array',
            'after_safe' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
