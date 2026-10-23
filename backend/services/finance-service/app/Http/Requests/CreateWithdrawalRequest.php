<?php

declare(strict_types=1);

namespace App\Http\Requests;

class CreateWithdrawalRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'quote_id' => ['required', 'string', 'max:64'],
            'bank_destination_id' => ['required', 'string', 'size:26'],
            'step_up_reference' => ['nullable', 'string', 'max:512'],
            'bank_details_confirmed' => ['required', 'boolean', 'accepted'],
        ];
    }
}
