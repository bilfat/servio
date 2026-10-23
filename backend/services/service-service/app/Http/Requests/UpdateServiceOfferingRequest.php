<?php

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateServiceOfferingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name' => 'nullable|string|max:191',
            'description' => 'nullable|string',
            'included_items' => 'nullable|array',
            'included_items.*' => 'string|max:255',
            'excluded_items' => 'nullable|array',
            'excluded_items.*' => 'string|max:255',
            'customer_requirements' => 'nullable|array',
            'customer_requirements.*' => 'string|max:255',

            'pricing' => 'nullable|array',
            'pricing.model' => 'nullable|string|in:FREE,RANGE,AFTER_SURVEY',
            'pricing.min_price_idr' => 'nullable|integer|min:0',
            'pricing.max_price_idr' => 'nullable|integer|min:0',

            'survey' => 'nullable|array',
            'survey.availability' => 'nullable|string|in:NOT_AVAILABLE,AVAILABLE',
            'survey.requirement' => 'nullable|string|in:OPTIONAL,REQUIRED',
            'survey.fee_model' => 'nullable|string|in:FREE,PAID',
            'survey.fee_idr' => 'nullable|integer|min:0',

            'duration' => 'nullable|array',
            'duration.min' => 'nullable|integer|min:0',
            'duration.max' => 'nullable|integer|min:0',
            'duration.unit' => 'nullable|string|in:MINUTE,HOUR,DAY',
        ];
    }

    protected function prepareForValidation(): void
    {
        $unsupported = [
            'radius_km',
            'service_radius_km',
            'radius',
            'max_distance',
            'latitude',
            'longitude',
            'approved_by',
            'provider_organization_id',
            'status',
        ];

        foreach ($unsupported as $field) {
            if ($this->has($field)) {
                throw new HttpResponseException(ApiResponse::error(
                    'SERVICE_UNSUPPORTED_FIELD',
                    "Field '{$field}' tidak didukung atau dilarang pada pembaruan jasa.",
                    422,
                    [$field => ["Field '{$field}' dilarang."]]
                ));
            }
        }

        if ($this->has('service_definition_id')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_IMMUTABLE_FIELD',
                'Jenis canonical jasa (service_definition_id) bersifat tetap dan tidak dapat diubah setelah offering dibuat.',
                422,
                ['service_definition_id' => ['Canonical service definition bersifat immutable.']]
            ));
        }

        if (! $this->hasHeader('If-Match')) {
            throw new HttpResponseException(ApiResponse::error(
                'SERVICE_VERSION_PRECONDITION_REQUIRED',
                'Header If-Match diperlukan untuk optimistik konkurensi.',
                428
            ));
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(ApiResponse::error(
            'SERVICE_VALIDATION_FAILED',
            'Validasi pembaruan data penawaran jasa gagal.',
            422,
            $validator->errors()->toArray()
        ));
    }
}
