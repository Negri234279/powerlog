/** Take the proposal into the builder, resolving the draft. */
export class AcceptMesocycleDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
