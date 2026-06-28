/** Volume distribution (muscle/category) + RPE breakdown, optionally ranged. */
export class GetTrainingDistributionQuery {
    constructor(
        public readonly userId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
