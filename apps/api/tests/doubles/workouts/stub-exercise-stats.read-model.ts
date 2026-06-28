import {
    type ExerciseStatsFilter,
    ExerciseStatsReadModel,
    type ExerciseStatsRow,
} from '../../../src/modules/workouts/application/ports/exercise-stats.read-model'

/** Returns canned rows and records the last filter it was called with. */
export class StubExerciseStatsReadModel extends ExerciseStatsReadModel {
    lastFilter?: ExerciseStatsFilter

    constructor(private readonly rows: ExerciseStatsRow[] = []) {
        super()
    }

    async perExercise(filter: ExerciseStatsFilter): Promise<ExerciseStatsRow[]> {
        this.lastFilter = filter
        return this.rows
    }
}
