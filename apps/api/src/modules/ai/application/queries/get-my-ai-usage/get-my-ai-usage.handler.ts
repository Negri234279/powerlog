import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { AiUsageRepository } from '../../../domain/repositories/ai-usage.repository'
import { ModelPricing } from '../../ports/model-pricing.port'
import type { AiUsageRowView, AiUsageSummaryView } from '../../views/ai-usage.view'
import { GetMyAiUsageQuery } from './get-my-ai-usage.query'

const CURRENCY = 'USD'

/**
 * Aggregates the usage meter into the spend table. Cost totals come from the
 * per-call snapshots (frozen at the rate charged); the unit price shown next to
 * each model is the *current* rate, so the user sees today's cost per token even
 * as the snapshots preserve history.
 */
@QueryHandler(GetMyAiUsageQuery)
export class GetMyAiUsageHandler implements IQueryHandler<GetMyAiUsageQuery, AiUsageSummaryView> {
    constructor(
        private readonly usage: AiUsageRepository,
        private readonly pricing: ModelPricing,
    ) {}

    async execute(query: GetMyAiUsageQuery): Promise<AiUsageSummaryView> {
        const summary = await this.usage.summaryByUser(query.userId)

        const rows: AiUsageRowView[] = summary.map((row) => {
            const price = this.pricing.priceFor(row.provider, row.model)

            return {
                provider: row.provider,
                model: row.model,
                inputTokens: row.inputTokens,
                outputTokens: row.outputTokens,
                inputPricePerMTok: price?.inputUsdPerMTok ?? null,
                outputPricePerMTok: price?.outputUsdPerMTok ?? null,
                totalCost: row.totalCost,
                requests: row.requests,
                lastUsedAt: row.lastUsedAt,
            }
        })

        const priced = rows.filter((row) => row.totalCost !== null)

        return {
            rows,
            totals: {
                inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
                outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
                totalCost: priced.length ? priced.reduce((sum, row) => sum + (row.totalCost ?? 0), 0) : null,
                requests: rows.reduce((sum, row) => sum + row.requests, 0),
            },
            currency: CURRENCY,
        }
    }
}
