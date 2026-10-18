<?php

namespace App\Support;

class CategoryNormalizer
{
    public static function normalize(?string $name): string
    {
        if ($name === null) {
            return '';
        }

        // 1. Trim surrounding whitespace
        $trimmed = trim($name);

        // 2. Collapse internal whitespace sequences into a single space
        $collapsed = preg_replace('/\s+/u', ' ', $trimmed) ?? $trimmed;

        // 3. Convert to lowercase using UTF-8
        return mb_strtolower($collapsed, 'UTF-8');
    }
}
