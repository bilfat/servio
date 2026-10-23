<?php

declare(strict_types=1);

namespace App\Http\Requests;

class WithdrawalQuoteRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'owner_type' => ['required', 'string', 'in:CUSTOMER,MERCHANT_ORGANIZATION'],
            'owner_id' => ['nullable', 'string', 'max:64'],
            'amount_idr' => ['required', 'integer', 'min:20000'],
            'bank_destination_id' => ['required', 'string', 'size:26'],
        ];
    }
}
