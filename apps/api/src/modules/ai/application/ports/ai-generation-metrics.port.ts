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
    /**
     * A draft reached a terminal state, by kind and `outcome` (`accepted` |
     * `discarded`). This is the quality signal the duration histograms can't give:
     * whether what the model produced was worth keeping. `model` is normalised to a
     * bounded allowlist by the adapter — BYOK ids are otherwise unbounded.
     */
    abstract recordDraftSettled(kind: string, outcome: string, model: string): void
    /**
     * How many refinement rounds a draft went through before it was accepted.
     * Observed only on acceptance — a discarded draft never "finished". A rising
     * distribution means the first proposal is missing more often.
     */
    abstract recordRefinementsBeforeAccept(kind: string, model: string, count: number): void
}
