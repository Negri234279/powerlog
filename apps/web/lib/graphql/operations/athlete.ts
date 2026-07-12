import { graphql } from '@/lib/graphql/__generated__'

// The coach's window onto one athlete: every field is gated by the coach↔athlete
// link on the API, so these only resolve while the relationship is live.

// ── Reads ────────────────────────────────────────────────────

export const AthleteWorkoutHistoryDocument = graphql(`
    query AthleteWorkoutHistory($athleteId: ID!, $limit: Int, $status: String, $cursor: String) {
        athleteWorkoutHistory(athleteId: $athleteId, limit: $limit, status: $status, cursor: $cursor) {
            items {
                id
                status
                performedAt
                notes
                plannedByUserId
                exerciseCount
                setCount
                totalVolumeKg
            }
            nextCursor
            hasNextPage
        }
    }
`)

export const AthleteWorkoutSessionDocument = graphql(`
    query AthleteWorkoutSession($athleteId: ID!, $id: ID!) {
        athleteWorkoutSession(athleteId: $athleteId, id: $id) {
            ...WorkoutSessionFields
        }
    }
`)

export const AthleteTrainingSummaryDocument = graphql(`
    query AthleteTrainingSummary($athleteId: ID!, $from: String, $to: String) {
        athleteTrainingSummary(athleteId: $athleteId, from: $from, to: $to) {
            sessions
            trainingDays
            totalSets
            totalReps
            totalVolumeKg
            avgRpe
            distinctExercises
            bestSquatE1rmKg
            bestBenchE1rmKg
            bestDeadliftE1rmKg
            estimatedTotalKg
        }
    }
`)

export const AthleteExerciseStatsDocument = graphql(`
    query AthleteExerciseStats($athleteId: ID!, $from: String, $to: String) {
        athleteExerciseStats(athleteId: $athleteId, from: $from, to: $to) {
            exerciseId
            slug
            name
            category
            totalVolumeKg
            totalSets
            totalReps
            bestE1rmKg
            heaviestWeightKg
        }
    }
`)

export const AthleteMesocyclesDocument = graphql(`
    query AthleteMesocycles($athleteId: ID!) {
        athleteMesocycles(athleteId: $athleteId) {
            id
            plannedByUserId
            name
            goal
            status
            startDate
            updatedAt
            weekCount
            dayCount
        }
    }
`)

// ── Planning (coaches only) ──────────────────────────────────

export const PlanWorkoutSessionDocument = graphql(`
    mutation PlanWorkoutSession($input: PlanWorkoutSessionInput!) {
        planWorkoutSession(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const PlanSessionFromTemplateDocument = graphql(`
    mutation PlanSessionFromTemplate($input: PlanSessionFromTemplateInput!) {
        planSessionFromTemplate(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const AssignMesocycleToAthleteDocument = graphql(`
    mutation AssignMesocycleToAthlete($athleteId: ID!, $mesocycleId: ID!, $startDate: String) {
        assignMesocycleToAthlete(athleteId: $athleteId, mesocycleId: $mesocycleId, startDate: $startDate) {
            id
            name
            ownerId
            plannedByUserId
        }
    }
`)
