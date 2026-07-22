/** Ask for an open mesocycle draft to be revised. */
export class QueueMesocycleRefinementCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
        /** The athlete's own words. Untrusted input, framed as data for the model. */
        public readonly message: string,
    ) {}
}
