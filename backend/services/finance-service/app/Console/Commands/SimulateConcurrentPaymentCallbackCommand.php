<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Finance\Payments\PaymentVerificationService;
use Illuminate\Console\Command;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SimulateConcurrentPaymentCallbackCommand extends Command
{
    protected $signature = 'finance:concurrent-callback-worker 
                            {payment_id : The ID of the Payment Intent}
                            {outcome : SUCCESS or FAILED}
                            {provider_event_id : Unique provider event ID}
                            {reported_amount? : Reported amount in IDR}
                            {--barrier= : Optional barrier file path for lockstep parallel release}
                            {--delay-ms=0 : Optional millisecond delay before executing}';

    protected $description = 'Worker process for real parallel concurrency testing of payment callbacks';

    public function handle(PaymentVerificationService $service): int
    {
        $paymentId = (string) $this->argument('payment_id');
        $outcome = (string) $this->argument('outcome');
        $providerEventId = (string) $this->argument('provider_event_id');
        $reportedAmount = $this->argument('reported_amount') !== null ? (int) $this->argument('reported_amount') : null;
        $barrierPath = $this->option('barrier');
        $delayMs = (int) $this->option('delay-ms');

        // 1. Barrier synchronization: wait until barrier file is created by parent test runner
        if (!empty($barrierPath)) {
            $startTime = microtime(true);
            while (!file_exists($barrierPath)) {
                usleep(5000); // 5ms poll interval
                if ((microtime(true) - $startTime) > 10.0) {
                    $this->line(json_encode([
                        'success' => false,
                        'error' => 'BARRIER_TIMEOUT',
                        'message' => 'Timed out waiting for test barrier release.',
                    ]));
                    return 1;
                }
            }
        }

        // 2. Optional delay
        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }

        // 3. Execute payment verification outcome under MySQL row locking
        try {
            $payment = $service->simulatePaymentOutcome(
                paymentId: $paymentId,
                outcome: $outcome,
                providerEventId: $providerEventId,
                reportedAmountIdr: $reportedAmount,
                actorUserId: 'CONCURRENT_TEST_WORKER'
            );

            $this->line(json_encode([
                'success' => true,
                'payment_id' => $payment->id,
                'status' => $payment->status,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'worker_pid' => getmypid(),
                'timestamp' => microtime(true),
            ]));

            return 0;
        } catch (HttpException $e) {
            $this->line(json_encode([
                'success' => false,
                'http_status' => $e->getStatusCode(),
                'message' => $e->getMessage(),
                'worker_pid' => getmypid(),
                'timestamp' => microtime(true),
            ]));

            return 0;
        } catch (\Throwable $e) {
            $this->line(json_encode([
                'success' => false,
                'http_status' => 500,
                'error' => get_class($e),
                'message' => $e->getMessage(),
                'worker_pid' => getmypid(),
                'timestamp' => microtime(true),
            ]));

            return 0;
        }
    }
}
