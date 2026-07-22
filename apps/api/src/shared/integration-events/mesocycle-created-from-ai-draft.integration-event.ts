/**
 * Published on the CQRS EventBus when a training block is created from an AI
 * draft. Lives in the shared kernel so the `ai` module can stamp the draft with
 * what it produced without importing workouts.
 *
 * This is the only moment the two ever meet: the draft is *taken* into the
 * builder, then the block is created through the ordinary `createMesocycle`
 * mutation — so the id of the resulting block is not knowable when the draft is
 * accepted, only here.
 *
 * `userId` is who created the block; the receiving side must check the draft is
 * theirs before writing to it.
 */
export class MesocycleCreatedFromAiDraftIntegrationEvent {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
        public readonly mesocycleId: string,
    ) {}
}
