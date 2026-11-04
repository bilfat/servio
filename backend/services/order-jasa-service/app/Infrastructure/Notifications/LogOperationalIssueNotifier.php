<?php

declare(strict_types=1);

namespace App\Infrastructure\Notifications;

use App\Contracts\OperationalIssueNotifierInterface;
use Illuminate\Support\Facades\Log;

class LogOperationalIssueNotifier implements OperationalIssueNotifierInterface
{
    public function notifyIssueEscalation(
        string $issueId,
        string $orderId,
        string $issueType,
        string $severity,
        string $description
    ): bool {
        Log::warning("OPERATIONAL ISSUE ESCALATED [{$severity}] Issue #{$issueId} Order #{$orderId}: ({$issueType}) {$description}");
        return true;
    }
}

