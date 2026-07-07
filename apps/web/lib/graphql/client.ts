import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { ClientError, GraphQLClient, type RequestDocument, type Variables } from 'graphql-request'

import { env } from '@/lib/env'
import { RefreshDocument } from '@/lib/graphql/operations/auth'

/**
 * Resolve the GraphQL endpoint. A relative path (the default `/api/graphql`) is
 * resolved against the CURRENT origin in the browser, so requests stay
 * same-origin whether the app is opened at http://localhost:4115 or behind a dev
 * tunnel / any other host — cookies stay first-party and there's no CORS. An
 * absolute `NEXT_PUBLIC_GRAPHQL_URL` (legacy direct-to-API) is honoured as-is.
 */
function resolveEndpoint(): string {
    const path = env.graphqlUrl
    if (/^https?:\/\//.test(path)) return path

    const origin = typeof window !== 'undefined' ? window.location.origin : env.apiUrl
    return new URL(path, origin).toString()
}

const API_URL = resolveEndpoint()

/**
 * Single GraphQL client for the browser. It talks to the same-origin BFF proxy
 * (`/api/graphql`, rewritten to the API in next.config), so the API's HTTPOnly
 * auth cookies are first-party and sent automatically.
 */
export const gqlClient = new GraphQLClient(API_URL, {
    credentials: 'include',
})

/** True when a GraphQL error carries the API's UNAUTHENTICATED code. */
function isUnauthenticated(error: unknown): boolean {
    if (!(error instanceof ClientError)) return false

    return (error.response.errors ?? []).some(
        (e) => (e.extensions as { code?: string } | undefined)?.code === 'UNAUTHENTICATED',
    )
}

/**
 * Single-flight refresh. When several requests hit an expired access token at
 * once (common with a short access TTL), they must NOT each call `refresh`: the
 * API rotates the refresh token on every call and treats the second, now-stale
 * token as reuse, which revokes the whole family and logs the user out. So all
 * concurrent callers await one shared refresh, then retry with the new cookie.
 */
let refreshInFlight: Promise<void> | null = null

/**
 * The session is dead: the access token is expired/invalid and the refresh was
 * rejected (revoked, reuse-detected, or expired). The stale `pl_rt`/`pl_at`
 * cookies are HTTPOnly, so the client can't drop them — and while `pl_rt`
 * lingers, both the proxy and the login page bounce any `/login` navigation
 * straight back to a protected route, trapping the user on a half-rendered page.
 *
 * So we hand off to the server refresh route with a full-page navigation: it
 * retries the (now dead) refresh, fails, and clears both cookies before landing
 * on /login. Guarded so a burst of dead requests triggers a single navigation.
 */
let loggingOut = false

export function hardLogout(): void {
    if (typeof window === 'undefined' || loggingOut) return
    loggingOut = true

    const next = window.location.pathname + window.location.search
    window.location.assign(`/api/auth/refresh?next=${encodeURIComponent(next)}`)
}

export function refreshSession(): Promise<void> {
    refreshInFlight ??= gqlClient
        .request(RefreshDocument as RequestDocument)
        .then(() => undefined)
        .finally(() => {
            refreshInFlight = null
        })

    return refreshInFlight
}

/**
 * Typed request helper (React Query `queryFn`/`mutationFn`). On an expired access
 * token it transparently refreshes once (single-flight) and retries — so a live
 * session (30-day refresh cookie) survives the short access window.
 */
export async function gqlRequest<TResult, TVariables extends Variables>(
    document: TypedDocumentNode<TResult, TVariables>,
    ...[variables]: [TVariables] extends [Record<string, never>] ? [] : [variables: TVariables]
): Promise<TResult> {
    try {
        return await gqlClient.request<TResult>(document as RequestDocument, variables as Variables)
    } catch (error) {
        if (isUnauthenticated(error) && (document as unknown) !== (RefreshDocument as unknown)) {
            try {
                await refreshSession()
            } catch {
                // Refresh rejected → session is unrecoverable. Clear cookies and
                // bounce to login instead of failing silently in place.
                hardLogout()
                throw error
            }

            return gqlClient.request<TResult>(document as RequestDocument, variables as Variables)
        }

        throw error
    }
}
