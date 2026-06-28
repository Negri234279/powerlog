import { useQuery } from '@tanstack/react-query'

import { gqlRequest } from '@/lib/graphql/client'
import { PingDocument } from '@/lib/graphql/operations/ping'

/** Reference data hook: React Query + graphql-request + a typed document. */
export function usePing() {
    return useQuery({
        queryKey: ['ping'],
        queryFn: () => gqlRequest(PingDocument),
    })
}
