import {
    keepPreviousData,
    type QueryClient,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import type {
    AddExerciseEntryInput,
    CreateWorkoutSessionInput,
    ExercisesQuery,
    ExerciseStatsQuery,
    LogSetInput,
    StrengthProgressionQuery,
    TrainingDistributionQuery,
    TrainingSummaryQuery,
    UpdateSetInput,
    UpdateWorkoutSessionInput,
    VolumeSeriesQuery,
    WorkoutHistoryQuery,
    WorkoutSessionQuery,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AddExerciseEntryDocument,
    CompleteWorkoutSessionDocument,
    CreateWorkoutSessionDocument,
    DeleteWorkoutSessionDocument,
    ExercisesDocument,
    ExerciseStatsDocument,
    LogSetDocument,
    RemoveExerciseEntryDocument,
    RemoveSetDocument,
    StrengthProgressionDocument,
    TrainingDistributionDocument,
    TrainingSummaryDocument,
    UpdateSetDocument,
    UpdateWorkoutSessionDocument,
    VolumeSeriesDocument,
    WorkoutHistoryDocument,
    WorkoutSessionDocument,
} from '@/lib/graphql/operations/workouts'

export type ExerciseData = ExercisesQuery['exercises'][number]
export type WorkoutSessionData = WorkoutSessionQuery['workoutSession']
export type ExerciseEntryData = WorkoutSessionData['entries'][number]
export type WorkoutSetData = ExerciseEntryData['sets'][number]
export type WorkoutHistoryItem = WorkoutHistoryQuery['workoutHistory']['items'][number]
export type ExerciseStatsData = ExerciseStatsQuery['exerciseStats'][number]
export type TrainingSummaryData = TrainingSummaryQuery['trainingSummary']
export type VolumeBucketData = VolumeSeriesQuery['volumeSeries'][number]
export type StrengthProgressionData = StrengthProgressionQuery['strengthProgression']
export type TrainingDistributionData = TrainingDistributionQuery['trainingDistribution']

// ── Queries ──────────────────────────────────────────────────

/** The exercise catalog (static) — cached indefinitely. Optional category filter. */
export function useExercises(category?: string) {
    return useQuery({
        queryKey: ['exercises', category ?? null],
        queryFn: () => gqlRequest(ExercisesDocument, { category }).then((r) => r.exercises),
        staleTime: Infinity,
    })
}

/** A single session with its full entry/set tree. */
export function useWorkoutSession(id: string) {
    return useQuery({
        queryKey: ['workoutSession', id],
        queryFn: () => gqlRequest(WorkoutSessionDocument, { id }).then((r) => r.workoutSession),
        enabled: Boolean(id),
    })
}

export interface WorkoutHistoryFilters {
    limit?: number
    status?: string
    from?: string
    to?: string
    exerciseId?: string
    query?: string
}

/** Keyset-paginated session history (newest first). */
export function useWorkoutHistory(filters: WorkoutHistoryFilters = {}) {
    return useInfiniteQuery({
        queryKey: ['workoutHistory', filters],
        queryFn: ({ pageParam }) =>
            // Omit the cursor on the first page — the API's zod arg rejects an
            // explicit null (it accepts string | undefined, not null).
            gqlRequest(WorkoutHistoryDocument, { ...filters, cursor: pageParam ?? undefined }).then(
                (r) => r.workoutHistory,
            ),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => (last.hasNextPage ? last.nextCursor : undefined),
        // Keep the current results on screen while a new filter combination loads,
        // so changing filters refreshes in place instead of flashing a loading state.
        placeholderData: keepPreviousData,
    })
}

/** Per-exercise volume + PRs, optionally within an ISO date range. */
export function useExerciseStats(from?: string, to?: string) {
    return useQuery({
        queryKey: ['exerciseStats', from ?? null, to ?? null],
        queryFn: () => gqlRequest(ExerciseStatsDocument, { from, to }).then((r) => r.exerciseStats),
    })
}

/** Headline training KPIs (incl. estimated S+B+D total), optionally ranged. */
export function useTrainingSummary(from?: string, to?: string) {
    return useQuery({
        queryKey: ['trainingSummary', from ?? null, to ?? null],
        queryFn: () => gqlRequest(TrainingSummaryDocument, { from, to }).then((r) => r.trainingSummary),
    })
}

/** Weekly training-volume series, optionally within an ISO date range. */
export function useVolumeSeries(from?: string, to?: string) {
    return useQuery({
        queryKey: ['volumeSeries', from ?? null, to ?? null],
        queryFn: () => gqlRequest(VolumeSeriesDocument, { from, to }).then((r) => r.volumeSeries),
    })
}

/** e1RM progression + projection for one exercise, optionally ranged. */
export function useStrengthProgression(exerciseId: string | undefined, from?: string, to?: string) {
    return useQuery({
        queryKey: ['strengthProgression', exerciseId ?? null, from ?? null, to ?? null],
        queryFn: () =>
            gqlRequest(StrengthProgressionDocument, { exerciseId: exerciseId!, from, to }).then(
                (r) => r.strengthProgression,
            ),
        enabled: Boolean(exerciseId),
    })
}

/** Volume distribution (muscle/category) + RPE breakdown, optionally ranged. */
export function useTrainingDistribution(from?: string, to?: string) {
    return useQuery({
        queryKey: ['trainingDistribution', from ?? null, to ?? null],
        queryFn: () => gqlRequest(TrainingDistributionDocument, { from, to }).then((r) => r.trainingDistribution),
    })
}

// ── Mutations ────────────────────────────────────────────────

// Every content mutation returns the full session: seed its detail cache and
// invalidate the rollup views (history counts/volume, analytics) that change.
function cacheSession(qc: QueryClient, session: WorkoutSessionData): void {
    qc.setQueryData(['workoutSession', session.id], session)
    void qc.invalidateQueries({ queryKey: ['workoutHistory'] })
    void qc.invalidateQueries({ queryKey: ['exerciseStats'] })
}

export function useCreateWorkoutSession() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input?: CreateWorkoutSessionInput) => gqlRequest(CreateWorkoutSessionDocument, { input }),
        onSuccess: (r) => cacheSession(qc, r.createWorkoutSession),
    })
}

export function useAddExerciseEntry() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: AddExerciseEntryInput) => gqlRequest(AddExerciseEntryDocument, { input }),
        onSuccess: (r) => cacheSession(qc, r.addExerciseEntry),
    })
}

export function useRemoveExerciseEntry() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { sessionId: string; entryId: string }) => gqlRequest(RemoveExerciseEntryDocument, vars),
        onSuccess: (r) => cacheSession(qc, r.removeExerciseEntry),
    })
}

export function useLogSet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: LogSetInput) => gqlRequest(LogSetDocument, { input }),
        onSuccess: (r) => cacheSession(qc, r.logSet),
    })
}

export function useUpdateSet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: UpdateSetInput) => gqlRequest(UpdateSetDocument, { input }),
        onSuccess: (r) => cacheSession(qc, r.updateSet),
    })
}

export function useRemoveSet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { sessionId: string; entryId: string; setId: string }) =>
            gqlRequest(RemoveSetDocument, vars),
        onSuccess: (r) => cacheSession(qc, r.removeSet),
    })
}

export function useUpdateWorkoutSession() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: UpdateWorkoutSessionInput) => gqlRequest(UpdateWorkoutSessionDocument, { input }),
        onSuccess: (r) => cacheSession(qc, r.updateWorkoutSession),
    })
}

export function useCompleteWorkoutSession() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => gqlRequest(CompleteWorkoutSessionDocument, { id }),
        onSuccess: (r) => cacheSession(qc, r.completeWorkoutSession),
    })
}

export function useDeleteWorkoutSession() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeleteWorkoutSessionDocument, { id }),
        onSuccess: (_data, id) => {
            qc.removeQueries({ queryKey: ['workoutSession', id] })
            void qc.invalidateQueries({ queryKey: ['workoutHistory'] })
            void qc.invalidateQueries({ queryKey: ['exerciseStats'] })
        },
    })
}
