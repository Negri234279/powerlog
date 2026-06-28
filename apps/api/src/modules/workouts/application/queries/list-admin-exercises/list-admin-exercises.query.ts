import type { ExerciseFilter } from '../../../domain/repositories/exercise.repository'

/** List the exercise catalog for admins, with rich filters + offset pagination. */
export class ListAdminExercisesQuery {
    constructor(
        public readonly filter: ExerciseFilter,
        public readonly limit: number,
        public readonly offset: number,
    ) {}
}
