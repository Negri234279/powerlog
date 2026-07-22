/**
 * Pick a past block design back up. Creates a new open draft carrying the old
 * proposed week, which the athlete then refines the ordinary way — forking
 * itself costs no model call.
 */
export class ForkMesocycleDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
