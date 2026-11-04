<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ErrorSanitizationTest extends TestCase
{
    public function test_database_exception_is_sanitized_and_never_leaks_sql_or_tables(): void
    {
        // Register a temporary test route throwing a simulated raw database exception
        Route::get('/api/v1/order-jasa/test-db-exception', function () {
            throw new QueryException(
                'mysql',
                'SELECT * FROM secret_finance_vault WHERE api_key = "super_secret_production_key"',
                [],
                new \Exception('SQLSTATE[42S02]: Base table or view not found: 1146 Table secret_finance_vault doesn\'t exist')
            );
        });

        $response = $this->getJson('/api/v1/order-jasa/test-db-exception');

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_SERVER_ERROR',
                    'message' => 'Terjadi kesalahan internal pada pemrosesan pesanan jasa. Silakan hubungi dukungan dengan menyertakan request_id.',
                ],
            ]);

        $body = $response->getContent();

        // STRICT ASSERTION: Response must NOT leak SQL queries, table names, or sensitive terms
        $this->assertStringNotContainsString('secret_finance_vault', $body, 'CRITICAL: Table name leaked in response!');
        $this->assertStringNotContainsString('super_secret_production_key', $body, 'CRITICAL: SQL parameter leaked in response!');
        $this->assertStringNotContainsString('SQLSTATE', $body, 'CRITICAL: SQLSTATE leaked in response!');
        $this->assertStringNotContainsString('SELECT', $body, 'CRITICAL: SQL keyword leaked in response!');
    }

    public function test_unexpected_runtime_exception_is_sanitized(): void
    {
        Route::get('/api/v1/order-jasa/test-runtime-exception', function () {
            throw new \RuntimeException('Internal disk failure on /var/secure/keys/private.pem');
        });

        $response = $this->getJson('/api/v1/order-jasa/test-runtime-exception');

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_JASA_SERVER_ERROR',
                ],
            ]);

        $body = $response->getContent();
        $this->assertStringNotContainsString('/var/secure/keys', $body, 'CRITICAL: Internal path leaked in response!');
    }
}

