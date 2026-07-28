import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'

import { AiGenerationSettledIntegrationEvent } from '../../shared/integration-events/ai-generation-settled.integration-event'
import { PushCopy } from '../push-copy'
import { PushNotifier } from '../push-notifier'

/**
 * Pushes the owner when their queued AI generation is ready — the "colas de
 * programaciones con IA" case: the job runs for tens of seconds, so the user has
 * usually left the tab. Only on success (a failure is shown to the tab that asked;
 * a "your generation failed" push has little re-engagement value). A finished
 * session plan deep-links straight to its draft; everything else lands on the AI
 * drafts page.
 */
@EventsHandler(AiGenerationSettledIntegrationEvent)
export class PushOnAiGenerationSettled implements IEventHandler<AiGenerationSettledIntegrationEvent> {
    constructor(private readonly push: PushNotifier) {}

    async handle(event: AiGenerationSettledIntegrationEvent): Promise<void> {
        if (event.status !== 'succeeded') return

        const url =
            event.kind.startsWith('session_plan') && event.draftId ? `/workouts/ai/${event.draftId}` : '/workouts/ai'

        await this.push.send([event.userId], (locale) => PushCopy.aiReady(locale, url))
    }
}
