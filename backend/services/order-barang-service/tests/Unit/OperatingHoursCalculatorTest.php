<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Cancellation\OperatingHoursCalculator;
use Carbon\Carbon;
use Tests\TestCase;

class OperatingHoursCalculatorTest extends TestCase
{
    private OperatingHoursCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new OperatingHoursCalculator();
    }

    public function test_calculates_12_operational_hours_spanning_across_night_closures(): void
    {
        // Merchant open Mon-Fri 08:00 - 17:00 (9 hours/day), Saturday & Sunday closed.
        $schedule = [
            'timezone' => 'Asia/Jakarta',
            'days' => [
                'monday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'tuesday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'wednesday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'thursday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'friday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'saturday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => true],
                'sunday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => true],
            ],
            'holidays' => [],
        ];

        // Customer submits request on Monday at 14:00 WIB
        // Monday 14:00 to 17:00 = 3 operating hours used (9 remaining)
        // Night 17:00 to 08:00 Tuesday is skipped
        // Tuesday 08:00 to 17:00 = 9 operating hours used (0 remaining)
        // Deadline should be Tuesday 17:00 WIB
        $requestedAt = Carbon::create(2026, 10, 26, 14, 0, 0, 'Asia/Jakarta');

        $deadline = $this->calculator->calculateDeadline($requestedAt, $schedule, 12);
        $deadlineWib = $deadline->setTimezone('Asia/Jakarta');

        $this->assertEquals('2026-10-27 17:00:00', $deadlineWib->format('Y-m-d H:i:s'));
    }

    public function test_skips_closed_weekend_days(): void
    {
        $schedule = [
            'timezone' => 'Asia/Jakarta',
            'days' => [
                'monday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'friday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => false],
                'saturday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => true],
                'sunday' => ['open' => '08:00', 'close' => '17:00', 'is_closed' => true],
            ],
            'holidays' => [],
        ];

        // Friday 15:00 WIB (2 operating hours left on Friday)
        // 10 hours remaining must carry over to Monday!
        // Monday 08:00 + 9 hours = 17:00 (1 hour remaining) -> Tuesday 08:00 + 1 hour = 09:00
        $requestedAt = Carbon::create(2026, 10, 23, 15, 0, 0, 'Asia/Jakarta');

        $deadline = $this->calculator->calculateDeadline($requestedAt, $schedule, 12);
        $deadlineWib = $deadline->setTimezone('Asia/Jakarta');

        // Verify deadline is not on Saturday or Sunday
        $this->assertNotEquals('Saturday', $deadlineWib->format('l'));
        $this->assertNotEquals('Sunday', $deadlineWib->format('l'));
    }
}
