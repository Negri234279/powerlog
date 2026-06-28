import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { AdminExercisesQuery, CreateExerciseInput, UpdateExerciseInput } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AdminExercisesDocument,
    CreateExerciseDocument,
    DeleteExerciseDocument,
    UpdateExerciseDocument,
} from '@/lib/graphql/operations/admin'

export type AdminExercise = AdminExercisesQuery['adminExercises']['rows'][number]

export interface AdminExerciseFilters {
    categories?: string[]
    equipment?: string[]
    muscles?: string[]
    search?: string
}

const KEY = ['adminExercises']
const PAGE_SIZE = 30

/** Admin exercise catalog, offset-paginated for infinite scroll. */
export function useAdminExercises(filters: AdminExerciseFilters = {}) {
    return useInfiniteQuery({
        queryKey: [...KEY, filters],
        queryFn: ({ pageParam }) =>
            gqlRequest(AdminExercisesDocument, {
                categories: filters.categories?.length ? filters.categories : null,
                equipment: filters.equipment?.length ? filters.equipment : null,
                muscles: filters.muscles?.length ? filters.muscles : null,
                search: filters.search?.trim() ? filters.search.trim() : null,
                limit: PAGE_SIZE,
                offset: pageParam,
            }).then((r) => r.adminExercises),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const next = lastPage.offset + lastPage.rows.length
            return next < lastPage.total ? next : undefined
        },
        placeholderData: keepPreviousData,
    })
}

export function useCreateExercise() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: CreateExerciseInput) =>
            gqlRequest(CreateExerciseDocument, { input }).then((r) => r.createExercise),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}

export function useUpdateExercise() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: UpdateExerciseInput) =>
            gqlRequest(UpdateExerciseDocument, { input }).then((r) => r.updateExercise),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}

export function useDeleteExercise() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (exerciseId: string) =>
            gqlRequest(DeleteExerciseDocument, { exerciseId }).then((r) => r.deleteExercise),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}
