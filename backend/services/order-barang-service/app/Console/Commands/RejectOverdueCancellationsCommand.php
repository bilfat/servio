<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Cancellation\CancellationService;
use Illuminate\Console\Command;

class RejectOverdueCancellationsCommand extends Command
{
    protected $signature = 'order:reject-overdue-cancellations';
    protected $description = 'Otomatis menolak pengajuan pembatalan yang telah melewati batas SLA 12 jam operasional tanpa respons Penjual';

    public function handle(CancellationService $cancellationService): int
    {
        $this->info('Memeriksa pengajuan pembatalan yang melewati batas SLA 12 jam operasional...');
        $count = $cancellationService->autoRejectOverdueRequests();
        $this->info("Selesai. Berhasil memproses {$count} pengajuan kedaluwarsa menjadi REJECTED (TIMEOUT_NO_RESPONSE).");

        return Command::SUCCESS;
    }
}
