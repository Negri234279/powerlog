import { AiPlanDraftAggregate, type PlanDraftSet } from '../../../domain/entities/ai-plan-draft.entity'
import { AiPlanMessageEntity } from '../../../domain/entities/ai-plan-message.entity'
import { AiProviderVO } from '../../../domain/value-objects/ai-provider.vo'
import { PlanDraftStatusVO } from '../../../domain/value-objects/plan-draft-status.vo'
import type { aiPlanDraftMessages, aiPlanDrafts, aiPlanDraftSets } from '../schema/ai-plan-drafts.schema'

type DraftRow = typeof aiPlanDrafts.$inferSelect
type SetRow = typeof aiPlanDraftSets.$inferSelect
type MessageRow = typeof aiPlanDraftMessages.$inferSelect

export const AiPlanDraftMapper = {
    toDomain(draft: DraftRow, sets: SetRow[], messages: MessageRow[]): AiPlanDraftAggregate {
        return AiPlanDraftAggregate.rehydrate({
            id: draft.id,
            userId: draft.userId,
            sessionId: draft.sessionId,
            provider: AiProviderVO.create(draft.provider),
            model: draft.model,
            status: PlanDraftStatusVO.create(draft.status),
            sets: sets.map(
                (set): PlanDraftSet => ({
                    setId: set.setId,
                    plannedWeightKg: set.plannedWeightKg,
                    plannedReps: set.plannedReps,
                    rpe: set.rpe,
                    rir: set.rir,
                    notes: set.notes,
                }),
            ),
            messages: messages.map((message) =>
                AiPlanMessageEntity.create({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                }),
            ),
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
        })
    },

    toPersistence(draft: AiPlanDraftAggregate): typeof aiPlanDrafts.$inferInsert {
        return {
            id: draft.id,
            userId: draft.userId,
            sessionId: draft.sessionId,
            provider: draft.provider.value,
            model: draft.model,
            status: draft.status.value,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
        }
    },

    setsToPersistence(draft: AiPlanDraftAggregate): (typeof aiPlanDraftSets.$inferInsert)[] {
        return draft.sets.map((set) => ({ draftId: draft.id, ...set }))
    },

    messagesToPersistence(draft: AiPlanDraftAggregate): (typeof aiPlanDraftMessages.$inferInsert)[] {
        return draft.messages.map((message) => ({
            id: message.id,
            draftId: draft.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        }))
    },
}
