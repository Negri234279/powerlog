import { graphql } from '@/lib/graphql/__generated__'

// The full session tree, reused by every mutation that returns a session (they
// all resolve to the complete WorkoutSession). fragmentMasking is off, so the
// fields are inlined and directly accessible on the typed result.
export const WorkoutSessionFieldsFragment = graphql(`
    fragment WorkoutSessionFields on WorkoutSession {
        id
        userId
        status
        performedAt
        notes
        plannedByUserId
        createdAt
        updatedAt
        entries {
            id
            exerciseId
            order
            notes
            sets {
                id
                order
                plannedWeightKg
                plannedReps
                plannedRpe
                plannedRir
                weightKg
                reps
                rpe
                rir
                e1rmKg
                outcome
                notes
            }
        }
    }
`)

// ── Queries ──────────────────────────────────────────────────

export const ExercisesDocument = graphql(`
    query Exercises($category: String) {
        exercises(category: $category) {
            id
            slug
            name
            category
            equipment
            primaryMuscle
        }
    }
`)

export const WorkoutSessionDocument = graphql(`
    query WorkoutSession($id: ID!) {
        workoutSession(id: $id) {
            ...WorkoutSessionFields
        }
    }
`)

export const WorkoutHistoryDocument = graphql(`
    query WorkoutHistory(
        $cursor: String
        $limit: Int
        $status: String
        $from: String
        $to: String
        $exerciseId: ID
        $query: String
    ) {
        workoutHistory(
            cursor: $cursor
            limit: $limit
            status: $status
            from: $from
            to: $to
            exerciseId: $exerciseId
            query: $query
        ) {
            items {
                id
                userId
                status
                performedAt
                notes
                plannedByUserId
                exerciseCount
                setCount
                totalVolumeKg
                createdAt
                updatedAt
            }
            nextCursor
            hasNextPage
        }
    }
`)

export const ExerciseStatsDocument = graphql(`
    query ExerciseStats($from: String, $to: String) {
        exerciseStats(from: $from, to: $to) {
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

export const ExerciseSessionHistoryDocument = graphql(`
    query ExerciseSessionHistory($exerciseId: ID!, $excludeSessionId: ID, $limit: Int) {
        exerciseSessionHistory(exerciseId: $exerciseId, excludeSessionId: $excludeSessionId, limit: $limit) {
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

export const TrainingSummaryDocument = graphql(`
    query TrainingSummary($from: String, $to: String) {
        trainingSummary(from: $from, to: $to) {
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

export const VolumeSeriesDocument = graphql(`
    query VolumeSeries($from: String, $to: String) {
        volumeSeries(from: $from, to: $to) {
            bucketStart
            totalVolumeKg
            totalSets
            sessions
        }
    }
`)

export const StrengthProgressionDocument = graphql(`
    query StrengthProgression($exerciseId: ID!, $from: String, $to: String) {
        strengthProgression(exerciseId: $exerciseId, from: $from, to: $to) {
            points {
                performedAt
                e1rmKg
            }
            trend {
                slopePerWeekKg
                r2
                projections {
                    weeks
                    e1rmKg
                }
            }
        }
    }
`)

export const TrainingDistributionDocument = graphql(`
    query TrainingDistribution($from: String, $to: String) {
        trainingDistribution(from: $from, to: $to) {
            byMuscle {
                key
                totalVolumeKg
                totalSets
            }
            byCategory {
                key
                totalVolumeKg
                totalSets
            }
            rpe {
                value
                sets
            }
            rir {
                value
                sets
            }
        }
    }
`)

// ── Mutations ────────────────────────────────────────────────

export const CreateWorkoutSessionDocument = graphql(`
    mutation CreateWorkoutSession($input: CreateWorkoutSessionInput) {
        createWorkoutSession(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const AddExerciseEntryDocument = graphql(`
    mutation AddExerciseEntry($input: AddExerciseEntryInput!) {
        addExerciseEntry(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const RemoveExerciseEntryDocument = graphql(`
    mutation RemoveExerciseEntry($sessionId: ID!, $entryId: ID!) {
        removeExerciseEntry(sessionId: $sessionId, entryId: $entryId) {
            ...WorkoutSessionFields
        }
    }
`)

export const LogSetDocument = graphql(`
    mutation LogSet($input: LogSetInput!) {
        logSet(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const UpdateSetDocument = graphql(`
    mutation UpdateSet($input: UpdateSetInput!) {
        updateSet(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const CompleteSetDocument = graphql(`
    mutation CompleteSet($input: CompleteSetInput!) {
        completeSet(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const RemoveSetDocument = graphql(`
    mutation RemoveSet($sessionId: ID!, $entryId: ID!, $setId: ID!) {
        removeSet(sessionId: $sessionId, entryId: $entryId, setId: $setId) {
            ...WorkoutSessionFields
        }
    }
`)

export const UpdateWorkoutSessionDocument = graphql(`
    mutation UpdateWorkoutSession($input: UpdateWorkoutSessionInput!) {
        updateWorkoutSession(input: $input) {
            ...WorkoutSessionFields
        }
    }
`)

export const CompleteWorkoutSessionDocument = graphql(`
    mutation CompleteWorkoutSession($id: ID!) {
        completeWorkoutSession(id: $id) {
            ...WorkoutSessionFields
        }
    }
`)

export const DeleteWorkoutSessionDocument = graphql(`
    mutation DeleteWorkoutSession($id: ID!) {
        deleteWorkoutSession(id: $id)
    }
`)
