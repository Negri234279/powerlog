import { graphql } from '@/lib/graphql/__generated__'

// The full mesocycle tree, reused by the queries/mutations that return a mesocycle.
export const MesocycleFieldsFragment = graphql(`
    fragment MesocycleFields on Mesocycle {
        id
        ownerId
        name
        notes
        goal
        startDate
        status
        createdAt
        updatedAt
        generatedWeeks
        microcycles {
            id
            weekIndex
            label
            notes
            days {
                id
                order
                dayOffset
                label
                notes
                exercises {
                    id
                    exerciseId
                    order
                    notes
                    sets {
                        id
                        order
                        plannedWeightKg
                        plannedReps
                        rpe
                        rir
                        notes
                    }
                }
            }
        }
    }
`)

// ── Queries ──────────────────────────────────────────────────

export const MesocyclesDocument = graphql(`
    query Mesocycles($search: String) {
        mesocycles(search: $search) {
            id
            name
            notes
            goal
            status
            startDate
            updatedAt
            weekCount
            dayCount
        }
    }
`)

export const MesocycleDocument = graphql(`
    query Mesocycle($id: ID!) {
        mesocycle(id: $id) {
            ...MesocycleFields
        }
    }
`)

// ── Mutations ────────────────────────────────────────────────

export const CreateMesocycleDocument = graphql(`
    mutation CreateMesocycle($input: MesocycleInput!) {
        createMesocycle(input: $input) {
            ...MesocycleFields
        }
    }
`)

export const UpdateMesocycleDocument = graphql(`
    mutation UpdateMesocycle($id: ID!, $input: MesocycleInput!) {
        updateMesocycle(id: $id, input: $input) {
            ...MesocycleFields
        }
    }
`)

export const DeleteMesocycleDocument = graphql(`
    mutation DeleteMesocycle($id: ID!) {
        deleteMesocycle(id: $id)
    }
`)

export const SetMesocycleStatusDocument = graphql(`
    mutation SetMesocycleStatus($id: ID!, $status: String!) {
        setMesocycleStatus(id: $id, status: $status) {
            ...MesocycleFields
        }
    }
`)

export const GenerateMesocycleWeekDocument = graphql(`
    mutation GenerateMesocycleWeek($input: GenerateMesocycleWeekInput!) {
        generateMesocycleWeek(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)
