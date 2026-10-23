<?php

namespace Tests\Unit;

use App\Infrastructure\CityRegistry\CityRegistryClient;
use PHPUnit\Framework\TestCase;

class CityRegistryClientTest extends TestCase
{
    public function test_valid_city_codes_are_recognized(): void
    {
        $this->assertTrue(CityRegistryClient::isValid('JKT-BARAT'));
        $this->assertTrue(CityRegistryClient::isValid('jkt-sel'));
        $this->assertTrue(CityRegistryClient::isValid('BDG-KOTA'));
        $this->assertTrue(CityRegistryClient::isValid('SBY-KOTA'));
    }

    public function test_invalid_city_codes_are_rejected(): void
    {
        $this->assertFalse(CityRegistryClient::isValid('KOTA-KHAYALAN'));
        $this->assertFalse(CityRegistryClient::isValid('RANDOM_123'));
    }

    public function test_city_label_lookup(): void
    {
        $this->assertEquals('Kota Jakarta Barat', CityRegistryClient::getLabel('JKT-BARAT'));
        $this->assertEquals('Kota Bandung', CityRegistryClient::getLabel('BDG-KOTA'));
    }

    public function test_city_name_resolution_from_customer_address(): void
    {
        // Identity Customer Address formats
        $this->assertEquals('JKT-BARAT', CityRegistryClient::resolve('Kota Jakarta Barat'));
        $this->assertEquals('JKT-BARAT', CityRegistryClient::resolve('KOTA JAKARTA BARAT'));
        $this->assertEquals('JKT-BARAT', CityRegistryClient::resolve('Jakarta Barat'));
        $this->assertEquals('BDG-KOTA', CityRegistryClient::resolve('KOTA BANDUNG'));
        $this->assertEquals('SBY-KOTA', CityRegistryClient::resolve('Surabaya'));
        $this->assertEquals('SBY-KOTA', CityRegistryClient::normalize('Kota Surabaya'));
    }
}
