import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { LOGOUT_MARKER_COOKIE } from '@/lib/auth/logout-marker'
import { getSession, hasRefreshCookie } from '@/lib/auth/session'

/**
 * Already-authenticated users never see the login form: a valid access token (or
 * a refresh cookie whose access merely expired) bounces to the dashboard before
 * render. The server check complements the proxy's optimistic redirect.
 *
 * The exception is a just-failed refresh: `loggedOutRedirect` lands here with the
 * `pl_lo` marker set — the session is dead but its HTTPOnly `pl_rt` couldn't be
 * cleared (e.g. a Domain mismatch). Bouncing such a user to /dashboard fails the
 * refresh again and loops forever, so we honour the marker like the proxy does and
 * render the form instead. (The proxy consumes the marker on the same hop; it only
 * needs to survive to here.)
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
    const justLoggedOut = (await cookies()).has(LOGOUT_MARKER_COOKIE)
    if (!justLoggedOut && ((await getSession()) || (await hasRefreshCookie()))) {
        redirect('/dashboard')
    }

    const { reason } = await searchParams

    return <LoginForm expired={reason === 'expired'} />
}
