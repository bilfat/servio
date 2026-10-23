<?php

declare(strict_types=1);

namespace App\Http\Requests;

class AddBankDestinationRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'owner_type' => ['required', 'string', 'in:CUSTOMER,MERCHANT_ORGANIZATION'],
            'organization_id' => ['nullable', 'string', 'max:64'],
            'bank_code' => ['required', 'string', 'max:20'],
            'account_number' => ['required', 'string', 'min:6', 'max:30'],
            'account_holder_name' => ['required', 'string', 'max:100'],
            'step_up_reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
