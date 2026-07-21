/**
 * Week-by-week adherence and programmed-vs-executed load. `plannedByUserId`
 * scopes adherence exactly as in `GetTrainingExecutionQuery`: a coach's id, or
 * nothing to count every planned session.
 */
export class GetTrainingExecutionSeriesQuery {
    constructor(
        public readonly userId: string,
        public readonly plannedByUserId?: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
