<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\FinanceServiceClientInterface;
use App\Contracts\IdentityServiceClientInterface;
use App\Contracts\MediaStorageInterface;
use App\Contracts\OperationalIssueNotifierInterface;
use App\Contracts\ServiceOfferingClientInterface;
use App\Infrastructure\Finance\FakeFinanceServiceClient;
use App\Infrastructure\Finance\FinanceServiceClient;
use App\Infrastructure\Identity\FakeIdentityServiceClient;
use App\Infrastructure\Identity\IdentityServiceClient;
use App\Infrastructure\Notifications\LogOperationalIssueNotifier;
use App\Infrastructure\ServiceCatalog\FakeServiceOfferingClient;
use App\Infrastructure\ServiceCatalog\ServiceOfferingClient;
use App\Infrastructure\Storage\LocalMediaStorage;
use Illuminate\Support\ServiceProvider;

class OrderJasaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // In testing environment without live cross-service flags: use explicit DI test adapters
        // In all other environments (dev, integration, prod): strictly fail-closed real clients
        if ($this->app->environment('testing') && !env('FORCE_REAL_MICROSERVICES', false)) {
            $this->app->singleton(IdentityServiceClientInterface::class, FakeIdentityServiceClient::class);
            $this->app->singleton(ServiceOfferingClientInterface::class, FakeServiceOfferingClient::class);
            $this->app->singleton(FinanceServiceClientInterface::class, FakeFinanceServiceClient::class);
        } else {
            $this->app->singleton(IdentityServiceClientInterface::class, IdentityServiceClient::class);
            $this->app->singleton(ServiceOfferingClientInterface::class, ServiceOfferingClient::class);
            $this->app->singleton(FinanceServiceClientInterface::class, FinanceServiceClient::class);
        }

        $this->app->singleton(MediaStorageInterface::class, LocalMediaStorage::class);
        $this->app->singleton(OperationalIssueNotifierInterface::class, LogOperationalIssueNotifier::class);
    }

    public function boot(): void
    {
        //
    }
}
