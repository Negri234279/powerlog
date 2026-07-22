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

    recordQueued(kind: string): void {
        this.queued.push(kind)
    }

    recordSettled(kind: string, status: string, durationSeconds: number): void {
        this.settled.push({ kind, status, durationSeconds })
    }
}
