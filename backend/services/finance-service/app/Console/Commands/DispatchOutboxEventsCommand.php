<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Finance\Integration\OutboxDispatcherService;
use Illuminate\Console\Command;

class DispatchOutboxEventsCommand extends Command
{
    protected $signature = 'finance:dispatch-outbox-events {--limit=50 : Maximum number of events to process per run}';
    protected $description = 'Dispatch pending outbox events from Finance 06 to downstream microservices (05A Order Service)';

    public function handle(OutboxDispatcherService $dispatcher): int
    {
        $limit = (int) $this->option('limit');
        $this->info('[' . now()->toIso8601String() . '] Dispatching pending outbox events...');

        $dispatched = $dispatcher->dispatchPendingEvents($limit);

        $this->info("Completed. Successfully dispatched {$dispatched} events.");
        return Command::SUCCESS;
    }
}
