/**
 * Kinds of live update pushed down a user's SSE stream. They mirror the
 * notification vocabulary on purpose — every one of them is also a bell entry —
 * but they are deliberately a separate union: this is a transport concern, and
 * `src/realtime` must not depend on the notifications module.
 */
export const REALTIME_EVENT_TYPES = [
    'coach_invitation',
    'coach_linked',
    'athlete_linked',
    'coach_unlinked',
    'athlete_unlinked',
    'session_planned',
    'mesocycle_assigned',
] as const

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number]

/**
 * What travels on the wire. The type and nothing else: the client reacts by
 * refetching through GraphQL, so no payload (and no PII) ever rides the stream,
 * and every authorization check stays in the resolvers that already do it.
 */
export interface RealtimeEvent {
    type: RealtimeEventType
}

/**
 * Sent on an idle stream so proxies and load balancers don't reap the
 * connection. Clients ignore it.
 */
export const HEARTBEAT = { type: 'ping' } as const
