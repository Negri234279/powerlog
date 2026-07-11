import { Inject, Injectable } from '@nestjs/common'
import { desc, eq, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AiUsageEntry,
    AiUsageRepository,
    type AiUsageSummaryRow,
} from '../../../domain/repositories/ai-usage.repository'
import { aiUsage } from '../schema/ai-usage.schema'

@Injectable()
export class DrizzleAiUsageRepository extends AiUsageRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async record(entry: AiUsageEntry): Promise<void> {
        await this.db.insert(aiUsage).values({
            userId: entry.userId,
            provider: entry.provider,
            model: entry.model,
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            // Drizzle serialises `numeric` as a string; null passes through.
            inputPricePerMtok: entry.inputPricePerMTok?.toString() ?? null,
            outputPricePerMtok: entry.outputPricePerMTok?.toString() ?? null,
            inputCost: entry.inputCost?.toString() ?? null,
            outputCost: entry.outputCost?.toString() ?? null,
            totalCost: entry.totalCost?.toString() ?? null,
            currency: entry.currency,
            createdAt: entry.createdAt,
        })
    }

    async summaryByUser(userId: string): Promise<AiUsageSummaryRow[]> {
        const rows = await this.db
            .select({
                provider: aiUsage.provider,
                model: aiUsage.model,
                inputTokens: sql<string>`sum(${aiUsage.inputTokens})`,
                outputTokens: sql<string>`sum(${aiUsage.outputTokens})`,
                // Ignores null-priced rows; a group with only unknown prices sums to null.
                totalCost: sql<string | null>`sum(${aiUsage.totalCost})`,
                requests: sql<string>`count(*)`,
                lastUsedAt: sql<string>`max(${aiUsage.createdAt})`,
            })
            .from(aiUsage)
            .where(eq(aiUsage.userId, userId))
            .groupBy(aiUsage.provider, aiUsage.model)
            .orderBy(desc(sql`sum(${aiUsage.totalCost})`))

        return rows.map((row) => ({
            provider: row.provider,
            model: row.model,
            inputTokens: Number(row.inputTokens),
            outputTokens: Number(row.outputTokens),
            totalCost: row.totalCost === null ? null : Number(row.totalCost),
            requests: Number(row.requests),
            lastUsedAt: new Date(row.lastUsedAt),
        }))
    }

    async deleteAllByUser(userId: string): Promise<void> {
        await this.db.delete(aiUsage).where(eq(aiUsage.userId, userId))
    }
}
