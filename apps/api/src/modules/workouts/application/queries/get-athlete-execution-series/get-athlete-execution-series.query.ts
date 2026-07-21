/** Week-by-week adherence and programmed-vs-executed load for one athlete. */
export class GetAthleteExecutionSeriesQuery {
    constructor(
        public readonly athleteId: string,
        public readonly coachId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
