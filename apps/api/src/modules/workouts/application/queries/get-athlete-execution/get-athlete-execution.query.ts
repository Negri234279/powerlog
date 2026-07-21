/**
 * How well one athlete is executing their training, from a specific coach's
 * point of view. `coachId` is not decoration: adherence is measured against
 * what *this* coach programmed, so the same athlete legitimately scores
 * differently for two different coaches.
 */
export class GetAthleteExecutionQuery {
    constructor(
        public readonly athleteId: string,
        public readonly coachId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
