import { gqlRequest } from '@/lib/graphql/client'
import { AiGenerationDocument } from '@/lib/graphql/operations/ai-generation'

/**
 * The job did not produce a draft. Carries the API's stable code so the same
 * mapping that translates a GraphQL error can translate this one — a failure
 * that arrives asynchronously is still a failure the athlete needs told.
 */
export class AiGenerationFailedError extends Error {
    constructor(readonly code: string) {
        super(`AI generation failed: ${code}`)
        this.name = 'AiGenerationFailedError'
    }
}

/** How often to ask while waiting. The SSE push is what usually gets there first. */
const POLL_MS = 1_500

/** Give up rather than poll forever if the job never settles (a dead worker). */
const TIMEOUT_MS = 180_000

/**
 * Wait for a queued generation to finish, by asking.
 *
 * Polling looks primitive next to the SSE stream, and it is the fallback rather
 * than the mechanism: `ai_generation_settled` invalidates these queries the
 * moment the job lands. But the stream can be down — a proxy reaped it, the tab
 * was restored from bfcache — and a generation the athlete already paid for must
 * not be lost because a socket was.
 */
export async function waitForGeneration(generationId: string): Promise<string> {
    const deadline = Date.now() + TIMEOUT_MS

    for (;;) {
        const { aiGeneration } = await gqlRequest(AiGenerationDocument, { id: generationId })

        if (aiGeneration.status === 'succeeded' && aiGeneration.draftId) return aiGeneration.draftId
        if (aiGeneration.status === 'failed') throw new AiGenerationFailedError(aiGeneration.failureCode ?? 'UNKNOWN')
        if (Date.now() > deadline) throw new AiGenerationFailedError('AI_GENERATION_TIMED_OUT')

        await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
}
