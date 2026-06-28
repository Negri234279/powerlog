/** Create a session for the caller, pre-filled from one of their templates. */
export class CreateSessionFromTemplateCommand {
    constructor(
        public readonly userId: string,
        public readonly templateId: string,
        /** ISO 8601 datetime; defaults to "now" when omitted. */
        public readonly performedAt?: string | null,
        public readonly notes?: string | null,
    ) {}
}
