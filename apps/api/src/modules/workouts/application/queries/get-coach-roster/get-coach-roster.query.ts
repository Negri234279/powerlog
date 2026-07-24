/** The calling coach's whole roster with its training rollups, optionally ranged. */
export class GetCoachRosterQuery {
    constructor(
        public readonly coachId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
