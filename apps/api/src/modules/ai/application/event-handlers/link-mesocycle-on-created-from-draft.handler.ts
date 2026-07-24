import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { MesocycleCreatedFromAiDraftIntegrationEvent } from '../../../../shared/integration-events/mesocycle-created-from-ai-draft.integration-event'
import { AiMesocycleDraftRepository } from '../../domain/repositories/ai-mesocycle-draft.repository'
import { Clock } from '../ports/clock.port'

/**
 * Stamps a draft with the block it became, so the history can link a proposal to
 * the training that came out of it.
 *
 * Best-effort by design: the block already exists and the athlete is training it.
 * A draft that cannot be stamped — someone else's, deleted, already linked — is
 * logged and dropped rather than failing a creation that has already succeeded.
 */
@EventsHandler(MesocycleCreatedFromAiDraftIntegrationEvent)
export class LinkMesocycleOnCreatedFromDraft implements IEventHandler<MesocycleCreatedFromAiDraftIntegrationEvent> {
    constructor(
        private readonly drafts: AiMesocycleDraftRepository,
        private readonly clock: Clock,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(LinkMesocycleOnCreatedFromDraft.name)
    }

    async handle(event: MesocycleCreatedFromAiDraftIntegrationEvent): Promise<void> {
        const draft = await this.drafts.findById(event.draftId)
        // The id came in from the client, so it is a claim, not a fact: a draft
        // that isn't the creator's own is not theirs to stamp.
        if (!draft || draft.userId !== event.userId) {
            this.logger.warn({ draftId: event.draftId }, 'mesocycle created from an unknown or foreign AI draft')

            return
        }

        draft.linkMesocycle(event.mesocycleId, this.clock.now())
        await this.drafts.save(draft)

        this.logger.info({ draftId: draft.id, mesocycleId: event.mesocycleId }, 'AI draft linked to its mesocycle')
    }
}
