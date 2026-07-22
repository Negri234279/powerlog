import { graphql } from '@/lib/graphql/__generated__'

/**
 * The AI conversation history: every draft the caller ever asked the model for,
 * resolved or not, session and mesocycle in one keyset-paginated feed.
 *
 * Deliberately thin — the thread and the proposal are only read on the detail
 * screen, so a page of rows never carries them.
 */
export const AiDraftHistoryDocument = graphql(`
    query AiDraftHistory($limit: Int, $kind: String, $status: String, $sessionId: ID, $cursor: String) {
        aiDraftHistory(limit: $limit, kind: $kind, status: $status, sessionId: $sessionId, cursor: $cursor) {
            items {
                id
                kind
                status
                provider
                model
                sessionId
                athleteId
                name
                title
                messageCount
                parentDraftId
                createdAt
                updatedAt
            }
            nextCursor
            hasNextPage
        }
    }
`)

/**
 * One conversation by id. The URL carries an id but not its kind, so both are
 * asked at once and whichever answers is the draft — the queries are nullable
 * precisely so "not this kind" is an answer rather than an error. Both null
 * means it does not exist, or is not the caller's.
 */
export const AiDraftDetailDocument = graphql(`
    query AiDraftDetail($draftId: ID!) {
        planDraftById(draftId: $draftId) {
            ...AiPlanDraftFields
        }
        mesocycleDraftById(draftId: $draftId) {
            ...AiMesocycleDraftFields
        }
    }
`)
