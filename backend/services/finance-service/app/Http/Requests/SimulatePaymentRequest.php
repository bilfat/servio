<?php

declare(strict_types=1);

namespace App\Http\Requests;

class SimulatePaymentRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'outcome' => ['required', 'string', 'in:SUCCESS,FAILED'],
            'provider_event_id' => ['required', 'string', 'max:64'],
            'reported_amount_idr' => ['required', 'integer', 'min:1'],
        ];
    }
}
