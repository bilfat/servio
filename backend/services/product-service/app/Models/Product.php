<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'products';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'merchant_organization_id',
        'created_by_user_id',
        'name',
        'normalized_name',
        'description',
        'brand_name',
        'brand_normalized',
        'category_id',
        'subcategory_id',
        'status',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'lock_version' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    public function activeVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'product_id')
            ->where('status', 'ACTIVE')
            ->whereNull('deleted_at');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class, 'product_id')->orderBy('sort_order');
    }

    public function generalMedia(): HasMany
    {
        return $this->hasMany(ProductMedia::class, 'product_id')
            ->where('scope', 'GENERAL')
            ->whereNull('deleted_at')
            ->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductMedia::class, 'product_id')
            ->where('scope', 'GENERAL')
            ->whereNull('deleted_at')
            ->orderBy('is_primary', 'desc')
            ->orderBy('sort_order');
    }

    public function categoryAssignments(): HasMany
    {
        return $this->hasMany(ProductCategoryAssignment::class, 'product_id');
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(ProductStockAdjustment::class, 'product_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(ProductAuditLog::class, 'product_id');
    }

    public function outboxEvents(): HasMany
    {
        return $this->hasMany(ProductOutboxEvent::class, 'product_id');
    }

    public static function normalizeString(?string $str): string
    {
        if ($str === null) {
            return '';
        }
        $trimmed = trim($str);
        $collapsed = preg_replace('/\s+/', ' ', $trimmed);
        return mb_strtolower($collapsed, 'UTF-8');
    }
}
