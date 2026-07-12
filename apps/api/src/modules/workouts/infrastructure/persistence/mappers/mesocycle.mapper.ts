import { MesocycleDayExerciseEntity } from '../../../domain/entities/mesocycle-day-exercise.entity'
import { MesocycleDaySetEntity } from '../../../domain/entities/mesocycle-day-set.entity'
import { MesocycleAggregate } from '../../../domain/entities/mesocycle.entity'
import { MicrocycleDayEntity } from '../../../domain/entities/microcycle-day.entity'
import { MicrocycleEntity } from '../../../domain/entities/microcycle.entity'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { MesocycleNameVO } from '../../../domain/value-objects/mesocycle-name.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import type { mesocycleDayExercises } from '../schema/mesocycle-day-exercises.schema'
import type { mesocycleDaySets } from '../schema/mesocycle-day-sets.schema'
import type { mesocycleDays } from '../schema/mesocycle-days.schema'
import type { mesocycleMicrocycles } from '../schema/mesocycle-microcycles.schema'
import type { mesocycles } from '../schema/mesocycles.schema'

type MesocycleRow = typeof mesocycles.$inferSelect
type MicrocycleRow = typeof mesocycleMicrocycles.$inferSelect
type DayRow = typeof mesocycleDays.$inferSelect
type ExerciseRow = typeof mesocycleDayExercises.$inferSelect
type SetRow = typeof mesocycleDaySets.$inferSelect

export interface MesocycleRows {
    mesocycle: typeof mesocycles.$inferInsert
    microcycles: (typeof mesocycleMicrocycles.$inferInsert)[]
    days: (typeof mesocycleDays.$inferInsert)[]
    exercises: (typeof mesocycleDayExercises.$inferInsert)[]
    sets: (typeof mesocycleDaySets.$inferInsert)[]
}

/** Maps the Mesocycle aggregate to/from its `mesocycle*` rows (4-level tree). */
export const MesocycleMapper = {
    toPersistence(mesocycle: MesocycleAggregate): MesocycleRows {
        const microcycles: (typeof mesocycleMicrocycles.$inferInsert)[] = []
        const days: (typeof mesocycleDays.$inferInsert)[] = []
        const exercises: (typeof mesocycleDayExercises.$inferInsert)[] = []
        const sets: (typeof mesocycleDaySets.$inferInsert)[] = []

        for (const microcycle of mesocycle.microcycles) {
            microcycles.push({
                id: microcycle.id,
                mesocycleId: mesocycle.id,
                weekIndex: microcycle.weekIndex,
                label: microcycle.label,
                notes: microcycle.notes,
            })

            for (const day of microcycle.days) {
                days.push({
                    id: day.id,
                    microcycleId: microcycle.id,
                    order: day.order,
                    dayOffset: day.dayOffset,
                    label: day.label,
                    notes: day.notes,
                })

                for (const exercise of day.exercises) {
                    exercises.push({
                        id: exercise.id,
                        dayId: day.id,
                        exerciseId: exercise.exerciseId,
                        order: exercise.order,
                        notes: exercise.notes,
                    })

                    for (const set of exercise.sets) {
                        sets.push({
                            id: set.id,
                            dayExerciseId: exercise.id,
                            order: set.order,
                            plannedWeightKg: set.plannedWeight?.value ?? null,
                            plannedReps: set.plannedReps?.value ?? null,
                            rpe: set.rpe?.value ?? null,
                            rir: set.rir?.value ?? null,
                            notes: set.notes,
                        })
                    }
                }
            }
        }

        return {
            mesocycle: {
                id: mesocycle.id,
                ownerId: mesocycle.ownerId,
                plannedByUserId: mesocycle.plannedByUserId,
                name: mesocycle.name.value,
                notes: mesocycle.notes,
                goal: mesocycle.goal,
                startDate: mesocycle.startDate,
                status: mesocycle.status,
                createdAt: mesocycle.createdAt,
                updatedAt: mesocycle.updatedAt,
            },
            microcycles,
            days,
            exercises,
            sets,
        }
    },

    toDomain(
        mesocycleRow: MesocycleRow,
        microcycleRows: MicrocycleRow[],
        dayRows: DayRow[],
        exerciseRows: ExerciseRow[],
        setRows: SetRow[],
    ): MesocycleAggregate {
        const daysByMicrocycle = groupBy(dayRows, (row) => row.microcycleId)
        const exercisesByDay = groupBy(exerciseRows, (row) => row.dayId)
        const setsByExercise = groupBy(setRows, (row) => row.dayExerciseId)

        const microcycles = microcycleRows.map((microcycleRow) =>
            MicrocycleEntity.rehydrate({
                id: microcycleRow.id,
                weekIndex: microcycleRow.weekIndex,
                label: microcycleRow.label,
                notes: microcycleRow.notes,
                days: (daysByMicrocycle.get(microcycleRow.id) ?? []).map((dayRow) =>
                    MicrocycleDayEntity.rehydrate({
                        id: dayRow.id,
                        order: dayRow.order,
                        dayOffset: dayRow.dayOffset,
                        label: dayRow.label,
                        notes: dayRow.notes,
                        exercises: (exercisesByDay.get(dayRow.id) ?? []).map((exerciseRow) =>
                            MesocycleDayExerciseEntity.rehydrate({
                                id: exerciseRow.id,
                                exerciseId: exerciseRow.exerciseId,
                                order: exerciseRow.order,
                                notes: exerciseRow.notes,
                                sets: (setsByExercise.get(exerciseRow.id) ?? []).map((setRow) =>
                                    MesocycleDaySetEntity.rehydrate({
                                        id: setRow.id,
                                        order: setRow.order,
                                        plannedWeight:
                                            setRow.plannedWeightKg !== null
                                                ? WeightVO.create(setRow.plannedWeightKg)
                                                : null,
                                        plannedReps:
                                            setRow.plannedReps !== null ? RepsVO.create(setRow.plannedReps) : null,
                                        rpe: setRow.rpe !== null ? RpeVO.create(setRow.rpe) : null,
                                        rir: setRow.rir !== null ? RirVO.create(setRow.rir) : null,
                                        notes: setRow.notes,
                                    }),
                                ),
                            }),
                        ),
                    }),
                ),
            }),
        )

        return MesocycleAggregate.rehydrate({
            id: mesocycleRow.id,
            ownerId: mesocycleRow.ownerId,
            plannedByUserId: mesocycleRow.plannedByUserId,
            name: MesocycleNameVO.create(mesocycleRow.name),
            notes: mesocycleRow.notes,
            goal: mesocycleRow.goal,
            startDate: mesocycleRow.startDate,
            status: mesocycleRow.status,
            createdAt: mesocycleRow.createdAt,
            updatedAt: mesocycleRow.updatedAt,
            microcycles,
        })
    },
}

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>()

    for (const row of rows) {
        const list = map.get(key(row)) ?? []
        list.push(row)
        map.set(key(row), list)
    }

    return map
}
