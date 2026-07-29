import { AiGenerationMetrics } from '../../../src/modules/ai/application/ports/ai-generation-metrics.port'
import { AiGenerationQueue } from '../../../src/modules/ai/application/ports/ai-generation-queue.port'

/** Records what was handed to the queue, and can refuse to take it. */
export class RecordingAiGenerationQueue extends AiGenerationQueue {
    readonly enqueued: string[] = []
    private broken = false

    /** Simulate the queue being unreachable — Redis down, or refusing writes. */
    breakIt(): void {
        this.broken = true
    }

    async enqueue(generationId: string): Promise<void> {
        if (this.broken) throw new Error('queue unavailable')

        this.enqueued.push(generationId)
    }
}

/** Counts the same things Prometheus would, so tests can read them back. */
export class RecordingAiGenerationMetrics extends AiGenerationMetrics {
    readonly queued: string[] = []
    readonly settled: { kind: string; status: string; durationSeconds: number }[] = []
    readonly draftsSettled: { kind: string; outcome: string; model: string }[] = []
    readonly refinementsBeforeAccept: { kind: string; model: string; count: number }[] = []
    private broken = false

    /** Simulate a misconfigured metric — prom-client throws on a bad observation. */
    breakIt(): void {
        this.broken = true
    }

    recordQueued(kind: string): void {
        if (this.broken) throw new Error('Value is not a valid number: undefined')

        this.queued.push(kind)
    }

    recordSettled(kind: string, status: string, durationSeconds: number): void {
        if (this.broken) throw new Error('Value is not a valid number: undefined')

        this.settled.push({ kind, status, durationSeconds })
    }

    recordDraftSettled(kind: string, outcome: string, model: string): void {
        if (this.broken) throw new Error('Value is not a valid number: undefined')

        this.draftsSettled.push({ kind, outcome, model })
    }

    recordRefinementsBeforeAccept(kind: string, model: string, count: number): void {
        if (this.broken) throw new Error('Value is not a valid number: undefined')

        this.refinementsBeforeAccept.push({ kind, model, count })
    }
}
