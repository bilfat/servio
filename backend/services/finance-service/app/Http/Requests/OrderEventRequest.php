<?php

declare(strict_types=1);

namespace App\Http\Requests;

class OrderEventRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'event_id' => ['required', 'string', 'max:64'],
            'event_type' => ['required', 'string', 'in:ORDER_COMPLETED,ORDER_HOLD_CHANGED,ORDER_CANCELLED'],
            'merchant_order_id' => ['required', 'string', 'max:64'],
            'payload' => ['required', 'array'],
        ];
    }
}
