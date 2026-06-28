import { type NextRequest, NextResponse } from 'next/server'

import { serverEnv } from '@/lib/env.server'
import { log } from '@/lib/log/server'

// Node runtime: this route reads the server-only env (RS256 key path via fs) and
// relays Set-Cookie headers — neither works on the Edge runtime.
export const runtime = 'nodejs'

/**
 * Only same-origin absolute paths are allowed as the bounce target, so a crafted
 * `?next=` can't turn this into an open redirect. Anything else falls back to the
 * dashboard.
 */
function sanitizeNext(next: string | null): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
        return '/dashboard'
    }

    return next
}

/**
 * Redirect to login with the auth cookies cleared. A failed refresh means the
 * session is dead, so we drop the stale cookies — otherwise `pl_rt` lingers for
 * its full maxAge (e.g. a refresh revoked on another device) and keeps making
 * `hasRefreshCookie()` report a session that no longer exists.
 */
function loggedOutRedirect(loginUrl: URL): NextResponse {
    const res = NextResponse.redirect(loginUrl)
    res.cookies.set(serverEnv.authCookieName, '', { path: '/', maxAge: 0 })
    res.cookies.set(serverEnv.refreshCookieName, '', { path: '/', maxAge: 0 })
    return res
}

/**
 * Server-side silent refresh. A hard gate (`requireSession`/`requireAdmin`)
 * redirects here when the access token has expired but a refresh cookie is still
 * present. We rotate the session against the API server-to-server, relay the
 * rotated HTTPOnly Set-Cookie headers to the browser, and bounce back to `next`
 * — now with a fresh access token the gate can verify. Any failure (expired,
 * revoked, or reuse-detected refresh) sends the user to /login.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const next = sanitizeNext(req.nextUrl.searchParams.get('next'))
    const loginUrl = new URL('/login', req.nextUrl.origin)

    let apiRes: Response
    try {
        apiRes = await fetch(`${serverEnv.apiInternalUrl}/graphql`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie: req.headers.get('cookie') ?? '' },
            body: JSON.stringify({ query: 'mutation { refresh { id } }' }),
            cache: 'no-store',
        })
    } catch {
        log.error('session refresh failed: API unreachable', { next })
        return loggedOutRedirect(loginUrl)
    }

    // The API only emits Set-Cookie on a successful rotation; a rejected refresh
    // resolves as a GraphQL error with no cookies. So the presence of rotated
    // cookies is the success signal (GraphQL errors still return HTTP 200).
    const setCookies = apiRes.headers.getSetCookie()
    if (!apiRes.ok || setCookies.length === 0) {
        // Expired / revoked / reuse-detected refresh → user is bounced to login.
        log.warn('session refresh rejected', { status: apiRes.status, next })
        return loggedOutRedirect(loginUrl)
    }

    log.debug('session refreshed', { next })
    const res = NextResponse.redirect(new URL(next, req.nextUrl.origin))
    for (const cookie of setCookies) {
        res.headers.append('set-cookie', cookie)
    }

    return res
}
