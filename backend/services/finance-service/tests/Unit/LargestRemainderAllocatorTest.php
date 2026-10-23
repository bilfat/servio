<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Finance\Pricing\LargestRemainderAllocator;
use PHPUnit\Framework\TestCase;

class LargestRemainderAllocatorTest extends TestCase
{
    public function test_single_order_receives_entire_amount(): void
    {
        $items = [
            ['id' => 'ORD-1', 'weight' => 150000],
        ];

        $allocations = LargestRemainderAllocator::allocate(3000, $items);

        $this->assertCount(1, $allocations);
        $this->assertSame(3000, $allocations['ORD-1']);
    }

    public function test_multi_order_proportional_allocation_with_largest_remainder(): void
    {
        $items = [
            ['id' => 'ORD-A', 'weight' => 100000],
            ['id' => 'ORD-B', 'weight' => 200000],
        ];

        // Total weight = 300.000. Fee = 3.000.
        // ORD-A: 1/3 * 3000 = 1000.
        // ORD-B: 2/3 * 3000 = 2000.
        $allocations = LargestRemainderAllocator::allocate(3000, $items);

        $this->assertSame(1000, $allocations['ORD-A']);
        $this->assertSame(2000, $allocations['ORD-B']);
        $this->assertSame(3000, array_sum($allocations));
    }

    public function test_hamilton_hare_rounding_satisfies_exact_sum_invariant(): void
    {
        // 3 orders with equal subtotals, fee = 1000 IDR (not evenly divisible)
        // 1000 / 3 = 333.333333 each.
        // Base integer = 333 each (sum = 999). Remainder to distribute = 1.
        // Deterministic tie-breaker: ORD-01 gets the extra 1 IDR because 'ORD-01' < 'ORD-02' < 'ORD-03'.
        $items = [
            ['id' => 'ORD-02', 'weight' => 50000],
            ['id' => 'ORD-01', 'weight' => 50000],
            ['id' => 'ORD-03', 'weight' => 50000],
        ];

        $allocations = LargestRemainderAllocator::allocate(1000, $items);

        $this->assertSame(1000, array_sum($allocations));
        $this->assertSame(334, $allocations['ORD-01']);
        $this->assertSame(333, $allocations['ORD-02']);
        $this->assertSame(333, $allocations['ORD-03']);
    }

    public function test_zero_fee_returns_zero_for_all(): void
    {
        $items = [
            ['id' => 'ORD-1', 'weight' => 100000],
            ['id' => 'ORD-2', 'weight' => 200000],
        ];

        $allocations = LargestRemainderAllocator::allocate(0, $items);

        $this->assertSame(0, $allocations['ORD-1']);
        $this->assertSame(0, $allocations['ORD-2']);
        $this->assertSame(0, array_sum($allocations));
    }
}
