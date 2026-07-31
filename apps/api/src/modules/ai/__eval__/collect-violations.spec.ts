import { describe, expect, it } from 'vitest'

import type { AthleteStrength, CatalogExercise } from '../../../shared/contracts/mesocycle-design-context'
import { type EvalContext, collectMesocycleViolations } from './collect-violations'

const catalogEntry = (
    slug: string,
    category: string,
    primaryMuscle: string,
    equipment = 'barbell',
): CatalogExercise => ({
    exerciseId: `id-${slug}`,
    slug,
    name: slug,
    category,
    equipment,
    primaryMuscle,
})

const CATALOG: CatalogExercise[] = [
    catalogEntry('squat', 'squat', 'quads'),
    catalogEntry('bench', 'bench', 'chest'),
    catalogEntry('row', 'back', 'back'),
    catalogEntry('ohp', 'shoulders', 'shoulders'),
    catalogEntry('curl', 'arms', 'biceps', 'dumbbell'),
]

const STRENGTH: AthleteStrength[] = [
    { slug: 'squat', e1rmKg: 180, lastTrainedAt: new Date('2026-06-01') },
    { slug: 'bench', e1rmKg: 120, lastTrainedAt: new Date('2026-06-01') },
]

const CONTEXT: EvalContext = { catalog: CATALOG, strength: STRENGTH, trainingDays: [0, 2], weeks: 3, goal: 'strength' }

const sets = (n: number) => Array.from({ length: n }, () => ({ reps: 5, rpe: 8, rir: null, note: null }))
const exercise = (slug: string, n: number) => ({ slug, notes: null, sets: sets(n) })

const answer = (days: unknown, progression?: unknown) =>
    JSON.stringify({ name: 'Block', rationale: 'A sound week.', ...(progression ? { progression } : {}), days })

describe('collectMesocycleViolations', () => {
    it('passes a defensible week, surfacing soft rules as warnings', () => {
        const result = collectMesocycleViolations(
            answer([
                { dayOffset: 0, label: null, exercises: [exercise('squat', 3), exercise('bench', 3)] },
                { dayOffset: 2, label: null, exercises: [exercise('row', 3), exercise('ohp', 3)] },
            ]),
            CONTEXT,
        )

        expect(result.outcome).toBe('pass')
        // Every muscle is under the strength floor of 5 sets → an under-volume warning.
        expect(result.warnings).toContain('weekly_volume_low')
    })

    it('rejects an answer that names an exercise outside the catalog', () => {
        const result = collectMesocycleViolations(
            answer([
                { dayOffset: 0, label: null, exercises: [exercise('zercher-thruster', 3)] },
                { dayOffset: 2, label: null, exercises: [exercise('row', 3)] },
            ]),
            CONTEXT,
        )

        expect(result.outcome).toBe('rejected')
        expect(result.reason).toMatch(/catalog/)
    })

    it('rejects a day that opens with an isolation exercise before a compound', () => {
        const result = collectMesocycleViolations(
            answer([
                { dayOffset: 0, label: null, exercises: [exercise('curl', 3), exercise('squat', 3)] },
                { dayOffset: 2, label: null, exercises: [exercise('row', 3)] },
            ]),
            CONTEXT,
        )

        expect(result.outcome).toBe('rejected')
        expect(result.reason).toMatch(/compound/)
    })

    it('rejects malformed JSON like any other unusable answer', () => {
        const result = collectMesocycleViolations('not json at all', CONTEXT)

        expect(result.outcome).toBe('rejected')
    })
})
