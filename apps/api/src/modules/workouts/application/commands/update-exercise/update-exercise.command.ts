import type { ExercisePatch } from '../../../domain/entities/exercise.entity'

/**
 * Edit a catalog exercise (admin-only; slug is immutable). `nameEs` controls the
 * Spanish translation row: `undefined` leaves it unchanged, an empty string clears
 * it (reverting to the English fallback), a non-empty value upserts it.
 */
export class UpdateExerciseCommand {
    constructor(
        public readonly exerciseId: string,
        public readonly patch: ExercisePatch,
        public readonly nameEs?: string | null,
    ) {}
}
