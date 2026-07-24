/**
 * Operational signals for the generation queue. A port so the application layer
 * states what is worth counting without depending on Prometheus.
 */
export abstract class AiGenerationMetrics {
    /** A job was queued, by kind. */
    abstract recordQueued(kind: string): void
    /**
     * A job finished, by kind and outcome (`succeeded` | `failed`), with how long
     * it waited plus ran — the number that says whether this belonged in a request
     * in the first place.
     */
    abstract recordSettled(kind: string, status: string, durationSeconds: number): void
}
