import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
    CreateSessionFromTemplateInput,
    WorkoutTemplateInput,
    WorkoutTemplateQuery,
    WorkoutTemplatesQuery,
} from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    CreateSessionFromTemplateDocument,
    CreateWorkoutTemplateDocument,
    DeleteWorkoutTemplateDocument,
    UpdateWorkoutTemplateDocument,
    WorkoutTemplateDocument,
    WorkoutTemplatesDocument,
} from '@/lib/graphql/operations/workout-templates'

export type WorkoutTemplateSummary = WorkoutTemplatesQuery['workoutTemplates'][number]
export type WorkoutTemplateData = WorkoutTemplateQuery['workoutTemplate']
export type WorkoutTemplateExerciseData = WorkoutTemplateData['exercises'][number]
export type WorkoutTemplateSetData = WorkoutTemplateExerciseData['sets'][number]

// ── Queries ──────────────────────────────────────────────────

/** The caller's templates (name-ordered), optional name search. */
export function useWorkoutTemplates(search?: string) {
    return useQuery({
        queryKey: ['workoutTemplates', search ?? null],
        queryFn: () => gqlRequest(WorkoutTemplatesDocument, { search }).then((r) => r.workoutTemplates),
    })
}

/** A single template with its full exercise/set tree. */
export function useWorkoutTemplate(id: string | null) {
    return useQuery({
        queryKey: ['workoutTemplate', id],
        queryFn: () => gqlRequest(WorkoutTemplateDocument, { id: id! }).then((r) => r.workoutTemplate),
        enabled: Boolean(id),
    })
}

// ── Mutations ────────────────────────────────────────────────

function invalidateTemplates(qc: QueryClient): void {
    void qc.invalidateQueries({ queryKey: ['workoutTemplates'] })
}

export function useCreateWorkoutTemplate() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: WorkoutTemplateInput) => gqlRequest(CreateWorkoutTemplateDocument, { input }),
        onSuccess: () => invalidateTemplates(qc),
    })
}

export function useUpdateWorkoutTemplate() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (vars: { id: string; input: WorkoutTemplateInput }) =>
            gqlRequest(UpdateWorkoutTemplateDocument, vars),
        onSuccess: (r) => {
            qc.setQueryData(['workoutTemplate', r.updateWorkoutTemplate.id], r.updateWorkoutTemplate)
            invalidateTemplates(qc)
        },
    })
}

export function useDeleteWorkoutTemplate() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeleteWorkoutTemplateDocument, { id }),
        onSuccess: (_data, id) => {
            qc.removeQueries({ queryKey: ['workoutTemplate', id] })
            invalidateTemplates(qc)
        },
    })
}

/** Start a session pre-filled from a template; seeds the session cache + refreshes history. */
export function useCreateSessionFromTemplate() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: CreateSessionFromTemplateInput) => gqlRequest(CreateSessionFromTemplateDocument, { input }),
        onSuccess: (r) => {
            const session = r.createSessionFromTemplate
            qc.setQueryData(['workoutSession', session.id], session)
            void qc.invalidateQueries({ queryKey: ['workoutHistory'] })
            void qc.invalidateQueries({ queryKey: ['exerciseStats'] })
        },
    })
}
