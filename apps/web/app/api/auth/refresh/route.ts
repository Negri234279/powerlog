import { type NextRequest, NextResponse } from 'next/server'

import { LOGOUT_MARKER_COOKIE, LOGOUT_MARKER_MAX_AGE_SECONDS } from '@/lib/auth/logout-marker'
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
 * Redirect with a RELATIVE `Location`, resolved by the browser against the public
 * URL it's on. We must NOT build an absolute URL from `req.nextUrl.origin`: behind
 * the reverse proxy Next can see the internal bind host, which leaks a bogus
 * `https://0.0.0.0:3000/...` Location. A relative path sidesteps that entirely.
 *
 * Safe here because this route is only ever reached by a full-page navigation
 * (`window.location.assign` from hardLogout, or a server `redirect()` to this
 * `/api` path) — the browser resolves the relative Location natively. Do NOT copy
 * this into middleware: there Next's client router does `new URL(location)` with no
 * base, so a relative path throws `Invalid URL` (middleware must stay absolute).
 */
function relativeRedirect(path: string): NextResponse {
    return new NextResponse(null, { status: 307, headers: { location: path } })
}

/** A Set-Cookie string that expires `name` immediately in the given scope. */
function expiredCookie(name: string, domain?: string): string {
    const parts = [`${name}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax']
    if (serverEnv.cookieSecure) parts.push('Secure')
    if (domain) parts.push(`Domain=${domain}`)
    return parts.join('; ')
}

/**
 * Redirect to login with the auth cookies cleared. A failed refresh means the
 * session is dead, so we drop the stale cookies — otherwise `pl_rt` lingers for
 * its full maxAge (e.g. a refresh revoked on another device) and keeps making
 * `hasRefreshCookie()` report a session that no longer exists.
 */
function loggedOutRedirect(): NextResponse {
    const res = relativeRedirect('/login')

    // Expire the auth cookies in BOTH scopes: the host-only scope the API now sets,
    // and the legacy Domain-scoped one (a cookie is only deleted by a Set-Cookie
    // carrying the SAME Domain it was set with). Without the Domain-scoped expiry an
    // orphaned `pl_rt` survives, shadows the fresh host-only cookie, and every
    // refresh fails → the 15-min logout. Same-name duplicates must be *separate*
    // Set-Cookie headers, so we append raw strings — `res.cookies.set` is a by-name
    // map and would collapse them into one.
    for (const name of [serverEnv.authCookieName, serverEnv.refreshCookieName]) {
        res.headers.append('set-cookie', expiredCookie(name))
        if (serverEnv.cookieDomain) {
            res.headers.append('set-cookie', expiredCookie(name, serverEnv.cookieDomain))
        }
    }

    // Belt-and-braces: tell the proxy we just logged out, so /login sticks even if a
    // cookie above couldn't be cleared — otherwise it loops (see the proxy).
    // Host-only + short-lived: it only needs to survive the hop to /login.
    res.cookies.set(LOGOUT_MARKER_COOKIE, '1', {
        path: '/',
        secure: serverEnv.cookieSecure,
        sameSite: 'lax',
        maxAge: LOGOUT_MARKER_MAX_AGE_SECONDS,
    })

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
    const cookieHeader = req.headers.get('cookie') ?? ''

    let apiRes: Response
    try {
        apiRes = await fetch(`${serverEnv.apiInternalUrl}/graphql`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', cookie: cookieHeader },
            body: JSON.stringify({ query: 'mutation { refresh { id } }' }),
            cache: 'no-store',
        })
    } catch {
        log.error('session refresh failed: API unreachable', { next })
        return loggedOutRedirect()
    }

    // The API only emits Set-Cookie on a successful rotation; a rejected refresh
    // resolves as a GraphQL error with no cookies. So the presence of rotated
    // cookies is the success signal (GraphQL errors still return HTTP 200).
    const setCookies = apiRes.headers.getSetCookie()
    if (!apiRes.ok || setCookies.length === 0) {
        // Expired / revoked / reuse-detected refresh → user is bounced to login.
        log.warn('session refresh rejected', { status: apiRes.status, next })
        return loggedOutRedirect()
    }

    log.debug('session refreshed', { next })
    const res = relativeRedirect(next)
    for (const cookie of setCookies) {
        res.headers.append('set-cookie', cookie)
    }

    return res
}
