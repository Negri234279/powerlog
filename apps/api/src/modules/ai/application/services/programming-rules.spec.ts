import { describe, expect, it } from 'vitest'

import type { CatalogExercise } from '../../../../shared/contracts/mesocycle-design-context'
import type { DraftMesocycleExercise, MesocycleDraftProposal } from '../../domain/entities/ai-mesocycle-draft.entity'
import { ModelAnswerRejection } from './model-answer'
import { evaluateMesocycleRules } from './programming-rules'

/** slug → (category, primaryMuscle). Equipment is irrelevant to these rules. */
const TAXONOMY: Record<string, { category: string; primaryMuscle: string }> = {
    squat: { category: 'squat', primaryMuscle: 'quads' },
    bench: { category: 'bench', primaryMuscle: 'chest' },
    incline: { category: 'bench', primaryMuscle: 'chest' },
    ohp: { category: 'shoulders', primaryMuscle: 'shoulders' },
    row: { category: 'back', primaryMuscle: 'back' },
    pulldown: { category: 'back', primaryMuscle: 'lats' },
    curl: { category: 'arms', primaryMuscle: 'biceps' },
    pushdown: { category: 'arms', primaryMuscle: 'triceps' },
    crunch: { category: 'core', primaryMuscle: 'core' },
    legcurl: { category: 'legs', primaryMuscle: 'hamstrings' },
    calf: { category: 'legs', primaryMuscle: 'calves' },
}

const catalog: ReadonlyMap<string, CatalogExercise> = new Map(
    Object.entries(TAXONOMY).map(([slug, taxonomy]) => [
        slug,
        { exerciseId: `id-${slug}`, slug, name: slug, equipment: 'barbell', ...taxonomy },
    ]),
)

/** An exercise entry with `sets` working sets — only the count matters here. */
const ex = (slug: string, sets: number): DraftMesocycleExercise => ({
    exerciseId: `id-${slug}`,
    slug,
    name: slug,
    notes: null,
    sets: Array.from({ length: sets }, (_, index) => ({
        order: index + 1,
        plannedWeightKg: null,
        plannedReps: 5,
        rpe: 8,
        rir: null,
        notes: null,
    })),
})

const week = (...days: { dayOffset: number; exercises: DraftMesocycleExercise[] }[]): MesocycleDraftProposal => ({
    name: 'Test block',
    days: days.map((day) => ({ dayOffset: day.dayOffset, label: null, exercises: day.exercises })),
})

const evaluate = (proposal: MesocycleDraftProposal, objective: 'strength' | 'hypertrophy' | 'general' = 'general') =>
    evaluateMesocycleRules(proposal, catalog, { objective })

/** A balanced week: 18 push sets vs 18 pull sets, every muscle ≥ 6, days apart. */
const balancedWeek = () =>
    week(
        { dayOffset: 0, exercises: [ex('bench', 6), ex('ohp', 6), ex('pushdown', 6)] },
        { dayOffset: 2, exercises: [ex('row', 6), ex('pulldown', 6), ex('curl', 6)] },
    )

describe('evaluateMesocycleRules', () => {
    it('passes a balanced, adequately dosed week with no warnings', () => {
        expect(evaluate(balancedWeek()).warnings).toEqual([])
    })

    describe('hard rules (rejections)', () => {
        it('rejects piling more than the weekly ceiling on one muscle', () => {
            const proposal = week({ dayOffset: 0, exercises: [ex('bench', 31)] })

            expect(() => evaluate(proposal)).toThrow(ModelAnswerRejection)
        })

        it('rejects a badly imbalanced push/pull week when both sides are trained', () => {
            // push (chest) = 10, pull (back) = 4 → ratio 2.5, outside [0.5, 2.0].
            const proposal = week({ dayOffset: 0, exercises: [ex('bench', 10), ex('row', 4)] })

            expect(() => evaluate(proposal)).toThrow(/out of balance/)
        })

        it('rejects a day that opens with an isolation exercise before a compound', () => {
            const proposal = week({ dayOffset: 0, exercises: [ex('curl', 4), ex('bench', 6)] })

            expect(() => evaluate(proposal)).toThrow(/compound/)
        })

        it('rejects a day whose estimated duration blows past the ceiling', () => {
            // Spread across muscles so the volume ceiling is not what trips first.
            const proposal = week({
                dayOffset: 0,
                exercises: [ex('squat', 20), ex('legcurl', 20), ex('calf', 20)],
            })

            expect(() => evaluate(proposal)).toThrow(/minutes/)
        })
    })

    describe('soft rules (warnings)', () => {
        it('warns when a trained muscle is under the weekly floor', () => {
            const proposal = week({ dayOffset: 0, exercises: [ex('bench', 3), ex('row', 3)] })

            expect(evaluate(proposal).warnings).toContain('weekly_volume_low')
        })

        it('warns on a push/pull coverage gap — one side trained, the other ignored', () => {
            const proposal = week({ dayOffset: 0, exercises: [ex('bench', 8)] })

            expect(evaluate(proposal).warnings).toContain('push_pull_coverage')
        })

        it('warns when the same muscle is hit hard on consecutive days', () => {
            const proposal = week(
                { dayOffset: 0, exercises: [ex('squat', 6)] },
                { dayOffset: 1, exercises: [ex('squat', 6)] },
            )

            expect(evaluate(proposal).warnings).toContain('muscle_frequency')
        })

        it('warns on two exercises of the same pattern on one day', () => {
            const proposal = week({ dayOffset: 0, exercises: [ex('bench', 3), ex('incline', 3), ex('row', 6)] })

            expect(evaluate(proposal).warnings).toContain('pattern_overlap')
        })
    })

    it('applies a higher volume floor for hypertrophy than for strength', () => {
        // 6 sets on chest: under the hypertrophy floor (8), at/above the strength one (5).
        const proposal = week({ dayOffset: 0, exercises: [ex('bench', 6), ex('row', 6)] })

        expect(evaluate(proposal, 'hypertrophy').warnings).toContain('weekly_volume_low')
        expect(evaluate(proposal, 'strength').warnings).not.toContain('weekly_volume_low')
    })
})
