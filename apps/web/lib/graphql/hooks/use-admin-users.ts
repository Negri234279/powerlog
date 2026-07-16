import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import type { AdminUsersQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    AdminUsersDocument,
    SetUserAdminDocument,
    SetUserRoleDocument,
    SetUserStatusDocument,
} from '@/lib/graphql/operations/admin'

export type AdminUser = AdminUsersQuery['adminUsers']['rows'][number]

export interface AdminUsersFilters {
    roles?: string[]
    statuses?: string[]
    isAdmin?: boolean | null
    verified?: boolean | null
    search?: string
    /** Plan slugs — matches the plan in force, free plans included. */
    plans?: string[]
}

const USERS_KEY = ['adminUsers']
const PAGE_SIZE = 30

/** Filterable admin user listing, offset-paginated for infinite scroll. */
export function useAdminUsers(filters: AdminUsersFilters = {}) {
    return useInfiniteQuery({
        queryKey: [...USERS_KEY, filters],
        queryFn: ({ pageParam }) =>
            gqlRequest(AdminUsersDocument, {
                roles: filters.roles?.length ? filters.roles : null,
                statuses: filters.statuses?.length ? filters.statuses : null,
                isAdmin: filters.isAdmin ?? null,
                verified: filters.verified ?? null,
                search: filters.search?.trim() ? filters.search.trim() : null,
                plans: filters.plans?.length ? filters.plans : null,
                limit: PAGE_SIZE,
                offset: pageParam,
            }).then((r) => r.adminUsers),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            const next = lastPage.offset + lastPage.rows.length
            return next < lastPage.total ? next : undefined
        },
        placeholderData: keepPreviousData,
    })
}

export function useSetUserRole() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { userId: string; role: string }) =>
            gqlRequest(SetUserRoleDocument, { input }).then((r) => r.setUserRole),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
    })
}

export function useSetUserAdmin() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { userId: string; isAdmin: boolean }) =>
            gqlRequest(SetUserAdminDocument, { input }).then((r) => r.setUserAdmin),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: USERS_KEY })
            void queryClient.invalidateQueries({ queryKey: ['adminStats'] })
        },
    })
}

export function useSetUserStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: { userId: string; disabled: boolean }) =>
            gqlRequest(SetUserStatusDocument, { input }).then((r) => r.setUserStatus),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: USERS_KEY })
            void queryClient.invalidateQueries({ queryKey: ['adminStats'] })
        },
    })
}
