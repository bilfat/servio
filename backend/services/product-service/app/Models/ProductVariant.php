<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'product_variants';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'product_id',
        'attributes_json',
        'attribute_signature',
        'display_name',
        'price_idr',
        'stock_qty',
        'status',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'attributes_json' => 'array',
            'price_idr' => 'integer',
            'stock_qty' => 'integer',
            'lock_version' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class, 'variant_id')
            ->whereNull('deleted_at')
            ->orderBy('sort_order');
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(ProductStockAdjustment::class, 'variant_id');
    }

    /**
     * Compute canonical SHA-256 signature for variant attributes.
     */
    public static function computeSignature(array $attributes): string
    {
        $normalized = [];
        foreach ($attributes as $k => $v) {
            $normKey = mb_strtolower(trim(preg_replace('/\s+/', ' ', (string) $k)), 'UTF-8');
            $normVal = mb_strtolower(trim(preg_replace('/\s+/', ' ', (string) $v)), 'UTF-8');
            $normalized[$normKey] = $normVal;
        }

        ksort($normalized);

        $canonicalJson = json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return hash('sha256', $canonicalJson);
    }
}
