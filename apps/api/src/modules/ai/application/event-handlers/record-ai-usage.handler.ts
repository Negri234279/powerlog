import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import { computeCost } from '../../domain/pricing/model-price'
import { AiUsageRepository } from '../../domain/repositories/ai-usage.repository'
import { AiUsageRecordedEvent } from '../events/ai-usage-recorded.event'
import { ModelPricing } from '../ports/model-pricing.port'

const CURRENCY = 'USD'

/**
 * Prices a completion and appends it to the usage meter — off the request path,
 * so a slow write or a pricing miss never touches the feature that produced it.
 * Best-effort: a failed insert is logged and swallowed, not re-thrown.
 */
@EventsHandler(AiUsageRecordedEvent)
export class RecordAiUsageHandler implements IEventHandler<AiUsageRecordedEvent> {
    constructor(
        private readonly usage: AiUsageRepository,
        private readonly pricing: ModelPricing,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(RecordAiUsageHandler.name)
    }

    async handle(event: AiUsageRecordedEvent): Promise<void> {
        const price = this.pricing.priceFor(event.provider, event.model)
        const cost = price
            ? computeCost(price, {
                  inputTokens: event.inputTokens,
                  outputTokens: event.outputTokens,
                  cacheReadInputTokens: event.cacheReadInputTokens,
                  cacheCreationInputTokens: event.cacheCreationInputTokens,
              })
            : null

        try {
            await this.usage.record({
                userId: event.userId,
                provider: event.provider,
                model: event.model,
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                cacheReadInputTokens: event.cacheReadInputTokens,
                cacheCreationInputTokens: event.cacheCreationInputTokens,
                inputPricePerMTok: price?.inputUsdPerMTok ?? null,
                outputPricePerMTok: price?.outputUsdPerMTok ?? null,
                inputCost: cost?.inputCost ?? null,
                outputCost: cost?.outputCost ?? null,
                totalCost: cost?.totalCost ?? null,
                currency: CURRENCY,
                createdAt: event.occurredAt,
            })
        } catch (error) {
            this.logger.error({ provider: event.provider, model: event.model, err: error }, 'failed to record ai usage')
        }
    }
}
