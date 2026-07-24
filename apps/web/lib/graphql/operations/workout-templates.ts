import { graphql } from '@/lib/graphql/__generated__'

// The full template tree, reused by the queries/mutations that return a template.
export const WorkoutTemplateFieldsFragment = graphql(`
    fragment WorkoutTemplateFields on WorkoutTemplate {
        id
        ownerId
        name
        notes
        createdAt
        updatedAt
        exercises {
            id
            exerciseId
            order
            notes
            sets {
                id
                order
                plannedWeightKg {
                    min
                    max
                }
                plannedReps {
                    min
                    max
                }
                rpe {
                    min
                    max
                }
                rir {
                    min
                    max
                }
                notes
            }
        }
    }
`)

// ── Queries ──────────────────────────────────────────────────

export const WorkoutTemplatesDocument = graphql(`
    query WorkoutTemplates($search: String) {
        workoutTemplates(search: $search) {
            id
            name
            notes
            updatedAt
            exerciseCount
            setCount
        }
    }
`)

export const WorkoutTemplateDocument = graphql(`
    query WorkoutTemplate($id: ID!) {
        workoutTemplate(id: $id) {
            ...WorkoutTemplateFields
        }
    }
`)

// ── Mutations ────────────────────────────────────────────────

export const CreateWorkoutTemplateDocument = graphql(`
    mutation CreateWorkoutTemplate($input: WorkoutTemplateInput!) {
        createWorkoutTemplate(input: $input) {
            ...WorkoutTemplateFields
        }
    }
`)

export const UpdateWorkoutTemplateDocument = graphql(`
    mutation UpdateWorkoutTemplate($id: ID!, $input: WorkoutTemplateInput!) {
        updateWorkoutTemplate(id: $id, input: $input) {
            ...WorkoutTemplateFields
        }
    }
`)

export const DeleteWorkoutTemplateDocument = graphql(`
    mutation DeleteWorkoutTemplate($id: ID!) {
        deleteWorkoutTemplate(id: $id)
    }
`)

export const CreateSessionFromTemplateDocument = graphql(`
    mutation CreateSessionFromTemplate($input: CreateSessionFromTemplateInput!) {
        createSessionFromTemplate(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)
