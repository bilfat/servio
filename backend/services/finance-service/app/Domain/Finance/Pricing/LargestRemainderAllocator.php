<?php

namespace App\Domain\Finance\Pricing;

class LargestRemainderAllocator
{
    /**
     * Distributes a total integer amount across multiple items proportional to their weights.
     * Uses the Largest Remainder Method (Hamilton-Hare method) to guarantee the sum of distributed
     * parts equals the total integer exactly, with tie-breaking on orderId ascending.
     *
     * @param int $totalAmount Total integer amount to distribute (e.g. customer_app_fee_idr)
     * @param array<int, array{id: string, weight: int}> $items Array of items with 'id' and 'weight'
     * @return array<string, int> Map of item id => allocated integer amount
     */
    public static function allocate(int $totalAmount, array $items): array
    {
        if (empty($items)) {
            return [];
        }

        if (count($items) === 1) {
            return [$items[0]['id'] => $totalAmount];
        }

        $totalWeight = array_sum(array_column($items, 'weight'));

        // If total weight is 0, split evenly with tie-breaker
        if ($totalWeight <= 0) {
            $count = count($items);
            $base = intdiv($totalAmount, $count);
            $remainder = $totalAmount % $count;

            usort($items, fn($a, $b) => strcmp($a['id'], $b['id']));
            $result = [];
            foreach ($items as $idx => $item) {
                $result[$item['id']] = $base + ($idx < $remainder ? 1 : 0);
            }
            return $result;
        }

        $allocated = [];
        $remainders = [];
        $sumAllocated = 0;

        foreach ($items as $item) {
            $exact = ($totalAmount * $item['weight']) / $totalWeight;
            $floor = (int) floor($exact);
            $fraction = $exact - $floor;

            $allocated[$item['id']] = $floor;
            $sumAllocated += $floor;
            $remainders[$item['id']] = [
                'id' => $item['id'],
                'fraction' => $fraction,
            ];
        }

        $shortfall = $totalAmount - $sumAllocated;

        // Sort items by fraction descending; tie-break by ID ascending lexicographically
        usort($remainders, function ($a, $b) {
            if ($b['fraction'] > $a['fraction']) {
                return 1;
            }
            if ($b['fraction'] < $a['fraction']) {
                return -1;
            }
            return strcmp($a['id'], $b['id']);
        });

        for ($i = 0; $i < $shortfall; $i++) {
            $id = $remainders[$i]['id'];
            $allocated[$id]++;
        }

        return $allocated;
    }
}
