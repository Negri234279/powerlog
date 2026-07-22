/**
 * Raw set fields from presentation. Weights are in `unit` (default kg) and
 * converted to canonical kg by the handler. For `logSet`, absent/null both mean
 * "not set"; `updateSet` reuses this shape with leave/clear semantics.
 *
 * The planned targets arrive as text in the range notation (`5` or `5-8`); the
 * performed ones are plain numbers, because a set that happened has one weight
 * and one rep count.
 */
export interface SetInputRaw {
    unit?: string | null
    plannedWeight?: string | null
    plannedReps?: string | null
    weight?: number | null
    reps?: number | null
    rpe?: number | null
    rir?: number | null
    notes?: string | null
}

export class LogSetCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
        public readonly set: SetInputRaw,
    ) {}
}
