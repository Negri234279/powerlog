import { randomUUID } from 'node:crypto'

import {
    AiMesocycleDraftAggregate,
    type DraftMesocycleDay,
    type DraftMesocycleExercise,
    type DraftMesocycleSet,
    type MesocycleDraftProposal,
} from '../../../src/modules/ai/domain/entities/ai-mesocycle-draft.entity'
import { AiProviderVO } from '../../../src/modules/ai/domain/value-objects/ai-provider.vo'
import type { AiProvider } from '../../../src/shared/ai-provider'

const DEFAULT_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

export const mesocycleDraftSet = (overrides: Partial<DraftMesocycleSet> = {}): DraftMesocycleSet => ({
    order: 1,
    plannedWeightKg: 100,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

export const mesocycleDraftExercise = (overrides: Partial<DraftMesocycleExercise> = {}): DraftMesocycleExercise => ({
    exerciseId: '22222222-2222-4222-8222-222222222222',
    slug: 'low-bar-squat',
    name: 'Low-Bar Back Squat',
    notes: null,
    sets: [mesocycleDraftSet()],
    ...overrides,
})

export const mesocycleDraftDay = (overrides: Partial<DraftMesocycleDay> = {}): DraftMesocycleDay => ({
    dayOffset: 0,
    label: 'Squat day',
    exercises: [mesocycleDraftExercise()],
    ...overrides,
})

export const mesocycleDraftProposal = (overrides: Partial<MesocycleDraftProposal> = {}): MesocycleDraftProposal => ({
    name: 'Strength block',
    days: [mesocycleDraftDay()],
    ...overrides,
})

interface DraftOverrides {
    id?: string
    userId?: string
    /** Set when the draft was designed by a coach for one of their athletes. */
    athleteId?: string | null
    provider?: AiProvider
    model?: string
    weeks?: number
    trainingDays?: number[]
    goal?: string | null
    proposal?: MesocycleDraftProposal
    /** Integration tests store these in `uuid` columns and need real uuids. */
    requestId?: string
    rationaleId?: string
}

export const AiMesocycleDraftMother = {
    /** An open draft: the athlete's request, then the model's rationale. */
    open(overrides: DraftOverrides = {}): AiMesocycleDraftAggregate {
        return AiMesocycleDraftAggregate.create({
            id: overrides.id ?? 'draft-1',
            userId: overrides.userId ?? DEFAULT_USER_ID,
            athleteId: overrides.athleteId ?? null,
            provider: AiProviderVO.create(overrides.provider ?? 'openai'),
            model: overrides.model ?? 'gpt-5',
            weeks: overrides.weeks ?? 4,
            trainingDays: overrides.trainingDays ?? [0],
            goal: overrides.goal ?? 'strength',
            proposal: overrides.proposal ?? mesocycleDraftProposal(),
            rationale: 'One heavy squat day, built around a top set.',
            rationaleId: overrides.rationaleId ?? 'message-2',
            request: { id: overrides.requestId ?? 'message-1', content: 'Squat focus, one day a week.' },
            now: DEFAULT_NOW,
        })
    },

    /** The same draft, with uuid identifiers everywhere Postgres demands them. */
    persistable(overrides: DraftOverrides = {}): AiMesocycleDraftAggregate {
        return AiMesocycleDraftMother.open({
            id: randomUUID(),
            requestId: randomUUID(),
            rationaleId: randomUUID(),
            ...overrides,
        })
    },
}

export const AI_MESOCYCLE_DRAFT_DEFAULTS = { userId: DEFAULT_USER_ID, now: DEFAULT_NOW }
