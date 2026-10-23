<?php

declare(strict_types=1);

namespace App\Http\Requests;

class CheckoutQuoteRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'checkout_group_id' => ['required', 'string', 'max:64'],
            'customer_id' => ['required', 'string', 'max:64'],
            'currency' => ['nullable', 'string', 'in:IDR'],
            'order_quote_revision' => ['nullable', 'integer', 'min:1'],
            'validated_by_order_service' => ['required', 'boolean'],
            'merchant_orders' => ['required', 'array', 'min:1'],
            'merchant_orders.*.merchant_order_id' => ['required', 'string', 'max:64'],
            'merchant_orders.*.merchant_org_id' => ['required', 'string', 'max:64'],
            'merchant_orders.*.product_subtotal_idr' => ['required', 'integer', 'min:0'],
            'merchant_orders.*.shipping_customer_idr' => ['required', 'integer', 'min:0'],
            'merchant_orders.*.discount_idr' => ['nullable', 'integer', 'min:0'],
            'merchant_orders.*.discount_bearer' => ['nullable', 'string', 'in:MERCHANT,PLATFORM'],
        ];
    }
}
