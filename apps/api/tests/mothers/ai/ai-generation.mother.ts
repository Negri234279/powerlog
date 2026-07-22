import { randomUUID } from 'node:crypto'

import {
    AiGenerationAggregate,
    type MesocycleRequest,
    type RefinementRequest,
    type SessionPlanRequest,
} from '../../../src/modules/ai/domain/entities/ai-generation.entity'
import { GenerationKindVO } from '../../../src/modules/ai/domain/value-objects/generation-kind.vo'

const DEFAULT_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

export const sessionPlanRequest = (overrides: Partial<SessionPlanRequest> = {}): SessionPlanRequest => ({
    sessionId: randomUUID(),
    entryId: null,
    extraInfo: null,
    ...overrides,
})

export const mesocycleRequest = (overrides: Partial<MesocycleRequest> = {}): MesocycleRequest => ({
    athleteId: null,
    weeks: 4,
    trainingDays: [1, 3, 5],
    goal: null,
    prompt: null,
    ...overrides,
})

export const refinementRequest = (overrides: Partial<RefinementRequest> = {}): RefinementRequest => ({
    draftId: randomUUID(),
    message: 'Less volume, I slept badly.',
    ...overrides,
})

interface GenerationOverrides {
    id?: string
    userId?: string
    now?: Date
}

export const AiGenerationMother = {
    /** A queued job to program a whole planned session. */
    sessionPlan(request: SessionPlanRequest = sessionPlanRequest(), overrides: GenerationOverrides = {}) {
        return queue('session_plan', request, overrides)
    },

    /** A queued job to design the template week of a block. */
    mesocycle(request: MesocycleRequest = mesocycleRequest(), overrides: GenerationOverrides = {}) {
        return queue('mesocycle', request, overrides)
    },

    /** A queued job to revise an open session-plan draft. */
    sessionPlanRefinement(request: RefinementRequest = refinementRequest(), overrides: GenerationOverrides = {}) {
        return queue('session_plan_refinement', request, overrides)
    },

    /** A queued job to revise an open mesocycle draft. */
    mesocycleRefinement(request: RefinementRequest = refinementRequest(), overrides: GenerationOverrides = {}) {
        return queue('mesocycle_refinement', request, overrides)
    },

    /** One a worker has already picked up. */
    running(overrides: GenerationOverrides = {}): AiGenerationAggregate {
        const generation = queue('session_plan', sessionPlanRequest(), overrides)
        generation.start(overrides.now ?? DEFAULT_NOW)

        return generation
    },
}

function queue(
    kind: string,
    request: SessionPlanRequest | MesocycleRequest | RefinementRequest,
    overrides: GenerationOverrides,
): AiGenerationAggregate {
    return AiGenerationAggregate.queue({
        id: overrides.id ?? randomUUID(),
        userId: overrides.userId ?? DEFAULT_USER_ID,
        kind: GenerationKindVO.create(kind),
        request,
        now: overrides.now ?? DEFAULT_NOW,
    })
}
