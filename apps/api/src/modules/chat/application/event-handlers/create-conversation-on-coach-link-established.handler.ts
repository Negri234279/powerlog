import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { ConversationEntity } from '../../domain/entities/conversation.entity'
import { ConversationRepository } from '../../domain/repositories/conversation.repository'
import { Clock } from '../ports/clock.port'
import { IdGenerator } from '../ports/id-generator.port'

/**
 * Creates the chat conversation for a coach↔athlete pair when they link — the
 * same hook `notifications` uses for the bell/email. Idempotent: `createIfAbsent`
 * no-ops when the pair already has a conversation (re-linking reuses it), so the
 * same pair always maps to the same thread.
 */
@EventsHandler(CoachLinkEstablishedIntegrationEvent)
export class CreateConversationOnCoachLinkEstablished implements IEventHandler<CoachLinkEstablishedIntegrationEvent> {
    constructor(
        private readonly conversations: ConversationRepository,
        private readonly ids: IdGenerator,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(CreateConversationOnCoachLinkEstablished.name)
    }

    async handle(event: CoachLinkEstablishedIntegrationEvent): Promise<void> {
        const existing = await this.conversations.findByPair(event.coachId, event.athleteId)
        if (existing) return

        const conversation = ConversationEntity.create({
            id: this.ids.uuid(),
            coachId: event.coachId,
            athleteId: event.athleteId,
            now: this.clock.now(),
        })
        const saved = await this.conversations.createIfAbsent(conversation)

        this.logger.info({ conversationId: saved.id }, 'chat conversation created on coach link')
    }
}
