import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { WebhookEventStore } from '../../ports/webhook-event.store'
import { RetryWebhookEventCommand } from '../retry-webhook-event/retry-webhook-event.command'
import { RetryFailedWebhookCommand } from './retry-failed-webhook.command'

/**
 * One backoff attempt at a failed webhook, driven by the {@link WebhookRetryQueue}.
 *
 * It is **status-aware**, which is what lets it coexist with the other two ways an
 * event gets re-driven — the on-creation invoice recovery and the admin replay:
 *
 *  - gone or already `processed` → someone else got there first; nothing to do, and
 *    the caller must treat that as success so the queue stops retrying.
 *  - still `failed` → replay it through {@link RetryWebhookEventCommand} (the one
 *    path that reopens and re-runs the journalled payload). If it fails again the
 *    error propagates, and the queue schedules the next attempt with more backoff.
 *
 * The row's `id` moves on each replay, so it is re-resolved from the stable
 * `(gateway, eventId)` every time rather than carried in the job.
 */
@CommandHandler(RetryFailedWebhookCommand)
export class RetryFailedWebhookHandler implements ICommandHandler<RetryFailedWebhookCommand, void> {
    constructor(
        private readonly events: WebhookEventStore,
        private readonly commandBus: CommandBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(RetryFailedWebhookHandler.name)
    }

    async execute(command: RetryFailedWebhookCommand): Promise<void> {
        const record = await this.events.findByGatewayEvent(command.gateway, command.eventId)

        if (!record || record.status === 'processed') {
            this.logger.debug(
                { gateway: command.gateway, eventId: command.eventId },
                'nothing to retry — the event is gone or already processed',
            )

            return
        }

        const retry = new RetryWebhookEventCommand(record.id)
        await this.commandBus.execute<RetryWebhookEventCommand, void>(retry)
    }
}
