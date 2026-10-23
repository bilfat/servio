<?php

namespace Tests\Unit;

use App\Domain\Service\DTOs\ServicePriceSurveyConfiguration;
use App\Domain\Service\Validators\PriceSurveyValidator;
use PHPUnit\Framework\TestCase;

class PriceSurveyValidatorTest extends TestCase
{
    public function test_valid_free_price_model(): void
    {
        $config = new ServicePriceSurveyConfiguration(
            priceModel: 'FREE',
            minPriceIdr: null,
            maxPriceIdr: null,
            surveyAvailability: 'NOT_AVAILABLE',
            surveyRequirement: null,
            surveyFeeModel: null,
            surveyFeeIdr: null
        );

        $errors = PriceSurveyValidator::validateForActivation($config);
        $this->assertEmpty($errors);
    }

    public function test_valid_range_price_model(): void
    {
        $config = new ServicePriceSurveyConfiguration(
            priceModel: 'RANGE',
            minPriceIdr: 75000,
            maxPriceIdr: 150000,
            surveyAvailability: 'AVAILABLE',
            surveyRequirement: 'OPTIONAL',
            surveyFeeModel: 'PAID',
            surveyFeeIdr: 50000
        );

        $errors = PriceSurveyValidator::validateForActivation($config);
        $this->assertEmpty($errors);
    }

    public function test_valid_after_survey_price_model(): void
    {
        $config = new ServicePriceSurveyConfiguration(
            priceModel: 'AFTER_SURVEY',
            minPriceIdr: null,
            maxPriceIdr: null,
            surveyAvailability: 'AVAILABLE',
            surveyRequirement: 'REQUIRED',
            surveyFeeModel: 'FREE',
            surveyFeeIdr: 0
        );

        $errors = PriceSurveyValidator::validateForActivation($config);
        $this->assertEmpty($errors);
    }

    public function test_invalid_after_survey_with_optional_survey(): void
    {
        $config = new ServicePriceSurveyConfiguration(
            priceModel: 'AFTER_SURVEY',
            minPriceIdr: null,
            maxPriceIdr: null,
            surveyAvailability: 'AVAILABLE',
            surveyRequirement: 'OPTIONAL', // Invalid! Must be REQUIRED
            surveyFeeModel: 'PAID',
            surveyFeeIdr: 50000
        );

        $errors = PriceSurveyValidator::validateForDraft($config);
        $this->assertArrayHasKey('survey_conflict', $errors);
    }

    public function test_invalid_range_min_greater_than_max(): void
    {
        $config = new ServicePriceSurveyConfiguration(
            priceModel: 'RANGE',
            minPriceIdr: 200000,
            maxPriceIdr: 100000, // Invalid: max < min
            surveyAvailability: 'NOT_AVAILABLE',
            surveyRequirement: null,
            surveyFeeModel: null,
            surveyFeeIdr: null
        );

        $errors = PriceSurveyValidator::validateForDraft($config);
        $this->assertArrayHasKey('price_range', $errors);
    }
}
