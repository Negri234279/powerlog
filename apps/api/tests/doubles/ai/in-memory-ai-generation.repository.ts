import type { AiGenerationAggregate } from '../../../src/modules/ai/domain/entities/ai-generation.entity'
import { AiGenerationAlreadyInFlightError } from '../../../src/modules/ai/domain/errors/ai-generation.errors'
import { AiGenerationRepository } from '../../../src/modules/ai/domain/repositories/ai-generation.repository'

/**
 * In-memory implementation of the real port, including the rule the real one
 * gets from a partial unique index: one unsettled generation per scope. Without
 * it the double would accept what Postgres refuses, and the tests would be
 * describing a system that does not exist.
 */
export class InMemoryAiGenerationRepository extends AiGenerationRepository {
    private readonly rows = new Map<string, AiGenerationAggregate>()

    seed(...generations: AiGenerationAggregate[]): void {
        for (const generation of generations) this.rows.set(generation.id, generation)
    }

    all(): AiGenerationAggregate[] {
        return [...this.rows.values()]
    }

    async findById(id: string): Promise<AiGenerationAggregate | null> {
        return this.rows.get(id) ?? null
    }

    async findUnsettledByScope(scopeKey: string): Promise<AiGenerationAggregate | null> {
        return this.all().find((row) => row.scopeKey === scopeKey && !row.status.isSettled) ?? null
    }

    async save(generation: AiGenerationAggregate): Promise<void> {
        const conflict = this.all().find(
            (row) => row.id !== generation.id && row.scopeKey === generation.scopeKey && !row.status.isSettled,
        )
        if (conflict && !generation.status.isSettled) throw new AiGenerationAlreadyInFlightError()

        this.rows.set(generation.id, generation)
    }

    async deleteAllByUser(userId: string): Promise<void> {
        for (const row of this.all()) {
            if (row.userId === userId) this.rows.delete(row.id)
        }
    }
}
