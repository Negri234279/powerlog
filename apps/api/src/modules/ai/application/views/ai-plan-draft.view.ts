import type { AiPlanDraftAggregate } from '../../domain/entities/ai-plan-draft.entity'

export interface AiPlanDraftSetView {
    setId: string
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}

export interface AiPlanDraftMessageView {
    id: string
    role: string
    content: string
    createdAt: Date
}

export interface AiPlanDraftView {
    id: string
    sessionId: string
    provider: string
    model: string
    status: string
    sets: AiPlanDraftSetView[]
    messages: AiPlanDraftMessageView[]
    createdAt: Date
    updatedAt: Date
}

export function toAiPlanDraftView(draft: AiPlanDraftAggregate): AiPlanDraftView {
    return {
        id: draft.id,
        sessionId: draft.sessionId,
        provider: draft.provider.value,
        model: draft.model,
        status: draft.status.value,
        sets: draft.sets.map((set) => ({ ...set })),
        messages: draft.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        })),
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
    }
}
