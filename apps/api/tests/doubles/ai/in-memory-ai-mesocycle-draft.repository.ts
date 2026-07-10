import type { AiMesocycleDraftAggregate } from '../../../src/modules/ai/domain/entities/ai-mesocycle-draft.entity'
import { AiMesocycleDraftRepository } from '../../../src/modules/ai/domain/repositories/ai-mesocycle-draft.repository'

/** In-memory implementation of the real port. */
export class InMemoryAiMesocycleDraftRepository extends AiMesocycleDraftRepository {
    private readonly rows = new Map<string, AiMesocycleDraftAggregate>()

    seed(...drafts: AiMesocycleDraftAggregate[]): void {
        for (const draft of drafts) this.rows.set(draft.id, draft)
    }

    all(): AiMesocycleDraftAggregate[] {
        return [...this.rows.values()]
    }

    async findById(id: string): Promise<AiMesocycleDraftAggregate | null> {
        return this.rows.get(id) ?? null
    }

    async findOpenByUser(userId: string): Promise<AiMesocycleDraftAggregate | null> {
        return this.all().find((draft) => draft.userId === userId && draft.status.isOpen) ?? null
    }

    async save(draft: AiMesocycleDraftAggregate): Promise<void> {
        this.rows.set(draft.id, draft)
    }

    async deleteAllByUser(userId: string): Promise<void> {
        for (const draft of this.all()) {
            if (draft.userId === userId) this.rows.delete(draft.id)
        }
    }
}
