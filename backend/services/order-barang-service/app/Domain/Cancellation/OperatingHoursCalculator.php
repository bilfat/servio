<?php

declare(strict_types=1);

namespace App\Domain\Cancellation;

use Carbon\Carbon;
use Carbon\CarbonInterface;

class OperatingHoursCalculator
{
    /**
     * Calculate response deadline by advancing exactly N operational hours (default 12 hours = 720 minutes),
     * stepping through open business intervals and skipping closed hours / days.
     */
    public function calculateDeadline(
        CarbonInterface $requestedAt,
        array $scheduleSnapshot,
        int $operationalHours = 12
    ): Carbon {
        $remainingMinutes = $operationalHours * 60;
        $timezone = $scheduleSnapshot['timezone'] ?? 'Asia/Jakarta';

        // Work in merchant timezone
        $current = Carbon::parse($requestedAt)->setTimezone($timezone);
        $daysSchedule = $scheduleSnapshot['days'] ?? [];
        if (empty($daysSchedule)) {
            return Carbon::parse($requestedAt)->addHours($operationalHours)->utc();
        }
        $holidays = $scheduleSnapshot['holidays'] ?? [];

        $loopGuard = 0;
        $maxLoops = 1000; // Prevent infinite loop if schedule is completely closed

        while ($remainingMinutes > 0 && $loopGuard++ < $maxLoops) {
            $dayName = strtolower($current->format('l'));
            $dateStr = $current->format('Y-m-d');

            $dayConfig = $daysSchedule[$dayName] ?? null;
            $isClosed = ($dayConfig['is_closed'] ?? false) || in_array($dateStr, $holidays, true);

            if ($isClosed || empty($dayConfig['open']) || empty($dayConfig['close'])) {
                // Advance to start of next day
                $current->addDay()->startOfDay();
                continue;
            }

            [$openH, $openM] = array_map('intval', explode(':', $dayConfig['open']));
            [$closeH, $closeM] = array_map('intval', explode(':', $dayConfig['close']));

            $openTime = $current->copy()->setTime($openH, $openM, 0);
            $closeTime = $current->copy()->setTime($closeH, $closeM, 0);

            // If current time is before opening, advance to opening time
            if ($current->lessThan($openTime)) {
                $current = $openTime->copy();
            }

            // If current time is after closing time, advance to next day
            if ($current->greaterThanOrEqualTo($closeTime)) {
                $current->addDay()->startOfDay();
                continue;
            }

            // Available operating minutes today
            $availableMinutesToday = $current->diffInMinutes($closeTime);

            if ($remainingMinutes <= $availableMinutesToday) {
                $current->addMinutes($remainingMinutes);
                $remainingMinutes = 0;
            } else {
                $remainingMinutes -= $availableMinutesToday;
                $current->addDay()->startOfDay();
            }
        }

        // Return in UTC as standard
        return $current->utc();
    }
}
