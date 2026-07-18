import type { SessionPlanContext } from '../../../src/shared/contracts/session-plan-context'

export const CONTEXT_SET_IDS = ['set-1', 'set-2'] as const

/**
 * A planned squat session with two sets to prescribe and one past session in
 * the history — notes included, since those are what the prescription hangs on.
 */
export const SessionPlanContextMother = {
    create(overrides: Partial<SessionPlanContext> = {}): SessionPlanContext {
        return {
            sessionId: 'session-1',
            // The specs' default user: the session is their OWN, so the AI gate
            // draws on the athlete plan. Override to model a coach programming.
            ownerId: '11111111-1111-4111-8111-111111111111',
            performedAt: new Date('2026-01-08T00:00:00.000Z'),
            sessionNotes: 'heavy day',
            exercises: [
                {
                    exerciseId: 'exercise-1',
                    entryId: 'entry-1',
                    name: 'Back Squat',
                    entryNotes: null,
                    sets: [
                        {
                            setId: 'set-1',
                            order: 1,
                            plannedWeightKg: null,
                            plannedReps: null,
                            rpe: null,
                            rir: null,
                            notes: null,
                        },
                        {
                            setId: 'set-2',
                            order: 2,
                            plannedWeightKg: null,
                            plannedReps: null,
                            rpe: null,
                            rir: null,
                            notes: null,
                        },
                    ],
                    history: [
                        {
                            performedAt: new Date('2026-01-01T00:00:00.000Z'),
                            sessionNotes: 'slept badly',
                            exerciseNotes: 'belt from set 2',
                            sets: [{ weightKg: 100, reps: 5, rpe: 8, rir: null, e1rmKg: 116.7, notes: 'felt heavy' }],
                        },
                    ],
                },
            ],
            ...overrides,
        }
    },

    /** A session whose exercises carry no sets — nothing to prescribe. */
    withoutSets(): SessionPlanContext {
        const context = SessionPlanContextMother.create()
        context.exercises[0]!.sets = []

        return context
    },
}
