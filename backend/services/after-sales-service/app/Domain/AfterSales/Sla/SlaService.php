<?php

declare(strict_types=1);

namespace App\Domain\AfterSales\Sla;

use App\Models\AfterSalesCase;
use App\Models\CaseEvent;
use App\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;

class SlaService
{
    public function evaluateOverdueCases(): int
    {
        $overdueCases = AfterSalesCase::where('response_state', 'WAITING')
            ->where('response_due_at', '<', now())
            ->whereIn('main_status', ['SUBMITTED', 'UNDER_REVIEW'])
            ->get();

        $count = 0;

        foreach ($overdueCases as $case) {
            DB::transaction(function () use ($case, &$count) {
                /** @var AfterSalesCase $lockedCase */
                $lockedCase = AfterSalesCase::where('id', $case->id)
                    ->lockForUpdate()
                    ->first();

                if (!$lockedCase || $lockedCase->response_state !== 'WAITING') {
                    return;
                }

                $now = now();
                $lockedCase->response_state = 'OVERDUE';
                $lockedCase->overdue_first_detected_at = $now;
                $lockedCase->save();

                $lastSeq = (int) $lockedCase->events()->max('sequence');
                CaseEvent::create([
                    'case_id' => $lockedCase->id,
                    'sequence' => $lastSeq + 1,
                    'event_type' => 'SLA_BREACH_DETECTED',
                    'from_state' => $lockedCase->main_status,
                    'to_state' => $lockedCase->main_status,
                    'actor_kind' => 'SYSTEM',
                    'actor_id' => 'system-sla-evaluator',
                    'reason' => 'Batas waktu respon 72 jam kalender terlewati tanpa tanggapan pelaku usaha.',
                    'data_json' => [
                        'response_due_at' => $lockedCase->response_due_at?->toIso8601String(),
                        'detected_at' => $now->toIso8601String(),
                    ],
                    'occurred_at' => $now,
                ]);

                OutboxEvent::create([
                    'event_type' => 'after_sales.case.overdue.v1',
                    'aggregate_type' => 'AFTER_SALES_CASE',
                    'aggregate_id' => $lockedCase->id,
                    'payload' => [
                        'case_id' => $lockedCase->id,
                        'case_number' => $lockedCase->case_number,
                        'customer_id' => $lockedCase->customer_id,
                        'owner_org_id' => $lockedCase->owner_org_id,
                    ],
                ]);

                $count++;
            });
        }

        return $count;
    }
}

