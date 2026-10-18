<?php

namespace Tests\Unit;

use App\Support\CategoryNormalizer;
use PHPUnit\Framework\TestCase;

class CategoryNormalizerTest extends TestCase
{
    public function test_normalizer_trims_and_collapses_whitespace(): void
    {
        $input = "  Elektronik   Rumah   Tangga  ";
        $expected = "elektronik rumah tangga";

        $this->assertEquals($expected, CategoryNormalizer::normalize($input));
    }

    public function test_normalizer_converts_to_lowercase_utf8(): void
    {
        $input = "SERVIS KENDARAAN & OLI";
        $expected = "servis kendaraan & oli";

        $this->assertEquals($expected, CategoryNormalizer::normalize($input));
    }

    public function test_normalizer_handles_null(): void
    {
        $this->assertEquals('', CategoryNormalizer::normalize(null));
    }
}
