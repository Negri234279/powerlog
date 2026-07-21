import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    AthleteExecutionQuery,
    AthleteExerciseStatsQuery,
    AthleteMesocyclesQuery,
    AthleteTrainingSummaryQuery,
    AthleteWorkoutHistoryQuery,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import type { HistoryFilters } from '@/lib/workouts/use-history-filters'
import {
    AssignMesocycleToAthleteDocument,
    AthleteExecutionDocument,
    AthleteExecutionSeriesDocument,
    AthleteExerciseSessionHistoryDocument,
    AthleteExerciseStatsDocument,
    AthleteMesocyclesDocument,
    AthleteStrengthProgressionDocument,
    AthleteTrainingDistributionDocument,
    AthleteTrainingSummaryDocument,
    AthleteVolumeSeriesDocument,
    AthleteWorkoutHistoryDocument,
    AthleteWorkoutSessionDocument,
    PlanSessionFromTemplateDocument,
    PlanWorkoutSessionDocument,
} from '@/lib/graphql/operations/athlete'

export type AthleteHistoryItem = AthleteWorkoutHistoryQuery['athleteWorkoutHistory']['items'][number]
export type AthleteStatsRow = AthleteExerciseStatsQuery['athleteExerciseStats'][number]
export type AthleteSummary = AthleteTrainingSummaryQuery['athleteTrainingSummary']
export type AthleteExecution = AthleteExecutionQuery['athleteExecution']
export type AthleteMesocycle = AthleteMesocyclesQuery['athleteMesocycles'][number]

/** Everything the coach reads about one athlete lives under this key. */
const athleteKey = (athleteId: string) => ['athlete', athleteId] as const

const HISTORY_PAGE_SIZE = 20

// ── Reads ────────────────────────────────────────────────────

/**
 * The athlete's session history as their coach sees it. Takes the same filter
 * set as the athlete's own history — the API's `athleteWorkoutHistory` accepts
 * exactly the same arguments, gated by the coach↔athlete link.
 */
export function useAthleteHistory(athleteId: string, filters: HistoryFilters = {}, enabled = true) {
    return useInfiniteQuery({
        queryKey: [...athleteKey(athleteId), 'history', filters],
        queryFn: ({ pageParam }) =>
            gqlRequest(AthleteWorkoutHistoryDocument, {
                athleteId,
                limit: HISTORY_PAGE_SIZE,
                ...filters,
                // The API's zod arg takes string | undefined, never an explicit null.
                cursor: pageParam ?? undefined,
            }).then((r) => r.athleteWorkoutHistory),
        initialPageParam: null as string | null,
        getNextPageParam: (last) => (last.hasNextPage ? last.nextCursor : undefined),
        enabled,
        retry: false,
        // Keep the current results on screen while a new filter combination loads,
        // so changing filters refreshes in place instead of flashing a skeleton.
        placeholderData: keepPreviousData,
    })
}

/** One of the athlete's sessions, read-only. Lazy: only fetched when expanded. */
export function useAthleteSession(athleteId: string, sessionId: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'session', sessionId],
        queryFn: async () =>
            (await gqlRequest(AthleteWorkoutSessionDocument, { athleteId, id: sessionId })).athleteWorkoutSession,
        enabled,
        retry: false,
    })
}

/**
 * The athlete's previous marks for one exercise — what a coach needs while
 * programming. Same shape as the athlete's own `useExerciseSessionHistory`; the
 * difference is whose history it reads (the API gates it on the coach link).
 */
export function useAthleteExerciseSessionHistory(
    athleteId: string,
    exerciseId: string,
    excludeSessionId?: string,
    options: { enabled?: boolean; limit?: number } = {},
) {
    const { enabled = true, limit } = options

    return useQuery({
        queryKey: [
            ...athleteKey(athleteId),
            'exerciseSessionHistory',
            exerciseId,
            excludeSessionId ?? null,
            limit ?? null,
        ],
        queryFn: async () =>
            (
                await gqlRequest(AthleteExerciseSessionHistoryDocument, {
                    athleteId,
                    exerciseId,
                    excludeSessionId,
                    limit,
                })
            ).athleteExerciseSessionHistory,
        enabled: enabled && Boolean(athleteId) && Boolean(exerciseId),
        retry: false,
    })
}

export function useAthleteSummary(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'summary', from ?? 'all'],
        queryFn: async () =>
            (await gqlRequest(AthleteTrainingSummaryDocument, { athleteId, from })).athleteTrainingSummary,
        enabled,
        retry: false,
    })
}

/**
 * Adherence, set outcomes and load compliance. Separate from `useAthleteSummary`
 * because it answers a different question over a different population — see the
 * API type: adherence covers only what *this* coach programmed, the rest covers
 * all the athlete's training.
 */
export function useAthleteExecution(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'execution', from ?? 'all'],
        queryFn: async () => (await gqlRequest(AthleteExecutionDocument, { athleteId, from })).athleteExecution,
        enabled,
        retry: false,
    })
}

export function useAthleteExerciseStats(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'exerciseStats', from ?? 'all'],
        queryFn: async () => (await gqlRequest(AthleteExerciseStatsDocument, { athleteId, from })).athleteExerciseStats,
        enabled,
        retry: false,
    })
}

/** Week-by-week adherence and programmed-vs-executed load — coach-only charts. */
export function useAthleteExecutionSeries(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'executionSeries', from ?? 'all'],
        queryFn: async () =>
            (await gqlRequest(AthleteExecutionSeriesDocument, { athleteId, from })).athleteExecutionSeries,
        enabled,
        retry: false,
    })
}

export function useAthleteVolumeSeries(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'volumeSeries', from ?? 'all'],
        queryFn: async () => (await gqlRequest(AthleteVolumeSeriesDocument, { athleteId, from })).athleteVolumeSeries,
        enabled,
        retry: false,
    })
}

export function useAthleteDistribution(athleteId: string, from?: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'distribution', from ?? 'all'],
        queryFn: async () =>
            (await gqlRequest(AthleteTrainingDistributionDocument, { athleteId, from })).athleteTrainingDistribution,
        enabled,
        retry: false,
    })
}

/** Disabled until a lift is picked — there is no sensible "all exercises" e1RM. */
export function useAthleteStrengthProgression(athleteId: string, exerciseId?: string, from?: string) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'strength', exerciseId ?? null, from ?? 'all'],
        queryFn: async () =>
            (await gqlRequest(AthleteStrengthProgressionDocument, { athleteId, exerciseId: exerciseId!, from }))
                .athleteStrengthProgression,
        enabled: Boolean(exerciseId),
        retry: false,
    })
}

export function useAthleteMesocycles(athleteId: string, enabled = true) {
    return useQuery({
        queryKey: [...athleteKey(athleteId), 'mesocycles'],
        queryFn: async () => (await gqlRequest(AthleteMesocyclesDocument, { athleteId })).athleteMesocycles,
        enabled,
        retry: false,
    })
}

// ── Planning ─────────────────────────────────────────────────

interface PlanSessionVars {
    athleteId: string
    performedAt?: string
    notes?: string
}

/** Plan an empty session for the athlete. Returns it so the caller can open the editor. */
export function usePlanWorkoutSession() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (input: PlanSessionVars) => gqlRequest(PlanWorkoutSessionDocument, { input }),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({ queryKey: athleteKey(vars.athleteId) })
        },
    })
}

export function usePlanSessionFromTemplate() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (input: PlanSessionVars & { templateId: string }) =>
            gqlRequest(PlanSessionFromTemplateDocument, { input }),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({ queryKey: athleteKey(vars.athleteId) })
        },
    })
}

export function useAssignMesocycle() {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (vars: { athleteId: string; mesocycleId: string; startDate?: string }) =>
            gqlRequest(AssignMesocycleToAthleteDocument, vars),
        onSuccess: (_data, vars) => {
            void qc.invalidateQueries({ queryKey: athleteKey(vars.athleteId) })
        },
    })
}
