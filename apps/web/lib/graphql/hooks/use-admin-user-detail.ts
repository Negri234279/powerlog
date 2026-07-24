import { useQuery } from '@tanstack/react-query'

import type { AdminUserDetailQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import { AdminUserDetailDocument } from '@/lib/graphql/operations/admin'

export type AdminUserDetail = NonNullable<AdminUserDetailQuery['adminUserDetail']>
export type AdminUserSubscription = AdminUserDetail['billing'] extends infer B
    ? B extends { subscriptions: infer S }
        ? S extends readonly (infer Row)[]
            ? Row
            : never
        : never
    : never

/** The full admin detail of one user (account, profile, plan, billing, coaching, training). */
export function useAdminUserDetail(userId: string) {
    return useQuery({
        queryKey: ['adminUserDetail', userId],
        queryFn: () => gqlRequest(AdminUserDetailDocument, { userId }).then((r) => r.adminUserDetail),
        staleTime: 15_000,
    })
}
