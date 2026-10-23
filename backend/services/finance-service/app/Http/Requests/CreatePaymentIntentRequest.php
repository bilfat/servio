<?php

declare(strict_types=1);

namespace App\Http\Requests;

class CreatePaymentIntentRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'method' => ['required', 'string', 'in:QRIS,VA,MOCK_QRIS,MOCK_VA,MOCK_VA_BCA,MOCK_VA_BRI,MOCK_VA_BNI,MOCK_VA_MANDIRI,MOCK_VA_PERMATA'],
            'quote_payload_hash' => ['required', 'string', 'size:64'],
            'order_quote_revision' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
