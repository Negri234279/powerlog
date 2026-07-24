import type { SetOutcome } from '../../../domain/set-outcome'
import type { SetInputRaw } from '../log-set/log-set.command'

/**
 * Everything an edit can change. Wider than `SetInputRaw` by `outcome`: editing
 * is the one place a set goes back to pending (`null`) or has a mis-click
 * corrected, so there is no separate un-mark action to keep in step with it.
 */
export interface EditableSetRaw extends SetInputRaw {
    outcome?: SetOutcome | null
}

export class UpdateSetCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
        public readonly setId: string,
        /** Leave/clear semantics: absent = leave, null = clear, value = set. */
        public readonly fields: EditableSetRaw,
    ) {}
}
