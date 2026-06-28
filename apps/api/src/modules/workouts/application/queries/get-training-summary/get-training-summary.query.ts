/** Headline training KPIs for the caller, optionally within an ISO date range. */
export class GetTrainingSummaryQuery {
    constructor(
        public readonly userId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
