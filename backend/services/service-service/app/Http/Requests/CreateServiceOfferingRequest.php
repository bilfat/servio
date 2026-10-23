<?php

namespace App\Http\Requests;

use App\Support\ApiResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateServiceOfferingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_definition_id' => 'required|uuid',
            'display_name' => 'required|string|max:191',
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

            'coverage_city_codes' => 'nullable|array',
            'coverage_city_codes.*' => 'string|max:32',

            'capability_ids' => 'nullable|array',
            'capability_ids.*' => 'uuid',
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
                    "Field '{$field}' tidak didukung atau dilarang pada domain katalog jasa.",
                    422,
                    [$field => ["Field '{$field}' dilarang."]]
                ));
            }
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(ApiResponse::error(
            'SERVICE_VALIDATION_FAILED',
            'Validasi data penawaran jasa gagal.',
            422,
            $validator->errors()->toArray()
        ));
    }
}
