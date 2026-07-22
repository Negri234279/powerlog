import { graphql } from '@/lib/graphql/__generated__'

/**
 * AI-programmed sessions. A draft proposes targets for the session's existing
 * sets; nothing is written until it is accepted.
 */
export const SessionPlanDraftDocument = graphql(`
    query SessionPlanDraft($sessionId: ID!) {
        sessionPlanDraft(sessionId: $sessionId) {
            ...AiPlanDraftFields
        }
    }
`)

export const AiPlanDraftFieldsFragment = graphql(`
    fragment AiPlanDraftFields on AiPlanDraft {
        id
        sessionId
        entryId
        provider
        model
        status
        sets {
            entryId
            order
            plannedWeightKg
            plannedReps
            rpe
            rir
            notes
        }
        messages {
            id
            role
            content
            createdAt
        }
        parentDraftId
        createdAt
        updatedAt
    }
`)

export const GenerateSessionPlanDraftDocument = graphql(`
    mutation GenerateSessionPlanDraft($input: GenerateSessionPlanDraftInput!) {
        generateSessionPlanDraft(input: $input) {
            ...AiPlanDraftFields
        }
    }
`)

export const RefinePlanDraftDocument = graphql(`
    mutation RefinePlanDraft($input: RefinePlanDraftInput!) {
        refinePlanDraft(input: $input) {
            ...AiPlanDraftFields
        }
    }
`)

export const AcceptPlanDraftDocument = graphql(`
    mutation AcceptPlanDraft($draftId: ID!) {
        acceptPlanDraft(draftId: $draftId) {
            id
            status
        }
    }
`)

export const DiscardPlanDraftDocument = graphql(`
    mutation DiscardPlanDraft($draftId: ID!) {
        discardPlanDraft(draftId: $draftId)
    }
`)
