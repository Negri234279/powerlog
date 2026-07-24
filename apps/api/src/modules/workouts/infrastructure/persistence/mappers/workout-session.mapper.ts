import { ExerciseEntryEntity } from '../../../domain/entities/exercise-entry.entity'
import { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSetEntity } from '../../../domain/entities/workout-set.entity'
import { RepsRangeVO } from '../../../domain/value-objects/reps-range.vo'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirRangeVO } from '../../../domain/value-objects/rir-range.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeRangeVO } from '../../../domain/value-objects/rpe-range.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { WeightRangeVO } from '../../../domain/value-objects/weight-range.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import type { workoutExerciseEntries } from '../schema/workout-exercise-entries.schema'
import type { workoutSessions } from '../schema/workout-sessions.schema'
import type { workoutSets } from '../schema/workout-sets.schema'
import { rangeFromColumns } from './range-columns'

type SessionRow = typeof workoutSessions.$inferSelect
type EntryRow = typeof workoutExerciseEntries.$inferSelect
type SetRow = typeof workoutSets.$inferSelect

export interface WorkoutSessionRows {
    session: typeof workoutSessions.$inferInsert
    entries: (typeof workoutExerciseEntries.$inferInsert)[]
    sets: (typeof workoutSets.$inferInsert)[]
}

/** Maps the WorkoutSession aggregate to/from its `workout_*` rows (flat tree). */
export const WorkoutSessionMapper = {
    toPersistence(session: WorkoutSessionAggregate): WorkoutSessionRows {
        const entries: (typeof workoutExerciseEntries.$inferInsert)[] = []
        const sets: (typeof workoutSets.$inferInsert)[] = []

        for (const entry of session.entries) {
            entries.push({
                id: entry.id,
                sessionId: session.id,
                exerciseId: entry.exerciseId,
                order: entry.order,
                notes: entry.notes,
            })

            for (const set of entry.sets) {
                sets.push({
                    id: set.id,
                    entryId: entry.id,
                    order: set.order,
                    plannedWeightKgMin: set.plannedWeight?.min.value ?? null,
                    plannedWeightKgMax: set.plannedWeight?.max.value ?? null,
                    plannedRepsMin: set.plannedReps?.min.value ?? null,
                    plannedRepsMax: set.plannedReps?.max.value ?? null,
                    plannedRpeMin: set.plannedRpe?.min.value ?? null,
                    plannedRpeMax: set.plannedRpe?.max.value ?? null,
                    plannedRirMin: set.plannedRir?.min.value ?? null,
                    plannedRirMax: set.plannedRir?.max.value ?? null,
                    weightKg: set.weight?.value ?? null,
                    reps: set.reps?.value ?? null,
                    rpe: set.rpe?.value ?? null,
                    rir: set.rir?.value ?? null,
                    e1rmKg: set.e1rmKg,
                    outcome: set.outcome,
                    notes: set.notes,
                })
            }
        }

        return {
            session: {
                id: session.id,
                userId: session.userId,
                status: session.status,
                performedAt: session.performedAt,
                notes: session.notes,
                plannedByUserId: session.plannedByUserId,
                mesocycleId: session.mesocycleId,
                mesocycleWeek: session.mesocycleWeek,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
            },
            entries,
            sets,
        }
    },

    toDomain(sessionRow: SessionRow, entryRows: EntryRow[], setRows: SetRow[]): WorkoutSessionAggregate {
        const setsByEntry = new Map<string, SetRow[]>()

        for (const row of setRows) {
            const list = setsByEntry.get(row.entryId) ?? []
            list.push(row)
            setsByEntry.set(row.entryId, list)
        }

        const entries = entryRows.map((entryRow) =>
            ExerciseEntryEntity.rehydrate({
                id: entryRow.id,
                exerciseId: entryRow.exerciseId,
                order: entryRow.order,
                notes: entryRow.notes,
                sets: (setsByEntry.get(entryRow.id) ?? []).map((setRow) =>
                    WorkoutSetEntity.rehydrate({
                        id: setRow.id,
                        order: setRow.order,
                        plannedWeight: rangeFromColumns(
                            setRow.plannedWeightKgMin,
                            setRow.plannedWeightKgMax,
                            (min, max) => WeightRangeVO.create(min, max),
                        ),
                        plannedReps: rangeFromColumns(setRow.plannedRepsMin, setRow.plannedRepsMax, (min, max) =>
                            RepsRangeVO.create(min, max),
                        ),
                        plannedRpe: rangeFromColumns(setRow.plannedRpeMin, setRow.plannedRpeMax, (min, max) =>
                            RpeRangeVO.create(min, max),
                        ),
                        plannedRir: rangeFromColumns(setRow.plannedRirMin, setRow.plannedRirMax, (min, max) =>
                            RirRangeVO.create(min, max),
                        ),
                        weight: setRow.weightKg !== null ? WeightVO.create(setRow.weightKg) : null,
                        reps: setRow.reps !== null ? RepsVO.create(setRow.reps) : null,
                        rpe: setRow.rpe !== null ? RpeVO.create(setRow.rpe) : null,
                        rir: setRow.rir !== null ? RirVO.create(setRow.rir) : null,
                        e1rmKg: setRow.e1rmKg,
                        outcome: setRow.outcome,
                        notes: setRow.notes,
                    }),
                ),
            }),
        )

        return WorkoutSessionAggregate.rehydrate({
            id: sessionRow.id,
            userId: sessionRow.userId,
            status: sessionRow.status,
            performedAt: sessionRow.performedAt,
            notes: sessionRow.notes,
            plannedByUserId: sessionRow.plannedByUserId,
            mesocycleId: sessionRow.mesocycleId,
            mesocycleWeek: sessionRow.mesocycleWeek,
            createdAt: sessionRow.createdAt,
            updatedAt: sessionRow.updatedAt,
            entries,
        })
    },
}
