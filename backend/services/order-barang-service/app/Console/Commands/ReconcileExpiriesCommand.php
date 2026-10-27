<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domain\Order\OrderTransitionService;
use App\Models\CheckoutGroup;
use App\Models\Order;
use App\Models\PaymentProjection;
use Illuminate\Console\Command;

class ReconcileExpiriesCommand extends Command
{
    protected $signature = 'order:reconcile-expiries';
    protected $description = 'Rekonsiliasi tagihan pembayaran yang telah melewati masa berlaku 6 jam';

    public function handle(OrderTransitionService $orderTransitionService): int
    {
        $this->info('Memeriksa checkout yang telah melewati masa kedaluwarsa 6 jam...');

        $expiredGroups = CheckoutGroup::where('payment_status_projection', 'PENDING')
            ->whereNotNull('finance_expires_at')
            ->where('finance_expires_at', '<=', now())
            ->get();

        $count = 0;
        foreach ($expiredGroups as $group) {
            $group->update([
                'payment_status_projection' => 'EXPIRED',
                'orchestration_status' => 'EXPIRED',
            ]);

            PaymentProjection::where('checkout_group_id', $group->id)->update([
                'payment_status' => 'EXPIRED',
            ]);

            foreach ($group->orders as $order) {
                if (in_array($order->status, [Order::STATUS_CREATED, Order::STATUS_PAYMENT_PENDING], true)) {
                    $orderTransitionService->transition(
                        order: $order,
                        newStatus: Order::STATUS_CANCELLED,
                        action: 'PAYMENT_EXPIRED_TIMEOUT',
                        actorId: 'SYSTEM',
                        actorRole: 'SYSTEM',
                        reasonCode: 'PAYMENT_EXPIRED_TIMEOUT',
                        reasonNote: 'Pembayaran otomatis dibatalkan karena melewati batas 6 jam.'
                    );
                    $count++;
                }
            }
        }

        $this->info("Selesai. Berhasil membatalkan {$count} pesanan kedaluwarsa.");

        return Command::SUCCESS;
    }
}
