/** Ask the model to revise an open mesocycle draft. */
export class RefineMesocycleDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
        /** The athlete's own words. Untrusted input, framed as data for the model. */
        public readonly message: string,
    ) {}
}
