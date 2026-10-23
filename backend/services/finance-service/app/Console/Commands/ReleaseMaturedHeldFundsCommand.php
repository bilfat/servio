<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Finance\Funds\HeldFundService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ReleaseMaturedHeldFundsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:release-matured-funds {--limit=100 : Maximum number of funds to process per batch}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Release matured held merchant order funds (120 hours post-completion) to merchant S-Pay accounts';

    /**
     * Execute the console command.
     */
    public function handle(HeldFundService $heldFundService): int
    {
        $this->info('[' . now()->toIso8601String() . '] Memulai pemrosesan pelepasan dana tertahan 120 jam...');

        try {
            $releasedCount = $heldFundService->releaseMaturedHeldFunds();

            $this->info("Pelepasan dana berhasil: {$releasedCount} dana pesanan telah dipindahkan ke akun S-Pay merchant.");

            Log::info('Finance Scheduler: Pelepasan dana tertahan 120 jam selesai.', [
                'released_count' => $releasedCount,
                'executed_at' => now()->toIso8601String(),
            ]);

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Gagal memproses pelepasan dana tertahan: ' . $e->getMessage());

            Log::error('Finance Scheduler: Gagal memproses pelepasan dana tertahan.', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Command::FAILURE;
        }
    }
}
