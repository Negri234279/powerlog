import { randomUUID } from 'node:crypto'

import { WorkoutSessionAggregate } from '../../../src/modules/workouts/domain/entities/workout-session.entity'
import { RepsVO } from '../../../src/modules/workouts/domain/value-objects/reps.vo'
import { RirVO } from '../../../src/modules/workouts/domain/value-objects/rir.vo'
import { RpeVO } from '../../../src/modules/workouts/domain/value-objects/rpe.vo'
import { WeightVO } from '../../../src/modules/workouts/domain/value-objects/weight.vo'
import type { WorkoutStatus } from '../../../src/modules/workouts/domain/workout-status'

const NOW = new Date('2026-01-01T00:00:00.000Z')

interface SessionOverrides {
    id?: string
    userId?: string
    performedAt?: Date
    status?: WorkoutStatus
    plannedByUserId?: string | null
    notes?: string | null
    now?: Date
}

/** Builds WorkoutSession aggregates for tests. */
export const WorkoutSessionMother = {
    empty(overrides: SessionOverrides = {}): WorkoutSessionAggregate {
        return WorkoutSessionAggregate.create({
            id: overrides.id ?? randomUUID(),
            userId: overrides.userId ?? randomUUID(),
            performedAt: overrides.performedAt ?? NOW,
            status: overrides.status,
            plannedByUserId: overrides.plannedByUserId ?? null,
            notes: overrides.notes ?? null,
            now: overrides.now ?? NOW,
        })
    },

    /** A completed session with one exercise and two logged sets (top set + backoff). */
    withTree(exerciseId: string, overrides: SessionOverrides = {}): WorkoutSessionAggregate {
        const session = this.empty(overrides)
        const entry = session.addEntry({ id: randomUUID(), exerciseId, notes: 'top set then backoff' }, NOW)
        session.addSet(
            entry.id,
            {
                id: randomUUID(),
                plannedWeight: WeightVO.create(100),
                plannedReps: RepsVO.create(5),
                weight: WeightVO.create(102.5),
                reps: RepsVO.create(5),
                rpe: RpeVO.create(8),
            },
            NOW,
        )
        session.addSet(
            entry.id,
            {
                id: randomUUID(),
                weight: WeightVO.create(90),
                reps: RepsVO.create(8),
                rir: RirVO.create(2),
                notes: 'backoff',
            },
            NOW,
        )
        session.complete(NOW)
        return session
    },
}
