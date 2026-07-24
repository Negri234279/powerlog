import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { AiGenerationAggregate } from '../../../domain/entities/ai-generation.entity'
import { AiGenerationAlreadyInFlightError } from '../../../domain/errors/ai-generation.errors'
import { AiGenerationRepository } from '../../../domain/repositories/ai-generation.repository'
import { AiGenerationMapper } from '../mappers/ai-generation.mapper'
import { aiGenerations } from '../schema/ai-generations.schema'

/** Postgres `unique_violation`. */
const UNIQUE_VIOLATION = '23505'

@Injectable()
export class DrizzleAiGenerationRepository extends AiGenerationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findById(id: string): Promise<AiGenerationAggregate | null> {
        const [row] = await this.db.select().from(aiGenerations).where(eq(aiGenerations.id, id)).limit(1)

        return row ? AiGenerationMapper.toDomain(row) : null
    }

    async findUnsettledByScope(scopeKey: string): Promise<AiGenerationAggregate | null> {
        const [row] = await this.db
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.scopeKey, scopeKey), inArray(aiGenerations.status, ['queued', 'running'])))
            .limit(1)

        return row ? AiGenerationMapper.toDomain(row) : null
    }

    /**
     * The row is small and written whole. Only the fields a settling worker moves
     * are updated on conflict — `request`, `kind` and `scope_key` are what the job
     * was queued as and are never rewritten.
     */
    async save(generation: AiGenerationAggregate): Promise<void> {
        const row = AiGenerationMapper.toPersistence(generation)

        try {
            await this.db
                .insert(aiGenerations)
                .values(row)
                .onConflictDoUpdate({
                    target: aiGenerations.id,
                    set: {
                        status: row.status,
                        draftId: row.draftId,
                        failureCode: row.failureCode,
                        updatedAt: row.updatedAt,
                    },
                })
        } catch (error) {
            // The one-in-flight-per-scope index, hit by two requests that both got
            // past the check. Told as a domain error rather than a 500: the athlete
            // is already waiting for this exact answer.
            if (isUniqueViolation(error)) throw new AiGenerationAlreadyInFlightError()
            throw error
        }
    }

    async deleteAllByUser(userId: string): Promise<void> {
        await this.db.delete(aiGenerations).where(eq(aiGenerations.userId, userId))
    }
}

/**
 * Drizzle wraps driver errors in a `DrizzleQueryError`, so the `pg` error — and
 * its SQLSTATE — sits on `cause`. The chain is walked rather than unwrapped once:
 * how deep the wrapping goes is Drizzle's business, not ours.
 */
function isUniqueViolation(error: unknown): boolean {
    for (let current = error; current instanceof Error || isPgError(current); current = (current as Error).cause) {
        if (isPgError(current) && current.code === UNIQUE_VIOLATION) return true
    }

    return false
}

function isPgError(error: unknown): error is { code?: string } {
    return typeof error === 'object' && error !== null && 'code' in error
}
