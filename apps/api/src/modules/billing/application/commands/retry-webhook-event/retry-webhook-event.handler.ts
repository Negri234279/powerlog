import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { WebhookEventNotFoundError } from '../../../domain/errors/billing.errors'
import { reviveGatewayEvent } from '../../ports/gateway-event'
import { WebhookEventStore } from '../../ports/webhook-event.store'
import { HandleGatewayEventCommand } from '../handle-gateway-event/handle-gateway-event.command'
import { RetryWebhookEventCommand } from './retry-webhook-event.command'

/**
 * Replays an event whose handler blew up — the whole reason the journal keeps the
 * payload. It dispatches **the same command the webhook itself does**, so a replay
 * cannot take a different path than the original: there is no second
 * implementation to drift.
 *
 * The signature was verified when the event first arrived. What is being retried
 * is our handling of it, not its authenticity — and the provider's signature
 * carries a timestamp, so it would be stale by now anyway.
 */
@CommandHandler(RetryWebhookEventCommand)
export class RetryWebhookEventHandler implements ICommandHandler<RetryWebhookEventCommand, void> {
    constructor(
        private readonly events: WebhookEventStore,
        private readonly commandBus: CommandBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(RetryWebhookEventHandler.name)
    }

    async execute(command: RetryWebhookEventCommand): Promise<void> {
        const record = await this.events.findById(command.eventId)
        if (!record) throw new WebhookEventNotFoundError()

        // Without this the dedupe would refuse it as a duplicate — it IS already in
        // the journal, and replaying it is exactly the point.
        await this.events.reopen(record.gateway, record.eventId)

        this.logger.info({ eventId: record.eventId, type: record.type }, 'replaying a failed billing webhook')

        const replay = new HandleGatewayEventCommand(reviveGatewayEvent(record.payload))
        await this.commandBus.execute<HandleGatewayEventCommand, void>(replay)
    }
}
