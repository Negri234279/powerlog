import { getSession } from '@/lib/auth/session'
import { CoachingView } from '@/components/coaching/coaching-view'

/**
 * This page renders one of two entirely different products depending on the
 * caller's role, so it reads the role server-side rather than waiting for `me`.
 *
 * The access token already carries it, and verifying that cookie is local (RS256,
 * no network) and memoised per request — so it costs nothing and is available
 * before the first byte. Deciding on the client instead meant every coach loading
 * this page saw the athlete layout, complete with a "become a coach" hero, until
 * the query came back.
 *
 * `getSession()` returns null for an access token that has expired but is still
 * refreshable. That is deliberate and matches the authed layout: it renders and
 * lets the client refresh single-flight rather than bouncing. In that one case
 * the role is unknown at paint, and the view holds the role-specific sections
 * back instead of guessing.
 */
export default async function CoachingPage() {
    const session = await getSession()

    return <CoachingView initialRole={session?.role ?? null} />
}
