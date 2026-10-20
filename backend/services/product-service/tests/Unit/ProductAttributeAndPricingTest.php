<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\ProductVariant;
use PHPUnit\Framework\TestCase as BaseTestCase;

class ProductAttributeAndPricingTest extends BaseTestCase
{
    public function test_string_normalization_collapses_whitespace_and_lowercases(): void
    {
        $input = "  AC   Portable   1   PK  ";
        $normalized = Product::normalizeString($input);

        $this->assertEquals("ac portable 1 pk", $normalized);
    }

    public function test_canonical_variant_attribute_signature_is_deterministic(): void
    {
        $attr1 = [
            'warna' => 'Putih',
            'kapasitas' => '1 PK',
        ];

        // Same attributes, different key order and mixed casing / spaces
        $attr2 = [
            '  KAPASITAS  ' => ' 1  pk ',
            ' WARNA ' => 'putih',
        ];

        $sig1 = ProductVariant::computeSignature($attr1);
        $sig2 = ProductVariant::computeSignature($attr2);

        $this->assertEquals($sig1, $sig2, 'Signature atribut dengan urutan key dan spasi berbeda harus menghasilkan signature kanonikal yang sama.');
    }

    public function test_different_attributes_produce_different_signatures(): void
    {
        $attr1 = ['warna' => 'Putih', 'kapasitas' => '1 PK'];
        $attr2 = ['warna' => 'Hitam', 'kapasitas' => '1 PK'];

        $sig1 = ProductVariant::computeSignature($attr1);
        $sig2 = ProductVariant::computeSignature($attr2);

        $this->assertNotEquals($sig1, $sig2);
    }
}
