import {
    type WorkoutHistoryFilter,
    type WorkoutHistorySlice,
    WorkoutHistoryReadModel,
    type WorkoutSessionSummaryRow,
} from '../../../src/modules/workouts/application/ports/workout-history.read-model'

/** Returns a canned slice and records the last filter it was called with. */
export class StubWorkoutHistoryReadModel extends WorkoutHistoryReadModel {
    lastFilter?: WorkoutHistoryFilter

    constructor(
        private readonly rows: WorkoutSessionSummaryRow[] = [],
        private readonly hasNextPage = false,
    ) {
        super()
    }

    async list(filter: WorkoutHistoryFilter): Promise<WorkoutHistorySlice> {
        this.lastFilter = filter
        return { items: this.rows, hasNextPage: this.hasNextPage }
    }
}
