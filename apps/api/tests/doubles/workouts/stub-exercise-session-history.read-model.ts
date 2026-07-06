import {
    type ExerciseSessionHistoryFilter,
    ExerciseSessionHistoryReadModel,
    type ExerciseSessionHistoryRow,
} from '../../../src/modules/workouts/application/ports/exercise-session-history.read-model'

/** Returns canned rows and records the last filter it was called with. */
export class StubExerciseSessionHistoryReadModel extends ExerciseSessionHistoryReadModel {
    lastFilter?: ExerciseSessionHistoryFilter

    constructor(private readonly rows: ExerciseSessionHistoryRow[] = []) {
        super()
    }

    async forExercise(filter: ExerciseSessionHistoryFilter): Promise<ExerciseSessionHistoryRow[]> {
        this.lastFilter = filter
        return this.rows
    }
}
