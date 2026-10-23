<?php

declare(strict_types=1);

namespace App\Http\Requests;

class CreateRevisionFeePolicyRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'change_reason' => ['required', 'string', 'max:500'],
            'targets' => ['required', 'array', 'min:1'],
            'targets.*.policy_code' => ['required', 'string', 'in:CUSTOMER_PRODUCT_APP_FEE,MERCHANT_PRODUCT_COMMISSION'],
            'targets.*.scope' => ['required', 'string', 'in:PRODUCT'],
            'targets.*.payer_type' => ['required', 'string', 'in:CUSTOMER,MERCHANT'],
            'targets.*.fee_type' => ['required', 'string', 'in:FIXED,PERCENTAGE'],
            'targets.*.fixed_amount_idr' => ['nullable', 'integer', 'min:0'],
            'targets.*.percentage_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'targets.*.charge_scope' => ['required', 'string', 'in:CHECKOUT,MERCHANT_ORDER'],
            'targets.*.calculation_base' => ['required', 'string', 'in:CHECKOUT_ELIGIBLE_SUBTOTAL,MERCHANT_PRODUCT_SUBTOTAL'],
        ];
    }
}
