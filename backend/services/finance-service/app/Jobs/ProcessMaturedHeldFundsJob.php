<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Domain\Finance\Funds\HeldFundService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessMaturedHeldFundsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function handle(HeldFundService $heldFundService): void
    {
        Log::info('ProcessMaturedHeldFundsJob: Menjalankan pelepasan dana tertahan 120 jam.');

        $released = $heldFundService->releaseMaturedHeldFunds();

        Log::info("ProcessMaturedHeldFundsJob: {$released} dana pesanan berhasil dilepaskan ke akun S-Pay merchant.");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessMaturedHeldFundsJob Gagal setelah retry:', [
            'message' => $exception->getMessage(),
        ]);
    }
}
