export class RemoveSetCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly entryId: string,
        public readonly setId: string,
    ) {}
}
