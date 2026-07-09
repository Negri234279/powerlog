import type { AiPlanDraftAggregate } from '../../../src/modules/ai/domain/entities/ai-plan-draft.entity'
import { AiPlanDraftRepository } from '../../../src/modules/ai/domain/repositories/ai-plan-draft.repository'

/** In-memory implementation of the real port. */
export class InMemoryAiPlanDraftRepository extends AiPlanDraftRepository {
    private readonly rows = new Map<string, AiPlanDraftAggregate>()

    seed(...drafts: AiPlanDraftAggregate[]): void {
        for (const draft of drafts) this.rows.set(draft.id, draft)
    }

    all(): AiPlanDraftAggregate[] {
        return [...this.rows.values()]
    }

    async findById(id: string): Promise<AiPlanDraftAggregate | null> {
        return this.rows.get(id) ?? null
    }

    async findOpenBySession(userId: string, sessionId: string): Promise<AiPlanDraftAggregate | null> {
        return (
            this.all().find(
                (draft) => draft.userId === userId && draft.sessionId === sessionId && draft.status.isOpen,
            ) ?? null
        )
    }

    async save(draft: AiPlanDraftAggregate): Promise<void> {
        this.rows.set(draft.id, draft)
    }

    async deleteAllByUser(userId: string): Promise<void> {
        for (const draft of this.all()) {
            if (draft.userId === userId) this.rows.delete(draft.id)
        }
    }
}
