/** Throw away an open mesocycle draft. */
export class DiscardMesocycleDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
