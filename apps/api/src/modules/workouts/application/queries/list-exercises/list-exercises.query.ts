import type { ExerciseCategory } from '../../../domain/exercise-taxonomy'

/** List the exercise catalog, optionally filtered by category. */
export class ListExercisesQuery {
    constructor(public readonly category?: ExerciseCategory) {}
}
