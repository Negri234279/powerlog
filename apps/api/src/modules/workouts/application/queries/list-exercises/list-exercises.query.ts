import type { SupportedLocale } from '../../../../../shared/i18n/locale'
import type { ExerciseCategory } from '../../../domain/exercise-taxonomy'

/** List the exercise catalog, optionally filtered by category and localized. */
export class ListExercisesQuery {
    constructor(
        public readonly category?: ExerciseCategory,
        public readonly locale?: SupportedLocale,
    ) {}
}
