/**
 * How well someone is executing their training.
 *
 * `plannedByUserId` decides what adherence is measured against, and it is the
 * whole difference between the two callers. A coach passes their own id, so the
 * same athlete legitimately scores differently for two coaches. A lifter reading
 * their own numbers passes nothing: every session they put on the calendar
 * counts, whoever wrote it.
 */
export class GetTrainingExecutionQuery {
    constructor(
        public readonly userId: string,
        public readonly plannedByUserId?: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
