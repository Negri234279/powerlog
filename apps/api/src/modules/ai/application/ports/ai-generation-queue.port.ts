/**
 * Hands a queued generation to whatever will run it. Only the id travels: the
 * row is the source of truth for what was asked, so a payload could only ever
 * disagree with it.
 *
 * A port, not BullMQ directly, because Redis is optional in this codebase — with
 * `REDIS_URL` unset the in-process adapter runs the job here and now, which is
 * what lets `pnpm dev` and the test suites work without Docker.
 */
export abstract class AiGenerationQueue {
    abstract enqueue(generationId: string): Promise<void>
}
