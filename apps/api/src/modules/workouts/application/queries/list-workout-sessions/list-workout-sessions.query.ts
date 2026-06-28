import type { WorkoutStatus } from '../../../domain/workout-status'

/** Paginated session history for the caller (keyset cursor, optional filters). */
export class ListWorkoutSessionsQuery {
    constructor(
        public readonly userId: string,
        public readonly limit: number,
        public readonly status?: WorkoutStatus,
        public readonly from?: string | null,
        public readonly to?: string | null,
        public readonly exerciseId?: string | null,
        public readonly query?: string | null,
        public readonly cursor?: string | null,
    ) {}
}
