import { describe, expect, it } from 'vitest'

import type { AthleteStrength, CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import type { DraftMesocycleSet, MesocycleDraftProposal } from '../../domain/entities/ai-mesocycle-draft.entity'
import { fillMesocycleLoads } from './mesocycle-load-filler'

const catalogEntry = (slug: string, equipment: string): CatalogExercise => ({
    exerciseId: `id-${slug}`,
    slug,
    name: slug,
    category: 'squat',
    equipment,
    primaryMuscle: 'quads',
})

const catalog: ReadonlyMap<string, CatalogExercise> = new Map([
    ['low-bar-squat', catalogEntry('low-bar-squat', 'barbell')],
    ['push-up', catalogEntry('push-up', 'bodyweight')],
    ['bench-press', catalogEntry('bench-press', 'barbell')],
])

const strength: AthleteStrength[] = [{ slug: 'low-bar-squat', e1rmKg: 180, lastTrainedAt: new Date() }]

const set = (overrides: Partial<DraftMesocycleSet> = {}): DraftMesocycleSet => ({
    order: 1,
    plannedWeightKg: null,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

const proposalWith = (slug: string, sets: DraftMesocycleSet[]): MesocycleDraftProposal => ({
    name: 'block',
    days: [{ dayOffset: 0, label: null, exercises: [{ exerciseId: `id-${slug}`, slug, name: slug, notes: null, sets }] }],
})

const firstSetWeight = (proposal: MesocycleDraftProposal) =>
    proposal.days[0]?.exercises[0]?.sets[0]?.plannedWeightKg

describe('fillMesocycleLoads', () => {
    it('computes the weight from the athlete’s e1RM, reps and intensity', () => {
        // 5 reps @ RPE 8 → 7 RTF → 81.1% of 180 = 146.0 → nearest 2.5 → 145.
        const filled = fillMesocycleLoads(proposalWith('low-bar-squat', [set()]), catalog, strength)

        expect(firstSetWeight(filled)).toBe(145)
    })

    it('leaves the weight null for a lift the athlete has no e1RM on', () => {
        const filled = fillMesocycleLoads(proposalWith('bench-press', [set()]), catalog, strength)

        expect(firstSetWeight(filled)).toBeNull()
    })

    it('leaves the weight null for a bodyweight movement', () => {
        const filled = fillMesocycleLoads(proposalWith('push-up', [set()]), catalog, strength)

        expect(firstSetWeight(filled)).toBeNull()
    })

    it('leaves the weight null for a set with no target reps', () => {
        const filled = fillMesocycleLoads(proposalWith('low-bar-squat', [set({ plannedReps: null })]), catalog, strength)

        expect(firstSetWeight(filled)).toBeNull()
    })
})
