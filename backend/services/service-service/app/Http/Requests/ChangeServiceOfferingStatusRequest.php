<?php

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ChangeServiceOfferingStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:ACTIVE,INACTIVE,ARCHIVED,DRAFT',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->hasHeader('If-Match')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_VERSION_PRECONDITION_REQUIRED',
                'Header If-Match diperlukan untuk perubahan status penawaran jasa.',
                428
            ));
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(ApiResponse::error(
            'SERVICE_VALIDATION_FAILED',
            'Validasi perubahan status penawaran jasa gagal.',
            422,
            $validator->errors()->toArray()
        ));
    }
}
