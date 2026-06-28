import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app/app-shell'
import { getSession, hasRefreshCookie } from '@/lib/auth/session'

/**
 * Server-side gate for every authenticated route. The access-token cookie is
 * verified (RS256) before anything renders, so protected UI never reaches an
 * unauthenticated client. A merely expired access token (refresh cookie still
 * present) is not a bounce: the page renders and the client refreshes the token
 * single-flight on its first request.
 */
export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()
    if (!session && !(await hasRefreshCookie())) {
        redirect('/login')
    }

    return <AppShell initialUser={session}>{children}</AppShell>
}
