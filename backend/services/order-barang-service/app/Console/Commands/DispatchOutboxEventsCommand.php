<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Integration\OutboxDispatcherService;
use Illuminate\Console\Command;

class DispatchOutboxEventsCommand extends Command
{
    protected $signature = 'order:dispatch-outbox {--limit=20}';
    protected $description = 'Mengirimkan event outbox yang tertunda ke microservice tujuan (Finance, Notification, dll.)';

    public function handle(OutboxDispatcherService $outboxDispatcherService): int
    {
        $limit = (int) $this->option('limit');
        $this->info("Menjalankan pengiriman event outbox (limit: {$limit})...");
        $count = $outboxDispatcherService->dispatchPendingEvents($limit);
        $this->info("Selesai. Berhasil mengirim {$count} event outbox.");

        return Command::SUCCESS;
    }
}
