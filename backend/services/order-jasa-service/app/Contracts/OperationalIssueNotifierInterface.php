<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Interface contract for escalating critical operational blockers to Admin Operations.
 */
interface OperationalIssueNotifierInterface
{
    /**
     * Notify operations authority of a blocking field issue.
     *
     * @param string $issueId ULID of operational_issues
     * @param string $orderId
     * @param string $issueType
     * @param string $severity HIGH | CRITICAL | STANDARD
     * @param string $description
     * @return bool
     */
    public function notifyIssueEscalation(
        string $issueId,
        string $orderId,
        string $issueType,
        string $severity,
        string $description
    ): bool;
}

