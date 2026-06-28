import { useQuery } from '@tanstack/react-query'

import { gqlRequest } from '@/lib/graphql/client'
import { AdminStatsDocument } from '@/lib/graphql/operations/admin'

/** Aggregate dashboard stats: users + coaching + workouts in one request. */
export function useAdminStats() {
    return useQuery({
        queryKey: ['adminStats'],
        queryFn: () => gqlRequest(AdminStatsDocument),
        staleTime: 60_000,
    })
}
