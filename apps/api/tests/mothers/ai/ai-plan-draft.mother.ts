import { randomUUID } from 'node:crypto'

import { AiPlanDraftAggregate, type PlanDraftSet } from '../../../src/modules/ai/domain/entities/ai-plan-draft.entity'
import { AiProviderVO } from '../../../src/modules/ai/domain/value-objects/ai-provider.vo'
import type { AiProvider } from '../../../src/shared/ai-provider'

const DEFAULT_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

export const planDraftSet = (overrides: Partial<PlanDraftSet> = {}): PlanDraftSet => ({
    entryId: 'entry-1',
    order: 1,
    plannedWeightKg: 100,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

interface DraftOverrides {
    id?: string
    userId?: string
    sessionId?: string
    /** The single exercise programmed; omit for a whole-session draft. */
    entryId?: string | null
    provider?: AiProvider
    model?: string
    sets?: PlanDraftSet[]
    /** What the athlete asked for; omit for a draft generated unprompted. */
    request?: string
    requestId?: string
    rationaleId?: string
    now?: Date
}

export const AiPlanDraftMother = {
    /** An open draft with one prescribed set and the model's rationale. */
    open(overrides: DraftOverrides = {}): AiPlanDraftAggregate {
        return AiPlanDraftAggregate.create({
            id: overrides.id ?? 'draft-1',
            userId: overrides.userId ?? DEFAULT_USER_ID,
            sessionId: overrides.sessionId ?? 'session-1',
            entryId: overrides.entryId ?? null,
            provider: AiProviderVO.create(overrides.provider ?? 'openai'),
            model: overrides.model ?? 'gpt-5',
            sets: overrides.sets ?? [planDraftSet()],
            rationale: 'Held the top set and added a back-off.',
            rationaleId: overrides.rationaleId ?? 'message-1',
            request: overrides.request
                ? { id: overrides.requestId ?? 'message-0', content: overrides.request }
                : undefined,
            now: overrides.now ?? DEFAULT_NOW,
        })
    },

    /** The same draft with real UUIDs, for tests that put it in Postgres. */
    persistable(overrides: DraftOverrides = {}): AiPlanDraftAggregate {
        const entryId = overrides.entryId ?? randomUUID()

        return AiPlanDraftMother.open({
            id: randomUUID(),
            sessionId: randomUUID(),
            requestId: randomUUID(),
            rationaleId: randomUUID(),
            sets: [planDraftSet({ entryId })],
            ...overrides,
        })
    },
}

export const AI_DRAFT_DEFAULTS = { userId: DEFAULT_USER_ID, now: DEFAULT_NOW }
