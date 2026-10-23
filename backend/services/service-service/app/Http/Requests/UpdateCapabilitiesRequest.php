<?php

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateCapabilitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'capability_ids' => 'required|array',
            'capability_ids.*' => 'uuid',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (! $this->hasHeader('If-Match')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_VERSION_PRECONDITION_REQUIRED',
                'Header If-Match diperlukan untuk pembaruan kapabilitas.',
                428
            ));
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(ApiResponse::error(
            'SERVICE_VALIDATION_FAILED',
            'Validasi daftar kapabilitas gagal.',
            422,
            $validator->errors()->toArray()
        ));
    }
}
