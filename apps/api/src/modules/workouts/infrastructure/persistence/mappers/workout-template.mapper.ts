import { TemplateExerciseEntity } from '../../../domain/entities/template-exercise.entity'
import { TemplateSetEntity } from '../../../domain/entities/template-set.entity'
import { type TemplateScope, WorkoutTemplateAggregate } from '../../../domain/entities/workout-template.entity'
import { RepsVO } from '../../../domain/value-objects/reps.vo'
import { RirVO } from '../../../domain/value-objects/rir.vo'
import { RpeVO } from '../../../domain/value-objects/rpe.vo'
import { TemplateNameVO } from '../../../domain/value-objects/template-name.vo'
import { WeightVO } from '../../../domain/value-objects/weight.vo'
import type { workoutTemplateExercises } from '../schema/workout-template-exercises.schema'
import type { workoutTemplateSets } from '../schema/workout-template-sets.schema'
import type { workoutTemplates } from '../schema/workout-templates.schema'

type TemplateRow = typeof workoutTemplates.$inferSelect
type ExerciseRow = typeof workoutTemplateExercises.$inferSelect
type SetRow = typeof workoutTemplateSets.$inferSelect

export interface WorkoutTemplateRows {
    template: typeof workoutTemplates.$inferInsert
    exercises: (typeof workoutTemplateExercises.$inferInsert)[]
    sets: (typeof workoutTemplateSets.$inferInsert)[]
}

/** Maps the WorkoutTemplate aggregate to/from its `workout_template_*` rows. */
export const WorkoutTemplateMapper = {
    toPersistence(template: WorkoutTemplateAggregate): WorkoutTemplateRows {
        const exercises: (typeof workoutTemplateExercises.$inferInsert)[] = []
        const sets: (typeof workoutTemplateSets.$inferInsert)[] = []

        for (const exercise of template.exercises) {
            exercises.push({
                id: exercise.id,
                templateId: template.id,
                exerciseId: exercise.exerciseId,
                order: exercise.order,
                notes: exercise.notes,
            })

            for (const set of exercise.sets) {
                sets.push({
                    id: set.id,
                    templateExerciseId: exercise.id,
                    order: set.order,
                    plannedWeightKg: set.plannedWeight?.value ?? null,
                    plannedReps: set.plannedReps?.value ?? null,
                    rpe: set.rpe?.value ?? null,
                    rir: set.rir?.value ?? null,
                    notes: set.notes,
                })
            }
        }

        return {
            template: {
                id: template.id,
                ownerId: template.ownerId,
                scope: template.scope,
                name: template.name.value,
                notes: template.notes,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
            },
            exercises,
            sets,
        }
    },

    toDomain(templateRow: TemplateRow, exerciseRows: ExerciseRow[], setRows: SetRow[]): WorkoutTemplateAggregate {
        const setsByExercise = new Map<string, SetRow[]>()

        for (const row of setRows) {
            const list = setsByExercise.get(row.templateExerciseId) ?? []
            list.push(row)
            setsByExercise.set(row.templateExerciseId, list)
        }

        const exercises = exerciseRows.map((exerciseRow) =>
            TemplateExerciseEntity.rehydrate({
                id: exerciseRow.id,
                exerciseId: exerciseRow.exerciseId,
                order: exerciseRow.order,
                notes: exerciseRow.notes,
                sets: (setsByExercise.get(exerciseRow.id) ?? []).map((setRow) =>
                    TemplateSetEntity.rehydrate({
                        id: setRow.id,
                        order: setRow.order,
                        plannedWeight: setRow.plannedWeightKg !== null ? WeightVO.create(setRow.plannedWeightKg) : null,
                        plannedReps: setRow.plannedReps !== null ? RepsVO.create(setRow.plannedReps) : null,
                        rpe: setRow.rpe !== null ? RpeVO.create(setRow.rpe) : null,
                        rir: setRow.rir !== null ? RirVO.create(setRow.rir) : null,
                        notes: setRow.notes,
                    }),
                ),
            }),
        )

        return WorkoutTemplateAggregate.rehydrate({
            id: templateRow.id,
            ownerId: templateRow.ownerId,
            scope: templateRow.scope as TemplateScope,
            name: TemplateNameVO.create(templateRow.name),
            notes: templateRow.notes,
            createdAt: templateRow.createdAt,
            updatedAt: templateRow.updatedAt,
            exercises,
        })
    },
}
