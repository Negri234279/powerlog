import { type NextRequest, NextResponse } from 'next/server'

// The refresh cookie name matches the API default (REFRESH_COOKIE_NAME). Because
// the browser only talks to the same-origin BFF proxy (/api/*), this HTTPOnly
// cookie is first-party here, so the proxy can read it.
const REFRESH_COOKIE = 'pl_rt'

const PROTECTED = ['/dashboard', '/profile', '/admin']
const AUTH_PAGES = ['/login', '/register']

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl
    // The long-lived refresh cookie is the durable session marker — the access
    // cookie is ephemeral (≤15 min) and can't renew itself, so a lone access
    // cookie isn't a session. Validity is checked server-side by getSession; this
    // is just the cheap optimistic redirect.
    const hasSession = req.cookies.has(REFRESH_COOKIE)

    const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    if (isProtected && !hasSession) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (AUTH_PAGES.includes(pathname) && hasSession) {
        const url = req.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/dashboard/:path*', '/profile/:path*', '/admin/:path*', '/login', '/register'],
}
