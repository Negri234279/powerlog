import type { SetOutcome } from '../../../domain/set-outcome'

/**
 * What the athlete actually did, in `unit` (default kg). Deliberately narrower
 * than `SetInputRaw`: marking a set done cannot rewrite its `planned*` targets,
 * which is the whole point of keeping them apart — otherwise "I was told 100×5,
 * I did 95×5" would erase the prescription it deviates from. Absent = leave,
 * `null` = clear.
 */
export interface PerformedSetRaw {
    unit?: string | null
    weight?: number | null
    reps?: number | null
    rpe?: number | null
    rir?: number | null
    notes?: string | null
}

/** Mark a set done (success or failed), logging what was actually performed. */
export class CompleteSetCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
        public readonly setId: string,
        public readonly outcome: SetOutcome,
        public readonly performed: PerformedSetRaw,
    ) {}
}
