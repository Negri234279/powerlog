/**
 * Pick a past conversation back up. Creates a new open draft carrying the old
 * proposal, which the athlete then refines the ordinary way — forking itself
 * costs no model call.
 */
export class ForkPlanDraftCommand {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
