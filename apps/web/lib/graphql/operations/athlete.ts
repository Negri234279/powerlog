import { graphql } from '@/lib/graphql/__generated__'

// The coach's window onto one athlete: every field is gated by the coach↔athlete
// link on the API, so these only resolve while the relationship is live.

// ── Reads ────────────────────────────────────────────────────

export const AthleteWorkoutHistoryDocument = graphql(`
    query AthleteWorkoutHistory(
        $athleteId: ID!
        $limit: Int
        $status: String
        $from: String
        $to: String
        $exerciseId: ID
        $query: String
        $cursor: String
    ) {
        athleteWorkoutHistory(
            athleteId: $athleteId
            limit: $limit
            status: $status
            from: $from
            to: $to
            exerciseId: $exerciseId
            query: $query
            cursor: $cursor
        ) {
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
            successSets
            failedSets
        }
    }
`)

export const AthleteExecutionDocument = graphql(`
    query AthleteExecution($athleteId: ID!, $from: String, $to: String) {
        athleteExecution(athleteId: $athleteId, from: $from, to: $to) {
            adherenceRate
            plannedCompleted
            plannedMissed
            plannedUpcoming
            successRate
            successSets
            failedSets
            pendingSets
            loadCompliance
            plannedSets
            sessionsPerWeek
            lastSessionAt
            daysSinceLastSession
            volumeChange
            sessionsChange
        }
    }
`)

export const AthleteExerciseSessionHistoryDocument = graphql(`
    query AthleteExerciseSessionHistory($athleteId: ID!, $exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {
        athleteExerciseSessionHistory(
            athleteId: $athleteId
            exerciseId: $exerciseId
            excludeSessionId: $excludeSessionId
            limit: $limit
        ) {
            sessionId
            performedAt
            status
            sets {
                plannedWeightKg
                plannedReps
                weightKg
                reps
                rpe
                rir
                e1rmKg
            }
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
