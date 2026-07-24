import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { AiGenerationSettledIntegrationEvent } from '../../shared/integration-events/ai-generation-settled.integration-event'
import { RealtimeHub } from '../realtime.hub'

/**
 * The answer the athlete has been waiting ~20–30s for. Pushed the moment the job
 * settles — succeeded or failed — so the tab that asked stops spinning without
 * having to poll for it.
 *
 * Only the owner is told: a coach designing for an athlete is the one who asked,
 * and it is their screen that is waiting.
 */
@EventsHandler(AiGenerationSettledIntegrationEvent)
export class PushOnAiGenerationSettled implements IEventHandler<AiGenerationSettledIntegrationEvent> {
    constructor(private readonly hub: RealtimeHub) {}

    handle(event: AiGenerationSettledIntegrationEvent): void {
        this.hub.publish([event.userId], { type: 'ai_generation_settled' })
    }
}
