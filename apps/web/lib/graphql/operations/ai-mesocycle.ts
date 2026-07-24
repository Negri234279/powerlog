import { graphql } from '@/lib/graphql/__generated__'

/**
 * AI-designed training blocks. A draft proposes one template week; nothing is
 * written until the athlete takes it into the builder and saves a mesocycle.
 */
export const MesocycleDraftDocument = graphql(`
    query MesocycleDraft($athleteId: ID) {
        mesocycleDraft(athleteId: $athleteId) {
            ...AiMesocycleDraftFields
        }
    }
`)

export const AiMesocycleDraftFieldsFragment = graphql(`
    fragment AiMesocycleDraftFields on AiMesocycleDraft {
        id
        athleteId
        provider
        model
        status
        weeks
        trainingDays
        goal
        name
        days {
            dayOffset
            label
            exercises {
                exerciseId
                slug
                name
                notes
                sets {
                    order
                    plannedWeightKg
                    plannedReps
                    rpe
                    rir
                    notes
                }
            }
        }
        messages {
            id
            role
            content
            createdAt
        }
        parentDraftId
        mesocycleId
        createdAt
        updatedAt
    }
`)

/**
 * Queues the design and returns the job, not the draft: the whole exercise
 * catalog goes into the prompt and a full week comes back, which is the slowest
 * of the four AI jobs. The draft is read back once it succeeds.
 */
export const GenerateMesocycleDraftDocument = graphql(`
    mutation GenerateMesocycleDraft($input: GenerateMesocycleDraftInput!) {
        generateMesocycleDraft(input: $input) {
            id
            status
        }
    }
`)

export const RefineMesocycleDraftDocument = graphql(`
    mutation RefineMesocycleDraft($input: RefineMesocycleDraftInput!) {
        refineMesocycleDraft(input: $input) {
            id
            status
        }
    }
`)

export const AcceptMesocycleDraftDocument = graphql(`
    mutation AcceptMesocycleDraft($draftId: ID!) {
        acceptMesocycleDraft(draftId: $draftId) {
            id
            status
        }
    }
`)

export const DiscardMesocycleDraftDocument = graphql(`
    mutation DiscardMesocycleDraft($draftId: ID!) {
        discardMesocycleDraft(draftId: $draftId)
    }
`)
