<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Completion\AutoCompletionService;
use Illuminate\Console\Command;

class AutoCompleteDeliveredOrdersCommand extends Command
{
    protected $signature = 'order:auto-complete-delivered';
    protected $description = 'Otomatis menyelesaikan pesanan yang telah berstatus DELIVERED selama 72 jam tanpa keluhan aktif';

    public function handle(AutoCompletionService $autoCompletionService): int
    {
        $this->info('Memulai pengecekan auto-completion 72 jam untuk pesanan DELIVERED...');
        $count = $autoCompletionService->processAutoCompletions();
        $this->info("Selesai. Berhasil menyelesaikan {$count} pesanan.");

        return Command::SUCCESS;
    }
}
