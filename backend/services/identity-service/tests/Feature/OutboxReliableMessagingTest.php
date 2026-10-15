<?php

namespace Tests\Feature;

use App\Models\OutboxEvent;
use App\Services\OutboxService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OutboxReliableMessagingTest extends TestCase
{
    use DatabaseTransactions;

    public function test_domain_event_creates_pending_outbox_message(): void
    {
        $event = OutboxService::publish(
            'user',
            'user-test-uuid',
            'identity.user.registered.v1',
            ['email' => 'test@servio.id', 'role' => 'CUSTOMER']
        );

        $this->assertInstanceOf(OutboxEvent::class, $event);
        $this->assertDatabaseHas('outbox_events', [
            'id' => $event->id,
            'aggregate_type' => 'user',
            'aggregate_id' => 'user-test-uuid',
            'event_type' => 'identity.user.registered.v1',
            'attempts' => 0,
        ]);

        $this->assertNull($event->published_at);
    }

    public function test_outbox_event_can_be_marked_published(): void
    {
        $event = OutboxService::publish(
            'invitation',
            'inv-uuid-1',
            'identity.invitation.created.v1',
            ['kind' => 'WORKER']
        );

        OutboxService::markPublished($event);

        $event->refresh();
        $this->assertNotNull($event->published_at);
    }

    public function test_outbox_event_failure_increments_attempts_and_records_error_for_retry(): void
    {
        $event = OutboxService::publish(
            'business_application',
            'app-uuid-1',
            'identity.application.submitted.v1',
            ['application_id' => 'app-uuid-1']
        );

        OutboxService::recordAttemptFailure($event, 'Kafka message broker connection refused');

        $event->refresh();
        $this->assertEquals(1, $event->attempts);
        $this->assertEquals('Kafka message broker connection refused', $event->last_error);

        // Second retry failure
        OutboxService::recordAttemptFailure($event, 'Kafka timeout on retry');
        $event->refresh();
        $this->assertEquals(2, $event->attempts);
        $this->assertEquals('Kafka timeout on retry', $event->last_error);
    }
}
