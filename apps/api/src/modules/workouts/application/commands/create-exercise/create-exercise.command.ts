import type { ExerciseCategory, ExerciseEquipment, ExerciseMuscle } from '../../../domain/exercise-taxonomy'

/** Create a catalog exercise (admin-only). `slug` is derived from `name` if omitted. */
export class CreateExerciseCommand {
    constructor(
        public readonly name: string,
        public readonly category: ExerciseCategory,
        public readonly equipment: ExerciseEquipment,
        public readonly primaryMuscle: ExerciseMuscle,
        public readonly slug?: string | null,
    ) {}
}
