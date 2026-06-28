import type { ExercisePatch } from '../../../domain/entities/exercise.entity'

/** Edit a catalog exercise (admin-only; slug is immutable). */
export class UpdateExerciseCommand {
    constructor(
        public readonly exerciseId: string,
        public readonly patch: ExercisePatch,
    ) {}
}
