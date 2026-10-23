<?php

declare(strict_types=1);

namespace App\Http\Requests;

class PublishFeePolicyRequest extends BaseFinanceRequest
{
    public function rules(): array
    {
        return [
            'effective_from' => ['nullable', 'date'],
            'version_id' => ['nullable', 'string', 'size:26'],
        ];
    }
}
