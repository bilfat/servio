<?php

namespace App\Domain\Service\DTOs;

final readonly class ServicePriceSurveyConfiguration
{
    public function __construct(
        public string $priceModel,
        public ?int $minPriceIdr,
        public ?int $maxPriceIdr,
        public string $surveyAvailability,
        public ?string $surveyRequirement,
        public ?string $surveyFeeModel,
        public ?int $surveyFeeIdr,
    ) {}

    public static function fromArray(array $data): self
    {
        $pricing = $data['pricing'] ?? [];
        $survey = $data['survey'] ?? [];

        return new self(
            priceModel: strtoupper($pricing['model'] ?? ($data['price_model'] ?? 'RANGE')),
            minPriceIdr: isset($pricing['min_price_idr']) ? (int) $pricing['min_price_idr'] : (isset($data['min_price_idr']) ? (int) $data['min_price_idr'] : null),
            maxPriceIdr: isset($pricing['max_price_idr']) ? (int) $pricing['max_price_idr'] : (isset($data['max_price_idr']) ? (int) $data['max_price_idr'] : null),
            surveyAvailability: strtoupper($survey['availability'] ?? ($data['survey_availability'] ?? 'NOT_AVAILABLE')),
            surveyRequirement: isset($survey['requirement']) ? strtoupper($survey['requirement']) : (isset($data['survey_requirement']) ? strtoupper($data['survey_requirement']) : null),
            surveyFeeModel: isset($survey['fee_model']) ? strtoupper($survey['fee_model']) : (isset($data['survey_fee_model']) ? strtoupper($data['survey_fee_model']) : null),
            surveyFeeIdr: isset($survey['fee_idr']) ? (int) $survey['fee_idr'] : (isset($data['survey_fee_idr']) ? (int) $data['survey_fee_idr'] : null),
        );
    }
}
