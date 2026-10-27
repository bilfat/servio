<?php

declare(strict_types=1);

namespace App\Domain\Shipping;

use Exception;

class DeliveryException extends Exception
{
    public function __construct(
        public readonly string $errorCode,
        string $message = '',
        int $code = 422,
        ?Exception $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
