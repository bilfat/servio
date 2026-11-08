<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\AfterSales\Contracts\OrderEligibilityVerifierInterface;
use App\Domain\AfterSales\Contracts\ResolutionCoordinatorInterface;
use App\Domain\AfterSales\Integrations\HttpOrderEligibilityVerifier;
use App\Domain\AfterSales\Integrations\HttpResolutionCoordinator;
use Illuminate\Support\ServiceProvider;

class AfterSalesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            OrderEligibilityVerifierInterface::class,
            HttpOrderEligibilityVerifier::class
        );

        $this->app->bind(
            ResolutionCoordinatorInterface::class,
            HttpResolutionCoordinator::class
        );
    }

    public function boot(): void
    {
        // Boot configuration
    }
}
