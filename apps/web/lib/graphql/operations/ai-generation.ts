import { graphql } from '@/lib/graphql/__generated__'

/**
 * An AI job in flight. The generate/refine mutations return one of these instead
 * of a draft — the provider takes 20–30s and the API queues the work rather than
 * holding a request open for it — and this is how the client learns it finished.
 */
export const AiGenerationDocument = graphql(`
    query AiGeneration($id: ID!) {
        aiGeneration(id: $id) {
            id
            kind
            status
            draftId
            failureCode
        }
    }
`)
