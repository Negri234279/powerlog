import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { getSession, hasRefreshCookie } from '@/lib/auth/session'

/**
 * Already-authenticated users never see the login form: a valid access token (or
 * a refresh cookie whose access merely expired) bounces to the dashboard before
 * render. The server check complements the proxy's optimistic redirect.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
    if ((await getSession()) || (await hasRefreshCookie())) {
        redirect('/dashboard')
    }

    const { reason } = await searchParams

    return <LoginForm expired={reason === 'expired'} />
}
