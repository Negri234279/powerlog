import type request from 'supertest'
import { expect } from 'vitest'

/** How the tests talk to GraphQL. Each spec builds its own over its own server. */
type Gql = (query: string, cookie?: string) => request.Test

export interface SettledGeneration {
    id: string
    status: string
    draftId: string | null
    failureCode: string | null
}

/**
 * Wait for a queued AI generation to finish, the way the browser does: by asking.
 *
 * Without Redis the API runs the job in-process on the next tick, so this
 * normally settles on the first or second look — the loop is there because the
 * job is genuinely detached from the mutation, and a test that assumed otherwise
 * would be asserting on a race.
 */
export async function settleGeneration(gql: Gql, access: string, generationId: string): Promise<SettledGeneration> {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const res = await gql(`query { aiGeneration(id: "${generationId}") { id status draftId failureCode } }`, access)
        expect(res.body.errors).toBeUndefined()

        const generation = res.body.data.aiGeneration as SettledGeneration
        if (generation.status === 'succeeded' || generation.status === 'failed') return generation

        await new Promise((resolve) => setTimeout(resolve, 20))
    }

    throw new Error(`generation ${generationId} never settled`)
}
