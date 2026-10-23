<?php

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateCoverageCitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'city_codes' => 'required|array',
            'city_codes.*' => 'string|max:32',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('radius_km') || $this->has('radius')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_UNSUPPORTED_FIELD',
                "Field 'radius_km' tidak didukung. Modul 04 hanya mendukung daftar kota administratif.",
                422,
                ['radius_km' => ['Field radius dilarang.']]
            ));
        }

        if (! $this->hasHeader('If-Match')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_VERSION_PRECONDITION_REQUIRED',
                'Header If-Match diperlukan untuk pembaruan cakupan kota.',
                428
            ));
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(ApiResponse::error(
            'SERVICE_VALIDATION_FAILED',
            'Validasi daftar kota cakupan gagal.',
            422,
            $validator->errors()->toArray()
        ));
    }
}
