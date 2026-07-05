'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

import { FaroRouteTracker } from '@/components/app/faro-route-tracker'

/**
 * Client-side data layer. One QueryClient per browser session, created lazily so
 * it isn't shared across requests during SSR.
 */
export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            <FaroRouteTracker />
            {children}
            {process.env.NODE_ENV !== 'production' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
    )
}
