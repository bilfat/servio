<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\OrderJasaOutboxDispatcherService;
use Illuminate\Console\Command;

class ProcessOrderJasaOutboxCommand extends Command
{
    protected $signature = 'order-jasa:dispatch-outbox {--limit=50}';
    protected $description = 'Dispatch pending integration outbox events from Order Jasa to Finance 06 and other services';

    public function handle(OrderJasaOutboxDispatcherService $dispatcher): int
    {
        $limit = (int) $this->option('limit');
        $dispatched = $dispatcher->dispatchPendingEvents($limit);

        if ($dispatched > 0) {
            $this->info("Successfully dispatched {$dispatched} outbox event(s).");
        } else {
            $this->line("No pending outbox events to dispatch.");
        }

        return Command::SUCCESS;
    }
}

