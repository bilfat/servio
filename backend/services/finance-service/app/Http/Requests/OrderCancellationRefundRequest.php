<?php

declare(strict_types=1);

namespace App\Http\Requests;

class OrderCancellationRefundRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'source_event_id' => ['required', 'string', 'max:64'],
            'merchant_order_id' => ['required', 'string', 'max:64'],
            'checkout_group_id' => ['required', 'string', 'max:64'],
            'order_status' => ['required', 'string', 'in:CANCELLED'],
            'cancelled_at' => ['required', 'date'],
            'decision_source' => ['required', 'string', 'max:64'],
            'reason_code' => ['required', 'string', 'max:64'],
        ];
    }
}
