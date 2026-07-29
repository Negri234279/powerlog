import { type NextRequest, NextResponse } from 'next/server'

import { LOGOUT_MARKER_COOKIE } from '@/lib/auth/logout-marker'

// The refresh cookie name matches the API default (REFRESH_COOKIE_NAME). Because
// the browser only talks to the same-origin BFF proxy (/api/*), this HTTPOnly
// cookie is first-party here, so the proxy can read it.
const REFRESH_COOKIE = 'pl_rt'

// The explicit locale choice (set by the marketing LocaleSwitcher and the app's
// LanguageSwitcher). Not HTTPOnly, so the switcher can write it from the client.
const LOCALE_COOKIE = 'NEXT_LOCALE'

const PROTECTED = ['/dashboard', '/profile', '/admin']

// Pages a signed-in user has no reason to land on: both marketing homes and the
// auth forms. `/` and `/es` are gated here rather than in their pages because the
// refresh cookie is the only marker that survives the short access window — a
// `getSession()` check in the page would show the landing to a logged-in user
// whose access token merely expired — and because the redirect then happens
// before the landing tree renders at all.
const SIGNED_IN_ELSEWHERE = ['/', '/es', '/login', '/register']

/**
 * Whether to serve the visitor Spanish. An explicit `NEXT_LOCALE` choice wins;
 * absent that, the browser's top `Accept-Language` is sniffed. Crawlers send no
 * cookie and (Googlebot) an English Accept-Language, so they get `/` and reach
 * `/es` through the hreflang alternates rather than being redirected away.
 */
function prefersSpanish(req: NextRequest): boolean {
    const choice = req.cookies.get(LOCALE_COOKIE)?.value
    if (choice) return choice.toLowerCase().startsWith('es')

    const accept = req.headers.get('accept-language') ?? ''
    return accept.trim().toLowerCase().startsWith('es')
}

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl
    // The long-lived refresh cookie is the durable session marker — the access
    // cookie is ephemeral (≤15 min) and can't renew itself, so a lone access
    // cookie isn't a session. Validity is checked server-side by getSession; this
    // is just the cheap optimistic redirect.
    const hasSession = req.cookies.has(REFRESH_COOKIE)

    // Middleware redirects MUST be absolute: Next's client router resolves the
    // `Location` with `new URL(location)` (no base), so a relative path throws
    // `Invalid URL`. Cloning `req.nextUrl` keeps the request's own origin.
    const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (isProtected && !hasSession) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // A stale-but-present cookie (revoked / expired / reuse-detected) doesn't trap
    // the user: /dashboard's gate fails the refresh, which clears both cookies and
    // drops them on /login — from where the landing is reachable again.
    if (SIGNED_IN_ELSEWHERE.includes(pathname) && hasSession) {
        // Circuit breaker: a just-failed refresh sets this marker on its way to
        // /login. If the refresh cookie couldn't be cleared (e.g. a Domain
        // mismatch), bouncing this "still signed in" user back to /dashboard would
        // fail the refresh again and loop forever. Honour the marker once — keep
        // them on /login and consume it, so a genuine later login isn't affected.
        if (req.cookies.has(LOGOUT_MARKER_COOKIE)) {
            const res = NextResponse.next()
            res.cookies.set(LOGOUT_MARKER_COOKIE, '', { path: '/', maxAge: 0 })
            return res
        }

        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Anonymous visitor on the English landing who prefers Spanish → `/es`. Only `/`
    // auto-detects; `/es` is the explicit Spanish URL and never redirects away, so a
    // shared /es link always works and there's no redirect loop.
    if (pathname === '/' && prefersSpanish(req)) {
        const url = req.nextUrl.clone()
        url.pathname = '/es'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/', '/es', '/dashboard/:path*', '/profile/:path*', '/admin/:path*', '/login', '/register'],
}
