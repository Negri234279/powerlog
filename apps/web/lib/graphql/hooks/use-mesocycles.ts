import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    GenerateMesocycleWeekInput,
    MesocycleInput,
    MesocycleQuery,
    MesocyclesQuery,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    CreateAthleteMesocycleDocument,
    CreateMesocycleDocument,
    DeleteMesocycleDocument,
    GenerateMesocycleWeekDocument,
    MesocycleDocument,
    MesocyclesDocument,
    SetMesocycleStatusDocument,
    UpdateMesocycleDocument,
} from '@/lib/graphql/operations/mesocycles'

export type MesocycleSummary = MesocyclesQuery['mesocycles'][number]
export type MesocycleData = MesocycleQuery['mesocycle']
export type MicrocycleData = MesocycleData['microcycles'][number]
export type MicrocycleDayData = MicrocycleData['days'][number]
export type MesocycleDayExerciseData = MicrocycleDayData['exercises'][number]
export type MesocycleDaySetData = MesocycleDayExerciseData['sets'][number]

// ── Queries ──────────────────────────────────────────────────

/** The caller's mesocycles (newest first), optional name search. */
export function useMesocycles(search?: string) {
    return useQuery({
        queryKey: ['mesocycles', search ?? null],
        queryFn: () => gqlRequest(MesocyclesDocument, { search }).then((r) => r.mesocycles),
    })
}

/** A single mesocycle with its full week/day/set tree. */
export function useMesocycle(id: string | null) {
    return useQuery({
        queryKey: ['mesocycle', id],
        queryFn: () => gqlRequest(MesocycleDocument, { id: id! }).then((r) => r.mesocycle),
        enabled: Boolean(id),
    })
}

// ── Mutations ────────────────────────────────────────────────

function invalidateMesocycles(qc: QueryClient): void {
    void qc.invalidateQueries({ queryKey: ['mesocycles'] })
}

export function useCreateMesocycle() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: MesocycleInput) => gqlRequest(CreateMesocycleDocument, { input }),
        onSuccess: (r) => {
            qc.setQueryData(['mesocycle', r.createMesocycle.id], r.createMesocycle)
            invalidateMesocycles(qc)
        },
    })
}

/** Coaches only: the athlete owns the block, the coach plans (and edits) it. */
export function useCreateAthleteMesocycle(athleteId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: MesocycleInput) => gqlRequest(CreateAthleteMesocycleDocument, { athleteId, input }),
        onSuccess: (r) => {
            qc.setQueryData(['mesocycle', r.createAthleteMesocycle.id], r.createAthleteMesocycle)
            // The block lands in the athlete's library, not the coach's.
            void qc.invalidateQueries({ queryKey: ['athlete', athleteId] })
        },
    })
}

export function useUpdateMesocycle() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { id: string; input: MesocycleInput }) => gqlRequest(UpdateMesocycleDocument, vars),
        onSuccess: (r) => {
            qc.setQueryData(['mesocycle', r.updateMesocycle.id], r.updateMesocycle)
            invalidateMesocycles(qc)
        },
    })
}

export function useDeleteMesocycle() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeleteMesocycleDocument, { id }),
        onSuccess: (_data, id) => {
            qc.removeQueries({ queryKey: ['mesocycle', id] })
            invalidateMesocycles(qc)
        },
    })
}

export function useSetMesocycleStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { id: string; status: string }) => gqlRequest(SetMesocycleStatusDocument, vars),
        onSuccess: (r) => {
            qc.setQueryData(['mesocycle', r.setMesocycleStatus.id], r.setMesocycleStatus)
            invalidateMesocycles(qc)
        },
    })
}

/** Generate a week into planned sessions; refresh the mesocycle (generatedWeeks) + history. */
export function useGenerateMesocycleWeek() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: GenerateMesocycleWeekInput) => gqlRequest(GenerateMesocycleWeekDocument, { input }),
        onSuccess: (_data, input) => {
            void qc.invalidateQueries({ queryKey: ['mesocycle', input.mesocycleId] })
            void qc.invalidateQueries({ queryKey: ['workoutHistory'] })
            void qc.invalidateQueries({ queryKey: ['exerciseStats'] })
        },
    })
}
