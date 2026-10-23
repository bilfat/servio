<?php

namespace App\Domain\Service\Validators;

use App\Domain\Service\DTOs\ServicePriceSurveyConfiguration;

class PriceSurveyValidator
{
    /**
     * Validate price & survey configuration for DRAFT saving
     */
    public static function validateForDraft(ServicePriceSurveyConfiguration $config): array
    {
        $errors = [];

        if (! in_array($config->priceModel, ['FREE', 'RANGE', 'AFTER_SURVEY'], true)) {
            $errors['price_model'] = 'Model harga tidak valid. Pilih FREE, RANGE, atau AFTER_SURVEY.';
        }

        if ($config->priceModel === 'RANGE') {
            if ($config->minPriceIdr !== null && $config->minPriceIdr < 0) {
                $errors['min_price_idr'] = 'Harga minimum tidak boleh negatif.';
            }
            if ($config->maxPriceIdr !== null && $config->maxPriceIdr < 0) {
                $errors['max_price_idr'] = 'Harga maksimum tidak boleh negatif.';
            }
            if ($config->minPriceIdr !== null && $config->maxPriceIdr !== null && $config->minPriceIdr > $config->maxPriceIdr) {
                $errors['price_range'] = 'Harga minimum tidak boleh lebih besar dari harga maksimum.';
            }
        } elseif (in_array($config->priceModel, ['FREE', 'AFTER_SURVEY'], true)) {
            if ($config->minPriceIdr !== null || $config->maxPriceIdr !== null) {
                $errors['pricing'] = "Model harga {$config->priceModel} tidak mengizinkan rentang harga.";
            }
        }

        if (! in_array($config->surveyAvailability, ['NOT_AVAILABLE', 'AVAILABLE'], true)) {
            $errors['survey_availability'] = 'Ketersediaan survei harus NOT_AVAILABLE atau AVAILABLE.';
        }

        if ($config->surveyAvailability === 'AVAILABLE') {
            if ($config->surveyRequirement !== null && ! in_array($config->surveyRequirement, ['OPTIONAL', 'REQUIRED'], true)) {
                $errors['survey_requirement'] = 'Kebutuhan survei harus OPTIONAL atau REQUIRED.';
            }
            if ($config->surveyFeeModel !== null && ! in_array($config->surveyFeeModel, ['FREE', 'PAID'], true)) {
                $errors['survey_fee_model'] = 'Model biaya survei harus FREE atau PAID.';
            }
            if ($config->surveyFeeModel === 'PAID') {
                if ($config->surveyFeeIdr !== null && $config->surveyFeeIdr <= 0) {
                    $errors['survey_fee_idr'] = 'Biaya survei berbayar harus lebih besar dari Rp0.';
                }
            } elseif ($config->surveyFeeModel === 'FREE') {
                if ($config->surveyFeeIdr !== null && $config->surveyFeeIdr > 0) {
                    $errors['survey_fee_idr'] = 'Biaya survei gratis tidak boleh memiliki nominal lebih dari Rp0.';
                }
            }
        }

        if ($config->priceModel === 'AFTER_SURVEY') {
            if ($config->surveyAvailability !== 'AVAILABLE') {
                $errors['survey_conflict'] = 'Model harga AFTER_SURVEY mewajibkan survei AVAILABLE.';
            }
            if ($config->surveyRequirement !== null && $config->surveyRequirement !== 'REQUIRED') {
                $errors['survey_conflict'] = 'Model harga AFTER_SURVEY mewajibkan survei REQUIRED.';
            }
        }

        return $errors;
    }

    /**
     * Validate price & survey configuration strictly for ACTIVATION
     */
    public static function validateForActivation(ServicePriceSurveyConfiguration $config): array
    {
        $errors = self::validateForDraft($config);

        if ($config->priceModel === 'RANGE') {
            if ($config->minPriceIdr === null) {
                $errors['min_price_idr'] = 'Harga minimum wajib diisi untuk model harga RANGE.';
            }
            if ($config->maxPriceIdr === null) {
                $errors['max_price_idr'] = 'Harga maksimum wajib diisi untuk model harga RANGE.';
            }
        } elseif ($config->priceModel === 'AFTER_SURVEY') {
            if ($config->surveyAvailability !== 'AVAILABLE' || $config->surveyRequirement !== 'REQUIRED') {
                $errors['survey'] = 'Model AFTER_SURVEY mewajibkan survei berstatus AVAILABLE dan REQUIRED.';
            }
            if (empty($config->surveyFeeModel)) {
                $errors['survey_fee_model'] = 'Model biaya survei (FREE / PAID) wajib ditentukan.';
            }
            if ($config->surveyFeeModel === 'PAID' && empty($config->surveyFeeIdr)) {
                $errors['survey_fee_idr'] = 'Nominal biaya survei berbayar wajib diisi.';
            }
        }

        if ($config->surveyAvailability === 'AVAILABLE') {
            if (empty($config->surveyRequirement)) {
                $errors['survey_requirement'] = 'Kebutuhan survei (OPTIONAL / REQUIRED) wajib ditentukan saat survei tersedia.';
            }
            if (empty($config->surveyFeeModel)) {
                $errors['survey_fee_model'] = 'Model biaya survei (FREE / PAID) wajib ditentukan saat survei tersedia.';
            }
            if ($config->surveyFeeModel === 'PAID' && ($config->surveyFeeIdr === null || $config->surveyFeeIdr <= 0)) {
                $errors['survey_fee_idr'] = 'Nominal biaya survei berbayar wajib lebih besar dari Rp0.';
            }
        }

        return $errors;
    }
}
