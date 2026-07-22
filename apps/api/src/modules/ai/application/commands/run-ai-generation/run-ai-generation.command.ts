/**
 * Run a queued generation to its end. Dispatched by whatever picked the job up —
 * the BullMQ worker, or the in-process fallback when Redis is absent — and never
 * by a resolver: this is the slow half, the one that was moved out of the
 * request in the first place.
 *
 * Only the id travels. The row says what was asked for.
 */
export class RunAiGenerationCommand {
    constructor(public readonly generationId: string) {}
}
