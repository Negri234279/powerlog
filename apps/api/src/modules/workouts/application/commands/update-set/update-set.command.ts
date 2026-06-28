import type { SetInputRaw } from '../log-set/log-set.command'

export class UpdateSetCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
        public readonly setId: string,
        /** Leave/clear semantics: absent = leave, null = clear, value = set. */
        public readonly fields: SetInputRaw,
    ) {}
}
