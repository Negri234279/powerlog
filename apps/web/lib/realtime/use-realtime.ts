'use client'

import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { refreshSession } from '@/lib/graphql/client'

/** Same-origin BFF proxy → the API's SSE endpoint. EventSource sends the auth
 *  cookie by itself because the browser only ever talks to the web origin. */
const STREAM_URL = '/api/events'

/**
 * Which cached queries each pushed event invalidates. The event carries its type
 * and nothing else, so the fresh data always comes back through GraphQL — which
 * re-runs the API's authorization checks instead of trusting the stream.
 */
const INVALIDATES = {
    coach_invitation: [['coaching', 'pendingInvitations'], ['notifications']],
    coach_linked: [['coaching', 'coaches'], ['notifications']],
    athlete_linked: [['coaching', 'athletes'], ['notifications']],
    coach_unlinked: [['coaching', 'coaches'], ['notifications']],
    athlete_unlinked: [['coaching', 'athletes'], ['notifications']],
    session_planned: [['workoutHistory'], ['notifications']],
    mesocycle_assigned: [['mesocycles'], ['workoutHistory'], ['notifications']],
    // The checkout redirect cannot be trusted (the subscription is created by the
    // webhook), so this is what actually tells the open tab that the money landed.
    subscription_updated: [['myPlan'], ['myInvoices'], ['notifications']],
    // An AI job finished. The tab that asked is already waiting on it, but this is
    // what reaches the OTHER tabs — and the one that was reopened while the job
    // ran — without any of them polling for a draft they don't know about yet.
    ai_generation_settled: [['sessionPlanDraft'], ['mesocycleDraft'], ['aiDraftCount'], ['aiDraftHistory']],
} as const satisfies Record<string, readonly string[][]>

type RealtimeEventType = keyof typeof INVALIDATES

/** The heartbeat (`{ type: 'ping' }`) and anything a newer API knows about land
 *  here as null and are ignored. */
function parseEventType(raw: string): RealtimeEventType | null {
    try {
        const parsed: unknown = JSON.parse(raw)
        const type = (parsed as { type?: unknown } | null)?.type

        return typeof type === 'string' && type in INVALIDATES ? (type as RealtimeEventType) : null
    } catch {
        return null
    }
}

function invalidate(queryClient: QueryClient, type: RealtimeEventType): void {
    for (const queryKey of INVALIDATES[type]) {
        void queryClient.invalidateQueries({ queryKey })
    }

    // A subscription change can flip the user's role — activating a coach plan
    // promotes them (the reverse on the way out). The role rides in the JWT, so the
    // invalidations above aren't enough: re-mint the session to pull the new role,
    // then refetch `me`. This fires exactly when the webhook lands, so it works from
    // anywhere (e.g. a fresh signup that paid for a coach plan and went to the
    // dashboard). Single-flight-shared with the client, so it can't collide with the
    // reconnect refresh.
    if (type === 'subscription_updated') {
        void refreshSession()
            .then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
            .catch(() => undefined)
    }
}

// Backoff between reconnection attempts, capped. Jittered so a fleet of tabs
// doesn't stampede the API in lockstep after a deploy.
const BASE_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

/**
 * Subscribes the signed-in user to their server-pushed updates and refreshes the
 * affected React Query caches as they arrive — so a coach sitting on /coaching
 * sees an athlete appear the moment they accept, with no manual reload.
 *
 * Mounted once, in the authed shell. Best-effort by design: if the stream is
 * down the app just falls back to its normal refetching.
 */
export function useRealtime(): void {
    const queryClient = useQueryClient()

    useEffect(() => {
        let source: EventSource | null = null
        let retryTimer: ReturnType<typeof setTimeout> | null = null
        let attempt = 0
        let unmounted = false

        function connect(): void {
            source = new EventSource(STREAM_URL, { withCredentials: true })

            source.onopen = () => {
                attempt = 0
            }

            source.onmessage = (event: MessageEvent<string>) => {
                const type = parseEventType(event.data)
                if (type) invalidate(queryClient, type)
            }

            source.onerror = () => {
                // The browser reconnects a dropped connection on its own, but an HTTP
                // error closes the stream for good — which is what an expired access
                // cookie (15 min) looks like from here. Renew and reopen ourselves.
                if (source?.readyState !== EventSource.CLOSED) return

                source.close()
                scheduleReconnect()
            }
        }

        function scheduleReconnect(): void {
            if (unmounted) return

            const backoff = Math.min(BASE_RETRY_MS * 2 ** attempt, MAX_RETRY_MS)
            const delay = backoff + Math.random() * 500
            attempt += 1

            retryTimer = setTimeout(() => {
                // Single-flight, shared with the GraphQL client: concurrent refreshes
                // would look like refresh-token reuse and kill the session. A failure
                // here means the session is gone — the shell's `useMe` handles that.
                refreshSession()
                    .catch(() => undefined)
                    .finally(() => {
                        if (!unmounted) connect()
                    })
            }, delay)
        }

        connect()

        return () => {
            unmounted = true
            if (retryTimer) clearTimeout(retryTimer)
            source?.close()
        }
    }, [queryClient])
}
